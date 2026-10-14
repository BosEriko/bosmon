"use client";
import { FormEvent, useState } from "react";
import { Account, authError } from "@/lib/account";
import {
  cloudEnabled,
  emailAccount,
  googleAccount,
  resetPassword,
  signOutAccount,
} from "@/lib/firebase";
export default function AccountPanel({
  account,
  beforeChange,
}: {
  account: Account | null;
  beforeChange: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "register" | "reset">("signin");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setPassword("");
      setConfirmation("");
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode === "register" && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    void run(async () => {
      if (mode === "reset") {
        await resetPassword(email);
        setMessage(
          "If this address has an account, you’ll receive a password reset email.",
        );
        return;
      }
      beforeChange();
      await emailAccount(email, password, mode === "register");
      setMessage("Your account is ready.");
    });
  }
  if (!cloudEnabled)
    return (
      <section className="account-panel">
        <h3>Your trainer account</h3>
        <p>
          Email/password and Google sign-in become available after Firebase is
          configured.
        </p>
      </section>
    );
  return (
    <section className="account-panel">
      <h3>
        {account && !account.isAnonymous
          ? "Your trainer account"
          : "Save your adventure online"}
      </h3>
      {account && !account.isAnonymous ? (
        <>
          <p>
            Signed in as <strong>{account.email}</strong>
          </p>
          <p>Your account’s adventure is separate from local guest play.</p>
          <button
            disabled={busy}
            className="subtle-button"
            onClick={() =>
              void run(async () => {
                beforeChange();
                await signOutAccount();
              })
            }
          >
            {busy ? "Please wait…" : "Sign out"}
          </button>
        </>
      ) : (
        <>
          {account?.isAnonymous && (
            <p>
              Create an account or connect Google to keep this guest account’s
              save. Signing into an existing account loads that account’s
              adventure.
            </p>
          )}
          <div className="account-tabs">
            {(["signin", "register", "reset"] as const).map((m) => (
              <button
                type="button"
                key={m}
                aria-pressed={mode === m}
                disabled={busy}
                onClick={() => {
                  setMode(m);
                  setError("");
                  setMessage("");
                  setPassword("");
                  setConfirmation("");
                }}
              >
                {m === "signin"
                  ? "Sign in"
                  : m === "register"
                    ? "Create account"
                    : "Reset password"}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <label className="name-label">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              {mode !== "reset" && (
                <label className="name-label">
                  Password
                  <input
                    type="password"
                    required
                    minLength={mode === "register" ? 6 : undefined}
                    autoComplete={
                      mode === "register" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              )}
              {mode === "register" && (
                <label className="name-label">
                  Confirm password
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </label>
              )}
              <button type="submit" className="primary-button full">
                {busy
                  ? "Please wait…"
                  : mode === "signin"
                    ? "Sign in with email"
                    : mode === "register"
                      ? "Create account"
                      : "Send reset email"}
              </button>
            </fieldset>
          </form>
          <button
            disabled={busy}
            className="subtle-button full google-signin"
            onClick={() =>
              void run(async () => {
                beforeChange();
                await googleAccount();
                setMessage("Google account connected.");
              })
            }
          >
            Continue with Google
          </button>
          {account?.isAnonymous && (
            <button
              disabled={busy}
              className="text-button"
              onClick={() =>
                void run(async () => {
                  beforeChange();
                  await signOutAccount();
                })
              }
            >
              Sign out of guest account
            </button>
          )}
          <p className="muted">
            Local guest progress stays in this browser. Signing in loads a
            separate account save.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
