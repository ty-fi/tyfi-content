// reindex.js — Silently rebuilds all _INDEX.md files.
// Registered as an executeOnStartup macro in QuickAdd — runs every time
// Obsidian opens, keeping indexes current without any manual step.
//
// Uses Obsidian's metadataCache (frontmatter already parsed, no file reads)
// and core.buildIndexTable() for the actual table generation.

const path = require('path');
const core = require(path.join(__dirname, 'core.js'));

module.exports = async ({ app }) => {
  await rebuildIndex(app, 'works', 'work', f => ({
    slug:     f.basename,
    date:     fmDate(app, f),
    title:    fm(app, f, 'title') || f.basename,
    type:     fm(app, f, 'type')     || '',
    employer: fm(app, f, 'employer') || '',
  }));

  await rebuildIndex(app, 'press', 'press', f => ({
    slug:   f.basename,
    date:   fmDate(app, f),
    title:  fm(app, f, 'title')  || f.basename,
    outlet: fm(app, f, 'outlet') || '',
    kind:   fm(app, f, 'kind')   || '',
  }));

  await rebuildIndex(app, 'blog', 'blog', f => ({
    slug:  f.basename,
    date:  fmDate(app, f),
    title: fm(app, f, 'title') || f.basename,
    draft: fm(app, f, 'draft') !== 'false' && fm(app, f, 'draft') !== false,
  }));
};

async function rebuildIndex(app, folder, type, entryFn) {
  const files = app.vault.getMarkdownFiles()
    .filter(f => f.path.startsWith(`${folder}/`) && !f.name.startsWith('_'));

  const entries = files.map(f => entryFn(f));
  const table   = core.buildIndexTable(type, entries);

  const indexFile = app.vault.getAbstractFileByPath(`${folder}/_INDEX.md`);
  if (indexFile) await app.vault.modify(indexFile, table);
}

// Read a frontmatter field from Obsidian's metadata cache (no disk I/O).
function fm(app, file, key) {
  return app.metadataCache.getFileCache(file)?.frontmatter?.[key] ?? null;
}

// Return date as a YYYY-MM-DD string regardless of whether it was stored
// as a string or as a Date object (Obsidian parses ISO dates automatically).
function fmDate(app, file) {
  const val = fm(app, file, 'date');
  if (!val) return '';
  return String(val).slice(0, 10);
}
