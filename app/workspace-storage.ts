const DATABASE_NAME = "dessert-valley-workspace";
const DATABASE_VERSION = 1;
const STORE_NAME = "workspace";
const ACTIVE_WORKSPACE_KEY = "active";
const FALLBACK_STORAGE_KEY = "dessert-valley-workspace-fallback";

export const WORKSPACE_COOKIE_NAME = "dessert-valley-workspace";
export const WORKSPACE_STORAGE_VERSION = 2;

export type WorkspaceEnvelope<T> = {
  version: number;
  savedAt: string;
  data: T;
};

function openWorkspaceDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("indexeddb_unavailable"));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("indexeddb_open_failed"));
  });
}

async function readFromIndexedDb<T>() {
  const database = await openWorkspaceDatabase();
  return new Promise<WorkspaceEnvelope<T> | null>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(ACTIVE_WORKSPACE_KEY);

    request.onsuccess = () =>
      resolve((request.result as WorkspaceEnvelope<T> | undefined) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error("indexeddb_read_failed"));
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("indexeddb_read_aborted"));
    };
  });
}

async function writeToIndexedDb<T>(envelope: WorkspaceEnvelope<T>) {
  const database = await openWorkspaceDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction
      .objectStore(STORE_NAME)
      .put(envelope, ACTIVE_WORKSPACE_KEY);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("indexeddb_write_failed"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("indexeddb_write_aborted"));
    };
  });
}

function readFallback<T>() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
    return value ? (JSON.parse(value) as WorkspaceEnvelope<T>) : null;
  } catch {
    return null;
  }
}

function writeFallback<T>(envelope: WorkspaceEnvelope<T>) {
  if (typeof window === "undefined") {
    throw new Error("browser_storage_unavailable");
  }
  window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(envelope));
}

export function hasWorkspaceCookie() {
  if (typeof document === "undefined") return false;
  try {
    return document.cookie
      .split(";")
      .some(
        (part) =>
          part.trim().split("=")[0] === WORKSPACE_COOKIE_NAME
      );
  } catch {
    return false;
  }
}

export function ensureWorkspaceCookie() {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  try {
    document.cookie = `${WORKSPACE_COOKIE_NAME}=v${WORKSPACE_STORAGE_VERSION}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  } catch {
    // IndexedDB can still preserve the workspace when cookies are disabled.
  }
}

export async function readWorkspace<T>() {
  try {
    const stored = await readFromIndexedDb<T>();
    return stored ?? readFallback<T>();
  } catch {
    return readFallback<T>();
  }
}

export async function writeWorkspace<T>(data: T) {
  const envelope: WorkspaceEnvelope<T> = {
    version: WORKSPACE_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    data,
  };

  ensureWorkspaceCookie();

  try {
    await writeToIndexedDb(envelope);
    try {
      window.localStorage.removeItem(FALLBACK_STORAGE_KEY);
    } catch {
      // IndexedDB remains the source of truth when fallback cleanup is blocked.
    }
  } catch {
    writeFallback(envelope);
  }
}
