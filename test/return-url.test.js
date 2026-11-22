import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_RETURN_URL_LENGTH,
  nextParamFromSearch,
  safeReturnPath,
  signInUrlForNext,
} from "../src/lib/return-url.js";
import { resolvePostAuthPath } from "../src/lib/post-auth-redirect.js";

test("safeReturnPath keeps valid internal paths with query and hash", () => {
  assert.equal(safeReturnPath("/dashboard/customer/bookings?status=requested#list", "/"), "/dashboard/customer/bookings?status=requested#list");
  assert.equal(safeReturnPath("/services", "/"), "/services");
});

test("safeReturnPath rejects external, protocol-relative and backslash URLs", () => {
  const fallback = "/dashboard/technician";
  for (const value of [
    "https://evil.example/steal",
    "http://evil.example",
    "//evil.example/path",
    "/\\evil.example/path",
    "/services\\@evil.example",
    "javascript:alert(1)",
    "dashboard/customer",
    "",
    null,
    undefined,
    42,
    "/a\u0000b",
    `/x${"a".repeat(MAX_RETURN_URL_LENGTH)}`,
  ]) {
    assert.equal(safeReturnPath(value, fallback), fallback, `should reject ${String(value)}`);
  }
});

test("safeReturnPath rejects auth and API destinations to avoid loops", () => {
  for (const value of ["/sign-in", "/sign-up", "/sign-in?next=/dashboard", "/api/fixmate/me", "/API/bookings", "/api"]) {
    assert.equal(safeReturnPath(value, "/"), "/", `should reject ${value}`);
  }
});

test("safeReturnPath decodes encoded paths before validating", () => {
  assert.equal(safeReturnPath("/%2F%2Fevil.example", "/"), "/");
  assert.equal(safeReturnPath("/%5Cevil.example", "/"), "/");
  assert.equal(safeReturnPath("/%2Fapi%2Ffixmate%2Fme", "/"), "/");
});

test("nextParamFromSearch reads and rejects malformed input", () => {
  assert.equal(nextParamFromSearch("?next=%2Fdashboard%2Fadmin"), "/dashboard/admin");
  assert.equal(nextParamFromSearch("?other=1"), null);
  assert.equal(nextParamFromSearch(""), null);
  assert.equal(nextParamFromSearch(null), null);
});

test("signInUrlForNext encodes a safe internal return path", () => {
  const url = signInUrlForNext("/dashboard/customer/bookings", "?status=requested");
  assert.equal(url, "/sign-in?next=%2Fdashboard%2Fcustomer%2Fbookings%3Fstatus%3Drequested");
  assert.equal(signInUrlForNext("/sign-in"), "/sign-in?next=%2Fsign-in");
});

test("resolvePostAuthPath prefers a safe next path", async () => {
  const loadUser = async () => ({ role: "technician" });
  assert.equal(
    await resolvePostAuthPath("?next=%2Fdashboard%2Ftechnician%2Frequests", loadUser),
    "/dashboard/technician/requests",
  );
});

test("resolvePostAuthPath falls back to the authoritative role dashboard", async () => {
  assert.equal(await resolvePostAuthPath("", async () => ({ role: "customer" })), "/dashboard/customer");
  assert.equal(await resolvePostAuthPath("", async () => ({ role: "technician" })), "/dashboard/technician");
  assert.equal(await resolvePostAuthPath("", async () => ({ role: "admin" })), "/dashboard/admin");
});

test("resolvePostAuthPath rejects external next and never loops to sign-in", async () => {
  const loadUser = async () => ({ role: "admin" });
  for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "/api/fixmate/me", "/sign-in"]) {
    const search = `?next=${encodeURIComponent(next)}`;
    assert.equal(await resolvePostAuthPath(search, loadUser), "/dashboard/admin", `should reject ${next}`);
  }
  assert.equal(await resolvePostAuthPath("", async () => ({ role: "unknown" })), "/");
  assert.equal(await resolvePostAuthPath("", async () => { throw new Error("offline"); }), "/");
});
