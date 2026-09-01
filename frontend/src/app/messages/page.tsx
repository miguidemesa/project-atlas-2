"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { OfferActions } from "@/components/orders/offer-actions";
import { useAuth } from "@/lib/auth";
import { formatPeso, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

interface ThreadPreview {
  otherUserId: string;
  otherName: string;
  listingId?: string;
  listingTitle?: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  mine: boolean;
  content: string;
  kind?: string;
  createdAt: string;
}

interface OfferCardPayload {
  offerId: string;
  amount: number;
  listingId: string;
  actorRole: "buyer" | "seller";
}

function authedFetchFactory(authFetch: (p: string, i?: RequestInit) => Promise<Response>) {
  return (path: string, init?: RequestInit) => authFetch(path, init);
}

function MessagesInner() {
  const { user, authFetch } = useAuth();
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const [active, setActive] = useState<{ userId: string; name: string; listingId?: string } | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const threads = useQuery({
    queryKey: ["conversations"],
    queryFn: () =>
      authFetch("/api/conversations").then((r) => r.json()).then((j) => j.data as ThreadPreview[]),
    enabled: Boolean(user),
    refetchInterval: 10_000,
  });

  const messages = useQuery({
    queryKey: ["thread", active?.userId, active?.listingId],
    queryFn: () =>
      authFetch(
        `/api/conversations/${active!.userId}/messages${active?.listingId ? `?listingId=${active.listingId}` : ""}`,
      ).then((r) => r.json()),
    enabled: Boolean(user && active),
    refetchInterval: 8_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data]);

  // deep link: /messages?to=<id>&name=<name>
  useEffect(() => {
    const to = params.get("to");
    if (to && !active) {
      setActive({ userId: to, name: params.get("name") ?? "Atlas user" });
    }
  }, [params, active]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    await authFetch(`/api/conversations/${active.userId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toUserId: active.userId,
        listingId: active.listingId ?? null,
        content,
      }),
    });
    void queryClient.invalidateQueries({ queryKey: ["thread"] });
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-3xl text-ink">Messages</h1>
        <p className="mt-2 text-sm text-ink-dim">Sign in to talk shop with buyers and sellers.</p>
        <Link href="/login" className="mt-6 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-base hover:bg-gold-dim">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <header className="mb-8">
        <h1 className="font-display text-4xl text-ink">Messages</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* thread list */}
        <aside aria-label="Conversations">
          {threads.isPending ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-elevated" />
              ))}
            </div>
          ) : !threads.data || threads.data.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-hv p-8 text-center text-sm text-ink-dim">
              No conversations yet. Message a seller from their profile.
            </p>
          ) : (
            <ul className="space-y-2">
              {threads.data.map((t) => (
                <li key={`${t.otherUserId}-${t.listingId ?? "general"}`}>
                  <button
                    type="button"
                    onClick={() => setActive({ userId: t.otherUserId, name: t.otherName, listingId: t.listingId ?? undefined })}
                    className={cn(
                      "w-full rounded-xl border p-3.5 text-left transition-colors",
                      active?.userId === t.otherUserId && active?.listingId === t.listingId
                        ? "border-gold bg-elevated"
                        : "border-line bg-elevated hover:border-line-hv",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium text-ink">{t.otherName}</span>
                      {t.unread > 0 && (
                        <span className="rounded-full bg-gold px-1.5 text-[10px] font-bold text-base">{t.unread}</span>
                      )}
                    </div>
                    {t.listingTitle && (
                      <p className="truncate text-[11px] text-ink-faint">re: {t.listingTitle}</p>
                    )}
                    <p className="truncate text-xs text-ink-dim">{t.lastMessage}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-faint">{timeAgo(t.lastAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* conversation pane */}
        <section aria-label="Conversation" className="rounded-2xl border border-line bg-elevated shadow-card min-h-[480px] flex flex-col">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-10 text-center text-sm text-ink-faint">
              Select a conversation to start chatting.
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                <Link href="/messages" className="lg:hidden text-ink-dim hover:text-ink" aria-label="Back to threads">
                  <ArrowLeft size={18} />
                </Link>
                <p className="font-medium text-ink">{active.name}</p>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto p-5 max-h-[420px]">
                {(messages.data?.messages as ChatMessage[] | undefined)?.map((m) => {
                  if (m.kind === "offer") {
                    let payload: OfferCardPayload | null = null;
                    try { payload = JSON.parse(m.content) as OfferCardPayload; } catch { /* fall through */ }
                    if (payload) {
                      const myRole = active.userId === payload.listingId ? undefined : (user?.id === payload.actorRole ? undefined : undefined);
                      void myRole;
                      const viewerIsSellerOfDeal = true; // role resolved via actions below
                      void viewerIsSellerOfDeal;
                      return (
                        <div key={m.id} className={cn("flex w-full", m.mine ? "justify-end" : "justify-start")}>
                          <OfferChatCard
                            payload={payload}
                            mine={m.mine}
                            onAction={() => {
                              void queryClient.invalidateQueries({ queryKey: ["thread", active.userId, active.listingId] });
                              void queryClient.invalidateQueries({ queryKey: ["offers", "mine"] });
                              void queryClient.invalidateQueries({ queryKey: ["orders"] });
                            }}
                          />
                        </div>
                      );
                    }
                  }
                  return (
                  <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                    <p
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        m.mine
                          ? "bg-gold/15 text-ink rounded-br-sm"
                          : "bg-raised text-ink rounded-bl-sm",
                      )}
                    >
                      {m.content}
                    </p>
                  </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="flex gap-2 border-t border-line p-4">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  aria-label="Message"
                  className="flex-1 rounded-lg border border-line bg-base px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label="Send message"
                  className="rounded-lg bg-gold px-4 py-2.5 text-base font-semibold text-base hover:bg-gold-dim disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 lg:px-8"><div className="h-64 animate-pulse rounded-2xl bg-elevated" /></div>}>
      <MessagesInner />
    </Suspense>
  );
}


function OfferChatCard({
  payload,
  mine,
  onAction,
}: {
  payload: OfferCardPayload;
  mine: boolean;
  onAction: () => void;
}) {
  // The actor is the other side when the card came from them → we can act.
  const canAct = !mine;

  return (
    <div className="w-full max-w-[85%] rounded-xl border border-gold/50 bg-gold/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Offer</span>
        <span className="font-display text-2xl leading-none text-gold">
          {formatPeso(payload.amount)}
        </span>
      </div>
      {canAct && (
        <div className="mt-3 border-t border-gold/25 pt-3">
          <OfferActions
            offer={{
              id: payload.offerId,
              listingId: payload.listingId,
              listingTitle: "",
              listingPrice: 0,
              amount: payload.amount,
              status: "pending",
              viewerRole: payload.actorRole === "buyer" ? "seller" : "buyer",
              awaitingViewerResponse: true,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 172_800_000).toISOString(),
            }}
            onDone={onAction}
          />
        </div>
      )}
    </div>
  );
}
