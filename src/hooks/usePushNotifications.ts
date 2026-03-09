import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      // Check existing subscription
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async (companyId: string) => {
    if (!isSupported) return false;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      // Get VAPID public key from edge function
      const { data: vapidData, error: vapidErr } = await supabase.functions.invoke("push-vapid-key");
      if (vapidErr || !vapidData?.publicKey) {
        console.error("Failed to get VAPID key:", vapidErr);
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return false;

      const subJson = subscription.toJSON();
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);

      // Store subscription in DB
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: session.session.user.id,
          company_id: companyId,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys?.p256dh || "",
          auth_key: subJson.keys?.auth || "",
          device_type: isMobile ? "mobile" : "desktop",
        },
        { onConflict: "endpoint" }
      );

      if (error) {
        console.error("Failed to save push subscription:", error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    }
  }, []);

  return { isSupported, isSubscribed, permission, subscribe, unsubscribe };
}
