"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">Commerce College Online</div>
      <div className="eyebrow">Student sign in</div>
      <h1 style={{ fontSize: 34 }}>Welcome back</h1>
      <form className="form-stack" onSubmit={submit}>
        <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="field"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        {error ? <div className="error-box">{error}</div> : null}
        <button className="button" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="helper-text" style={{ marginTop: 18 }}>No account? <Link className="inline-link" href="/register">Create one</Link></p>
    </div>
  );
}
