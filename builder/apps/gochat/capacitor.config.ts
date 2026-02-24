import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.go4it.gochat",
  appName: "GoChat",
  webDir: "public", // placeholder — remote URL is used via server.url
  server: {
    url: "https://go4it-preview-cmlspa2m.fly.dev",
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
