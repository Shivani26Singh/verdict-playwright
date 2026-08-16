"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "econnreset",
  code: "RC-019",
  priority: 4,
  pattern: "ECONNRESET",
  category: "Network",
  match: function (test) {
    return matchesErrorPattern(test, /ECONNRESET|econnreset/i);
  },
  result: function () {
    return {
      likelyCause: "The network connection was abruptly terminated by the server or network",
      confidence: 80,
      severity: "medium",
      evidenceDescription:
        "TCP connection was reset (ECONNRESET) — the server or network forcibly closed the connection",
      suggestedChecks: [
        "Review network stability in the CI environment",
        "Retry the test execution — ECONNRESET is often transient",
        "Check if the server enforces connection limits or timeouts",
        "Verify that no firewall or load balancer is dropping idle connections",
        "Check if keep-alive connections are being prematurely closed",
      ],
      explanation:
        "The TCP connection was forcibly closed by the remote host. This is usually a transient network issue or the server terminating the connection unexpectedly.",
      requiresHumanReview: false,
    };
  },
};
