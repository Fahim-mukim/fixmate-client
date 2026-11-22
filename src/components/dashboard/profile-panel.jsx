"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast.jsx";
import { useSession } from "@/lib/auth-client.js";
import { BOOKING_ROLE_LABELS } from "@/lib/dashboard-navigation.js";
import { profileApi } from "@/lib/profile-api.js";
import { setSessionIdentity } from "@/lib/session-identity-store.js";
import {
  buildProfileUpdateBody,
  profileFormFromUser,
  safeProfileImageUrl,
  validateProfileInput,
} from "@/lib/profile-contract.js";
import {
  useDashboardUser,
  useDashboardUserRefresh,
} from "./dashboard-gate.jsx";
import ImageUploadField from "./image-upload-field.jsx";

const EMPTY_FORM = profileFormFromUser(null);

function roleLabel(role) {
  return (
    BOOKING_ROLE_LABELS[role]?.replace(" dashboard", "") ??
    (typeof role === "string" && role ? role : "")
  );
}

function ProfileSkeleton() {
  return (
    <section aria-label="Loading profile" className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <Skeleton className="mt-5 h-28 w-full" />
    </section>
  );
}

export default function ProfilePanel() {
  const dashboardUser = useDashboardUser();
  const refreshUser = useDashboardUserRefresh();
  const { refetch: refetchSession } = useSession();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    status: "loading",
    profile: null,
    message: "",
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const savingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;

    profileApi
      .getProfile()
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setState({
            status: "error",
            profile: null,
            message: result.message || "Unable to load your profile.",
          });
          return;
        }
        setForm(profileFormFromUser(result.data));
        setState({ status: "ready", profile: result.data, message: "" });
      })
      .catch(() => {
        if (active) {
          setState({
            status: "error",
            profile: null,
            message: "Unable to load your profile.",
          });
        }
      });

    return () => {
      active = false;
      mountedRef.current = false;
    };
  }, [attempt]);

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current || !state.profile) return;

    const validation = validateProfileInput(form);
    setErrors(validation);
    const firstError = Object.values(validation)[0];
    if (firstError) {
      setState((current) => ({ ...current, status: "error", message: firstError }));
      return;
    }

    savingRef.current = true;
    setState((current) => ({ ...current, status: "saving", message: "" }));

    try {
      const result = await profileApi.updateProfile(buildProfileUpdateBody(form));
      if (!result.ok || !result.data) {
        const message = result.message || "Unable to save your profile.";
        if (mountedRef.current) {
          setState((current) => ({ ...current, status: "error", message }));
        }
        toast.add({ type: "error", title: "Profile update failed", description: message });
        return;
      }

      let displayed = result.data;
      const refreshed = await profileApi.getProfile();
      if (refreshed.ok && refreshed.data) displayed = refreshed.data;

      if (mountedRef.current) {
        setForm(profileFormFromUser(displayed));
        setState({ status: "success", profile: displayed, message: "Profile updated." });
      }
      toast.add({ type: "success", title: "Profile updated", description: "Your profile was saved." });

      // Keep the shared navbar/dashboard identity and the dashboard user
      // context aligned with the canonical user record.
      setSessionIdentity(displayed);
      try {
        await refetchSession();
      } catch {
        // Better Auth session refetch is best-effort; the API response is authoritative.
      }
      try {
        await refreshUser();
      } catch {
        // The saved profile response remains authoritative for this page.
      }
    } catch {
      const message = "Unable to save your profile.";
      if (mountedRef.current) {
        setState((current) => ({ ...current, status: "error", message }));
      }
      toast.add({ type: "error", title: "Profile update failed", description: message });
    } finally {
      savingRef.current = false;
    }
  }

  function handleProfilePhotoUploaded(data) {
    const nextProfile = data.user ?? { ...state.profile, image: data.imageUrl };

    setForm(profileFormFromUser(nextProfile));
    setState({
      status: "success",
      profile: nextProfile,
      message: "Profile photo updated.",
    });
    toast.add({ type: "success", title: "Profile photo updated", description: "Your profile photo was uploaded." });

    // Keep the navbar/dashboard avatar aligned with the canonical user record.
    setSessionIdentity(nextProfile);
    refetchSession().catch(() => {
      // Better Auth session refetch is best-effort; the upload response is authoritative.
    });
    refreshUser().catch(() => {
      // The upload response remains authoritative for this page.
    });
  }

  if (state.status === "loading" && !state.profile) {
    return <ProfileSkeleton />;
  }

  if (!state.profile) {
    return (
      <section
        role="alert"
        aria-labelledby="profile-error-heading"
        className="rounded-2xl border border-danger/35 bg-danger/5 p-6"
      >
        <h2 id="profile-error-heading" className="text-lg font-semibold">
          We couldn’t load your profile
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{state.message}</p>
        <Button
          type="button"
          className="mt-5"
          onClick={() => {
            setState({ status: "loading", profile: null, message: "" });
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </Button>
      </section>
    );
  }

  const imageUrl = safeProfileImageUrl(state.profile.image);
  const saving = state.status === "saving";

  return (
    <section
      aria-labelledby="profile-heading"
      className="rounded-2xl border border-border bg-surface p-6"
    >
      <div className="flex flex-wrap items-center gap-4">
        {imageUrl ? (
          // Profile images are hosted URLs from the API; the host is not configured for next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${state.profile.name || "Your"} profile image`}
            className="size-16 rounded-full border border-border object-cover"
          />
        ) : (
          <div
            role="img"
            aria-label="No profile image"
            className="flex size-16 items-center justify-center rounded-full border border-dashed border-border bg-mist text-xs font-medium text-muted-foreground dark:bg-surface-alt"
          >
            No image
          </div>
        )}
        <div>
          <h2 id="profile-heading" className="text-xl font-semibold">
            Your profile
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Update the contact details used for your FixMate account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "profile-name-error" : undefined}
              disabled={saving}
              maxLength={120}
            />
            {errors.name ? (
              <p id="profile-name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              value={state.profile.email ?? dashboardUser?.email ?? ""}
              readOnly
              aria-readonly="true"
              className="bg-mist dark:bg-surface-alt"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input
              id="profile-phone"
              value={form.phone}
              onChange={(event) => handleChange("phone", event.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "profile-phone-error" : undefined}
              disabled={saving}
              maxLength={25}
              inputMode="tel"
            />
            {errors.phone ? (
              <p id="profile-phone-error" className="text-sm text-destructive">
                {errors.phone}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-role">Role</Label>
            <Input
              id="profile-role"
              value={roleLabel(state.profile.role ?? dashboardUser?.role)}
              readOnly
              aria-readonly="true"
              className="bg-mist dark:bg-surface-alt"
            />
            <p className="text-xs text-muted-foreground">Role is managed by FixMate.</p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="profile-area">Area</Label>
            <Input
              id="profile-area"
              value={form.area}
              onChange={(event) => handleChange("area", event.target.value)}
              aria-invalid={Boolean(errors.area)}
              aria-describedby={errors.area ? "profile-area-error" : undefined}
              disabled={saving}
              maxLength={120}
            />
            {errors.area ? (
              <p id="profile-area-error" className="text-sm text-destructive">
                {errors.area}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              value={form.bio}
              onChange={(event) => handleChange("bio", event.target.value)}
              aria-invalid={Boolean(errors.bio)}
              aria-describedby={errors.bio ? "profile-bio-error" : undefined}
              disabled={saving}
              maxLength={500}
              rows={4}
            />
            {errors.bio ? (
              <p id="profile-bio-error" className="text-sm text-destructive">
                {errors.bio}
              </p>
            ) : null}
          </div>
        </div>

        <ImageUploadField
          purpose="profile"
          currentImageUrl={state.profile.image}
          onUploaded={handleProfilePhotoUploaded}
        />

        {state.status === "error" && state.message ? (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : null}
        {state.status === "success" && state.message ? (
          <p role="status" className="text-sm text-teal-strong dark:text-teal">
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving} aria-busy={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
          {saving ? (
            <span className="text-sm text-muted-foreground" aria-live="polite">
              Saving your changes…
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
