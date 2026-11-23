import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { scrollApprovalDecisionIntoView } from "../src/lib/approval-decision-scroll.js";

const root = fileURLToPath(new URL("../", import.meta.url));

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("approval decision scrolls smoothly to the section start", () => {
  const calls = [];
  const element = {
    scrollIntoView(options) {
      calls.push(options);
    },
  };

  assert.equal(scrollApprovalDecisionIntoView(element), true);
  assert.deepEqual(calls, [{ behavior: "smooth", block: "start" }]);
});

test("approval decision scroll respects reduced motion and ignores missing targets", () => {
  const previousWindow = globalThis.window;
  const queries = [];
  const calls = [];
  let reducedMotion = true;

  globalThis.window = {
    matchMedia(query) {
      queries.push(query);
      return { matches: reducedMotion };
    },
  };

  try {
    const element = {
      scrollIntoView(options) {
        calls.push(options);
      },
    };

    assert.equal(scrollApprovalDecisionIntoView(element), true);
    assert.deepEqual(queries, ["(prefers-reduced-motion: reduce)"]);
    assert.deepEqual(calls, [{ behavior: "auto", block: "start" }]);

    reducedMotion = false;
    assert.equal(scrollApprovalDecisionIntoView(element), true);
    assert.deepEqual(calls[1], { behavior: "smooth", block: "start" });

    assert.equal(scrollApprovalDecisionIntoView(null), false);
    assert.equal(scrollApprovalDecisionIntoView({}), false);
    assert.equal(calls.length, 2);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

test("admin review runs the scroll after a fresh detail mount and reuses the live target", () => {
  const panel = source("src/components/dashboard/admin-services-panel.jsx");

  assert.ok(
    panel.includes("scrollApprovalDecisionIntoView"),
    "panel must use the shared scroll helper",
  );
  assert.ok(panel.includes("approvalDecisionRef"), "panel must keep a live target ref");
  assert.ok(panel.includes("requestAnimationFrame"), "scroll must run after mount");
  assert.ok(panel.includes("cancelAnimationFrame"), "pending frames must be cleaned up");
  assert.ok(
    panel.includes("[detail?._id, detailReady]"),
    "a new service detail must trigger a fresh scroll",
  );
  assert.ok(panel.includes("ref={approvalDecisionRef}"), "ref must be attached to the target");
  assert.ok(
    panel.includes("scroll-mt-24 border-t border-border pt-5"),
    "target must reserve space for the sticky header",
  );
  assert.ok(panel.includes("Approval decision"), "existing section label must remain");
});
