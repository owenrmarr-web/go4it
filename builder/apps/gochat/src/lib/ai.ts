// AI Coworker — Claude integration for GoChat
// Responds when users mention @Claude (or @GoChat) in channels, or DM Claude directly.
// Uses the Anthropic API with tool_use for cross-app data queries.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AI_MODEL = "claude-sonnet-4-5-20250929";

export const AI_USER_EMAIL = "claude@go4it.live";
export const AI_USER_NAME = "Claude";

const SYSTEM_PROMPT = `You are Claude, an AI coworker built into GoChat — a team messaging app for small businesses powered by GO4IT.

Your role:
- Answer questions, brainstorm ideas, draft content, and help with tasks
- You can query data from other GO4IT apps in the organization (projects, invoices, contacts, etc.) using your tools
- Be concise and conversational — this is a chat, not an essay
- Use short paragraphs and bullet points when helpful
- Be friendly and professional

When users ask about data from other apps (tasks, invoices, projects, etc.), use the query_app_data tool to fetch that information. If no apps are available, let them know.

Keep responses under 300 words unless the question requires more detail. Never use markdown headers (##) — just plain text with occasional bold or bullet points.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Discover available GO4IT apps from environment
// Format: "appName=url,appName=url" e.g. "projects=https://projects.go4it.live,invoices=https://invoices.go4it.live"
function discoverApps(): { name: string; url: string }[] {
  const appsEnv = process.env.GO4IT_APPS;
  if (!appsEnv) return [];
  return appsEnv.split(",").map((entry) => {
    const [name, url] = entry.split("=");
    return { name: name.trim(), url: url.trim() };
  }).filter((app) => app.name && app.url);
}

// Query another GO4IT app's /api/ai-query endpoint
async function queryApp(appUrl: string, query: string): Promise<unknown> {
  const secret = process.env.GO4IT_ORG_SECRET;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["x-go4it-secret"] = secret;

  const response = await fetch(`${appUrl}/api/ai-query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`App query failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Build tools array for the Anthropic API based on available apps
function buildTools(apps: { name: string; url: string }[]) {
  if (apps.length === 0) return [];
  return [
    {
      name: "query_app_data",
      description: `Query data from other GO4IT apps in the organization. Available apps: ${apps.map((a) => a.name).join(", ")}. Use this to look up tasks, invoices, contacts, projects, or any other data managed by these apps.`,
      input_schema: {
        type: "object" as const,
        properties: {
          app: {
            type: "string" as const,
            description: `The app to query. Must be one of: ${apps.map((a) => a.name).join(", ")}`,
          },
          query: {
            type: "string" as const,
            description: "The data query to execute (e.g., 'list tasks', 'overdue invoices', 'recent contacts')",
          },
        },
        required: ["app", "query"],
      },
    },
  ];
}

export async function generateAIResponse(
  userMessage: string,
  recentMessages: ChatMessage[] = []
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return "AI assistant is not configured. Set ANTHROPIC_API_KEY to enable Claude.";
  }

  // Strip the @Claude / @GoChat mention from the message
  const cleanMessage = userMessage.replace(/@claude/gi, "").replace(/@gochat/gi, "").trim();

  if (!cleanMessage) {
    return "Hey! I'm Claude, your AI coworker. Ask me anything — I can help with brainstorming, drafting messages, answering questions, and pulling data from your other GO4IT apps.";
  }

  const apps = discoverApps();
  const tools = buildTools(apps);

  // Build conversation context from recent messages (last 10)
  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...recentMessages.slice(-10),
    { role: "user" as const, content: cleanMessage },
  ];

  try {
    // Tool use loop — max 3 iterations
    for (let iteration = 0; iteration < 3; iteration++) {
      const body: Record<string, unknown> = {
        model: AI_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      };
      if (tools.length > 0) body.tools = tools;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Anthropic API error:", error);
        return "Sorry, I ran into an issue processing that. Try again in a moment.";
      }

      const data = await response.json();

      // Check if the response contains tool use
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolUseBlocks = (data.content || []).filter((b: any) => b.type === "tool_use");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textBlocks = (data.content || []).filter((b: any) => b.type === "text");

      if (toolUseBlocks.length === 0 || data.stop_reason === "end_turn") {
        // No tool calls — return text
        const text = textBlocks.map((b: { text: string }) => b.text).join("\n");
        return text || "Sorry, I couldn't generate a response. Try rephrasing your question.";
      }

      // Process tool calls
      // Add assistant message with all content blocks
      messages.push({ role: "assistant", content: data.content });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolResults: any[] = [];
      for (const toolCall of toolUseBlocks) {
        const { id, name, input } = toolCall;
        if (name === "query_app_data") {
          const app = apps.find((a) => a.name === input.app);
          if (!app) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: id,
              content: JSON.stringify({ error: `Unknown app '${input.app}'. Available: ${apps.map((a) => a.name).join(", ")}` }),
            });
          } else {
            try {
              const result = await queryApp(app.url, input.query);
              toolResults.push({
                type: "tool_result",
                tool_use_id: id,
                content: JSON.stringify(result),
              });
            } catch (err) {
              toolResults.push({
                type: "tool_result",
                tool_use_id: id,
                content: JSON.stringify({ error: err instanceof Error ? err.message : "Query failed" }),
                is_error: true,
              });
            }
          }
        }
      }

      // Add tool results as a user message
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages.push({ role: "user", content: toolResults as any });
    }

    return "Sorry, I'm having trouble completing that query. Try simplifying your question.";
  } catch (error) {
    console.error("AI response error:", error);
    return "Sorry, I'm having trouble connecting right now. Try again in a moment.";
  }
}

export function containsAIMention(content: string): boolean {
  return /@claude/i.test(content) || /@gochat/i.test(content);
}
