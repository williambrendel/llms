const fs   = require("fs").promises;
const path = require("path");
const {subsegmentText} = require("../src/utilities/textSegmentation/segmentText");
const segmentTextSections = require("../src/utilities/textSegmentation/segmentTextSections");
const getFilenames = require("./io/getFilenames");
const loadFile = require("./io/loadFile");
const vectorize = require("../src/xenova/vectorize");
const representativeSpans = require("../src/utilities/math/representativeSpans");
const { dotProductUnsafe } = require("../src/utilities/math/dotProduct");

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const filenames = getFilenames(args[0]);
const outputFilepath = args[1];

// Helper
const buildContainmentEdge = (texts) => {
  const N = texts.length;
  const mask = new Set();
  for (let i = 0; i < N; ++i) {
    for (let j = 0; j < N; ++j) {
      if (i === j) continue;
      const a = texts[i], b = texts[j];
      if (a.length === b.length) continue;
      
      // Identify shorter and longer.
      const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
      const shorterWords = shorter.split(/\s+/).filter(Boolean).length;
      
      // Only gate clausal-length redundancy. Short concept anchors
      // (1-4 words) compete on their own merits via cosine + β.
      if (shorterWords < 5) continue;
      
      // Prefix or suffix containment indicates a syntactic chop —
      // the shorter fragment is a head- or tail-cut of the longer.
      if (longer.startsWith(shorter) || longer.endsWith(shorter)) {
        mask.add(i * N + j);
      }
    }
  }
  return (c, i, j) => mask.has(i * N + j) ? 0 : Math.max(0, 1 - c);
};

// ─────────────────────────────────────────────────────────────────────────────
// Process filename
// ─────────────────────────────────────────────────────────────────────────────

const processFile = async (data, docIndex) => {
  if (!data) throw Error(`Missing input data`);

  // 1. Extract sections.
  const sections = segmentTextSections(data).contentSections();

  // 2. Process each section.
  const output = [];
  for (let i = 0, l = sections.length, section; i !== l; ++i) {
    section = sections[i];

    const out = {
      docIndex,
      range: [section.paragraph > 0 ? section.start : (section.header?.[0] ?? section.start), section.end],
      ancestors: (section.ancestors || []).map(h => h.extractTitle(data)),
      header: section.header && section.header.extractTitle(data) || "",
      content: section.content.extract(data)
    };

    // Derive the text to vectorize.
    const h = [...out.ancestors, out.header].filter(Boolean).join(", ");
    const str = `${h ? h + "\n\n" : ""}${out.content}`;
    let sub = subsegmentText(section, data, { includeOriginalSegment: true });
    sub = sub.map(s => s.extractTitle ? s.extractTitle(data) : s.extract(data));
    sub.push(h);
    const vecs = await Promise.all([...sub, str].map(x => vectorize(x)));
    const ref = vecs.pop();
    const D = ref.length;                    // 384 for MiniLM-L6
    const N = vecs.length;
    const V = new Float32Array(N * D), rel = new Float32Array(N);
    console.log(`${N}x${D}`);
    for (let i = 0, offset = 0, v; i !== N; ++i, offset += D) {
      // Copy vec[i] into V[i*D .. (i+1)*D)
      V.set(v = vecs[i], offset);
      // Build relevance.
      rel[i] = 2 * dotProductUnsafe(v, ref, D, 0, 0);
    }

    // Penalize relevance of clausal-length prefix/suffix chops.
    // A 5+-word fragment that starts or ends its parent sentence is
    // almost always a syntactic by-product (Pass-2 comma split) rather
    // than a distinct concept. Halving its relevance lets the parent
    // sentence dominate. Short fragments (1-4 words) are concept
    // anchors and retain full relevance.
    for (let i = 0; i < N; ++i) {
      const wordsI = sub[i].split(/\s+/).filter(Boolean).length;
      if (wordsI < 5) continue;
      for (let j = 0; j < N; ++j) {
        if (i === j || sub[i].length >= sub[j].length) continue;
        if (sub[j].startsWith(sub[i]) || sub[j].endsWith(sub[i])) {
          rel[i] *= 0.5;
          break;
        }
      }
    }

    const beta = sub.map(s => {
      const words = s.split(/\s+/).filter(Boolean).length;
      return Math.max(0.5, Math.min(2.0, 0.5 + words * 0.07));
    });

    const containmentEdge = buildContainmentEdge(sub);

    console.log("Relevance per candidate:");
sub.forEach((s, i) => {
  // if (s.length > 30 && s.length < 200) {  // sentences only
    console.log(`  ${i} > ${rel[i].toFixed(3)} | ${s.slice(0, 80)}`);
  // }
});
    const { support, kept, alpha } = representativeSpans(V, rel, { dim: D, computeRelevance: false, edge: containmentEdge, beta, adaptive: "entropy" });
    console.log(out, support.map(offset => sub[offset / D]));
    console.log(`Kept: ${kept.length}/${N}`);

// Top 8 by α
const topK = Array.from({length: alpha.length}, (_, i) => i)
  .sort((a, b) => alpha[b] - alpha[a])
  .slice(0, 8);

console.log("Top alpha values:");
topK.forEach(i => {
  const origIdx = kept[i] / D;
  console.log(`  α=${alpha[i].toFixed(5)} | rel=${rel[origIdx].toFixed(3)} | ${sub[origIdx].slice(0, 70)}`);
});

    output.push(out);
  }

  return output;
}

