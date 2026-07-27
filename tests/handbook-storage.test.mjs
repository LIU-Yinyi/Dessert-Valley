import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_HANDBOOK_PAGE_COUNT,
  normalizeHandbookResult,
} from "../app/handbook-storage.ts";

test("keeps a valid multi-page handbook result", () => {
  const result = normalizeHandbookResult({
    pages: ["data:image/jpeg;base64,one", "data:image/jpeg;base64,two"],
    signature: "signature-v3",
    dessertCount: 3,
    visualInputCount: 2,
  });

  assert.deepEqual(result, {
    pages: ["data:image/jpeg;base64,one", "data:image/jpeg;base64,two"],
    signature: "signature-v3",
    dessertCount: 3,
    visualInputCount: 2,
  });
});

test("migrates a legacy single-image handbook result without losing it", () => {
  const result = normalizeHandbookResult({
    src: "data:image/jpeg;base64,legacy",
    signature: "legacy-signature",
    dessertCount: 2,
    visualInputCount: 1,
  });

  assert.deepEqual(result?.pages, ["data:image/jpeg;base64,legacy"]);
  assert.equal(result?.signature, "legacy-signature");
});

test("drops malformed pages and bounds persisted page arrays", () => {
  const pages = Array.from(
    { length: MAX_HANDBOOK_PAGE_COUNT + 3 },
    (_value, index) => `data:image/jpeg;base64,page-${index + 1}`,
  );
  const result = normalizeHandbookResult({
    pages: [null, "", ...pages],
    signature: "bounded",
    dessertCount: "3",
    visualInputCount: -2,
  });

  assert.equal(result?.pages.length, MAX_HANDBOOK_PAGE_COUNT);
  assert.equal(result?.dessertCount, 3);
  assert.equal(result?.visualInputCount, 0);
});

test("returns a fresh empty result for malformed or missing storage", () => {
  assert.equal(normalizeHandbookResult(null), null);
  assert.equal(normalizeHandbookResult({ pages: [], signature: "empty" }), null);
  assert.equal(
    normalizeHandbookResult({
      pages: ["data:image/jpeg;base64,page"],
      signature: null,
    }),
    null,
  );
});
