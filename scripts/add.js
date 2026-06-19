// add.js — QuickAdd user script for tyfi-content vault.
// Self-contained: core logic is inlined below (no require() of local files).
// When updating core logic, update scripts/core.js first, then mirror here.

module.exports = async (params) => {
  const { app, quickAddApi } = params;
  const today = formatDate(new Date());

  const FLOWS = ['Add Work', 'Add Press', 'Add Blog Post'];
  const flow = await quickAddApi.suggester(FLOWS, FLOWS, "Content type?");
  if (flow == null) return;

  if (flow === 'Add Work')       await flowWork(app, quickAddApi, today);
  else if (flow === 'Add Press') await flowPress(app, quickAddApi, today);
  else                           await flowBlog(app, quickAddApi, today);
};

// ── Add Work ──────────────────────────────────────────────────────────────────

async function flowWork(app, quickAddApi, today) {
  const TYPES = ['testimony', 'report', 'white-paper', 'brief', 'article', 'thesis', 'comment'];
  const type = await quickAddApi.suggester(TYPES, TYPES, "Type of work");
  if (type == null) return;

  const title = await quickAddApi.inputPrompt('Title', 'Full title of the work');
  if (!title?.trim()) return;

  const date    = await quickAddApi.inputPrompt('Date (YYYY-MM-DD)', '', today);
  const summary = await quickAddApi.inputPrompt('Summary', '2–3 sentence abstract');
  if (!summary?.trim()) return;

  const employer = (await quickAddApi.inputPrompt('Employer (enter to skip)', 'e.g. RMI, Synapse', '')) ?? '';
  const client   = (await quickAddApi.inputPrompt('Client (enter to skip)', 'e.g. Vote Solar', '')) ?? '';

  const regAnswer = await quickAddApi.suggester(['No', 'Yes'], ['No', 'Yes'], 'Regulatory filing?');
  let jurisdiction = '', docket_no = '';
  if (regAnswer === 'Yes') {
    jurisdiction = (await quickAddApi.inputPrompt('Jurisdiction', 'e.g. North Carolina', '')) ?? '';
    docket_no    = (await quickAddApi.inputPrompt('Docket number (enter to skip)', 'e.g. E-100, Sub 179', '')) ?? '';
  }

  const pdfResult    = await pickAndCopyPdf(app, quickAddApi);
  const canonicalUrl = (await quickAddApi.inputPrompt('Canonical URL (enter to skip)', 'https://...', '')) ?? '';

  const fields = {
    title: title.trim(), type, date: (date ?? today).trim(),
    employer:     employer.trim()     || undefined,
    client:       client.trim()       || undefined,
    jurisdiction: jurisdiction.trim() || undefined,
    docket_no:    docket_no.trim()    || undefined,
    topics: [], categories: [], coauthors: [],
    summary: summary.trim(),
    pdf_url:       pdfResult?.pdf_url,
    canonical_url: canonicalUrl.trim() || undefined,
    featured: false,
  };

  const slug     = workSlug(title.trim());
  const filePath = `works/${slug}.md`;
  if (app.vault.getAbstractFileByPath(filePath)) { new Notice(`Already exists: ${filePath}`); return; }
  await app.vault.create(filePath, buildFileContent('work', fields));
  await updateIndex(app, 'works/_INDEX.md', 'work', { ...fields, slug });
  new Notice(`Work added: ${slug}.md`);
}

// ── Add Press ─────────────────────────────────────────────────────────────────

