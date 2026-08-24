"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell, inputCls, btnCls } from "@/components/auth/auth-shell";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <AuthShell
      title="Join the hobby."
      subtitle="One account to buy, sell and follow the market."
      footer={
        <>
          Already collecting?{" "}
          <Link href="/login" className="font-medium text-gold hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError("Registration opens with the accounts launch — browse freely in the meantime.");
        }}
      >
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">Name</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Dela Cruz" className={inputCls} />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@manila.ph" className={inputCls} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8+ characters"
            aria-describedby="pw-hint"
            className={inputCls}
          />
          <p id="pw-hint" className="mt-1.5 text-xs text-ink-faint">
            {password.length === 0 ? "At least 8 characters." : password.length < 8 ? `${8 - password.length} more to go.` : "Good to go."}
          </p>
        </div>

        {error && <p role="alert" className="rounded-lg bg-warn/10 px-3.5 py-2.5 text-xs text-warn">{error}</p>}

        <button type="submit" className={btnCls}>Create account</button>

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
