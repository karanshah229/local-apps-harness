import assert from "node:assert/strict";
import test from "node:test";
import { logEvent } from "./logger";
import {
  analyzeContacts,
  applyDecisions,
  canSafelyRepair,
  createCustomMergedContact,
  createEditedContact,
  getInitialQualityDecisions,
  getSafeFixDiffs,
  getSafeFixLabel,
  isQualityIssueAutoFixable,
  mergeContactGroup,
  mergeContacts,
  parseVcf,
  safelyRepairContact,
  serializeVcf,
  summarizeContact,
} from "./vcard";

const duplicateFixture = [
  "BEGIN:VCARD",
  "VERSION:2.1",
  "FN:Left Person",
  "TEL;CELL:+91 98765 43210",
  "EMAIL:left@example.com",
  "END:VCARD",
  "BEGIN:VCARD",
  "VERSION:2.1",
  "FN:Right Person",
  "TEL;HOME:09876543210",
  "EMAIL:right@example.com",
  "ORG:Example Company",
  "END:VCARD",
].join("\r\n");

test("parses contacts and detects formatted Indian phone duplicates", () => {
  const cards = parseVcf(duplicateFixture);
  const analysis = analyzeContacts(cards);
  assert.equal(cards.length, 2);
  assert.equal(analysis.duplicateGroups.length, 1);
  assert.equal(analysis.duplicateUnits, 1);
  assert.deepEqual(analysis.duplicateGroups[0].reasons, ["Same phone number"]);
});

test("merges unique details while retaining the primary identity", () => {
  const [left, right] = parseVcf(duplicateFixture);
  const merged = summarizeContact(mergeContacts(left, right));
  assert.equal(merged.name, "Left Person");
  assert.deepEqual(merged.emails.map((item) => item.value), ["left@example.com", "right@example.com"]);
  assert.equal(merged.phones.length, 1);
  assert.equal(merged.organization, "Example Company");
});

test("flags matching full names for review even when details differ", () => {
  const source = [
    "BEGIN:VCARD", "VERSION:3.0", "FN:Same Person", "TEL:+1 202 555 0101", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:same  person", "EMAIL:same@example.com", "END:VCARD",
  ].join("\r\n");
  const analysis = analyzeContacts(parseVcf(source));
  assert.equal(analysis.duplicateGroups.length, 1);
  assert.deepEqual(analysis.duplicateGroups[0].reasons, ["Same full name"]);
});

test("preserves folded photo data during export", () => {
  const source = [
    "BEGIN:VCARD",
    "VERSION:2.1",
    "FN:Photo Contact",
    "PHOTO;ENCODING=BASE64;JPEG:YWJj",
    " ZGVm",
    "END:VCARD",
  ].join("\n");
  const output = serializeVcf(parseVcf(source));
  assert.match(output, /PHOTO;ENCODING=BASE64;JPEG:YWJj\r\n ZGVm/);
  assert.equal(summarizeContact(parseVcf(source)[0]).photoDataUrl, "data:image/jpeg;base64,YWJjZGVm");
});

test("decodes quoted-printable names split across physical lines", () => {
  const source = [
    "BEGIN:VCARD",
    "VERSION:2.1",
    "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jos=C3=",
    "=A9",
    "TEL:1234567890",
    "END:VCARD",
  ].join("\r\n");
  assert.equal(summarizeContact(parseVcf(source)[0]).name, "José");
});

test("reports damaged contacts and only applies safe repairs", () => {
  const source = [
    "BEGIN:VCARD",
    "VERSION:2.1",
    "ORG:Acme",
    "EMAIL:hello @example.com",
    "TEL:123",
    "END:VCARD",
  ].join("\r\n");
  const card = parseVcf(source)[0];
  const issue = analyzeContacts([card]).qualityIssues[0];
  assert.deepEqual(issue.codes, ["missing-name", "short-phone", "invalid-email"]);
  assert.equal(canSafelyRepair(card), true);
  const repaired = safelyRepairContact(card);
  assert.equal(summarizeContact(repaired.card).name, "Acme");
  assert.equal(summarizeContact(repaired.card).emails[0].value, "hello@example.com");
  assert.deepEqual(analyzeContacts([repaired.card]).qualityIssues[0].codes, ["short-phone"]);
});

test("rejects malformed input without echoing contact contents", () => {
  const sensitiveEmail = "private.person@example.com";
  assert.throws(() => parseVcf(`BEGIN:VCARD\nEMAIL:${sensitiveEmail}`), (error: Error) => {
    assert.doesNotMatch(error.message, /private\.person/);
    return true;
  });
});

