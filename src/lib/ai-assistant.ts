import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/prisma";
import { getDailyLimit, type GoPilotTierKey } from "@/lib/gopilot-tiers";

// ============================================
// Provider Interface (future: OpenAI, Gemini, BYOK)
// ============================================

export interface StreamEvent {
  type: "text" | "tool_start" | "tool_result" | "status" | "done" | "error";
  content?: string;
  app?: string;
  query?: string;
  summary?: string;
  message?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AppInfo {
  title: string;
  icon: string;
  category: string;
  flyUrl: string;
  capabilities: string[];
}

interface ToolCall {
  app: string;
  query: string;
  result?: string;
  error?: string;
}

export interface AIProvider {
  streamChat(params: {
    system: string;
    messages: ChatMessage[];
    tools: Anthropic.Messages.Tool[];
    onToolCall: (app: string, query: string) => Promise<unknown>;
  }): AsyncGenerator<StreamEvent>;
}

// ============================================
// Claude Provider
// ============================================

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export class ClaudeProvider implements AIProvider {
  async *streamChat(params: {
    system: string;
    messages: ChatMessage[];
    tools: Anthropic.Messages.Tool[];
    onToolCall: (app: string, query: string) => Promise<unknown>;
  }): AsyncGenerator<StreamEvent> {
    const { system, tools, onToolCall } = params;
    // Build Anthropic message format
    let messages: Anthropic.Messages.MessageParam[] = params.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const maxIterations = 3;
    let fullText = "";
    const toolCalls: ToolCall[] = [];

    for (let i = 0; i < maxIterations; i++) {
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        system,
        messages,
        tools: tools.length > 0 ? tools : undefined,
      });

      let currentToolUse: { id: string; name: string; inputJson: string } | null = null;
      let stopReason: string | null = null;
      // Pending tool calls to execute after the stream completes
      const pendingTools: { id: string; input: { app: string; query: string } }[] = [];

      for await (const event of stream) {
        if (event.type === "content_block_start") {
          if (event.content_block.type === "tool_use") {
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              inputJson: "",
            };
          } else if (event.content_block.type === "text") {
            // Will be filled by deltas
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            fullText += event.delta.text;
            yield { type: "text", content: event.delta.text };
          } else if (event.delta.type === "input_json_delta" && currentToolUse) {
            currentToolUse.inputJson += event.delta.partial_json;
          }
        } else if (event.type === "content_block_stop") {
          if (currentToolUse) {
            // Parse and announce immediately so users see progress, but defer execution
            try {
              const input = JSON.parse(currentToolUse.inputJson) as { app: string; query: string };
              pendingTools.push({ id: currentToolUse.id, input });
              yield { type: "tool_start", app: input.app, query: input.query };
            } catch {
              // malformed tool input — skip
            }
            currentToolUse = null;
          }
        } else if (event.type === "message_delta") {
          stopReason = event.delta.stop_reason;
        }
      }

      // Stream is fully consumed — now get the final message and process tool calls
      if (stopReason !== "tool_use" || pendingTools.length === 0) {
        break;
      }

      // Get the complete assistant message (safe now that stream is fully consumed)
      const assistantMessage = await stream.finalMessage();

      // Execute each pending tool call and build tool_result messages
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const tool of pendingTools) {
        try {
          const result = await onToolCall(tool.input.app, tool.input.query);
          const resultStr = JSON.stringify(result);
          const summary = (result as { data?: { summary?: string } })?.data?.summary || "Data retrieved";

          toolCalls.push({ app: tool.input.app, query: tool.input.query, result: resultStr });
          yield { type: "tool_result", app: tool.input.app, summary };
          toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: resultStr });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Tool call failed";
          toolCalls.push({ app: tool.input.app, query: tool.input.query, error: errMsg });
          yield { type: "tool_result", app: tool.input.app, summary: `Error: ${errMsg}` };
          toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Error: ${errMsg}`, is_error: true });
        }
      }

      // Add assistant message + all tool results for the next iteration
      messages = [
        ...messages,
        { role: "assistant", content: assistantMessage.content },
        { role: "user", content: toolResults },
      ];

      yield { type: "status", content: "Analyzing results..." };
    }

    yield { type: "done", content: fullText };
    // Return tool calls via a special property on the generator
    // The caller reads fullText and toolCalls from the done event
    return { fullText, toolCalls };
  }
}

// ============================================
// App Discovery & Capabilities
// ============================================

const capabilityCache = new Map<string, { capabilities: string[]; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function discoverOrgApps(orgId: string): Promise<AppInfo[]> {
  const orgApps = await prisma.orgApp.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["RUNNING", "PREVIEW"] },
      flyUrl: { not: null },
    },
    include: {
      app: {
        select: { title: true, icon: true, category: true },
      },
    },
  });

  const apps: AppInfo[] = [];
  const orgSecret = process.env.GO4IT_ORG_SECRET;

  await Promise.all(
    orgApps.map(async (oa) => {
      const flyUrl = oa.flyUrl!;
      const capabilities = await fetchCapabilities(flyUrl, orgSecret);
      apps.push({
        title: oa.app.title,
        icon: oa.app.icon,
        category: oa.app.category,
        flyUrl,
        capabilities,
      });
    })
  );

  return apps;
}

async function fetchCapabilities(flyUrl: string, orgSecret?: string): Promise<string[]> {
  const cached = capabilityCache.get(flyUrl);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.capabilities;
  }

  try {
    const headers: Record<string, string> = {};
    if (orgSecret) headers["x-go4it-secret"] = orgSecret;

    const res = await fetch(`${flyUrl}/api/ai-query`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const capabilities: string[] = data.capabilities || [];

    capabilityCache.set(flyUrl, { capabilities, fetchedAt: Date.now() });
    return capabilities;
  } catch {
    return [];
  }
}

// ============================================
// Tool Execution
// ============================================

export async function executeQuery(flyUrl: string, query: string): Promise<unknown> {
  const orgSecret = process.env.GO4IT_ORG_SECRET;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (orgSecret) headers["x-go4it-secret"] = orgSecret;

  const res = await fetch(`${flyUrl}/api/ai-query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ============================================
