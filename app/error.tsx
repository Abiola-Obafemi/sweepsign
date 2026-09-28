"use client";

import Link from "next/link";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="status-page status-page--error" id="main-content">
      <a className="wordmark" href="/" aria-label="SweepSign home">
        <img src="/brand/sweepsign-mark.svg" alt="" width="28" height="28" />
        <span>SweepSign</span>
      </a>
      <p className="status-code">Something went wrong</p>
      <h1>This page did not load.</h1>
      <p>
        Try the request again. If it keeps failing, return to SweepSign and
        confirm your latest work is still present before making more changes.
      </p>
      <div className="status-actions">
        <button
          className="primary-button"
          type="button"
          onClick={() => retry()}
        >
          Try again
        </button>
        <Link className="text-link" href="/">
          Return home
        </Link>
      </div>
    </main>
  );
}
