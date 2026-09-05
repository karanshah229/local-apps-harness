import {
  Check,
  Clock,
  FileText,
  Play,
  Plus,
  RotateCcw,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  formatFileSize,
  formatRelativeTime,
  type CleanupSessionSummary,
} from "../lib/storage";

interface ResumeSessionDialogProps {
  isOpen: boolean;
  fileName: string;
  sessions: CleanupSessionSummary[];
  onResume: (sessionId: string) => void;
  onStartNew: () => void;
  onClose: () => void;
}

export function ResumeSessionDialog({
  isOpen,
  fileName,
  sessions,
  onResume,
  onStartNew,
  onClose,
}: ResumeSessionDialogProps) {
  if (!isOpen || !sessions.length) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-session-title"
    >
      <div className="relative flex flex-col w-full max-w-xl max-h-[85vh] rounded-3xl border border-stone-200 dark:border-stone-800 bg-card text-card-foreground shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200 dark:border-stone-800 p-5 sm:p-6 shrink-0 bg-stone-50/50 dark:bg-stone-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="resume-session-title"
                className="font-display text-lg sm:text-xl font-bold text-foreground"
              >
                Previous Session Found
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                You already have cleanup progress for{" "}
                <span className="font-semibold text-foreground">{fileName}</span>.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground shrink-0"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {sessions.length === 1 ? "Existing Cleanup Session" : "Existing Cleanup Sessions"}
          </p>

          <div className="space-y-3">
            {sessions.map((session) => {
              const isCompleted =
                session.totalIssues > 0 && session.resolvedIssues >= session.totalIssues;
              const pendingCount = session.totalIssues - session.resolvedIssues;

              return (
                <div
                  key={session.id}
                  className="group relative flex flex-col gap-3 rounded-2xl border border-stone-200/90 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#0a1512] p-4 sm:p-5 transition-all hover:border-emerald-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate text-foreground">
                          {session.sourceName}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <Clock className="h-3 w-3 inline text-muted-foreground" />
                          <span>Last updated {formatRelativeTime(session.updatedAt)}</span>
                          <span>•</span>
                          <span>{formatFileSize(session.fileSize)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Badge */}
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Check className="h-3 w-3" /> Completed
                      </span>
                    ) : session.progressPercent > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        {session.progressPercent}% cleaned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        0% cleaned
                      </span>
                    )}
                  </div>

                  {/* Progress Bar & Counts */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground text-[11px]">
                        {session.resolvedIssues} of {session.totalIssues} issues reviewed
                      </span>
                      {pendingCount > 0 ? (
                        <span className="font-bold text-[11px] text-amber-400 tabular-nums">
                          {pendingCount.toLocaleString()} pending
                        </span>
                      ) : (
                        <span className="font-bold text-[11px] text-emerald-400">
                          All resolved
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-900">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                        style={{
                          width: `${Math.max(
                            session.progressPercent,
                            isCompleted ? 100 : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Contact count & Resume Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-200/50 dark:border-stone-800/60">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <UsersRound className="h-3.5 w-3.5" />
                      <span>{session.totalContacts.toLocaleString()} contacts</span>
                    </div>

                    <Button
                      size="sm"
                      className="font-bold text-xs h-8 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 shadow-sm gap-1.5"
                      onClick={() => onResume(session.id)}
                    >
                      <Play className="h-3 w-3 fill-current" /> Resume Session
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer with New Session or Cancel */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-stone-200 dark:border-stone-800 p-4 sm:p-5 bg-stone-50/50 dark:bg-stone-900/40 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto text-xs text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto font-bold text-xs h-9 px-4 rounded-xl border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground gap-1.5"
            onClick={onStartNew}
          >
            <Plus className="h-3.5 w-3.5" /> Start New Session Instead
          </Button>
        </div>
      </div>
    </div>
  );
}
