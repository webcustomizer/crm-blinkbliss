import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.blinkbliss.crm",
  appName: "CRM Blink Bliss",

  webDir: "out",

  server: {
    url: "https://crm-blinkbliss.vercel.app",
    cleartext: false,
  },
};

export default config;