// Prompt & Tool Building
// ============================================

export function buildSystemPrompt(
  orgName: string,
  userName: string,
  apps: AppInfo[]
): string {
  const appList = apps
    .map(
      (a) =>
        `- ${a.icon} ${a.title} (${a.category}): ${a.capabilities.length > 0 ? a.capabilities.join(", ") : "no query handlers"}`
    )
    .join("\n");

  return `You are the GO4IT AI Assistant for ${orgName}. You help team members find information across their business apps.

Available apps and their query capabilities:
${appList || "No apps are currently running."}

Current user: ${userName}

Instructions:
- Use the query_app_data tool to fetch real data before answering questions about business data.
- IMPORTANT: Be efficient with tool calls. Use 1-3 queries max per response. Each query capability returns comprehensive data, so you rarely need to call the same app twice. Pick the single best query for each app.
- Be concise and helpful. Use bullet points for lists.
- If an app is down or a query fails, let the user know and suggest trying again.
- For questions not related to business data, answer directly without using tools.
- Keep responses under 500 words unless more detail is needed.
- Format data clearly — use tables or bullet points for lists of records.`;
}

export function buildTools(apps: AppInfo[]): Anthropic.Messages.Tool[] {
  if (apps.length === 0 || apps.every((a) => a.capabilities.length === 0)) return [];

  const appDescriptions = apps
    .filter((a) => a.capabilities.length > 0)
    .map((a) => `${a.title}: ${a.capabilities.join(", ")}`)
    .join("; ");

  return [
    {
      name: "query_app_data",
      description: `Query data from GO4IT apps in the organization. Available apps and their queries: ${appDescriptions}. Use this to look up business data like contacts, invoices, tasks, tickets, etc.`,
      input_schema: {
        type: "object" as const,
        properties: {
          app: {
            type: "string" as const,
            description: `The app to query. Must be one of: ${apps.filter((a) => a.capabilities.length > 0).map((a) => a.title).join(", ")}`,
          },
          query: {
            type: "string" as const,
            description:
              "The query to execute (e.g., 'list_contacts', 'overdue_invoices', 'open_tickets')",
          },
        },
        required: ["app", "query"],
      },
    },
  ];
}

// ============================================
// Usage Tracking
// ============================================

export async function checkUsageLimit(orgId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  tier: GoPilotTierKey;
}> {
  const today = new Date().toISOString().split("T")[0];

  const [usage, org] = await Promise.all([
    prisma.aIUsage.findUnique({
      where: { organizationId_date: { organizationId: orgId, date: today } },
    }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { gopilotTier: true },
    }),
  ]);

  const tier = (org?.gopilotTier || "FREE") as GoPilotTierKey;
  const dailyLimit = getDailyLimit(tier);
  const used = usage?.queryCount ?? 0;
  return { allowed: used < dailyLimit, used, limit: dailyLimit, tier };
}

export async function incrementUsage(orgId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const id = `${orgId}_${today}`;

  await prisma.aIUsage.upsert({
    where: { organizationId_date: { organizationId: orgId, date: today } },
    update: { queryCount: { increment: 1 } },
    create: { id, organizationId: orgId, date: today, queryCount: 1 },
  });
}

// ============================================
// Title Generation
// ============================================

export async function generateTitle(firstMessage: string): Promise<string> {
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      messages: [
        {
          role: "user",
          content: `Generate a 3-5 word title for this conversation. Reply with ONLY the title, no quotes or punctuation. User message: "${firstMessage.slice(0, 200)}"`,
        },
      ],
    });
    const text = res.content[0];
    if (text.type === "text") return text.text.trim().slice(0, 100);
    return "New conversation";
  } catch {
    return "New conversation";
  }
}

// ============================================
// Default provider instance
// ============================================

export const defaultProvider: AIProvider = new ClaudeProvider();
