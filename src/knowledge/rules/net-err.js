"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "net-err",
  code: "RC-014",
  priority: 4,
  pattern: "net::ERR_",
  category: "Network",
  match: function (test) {
    return matchesErrorPattern(test, /net::err_/i);
  },
  result: function () {
    return {
      likelyCause:
        "Network request failed at the protocol level — unreachable host, DNS failure, or TLS error",
      confidence: 85,
      severity: "high",
      evidenceDescription:
        "A network-level error (net::ERR_) was detected — the browser could not complete the request",
      suggestedChecks: [
        "Verify connectivity from the test environment to the target host",
        "Check if the endpoint URL is correct and accessible",
        "Review server logs for connection refusals or TLS handshake failures",
        "Verify DNS resolution for the target domain from the CI environment",
        "Check if a proxy or firewall is blocking the connection",
      ],
      explanation:
        "net::ERR_ errors indicate the browser could not establish or complete a network connection. This is typically an infrastructure issue rather than an application bug.",
      requiresHumanReview: false,
    };
  },
};
