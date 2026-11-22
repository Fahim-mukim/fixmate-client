"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import ButtonLink from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast.jsx";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { serviceManagementApi } from "@/lib/service-management-api.js";
import {
  safeServiceImageUrl,
  serviceErrorMessage,
  serviceFormFromService,
  validateServiceForm,
} from "@/lib/service-management-contract.js";
import {
  SERVICE_CATEGORIES,
  SERVICE_MODES,
} from "@/lib/service-utils.js";
import ImageUploadField from "./image-upload-field.jsx";

export default function ServiceForm({
  mode = "create",
  initialService = null,
  onSuccess,
  onCancel,
}) {
  const editing = mode === "edit";
  const [form, setForm] = useState(() => serviceFormFromService(initialService));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleImageUploaded(data) {
    const imageUrl = safeServiceImageUrl(data?.imageUrl);
    if (!imageUrl) return;
    setForm((current) => ({ ...current, image: imageUrl }));
    setErrors((current) => ({ ...current, image: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    const validation = validateServiceForm(form);
    setErrors(validation);
    const firstError = Object.values(validation)[0];
    if (firstError) {
      setStatus("error");
      setMessage(firstError);
      return;
    }

    submittingRef.current = true;
    setStatus("saving");
    setMessage("");

    try {
      const result = editing
        ? await serviceManagementApi.updateService(initialService?._id, form)
        : await serviceManagementApi.createService(form);

      if (!result.ok) {
        const errorMessage = serviceErrorMessage(
          result,
          editing ? "Unable to update this service." : "Unable to create this service.",
        );
        if (mountedRef.current) {
          setStatus("error");
          setMessage(errorMessage);
        }
        toast.add({
          type: "error",
          title: editing ? "Service update failed" : "Service creation failed",
          description: errorMessage,
        });
        return;
      }

      const successMessage = editing
        ? result.data?.approvalStatus === "pending"
          ? "Service updated and sent for re-approval."
          : "Service updated."
        : "Service submitted for approval.";
      if (mountedRef.current) {
        setStatus("success");
        setMessage(successMessage);
      }
      toast.add({
        type: "success",
        title: editing ? "Service updated" : "Service submitted",
        description: successMessage,
      });
      onSuccess?.(result.data);
    } catch {
      const errorMessage = editing
        ? "Unable to update this service."
        : "Unable to create this service.";
      if (mountedRef.current) {
        setStatus("error");
        setMessage(errorMessage);
      }
      toast.add({
        type: "error",
        title: editing ? "Service update failed" : "Service creation failed",
        description: errorMessage,
      });
    } finally {
      submittingRef.current = false;
    }
  }

  const saving = status === "saving";
  const heading = editing ? "Edit service" : "Service details";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-busy={saving}>
      <div>
        <h2 className="text-lg font-semibold">{heading}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Fields marked by an error message must be corrected before saving.
        </p>
      </div>

      {editing ? (
        <p
          role="note"
          className="rounded-lg border border-warning/35 bg-warning/8 p-3 text-sm leading-6 text-foreground"
        >
          Editing a service resets its approval status to pending. It will not be
          publicly visible until an Admin approves it again.
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="service-title">Title</Label>
          <Input
            id="service-title"
            value={form.title}
            onChange={(event) => handleChange("title", event.target.value)}
            disabled={saving}
            maxLength={120}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "service-title-error" : undefined}
          />
          {errors.title ? (
            <p id="service-title-error" className="text-sm text-destructive">
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-category">Category</Label>
          <NativeSelect
            id="service-category"
            value={form.category}
            onChange={(event) => handleChange("category", event.target.value)}
            disabled={saving}
            className="w-full"
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? "service-category-error" : undefined}
          >
            <NativeSelectOption value="">Choose a category</NativeSelectOption>
            {SERVICE_CATEGORIES.map((category) => (
              <NativeSelectOption key={category} value={category}>
                {category}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.category ? (
            <p id="service-category-error" className="text-sm text-destructive">
              {errors.category}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="service-description">Description</Label>
        <Textarea
          id="service-description"
          value={form.description}
          onChange={(event) => handleChange("description", event.target.value)}
          disabled={saving}
          maxLength={2000}
          rows={5}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "service-description-error" : undefined}
        />
        {errors.description ? (
          <p id="service-description-error" className="text-sm text-destructive">
            {errors.description}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="service-image">Service image</Label>
        <ImageUploadField
          purpose="service"
          currentImageUrl={form.image}
          onUploaded={handleImageUploaded}
          label="Service image"
          emptyLabel="No service image"
          previewAlt="Service image preview"
          previewClassName="h-32 w-full rounded-xl border border-border object-cover sm:w-48"
          emptyClassName="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-border bg-mist px-4 text-center text-xs text-muted-foreground sm:w-48 dark:bg-surface-alt"
          uploadLabel="Upload image"
          successMessage="Service image uploaded."
          validateUrl={safeServiceImageUrl}
          inputId="service-image"
          messageId="service-image-message"
        />
        {errors.image ? (
          <p id="service-image-error" className="text-sm text-destructive">
            {errors.image}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="service-base-price">Base price (USD)</Label>
          <Input
            id="service-base-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.basePrice}
            onChange={(event) => handleChange("basePrice", event.target.value)}
            disabled={saving}
            aria-invalid={Boolean(errors.basePrice)}
            aria-describedby={errors.basePrice ? "service-base-price-error" : undefined}
          />
          {errors.basePrice ? (
            <p id="service-base-price-error" className="text-sm text-destructive">
              {errors.basePrice}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-estimated-duration">Estimated duration</Label>
          <Input
            id="service-estimated-duration"
            value={form.estimatedDuration}
            onChange={(event) => handleChange("estimatedDuration", event.target.value)}
            disabled={saving}
            maxLength={60}
            placeholder="e.g. 45 minutes"
            aria-invalid={Boolean(errors.estimatedDuration)}
            aria-describedby={
              errors.estimatedDuration ? "service-estimated-duration-error" : undefined
            }
          />
          {errors.estimatedDuration ? (
            <p
              id="service-estimated-duration-error"
              className="text-sm text-destructive"
            >
              {errors.estimatedDuration}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-mode">Service mode</Label>
          <NativeSelect
            id="service-mode"
            value={form.serviceMode}
            onChange={(event) => handleChange("serviceMode", event.target.value)}
            disabled={saving}
            className="w-full"
            aria-invalid={Boolean(errors.serviceMode)}
            aria-describedby={errors.serviceMode ? "service-mode-error" : undefined}
          >
            <NativeSelectOption value="">Choose a service mode</NativeSelectOption>
            {SERVICE_MODES.map((modeValue) => (
              <NativeSelectOption key={modeValue} value={modeValue}>
                {modeValue}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.serviceMode ? (
            <p id="service-mode-error" className="text-sm text-destructive">
              {errors.serviceMode}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-area">Service area</Label>
          <Input
            id="service-area"
            value={form.serviceArea}
            onChange={(event) => handleChange("serviceArea", event.target.value)}
            disabled={saving}
            maxLength={120}
            aria-invalid={Boolean(errors.serviceArea)}
            aria-describedby={errors.serviceArea ? "service-area-error" : undefined}
          />
          {errors.serviceArea ? (
            <p id="service-area-error" className="text-sm text-destructive">
              {errors.serviceArea}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-availability">Availability</Label>
          <NativeSelect
            id="service-availability"
            value={form.isAvailable ? "true" : "false"}
            onChange={(event) =>
              handleChange("isAvailable", event.target.value === "true")
            }
            disabled={saving}
            className="w-full"
            aria-invalid={Boolean(errors.isAvailable)}
            aria-describedby={
              errors.isAvailable ? "service-availability-error" : undefined
            }
          >
            <NativeSelectOption value="true">Available</NativeSelectOption>
            <NativeSelectOption value="false">Unavailable</NativeSelectOption>
          </NativeSelect>
          {errors.isAvailable ? (
            <p id="service-availability-error" className="text-sm text-destructive">
              {errors.isAvailable}
            </p>
          ) : null}
        </div>
      </div>

      {message ? (
        <p
          role={status === "error" ? "alert" : "status"}
          className={
            status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-teal-strong dark:text-teal"
          }
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving} aria-busy={saving}>
          {saving
            ? editing
              ? "Saving…"
              : "Submitting…"
            : editing
              ? "Save changes"
              : "Submit service"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
        {status === "success" && !editing ? (
          <ButtonLink href="/dashboard/technician/my-services" variant="outline">
            View my services
          </ButtonLink>
        ) : null}
      </div>
    </form>
  );
}
