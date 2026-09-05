export type VCardProperty = {
  lines: string[];
  logical: string;
  key: string;
  params: string[];
  value: string;
};

export type ContactCard = {
  id: string;
  sourceIndex: number;
  properties: VCardProperty[];
};

export type ContactSummary = {
  name: string;
  phones: Array<{ value: string; label: string }>;
  emails: Array<{ value: string; label: string }>;
  organization: string;
  title: string;
  photoDataUrl?: string;
};

export type QualityCode =
  | "missing-name"
  | "no-contact-details"
  | "short-phone"
  | "invalid-phone-format"
  | "invalid-email"
  | "name-is-phone"
  | "dummy-name"
  | "internal-duplicate-details"
  | "email-domain-typo"
  | "corrupted-text"
  | "invalid-url"
  | "empty-address";

export type QualityIssue = {
  cardId: string;
  codes: QualityCode[];
};

export type DuplicateGroup = {
  id: string;
  cardIds: string[];
  reasons: string[];
};

export type DuplicateDecision = {
  choice: "left" | "merge" | "right" | "keep-subset";
  preferredCardId?: string;
  customCard?: ContactCard;
  keptCardIds?: string[];
};

export type QualityDecision =
  | "keep"
  | "fix"
  | "remove"
  | { choice: "edit"; customCard: ContactCard };

export function getQualityChoice(decision: QualityDecision | undefined): "keep" | "fix" | "remove" | "edit" | undefined {
  if (!decision) return undefined;
  if (typeof decision === "string") return decision;
  return decision.choice;
}

export type ContactAnalysis = {
  duplicateGroups: DuplicateGroup[];
  qualityIssues: QualityIssue[];
  duplicateUnits: number;
};

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function makeProperty(lines: string[]): VCardProperty {
  let logical = lines[0] ?? "";
  const isQuotedPrintable = logical.split(":", 1)[0].toUpperCase().includes("ENCODING=QUOTED-PRINTABLE");
  for (const line of lines.slice(1)) {
    if (isQuotedPrintable && logical.endsWith("=")) logical = logical.slice(0, -1) + line.replace(/^[ \t]/, "");
    else logical += line.replace(/^[ \t]/, "");
  }
  const colon = logical.indexOf(":");
  const left = colon >= 0 ? logical.slice(0, colon) : logical;
  const value = colon >= 0 ? logical.slice(colon + 1) : "";
  const [rawName, ...params] = left.split(";");
  const key = (rawName.split(".").pop() ?? rawName).toUpperCase();
  return { lines, logical, key, params, value };
}

function propertiesFromLines(lines: string[]) {
  const grouped: string[][] = [];
  for (const line of lines) {
    const previous = grouped.at(-1);
    const previousHead = previous?.[0]?.split(":", 1)[0].toUpperCase() ?? "";
    const quotedPrintableContinuation =
      previous && previousHead.includes("ENCODING=QUOTED-PRINTABLE") && previous.join("").endsWith("=");
    if (previous && (/^[ \t]/.test(line) || quotedPrintableContinuation)) previous.push(line);
    else grouped.push([line]);
  }
  return grouped.map(makeProperty);
}

export function parseVcf(source: string): ContactCard[] {
  const physicalLines = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const cards: ContactCard[] = [];
  let current: string[] | null = null;

  for (const line of physicalLines) {
    const marker = line.trim().toUpperCase();
    if (marker === "BEGIN:VCARD") {
      if (current) throw new Error("A contact starts before the previous contact ends.");
      current = [];
    } else if (marker === "END:VCARD") {
      if (!current) throw new Error("A contact ends before it starts.");
      const sourceIndex = cards.length;
      cards.push({ id: `contact-${sourceIndex}`, sourceIndex, properties: propertiesFromLines(current) });
      current = null;
    } else if (current) {
      current.push(line);
    }
  }

  if (current) throw new Error("The final contact is incomplete.");
  if (!cards.length) throw new Error("No contacts were found in this VCF file.");
  return cards;
}

