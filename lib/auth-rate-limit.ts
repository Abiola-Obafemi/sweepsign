export const authRateLimit = {
  enabled: true,
  window: 60,
  max: 100,
  storage: "database",
  customRules: {
    "/sign-in/email": { window: 10, max: 5 },
    "/sign-up/email": { window: 60, max: 10 },
    "/request-password-reset": { window: 60 * 15, max: 3 },
    "/reset-password": { window: 60 * 15, max: 5 },
  },
} as const;
