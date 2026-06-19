# tyfi-content

A personal knowledge vault of Tyler Fitch's professional works, press appearances, and writing.
Plain Markdown + YAML frontmatter, version-controlled with git, and browsable as an Obsidian vault.

## What's here

| Folder | Contents |
|--------|----------|
| `works/` | Published research, testimony, reports, articles |
| `press/` | Press citations, interviews, podcast appearances |
| `blog/` | Personal writing and essays |
| `pdfs/` | Local PDF copies of published works |
| `scripts/` | CLI and Obsidian QuickAdd utilities |
| `init/` | Batch import format reference |

The `_INDEX.md` in each folder is a human-readable table of all entries — the easiest way to get
an overview at a glance without opening individual files.

---

## Adding content

### Via Obsidian (QuickAdd) — recommended for day-to-day use

1. Open this folder as a vault in Obsidian
2. Install [QuickAdd](https://obsidian.md/plugins?id=quickadd) if not already installed
3. If the "Add Content" macro isn't registered yet: QuickAdd settings → Macros → Import → select `scripts/add.js`
4. `Ctrl/Cmd+P` → type "QuickAdd" → **Add Content**
5. Choose Work, Press, or Blog Post and fill in the prompted fields

The script writes the new `.md` file and updates the relevant `_INDEX.md` automatically.

### Via terminal (Node.js) — no Obsidian needed

```powershell
# Interactive — prompts you through each field:
node scripts/cli.js

# Batch import from a JSON file:
node scripts/cli.js --input init/batch-data.json --type all
node scripts/cli.js --input init/batch-data.json --type works
node scripts/cli.js --input init/batch-data.json --type press

# Rebuild all _INDEX.md files from scratch (use after manual file edits):
node scripts/cli.js --reindex
```

No `npm install` needed — uses Node.js built-ins only.

### Manually

1. Copy `_template.md` from the target folder (`works/`, `press/`, or `blog/`)
2. Rename the copy following the slug conventions below
3. Fill in the frontmatter fields
4. Run `node scripts/cli.js --reindex` to update the index, or edit `_INDEX.md` by hand

---

## Frontmatter reference

### works/*.md

| Field | Required | Notes |
|-------|----------|-------|
| `title` | ✓ | Full title of the work |
| `type` | ✓ | `testimony` `report` `white-paper` `brief` `article` `thesis` `comment` |
| `date` | ✓ | YYYY-MM-DD |
| `summary` | ✓ | 2–3 sentence abstract |
| `employer` | | Organization you worked for at time of filing |
| `client` | | Organization on whose behalf the work was filed |
| `jurisdiction` | | State or jurisdiction (regulatory work only) |
| `docket_no` | | Regulatory docket number |
| `topics` | | Array of topic tags |
| `categories` | | Free-form filter tags (used on the portfolio filter UI) |
| `coauthors` | | Array of coauthor names |
| `pdf_url` | | `pdfs/filename.pdf` (local) or `https://...` (external) |
| `canonical_url` | | Canonical external URL |
| `featured` | | `true` to surface on portfolio home page |

### press/*.md

| Field | Required | Notes |
|-------|----------|-------|
| `title` | ✓ | Article or segment headline |
| `outlet` | ✓ | Publication or outlet name |
| `date` | ✓ | YYYY-MM-DD |
| `kind` | ✓ | `citation` `interview` `conference-talk` `podcast` `video` |
| `url` | ✓ | Link to the piece |
| `quote` | | Pull-quote from the piece |
| `related_work` | | Slug of a related works entry |
| `summary` | | One-line context note |

### blog/*.md

| Field | Required | Notes |
|-------|----------|-------|
| `title` | ✓ | Post title |
| `date` | ✓ | YYYY-MM-DD |
| `tags` | | Array of tags |
| `draft` | | `true` (default) until ready to publish |
| `summary` | | One-line teaser shown in listings |

---

## PDFs

Place PDF copies in the `pdfs/` folder and reference them in frontmatter:

```yaml
pdf_url: "pdfs/my-testimony.pdf"
```

PDFs are tracked in git by default. If the repo grows large, upgrade to Git LFS:

```powershell
git lfs track "pdfs/*.pdf"
git add .gitattributes && git commit -m "Track PDFs with LFS"
```

---

## Slug conventions

The file name (without `.md`) becomes the slug used in `related_work` references and `[[wikilinks]]`.

| Type | Convention | Example |
|------|-----------|---------|
| Work | Lowercase hyphenated title or docket identifier | `ncuc-e-100-sub-179-2022.md` |
| Press | `outlet-YYYY-MM-DD` (slugified outlet) | `canary-media-2022-09-02.md` |
| Blog | `YYYY-MM-DD-post-title` | `2026-06-19-my-post.md` |

Scripts generate slugs automatically; for manual files, follow the same pattern.

---

## Cross-references (wikilinks)

Reference other works anywhere in the body or summary:

```markdown
See the companion testimony in [[ncuc-e-100-sub-179-2022]].
Or with custom display text: [[the 2022 Carbon Plan testimony|ncuc-e-100-sub-179-2022]].
```

The portfolio site uses these at build time to construct backlink lists on each work's detail page.

---

## Script architecture

`scripts/core.js` holds all business logic (slugify, frontmatter generation, index management).
Both `scripts/add.js` (Obsidian QuickAdd) and `scripts/cli.js` (Node.js) load it via
`require('./core.js')`. Any change to core logic automatically applies to both interfaces.

---

## Connection to portfolio site

This repo is the content source for [ty-fi/tyfi-portfolio](https://github.com/ty-fi/tyfi-portfolio).

**Option A — Git submodule** (recommended for automatic sync):

```powershell
cd C:\Users\fitch\dev-projects\tyfi-portfolio
git submodule add https://github.com/ty-fi/tyfi-content content
```

Then update `astro.config.mjs` to point content collections at `content/works/` and `content/press/`.
The GitHub Actions deploy workflow can run `git submodule update --remote` before building.

**Option B — Manual copy** (no setup required):

```powershell
Copy-Item works\*.md ..\tyfi-portfolio\src\content\work\ -Exclude "_*"
Copy-Item press\*.md ..\tyfi-portfolio\src\content\press\ -Exclude "_*"
```

---

## Git workflow

```powershell
git add .
git commit -m "Add: [title of new content]"
git push
```

When connected as a submodule, pushing to this repo triggers a rebuild of the portfolio site
via GitHub Actions.