function decodeQuotedPrintable(value: string, charset: string) {
  const cleaned = value.replace(/=\r?\n/g, "").replace(/=$/g, "");
  const bytes: number[] = [];
  for (let index = 0; index < cleaned.length; index += 1) {
    if (cleaned[index] === "=" && /^[0-9A-F]{2}$/i.test(cleaned.slice(index + 1, index + 3))) {
      bytes.push(Number.parseInt(cleaned.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(cleaned.charCodeAt(index));
    }
  }
  try {
    return new TextDecoder(charset || "utf-8").decode(new Uint8Array(bytes));
  } catch {
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  }
}

function displayValue(property: VCardProperty) {
  const encoding = property.params.find((param) => param.toUpperCase().startsWith("ENCODING="));
  const charset = property.params.find((param) => param.toUpperCase().startsWith("CHARSET="));
  const decoded = encoding?.toUpperCase().includes("QUOTED-PRINTABLE")
    ? decodeQuotedPrintable(property.value, charset?.split("=")[1] ?? "utf-8")
    : property.value;
  return decoded
    .replace(/\\[nN]/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function values(card: ContactCard, key: string) {
  return card.properties.filter((property) => property.key === key).map(displayValue).filter(Boolean);
}

function labelFor(property: VCardProperty) {
  const known = property.params
    .flatMap((param) => param.replace(/^TYPE=/i, "").split(","))
    .map((param) => param.toUpperCase())
    .find((param) => ["CELL", "MOBILE", "HOME", "WORK", "MAIN", "FAX", "OTHER"].includes(param));
  if (!known) return "Other";
  return known === "CELL" ? "Mobile" : known[0] + known.slice(1).toLowerCase();
}

function structuredName(card: ContactCard) {
  const raw = values(card, "N")[0];
  if (!raw) return "";
  const [family = "", given = "", additional = "", prefix = "", suffix = ""] = raw.split(";");
  return [prefix, given, additional, family, suffix].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function summarizeContact(card: ContactCard, includePhoto = true): ContactSummary {
  const photo = card.properties.find((property) => property.key === "PHOTO");
  const photoType = photo?.params.join(";").toUpperCase().includes("PNG") ? "png" : "jpeg";
  const photoValue = photo?.value.replace(/\s/g, "");
  return {
    name: values(card, "FN")[0] || structuredName(card),
    phones: card.properties
      .filter((property) => property.key === "TEL")
      .map((property) => ({ value: displayValue(property), label: labelFor(property) }))
      .filter((phone) => phone.value),
    emails: card.properties
      .filter((property) => property.key === "EMAIL")
      .map((property) => ({ value: displayValue(property), label: labelFor(property) }))
      .filter((email) => email.value),
    organization: values(card, "ORG")[0]?.replace(/;/g, " · ") ?? "",
    title: values(card, "TITLE")[0] ?? "",
    photoDataUrl: includePhoto && photoValue && /^[A-Za-z0-9+/=]+$/.test(photoValue)
      ? `data:image/${photoType};base64,${photoValue}`
      : undefined,
  };
}

export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase();
}

const DUMMY_NAMES = new Set([
  "admin", "administrator", "unknown", "test", "testing", "me", "myself",
  "null", "none", "user", "contact", "no name", "noname", "temp", "temporary",
  "asdf", "qwerty", "xxx", "yyy", "zzz", "demo", "sample", "dot", "n/a", "na"
]);

export function isNameAPhoneNumber(name: string): boolean {
  const cleaned = name.trim();
  const digits = cleaned.replace(/\D/g, "");
  return digits.length >= 7 && /^[\d\s+\-()./]+$/.test(cleaned);
}

export function isDummyOrPunctuationName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (trimmed.length === 1) return true;
  if (/^[^a-zA-Z0-9\u0080-\uFFFF]+$/.test(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  return DUMMY_NAMES.has(lower);
}

export function hasInternalDuplicates(card: ContactCard): boolean {
  const seenPhones = new Set<string>();
  for (const prop of card.properties) {
    if (prop.key === "TEL") {
      const norm = normalizePhone(displayValue(prop));
      if (norm.length >= 5) {
        if (seenPhones.has(norm)) return true;
        seenPhones.add(norm);
      }
    }
  }
  const seenEmails = new Set<string>();
  for (const prop of card.properties) {
    if (prop.key === "EMAIL") {
      const norm = normalizeEmail(displayValue(prop));
      if (norm) {
        if (seenEmails.has(norm)) return true;
        seenEmails.add(norm);
      }
    }
  }
  return false;
}

export const EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmaik.com": "gmail.com",
  "gmeil.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahu.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yaho.co.in": "yahoo.co.in",
  "hotmial.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmali.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclud.com": "icloud.com",
  "icoud.com": "icloud.com",
  "iclaud.com": "icloud.com",
  "redifmail.com": "rediffmail.com",
  "rediff.com": "rediffmail.com",
};

export function hasEmailDomainTypo(email: string): string | undefined {
  const parts = email.split("@");
  if (parts.length !== 2) return undefined;
  const domain = parts[1].toLowerCase().trim();
  const correctedDomain = EMAIL_DOMAIN_TYPOS[domain];
  if (correctedDomain) {
    return `${parts[0]}@${correctedDomain}`;
  }
  return undefined;
}

export function isInvalidPhoneFormat(phoneStr: string): boolean {
  const digits = phoneStr.replace(/\D/g, "");
  if (!digits || digits.length < 7) return false;
  if (digits.length > 15) return true;

  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    if (!/^[6-9]\d{9}$/.test(local)) return true;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    const local = digits.slice(1);
    if (local.length === 10 && !/^[1-9]\d{9}$/.test(local)) return true;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    const npa = digits.slice(1, 4);
    const nxx = digits.slice(4, 7);
    if (npa[0] === "0" || npa[0] === "1" || nxx[0] === "0" || nxx[0] === "1") return true;
  }

  return false;
}

export const MOJIBAKE_REGEX = /Ã[\x80-\xBF]|â[\x80-\xBF][\x80-\xBF]|[\uFFFD]|\b=\b|[=][0-9A-Fa-f]{2}/;

export function hasCorruptedText(card: ContactCard): boolean {
  for (const prop of card.properties) {
    if (["FN", "N", "ORG", "TITLE", "NOTE"].includes(prop.key)) {
      const val = displayValue(prop);
      if (MOJIBAKE_REGEX.test(val)) return true;
    }
  }
  return false;
}

export function repairMojibake(text: string): string {
  try {
    const decoded = text.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    const bytes = new Uint8Array([...decoded].map((c) => c.charCodeAt(0) & 0xff));
    const utf8Decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (utf8Decoded && !utf8Decoded.includes("\uFFFD") && utf8Decoded.length < text.length) {
      return utf8Decoded;
    }
    return decoded.replace(/[\uFFFD]/g, "").trim();
  } catch {
    return text.replace(/[\uFFFD]/g, "").trim();
  }
}

export function hasInvalidUrl(card: ContactCard): boolean {
  for (const prop of card.properties) {
    if (prop.key === "URL") {
      const val = displayValue(prop).trim();
      if (val && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(val)) {
        return true;
      }
    }
  }
  return false;
}

export function hasEmptyAddress(card: ContactCard): boolean {
  for (const prop of card.properties) {
    if (prop.key === "ADR") {
      const val = displayValue(prop).replace(/[;\s]/g, "");
      if (!val) return true;
    }
  }
  return false;
}

export function repairUrl(url: string): string {
  let trimmed = url.trim();
  trimmed = trimmed
    .replace(/^htp:\/\//i, "http://")
    .replace(/^http\/\//i, "http://")
    .replace(/^https\/\//i, "https://");
  if (/^www\./i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

export const NICKNAMES: Record<string, string[]> = {
  alex: ["alexander", "alexandra", "alexis"],
  alexander: ["alex", "alec"],
  andy: ["andrew"],
  andrew: ["andy", "drew"],
  anthony: ["tony"],
  tony: ["anthony"],
  ben: ["benjamin", "benny"],
  benjamin: ["ben"],
  bill: ["william", "billy"],
  billy: ["william"],
  william: ["bill", "billy", "will", "willy", "liam"],
  bob: ["robert", "bobby"],
  bobby: ["robert"],
  robert: ["bob", "bobby", "rob", "robbie", "robby"],
  rob: ["robert", "robin"],
  chris: ["christopher", "christian", "christine", "christina"],
  christopher: ["chris"],
  dan: ["daniel", "danny"],
  daniel: ["dan", "danny"],
  dave: ["david"],
  david: ["dave"],
  dick: ["richard"],
  richard: ["dick", "rick", "ricky", "rich"],
  rick: ["richard"],
  greg: ["gregory"],
  gregory: ["greg"],
  james: ["jim", "jimmy", "jamie"],
  jim: ["james", "jimmy"],
  jimmy: ["james"],
  joe: ["joseph", "joey"],
  joseph: ["joe", "joey"],
  john: ["jack", "johnny", "jonathan", "jon"],
  jack: ["john"],
  matt: ["matthew"],
  matthew: ["matt"],
  mike: ["michael", "mickey"],
  michael: ["mike", "mick"],
  nick: ["nicholas", "nicolas"],
  nicholas: ["nick"],
  sam: ["samuel", "samantha"],
  samuel: ["sam", "sammy"],
  steve: ["steven", "stephen"],
  steven: ["steve"],
  stephen: ["steve"],
  tom: ["thomas", "tommy"],
  thomas: ["tom", "tommy"],
};

export function areNamesTransposed(name1: string, name2: string): boolean {
  const parts1 = name1.toLowerCase().split(/\s+/).filter(Boolean);
  const parts2 = name2.toLowerCase().split(/\s+/).filter(Boolean);
  if (parts1.length === 2 && parts2.length === 2) {
    return parts1[0] === parts2[1] && parts1[1] === parts2[0];
  }
  return false;
}

export function areNicknameVariants(name1: string, name2: string): boolean {
  const parts1 = name1.toLowerCase().split(/\s+/).filter(Boolean);
  const parts2 = name2.toLowerCase().split(/\s+/).filter(Boolean);
  if (parts1.length >= 2 && parts2.length >= 2) {
    const last1 = parts1[parts1.length - 1];
    const last2 = parts2[parts2.length - 1];
    if (last1 === last2) {
      const first1 = parts1[0];
      const first2 = parts2[0];
      if (NICKNAMES[first1]?.includes(first2) || NICKNAMES[first2]?.includes(first1)) {
        return true;
      }
    }
  }
  return false;
}

export function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;
  const d: number[][] = [];
  for (let i = 0; i <= s1.length; i++) d[i] = [i];
  for (let j = 0; j <= s2.length; j++) d[0][j] = j;
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[s1.length][s2.length];
}

export function isFuzzyNameMatch(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  if (!n1 || !n2 || n1 === n2) return false;
  if (n1.length < 5 || n2.length < 5) return false;
  if (Math.abs(n1.length - n2.length) > 2) return false;
  if (n1[0] !== n2[0]) return false;
  const dist = levenshteinDistance(n1, n2);
  const maxLen = Math.max(n1.length, n2.length);
  return (maxLen <= 7 && dist <= 1) || (maxLen > 7 && dist <= 2);
}

class DisjointSet {
  private readonly parent = new Map<string, string>();

  add(value: string) {
    if (!this.parent.has(value)) this.parent.set(value, value);
  }

  find(value: string): string {
    const parent = this.parent.get(value) ?? value;
    if (parent === value) return value;
    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(left: string, right: string) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) this.parent.set(rightRoot, leftRoot);
  }
}

export function analyzeContacts(cards: ContactCard[]): ContactAnalysis {
  const sets = new DisjointSet();
  const phones = new Map<string, Set<string>>();
  const emails = new Map<string, Set<string>>();
  const names = new Map<string, Set<string>>();
  const reasonsByCard = new Map<string, Set<string>>();

  // 1. Pre-compute contact summaries once in O(N)
  const summaries = cards.map((card) => {
    sets.add(card.id);
    return {
      card,
      summary: summarizeContact(card, false),
    };
  });

  // 2. Exact indexes for phones, emails, names
  for (const { card, summary } of summaries) {
    for (const phone of summary.phones) {
      const normalized = normalizePhone(phone.value);
      if (normalized.length >= 7) {
        const ids = phones.get(normalized) ?? new Set<string>();
        ids.add(card.id);
        phones.set(normalized, ids);
      }
    }
    for (const email of summary.emails) {
      const normalized = normalizeEmail(email.value);
      if (EMAIL_PATTERN.test(normalized)) {
        const ids = emails.get(normalized) ?? new Set<string>();
        ids.add(card.id);
        emails.set(normalized, ids);
      }
    }
    const normalizedName = summary.name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (normalizedName.length >= 4) {
      const ids = names.get(normalizedName) ?? new Set<string>();
      ids.add(card.id);
      names.set(normalizedName, ids);
    }
  }

  const recordMatch = (id1: string, id2: string, reason: string) => {
    if (id1 === id2) return;
    sets.union(id1, id2);
    const r1 = reasonsByCard.get(id1) ?? new Set<string>();
    r1.add(reason);
    reasonsByCard.set(id1, r1);
    const r2 = reasonsByCard.get(id2) ?? new Set<string>();
    r2.add(reason);
    reasonsByCard.set(id2, r2);
  };

  const joinMatches = (matches: Map<string, Set<string>>, reason: string) => {
    for (const ids of matches.values()) {
      const members = [...ids];
      if (members.length < 2) continue;
      for (let index = 1; index < members.length; index += 1) {
        sets.union(members[0], members[index]);
        recordMatch(members[0], members[index], reason);
      }
    }
  };
  joinMatches(phones, "Same phone number");
  joinMatches(emails, "Same email address");
  joinMatches(names, "Same full name");

  // 3. Fast indexed Transposed Names:
  // Key: sorted 2-word tokens (e.g., "john doe" and "doe john" both key to "doe john")
  const transposedIndex = new Map<string, Array<{ id: string; name: string }>>();
  for (const { card, summary } of summaries) {
    if (!summary.name) continue;
    const parts = summary.name.toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length === 2) {
      const key = [...parts].sort().join(" ");
      const list = transposedIndex.get(key) ?? [];
      list.push({ id: card.id, name: summary.name });
      transposedIndex.set(key, list);
    }
  }
  for (const list of transposedIndex.values()) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (areNamesTransposed(list[i].name, list[j].name)) {
          recordMatch(list[i].id, list[j].id, "Transposed name");
        }
      }
    }
  }

  // 4. Fast indexed Nickname Matching:
  // Key: last name token (e.g. "Smith"). Only compare within identical last name buckets!
  const byLastName = new Map<string, Array<{ id: string; name: string }>>();
  for (const { card, summary } of summaries) {
    if (!summary.name) continue;
    const parts = summary.name.toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      const list = byLastName.get(last) ?? [];
      list.push({ id: card.id, name: summary.name });
      byLastName.set(last, list);
    }
  }
  for (const list of byLastName.values()) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (areNicknameVariants(list[i].name, list[j].name)) {
          recordMatch(list[i].id, list[j].id, "Common nickname match");
        }
      }
    }
  }

  // 5. Fast indexed Fuzzy Name Matching:
  // Candidate buckets: Same Organization OR Same Phone Last-6-Digits
  const byOrg = new Map<string, Array<{ id: string; name: string }>>();
  const byPhoneSuffix = new Map<string, Array<{ id: string; name: string }>>();

  for (const { card, summary } of summaries) {
    if (!summary.name) continue;
    if (summary.organization) {
      const orgKey = summary.organization.toLowerCase().trim();
      if (orgKey.length >= 3) {
        const list = byOrg.get(orgKey) ?? [];
        list.push({ id: card.id, name: summary.name });
        byOrg.set(orgKey, list);
      }
    }
    for (const phone of summary.phones) {
      const norm = normalizePhone(phone.value);
      if (norm.length >= 6) {
        const suffix = norm.slice(-6);
        const list = byPhoneSuffix.get(suffix) ?? [];
        list.push({ id: card.id, name: summary.name });
        byPhoneSuffix.set(suffix, list);
      }
    }
  }

  const checkFuzzyList = (list: Array<{ id: string; name: string }>) => {
    if (list.length < 2) return;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].id === list[j].id) continue;
        if (isFuzzyNameMatch(list[i].name, list[j].name)) {
          recordMatch(list[i].id, list[j].id, "Similar name variation");
        }
      }
    }
  };

  for (const list of byOrg.values()) checkFuzzyList(list);
  for (const list of byPhoneSuffix.values()) checkFuzzyList(list);

  // 6. Group cards by disjoint set root
  const grouped = new Map<string, string[]>();
  for (const card of cards) {
    const root = sets.find(card.id);
    const ids = grouped.get(root) ?? [];
    ids.push(card.id);
    grouped.set(root, ids);
  }

  const duplicateGroups = [...grouped.values()]
    .filter((cardIds) => cardIds.length > 1)
    .map((cardIds, index) => {
      const reasons = new Set<string>();
      for (const cardId of cardIds) {
        for (const reason of reasonsByCard.get(cardId) ?? []) {
          reasons.add(reason);
        }
      }
      return { id: `duplicate-${index}`, cardIds, reasons: [...reasons] };
    });

  const duplicateCardIds = new Set(duplicateGroups.flatMap((group) => group.cardIds));

  // 7. Quality issues on standalone cards using pre-computed summaries
  const qualityIssues = summaries
    .filter(({ card }) => !duplicateCardIds.has(card.id))
    .flatMap(({ card, summary }) => {
      const codes: QualityCode[] = [];

      if (!summary.name) {
        codes.push("missing-name");
      } else if (isNameAPhoneNumber(summary.name)) {
        codes.push("name-is-phone");
      } else if (isDummyOrPunctuationName(summary.name)) {
        codes.push("dummy-name");
      }

      if (!summary.phones.length && !summary.emails.length) {
        codes.push("no-contact-details");
      }

      if (summary.phones.some((phone) => {
        const length = phone.value.replace(/\D/g, "").length;
        return length > 0 && length < 7;
      })) {
        codes.push("short-phone");
      }

      if (summary.phones.some((phone) => isInvalidPhoneFormat(phone.value))) {
        codes.push("invalid-phone-format");
      }

      if (summary.emails.some((email) => Boolean(hasEmailDomainTypo(email.value)))) {
        codes.push("email-domain-typo");
      } else if (summary.emails.some((email) => !EMAIL_PATTERN.test(normalizeEmail(email.value)))) {
        codes.push("invalid-email");
      }

      if (hasInternalDuplicates(card)) {
        codes.push("internal-duplicate-details");
      }

      if (hasCorruptedText(card)) {
        codes.push("corrupted-text");
      }

      if (hasInvalidUrl(card)) {
        codes.push("invalid-url");
      }

      if (hasEmptyAddress(card)) {
        codes.push("empty-address");
      }

      return codes.length ? [{ cardId: card.id, codes }] : [];
    });

  return {
    duplicateGroups,
    qualityIssues,
    duplicateUnits: duplicateGroups.reduce((total, group) => total + group.cardIds.length - 1, 0),
  };
}

