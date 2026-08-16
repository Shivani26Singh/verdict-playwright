"use strict";

var ruleEngineModule = require("../investigation/rule-engine");
var errorParser = require("./error-parser");

// Confidence is an internal triage signal, not a headline number — an
// investigation is flagged for human review when its score lands below this
// fixed threshold. This used to be a user-configurable analyzer.confidenceThreshold;
// it was retired in favor of a constant once confidence was hidden from the UI.
var REVIEW_CONFIDENCE_THRESHOLD_PCT = 70;

function buildDashboardJson(result) {
  const { summary, statistics, results, runs, analyzerVersion, schemaVersion } = result;
  const flakyTrendByRun = result.flakyTrend || [];
  const aggregate = statistics && statistics.aggregate ? statistics.aggregate : {};
  const fc = statistics && statistics.failureCategories ? statistics.failureCategories : {};
  const failureCounts = fc.counts || {};

  const totalTests = summary.totalTests || 0;
  const stablePass = summary.stable_pass || 0;
  const healthScore = totalTests > 0 ? Math.round((stablePass / totalTests) * 100) : 100;

  const hasFailures = !!(
    (summary.stable_failure || 0) +
    (summary.regression || 0) +
    (summary.newly_failed || 0) +
    (summary.flaky || 0)
  );

  // Skip tests whose actual latest-run outcome is "skipped" — classify() can
  // still label them flaky/newly_failed/etc. by looking past the skip to an
  // older pass/fail signal (see engine.js buildSummary), but that status
  // isn't true "right now": the test didn't run in the latest run. They're
  // tracked separately (skippedTests below) instead of double-counted here.
  const trackedResults = (results || []).filter(function (r) {
    return r.lastOutcome !== "skipped";
  });

  const flakyTests = trackedResults
    .filter(function (r) {
      return r.classification === "flaky";
    })
    .map(function (t) {
      var histLabels = (t.history || []).map(function (h) {
        return h === "passed" ? "PASS" : h === "failed" ? "FAIL" : h.toUpperCase();
      });
      var passes = (t.history || []).filter(function (h) {
        return h === "passed";
      }).length;
      var fails = (t.history || []).filter(function (h) {
        return h === "failed";
      }).length;
      var total = (t.history || []).length;
      return {
        title: t.title,
        browser: t.browser || "\u2014",
        history: histLabels,
        passes: passes,
        fails: fails,
        flakyRate: total > 0 ? Math.round((fails / total) * 100) : 0,
        attempts: total,
        // "Flaky" alone doesn't say whether that instability is a live fire
        // right now or a currently-dormant risk \u2014 a flaky test failing THIS
        // run needs attention today; one that's currently green just needs
        // watching. lastOutcome is the test's actual most-recent-run result.
        currentStatus: t.lastOutcome === "passed" ? "passing" : "failing",
      };
    });

  const flakyCurrentlyFailing = flakyTests.filter(function (t) {
    return t.currentStatus === "failing";
  }).length;
  const flakyCurrentlyPassing = flakyTests.length - flakyCurrentlyFailing;

  const hasFlaky = flakyTests.length > 0;

  // Currently passing (stable_pass/fixed) but only after 1+ retries in the latest
  // run — excluded from buildInvestigations() since they aren't failing, but get
  // the same root-cause/confidence/evidence treatment as a real investigation.
  const passingOnRetryTests = buildPassingOnRetryInvestigations(trackedResults);

  // Skipped in the latest run — test.skip()/conditional skip, not a pass or a
  // fail. Excluded from classification (see classifier.js) so it never shows
  // up as flaky/failing, but still worth surfacing so a skip introduced by a
  // config/env change doesn't go unnoticed.
  const skippedTests = (results || [])
    .filter(function (r) {
      return r.lastOutcome === "skipped";
    })
    .map(function (t) {
      return {
        title: t.title,
        browser: t.browser || "—",
        history: t.history || [],
      };
    });

  const timeline = ((statistics && statistics.perRun) || []).map(function (r, i, arr) {
    var trend = "\u2192 Stable";
    if (arr.length >= 2 && i === arr.length - 1) {
      var prev = arr[i - 1];
      if (r.passRate > prev.passRate + 5) trend = "\u2191 Improving";
      else if (r.passRate < prev.passRate - 5) trend = "\u2193 Degrading";
    }
    return {
      label: r.runLabel,
      passRate: r.passRate,
      failRate: r.failRate,
      failures: r.failed,
      flaky: r.flaky,
      retries: r.totalRetries,
      durationMs: r.totalDuration,
      trend: trend,
    };
  });

  const slowestTests = ((statistics && statistics.slowestTests) || [])
    .slice(0, 10)
    .map(function (t, i) {
      return {
        rank: i + 1,
        title: t.title,
        durationMs: t.totalDuration,
        maxDurationMs: t.maxDuration || t.totalDuration,
        retries: t.retries,
      };
    });

  const failureFrequency = ((statistics && statistics.failureFrequency) || [])
    .filter(function (f) {
      return f.failureCount > 0;
    })
    .map(function (f) {
      var parts = splitTitleBrowser(f.title);
      return {
        testName: parts.testName,
        browser: parts.browser,
        failureCount: f.failureCount,
        totalRuns: f.totalRuns,
        failureRate: f.failureRate,
      };
    });

  var stableFail = summary.stable_failure || 0;
  var newlyFailed = summary.newly_failed || 0;
  var flaky = summary.flaky || 0;
  var regression = summary.regression || 0;
  var fixed = summary.fixed || 0;
  var passingOnRetry = summary.passingOnRetry || 0;
  var failed = stableFail + newlyFailed;
  var pct = function (n) {
    return totalTests > 0 ? Math.round((n / totalTests) * 100) : 0;
  };

  // Every test lands in exactly one bucket, and the buckets sum to `total`, so the
  // dashboard tiles reconcile with the header. passingOnRetry is a sub-metric of
  // "stable" (currently passing tests that needed 1+ retries in the latest run) —
  // it does not get its own bucket and is not added into `total`.
  // Skipped is a status of its own — it's not counted in `total`'s pass/fail
  // buckets (a skipped test never ran, so it can't be stable/flaky/failed),
  // it's surfaced as an additional, separate tile.
  var skipped = skippedTests.length;

  var suiteSummary = {
    total: totalTests,
    stable: stablePass,
    flaky: flaky,
    regression: regression,
    failed: failed, // retained (stable + new failures) for backward compatibility
    stableFail: stableFail,
    newlyFailed: newlyFailed,
    fixed: fixed,
    passingOnRetry: passingOnRetry,
    skipped: skipped,
    stablePct: pct(stablePass),
    flakyPct: pct(flaky),
    regressionPct: pct(regression),
    failedPct: pct(failed),
    stableFailPct: pct(stableFail),
    newlyFailedPct: pct(newlyFailed),
    fixedPct: pct(fixed),
    passingOnRetryPct: pct(passingOnRetry),
    skippedPct: pct(skipped),
  };

  // `flaky` here is cross-run flaky classification as of each run (see
  // engine.js buildFlakyTrend) — NOT r.flaky, which is statistics.perRun's
  // in-run retry flakiness (Playwright retried within one invocation) and
  // is a different, still-valid metric used elsewhere (e.g. Browser
  // Statistics, the Markdown Per-Run Breakdown table). Every other field
  // here is unchanged and still comes from statistics.perRun.
  var retryTimeline = ((statistics && statistics.perRun) || []).map(function (r, i) {
    return {
      run: r.runLabel,
      retries: r.totalRetries,
      durationMs: r.totalDuration,
      failed: r.failed,
      flaky: flakyTrendByRun[i] ? flakyTrendByRun[i].flaky : 0,
    };
  });

  var recommendations = buildRecommendations(summary, aggregate, failureCounts);

  // Built once and reused for investigations/investigationSummary/rootCauseSummary
  // so all three agree on the same (fingerprint- and history-adjusted) confidence
  // number per test — rootCauseSummary used to recompute its own unadjusted
  // baseConfidence straight from the rule, which could show a different % than
  // the same test's card in Failed Tests.
  var investigationsForOutput = buildInvestigations(trackedResults);

  var runSummary = generateRunSummary(
    totalTests,
    stablePass,
    flaky,
    regression,
    failed,
    newlyFailed,
    summary.fixed || 0,
    summary.runsAnalyzed || 0,
    statistics,
    failureCounts,
    trackedResults
  );

  return {
    project: "Playwright Flaky Test Analyzer",
    version: analyzerVersion || "1.0.0",
    generatedAt: new Date().toISOString(),
    schemaVersion: schemaVersion || "1.0.0",
    summary: {
      runs: summary.runsAnalyzed || 0,
      totalTests: totalTests,
      stablePass: stablePass,
      stableFail: stableFail,
      flaky: flaky,
      newlyFailed: newlyFailed,
      fixed: summary.fixed || 0,
      regression: regression,
      healthScore: healthScore,
    },
    suiteSummary: suiteSummary,
    health: {
      passRate: aggregate.overallPassRate || 0,
      failRate: aggregate.overallFailRate || 0,
      flakyRate: totalTests > 0 ? Math.round((flaky / totalTests) * 10000) / 100 : 0,
      retryRate: aggregate.avgRetriesAcrossRuns || 0,
      avgDurationMs: aggregate.avgDurationAcrossRuns || 0,
    },
    // "All runs" is the historical view (spot a category/browser that keeps
    // recurring run over run); "Latest" is scoped to just the most recent
    // report so it answers "what's failing right now," which all-runs
    // aggregation blurs together with older, possibly-already-fixed runs.
    browserStats: buildBrowserStatsWithFlaky(statistics, trackedResults),
    browserStatsLatest: ((statistics && statistics.browserStatsLatest) || []).map(function (b) {
      return {
        browser: b.browser,
        totalTests: b.totalTests,
        totalFailures: b.totalFailures,
        failRate: b.failRate,
      };
    }),
    slowestTests: slowestTests,
    failureFrequency: failureFrequency,
    failureCategories: buildFailureCategoriesShape(fc, failureCounts),
    failureCategoriesLatest: buildFailureCategoriesShape(
      (statistics && statistics.failureCategoriesLatest) || {},
      (statistics &&
        statistics.failureCategoriesLatest &&
        statistics.failureCategoriesLatest.counts) ||
        {}
    ),
    flakyTests: flakyTests,
    passingOnRetryTests: passingOnRetryTests,
    skippedTests: skippedTests,
    retryTimeline: retryTimeline,
    recommendations: recommendations,
    hasFailures: hasFailures,
    hasFlaky: hasFlaky,
    investigations: investigationsForOutput,
    investigationSummary: buildInvestigationSummary(investigationsForOutput, failureCounts),
    rootCauseSummary: buildRootCauseSummary(investigationsForOutput),
    runSummary: runSummary,
  };
}

