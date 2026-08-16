"use strict";

var RULES = [
  // Error-pattern rules (sorted by priority within the file)
  require("./timeout-error"),
  require("./element-not-visible"),
  require("./click-timeout"),
  require("./element-detached"),
  require("./strict-mode-violation"),
  require("./locator-not-found"),
  require("./to-have-text"),
  require("./to-have-title"),
  require("./assertion-failure"),
  require("./net-err"),
  require("./http-401"),
  require("./http-403"),
  require("./http-404"),
  require("./http-500"),
  require("./econnreset"),
  require("./target-closed"),
  require("./network-error"),
  // Behavior-pattern rules
  require("./always-fails"),
  require("./rapid-alternation"),
  // Fallback (must be last)
  require("./generic-failure"),
].sort(function (a, b) {
  return a.priority - b.priority;
});

module.exports = RULES;
