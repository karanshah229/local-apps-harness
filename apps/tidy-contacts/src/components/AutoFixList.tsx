import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Mail,
  Phone,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  WandSparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import {
  type ContactCard,
  type QualityDecision,
  type QualityIssue,
  getSafeFixDiffs,
  getSafeFixLabel,
  summarizeContact,
  getQualityChoice,
} from "../lib/vcard";
import { cn } from "../lib/utils";

interface AutoFixListProps {
  autoFixIssues: QualityIssue[];
  cardMap: Map<string, ContactCard>;
  qualityDecisions: Record<string, QualityDecision>;
  onDecide: (cardId: string, decision: QualityDecision) => void;
  onBatchDecide: (decisions: Record<string, QualityDecision>) => void;
  onOpenDetail?: (card: ContactCard) => void;
}

interface BaseAutoFixItem {
  card: ContactCard;
  summary: ReturnType<typeof summarizeContact>;
  label: string;
  diffs: ReturnType<typeof getSafeFixDiffs>;
  category: "email" | "duplicates" | "name" | "format" | "other";
}

const PAGE_SIZE = 50;

export function AutoFixList({
  autoFixIssues,
  cardMap,
  qualityDecisions,
  onDecide,
  onBatchDecide,
  onOpenDetail,
}: AutoFixListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Static contact metadata precomputed ONLY when issues/cardMap change (NOT on every click)
  const baseItems = useMemo<BaseAutoFixItem[]>(() => {
    return autoFixIssues
      .map((issue) => {
        const card = cardMap.get(issue.cardId);
        if (!card) return null;
        const summary = summarizeContact(card);
        const label = getSafeFixLabel(card) || "Safe fix";
        const diffs = getSafeFixDiffs(card);

        let category: BaseAutoFixItem["category"] = "other";
        if (label.includes("Email")) category = "email";
        else if (label.includes("Deduplicate") || label.includes("Phone")) category = "duplicates";
        else if (label.includes("Company") || label.includes("Generate Name")) category = "name";
        else if (label.includes("Address") || label.includes("URL") || label.includes("Encoding")) category = "format";

        return {
          card,
          summary,
          label,
          diffs,
          category,
        };
      })
      .filter(Boolean) as BaseAutoFixItem[];
  }, [autoFixIssues, cardMap]);

  // 2. Category counts calculated once from baseItems
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: baseItems.length };
    for (const item of baseItems) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [baseItems]);

  // 3. Fast filtered items
  const filteredItems = useMemo(() => {
    return baseItems.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const nameMatch = item.summary.name.toLowerCase().includes(query);
      const orgMatch = item.summary.organization.toLowerCase().includes(query);
      const emailMatch = item.summary.emails.some((e) => e.value.toLowerCase().includes(query));
      const phoneMatch = item.summary.phones.some((p) => p.value.includes(query));
      const labelMatch = item.label.toLowerCase().includes(query);
      return nameMatch || orgMatch || emailMatch || phoneMatch || labelMatch;
    });
  }, [baseItems, selectedCategory, searchQuery]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // 4. Decision counters
  const { fixedCount, revertedCount } = useMemo(() => {
    let fixed = 0;
    let reverted = 0;
    for (const item of baseItems) {
      const decision = qualityDecisions[item.card.id] ?? "fix";
      const choice = getQualityChoice(decision);
      if (choice === "fix") fixed++;
      else if (choice === "keep") reverted++;
    }
    return { fixedCount: fixed, revertedCount: reverted };
  }, [baseItems, qualityDecisions]);

  // 5. Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredItems.length);
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, startIndex, endIndex]);

  const handleRevertAll = () => {
    const patch: Record<string, QualityDecision> = {};
    for (const item of baseItems) {
      patch[item.card.id] = "keep";
    }
    onBatchDecide(patch);
  };

  const handleApplyAll = () => {
    const patch: Record<string, QualityDecision> = {};
    for (const item of baseItems) {
      patch[item.card.id] = "fix";
    }
    onBatchDecide(patch);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Summary Card */}
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <WandSparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                  Auto-applied Safe Fixes
                </h2>
                <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  {fixedCount} of {baseItems.length} active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                All safe repairs are automatically selected for you. No action needed unless you want to revert or delete a contact.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {revertedCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyAll}
                className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40"
              >
                <WandSparkles className="h-3.5 w-3.5" /> Apply All Fixes
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevertAll}
                className="h-8 rounded-xl text-xs font-semibold gap-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Revert All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search auto-fixed contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-card py-2.5 pl-10 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-stone-100 dark:bg-stone-900/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <span>All</span>
            <span className="opacity-80 tabular-nums">({categoryCounts.all || 0})</span>
          </button>

          {Boolean(categoryCounts.email) && (
            <button
              type="button"
              onClick={() => setSelectedCategory("email")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer",
                selectedCategory === "email"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-stone-100 dark:bg-stone-900/80 text-muted-foreground hover:text-foreground"
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email Typos</span>
              <span className="opacity-80 tabular-nums">({categoryCounts.email})</span>
            </button>
          )}

          {Boolean(categoryCounts.duplicates) && (
            <button
              type="button"
              onClick={() => setSelectedCategory("duplicates")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer",
                selectedCategory === "duplicates"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-stone-100 dark:bg-stone-900/80 text-muted-foreground hover:text-foreground"
              )}
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Internal Duplicates</span>
              <span className="opacity-80 tabular-nums">({categoryCounts.duplicates})</span>
            </button>
          )}

          {Boolean(categoryCounts.name) && (
            <button
              type="button"
              onClick={() => setSelectedCategory("name")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer",
                selectedCategory === "name"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-stone-100 dark:bg-stone-900/80 text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Name Generated</span>
              <span className="opacity-80 tabular-nums">({categoryCounts.name})</span>
            </button>
          )}

          {Boolean(categoryCounts.format) && (
            <button
              type="button"
              onClick={() => setSelectedCategory("format")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer",
                selectedCategory === "format"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-stone-100 dark:bg-stone-900/80 text-muted-foreground hover:text-foreground"
              )}
            >
              <Check className="h-3.5 w-3.5" />
              <span>Cleaned Fields</span>
              <span className="opacity-80 tabular-nums">({categoryCounts.format})</span>
            </button>
          )}
        </div>
      </div>

      {/* Pagination Header (when there are more than PAGE_SIZE items) */}
      {filteredItems.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground tabular-nums">{startIndex + 1}–{endIndex}</strong> of{" "}
            <strong className="text-foreground tabular-nums">{filteredItems.length.toLocaleString()}</strong> contacts
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={validPage === 1}
              className="h-7 w-7 p-0 rounded-lg text-xs"
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage === 1}
              className="h-7 w-7 p-0 rounded-lg text-xs"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 font-bold tabular-nums text-foreground">
              {validPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validPage >= totalPages}
              className="h-7 w-7 p-0 rounded-lg text-xs"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={validPage >= totalPages}
              className="h-7 w-7 p-0 rounded-lg text-xs"
              aria-label="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* List of Contacts */}
      {filteredItems.length === 0 ? (
        <Card className="border-stone-200 dark:border-stone-800 text-center py-10">
          <CardContent className="space-y-2">
            <p className="font-bold text-sm text-foreground">No matching auto-fixes found</p>
            <p className="text-xs text-muted-foreground">Try clearing your search query or switching categories.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedItems.map((item) => (
            <AutoFixCardItem
              key={item.card.id}
              item={item}
              decision={qualityDecisions[item.card.id] ?? "fix"}
              onDecide={onDecide}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {filteredItems.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 pt-2 px-1 text-xs text-muted-foreground">
          <span>
            Page <strong className="text-foreground tabular-nums">{validPage}</strong> of{" "}
            <strong className="text-foreground tabular-nums">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={validPage === 1}
              className="h-7 w-7 p-0 rounded-lg text-xs"
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={validPage === 1}
              className="h-7 w-7 p-0 rounded-lg text-xs"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 font-bold tabular-nums text-foreground">
              {validPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={validPage >= totalPages}
              className="h-7 w-7 p-0 rounded-lg text-xs"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(totalPages);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={validPage >= totalPages}
              className="h-7 w-7 p-0 rounded-lg text-xs"
              aria-label="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoized individual item card component for 60fps rendering without re-rendering untouched cards
const AutoFixCardItem = memo(function AutoFixCardItem({
  item,
  decision,
  onDecide,
  onOpenDetail,
}: {
  item: BaseAutoFixItem;
  decision: QualityDecision;
  onDecide: (cardId: string, decision: QualityDecision) => void;
  onOpenDetail?: (card: ContactCard) => void;
}) {
  const choice = getQualityChoice(decision);
  const isFixed = choice === "fix";
  const isReverted = choice === "keep";
  const isRemoved = choice === "remove";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-3.5 sm:p-4 transition-all space-y-3 shadow-xs",
        isFixed && "border-stone-200 dark:border-stone-800",
        isReverted && "border-amber-300/80 dark:border-amber-900/70 bg-amber-50/30 dark:bg-amber-950/20",
        isRemoved && "border-red-300/80 dark:border-red-900/70 bg-red-50/30 dark:bg-red-950/20 opacity-75"
      )}
    >
      {/* Header: Avatar, Name, Status Badge */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 font-bold text-xs text-foreground uppercase">
            {item.summary.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0])
              .join("") || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-bold text-sm text-foreground truncate">
                {item.summary.name || "(Missing Name)"}
              </h3>
              {item.summary.organization && (
                <span className="text-xs text-muted-foreground truncate">
                  · {item.summary.organization}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold px-1.5 py-0 gap-1">
                <WandSparkles className="h-2.5 w-2.5" />
                {item.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="shrink-0">
          {isFixed && (
            <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-2 py-0.5 gap-1">
              <Check className="h-3 w-3 stroke-[2.5]" /> Auto-fixed
            </Badge>
          )}
          {isReverted && (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2 py-0.5 gap-1">
              <RotateCcw className="h-3 w-3" /> Reverted
            </Badge>
          )}
          {isRemoved && (
            <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold px-2 py-0.5 gap-1">
              <Trash2 className="h-3 w-3" /> Removed
            </Badge>
          )}
        </div>
      </div>

      {/* Diff View (Responsive before -> after pill) */}
      <div className="space-y-1.5 rounded-xl bg-stone-50/80 dark:bg-stone-900/60 p-2.5 sm:p-3 border border-stone-100 dark:border-stone-800/80 text-xs">
        {item.diffs.map((diff, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground font-medium shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{diff.field}:</span>
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className={cn(
                "px-2 py-0.5 rounded-md font-mono text-xs break-all",
                isFixed ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 line-through opacity-80" : "bg-stone-200 dark:bg-stone-800 text-foreground"
              )}>
                {diff.before}
              </span>
              <span className="text-muted-foreground font-bold text-xs">➔</span>
              <span className={cn(
                "px-2 py-0.5 rounded-md font-mono text-xs font-semibold break-all",
                isFixed ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground line-through opacity-60"
              )}>
                {diff.after}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {onOpenDetail && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenDetail(item.card)}
            className="h-10 sm:h-8 px-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground gap-1"
          >
            <span>View details</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {isFixed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDecide(item.card.id, "keep")}
              className="h-10 sm:h-8 px-3 rounded-xl text-xs font-semibold gap-1 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Revert to original</span>
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => onDecide(item.card.id, "fix")}
              className="h-10 sm:h-8 px-3 rounded-xl text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <WandSparkles className="h-3.5 w-3.5" />
              <span>Apply safe fix</span>
            </Button>
          )}

          {isRemoved ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDecide(item.card.id, "fix")}
              className="h-10 sm:h-8 px-3 rounded-xl text-xs font-semibold gap-1 border-stone-200 dark:border-stone-800"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Restore</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDecide(item.card.id, "remove")}
              className="h-10 sm:h-8 px-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              title="Remove contact from exported file"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1">Remove</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

