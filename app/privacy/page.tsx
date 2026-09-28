import type { Metadata } from "next";
import { PublicDocument } from "../_components/PublicDocument";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SweepSign collects, uses, shares, and protects data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicDocument
      eyebrow="Privacy"
      title="Privacy Policy"
      summary="This policy explains what SweepSign stores, why it is needed, and the choices available to account holders."
      updated="September 25, 2026"
    >
      <section>
        <h2>Who operates SweepSign</h2>
        <p>
          SweepSign is operated by ABØ Studios. This policy applies to the
          SweepSign website, account experience, and customer handoff pages.
        </p>
      </section>

      <section>
        <h2>Information we collect</h2>
        <p>We collect information needed to provide the product, including:</p>
        <ul>
          <li>Account details such as your name and email address.</li>
          <li>
            Business and job information you enter, including cleaner names,
            service dates, scope items, notes, next-step links, and templates.
          </li>
          <li>
            Photos you choose to upload as proof of work. Only upload photos you
            are allowed to use and share.
          </li>
          <li>
            Basic technical and security data generated when you use the
            service, such as request logs, device information, and error data.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>We use this information to:</p>
        <ul>
          <li>Create and secure your account.</li>
          <li>Save, sync, and display jobs, templates, and handoffs.</li>
          <li>Create share links and let you revoke them.</li>
          <li>Prevent abuse, diagnose errors, and maintain the service.</li>
          <li>Respond to support, access, correction, or deletion requests.</li>
        </ul>
      </section>

      <section>
        <h2>Customer handoff links</h2>
        <p>
          A customer handoff link works like a private bearer link: anyone who
          has the URL may be able to view the handoff until you revoke it. Share
          links only with the intended recipient. Avoid putting sensitive
          personal information in notes or photos.
        </p>
      </section>

      <section>
        <h2>Service providers</h2>
        <p>
          SweepSign uses service providers to host and operate the product.
          Vercel hosts the web application, and Supabase provides managed
          database infrastructure. If paid plans are enabled, payment and
          entitlement providers may process transaction or subscription status.
          SweepSign does not store full payment-card numbers.
        </p>
        <p>We do not sell personal information.</p>
      </section>

      <section>
        <h2>Retention and deletion</h2>
        <p>
          Account and job data is kept while it is needed to operate your
          account or meet legal and security obligations. SweepSign does not yet
          offer an automatic self-service account deletion control. You may
          request access, correction, or deletion through the ABØ Studios
          contact page. Some records may be kept where the law requires it or
          where they are needed to prevent fraud and resolve disputes.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          We use access controls, encrypted transport, secure session cookies,
          and other safeguards intended to protect account data. No internet
          service can promise absolute security. Keep your password private and
          revoke a handoff link if it reaches the wrong person.
        </p>
      </section>

      <section>
        <h2>Your choices and rights</h2>
        <p>
          Depending on where you live, you may have rights to access, correct,
          export, restrict, object to, or delete personal information. To make a
          request, use the contact route below. We may need to verify your
          identity before completing it.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          For privacy or data requests, contact ABØ Studios through{" "}
          <a href="https://abodev.dev">abodev.dev</a>.
        </p>
      </section>
    </PublicDocument>
  );
}
