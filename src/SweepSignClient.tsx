"use client";

import dynamic from "next/dynamic";

// The parity island owns the legacy client router while pages are migrated.
// It must not render on the server because BrowserRouter reads document.
export const SweepSignClient = dynamic(
  () => import("./ProductApp").then((module) => module.ProductApp),
  {
    ssr: false,
    loading: () => <div className="route-loading">Loading SweepSign…</div>,
  },
);
