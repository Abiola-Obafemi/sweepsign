import Link from "next/link";
import type { ReactNode } from "react";

export function BrandHeader() {
  return (
    <header className="public-header public-header--document">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Link className="wordmark" href="/" aria-label="SweepSign home">
        <img src="/brand/sweepsign-mark.svg" alt="" width="28" height="28" />
        <span>SweepSign</span>
      </Link>
      <nav>
        <Link href="/login">Sign in</Link>
      </nav>
    </header>
  );
}

export function DocumentFooter() {
  return (
    <footer className="site-footer">
      <p>© 2026 SweepSign</p>
      <nav aria-label="Support and legal">
        <Link href="/support">Support</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
    </footer>
  );
}

export function PublicDocument({
  eyebrow,
  title,
  summary,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <BrandHeader />
      <main className="document-page" id="main-content">
        <header className="document-intro">
          <p className="context-line">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="document-summary">{summary}</p>
          <p className="document-date">Last updated {updated}</p>
        </header>
        <article className="document-body">{children}</article>
      </main>
      <DocumentFooter />
    </>
  );
}
