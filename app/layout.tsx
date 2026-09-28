import type { Metadata, Viewport } from "next";
import "../src/styles.css";
import { SITE_ORIGIN } from "../lib/site";

const canonicalOrigin = new URL(SITE_ORIGIN);

export const metadata: Metadata = {
  metadataBase: canonicalOrigin,
  title: {
    default: "SweepSign | Clear Customer Handoffs for Cleaning Pros",
    template: "%s | SweepSign",
  },
  description:
    "Create a clear, customer-ready record of completed cleaning work, proof, exceptions, and the next step.",
  applicationName: "SweepSign",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "SweepSign",
    title: "SweepSign | Clear Customer Handoffs for Cleaning Pros",
    description:
      "Turn the end of a cleaning job into one clear, customer-ready handoff.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SweepSign | Clear Customer Handoffs for Cleaning Pros",
    description:
      "Turn the end of a cleaning job into one clear, customer-ready handoff.",
  },
  robots: { index: true, follow: true },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f2ea",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
