import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    profileColor?: string | null;
    profileEmoji?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role?: string;
      profileColor?: string | null;
      profileEmoji?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    profileColor?: string | null;
    profileEmoji?: string | null;
  }
}
