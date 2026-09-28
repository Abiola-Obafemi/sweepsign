import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SweepSignClient } from "../../src/SweepSignClient";

type SweepSignPageProps = {
  params: Promise<{ path: string[] }>;
};

function validClientRoute(path: string[]) {
  if (
    [
      "login",
      "signup",
      "forgot-password",
      "reset-password",
      "onboarding",
    ].includes(path[0])
  )
    return path.length === 1;
  if (path[0] === "app") {
    if (path.length === 1) return true;
    if (path[1] === "jobs")
      return path.length === 2 || (path.length === 3 && Boolean(path[2]));
    return (
      ["templates", "settings", "billing"].includes(path[1]) &&
      path.length === 2
    );
  }
  return path[0] === "handoff" && path.length === 2 && Boolean(path[1]);
}

export async function generateMetadata({
  params,
}: SweepSignPageProps): Promise<Metadata> {
  const { path } = await params;
  return {
    title: validClientRoute(path) ? undefined : "Page Not Found",
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
  };
}

export default async function SweepSignPage({ params }: SweepSignPageProps) {
  const { path } = await params;
  if (!validClientRoute(path)) notFound();
  return <SweepSignClient />;
}
