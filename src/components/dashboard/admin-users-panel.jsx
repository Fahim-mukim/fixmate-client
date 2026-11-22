"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RefreshCw, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ButtonLink from "@/components/ui/button-link";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { adminUserApi } from "@/lib/admin-user-api.js";
import {
  USER_ROLES,
  USER_ROLE_FILTERS,
  adminUserErrorMessage,
  adminUserRoleErrorMessage,
  formatAdminUserCreatedAt,
  safeProfileImageUrl,
} from "@/lib/admin-user-contract.js";
import BookingPagination from "./pagination.jsx";
import { useDashboardUser } from "./dashboard-gate.jsx";

const USER_LIMIT = 12;
const ROLE_VARIANTS = Object.freeze({
  admin: "default",
  technician: "secondary",
  customer: "outline",
});
const ROLE_LABELS = Object.freeze(
  Object.fromEntries(
    USER_ROLE_FILTERS.filter((filter) => filter.value).map((filter) => [
      filter.value,
      filter.label,
    ]),
  ),
);

function RoleBadge({ role }) {
  return (
    <Badge variant={ROLE_VARIANTS[role] ?? "outline"}>
      {role || "unknown"}
    </Badge>
  );
}

function RoleEditor({
  user,
  draft,
  isSelf,
  disabled,
  updating,
  onDraftChange,
  onSave,
}) {
  const role = USER_ROLES.includes(draft) ? draft : user.role;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`admin-user-role-${user.id}`}>
          Change role for {user.name || user.email || "user"}
        </label>
        <select
          id={`admin-user-role-${user.id}`}
          value={role}
          disabled={disabled || isSelf}
          onChange={(event) => onDraftChange(user.id, event.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/30"
        >
          {USER_ROLES.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          disabled={disabled || isSelf || updating || role === user.role}
          aria-busy={updating}
          onClick={() => onSave(user)}
        >
          {updating ? "Saving…" : "Save role"}
        </Button>
      </div>
      {isSelf ? (
        <p className="text-xs text-muted-foreground">
          This is your account. Self-role changes are blocked.
        </p>
      ) : null}
    </div>
  );
}

function UserAvatar({ user, className = "size-11 rounded-full" }) {
  const source = safeProfileImageUrl(user?.image);
  const name = user?.name || user?.email || "User";

  if (source) {
    return (
      // User images are hosted URLs from the API; the host is not configured for next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={source}
        alt=""
        className={`${className} border border-border object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} flex items-center justify-center bg-mist text-sm font-semibold text-muted-foreground dark:bg-surface-alt`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
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

function UsersSkeleton() {
  return (
    <div aria-label="Loading users" className="space-y-3">
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

export default function AdminUsersPanel() {
  const currentUser = useDashboardUser();
  const currentUserId = currentUser?.id ?? null;

  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [mutation, setMutation] = useState(null);
  const detailRequestRef = useRef(0);
  const updatingRoleRef = useRef(false);

  const controlsDisabled = loading || Boolean(updatingUserId);

  function isSelfUser(user) {
    return Boolean(
      currentUserId &&
        user?.id &&
        String(currentUserId).toLowerCase() === String(user.id).toLowerCase(),
    );
  }

  const load = useCallback(async (targetPage, targetRole, targetSearch) => {
    setLoading(true);
    setError(null);

    const result = await adminUserApi.listAdminUsers({
      page: targetPage,
      limit: USER_LIMIT,
      role: targetRole || undefined,
      search: targetSearch || undefined,
    });

    if (result.ok && result.data) {
      setData(result.data);
      setRoleDrafts((current) => {
        const next = { ...current };
        for (const item of result.data.items ?? []) {
          if (next[item.id] === undefined) next[item.id] = item.role;
        }
        return next;
      });
    } else {
      setData(null);
      setError(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load(page, roleFilter, search));
  }, [load, page, roleFilter, search, reloadToken]);

  const closeDetail = useCallback(() => {
    detailRequestRef.current += 1;
    setSelectedUser(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
  }, []);

  const openDetail = useCallback(async (user) => {
    if (!user?.id) return;

    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setSelectedUser(user);
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);

    const result = await adminUserApi.getAdminUser(user.id);
    if (requestId !== detailRequestRef.current) return;

    if (result.ok && result.data) {
      setDetail(result.data);
      setRoleDrafts((current) => (
        current[result.data.id] === undefined
          ? { ...current, [result.data.id]: result.data.role }
          : current
      ));
    } else {
      setDetailError(result);
    }
    setDetailLoading(false);
  }, []);

  function handleRoleChange(value) {
    setRoleFilter(value);
    setPage(1);
    setMutation(null);
    closeDetail();
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setSearch(searchInput);
    setPage(1);
    setMutation(null);
    closeDetail();
  }

  function handleClearFilters() {
    setSearchInput("");
    setSearch("");
    setRoleFilter("");
    setPage(1);
    setMutation(null);
    closeDetail();
  }

  function handleRefresh() {
    setMutation(null);
    closeDetail();
    setReloadToken((value) => value + 1);
  }

  function handleRoleDraftChange(id, role) {
    setRoleDrafts((current) => ({ ...current, [id]: role }));
    setMutation(null);
  }

  async function handleRoleUpdate(user) {
    const id = user?.id;
    const role = roleDrafts[id] ?? user?.role;

    if (!id || !USER_ROLES.includes(role) || role === user.role) return;
    if (isSelfUser(user)) return;
    if (updatingRoleRef.current) return;

    updatingRoleRef.current = true;
    setUpdatingUserId(id);
    setMutation({
      status: "loading",
      userId: id,
      message: `Updating ${user.name || user.email || "user"}…`,
    });

    try {
      const result = await adminUserApi.updateAdminUserRole(id, role);
      if (!result.ok || !result.data) {
        setMutation({
          status: "error",
          userId: id,
          message: adminUserRoleErrorMessage(result),
        });
        return;
      }

      const updated = result.data;
      setData((current) => (
        current
          ? {
              ...current,
              items: (current.items ?? []).map((item) => (
                item.id === id ? { ...item, ...updated } : item
              )),
            }
          : current
      ));
      setRoleDrafts((current) => ({ ...current, [id]: updated.role }));
      setMutation({
        status: "success",
        userId: id,
        message: `${updated.name || "User"} is now ${
          ROLE_LABELS[updated.role] || updated.role
        }.`,
      });

      if (selectedUser?.id === id) void openDetail(updated);
      setReloadToken((value) => value + 1);
    } finally {
      updatingRoleRef.current = false;
      setUpdatingUserId(null);
    }
  }

  function retryDetail() {
    if (selectedUser) void openDetail(selectedUser);
  }

  const detailIsCurrent = Boolean(detail) && detail?.id === selectedUser?.id;
  const detailReady = Boolean(detail) && detailIsCurrent && !detailLoading && !detailError;
  const activeRole = USER_ROLE_FILTERS.find((filter) => filter.value === roleFilter);
  const emptyTitle = search
    ? "No users match this search"
    : activeRole && activeRole.value
      ? `No ${activeRole.label.toLowerCase()} accounts`
      : "No users found";

  return (
    <section aria-labelledby="admin-users-heading" className="space-y-6">
      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] sm:items-end"
      >
        <div className="space-y-2">
          <Label htmlFor="admin-user-role-filter">Filter by role</Label>
          <select
            id="admin-user-role-filter"
            value={roleFilter}
            disabled={controlsDisabled}
            onChange={(event) => handleRoleChange(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/30"
          >
            {USER_ROLE_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-user-search">Search by name or email</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="admin-user-search"
              type="search"
              value={searchInput}
              disabled={controlsDisabled}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name or email"
              maxLength={100}
              className="h-9 w-full rounded-lg border border-input bg-background pr-2.5 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/30"
            />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={controlsDisabled}>
          Search
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          disabled={controlsDisabled}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={controlsDisabled}
          aria-busy={controlsDisabled}
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </form>

      {mutation && mutation.status !== "loading" ? (
        <div
          role={mutation.status === "error" ? "alert" : "status"}
          className={`rounded-lg border px-4 py-3 text-sm ${
            mutation.status === "error"
              ? "border-danger/35 bg-danger/5 text-danger"
              : "border-border bg-mist text-foreground dark:bg-surface-alt"
          }`}
        >
          {mutation.message}
        </div>
      ) : null}

      <div>
        <h2 id="admin-users-heading" className="sr-only">
          Registered users
        </h2>

        {loading ? <UsersSkeleton /> : null}

        {!loading && error ? (
          <div
            role="alert"
            className="rounded-2xl border border-danger/35 bg-danger/5 px-6 py-12 text-center"
          >
            <h3 className="text-lg font-semibold">We couldn’t load users</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {adminUserErrorMessage(error, "Please try again.")}
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
              User records appear here only after real accounts are registered.
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
                    <th scope="col" className="px-4 py-3">Name</th>
                    <th scope="col" className="px-4 py-3">Email</th>
                    <th scope="col" className="px-4 py-3">Role</th>
                    <th scope="col" className="px-4 py-3">Phone</th>
                    <th scope="col" className="px-4 py-3">Area</th>
                    <th scope="col" className="px-4 py-3">Created</th>
                    <th scope="col" className="px-4 py-3">Manage role</th>
                    <th scope="col" className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((user) => (
                    <tr key={user.id} className="align-top">
                      <td className="px-4 py-3">
                        <UserAvatar user={user} />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {user.name || "Not provided"}
                      </td>
                      <td className="px-4 py-3 text-xs break-all text-muted-foreground">
                        {user.email || "Not provided"}
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                      <td className="px-4 py-3">{user.phone || "Not provided"}</td>
                      <td className="px-4 py-3">{user.area || "Not provided"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatAdminUserCreatedAt(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <RoleEditor
                          user={user}
                          draft={roleDrafts[user.id]}
                          isSelf={isSelfUser(user)}
                          disabled={controlsDisabled}
                          updating={updatingUserId === user.id}
                          onDraftChange={handleRoleDraftChange}
                          onSave={(target) => void handleRoleUpdate(target)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void openDetail(user)}
                        >
                          View details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:hidden">
              {data.items.map((user) => (
                <article
                  key={user.id}
                  className="space-y-4 rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div>
                        <h3 className="text-lg font-semibold">
                          {user.name || "Not provided"}
                        </h3>
                        <p className="mt-1 text-xs break-all text-muted-foreground">
                          {user.email || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <RoleBadge role={user.role} />
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <DetailField label="Phone">{user.phone || "Not provided"}</DetailField>
                    <DetailField label="Area">{user.area || "Not provided"}</DetailField>
                    <DetailField label="Created">
                      {formatAdminUserCreatedAt(user.createdAt)}
                    </DetailField>
                  </dl>
                  <RoleEditor
                    user={user}
                    draft={roleDrafts[user.id]}
                    isSelf={isSelfUser(user)}
                    disabled={controlsDisabled}
                    updating={updatingUserId === user.id}
                    onDraftChange={handleRoleDraftChange}
                    onSave={(target) => void handleRoleUpdate(target)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void openDetail(user)}
                  >
                    View details
                  </Button>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <BookingPagination
          label="Admin user pages"
          page={data?.page ?? page}
          totalPages={data?.totalPages ?? 0}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            closeDetail();
          }}
        />
      </div>

      {selectedUser ? (
        <section
          aria-labelledby="admin-user-detail-heading"
          className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="admin-user-detail-heading" className="text-xl font-semibold">
                User details
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedUser.name || selectedUser.email || "Selected user"}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={closeDetail}>
              Close details
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            {detailLoading ? (
              <div aria-label="Loading user details" className="space-y-3">
                <Skeleton className="h-16 w-16 rounded-full" />
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
                  {adminUserErrorMessage(detailError, "Please try again.")}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={retryDetail}>
                  Try again
                </Button>
              </div>
            ) : null}

            {detailReady ? (
              <>
                <div className="flex items-center gap-4">
                  <UserAvatar user={detail} className="size-16 rounded-full" />
                  <div>
                    <p className="text-lg font-semibold">{detail.name || "Not provided"}</p>
                    <p className="text-sm text-muted-foreground">
                      {detail.email || "Not provided"}
                    </p>
                  </div>
                </div>
                <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                  <DetailField label="Role"><RoleBadge role={detail.role} /></DetailField>
                  <DetailField label="Phone">{detail.phone || "Not provided"}</DetailField>
                  <DetailField label="Area">{detail.area || "Not provided"}</DetailField>
                  <DetailField label="Bio" className="sm:col-span-2 xl:col-span-3">
                    {detail.bio || "Not provided"}
                  </DetailField>
                  <DetailField label="Created">
                    {formatAdminUserCreatedAt(detail.createdAt)}
                  </DetailField>
                </dl>
                <p
                  role="status"
                  className="rounded-lg border border-border bg-mist p-3 text-sm text-foreground dark:bg-surface-alt"
                >
                  Role changes are saved by the Server and confirmed here before the
                  updated role is shown.
                </p>
              </>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}
