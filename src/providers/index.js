"use strict";

const mockProvider = require("./mock");

const providers = { mock: mockProvider };

function getProvider(name) {
  return providers[name || "mock"] || providers.mock;
}

module.exports = { getProvider };
