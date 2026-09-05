import { useEffect, useState } from "react";
import { Mail, Phone, Plus, Trash2, Building2, Briefcase } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import {
  createEditedContact,
  summarizeContact,
  type ContactCard,
  type QualityCode,
  type QualityDecision,
} from "../lib/vcard";

import { QualityIssueBadge } from "./Badges";

interface EditableQualityCardProps {
  card: ContactCard;
  qualityCodes?: QualityCode[];
  currentDecision?: QualityDecision;
  onChange: (updatedCard: ContactCard) => void;
}

function Initials({ name }: { name: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";
  return <span aria-hidden="true">{initials}</span>;
}

export function EditableQualityCard({
  card,
  qualityCodes = [],
  currentDecision,
  onChange,
}: EditableQualityCardProps) {
  const baseSummary = summarizeContact(card);

  // Initialize from custom card if already edited, otherwise from base card
  const effectiveCard =
    typeof currentDecision === "object" && currentDecision.choice === "edit"
      ? currentDecision.customCard
      : card;

  const effectiveSummary = summarizeContact(effectiveCard);

  const [name, setName] = useState(effectiveSummary.name);
  const [organization, setOrganization] = useState(effectiveSummary.organization);
  const [title, setTitle] = useState(effectiveSummary.title);
  const [phones, setPhones] = useState<Array<{ value: string; label: string }>>(
    effectiveSummary.phones.length > 0
      ? effectiveSummary.phones.map((p) => ({ value: p.value, label: p.label || "Mobile" }))
      : []
  );
  const [emails, setEmails] = useState<Array<{ value: string; label: string }>>(
    effectiveSummary.emails.length > 0
      ? effectiveSummary.emails.map((e) => ({ value: e.value, label: e.label || "Work" }))
      : []
  );

  // Sync state when card or decision changes
  useEffect(() => {
    const nextSummary = summarizeContact(effectiveCard);
    setName(nextSummary.name);
    setOrganization(nextSummary.organization);
    setTitle(nextSummary.title);
    setPhones(
      nextSummary.phones.length > 0
        ? nextSummary.phones.map((p) => ({ value: p.value, label: p.label || "Mobile" }))
        : []
    );
    setEmails(
      nextSummary.emails.length > 0
        ? nextSummary.emails.map((e) => ({ value: e.value, label: e.label || "Work" }))
        : []
    );
  }, [card.id, currentDecision]);

  const emitChange = (
    nextName: string,
    nextOrg: string,
    nextTitle: string,
    nextPhones: Array<{ value: string; label: string }>,
    nextEmails: Array<{ value: string; label: string }>
  ) => {
    const updated = createEditedContact(card, {
      name: nextName,
      organization: nextOrg,
      title: nextTitle,
      phones: nextPhones,
      emails: nextEmails,
    });
    onChange(updated);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    emitChange(val, organization, title, phones, emails);
  };

  const handleOrgChange = (val: string) => {
    setOrganization(val);
    emitChange(name, val, title, phones, emails);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    emitChange(name, organization, val, phones, emails);
  };

  const handlePhoneValueChange = (index: number, val: string) => {
    const updated = [...phones];
    updated[index] = { ...updated[index], value: val };
    setPhones(updated);
    emitChange(name, organization, title, updated, emails);
  };

  const handlePhoneLabelChange = (index: number, label: string) => {
    const updated = [...phones];
    updated[index] = { ...updated[index], label };
    setPhones(updated);
    emitChange(name, organization, title, updated, emails);
  };

  const handleRemovePhone = (index: number) => {
    const updated = phones.filter((_, i) => i !== index);
    setPhones(updated);
    emitChange(name, organization, title, updated, emails);
  };

  const handleAddPhone = () => {
    const updated = [...phones, { value: "", label: "Mobile" }];
    setPhones(updated);
    emitChange(name, organization, title, updated, emails);
  };

  const handleEmailValueChange = (index: number, val: string) => {
    const updated = [...emails];
    updated[index] = { ...updated[index], value: val };
    setEmails(updated);
    emitChange(name, organization, title, phones, updated);
  };

  const handleEmailLabelChange = (index: number, label: string) => {
    const updated = [...emails];
    updated[index] = { ...updated[index], label };
    setEmails(updated);
    emitChange(name, organization, title, phones, updated);
  };

  const handleRemoveEmail = (index: number) => {
    const updated = emails.filter((_, i) => i !== index);
    setEmails(updated);
    emitChange(name, organization, title, phones, updated);
  };

  const handleAddEmail = () => {
    const updated = [...emails, { value: "", label: "Work" }];
    setEmails(updated);
    emitChange(name, organization, title, phones, updated);
  };

  return (
    <Card className="min-w-0 overflow-hidden border-stone-200 dark:border-stone-800 shadow-none bg-card">
      <div className="h-1.5 bg-primary" />
      <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4 space-y-3">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl bg-secondary text-base sm:text-lg font-bold text-secondary-foreground">
            {baseSummary.photoDataUrl ? (
              <img src={baseSummary.photoDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Initials name={name || "Unnamed"} />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Contact Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Contact name"
                className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 px-3 py-1.5 text-base sm:text-lg font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Title & Organization inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-0.5">
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Briefcase className="h-3 w-3" /> Job Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Manager"
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 px-2.5 py-1.5 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Building2 className="h-3 w-3" /> Organization
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => handleOrgChange(e.target.value)}
              placeholder="e.g. Company name"
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 px-2.5 py-1.5 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {qualityCodes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 sm:pt-2">
            {qualityCodes.map((code) => (
              <QualityIssueBadge key={code} code={code} className="text-xs" />
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        {/* Phone Numbers Section */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Phone numbers</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] font-medium text-primary hover:text-primary/80 hover:bg-primary/10"
              onClick={handleAddPhone}
            >
              <Plus className="h-3 w-3 mr-1" /> Add number
            </Button>
          </div>

          {phones.length > 0 ? (
            <div className="space-y-2">
              {phones.map((phone, idx) => (
                <div
                  key={`phone-${idx}`}
                  className="flex items-center gap-2 rounded-lg bg-stone-50 dark:bg-stone-900/60 p-1.5 sm:p-2 border border-stone-100 dark:border-stone-800/80"
                >
                  <input
                    type="tel"
                    value={phone.value}
                    onChange={(e) => handlePhoneValueChange(idx, e.target.value)}
                    placeholder="Enter phone number"
                    className="min-w-0 flex-1 rounded-md border border-stone-200 dark:border-stone-700 bg-background px-2.5 py-1 text-xs sm:text-sm font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <select
                    value={phone.label}
                    onChange={(e) => handlePhoneLabelChange(idx, e.target.value)}
                    className="h-7 sm:h-8 rounded-md border border-stone-200 dark:border-stone-700 bg-background px-1.5 sm:px-2 text-[11px] sm:text-xs text-muted-foreground focus:border-primary focus:outline-none"
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
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemovePhone(idx)}
                    title="Remove this phone number"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-stone-200 dark:border-stone-800 px-3 py-2 text-xs text-muted-foreground">
              <span>No phone numbers</span>
              <button
                type="button"
                onClick={handleAddPhone}
                className="text-primary hover:underline font-medium"
              >
                + Add phone
              </button>
            </div>
          )}
        </section>

        {/* Email Addresses Section */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Email addresses</span>
            </div>
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
                  key={`email-${idx}`}
                  className="flex items-center gap-2 rounded-lg bg-stone-50 dark:bg-stone-900/60 p-1.5 sm:p-2 border border-stone-100 dark:border-stone-800/80"
                >
                  <input
                    type="email"
                    value={email.value}
                    onChange={(e) => handleEmailValueChange(idx, e.target.value)}
                    placeholder="Enter email address"
                    className="min-w-0 flex-1 rounded-md border border-stone-200 dark:border-stone-700 bg-background px-2.5 py-1 text-xs sm:text-sm font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <select
                    value={email.label}
                    onChange={(e) => handleEmailLabelChange(idx, e.target.value)}
                    className="h-7 sm:h-8 rounded-md border border-stone-200 dark:border-stone-700 bg-background px-1.5 sm:px-2 text-[11px] sm:text-xs text-muted-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="Work">Work</option>
                    <option value="Home">Home</option>
                    <option value="Other">Other</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveEmail(idx)}
                    title="Remove this email address"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-stone-200 dark:border-stone-800 px-3 py-2 text-xs text-muted-foreground">
              <span>No email addresses</span>
              <button
                type="button"
                onClick={handleAddEmail}
                className="text-primary hover:underline font-medium"
              >
                + Add email
              </button>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
