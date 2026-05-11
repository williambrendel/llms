const fs   = require("fs").promises;
const path = require("path");
const {subsegmentText} = require("../src/utilities/textSegmentation/segmentText");
const segmentTextSections = require("../src/utilities/textSegmentation/segmentTextSections");
const getFilenames = require("./io/getFilenames");
const loadFile = require("./io/loadFile");
const representativeSpans = require("../src/utilities/math/representativeSpans");
const { dotProductUnsafe } = require("../src/utilities/math/dotProduct");
const vectorize = require("../src/xenova/vectorize");

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const filenames = getFilenames(args[0]);
const outputDir = args[1];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const buildContainmentMask = (segments, tier) => {
  const N = segments.length;
  const mask = new Set();
  for (let i = 0; i < N; ++i) {
    const a = segments[i];
    if (a.tier < tier) continue;
    for (let j = i + 1; j < N; ++j) {
      const b = segments[j];
      if (b.tier < tier) continue;
      if (a.start === b.start || a.end === b.end) {
        mask.add(i * N + j);
        mask.add(j * N + i);
      }
    }
  }
  return mask;
};

const buildContainmentEdge = (mask, N) => {
  return (c, i, j, kappa) => mask.has(i * N + j) ? -kappa : Math.max(0, 1 - c);
};

// ─────────────────────────────────────────────────────────────────────────────
// Process file
// ─────────────────────────────────────────────────────────────────────────────

const processFile = async (data) => {
  if (!data) throw Error(`Missing input data`);

  // 1. Extract sections.
  const sections = segmentTextSections(data).contentSections();

  // 2. Process each section.
  const output = [];
  for (let i = 0, l = sections.length, section; i !== l; ++i) {
    section = sections[i];
    const range = [section.paragraph > 0 ? section.start : (section.header?.[0] ?? section.start), section.end];
    const ancestors = (section.ancestors || []).map(h => h.extractTitle(data));
    const header = section.header && section.header.extractTitle(data) || "";
    const content = section.content.extract(data);

    // Derive the text to vectorize.
    const h = [...ancestors, header].filter(Boolean).join(", ");
    const str = `${h ? h + "\n\n" : ""}${content}`;
    const suball = subsegmentText(section, data, { includeOriginalSegment: true });
    const sentences = suball.filter(s => s.tier === 0);
    const tierAbove = suball.filter(s => s.tier > 0);

    // Build gate mask using start/end on Segments (before extraction)
    const mask = buildContainmentMask(tierAbove, 2);

    const tierAboveText = tierAbove.map(s => s.extractTitle ? s.extractTitle(data) : s.extract(data));
    const vecs = await Promise.all([...tierAboveText, str].map(x => vectorize(x)));
    const ref = vecs.pop();
    const N = vecs.length;
    const D = ref.length;                    // 384 for MiniLM-L6
    const V = new Float32Array(N * D), rel = new Float32Array(N);
    for (let i = 0, offset = 0, v; i !== N; ++i, offset += D) {
      // Copy vec[i] into V[i*D .. (i+1)*D)
      V.set(v = vecs[i], offset);
      // Build relevance.
      rel[i] = 2 * dotProductUnsafe(v, ref, D, 0, 0);
    }

    // Adaptive beta.
    const beta = tierAboveText.map(s => {
      const words = s.split(/\s+/).filter(Boolean).length;
      return Math.max(0.5, Math.min(2.0, 0.5 + words * 0.07));
    });

    const containmentEdge = buildContainmentEdge(mask, N);

    const { support, alpha, kept } = representativeSpans(V, rel, {
      dim: D,
      computeRelevance: false,
      edge: containmentEdge,
      beta,
      adaptive: "entropy"
    });

    // Keep only Pass-3 (tier > 1) survivors. Pass-2 sub-clauses acted as
    // competitive ballast in the solve and are filtered out of the final output.
    const res = support.reduce((out, offset) => (
      tierAbove[offset / D].tier > 1 && out.push(offset),
      out
    ), []);

    /////// DEBUG /////
    console.log(`\n${"─".repeat(70)}`);
    console.log(`Section: ${[...ancestors, header].filter(Boolean).join(" > ")}`);
    console.log(`Range: [${range[0]}, ${range[1]}] | ${tierAbove.length} candidates → ${res.length} kept`);
    console.log(`Sentences: ${sentences.length}`);
    console.log(`Surviving spans:`);
    res.forEach(offset => {
      console.log(`  - ${tierAboveText[offset / D]}`);
    });

    // Top 8 by α (across all candidates, before tier filter)
    const topK = Array.from({length: alpha.length}, (_, i) => i)
      .sort((a, b) => alpha[b] - alpha[a])
      .slice(0, 8);
    console.log(`Top alpha:`);
    topK.forEach(i => {
      const origIdx = kept[i] / D;
      const tierTag = tierAbove[origIdx].tier > 1 ? "P3" : "P2";
      console.log(`  α=${alpha[i].toFixed(4)} [${tierTag}] ${tierAboveText[origIdx].slice(0, 70)}`);
    });
    /////////////////

    // Collect section vectors: [breadcrumb, content, ...sentences, ...spans]
    const Vtmp = await Promise.all(sentences.reduce((out, s) => (
      out.push(vectorize(s.extractTitle ? s.extractTitle(data) : s.extract(data))),
      out
    ), [vectorize(h), vectorize(content)]));

    // Append surviving span vectors (zero-copy subarrays into V).
    for (let i = 0, l = res.length; i !== l; ++i) {
      Vtmp.push(V.subarray(res[i], res[i] + D));
    }

    // Concatenate into a single Float32Array for this section.
    const len = Vtmp.length * D, Vout = new Float32Array(len);
    for (let offset = 0, i = 0; offset !== len; offset += D, ++i) {
      Vout.set(Vtmp[i], offset);
    }

    output.push({ range, V: Vout });
  }

  return output;
};

