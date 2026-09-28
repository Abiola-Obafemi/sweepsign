import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const evidencePath = (...parts: string[]) =>
  path.resolve(process.cwd(), "..", "..", ".impeccable", "review", ...parts);

const uniqueAccount = () => ({
  email: `sweepsign-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
  password: "SweepSign-test-2026",
});

async function signUpAndOnboard(page: Page, business = "Bright Day Cleaning") {
  const account = uniqueAccount();
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
  });
  await page.goto("/signup");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Business name").fill(business);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Cleaner name").fill("Sarah");
  await page.getByRole("button", { name: "Create first job" }).click();
  await expect(page).toHaveURL(/\/app\/jobs\/(new|[\w-]+)/);
  await expect(
    page.getByRole("heading", { name: "Finish the clean." }),
  ).toBeVisible();
  return account;
}

test("serves professional public, legal, SEO, and error surfaces", async ({
  page,
  request,
}) => {
  const home = await request.get("/");
  expect(home.status()).toBe(200);
  const homeHtml = await home.text();
  expect(homeHtml).toContain("Clean homes.");
  expect(homeHtml).toContain("How SweepSign works");
  expect(homeHtml).toContain("Before you start");
  expect(homeHtml).not.toContain("BAILOUT_TO_CLIENT_SIDE_RENDERING");
  expect(homeHtml).not.toContain("Loading SweepSign");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(home.headers()["x-frame-options"]).toBe("DENY");
  expect(home.headers()["x-xss-protection"]).toBe("0");
  expect(home.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );

  await page.goto("/");
  await expect(page).toHaveTitle(/SweepSign/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://www.sweepsign.com",
  );
  await expect(page.getByRole("link", { name: "Support" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Support and legal" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terms" })).toBeVisible();

  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(jsonLd).not.toBeNull();
  const structuredData = JSON.parse(jsonLd!);
  expect(structuredData["@graph"]).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ "@type": "Organization", name: "ABØ Studios" }),
      expect.objectContaining({
        "@type": "WebApplication",
        name: "SweepSign",
      }),
    ]),
  );

  const support = await request.get("/support");
  expect(support.status()).toBe(200);
  await page.goto("/support");
  await expect(
    page.getByRole("heading", { name: "Help with SweepSign" }),
  ).toBeVisible();
  await expect(
    page.getByText(/do not send your password or customer photos/i),
  ).toBeVisible();

  const privacy = await request.get("/privacy");
  expect(privacy.status()).toBe(200);
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacy Policy" }),
  ).toBeVisible();
  await expect(
    page.getByText(/do not sell personal information/i),
  ).toBeVisible();

  await page.goto("/terms");
  await expect(
    page.getByRole("heading", { name: "Terms of Use" }),
  ).toBeVisible();

  const missing = await request.get("/definitely-not-a-real-page");
  expect(missing.status()).toBe(404);
  expect((await request.get("/app/definitely-not-a-real-page")).status()).toBe(
    404,
  );
  await page.goto("/definitely-not-a-real-page");
  await expect(
    page.getByRole("heading", { name: "Page not found." }),
  ).toBeVisible();

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: https://www.sweepsign.com/sitemap.xml");
  expect(robots).toContain("Disallow: /app/");
  expect(robots).toContain("Disallow: /reset-password");
  expect(robots).toContain("Allow: /support");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("https://www.sweepsign.com/privacy");
  expect(sitemap).toContain("https://www.sweepsign.com/support");
  const security = await request.get("/.well-known/security.txt");
  expect(security.status()).toBe(200);
  expect(await security.text()).toContain(
    "Canonical: https://www.sweepsign.com/.well-known/security.txt",
  );

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(`unknown-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If recovery is available",
  );
  await page.goto("/reset-password");
  await page.getByLabel("New password").fill("SweepSign-new-2026");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.locator(".inline-error")).toContainText(
    "invalid or has expired",
  );
});

