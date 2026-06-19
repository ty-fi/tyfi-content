// reindex.js — Silently rebuilds all _INDEX.md files.
// Registered as a runOnStartup macro in QuickAdd.
// Self-contained: core logic is inlined below (no require() of local files).
// When updating core logic, update scripts/core.js first, then mirror here.

module.exports = async ({ app }) => {
  await rebuildIndex(app, 'works', 'work', f => ({
    slug:     f.basename,
    date:     fmDate(app, f),
    title:    fm(app, f, 'title')    || f.basename,
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
    draft: fm(app, f, 'draft') !== false && fm(app, f, 'draft') !== 'false',
  }));
};

async function rebuildIndex(app, folder, type, entryFn) {
  const files = app.vault.getMarkdownFiles()
    .filter(f => f.path.startsWith(`${folder}/`) && !f.name.startsWith('_'));
  const entries   = files.map(f => entryFn(f));
  const indexFile = app.vault.getAbstractFileByPath(`${folder}/_INDEX.md`);
  if (indexFile) await app.vault.modify(indexFile, buildIndexTable(type, entries));
}

function fm(app, file, key) {
  return app.metadataCache.getFileCache(file)?.frontmatter?.[key] ?? null;
}
function fmDate(app, file) {
  const val = fm(app, file, 'date');
  return val ? String(val).slice(0, 10) : '';
}

// ── Core functions (mirrored from scripts/core.js) ────────────────────────────

function buildIndexRow(type, entry) {
  const {date:d='',title:t='',slug:s=''} = entry;
  const link = `[${s}](${s}.md)`;
  if (type==='work')  return `| ${d} | ${t} | ${entry.type||''} | ${entry.employer||''} | ${link} |`;
  if (type==='press') return `| ${d} | ${t} | ${entry.outlet||''} | ${entry.kind||''} | ${link} |`;
  return `| ${d} | ${t} | ${entry.draft!==false?'draft':'published'} | ${link} |`;
}
const INDEX_HEADERS = {
  work:  '| Date | Title | Type | Employer | File |\n|------|-------|------|----------|------|',
  press: '| Date | Title | Outlet | Kind | File |\n|------|-------|--------|------|------|',
  blog:  '| Date | Title | Status | File |\n|------|-------|--------|------|',
};
const INDEX_TITLES = { work: 'Works Index', press: 'Press Index', blog: 'Blog Index' };
function buildIndexTable(type, entries) {
  const sorted = [...entries].sort((a,b) => (b.date||'').localeCompare(a.date||''));
  return [`# ${INDEX_TITLES[type]||type}`, '', INDEX_HEADERS[type]||'', ...sorted.map(e=>buildIndexRow(type,e)), ''].join('\n');
}