function semanticPropertyKey(property: VCardProperty) {
  const value = displayValue(property);
  if (property.key === "TEL") return `TEL:${normalizePhone(value)}`;
  if (property.key === "EMAIL") return `EMAIL:${normalizeEmail(value)}`;
  return `${property.key}:${value.toLocaleLowerCase()}`;
}

export type CustomMergeOptions = {
  name?: string;
  organization?: string;
  title?: string;
  selectedPhoneValues: string[];
  selectedEmailValues: string[];
  photoChoice?: "left" | "right" | "none" | string;
};

export function createCustomMergedContact(
  cardsOrPrimary: ContactCard[] | ContactCard,
  optionsOrSecondary: CustomMergeOptions | ContactCard,
  maybeOptions?: CustomMergeOptions
): ContactCard {
  let cards: ContactCard[];
  let options: CustomMergeOptions;

  if (Array.isArray(cardsOrPrimary)) {
    cards = cardsOrPrimary;
    options = optionsOrSecondary as CustomMergeOptions;
  } else {
    cards = [cardsOrPrimary, optionsOrSecondary as ContactCard];
    options = maybeOptions ?? { selectedPhoneValues: [], selectedEmailValues: [] };
  }

  const primary = cards[0];
  const summaries = cards.map((c) => summarizeContact(c));
  const properties: VCardProperty[] = [];

  for (const card of cards) {
    const v = card.properties.find((p) => p.key === "VERSION");
    if (v) {
      properties.push(v);
      break;
    }
  }

  const fallbackName = summaries.find((s) => s.name)?.name ?? "";
  const finalName = options.name !== undefined ? options.name.trim() : fallbackName;
  if (finalName) {
    properties.push(makeProperty([`FN:${escapedVcardValue(finalName)}`]));
    const matchCard = cards.find((c) => summarizeContact(c).name === finalName);
    const matchN = matchCard?.properties.find((p) => p.key === "N");
    if (matchN) {
      properties.push(matchN);
    } else {
      properties.push(makeProperty([`N:${escapedVcardValue(finalName)};;;;`]));
    }
  }

  const fallbackOrg = summaries.find((s) => s.organization)?.organization ?? "";
  const finalOrg = options.organization !== undefined ? options.organization.trim() : fallbackOrg;
  if (finalOrg) {
    properties.push(makeProperty([`ORG:${escapedVcardValue(finalOrg)}`]));
  }

  const fallbackTitle = summaries.find((s) => s.title)?.title ?? "";
  const finalTitle = options.title !== undefined ? options.title.trim() : fallbackTitle;
  if (finalTitle) {
    properties.push(makeProperty([`TITLE:${escapedVcardValue(finalTitle)}`]));
  }

  if (options.photoChoice && options.photoChoice !== "none") {
    let photoProp: VCardProperty | undefined;
    if (options.photoChoice === "left") {
      photoProp = cards[0]?.properties.find((p) => p.key === "PHOTO");
    } else if (options.photoChoice === "right") {
      photoProp = cards[1]?.properties.find((p) => p.key === "PHOTO");
    } else {
      const targetCard = cards.find((c) => c.id === options.photoChoice);
      photoProp = targetCard?.properties.find((p) => p.key === "PHOTO");
    }
    if (photoProp) properties.push(photoProp);
  } else if (options.photoChoice === undefined) {
    for (const card of cards) {
      const p = card.properties.find((prop) => prop.key === "PHOTO");
      if (p) {
        properties.push(p);
        break;
      }
    }
  }

  const selectedPhonesSet = new Set(options.selectedPhoneValues);
  const existingPhones = new Set<string>();
  for (const card of cards) {
    for (const prop of card.properties) {
      if (prop.key === "TEL") {
        const val = displayValue(prop);
        if (selectedPhonesSet.has(val)) {
          const norm = normalizePhone(val);
          if (!existingPhones.has(norm)) {
            properties.push(prop);
            existingPhones.add(norm);
          }
        }
      }
    }
  }

  const selectedEmailsSet = new Set(options.selectedEmailValues);
  const existingEmails = new Set<string>();
  for (const card of cards) {
    for (const prop of card.properties) {
      if (prop.key === "EMAIL") {
        const val = displayValue(prop);
        if (selectedEmailsSet.has(val)) {
          const norm = normalizeEmail(val);
          if (!existingEmails.has(norm)) {
            properties.push(prop);
            existingEmails.add(norm);
          }
        }
      }
    }
  }

  const handledKeys = new Set(["VERSION", "PRODID", "UID", "REV", "FN", "N", "ORG", "TITLE", "PHOTO", "TEL", "EMAIL"]);
  const existingOther = new Set<string>();
  for (const card of cards) {
    for (const prop of card.properties) {
      if (!handledKeys.has(prop.key)) {
        const key = `${prop.key}:${displayValue(prop).toLowerCase()}`;
        if (!existingOther.has(key)) {
          properties.push(prop);
          existingOther.add(key);
        }
      }
    }
  }

  return { id: primary.id, sourceIndex: primary.sourceIndex, properties };
}

