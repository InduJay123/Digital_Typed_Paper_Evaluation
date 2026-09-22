"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function RegisterForm() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    const supabase =
      createClient();

    const {
      data,
      error,
    } =
      await supabase.auth.signUp({
        email,
        password,

        options: {
          data: {
            full_name: name,
          },

          emailRedirectTo:
            `${location.origin}/auth/callback`,
        },
      });

    setLoading(false);

    if (error) {
      setError(
        error.message
      );

      return;
    }

    // ========================================================
    // EMAIL CONFIRMATION DISABLED
    //
    // Supabase creates an authenticated session immediately.
    // Send the new student to onboarding.
    // ========================================================

    if (data.session) {
      router.replace(
        "/onboarding"
      );

      return;
    }

    // ========================================================
    // EMAIL CONFIRMATION ENABLED
    //
    // Student must confirm their email first.
    // ========================================================

    setMessage(
      "Account created successfully. Please check your email and confirm your account before signing in."
    );
  }

  return (
    <div className="auth-card">

      <div className="auth-brand">
        Commerce College Online
      </div>

      <div className="eyebrow">
        Student registration
      </div>

      <h1
        style={{
          fontSize: 34,
        }}
      >
        Create account
      </h1>

      <form
        className="form-stack"
        onSubmit={submit}
      >

        {/* NAME */}

        <div className="field">
          <label>
            Name
          </label>

          <input
            value={name}
            onChange={(e) =>
              setName(
                e.target.value
              )
            }
            required
          />
        </div>

        {/* EMAIL */}

        <div className="field">
          <label>
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            required
          />
        </div>

        {/* PASSWORD */}

        <div className="field">
          <label>
            Password
          </label>

          <input
            type="password"
            minLength={6}
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            required
          />
        </div>

        {/* ERROR */}

        {error ? (
          <div className="error-box">
            {error}
          </div>
        ) : null}

        {/* SUCCESS MESSAGE */}

        {message ? (
          <div className="success-box">
            {message}
          </div>
        ) : null}

        {/* SUBMIT */}

        <button
          className="button"
          disabled={loading}
        >
          {loading
            ? "Creating…"
            : "Create account"}
        </button>

      </form>

      <p
        className="helper-text"
        style={{
          marginTop: 18,
        }}
      >
        Already registered?{" "}

        <Link
          className="inline-link"
          href="/login"
        >
          Sign in
        </Link>
      </p>

    </div>
  );
}