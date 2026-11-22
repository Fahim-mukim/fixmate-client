"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import ButtonLink from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { serviceManagementApi } from "@/lib/service-management-api.js";
import { serviceErrorMessage } from "@/lib/service-management-contract.js";
import { formatPrice } from "@/lib/service-utils.js";
import ServiceImage from "@/components/services/service-image.jsx";
import BookingPagination from "./pagination.jsx";
import ServiceForm from "./service-form.jsx";

const APPROVAL_VARIANTS = Object.freeze({
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
});

function ServiceSkeleton() {
  return (
    <div aria-label="Loading services" className="grid gap-5 lg:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="space-y-4 rounded-2xl border border-border bg-surface p-5"
        >
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function TechnicianServicesPanel() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [editingService, setEditingService] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const deletingRef = useRef(false);

  const load = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError(null);
    const result = await serviceManagementApi.listOwnedServices({
      page: nextPage,
      limit: 12,
    });

    if (result.ok && result.data) {
      setData(result.data);
    } else {
      setData(null);
      setError(result);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    void Promise.resolve().then(() => load(page));
  }, [load, page]);

  async function handleEditSuccess(updated) {
    setEditingService(null);
    setNotice(
      updated?.approvalStatus === "pending"
        ? "Service updated and sent for re-approval."
        : "Service updated.",
    );
    await load(page);
  }

  async function handleDelete() {
    if (deletingRef.current || !deleteCandidate?._id) return;

    deletingRef.current = true;
    setDeletingId(deleteCandidate._id);
    setDeleteError("");

    const result = await serviceManagementApi.deleteService(deleteCandidate._id);
    if (result.ok) {
      setDeleteCandidate(null);
      setNotice("Service deleted.");
      setEditingService((current) =>
        current?._id === deleteCandidate._id ? null : current,
      );
      setPage(1);
      await load(1);
    } else {
      setDeleteError(
        serviceErrorMessage(result, "Unable to delete this service."),
      );
    }

    deletingRef.current = false;
    setDeletingId("");
  }

  function handlePageChange(nextPage) {
    setNotice("");
    setEditingService(null);
    setPage(nextPage);
  }

  return (
    <section aria-labelledby="my-services-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="my-services-heading" className="text-xl font-semibold">
            My services
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Only your own service listings appear here.
          </p>
        </div>
        <ButtonLink href="/dashboard/technician/add-service">
          Add service
        </ButtonLink>
      </div>

      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-border bg-mist p-3 text-sm text-foreground dark:bg-surface-alt"
        >
          {notice}
        </p>
      ) : null}

      {editingService ? (
        <section
          aria-labelledby="edit-service-panel-heading"
          className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <ServiceForm
            key={editingService._id}
            mode="edit"
            initialService={editingService}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingService(null)}
          />
        </section>
      ) : null}

      {loading ? <ServiceSkeleton /> : null}

      {!loading && error ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger/35 bg-danger/5 p-6 text-center"
        >
          <h3 className="text-lg font-semibold">We couldn’t load your services</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {serviceErrorMessage(error, "Please try again.")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {error.status === 401 ? (
              <ButtonLink href="/sign-in">Sign in</ButtonLink>
            ) : (
              <Button type="button" variant="outline" onClick={() => load(page)}>
                Try again
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {!loading && !error && data?.items?.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <h3 className="text-lg font-semibold">No services yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Add your first service to start appearing in the marketplace after
            Admin approval.
          </p>
          <ButtonLink
            href="/dashboard/technician/add-service"
            className="mt-5"
          >
            Add service
          </ButtonLink>
        </div>
      ) : null}

      {!loading && !error && data?.items?.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.items.map((service) => {
            const deleting = deletingId === service._id;

            return (
              <article
                key={service._id}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <ServiceImage
                  src={service.image}
                  alt={service.title ? `${service.title} image` : "Service image"}
                  className="h-36 w-full"
                />
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{service.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {service.category}
                      </p>
                    </div>
                    <Badge
                      variant={
                        APPROVAL_VARIANTS[service.approvalStatus] ?? "outline"
                      }
                    >
                      {service.approvalStatus || "unknown"} approval
                    </Badge>
                  </div>

                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Base price</dt>
                      <dd className="mt-1 font-medium">
                        {formatPrice(service.basePrice)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Service mode</dt>
                      <dd className="mt-1 font-medium">
                        {service.serviceMode || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Availability</dt>
                      <dd className="mt-1 font-medium">
                        <Badge
                          variant={service.isAvailable ? "default" : "outline"}
                        >
                          {service.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Service area</dt>
                      <dd className="mt-1 font-medium">
                        {service.serviceArea || "Not provided"}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNotice("");
                        setDeleteCandidate(null);
                        setEditingService(service);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={Boolean(deletingId)}
                      onClick={() => {
                        setNotice("");
                        setDeleteError("");
                        setDeleteCandidate(service);
                      }}
                    >
                      Delete
                    </Button>
                  </div>

                  {deleteCandidate?._id === service._id ? (
                    <div
                      role="alertdialog"
                      aria-labelledby={`delete-service-title-${service._id}`}
                      aria-describedby={`delete-service-description-${service._id}`}
                      className="space-y-3 rounded-lg border border-danger/30 bg-danger/5 p-3"
                    >
                      <p
                        id={`delete-service-title-${service._id}`}
                        className="text-sm font-semibold"
                      >
                        Delete “{service.title}”?
                      </p>
                      <p
                        id={`delete-service-description-${service._id}`}
                        className="text-sm leading-6 text-muted-foreground"
                      >
                        This cannot be undone. The service stays listed until the
                        server confirms deletion.
                      </p>
                      {deleteError ? (
                        <p role="alert" className="text-sm text-destructive">
                          {deleteError}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleDelete}
                          disabled={Boolean(deletingId)}
                          aria-busy={deleting}
                        >
                          {deleting ? "Deleting…" : "Yes, delete service"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteCandidate(null)}
                          disabled={Boolean(deletingId)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <BookingPagination
        label="Service pages"
        page={data?.page ?? page}
        totalPages={data?.totalPages ?? 0}
        onPageChange={handlePageChange}
      />
    </section>
  );
}