export function mergeContacts(primary: ContactCard, secondary: ContactCard): ContactCard {
  const primarySummary = summarizeContact(primary);
  const properties = [...primary.properties];
  const existing = new Set(properties.map(semanticPropertyKey));
  const skip = new Set(["VERSION", "PRODID", "UID", "REV"]);

  for (const property of secondary.properties) {
    if (skip.has(property.key)) continue;
    if (["FN", "N"].includes(property.key) && primarySummary.name) continue;
    if (property.key === "PHOTO" && primarySummary.photoDataUrl) continue;
    const semanticKey = semanticPropertyKey(property);
    if (!existing.has(semanticKey)) {
      properties.push(property);
      existing.add(semanticKey);
    }
  }

  return { ...primary, properties };
}

export function mergeContactGroup(cards: ContactCard[], primaryCardId?: string): ContactCard {
  if (cards.length === 0) throw new Error("Cannot merge an empty group of contacts.");
  if (cards.length === 1) return cards[0];

  const primary = (primaryCardId ? cards.find((c) => c.id === primaryCardId) : undefined) ?? cards[0];
  const secondaries = cards.filter((c) => c.id !== primary.id);

  let merged = primary;
  for (const secondary of secondaries) {
    merged = mergeContacts(merged, secondary);
  }
  return merged;
}

function escapedVcardValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function replacementProperty(property: VCardProperty, value: string) {
  const head = property.logical.slice(0, property.logical.indexOf(":"));
  return makeProperty([`${head}:${escapedVcardValue(value)}`]);
}

export function safelyRepairContact(card: ContactCard): { card: ContactCard; changes: string[] } {
  const summary = summarizeContact(card);
  let properties = [...card.properties];
  const changes: string[] = [];

  // 1. Placeholder or missing names
  if (!summary.name || isNameAPhoneNumber(summary.name) || isDummyOrPunctuationName(summary.name)) {
    const fallback = summary.organization || summary.emails[0]?.value.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    if (fallback) {
      properties = properties.filter((p) => p.key !== "FN" && p.key !== "N");
      properties.push(makeProperty([`FN:${escapedVcardValue(fallback)}`]));
      properties.push(makeProperty([`N:${escapedVcardValue(fallback)};;;;`]));
      changes.push(summary.organization ? "Used company name as contact name" : "Generated name from email address");
    }
  }

  // 2. Email fixes (typos and spacing)
  properties = properties.map((property) => {
    if (property.key !== "EMAIL") return property;
    const current = displayValue(property);
    const fixedDomain = hasEmailDomainTypo(current);
    if (fixedDomain) {
      changes.push(`Corrected email domain typo to ${fixedDomain.slice(fixedDomain.indexOf("@"))}`);
      return replacementProperty(property, fixedDomain);
    }
    if (!EMAIL_PATTERN.test(normalizeEmail(current))) {
      const repaired = current.replace(/\s+/g, "");
      if (EMAIL_PATTERN.test(normalizeEmail(repaired))) {
        changes.push("Removed stray spacing from an email address");
        return replacementProperty(property, repaired);
      }
    }
    return property;
  });

  // 3. Internal duplicate details
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const dedupedProps: VCardProperty[] = [];
  let deduplicatedCount = 0;

  for (const property of properties) {
    if (property.key === "TEL") {
      const norm = normalizePhone(displayValue(property));
      if (norm && seenPhones.has(norm)) {
        deduplicatedCount++;
        continue;
      }
      if (norm) seenPhones.add(norm);
    } else if (property.key === "EMAIL") {
      const norm = normalizeEmail(displayValue(property));
      if (norm && seenEmails.has(norm)) {
        deduplicatedCount++;
        continue;
      }
      if (norm) seenEmails.add(norm);
    }
    dedupedProps.push(property);
  }
  if (deduplicatedCount > 0) {
    changes.push("Deduplicated repeated phone numbers/emails");
    properties = dedupedProps;
  }

  // 4. Corrupted text / Mojibake
  let fixedEncoding = false;
  properties = properties.map((property) => {
    if (["FN", "N", "ORG", "TITLE", "NOTE"].includes(property.key)) {
      const current = displayValue(property);
      if (MOJIBAKE_REGEX.test(current)) {
        fixedEncoding = true;
        const repaired = repairMojibake(current);
        return replacementProperty(property, repaired);
      }
    }
    return property;
  });
  if (fixedEncoding) {
    changes.push("Repaired corrupted UTF-8 text encoding");
  }

  // 5. Broken URL protocol prefix
  let fixedUrl = false;
  properties = properties.map((property) => {
    if (property.key === "URL") {
      const current = displayValue(property);
      const repaired = repairUrl(current);
      if (repaired !== current) {
        fixedUrl = true;
        return replacementProperty(property, repaired);
      }
    }
    return property;
  });
  if (fixedUrl) {
    changes.push("Fixed URL protocol prefix");
  }

  // 6. Empty address removal
  let removedEmptyAddress = false;
  properties = properties.filter((property) => {
    if (property.key === "ADR") {
      const val = displayValue(property).replace(/[;\s]/g, "");
      if (!val) {
        removedEmptyAddress = true;
        return false;
      }
    }
    return true;
  });
  if (removedEmptyAddress) {
    changes.push("Removed empty address line");
  }

  return { card: { ...card, properties }, changes };
}

