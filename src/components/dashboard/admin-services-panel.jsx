"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ButtonLink from "@/components/ui/button-link";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.jsx";
import { toast } from "@/components/ui/toast.jsx";
import ServiceImage from "@/components/services/service-image.jsx";
import { serviceManagementApi } from "@/lib/service-management-api.js";
import {
  APPROVAL_STATUS_LABELS,
  MODERATION_FILTERS,
  formatServiceCreatedAt,
  moderationActionLabel,
  moderationActionsForStatus,
  moderationErrorMessage,
} from "@/lib/service-management-contract.js";
import { formatPrice } from "@/lib/service-utils.js";
import BookingPagination from "./pagination.jsx";

const MODERATION_LIMIT = 12;
const APPROVAL_VARIANTS = Object.freeze({
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
});
const ACTION_VARIANTS = Object.freeze({
  approve: "default",
  reject: "destructive",
});
const CONFIRMATION_TITLES = Object.freeze({
  approve: "Approve this service?",
  reject: "Reject this service?",
});
const EMPTY_ACTIONS = Object.freeze([]);

function ApprovalBadge({ status }) {
  return (
    <Badge variant={APPROVAL_VARIANTS[status] ?? "outline"}>
      {APPROVAL_STATUS_LABELS[status] ?? status ?? "Unknown"}
    </Badge>
  );
}

function AvailabilityBadge({ available }) {
  return (
    <Badge variant={available ? "default" : "outline"}>
      {available ? "Available" : "Unavailable"}
    </Badge>
  );
}

function DetailField({ label, children, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 break-words">{children}</dd>
    </div>
  );
}