test("structured diagnostics discard personal fields", () => {
  const original = console.error;
  let captured = "";
  console.error = (value) => { captured = JSON.stringify(value); };
  try {
    logEvent("vcf.import", "failed", { errorType: "ParseError", contactName: "Private Person" } as never);
  } finally {
    console.error = original;
  }
  assert.doesNotMatch(captured, /Private Person/);
  assert.match(captured, /ParseError/);
});

test("applies duplicate and quality decisions correctly and allows changing choices", () => {
  const cards = parseVcf(duplicateFixture);
  const analysis = analyzeContacts(cards);
  const group = analysis.duplicateGroups[0];

  // 1. Unresolved / skipped -> both contacts remain intact
  const skipped = applyDecisions(cards, analysis.duplicateGroups, {}, {});
  assert.equal(skipped.length, 2);
  assert.equal(skipped[0].id, cards[0].id);
  assert.equal(skipped[1].id, cards[1].id);

  // 2. Decision: "merge" -> 1 merged contact with both emails
  const merged = applyDecisions(cards, analysis.duplicateGroups, { [group.id]: { choice: "merge" } }, {});
  assert.equal(merged.length, 1);
  assert.equal(summarizeContact(merged[0]).name, "Left Person");
  assert.equal(summarizeContact(merged[0]).emails.length, 2);

  // 3. Changing decision: "right" -> keeps right contact, removes left
  const rightOnly = applyDecisions(cards, analysis.duplicateGroups, { [group.id]: { choice: "right" } }, {});
  assert.equal(rightOnly.length, 1);
  assert.equal(summarizeContact(rightOnly[0]).name, "Right Person");

  // 4. Changing decision: "left" -> keeps left contact, removes right
  const leftOnly = applyDecisions(cards, analysis.duplicateGroups, { [group.id]: { choice: "left" } }, {});
  assert.equal(leftOnly.length, 1);
  assert.equal(summarizeContact(leftOnly[0]).name, "Left Person");
  assert.equal(summarizeContact(leftOnly[0]).emails.length, 1);
});

test("handles quality repairs and deletions alongside duplicate choices", () => {
  const source = [
    "BEGIN:VCARD", "VERSION:2.1", "FN:Person A", "TEL:1234567890", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "FN:Person A", "TEL:1234567890", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "ORG:Repaired Org", "EMAIL:repair @example.com", "TEL:9876543210", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "FN:To Delete", "TEL:111", "END:VCARD",
  ].join("\r\n");

  const cards = parseVcf(source);
  const analysis = analyzeContacts(cards);

  const finalCards = applyDecisions(
    cards,
    analysis.duplicateGroups,
    { [analysis.duplicateGroups[0].id]: { choice: "merge" } },
    { [cards[2].id]: "fix", [cards[3].id]: "remove" }
  );

  // duplicate pair merged (2 -> 1), cards[2] repaired (1), cards[3] removed (0) -> total 2
  assert.equal(finalCards.length, 2);
  assert.equal(summarizeContact(finalCards[0]).name, "Person A");
  assert.equal(summarizeContact(finalCards[1]).name, "Repaired Org");
  assert.equal(summarizeContact(finalCards[1]).emails[0].value, "repair@example.com");
});

test("guarantees other issues are completely separate from duplicate issues", () => {
  const source = [
    // Duplicate pair with formatting flaw (short phone) on one card
    "BEGIN:VCARD", "VERSION:2.1", "FN:Dup Person", "TEL:1234567890", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "FN:Dup Person", "TEL:123", "END:VCARD",
    // Standalone contact with quality issue (missing name)
    "BEGIN:VCARD", "VERSION:2.1", "ORG:Acme Corp", "EMAIL:support@example.com", "TEL:9876543210", "END:VCARD",
  ].join("\r\n");

  const cards = parseVcf(source);
  const analysis = analyzeContacts(cards);

  // Duplicate group contains cards[0] and cards[1]
  assert.equal(analysis.duplicateGroups.length, 1);
  assert.deepEqual(analysis.duplicateGroups[0].cardIds, [cards[0].id, cards[1].id]);

  // Quality issues ONLY contain the standalone contact (cards[2]), NOT cards[1]
  assert.equal(analysis.qualityIssues.length, 1);
  assert.equal(analysis.qualityIssues[0].cardId, cards[2].id);
  assert.deepEqual(analysis.qualityIssues[0].codes, ["missing-name"]);
});