export function canSafelyRepair(card: ContactCard) {
  return safelyRepairContact(card).changes.length > 0;
}

export function getSafeFixLabel(card: ContactCard): string | undefined {
  const summary = summarizeContact(card);
  if (!summary.name || isNameAPhoneNumber(summary.name) || isDummyOrPunctuationName(summary.name)) {
    if (summary.organization) {
      return "Use Company Name";
    }
    if (summary.emails.length > 0) {
      return "Generate Name";
    }
  }

  for (const property of card.properties) {
    if (property.key === "EMAIL") {
      const current = displayValue(property);
      if (hasEmailDomainTypo(current)) {
        return "Fix Email Typo";
      }
      if (!EMAIL_PATTERN.test(normalizeEmail(current))) {
        const repaired = current.replace(/\s+/g, "");
        if (EMAIL_PATTERN.test(normalizeEmail(repaired))) {
          return "Fix Email Spacing";
        }
      }
    }
  }

  if (hasInternalDuplicates(card)) {
    return "Deduplicate Details";
  }

  if (hasCorruptedText(card)) {
    return "Fix Text Encoding";
  }

  if (hasInvalidUrl(card)) {
    const urls = values(card, "URL");
    if (urls.some((u) => repairUrl(u) !== u.trim())) {
      return "Fix URL Protocol";
    }
  }

  if (hasEmptyAddress(card)) {
    return "Remove Empty Address";
  }

  const { changes } = safelyRepairContact(card);
  if (changes.length > 0) {
    return "Apply Auto-fix";
  }

  return undefined;
}