/**
 * Generate a deterministic fingerprint from stable failure characteristics.
 * Excludes stack traces, line numbers, test names, and browser names.
 *
 * Algorithm: DJB2 hash of "classification|failureCategory|errorPattern|rootCauseKey"
 * Format: FP-XXXXXX (6 uppercase hex chars)
 *
 * @param {string} classification — "flaky", "regression", etc.
 * @param {string} failureCategory — "timeout", "locator", etc.
 * @param {string|null} errorPattern — "TimeoutError", "assertion", etc.
 * @param {string|null} rootCauseKey — "Page or API response too slow", etc.
 * @returns {string} — "FP-A3F12B"
 */
function generateFingerprint(classification, failureCategory, errorPattern, rootCauseKey) {
  var key =
    (classification || "unknown") +
    "|" +
    (failureCategory || "unknown") +
    "|" +
    (errorPattern || "unknown") +
    "|" +
    (rootCauseKey || "unknown");
  return "FP-" + djb2Hex(key);
}

function djb2Hex(str) {
  var hash = 5381;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  // Convert to unsigned, take 24 bits, format as 6 hex chars
  var u = hash >>> 0;
  var hex = u.toString(16).toUpperCase();
  while (hex.length < 6) hex = "0" + hex;
  return hex.substring(0, 6);
}

