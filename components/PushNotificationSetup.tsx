// components/PushNotificationSetup.tsx
"use client";

import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";

export default function PushNotificationSetup() {
  useEffect(() => {
    // Only run on native platforms (Android/iOS), not in browser
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const registerPush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          console.log("Push notification permission denied");
          return;
        }

        await PushNotifications.register();
      } catch (error) {
        console.log("Push registration error:", error);
      }
    };

    // Fires once the device successfully registers and gets a token
    PushNotifications.addListener("registration", async (token) => {
      try {
        await fetch("/api/save-push-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value }),
        });
      } catch (error) {
        console.log("Failed to save push token:", error);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.log("Push registration error:", err);
    });

    // Optional: handle taps on notifications while app is open
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification) => {
        const link = notification.notification.data?.link;
        if (link) {
          window.location.href = link;
        }
      },
    );

    registerPush();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);

  return null;
}
