import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  Check,
  Mail,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  createEditedContact,
  summarizeContact,
  type ContactCard,
} from "../lib/vcard";

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: ContactCard | null;
  onSave?: (updatedCard: ContactCard) => void;
}

export function ContactDetailModal({
  isOpen,
  onClose,
  card,
  onSave,
}: ContactDetailModalProps) {
  if (!isOpen || !card) return null;

  const summary = summarizeContact(card);

  const [name, setName] = useState(summary.name);
  const [organization, setOrganization] = useState(summary.organization);
  const [title, setTitle] = useState(summary.title);
  const [phones, setPhones] = useState<Array<{ value: string; label: string }>>(
    summary.phones.length > 0
      ? summary.phones.map((p) => ({ value: p.value, label: p.label || "Mobile" }))
      : []
  );
  const [emails, setEmails] = useState<Array<{ value: string; label: string }>>(
    summary.emails.length > 0
      ? summary.emails.map((e) => ({ value: e.value, label: e.label || "Work" }))
      : []
  );

  useEffect(() => {
    if (card) {
      const s = summarizeContact(card);
      setName(s.name);
      setOrganization(s.organization);
      setTitle(s.title);
      setPhones(
        s.phones.length > 0
          ? s.phones.map((p) => ({ value: p.value, label: p.label || "Mobile" }))
          : []
      );
      setEmails(
        s.emails.length > 0
          ? s.emails.map((e) => ({ value: e.value, label: e.label || "Work" }))
          : []
      );
    }
  }, [card]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handlePhoneValueChange = (index: number, val: string) => {
    const next = [...phones];
    next[index] = { ...next[index], value: val };
    setPhones(next);
  };

  const handlePhoneLabelChange = (index: number, label: string) => {
    const next = [...phones];
    next[index] = { ...next[index], label };
    setPhones(next);
  };

  const handleRemovePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
  };

  const handleAddPhone = () => {
    setPhones([...phones, { value: "", label: "Mobile" }]);
  };

  const handleEmailValueChange = (index: number, val: string) => {
    const next = [...emails];
    next[index] = { ...next[index], value: val };
    setEmails(next);
  };

  const handleEmailLabelChange = (index: number, label: string) => {
    const next = [...emails];
    next[index] = { ...next[index], label };
    setEmails(next);
  };

  const handleRemoveEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleAddEmail = () => {
    setEmails([...emails, { value: "", label: "Work" }]);
  };

  const handleSave = () => {
    const updated = createEditedContact(card, {
      name,
      organization,
      title,
      phones: phones.filter((p) => p.value.trim() !== ""),
      emails: emails.filter((e) => e.value.trim() !== ""),
    });
    if (onSave) {
      onSave(updated);
    }
    onClose();
  };

  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-detail-title"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl border border-stone-200 dark:border-stone-800 bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 p-4 sm:p-5 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold">
              {summary.photoDataUrl ? (
                <img
                  src={summary.photoDataUrl}
                  alt=""
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <h2 id="contact-detail-title" className="font-display text-base sm:text-lg font-bold">
                Contact Details
              </h2>
              <p className="text-xs text-muted-foreground">
                View and edit all information stored for this contact.
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

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <User className="h-3.5 w-3.5 text-primary" /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact Name"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-background px-3.5 py-2.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Job Title & Organization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5 text-primary" /> Job Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Director"
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-background px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Company / Organization
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Company Name"
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-background px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-primary" /> Phone Numbers
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] font-medium text-primary hover:text-primary/80 hover:bg-primary/10"
                onClick={handleAddPhone}
              >
                <Plus className="h-3 w-3 mr-1" /> Add phone
              </Button>
            </div>

            {phones.length > 0 ? (
              <div className="space-y-2">
                {phones.map((phone, idx) => (
                  <div
                    key={`detail-phone-${idx}`}
                    className="flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 p-2 border border-stone-200 dark:border-stone-800"
                  >
                    <input
                      type="tel"
                      value={phone.value}
                      onChange={(e) => handlePhoneValueChange(idx, e.target.value)}
                      placeholder="Phone number"
                      className="min-w-0 flex-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-background px-3 py-1.5 text-xs sm:text-sm font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <select
                      value={phone.label}
                      onChange={(e) => handlePhoneLabelChange(idx, e.target.value)}
                      className="h-8 rounded-lg border border-stone-200 dark:border-stone-700 bg-background px-2 text-xs text-muted-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="Mobile">Mobile</option>
                      <option value="Work">Work</option>
                      <option value="Home">Home</option>
                      <option value="Main">Main</option>
                      <option value="Other">Other</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemovePhone(idx)}
                      title="Remove phone"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 p-3 text-xs text-muted-foreground text-center">
                No phone numbers found.
              </p>
            )}
          </div>

          {/* Email Addresses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-primary" /> Email Addresses
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] font-medium text-primary hover:text-primary/80 hover:bg-primary/10"
                onClick={handleAddEmail}
              >
                <Plus className="h-3 w-3 mr-1" /> Add email
              </Button>
            </div>

            {emails.length > 0 ? (
              <div className="space-y-2">
                {emails.map((email, idx) => (
                  <div
                    key={`detail-email-${idx}`}
                    className="flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 p-2 border border-stone-200 dark:border-stone-800"
                  >
                    <input
                      type="email"
                      value={email.value}
                      onChange={(e) => handleEmailValueChange(idx, e.target.value)}
                      placeholder="Email address"
                      className="min-w-0 flex-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-background px-3 py-1.5 text-xs sm:text-sm font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <select
                      value={email.label}
                      onChange={(e) => handleEmailLabelChange(idx, e.target.value)}
                      className="h-8 rounded-lg border border-stone-200 dark:border-stone-700 bg-background px-2 text-xs text-muted-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="Work">Work</option>
                      <option value="Home">Home</option>
                      <option value="Other">Other</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveEmail(idx)}
                      title="Remove email"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 p-3 text-xs text-muted-foreground text-center">
                No email addresses found.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 dark:border-stone-800 p-4 sm:p-5 bg-stone-50/50 dark:bg-stone-900/50">
          <Button variant="ghost" size="sm" data-testid="contact-detail-cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm" onClick={handleSave}>
            <Check className="h-4 w-4" /> Save Details
          </Button>
        </div>
      </div>
    </div>
  );
}
