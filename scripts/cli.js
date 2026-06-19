#!/usr/bin/env node
// cli.js — Node.js CLI for tyfi-content vault.
// No npm dependencies — uses Node.js built-ins only.
//
// Shares all business logic with scripts/add.js via scripts/core.js.
//
// Usage:
//   node scripts/cli.js                                   interactive (prompts for each field)
//   node scripts/cli.js --input init/batch-data.json      batch import all types
//   node scripts/cli.js --input init/batch-data.json --type works|press|blog
//   node scripts/cli.js --reindex                         rebuild all _INDEX.md files

'use strict';

const fs   = require('fs');
const path = require('path');
const core = require('./core.js');

const VAULT     = path.resolve(__dirname, '..');
const WORKS_DIR = path.join(VAULT, 'works');
const PRESS_DIR = path.join(VAULT, 'press');
const BLOG_DIR  = path.join(VAULT, 'blog');

// ── Argument parsing ──────────────────────────────────────────────────────────

const argv       = process.argv.slice(2);
const getArg     = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const hasFlag    = (flag) => argv.includes(flag);

const inputFile  = getArg('--input');
const typeFilter = getArg('--type') || 'all';
const reindex    = hasFlag('--reindex');

// ── Entry point ───────────────────────────────────────────────────────────────

(async () => {
  if (reindex) {
    console.log('Rebuilding all indexes...');
    rebuildAllIndexes();
    return;
  }
  if (inputFile) {
    await batchImport(inputFile, typeFilter);
    return;
  }
  await interactiveMode();
})();

// ── Interactive mode ──────────────────────────────────────────────────────────

async function interactiveMode() {
  const today = core.formatDate(new Date());
  const { prompt, choose, close } = makeReadline();
  try {
    const flowIdx = await choose('What would you like to add?', ['Add Work', 'Add Press', 'Add Blog Post']);
    if (flowIdx === 0)      await interactiveWork(prompt, choose, today);
    else if (flowIdx === 1) await interactivePress(prompt, choose, today);
    else                    await interactiveBlog(prompt, today);
  } finally {
    close();
  }
}

async function interactiveWork(prompt, choose, today) {
  const TYPES = ['testimony', 'report', 'white-paper', 'brief', 'article', 'thesis', 'comment'];
  const typeIdx = await choose('Type', TYPES);

  const title   = await prompt('Title');
  const date    = await prompt('Date', today);
  const summary = await prompt('Summary (2–3 sentences)');
  const employer = await prompt('Employer (enter to skip)', '');
  const client   = await prompt('Client (enter to skip)', '');

  const regIdx = await choose('Regulatory filing?', ['No', 'Yes']);
  let jurisdiction = '', docket_no = '';
  if (regIdx === 1) {
    jurisdiction = await prompt('Jurisdiction');
    docket_no    = await prompt('Docket number (enter to skip)', '');
  }

  const pdfFile    = await prompt('PDF filename in pdfs/ (enter to skip)', '');
  const canonicalUrl = await prompt('Canonical URL (enter to skip)', '');

  const fields = {
    title, type: TYPES[typeIdx], date, summary,
    employer: employer || undefined,
    client:   client   || undefined,
    jurisdiction: jurisdiction || undefined,
    docket_no:    docket_no    || undefined,
    topics: [], categories: [], coauthors: [],
    pdf_url:      pdfFile    ? `pdfs/${pdfFile}` : undefined,
    canonical_url: canonicalUrl || undefined,
    featured: false,
  };

  const slug = core.workSlug(title);
  writeEntry(path.join(WORKS_DIR, `${slug}.md`), core.buildFileContent('work', fields));
  prependToIndex(path.join(WORKS_DIR, '_INDEX.md'), 'work', { ...fields, slug });
  console.log(`\n✓ Created: works/${slug}.md`);
}

async function interactivePress(prompt, choose, today) {
  const KINDS = ['citation', 'interview', 'conference-talk', 'podcast', 'video'];
  const kindIdx = await choose('Kind', KINDS);

  const title  = await prompt('Headline');
  const outlet = await prompt('Outlet');
  const date   = await prompt('Date', today);
  const url    = await prompt('URL');
  const quote  = await prompt('Pull quote (enter to skip)', '');
  const relWork = await prompt('Related work slug (enter to skip)', '');
  const summary = await prompt('One-line summary (enter to skip)', '');

  const fields = {
    title, outlet, date, kind: KINDS[kindIdx], url,
    quote:        quote    || undefined,
    related_work: relWork  || undefined,
    summary:      summary  || undefined,
  };

  const slug = core.pressSlug(outlet, date);
  writeEntry(path.join(PRESS_DIR, `${slug}.md`), core.buildFileContent('press', fields));
  prependToIndex(path.join(PRESS_DIR, '_INDEX.md'), 'press', { ...fields, slug });
  console.log(`\n✓ Created: press/${slug}.md`);
}

async function interactiveBlog(prompt, today) {
  const title   = await prompt('Post title');
  const tagsRaw = await prompt('Tags (comma-separated, enter to skip)', '');
  const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const fields = { title, date: today, tags, draft: true };
  const slug   = core.blogSlug(title, today);
  writeEntry(path.join(BLOG_DIR, `${slug}.md`), core.buildFileContent('blog', fields));
  prependToIndex(path.join(BLOG_DIR, '_INDEX.md'), 'blog', { ...fields, slug });
  console.log(`\n✓ Created: blog/${slug}.md`);
}

// ── Batch import ──────────────────────────────────────────────────────────────

