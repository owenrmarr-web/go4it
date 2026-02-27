import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { APP_SCHEMAS } from "@/lib/import-schemas";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId, description } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Load the ImportJob with files
    const importJob = await prisma.importJob.findUnique({
      where: { id: jobId },
      include: { files: true },
    });

    if (!importJob) {
      return NextResponse.json({ error: "Import job not found" }, { status: 404 });
    }

    // Get the org slug for the OWNER/ADMIN check
    const org = await prisma.organization.findUnique({
      where: { id: importJob.organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // OWNER/ADMIN check
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organization: { slug: org.slug }, role: { in: ["OWNER", "ADMIN"] } },
      include: { organization: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify ownership: job's org matches membership org
    if (importJob.organizationId !== membership.organization.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch org's RUNNING apps
    const orgApps = await prisma.orgApp.findMany({
      where: { organizationId: importJob.organizationId, status: "RUNNING" },
      include: { app: { select: { title: true } } },
    });

    // Build available schemas from running apps
    const availableSchemas: { appTitle: string; schema: typeof APP_SCHEMAS[string] }[] = [];
    for (const orgApp of orgApps) {
      const schema = APP_SCHEMAS[orgApp.app.title];
      if (schema) {
        availableSchemas.push({ appTitle: orgApp.app.title, schema });
      }
    }

    // Build the AI prompt
    const userDescription = description || importJob.description || "No description provided";

    let filesSection = "";
    for (const file of importJob.files) {
      const columns: string[] = file.columns ? JSON.parse(file.columns) : [];
      const sampleData: Record<string, string>[] = file.sampleData ? JSON.parse(file.sampleData) : [];

      filesSection += `File: ${file.filename} (${file.rowCount} rows)\n`;
      filesSection += `Columns: ${columns.join(", ")}\n`;
      filesSection += `Sample data (first rows):\n`;

      if (sampleData.length > 0 && columns.length > 0) {
        // Format as simple table
        const header = columns.join(" | ");
        const separator = columns.map(() => "---").join(" | ");
        filesSection += `${header}\n${separator}\n`;
        for (const row of sampleData.slice(0, 10)) {
          const values = columns.map((col) => row[col] ?? "");
          filesSection += `${values.join(" | ")}\n`;
        }
      }
      filesSection += "\n";
    }

    let schemasSection = "";
    for (const { appTitle, schema } of availableSchemas) {
      schemasSection += `App: ${appTitle}\n`;
      for (const [modelName, modelDef] of Object.entries(schema.models)) {
        schemasSection += `  ${modelName}: ${modelDef.description}\n`;
        schemasSection += `    Fields:\n`;
        for (const [fieldName, fieldDef] of Object.entries(modelDef.fields)) {
          let fieldDesc = `${fieldName} (${fieldDef.type}, ${fieldDef.required ? "required" : "optional"}`;
          if (fieldDef.values) {
            fieldDesc += `, values: ${fieldDef.values.join(", ")}`;
          }
          fieldDesc += ")";
          schemasSection += `      ${fieldDesc}\n`;
        }
      }
      schemasSection += "\n";
    }

    const prompt = `You are a data import assistant for GO4IT, a business software platform.
A user wants to import data from uploaded files into their business apps.

USER'S DESCRIPTION:
${userDescription}

UPLOADED FILE(S):
${filesSection}

AVAILABLE TARGET APPS AND SCHEMAS:
${schemasSection}

Analyze the uploaded data and determine:
1. Which app and model the data should be imported into
2. How each source column maps to target fields
3. Any data transformations needed (date parsing, name splitting, enum mapping, etc.)
4. Data quality issues

Return ONLY valid JSON (no markdown):
{
  "targetApp": "AppTitle",
  "imports": [{
    "sourceFile": "filename.csv",
    "targetModel": "modelName",
    "mappings": [{ "source": "Column Name", "target": "fieldName", "transform": null, "confidence": 0.95 }],
    "unmappedColumns": ["col1"],
    "missingRequiredFields": [],
    "cleaningSuggestions": ["Note about data quality"]
  }],
  "importOrder": ["model1", "model2"]
}`;

    // Call Claude API
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    // Parse the JSON from Claude's response
    let analysisText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        analysisText += block.text;
      }
    }

    // Handle possible markdown code blocks in response
    let analysisJson: string;
    const codeBlockMatch = analysisText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      analysisJson = codeBlockMatch[1].trim();
    } else {
      analysisJson = analysisText.trim();
    }

    // Validate it's parseable JSON
    let analysis;
    try {
      analysis = JSON.parse(analysisJson);
    } catch {
      console.error("Failed to parse Claude response as JSON:", analysisText);
      return NextResponse.json(
        { error: "AI analysis returned invalid JSON. Please try again." },
        { status: 500 }
      );
    }

    // Calculate total rows from files
    const totalRows = importJob.files.reduce((sum, f) => sum + f.rowCount, 0);

    // Resolve targetApp title → targetOrgAppId
    const primaryImport = analysis.imports?.[0];
    const targetAppTitle = analysis.targetApp as string | undefined;
    const targetModel = primaryImport?.targetModel as string | undefined;

    let targetOrgAppId: string | null = null;
    if (targetAppTitle) {
      const matchingOrgApp = orgApps.find((oa) => oa.app.title === targetAppTitle);
      if (matchingOrgApp) {
        targetOrgAppId = matchingOrgApp.id;
      }
    }

    // Update ImportJob with analysis and resolved target
    await prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        analysisJson: JSON.stringify(analysis),
        status: "READY",
        totalRows,
        ...(targetOrgAppId && { targetOrgAppId }),
        ...(targetModel && { targetModel }),
      },
    });

    // Transform AI response into frontend-compatible shape
    const mappings = (primaryImport?.mappings ?? []).map(
      (m: { source: string; target: string; transform: string | null; confidence: number }) => ({
        sourceColumn: m.source,
        targetField: m.target,
        confidence: m.confidence,
        transform: m.transform,
      })
    );

    return NextResponse.json({
      targetApp: targetAppTitle ?? "Unknown",
      targetEntity: targetModel ?? "Unknown",
      mappings,
      qualityNotes: primaryImport?.cleaningSuggestions ?? [],
      missingRequired: primaryImport?.missingRequiredFields ?? [],
      totalRows,
    });
  } catch (error) {
    console.error("Import analyze error:", error);
    return NextResponse.json(
      { error: "Failed to analyze import data" },
      { status: 500 }
    );
  }
}
