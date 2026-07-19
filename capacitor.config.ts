import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.dragonmode.mobile",
  appName: "Dragon Mode",
  webDir: "mobile-dist",
  backgroundColor: "#08182f",
  ios: {
    contentInset: "always",
  },
  android: {
    backgroundColor: "#08182f",
  },
};

export default config;
