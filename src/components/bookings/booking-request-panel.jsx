"use client";

import { useEffect, useRef, useState } from "react";

import ButtonLink from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast.jsx";
import { bookingApi } from "@/lib/booking-api.js";
import {
  bookingErrorMessage,
  buildBookingCreateBody,
  canShowBookingForm,
  createSubmissionGuard,
  getBookingFormVisibility,
  isValidBookingId,
  validateBookingCreateInput,
} from "@/lib/booking-contract.js";
import { getCurrentApplicationUser } from "@/lib/protected-api.js";

const EMPTY_FORM = {
  customerPhone: "",
  address: "",
  preferredDate: "",
  problemDescription: "",
};

export default function BookingRequestPanel({ serviceId, serviceTitle }) {
  const [state, setState] = useState({ status: "loading", role: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });
  const submissionGuard = useRef(createSubmissionGuard());
  const validServiceId = isValidBookingId(serviceId);

  useEffect(() => {
    let active = true;

    getCurrentApplicationUser()
      .then((user) => {
        if (active) setState({ status: "ready", role: user?.role ?? null });
      })
      .catch(() => {
        if (active) setState({ status: "ready", role: null });
      });

    return () => {
      active = false;
    };
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    if (submitState.status === "error") {
      setSubmitState({ status: "idle", message: "" });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!submissionGuard.current.begin()) return;

    const input = { ...form, serviceId };
    const validationErrors = validateBookingCreateInput(input);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      submissionGuard.current.finish();
      return;
    }

    setSubmitState({ status: "loading", message: "" });
    try {
      const body = buildBookingCreateBody(input);
      const result = await bookingApi.createBooking(body);
      if (result.ok) {
        const message = `Your request for ${serviceTitle} was sent.`;
        setSubmitState({ status: "success", message });
        toast.add({ type: "success", title: "Request sent", description: message });
      } else {
        const message = bookingErrorMessage(result, "Unable to send this request.");
        setSubmitState({ status: "error", message });
        toast.add({ type: "error", title: "Request failed", description: message });
      }
    } finally {
      submissionGuard.current.finish();
    }
  }

  if (state.status === "loading") {
    return (
      <div aria-label="Checking booking availability" className="mt-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const visibility = getBookingFormVisibility(state.role);
  if (!validServiceId || !canShowBookingForm(state.role) || !visibility.showForm) {
    return (
      <div
        role="status"
        className="mt-5 rounded-lg border border-border bg-mist px-3 py-3 text-sm leading-6 text-navy dark:bg-surface-alt dark:text-foreground"
      >
        {!validServiceId
          ? "This service cannot be requested from this page."
          : visibility.message}
        {visibility.href ? (
          <ButtonLink href={visibility.href} variant="outline" size="sm" className="mt-3 w-full">
            {visibility.actionLabel}
          </ButtonLink>
        ) : null}
      </div>
    );
  }

  if (submitState.status === "success") {
    return (
      <div
        role="status"
        className="mt-5 space-y-3 rounded-lg border border-success/35 bg-success/10 p-4 text-sm leading-6"
      >
        <p className="font-semibold">Request sent</p>
        <p>{submitState.message}</p>
        <p>The technician will review it. You can follow its status in your bookings.</p>
        <ButtonLink href="/dashboard/customer/bookings" size="sm" className="w-full">
          View my bookings
        </ButtonLink>
      </div>
    );
  }

  const pending = submitState.status === "loading";
  const descriptionLength = form.problemDescription.trim().length;

  return (
    <form
      className="mt-5 space-y-4 border-t border-border pt-5"
      onSubmit={handleSubmit}
      aria-busy={pending}
      noValidate
    >
      <div>
        <h3 className="text-base font-semibold">Request this service</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Share where the technician should go, a future date, and what is wrong. The
          service, technician, and price are attached by the server.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-phone">Phone number</Label>
        <Input
          id="booking-phone"
          name="customerPhone"
          type="tel"
          autoComplete="tel"
          required
          disabled={pending}
          aria-invalid={Boolean(errors.customerPhone)}
          aria-describedby={errors.customerPhone ? "booking-phone-error" : undefined}
          value={form.customerPhone}
          onChange={(event) => updateField("customerPhone", event.target.value)}
          placeholder="5551234567"
        />
        {errors.customerPhone ? (
          <p id="booking-phone-error" role="alert" className="text-xs text-destructive">
            {errors.customerPhone}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-address">Service address</Label>
        <Input
          id="booking-address"
          name="address"
          autoComplete="street-address"
          required
          disabled={pending}
          aria-invalid={Boolean(errors.address)}
          aria-describedby={errors.address ? "booking-address-error" : undefined}
          value={form.address}
          onChange={(event) => updateField("address", event.target.value)}
          placeholder="Street address, city, and state"
        />
        {errors.address ? (
          <p id="booking-address-error" role="alert" className="text-xs text-destructive">
            {errors.address}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-date">Preferred date</Label>
        <Input
          id="booking-date"
          name="preferredDate"
          type="date"
          required
          disabled={pending}
          aria-invalid={Boolean(errors.preferredDate)}
          aria-describedby={errors.preferredDate ? "booking-date-error" : undefined}
          value={form.preferredDate}
          onChange={(event) => updateField("preferredDate", event.target.value)}
        />
        {errors.preferredDate ? (
          <p id="booking-date-error" role="alert" className="text-xs text-destructive">
            {errors.preferredDate}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="booking-description">Problem description</Label>
          <span className="text-xs text-muted-foreground">{descriptionLength}/2000</span>
        </div>
        <Textarea
          id="booking-description"
          name="problemDescription"
          required
          disabled={pending}
          rows={5}
          aria-invalid={Boolean(errors.problemDescription)}
          aria-describedby={
            errors.problemDescription ? "booking-description-error" : undefined
          }
          value={form.problemDescription}
          onChange={(event) => updateField("problemDescription", event.target.value)}
          placeholder="Describe the issue and any symptoms you have noticed."
        />
        {errors.problemDescription ? (
          <p
            id="booking-description-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {errors.problemDescription}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            At least 20 meaningful characters are required.
          </p>
        )}
      </div>

      {submitState.status === "error" ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-destructive">{submitState.message}</p>
          {/session has expired/i.test(submitState.message) ? (
            <ButtonLink href="/sign-in" variant="outline" size="sm">
              Sign in again
            </ButtonLink>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending request…" : "Send booking request"}
      </Button>
    </form>
  );
}
