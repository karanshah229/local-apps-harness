import { useState } from "react";
import {
  Check,
  Clock,
  Download,
  FileText,
  Play,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  formatFileSize,
  formatRelativeTime,
  type CleanupSessionSummary,
} from "../lib/storage";

interface RecentSessionsListProps {
  sessions: CleanupSessionSummary[];
  onResume: (sessionId: string) => void;
  onExport?: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export function RecentSessionsList({
  sessions,
  onResume,
  onExport,
  onDelete,
}: RecentSessionsListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!sessions.length) return null;

  return (
    <section className="space-y-4 pt-2" aria-label="Recent Cleanup Sessions">
      {/* Section Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <Clock className="h-5 w-5 text-emerald-400" />
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
            Recent Cleanup Sessions
          </h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/20 px-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
            {sessions.length}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Your recent files and cleanup progress, all stored in this browser.
        </p>
      </div>

      {/* 3-Column Responsive Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => {
          const isCompleted = session.totalIssues > 0 && session.resolvedIssues >= session.totalIssues;
          const isPending = session.totalIssues > session.resolvedIssues;
          const isConfirmingDelete = confirmDeleteId === session.id;
          const pendingCount = session.totalIssues - session.resolvedIssues;

          return (
            <Card
              key={session.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/90 dark:border-stone-800/80 bg-card/95 hover:border-stone-300 dark:hover:border-stone-700 transition-all shadow-xs"
            >
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-4">
                {/* Header: Icon + Title + Meta + Badge */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate text-foreground leading-tight" title={session.sourceName}>
                          {session.sourceName}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          <span>{formatFileSize(session.fileSize)}</span>
                          <span className="mx-1.5">•</span>
                          <span>{formatRelativeTime(session.updatedAt)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
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

                  {/* Progress Bar & Pending Count */}
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
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-900">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                        style={{ width: `${Math.max(session.progressPercent, isCompleted ? 100 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Stats Strip */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-stone-200/50 dark:border-stone-800/60">
                  <span className="flex items-center gap-1.5">
                    <UsersRound className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Original:</span>
                    <strong className="text-foreground font-semibold tabular-nums">{session.totalContacts.toLocaleString()}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>Clean Output:</span>
                    <strong className="text-emerald-400 font-bold tabular-nums">{session.effectiveCount.toLocaleString()}</strong>
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="pt-1">
                  {isConfirmingDelete ? (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-destructive/10 border border-destructive/20 animate-in fade-in">
                      <span className="text-xs font-semibold text-destructive">Delete this session?</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 px-3 text-xs font-bold gap-1 rounded-lg"
                          onClick={() => {
                            onDelete(session.id);
                            setConfirmDeleteId(null);
                          }}
                        >
                          <Check className="h-3 w-3" /> Yes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs rounded-lg"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {isCompleted && onExport ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 font-bold text-xs gap-1.5 h-10 rounded-xl border-stone-300 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
                          onClick={() => onResume(session.id)}
                        >
                          <Download className="h-3.5 w-3.5" /> Export to Google Contacts
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 font-bold text-xs gap-1.5 h-10 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 shadow-sm"
                          onClick={() => onResume(session.id)}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" /> Resume Session
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0 rounded-xl border-stone-200 dark:border-stone-800 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                        onClick={() => setConfirmDeleteId(session.id)}
                        title="Delete session"
                        aria-label="Delete session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
