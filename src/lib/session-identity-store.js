// Shared, authoritative application identity. Values only enter this store from
// `/api/fixmate/me` (or the authoritative profile response), never from browser
// role/ownership data or raw session claims.

import { APPLICATION_ROLES } from "./registration.js";
import { safeProfileImageUrl } from "./profile-contract.js";

let snapshot = null;
const listeners = new Set();

function text(value) {
  return typeof value === "string" ? value : "";
}

function normalizeIdentity(user) {
  if (!user || typeof user !== "object") return null;

  const role = APPLICATION_ROLES.includes(user.role) ? user.role : "";
  return Object.freeze({
    id: text(user.id),
    name: text(user.name),
    email: text(user.email),
    image: safeProfileImageUrl(user.image),
    role,
  });
}

function sameIdentity(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id &&
    a.name === b.name &&
    a.email === b.email &&
    a.image === b.image &&
    a.role === b.role;
}

function emit() {
  for (const listener of Array.from(listeners)) listener();
}

export function getSessionIdentity() {
  return snapshot;
}

// Server render and the first client render both see `null`, so no identity is
// rendered until an effect has confirmed the authenticated session.
export function getServerSessionIdentity() {
  return null;
}

export function subscribeSessionIdentity(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSessionIdentity(user) {
  const next = normalizeIdentity(user);
  if (sameIdentity(next, snapshot)) return snapshot;
  snapshot = next;
  emit();
  return snapshot;
}

export function clearSessionIdentity() {
  return setSessionIdentity(null);
}
