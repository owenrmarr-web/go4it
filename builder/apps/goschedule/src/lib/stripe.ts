import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export async function getStripeClient(): Promise<Stripe | null> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings?.stripeSecretKey) return null;

  const secretKey = decrypt(settings.stripeSecretKey);
  return new Stripe(secretKey);
}

export async function getPublishableKey(): Promise<string | null> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "singleton" },
    select: { stripePublishableKey: true },
  });
  return settings?.stripePublishableKey || null;
}
