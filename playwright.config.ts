import { defineConfig } from "@playwright/test";

const hostedBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: hostedBaseURL || "http://127.0.0.1:3100",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: hostedBaseURL
    ? undefined
    : {
        command:
          "npm run db:migrate && npm run dev -- --hostname 127.0.0.1 --port 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: false,
        env: {
          BETTER_AUTH_SECRET: "sweepsign-e2e-secret-at-least-32-characters",
          DATABASE_URL: "",
          POSTGRES_URL: "",
          SWEEPSIGN_DB_PATH: ".data/sweepsign-e2e.sqlite",
        },
      },
});
