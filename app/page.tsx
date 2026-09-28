import { LandingPage } from "./_components/LandingPage";
import { SITE_ORIGIN } from "../lib/site";

const rootJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://abodev.dev/#organization",
      name: "ABØ Studios",
      url: "https://abodev.dev",
    },
    {
      "@type": "WebApplication",
      name: "SweepSign",
      url: SITE_ORIGIN,
      description:
        "Create a clear, customer-ready record of completed cleaning work, proof, exceptions, and the next step.",
      applicationCategory: "BusinessApplication",
      provider: { "@id": "https://abodev.dev/#organization" },
    },
  ],
};

const serializedRootJsonLd = JSON.stringify(rootJsonLd).replace(
  /</g,
  "\\u003c",
);

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializedRootJsonLd }}
      />
      <LandingPage />
    </>
  );
}
