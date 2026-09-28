/* eslint-disable react-refresh/only-export-components -- Next.js metadata is a required route export. */
import type { Metadata } from "next";
import Link from "next/link";
import { BrandHeader, DocumentFooter } from "./_components/PublicDocument";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <BrandHeader />
      <main className="status-page" id="main-content">
        <p className="status-code">404</p>
        <h1>Page not found.</h1>
        <p>
          The address may be wrong, or the page may have moved. Your SweepSign
          account and saved handoffs are not affected.
        </p>
        <div className="status-actions">
          <Link className="primary-button" href="/">
            Go to SweepSign
          </Link>
          <Link className="text-link" href="/login">
            Sign in
          </Link>
        </div>
      </main>
      <DocumentFooter />
    </>
  );
}
