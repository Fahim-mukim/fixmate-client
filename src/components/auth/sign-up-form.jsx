"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast.jsx";
import { authClient } from "@/lib/auth-client";
import { clearAccessToken } from "@/lib/auth-token";
import { REGISTRATION_ROLES, assertRegistrationRole } from "@/lib/registration";
import { getCurrentApplicationUser } from "@/lib/protected-api.js";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect.js";

function messageFrom(error, fallback) {
  if (typeof error?.message === "string" && error.message) return error.message;
  return fallback;
}

export default function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registrationRole, setRegistrationRole] = useState("customer");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const pending = status === "loading";

  async function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      setStatus("error");
      setMessage("Complete your name, email, and password.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    let role;
    try {
      role = assertRegistrationRole(registrationRole);
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    clearAccessToken();
    setStatus("loading");
    setMessage("");

    try {
      const response = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
        registrationRole: role,
      });

      if (response.error) {
        const errorMessage = messageFrom(response.error, "Registration failed.");
        setStatus("error");
        setMessage(errorMessage);
        toast.add({ type: "error", title: "Registration failed", description: errorMessage });
        return;
      }

      setStatus("success");
      setMessage("Account created.");
      toast.add({ type: "success", title: "Account created", description: "Your FixMate account is ready." });
      const search = typeof window === "undefined" ? "" : window.location.search;
      const destination = await resolvePostAuthPath(search, getCurrentApplicationUser);
      router.push(destination);
      router.refresh();
    } catch {
      const errorMessage = "Registration is temporarily unavailable.";
      setStatus("error");
      setMessage(errorMessage);
      toast.add({ type: "error", title: "Registration failed", description: errorMessage });
    }
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit} aria-busy={pending}>
      <div className="space-y-2">
        <Label htmlFor="sign-up-name">Name</Label>
        <Input
          id="sign-up-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sign-up-email">Email</Label>
        <Input
          id="sign-up-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
        />
      </div>

      <fieldset disabled={pending}>
        <legend className="text-sm leading-none font-medium">Account type</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {REGISTRATION_ROLES.map((role) => (
            <Label
              key={role}
              htmlFor={`sign-up-role-${role}`}
              className="cursor-pointer rounded-lg border border-border bg-mist px-3 py-2 text-sm capitalize dark:bg-surface-alt"
            >
              <input
                id={`sign-up-role-${role}`}
                name="registrationRole"
                type="radio"
                value={role}
                checked={registrationRole === role}
                onChange={(event) => setRegistrationRole(event.target.value)}
                className="size-4 accent-teal-strong"
              />
              {role}
            </Label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Admin accounts are not created through this form.
        </p>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="sign-up-password">Password</Label>
        <Input
          id="sign-up-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sign-up-confirm-password">Confirm password</Label>
        <Input
          id="sign-up-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
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
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