export function serializeContact(card: ContactCard) {
  const lines = card.properties.flatMap((property) => property.lines);
  return ["BEGIN:VCARD", ...lines, "END:VCARD"].join("\r\n");
}

export function serializeVcf(cards: ContactCard[]) {
  return `${cards.map(serializeContact).join("\r\n")}\r\n`;
}

export type EditContactOptions = {
  name?: string;
  organization?: string;
  title?: string;
  phones: Array<{ value: string; label?: string }>;
  emails: Array<{ value: string; label?: string }>;
  notes?: string[];
};

export function createEditedContact(
  baseCard: ContactCard,
  options: EditContactOptions
): ContactCard {
  const summary = summarizeContact(baseCard);
  const properties: VCardProperty[] = [];

  // 1. Version
  const versionProp = baseCard.properties.find((p) => p.key === "VERSION");
  if (versionProp) {
    properties.push(versionProp);
  }

  // 2. Name
  const finalName = options.name !== undefined ? options.name.trim() : summary.name;
  if (finalName) {
    properties.push(makeProperty([`FN:${escapedVcardValue(finalName)}`]));
    const matchN = baseCard.properties.find((p) => p.key === "N");
    if (matchN && summary.name === finalName) {
      properties.push(matchN);
    } else {
      properties.push(makeProperty([`N:${escapedVcardValue(finalName)};;;;`]));
    }
  }

  // 3. Organization
  const finalOrg = options.organization !== undefined ? options.organization.trim() : summary.organization;
  if (finalOrg) {
    properties.push(makeProperty([`ORG:${escapedVcardValue(finalOrg)}`]));
  }

  // 4. Title
  const finalTitle = options.title !== undefined ? options.title.trim() : summary.title;
  if (finalTitle) {
    properties.push(makeProperty([`TITLE:${escapedVcardValue(finalTitle)}`]));
  }

  // 5. Photo - preserve from base card if any
  const photoProp = baseCard.properties.find((p) => p.key === "PHOTO");
  if (photoProp) {
    properties.push(photoProp);
  }

  // 6. Phones
  for (const phone of options.phones) {
    const val = phone.value.trim();
    if (!val) continue;
    const type = phone.label ? phone.label.toUpperCase() : "CELL";
    properties.push(makeProperty([`TEL;TYPE=${type}:${escapedVcardValue(val)}`]));
  }

  // 7. Emails
  for (const email of options.emails) {
    const val = email.value.trim();
    if (!val) continue;
    const type = email.label ? email.label.toUpperCase() : "INTERNET";
    properties.push(makeProperty([`EMAIL;TYPE=${type}:${escapedVcardValue(val)}`]));
  }

  // 8. Notes
  const finalNotes = options.notes !== undefined ? options.notes : values(baseCard, "NOTE");
  for (const note of finalNotes) {
    const val = note.trim();
    if (!val) continue;
    properties.push(makeProperty([`NOTE:${escapedVcardValue(val)}`]));
  }

  // 9. Preserve other properties (ADR, BDAY, URL, etc.)
  const handledKeys = new Set(["VERSION", "PRODID", "UID", "REV", "FN", "N", "ORG", "TITLE", "PHOTO", "TEL", "EMAIL", "NOTE"]);
  for (const prop of baseCard.properties) {
    if (!handledKeys.has(prop.key)) {
      properties.push(prop);
    }
  }

  return { id: baseCard.id, sourceIndex: baseCard.sourceIndex, properties };
}

