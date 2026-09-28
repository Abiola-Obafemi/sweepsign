import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { authRateLimit } from "./auth-rate-limit";
import { db, usesPostgres } from "./db";
import { sendAuthEmail } from "./email";
import { canonicalAuthUrl } from "./site";

const production = process.env.NODE_ENV === "production";
const allowedHosts = [
  "localhost:3000",
  "127.0.0.1:3000",
  "localhost:3100",
  "127.0.0.1:3100",
  "*.vercel.app",
  ...(process.env.BETTER_AUTH_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
];

async function deliverAuthEmail(
  kind: "reset" | "verify",
  input: { to: string; url: string },
) {
  try {
    await sendAuthEmail(kind, {
      to: input.to,
      url: canonicalAuthUrl(input.url),
    });
  } catch {
    // Keep the public response generic for known and unknown addresses. The
    // operational log intentionally excludes the address, URL, and token.
    console.error("SweepSign transactional auth email delivery failed.");
  }
}

export function assertAuthEnvironment() {
  if (production && !process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required in production.");
  }
}

export const auth = betterAuth({
  logger: { level: "error" },
  database: { db, type: usesPostgres ? "postgres" : "sqlite" },
  secret: process.env.BETTER_AUTH_SECRET ?? randomBytes(32).toString("hex"),
  baseURL: { allowedHosts, protocol: "auto" },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    // The callback deliberately resolves when mail is not configured. The
    // client reports a generic response and never claims a message was sent.
    sendResetPassword: async ({ user, url }) => {
      await deliverAuthEmail("reset", { to: user.email, url });
    },
  },
  emailVerification: {
    sendOnSignUp: false,
    sendVerificationEmail: async ({ user, url }) => {
      await deliverAuthEmail("verify", { to: user.email, url });
    },
  },
  rateLimit: authRateLimit,
  advanced: { cookiePrefix: "sweepsign", useSecureCookies: production },
  plugins: [nextCookies()],
});