function buildInvestigationSummary(investigations, failureCounts) {
  if (!investigations || !investigations.length) return null;

  var totalFailing = investigations.length;
  var regressions = investigations.filter(function (i) {
    return i.classification === "regression";
  }).length;
  var flaky = investigations.filter(function (i) {
    return i.classification === "flaky";
  }).length;
  var newlyFailed = investigations.filter(function (i) {
    return i.classification === "newly_failed";
  }).length;
  var stableFailures = investigations.filter(function (i) {
    return i.classification === "stable_failure";
  }).length;

  var fps = {};
  investigations.forEach(function (i) {
    if (i.fingerprint) fps[i.fingerprint] = true;
  });
  var uniqueFingerprints = Object.keys(fps).length;

  var top = findTopFailureCategory(failureCounts);

  return {
    totalFailing: totalFailing,
    regressions: regressions,
    flaky: flaky,
    newlyFailed: newlyFailed,
    stableFailures: stableFailures,
    uniqueFingerprints: uniqueFingerprints,
    topCategory: top ? top.charAt(0).toUpperCase() + top.slice(1) : null,
  };
}

function findTopFailureCategory(failureCounts) {
  var topCat = null;
  var topCount = 0;
  Object.keys(failureCounts).forEach(function (k) {
    if ((failureCounts[k] || 0) > topCount) {
      topCount = failureCounts[k] || 0;
      topCat = k;
    }
  });
  return topCat;
}

