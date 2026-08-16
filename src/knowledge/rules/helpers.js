"use strict";

/**
 * Checks if an error message matches a regex pattern.
 * Searches across both classifiedErrors and raw errors.
 */
function matchesErrorPattern(test, pattern) {
  if (!test) return false;

  var allErrors = [];

  if (test.classifiedErrors && Array.isArray(test.classifiedErrors)) {
    allErrors = allErrors.concat(test.classifiedErrors);
  }
  if (test.errors && Array.isArray(test.errors)) {
    allErrors = allErrors.concat(test.errors);
  }

  return allErrors.some(function (e) {
    var msg = "";
    if (typeof e === "string") {
      msg = e;
    } else if (e.message) {
      msg = e.message;
    } else if (e.value && e.value.message) {
      msg = e.value.message;
    }
    if (!msg) return false;
    return pattern.test(msg);
  });
}

function hasCategory(test, category) {
  if (!test || !test.classifiedErrors || !Array.isArray(test.classifiedErrors)) {
    return false;
  }
  return test.classifiedErrors.some(function (e) {
    return e.category === category;
  });
}

function isRapidAlternation(test) {
  if (!test || !test.history || test.history.length < 4) {
    return false;
  }
  var transitions = 0;
  for (var i = 1; i < test.history.length; i++) {
    if (
      (test.history[i - 1] === "passed" && test.history[i] === "failed") ||
      (test.history[i - 1] === "failed" && test.history[i] === "passed")
    ) {
      transitions++;
    }
  }
  return transitions >= 3;
}

module.exports = { hasCategory, isRapidAlternation, matchesErrorPattern };