test("creates and applies custom merged contacts with selective fields and custom name", () => {
  const [left, right] = parseVcf(duplicateFixture);
  const custom = createCustomMergedContact(left, right, {
    name: "Dr. Customized Person",
    organization: "Custom Healthcare Inc",
    title: "Chief Surgeon",
    selectedPhoneValues: ["+91 98765 43210"],
    selectedEmailValues: ["right@example.com"],
  });

  const summary = summarizeContact(custom);
  assert.equal(summary.name, "Dr. Customized Person");
  assert.equal(summary.organization, "Custom Healthcare Inc");
  assert.equal(summary.title, "Chief Surgeon");
  assert.deepEqual(summary.phones.map((p) => p.value), ["+91 98765 43210"]);
  assert.deepEqual(summary.emails.map((e) => e.value), ["right@example.com"]);

  const cards = parseVcf(duplicateFixture);
  const analysis = analyzeContacts(cards);
  const finalCards = applyDecisions(
    cards,
    analysis.duplicateGroups,
    {
      [analysis.duplicateGroups[0].id]: {
        choice: "merge",
        customCard: custom,
      },
    },
    {}
  );

  assert.equal(finalCards.length, 1);
  assert.equal(summarizeContact(finalCards[0]).name, "Dr. Customized Person");
  assert.equal(summarizeContact(finalCards[0]).organization, "Custom Healthcare Inc");
  assert.deepEqual(summarizeContact(finalCards[0]).emails.map((e) => e.value), ["right@example.com"]);
});

test("handles duplicate groups with >2 contacts, merging all unique details into 1 contact", () => {
  const source = [
    "BEGIN:VCARD", "VERSION:2.1", "FN:Person 1", "TEL:9998887771", "EMAIL:group@example.com", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "FN:Person 2", "TEL:9998887772", "EMAIL:group@example.com", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "FN:Person 3", "TEL:9998887773", "EMAIL:group@example.com", "ORG:Acme Holdings", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "FN:Person 4", "TEL:9998887774", "EMAIL:group@example.com", "TITLE:VP", "END:VCARD",
  ].join("\r\n");

  const cards = parseVcf(source);
  const analysis = analyzeContacts(cards);

  // All 4 share the same email -> grouped together
  assert.equal(analysis.duplicateGroups.length, 1);
  assert.equal(analysis.duplicateGroups[0].cardIds.length, 4);
  assert.equal(analysis.duplicateUnits, 3);

  // Merge the entire 4-card group
  const group = analysis.duplicateGroups[0];
  const finalCards = applyDecisions(
    cards,
    analysis.duplicateGroups,
    { [group.id]: { choice: "merge", preferredCardId: cards[0].id } },
    {}
  );

  // 4 contacts resolve to 1 single contact
  assert.equal(finalCards.length, 1);
  const summary = summarizeContact(finalCards[0]);
  assert.equal(summary.name, "Person 1");
  assert.equal(summary.organization, "Acme Holdings");
  assert.equal(summary.title, "VP");
  // All 4 unique phone numbers are preserved!
  assert.equal(summary.phones.length, 4);
  assert.deepEqual(
    summary.phones.map((p) => p.value),
    ["9998887771", "9998887772", "9998887773", "9998887774"]
  );
});

test("supports multi-select keeping a subset of contacts in duplicate group", () => {
  const source = [
    "BEGIN:VCARD", "VERSION:2.1", "FN:Person A", "TEL:1111111", "EMAIL:same@example.com", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "FN:Person B", "TEL:2222222", "EMAIL:same@example.com", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "FN:Person C", "TEL:3333333", "EMAIL:same@example.com", "END:VCARD",
  ].join("\r\n");

  const cards = parseVcf(source);
  const analysis = analyzeContacts(cards);
  const group = analysis.duplicateGroups[0];

  // Keep Person A and Person C, exclude Person B
  const finalCards = applyDecisions(
    cards,
    analysis.duplicateGroups,
    { [group.id]: { choice: "keep-subset", keptCardIds: [cards[0].id, cards[2].id] } },
    {}
  );

  assert.equal(finalCards.length, 2);
  assert.equal(summarizeContact(finalCards[0]).name, "Person A");
  assert.equal(summarizeContact(finalCards[1]).name, "Person C");
});

