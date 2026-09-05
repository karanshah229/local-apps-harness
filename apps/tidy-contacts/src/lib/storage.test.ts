import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  saveSession,
  getSession,
  listSessionSummaries,
  deleteSession,
  formatFileSize,
  formatRelativeTime,
  type CleanupSession,
} from "./storage";

describe("session persistence and storage", () => {
  it("formats file sizes correctly", () => {
    assert.equal(formatFileSize(0), "0 B");
    assert.equal(formatFileSize(1024), "1.0 KB");
    assert.equal(formatFileSize(5 * 1024 * 1024), "5.0 MB");
  });

  it("formats relative timestamps", () => {
    const now = Date.now();
    assert.equal(formatRelativeTime(now), "Just now");
    assert.equal(formatRelativeTime(now - 120 * 1000), "2m ago");
    assert.equal(formatRelativeTime(now - 3600 * 1000 * 2), "2h ago");
  });

  it("saves, retrieves, lists, and deletes cleanup sessions in storage", async () => {
    const mockSession: CleanupSession = {
      id: "session_test_123",
      sourceName: "test_contacts.vcf",
      fileSize: 10240,
      createdAt: Date.now() - 10000,
      updatedAt: Date.now(),
      baseCards: [
        {
          id: "card-1",
          sourceIndex: 0,
          properties: [
            {
              lines: ["FN:Test User"],
              logical: "FN:Test User",
              key: "FN",
              params: [],
              value: "Test User",
            },
          ],
        },
      ],
      duplicateDecisions: {
        "group-1": { choice: "merge" },
      },
      qualityDecisions: {
        "card-1": "fix",
      },
      duplicateIndex: 0,
      qualityIndex: 0,
      history: [],
      mode: "duplicates",
      totalContacts: 1,
      totalIssues: 2,
      resolvedIssues: 2,
      effectiveCount: 1,
    };

    // Save
    await saveSession(mockSession);

    // Retrieve
    const retrieved = await getSession("session_test_123");
    assert.ok(retrieved);
    assert.equal(retrieved.id, "session_test_123");
    assert.equal(retrieved.sourceName, "test_contacts.vcf");
    assert.equal(retrieved.totalIssues, 2);
    assert.equal(retrieved.resolvedIssues, 2);

    // List summaries
    const summaries = await listSessionSummaries();
    assert.ok(summaries.length >= 1);
    const found = summaries.find((s) => s.id === "session_test_123");
    assert.ok(found);
    assert.equal(found.sourceName, "test_contacts.vcf");
    assert.equal(found.progressPercent, 100);

    // Filter matching session by filename (used when uploading same file again)
    const matching = summaries.filter(
      (s) => s.sourceName.trim().toLowerCase() === "test_contacts.vcf".toLowerCase()
    );
    assert.equal(matching.length, 1);
    assert.equal(matching[0].id, "session_test_123");

    // Delete
    await deleteSession("session_test_123");
    const afterDelete = await getSession("session_test_123");
    assert.equal(afterDelete, null);
  });
});
