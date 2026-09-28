import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SweepSign",
    short_name: "SweepSign",
    description:
      "Clear customer handoffs for residential cleaning professionals.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2ea",
    theme_color: "#244e3d",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
