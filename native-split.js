/**
 * PostHog A/B Test Script for Webflow - Native Feature Flags Version
 * Tests: /free-consult (control) vs /free-consult/lp2 (test)
 * Uses PostHog's native feature flags for bucketing
 * Conversion: HubSpot form submission
 */

(function () {
  "use strict";

  // Configuration
  const CONFIG = {
    experimentKey: "free-consult-ab-test",
    featureFlagKey: "free-consult-lp2-test", // Feature flag name in PostHog
    controlPath: "/free-consult",
    testPath: "/free-consult/lp2",
    posthogProjectKey: "YOUR_POSTHOG_PROJECT_KEY", // Replace with your PostHog project key
    posthogHost: "https://app.posthog.com", // Replace if using self-hosted PostHog
    fallbackToControl: true, // Show control if feature flag fails
    maxWaitTime: 3000, // Max time to wait for PostHog (3 seconds)
    debug: false,
  };

  // Utility functions
  function log(...args) {
    if (CONFIG.debug) {
      console.log("[PostHog Native A/B Test]", ...args);
    }
  }

  function getCurrentPath() {
    return window.location.pathname;
  }

  function isControlPage() {
    return getCurrentPath() === CONFIG.controlPath;
  }

  function initializePostHog() {
    return new Promise((resolve, reject) => {
      // Check if PostHog is already loaded and ready
      if (window.posthog && window.posthog._loaded) {
        log("PostHog already loaded");
        resolve(window.posthog);
        return;
      }

      // Load PostHog if not already loaded
      !(function (t, e) {
        var o, n, p, r;
        e.__SV ||
          ((window.posthog = e),
          (e._i = []),
          (e.init = function (i, s, a) {
            function g(t, e) {
              var o = e.split(".");
              2 == o.length && ((t = t[o[0]]), (e = o[1]));
              t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
              };
            }
            ((p = t.createElement("script")).type = "text/javascript"), (p.async = !0), (p.src = s.api_host + "/static/array.js"), (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r);
            var u = e;
            for (
              void 0 !== a ? (u = e[a] = []) : (a = "posthog"),
                u.people = u.people || [],
                u.toString = function (t) {
                  var e = "posthog";
                  return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e;
                },
                u.people.toString = function () {
                  return u.toString(1) + ".people (stub)";
                },
                o =
                  "capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(
                    " "
                  ),
                n = 0;
              n < o.length;
              n++
            )
              g(u, o[n]);
            e._i.push([i, s, a]);
          }),
          (e.__SV = 1));
      })(document, window.posthog || []);

      posthog.init(CONFIG.posthogProjectKey, {
        api_host: CONFIG.posthogHost,
        person_profiles: "identified_only",
        loaded: function (posthog) {
          log("PostHog loaded via callback");
          resolve(posthog);
        },
      });

      // Poll for PostHog to be ready (much faster than timeout)
      let attempts = 0;
      const maxAttempts = Math.floor(CONFIG.maxWaitTime / 50); // Check every 50ms

      const pollForPostHog = () => {
        attempts++;

        if (window.posthog && window.posthog._loaded) {
          log("PostHog loaded via polling after", attempts * 50, "ms");
          resolve(window.posthog);
        } else if (attempts >= maxAttempts) {
          reject(new Error("PostHog failed to load within timeout"));
        } else {
          setTimeout(pollForPostHog, 50);
        }
      };

      // Start polling immediately
      setTimeout(pollForPostHog, 50);
    });
  }

  function getFeatureFlagValue() {
    return new Promise((resolve, reject) => {
      if (!window.posthog) {
        reject(new Error("PostHog not initialized"));
        return;
      }

      // Check if feature flags are already loaded
      const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);
      if (flagValue !== undefined) {
        log("Feature flag already loaded:", flagValue);
        resolve(flagValue);
        return;
      }

      // Poll for feature flags to load (faster than 100ms intervals)
      let attempts = 0;
      const maxAttempts = Math.floor(CONFIG.maxWaitTime / 25); // Check every 25ms for faster response

      const pollForFlags = () => {
        attempts++;
        const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);

        if (flagValue !== undefined) {
          log("Feature flag loaded after", attempts * 25, "ms:", flagValue);
          resolve(flagValue);
        } else if (attempts >= maxAttempts) {
          log("Feature flag timeout after", attempts * 25, "ms");
          reject(new Error("Feature flag timeout"));
        } else {
          setTimeout(pollForFlags, 25);
        }
      };

      // Also listen for feature flags loaded event (backup method)
      posthog.onFeatureFlags(() => {
        const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);
        if (flagValue !== undefined) {
          log("Feature flag loaded via callback:", flagValue);
          resolve(flagValue);
        }
      });

      // Start polling immediately
      setTimeout(pollForFlags, 25);
    });
  }

  function trackExperimentExposure(variant) {
    if (window.posthog) {
      posthog.capture("$experiment_started", {
        $feature_flag: CONFIG.featureFlagKey,
        $feature_flag_response: variant,
        experiment_key: CONFIG.experimentKey,
        page_path: getCurrentPath(),
      });

      // Also track custom event for easier analysis
      posthog.capture("experiment_exposure", {
        experiment_key: CONFIG.experimentKey,
        variant: variant,
        page_path: getCurrentPath(),
        feature_flag: CONFIG.featureFlagKey,
      });

      log("Tracked experiment exposure:", variant);
    }
  }

  function redirectToTestPage() {
    log("Redirecting to test page:", CONFIG.testPath);
    window.location.href = CONFIG.testPath;
  }

  function showContent() {
    document.body.setAttribute("data-ab-test", "resolved");
    log("Content revealed");
  }

  function setupHubSpotFormTracking() {
    // Track HubSpot form submissions as conversions
    function trackConversion() {
      if (window.posthog) {
        const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);
        const variant = flagValue === true ? "test" : "control";

        posthog.capture("conversion", {
          experiment_key: CONFIG.experimentKey,
          variant: variant,
          conversion_type: "hubspot_form_submission",
          page_path: getCurrentPath(),
          feature_flag: CONFIG.featureFlagKey,
          feature_flag_value: flagValue,
        });

        log("Tracked conversion for variant:", variant);
      }
    }

    // Method 1: Listen for HubSpot form events (if available)
    if (window.hbspt) {
      window.hbspt.forms.create = (function (originalCreate) {
        return function (options) {
          if (options.onFormSubmit) {
            const originalOnSubmit = options.onFormSubmit;
            options.onFormSubmit = function () {
              trackConversion();
              return originalOnSubmit.apply(this, arguments);
            };
          } else {
            options.onFormSubmit = trackConversion;
          }
          return originalCreate.call(this, options);
        };
      })(window.hbspt.forms.create);
    }

    // Method 2: Listen for form submissions on HubSpot forms
    document.addEventListener("submit", function (e) {
      const form = e.target;
      if (form && (form.classList.contains("hs-form") || form.querySelector(".hs-form"))) {
        trackConversion();
      }
    });

    // Method 3: MutationObserver for dynamically loaded forms
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) {
            // Element node
            const forms = node.querySelectorAll ? node.querySelectorAll(".hs-form") : [];
            forms.forEach(function (form) {
              form.addEventListener("submit", trackConversion);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Main execution
  async function runExperiment() {
    try {
      log("Starting PostHog native A/B test experiment");

      // Only run on control page
      if (!isControlPage()) {
        log("Not on control page, showing content");
        showContent();
        return;
      }

      // Initialize PostHog
      await initializePostHog();
      log("PostHog initialized successfully");

      // Get feature flag value
      const flagValue = await getFeatureFlagValue();
      log("Feature flag value:", flagValue);

      // Determine variant based on feature flag
      // true = test variant, false/null = control variant
      const isTestVariant = flagValue === true;
      const variant = isTestVariant ? "test" : "control";

      log("Assigned variant:", variant);

      // Track experiment exposure
      trackExperimentExposure(variant);

      // Handle variant
      if (isTestVariant) {
        // Redirect to test page
        redirectToTestPage();
      } else {
        // Show control content
        showContent();
      }

      // Setup conversion tracking
      setupHubSpotFormTracking();
    } catch (error) {
      log("Error running experiment:", error);

      // Fallback behavior
      if (CONFIG.fallbackToControl) {
        log("Falling back to control variant");
        showContent();

        // Track fallback
        if (window.posthog) {
          posthog.capture("experiment_fallback", {
            experiment_key: CONFIG.experimentKey,
            error: error.message,
            page_path: getCurrentPath(),
          });
        }
      } else {
        // Still show content to prevent blank page
        showContent();
      }
    }
  }

  // Run experiment when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runExperiment);
  } else {
    runExperiment();
  }
})();
