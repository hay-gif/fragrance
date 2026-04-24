"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type NotificationType =
  | "new_follower"
  | "new_release"
  | "order_status"
  | "sample_update"
  | "payout_ready";

type Notification = {
  id: string;
  type: NotificationType;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
};

type DbNotificationRow = {
  id: string;
  type: string;
  data: Record<string, string>;
  read: boolean;
  created_at: string;
};

function getNotificationLabel(type: NotificationType): string {
  if (type === "new_follower") return "Neuer Follower";
  if (type === "new_release") return "Neuer Duft veröffentlicht";
  if (type === "order_status") return "Bestellstatus";
  if (type === "sample_update") return "Sample-Update";
  if (type === "payout_ready") return "Auszahlung bereit";
  return "Benachrichtigung";
}

function getNotificationIcon(type: NotificationType): string {
  if (type === "new_follower") return "⊕";
  if (type === "new_release") return "◉";
  if (type === "order_status") return "◳";
  if (type === "sample_update") return "◈";
  if (type === "payout_ready") return "§";
  return "·";
}

function getNotificationText(n: Notification): string {
  if (n.type === "new_follower") {
    return "Jemand folgt dir jetzt.";
  }
  if (n.type === "new_release") {
    return n.data.fragrance_name
      ? `Neuer Duft: "${n.data.fragrance_name}" wurde veröffentlicht.`
      : "Ein Creator hat einen neuen Duft veröffentlicht.";
  }
  if (n.type === "order_status") {
    return n.data.order_id
      ? `Bestellung ${n.data.order_id} wurde aktualisiert.`
      : "Deine Bestellung wurde aktualisiert.";
  }
  if (n.type === "sample_update") {
    return "Dein Sample wurde aktualisiert.";
  }
  if (n.type === "payout_ready") {
    return "Eine Auszahlung ist für dich bereit.";
  }
  return "";
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, data, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Fehler beim Laden der Notifications:", error);
        setLoading(false);
        return;
      }

      const mapped: Notification[] = (
        (data ?? []) as unknown as DbNotificationRow[]
      ).map((row) => ({
        id: row.id,
        type: row.type as NotificationType,
        data: row.data ?? {},
        read: row.read,
        createdAt: row.created_at,
      }));

      setNotifications(mapped);
      setLoading(false);
    }

    loadNotifications();
  }, []);

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    }
  }

  async function markAllAsRead() {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    setMarkingAllRead(true);

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .in(
        "id",
        unread.map((n) => n.id),
      );

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }

    setMarkingAllRead(false);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin" />
          <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Lädt</p>
        </div>
      </main>
    );
  }

  if (notLoggedIn) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] pb-10">
        <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
          <h1 className="text-3xl font-bold text-white">Benachrichtigungen</h1>
        </div>
        <div className="mx-auto max-w-3xl px-5 py-6">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#6E6860]">Bitte logge dich ein.</p>
            <Link
              href="/auth"
              className="mt-4 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all"
            >
              Zum Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Benachrichtigungen</h1>
            <div className="mt-2 flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#0A0A0A] border border-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white">
                  {unreadCount} ungelesen
                </span>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAllRead}
              className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium text-white hover:border-white/60 transition-colors disabled:opacity-40"
            >
              {markingAllRead ? "..." : "Alle gelesen"}
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {notifications.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-8 text-center">
            <p className="text-sm text-[#6E6860]">Keine Benachrichtigungen vorhanden.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl bg-white border border-[#E5E0D8] p-5 ${
                  !n.read ? "border-l-2 border-l-[#0A0A0A]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="mt-0.5 text-base text-[#6E6860] shrink-0">
                      {getNotificationIcon(n.type)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-[#0A0A0A]">
                          {getNotificationLabel(n.type)}
                        </p>
                        {!n.read && (
                          <span className="rounded-full bg-[#0A0A0A] px-2 py-0.5 text-[9px] font-medium text-white">
                            Neu
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#6E6860]">
                        {getNotificationText(n)}
                      </p>
                      <p className="mt-1.5 text-[10px] text-[#C5C0B8]">
                        {new Date(n.createdAt).toLocaleString("de-DE")}
                      </p>
                    </div>
                  </div>

                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="shrink-0 rounded-full border border-[#E5E0D8] px-4 py-2 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                    >
                      Gelesen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
