"use strict";

const assert = require("chai").assert;
const setupTestDb = require("../../test.database");
const { getMarketsInCategory } = require("../../../build/server/getters/get-markets-in-category");

describe("server/getters/get-markets-in-category", () => {
  const test = (t) => {
    it(t.description, (done) => {
      setupTestDb((err, db) => {
        assert.isNull(err);
        getMarketsInCategory(db, t.params.universe, t.params.category, t.params.sortBy, t.params.isSortDescending, t.params.limit, t.params.offset, (err, marketsInCategory) => {
          t.assertions(err, marketsInCategory);
          done();
        });
      });
    });
  };
  test({
    description: "category with markets in it",
    params: {
      universe: "0x000000000000000000000000000000000000000b",
      category: "test category",
    },
    assertions: (err, marketsInCategory) => {
      assert.isNull(err);
      assert.deepEqual(marketsInCategory, [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000003",
        "0x0000000000000000000000000000000000000011",
      ]);
    },
  });
  test({
    description: "category with markets in it, limit 2",
    params: {
      universe: "0x000000000000000000000000000000000000000b",
      category: "test category",
      limit: 2,
    },
    assertions: (err, marketsInCategory) => {
      assert.isNull(err);
      assert.deepEqual(marketsInCategory, [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      ]);
    },
  });
  test({
    description: "empty category",
    params: {
      universe: "0x000000000000000000000000000000000000000b",
      category: "empty category",
    },
    assertions: (err, marketsInCategory) => {
      assert.isNull(err);
      assert.deepEqual(marketsInCategory, []);
    },
  });
});