const main = async () => {
  const indexes = [];

  // 1. Initialize feature extraction model and probe embedding dimension.
  const probe     = await vectorize("probe");
  const dim       = probe.length;
  console.log(`Embedding dimension: ${dim}`);
  
  // 2. Flatten the processed fragments
  const nestedFragments = await Promise.all(filenames.map(async (filename, docIndex) => {
    const { data } = await loadFile(filename);
    return processFile(data, docIndex);
  }));
  const fragments = nestedFragments.flat();

  // 3. Map text to vector promises
  const vectorPromises = fragments.map(chunk => {
    const { content, header, ancestors, docIndex, range } = chunk;
    const h = [...ancestors, header].filter(Boolean).join(" > ");
    const text = `${h ? h + "\n\n" : ""}${content}`;
    
    // Store index data synchronously to keep order
    indexes.push([docIndex, ...range]);
    return vectorize(text);
  });

  // 4. Resolve all vectors
  const resolvedVecs = await Promise.all(vectorPromises);

  // 5. Assemble index Buffer
  const indexBuffer = new Uint16Array(indexes.length * 3);
  for (let i = 0; i < indexes.length; i++) {
    indexBuffer.set(indexes[i], i * 3);
  }

  // 6. Assemble vec Buffer
  const vecBuffer = new Float32Array(resolvedVecs.length * dim);
  for (let i = 0; i < resolvedVecs.length; i++) {
    vecBuffer.set(resolvedVecs[i], i * dim);
  }

  // 7. Pack binary
  const sep = ";";
  const namesBuf = Buffer.from(filenames.join(sep));
  
  // ALIGNMENT: Ensure next sections start on 4-byte boundary
  const paddingLen = (4 - (namesBuf.length % 4)) % 4;
  const paddingBuf = Buffer.alloc(paddingLen, 0);

  // Calculate padding for the index buffer to protect the Float32 vecBuffer
  const indexPaddingLen = (4 - (indexBuffer.byteLength % 4)) % 4;

  const header = new Uint32Array(8);
  header[0] = 0x56454354;             // Magic "VECT"
  header[1] = 1;                      // Version
  header[2] = namesBuf.length;        // Actual string length
  header[3] = indexBuffer.byteLength;
  header[4] = vecBuffer.byteLength;
  header[5] = 3;                      // indexDim
  header[6] = dim;                    // vecDim
  header[7] = sep.charCodeAt(0);

  const finalBuffer = Buffer.concat([
    Buffer.from(header.buffer),
    namesBuf,
    paddingBuf,                       // Crucial for alignment
    Buffer.from(indexBuffer.buffer),
    Buffer.alloc(indexPaddingLen, 0), // The deduction logic works here too!
    Buffer.from(vecBuffer.buffer)
  ]);

  // 8. Write file + create directory along the way.
  const outputDir = path.dirname(outputFilepath);
  
  // Ensure the directory exists first
  await fs.mkdir(outputDir, { recursive: true });

  // Write file.
  await fs.writeFile(outputFilepath, finalBuffer, { recursive: true });
  console.log(`Successfully indexed ${resolvedVecs.length} chunks.`);
};

/**
 * @function loadKnowledgeBase
 * @description Zero-copy loader for the VECT binary format.
 * @param {string} filepath Path to the .bin file.
 * @returns {Promise} { filenames, indexBuffer, vecBuffer, indexDim, vecDim }
 */
const loadKnowledgeBase = async filepath => {
  const buffer = await fs.readFile(filepath);

  // 1. Read Header (First 32 bytes)
  // Use buffer.byteOffset and buffer.buffer to ensure we map correctly
  const header = new Uint32Array(buffer.buffer, buffer.byteOffset, 8);
  const [magic, version, namesLen, indexLen, vecLen, indexDim, vecDim, sepCode] = header;

  if (magic !== 0x56454354) throw new Error("Invalid VECT binary: Magic mismatch");

  const sep = String.fromCharCode(sepCode);
  let offset = 32; // The size of 8 Uint32s

  // 2. Extract Filenames
  // Using .subarray() instead of .slice() for modern Node.js standards
  const filenames = buffer.subarray(offset, offset + namesLen).toString().split(sep);
  
  // 3. Move offset past filenames + padding
  // (4 - (namesLen % 4)) % 4 is the alignment formula used during packing
  offset += namesLen + ((4 - (namesLen % 4)) % 4);

  // 4. Create Views for Indexes and Vectors (Zero-copy)
  // Shift right by 1 for Uint16 (2 bytes)
  const indexBuffer = new Uint16Array(buffer.buffer, buffer.byteOffset + offset, indexLen >> 1);
  
  // 5. Skip Index Buffer + its deduced padding
  // This ensures the NEXT offset is a multiple of 4 for the Float32Array
  offset += indexLen + ((4 - (indexLen % 4)) % 4);

  // Shift right by 2 for Float32 (4 bytes)
  const vecBuffer = new Float32Array(buffer.buffer, buffer.byteOffset + offset, vecLen >> 2);

  return {
    version,
    filenames,
    indexBuffer, 
    vecBuffer, 
    indexDim, 
    vecDim 
  };
};

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