test("completes the real first-run and returning-user journey", async ({
  page,
  browser,
}) => {
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    const isVercelPreviewToolbarNoise =
      text.includes("vercel.live/_next-live/feedback/feedback.js") &&
      text.includes("Content Security Policy");
    if (message.type() === "error" && !isVercelPreviewToolbarNoise)
      runtimeErrors.push(text);
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => undefined,
    });
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Clean homes/ }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 375);
  await page.screenshot({
    path: evidencePath("landing-375.png"),
    fullPage: true,
  });

  await page
    .getByRole("link", { name: "Create your first handoff" })
    .first()
    .click();
  await page.screenshot({
    path: evidencePath("signup-375.png"),
    fullPage: true,
  });
  const account = uniqueAccount();
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.screenshot({
    path: evidencePath("onboarding-375.png"),
    fullPage: true,
  });
  await page.getByLabel("Business name").fill("Bright Day Cleaning");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Cleaner name").fill("Sarah");
  await page.getByRole("button", { name: "Create first job" }).click();
  await expect(page).toHaveURL(/\/app\/jobs\/(new|[\w-]+)/);
  await expect(
    page.getByRole("heading", { name: "Finish the clean." }),
  ).toBeVisible();
  await page.screenshot({
    path: evidencePath("editor-375.png"),
    fullPage: false,
  });

  await page.getByLabel(/Job nickname/).fill("Rivera home");
  await page.getByRole("button", { name: /Mark all complete/ }).click();
  await page.getByRole("button", { name: "Not done" }).nth(2).click();
  await page.getByRole("button", { name: /Add proof/ }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "test.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page
    .getByLabel(/Notes or exceptions/)
    .fill("Fridge exterior skipped at the client’s request.");
  await page.getByLabel(/Completed by/).fill("Sarah");
  await page.getByRole("button", { name: /Choose next step/ }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "full http:// or https:// link" }),
  ).toContainText("full http:// or https:// link");
  await page
    .getByLabel(/Leave a review link/)
    .fill("https://example.com/review");
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.locator(".share-status")).toContainText(/copied/i);
  await expect(page).toHaveURL(/\/app\/jobs\/[\w-]+/);
  await expect(page).not.toHaveURL(/\/app\/jobs\/new$/);
  const jobUrl = page.url();
  await page.locator(".handoff-sheet").screenshot({
    path: evidencePath("customer-preview-375.png"),
    style:
      ".app-header, .app-nav, .editor-route-heading { visibility: hidden !important; }",
  });

  const handoffResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/jobs\/[^/]+\/handoff$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Generate link" }).click();
  const { url: publicUrl } = (await (await handoffResponse).json()) as {
    url: string;
  };
  await expect(page.locator(".public-share").getByRole("status")).toContainText(
    "read-only link",
  );
  const customerPage = await browser.newPage();
  await customerPage.setViewportSize({ width: 375, height: 812 });
  await customerPage.goto(publicUrl);
  await expect(
    customerPage.getByRole("heading", {
      name: "A cleaner home, ready for what’s next.",
    }),
  ).toBeVisible();
  await customerPage.screenshot({
    path: evidencePath("public-handoff-375.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Revoke link" })).toBeVisible();
  await page.getByRole("button", { name: "Revoke link" }).click();
  await expect(page.locator(".public-share").getByRole("status")).toContainText(
    "revoked",
  );
  await customerPage.reload();
  await expect(
    customerPage.getByRole("heading", {
      name: "This handoff is not available.",
    }),
  ).toBeVisible();
  await customerPage.close();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("link", { name: "Sign in" }).click();
  await page.screenshot({
    path: evidencePath("login-375.png"),
    fullPage: true,
  });
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Customer handoffs" }),
  ).toBeVisible();
  await page.screenshot({ path: evidencePath("jobs-375.png"), fullPage: true });
  await expect(page.getByRole("link", { name: /Rivera home/ })).toBeVisible();
  await page.getByRole("link", { name: /Rivera home/ }).click();
  await expect(page.getByLabel(/Job nickname/)).toHaveValue("Rivera home");
  await expect(page).toHaveURL(jobUrl);
  expect(runtimeErrors).toEqual([]);
});

