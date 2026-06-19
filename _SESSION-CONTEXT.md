# tyfi-content — Session Context

## At a Glance
**Objective:** Standalone Obsidian vault + git repo for managing Tyler Fitch's professional content (works, press, blog) — decoupled from any web framework and easily synced to the portfolio site.
**Status:** ✅ Live on GitHub (`ty-fi/tyfi-content`). QuickAdd working, pre-commit hook working, 13 works + 8 press entries seeded.
**Last session:** Built the whole repo from scratch: QuickAdd scripts (add.js, reindex.js), Node.js CLI (cli.js), shared core logic, auto-managed _INDEX.md tables, pre-commit reindex hook, and a native OS PDF file picker in the Add Work flow.
**Next:** Verify Reindex runs on Obsidian startup (`"runOnStartup"` on the choice in data.json). Optionally delete the `add-content-2` duplicate choice once Add Content original is confirmed working.
**User Actions Needed:** (1) Confirm "Add Content" (original QuickAdd choice) works after `scriptPath`→`path` fix. (2) Consider deleting `add-content-2` duplicate choice in QuickAdd settings. (3) Push the 3 commits that are ahead of origin/main.
**Repo:** https://github.com/ty-fi/tyfi-content.git
**Last machine:** TY_FI

---

## What this repo is
An Obsidian vault with version control. Content is authored here using QuickAdd or the Node.js CLI, then synced to `ty-fi/tyfi-portfolio/src/content/` for building the live site.

## Folder Structure
```
tyfi-content/
├── works/        # testimony, reports, articles — 13 entries
├── press/        # citations, interviews, podcasts — 8 entries
├── blog/         # blog posts (empty, drafts live elsewhere)
├── pdfs/         # local PDF copies (tracked in git)
├── scripts/
│   ├── core.js      # canonical pure business logic (no I/O)
│   ├── add.js       # QuickAdd user script (self-contained)
│   ├── reindex.js   # QuickAdd startup script (self-contained)
│   └── cli.js       # Node.js CLI (uses core.js via require)
└── init/
    └── batch-data.json  # batch import format example
```

## Quick-Start Commands
```powershell
# Interactive: add a single work/press/blog entry
node scripts/cli.js

# Batch import from JSON
node scripts/cli.js --input init/batch-data.json --type all

# Rebuild all _INDEX.md files
node scripts/cli.js --reindex
```

## What we did this session
- Created entire repo structure from scratch
- `core.js`: canonical pure functions (slugify, buildFileContent, buildIndexTable, etc.)
- `add.js`: self-contained QuickAdd script with 3 flows (Add Work / Add Press / Add Blog Post)
  - Native OS PDF file picker using DOM `<input type=file>` + `FileReader` + `app.vault.adapter.writeBinary()`
- `reindex.js`: self-contained QuickAdd startup script using `app.metadataCache` (no disk I/O)
- `cli.js`: Node.js CLI with interactive + batch (`--input`) + reindex (`--reindex`) modes
- Seeded 13 works and 8 press entries via batch import
- Pre-commit hook: `node scripts/cli.js --reindex && git add works/_INDEX.md press/_INDEX.md blog/_INDEX.md`
- Fixed QuickAdd `data.json`: `"scriptPath"` → `"path"` for both Add Content and Reindex commands
- Added `obsidian-git` to community-plugins.json
- Added `add-content-2` (user-created duplicate) is currently working; original "Add Content" should work after the path fix

## Current State
- QuickAdd: `add-content-2` confirmed working; "Add Content" original should work (path fix applied) — needs verification
- Reindex: `"runOnStartup": false` at choice level in data.json — may need to be `true` for auto-startup
- Pre-commit hook: working (rebuilds and stages _INDEX.md on every commit)
- 13 works + 8 press entries in place with correct frontmatter
- PDFs: tracked in git by default; `pdfs/` folder has `.gitkeep`
- Blog: empty; drafts are meant to live in Google Docs or similar until ready

## Next Steps
1. Open in Obsidian, run "Add Content" (original choice) to confirm the `path` fix took effect
2. If startup reindex is wanted, open data.json and set `"runOnStartup": true` on the Reindex choice
3. Delete `add-content-2` duplicate once Add Content is confirmed working
4. Push the 3 local commits to GitHub (`git push`)
5. Set up sync to tyfi-portfolio (submodule or copy script)

## Key Decisions / Gotchas
- **QuickAdd `require()` limitation**: `__dirname` in QuickAdd's eval context resolves to Obsidian's Electron install dir (`C:\Program Files\Obsidian\resources\...`), not the vault. `require('./core.js')` fails. All QuickAdd scripts must be fully self-contained with core functions inlined.
- **QuickAdd 2.x uses `"path"` not `"scriptPath"`** for UserScript commands in data.json
- **`"runOnStartup"` vs `"executeOnStartup"`**: `"runOnStartup"` is on the choice object level; `"executeOnStartup"` is on the command level inside the macro
- **PDF import in Obsidian**: uses DOM `<input type=file>` (no `require('fs')` needed) + `FileReader.readAsArrayBuffer()` + `app.vault.adapter.writeBinary()`. The `oncancel` event on file inputs works in Electron 28+ (Obsidian 1.5+).
- **core.js vs add.js/reindex.js sync**: When updating business logic in `core.js`, manually mirror changes into `add.js` and `reindex.js`. Comment at top of each file flags this requirement.
- **Frontmatter schemas**: Intentionally match tyfi-portfolio's Zod schemas exactly so files can be used directly by Astro with no transformation.

## Next Session Notes
- [2026-06-19] Entire repo built this session. QuickAdd path fix applied but not yet verified in Obsidian. Push is pending (3 commits ahead of origin). Submodule/sync to tyfi-portfolio not yet set up.