function generateRunSummary(
  totalTests,
  stablePass,
  flaky,
  regression,
  failed,
  newlyFailed,
  fixed,
  runs,
  statistics,
  failureCounts,
  results
) {
  var bullets = [];

  // Rule 1: Total distinct tests tracked. NOT "executed" — totalTests is the
  // count of distinct tests (one per browser), not execution events; a test
  // present in all 3 runs is still one entry here, while Browser Statistics'
  // "Executions" counts every run it appeared in (tests × runs).
  if (totalTests > 0 && runs > 0) {
    bullets.push(
      totalTests +
        " distinct test" +
        (totalTests !== 1 ? "s" : "") +
        " tracked across " +
        runs +
        " run" +
        (runs !== 1 ? "s" : "") +
        "."
    );
  }

  // Rule 1b: One "right now" data point, folded into the same single list
  // rather than a separate toggled view — everything else below is
  // necessarily a whole-window trend (flaky/newly-failing/regression need
  // multi-run history to exist at all), so this is the one line that answers
  // "what does the most recent run look like."
  var perRunAll = (statistics && statistics.perRun) || [];
  var latestRun = perRunAll[perRunAll.length - 1];
  if (latestRun && latestRun.total > 0) {
    var latestFailRate = Math.round((latestRun.failed / latestRun.total) * 1000) / 10;
    var latestSkipped = latestRun.skipped || 0;
    var latestPassed = latestRun.total - latestRun.failed - latestSkipped;
    bullets.push(
      "Latest run (" +
        latestRun.runLabel +
        "): " +
        latestRun.total +
        " tests — " +
        latestPassed +
        " passed, " +
        latestRun.failed +
        " failed (" +
        latestFailRate +
        "%)" +
        (latestSkipped ? ", " + latestSkipped + " skipped" : "") +
        "."
    );
  }

  // Rule 2: Stable tests — only mention if > 0 and something else is wrong
  if (stablePass > 0 && totalTests > 0 && stablePass < totalTests) {
    bullets.push(stablePass + " tests passed consistently across all runs.");
  }

  // Rule 3: Flaky tests. "Flaky" alone doesn't say whether that instability
  // is a live fire right now or a currently-dormant risk, and a pile of
  // flaky tests that all share the exact same history pattern is usually
  // ONE shared incident (an environment/backend blip that hit many
  // unrelated tests in the same run) rather than N independently-unreliable
  // tests each needing separate triage — call both out explicitly instead
  // of leaving the reader to assume "N tests, N problems."
  var flakyResults = (results || []).filter(function (r) {
    return r.classification === "flaky";
  });
  if (flaky > 0) {
    var flakyFailingNow = flakyResults.filter(function (r) {
      return r.lastOutcome !== "passed";
    }).length;
    var flakyPassingNow = flaky - flakyFailingNow;
    var flakyBullet =
      flaky +
      " flaky test" +
      (flaky !== 1 ? "s" : "") +
      " detected — " +
      (flaky !== 1 ? "outcomes alternate" : "outcome alternates") +
      " between pass and fail (" +
      flakyPassingNow +
      " currently passing, " +
      flakyFailingNow +
      " currently failing).";

    if (flaky > 1) {
      var patternCounts = {};
      flakyResults.forEach(function (r) {
        var p = (r.history || []).join(">");
        patternCounts[p] = (patternCounts[p] || 0) + 1;
      });
      var topPattern = Object.keys(patternCounts).sort(function (a, b) {
        return patternCounts[b] - patternCounts[a];
      })[0];
      var topPatternCount = patternCounts[topPattern];
      if (topPatternCount / flaky >= 0.7) {
        flakyBullet +=
          " " +
          topPatternCount +
          " of " +
          flaky +
          " share the identical " +
          topPattern.replace(/>/g, "→") +
          " history" +
          (topPatternCount === flaky ? "" : " (the rest differ)") +
          " — likely one shared incident, not " +
          flaky +
          " independently unreliable tests.";
      }
    }
    bullets.push(flakyBullet);
  }

  // Rule 4: Regressions
  if (regression > 0) {
    bullets.push(
      regression +
        " regression" +
        (regression !== 1 ? "s" : "") +
        " found — previously passing tests now fail again."
    );
  }

  // Rule 5: Breakdown of currently-failing tests — new breaks vs. already-
  // chronic ones. "newly failing" is, by definition, a subset of "currently
  // failing" (a test can't be newly broken without also being broken right
  // now) — stated on its own, this bullet was just restating the latest
  // run's fail count under a different name. Tying it explicitly to `failed`
  // makes it read as an actual breakdown (why are they failing — first time,
  // or long-standing?) instead of a second, seemingly independent count.
  var stableFailCount = failed - newlyFailed;
  if (newlyFailed > 0 && stableFailCount > 0) {
    bullets.push(
      "Of the " +
        failed +
        " tests currently failing, " +
        newlyFailed +
        " " +
        (newlyFailed !== 1 ? "are" : "is") +
        " newly broken (passed before) and " +
        stableFailCount +
        " " +
        (stableFailCount !== 1 ? "have" : "has") +
        " been consistently failing across all runs."
    );
  } else if (newlyFailed > 0) {
    bullets.push(
      newlyFailed +
        " newly failing test" +
        (newlyFailed !== 1 ? "s" : "") +
        " require" +
        (newlyFailed === 1 ? "s" : "") +
        " investigation."
    );
  } else if (stableFailCount > 0) {
    bullets.push(
      stableFailCount +
        " test" +
        (stableFailCount !== 1 ? "s" : "") +
        " " +
        (stableFailCount !== 1 ? "have" : "has") +
        " been consistently failing across all runs."
    );
  }

  // Rule 6: Most common failure category
  var topCat = findTopFailureCategory(failureCounts);
  var topCount = topCat ? failureCounts[topCat] || 0 : 0;
  var totalErrors = 0;
  Object.keys(failureCounts).forEach(function (k) {
    totalErrors += failureCounts[k] || 0;
  });
  if (topCat && topCount > 0) {
    var catLabel = topCat.charAt(0).toUpperCase() + topCat.slice(1);
    bullets.push(
      catLabel +
        "-related failures were the most common issue (" +
        topCount +
        " of " +
        totalErrors +
        " error" +
        (totalErrors !== 1 ? "s" : "") +
        ")."
    );
  }

  // Rule 7: Retry activity across the window — trend, not a single-run count.
  // A flat "~N per run" average is misleading (and effectively just restates
  // the latest run's number in disguise) when retries are actually
  // concentrated in one run rather than spread evenly — call that out by
  // name instead of averaging it away.
  if (statistics && statistics.aggregate) {
    var agg = statistics.aggregate;
    var retryRate = agg.avgRetriesAcrossRuns || 0;
    var perRun = statistics.perRun || [];
    var totalRetries = perRun.reduce(function (s, r) {
      return s + (r.totalRetries || 0);
    }, 0);
    if (totalRetries > 0 && runs > 0) {
      var worstRetryRun = perRun.reduce(function (a, b) {
        return (b.totalRetries || 0) > (a.totalRetries || 0) ? b : a;
      }, perRun[0]);
      var concentrated = runs > 1 && (worstRetryRun.totalRetries || 0) >= totalRetries * 0.7;
      var distribution = concentrated
        ? "almost entirely from " +
          worstRetryRun.runLabel +
          " (" +
          worstRetryRun.totalRetries +
          " of " +
          totalRetries +
          ")"
        : "~" + Math.round(totalRetries / runs) + " per run on average";
      bullets.push(
        "Tests needed a total of " +
          totalRetries +
          " retry attempts across " +
          runs +
          " run" +
          (runs !== 1 ? "s" : "") +
          " — " +
          distribution +
          " — " +
          (retryRate > 1
            ? "high retry activity may indicate systemic instability."
            : "some recovered on retry, others still failed after exhausting retries.")
      );
    }
  }

  // Rule 8: Browser-specific failures — only meaningful when more than one browser was actually run
  var brStats = (statistics && statistics.browserStats) || [];
  if (brStats.length > 1) {
    var failingBrowsers = brStats.filter(function (b) {
      return b.totalFailures > 0;
    });
    if (failingBrowsers.length === 1) {
      bullets.push(failingBrowsers[0].browser + " accounted for all observed failures.");
    } else if (failingBrowsers.length > 1 && failingBrowsers.length === brStats.length) {
      bullets.push("Failures were distributed across all " + failingBrowsers.length + " browsers.");
    } else if (failingBrowsers.length > 1) {
      var worst = failingBrowsers.sort(function (a, b) {
        return b.failRate - a.failRate;
      })[0];
      bullets.push(worst.browser + " had the highest failure rate at " + worst.failRate + "%.");
    }
  }

  // Rule 9: Slowest test — mention only if duration is meaningful
  var slowest = (statistics && statistics.slowestTests) || [];
  if (slowest.length > 0 && slowest[0].durationMs > 5000) {
    bullets.push(
      "Slowest test: " +
        slowest[0].title +
        " took " +
        slowest[0].durationMs.toLocaleString() +
        "ms."
    );
  }

  // Rule 10: Root cause distribution across the FULL tracked window — includes
  // flaky and already-chronic (stable_failure) tests, not just whatever
  // happens to be failing in the latest run.
  var causeCounts = {};
  var causeTestTitles = {};
  (results || [])
    .filter(function (r) {
      return (
        r.classification === "flaky" ||
        r.classification === "stable_failure" ||
        r.classification === "regression" ||
        r.classification === "newly_failed"
      );
    })
    .forEach(function (t) {
      var inv = ruleEngineModule.runRules(t);
      var cause = inv && inv.result ? inv.result.likelyCause : null;
      if (cause) {
        causeCounts[cause] = (causeCounts[cause] || 0) + 1;
        (causeTestTitles[cause] = causeTestTitles[cause] || []).push(t.title);
      }
    });

  var rootCauses = Object.keys(causeCounts).sort(function (a, b) {
    return causeCounts[b] - causeCounts[a];
  });
  if (rootCauses.length > 0 && totalTests > 0) {
    var topRoot = rootCauses[0];
    var topRootCount = causeCounts[topRoot];
    if (topRootCount > 0) {
      var topRootTitles = causeTestTitles[topRoot] || [];
      var shownTitles = topRootTitles.slice(0, 3).join(", ");
      var moreCount = topRootTitles.length - 3;
      var titleSuffix =
        moreCount > 0
          ? " (" + shownTitles + ", +" + moreCount + " more)"
          : topRootTitles.length
            ? " (" + shownTitles + ")"
            : "";
      bullets.push(
        'Top root cause across all tracked failures: "' +
          topRoot +
          '" — affecting ' +
          topRootCount +
          " test" +
          (topRootCount !== 1 ? "s" : "") +
          titleSuffix +
          "."
      );
    }
  }

  // Cap at 9 bullets
  if (bullets.length > 9) bullets = bullets.slice(0, 9);

  return bullets;
}

