import prisma from "@/lib/prisma";

// Lazy-loaded APNs client (apns2 is optional — only used when APNS_KEY_ID is configured)
let apnsClient: unknown = null;
let ApnsNotification: unknown = null;

async function getApnsClient() {
  if (apnsClient) return apnsClient;

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const keyBase64 = process.env.APNS_KEY_BASE64;

  if (!keyId || !teamId || !bundleId || !keyBase64) {
    return null; // APNs not configured — skip push
  }

  const apns2 = await import("apns2");
  ApnsNotification = apns2.Notification;

  const signingKey = Buffer.from(keyBase64, "base64").toString("utf-8");

  apnsClient = new apns2.ApnsClient({
    team: teamId,
    keyId,
    signingKey,
    defaultTopic: bundleId,
    host: process.env.NODE_ENV === "production"
      ? "https://api.push.apple.com"
      : "https://api.sandbox.push.apple.com",
  });

  return apnsClient;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  const client = await getApnsClient();
  if (!client) return; // APNs not configured

  const devices = await prisma.pushDevice.findMany({
    where: { userId, platform: "ios" },
  });

  if (devices.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NotifClass = ApnsNotification as any;

  const results = await Promise.allSettled(
    devices.map((device) => {
      const notification = new NotifClass(device.token, {
        alert: { title: payload.title, body: payload.body },
        data: payload.data,
        sound: "default",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (client as any).send(notification);
    })
  );

  // Clean up stale tokens
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const error = result.reason;
      if (error?.statusCode === 410 || error?.reason === "Unregistered") {
        await prisma.pushDevice.delete({
          where: { id: devices[i].id },
        }).catch(() => {});
      }
      console.error(`APNs push failed for device ${devices[i].id}:`, error?.reason || error);
    }
  }
}
