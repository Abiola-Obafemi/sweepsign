import type { Metadata } from "next";
import { PublicDocument } from "../_components/PublicDocument";
import { supportEmail } from "../../lib/email";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Practical help for SweepSign account access, handoffs, and data requests.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  const email = supportEmail();
  return (
    <PublicDocument
      eyebrow="Support"
      title="Help with SweepSign"
      summary="Find the next practical step for account access, customer handoffs, and privacy or data requests."
      updated="September 25, 2026"
    >
      <section>
        <h2>Account access</h2>
        <p>
          Sign in with the email address and password used when you created your
          SweepSign account. If account recovery email is active, the sign-in
          page lets you request a reset link. We use the same generic response
          whether or not an address has an account.
        </p>
        <p>
          If you still cannot access your account, contact ABØ Studios through{" "}
          {email ? (
            <a href={`mailto:${email}`}>{email}</a>
          ) : (
            <a href="https://abodev.dev">abodev.dev</a>
          )}
          .
        </p>
      </section>

      <section>
        <h2>Revoke a customer handoff link</h2>
        <p>
          Open the saved job in SweepSign, find the customer-link section, and
          select “Revoke link.” The old handoff URL will no longer show that
          handoff. You can generate a replacement link when you are ready to
          share again.
        </p>
      </section>

      <section>
        <h2>Privacy and data requests</h2>
        <p>
          To request access to, correction of, or deletion of personal
          information, contact ABØ Studios through{" "}
          {email ? (
            <a href={`mailto:${email}`}>{email}</a>
          ) : (
            <a href="https://abodev.dev">abodev.dev</a>
          )}
          . We may need to verify your identity before acting on a request.
        </p>
      </section>

      <section>
        <h2>What to include</h2>
        <p>So we can understand the request, include:</p>
        <ul>
          <li>The email address associated with the SweepSign account.</li>
          <li>A short description of what you need help with.</li>
          <li>
            For a handoff issue, the job title and the date you created or
            shared it, if known.
          </li>
        </ul>
        <p>
          Do not send your password or customer photos in a support request.
        </p>
      </section>
    </PublicDocument>
  );
}
