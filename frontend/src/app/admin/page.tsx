"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchMyRewards } from "@/lib/api";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/cn";

type Tab = "payouts" | "disputes";

interface PayoutItem {
  id: string;
  userId: string;
  amount: number;
  method: string;
  destination: string;
  status: string;
  createdAt: string;
}

interface DisputeItem {
  id: string;
  orderId: string;
  orderTitle: string;
  status: string;
  reason: string;
  resolutionNote?: string;
  createdAt: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("payouts");
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!user || user.role !== "admin") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center px-4 text-center">
        <div>
          <p className="font-display text-2xl text-ink">Admin access required.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-gold hover:underline">← Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <header className="mb-8">
        <h1 className="font-display text-4xl text-ink">Admin console</h1>
        <p className="mt-2 text-sm text-ink-dim">Operate the marketplace — payouts, disputes, moderation.</p>
      </header>

      <div className="mb-6 flex gap-1" role="tablist">
        {(["payouts", "disputes"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-gold text-base font-semibold" : "text-ink-dim hover:bg-elevated hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "payouts" ? <PayoutsTab busyId={busyId} setBusyId={setBusyId} qc={queryClient} /> : <DisputesTab busyId={busyId} setBusyId={setBusyId} qc={queryClient} />}
    </div>
  );
}

function PayoutsTab({ busyId, setBusyId, qc }: { busyId: string | null; setBusyId: (v: string | null) => void; qc: ReturnType<typeof useQueryClient> }) {
  const { authFetch } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin", "payouts"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/payouts?status=pending");
      return res.ok ? (await res.json()).data as PayoutItem[] : [];
    },
  });

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    await authFetch(`/api/admin/payouts/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "reject" ? { note: "" } : undefined),
    });
    setBusyId(null);
    void qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
  }

  if (!data || data.length === 0) {
    return <p className="rounded-xl border border-dashed border-line-hv p-10 text-center text-sm text-ink-dim">No pending payouts.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-elevated shadow-card">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wider text-ink-faint"><th className="px-4 py-3">Seller</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Method</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
        <tbody>{data.map((p) => (
          <tr key={p.id} className="border-b border-line/60 last:border-0 hover:bg-raised">
            <td className="px-4 py-3 font-mono text-xs">{p.userId.slice(0, 8)}</td>
            <td className="px-4 py-3 font-semibold text-gold">{formatPeso(p.amount)}</td>
            <td className="px-4 py-3 text-xs uppercase text-ink-dim">{p.method}</td>
            <td className="px-4 py-3 text-right">
              <button type="button" disabled={busyId === p.id} onClick={() => act(p.id, "approve")} className="rounded-lg bg-confirmed px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40 mr-1">Approve</button>
              <button type="button" disabled={busyId === p.id} onClick={() => act(p.id, "reject")} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-dim hover:border-urgent hover:text-urgent disabled:opacity-40">Reject</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function DisputesTab({ busyId, setBusyId, qc }: { busyId: string | null; setBusyId: (v: string | null) => void; qc: ReturnType<typeof useQueryClient> }) {
  const { authFetch } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin", "disputes"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/disputes?status=open");
      return res.ok ? (await res.json()).data as DisputeItem[] : [];
    },
  });

  async function resolve(id: string, outcome: string) {
    setBusyId(id);
    await authFetch(`/api/admin/disputes/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    });
    setBusyId(null);
    void qc.invalidateQueries({ queryKey: ["admin", "disputes"] });
  }

  if (!data || data.length === 0) {
    return <p className="rounded-xl border border-dashed border-line-hv p-10 text-center text-sm text-ink-dim">No open disputes.</p>;
  }

  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.id} className="rounded-xl border border-line bg-elevated p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">{d.orderTitle}</span>
            <span className="font-mono text-xs text-ink-faint">{new Date(d.createdAt).toLocaleDateString("en-PH")}</span>
          </div>
          <p className="mt-1 text-sm text-ink-dim">{d.reason}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busyId === d.id} onClick={() => resolve(d.id, "release_seller")} className="rounded-lg bg-confirmed px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">Release seller</button>
            <button type="button" disabled={busyId === d.id} onClick={() => resolve(d.id, "refund_buyer")} className="rounded-lg border border-urgent px-3 py-1.5 text-xs font-medium text-urgent hover:bg-urgent/10 disabled:opacity-40">Refund buyer</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
