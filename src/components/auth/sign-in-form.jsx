"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearAccessToken } from "@/lib/auth-token";
import { authClient } from "@/lib/auth-client";
import { getCurrentApplicationUser } from "@/lib/protected-api.js";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect.js";

function messageFrom(error, fallback) {
  if (typeof error?.message === "string" && error.message) return error.message;
  return fallback;
}

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const pending = status === "loading";

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setStatus("error");
      setMessage("Enter your email and password.");
      return;
    }

    clearAccessToken();
    setStatus("loading");
    setMessage("");

    try {
      const response = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (response.error) {
        setStatus("error");
        setMessage(messageFrom(response.error, "Sign-in failed."));
        return;
      }

      setStatus("success");
      setMessage("Signed in.");
      const search = typeof window === "undefined" ? "" : window.location.search;
      const destination = await resolvePostAuthPath(search, getCurrentApplicationUser);
      router.push(destination);
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Sign-in is temporarily unavailable.");
    }
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit} aria-busy={pending}>
      <div className="space-y-2">
        <Label htmlFor="sign-in-email">Email</Label>
        <Input
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sign-in-password">Password</Label>
        <Input
          id="sign-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
        />
      </div>

      {status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      {status === "success" ? (
        <p role="status" className="text-sm text-teal-strong dark:text-teal">
          {message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
