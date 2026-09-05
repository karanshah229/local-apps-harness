import { useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface ExportConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalIssues: number;
  resolvedIssues: number;
  effectiveContactsCount: number;
  autoFixCount?: number;
  mergedDuplicatesCount?: number;
  removedContactsCount?: number;
  onInspectAutoFixes?: () => void;
  onConfirmExport: () => void;
}

export function ExportConfirmationModal({
  isOpen,
  onClose,
  totalIssues,
  resolvedIssues,
  effectiveContactsCount,
  autoFixCount = 0,
  mergedDuplicatesCount = 0,
  removedContactsCount = 0,
  onInspectAutoFixes,
  onConfirmExport,
}: ExportConfirmationModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pending = Math.max(0, totalIssues - resolvedIssues);
  const hasUnresolved = pending > 0;

  const handleExport = () => {
    onConfirmExport();
    onClose();
  };

  // Build natural-language summary parts
  const summaryParts: string[] = [];
  if (autoFixCount > 0) {
    summaryParts.push(`${autoFixCount.toLocaleString()} safe auto-fix${autoFixCount === 1 ? "" : "es"}`);
  }
  if (mergedDuplicatesCount > 0) {
    summaryParts.push(`${mergedDuplicatesCount.toLocaleString()} duplicate pair${mergedDuplicatesCount === 1 ? "" : "s"} merged`);
  }
  if (removedContactsCount > 0) {
    summaryParts.push(`${removedContactsCount.toLocaleString()} ghost/empty contact${removedContactsCount === 1 ? "" : "s"} removed`);
  }

  let completedSummarySentence = `All ${totalIssues.toLocaleString()} issues have been addressed. Your clean vCard is fully optimized and ready to import.`;
  if (summaryParts.length === 1) {
    completedSummarySentence = `Applied ${summaryParts[0]}. Your clean vCard is fully optimized and ready to import.`;
  } else if (summaryParts.length === 2) {
    completedSummarySentence = `Applied ${summaryParts[0]} and ${summaryParts[1]}. Your clean vCard is fully optimized and ready to import.`;
  } else if (summaryParts.length >= 3) {
    completedSummarySentence = `Applied ${summaryParts.slice(0, -1).join(", ")}, and ${summaryParts[summaryParts.length - 1]}. Your clean vCard is fully optimized and ready to import.`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div
        className="relative flex w-full max-w-md flex-col rounded-2xl border border-stone-200 dark:border-stone-800 bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 p-4 sm:p-5 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                hasUnresolved
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300"
              }`}
            >
              {hasUnresolved ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 id="export-modal-title" className="font-display text-base sm:text-lg font-bold">
                {hasUnresolved ? "Export with Unresolved Issues?" : "Export Cleaned Contacts"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {hasUnresolved
                  ? `${pending} issue${pending === 1 ? "" : "s"} not yet reviewed`
                  : "All detected issues resolved"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 text-sm">
          {hasUnresolved ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                You have made <strong className="text-foreground font-semibold">{resolvedIssues.toLocaleString()}</strong> decision{resolvedIssues === 1 ? "" : "s"} out of <strong className="text-foreground font-semibold">{totalIssues.toLocaleString()}</strong> total issues detected.
              </p>
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Important Export Notice</span>
                </div>
                <p className="text-xs text-amber-950/90 dark:text-amber-100/90 leading-relaxed">
                  The exported file will apply your <strong>{resolvedIssues.toLocaleString()}</strong> selected decisions and will still contain <strong>{pending.toLocaleString()}</strong> unresolved issues (kept as they originally were).
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 flex items-start gap-3">
                <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 dark:text-emerald-100 space-y-1">
                  <p className="font-bold text-sm">100% Cleanup Complete</p>
                  <p className="leading-relaxed">
                    {completedSummarySentence}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="rounded-xl bg-stone-50 dark:bg-stone-900/60 p-2.5 border border-stone-200/80 dark:border-stone-800 flex flex-col items-center justify-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contacts</p>
              <p className="font-display text-base font-extrabold tabular-nums text-foreground mt-0.5">{effectiveContactsCount.toLocaleString()}</p>
            </div>
            {onInspectAutoFixes && autoFixCount > 0 ? (
              <button
                type="button"
                onClick={onInspectAutoFixes}
                className="group relative rounded-xl bg-stone-50 dark:bg-stone-900/60 p-2.5 border border-stone-200/80 dark:border-stone-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all text-center flex flex-col items-center justify-center cursor-pointer"
                title="Tap to inspect auto-fixes"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Auto-fixes</p>
                <p className="font-display text-base font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {autoFixCount.toLocaleString()}
                </p>
                <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 font-medium underline underline-offset-2 decoration-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-300">
                  tap to inspect
                </span>
              </button>
            ) : (
              <div className="rounded-xl bg-stone-50 dark:bg-stone-900/60 p-2.5 border border-stone-200/80 dark:border-stone-800 flex flex-col items-center justify-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Auto-fixes</p>
                <p className="font-display text-base font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">{autoFixCount.toLocaleString()}</p>
              </div>
            )}
            <div className="rounded-xl bg-stone-50 dark:bg-stone-900/60 p-2.5 border border-stone-200/80 dark:border-stone-800 flex flex-col items-center justify-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending</p>
              <p className="font-display text-base font-extrabold tabular-nums text-foreground mt-0.5">{pending.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 dark:border-stone-800 p-4 sm:p-5 bg-stone-50/50 dark:bg-stone-900/50">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {hasUnresolved ? "Keep Reviewing" : "Cancel"}
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            className={`font-bold gap-1.5 ${
              hasUnresolved
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            <Download className="h-4 w-4" />
            {hasUnresolved ? "Export Anyway" : "Download Clean VCF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
