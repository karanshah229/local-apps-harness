import { useEffect, useState } from "react";
import { Check, Mail, Phone, UserCheck, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { summarizeContact, type ContactCard } from "../lib/vcard";
import { cn } from "../lib/utils";

interface SelectKeepDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cards: ContactCard[];
  initialSelectedIds?: string[];
  onConfirm: (selectedCardIds: string[]) => void;
}

export function SelectKeepDialog({
  isOpen,
  onClose,
  cards,
  initialSelectedIds,
  onConfirm,
}: SelectKeepDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      if (initialSelectedIds && initialSelectedIds.length > 0) {
        setSelectedIds(new Set(initialSelectedIds));
      } else {
        // Default to keeping the first contact if none was chosen yet
        setSelectedIds(new Set(cards[0] ? [cards[0].id] : []));
      }
    }
  }, [isOpen, initialSelectedIds, cards]);

  if (!isOpen || !cards.length) return null;

  const toggleCard = (cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(cards.map((c) => c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
    onClose();
  };

  const allSelected = selectedIds.size === cards.length;
  const noneSelected = selectedIds.size === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative flex flex-col w-full max-w-lg max-h-[85vh] rounded-2xl border border-stone-200 dark:border-stone-800 bg-card text-card-foreground shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-keep-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-4 py-3.5 sm:px-6 sm:py-4 shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="select-keep-title" className="text-base sm:text-lg font-bold">
                Select & Keep Contacts
              </h2>
              <p className="text-xs text-muted-foreground">
                Choose which contacts to keep. Unselected contacts will be removed.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            data-testid="select-keep-close"
            className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick selection bar */}
        <div className="flex items-center justify-between px-4 py-2 sm:px-6 border-b border-stone-200 dark:border-stone-800 bg-stone-100/40 dark:bg-stone-900/30 text-xs">
          <span className="font-medium text-muted-foreground">
            <span className="font-bold text-foreground tabular-nums">{selectedIds.size}</span> of {cards.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={allSelected}
              className="text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
            >
              Select all
            </button>
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              disabled={noneSelected}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:no-underline cursor-pointer"
            >
              Deselect all
            </button>
          </div>
        </div>

        {/* Scrollable contact options list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {cards.map((card, idx) => {
            const summary = summarizeContact(card);
            const isSelected = selectedIds.has(card.id);

            return (
              <div
                key={card.id}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => toggleCard(card.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCard(card.id);
                  }
                }}
                className={cn(
                  "relative flex flex-col gap-2 rounded-xl border p-3.5 transition-all text-left cursor-pointer select-none",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-xs"
                    : "border-stone-200 dark:border-stone-800/80 bg-stone-50/30 dark:bg-stone-950/30 opacity-75 hover:opacity-100"
                )}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Index Badge */}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                      )}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate text-foreground">
                        {summary.name || "Unnamed contact"}
                      </p>
                      {summary.organization && (
                        <p className="text-xs text-muted-foreground truncate">
                          {summary.organization} {summary.title ? `• ${summary.title}` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Badge */}
                    {isSelected ? (
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                        Will be kept
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-500 text-[11px] font-semibold">
                        Will be removed
                      </Badge>
                    )}

                    {/* Checkbox Indicator */}
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-stone-300 dark:border-stone-600 bg-background"
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                {/* Numbers and Emails */}
                <div className="pl-10 space-y-1 text-xs text-muted-foreground">
                  {summary.phones.map((p, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-1.5 truncate">
                      <Phone className="h-3 w-3 shrink-0 text-stone-400" />
                      <span className="tabular-nums font-medium text-foreground">{p.value}</span>
                      {p.label && <span className="text-[10px] text-muted-foreground/75">({p.label})</span>}
                    </div>
                  ))}
                  {summary.emails.map((e, eIdx) => (
                    <div key={eIdx} className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 shrink-0 text-stone-400" />
                      <span className="truncate">{e.value}</span>
                    </div>
                  ))}
                  {!summary.phones.length && !summary.emails.length && (
                    <p className="text-[11px] italic text-muted-foreground/75">No phone or email listed</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2.5 border-t border-stone-200 dark:border-stone-800 p-3.5 sm:p-4 bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
          <Button variant="outline" size="sm" data-testid="select-keep-cancel" onClick={onClose}>
            Cancel
          </Button>

          <Button size="sm" onClick={handleConfirm} className="font-bold">
            <Check className="h-4 w-4 mr-1.5" />
            {noneSelected
              ? "Reset to pending (0 kept)"
              : allSelected
              ? `Keep all ${cards.length} contacts as-is`
              : `Keep ${selectedIds.size} selected contact${selectedIds.size === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