/**
 * Build one investigation-shaped object from a test result. Reads errors from
 * t.errors/t.classifiedErrors/t.failureCategory — callers that want a
 * different error source (e.g. retry-failure errors) pass a shallow-cloned
 * test with those fields overridden, rather than this function branching
 * on a "mode".
 */
function buildInvestigationEntry(t) {
  var investigation = ruleEngineModule.runRules(t);
  var invResult = investigation ? investigation.result : null;

  var classifiedErrors = [];
  var errors = [];
  if (invResult && invResult.classifiedErrors) classifiedErrors = invResult.classifiedErrors;
  if (t.classifiedErrors && t.classifiedErrors.length) classifiedErrors = t.classifiedErrors;
  if (t.errors && t.errors.length) errors = t.errors;

  var baseConf = invResult ? invResult.baseConfidence || invResult.confidence || 20 : 20;

  // Classification labels — computed here, not in html.js
  var cls = t.classification;
  var clsLabel =
    cls === "stable_failure"
      ? "Consistently Failing"
      : cls === "regression"
        ? "Regression"
        : cls === "newly_failed"
          ? "Newly Failing"
          : "Flaky";
  var clsBadge = cls === "stable_failure" || cls === "regression" ? "badge-fail" : "badge-warn";
  var dataCls =
    cls === "flaky"
      ? "flaky"
      : cls === "newly_failed"
        ? "new"
        : cls === "stable_failure"
          ? "stable_failure"
          : "regression";

  // Generate fingerprint from stable characteristics
  var fp = generateFingerprint(
    t.classification,
    t.failureCategory,
    invResult ? invResult.errorPattern : null,
    invResult ? invResult.likelyCause : null
  );

  return {
    testName: t.title,
    browser: t.browser || "\u2014",
    classification: t.classification,
    classificationLabel: clsLabel,
    classificationBadge: clsBadge,
    classificationDataClass: dataCls,
    classificationReasons: t.classificationReasons || [],
    classificationRuleId: t.classificationRuleId || null,
    history: t.history,
    retriesPerRun: t.retriesPerRun || [],
    runCount: t.runCount,
    status: computeTestStatus(t),
    ruleBased: investigation,
    pattern: invResult ? invResult.errorPattern : null,
    category: invResult ? invResult.category : null,
    likelyCause: invResult ? invResult.likelyCause : "Unknown \u2014 requires investigation",
    confidence: baseConf,
    baseConfidence: baseConf,
    severity: invResult ? invResult.severity : "medium",
    evidence: extractEvidenceForTest(t),
    evidenceByRun: extractEvidenceByRunForTest(t),
    primaryError: t.primaryError || null,
    suggestedChecks: invResult ? invResult.suggestedChecks : [],
    classifiedErrors: classifiedErrors,
    errors: errors,
    explanation: invResult ? invResult.explanation : "",
    requiresHumanReview: invResult ? invResult.requiresHumanReview : true,
    matchedRule: invResult ? invResult.ruleId : null,
    matchedRuleCode: invResult ? invResult.ruleCode : null,
    fingerprint: fp,
  };
}