// ─────────────────────────────────────────────────────────────────────────────
// Write per-file binary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @function writeKnowledgeBase
 * @description Write a per-file VECT binary.
 *
 * Layout:
 *   Header (32 bytes, 8 × Uint32):
 *     [0] magic        = "VECT" (0x56454354)
 *     [1] version      = 1
 *     [2] indexDim     = 3 (start, end, vecCount)
 *     [3] vecDim       = embedding dimension
 *     [4] numSections
 *     [5] totalVecs
 *     [6] indexBytes
 *     [7] vecBytes
 *
 *   Index buffer: numSections × indexDim Uint32  (start, end, vecCount per section)
 *   Vec buffer:   totalVecs   × vecDim   Float32 (sections concatenated in order)
 *
 * No padding required: header is 32 bytes (4-aligned), Uint32 index is naturally
 * 4-aligned, Float32 vec follows at a 4-aligned boundary.
 */
const writeKnowledgeBase = async (filename, sections, dim, outputDir) => {
  const numSections = sections.length;
  const indexDim = 3;

  // Compute total vector count.
  let totalVecs = 0;
  for (let i = 0; i !== numSections; ++i) totalVecs += sections[i].V.length / dim;

  // Index buffer: (start, end, vecCount) per section, all Uint32.
  const indexBuffer = new Uint32Array(numSections * indexDim);
  for (let i = 0; i !== numSections; ++i) {
    const { range, V } = sections[i];
    indexBuffer[i * indexDim    ] = range[0];
    indexBuffer[i * indexDim + 1] = range[1];
    indexBuffer[i * indexDim + 2] = V.length / dim;
  }

  // Vec buffer: all section vectors concatenated.
  const vecBuffer = new Float32Array(totalVecs * dim);
  for (let i = 0, offset = 0; i !== numSections; ++i) {
    vecBuffer.set(sections[i].V, offset);
    offset += sections[i].V.length;
  }

  // Header.
  const header = new Uint32Array(8);
  header[0] = 0x56454354;             // Magic "VECT"
  header[1] = 1;                      // Version
  header[2] = indexDim;
  header[3] = dim;
  header[4] = numSections;
  header[5] = totalVecs;
  header[6] = indexBuffer.byteLength;
  header[7] = vecBuffer.byteLength;

  const finalBuffer = Buffer.concat([
    Buffer.from(header.buffer),
    Buffer.from(indexBuffer.buffer),
    Buffer.from(vecBuffer.buffer)
  ]);

  // Output: <outputDir>/<basename>.bin
  const outName = path.basename(filename, path.extname(filename)) + ".bin";
  const outPath = path.join(outputDir, outName);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outPath, finalBuffer);
  console.log(`Wrote ${outPath}: ${numSections} sections, ${totalVecs} vectors`);
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const main = async () => {
  // 1. Initialize feature extraction model and probe embedding dimension.
  const probe = await vectorize("probe");
  const dim = probe.length;
  console.log(`Embedding dimension: ${dim}`);

  // 2. Process each file → write its own binary.
  await Promise.all(filenames.map(async filename => {
    const { data } = await loadFile(filename);
    const sections = await processFile(data);
    await writeKnowledgeBase(filename, sections, dim, outputDir);
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @function loadKnowledgeBase
 * @description Zero-copy loader for the per-file VECT binary format.
 *
 * Returns typed-array views into the underlying file buffer, plus a
 * precomputed prefix-sum of vector counts (`vecOffsets`) enabling O(1)
 * per-section vector access via `getSection(i)`.
 *
 * @param {string} filepath  Path to a .bin file.
 * @returns {Promise<{
 *   version: number,
 *   indexDim: number,
 *   vecDim: number,
 *   numSections: number,
 *   totalVecs: number,
 *   indexBuffer: Uint32Array,    // numSections × indexDim (start, end, vecCount)
 *   vecBuffer: Float32Array,     // totalVecs × vecDim
 *   vecOffsets: Uint32Array,     // numSections + 1; vecOffsets[i] = vector index where section i starts
 *   getSection: (i: number) => { start: number, end: number, vectors: Float32Array }
 * }>}
 */
const loadKnowledgeBase = async filepath => {
  const buffer = await fs.readFile(filepath);

  // 1. Header (32 bytes).
  const header = new Uint32Array(buffer.buffer, buffer.byteOffset, 8);
  const [magic, version, indexDim, vecDim, numSections, totalVecs, indexBytes, vecBytes] = header;

  if (magic !== 0x56454354) throw new Error("Invalid VECT binary: Magic mismatch");

  let offset = 32;

  // 2. Index buffer (Uint32, naturally 4-aligned).
  const indexBuffer = new Uint32Array(buffer.buffer, buffer.byteOffset + offset, indexBytes >> 2);
  offset += indexBytes;

  // 3. Vec buffer (Float32, follows index at a 4-aligned boundary).
  const vecBuffer = new Float32Array(buffer.buffer, buffer.byteOffset + offset, vecBytes >> 2);

  // 4. Precompute cumulative vector offsets for O(1) per-section access.
  //    vecOffsets[i]   = vector index where section i starts
  //    vecOffsets[i+1] = one past the last vector in section i
  const vecOffsets = new Uint32Array(numSections + 1);
  for (let i = 0; i !== numSections; ++i) {
    vecOffsets[i + 1] = vecOffsets[i] + indexBuffer[i * indexDim + 2];
  }

  return {
    version,
    indexDim,
    vecDim,
    numSections,
    totalVecs,
    indexBuffer,
    vecBuffer,
    vecOffsets,
    getSection: i => ({
      start:   indexBuffer[i * indexDim    ],
      end:     indexBuffer[i * indexDim + 1],
      vectors: vecBuffer.subarray(vecOffsets[i] * vecDim, vecOffsets[i + 1] * vecDim)
    })
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @ignore
 */
module.exports = Object.freeze({
  loadKnowledgeBase
});

// Run if called directly
if (require.main === module) {
  main();
}