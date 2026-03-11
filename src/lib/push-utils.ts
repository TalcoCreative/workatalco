import { supabase } from "@/integrations/supabase/client";

interface PushPayload {
  companyId: string;
  userId?: string;
  userIds?: string[];
  title: string;
  message: string;
  actionUrl?: string;
  eventType: string;
  tag?: string;
}

/**
 * Send push notification via edge function.
 * Call this client-side AFTER data has been successfully saved.
 * Does NOT throw - fails silently to avoid blocking main flow.
 */
export async function sendPushNotification(payload: PushPayload) {
  try {
    // If multiple userIds, send one request per user
    const targets = payload.userIds?.length
      ? payload.userIds
      : payload.userId
        ? [payload.userId]
        : [undefined]; // broadcast to all company users

    for (const uid of targets) {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          company_id: payload.companyId,
          user_id: uid || null,
          title: payload.title,
          message: payload.message,
          action_url: payload.actionUrl || "/",
          event_type: payload.eventType,
          tag: payload.tag,
        },
      });
    }
  } catch (err) {
    console.error("[Push] Failed to send notification:", err);
  }
}