/**
 * Shared post-processing: fingerprint corroboration counts + confidence
 * recalculation (A5/A6/A7) + the confidence-threshold flag. Mutates and
 * returns the same array so callers can chain it.
 */
function applyFingerprintAndConfidence(investigations) {
  var fpCounts = {};
  investigations.forEach(function (inv) {
    if (inv.fingerprint) {
      fpCounts[inv.fingerprint] = (fpCounts[inv.fingerprint] || 0) + 1;
    }
  });

  var confidenceThresholdPct = REVIEW_CONFIDENCE_THRESHOLD_PCT;

  investigations.forEach(function (inv) {
    var fpCount = inv.fingerprint ? (fpCounts[inv.fingerprint] || 1) - 1 : 0;
    var explain = ruleEngineModule.explainConfidence(
      inv.baseConfidence || 20,
      inv.history || [],
      fpCount,
      inv.runCount
    );
    inv.confidence = explain.finalConfidence;
    inv.confidenceExplain = explain;
    inv.fingerprintGroupCount = fpCount;
    inv.confidenceThresholdPct = confidenceThresholdPct;
    inv.belowConfidenceThreshold = inv.confidence < confidenceThresholdPct;
    if (inv.belowConfidenceThreshold) inv.requiresHumanReview = true;
  });

  return investigations;
}

function buildInvestigations(results) {
  // Investigation now covers ALL failed tests (flaky, stable_failure, regression, newly_failed)
  var failedTests = (results || []).filter(function (r) {
    return (
      r.classification === "flaky" ||
      r.classification === "stable_failure" ||
      r.classification === "regression" ||
      r.classification === "newly_failed"
    );
  });

  if (!failedTests.length) return [];

  var investigations = failedTests.map(buildInvestigationEntry);
  return applyFingerprintAndConfidence(investigations);
}

/**
 * Same investigation treatment (root cause, confidence, evidence, suggested
 * checks) applied to tests that are currently passing (stable_pass/fixed)
 * but only after 1+ retries in the latest run. These are excluded from
 * buildInvestigations() since they aren't failures, but the failed
 * attempt(s) that preceded the pass are still worth surfacing the same way.
 */
function buildPassingOnRetryInvestigations(results) {
  var candidates = (results || []).filter(function (r) {
    return (r.classification === "stable_pass" || r.classification === "fixed") && r.passedOnRetry;
  });

  if (!candidates.length) return [];

  var pseudoTests = candidates.map(function (t) {
    return Object.assign({}, t, {
      errors: t.retryFailureErrors || [],
      classifiedErrors: t.classifiedRetryFailureErrors || [],
      failureCategory: t.retryFailureCategory || "unknown",
    });
  });

  var investigations = pseudoTests.map(buildInvestigationEntry);
  applyFingerprintAndConfidence(investigations);

  investigations.forEach(function (inv, idx) {
    inv.classificationLabel = "Recovered on Retry";
    inv.classificationBadge = "badge-warn";
    inv.classificationDataClass = "passing_on_retry";
    inv.retriesToPass = candidates[idx].retriesToPass || 0;
  });

  return investigations;
}

function buildFailureCategoriesShape(fcObj, counts) {
  counts = counts || {};
  return {
    total: fcObj.total || 0,
    counts: {
      timeout: counts.timeout || 0,
      locator: counts.locator || 0,
      assertion: counts.assertion || 0,
      network: counts.network || 0,
      backend: counts.backend || 0,
      authentication: counts.authentication || 0,
      environment: counts.environment || 0,
      data: counts.data || 0,
      unknown: counts.unknown || 0,
    },
    sampleErrors: (fcObj.errors || []).slice(0, 5).map(function (e) {
      return { message: e.message || "", category: e.category || "unknown" };
    }),
  };
}

