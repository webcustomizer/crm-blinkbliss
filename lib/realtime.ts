import { supabase } from "./supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================
// Supabase Realtime — replaces polling for messages & typing
// ============================================================

type MessageCallback = (payload: any) => void;
type TypingCallback = (payload: any) => void;

const activeChannels = new Map<string, RealtimeChannel>();

export function subscribeToMessages(
  channelKey: string,
  onNewMessage: MessageCallback,
): () => void {
  if (activeChannels.has(`msg:${channelKey}`)) {
    activeChannels.get(`msg:${channelKey}`)!.unsubscribe();
  }
  const channel = supabase.channel(`msg:${channelKey}`, {
    config: { broadcast: { self: true } },
  });
  channel
    .on("broadcast", { event: "new_message" }, (payload) => {
      onNewMessage(payload.payload);
    })
    .subscribe();
  activeChannels.set(`msg:${channelKey}`, channel);
  return () => {
    channel.unsubscribe();
    activeChannels.delete(`msg:${channelKey}`);
  };
}

export function broadcastNewMessage(
  channelKey: string,
  messageData: any,
): Promise<void> {
  return new Promise((resolve) => {
    const channel = supabase.channel(`msg:${channelKey}`);
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      setTimeout(() => channel.unsubscribe(), 500);
      resolve();
    };

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel
          .send({
            type: "broadcast",
            event: "new_message",
            payload: messageData,
          })
          .then(finish)
          .catch(finish);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        finish();
      }
    });

    // Safety net: agar 3 seconds mein bhi kuch na ho to aage badh jao
    setTimeout(finish, 3000);
  });
}

export function subscribeToGroupMessages(
  onNewMessage: MessageCallback,
): () => void {
  const channelKey = "group:messages";
  if (activeChannels.has(channelKey)) {
    activeChannels.get(channelKey)!.unsubscribe();
  }
  const channel = supabase.channel(channelKey, {
    config: { broadcast: { self: false } },
  });
  channel
    .on("broadcast", { event: "new_group_message" }, (payload) => {
      onNewMessage(payload.payload);
    })
    .subscribe();
  activeChannels.set(channelKey, channel);
  return () => {
    channel.unsubscribe();
    activeChannels.delete(channelKey);
  };
}

export function broadcastNewGroupMessage(messageData: any): Promise<void> {
  return new Promise((resolve) => {
    const channel = supabase.channel("group:messages");
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      setTimeout(() => channel.unsubscribe(), 500);
      resolve();
    };

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel
          .send({
            type: "broadcast",
            event: "new_group_message",
            payload: messageData,
          })
          .then(finish)
          .catch(finish);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        finish();
      }
    });

    // Safety net: agar 3 seconds mein bhi kuch na ho to aage badh jao
    setTimeout(finish, 3000);
  });
}

export function subscribeToTyping(
  channelKey: string,
  onTyping: TypingCallback,
): {
  unsubscribe: () => void;
  sendTyping: (isTyping: boolean, name: string) => void;
} {
  if (activeChannels.has(`typing:${channelKey}`)) {
    activeChannels.get(`typing:${channelKey}`)!.unsubscribe();
  }
  const channel = supabase.channel(`typing:${channelKey}`, {
    config: { broadcast: { self: false } },
  });
  channel
    .on("broadcast", { event: "typing" }, (payload) => {
      onTyping(payload.payload);
    })
    .subscribe();
  activeChannels.set(`typing:${channelKey}`, channel);
  return {
    unsubscribe: () => {
      channel.unsubscribe();
      activeChannels.delete(`typing:${channelKey}`);
    },
    sendTyping: (isTyping: boolean, name: string) => {
      channel.send({
        type: "broadcast",
        event: "typing",
        payload: { isTyping, name, ts: Date.now() },
      });
    },
  };
}

/**
 * Broadcast settings change from the admin PATCH route.
 * Guaranteed delivery — does NOT require DB replication.
 */
export function broadcastSettingsChange(payload: {
  groupChatEnabled?: boolean;
  messageEnabled?: boolean;
}) {
  const channel = supabase.channel("crmsetting:changes");
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    setTimeout(() => channel.unsubscribe(), 1000);
  };
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      channel
        .send({ type: "broadcast", event: "settings_changed", payload })
        .then(finish)
        .catch(finish);
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      finish();
    }
  });
  setTimeout(finish, 3000);
}

/**
 * Subscribe to CRMSetting changes via BOTH Postgres Changes AND Broadcast.
 * Used by salesperson nav components for realtime updates without page refresh.
 */
export function subscribeToSettingsChanges(
  onChanged: (payload: {
    groupChatEnabled?: boolean;
    messageEnabled?: boolean;
  }) => void,
): () => void {
  const channelKey = "crmsetting:changes";
  if (activeChannels.has(channelKey)) {
    activeChannels.get(channelKey)!.unsubscribe();
  }
  const channel = supabase.channel(channelKey);
  // Postgres Changes (needs replication enabled on Supabase)
  channel
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "CRMSetting" },
      (payload: any) => {
        const row = payload.new;
        if (row) {
          onChanged({
            groupChatEnabled: row.groupChatEnabled !== false,
            messageEnabled: row.messageEnabled !== false,
          });
        }
      },
    )
    // Broadcast fallback (always works, no replication needed)
    .on("broadcast", { event: "settings_changed" }, (payload: any) => {
      if (payload.payload) {
        onChanged(payload.payload);
      }
    })
    .subscribe();
  activeChannels.set(channelKey, channel);
  return () => {
    channel.unsubscribe();
    activeChannels.delete(channelKey);
  };
}
