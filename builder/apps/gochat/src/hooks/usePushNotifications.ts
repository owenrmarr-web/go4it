"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function usePushNotifications() {
  const router = useRouter();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;

    // Only run in native Capacitor context
    import("@capacitor/core").then(({ Capacitor }) => {
      if (!Capacitor.isNativePlatform()) return;
      registeredRef.current = true;

      import("@capacitor/push-notifications").then(({ PushNotifications }) => {
        async function setup() {
          // Request permission
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === "prompt") {
            permStatus = await PushNotifications.requestPermissions();
          }
          if (permStatus.receive !== "granted") {
            console.warn("Push notification permission denied");
            return;
          }

          // Handle registration success — send token to server
          PushNotifications.addListener("registration", async (token) => {
            console.log("APNs token:", token.value);
            try {
              await fetch("/api/push/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: token.value, platform: "ios" }),
              });
            } catch (err) {
              console.error("Failed to register push token:", err);
            }
          });

          // Handle registration error
          PushNotifications.addListener("registrationError", (err) => {
            console.error("Push registration error:", err);
          });

          // Foreground notification — SSE handles real-time, so just log
          PushNotifications.addListener("pushNotificationReceived", (notification) => {
            console.log("Push received in foreground:", notification);
          });

          // Notification tap — deep-link to conversation
          PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
            const data = action.notification.data;
            if (data?.conversationId || data?.channelId) {
              router.push(`/chat/${data.conversationId || data.channelId}`);
            } else if (data?.dmId) {
              router.push(`/dm/${data.dmId}`);
            }
          });

          // Register with APNs
          await PushNotifications.register();
        }

        setup();
      });
    });
  }, [router]);
}
