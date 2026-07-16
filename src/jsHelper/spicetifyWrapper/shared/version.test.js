import assert from "node:assert/strict";
import test from "node:test";

import { compareVersions, isNewerVersion } from "./version.js";

test("compares Snowtify release revisions", () => {
  assert.equal(isNewerVersion("2.44.0-snow.4", "2.44.0-snow.3"), true);
  assert.equal(isNewerVersion("2.44.0-snow.2", "2.44.0-snow.3"), false);
  assert.equal(isNewerVersion("2.44.0-snow.3", "2.44.0-snow.3"), false);
});

test("compares core and stable versions", () => {
  assert.equal(isNewerVersion("v2.44.1", "2.44.0-snow.99"), true);
  assert.equal(compareVersions("2.44.0", "2.44.0-snow.3"), 1);
  assert.equal(compareVersions("2.44.0-snow.3", "2.44.0"), -1);
});

test("ignores invalid versions safely", () => {
  assert.equal(compareVersions("latest", "2.44.0"), null);
  assert.equal(isNewerVersion("latest", "2.44.0"), false);
});
