type Outcome = "started" | "succeeded" | "failed" | "cancelled";

type SafeContext = Record<string, string | number | boolean | undefined>;

const SAFE_KEYS = new Set([
  "contactCount",
  "issueCount",
  "duplicateCount",
  "qualityCount",
  "remainingCount",
  "durationMs",
  "fileBytes",
  "fileType",
  "decision",
  "errorType",
]);

export function logEvent(event: string, outcome: Outcome, context: SafeContext = {}) {
  const safeContext = Object.fromEntries(
    Object.entries(context).filter(([key, value]) => SAFE_KEYS.has(key) && value !== undefined),
  );
  const record = {
    timestamp: new Date().toISOString(),
    severity: outcome === "failed" ? "error" : "info",
    app: "tidy-contacts",
    release: "1.0.0",
    environment: (import.meta as ImportMeta & { env?: { MODE?: string } }).env?.MODE ?? "test",
    event,
    outcome,
    ...safeContext,
  };

  if (outcome === "failed") console.error(record);
  else if ((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) console.info(record);
}

export function installBrowserDiagnostics() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (event) => {
    logEvent("browser.unhandled_error", "failed", {
      errorType: event.error?.name ?? "Error",
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { name?: string } | undefined;
    logEvent("browser.unhandled_rejection", "failed", {
      errorType: reason?.name ?? "PromiseRejection",
    });
  });
}
