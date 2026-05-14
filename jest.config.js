// jest.config.js
//
// Test runner config.
//
// Test source is plain CommonJS, but two of the runtime dependencies we
// exercise from tests — `@xenova/transformers` and its `@huggingface`
// sub-deps — ship as ESM-only. Without intervention, Jest's default
// behavior (no transform + ignore-all-of-node_modules) means a CJS
// `require("@xenova/transformers")` from a test (or from any source
// file the test imports) blows up with:
//
//   Must use import to load ES Module: .../@xenova/transformers/...
//
// The fix is two-part:
//
//   1. `transform` — give Jest a transformer (`babel-jest` with
//      `@babel/preset-env` targeted at the current Node) that can
//      down-compile ESM to CJS-compatible form on the fly. Applied to
//      every `.js`/`.mjs` file Jest loads.
//
//   2. `transformIgnorePatterns` — by default Jest excludes everything
//      in `node_modules` from transformation. We carve out exceptions
//      for the ESM packages we need transformed. Anything else under
//      `node_modules` is still skipped (no startup-time tax on the
//      packages that don't need it).
//
// Prerequisites (one-time):
//
//   npm install --save-dev babel-jest @babel/core @babel/preset-env

module.exports = {
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/__tests__/**/*.js",
    "**/?(*.)(spec|test).js?(x)"
  ],
  moduleNameMapper: {
    "^.+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__test__/__mocks__/fileMock.js"
  },
  moduleFileExtensions: ["js", "json"],

  // Babel transform applied to every .js / .mjs file Jest loads. The
  // inline preset config (rather than a `.babelrc` or `babel.config.js`)
  // keeps Babel's behavior scoped to Jest — your build pipeline or
  // anything else that runs Node directly is unaffected.
  //
  // `targets: { node: "current" }` means Babel only down-compiles what
  // the running Node version doesn't already understand. On modern Node
  // (18+) that's essentially just the ESM import/export syntax — the
  // transform overhead is minimal.
  transform: {
    "^.+\\.m?js$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
        ],
      },
    ],
  },

  // Carve ESM-only packages out of the node_modules ignore pattern so
  // the Babel transform above actually applies to them. Add new entries
  // here as you adopt more ESM-only deps.
  transformIgnorePatterns: [
    "node_modules/(?!(@xenova/transformers|@huggingface)/)",
  ],

  globals: {
    'jest': true
  },
  injectGlobals: true
};