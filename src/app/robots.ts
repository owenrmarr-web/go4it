import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || "https://go4it.live";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth",
          "/admin",
          "/account",
          "/account/",
          "/org/",
          "/invite/",
          "/verify-email",
          "/deck",
          "/leaderboard",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
