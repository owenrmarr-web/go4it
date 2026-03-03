import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const SETTINGS_FILE = join(process.cwd(), "prisma", "settings.json");

function getSettings() {
  if (existsSync(SETTINGS_FILE)) {
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
  }
  return {
    vacationDays: 15,
    sickDays: 10,
    personalDays: 3,
    bereavementDays: 5,
    defaultBreakMinutes: 30,
    payPeriod: "BI_WEEKLY",
    companyName: "Brightside Marketing Agency",
    companyAddress: "",
    companyPhone: "",
  };
}

function saveSettings(settings: Record<string, unknown>) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(getSettings());
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const current = getSettings();
  const updated = { ...current, ...body };
  saveSettings(updated);

  return NextResponse.json(updated);
}
