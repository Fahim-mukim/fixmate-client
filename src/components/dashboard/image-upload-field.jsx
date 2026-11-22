"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  validateImageFile,
} from "@/lib/image-upload-contract.js";
import { safeProfileImageUrl } from "@/lib/profile-contract.js";
import { uploadApi } from "@/lib/upload-api.js";

const ACCEPTED_TYPES = ALLOWED_IMAGE_MIME_TYPES.join(",");
const MAX_SIZE_LABEL = `${MAX_IMAGE_BYTES / (1024 * 1024)} MB`;

export default function ImageUploadField({
  purpose = "profile",
  currentImageUrl,
  onUploaded,
  label = "Profile photo",
  emptyLabel = "No photo",
  previewAlt = `${purpose} photo preview`,
  previewClassName = "size-16 rounded-full border border-border object-cover",
  emptyClassName = "flex size-16 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground",
  uploadLabel = "Upload photo",
  successMessage = "Photo uploaded.",
  validateUrl = safeProfileImageUrl,
  inputId,
  messageId,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const uploadingRef = useRef(false);
  const mountedRef = useRef(true);
  const objectUrlRef = useRef(null);

  function releasePreview() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function handleFileChange(event) {
    const selected = event.target.files?.[0] ?? null;

    releasePreview();
    setFile(null);
    setPreviewUrl(null);

    if (!selected) {
      setStatus("idle");
      setMessage("");
      return;
    }

    const validation = validateImageFile(selected);
    if (!validation.ok) {
      setStatus("error");
      setMessage(validation.message);
      return;
    }

    const preview = URL.createObjectURL(selected);
    objectUrlRef.current = preview;
    setFile(selected);
    setPreviewUrl(preview);
    setStatus("idle");
    setMessage(`Preview ready. Choose ${uploadLabel}.`);
  }

  async function handleUpload() {
    if (uploadingRef.current || !file) return;

    uploadingRef.current = true;
    setStatus("uploading");
    setMessage("");

    try {
      const result = await uploadApi.uploadImage(purpose, file);
      if (!result.ok || !result.data?.imageUrl) {
        if (mountedRef.current) {
          setStatus("error");
          setMessage(result.message || "Upload failed. Please try again.");
        }
        return;
      }

      releasePreview();
      if (mountedRef.current) {
        setFile(null);
        setPreviewUrl(null);
        if (inputRef.current) inputRef.current.value = "";
        setStatus("success");
        setMessage(successMessage);
      }

      try {
        await onUploaded?.(result.data);
      } catch {
        // The hosted image URL is authoritative even if a context refresh fails.
      }
    } catch {
      if (mountedRef.current) {
        setStatus("error");
        setMessage("Upload failed. Please try again.");
      }
    } finally {
      uploadingRef.current = false;
    }
  }

  const resolvedInputId = inputId ?? `${purpose}-photo-input`;
  const resolvedMessageId = messageId ?? `${purpose}-photo-message`;
  const uploading = status === "uploading";
  const displayedImage = previewUrl ?? validateUrl(currentImageUrl);

  return (
    <div className="rounded-xl border border-border bg-mist/50 p-4 dark:bg-surface-alt/40">
      <div className="flex flex-wrap items-center gap-4">
        {displayedImage ? (
          // Preview URLs and hosted image URLs are not configured for next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayedImage}
            alt={previewAlt}
            className={previewClassName}
          />
        ) : (
          <div
            role="img"
            aria-label={`${emptyLabel} selected`}
            className={emptyClassName}
          >
            {emptyLabel}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor={resolvedInputId}>{label}</Label>
          <input
            ref={inputRef}
            id={resolvedInputId}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            disabled={uploading}
            aria-describedby={resolvedMessageId}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP, or GIF up to {MAX_SIZE_LABEL}. Images are uploaded
            through FixMate’s server; upload credentials stay server-side.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3" aria-busy={uploading}>
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          aria-busy={uploading}
        >
          {uploading ? "Uploading…" : uploadLabel}
        </Button>
        {status === "error" && file ? (
          <Button type="button" variant="outline" onClick={handleUpload} disabled={uploading}>
            Retry upload
          </Button>
        ) : null}
      </div>

      <p
        id={resolvedMessageId}
        role={status === "error" ? "alert" : status === "success" ? "status" : undefined}
        aria-live="polite"
        className={
          status === "error"
            ? "mt-3 text-sm text-destructive"
            : status === "success"
              ? "mt-3 text-sm text-teal-strong dark:text-teal"
              : "mt-3 text-sm text-muted-foreground"
        }
      >
        {message}
      </p>
    </div>
  );
}
