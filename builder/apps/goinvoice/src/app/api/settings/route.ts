import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// Settings are stored as JSON in the user's name field as a workaround
// since we don't want to add a separate settings model. We use a simple
// key-value approach via a dedicated Settings JSON stored in user title field.

interface Settings {
  defaultTaxRate: number;
  defaultTerms: string;
  companyName: string;
  invoicePrefix: string;
  estimatePrefix: string;
}

const DEFAULT_SETTINGS: Settings = {
  defaultTaxRate: 0,
  defaultTerms: "Net 30",
  companyName: "",
  invoicePrefix: "INV-",
  estimatePrefix: "EST-",
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { title: true },
  });

  let settings = DEFAULT_SETTINGS;
  if (user?.title) {
    try {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(user.title) };
    } catch {
      // Use defaults
    }
  }

  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const settings: Settings = {
    defaultTaxRate: body.defaultTaxRate ?? 0,
    defaultTerms: body.defaultTerms ?? "Net 30",
    companyName: body.companyName ?? "",
    invoicePrefix: body.invoicePrefix ?? "INV-",
    estimatePrefix: body.estimatePrefix ?? "EST-",
  };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { title: JSON.stringify(settings) },
  });

  return NextResponse.json(settings);
}
