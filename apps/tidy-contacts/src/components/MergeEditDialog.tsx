import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  Check,
  Image as ImageIcon,
  Mail,
  Merge,
  Phone,
  User,
  X,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  createCustomMergedContact,
  summarizeContact,
  type ContactCard,
} from "../lib/vcard";

interface MergeEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cards?: ContactCard[];
  leftCard?: ContactCard;
  rightCard?: ContactCard;
  onSave: (customCard: ContactCard) => void;
}

const ORDINAL_NAMES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

export function MergeEditDialog({
  isOpen,
  onClose,
  cards: propCards,
  leftCard,
  rightCard,
  onSave,
}: MergeEditDialogProps) {
  const cards = useMemo(() => {
    if (propCards && propCards.length > 0) return propCards;
    return [leftCard, rightCard].filter(Boolean) as ContactCard[];
  }, [propCards, leftCard, rightCard]);

  const summaries = useMemo(() => cards.map((c) => summarizeContact(c)), [cards]);

  // Initial form states
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [title, setTitle] = useState("");
  const [photoChoice, setPhotoChoice] = useState<string>("left");
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  // Collect all unique phones across all cards with origin indicators
  const allPhones = useMemo(() => {
    const map = new Map<string, { value: string; label: string; origins: string[] }>();
    summaries.forEach((summary, index) => {
      const originLabel = ORDINAL_NAMES[index] || `#${index + 1}`;
      for (const phone of summary.phones) {
        const existing = map.get(phone.value);
        if (existing) {
          if (!existing.origins.includes(originLabel)) {
            existing.origins.push(originLabel);
          }
        } else {
          map.set(phone.value, { ...phone, origins: [originLabel] });
        }
      }
    });
    return Array.from(map.values());
  }, [summaries]);

  // Collect all unique emails across all cards with origin indicators
  const allEmails = useMemo(() => {
    const map = new Map<string, { value: string; label: string; origins: string[] }>();
    summaries.forEach((summary, index) => {
      const originLabel = ORDINAL_NAMES[index] || `#${index + 1}`;
      for (const email of summary.emails) {
        const key = email.value.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          if (!existing.origins.includes(originLabel)) {
            existing.origins.push(originLabel);
          }
        } else {
          map.set(key, { ...email, origins: [originLabel] });
        }
      }
    });
    return Array.from(map.values());
  }, [summaries]);

  // Reset/populate form when modal opens or cards change
  useEffect(() => {
    if (isOpen && cards.length > 0) {
      const initialName = summaries.find((s) => s.name)?.name || "";
      const initialOrg = summaries.find((s) => s.organization)?.organization || "";
      const initialTitle = summaries.find((s) => s.title)?.title || "";
      const firstPhotoIndex = summaries.findIndex((s) => Boolean(s.photoDataUrl));

      setName(initialName);
      setOrganization(initialOrg);
      setTitle(initialTitle);
      setPhotoChoice(firstPhotoIndex >= 0 ? cards[firstPhotoIndex].id : "none");
      setSelectedPhones(allPhones.map((p) => p.value));
      setSelectedEmails(allEmails.map((e) => e.value));
    }
  }, [isOpen, cards, summaries, allPhones, allEmails]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || cards.length === 0) return null;

  const togglePhone = (value: string) => {
    setSelectedPhones((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleEmail = (value: string) => {
    setSelectedEmails((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSave = () => {
    const customCard = createCustomMergedContact(cards, {
      name,
      organization,
      title,
      selectedPhoneValues: selectedPhones,
      selectedEmailValues: selectedEmails,
      photoChoice,
    });
    onSave(customCard);
  };

  const photosAvailable = summaries.some((s) => Boolean(s.photoDataUrl));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-edit-title"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-stone-200 dark:border-stone-800 bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200 dark:border-stone-800 p-4 sm:p-5 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Merge className="h-5 w-5" />
            </div>
            <div>
              <h2 id="merge-edit-title" className="font-display text-lg sm:text-xl font-bold">
                Merge & Edit Contact
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {cards.length > 2
                  ? `Customize details across all ${cards.length} matching contacts before saving.`
                  : "Customize the final details before saving the merge."}
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Name Section */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <User className="h-3.5 w-3.5 text-primary" /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Patel"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-background px-3.5 py-2.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {/* Quick Chips for Names from all cards */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">Quick pick:</span>
              {summaries.map((s, idx) => {
                if (!s.name) return null;
                const label = ORDINAL_NAMES[idx] || `#${idx + 1}`;
                const isCurrent = name === s.name;
                return (
                  <button
                    key={`${s.name}-${idx}`}
                    type="button"
                    onClick={() => setName(s.name)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors text-left truncate max-w-[200px] ${
                      isCurrent
                        ? "border-primary bg-emerald-50 dark:bg-emerald-950/40 text-primary font-semibold ring-1 ring-primary"
                        : "border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800/60 hover:border-primary"
                    }`}
                  >
                    <span className="font-semibold text-primary mr-1">{label}:</span> {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Section (if any card has photo) */}
          {photosAvailable && (
            <div className="space-y-2 rounded-xl border border-stone-200 dark:border-stone-800 p-3.5 bg-stone-50/50 dark:bg-stone-900/30">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5 text-primary" /> Profile Photo
              </label>
              <div className="flex flex-wrap gap-3 pt-1">
                {cards.map((card, idx) => {
                  const summary = summaries[idx];
                  if (!summary.photoDataUrl) return null;
                  const label = ORDINAL_NAMES[idx] || `#${idx + 1}`;
                  const isSelected = photoChoice === card.id || (idx === 0 && photoChoice === "left") || (idx === 1 && photoChoice === "right");
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setPhotoChoice(card.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-medium transition-all ${
                        isSelected
                          ? "border-primary bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-primary"
                          : "border-stone-200 dark:border-stone-700 bg-background"
                      }`}
                    >
                      <img src={summary.photoDataUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      <span>{label} Contact Photo</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPhotoChoice("none")}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                    photoChoice === "none"
                      ? "border-primary bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-primary"
                      : "border-stone-200 dark:border-stone-700 bg-background text-muted-foreground"
                  }`}
                >
                  <span>No Photo</span>
                  {photoChoice === "none" && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              </div>
            </div>
          )}

          {/* Organization & Job Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Company / Org
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-background px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5 text-primary" /> Job Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Managing Director"
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-background px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Phone Numbers Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-primary" /> Phone Numbers ({selectedPhones.length}/{allPhones.length} included)
              </label>
              <span className="text-[11px] text-muted-foreground">Uncheck to remove</span>
            </div>

            {allPhones.length ? (
              <div className="space-y-1.5">
                {allPhones.map((phone) => {
                  const isChecked = selectedPhones.includes(phone.value);
                  return (
                    <div
                      key={phone.value}
                      onClick={() => togglePhone(phone.value)}
                      className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border p-2.5 text-xs sm:text-sm transition-all ${
                        isChecked
                          ? "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/60"
                          : "border-stone-200 dark:border-stone-800 bg-stone-100/40 dark:bg-stone-950/40 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePhone(phone.value)}
                          className="h-4 w-4 rounded text-primary focus:ring-primary accent-primary"
                        />
                        <span className={`break-all font-medium ${!isChecked ? "line-through text-muted-foreground" : ""}`}>
                          {phone.value}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px]">{phone.label}</Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {phone.origins.length === summaries.length && summaries.length > 2
                            ? "All"
                            : phone.origins.join(", ")}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 p-3 text-xs text-muted-foreground text-center">
                No phone numbers found on these contacts.
              </p>
            )}
          </div>

          {/* Email Addresses Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-primary" /> Email Addresses ({selectedEmails.length}/{allEmails.length} included)
              </label>
              <span className="text-[11px] text-muted-foreground">Uncheck to remove</span>
            </div>

            {allEmails.length ? (
              <div className="space-y-1.5">
                {allEmails.map((email) => {
                  const isChecked = selectedEmails.includes(email.value);
                  return (
                    <div
                      key={email.value}
                      onClick={() => toggleEmail(email.value)}
                      className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border p-2.5 text-xs sm:text-sm transition-all ${
                        isChecked
                          ? "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/60"
                          : "border-stone-200 dark:border-stone-800 bg-stone-100/40 dark:bg-stone-950/40 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEmail(email.value)}
                          className="h-4 w-4 rounded text-primary focus:ring-primary accent-primary"
                        />
                        <span className={`break-all font-medium ${!isChecked ? "line-through text-muted-foreground" : ""}`}>
                          {email.value}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px]">{email.label}</Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {email.origins.length === summaries.length && summaries.length > 2
                            ? "All"
                            : email.origins.join(", ")}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 p-3 text-xs text-muted-foreground text-center">
                No email addresses found on these contacts.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-stone-200 dark:border-stone-800 p-4 sm:p-5 bg-stone-50/50 dark:bg-stone-900/50">
          <Button variant="ghost" size="sm" data-testid="merge-edit-cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm" onClick={handleSave}>
            <Check className="h-4 w-4" /> Save & Merge
          </Button>
        </div>
      </div>
    </div>
  );
}
