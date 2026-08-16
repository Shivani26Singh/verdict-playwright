"use strict";

const CATEGORIES = {
  TIMEOUT: "timeout",
  LOCATOR: "locator",
  ASSERTION: "assertion",
  NETWORK: "network",
  BACKEND: "backend",
  AUTHENTICATION: "authentication",
  ENVIRONMENT: "environment",
  DATA: "data",
  UNKNOWN: "unknown",
};

const PATTERNS = [
  {
    category: CATEGORIES.LOCATOR,
    score: 5,
    patterns: [
      /\bselector\b/i,
      /\b(?:element|locator|selector)\s+not\s+found\b/i,
      /\bnot\s+visible\b/i,
      /\bno\s+such\s+element\b/i,
      /\blocator\b/i,
      /\belement\s+not\b/i,
      /\bcannot\s+find\b/i,
      /\bunable\s+to\s+locate\b/i,
      /\.(click|fill|type|check|selectOption|hover|dblclick|focus|press)\s*\(/,
    ],
  },
  {
    category: CATEGORIES.TIMEOUT,
    score: 10,
    patterns: [
      /\btime[ -]?out\b/i,
      /\btimed[ -]?out\b/i,
      /\bwaitForTimeout\b/,
      /\bexceeded\b.+\btimeout\b/i,
      /\bnavigation\s+timeout\b/i,
      /\bwaiting\s+for\b/i,
      /\b\d{4,}ms\b/,
    ],
  },
  {
    category: CATEGORIES.LOCATOR,
    score: 20,
    patterns: [
      /\bselector\b/i,
      /\b(?:element|locator|selector)\s+not\s+found\b/i,
      /\bnot\s+visible\b/i,
      /\bno\s+such\s+element\b/i,
      /\blocator\b/i,
      /\belement\s+not\b/i,
      /\bcannot\s+find\b/i,
      /\bunable\s+to\s+locate\b/i,
      /\.(click|fill|type|check|selectOption|hover|dblclick|focus|press)\s*\(/,
    ],
  },
  {
    category: CATEGORIES.DATA,
    score: 25,
    patterns: [
      /\bdata\b/i,
      /\bmissing\s+data\b/i,
      /\bvalidation\b/i,
      /\bschema\b/i,
      /\bfixture\b/i,
      /\btest\s+data\b/i,
      /\bnull\b/i,
      /\bundefined\b/i,
      /\bNaN\b/,
      /\btype\s*error\b/i,
      /\bcannot\s+read\s+properties\b/i,
      /\bis\s+not\s+a\s+function\b/i,
    ],
  },
  {
    category: CATEGORIES.ASSERTION,
    score: 30,
    patterns: [
      /\bexpect\s*\(/i,
      /\bassert\b/i,
      /\bto\s*\.?(Be|Equal|Contain|Have|Match|Throw|Satisfy)\b/,
      /\btoBe\b/,
      /\btoEqual\b/,
      /\btoContain\b/,
      /\btoHaveText\b/,
      /\btoHaveLength\b/,
      /\btoMatch\b/,
      /\btoBeNull\b/,
      /\btoBeTruthy\b/,
      /\btoBeFalsy\b/,
      /\btoBeGreaterThan\b/,
      /\btoBeLessThan\b/,
      /\btoStrictEqual\b/,
      /\bexpected\s+(?!status\b)/i,
      /\breceived\b/i,
      /\b(?:CSS|class|snapshot|text)\s+mismatch\b/i,
      /\bsnapshot\b/i,
    ],
  },
  {
    category: CATEGORIES.NETWORK,
    score: 35,
    patterns: [
      /\bECONNREFUSED\b/,
      /\bECONNRESET\b/,
      /\bETIMEDOUT\b/,
      /\bENOTFOUND\b/,
      /\bDNS\b/,
      /\bconnection\s+refused\b/i,
      /\bconnection\s+reset\b/i,
      /\bnetwork\s+error\b/i,
      /\bnet::ERR_[A-Z0-9_]+\b/,
    ],
  },
  {
    category: CATEGORIES.BACKEND,
    score: 38,
    patterns: [
      /\b5\d{2}\b/,
      /\b502\b/,
      /\b503\b/,
      /\b504\b/,
      /\b500\b/,
      /\b404\b/,
      /\binternal\s+server\s+error\b/i,
      /\bserver\s+error\b/i,
      /\bbackend\b/i,
    ],
  },
  {
    category: CATEGORIES.AUTHENTICATION,
    score: 50,
    patterns: [
      /\blogin\b/i,
      /\blog\s*out\b/i,
      /\blogged\s*(?:in|out)\b/i,
      /\bauth(?:entication)?\b/i,
      /\bunauthorized\b/i,
      /\bforbidden\b/i,
      /\b401\b/,
      /\b403\b/,
      /\bsession\b/i,
      /\btoken\b/i,
      /\bcredentials\b/i,
      /\bsign[ -]?in\b/i,
      /\bpassword\b/i,
      /\bpermission\s+denied\b/i,
    ],
  },
  {
    category: CATEGORIES.ENVIRONMENT,
    score: 60,
    patterns: [
      /\benvironment\b/i,
      /\bconfig(?:uration)?\b/i,
      /\bmissing\s+(?:environment\s+)?variable\b/i,
      /\bprocess\.env\b/i,
      /\b\.env\b/,
      /\bCI\b/,
      /\bdocker\b/i,
      /\bcontainer\b/i,
      /\bport\b.*\bin\s*use\b/i,
      /\bEADDRINUSE\b/,
      /\bworkspace\b/i,
    ],
  },
];

function classifyError(error) {
  if (!error) return CATEGORIES.UNKNOWN;

  const message = typeof error === "string" ? error : error.message || "";
  const stack = typeof error === "object" && error.stack ? error.stack : "";
  const combined = `${message}\n${stack}`;

  if (!combined.trim()) return CATEGORIES.UNKNOWN;

  let bestCategory = CATEGORIES.UNKNOWN;
  let bestScore = Infinity;

  for (const group of PATTERNS) {
    for (const pattern of group.patterns) {
      if (pattern.test(combined)) {
        if (group.score < bestScore) {
          bestScore = group.score;
          bestCategory = group.category;
          break;
        }
      }
    }
  }

  return bestCategory;
}

function classifyErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return { category: CATEGORIES.UNKNOWN, errors: [] };
  }

  const classified = errors.map((err) => ({
    message: typeof err === "string" ? err : err.message || "",
    stack: typeof err === "object" && err.stack ? err.stack : null,
    category: classifyError(err),
  }));

  const category = determineDominantCategory(classified.map((e) => e.category));

  return { category, errors: classified };
}

function determineDominantCategory(categories) {
  if (categories.length === 0) return CATEGORIES.UNKNOWN;

  const counts = {};
  for (const cat of categories) {
    counts[cat] = (counts[cat] || 0) + 1;
  }

  const ordered = [
    CATEGORIES.LOCATOR,
    CATEGORIES.TIMEOUT,
    CATEGORIES.DATA,
    CATEGORIES.ASSERTION,
    CATEGORIES.NETWORK,
    CATEGORIES.BACKEND,
    CATEGORIES.AUTHENTICATION,
    CATEGORIES.ENVIRONMENT,
    CATEGORIES.UNKNOWN,
  ];

  let best = CATEGORIES.UNKNOWN;
  let bestCount = 0;

  for (const cat of ordered) {
    if ((counts[cat] || 0) > bestCount) {
      bestCount = counts[cat];
      best = cat;
    }
  }

  return best;
}

module.exports = { classifyError, classifyErrors, CATEGORIES };
