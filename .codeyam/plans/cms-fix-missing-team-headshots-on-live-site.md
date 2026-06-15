---
title: "cms: Fix Missing Team Headshots on Live Site"
mode: ui
createdAt: "2026-06-15T00:00:00Z"
source: manual
prefix: "cms"
---

## Summary

On the deployed GitHub Pages site (https://jaredcosulich.github.io/harvardintech/) the Board of Directors section renders initials avatars ("BW", "JL", …) instead of the team headshots that appear in the local Live Preview. The cause is a data gap, not a rendering or base-path bug: the `photo:` frontmatter field was added to all five `src/content/team/*.md` files in the working tree but was never committed. The deployed site is built from committed code (HEAD), where every team entry lacks `photo`, so `BoardMemberCard.astro` falls through to its intentional initials fallback (which only triggers when `member.photo` is falsy). Live Preview builds from the working tree, which has the `photo:` lines, so it shows the images. The fix is to commit the `photo:` frontmatter on all five files and add a small regression test so a missing or mistyped team photo is caught before it ships again.

## Key Decisions

- **Treat this as a data/deploy bug, not a code bug.** `BoardMemberCard.astro` already renders `withBase(member.photo)` correctly and the PNGs (`public/images/team/*.png`) are committed and base-aware. Nothing in the rendering path needs to change — the deployed markdown simply lacks the `photo` field. Considered adding an `onerror` image fallback, but that would mask real 404s and isn't the actual failure mode here (initials show because `photo` is *absent*, not because the image 404s).
- **Keep the initials fallback intact.** The initials avatar is a deliberate, scenario-covered branch (`boardmembercard-initials-fallback`) for members with no photo. The fix must not remove or weaken it — only ensure the seeded board members actually carry a `photo`.
- **Add a filesystem integrity test rather than a content-collection test.** Reading `astro:content`'s `getCollection` from vitest is awkward; the existing `src/lib/team.test.ts` tests are pure-logic. The new guard reads the `src/content/team/*.md` files directly via `fs`, asserts each has a `photo`, and asserts the referenced file exists under `public/`. This catches both "forgot to set photo" and "photo path typo / missing image" before deploy.

## Implementation

### 1. Commit the `photo` frontmatter on all five team members

**Files**:
- `src/content/team/ben-wei.md`
- `src/content/team/jessica-li.md`
- `src/content/team/krysia-lenzo.md`
- `src/content/team/nadia-eldeib.md`
- `src/content/team/peter-boyce.md`

Each already has the correct `photo:` line in the working tree (e.g. `photo: /images/team/ben-wei.png`), pointing at a committed PNG under `public/images/team/`. These edits are currently uncommitted, which is exactly why the deployed build is missing them. The change here is simply to ensure these `photo:` lines are present and get committed so the production build picks them up. No path changes are needed — `BoardMemberCard.astro` already wraps the value in `withBase()`, so the base-agnostic `/images/team/...` path resolves correctly under both the custom-domain base (`/`) and the project base (`/harvardintech/`).

### 2. Add a regression test for seeded team photos

**New file**: `src/lib/team.photos.test.ts`

A vitest test that:
- Reads every `*.md` file under `src/content/team/` with Node `fs`.
- Parses the `photo:` value from each file's frontmatter (a simple line-based read is sufficient — these are flat frontmatter blocks; no need for a YAML dependency).
- Asserts every team member declares a non-empty `photo`.
- Resolves the `photo` path against `public/` (stripping the leading `/`) and asserts the referenced image file exists on disk.

This locks in the contract that the curated board members all ship with a real, present headshot, so a future missing-or-typo'd `photo` fails CI instead of silently degrading to initials on the live site. It deliberately does **not** assert anything about members *without* a photo — the initials fallback remains a valid state for any future name-and-role-only entry.

## Reused existing code

- `BoardMemberCard` from `src/components/BoardMemberCard.astro` (glossary entry: `BoardMemberCard`) — unchanged; already renders `withBase(member.photo)` with an initials fallback.
- `withBase` from `src/lib/url.ts` — already applied at the BoardMemberCard render site; confirms photo paths resolve under the project base.
- `initials` / `sortBoardMembers` / `splitRole` from `src/lib/team.ts` — the team helpers; the new test sits alongside `src/lib/team.test.ts` which already exercises these.
- `team` content collection schema in `src/content/config.ts` — `photo` is an optional `z.string()`; the new test tightens the *seeded-data* expectation without changing the schema's optionality.

## Scenarios to Demonstrate

- **Live site / project base (`/harvardintech/`)** — all five board members render their grayscale circular headshots, matching the Live Preview. (This is the bug being fixed.)
- **Custom-domain base (`/`)** — same five headshots resolve correctly with no double-prefixing.
- **Initials fallback preserved** — a hypothetical board member authored with no `photo` still renders the initials avatar (existing `boardmembercard-initials-fallback` scenario), proving the fix is data-only and the fallback branch is intact.
- **Regression guard fails on a missing photo** — temporarily removing a `photo:` line (or pointing it at a non-existent file) makes `src/lib/team.photos.test.ts` fail, demonstrating the guard catches the exact mistake that caused this bug.
