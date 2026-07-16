import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.blinkbliss.crm",
  appName: "blinknbliss",
  webDir: "out",

  // 🌐 ADD THE SERVER BLOCK HERE FOR THE LIVE URL
  server: {
    url: "https://crm-blinkbliss.vercel.app", // Replace this with your actual live URL
    cleartext: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false, // we'll hide it manually once the web splash is ready
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK", // icon/text color: "DARK" or "LIGHT"
      backgroundColor: "#ffffff", // match your app's header/brand color
      overlaysWebView: false, // false = status bar takes its own space, doesn't sit on top of content
    },
    Keyboard: {
      resize: "body", // resizes body when keyboard opens, avoids inputs being hidden
      resizeOnFullScreen: true,
    },
  },
};

export default config;
