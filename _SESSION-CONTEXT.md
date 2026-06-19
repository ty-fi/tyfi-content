# tyfi-content — Session Context

## At a Glance
**Objective:** Standalone Obsidian vault + git repo for managing Tyler Fitch's professional content (works, press, blog) — decoupled from any web framework and easily synced to the portfolio site.
**Status:** ✅ Live on GitHub (`ty-fi/tyfi-content`). 34 works + 31 press entries. QuickAdd working, pre-commit hook working.
**Last session:** Bulk-imported all content from `import-references/` — 21 new works and 23 new press entries added from the resume PDF and notes doc. Indexes rebuilt.
**Next:** Review flagged data issues below. Commit and push. Set up sync to tyfi-portfolio.
**User Actions Needed:** (1) Review `va-scc-e-2-sub-1219-2020.md` — has wrong data (NCUC docket E-2/Sub 1219 but labeled as Virginia Dominion IRP). Likely should be deleted. (2) Add missing quotes to press entries where marked. (3) Push commits to GitHub. (4) Confirm "Add Content" QuickAdd choice works in Obsidian.
**Repo:** https://github.com/ty-fi/tyfi-content.git
**Last machine:** TY_FI

---

## What this repo is
An Obsidian vault with version control. Content is authored here using QuickAdd or the Node.js CLI, then synced to `ty-fi/tyfi-portfolio/src/content/` for building the live site.

## Folder Structure
```
tyfi-content/
├── works/        # testimony, reports, articles — 34 entries
├── press/        # citations, interviews, podcasts — 31 entries
├── blog/         # blog posts (empty, drafts live elsewhere)
├── pdfs/         # local PDF copies (tracked in git)
├── scripts/
│   ├── core.js      # canonical pure business logic (no I/O)
│   ├── add.js       # QuickAdd user script (self-contained)
│   ├── reindex.js   # QuickAdd startup script (self-contained)
│   └── cli.js       # Node.js CLI (uses core.js via require)
└── import-references/  # source docs used for bulk import (safe to delete)
    ├── resume-fitch_1.pdf
    └── Untitled document.md
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
Bulk-imported all content from `import-references/`:

**Works added (21 new):**
- Resume publications (2022): `nc-carbon-free-2050-2022`, `entergy-no-resiliency-brief-2022`
- Vote Solar reports (2021): `carbon-stranding-full-report-2021`, `ncuc-duke-2020-irp-comments-2021`, `scpsc-partial-proposed-order-2021`, `scpsc-response-rehearing-2020-229-e-2021`
- Vote Solar publications (2020): `duke-irp-10-principles-2020`, `florida-rooftop-solar-2020`, `covid19-utility-customers-principles-2020`, `florida-gas-costs-risks-2020`, `covid19-utility-bill-debt-2020`
- Comments (2019): `nc-deq-clean-energy-plan-2019`
- Academic/UMich (2018): `islands-of-light-2018`, `fueling-energy-transition-droc-2018`, `get-free-highland-park-solar-2018`
- Testimony (2019–2023): `ncuc-e-7-sub-1214-dec-2020`, `ncuc-e-2-sub-1219-dep-2020`, `gpsc-42516-georgia-power-2019`, `va-scc-pur-2019-00214-2020`, `nsuarb-m10872-nova-scotia-2023`
- RMI (2025): `stranded-turbines-wisconsin-2025`

**Press added (23 new):** Bloomberg, GTM, CBJ (x3), ICN, WaPo, Business Insider, MarketWatch, CleanTechnica, PV Magazine, S&P Global (x2), AP News, BPR, 3x ENN, 2x Utility Dive, E&E News, ACEEE

**Updated:** `scpsc-reliability-comments-2021.md` — added docket 2021-66-A, canonical URL, corrected date to 2021-06-01

## Known Data Issues / Review Needed
- `works/va-scc-e-2-sub-1219-2020.md` — incorrectly labeled. Has docket "E-2, Sub 1219" (NCUC docket) but title says "Dominion Energy Virginia IRP." The correct files are:
  - `works/ncuc-e-2-sub-1219-dep-2020.md` — Duke Energy Progress rate case (NCUC, April 2020)
  - `works/va-scc-pur-2019-00214-2020.md` — Dominion Energy Virginia TOU rate (VA SCC, March 2020)
  → Tyler should delete `va-scc-e-2-sub-1219-2020.md`
- `works/key-climate-solution-lifting-off.md` — date 2018, employer "RMI," but Tyler was at UMich through 2018 and Vote Solar from Aug 2018. Review provenance.
- Press entries without `quote` field — Tyler should add specific pull-quotes for entries that are labeled `kind: interview` once he can check the articles.

## Not imported (insufficient data from source docs)
- E&E September 2020 quote (no URL in notes)
- Wichita Eagle September 2020 quote (paywall, no text)
- AZ Resource Planning presentations (November 2023, no URL or title)
- NRDC EV brief (NRDC-authored document; Tyler was cited, not author)
- Seeking Alpha Jan 2021 carbon stranding coverage (could add later)
- Thad's end-of-year statements (internal, not public content)

## Current State
- QuickAdd: `add-content-2` confirmed working; original "Add Content" should work (path fix applied last session) — needs Obsidian verification
- Reindex: `"runOnStartup": false` — may need to be `true` for auto-startup
- Pre-commit hook: working (rebuilds and stages _INDEX.md on every commit)
- 34 works + 31 press entries; blog is empty
- import-references/ folder is untracked (safe to delete or gitignore)

## Next Steps
1. Review and delete `works/va-scc-e-2-sub-1219-2020.md` (see Known Data Issues above)
2. Commit all new files: `git add . && git commit -m "Import: bulk content from resume and notes doc"`
3. Push to GitHub
4. Optionally gitignore `import-references/`
5. Set up sync to tyfi-portfolio (submodule or copy script)
6. Open in Obsidian, verify "Add Content" QuickAdd choice works

## Key Decisions / Gotchas
- **QuickAdd `require()` limitation**: `__dirname` in QuickAdd's eval context resolves to Obsidian's Electron install dir, not the vault. `require('./core.js')` fails. All QuickAdd scripts must be self-contained with core functions inlined.
- **QuickAdd 2.x uses `"path"` not `"scriptPath"`** for UserScript commands in data.json
- **`"runOnStartup"` vs `"executeOnStartup"`**: `"runOnStartup"` is on the choice object level; `"executeOnStartup"` is on the command level inside the macro
- **core.js vs add.js/reindex.js sync**: When updating business logic in `core.js`, manually mirror changes into `add.js` and `reindex.js`.
- **Frontmatter schemas**: Intentionally match tyfi-portfolio's Zod schemas exactly so files can be used directly by Astro with no transformation.

## Next Session Notes
- [2026-06-19] Bulk import from resume PDF + notes doc completed. 21 new works, 23 new press. Not yet committed or pushed. One existing file (`va-scc-e-2-sub-1219-2020.md`) has wrong data and should be deleted. Review and commit when Tyler returns.