function buildBrowserStatsWithFlaky(statistics, results) {
  var baseStats = ((statistics && statistics.browserStats) || []).map(function (b) {
    return {
      browser: b.browser,
      totalTests: b.totalTests,
      totalFailures: b.totalFailures,
      totalFlaky: b.totalFlaky,
      totalRetries: b.totalRetries,
      failRate: b.failRate,
      flakyRate: b.flakyRate,
    };
  });

  if (!results || results.length === 0) return baseStats;

  var flakyByBrowser = {};
  (results || [])
    .filter(function (r) {
      return r.classification === "flaky";
    })
    .forEach(function (r) {
      var br = r.browser || "unknown";
      flakyByBrowser[br] = (flakyByBrowser[br] || 0) + 1;
    });

  return baseStats.map(function (b) {
    var flakyCount = flakyByBrowser[b.browser] || 0;
    return {
      browser: b.browser,
      totalTests: b.totalTests,
      totalFailures: b.totalFailures,
      totalFlaky: flakyCount,
      totalRetries: b.totalRetries,
      failRate: b.failRate,
      flakyRate: b.totalTests > 0 ? Math.round((flakyCount / b.totalTests) * 10000) / 100 : 0,
    };
  });
}

function splitTitleBrowser(fullTitle) {
  var idx = fullTitle.lastIndexOf(" | ");
  if (idx === -1) return { testName: fullTitle, browser: "\u2014" };
  return { testName: fullTitle.substring(0, idx), browser: fullTitle.substring(idx + 3) };
}

function buildRecommendations(summary, aggregate, failureCounts) {
  var critical = [];
  var high = [];
  var medium = [];
  var low = [];
  var passRate = aggregate.overallPassRate || 0;
  var flaky = summary.flaky || 0;
  var regressions = summary.regression || 0;
  var stableFailures = summary.stable_failure || 0;

  if (passRate < 50) {
    critical.push({
      icon: "\u{1F534}",
      message: "Critical: Pass rate is below 50%. Investigate immediately.",
    });
  } else if (passRate < 80) {
    high.push({
      icon: "\u{1F7E1}",
      message: "Warning: Pass rate is below 80%. Review recent changes.",
    });
  }

  if (regressions > 0) {
    critical.push({
      icon: "\u{1F504}",
      message: regressions + " regression(s) detected. Previously passing tests are now failing.",
    });
  }

  if (stableFailures > 0) {
    high.push({
      icon: "\u{1F41B}",
      message: stableFailures + " stable failure(s) consistently failing. Prioritize these.",
    });
  }

  if (flaky > 0) {
    medium.push({
      icon: "\u26A0\uFE0F",
      message: flaky + " flaky test(s) found. Review retry configurations and test isolation.",
    });
  }

  var timeoutCount = failureCounts.timeout || 0;
  var locatorCount = failureCounts.locator || 0;
  var totalErrors = Object.values(failureCounts).reduce(function (a, b) {
    return a + b;
  }, 0);

  if (totalErrors > 0) {
    if (timeoutCount > 0 && timeoutCount >= Math.max.apply(null, Object.values(failureCounts))) {
      high.push({
        icon: "\u23F1\uFE0F",
        message:
          "Timeout errors dominate (" +
          timeoutCount +
          "). Consider increasing timeouts or improving wait strategies.",
      });
    }
    if (locatorCount > 0 && locatorCount >= Math.max.apply(null, Object.values(failureCounts))) {
      high.push({
        icon: "\u{1F50D}",
        message:
          "Locator errors dominate (" +
          locatorCount +
          "). Review selectors and consider using data-testid attributes.",
      });
    }
    var retryRateVal = aggregate.avgRetriesAcrossRuns || 0;
    if (retryRateVal > 0.5) {
      medium.push({
        icon: "\u{1F504}",
        message:
          "High retry rate (" +
          retryRateVal.toFixed(1) +
          " per test). Investigate root causes instead of relying on retries.",
      });
    }
  }

  if (!critical.length && !high.length && !medium.length && !low.length) {
    low.push({
      icon: "\u2705",
      message: "Excellent stability. All tests are passing consistently.",
    });
  }

  return { critical: critical, high: high, medium: medium, low: low };
}

// Takes the already-built investigation entries (see investigationsForOutput
// in buildDashboardJson) rather than re-deriving confidence from scratch —
// that used to run the rule engine a second time and report only the raw,
// unadjusted base confidence, which could show a different % here than the
// same test's card in Failed Tests (which includes the history-consistency
// and fingerprint-corroboration adjustments).
function buildRootCauseSummary(investigations) {
  if (!investigations || !investigations.length) return [];

  return investigations.map(function (i) {
    return {
      testName: i.testName,
      browser: i.browser || "—",
      classification: i.classification,
      history: i.history,
      status: i.status,
      pattern: i.pattern,
      category: i.category,
      likelyCause: i.likelyCause,
      confidence: i.confidence,
      confidenceExplain: i.confidenceExplain,
      belowConfidenceThreshold: i.belowConfidenceThreshold,
      confidenceThresholdPct: i.confidenceThresholdPct,
      severity: i.severity,
      evidence: i.evidence,
    };
  });
}

