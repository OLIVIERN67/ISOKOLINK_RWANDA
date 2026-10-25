import { useCallback, useEffect, useRef, useState } from "react";
import { messagingApi, notificationApi } from "../services/api";

export function useUnreadCounts(pollMs = 45000) {
  const [notifications, setNotifications] = useState(0);
  const [messages, setMessages] = useState(0);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [notificationResult, messageResult] = await Promise.all([
        notificationApi.unreadCount(),
        messagingApi.unreadCount(),
      ]);
      if (!mounted.current) return;
      setNotifications(notificationResult.count);
      setMessages(messageResult.count);
    } catch {
      // Silent: unread badges should never block the UI.
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener("isokolink:unread", onRefresh);
    const timer = window.setInterval(() => void refresh(), pollMs);
    return () => {
      mounted.current = false;
      window.removeEventListener("isokolink:unread", onRefresh);
      window.clearInterval(timer);
    };
  }, [refresh, pollMs]);

  return { notifications, messages, refresh };
}