async function flowPress(app, quickAddApi, today) {
  const KINDS = ['citation', 'interview', 'conference-talk', 'podcast', 'video'];
  const kind = await quickAddApi.suggester(KINDS, KINDS, "Type fo press");
  if (kind == null) return;

  const title  = await quickAddApi.inputPrompt('Headline', 'Article or segment headline');
  if (!title?.trim()) return;
  const outlet = await quickAddApi.inputPrompt('Outlet', 'e.g. Canary Media, Bloomberg');
  if (!outlet?.trim()) return;

  const date    = await quickAddApi.inputPrompt('Date (YYYY-MM-DD)', '', today);
  const url     = await quickAddApi.inputPrompt('URL', 'https://...');
  if (!url?.trim()) return;

  const quote   = (await quickAddApi.inputPrompt('Pull quote (enter to skip)', '', '')) ?? '';
  const relWork = (await quickAddApi.inputPrompt('Related work slug (enter to skip)', 'e.g. ncuc-e-100-sub-179-2022', '')) ?? '';
  const summary = (await quickAddApi.inputPrompt('One-line summary (enter to skip)', '', '')) ?? '';

  const fields = {
    title: title.trim(), outlet: outlet.trim(), date: (date ?? today).trim(), kind, url: url.trim(),
    quote:        quote.trim()   || undefined,
    related_work: relWork.trim() || undefined,
    summary:      summary.trim() || undefined,
  };

  const slug     = pressSlug(outlet.trim(), (date ?? today).trim());
  const filePath = `press/${slug}.md`;
  if (app.vault.getAbstractFileByPath(filePath)) { new Notice(`Already exists: ${filePath}`); return; }
  await app.vault.create(filePath, buildFileContent('press', fields));
  await updateIndex(app, 'press/_INDEX.md', 'press', { ...fields, slug });
  new Notice(`Press entry added: ${slug}.md`);
}

// ── Add Blog Post ─────────────────────────────────────────────────────────────

async function flowBlog(app, quickAddApi, today) {
  const title = await quickAddApi.inputPrompt('Post title', 'Title…');
  if (!title?.trim()) return;

  const tagsRaw = (await quickAddApi.inputPrompt('Tags (comma-separated, enter to skip)', '', '')) ?? '';
  const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const fields   = { title: title.trim(), date: today, tags, draft: true };
  const slug     = blogSlug(title.trim(), today);
  const filePath = `blog/${slug}.md`;
  if (app.vault.getAbstractFileByPath(filePath)) { new Notice(`Already exists: ${filePath}`); return; }
  await app.vault.create(filePath, buildFileContent('blog', fields));
  await updateIndex(app, 'blog/_INDEX.md', 'blog', { ...fields, slug });
  new Notice(`Blog post created: ${slug}.md`);
  app.workspace.openLinkText(slug, '', true);
}

// ── Index helper ──────────────────────────────────────────────────────────────

async function updateIndex(app, indexPath, type, entry) {
  const file = app.vault.getAbstractFileByPath(indexPath);
  if (!file) { new Notice(`Index not found: ${indexPath}`); return; }
  const current = await app.vault.read(file);
  await app.vault.modify(file, prependRowToIndex(current, type, entry));
}

// ── PDF import helper ─────────────────────────────────────────────────────────

async function pickAndCopyPdf(app, quickAddApi) {
  const choice = await quickAddApi.suggester(
    ['Import from disk', 'Enter URL', 'Skip'],
    ['import', 'url', 'skip'],
    'PDF?'
  );
  if (choice == null || choice === 'skip') return null;

  if (choice === 'url') {
    const url = (await quickAddApi.inputPrompt('PDF URL', 'https://...', '')) ?? '';
    return url.trim() ? { pdf_url: url.trim() } : null;
  }

  // Open a native OS file picker — no require() needed, uses browser APIs
  const file = await new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
  if (!file) return null;

  const buffer = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

  if (!app.vault.getAbstractFileByPath('pdfs')) {
    await app.vault.createFolder('pdfs');
  }
  await app.vault.adapter.writeBinary(`pdfs/${file.name}`, buffer);
  new Notice(`PDF copied → pdfs/${file.name}`);
  return { pdf_url: `pdfs/${file.name}` };
}

// ── Core functions (mirrored from scripts/core.js) ────────────────────────────