test("supports keeping all contacts in duplicate group as-is without merging", () => {
  const source = [
    "BEGIN:VCARD", "VERSION:2.1", "FN:Person A", "TEL:1111111", "EMAIL:same@example.com", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "FN:Person B", "TEL:2222222", "EMAIL:same@example.com", "END:VCARD",
  ].join("\r\n");

  const cards = parseVcf(source);
  const analysis = analyzeContacts(cards);
  const group = analysis.duplicateGroups[0];

  // Keep both Person A and Person B
  const finalCards = applyDecisions(
    cards,
    analysis.duplicateGroups,
    { [group.id]: { choice: "keep-subset", keptCardIds: [cards[0].id, cards[1].id] } },
    {}
  );

  assert.equal(finalCards.length, 2);
  assert.equal(summarizeContact(finalCards[0]).name, "Person A");
  assert.equal(summarizeContact(finalCards[1]).name, "Person B");
});

test("creates custom merged contact across N > 2 cards", () => {
  const source = [
    "BEGIN:VCARD", "VERSION:2.1", "FN:Contact Alpha", "TEL:1111111", "EMAIL:shared@test.com", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "FN:Contact Beta", "TEL:2222222", "EMAIL:shared@test.com", "END:VCARD",
    "BEGIN:VCARD", "VERSION:2.1", "FN:Contact Gamma", "TEL:3333333", "EMAIL:shared@test.com", "END:VCARD",
  ].join("\r\n");

  const cards = parseVcf(source);
  const custom = createCustomMergedContact(cards, {
    name: "Merged Trio",
    selectedPhoneValues: ["1111111", "3333333"], // Exclude 2222222
    selectedEmailValues: ["shared@test.com"],
  });

  const summary = summarizeContact(custom);
  assert.equal(summary.name, "Merged Trio");
  assert.deepEqual(summary.phones.map((p) => p.value), ["1111111", "3333333"]);
});

test("creates edited contact and applies quality edit decisions", () => {
  const source = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Janam Mobile Bkc",
    "TEL;TYPE=CELL:+918879009565",
    "TEL;TYPE=WORK:02240193302",
    "TEL;TYPE=HOME:779",
    "END:VCARD",
  ].join("\r\n");

  const cards = parseVcf(source);
  assert.equal(cards.length, 1);
  const analysis = analyzeContacts(cards);
  assert.equal(analysis.qualityIssues.length, 1);
  assert.deepEqual(analysis.qualityIssues[0].codes, ["short-phone"]);
  // No safe automatic repair exists for short phone (cannot guess missing digits)
  assert.equal(canSafelyRepair(cards[0]), false);

  // User edits each field: cleans name, updates title, organization, corrects 779 to full phone
  const editedCard = createEditedContact(cards[0], {
    name: "Janam Mobile BKC",
    organization: "BKC Diamonds",
    title: "Accountant",
    phones: [
      { value: "+918879009565", label: "Mobile" },
      { value: "02240193302", label: "Work" },
      { value: "+912240197790", label: "Home" },
    ],
    emails: [{ value: "janam@example.com", label: "Work" }],
  });

  const editedSummary = summarizeContact(editedCard);
  assert.equal(editedSummary.name, "Janam Mobile BKC");
  assert.equal(editedSummary.organization, "BKC Diamonds");
  assert.equal(editedSummary.title, "Accountant");
  assert.equal(editedSummary.phones.length, 3);
  assert.equal(editedSummary.phones[2].value, "+912240197790");
  assert.equal(editedSummary.emails.length, 1);
  assert.equal(editedSummary.emails[0].value, "janam@example.com");

  // Apply the edited decision
  const finalCards = applyDecisions(
    cards,
    [],
    {},
    { [cards[0].id]: { choice: "edit", customCard: editedCard } }
  );

  assert.equal(finalCards.length, 1);
  const finalSummary = summarizeContact(finalCards[0]);
  assert.equal(finalSummary.name, "Janam Mobile BKC");
  assert.equal(finalSummary.organization, "BKC Diamonds");
  assert.equal(finalSummary.title, "Accountant");
  assert.equal(finalSummary.phones.length, 3);
  assert.equal(finalSummary.phones[2].value, "+912240197790");
  assert.equal(finalSummary.emails.length, 1);
  assert.equal(finalSummary.emails[0].value, "janam@example.com");
});

