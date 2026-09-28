type AuthEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailTransport = {
  send(message: AuthEmail): Promise<void>;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

export function authEmailContent(
  kind: "reset" | "verify",
  url: string,
): Pick<AuthEmail, "subject" | "text" | "html"> {
  const reset = kind === "reset";
  const subject = reset
    ? "Reset your SweepSign password"
    : "Verify your SweepSign email";
  const action = reset ? "reset your password" : "verify your email address";
  const safeUrl = escapeHtml(url);
  return {
    subject,
    text: `Use this link to ${action}: ${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<main style="font-family:Arial,sans-serif;line-height:1.5;color:#14251f"><h1 style="font-size:20px">SweepSign</h1><p>Use the link below to ${action}.</p><p><a href="${safeUrl}">Continue securely</a></p><p>If you did not request this, you can ignore this email.</p></main>`,
  };
}

export function resendTransport(
  fetcher: typeof fetch = fetch,
): EmailTransport | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO;
  if (!apiKey || !from) return null;
  return {
    async send(message) {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          ...(replyTo ? { reply_to: replyTo } : {}),
          ...message,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok)
        throw new Error("Transactional email provider rejected the request.");
    },
  };
}

export async function sendAuthEmail(
  kind: "reset" | "verify",
  input: { to: string; url: string },
  transport: EmailTransport | null = resendTransport(),
) {
  if (!transport) return { delivered: false as const };
  await transport.send({ to: input.to, ...authEmailContent(kind, input.url) });
  return { delivered: true as const };
}

export function supportEmail() {
  return process.env.SWEEPSIGN_SUPPORT_EMAIL?.trim() || null;
}
