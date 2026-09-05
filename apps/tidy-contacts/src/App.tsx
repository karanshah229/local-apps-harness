import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Cloud,
  Download,
  Edit3,
  FileCheck2,
  FileText,
  Heart,
  Home,
  LockKeyhole,
  Mail,
  Merge,
  Moon,
  Phone,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
  UserCheck,
  Users,
  UsersRound,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Progress } from "./components/ui/progress";
import { MergeEditDialog } from "./components/MergeEditDialog";
import { SelectKeepDialog } from "./components/SelectKeepDialog";
import { ResumeSessionDialog } from "./components/ResumeSessionDialog";
import { EditableQualityCard } from "./components/EditableQualityCard";
import { MatchReasonBadge, QualityIssueBadge, QUALITY_LABELS } from "./components/Badges";
import { RecentSessionsList } from "./components/RecentSessionsList";
import { logEvent } from "./lib/logger";
import {
  clearActiveSessionId,
  deleteSession,
  getSession,
  listSessionSummaries,
  saveSession,
  setActiveSessionId,
  type CleanupSession,
  type CleanupSessionSummary,
  type HistoryEntry,
} from "./lib/storage";
import {
  analyzeContacts,
  applyDecisions,
  canSafelyRepair,
  getQualityChoice,
  getSafeFixLabel,
  parseVcf,
  safelyRepairContact,
  serializeVcf,
  summarizeContact,
  type ContactCard,
  type DuplicateDecision,
  type QualityCode,
  type QualityDecision,
} from "./lib/vcard";
import { cn } from "./lib/utils";

type ReviewMode = "duplicates" | "quality";

const ORDINAL_NAMES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

function StatCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "warning" }) {
  return (
    <div className={cn(
      "rounded-xl border bg-card px-4 py-3",
      tone === "success" && "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/40",
      tone === "warning" && "border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/40",
    )}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
  return <span aria-hidden="true">{initials}</span>;
}

function ContactPanel({ card, side, qualityCodes = [] }: { card: ContactCard; side?: "left" | "right"; qualityCodes?: QualityCode[] }) {
  const contact = summarizeContact(card);
  return (
    <Card className="min-w-0 overflow-hidden border-stone-200 dark:border-stone-800 shadow-none bg-card">
      <div className={cn("h-1.5", side === "right" ? "bg-amber-500" : "bg-primary")} />
      <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl bg-secondary text-base sm:text-lg font-bold text-secondary-foreground">
            {contact.photoDataUrl ? (
              <img src={contact.photoDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Initials name={contact.name} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {side && (
              <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="sm:hidden">{side === "left" ? "1st contact (top)" : "2nd contact (bottom)"}</span>
                <span className="hidden sm:inline">{side} contact</span>
              </p>
            )}
            <CardTitle className="break-words text-xl sm:text-2xl">{contact.name || "Unnamed contact"}</CardTitle>
            {(contact.organization || contact.title) && (
              <p className="mt-0.5 break-words text-xs sm:text-sm text-muted-foreground">
                {[contact.title, contact.organization].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
        {qualityCodes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 sm:pt-3">
            {qualityCodes.map((code) => <QualityIssueBadge key={code} code={code} className="text-xs" />)}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
        <ContactSection icon={Phone} label="Phone numbers" empty="No phone number" items={contact.phones} />
        <ContactSection icon={Mail} label="Email addresses" empty="No email address" items={contact.emails} />
      </CardContent>
    </Card>
  );
}

function ContactSection({
  icon: Icon,
  label,
  empty,
  items,
}: {
  icon: typeof Phone;
  label: string;
  empty: string;
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      {items.length ? (
        <div className="space-y-1.5">
          {items.map((item, index) => (
            <div key={`${item.value}-${index}`} className="flex min-w-0 items-center justify-between gap-2.5 rounded-lg bg-stone-50 dark:bg-stone-900/60 px-3 py-2 text-sm">
              <span className="min-w-0 break-all font-medium text-xs sm:text-sm">{item.value}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-stone-200 dark:border-stone-800 px-3 py-1.5 text-xs text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function ImportView({
  onImport,
  sessions,
  onResumeSession,
  onExportSession,
  onDeleteSession,
}: {
  onImport: (file: File) => Promise<void>;
  sessions: CleanupSessionSummary[];
  onResumeSession: (sessionId: string) => void;
  onExportSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [matchingSessions, setMatchingSessions] = useState<CleanupSessionSummary[]>([]);

  const executeImport = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      await onImport(file);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This contact file could not be read.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".vcf")) {
      setError("Choose a .vcf contact export.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError("This file is larger than the 30 MB safety limit.");
      return;
    }

    // Check if an existing session already exists for this same file
    const existing = sessions.filter(
      (s) => s.sourceName.trim().toLowerCase() === file.name.trim().toLowerCase()
    );

    if (existing.length > 0) {
      setPendingFile(file);
      setMatchingSessions(existing);
      return;
    }

    await executeImport(file);
  };

  return (
    <main className="container max-w-6xl py-6 sm:py-10 space-y-10 min-w-0">
      {/* Centered Hero Header */}
      <section className="text-center max-w-3xl mx-auto space-y-4 pt-2">
        <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Clean your contacts,<br />
          <span className="text-emerald-400">one easy choice at a time.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
          Review duplicates and damaged details as simple cards, then export a <span className="font-semibold text-foreground">clean address book</span> ready for Google Contacts.
        </p>

        {/* 4 Feature Badges Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-left">
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#0c1814]/70 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">100% private</p>
              <p className="text-[11px] text-muted-foreground truncate">All processing on your device</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#0c1814]/70 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Fast & simple</p>
              <p className="text-[11px] text-muted-foreground truncate">Clean in minutes</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#0c1814]/70 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Smart matching</p>
              <p className="text-[11px] text-muted-foreground truncate">Detects duplicates accurately</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#0c1814]/70 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cloud className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Google Contacts ready</p>
              <p className="text-[11px] text-muted-foreground truncate">Export with one click</p>
            </div>
          </div>
        </div>
      </section>

      {/* "Start New Cleanup" Outer Container Card */}
      <Card className="rounded-3xl border border-stone-200/90 dark:border-stone-800/80 bg-card/95 shadow-sm overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Card Top Title */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">Start New Cleanup</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Choose your VCF file and let Tidy Contacts find and remove duplicates.
              </p>
            </div>
          </div>

          {/* Inner Dropzone Area */}
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer",
              dragging
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-stone-200 dark:border-stone-800/80 bg-stone-50/60 dark:bg-[#060e0c]/90 hover:border-emerald-400/50"
            )}
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              inputRef.current?.click();
            }}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleFile(e.dataTransfer.files[0]);
            }}
          >
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-stone-950 shadow-sm">
              {loading ? (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-stone-950/30 border-t-stone-950" />
              ) : (
                <UploadCloud className="h-6 w-6" />
              )}
            </div>
            <p className="font-display text-base sm:text-lg font-bold text-foreground">
              {loading ? "Analysing contacts…" : "Choose your VCF file"}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Drop your VCF here or click to browse
            </p>
            <Button
              type="button"
              className="mt-4 font-bold text-xs h-10 px-7 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 shadow-sm"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                if (inputRef.current) inputRef.current.value = "";
                inputRef.current?.click();
              }}
            >
              Select File
            </Button>
            <span className="mt-3 text-[11px] text-muted-foreground">
              .vcf · up to 30 MB
            </span>
          </div>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".vcf,text/vcard,text/x-vcard"
            onChange={(event) => void handleFile(event.target.files?.[0])}
            data-testid="vcf-file-input"
          />

          {/* Bottom 3 Capability Row inside card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="flex items-center gap-3 rounded-2xl border border-stone-200/60 dark:border-stone-800/60 bg-stone-50/40 dark:bg-[#0a1411]/60 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">VCF format</p>
                <p className="text-[11px] text-muted-foreground truncate">Supports standard .vcf files</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-stone-200/60 dark:border-stone-800/60 bg-stone-50/40 dark:bg-[#0a1411]/60 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Stays on your device</p>
                <p className="text-[11px] text-muted-foreground truncate">Your data never leaves your browser</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-stone-200/60 dark:border-stone-800/60 bg-stone-50/40 dark:bg-[#0a1411]/60 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Ready for Google Contacts</p>
                <p className="text-[11px] text-muted-foreground truncate">Export a clean address book</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300" role="alert">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Cleanup Sessions Section */}
      <RecentSessionsList
        sessions={sessions}
        onResume={onResumeSession}
        onExport={onExportSession}
        onDelete={onDeleteSession}
      />

      {/* Resume Session Dialog when file matches existing session */}
      <ResumeSessionDialog
        isOpen={matchingSessions.length > 0 && !!pendingFile}
        fileName={pendingFile?.name || ""}
        sessions={matchingSessions}
        onResume={(sessionId) => {
          setPendingFile(null);
          setMatchingSessions([]);
          if (inputRef.current) inputRef.current.value = "";
          onResumeSession(sessionId);
        }}
        onStartNew={async () => {
          const file = pendingFile;
          setPendingFile(null);
          setMatchingSessions([]);
          if (inputRef.current) inputRef.current.value = "";
          if (file) {
            await executeImport(file);
          }
        }}
        onClose={() => {
          setPendingFile(null);
          setMatchingSessions([]);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </main>
  );
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("tidy-contacts-theme");
        if (saved === "dark" || saved === "light") return saved;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      } catch {
        return "light";
      }
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", theme === "dark" ? "#151b17" : "#f5f3ed");
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem("tidy-contacts-theme");
        if (!saved) {
          setTheme(event.matches ? "dark" : "light");
        }
      } catch {}
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((curr) => {
      const next = curr === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("tidy-contacts-theme", next);
      } catch {}
      return next;
    });
  };

  const [baseCards, setBaseCards] = useState<ContactCard[]>([]);
  const [sourceName, setSourceName] = useState("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<number>(0);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessionsList, setSessionsList] = useState<CleanupSessionSummary[]>([]);
  const [isRestoring, setIsRestoring] = useState<boolean>(true);

  const [duplicateDecisions, setDuplicateDecisions] = useState<Record<string, DuplicateDecision>>({});
  const [qualityDecisions, setQualityDecisions] = useState<Record<string, QualityDecision>>({});
  const [duplicateIndex, setDuplicateIndex] = useState(0);
  const [qualityIndex, setQualityIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mode, setMode] = useState<ReviewMode>("duplicates");
  const [notice, setNotice] = useState("");
  const [isMergeEditOpen, setIsMergeEditOpen] = useState(false);
  const [isSelectKeepOpen, setIsSelectKeepOpen] = useState(false);
  const [activeLeftIndex, setActiveLeftIndex] = useState(0);
  const [activeRightIndex, setActiveRightIndex] = useState(1);
  const [isGroupExpanded, setIsGroupExpanded] = useState(false);

  const refreshSessionsList = async () => {
    try {
      const list = await listSessionSummaries();
      setSessionsList(list);
    } catch (e) {
      console.warn("Failed to load sessions list", e);
    }
  };

  // On mount: refresh sessions list for landing page view
  useEffect(() => {
    let isMounted = true;
    async function init() {
      await refreshSessionsList();
      if (isMounted) setIsRestoring(false);
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Reset indices on duplicateIndex change
  useEffect(() => {
    setActiveLeftIndex(0);
    setActiveRightIndex(1);
    setIsGroupExpanded(false);
  }, [duplicateIndex]);

  const analysis = useMemo(() => baseCards.length ? analyzeContacts(baseCards) : null, [baseCards]);
  const baseCardMap = useMemo(() => new Map(baseCards.map((card) => [card.id, card])), [baseCards]);
  const duplicateGroups = useMemo(() => analysis?.duplicateGroups ?? [], [analysis]);
  const qualityIssues = useMemo(() => analysis?.qualityIssues ?? [], [analysis]);

  const effectiveCards = useMemo(
    () => (baseCards.length ? applyDecisions(baseCards, duplicateGroups, duplicateDecisions, qualityDecisions) : []),
    [baseCards, duplicateGroups, duplicateDecisions, qualityDecisions]
  );

  const totalDuplicateIssues = duplicateGroups.length;
  const totalQualityIssues = qualityIssues.length;
  const totalIssues = totalDuplicateIssues + totalQualityIssues;

  const resolvedDuplicateCount = duplicateGroups.filter((g) => duplicateDecisions[g.id] !== undefined).length;
  const resolvedQualityCount = qualityIssues.filter((q) => qualityDecisions[q.cardId] !== undefined).length;
  const totalResolved = resolvedDuplicateCount + resolvedQualityCount;
  const pending = totalIssues - totalResolved;
  const progress = totalIssues ? (totalResolved / totalIssues) * 100 : 100;

  // Auto-save active session state
  useEffect(() => {
    if (!currentSessionId || !baseCards.length || isRestoring) return;

    const timeout = window.setTimeout(() => {
      const sessionPayload: CleanupSession = {
        id: currentSessionId,
        sourceName,
        fileSize,
        createdAt: sessionCreatedAt || Date.now(),
        updatedAt: Date.now(),
        baseCards,
        duplicateDecisions,
        qualityDecisions,
        duplicateIndex,
        qualityIndex,
        history,
        mode,
        totalContacts: baseCards.length,
        totalIssues,
        resolvedIssues: totalResolved,
        effectiveCount: effectiveCards.length,
      };

      saveSession(sessionPayload).catch((err) => {
        console.warn("Auto-save session failed", err);
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [
    currentSessionId,
    baseCards,
    sourceName,
    fileSize,
    sessionCreatedAt,
    duplicateDecisions,
    qualityDecisions,
    duplicateIndex,
    qualityIndex,
    history,
    mode,
    totalIssues,
    totalResolved,
    effectiveCards.length,
    isRestoring,
  ]);

  const currentDuplicate = duplicateGroups[duplicateIndex];
  const currentQuality = qualityIssues[qualityIndex];

  const currentDuplicateDecision = currentDuplicate ? duplicateDecisions[currentDuplicate.id] : undefined;
  const currentQualityDecision = currentQuality ? qualityDecisions[currentQuality.cardId] : undefined;
  const currentQualityChoice = getQualityChoice(currentQualityDecision);

  const groupCards = useMemo(() => {
    if (!currentDuplicate) return [];
    return currentDuplicate.cardIds.map((id) => baseCardMap.get(id)).filter(Boolean) as ContactCard[];
  }, [currentDuplicate, baseCardMap]);

  const leftCard = groupCards[activeLeftIndex] ?? groupCards[0];
  const rightCard = groupCards[activeRightIndex] ?? groupCards[1] ?? groupCards[0];
  const qualityCard = currentQuality ? baseCardMap.get(currentQuality.cardId) : undefined;
  const safeFixLabel = qualityCard ? getSafeFixLabel(qualityCard) : undefined;

  const otherGroupCards = useMemo(() => {
    return groupCards
      .map((card, idx) => ({ card, idx }))
      .filter(({ idx }) => idx !== activeLeftIndex && idx !== activeRightIndex);
  }, [groupCards, activeLeftIndex, activeRightIndex]);

  useEffect(() => {
    if (!baseCards.length) return;
    if (mode === "duplicates" && !duplicateGroups.length && qualityIssues.length) {
      setMode("quality");
    }
  }, [baseCards.length, duplicateGroups.length, mode, qualityIssues.length]);

  const importFile = async (file: File) => {
    const started = performance.now();
    logEvent("vcf.import", "started", { fileBytes: file.size, fileType: "vcf" });
    try {
      const source = await file.text();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const parsed = parseVcf(source);
      const found = analyzeContacts(parsed);
      const issueCount = found.duplicateGroups.length + found.qualityIssues.length;
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = Date.now();

      setBaseCards(parsed);
      setSourceName(file.name);
      setFileSize(file.size);
      setSessionCreatedAt(now);
      setCurrentSessionId(newSessionId);
      setDuplicateDecisions({});
      setQualityDecisions({});
      setDuplicateIndex(0);
      setQualityIndex(0);
      setHistory([]);
      setMode(found.duplicateGroups.length ? "duplicates" : "quality");
      setNotice("");

      setActiveSessionId(newSessionId);

      const initialSession: CleanupSession = {
        id: newSessionId,
        sourceName: file.name,
        fileSize: file.size,
        createdAt: now,
        updatedAt: now,
        baseCards: parsed,
        duplicateDecisions: {},
        qualityDecisions: {},
        duplicateIndex: 0,
        qualityIndex: 0,
        history: [],
        mode: found.duplicateGroups.length ? "duplicates" : "quality",
        totalContacts: parsed.length,
        totalIssues: issueCount,
        resolvedIssues: 0,
        effectiveCount: parsed.length,
      };
      await saveSession(initialSession);
      await refreshSessionsList();

      logEvent("vcf.import", "succeeded", {
        contactCount: parsed.length,
        issueCount,
        duplicateCount: found.duplicateGroups.length,
        qualityCount: found.qualityIssues.length,
        durationMs: Math.round(performance.now() - started),
        fileBytes: file.size,
        fileType: "vcf",
      });
    } catch (error) {
      logEvent("vcf.import", "failed", {
        errorType: error instanceof Error ? error.name : "ImportError",
        durationMs: Math.round(performance.now() - started),
        fileBytes: file.size,
        fileType: "vcf",
      });
      throw error;
    }
  };

  const handleResumeSession = async (sessionId: string) => {
    const session = await getSession(sessionId);
    if (!session || !session.baseCards.length) return;

    setBaseCards(session.baseCards);
    setSourceName(session.sourceName);
    setFileSize(session.fileSize || 0);
    setSessionCreatedAt(session.createdAt || Date.now());
    setDuplicateDecisions(session.duplicateDecisions || {});
    setQualityDecisions(session.qualityDecisions || {});
    setDuplicateIndex(session.duplicateIndex || 0);
    setQualityIndex(session.qualityIndex || 0);
    setHistory(session.history || []);
    setMode(session.mode || "duplicates");
    setCurrentSessionId(session.id);
    setActiveSessionId(session.id);
    setNotice("");
  };

  const handleExportSession = async (sessionId: string) => {
    const session = await getSession(sessionId);
    if (!session || !session.baseCards.length) return;

    const analysis = analyzeContacts(session.baseCards);
    const cleaned = applyDecisions(
      session.baseCards,
      analysis.duplicateGroups,
      session.duplicateDecisions || {},
      session.qualityDecisions || {}
    );
    const blob = new Blob([serializeVcf(cleaned)], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stem = session.sourceName.replace(/\.vcf$/i, "") || "contacts";
    anchor.href = url;
    anchor.download = `${stem}-cleaned.vcf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    if (currentSessionId === sessionId) {
      clearActiveSessionId();
      setBaseCards([]);
      setSourceName("");
      setFileSize(0);
      setCurrentSessionId("");
      setDuplicateDecisions({});
      setQualityDecisions({});
      setDuplicateIndex(0);
      setQualityIndex(0);
      setHistory([]);
      setNotice("");
    }
    await refreshSessionsList();
  };

  const decideDuplicate = (
    choice: "left" | "merge" | "right",
    preferred?: ContactCard,
    customCard?: ContactCard
  ) => {
    if (!currentDuplicate) return;

    const previousDecision = duplicateDecisions[currentDuplicate.id];
    const newDecision: DuplicateDecision = {
      choice,
      preferredCardId: (preferred ?? leftCard)?.id,
      customCard,
    };

    setHistory((curr) => [
      ...curr,
      {
        type: "duplicate",
        id: currentDuplicate.id,
        previousDuplicate: previousDecision,
        targetIndex: duplicateIndex,
        mode,
        notice,
      },
    ]);

    setDuplicateDecisions((curr) => ({
      ...curr,
      [currentDuplicate.id]: newDecision,
    }));

    const labels = {
      left: "Kept the left contact",
      merge: customCard
        ? "Saved customized merged contact"
        : "Merged contacts (kept left identity)",
      right: "Kept the right contact",
    };
    setNotice(`${labels[choice]}.`);
    logEvent("review.decision", "succeeded", {
      decision: choice,
      isCustom: Boolean(customCard),
      index: duplicateIndex,
    });

    // Automatically advance to the next duplicate issue if available
    if (duplicateIndex < duplicateGroups.length - 1) {
      setDuplicateIndex((prev) => prev + 1);
    }
  };

  const clearDuplicateSelection = () => {
    if (!currentDuplicate) return;
    const previousDecision = duplicateDecisions[currentDuplicate.id];
    setHistory((curr) => [
      ...curr,
      {
        type: "duplicate",
        id: currentDuplicate.id,
        previousDuplicate: previousDecision,
        targetIndex: duplicateIndex,
        mode,
        notice,
      },
    ]);
    setDuplicateDecisions((curr) => {
      const next = { ...curr };
      delete next[currentDuplicate.id];
      return next;
    });
    setNotice("Cleared selection for this pair (kept unresolved).");
  };

  const decideQuality = (choice: "keep" | "fix" | "remove") => {
    if (!currentQuality || !qualityCard) return;

    if (choice === "fix" && !canSafelyRepair(qualityCard)) {
      return;
    }

    const previousDecision = qualityDecisions[currentQuality.cardId];
    setHistory((curr) => [
      ...curr,
      {
        type: "quality",
        id: currentQuality.cardId,
        previousQuality: previousDecision,
        targetIndex: qualityIndex,
        mode,
        notice,
      },
    ]);

    setQualityDecisions((curr) => ({
      ...curr,
      [currentQuality.cardId]: choice,
    }));

    const labels = {
      keep: "Kept this contact as it is",
      fix: "Applied safe repair",
      remove: "Removed contact from clean export",
    };
    setNotice(`${labels[choice]}.`);
    logEvent("review.decision", "succeeded", { decision: choice, index: qualityIndex });

    // Automatically advance to the next quality issue if available
    if (qualityIndex < qualityIssues.length - 1) {
      setQualityIndex((prev) => prev + 1);
    }
  };

  const handleQualityCardEdit = (updatedCard: ContactCard) => {
    if (!currentQuality) return;
    setQualityDecisions((curr) => {
      const existing = curr[currentQuality.cardId];
      if (!existing || (typeof existing === "object" && existing.choice !== "edit") || typeof existing === "string") {
        setHistory((hist) => [
          ...hist,
          {
            type: "quality",
            id: currentQuality.cardId,
            previousQuality: existing,
            targetIndex: qualityIndex,
            mode,
            notice,
          },
        ]);
      }
      return {
        ...curr,
        [currentQuality.cardId]: { choice: "edit", customCard: updatedCard },
      };
    });
    setNotice("Saved contact field edits.");
    logEvent("review.decision", "succeeded", { decision: "edit", index: qualityIndex });
  };

  const clearQualitySelection = () => {
    if (!currentQuality) return;
    const previousDecision = qualityDecisions[currentQuality.cardId];
    setHistory((curr) => [
      ...curr,
      {
        type: "quality",
        id: currentQuality.cardId,
        previousQuality: previousDecision,
        targetIndex: qualityIndex,
        mode,
        notice,
      },
    ]);
    setQualityDecisions((curr) => {
      const next = { ...curr };
      delete next[currentQuality.cardId];
      return next;
    });
    setNotice("Cleared selection for this issue (kept unresolved).");
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;

    if (previous.type === "duplicate") {
      setDuplicateDecisions((curr) => {
        const next = { ...curr };
        if (previous.previousDuplicate) {
          next[previous.id] = previous.previousDuplicate;
        } else {
          delete next[previous.id];
        }
        return next;
      });
      setDuplicateIndex(previous.targetIndex);
    } else {
      setQualityDecisions((curr) => {
        const next = { ...curr };
        if (previous.previousQuality) {
          next[previous.id] = previous.previousQuality;
        } else {
          delete next[previous.id];
        }
        return next;
      });
      setQualityIndex(previous.targetIndex);
    }

    setMode(previous.mode);
    setNotice("Last choice undone.");
    setHistory((current) => current.slice(0, -1));
    logEvent("review.undo", "succeeded", {});
  };

  const exportFile = () => {
    const blob = new Blob([serializeVcf(effectiveCards)], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stem = sourceName.replace(/\.vcf$/i, "") || "contacts";
    anchor.href = url;
    anchor.download = `${stem}-cleaned.vcf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice("Clean VCF downloaded. Your original file is unchanged.");
    logEvent("vcf.export", "succeeded", { contactCount: effectiveCards.length, issueCount: pending });
  };

  const reset = async () => {
    clearActiveSessionId();
    setBaseCards([]);
    setSourceName("");
    setFileSize(0);
    setCurrentSessionId("");
    setDuplicateDecisions({});
    setQualityDecisions({});
    setDuplicateIndex(0);
    setQualityIndex(0);
    setHistory([]);
    setNotice("");
    await refreshSessionsList();
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-background text-foreground flex flex-col justify-between">
      <header className="sticky top-0 z-30 w-full max-w-full border-b border-stone-200/80 dark:border-stone-800/80 bg-background/95 backdrop-blur-md">
        <div className="container flex h-14 sm:h-[74px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
            <button
              type="button"
              onClick={baseCards.length ? reset : undefined}
              className={cn(
                "flex items-center gap-2.5 sm:gap-3 text-left transition-opacity",
                baseCards.length ? "cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg" : "cursor-default"
              )}
              title={baseCards.length ? "Return to upload & sessions list" : undefined}
              aria-label="Tidy Contacts home"
            >
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-400 text-stone-950">
                <UsersRound className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-base sm:text-lg font-extrabold leading-tight tracking-tight">Tidy Contacts</p>
                <p className="hidden xs:block text-[11px] sm:text-xs text-muted-foreground">Private contact cleaner</p>
              </div>
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Badge variant="outline" className="hidden gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 md:flex rounded-full px-3 py-1 text-xs font-semibold">
                <LockKeyhole className="h-3.5 w-3.5" /> On-device only
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="h-8 w-8 px-0 sm:h-9 sm:w-9 rounded-xl border-stone-300 dark:border-stone-800 text-muted-foreground hover:text-foreground"
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-stone-700 dark:text-stone-300" />}
              </Button>
            </div>
          </div>
        </header>

      {!baseCards.length ? (
        <ImportView
          onImport={importFile}
          sessions={sessionsList}
          onResumeSession={handleResumeSession}
          onExportSession={handleExportSession}
          onDeleteSession={handleDeleteSession}
        />
      ) : (
        <main className="container max-w-7xl px-4 sm:px-8 py-4 sm:py-8 pb-44 sm:pb-8 min-w-0 overflow-x-clip">
          {/* Mobile compact summary strip */}
          <section aria-label="Cleanup summary" className="sm:hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-card p-3 space-y-2.5">
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="rounded-lg bg-stone-50 dark:bg-stone-900/60 py-1.5 px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="font-display text-base font-extrabold tabular-nums text-foreground">{baseCards.length}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/40 py-1.5 px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Done</p>
                <p className="font-display text-base font-extrabold text-emerald-950 dark:text-emerald-100 tabular-nums">{totalResolved}</p>
              </div>
              <div className={cn(
                "rounded-lg py-1.5 px-1 border",
                pending
                  ? "border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/40"
                  : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/40"
              )}>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  pending ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"
                )}>Pending</p>
                <p className={cn(
                  "font-display text-base font-extrabold tabular-nums",
                  pending ? "text-amber-950 dark:text-amber-100" : "text-emerald-950 dark:text-emerald-100"
                )}>{pending}</p>
              </div>
              <div className="rounded-lg bg-stone-50 dark:bg-stone-900/60 py-1.5 px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Export</p>
                <p className="font-display text-base font-extrabold tabular-nums text-foreground">{effectiveCards.length}</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Cleanup progress</span>
                <span className="font-bold tabular-nums text-primary">{Math.round(progress)}% ({totalResolved}/{totalIssues})</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </section>

          {/* Tablet/Desktop Stat Cards */}
          <section aria-label="Cleanup summary" className="hidden sm:grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="All contacts" value={baseCards.length} />
            <StatCard label="Decisions made" value={totalResolved} tone="success" />
            <StatCard label="Pending review" value={pending} tone={pending ? "warning" : "success"} />
            <StatCard label="Contacts in export" value={effectiveCards.length} />
          </section>

          {/* Tablet/Desktop Progress */}
          <section className="hidden sm:block mt-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-card px-4 py-4 sm:px-5" aria-label="Review progress">
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold">Cleanup progress</span>
              <span className="font-bold tabular-nums text-primary">
                {Math.round(progress)}% ({totalResolved.toLocaleString()}/{totalIssues.toLocaleString()})
              </span>
            </div>
            <Progress value={progress} />
          </section>

          <div className="mt-4 sm:mt-6 grid items-start gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0">
              <div className="mb-3.5 sm:mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">
                    {pending ? "Review issues" : "All issues reviewed"}
                  </h1>
                </div>
                <div className="flex rounded-lg border border-stone-200 dark:border-stone-800 bg-card p-1 self-stretch sm:self-auto" role="tablist" aria-label="Issue type">
                  <button
                    role="tab"
                    aria-selected={mode === "duplicates"}
                    className={cn(
                      "flex-1 sm:flex-initial rounded-md px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-colors text-center",
                      mode === "duplicates" ? "bg-secondary text-secondary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setMode("duplicates")}
                    disabled={!duplicateGroups.length}
                  >
                    Duplicates <span className="ml-1 tabular-nums font-mono text-[11px] sm:text-xs">{resolvedDuplicateCount}/{totalDuplicateIssues}</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={mode === "quality"}
                    className={cn(
                      "flex-1 sm:flex-initial rounded-md px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-colors text-center",
                      mode === "quality" ? "bg-secondary text-secondary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setMode("quality")}
                    disabled={!qualityIssues.length}
                  >
                    Other issues <span className="ml-1 tabular-nums font-mono text-[11px] sm:text-xs">{resolvedQualityCount}/{totalQualityIssues}</span>
                  </button>
                </div>
              </div>

              {pending === 0 && (
                <div className="mb-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/60 p-3.5 sm:p-4 text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <FileCheck2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">All issues reviewed!</p>
                      <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">{effectiveCards.length} clean contacts ready for Google Contacts</p>
                    </div>
                  </div>
                  <Button size="sm" className="w-full sm:w-auto font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm" onClick={exportFile}>
                    <Download className="h-4 w-4 mr-1.5" /> Download cleaned VCF
                  </Button>
                </div>
              )}

              {mode === "duplicates" && duplicateGroups.length > 0 && currentDuplicate && leftCard && rightCard ? (
                <div>
                  {/* Top Navigation & Status Bar */}
                  <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 p-2.5 sm:p-3">
                    <div className="flex flex-1 flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                      {currentDuplicate.reasons.map((reason) => (
                        <MatchReasonBadge key={reason} reason={reason} className="text-[11px] sm:text-xs" />
                      ))}
                      {currentDuplicate.cardIds.length > 2 && (
                        <Badge variant="outline" className="border-indigo-300/80 bg-indigo-50/90 text-indigo-900 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-200 text-[11px] sm:text-xs font-semibold">
                          <UsersRound className="mr-1 h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          {currentDuplicate.cardIds.length} in group
                        </Badge>
                      )}
                      {currentDuplicateDecision ? (
                        <Badge className="border-emerald-300/80 bg-emerald-100/90 text-emerald-900 dark:border-emerald-700/80 dark:bg-emerald-950/80 dark:text-emerald-200 text-[11px] sm:text-xs font-semibold">
                          <Check className="mr-1 h-3 w-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                          <span className="sm:hidden">
                            {currentDuplicateDecision.choice === "left" && (groupCards.length > 2 ? "Chosen: Kept 1" : "Chosen: 1st (Top)")}
                            {currentDuplicateDecision.choice === "merge" && (
                              currentDuplicateDecision.customCard
                                ? "Chosen: Merge & Edit"
                                : "Chosen: Merged"
                            )}
                            {currentDuplicateDecision.choice === "right" && "Chosen: 2nd (Bottom)"}
                          </span>
                          <span className="hidden sm:inline">
                            {currentDuplicateDecision.choice === "left" && (groupCards.length > 2 ? "Selected: Kept 1 contact" : "Selected: Keep left")}
                            {currentDuplicateDecision.choice === "merge" && (
                              currentDuplicateDecision.customCard
                                ? "Selected: Merge & Edit"
                                : groupCards.length > 2
                                ? `Selected: Merged ${groupCards.length}`
                                : "Selected: Merged"
                            )}
                            {currentDuplicateDecision.choice === "right" && "Selected: Keep right"}
                          </span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-stone-300/80 dark:border-stone-700 bg-stone-100/90 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 text-[11px] sm:text-xs font-medium">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-400 dark:bg-stone-500 mr-1.5" />
                          Unresolved
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
                        onClick={() => setDuplicateIndex((prev) => Math.max(0, prev - 1))}
                        disabled={duplicateIndex === 0}
                        aria-label="Previous duplicate pair"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 sm:mr-0.5" /> <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
                        onClick={() => setDuplicateIndex((prev) => Math.min(duplicateGroups.length - 1, prev + 1))}
                        disabled={duplicateIndex >= duplicateGroups.length - 1}
                        aria-label="Next duplicate pair"
                      >
                        <span className="hidden sm:inline">Next</span> <ChevronRight className="h-3.5 w-3.5 sm:ml-0.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Contact Cards (side-by-side on desktop, stacked on mobile) */}
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    <ContactPanel card={leftCard} side="left" />
                    <ContactPanel card={rightCard} side="right" />
                  </div>

                  {/* Other contacts in multi-contact group (N > 2) */}
                  {otherGroupCards.length > 0 && (
                    <div className="mt-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-stone-500" />
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                            Other contacts in this matching group ({otherGroupCards.length} more)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => setIsGroupExpanded((prev) => !prev)}
                        >
                          {isGroupExpanded ? "Hide" : "Show & compare"}
                          {isGroupExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 ml-1" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 ml-1" />
                          )}
                        </Button>
                      </div>

                      {isGroupExpanded && (
                        <div className="mt-3 space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                          {otherGroupCards.map(({ card, idx }) => {
                            const summary = summarizeContact(card);
                            return (
                              <div
                                key={card.id}
                                className="flex items-center justify-between gap-2.5 rounded-lg border border-stone-200/80 dark:border-stone-800 bg-card p-2.5 shadow-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300">
                                    {idx + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold truncate text-stone-900 dark:text-stone-100">
                                      {summary.name || "Unnamed contact"}
                                    </p>
                                    <div className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                                      {summary.phones[0] && <span>📞 {summary.phones[0].value}</span>}
                                      {summary.emails[0] && <span>✉️ {summary.emails[0].value}</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Desktop Inline Actions (hidden on mobile, rendered in sticky dock instead) */}
                  {groupCards.length > 2 ? (
                    <div className="hidden sm:grid mt-4 grid-cols-3 gap-2 sm:gap-3">
                      <Button
                        variant={currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard ? "default" : "outline"}
                        className={cn(
                          "h-auto min-h-14 flex-col px-3 py-2 sm:flex-row gap-2 transition-all",
                          currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard && "ring-2 ring-primary ring-offset-2 font-bold shadow-sm",
                        )}
                        onClick={() => decideDuplicate("merge", leftCard)}
                        aria-label={`Merge all ${groupCards.length} contacts`}
                      >
                        <Merge className="h-4 w-4 shrink-0" />
                        <span className="font-bold">Merge {groupCards.length}</span>
                        {currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard && (
                          <Check className="h-4 w-4 ml-1 text-emerald-200 shrink-0" />
                        )}
                      </Button>

                      <Button
                        variant={currentDuplicateDecision?.customCard ? "default" : "outline"}
                        className={cn(
                          "h-auto min-h-14 flex-col px-3 py-2 sm:flex-row gap-2 transition-all",
                          currentDuplicateDecision?.customCard && "ring-2 ring-primary ring-offset-2 font-bold shadow-sm",
                        )}
                        onClick={() => setIsMergeEditOpen(true)}
                        aria-label={`Merge ${groupCards.length} and edit`}
                      >
                        <Edit3 className="h-4 w-4 shrink-0" />
                        <span className="font-bold">Merge {groupCards.length} & Edit</span>
                        {currentDuplicateDecision?.customCard && (
                          <Check className="h-4 w-4 ml-1 text-emerald-200 shrink-0" />
                        )}
                      </Button>

                      <Button
                        variant={currentDuplicateDecision && (currentDuplicateDecision.choice === "left" || currentDuplicateDecision.choice === "right") ? "default" : "outline"}
                        className={cn(
                          "h-auto min-h-14 flex-col px-3 py-2 sm:flex-row gap-2 transition-all",
                          currentDuplicateDecision && (currentDuplicateDecision.choice === "left" || currentDuplicateDecision.choice === "right") && "ring-2 ring-primary ring-offset-2 font-bold shadow-sm",
                        )}
                        onClick={() => setIsSelectKeepOpen(true)}
                        aria-label="Select and keep one contact"
                      >
                        <UserCheck className="h-4 w-4 shrink-0" />
                        <span className="font-bold">Select & Keep</span>
                        {currentDuplicateDecision && (currentDuplicateDecision.choice === "left" || currentDuplicateDecision.choice === "right") && (
                          <Check className="h-4 w-4 ml-1 text-emerald-200 shrink-0" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="hidden sm:grid mt-4 grid-cols-3 gap-2 sm:gap-3">
                      <Button
                        variant={currentDuplicateDecision?.choice === "left" ? "default" : "outline"}
                        className={cn(
                          "h-auto min-h-14 flex-col px-2 py-2 sm:flex-row transition-all",
                          currentDuplicateDecision?.choice === "left" && "ring-2 ring-primary ring-offset-2 font-bold shadow-sm",
                        )}
                        onClick={() => decideDuplicate("left", leftCard)}
                        aria-label="Keep left contact"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>{currentDuplicateDecision?.choice === "left" ? "Kept left" : "Keep left"}</span>
                        {currentDuplicateDecision?.choice === "left" && <Check className="h-4 w-4 ml-1 text-emerald-200" />}
                      </Button>

                      {/* Button Group for Merge & Merge & Edit (for pair) */}
                      <div className="flex rounded-md overflow-hidden border border-border bg-card shadow-xs">
                        <Button
                          variant={currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard ? "default" : "ghost"}
                          className={cn(
                            "h-auto min-h-14 flex-1 flex-col px-2 py-2 sm:flex-row gap-1.5 transition-all rounded-none border-r border-border",
                            currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard && "ring-2 ring-primary ring-offset-2 font-bold shadow-sm",
                          )}
                          onClick={() => decideDuplicate("merge", leftCard)}
                          aria-label="Merge contacts preserving left identity"
                        >
                          <Merge className="h-4 w-4 shrink-0" />
                          <span className="truncate font-bold">
                            {currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard ? "Merged" : "Merge"}
                          </span>
                          {currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard && (
                            <Check className="h-4 w-4 ml-1 text-emerald-200 shrink-0" />
                          )}
                        </Button>

                        <Button
                          variant={currentDuplicateDecision?.customCard ? "default" : "ghost"}
                          className={cn(
                            "h-auto min-h-14 flex-[1.15] flex-col px-2 py-2 sm:flex-row gap-1.5 transition-all rounded-none",
                            currentDuplicateDecision?.customCard && "ring-2 ring-primary ring-offset-2 font-bold shadow-sm",
                          )}
                          onClick={() => setIsMergeEditOpen(true)}
                          aria-label="Merge and edit contact"
                        >
                          <Edit3 className="h-4 w-4 shrink-0" />
                          <span className="truncate font-bold">
                            {currentDuplicateDecision?.customCard ? "Customized" : "Merge & Edit"}
                          </span>
                          {currentDuplicateDecision?.customCard && (
                            <Check className="h-4 w-4 ml-1 text-emerald-200 shrink-0" />
                          )}
                        </Button>
                      </div>

                      <Button
                        variant={currentDuplicateDecision?.choice === "right" ? "default" : "outline"}
                        className={cn(
                          "h-auto min-h-14 flex-col px-2 py-2 sm:flex-row transition-all",
                          currentDuplicateDecision?.choice === "right" && "ring-2 ring-primary ring-offset-2 font-bold shadow-sm",
                        )}
                        onClick={() => decideDuplicate("right", rightCard)}
                        aria-label="Keep right contact"
                      >
                        <span>{currentDuplicateDecision?.choice === "right" ? "Kept right" : "Keep right"}</span>
                        <ArrowRight className="h-4 w-4" />
                        {currentDuplicateDecision?.choice === "right" && <Check className="h-4 w-4 ml-1 text-emerald-200" />}
                      </Button>
                    </div>
                  )}

                  {/* Desktop Sub-action bar */}
                  {currentDuplicateDecision && (
                    <div className="hidden sm:flex mt-3 items-center justify-center text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={clearDuplicateSelection}
                        className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 underline underline-offset-2"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}

                  {/* Mobile Sticky Bottom Action Dock */}
                  <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 w-full max-w-full bg-card/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl box-border">
                    {groupCards.length > 2 ? (
                      <div className="grid grid-cols-3 gap-1.5 w-full max-w-full">
                        <Button
                          variant={currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-12 w-full min-w-0 flex-col px-1 py-1 text-xs transition-all overflow-hidden",
                            currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard && "ring-2 ring-primary ring-offset-1 font-bold",
                          )}
                          onClick={() => decideDuplicate("merge", leftCard)}
                          aria-label={`Merge ${groupCards.length}`}
                        >
                          <span className="font-bold flex items-center gap-1 text-xs truncate max-w-full">
                            <Merge className="h-3.5 w-3.5 shrink-0" /> Merge {groupCards.length}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-full">
                            {currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard ? "Merged" : "Combine all"}
                          </span>
                        </Button>

                        <Button
                          variant={currentDuplicateDecision?.customCard ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-12 w-full min-w-0 flex-col px-1 py-1 text-xs transition-all overflow-hidden",
                            currentDuplicateDecision?.customCard && "ring-2 ring-primary ring-offset-1 font-bold",
                          )}
                          onClick={() => setIsMergeEditOpen(true)}
                          aria-label={`Merge ${groupCards.length} & Edit`}
                        >
                          <span className="font-bold flex items-center gap-1 text-xs truncate max-w-full">
                            <Edit3 className="h-3.5 w-3.5 shrink-0" /> {groupCards.length} & Edit
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-full">
                            {currentDuplicateDecision?.customCard ? "Custom" : "Customize"}
                          </span>
                        </Button>

                        <Button
                          variant={currentDuplicateDecision && (currentDuplicateDecision.choice === "left" || currentDuplicateDecision.choice === "right") ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-12 w-full min-w-0 flex-col px-1 py-1 text-xs transition-all overflow-hidden",
                            currentDuplicateDecision && (currentDuplicateDecision.choice === "left" || currentDuplicateDecision.choice === "right") && "ring-2 ring-primary ring-offset-1 font-bold",
                          )}
                          onClick={() => setIsSelectKeepOpen(true)}
                          aria-label="Select & Keep"
                        >
                          <span className="font-bold flex items-center gap-1 text-xs truncate max-w-full">
                            <UserCheck className="h-3.5 w-3.5 shrink-0" /> Select & Keep
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-full">
                            {currentDuplicateDecision && (currentDuplicateDecision.choice === "left" || currentDuplicateDecision.choice === "right") ? "Kept 1" : "Keep 1 only"}
                          </span>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 w-full max-w-full">
                        <Button
                          variant={currentDuplicateDecision?.choice === "left" ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-12 w-full min-w-0 flex-col px-1 py-1 text-xs transition-all overflow-hidden",
                            currentDuplicateDecision?.choice === "left" && "ring-2 ring-primary ring-offset-1 font-bold",
                          )}
                          onClick={() => decideDuplicate("left", leftCard)}
                          aria-label="Keep top contact"
                        >
                          <span className="truncate max-w-full font-bold">Keep Top</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-full">
                            {leftCard.properties.find((p) => p.key === "FN")?.value || "1st contact"}
                          </span>
                        </Button>

                        {/* Mobile Button Group for Merge & Merge & Edit */}
                        <div className="flex w-full min-w-0 rounded-md overflow-hidden border border-border bg-card">
                          <Button
                            variant={currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard ? "default" : "ghost"}
                            size="sm"
                            className={cn(
                              "h-12 flex-1 min-w-0 flex-col px-0.5 py-1 text-xs transition-all rounded-none border-r border-border overflow-hidden",
                              currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard && "ring-2 ring-primary ring-offset-1 font-bold",
                            )}
                            onClick={() => decideDuplicate("merge", leftCard)}
                            aria-label="Merge contacts"
                          >
                            <span className="font-bold flex items-center gap-0.5 text-[11px] truncate max-w-full">
                              <Merge className="h-3 w-3 shrink-0" /> Merge
                            </span>
                            <span className="text-[9px] text-muted-foreground truncate max-w-full">
                              {currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard ? "Merged" : "Default"}
                            </span>
                          </Button>
                          <Button
                            variant={currentDuplicateDecision?.customCard ? "default" : "ghost"}
                            size="sm"
                            className={cn(
                              "h-12 w-9 shrink-0 px-0 flex-col justify-center text-xs transition-all rounded-none",
                              currentDuplicateDecision?.customCard && "ring-2 ring-primary ring-offset-1 font-bold",
                            )}
                            onClick={() => setIsMergeEditOpen(true)}
                            aria-label="Merge & Edit"
                            title="Merge & Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-[9px] font-semibold text-muted-foreground mt-0.5 truncate">
                              {currentDuplicateDecision?.customCard ? "Custom" : "Edit"}
                            </span>
                          </Button>
                        </div>

                        <Button
                          variant={currentDuplicateDecision?.choice === "right" ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-12 w-full min-w-0 flex-col px-1 py-1 text-xs transition-all overflow-hidden",
                            currentDuplicateDecision?.choice === "right" && "ring-2 ring-primary ring-offset-1 font-bold",
                          )}
                          onClick={() => decideDuplicate("right", rightCard)}
                          aria-label="Keep bottom contact"
                        >
                          <span className="truncate max-w-full font-bold">Keep Bottom</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-full">
                            {rightCard.properties.find((p) => p.key === "FN")?.value || "2nd contact"}
                          </span>
                        </Button>
                      </div>
                    )}

                    {currentDuplicateDecision && (
                      <div className="mt-2 flex items-center justify-center text-[11px] text-muted-foreground">
                        <button
                          type="button"
                          onClick={clearDuplicateSelection}
                          className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 underline underline-offset-2"
                        >
                          Clear selection
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : mode === "quality" && qualityIssues.length > 0 && currentQuality && qualityCard ? (
                <div>
                  {/* Top Navigation & Status Bar for Quality */}
                  <div className="mx-auto mb-3 sm:mb-4 flex max-w-2xl items-center justify-between gap-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 p-2.5 sm:p-3">
                    <div className="flex flex-1 flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                      {currentQuality.codes.map((code) => (
                        <QualityIssueBadge key={code} code={code} className="text-[11px] sm:text-xs" />
                      ))}
                      {currentQualityDecision ? (
                        <Badge className="border-emerald-300/80 bg-emerald-100/90 text-emerald-900 dark:border-emerald-700/80 dark:bg-emerald-950/80 dark:text-emerald-200 text-[11px] sm:text-xs font-semibold">
                          <Check className="mr-1 h-3 w-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                          {currentQualityChoice === "keep" && "Selected: Keep as-is"}
                          {currentQualityChoice === "fix" && "Selected: Safe fix"}
                          {currentQualityChoice === "edit" && "Selected: Edited"}
                          {currentQualityChoice === "remove" && "Selected: Remove"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-stone-300/80 dark:border-stone-700 bg-stone-100/90 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 text-[11px] sm:text-xs font-medium">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-400 dark:bg-stone-500 mr-1.5" />
                          Unresolved
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
                        onClick={() => setQualityIndex((prev) => Math.max(0, prev - 1))}
                        disabled={qualityIndex === 0}
                        aria-label="Previous issue"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 sm:mr-0.5" /> <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
                        onClick={() => setQualityIndex((prev) => Math.min(qualityIssues.length - 1, prev + 1))}
                        disabled={qualityIndex >= qualityIssues.length - 1}
                        aria-label="Next issue"
                      >
                        <span className="hidden sm:inline">Next</span> <ChevronRight className="h-3.5 w-3.5 sm:ml-0.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mx-auto max-w-2xl">
                    <EditableQualityCard
                      card={qualityCard}
                      qualityCodes={currentQuality.codes}
                      currentDecision={currentQualityDecision}
                      onChange={handleQualityCardEdit}
                    />
                  </div>

                  {/* Desktop Inline Actions */}
                  <div className={cn(
                    "hidden sm:grid mx-auto mt-4 max-w-2xl gap-2 sm:gap-3",
                    safeFixLabel ? "grid-cols-3" : "grid-cols-2"
                  )}>
                    <Button
                      variant={currentQualityChoice === "keep" ? "default" : "outline"}
                      className={cn(
                        "h-auto min-h-14 flex-col px-2 py-2 sm:flex-row transition-all",
                        currentQualityChoice === "keep" && "ring-2 ring-primary ring-offset-2 font-bold shadow-sm",
                      )}
                      onClick={() => decideQuality("keep")}
                    >
                      <Check className="h-4 w-4" />
                      <span>{currentQualityChoice === "keep" ? "Kept as-is" : "Keep as-is"}</span>
                    </Button>

                    {safeFixLabel && (
                      <Button
                        variant={currentQualityChoice === "fix" ? "default" : "secondary"}
                        className={cn(
                          "h-auto min-h-14 flex-col px-2 py-2 sm:flex-row transition-all",
                          currentQualityChoice === "fix" && "ring-2 ring-primary ring-offset-2 font-bold shadow-sm",
                        )}
                        onClick={() => decideQuality("fix")}
                      >
                        <WandSparkles className="h-4 w-4" />
                        <div className="text-center sm:text-left">
                          <div>{currentQualityChoice === "fix" ? "Fix applied" : "Safe fix"}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">{safeFixLabel}</div>
                        </div>
                      </Button>
                    )}

                    <Button
                      variant={currentQualityChoice === "remove" ? "default" : "destructive"}
                      className={cn(
                        "h-auto min-h-14 flex-col px-2 py-2 sm:flex-row transition-all",
                        currentQualityChoice === "remove" && "ring-2 ring-destructive ring-offset-2 font-bold shadow-sm bg-red-800 text-white",
                      )}
                      onClick={() => decideQuality("remove")}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{currentQualityChoice === "remove" ? "Removed" : "Remove"}</span>
                    </Button>
                  </div>

                  {/* Desktop Sub-action bar */}
                  {currentQualityDecision && (
                    <div className="hidden sm:flex mx-auto mt-3 max-w-2xl items-center justify-center text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={clearQualitySelection}
                        className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 underline underline-offset-2"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}

                  {/* Mobile Sticky Bottom Action Dock for Quality */}
                  <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 w-full max-w-full bg-card/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl box-border">
                    <div className={cn(
                      "grid gap-2 w-full max-w-full",
                      safeFixLabel ? "grid-cols-3" : "grid-cols-2"
                    )}>
                      <Button
                        variant={currentQualityChoice === "keep" ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-12 w-full min-w-0 flex-col px-1 py-1 text-xs transition-all overflow-hidden",
                          currentQualityChoice === "keep" && "ring-2 ring-primary ring-offset-1 font-bold",
                        )}
                        onClick={() => decideQuality("keep")}
                      >
                        <span className="font-bold flex items-center gap-1 truncate max-w-full"><Check className="h-3 w-3 shrink-0" /> Keep</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-full">As-is</span>
                      </Button>

                      {safeFixLabel && (
                        <Button
                          variant={currentQualityChoice === "fix" ? "default" : "secondary"}
                          size="sm"
                          className={cn(
                            "h-12 w-full min-w-0 flex-col px-1 py-1 text-xs transition-all overflow-hidden",
                            currentQualityChoice === "fix" && "ring-2 ring-primary ring-offset-1 font-bold",
                          )}
                          onClick={() => decideQuality("fix")}
                        >
                          <span className="font-bold flex items-center gap-1 truncate max-w-full"><WandSparkles className="h-3 w-3 shrink-0" /> Safe fix</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-full">{safeFixLabel}</span>
                        </Button>
                      )}

                      <Button
                        variant={currentQualityChoice === "remove" ? "default" : "destructive"}
                        size="sm"
                        className={cn(
                          "h-12 w-full min-w-0 flex-col px-1 py-1 text-xs transition-all overflow-hidden",
                          currentQualityChoice === "remove" && "ring-2 ring-destructive ring-offset-1 font-bold bg-red-800 text-white",
                        )}
                        onClick={() => decideQuality("remove")}
                      >
                        <span className="font-bold flex items-center gap-1 truncate max-w-full"><Trash2 className="h-3 w-3 shrink-0" /> Remove</span>
                        <span className="text-[10px] opacity-80 truncate max-w-full">Exclude</span>
                      </Button>
                    </div>

                    {currentQualityDecision && (
                      <div className="mt-2 flex items-center justify-center text-[11px] text-muted-foreground">
                        <button
                          type="button"
                          onClick={clearQualitySelection}
                          className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 underline underline-offset-2"
                        >
                          Clear selection
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Card className="border-emerald-200 dark:border-emerald-850 bg-emerald-50/60 dark:bg-emerald-950/40 text-center">
                  <CardContent className="flex flex-col items-center px-4 py-10 sm:px-6 sm:py-14">
                    <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                      <FileCheck2 className="h-7 w-7 sm:h-8 sm:w-8" />
                    </div>
                    <h2 className="mt-4 font-display text-xl sm:text-2xl font-extrabold">All items reviewed</h2>
                    <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-emerald-900/70 dark:text-emerald-300/70">
                      Download your cleaned VCF and import it into Google Contacts when you’re ready.
                    </p>
                    <Button size="lg" className="mt-5 w-full sm:w-auto font-bold shadow-md" onClick={exportFile}>
                      <Download className="h-4 w-4 mr-1.5" /> Download cleaned VCF
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>

            <aside className="space-y-3 sm:space-y-4 xl:sticky xl:top-5">
              <Card className="border-stone-200 dark:border-stone-800 shadow-none bg-card">
                <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base">Current file</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="flex items-center gap-2.5 rounded-lg bg-stone-50 dark:bg-stone-900/60 p-2.5 sm:p-3">
                    <FileCheck2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary" />
                    <span className="min-w-0 truncate text-xs sm:text-sm font-semibold" title={sourceName}>{sourceName}</span>
                  </div>
                  <Button variant="outline" className="mt-3 w-full text-xs sm:text-sm" onClick={exportFile}>
                    <Download className="h-4 w-4 mr-1.5" /> Download cleaned VCF
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-amber-200 dark:border-amber-900/70 bg-amber-50/70 dark:bg-amber-950/40 shadow-none">
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex gap-2.5 sm:gap-3">
                    <CircleAlert className="mt-0.5 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-amber-700 dark:text-amber-400" />
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200">About read-only contacts</p>
                      <p className="mt-0.5 text-[11px] sm:text-xs leading-normal text-amber-900/75 dark:text-amber-300/80">
                        Google does not include read-only status in a VCF export, so this app will not guess it.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      )}

        {/* Application Footer */}
        <footer className="w-full border-t border-stone-200/80 dark:border-stone-800/80 py-6 mt-auto text-xs text-muted-foreground">
          <div className="container max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-8">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span className="font-bold text-foreground">Tidy Contacts</span>
              <span>·</span>
              <span>A simpler, cleaner address book.</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Local First</span>
              <span>·</span>
              <a
                href="https://github.com/karanshah229/local-apps-harness"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground hover:underline transition-colors"
              >
                Open Source
              </a>
              <span>·</span>
              <a
                href="mailto:karanshah229@gmail.com"
                className="hover:text-foreground hover:underline transition-colors"
              >
                Feedback
              </a>
              <span className="text-red-500">❤️</span>
            </div>
          </div>
        </footer>

      {leftCard && rightCard && (
        <MergeEditDialog
          isOpen={isMergeEditOpen}
          onClose={() => setIsMergeEditOpen(false)}
          cards={groupCards}
          leftCard={leftCard}
          rightCard={rightCard}
          onSave={(customCard) => {
            setIsMergeEditOpen(false);
            decideDuplicate("merge", undefined, customCard);
          }}
        />
      )}

      {groupCards.length > 0 && (
        <SelectKeepDialog
          isOpen={isSelectKeepOpen}
          onClose={() => setIsSelectKeepOpen(false)}
          cards={groupCards}
          initialSelectedId={currentDuplicateDecision?.preferredCardId || leftCard?.id}
          onSelect={(chosen) => {
            decideDuplicate("left", chosen);
          }}
        />
      )}
    </div>
  );
}