test("determines correct safe fix subcategory labels", () => {
  // Case 1: Missing name with email -> Generate Name
  const missingNameCards = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "EMAIL:customersupport@icicilombard.com",
    "END:VCARD",
  ].join("\r\n"));
  assert.equal(canSafelyRepair(missingNameCards[0]), true);
  assert.equal(getSafeFixLabel(missingNameCards[0]), "Generate Name");

  // Case 2: Missing name with company -> Use Company Name
  const companyCards = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "ORG:Acme Corp",
    "TEL:9876543210",
    "END:VCARD",
  ].join("\r\n"));
  assert.equal(canSafelyRepair(companyCards[0]), true);
  assert.equal(getSafeFixLabel(companyCards[0]), "Use Company Name");

  // Case 3: Email with spacing -> Fix Email Spacing
  const emailCards = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Valid Name",
    "EMAIL:test @example.com",
    "END:VCARD",
  ].join("\r\n"));
  assert.equal(canSafelyRepair(emailCards[0]), true);
  assert.equal(getSafeFixLabel(emailCards[0]), "Fix Email Spacing");

  // Case 4: Short phone -> No safe fix
  const shortPhoneCards = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Valid Name",
    "TEL:779",
    "END:VCARD",
  ].join("\r\n"));
  assert.equal(canSafelyRepair(shortPhoneCards[0]), false);
  assert.equal(getSafeFixLabel(shortPhoneCards[0]), undefined);
});

test("detects placeholder and junk names and safely repairs them", () => {
  // Name is phone number
  const phoneNameVcf = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:+919876543210",
    "ORG:Tech Solutions",
    "TEL:+919876543210",
    "END:VCARD",
  ].join("\r\n"))[0];

  const analysis1 = analyzeContacts([phoneNameVcf]);
  assert.equal(analysis1.qualityIssues.length, 1);
  assert.deepEqual(analysis1.qualityIssues[0].codes, ["name-is-phone"]);
  assert.equal(getSafeFixLabel(phoneNameVcf), "Use Company Name");
  const repaired1 = safelyRepairContact(phoneNameVcf);
  assert.equal(summarizeContact(repaired1.card).name, "Tech Solutions");

  // Dummy name ("Test", "Admin", punctuation)
  const dummyVcf = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Test",
    "EMAIL:alex.turner@example.com",
    "TEL:9876543210",
    "END:VCARD",
  ].join("\r\n"))[0];

  const analysis2 = analyzeContacts([dummyVcf]);
  assert.equal(analysis2.qualityIssues.length, 1);
  assert.deepEqual(analysis2.qualityIssues[0].codes, ["dummy-name"]);
  assert.equal(getSafeFixLabel(dummyVcf), "Generate Name");
  const repaired2 = safelyRepairContact(dummyVcf);
  assert.equal(summarizeContact(repaired2.card).name, "alex turner");
});

test("detects internal duplicate details and deduplicates them", () => {
  const vcf = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Jane Doe",
    "TEL;TYPE=CELL:+1 (555) 234-5678",
    "TEL;TYPE=WORK:15552345678",
    "EMAIL;TYPE=HOME:jane@example.com",
    "EMAIL;TYPE=WORK:JANE@EXAMPLE.COM",
    "END:VCARD",
  ].join("\r\n"))[0];

  const analysis = analyzeContacts([vcf]);
  assert.equal(analysis.qualityIssues.length, 1);
  assert.deepEqual(analysis.qualityIssues[0].codes, ["internal-duplicate-details"]);
  assert.equal(getSafeFixLabel(vcf), "Deduplicate Details");

  const repaired = safelyRepairContact(vcf);
  const summary = summarizeContact(repaired.card);
  assert.equal(summary.phones.length, 1);
  assert.equal(summary.emails.length, 1);
});

