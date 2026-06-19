// add.js — QuickAdd user script for tyfi-content vault.
// Register as the "Add Content" macro in QuickAdd (see .obsidian/plugins/quickadd/data.json).
//
// Shares all business logic with scripts/cli.js via scripts/core.js.
// Uses path.join(__dirname, ...) for reliable resolution inside Obsidian's module loader.

const path = require('path');
const core = require(path.join(__dirname, 'core.js'));

module.exports = async (params) => {
  const { app, quickAddApi } = params;
  const today = core.formatDate(new Date());

  const FLOWS = ['Add Work', 'Add Press', 'Add Blog Post'];
  const flow = await quickAddApi.suggester(FLOWS, FLOWS);
  if (flow == null) return;

  if (flow === 'Add Work')       await flowWork(app, quickAddApi, today);
  else if (flow === 'Add Press') await flowPress(app, quickAddApi, today);
  else                           await flowBlog(app, quickAddApi, today);
};

// ── Add Work ──────────────────────────────────────────────────────────────────

async function flowWork(app, quickAddApi, today) {
  const TYPES = ['testimony', 'report', 'white-paper', 'brief', 'article', 'thesis', 'comment'];
  const type = await quickAddApi.suggester(TYPES, TYPES);
  if (type == null) return;

  const title = await quickAddApi.inputPrompt('Title', 'Full title of the work');
  if (!title?.trim()) return;

  const date    = await quickAddApi.inputPrompt('Date (YYYY-MM-DD)', '', today);
  const summary = await quickAddApi.inputPrompt('Summary', '2–3 sentence abstract');
  if (!summary?.trim()) return;

  const employer = await quickAddApi.inputPrompt('Employer (enter to skip)', 'e.g. RMI, Synapse', '') ?? '';
  const client   = await quickAddApi.inputPrompt('Client (enter to skip)', 'e.g. Vote Solar', '') ?? '';

  const regAnswer = await quickAddApi.suggester(['No', 'Yes'], ['No', 'Yes'], false, 'Regulatory filing?');
  let jurisdiction = '', docket_no = '';
  if (regAnswer === 'Yes') {
    jurisdiction = (await quickAddApi.inputPrompt('Jurisdiction', 'e.g. North Carolina', '')) ?? '';
    docket_no    = (await quickAddApi.inputPrompt('Docket number (enter to skip)', 'e.g. E-100, Sub 179', '')) ?? '';
  }

  const pdfFile    = (await quickAddApi.inputPrompt('PDF filename (enter to skip)', 'e.g. my-testimony.pdf', '')) ?? '';
  const canonicalUrl = (await quickAddApi.inputPrompt('Canonical URL (enter to skip)', 'https://...', '')) ?? '';

  const fields = {
    title: title.trim(),
    type,
    date: (date ?? today).trim(),
    employer:     employer.trim()    || undefined,
    client:       client.trim()      || undefined,
    jurisdiction: jurisdiction.trim() || undefined,
    docket_no:    docket_no.trim()   || undefined,
    topics: [], categories: [], coauthors: [],
    summary: summary.trim(),
    pdf_url:      pdfFile.trim()     ? `pdfs/${pdfFile.trim()}` : undefined,
    canonical_url: canonicalUrl.trim() || undefined,
    featured: false,
  };

  const slug     = core.workSlug(title.trim());
  const filePath = `works/${slug}.md`;

  if (app.vault.getAbstractFileByPath(filePath)) {
    new Notice(`Already exists: ${filePath}`);
    return;
  }
  await app.vault.create(filePath, core.buildFileContent('work', fields));
  await updateIndex(app, 'works/_INDEX.md', 'work', { ...fields, slug });
  new Notice(`Work added: ${slug}.md`);
}

// ── Add Press ─────────────────────────────────────────────────────────────────

async function flowPress(app, quickAddApi, today) {
  const KINDS = ['citation', 'interview', 'conference-talk', 'podcast', 'video'];
  const kind = await quickAddApi.suggester(KINDS, KINDS);
  if (kind == null) return;

  const title  = await quickAddApi.inputPrompt('Headline', 'Article or segment headline');
  if (!title?.trim()) return;

  const outlet = await quickAddApi.inputPrompt('Outlet', 'e.g. Canary Media, Bloomberg');
  if (!outlet?.trim()) return;

  const date   = await quickAddApi.inputPrompt('Date (YYYY-MM-DD)', '', today);
  const url    = await quickAddApi.inputPrompt('URL', 'https://...');
  if (!url?.trim()) return;

  const quote    = (await quickAddApi.inputPrompt('Pull quote (enter to skip)', '', '')) ?? '';
  const relWork  = (await quickAddApi.inputPrompt('Related work slug (enter to skip)', 'e.g. ncuc-e-100-sub-179-2022', '')) ?? '';
  const summary  = (await quickAddApi.inputPrompt('One-line summary (enter to skip)', '', '')) ?? '';

  const fields = {
    title:   title.trim(),
    outlet:  outlet.trim(),
    date:    (date ?? today).trim(),
    kind,
    url:     url.trim(),
    quote:        quote.trim()   || undefined,
    related_work: relWork.trim() || undefined,
    summary:      summary.trim() || undefined,
  };

  const slug     = core.pressSlug(outlet.trim(), (date ?? today).trim());
  const filePath = `press/${slug}.md`;

  if (app.vault.getAbstractFileByPath(filePath)) {
    new Notice(`Already exists: ${filePath}`);
    return;
  }
  await app.vault.create(filePath, core.buildFileContent('press', fields));
  await updateIndex(app, 'press/_INDEX.md', 'press', { ...fields, slug });
  new Notice(`Press entry added: ${slug}.md`);
}

// ── Add Blog Post ─────────────────────────────────────────────────────────────

async function flowBlog(app, quickAddApi, today) {
  const title = await quickAddApi.inputPrompt('Post title', 'Title…');
  if (!title?.trim()) return;

  const tagsRaw = (await quickAddApi.inputPrompt('Tags (comma-separated, enter to skip)', '', '')) ?? '';
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const fields = { title: title.trim(), date: today, tags, draft: true };
  const slug     = core.blogSlug(title.trim(), today);
  const filePath = `blog/${slug}.md`;

  if (app.vault.getAbstractFileByPath(filePath)) {
    new Notice(`Already exists: ${filePath}`);
    return;
  }
  await app.vault.create(filePath, core.buildFileContent('blog', fields));
  await updateIndex(app, 'blog/_INDEX.md', 'blog', { ...fields, slug });
  new Notice(`Blog post created: ${slug}.md`);
  app.workspace.openLinkText(slug, '', true);
}

// ── Shared: update _INDEX.md ──────────────────────────────────────────────────

async function updateIndex(app, indexPath, type, entry) {
  const file = app.vault.getAbstractFileByPath(indexPath);
  if (!file) { new Notice(`Index not found: ${indexPath}`); return; }
  const current = await app.vault.read(file);
  await app.vault.modify(file, core.prependRowToIndex(current, type, entry));
}
