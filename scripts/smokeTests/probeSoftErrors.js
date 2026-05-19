const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const runBinary = require('../../src/actions/generate/binary');
const vectorize = require('../../src/xenova/vectorize');
const claudeRun = require('../../src/claude');
const { SONNET45_CONFIG } = require('../../src/claude/config');
const makeLimit = require('../../src/utilities/makeLimit');

const runLLM = async (extraConfig, systemPrompt, userMessage) => {
  const config = { ...SONNET45_CONFIG, ...extraConfig, system: systemPrompt };
  const response = await claudeRun(config, userMessage);
  return response.output.text;
};

// Walk scripts/markdowns/ and collect every .md file.
const collectFiles = (root) => {
  const out = [];
  const entries = fsSync.readdirSync(root, { recursive: true, withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.md')) {
      out.push(path.join(e.parentPath || e.path || root, e.name));
    }
  }
  return out;
};

(async () => {
  const probe = await vectorize('probe');
  const prompt = await fs.readFile('src/actions/generate/binary/prompts/augment-section.ppl', 'utf-8');

  const allFiles = collectFiles('scripts/markdowns');
  console.log('Total .md files:', allFiles.length);

  // Pick 10 random files, weighted toward larger ones (more sections = more LLM calls = more chance to hit the failure mode).
  const sized = allFiles.map(f => ({ f, size: fsSync.statSync(f).size }));
  sized.sort((a, b) => b.size - a.size);  // biggest first
  const samples = sized.slice(0, 10).map(x => x.f);   // top 10 by size

  console.log('Probing', samples.length, 'files:');
  for (const f of samples) console.log('  ', f);
  console.log();

  const errorTallies = {};
  let shown = 0;
  let totalCalls = 0;
  let totalErrors = 0;

  for (const file of samples) {
    const markdown = await fs.readFile(file, 'utf-8');
    const base = path.basename(file, '.md');

    await runBinary({
      markdown,
      documentId: 'probe|' + base,
      vecDim: probe.length,
      vectorize,
      runLLM,
      prompt,
      llmConfig: {},
      limit: makeLimit(4),
      maxRetries: 2,
      onSection: () => { totalCalls++; },
      onError: (err) => {
        if (err.stage !== 'augment') return;
        totalErrors++;
        const msg = (err.cause && err.cause.message) || 'unknown';
        const key = msg.slice(0, 140);
        errorTallies[key] = (errorTallies[key] || 0) + 1;
        if (shown < 8) {
          console.error('SOFT', base, 'section', err.sectionIndex, ':', msg.slice(0, 500));
          shown++;
        }
      },
    });
  }

  console.log();
  console.log('Sections probed:', totalCalls);
  console.log('Augment failures:', totalErrors);
  console.log('Failure rate:', totalCalls ? (totalErrors / totalCalls * 100).toFixed(1) + '%' : 'n/a');
  console.log();
  console.log('Error tally:');
  for (const [k, v] of Object.entries(errorTallies).sort((a,b) => b[1]-a[1])) {
    console.log(' ', v, '×', k);
  }
})();
