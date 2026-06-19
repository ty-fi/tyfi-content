// core.js — Canonical business logic for tyfi-content vault.
// No I/O. No Obsidian APIs. No Node.js builtins.
//
// Used directly by scripts/cli.js via require('./core.js').
// Obsidian QuickAdd scripts (add.js, reindex.js) cannot use require() for local files,
// so they inline a copy of the functions they need. When changing logic here,
// mirror the relevant changes into add.js and reindex.js as well.
'use strict';

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[‘’“”''""]/g, '') // strip smart quotes
    .replace(/[^\w\s-]/g, ' ')                       // non-word chars → space
    .trim()
    .replace(/[\s_]+/g, '-')                         // whitespace/underscore → hyphen
    .replace(/-+/g, '-')                             // collapse hyphens
    .replace(/^-|-$/g, '');                          // trim leading/trailing hyphens
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Escapes a value for a YAML double-quoted scalar.
function ys(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Formats a YAML array field. Returns '[]' for empty; block scalar for non-empty.
function yamlArr(name, arr) {
  if (!arr || arr.length === 0) return `${name}: []`;
  return `${name}:\n${arr.map(v => `  - ${v}`).join('\n')}`;
}

function buildWorkFrontmatter(f) {
  const lines = [
    '---',
    `title: "${ys(f.title)}"`,
    `type: ${f.type || 'article'}`,
    `date: ${f.date || formatDate(new Date())}`,
  ];
  if (f.employer)      lines.push(`employer: "${ys(f.employer)}"`);
  if (f.client)        lines.push(`client: "${ys(f.client)}"`);
  if (f.jurisdiction)  lines.push(`jurisdiction: "${ys(f.jurisdiction)}"`);
  if (f.docket_no)     lines.push(`docket_no: "${ys(f.docket_no)}"`);
  lines.push(yamlArr('topics',     f.topics));
  lines.push(yamlArr('categories', f.categories));
  lines.push(yamlArr('coauthors',  f.coauthors));
  lines.push(`summary: "${ys(f.summary)}"`);
  if (f.pdf_url)       lines.push(`pdf_url: "${ys(f.pdf_url)}"`);
  if (f.canonical_url) lines.push(`canonical_url: "${ys(f.canonical_url)}"`);
  lines.push(`featured: ${f.featured === true ? 'true' : 'false'}`);
  lines.push('---');
  return lines.join('\n');
}

function buildPressFrontmatter(f) {
  const lines = [
    '---',
    `title: "${ys(f.title)}"`,
    `outlet: "${ys(f.outlet)}"`,
    `date: ${f.date || formatDate(new Date())}`,
    `kind: ${f.kind || 'citation'}`,
    `url: "${ys(f.url)}"`,
  ];
  if (f.quote)        lines.push(`quote: "${ys(f.quote)}"`);
  if (f.related_work) lines.push(`related_work: ${f.related_work}`);
  if (f.summary)      lines.push(`summary: "${ys(f.summary)}"`);
  lines.push('---');
  return lines.join('\n');
}

function buildBlogFrontmatter(f) {
  const lines = [
    '---',
    `title: "${ys(f.title)}"`,
    `date: ${f.date || formatDate(new Date())}`,
    yamlArr('tags', f.tags),
    `draft: ${f.draft !== false ? 'true' : 'false'}`,
  ];
  if (f.summary) lines.push(`summary: "${ys(f.summary)}"`);
  lines.push('---');
  return lines.join('\n');
}

function buildFileContent(type, fields) {
  let fm;
  if (type === 'work')       fm = buildWorkFrontmatter(fields);
  else if (type === 'press') fm = buildPressFrontmatter(fields);
  else if (type === 'blog')  fm = buildBlogFrontmatter(fields);
  else throw new Error('Unknown content type: ' + type);
  const body = fields.body ? '\n' + fields.body.trim() + '\n' : '\n';
  return fm + body;
}

function workSlug(title)         { return slugify(title); }
function pressSlug(outlet, date) { return slugify(outlet) + '-' + (date || formatDate(new Date())); }
function blogSlug(title, date)   { return (date || formatDate(new Date())) + '-' + slugify(title); }

// Builds one Markdown table row for the index.
function buildIndexRow(type, entry) {
  const d = entry.date || '';
  const t = entry.title || '';
  const s = entry.slug || '';
  const link = `[${s}](${s}.md)`;
  if (type === 'work')  return `| ${d} | ${t} | ${entry.type || ''} | ${entry.employer || ''} | ${link} |`;
  if (type === 'press') return `| ${d} | ${t} | ${entry.outlet || ''} | ${entry.kind || ''} | ${link} |`;
  return `| ${d} | ${t} | ${entry.draft !== false ? 'draft' : 'published'} | ${link} |`;
}

const INDEX_HEADERS = {
  work:  '| Date | Title | Type | Employer | File |\n|------|-------|------|----------|------|',
  press: '| Date | Title | Outlet | Kind | File |\n|------|-------|--------|------|------|',
  blog:  '| Date | Title | Status | File |\n|------|-------|--------|------|',
};

const INDEX_TITLES = { work: 'Works Index', press: 'Press Index', blog: 'Blog Index' };

// Builds a complete _INDEX.md table from an array of entries, sorted newest-first.
function buildIndexTable(type, entries) {
  const sorted = [...entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return [
    `# ${INDEX_TITLES[type] || type}`,
    '',
    INDEX_HEADERS[type] || '',
    ...sorted.map(e => buildIndexRow(type, e)),
    '',
  ].join('\n');
}

// Prepends a single new row to an existing index table string.
// Used by add.js (interactive) after creating one entry.
// Finds the header separator line (|---|) and inserts immediately after it.
function prependRowToIndex(tableStr, type, newEntry) {
  const newRow = buildIndexRow(type, newEntry);
  const lines = tableStr.split('\n');
  const sepIdx = lines.findIndex(l => /^\|[-| ]+\|/.test(l));
  if (sepIdx === -1) return tableStr.trimEnd() + '\n' + newRow + '\n';
  return [...lines.slice(0, sepIdx + 1), newRow, ...lines.slice(sepIdx + 1)].join('\n');
}

module.exports = {
  slugify,
  formatDate,
  buildFileContent,
  workSlug,
  pressSlug,
  blogSlug,
  buildIndexRow,
  buildIndexTable,
  prependRowToIndex,
};
