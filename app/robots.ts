import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/support", "/privacy", "/terms"],
      disallow: [
        "/api/",
        "/app/",
        "/forgot-password",
        "/handoff/",
        "/login",
        "/onboarding",
        "/reset-password",
        "/signup",
      ],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
