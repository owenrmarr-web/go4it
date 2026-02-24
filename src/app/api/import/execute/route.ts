import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { parseFile } from "@/lib/import-parser";
import crypto from "crypto";

interface FieldMapping {
  source: string;
  target: string;
  transform: string | null;
}

interface ConfirmedConfig {
  targetOrgAppId: string;
  targetModel: string;
  mappings: FieldMapping[];
  duplicateStrategy: "skip" | "overwrite" | "create_new";
}

interface BatchResult {
  imported?: number;
  skipped?: number;
  errors?: { row?: number; field?: string; message: string }[];
}

function applyTransform(value: string, transform: string | null): string {
  if (!transform || !value) return value;

  switch (transform) {
    case "split_first":
      return value.split(/\s+/)[0] ?? value;
    case "split_last": {
      const parts = value.split(/\s+/);
      return parts[parts.length - 1] ?? value;
    }
    case "uppercase":
      return value.toUpperCase();
    case "lowercase":
      return value.toLowerCase();
    case "parse_date": {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toISOString();
    }
    case "parse_number": {
      const n = parseFloat(value.replace(/[^0-9.\-]/g, ""));
      return isNaN(n) ? value : String(n);
    }
    case "parse_boolean": {
      const lower = value.toLowerCase().trim();
      if (["true", "yes", "1", "y", "on"].includes(lower)) return "true";
      if (["false", "no", "0", "n", "off", ""].includes(lower)) return "false";
      return value;
    }
    default:
      return value;
  }
}

function applyMappings(
  row: Record<string, string>,
  mappings: FieldMapping[]
): Record<string, string> | null {
  const record: Record<string, string> = {};
  let hasValue = false;

  for (const mapping of mappings) {
    const rawValue = row[mapping.source] ?? "";
    const transformed = applyTransform(rawValue, mapping.transform);
    record[mapping.target] = transformed;
    if (transformed.trim() !== "") {
      hasValue = true;
    }
  }

  // Skip rows where all mapped values are empty
  if (!hasValue) return null;

  return record;
}

function batchArray<T>(arr: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Load ImportJob with files
    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
      include: { files: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Import job not found" }, { status: 404 });
    }

    // Verify OWNER/ADMIN
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId: job.organizationId, role: { in: ["OWNER", "ADMIN"] } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load confirmed mappings
    if (!job.confirmedJson) {
      return NextResponse.json(
        { error: "Mappings have not been confirmed yet" },
        { status: 400 }
      );
    }

    const confirmed: ConfirmedConfig = JSON.parse(job.confirmedJson);
    const { targetOrgAppId, targetModel, mappings, duplicateStrategy } = confirmed;

    // Load the target OrgApp
    const orgApp = await prisma.orgApp.findUnique({
      where: { id: targetOrgAppId },
    });

    if (!orgApp) {
      return NextResponse.json({ error: "Target app not found" }, { status: 404 });
    }

    // Verify OrgApp belongs to the same org
    if (orgApp.organizationId !== job.organizationId) {
      return NextResponse.json(
        { error: "Target app does not belong to the same organization" },
        { status: 403 }
      );
    }

    // Verify OrgApp is RUNNING and has required fields
    if (orgApp.status !== "RUNNING") {
      return NextResponse.json(
        { error: "Target app is not running" },
        { status: 400 }
      );
    }

    if (!orgApp.flyUrl || !orgApp.authSecret) {
      return NextResponse.json(
        { error: "Target app is missing flyUrl or authSecret" },
        { status: 400 }
      );
    }

    // Update job status to IMPORTING
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: "IMPORTING" },
    });

    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const allErrors: { row?: number; field?: string; message: string }[] = [];

    // Process each file
    for (const file of job.files) {
      // Fetch the full file from blobUrl
      const res = await fetch(file.blobUrl);
      const buffer = await res.arrayBuffer();

      // Parse ALL rows
      const parsed = parseFile(buffer, file.filename);

      // Apply confirmed field mappings to each row
      const records: Record<string, string>[] = [];
      for (const row of parsed.allRows) {
        const mapped = applyMappings(row, mappings);
        if (mapped) {
          records.push(mapped);
        }
      }

      // Update total rows on the job
      await prisma.importJob.update({
        where: { id: jobId },
        data: { totalRows: records.length },
      });

      // Batch records into groups of 50
      const batches = batchArray(records, 50);

      for (const batch of batches) {
        try {
          const payload = JSON.stringify({
            model: targetModel,
            records: batch,
            userId: "admin",
            duplicateStrategy,
          });
          const signature = crypto
            .createHmac("sha256", orgApp.authSecret!)
            .update(payload)
            .digest("hex");

          const batchRes = await fetch(`${orgApp.flyUrl}/api/data-import`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-go4it-signature": signature,
            },
            body: payload,
          });

          const result: BatchResult = await batchRes.json();

          totalImported += result.imported ?? 0;
          totalSkipped += result.skipped ?? 0;
          if (result.errors) {
            totalErrors += result.errors.length;
            allErrors.push(...result.errors);
          }
        } catch (batchError) {
          const errorMessage =
            batchError instanceof Error ? batchError.message : "Unknown batch error";
          totalErrors += batch.length;
          allErrors.push({ message: `Batch failed: ${errorMessage}` });
        }

        // Update ImportJob with running totals after each batch
        await prisma.importJob.update({
          where: { id: jobId },
          data: {
            importedRows: totalImported,
            skippedRows: totalSkipped,
            errorRows: totalErrors,
          },
        });
      }
    }

    // Determine final status
    const finalStatus =
      totalImported === 0 && totalErrors > 0 ? "FAILED" : "COMPLETED";

    // Write final results
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        importedRows: totalImported,
        skippedRows: totalSkipped,
        errorRows: totalErrors,
        errorsJson: allErrors.length > 0 ? JSON.stringify(allErrors) : null,
      },
    });

    return NextResponse.json({
      status: finalStatus,
      importedRows: totalImported,
      skippedRows: totalSkipped,
      errorRows: totalErrors,
      errors: allErrors.slice(0, 100),
    });
  } catch (error) {
    console.error("Import execute error:", error);
    return NextResponse.json(
      { error: "Failed to execute import" },
      { status: 500 }
    );
  }
}
