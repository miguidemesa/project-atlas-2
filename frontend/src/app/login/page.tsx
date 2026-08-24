"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell, inputCls, btnCls } from "@/components/auth/auth-shell";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <AuthShell
      title="Welcome back."
      subtitle="Sign in to bid, buy and track your collection."
      footer={
        <>
          New to Atlas?{" "}
          <Link href="/register" className="font-medium text-gold hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError("Sign-in is coming with the accounts launch — browse freely in the meantime.");
        }}
      >
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@manila.ph" className={inputCls} />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-ink">Password</label>
            <Link href="/login" className="text-xs text-ink-dim hover:text-gold">Forgot?</Link>
          </div>
          <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
        </div>

        {error && <p role="alert" className="rounded-lg bg-warn/10 px-3.5 py-2.5 text-xs text-warn">{error}</p>}

        <button type="submit" className={btnCls}>Sign in</button>

        <div className="flex items-center gap-3 pt-1" aria-hidden>
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-ink-faint">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          disabled
          title="Google sign-in arrives with the accounts launch"
          className="w-full rounded-lg border border-line py-2.5 text-sm font-medium text-ink-dim transition-colors enabled:hover:border-line-hv"
        >
          Continue with Google
        </button>
      </form>
    </AuthShell>
  );
}
