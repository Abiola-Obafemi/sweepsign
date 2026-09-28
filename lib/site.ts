export const SITE_ORIGIN = "https://www.sweepsign.com";

export function canonicalAuthUrl(
  value: string,
  production = process.env.NODE_ENV === "production",
) {
  const url = new URL(value);
  if (production) {
    const origin = new URL(SITE_ORIGIN);
    url.protocol = origin.protocol;
    url.host = origin.host;
  }
  return url.toString();
}