test("detects transposed, nickname, and fuzzy duplicates", () => {
  // 1. Transposed names: "John Doe" vs "Doe John"
  const transposedCards = parseVcf([
    "BEGIN:VCARD", "VERSION:3.0", "FN:John Doe", "TEL:1234567890", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Doe John", "TEL:9876543210", "END:VCARD",
  ].join("\r\n"));
  const transposedAnalysis = analyzeContacts(transposedCards);
  assert.equal(transposedAnalysis.duplicateGroups.length, 1);
  assert.deepEqual(transposedAnalysis.duplicateGroups[0].reasons, ["Transposed name"]);

  // 2. Nicknames: "Alex Smith" vs "Alexander Smith"
  const nicknameCards = parseVcf([
    "BEGIN:VCARD", "VERSION:3.0", "FN:Alex Smith", "TEL:1111222233", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Alexander Smith", "TEL:4444555566", "END:VCARD",
  ].join("\r\n"));
  const nicknameAnalysis = analyzeContacts(nicknameCards);
  assert.equal(nicknameAnalysis.duplicateGroups.length, 1);
  assert.deepEqual(nicknameAnalysis.duplicateGroups[0].reasons, ["Common nickname match"]);

  // 3. Fuzzy name with shared organization: "Cathrine Johnson" vs "Catherine Johnson" at "Acme"
  const fuzzyCards = parseVcf([
    "BEGIN:VCARD", "VERSION:3.0", "FN:Cathrine Johnson", "ORG:Acme Corp", "TEL:1234567", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Catherine Johnson", "ORG:Acme Corp", "TEL:7654321", "END:VCARD",
  ].join("\r\n"));
  const fuzzyAnalysis = analyzeContacts(fuzzyCards);
  assert.equal(fuzzyAnalysis.duplicateGroups.length, 1);
  assert.deepEqual(fuzzyAnalysis.duplicateGroups[0].reasons, ["Similar name variation"]);
});

test("detects email domain typos and repairs them", () => {
  const vcf = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Sarah Connor",
    "EMAIL:sarah@gmai.com",
    "TEL:9876543210",
    "END:VCARD",
  ].join("\r\n"))[0];

  const analysis = analyzeContacts([vcf]);
  assert.equal(analysis.qualityIssues.length, 1);
  assert.deepEqual(analysis.qualityIssues[0].codes, ["email-domain-typo"]);
  assert.equal(getSafeFixLabel(vcf), "Fix Email Typo");

  const repaired = safelyRepairContact(vcf);
  assert.equal(summarizeContact(repaired.card).emails[0].value, "sarah@gmail.com");
});

test("detects and repairs corrupted UTF-8 mojibake text", () => {
  const vcf = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:RenÃ© Dupont",
    "TEL:9876543210",
    "END:VCARD",
  ].join("\r\n"))[0];

  const analysis = analyzeContacts([vcf]);
  assert.equal(analysis.qualityIssues.length, 1);
  assert.deepEqual(analysis.qualityIssues[0].codes, ["corrupted-text"]);
  assert.equal(getSafeFixLabel(vcf), "Fix Text Encoding");

  const repaired = safelyRepairContact(vcf);
  assert.equal(summarizeContact(repaired.card).name, "René Dupont");
});

test("detects and repairs broken URLs and removes empty addresses", () => {
  const vcf = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Webmaster",
    "URL:htp://example.com",
    "ADR:;;;;;;",
    "TEL:9876543210",
    "END:VCARD",
  ].join("\r\n"))[0];

  const analysis = analyzeContacts([vcf]);
  assert.equal(analysis.qualityIssues.length, 1);
  assert.deepEqual(analysis.qualityIssues[0].codes, ["invalid-url", "empty-address"]);

  const repaired = safelyRepairContact(vcf);
  const repairedCard = repaired.card;
  const urls = repairedCard.properties.filter((p) => p.key === "URL");
  const adrs = repairedCard.properties.filter((p) => p.key === "ADR");
  assert.equal(urls[0].lines[0], "URL:http://example.com");
  assert.equal(adrs.length, 0);
});

test("flags invalid phone format for impossible international numbers", () => {
  // Impossible US number starting with 0
  const vcf = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Test Number",
    "TEL:+10123456789",
    "END:VCARD",
  ].join("\r\n"))[0];

  const analysis = analyzeContacts([vcf]);
  assert.equal(analysis.qualityIssues.length, 1);
  assert.deepEqual(analysis.qualityIssues[0].codes, ["invalid-phone-format"]);
});

