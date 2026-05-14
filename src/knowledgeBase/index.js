"use strict";

/**
 * @file index.js
 * @module knowledgeBase
 * @description Barrel export for the build-time knowledge-base domain.
 *
 * `knowledgeBase/` is build-only: it turns markdown + LLM responses into
 * the section records that `Document.fromSpec` consumes, and resolves
 * where the resulting `.bin` files land on disk.
 *
 * Runtime concerns (loading, parsing, scoring, searching) live in
 * `src/VectorStore/` and `src/VectorStore/Document/`. Callers loading a
 * dataset for queries should use `VectorStore.create(path)` directly.
 */

const constants             = require("./constants");
const generateKnowledgeBase = require("./generateKnowledgeBase");
const resolveOutputPath     = require("./resolveOutputPath");

module.exports = Object.freeze({
  ...constants,
  generateKnowledgeBase,
  resolveOutputPath,
});
