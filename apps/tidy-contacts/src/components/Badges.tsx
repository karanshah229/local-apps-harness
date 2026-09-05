import {
  CircleAlert,
  Globe,
  Mail,
  MapPin,
  Merge,
  Phone,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import type { QualityCode } from "../lib/vcard";

export const QUALITY_LABELS: Record<QualityCode, string> = {
  "missing-name": "Missing name",
  "no-contact-details": "No phone or email",
  "short-phone": "Unusually short phone",
  "invalid-phone-format": "Invalid phone format",
  "invalid-email": "Invalid email syntax",
  "name-is-phone": "Name is phone number",
  "dummy-name": "Placeholder / dummy name",
  "internal-duplicate-details": "Duplicate numbers/emails",
  "email-domain-typo": "Email domain typo",
  "corrupted-text": "Corrupted text encoding",
  "invalid-url": "Broken website URL",
  "empty-address": "Empty address line",
};

export function MatchReasonBadge({ reason, className }: { reason: string; className?: string }) {
  const lower = reason.toLowerCase();

  if (lower.includes("phone")) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-sky-300/80 bg-sky-50/90 text-sky-900 dark:border-sky-800/80 dark:bg-sky-950/60 dark:text-sky-200",
          className
        )}
      >
        <Phone className="mr-1 h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
        {reason}
      </Badge>
    );
  }

  if (lower.includes("email")) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-violet-300/80 bg-violet-50/90 text-violet-900 dark:border-violet-800/80 dark:bg-violet-950/60 dark:text-violet-200",
          className
        )}
      >
        <Mail className="mr-1 h-3 w-3 text-violet-600 dark:text-violet-400 shrink-0" />
        {reason}
      </Badge>
    );
  }

  if (lower.includes("transposed")) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-orange-300/80 bg-orange-50/90 text-orange-900 dark:border-orange-800/80 dark:bg-orange-950/60 dark:text-orange-200",
          className
        )}
      >
        <RotateCcw className="mr-1 h-3 w-3 text-orange-600 dark:text-orange-400 shrink-0" />
        {reason}
      </Badge>
    );
  }

  if (lower.includes("nickname")) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-pink-300/80 bg-pink-50/90 text-pink-900 dark:border-pink-800/80 dark:bg-pink-950/60 dark:text-pink-200",
          className
        )}
      >
        <Sparkles className="mr-1 h-3 w-3 text-pink-600 dark:text-pink-400 shrink-0" />
        {reason}
      </Badge>
    );
  }

  if (lower.includes("similar") || lower.includes("variation") || lower.includes("fuzzy")) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-teal-300/80 bg-teal-50/90 text-teal-900 dark:border-teal-800/80 dark:bg-teal-950/60 dark:text-teal-200",
          className
        )}
      >
        <Sparkles className="mr-1 h-3 w-3 text-teal-600 dark:text-teal-400 shrink-0" />
        {reason}
      </Badge>
    );
  }

  // Name match or general fallback
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-300/80 bg-amber-50/90 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200",
        className
      )}
    >
      <User className="mr-1 h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
      {reason}
    </Badge>
  );
}

export function QualityIssueBadge({ code, className }: { code: QualityCode; className?: string }) {
  const label = QUALITY_LABELS[code] || code;

  switch (code) {
    case "missing-name":
    case "dummy-name":
    case "name-is-phone":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-amber-300/80 bg-amber-50/90 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200",
            className
          )}
        >
          <User className="mr-1 h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
          {label}
        </Badge>
      );

    case "short-phone":
    case "invalid-phone-format":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-sky-300/80 bg-sky-50/90 text-sky-900 dark:border-sky-800/80 dark:bg-sky-950/60 dark:text-sky-200",
            className
          )}
        >
          <Phone className="mr-1 h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
          {label}
        </Badge>
      );

    case "invalid-email":
    case "email-domain-typo":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-violet-300/80 bg-violet-50/90 text-violet-900 dark:border-violet-800/80 dark:bg-violet-950/60 dark:text-violet-200",
            className
          )}
        >
          <Mail className="mr-1 h-3 w-3 text-violet-600 dark:text-violet-400 shrink-0" />
          {label}
        </Badge>
      );

    case "internal-duplicate-details":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-indigo-300/80 bg-indigo-50/90 text-indigo-900 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-200",
            className
          )}
        >
          <Merge className="mr-1 h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
          {label}
        </Badge>
      );

    case "no-contact-details":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-slate-300/80 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
            className
          )}
        >
          <CircleAlert className="mr-1 h-3 w-3 text-slate-500 dark:text-slate-400 shrink-0" />
          {label}
        </Badge>
      );

    case "corrupted-text":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-rose-300/80 bg-rose-50/90 text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-200",
            className
          )}
        >
          <Sparkles className="mr-1 h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
          {label}
        </Badge>
      );

    case "invalid-url":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-teal-300/80 bg-teal-50/90 text-teal-900 dark:border-teal-800/80 dark:bg-teal-950/60 dark:text-teal-200",
            className
          )}
        >
          <Globe className="mr-1 h-3 w-3 text-teal-600 dark:text-teal-400 shrink-0" />
          {label}
        </Badge>
      );

    case "empty-address":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-stone-300/80 bg-stone-100 text-stone-800 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300",
            className
          )}
        >
          <MapPin className="mr-1 h-3 w-3 text-stone-500 dark:text-stone-400 shrink-0" />
          {label}
        </Badge>
      );

    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-amber-300/80 bg-amber-50/90 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200",
            className
          )}
        >
          <CircleAlert className="mr-1 h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
          {label}
        </Badge>
      );
  }
}