test("analyzes 5,000 contacts within milliseconds without blocking", () => {
  const cards: ReturnType<typeof parseVcf> = [];
  for (let i = 0; i < 5000; i++) {
    cards.push(parseVcf([
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:Contact Number ${i % 2500}`,
      `TEL;TYPE=CELL:+9198765${String(10000 + (i % 2000))}`,
      `EMAIL:user${i}@example.com`,
      `ORG:Company ${i % 100}`,
      "END:VCARD",
    ].join("\r\n"))[0]);
  }

  const start = performance.now();
  const result = analyzeContacts(cards);
  const elapsed = performance.now() - start;

  assert.equal(cards.length, 5000);
  assert.ok(result.duplicateGroups.length > 0);
  // Ensure 5,000 contacts analysis runs in under 500ms
  assert.ok(elapsed < 500, `Expected elapsed < 500ms, got ${elapsed}ms`);
});

test("identifies auto-fixable vs manual quality issues and extracts before/after diffs", () => {
  const cards = parseVcf([
    // Auto-fixable 1: Email typo
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Alice Smith",
    "EMAIL:alice@gmial.com",
    "TEL:+91 98765 00001",
    "END:VCARD",
    // Auto-fixable 2: Missing name but company exists
    "BEGIN:VCARD",
    "VERSION:3.0",
    "ORG:Acme Corporation",
    "TEL:+91 98765 00002",
    "END:VCARD",
    // Auto-fixable 3: Internal duplicate TEL
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Bob Builder",
    "TEL:+91 98765 00003",
    "TEL:+91 98765 00003",
    "END:VCARD",
    // Manual review issue: Short invalid phone (unrepairable)
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Charlie Chaplin",
    "TEL:123",
    "END:VCARD",
    // Manual review issue: Ghost contact (no name, no phone, no email)
    "BEGIN:VCARD",
    "VERSION:3.0",
    "NOTE:Empty note only",
    "END:VCARD",
  ].join("\r\n"));

  const analysis = analyzeContacts(cards);
  assert.equal(analysis.qualityIssues.length, 5);

  const cardMap = new Map(cards.map((c) => [c.id, c]));

  // Verify auto-fixable classification
  assert.equal(isQualityIssueAutoFixable(cards[0]), true); // Email typo
  assert.equal(isQualityIssueAutoFixable(cards[1]), true); // Company name fallback
  assert.equal(isQualityIssueAutoFixable(cards[2]), true); // Internal duplicate details
  assert.equal(isQualityIssueAutoFixable(cards[3]), false); // Short phone (manual)
  assert.equal(isQualityIssueAutoFixable(cards[4]), false); // Ghost contact (manual)

  // Verify diff extraction
  const diffs0 = getSafeFixDiffs(cards[0]);
  assert.ok(diffs0.length > 0);
  assert.equal(diffs0[0].field, "Email");
  assert.equal(diffs0[0].before, "alice@gmial.com");
  assert.equal(diffs0[0].after, "alice@gmail.com");

  const diffs1 = getSafeFixDiffs(cards[1]);
  assert.ok(diffs1.length > 0);
  assert.equal(diffs1[0].field, "Name");
  assert.equal(diffs1[0].after, "Acme Corporation");

  const diffs2 = getSafeFixDiffs(cards[2]);
  assert.ok(diffs2.length > 0);
  assert.equal(diffs2[0].field, "Phone");

  // Verify pre-populating initial quality decisions
  const initialDecisions = getInitialQualityDecisions(analysis.qualityIssues, cardMap);
  assert.equal(initialDecisions[cards[0].id], "fix");
  assert.equal(initialDecisions[cards[1].id], "fix");
  assert.equal(initialDecisions[cards[2].id], "fix");
  assert.equal(initialDecisions[cards[3].id], undefined);
  assert.equal(initialDecisions[cards[4].id], undefined);

  // Apply decisions and verify export
  const exported = applyDecisions(cards, [], {}, initialDecisions);
  const aliceExported = exported.find((c) => c.id === cards[0].id);
  assert.ok(aliceExported?.properties.some((p) => p.key === "EMAIL" && p.value === "alice@gmail.com"));

  // Apply decisions with empty quality decisions object (backward compatibility)
  const defaultExported = applyDecisions(cards, [], {}, {});
  const aliceDefaultExported = defaultExported.find((c) => c.id === cards[0].id);
  assert.ok(aliceDefaultExported?.properties.some((p) => p.key === "EMAIL" && p.value === "alice@gmail.com"));
});

test("allows 4-digit and 6-digit short numbers for intercoms and extensions without quality issues", () => {
  const vcf = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Security Guard",
    "TEL:1001",
    "END:VCARD",
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Office Extension",
    "TEL:7790",
    "END:VCARD",
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Campus Intercom",
    "TEL:123456",
    "END:VCARD",
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Complex PBX",
    "TEL:234567",
    "END:VCARD",
  ].join("\r\n");

  const cards = parseVcf(vcf);
  const analysis = analyzeContacts(cards);
  assert.equal(analysis.qualityIssues.length, 0);
});

test("flags truly short numbers of 1, 2, 3, or 5 digits as short-phone", () => {
  const vcf = [
    "BEGIN:VCARD", "VERSION:3.0", "FN:Too Short 1", "TEL:9", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Too Short 2", "TEL:42", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Too Short 3", "TEL:123", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Incomplete 5", "TEL:12345", "END:VCARD",
  ].join("\r\n");

  const cards = parseVcf(vcf);
  const analysis = analyzeContacts(cards);
  assert.equal(analysis.qualityIssues.length, 4);
  for (const issue of analysis.qualityIssues) {
    assert.deepEqual(issue.codes, ["short-phone"]);
  }
});

test("allows landline numbers across all formats with and without codes", () => {
  const vcf = [
    // 1. Landline with +91 country code and STD code (12 digits)
    "BEGIN:VCARD", "VERSION:3.0", "FN:Mumbai Landline", "TEL:+91 22 40193302", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Delhi Landline", "TEL:+91 11 23456789", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Ahmedabad Landline", "TEL:+91 79 26561234", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Vadodara Landline", "TEL:+91 265 2345678", "END:VCARD",
    // 2. Landline with +91 country code and trunk 0 (13 digits)
    "BEGIN:VCARD", "VERSION:3.0", "FN:Trunk With Plus91", "TEL:+91 022 40193302", "END:VCARD",
    // 3. Landline with trunk 0 and STD code (11 digits)
    "BEGIN:VCARD", "VERSION:3.0", "FN:Trunk Mumbai", "TEL:022 40193302", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Trunk Delhi", "TEL:011 23456789", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Trunk Vadodara", "TEL:0265 2345678", "END:VCARD",
    // 4. Landline with STD code without 0 or 91 (10 digits)
    "BEGIN:VCARD", "VERSION:3.0", "FN:Raw STD Mumbai", "TEL:2240193302", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Raw STD Delhi", "TEL:1123456789", "END:VCARD",
    // 5. Local landlines without STD code (8, 7, 6 digits)
    "BEGIN:VCARD", "VERSION:3.0", "FN:Local 8 Digit", "TEL:40193302", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Local 7 Digit", "TEL:2345678", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Local 6 Digit", "TEL:234567", "END:VCARD",
    // 6. Formatted landlines with parentheses and hyphens
    "BEGIN:VCARD", "VERSION:3.0", "FN:Formatted Landline 1", "TEL:+91 (22) 4019-3302", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Formatted Landline 2", "TEL:(022) 4019-3302", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Formatted Landline 3", "TEL:4019-3302", "END:VCARD",
    // 7. +91 prefix with local subscriber number (without STD)
    "BEGIN:VCARD", "VERSION:3.0", "FN:Plus91 Local 8", "TEL:+91 40193302", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Plus91 Local 7", "TEL:+91 2345678", "END:VCARD",
  ].join("\r\n");

  const cards = parseVcf(vcf);
  assert.equal(cards.length, 18);
  const analysis = analyzeContacts(cards);
  assert.equal(analysis.qualityIssues.length, 0);
});

test("normalizes and groups duplicate contacts across different landline notations", () => {
  const vcf = [
    "BEGIN:VCARD", "VERSION:3.0", "FN:Janam Office A", "TEL:+91 22 40193302", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Janam Office B", "TEL:022 40193302", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Janam Office C", "TEL:2240193302", "END:VCARD",
    "BEGIN:VCARD", "VERSION:3.0", "FN:Janam Office D", "TEL:+91 022 40193302", "END:VCARD",
  ].join("\r\n");

  const cards = parseVcf(vcf);
  const analysis = analyzeContacts(cards);
  // All 4 should be grouped together into a single duplicate group
  assert.equal(analysis.duplicateGroups.length, 1);
  assert.equal(analysis.duplicateGroups[0].cardIds.length, 4);
});

test("detects internal duplicate details for repeated intercom numbers", () => {
  const vcf = parseVcf([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Front Desk",
    "TEL:1001",
    "TEL:1001",
    "END:VCARD",
  ].join("\r\n"))[0];

  const analysis = analyzeContacts([vcf]);
  assert.equal(analysis.qualityIssues.length, 1);
  assert.deepEqual(analysis.qualityIssues[0].codes, ["internal-duplicate-details"]);

  const repaired = safelyRepairContact(vcf);
  const summary = summarizeContact(repaired.card);
  assert.equal(summary.phones.length, 1);
  assert.equal(summary.phones[0].value, "1001");
});