function extractEvidenceForTest(test) {
  // Read the documented evidence object from the analyzer result.
  // evidence.screenshots[], evidence.trace, evidence.video come from Playwright attachments.
  // evidence.stackTrace comes from errors[].stack.
  var evidence = test.evidence ? JSON.parse(JSON.stringify(test.evidence)) : {};
  if (!evidence) evidence = {};
  if (!evidence.stackTrace) evidence.stackTrace = null;

  // Stack trace (and the new codeFrame/parsedError fields below) must come
  // from THE SAME error shown as "Primary Error" in the report, never
  // scanned across the whole list. `errors` accumulates failures from every
  // failing run in the window (see allFailedErrors in engine.js), so
  // errors[1+] can be a completely different, unrelated failure from an
  // earlier run (e.g. a network error) — showing ITS stack/code frame next
  // to a different error's message pairs two unrelated errors together.
  // test.primaryError (engine.js) is the most recent failing run's error and
  // takes priority; errors[0] remains the fallback for shapes that don't set
  // it (older cached results, or the retry-failure pseudo-tests built by
  // buildPassingOnRetryInvestigations, which are already single-run).
  var errors = test.classifiedErrors || test.errors || [];
  var firstError = test.primaryError || errors[0];
  if (firstError && typeof firstError !== "string" && firstError.stack) {
    evidence.stackTrace = firstError.stack;
  }

  // NEW — additive passthrough from the SAME firstError, preserving the
  // invariant above. Absent (not present, not "undefined") when the error
  // has no snippet/location, e.g. older results predating this field.
  if (firstError && typeof firstError !== "string") {
    if (firstError.snippet) evidence.codeFrame = firstError.snippet;
    if (firstError.location) evidence.codeFrameLocation = firstError.location;
  }

  // NEW — structured Locator/Expected/Received/Timeout/Call log fields
  // parsed from the SAME firstError's message. Fields the parser can't find
  // stay null; nothing here is fabricated.
  var primaryMessage = firstError
    ? typeof firstError === "string"
      ? firstError
      : firstError.message || ""
    : "";
  if (primaryMessage) {
    evidence.parsedError = errorParser.parseErrorMessage(primaryMessage);
  }

  // Collect error messages when no stack trace is available
  if (!evidence.stackTrace && errors.length > 0) {
    var messages = [];
    for (var j = 0; j < errors.length; j++) {
      var errObj = errors[j];
      var msg = typeof errObj === "string" ? errObj : errObj.message || "";
      if (msg && messages.indexOf(msg) === -1) messages.push(msg);
    }
    if (messages.length > 0) evidence.errorMessages = messages.slice(0, 3);
  }

  // Evidence paths come straight from Playwright's raw attachment.path, which
  // is an absolute filesystem path (e.g. "C:\...\video.webm") — not something
  // a browser can navigate to as-is. Convert to a proper file:// URL so the
  // "Open Video"/"Open Trace" links actually open something.
  if (evidence.video) evidence.video = toOpenableUrl(evidence.video);
  if (evidence.trace) evidence.trace = toOpenableUrl(evidence.trace);
  if (evidence.screenshots) evidence.screenshots = evidence.screenshots.map(toOpenableUrl);

  var hasVisual = evidence.screenshots || evidence.trace || evidence.video;
  var hasText =
    evidence.stackTrace ||
    (evidence.errorMessages && evidence.errorMessages.length > 0) ||
    evidence.codeFrame ||
    (evidence.parsedError && evidence.parsedError.header);
  if (!hasVisual && !hasText) return null;
  return evidence;
}

// Per-run evidence for the "view a previous run's artifacts" picker in the
// HTML report. Only runs that actually captured a screenshot/trace/video are
// included (skipping clean passes and runs the test didn't appear in at all),
// ordered oldest to newest — the UI defaults to the LAST entry (most recent
// run with evidence), matching extractEvidenceForTest()'s default above.
function extractEvidenceByRunForTest(test) {
  var byRun = test.evidenceByRun || [];
  var out = [];
  for (var idx = 0; idx < byRun.length; idx++) {
    var raw = byRun[idx];
    if (!raw) continue;
    var evidence = JSON.parse(JSON.stringify(raw));
    if (evidence.video) evidence.video = toOpenableUrl(evidence.video);
    if (evidence.trace) evidence.trace = toOpenableUrl(evidence.trace);
    if (evidence.screenshots) evidence.screenshots = evidence.screenshots.map(toOpenableUrl);
    if (!evidence.screenshots && !evidence.trace && !evidence.video) continue;
    out.push({ runIndex: idx, runLabel: "Run " + (idx + 1), evidence: evidence });
  }
  return out;
}

function toOpenableUrl(p) {
  if (!p) return p;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) return p; // already a URL (http(s):, file:, etc.)
  try {
    return require("url").pathToFileURL(p).href;
  } catch (e) {
    return p;
  }
}

function computeTestStatus(test) {
  var cl = test.classification;
  if (cl === "stable_failure" || cl === "regression") return "consistent_failure";
  if (cl === "flaky" || cl === "newly_failed") return "flaky";

  var hist = test.history || [];
  var hasPass = hist.some(function (h) {
    return h === "passed";
  });
  var hasFail = hist.some(function (h) {
    return h === "failed";
  });
  if (hasPass && hasFail) return "flaky";
  if (hasFail) return "consistent_failure";
  return "stable";
}

module.exports = { buildDashboardJson, generateFingerprint, djb2Hex };
