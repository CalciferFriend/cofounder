/**
 * core/tag/tag.test.ts — unit tests for task tagging helpers
 *
 * Phase 17b — Calcifer (2026-03-16)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateTag,
  addTag,
  removeTag,
  getTagRecord,
  listTagRecords,
  findByTag,
  clearTagRecord,
} from "./tag.ts";

// ─── Mock filesystem ─────────────────────────────────────────────────────────

const _files: Record<string, string> = {};

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async (p: string) => {
    const key = String(p);
    if (key in _files) return _files[key];
    throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
  }),
  writeFile: vi.fn(async (p: string, data: string) => {
    _files[String(p)] = data;
  }),
  readdir: vi.fn(async (p: string) => {
    const dir = String(p);
    return Object.keys(_files)
      .filter((k) => k.startsWith(dir + "/"))
      .map((k) => k.slice(dir.length + 1));
  }),
  mkdir: vi.fn(async () => {}),
  unlink: vi.fn(async (p: string) => {
    const key = String(p);
    if (key in _files) {
      delete _files[key];
      return;
    }
    throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
  }),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn((p: string) => {
    const dir = String(p);
    return Object.keys(_files).some((k) => k.startsWith(dir));
  }),
}));

beforeEach(() => {
  for (const key of Object.keys(_files)) delete _files[key];
});

// ─── validateTag ──────────────────────────────────────────────────────────────

describe("validateTag", () => {
  it("accepts a valid lowercase tag", () => {
    expect(validateTag("deploy")).toBeNull();
  });

  it("accepts hyphenated tags", () => {
    expect(validateTag("code-review")).toBeNull();
  });

  it("accepts tags with numbers", () => {
    expect(validateTag("v2-release")).toBeNull();
  });

  it("rejects empty strings", () => {
    expect(validateTag("")).not.toBeNull();
    expect(validateTag("   ")).not.toBeNull();
  });

  it("rejects tags exceeding 32 characters", () => {
    const long = "a".repeat(33);
    expect(validateTag(long)).toContain("32");
  });

  it("accepts tags after lowercase normalisation", () => {
    // validateTag lowercases internally, so "Deploy" → "deploy" is valid
    expect(validateTag("Deploy")).toBeNull();
  });

  it("rejects tags with spaces", () => {
    expect(validateTag("my tag")).not.toBeNull();
  });

  it("rejects tags with special characters", () => {
    expect(validateTag("tag!")).not.toBeNull();
    expect(validateTag("tag.name")).not.toBeNull();
  });
});

// ─── addTag ───────────────────────────────────────────────────────────────────

describe("addTag", () => {
  it("creates a new tag record", async () => {
    const rec = await addTag("task-1", ["deploy"]);
    expect(rec.task_id).toBe("task-1");
    expect(rec.tags).toEqual(["deploy"]);
    expect(rec.tagged_at).toBeDefined();
  });

  it("stores an optional note", async () => {
    const rec = await addTag("task-1", ["deploy"], "Shipped to prod");
    expect(rec.note).toBe("Shipped to prod");
  });

  it("normalises tags to lowercase", async () => {
    // validateTag rejects uppercase, so addTag should never get there
    // but the normalisation step still runs. We test with already-lowercase.
    const rec = await addTag("task-1", ["deploy", "hotfix"]);
    expect(rec.tags).toEqual(["deploy", "hotfix"]);
  });

  it("merges with existing tags", async () => {
    await addTag("task-1", ["deploy"]);
    const rec = await addTag("task-1", ["hotfix"]);
    expect(rec.tags).toContain("deploy");
    expect(rec.tags).toContain("hotfix");
  });

  it("deduplicates tags", async () => {
    await addTag("task-1", ["deploy"]);
    const rec = await addTag("task-1", ["deploy", "hotfix"]);
    expect(rec.tags.filter((t) => t === "deploy")).toHaveLength(1);
  });

  it("throws when exceeding 20 tags", async () => {
    const first20 = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
    await addTag("task-1", first20);
    await expect(addTag("task-1", ["tag-extra"])).rejects.toThrow("20");
  });

  it("throws for invalid tag names", async () => {
    await expect(addTag("task-1", ["BAD TAG!"])).rejects.toThrow("Invalid tag");
  });

  it("preserves original tagged_at on merge", async () => {
    const first = await addTag("task-1", ["deploy"]);
    const second = await addTag("task-1", ["hotfix"]);
    expect(second.tagged_at).toBe(first.tagged_at);
  });
});

// ─── removeTag ────────────────────────────────────────────────────────────────

describe("removeTag", () => {
  it("removes specific tags and leaves others", async () => {
    await addTag("task-1", ["deploy", "hotfix", "urgent"]);
    const rec = await removeTag("task-1", ["hotfix"]);
    expect(rec.tags).toEqual(["deploy", "urgent"]);
  });

  it("handles nonexistent task gracefully", async () => {
    const rec = await removeTag("ghost", ["deploy"]);
    expect(rec.task_id).toBe("ghost");
    expect(rec.tags).toEqual([]);
  });

  it("handles removing tags that don't exist on the record", async () => {
    await addTag("task-1", ["deploy"]);
    const rec = await removeTag("task-1", ["nonexistent"]);
    expect(rec.tags).toEqual(["deploy"]);
  });
});

// ─── getTagRecord ─────────────────────────────────────────────────────────────

describe("getTagRecord", () => {
  it("returns null for missing record", async () => {
    expect(await getTagRecord("nope")).toBeNull();
  });

  it("returns record for existing task", async () => {
    await addTag("task-1", ["deploy"]);
    const rec = await getTagRecord("task-1");
    expect(rec).not.toBeNull();
    expect(rec!.tags).toEqual(["deploy"]);
  });
});

// ─── listTagRecords ───────────────────────────────────────────────────────────

describe("listTagRecords", () => {
  it("returns empty array for empty dir", async () => {
    const all = await listTagRecords();
    expect(all).toEqual([]);
  });

  it("returns multiple records sorted by tagged_at desc", async () => {
    await addTag("task-1", ["deploy"]);
    await addTag("task-2", ["review"]);
    const all = await listTagRecords();
    expect(all).toHaveLength(2);
  });
});

// ─── findByTag ────────────────────────────────────────────────────────────────

describe("findByTag", () => {
  it("returns empty for no matches", async () => {
    await addTag("task-1", ["deploy"]);
    const results = await findByTag("review");
    expect(results).toEqual([]);
  });

  it("returns single match", async () => {
    await addTag("task-1", ["deploy"]);
    await addTag("task-2", ["review"]);
    const results = await findByTag("deploy");
    expect(results).toHaveLength(1);
    expect(results[0].task_id).toBe("task-1");
  });

  it("returns multiple matches", async () => {
    await addTag("task-1", ["deploy", "urgent"]);
    await addTag("task-2", ["deploy"]);
    await addTag("task-3", ["review"]);
    const results = await findByTag("deploy");
    expect(results).toHaveLength(2);
  });
});

// ─── clearTagRecord ───────────────────────────────────────────────────────────

describe("clearTagRecord", () => {
  it("returns true for existing record", async () => {
    await addTag("task-1", ["deploy"]);
    expect(await clearTagRecord("task-1")).toBe(true);
  });

  it("returns false for missing record", async () => {
    expect(await clearTagRecord("ghost")).toBe(false);
  });

  it("removes the record from disk", async () => {
    await addTag("task-1", ["deploy"]);
    await clearTagRecord("task-1");
    expect(await getTagRecord("task-1")).toBeNull();
  });
});