test("recovers a new-job draft after the API save fails", async ({ page }) => {
  const account = uniqueAccount();
  await page.goto("/signup");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Business name").fill("Offline Cleaner");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.route("**/api/jobs", async (route) => {
    if (route.request().method() === "POST") await route.abort();
    else await route.continue();
  });
  await page.getByRole("button", { name: "Create first job" }).click();
  await page.getByLabel(/Job nickname/).fill("Offline recovery");
  await expect(page.getByRole("alert").first()).toContainText(
    "saved only in this browser",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("sweepsign:draft:v1:new") ?? "null")
            ?.jobName,
      ),
    )
    .toBe("Offline recovery");
  await page.reload();
  await expect(page.getByLabel(/Job nickname/)).toHaveValue("Offline recovery");
});

test("edits and applies a reusable scope without pretending billing is configured", async ({
  page,
}) => {
  await signUpAndOnboard(page, "Template Cleaner");
  await page.goto("/app/templates");
  await page.getByLabel("New template name").fill("Turnover clean");
  await page
    .getByRole("button", { name: "Create from standard scope" })
    .click();
  const card = page.locator(".job-card").filter({ hasText: "Turnover clean" });
  await card.getByRole("button", { name: "Edit" }).click();
  const editor = page.getByLabel("Edit template");
  await editor.getByLabel("Room").first().fill("Entry");
  await editor.getByLabel("Task").first().fill("Mirror");
  await editor.getByRole("button", { name: "Save template" }).click();
  await expect(editor).toBeHidden();

  await page.goto("/app/jobs/new");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByLabel("Start from a saved scope").selectOption({
    label: "Turnover clean",
  });
  await expect(
    page.getByRole("heading", { name: "Entry" }).first(),
  ).toBeVisible();
  await expect(page.getByText("Mirror").first()).toBeVisible();

  await page.goto("/app/billing");
  await expect(
    page.getByRole("heading", { name: "Billing test boundary" }),
  ).toBeVisible();
  await expect(page.getByText(/Test billing is unavailable/)).toBeVisible();
  await expect(page.getByRole("button", { name: /checkout/i })).toHaveCount(0);
});

test("protects app routes and rejects cross-account job access", async ({
  browser,
}) => {
  const anonymous = await browser.newPage();
  await anonymous.goto("/app/jobs");
  await expect(anonymous).toHaveURL(/\/login/);
  expect((await anonymous.request.get("/api/jobs")).status()).toBe(401);
  await anonymous.close();

  const firstContext = await browser.newContext();
  const first = await firstContext.newPage();
  await signUpAndOnboard(first, "First Cleaner");
  await first.getByLabel(/Job nickname/).fill("Private job");
  await expect(first).toHaveURL(/\/app\/jobs\/[\w-]+/);
  const jobId = first.url().split("/").pop()!;

  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  await signUpAndOnboard(second, "Second Cleaner");
  expect((await second.request.get(`/api/jobs/${jobId}`)).status()).toBe(404);
  await firstContext.close();
  await secondContext.close();
});

for (const viewport of [
  { name: "app-tablet-768.png", width: 768, height: 900 },
  { name: "app-desktop-1440.png", width: 1440, height: 1000 },
]) {
  test(`keeps the routed app usable at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/");
    await page.locator(".landing-sheet").evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      );
    });
    await page.screenshot({
      path: evidencePath(`landing-${viewport.width}.png`),
      fullPage: false,
    });
    if (viewport.width === 768) {
      const heading = await page
        .getByRole("heading", { name: /Clean homes/ })
        .boundingBox();
      const sheet = await page.locator(".landing-sheet").boundingBox();
      expect(sheet!.y).toBeGreaterThan(heading!.y + heading!.height);
    }
    await signUpAndOnboard(page, `Viewport ${viewport.width}`);
    const dimensions = await page.locator("html").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    const primary = await page
      .getByRole("button", { name: /Add proof/ })
      .boundingBox();
    expect(primary?.height).toBeGreaterThanOrEqual(48);
    await page.screenshot({
      path: evidencePath(viewport.name),
      fullPage: false,
    });
  });
}
