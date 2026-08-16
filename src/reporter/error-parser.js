"use strict";

/**
 * Parses a raw Playwright error message into structured sub-fields, so the
 * report can show Locator/Expected/Received/Timeout/Call log as their own
 * labeled rows instead of one opaque blob — without ever inventing a value
 * that isn't actually in the text. Every field is either a verbatim regex
 * capture or null; nothing is inferred/guessed (e.g. no reading a timeout
 * number out of free-form prose — only an explicit "Timeout:" label counts).
 */

function parseErrorMessage(rawMessage) {
  var result = {
    header: "",
    locator: null,
    expected: null,
    received: null,
    timeout: null,
    callLog: null,
  };

  var text = stripAnsi(String(rawMessage || "")).replace(/\r\n/g, "\n");
  if (!text.trim()) return result;

  var lines = text.split("\n");
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      result.header = lines[i].trim();
      break;
    }
  }

  var locatorMatch = text.match(/^Locator:\s*(.+)$/m);
  if (locatorMatch) result.locator = locatorMatch[1].trim();

  var expectedMatch = text.match(/^Expected:\s*(.+)$/m);
  if (expectedMatch) result.expected = expectedMatch[1].trim();

  var receivedMatch = text.match(/^Received:\s*(.+)$/m);
  if (receivedMatch) result.received = receivedMatch[1].trim();

  var timeoutMatch = text.match(/^Timeout:\s*(.+)$/m);
  if (timeoutMatch) result.timeout = timeoutMatch[1].trim();

  // Everything from "Call log:" to the true end of the message, verbatim
  // (own indentation/newlines intact). No `m` flag on the trailing `$` here —
  // this must capture to the absolute end of the string, not just the first
  // line, and must not stop early if the call log's own content happens to
  // contain the substring "Call log" again.
  var callLogMatch = text.match(/Call log:\s*\n([\s\S]*)$/);
  if (callLogMatch) result.callLog = callLogMatch[1].replace(/\s+$/, "");

  return result;
}

function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex -- deliberately matching the ANSI escape byte itself
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

module.exports = { parseErrorMessage };