function ModerationSkeleton() {
  return (
    <div aria-label="Loading services for moderation" className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="space-y-3 rounded-xl border border-border bg-surface p-4"
        >
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function AdminServicesPanel() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedService, setSelectedService] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [decision, setDecision] = useState(null);
  const [decisionError, setDecisionError] = useState("");
  const [submittingAction, setSubmittingAction] = useState("");
  const decisionRef = useRef(false);
  const detailRequestRef = useRef(0);

  const load = useCallback(async (targetPage, targetStatus) => {
    setLoading(true);
    setError(null);

    const result = await serviceManagementApi.listModerationServices({
      page: targetPage,
      limit: MODERATION_LIMIT,
      status: targetStatus || undefined,
    });

    if (result.ok && result.data) {
      setData(result.data);
    } else {
      setData(null);
      setError(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load(page, statusFilter));
  }, [load, page, statusFilter, reloadToken]);

  const closeDetail = useCallback(() => {
    detailRequestRef.current += 1;
    setSelectedService(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
    setDecision(null);
    setDecisionError("");
  }, []);

  const openDetail = useCallback(async (service) => {
    if (!service?._id) return;

    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setSelectedService(service);
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    setDecision(null);
    setDecisionError("");
    setNotice("");

    const result = await serviceManagementApi.getModerationService(service._id);
    if (requestId !== detailRequestRef.current) return;

    if (result.ok && result.data) {
      setDetail(result.data);
    } else {
      setDetail(null);
      setDetailError(result);
    }
    setDetailLoading(false);
  }, []);

  function handleStatusChange(value) {
    setStatusFilter(value);
    setPage(1);
    setNotice("");
    closeDetail();
  }

  function handlePageChange(nextPage) {
    setPage(nextPage);
    setNotice("");
    closeDetail();
  }

  function handleRefresh() {
    setNotice("");
    closeDetail();
    setReloadToken((value) => value + 1);
  }

  function retryDetail() {
    if (selectedService) void openDetail(selectedService);
  }

  function beginDecision(action) {
    setNotice("");
    setDecisionError("");
    setDecision({
      action,
      serviceId: detail._id,
      title: detail.title || "this service",
    });
  }

  async function handleDecision() {
    const serviceId = detail?._id;
    if (
      !decision ||
      decisionRef.current ||
      !serviceId ||
      decision.serviceId !== serviceId
    ) {
      return;
    }

    const action = decision.action;
    decisionRef.current = true;
    setSubmittingAction(action);
    setDecisionError("");

    const result = await serviceManagementApi.setModerationStatus(serviceId, action);
    if (result.ok) {
      const message = action === "approve" ? "Service approved." : "Service rejected.";
      setNotice(message);
      toast.add({
        type: "success",
        title: action === "approve" ? "Service approved" : "Service rejected",
        description: message,
      });
      closeDetail();
      setPage(1);
      setReloadToken((value) => value + 1);
    } else {
      const message = moderationErrorMessage(result, "Unable to update approval status.");
      setDecisionError(message);
      toast.add({
        type: "error",
        title: "Moderation failed",
        description: message,
      });
    }

    decisionRef.current = false;
    setSubmittingAction("");
  }

  const detailIsCurrent =
    Boolean(detail) && detail?._id === selectedService?._id;
  const detailReady =
    Boolean(detail) &&
    detailIsCurrent &&
    !detailLoading &&
    !detailError;
  const actions = detailReady
    ? moderationActionsForStatus(detail.approvalStatus)
    : EMPTY_ACTIONS;

  const activeFilter = MODERATION_FILTERS.find(
    (filter) => filter.value === statusFilter,
  );
  const emptyTitle = activeFilter
    ? `No ${activeFilter.label.toLowerCase()} services`
    : "No services to moderate";

  return (
    <section aria-labelledby="admin-services-heading" className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="min-w-48 flex-1 space-y-2">
          <Label htmlFor="moderation-status-filter">Filter by approval status</Label>
          <select
            id="moderation-status-filter"
            value={statusFilter}
            onChange={(event) => handleStatusChange(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {MODERATION_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          aria-busy={loading}
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-border bg-mist p-3 text-sm text-foreground dark:bg-surface-alt"
        >
          {notice}
        </p>
      ) : null}

      <div>
        <h2 id="admin-services-heading" className="sr-only">
          Service moderation queue
        </h2>

        {loading ? <ModerationSkeleton /> : null}

        {!loading && error ? (
          <div
            role="alert"
            className="rounded-2xl border border-danger/35 bg-danger/5 px-6 py-12 text-center"
          >
            <h3 className="text-lg font-semibold">We couldn’t load services</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {moderationErrorMessage(error, "Please try again.")}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {error.status === 401 ? (
                <ButtonLink href="/sign-in">Sign in</ButtonLink>
              ) : (
                <Button type="button" variant="outline" onClick={handleRefresh}>
                  Try again
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {!loading && !error && data?.items?.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
            <h3 className="text-lg font-semibold">{emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Service records appear here only after technicians submit real
              listings.
            </p>
          </div>
        ) : null}

        {!loading && !error && data?.items?.length > 0 ? (
          <div className="space-y-4">
            <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-mist text-xs tracking-wide text-muted-foreground uppercase dark:bg-surface-alt">
                  <tr>
                    <th scope="col" className="px-4 py-3">Image</th>
                    <th scope="col" className="px-4 py-3">Service</th>
                    <th scope="col" className="px-4 py-3">Technician</th>
                    <th scope="col" className="px-4 py-3">Price</th>
                    <th scope="col" className="px-4 py-3">Mode</th>
                    <th scope="col" className="px-4 py-3">Area</th>
                    <th scope="col" className="px-4 py-3">Approval</th>
                    <th scope="col" className="px-4 py-3">Availability</th>
                    <th scope="col" className="px-4 py-3">Created</th>
                    <th scope="col" className="px-4 py-3">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((service) => (
                    <tr key={service._id} className="align-top">
                      <td className="px-4 py-3">
                        <ServiceImage
                          src={service.image}
                          alt={service.title ? `${service.title} image` : "Service image"}
                          className="h-14 w-20 rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">
                          {service.title || "Untitled service"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {service.category || "No category"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{service.technicianName || "Not provided"}</p>
                        <p className="mt-1 text-xs break-all text-muted-foreground">
                          {service.technicianEmail || "Not provided"}
                        </p>
                      </td>
                      <td className="px-4 py-3">{formatPrice(service.basePrice)}</td>
                      <td className="px-4 py-3">
                        {service.serviceMode || "Not provided"}
                      </td>
                      <td className="px-4 py-3">
                        {service.serviceArea || "Not provided"}
                      </td>
                      <td className="px-4 py-3">
                        <ApprovalBadge status={service.approvalStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <AvailabilityBadge available={service.isAvailable} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatServiceCreatedAt(service.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void openDetail(service)}
                        >
                          Review details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:hidden">
              {data.items.map((service) => (
                <article
                  key={service._id}
                  className="overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  <ServiceImage
                    src={service.image}
                    alt={service.title ? `${service.title} image` : "Service image"}
                    className="h-36 w-full"
                  />
                  <div className="space-y-4 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {service.title || "Untitled service"}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {service.category || "No category"}
                        </p>
                      </div>
                      <ApprovalBadge status={service.approvalStatus} />
                    </div>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <DetailField label="Technician">
                        {service.technicianName || "Not provided"}
                      </DetailField>
                      <DetailField label="Technician email">
                        <span className="break-all">
                          {service.technicianEmail || "Not provided"}
                        </span>
                      </DetailField>
                      <DetailField label="Base price">
                        {formatPrice(service.basePrice)}
                      </DetailField>
                      <DetailField label="Service mode">
                        {service.serviceMode || "Not provided"}
                      </DetailField>
                      <DetailField label="Service area">
                        {service.serviceArea || "Not provided"}
                      </DetailField>
                      <DetailField label="Availability">
                        <AvailabilityBadge available={service.isAvailable} />
                      </DetailField>
                      <DetailField label="Created">
                        {formatServiceCreatedAt(service.createdAt)}
                      </DetailField>
                    </dl>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void openDetail(service)}
                    >
                      Review details
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <BookingPagination
          label="Moderation pages"
          page={data?.page ?? page}
          totalPages={data?.totalPages ?? 0}
          onPageChange={handlePageChange}
        />
      </div>

      {selectedService ? (
        <section
          aria-labelledby="moderation-detail-heading"
          className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="moderation-detail-heading" className="text-xl font-semibold">
                Service review
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedService.title || "Untitled service"}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={closeDetail}>
              Close review
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            {detailLoading ? (
              <div aria-label="Loading service details" className="space-y-3">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : null}

            {detailError ? (
              <div
                role="alert"
                className="rounded-xl border border-danger/35 bg-danger/5 p-5 text-center"
              >
                <p className="font-semibold">We couldn’t load full details</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {moderationErrorMessage(detailError, "Please try again.")}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={retryDetail}>
                  Try again
                </Button>
              </div>
            ) : null}

            {detailReady ? (
              <>
                <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <ServiceImage
                    src={detail.image}
                    alt={detail.title ? `${detail.title} image` : "Service image"}
                    className="h-40 w-full rounded-xl lg:h-52"
                  />
                  <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                    <DetailField label="Title" className="sm:col-span-2 xl:col-span-3">
                      {detail.title || "Not provided"}
                    </DetailField>
                    <DetailField label="Category">{detail.category || "Not provided"}</DetailField>
                    <DetailField label="Technician">
                      {detail.technicianName || "Not provided"}
                    </DetailField>
                    <DetailField label="Technician email">
                      <span className="break-all">
                        {detail.technicianEmail || "Not provided"}
                      </span>
                    </DetailField>
                    <DetailField label="Base price">
                      {formatPrice(detail.basePrice)}
                    </DetailField>
                    <DetailField label="Estimated duration">
                      {detail.estimatedDuration || "Not provided"}
                    </DetailField>
                    <DetailField label="Service mode">
                      {detail.serviceMode || "Not provided"}
                    </DetailField>
                    <DetailField label="Service area">
                      {detail.serviceArea || "Not provided"}
                    </DetailField>
                    <DetailField label="Approval status">
                      <ApprovalBadge status={detail.approvalStatus} />
                    </DetailField>
                    <DetailField label="Availability">
                      <AvailabilityBadge available={detail.isAvailable} />
                    </DetailField>
                    <DetailField label="Created">
                      {formatServiceCreatedAt(detail.createdAt)}
                    </DetailField>
                    <DetailField label="Technician reference">
                      <span className="break-all">
                        {detail.technicianId || "Not provided"}
                      </span>
                    </DetailField>
                    <DetailField label="Description" className="sm:col-span-2 xl:col-span-3">
                      <span className="whitespace-pre-wrap">
                        {detail.description || "Not provided"}
                      </span>
                    </DetailField>
                  </dl>
                </div>

                <div className="border-t border-border pt-5">
                  <p className="text-sm font-semibold">Approval decision</p>
                  {actions.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {actions.map((action) => (
                        <Button
                          key={action}
                          type="button"
                          variant={ACTION_VARIANTS[action] ?? "outline"}
                          size="sm"
                          disabled={Boolean(submittingAction)}
                          onClick={() => beginDecision(action)}
                        >
                          {moderationActionLabel(action)}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p role="status" className="mt-3 text-sm text-muted-foreground">
                      No moderation action is available for this status.
                    </p>
                  )}

                  <AlertDialog
                    open={Boolean(decision)}
                    onOpenChange={(open) => {
                      if (submittingAction) return;
                      if (!open) {
                        setDecision(null);
                        setDecisionError("");
                      }
                    }}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {decision ? CONFIRMATION_TITLES[decision.action] : "Confirm decision"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {decision
                            ? `This will set the approval status of “${decision.title}” to ${moderationActionLabel(decision.action).toLowerCase()}.`
                            : "Confirm the moderation decision."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      {decisionError ? (
                        <p role="alert" className="text-sm text-destructive">
                          {decisionError}
                        </p>
                      ) : null}
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={Boolean(submittingAction)}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          variant={decision?.action === "reject" ? "destructive" : "default"}
                          disabled={Boolean(submittingAction)}
                          aria-busy={Boolean(submittingAction)}
                          onClick={(event) => {
                            event.preventDefault();
                            void handleDecision();
                          }}
                        >
                          {submittingAction
                            ? "Saving…"
                            : decision?.action === "approve"
                              ? "Yes, approve service"
                              : "Yes, reject service"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}
