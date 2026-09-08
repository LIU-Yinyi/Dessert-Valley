import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  hasWorkspaceCookie,
  readWorkspace,
  WORKSPACE_STORAGE_VERSION,
  writeWorkspace,
} from "../app/workspace-storage.ts";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

afterEach(() => {
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
  if (originalDocument === undefined) {
    delete globalThis.document;
  } else {
    globalThis.document = originalDocument;
  }
});

function installFallbackBrowser(initialValue = null) {
  const storage = new Map();
  if (initialValue !== null) {
    storage.set("dessert-valley-workspace-fallback", initialValue);
  }
  const localStorage = {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
  };
  let cookie = "";
  globalThis.window = {
    indexedDB: undefined,
    localStorage,
    location: { protocol: "https:" },
  };
  globalThis.document = {
    get cookie() {
      return cookie;
    },
    set cookie(value) {
      cookie = String(value);
    },
  };
  return { storage, getCookie: () => cookie };
}

test("writes and recovers the versioned workspace through localStorage fallback", async () => {
  const browser = installFallbackBrowser();

  await writeWorkspace({ handbookPageCount: 3, cards: ["moon"] });
  const stored = await readWorkspace();

  assert.equal(stored.version, WORKSPACE_STORAGE_VERSION);
  assert.deepEqual(stored.data, {
    handbookPageCount: 3,
    cards: ["moon"],
  });
  assert.match(stored.savedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(hasWorkspaceCookie(), true);
  assert.match(browser.getCookie(), /dessert-valley-workspace=v3/);
});

test("returns null for a fresh browser and malformed fallback data", async () => {
  installFallbackBrowser();
  assert.equal(await readWorkspace(), null);

  installFallbackBrowser("{broken-json");
  assert.equal(await readWorkspace(), null);
});

test("preserves transcribed idea text and multiple images in both storage paths", async () => {
  const draft = {
    ideaText: "A chestnut tart with maple cream.",
    ideaImage: "data:image/png;base64,iVBORw0KGgo=",
    ideaImageName: "sketch.png",
    ideaImages: [
      { src: "data:image/png;base64,iVBORw0KGgo=", name: "sketch.png" },
      { src: "data:image/jpeg;base64,/9j/", name: "dessert.jpg" },
    ],
  };
  const browser = installFallbackBrowser();
  await writeWorkspace(draft);
  assert.deepEqual((await readWorkspace()).data, draft);

  const rows = new Map();
  const database = {
    close() {},
    transaction() {
      const transaction = {
        objectStore() {
          return {
            put(value, key) {
              rows.set(key, structuredClone(value));
              queueMicrotask(() => transaction.oncomplete?.());
            },
            get(key) {
              const request = { result: structuredClone(rows.get(key)) };
              queueMicrotask(() => { request.onsuccess?.(); transaction.oncomplete?.(); });
              return request;
            },
          };
        },
      };
      return transaction;
    },
  };
  globalThis.window.indexedDB = {
    open() {
      const request = { result: database };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  };
  await writeWorkspace(draft);
  assert.equal(rows.size, 1);
  assert.deepEqual((await readWorkspace()).data, draft);
  assert.equal(browser.storage.has("dessert-valley-workspace-fallback"), false);
});
