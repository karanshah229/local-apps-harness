import { useEffect, useState } from "react";
import { Check, Mail, Phone, UserCheck, X } from "lucide-react";
import { Button } from "./ui/button";
import { summarizeContact, type ContactCard } from "../lib/vcard";
import { cn } from "../lib/utils";

interface SelectKeepDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cards: ContactCard[];
  initialSelectedId?: string;
  onSelect: (selectedCard: ContactCard) => void;
}

export function SelectKeepDialog({
  isOpen,
  onClose,
  cards,
  initialSelectedId,
  onSelect,
}: SelectKeepDialogProps) {
  const [selectedId, setSelectedId] = useState<string>(initialSelectedId || cards[0]?.id || "");

  useEffect(() => {
    if (isOpen) {
      setSelectedId(initialSelectedId || cards[0]?.id || "");
    }
  }, [isOpen, initialSelectedId, cards]);

  if (!isOpen || !cards.length) return null;

  const handleConfirm = () => {
    const chosen = cards.find((c) => c.id === selectedId) || cards[0];
    if (chosen) {
      onSelect(chosen);
      onClose();
    }
  };

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
                Select & Keep 1 Contact
              </h2>
              <p className="text-xs text-muted-foreground">
                Keep 1 contact and discard the other {cards.length - 1} matching contacts.
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

        {/* Scrollable contact options list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {cards.map((card, idx) => {
            const summary = summarizeContact(card);
            const isSelected = card.id === selectedId;

            return (
              <div
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(card.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(card.id);
                  }
                }}
                className={cn(
                  "relative flex flex-col gap-2 rounded-xl border p-3.5 transition-all text-left cursor-pointer",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-xs"
                    : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-card"
                )}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                      )}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate text-stone-900 dark:text-stone-100">
                        {summary.name || "Unnamed contact"}
                      </p>
                      {summary.organization && (
                        <p className="text-xs text-muted-foreground truncate">
                          {summary.organization} {summary.title ? `• ${summary.title}` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Radio Indicator */}
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all mt-0.5",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-stone-300 dark:border-stone-600"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
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
        <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 dark:border-stone-800 p-3.5 sm:p-4 bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
          <Button variant="outline" size="sm" data-testid="select-keep-cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} className="font-bold">
            <Check className="h-4 w-4 mr-1.5" /> Keep only this contact
          </Button>
        </div>
      </div>
    </div>
  );
}
