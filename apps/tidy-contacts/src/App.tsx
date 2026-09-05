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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Progress } from "./components/ui/progress";
import { MergeEditDialog } from "./components/MergeEditDialog";
import { SelectKeepDialog } from "./components/SelectKeepDialog";
import { ResumeSessionDialog } from "./components/ResumeSessionDialog";
import { EditableQualityCard } from "./components/EditableQualityCard";
import { ContactDetailModal } from "./components/ContactDetailModal";
import { ExportConfirmationModal } from "./components/ExportConfirmationModal";
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

function CircularProgress({
  percent,
  size = 38,
  strokeWidth = 3.5,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-stone-200 dark:stroke-stone-800"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-emerald-400 transition-all duration-300"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <span className="absolute text-[10px] font-extrabold tabular-nums text-foreground">
        {Math.round(percent)}%
      </span>
    </div>
  );
}

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

function MobileDuplicateCard({
  card,
  isSelected,
  isDeleted,
  onSelect,
  onOpenDetail,
}: {
  card: ContactCard;
  isSelected: boolean;
  isDeleted: boolean;
  onSelect: () => void;
  onOpenDetail: () => void;
}) {
  const summary = summarizeContact(card);
  const initials =
    summary.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";

  const primaryPhone = summary.phones[0];
  const emailCount = summary.emails.length;
  const emailLabel =
    emailCount === 0
      ? "No email address"
      : emailCount === 1
      ? summary.emails[0].value
      : `${emailCount} email addresses`;

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all bg-card text-card-foreground shadow-xs overflow-hidden",
        isSelected
          ? "border-primary ring-2 ring-primary/40 bg-primary/5"
          : isDeleted
          ? "border-red-900/30 opacity-75 bg-stone-950/20"
          : "border-stone-200 dark:border-stone-800/90 bg-card dark:bg-stone-900/60"
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Avatar Initials box */}
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700/60 text-stone-800 dark:text-stone-200 font-bold text-sm sm:text-base">
              {summary.photoDataUrl ? (
                <img src={summary.photoDataUrl} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {/* Contact details */}
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base sm:text-lg text-foreground truncate leading-snug">
                {summary.name || "Unnamed contact"}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                {primaryPhone ? (
                  <span>
                    <span className="font-medium text-foreground tabular-nums">{primaryPhone.value}</span>
                    {primaryPhone.label && ` · ${primaryPhone.label}`}
                  </span>
                ) : (
                  <span>No phone number</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {emailLabel}
              </p>
            </div>
          </div>

          {/* Select / Deleted Button */}
          <div className="shrink-0">
            {isSelected ? (
              <Button
                size="sm"
                onClick={onSelect}
                className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-xs gap-1"
                aria-label="Selected contact"
              >
                <Check className="h-3.5 w-3.5" /> Selected
              </Button>
            ) : isDeleted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onSelect}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold border-red-800/40 bg-red-950/30 text-red-400 hover:bg-red-900/30 gap-1"
                aria-label="Deleted contact. Click to select instead."
              >
                <Trash2 className="h-3.5 w-3.5" /> Deleted
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onSelect}
                className="h-8 px-3 rounded-lg text-xs font-semibold border-stone-300 dark:border-stone-700 bg-background dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700 text-foreground"
                aria-label="Select contact"
              >
                Select
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-stone-200 dark:border-stone-800/80" />

      {/* View all contact details expandable trigger */}
      <button
        type="button"
        onClick={onOpenDetail}
        className="w-full flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground py-2.5 transition-colors bg-stone-50/50 dark:bg-stone-900/30 hover:bg-stone-100/60 dark:hover:bg-stone-800/50"
      >
        <span>View all contact details</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
    </div>
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [detailModalCard, setDetailModalCard] = useState<ContactCard | null>(null);
  const [isGroupExpanded, setIsGroupExpanded] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [activeLeftIndex, setActiveLeftIndex] = useState(0);
  const [activeRightIndex, setActiveRightIndex] = useState(1);

  useEffect(() => {
    (window as unknown as {
      __resetTestState: () => void;
      __closeAllModals: () => void;
    }).__resetTestState = () => {
      setDuplicateDecisions({});
      setQualityDecisions({});
      setDuplicateIndex(0);
      setQualityIndex(0);
      setMode("duplicates");
      setIsMergeEditOpen(false);
      setIsSelectKeepOpen(false);
      setIsExportModalOpen(false);
      setDetailModalCard(null);
      setIsModeDropdownOpen(false);
      setIsGroupExpanded(false);
    };

    (window as unknown as { __closeAllModals: () => void }).__closeAllModals = () => {
      setIsMergeEditOpen(false);
      setIsSelectKeepOpen(false);
      setIsExportModalOpen(false);
      setDetailModalCard(null);
      setIsModeDropdownOpen(false);
      setIsGroupExpanded(false);
    };
  }, []);

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

  const currentKeptIds: string[] | undefined = useMemo(() => {
    if (!currentDuplicateDecision || !currentDuplicate) return undefined;
    if (currentDuplicateDecision.choice === "merge") {
      return undefined;
    }
    if (currentDuplicateDecision.keptCardIds) {
      return currentDuplicateDecision.keptCardIds;
    }
    if (currentDuplicateDecision.choice === "left") {
      return [currentDuplicateDecision.preferredCardId ?? leftCard?.id ?? currentDuplicate.cardIds[0]];
    }
    if (currentDuplicateDecision.choice === "right") {
      return [currentDuplicateDecision.preferredCardId ?? rightCard?.id ?? currentDuplicate.cardIds[1] ?? currentDuplicate.cardIds[0]];
    }
    return undefined;
  }, [currentDuplicateDecision, currentDuplicate, leftCard?.id, rightCard?.id]);
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

    // Automatically advance to the next duplicate issue if available on merge
    if (choice === "merge" && duplicateIndex < duplicateGroups.length - 1) {
      setDuplicateIndex((prev) => prev + 1);
    }
  };

  const setDuplicateSubsetDecision = (keptIds: string[]) => {
    if (!currentDuplicate) return;

    const previousDecision = duplicateDecisions[currentDuplicate.id];
    const newDecision: DuplicateDecision = {
      choice: "keep-subset",
      keptCardIds: keptIds,
      preferredCardId: keptIds[0],
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

    if (keptIds.length === currentDuplicate.cardIds.length) {
      setNotice("Keeping all contacts in this group as-is.");
    } else {
      setNotice(`Keeping ${keptIds.length} contact${keptIds.length === 1 ? "" : "s"} (removing unselected).`);
    }

    logEvent("review.decision", "succeeded", {
      decision: "keep-subset",
      keptCount: keptIds.length,
      totalCount: currentDuplicate.cardIds.length,
      index: duplicateIndex,
    });
    // NOTE: Do not advance index on card selection
  };

  const toggleCardSelection = (cardId: string) => {
    if (!currentDuplicate) return;

    let nextKeptIds: string[];
    if (!currentKeptIds) {
      // Currently unresolved: clicking cardId selects only that card
      nextKeptIds = [cardId];
    } else if (currentKeptIds.includes(cardId)) {
      // Deselect this card
      nextKeptIds = currentKeptIds.filter((id) => id !== cardId);
    } else {
      // Add this card to kept cards
      nextKeptIds = [...currentKeptIds, cardId];
    }

    if (nextKeptIds.length === 0) {
      // 0 selected -> treat as pending issue / no decision made yet
      clearDuplicateSelection();
    } else {
      setDuplicateSubsetDecision(nextKeptIds);
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

  const handleSaveContactDetail = (updated: ContactCard) => {
    setBaseCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setNotice("Contact details updated.");
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
        <div className="container flex h-14 sm:h-[70px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
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
          <div className="flex items-center gap-2 sm:gap-3">
            {baseCards.length > 0 && (
              <div className="flex items-center gap-2 mr-1">
                <CircularProgress percent={progress} size={34} strokeWidth={3.5} />
                <span className="text-xs sm:text-sm font-bold tabular-nums text-muted-foreground">
                  <strong className="text-foreground font-bold">{totalResolved}</strong> / {totalIssues}
                </span>
              </div>
            )}
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
        <main className="container max-w-7xl px-4 sm:px-8 py-4 sm:py-8 pb-36 md:pb-12 min-w-0 overflow-x-clip">
          {/* Mobile compact summary strip */}
          <section aria-label="Cleanup summary" className="md:hidden mb-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-card p-3 space-y-2.5">
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

          {/* Desktop/Landscape Stat Cards */}
          <section aria-label="Cleanup summary" className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard label="All contacts" value={baseCards.length} />
            <StatCard label="Decisions made" value={totalResolved} tone="success" />
            <StatCard label="Pending review" value={pending} tone={pending ? "warning" : "success"} />
            <StatCard label="Contacts in export" value={effectiveCards.length} />
          </section>

          {/* Desktop/Landscape Progress */}
          <section className="hidden md:block mb-6 rounded-xl border border-stone-200 dark:border-stone-800 bg-card px-4 py-3.5 sm:px-5" aria-label="Review progress">
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-foreground">Cleanup progress</span>
              <span className="font-bold tabular-nums text-primary">
                {Math.round(progress)}% ({totalResolved.toLocaleString()}/{totalIssues.toLocaleString()})
              </span>
            </div>
            <Progress value={progress} />
          </section>

          {/* Header Row: Mobile Dropdown vs Desktop Tabs */}
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Mobile Mode Dropdown */}
            <div className="md:hidden">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400 mb-1">
                Contact Cleanup
              </p>
              <div className="relative inline-block">
                <button
                  type="button"
                  data-testid="mode-dropdown-trigger"
                  onClick={() => setIsModeDropdownOpen((prev) => !prev)}
                  className="group flex items-center gap-2.5 text-left focus-visible:outline-none"
                  aria-haspopup="menu"
                  aria-expanded={isModeDropdownOpen}
                >
                  <h1 className="font-display text-2xl font-black tracking-tight text-foreground">
                    {mode === "duplicates" ? "Review duplicates" : "Other issues"}
                  </h1>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 transition-transform group-hover:bg-stone-300 dark:group-hover:bg-stone-700">
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isModeDropdownOpen && "rotate-180")} />
                  </div>
                </button>

                {isModeDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsModeDropdownOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-2xl border border-stone-200 dark:border-stone-800 bg-card p-2 shadow-2xl animate-in fade-in-50 zoom-in-95">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("duplicates");
                          setIsModeDropdownOpen(false);
                        }}
                        disabled={!duplicateGroups.length}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors",
                          mode === "duplicates"
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground",
                          !duplicateGroups.length && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="h-4 w-4" />
                          <span>Review duplicates</span>
                        </div>
                        <span className="text-xs tabular-nums opacity-80 font-mono">
                          {resolvedDuplicateCount}/{totalDuplicateIssues}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMode("quality");
                          setIsModeDropdownOpen(false);
                        }}
                        disabled={!qualityIssues.length}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors mt-1",
                          mode === "quality"
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground",
                          !qualityIssues.length && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="h-4 w-4" />
                          <span>Other issues</span>
                        </div>
                        <span className="text-xs tabular-nums opacity-80 font-mono">
                          {resolvedQualityCount}/{totalQualityIssues}
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Desktop Mode Tabs & Title */}
            <div className="hidden md:flex md:items-center md:justify-between w-full">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400 mb-0.5">
                  Contact Cleanup
                </p>
                <h1 className="font-display text-2xl lg:text-3xl font-black tracking-tight text-foreground">
                  {mode === "duplicates" ? "Review duplicates" : "Other issues"}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex rounded-xl border border-stone-200 dark:border-stone-800 bg-card p-1 shadow-xs" role="tablist" aria-label="Issue type">
                  <button
                    role="tab"
                    aria-selected={mode === "duplicates"}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-xs lg:text-sm font-bold transition-all text-center",
                      mode === "duplicates"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setMode("duplicates")}
                    disabled={!duplicateGroups.length}
                  >
                    <Users className="h-4 w-4" />
                    <span>Duplicates</span>
                    <span className="ml-1 tabular-nums font-mono text-xs opacity-90">
                      {resolvedDuplicateCount}/{totalDuplicateIssues}
                    </span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={mode === "quality"}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-xs lg:text-sm font-bold transition-all text-center",
                      mode === "quality"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setMode("quality")}
                    disabled={!qualityIssues.length}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Other issues</span>
                    <span className="ml-1 tabular-nums font-mono text-xs opacity-90">
                      {resolvedQualityCount}/{totalQualityIssues}
                    </span>
                  </button>
                </div>

                {/* Desktop Prev / Next Navigation */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 rounded-xl text-xs font-semibold"
                    onClick={() => {
                      if (mode === "duplicates") {
                        setDuplicateIndex((prev) => Math.max(0, prev - 1));
                      } else {
                        setQualityIndex((prev) => Math.max(0, prev - 1));
                      }
                    }}
                    disabled={mode === "duplicates" ? duplicateIndex === 0 : qualityIndex === 0}
                    aria-label="Previous item"
                  >
                    <ChevronLeft className="h-4 w-4 mr-0.5" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 rounded-xl text-xs font-semibold"
                    onClick={() => {
                      if (mode === "duplicates") {
                        setDuplicateIndex((prev) => Math.min(duplicateGroups.length - 1, prev + 1));
                      } else {
                        setQualityIndex((prev) => Math.min(qualityIssues.length - 1, prev + 1));
                      }
                    }}
                    disabled={
                      mode === "duplicates"
                        ? duplicateIndex >= duplicateGroups.length - 1
                        : qualityIndex >= qualityIssues.length - 1
                    }
                    aria-label="Next item"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-0.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout Grid: Main Content + Desktop Sidebar */}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Main Center Column */}
            <div className="min-w-0">
              {/* Match Reasons and Status Pills (No 6 in group tag!) */}
              {mode === "duplicates" && currentDuplicate ? (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {currentDuplicate.reasons.map((reason) => (
                    <MatchReasonBadge key={reason} reason={reason} className="text-xs" />
                  ))}
                  {currentDuplicateDecision ? (
                    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5" />
                      {currentDuplicateDecision.choice === "merge"
                        ? currentDuplicateDecision.customCard
                          ? "Customized merge"
                          : `Merged ${groupCards.length}`
                        : currentKeptIds?.length === groupCards.length
                        ? `Kept all ${groupCards.length} as-is`
                        : currentKeptIds?.length === 1
                        ? `Kept ${baseCardMap.get(currentKeptIds[0])?.properties.find((p) => p.key === "FN")?.value || "1 contact"}`
                        : `Kept ${currentKeptIds?.length || 0} of ${groupCards.length}`}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-stone-300/80 dark:border-stone-800 bg-stone-100/90 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 text-xs font-medium px-2.5 py-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-400 mr-1.5" />
                      Unresolved
                    </Badge>
                  )}
                </div>
              ) : mode === "quality" && currentQuality ? (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {currentQuality.codes.map((code) => (
                    <QualityIssueBadge key={code} code={code} className="text-xs" />
                  ))}
                  {currentQualityDecision ? (
                    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5" />
                      {currentQualityChoice === "keep" && "Kept as-is"}
                      {currentQualityChoice === "fix" && "Safe fix applied"}
                      {currentQualityChoice === "edit" && "Edited"}
                      {currentQualityChoice === "remove" && "Removed from export"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-stone-300/80 dark:border-stone-800 bg-stone-100/90 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 text-xs font-medium px-2.5 py-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-400 mr-1.5" />
                      Unresolved
                    </Badge>
                  )}
                </div>
              ) : null}

              {/* Duplicate Mode Flow */}
              {mode === "duplicates" && duplicateGroups.length > 0 && currentDuplicate && leftCard && rightCard ? (
                <div>
                  {(() => {
                    const isLeftSelected = Boolean(currentKeptIds?.includes(leftCard.id));
                    const isLeftDeleted = Boolean(currentKeptIds && !isLeftSelected);

                    const isRightSelected = Boolean(currentKeptIds?.includes(rightCard.id));
                    const isRightDeleted = Boolean(currentKeptIds && !isRightSelected);

                    const isMergeActive = currentDuplicateDecision?.choice === "merge" && !currentDuplicateDecision.customCard;
                    const isMergeEditActive = Boolean(currentDuplicateDecision?.customCard);
                    const isSelectKeepActive = Boolean(currentKeptIds);

                    return (
                      <>
                        {/* Mobile Single Column Flow (< md) */}
                        <div className="md:hidden space-y-0">
                          {/* Card 1 */}
                          <MobileDuplicateCard
                            card={leftCard}
                            isSelected={isLeftSelected}
                            isDeleted={isLeftDeleted}
                            onSelect={() => toggleCardSelection(leftCard.id)}
                            onOpenDetail={() => setDetailModalCard(leftCard)}
                          />

                          {/* Dotted Connector */}
                          <div className="w-0 border-l border-dotted border-stone-400 dark:border-stone-700 h-5 mx-auto my-1.5" />

                          {/* Middle Action Bar */}
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              variant="ghost"
                              className={cn(
                                "h-12 flex-col px-1.5 py-1 text-xs transition-all rounded-xl",
                                isMergeActive
                                  ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 ring-2 ring-primary/40 font-bold shadow-xs"
                                  : "border border-stone-200 dark:border-stone-800 bg-card dark:bg-stone-900/70 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
                              )}
                              onClick={() => decideDuplicate("merge", leftCard)}
                              aria-label={`Merge ${groupCards.length} contacts`}
                            >
                              <div className="flex items-center justify-center gap-1.5 font-bold truncate max-w-full">
                                <Merge className="h-3.5 w-3.5 shrink-0" />
                                <span>Merge {groupCards.length}</span>
                              </div>
                            </Button>

                            <Button
                              variant="ghost"
                              className={cn(
                                "h-12 flex-col px-1.5 py-1 text-xs transition-all rounded-xl",
                                isMergeEditActive
                                  ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 ring-2 ring-primary/40 font-bold shadow-xs"
                                  : "border border-stone-200 dark:border-stone-800 bg-card dark:bg-stone-900/70 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
                              )}
                              onClick={() => setIsMergeEditOpen(true)}
                              aria-label="Merge & Edit"
                            >
                              <div className="flex items-center justify-center gap-1.5 font-bold truncate max-w-full">
                                <Edit3 className="h-3.5 w-3.5 shrink-0" />
                                <span>Merge & Edit</span>
                              </div>
                            </Button>

                            <Button
                              variant="ghost"
                              className={cn(
                                "h-12 flex-col px-1.5 py-1 text-xs transition-all rounded-xl",
                                isSelectKeepActive
                                  ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 ring-2 ring-primary/40 font-bold shadow-xs"
                                  : "border border-stone-200 dark:border-stone-800 bg-card dark:bg-stone-900/70 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
                              )}
                              onClick={() => setIsSelectKeepOpen(true)}
                              aria-label="Select & keep"
                            >
                              <div className="flex items-center justify-center gap-1.5 font-bold truncate max-w-full">
                                <UserCheck className="h-3.5 w-3.5 shrink-0" />
                                <span>Select & keep{currentKeptIds ? ` (${currentKeptIds.length})` : ""}</span>
                              </div>
                            </Button>
                          </div>

                          {/* Dotted Connector */}
                          <div className="w-0 border-l border-dotted border-stone-400 dark:border-stone-700 h-5 mx-auto my-1.5" />

                          {/* Card 2 */}
                          <MobileDuplicateCard
                            card={rightCard}
                            isSelected={isRightSelected}
                            isDeleted={isRightDeleted}
                            onSelect={() => toggleCardSelection(rightCard.id)}
                            onOpenDetail={() => setDetailModalCard(rightCard)}
                          />
                        </div>

                        {/* Desktop / Landscape Side-by-Side View (>= md) */}
                        <div className="hidden md:block space-y-4">
                          {/* 2-Column Side-by-Side Comparison Cards */}
                          <div className="grid grid-cols-2 gap-4">
                            <MobileDuplicateCard
                              card={leftCard}
                              isSelected={isLeftSelected}
                              isDeleted={isLeftDeleted}
                              onSelect={() => toggleCardSelection(leftCard.id)}
                              onOpenDetail={() => setDetailModalCard(leftCard)}
                            />

                            <MobileDuplicateCard
                              card={rightCard}
                              isSelected={isRightSelected}
                              isDeleted={isRightDeleted}
                              onSelect={() => toggleCardSelection(rightCard.id)}
                              onOpenDetail={() => setDetailModalCard(rightCard)}
                            />
                          </div>

                          {/* Desktop Action Buttons Row */}
                          <div className="grid grid-cols-3 gap-3">
                            <Button
                              variant="ghost"
                              className={cn(
                                "h-13 flex-row gap-2 px-4 py-2 text-sm transition-all rounded-xl",
                                isMergeActive
                                  ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 ring-2 ring-primary/40 font-bold shadow-xs"
                                  : "border border-stone-200 dark:border-stone-800 bg-card dark:bg-stone-900/70 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
                              )}
                              onClick={() => decideDuplicate("merge", leftCard)}
                              aria-label={`Merge ${groupCards.length} contacts`}
                            >
                              <Merge className="h-4 w-4 shrink-0" />
                              <span className="font-bold">Merge {groupCards.length}</span>
                              {isMergeActive && (
                                <Check className="h-4 w-4 ml-1 stroke-[3] shrink-0" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              className={cn(
                                "h-13 flex-row gap-2 px-4 py-2 text-sm transition-all rounded-xl",
                                isMergeEditActive
                                  ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 ring-2 ring-primary/40 font-bold shadow-xs"
                                  : "border border-stone-200 dark:border-stone-800 bg-card dark:bg-stone-900/70 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
                              )}
                              onClick={() => setIsMergeEditOpen(true)}
                              aria-label="Merge & Edit"
                            >
                              <Edit3 className="h-4 w-4 shrink-0" />
                              <span className="font-bold">Merge & Edit</span>
                              {isMergeEditActive && (
                                <Check className="h-4 w-4 ml-1 stroke-[3] shrink-0" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              className={cn(
                                "h-13 flex-row gap-2 px-4 py-2 text-sm transition-all rounded-xl",
                                isSelectKeepActive
                                  ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 ring-2 ring-primary/40 font-bold shadow-xs"
                                  : "border border-stone-200 dark:border-stone-800 bg-card dark:bg-stone-900/70 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
                              )}
                              onClick={() => setIsSelectKeepOpen(true)}
                              aria-label="Select & keep"
                            >
                              <UserCheck className="h-4 w-4 shrink-0" />
                              <span className="font-bold">Select & keep{currentKeptIds ? ` (${currentKeptIds.length})` : ""}</span>
                              {isSelectKeepActive && (
                                <Check className="h-4 w-4 ml-1 stroke-[3] shrink-0" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Accordion for N > 2 contacts in group (works on both mobile & desktop) */}
                        {otherGroupCards.length > 0 && (
                          <div className="mt-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-card dark:bg-stone-900/70 overflow-hidden shadow-xs">
                            <button
                              type="button"
                              onClick={() => setIsGroupExpanded((prev) => !prev)}
                              className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/40"
                              aria-expanded={isGroupExpanded}
                            >
                              <span className="font-bold text-sm text-foreground">
                                Contacts in this group
                              </span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                {otherGroupCards.length} more
                                {isGroupExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </span>
                            </button>

                            {isGroupExpanded && (
                              <div className="divide-y divide-stone-200 dark:divide-stone-800 border-t border-stone-200 dark:border-stone-800">
                                {otherGroupCards.map(({ card, idx }) => {
                                  const summary = summarizeContact(card);
                                  const isCardSelected = Boolean(currentKeptIds?.includes(card.id));
                                  const isCardDeleted = Boolean(currentKeptIds && !isCardSelected);

                                  return (
                                    <div
                                      key={card.id}
                                      onClick={() => setDetailModalCard(card)}
                                      className="flex items-center justify-between gap-3 p-3.5 hover:bg-stone-50/80 dark:hover:bg-stone-800/40 cursor-pointer transition-colors"
                                    >
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300">
                                          {idx + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-bold truncate text-foreground">
                                            {summary.name || "Unnamed Contact"}
                                          </p>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {summary.emails[0]?.value || summary.phones[0]?.value || "No contact info"}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleCardSelection(card.id);
                                          }}
                                          className={cn(
                                            "h-7 px-2.5 text-xs rounded-lg font-semibold gap-1",
                                            isCardSelected
                                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                              : isCardDeleted
                                              ? "border border-red-800/40 bg-red-950/30 text-red-400 hover:bg-red-900/30"
                                              : "border border-stone-300 dark:border-stone-700 bg-background hover:bg-stone-100 dark:hover:bg-stone-800"
                                          )}
                                        >
                                          {isCardSelected ? (
                                            <>
                                              <Check className="h-3 w-3" /> Selected
                                            </>
                                          ) : isCardDeleted ? (
                                            <>
                                              <Trash2 className="h-3 w-3" /> Deleted
                                            </>
                                          ) : (
                                            "Select"
                                          )}
                                        </Button>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
              </div>
            ) : mode === "quality" && qualityIssues.length > 0 && currentQuality && qualityCard ? (
              <div className="space-y-4">
                <EditableQualityCard
                  card={qualityCard}
                  qualityCodes={currentQuality.codes}
                  currentDecision={currentQualityDecision}
                  onChange={handleQualityCardEdit}
                />

                <div className={cn(
                  "grid gap-2 sm:gap-3",
                  safeFixLabel ? "grid-cols-3" : "grid-cols-2"
                )}>
                  <Button
                    variant={currentQualityChoice === "keep" ? "default" : "outline"}
                    className={cn(
                      "h-12 flex-col sm:flex-row gap-1.5 transition-all rounded-xl",
                      currentQualityChoice === "keep"
                        ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 ring-2 ring-primary/40 font-bold shadow-xs"
                        : "border border-stone-200 dark:border-stone-800 bg-card dark:bg-stone-900/70 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
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
                        "h-12 flex-col sm:flex-row gap-1.5 transition-all rounded-xl",
                        currentQualityChoice === "fix"
                          ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 ring-2 ring-primary/40 font-bold shadow-xs"
                          : "border border-stone-200 dark:border-stone-800 bg-card dark:bg-stone-900/70 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
                      )}
                      onClick={() => decideQuality("fix")}
                    >
                      <WandSparkles className="h-4 w-4" />
                      <div className="text-center sm:text-left leading-tight">
                        <div className="text-xs font-bold">{currentQualityChoice === "fix" ? "Fix applied" : "Safe fix"}</div>
                        <div className={cn("text-[10px] font-normal", currentQualityChoice === "fix" ? "text-primary-foreground/80 dark:text-primary-foreground/80" : "text-muted-foreground")}>{safeFixLabel}</div>
                      </div>
                    </Button>
                  )}

                  <Button
                    variant={currentQualityChoice === "remove" ? "default" : "destructive"}
                    className={cn(
                      "h-12 flex-col sm:flex-row gap-1.5 transition-all rounded-xl",
                      currentQualityChoice === "remove" && "ring-2 ring-destructive font-bold shadow-xs bg-red-800 text-white dark:bg-red-700 dark:text-white"
                    )}
                    onClick={() => decideQuality("remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{currentQualityChoice === "remove" ? "Removed" : "Remove"}</span>
                  </Button>
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
                  <Button size="lg" className="mt-5 w-full sm:w-auto font-bold shadow-md" onClick={() => setIsExportModalOpen(true)}>
                    <Download className="h-4 w-4 mr-1.5" /> Download cleaned VCF
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Desktop Right Sidebar (hidden on mobile, visible on lg) */}
          <aside className="hidden lg:block space-y-4">
            <Card className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-card shadow-xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-bold">Review summary</CardTitle>
                <CardDescription className="text-xs">
                  {sourceName ? `Working on ${sourceName}` : "Session in progress"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-0">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Original contacts</span>
                    <span className="font-bold tabular-nums text-foreground">{baseCards.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Decisions made</span>
                    <span className="font-bold tabular-nums text-emerald-400">{totalResolved}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pending review</span>
                    <span className={cn("font-bold tabular-nums", pending ? "text-amber-400" : "text-emerald-400")}>
                      {pending}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-stone-200 dark:border-stone-800 pt-2 font-semibold">
                    <span className="text-foreground">Contacts in export</span>
                    <span className="font-bold tabular-nums text-foreground">{effectiveCards.length}</span>
                  </div>
                </div>

                <Button
                  className="w-full font-bold shadow-xs"
                  onClick={() => setIsExportModalOpen(true)}
                  aria-label="Export contacts"
                >
                  <Download className="h-4 w-4 mr-1.5" /> Export contacts
                </Button>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/40 p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-bold text-foreground">💡 Helpful tips</p>
              <ul className="space-y-1.5 list-disc list-inside text-[11px] leading-relaxed">
                <li>Click <strong>View all contact details</strong> to inspect or edit any contact field before merging.</li>
                <li><strong>Merge & Edit</strong> lets you pick and customize merged fields.</li>
                <li><strong>Select & keep</strong> keeps one single contact and discards the other matches.</li>
                <li>All processing remains 100% private in your browser.</li>
              </ul>
            </div>
          </aside>
        </div>

        {/* Fixed Bottom Navigation Dock (Mobile Only) */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl">
          <div className="mx-auto max-w-2xl flex items-center justify-between gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border-stone-200 dark:border-stone-800 bg-background dark:bg-stone-900/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
              onClick={() => {
                if (mode === "duplicates") {
                  setDuplicateIndex((prev) => Math.max(0, prev - 1));
                } else {
                  setQualityIndex((prev) => Math.max(0, prev - 1));
                }
              }}
              disabled={mode === "duplicates" ? duplicateIndex === 0 : qualityIndex === 0}
              aria-label="Previous item"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>

            <Button
              size="sm"
              className="h-10 px-4 sm:px-6 rounded-xl text-xs sm:text-sm font-bold border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-foreground shadow-xs"
              onClick={() => setIsExportModalOpen(true)}
              aria-label="Export contacts"
            >
              <Download className="h-4 w-4 mr-1.5" /> Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border-stone-200 dark:border-stone-800 bg-background dark:bg-stone-900/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
              onClick={() => {
                if (mode === "duplicates") {
                  setDuplicateIndex((prev) => Math.min(duplicateGroups.length - 1, prev + 1));
                } else {
                  setQualityIndex((prev) => Math.min(qualityIssues.length - 1, prev + 1));
                }
              }}
              disabled={
                mode === "duplicates"
                  ? duplicateIndex >= duplicateGroups.length - 1
                  : qualityIndex >= qualityIssues.length - 1
              }
              aria-label="Next item"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </main>
      )}

      {/* Application Footer (Hidden on Mobile) */}
      <footer className="hidden md:block w-full border-t border-stone-200/80 dark:border-stone-800/80 py-6 mt-auto text-xs text-muted-foreground">
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
          initialSelectedIds={currentKeptIds}
          onConfirm={(selectedIds) => {
            if (selectedIds.length === 0) {
              clearDuplicateSelection();
            } else {
              setDuplicateSubsetDecision(selectedIds);
            }
          }}
        />
      )}

      <ContactDetailModal
        isOpen={Boolean(detailModalCard)}
        onClose={() => setDetailModalCard(null)}
        card={detailModalCard}
        onSave={handleSaveContactDetail}
      />

      <ExportConfirmationModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        totalIssues={totalIssues}
        resolvedIssues={totalResolved}
        effectiveContactsCount={effectiveCards.length}
        onConfirmExport={exportFile}
      />
    </div>
  );
}