async function batchImport(inputFilePath, typeFilter) {
  const fullPath = path.isAbsolute(inputFilePath)
    ? inputFilePath
    : path.join(VAULT, inputFilePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`Input file not found: ${fullPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  let workCount = 0, pressCount = 0, blogCount = 0, skipCount = 0;

  if (typeFilter === 'all' || typeFilter === 'works') {
    const entries = data.works || [];
    console.log(`\nImporting ${entries.length} works...`);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const slug    = e.slug || core.workSlug(e.title);
      const outPath = path.join(WORKS_DIR, `${slug}.md`);
      if (fs.existsSync(outPath)) {
        console.log(`  [${i+1}/${entries.length}] ⏭  works/${slug}.md (skipped — exists)`);
        skipCount++; continue;
      }
      writeEntry(outPath, core.buildFileContent('work', e));
      console.log(`  [${i+1}/${entries.length}] ✓  works/${slug}.md`);
      workCount++;
    }
  }

  if (typeFilter === 'all' || typeFilter === 'press') {
    const entries = data.press || [];
    console.log(`\nImporting ${entries.length} press entries...`);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const slug    = e.slug || core.pressSlug(e.outlet, e.date);
      const outPath = path.join(PRESS_DIR, `${slug}.md`);
      if (fs.existsSync(outPath)) {
        console.log(`  [${i+1}/${entries.length}] ⏭  press/${slug}.md (skipped — exists)`);
        skipCount++; continue;
      }
      writeEntry(outPath, core.buildFileContent('press', e));
      console.log(`  [${i+1}/${entries.length}] ✓  press/${slug}.md`);
      pressCount++;
    }
  }

  if (typeFilter === 'all' || typeFilter === 'blog') {
    const entries = data.blog || [];
    if (entries.length > 0) {
      console.log(`\nImporting ${entries.length} blog entries...`);
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const slug    = e.slug || core.blogSlug(e.title, e.date);
        const outPath = path.join(BLOG_DIR, `${slug}.md`);
        if (fs.existsSync(outPath)) {
          console.log(`  [${i+1}/${entries.length}] ⏭  blog/${slug}.md (skipped — exists)`);
          skipCount++; continue;
        }
        writeEntry(outPath, core.buildFileContent('blog', e));
        console.log(`  [${i+1}/${entries.length}] ✓  blog/${slug}.md`);
        blogCount++;
      }
    }
  }

  console.log('\nRebuilding indexes...');
  rebuildAllIndexes();
  console.log(`\nDone. ${workCount} works, ${pressCount} press, ${blogCount} blog written. ${skipCount} skipped.`);
}

// ── Index management ──────────────────────────────────────────────────────────

function rebuildAllIndexes() {
  rebuildIndex(WORKS_DIR, '_INDEX.md', 'work', f => ({
    slug:     path.basename(f, '.md'),
    date:     parseYaml(f, 'date') || '',
    title:    parseYaml(f, 'title') || path.basename(f, '.md'),
    type:     parseYaml(f, 'type') || '',
    employer: parseYaml(f, 'employer') || '',
  }));
  rebuildIndex(PRESS_DIR, '_INDEX.md', 'press', f => ({
    slug:   path.basename(f, '.md'),
    date:   parseYaml(f, 'date') || '',
    title:  parseYaml(f, 'title') || path.basename(f, '.md'),
    outlet: parseYaml(f, 'outlet') || '',
    kind:   parseYaml(f, 'kind') || '',
  }));
  rebuildIndex(BLOG_DIR, '_INDEX.md', 'blog', f => ({
    slug:  path.basename(f, '.md'),
    date:  parseYaml(f, 'date') || '',
    title: parseYaml(f, 'title') || path.basename(f, '.md'),
    draft: parseYaml(f, 'draft') !== 'false',
  }));
}

function rebuildIndex(dir, indexFile, type, entryFn) {
  const indexPath = path.join(dir, indexFile);
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'));
  const entries = files.map(f => entryFn(path.join(dir, f)));
  fs.writeFileSync(indexPath, core.buildIndexTable(type, entries), 'utf8');
  console.log(`  ✓ ${type}/${indexFile} (${entries.length} entries)`);
}

// ── File helpers ──────────────────────────────────────────────────────────────

function writeEntry(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function prependToIndex(indexPath, type, entry) {
  if (!fs.existsSync(indexPath)) return;
  const current = fs.readFileSync(indexPath, 'utf8');
  fs.writeFileSync(indexPath, core.prependRowToIndex(current, type, entry), 'utf8');
}

// Reads a single scalar YAML field from a file's frontmatter.
// Handles both quoted ("value") and unquoted values.
function parseYaml(filePath, key) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match   = content.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    if (!match) return null;
    let val = match[1].trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    return val;
  } catch {
    return null;
  }
}

// ── readline wrapper ──────────────────────────────────────────────────────────

function makeReadline() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const prompt = (question, defaultVal) => new Promise(resolve => {
    const q = defaultVal !== undefined ? `${question} [${defaultVal}]: ` : `${question}: `;
    rl.question(q, answer => {
      const v = answer.trim();
      resolve(v !== '' ? v : (defaultVal ?? ''));
    });
  });

  const choose = (question, options) => new Promise(resolve => {
    const list = options.map((o, i) => `  ${i + 1}. ${o}`).join('\n');
    rl.question(`\n${question}:\n${list}\nChoice [1]: `, answer => {
      const n = parseInt(answer.trim(), 10);
      resolve((isNaN(n) || n < 1 || n > options.length) ? 0 : n - 1);
    });
  });

  const close = () => rl.close();
  return { prompt, choose, close };
}
