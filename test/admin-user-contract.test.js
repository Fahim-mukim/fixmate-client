import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_USER_PROXY_PATH,
  ADMIN_USER_UPSTREAM_PATH,
  USER_ROLE_FILTERS,
  USER_ROLES,
  adminUserErrorMessage,
  buildAdminUserQuery,
  formatAdminUserCreatedAt,
  isValidAdminUserId,
  safeProfileImageUrl,
} from "../src/lib/admin-user-contract.js";

const USER_ID = "507f1f77bcf86cd799439012";

test("admin user contract mirrors the server paths and role filters", () => {
  assert.equal(ADMIN_USER_PROXY_PATH, "/api/fixmate/admin-users");
  assert.equal(ADMIN_USER_UPSTREAM_PATH, "/api/admin/users");
  assert.deepEqual([...USER_ROLES], ["customer", "technician", "admin"]);
  assert.deepEqual(
    USER_ROLE_FILTERS.map((filter) => filter.label),
    ["All roles", "Customer", "Technician", "Admin"],
  );
});

test("admin user query builds only role, search, page, and limit", () => {
  assert.deepEqual(buildAdminUserQuery(), {
    ok: true,
    query: "page=1&limit=12",
    role: "",
    search: "",
    page: 1,
    limit: 12,
  });

  const full = buildAdminUserQuery({
    role: "customer",
    search: "  Jane@example.com  ",
    page: 3,
    limit: 10,
  });
  assert.equal(full.ok, true);
  assert.equal(
    full.query,
    "role=customer&search=Jane%40example.com&page=3&limit=10",
  );
  assert.equal(full.search, "Jane@example.com");

  const searched = buildAdminUserQuery({ search: "a.b*" });
  assert.equal(searched.ok, true);
  const parsedSearch = new URLSearchParams(searched.query);
  assert.equal(parsedSearch.get("search"), "a.b*");
  assert.equal(parsedSearch.get("page"), "1");
  assert.equal(parsedSearch.get("limit"), "12");
});

test("admin user query rejects invalid roles, searches, and pagination", () => {
  const invalid = [
    { role: "owner" },
    { role: 1 },
    { search: "x".repeat(101) },
    { search: "bad\u0000value" },
    { search: 123 },
    { page: 0 },
    { page: 1.5 },
    { limit: 51 },
    { limit: "12" },
  ];
  for (const options of invalid) {
    const result = buildAdminUserQuery(options);
    assert.equal(result.ok, false, JSON.stringify(options));
    assert.equal(result.message, "Invalid user list query.");
  }
});

test("admin user ids, dates, images, and errors are handled safely", () => {
  assert.equal(isValidAdminUserId(USER_ID), true);
  assert.equal(isValidAdminUserId("not-an-id"), false);
  assert.equal(isValidAdminUserId(undefined), false);
  assert.equal(formatAdminUserCreatedAt("2026-01-02T03:04:05.000Z").length > 0, true);
  assert.equal(formatAdminUserCreatedAt(null), "Not provided");
  assert.equal(formatAdminUserCreatedAt("not-a-date"), "Not provided");
  assert.equal(safeProfileImageUrl("https://i.imgbb.com/a.png"), "https://i.imgbb.com/a.png");
  assert.equal(safeProfileImageUrl("javascript:alert(1)"), null);
  assert.equal(
    adminUserErrorMessage({ ok: false, status: 403 }, "fallback"),
    "Admin access is required to inspect users.",
  );
  assert.equal(
    adminUserErrorMessage({ ok: false, status: 404 }, "fallback"),
    "That user is no longer available.",
  );
  assert.equal(
    adminUserErrorMessage({ ok: false, message: "Server detail" }, "fallback"),
    "Server detail",
  );
});
