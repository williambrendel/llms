"use strict";

const fs = require("fs").promises;
const { loadKnowledgeBase } = require("./buildKnowledgeBase");
const vectorize = require("../src/xenova/vectorize");
const { dotProductUnsafe: similarity } = require("../src/utilities/math/dotProduct");
const { normalizeUnsafe } = require("../src/utilities/math/normalize");
const { buildVectorSet, incrementalPCA, reconstruct } = require("../src/utilities/math/incrementalPCA");

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const datasetPath = args[0];
const query = args[1];

const docs = {};

const main = async () => {
  // Load dataset.
  const dataset = await loadKnowledgeBase(datasetPath), {
    version,
    filenames,
    indexBuffer, 
    vecBuffer, 
    indexDim, 
    vecDim 
  } = dataset || {};

  // console.log(dataset, query);

  // Vectorize the query.
  const q = await vectorize(query);

  // Compute ranking.
  let sims = [];
  for (let i = 0, j = 0, l = vecBuffer.length; i < l; i += vecDim) {
    const docIndex = indexBuffer[j++], start = indexBuffer[j++], end = indexBuffer[j++];
    const sim = similarity(q, vecBuffer, vecDim, 0, i);
    sims.push([sim, docIndex, start, end, i]);
  }

  const getInfo = async (...args) => {
    const sim = args.flat();
    const value = sim[0], filename = filenames[sim[1]], range = sim.slice(2, 4), offset = sim[4], originalRank = sim[5];
    const doc = docs[filename] || (docs[filename] = await fs.readFile(filename, "utf-8"));
    const output = {
      value,
      text: doc.slice(...range),
      range,
      offset
    };
    originalRank !== undefined && (output.originalRank = originalRank);
    return output;
  } 

  // console.log(sims);
  sims = sims.sort((a, b) => b[0] - a[0]);
  for (let i = 0,l = sims.length; i !== l; ++i) {
    console.log(i, await getInfo(sims[i]));
  }

  const V = buildVectorSet(vecBuffer, vecDim, sims.map(arr => arr[4]), sims.map(([value]) => value), q);
  // const V = buildVectorSet(vecBuffer, vecDim, sims.map(arr => arr[4]), sims.map(([value]) => value));
  const { v, k, mean } = incrementalPCA(V, vecDim, { stoppingThreshold: 0.1, centering: true });
  console.log("k:", k);
  // console.log("mean:", mean);
  console.log("qTv:", similarity(q, v, vecDim));
  console.log("qTmean:", similarity(q, normalizeUnsafe(mean, vecDim), vecDim));
  console.log("cos(v, V[0]):", similarity(v, V[0], vecDim));
  console.log("cos(v, mean):", similarity(v, normalizeUnsafe(mean, vecDim), vecDim));

  // Pre-allocate scratch buffer for reconstruction.
  const xr = new Float32Array(vecDim);

  // Score each chunk.
  let reranked = sims.map((s, originalRank) => {
    const offset = s[4];
    reconstruct(vecBuffer.subarray(offset, offset + vecDim), mean, v, vecDim, xr);
    normalizeUnsafe(xr, vecDim, 0, xr); // So the dotProduct becomes a cosine.
    const out = [...s, originalRank];
    // const sim = similarity(q, xr, vecDim);
    const sim = similarity(v, vecBuffer, vecDim, 0, offset);
    // const sim = similarity(normalizeUnsafe(mean, vecDim), vecBuffer, vecDim, 0, offset);
    out[0] = sim;
    return out;
  });

  // re-sort.
  reranked = reranked.sort((a, b) => b[0] - a[0]);
  for (let i = 0,l = reranked.length; i !== l; ++i) {
    const {originalRank, ...info} = await getInfo(reranked[i]);
    const move = originalRank - i;
    console.log(i, info, move > 0 && `↑ move ${move} up` || (move && `↓ move ${-move} down`) || "same rank");
  }
  
}

// Run if called directly
if (require.main === module) {
  main();
}