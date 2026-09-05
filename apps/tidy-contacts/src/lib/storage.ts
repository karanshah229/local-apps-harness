import type { ContactCard, DuplicateDecision, QualityDecision } from "./vcard";

export type ReviewMode = "duplicates" | "manual" | "autofix" | "quality";

export interface HistoryEntry {
  type: "duplicate" | "quality";
  id: string;
  previousDuplicate?: DuplicateDecision;
  previousQuality?: QualityDecision;
  targetIndex: number;
  mode: ReviewMode;
  notice: string;
}

export interface CleanupSession {
  id: string;
  sourceName: string;
  fileSize: number;
  createdAt: number;
  updatedAt: number;
  baseCards: ContactCard[];
  duplicateDecisions: Record<string, DuplicateDecision>;
  qualityDecisions: Record<string, QualityDecision>;
  duplicateIndex: number;
  qualityIndex: number;
  history: HistoryEntry[];
  mode: ReviewMode;
  totalContacts: number;
  totalIssues: number;
  resolvedIssues: number;
  effectiveCount: number;
}

export interface CleanupSessionSummary {
  id: string;
  sourceName: string;
  fileSize: number;
  createdAt: number;
  updatedAt: number;
  totalContacts: number;
  totalIssues: number;
  resolvedIssues: number;
  effectiveCount: number;
  progressPercent: number;
}

const DB_NAME = "tidy_contacts_db";
const DB_VERSION = 1;
const STORE_NAME = "cleanup_sessions";
const ACTIVE_SESSION_KEY = "tidy_contacts_active_session_id";

// In-memory fallback for testing or environments where IndexedDB is unavailable
const memoryStore = new Map<string, CleanupSession>();

function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB database"));
  });
}

export async function saveSession(session: CleanupSession): Promise<void> {
  memoryStore.set(session.id, { ...session });

  if (!isIndexedDBAvailable()) return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(session);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("Failed to save session"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Transaction failed"));
    });
  } catch (error) {
    console.warn("IndexedDB save failed, used memory store:", error);
  }
}

export async function getSession(id: string): Promise<CleanupSession | null> {
  if (!isIndexedDBAvailable()) {
    return memoryStore.get(id) ?? null;
  }

  try {
    const db = await openDB();
    return await new Promise<CleanupSession | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        resolve((req.result as CleanupSession) || null);
      };
      req.onerror = () => reject(req.error || new Error("Failed to retrieve session"));
    });
  } catch (error) {
    console.warn("IndexedDB get failed, checked memory store:", error);
    return memoryStore.get(id) ?? null;
  }
}

export async function listSessionSummaries(): Promise<CleanupSessionSummary[]> {
  const mapToSummary = (s: CleanupSession): CleanupSessionSummary => ({
    id: s.id,
    sourceName: s.sourceName,
    fileSize: s.fileSize,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    totalContacts: s.totalContacts,
    totalIssues: s.totalIssues,
    resolvedIssues: s.resolvedIssues,
    effectiveCount: s.effectiveCount,
    progressPercent: s.totalIssues > 0 ? Math.round((s.resolvedIssues / s.totalIssues) * 100) : 100,
  });

  if (!isIndexedDBAvailable()) {
    const list = Array.from(memoryStore.values()).map(mapToSummary);
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  try {
    const db = await openDB();
    const sessions = await new Promise<CleanupSession[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result as CleanupSession[]);
      req.onerror = () => reject(req.error || new Error("Failed to list sessions"));
    });

    return sessions.map(mapToSummary).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.warn("IndexedDB list failed, checking memory store:", error);
    const list = Array.from(memoryStore.values()).map(mapToSummary);
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export async function deleteSession(id: string): Promise<void> {
  memoryStore.delete(id);

  if (getActiveSessionId() === id) {
    clearActiveSessionId();
  }

  if (!isIndexedDBAvailable()) return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("Failed to delete session"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Transaction failed"));
    });
  } catch (error) {
    console.warn("IndexedDB delete failed:", error);
  }
}

export function getActiveSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setActiveSessionId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  } catch {}
}

export function clearActiveSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {}
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return "Just now";
  if (diffSec < 90) return "1 min ago";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
