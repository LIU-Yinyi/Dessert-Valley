const DATABASE_NAME = "dessert-valley-workspace";
const DATABASE_VERSION = 1;
const STORE_NAME = "workspace";
const ACTIVE_WORKSPACE_KEY = "active";
const FALLBACK_STORAGE_KEY = "dessert-valley-workspace-fallback";

export const WORKSPACE_STORAGE_VERSION = 3;

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
