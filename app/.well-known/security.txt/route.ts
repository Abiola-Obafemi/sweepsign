import { SITE_ORIGIN } from "../../../lib/site";

const securityText = `Contact: https://abodev.dev
Expires: 2027-09-25T23:59:59.000Z
Canonical: ${SITE_ORIGIN}/.well-known/security.txt
Preferred-Languages: en
`;

export function GET() {
  return new Response(securityText, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
