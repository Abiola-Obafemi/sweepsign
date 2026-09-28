import type { Metadata } from "next";
import { PublicDocument } from "../_components/PublicDocument";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that apply when using SweepSign.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PublicDocument
      eyebrow="Legal"
      title="Terms of Use"
      summary="These terms set the rules for using SweepSign and sharing customer handoffs."
      updated="September 25, 2026"
    >
      <section>
        <h2>Using SweepSign</h2>
        <p>
          SweepSign helps residential cleaning professionals record completed
          work, exceptions, proof, and next steps. By creating an account or
          using the service, you agree to these terms and the Privacy Policy.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          Provide accurate account information and keep your login credentials
          secure. You are responsible for activity under your account. Tell us
          promptly if you believe someone has used it without permission.
        </p>
      </section>

      <section>
        <h2>Your content and client permission</h2>
        <p>
          You keep ownership of the information and photos you upload. You give
          SweepSign permission to host, process, and display that content only
          as needed to operate the service.
        </p>
        <p>
          You must have the rights and any client permission needed to upload
          and share job details or photos. Do not upload confidential, unlawful,
          or unnecessarily sensitive personal information.
        </p>
      </section>

      <section>
        <h2>Shared handoffs</h2>
        <p>
          You control who receives a handoff link. Anyone with the link may be
          able to view its contents until you revoke it. Check the handoff
          before sending it and revoke the link if it is shared by mistake.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>You may not use SweepSign to:</p>
        <ul>
          <li>Break the law or violate another person’s rights.</li>
          <li>Upload malware or attempt to disrupt the service.</li>
          <li>Access another account or job without permission.</li>
          <li>Probe, scrape, or overload the service in an abusive way.</li>
          <li>
            Misrepresent evidence or use the product to deceive a customer.
          </li>
        </ul>
      </section>

      <section>
        <h2>Availability and product changes</h2>
        <p>
          SweepSign may change, pause, or remove features as the product is
          developed. We work to keep the service available, but uninterrupted or
          error-free operation is not guaranteed. Keep your own copies of
          business-critical records.
        </p>
      </section>

      <section>
        <h2>Paid plans</h2>
        <p>
          Any paid plan, price, renewal period, cancellation rule, and refund
          term will be shown before purchase. Paid billing is not active unless
          the product presents a live checkout and clear plan terms.
        </p>
      </section>

      <section>
        <h2>Suspension and account closure</h2>
        <p>
          We may restrict or close an account that violates these terms, harms
          the service, or creates legal or security risk. You may ask to close
          your account through the contact route below.
        </p>
      </section>

      <section>
        <h2>Disclaimers and responsibility</h2>
        <p>
          SweepSign is provided on an “as is” and “as available” basis to the
          extent permitted by law. It is a record and communication tool, not a
          guarantee that a customer will accept work, pay an invoice, post a
          review, or rebook. ABØ Studios is not responsible for disputes caused
          by inaccurate, unauthorized, or misleading content uploaded by an
          account holder.
        </p>
      </section>

      <section>
        <h2>Changes to these terms</h2>
        <p>
          If these terms change, the updated date will appear at the top of this
          page. Material changes may also be communicated inside the product.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent through the ABØ Studios
          contact page at <a href="https://abodev.dev">abodev.dev</a>.
        </p>
      </section>
    </PublicDocument>
  );
}
