import { useEffect, useState } from "react";
import { NPM_PACKAGE_NAME } from "../config";

// Resolves the currently published npm version at runtime, in the browser,
// so the site never bakes a version number into its build output — it
// keeps working unmodified across every future release (1.0.4, 1.1.0, 2.0.0, ...).
// registry.npmjs.org serves this endpoint with permissive CORS for GET
// requests, so no server/proxy is needed for a static Vercel deployment.
export function useNpmVersion() {
  const [state, setState] = useState({ status: "loading", version: null });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(`https://registry.npmjs.org/${NPM_PACKAGE_NAME}/latest`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`npm registry responded ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.version === "string") {
          setState({ status: "ready", version: data.version });
        } else {
          setState({ status: "unavailable", version: null });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "unavailable", version: null });
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  return state;
}