export function applyDecisions(
  baseCards: ContactCard[],
  duplicateGroups: DuplicateGroup[],
  duplicateDecisions: Record<string, DuplicateDecision>,
  qualityDecisions: Record<string, QualityDecision>
): ContactCard[] {
  const cardMap = new Map(baseCards.map((c) => [c.id, { ...c }]));
  const excludedIds = new Set<string>();

  // Process duplicate decisions
  for (const group of duplicateGroups) {
    const decision = duplicateDecisions[group.id];
    if (!decision) continue;

    const groupCards = group.cardIds.map((id) => cardMap.get(id)).filter(Boolean) as ContactCard[];
    if (groupCards.length === 0) continue;

    if (decision.choice === "merge") {
      const primaryId = decision.preferredCardId ?? group.cardIds[0];
      const merged = decision.customCard ?? mergeContactGroup(groupCards, primaryId);
      cardMap.set(primaryId, merged);
      for (const otherId of group.cardIds) {
        if (otherId !== primaryId) {
          excludedIds.add(otherId);
        }
      }
    } else {
      const keptSet = new Set(
        decision.keptCardIds ??
          (decision.choice === "left"
            ? [decision.preferredCardId ?? group.cardIds[0]]
            : decision.choice === "right"
            ? [decision.preferredCardId ?? group.cardIds[1] ?? group.cardIds[0]]
            : group.cardIds)
      );

      for (const id of group.cardIds) {
        if (!keptSet.has(id)) {
          excludedIds.add(id);
        }
      }
    }
  }

  // Process quality decisions and assemble final cards in original sequence
  const result: ContactCard[] = [];
  for (const card of baseCards) {
    if (excludedIds.has(card.id)) continue;
    let current = cardMap.get(card.id) ?? card;
    const qDecision = qualityDecisions[card.id];
    if (qDecision === "remove") {
      continue;
    } else if (qDecision === "fix") {
      current = safelyRepairContact(current).card;
    } else if (typeof qDecision === "object" && qDecision.choice === "edit") {
      current = qDecision.customCard;
    }
    result.push(current);
  }

  return result;
}

