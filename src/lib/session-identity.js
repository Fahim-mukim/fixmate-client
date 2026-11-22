"use client";

import { useSyncExternalStore } from "react";

import {
  getServerSessionIdentity,
  getSessionIdentity,
  subscribeSessionIdentity,
} from "./session-identity-store.js";

export function useSessionIdentity() {
  return useSyncExternalStore(
    subscribeSessionIdentity,
    getSessionIdentity,
    getServerSessionIdentity,
  );
}

export {
  clearSessionIdentity,
  setSessionIdentity,
} from "./session-identity-store.js";