function slugify(str) {
  return String(str).toLowerCase()
    .replace(/[''""''""]/g, '')
    .replace(/[^\w\s-]/g, ' ').trim()
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
function formatDate(date) {
  const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function ys(s) { return String(s||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"'); }
function yamlArr(name, arr) {
  if (!arr||arr.length===0) return `${name}: []`;
  return `${name}:\n${arr.map(v=>`  - ${v}`).join('\n')}`;
}
function buildWorkFrontmatter(f) {
  const l = ['---',`title: "${ys(f.title)}"`,`type: ${f.type||'article'}`,`date: ${f.date||formatDate(new Date())}`];
  if (f.employer)      l.push(`employer: "${ys(f.employer)}"`);
  if (f.client)        l.push(`client: "${ys(f.client)}"`);
  if (f.jurisdiction)  l.push(`jurisdiction: "${ys(f.jurisdiction)}"`);
  if (f.docket_no)     l.push(`docket_no: "${ys(f.docket_no)}"`);
  l.push(yamlArr('topics',f.topics),yamlArr('categories',f.categories),yamlArr('coauthors',f.coauthors));
  l.push(`summary: "${ys(f.summary)}"`);
  if (f.pdf_url)       l.push(`pdf_url: "${ys(f.pdf_url)}"`);
  if (f.canonical_url) l.push(`canonical_url: "${ys(f.canonical_url)}"`);
  l.push(`featured: ${f.featured===true?'true':'false'}`, '---'); return l.join('\n');
}
function buildPressFrontmatter(f) {
  const l = ['---',`title: "${ys(f.title)}"`,`outlet: "${ys(f.outlet)}"`,`date: ${f.date||formatDate(new Date())}`,`kind: ${f.kind||'citation'}`,`url: "${ys(f.url)}"`];
  if (f.quote)        l.push(`quote: "${ys(f.quote)}"`);
  if (f.related_work) l.push(`related_work: ${f.related_work}`);
  if (f.summary)      l.push(`summary: "${ys(f.summary)}"`);
  l.push('---'); return l.join('\n');
}
function buildBlogFrontmatter(f) {
  const l = ['---',`title: "${ys(f.title)}"`,`date: ${f.date||formatDate(new Date())}`,yamlArr('tags',f.tags),`draft: ${f.draft!==false?'true':'false'}`];
  if (f.summary) l.push(`summary: "${ys(f.summary)}"`);
  l.push('---'); return l.join('\n');
}
function buildFileContent(type, fields) {
  const fm = type==='work' ? buildWorkFrontmatter(fields) : type==='press' ? buildPressFrontmatter(fields) : buildBlogFrontmatter(fields);
  return fm + (fields.body ? '\n'+fields.body.trim()+'\n' : '\n');
}
function workSlug(title)         { return slugify(title); }
function pressSlug(outlet, date) { return slugify(outlet)+'-'+(date||formatDate(new Date())); }
function blogSlug(title, date)   { return (date||formatDate(new Date()))+'-'+slugify(title); }
function buildIndexRow(type, entry) {
  const {date:d='',title:t='',slug:s=''} = entry;
  const link = `[${s}](${s}.md)`;
  if (type==='work')  return `| ${d} | ${t} | ${entry.type||''} | ${entry.employer||''} | ${link} |`;
  if (type==='press') return `| ${d} | ${t} | ${entry.outlet||''} | ${entry.kind||''} | ${link} |`;
  return `| ${d} | ${t} | ${entry.draft!==false?'draft':'published'} | ${link} |`;
}
function prependRowToIndex(tableStr, type, newEntry) {
  const newRow = buildIndexRow(type, newEntry);
  const lines  = tableStr.split('\n');
  const sepIdx = lines.findIndex(l => /^\|[-| ]+\|/.test(l));
  if (sepIdx===-1) return tableStr.trimEnd()+'\n'+newRow+'\n';
  return [...lines.slice(0,sepIdx+1), newRow, ...lines.slice(sepIdx+1)].join('\n');
}
