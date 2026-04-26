"use strict";

const math = require("./math");
const object = require("./object");
const { correctQuery, createSpellingEngine } = require("./correctQuery");
const getMediaType = require("./getMediaType");

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze({
  // Math utilities.
  ...math,

  // Object utilities.
  ...object,

  // Spell checking utilities.
  correctQuery,
  createSpellingEngine,
  getMediaType,
});