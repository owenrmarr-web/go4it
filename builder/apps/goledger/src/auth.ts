import NextAuth from "next-auth";
import authConfig from "./auth.config";

const nextAuth = NextAuth(authConfig);

export const { handlers, signIn, signOut } = nextAuth;

// In preview mode, return a fake session so all auth checks pass
const previewSession = {
  user: { id: "preview", email: "admin@go4it.live", name: "Preview User", role: "admin" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

export const auth = process.env.PREVIEW_MODE === "true"
  ? async () => previewSession
  : nextAuth.auth;
