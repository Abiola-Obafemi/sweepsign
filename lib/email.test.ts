import { describe, expect, it, vi } from "vitest";
import {
  authEmailContent,
  resendTransport,
  sendAuthEmail,
  type EmailTransport,
} from "./email";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("transactional auth email boundary", () => {
  it("renders a reset message without exposing an unescaped URL", () => {
    const email = authEmailContent(
      "reset",
      "https://www.sweepsign.com/reset-password?token=<token>",
    );
    expect(email.subject).toBe("Reset your SweepSign password");
    expect(email.html).toContain("token=&lt;token&gt;");
    expect(email.text).toContain("reset your password");
  });

  it("does not pretend delivery happened without a configured transport", async () => {
    await expect(
      sendAuthEmail(
        "reset",
        { to: "person@example.com", url: "https://example.com/reset" },
        null,
      ),
    ).resolves.toEqual({ delivered: false });
  });

  it("uses an injected transport for local tests", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const transport: EmailTransport = { send };
    await expect(
      sendAuthEmail(
        "verify",
        { to: "person@example.com", url: "https://example.com/verify" },
        transport,
      ),
    ).resolves.toEqual({ delivered: true });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "person@example.com",
        subject: "Verify your SweepSign email",
      }),
    );
  });

  it("keeps the provider disabled until both server values exist", () => {
    const previousKey = process.env.RESEND_API_KEY;
    const previousFrom = process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    expect(resendTransport()).toBeNull();
    restoreEnv("RESEND_API_KEY", previousKey);
    restoreEnv("RESEND_FROM_EMAIL", previousFrom);
  });

  it("sends through the Resend API without exposing the key in the body", async () => {
    const previous = {
      key: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
      replyTo: process.env.RESEND_REPLY_TO,
    };
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "SweepSign <auth@notify.sweepsign.com>";
    process.env.RESEND_REPLY_TO = "support@sweepsign.com";
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    const transport = resendTransport(fetcher as unknown as typeof fetch);
    await transport?.send({
      to: "person@example.com",
      subject: "Subject",
      text: "Text",
      html: "<p>Text</p>",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      }),
    );
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(request.body).toContain('"reply_to":"support@sweepsign.com"');
    expect(request.body).not.toContain("test-key");
    restoreEnv("RESEND_API_KEY", previous.key);
    restoreEnv("RESEND_FROM_EMAIL", previous.from);
    restoreEnv("RESEND_REPLY_TO", previous.replyTo);
  });
});
