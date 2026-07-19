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
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#08182fff",
      showSpinner: false,
    },
    LocalNotifications: {
      iconColor: "#27b9d7",
    },
  },
};

export default config;
