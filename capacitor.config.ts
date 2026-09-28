import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.abostudios.sweepsign",
  appName: "SweepSign",
  webDir: "capacitor-shell",
  server: {
    url: "https://www.sweepsign.com",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
