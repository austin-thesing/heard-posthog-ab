/**
 * PostHog A/B Test Script for Webflow - Enhanced Native Feature Flags Version
 * Tests: /free-consult (control) vs /free-consult/lp2 (test)
 * Uses PostHog's native experiment tracking and prevents false positives
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
    posthogProjectKey: "phc_iPG1CFswhWTN16Q1f3uwTaNehTzqCP3ilgVEuggQwRN", // Replace with your PostHog project key
    posthogHost: "https://us.i.posthog.com", // Replace if using self-hosted PostHog
    fallbackToControl: true, // Show control if feature flag fails
    maxWaitTime: 3000, // Max time to wait for PostHog (3 seconds)
    retryAttempts: 3, // Number of retry attempts for PostHog initialization
    retryDelay: 500, // Delay between retries in ms
    experimentVersion: "1.0", // Experiment version for tracking
    debug: false,
  };

  // Utility functions
  function log(...args) {
    if (CONFIG.debug) {
      console.log("[PostHog A/B Test Enhanced]", ...args);
    }
  }

  function getCurrentPath() {
    return window.location.pathname;
  }

  function isControlPage() {
    return getCurrentPath() === CONFIG.controlPath;
  }

  function isTestPage() {
    return getCurrentPath() === CONFIG.testPath;
  }

  // Session management - only for redirect state, not variant assignment
  const SessionManager = {
    STORAGE_KEY: "posthog_ab_redirect",

    setRedirectPending() {
      try {
        sessionStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify({
            redirecting: true,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        log("Error saving redirect state:", e);
      }
    },

    isRedirectPending() {
      try {
        const data = sessionStorage.getItem(this.STORAGE_KEY);
        if (!data) return false;

        const parsed = JSON.parse(data);
        // Consider redirect pending if within last 5 seconds
        return parsed.redirecting && Date.now() - parsed.timestamp < 5000;
      } catch (e) {
        log("Error reading redirect state:", e);
        return false;
      }
    },

    clearRedirectState() {
      try {
        sessionStorage.removeItem(this.STORAGE_KEY);
      } catch (e) {
        log("Error clearing redirect state:", e);
      }
    },
  };

  // PostHog initialization with retry logic
  function initializePostHogWithRetry(attempt = 1) {
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
                  "capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys setPersonPropertiesForFlags".split(
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

      // Enhanced polling with exponential backoff
      let pollAttempts = 0;
      const maxPollAttempts = Math.floor(CONFIG.maxWaitTime / 50);

      const pollForPostHog = () => {
        pollAttempts++;

        if (window.posthog && window.posthog._loaded) {
          log("PostHog loaded via polling after", pollAttempts * 50, "ms");
          resolve(window.posthog);
        } else if (pollAttempts >= maxPollAttempts) {
          if (attempt < CONFIG.retryAttempts) {
            log(`PostHog initialization attempt ${attempt} failed, retrying...`);
            setTimeout(() => {
              initializePostHogWithRetry(attempt + 1)
                .then(resolve)
                .catch(reject);
            }, CONFIG.retryDelay);
          } else {
            reject(new Error("PostHog failed to load after all retry attempts"));
          }
        } else {
          setTimeout(pollForPostHog, 50);
        }
      };

      // Start polling
      setTimeout(pollForPostHog, 50);
    });
  }

  // Get feature flag value from PostHog
  function getFeatureFlagValue() {
    return new Promise((resolve, reject) => {
      if (!window.posthog) {
        reject(new Error("PostHog not initialized"));
        return;
      }

      // Register callback for feature flags
      let callbackFired = false;
      posthog.onFeatureFlags(() => {
        if (!callbackFired) {
          callbackFired = true;
          const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);
          log("Feature flag loaded via callback:", flagValue);
          resolve(flagValue);
        }
      });

      // Also poll for feature flags
      let attempts = 0;
      const maxAttempts = Math.floor(CONFIG.maxWaitTime / 25);

      const pollForFlags = () => {
        attempts++;
        const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);

        if (flagValue !== undefined && !callbackFired) {
          callbackFired = true;
          log("Feature flag loaded via polling after", attempts * 25, "ms:", flagValue);
          resolve(flagValue);
        } else if (attempts >= maxAttempts && !callbackFired) {
          callbackFired = true;
          log("Feature flag timeout after", attempts * 25, "ms");
          reject(new Error("Feature flag timeout"));
        } else if (!callbackFired) {
          setTimeout(pollForFlags, 25);
        }
      };

      // Start polling
      setTimeout(pollForFlags, 25);
    });
  }

  // Enhanced experiment exposure tracking
  function trackExperimentExposure(variant, context = {}) {
    if (window.posthog) {
      // Use PostHog's native experiment tracking
      posthog.capture("$feature_flag_called", {
        $feature_flag: CONFIG.featureFlagKey,
        $feature_flag_response: variant === "test",
        $feature_flag_payload: {
          experiment_key: CONFIG.experimentKey,
          variant: variant,
          version: CONFIG.experimentVersion,
          ...context,
        },
      });

      // Also track custom event for additional analysis
      posthog.capture("experiment_exposure", {
        experiment_key: CONFIG.experimentKey,
        variant: variant,
        page_path: getCurrentPath(),
        feature_flag: CONFIG.featureFlagKey,
        experiment_version: CONFIG.experimentVersion,
        exposure_type: context.exposure_type || "standard",
        ...context,
      });

      log("Tracked experiment exposure:", variant, context);
    }
  }

  // Redirect with validation
  function redirectToTestPage() {
    // Mark that we're about to redirect to prevent false positive tracking
    SessionManager.setRedirectPending();

    log("Redirecting to test page:", CONFIG.testPath);
    window.location.replace(CONFIG.testPath); // Use replace to prevent back button issues
  }

  function redirectToControlPage() {
    // Clear any redirect state
    SessionManager.clearRedirectState();

    log("Redirecting to control page:", CONFIG.controlPath);
    window.location.replace(CONFIG.controlPath);
  }

  function showContent() {
    document.body.setAttribute("data-ab-test", "resolved");
    log("Content revealed");
  }

  // Enhanced HubSpot form tracking with goals
  function setupHubSpotFormTracking() {
    // Track HubSpot form submissions as conversions
    function trackConversion(formData = {}) {
      if (window.posthog) {
        const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);
        const variant = flagValue === true ? "test" : "control";

        // Track as PostHog goal
        posthog.capture("goal_completed", {
          goal_key: "hubspot_form_submission",
          experiment_key: CONFIG.experimentKey,
          variant: variant,
          feature_flag: CONFIG.featureFlagKey,
          feature_flag_value: flagValue,
          experiment_version: CONFIG.experimentVersion,
          page_path: getCurrentPath(),
          ...formData,
        });

        // Also track standard conversion event
        posthog.capture("conversion", {
          experiment_key: CONFIG.experimentKey,
          variant: variant,
          conversion_type: "hubspot_form_submission",
          page_path: getCurrentPath(),
          feature_flag: CONFIG.featureFlagKey,
          feature_flag_value: flagValue,
          experiment_version: CONFIG.experimentVersion,
          ...formData,
        });

        log("Tracked conversion for variant:", variant);
      }
    }

    // Track form field interactions as micro-conversions
    function trackFormInteraction(fieldName, action) {
      if (window.posthog) {
        const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);
        const variant = flagValue === true ? "test" : "control";

        posthog.capture("form_interaction", {
          experiment_key: CONFIG.experimentKey,
          variant: variant,
          field_name: fieldName,
          action: action,
          page_path: getCurrentPath(),
        });
      }
    }

    // Method 1: Listen for HubSpot form events
    if (window.hbspt) {
      window.hbspt.forms.create = (function (originalCreate) {
        return function (options) {
          // Wrap onFormSubmit
          if (options.onFormSubmit) {
            const originalOnSubmit = options.onFormSubmit;
            options.onFormSubmit = function ($form) {
              trackConversion({ form_id: options.formId || "unknown" });
              return originalOnSubmit.apply(this, arguments);
            };
          } else {
            options.onFormSubmit = function ($form) {
              trackConversion({ form_id: options.formId || "unknown" });
            };
          }

          // Wrap onFormReady to track interactions
          if (options.onFormReady) {
            const originalOnReady = options.onFormReady;
            options.onFormReady = function ($form) {
              // Add interaction tracking
              $form.find("input, select, textarea").on("focus", function () {
                trackFormInteraction(this.name || this.id, "focus");
              });
              return originalOnReady.apply(this, arguments);
            };
          } else {
            options.onFormReady = function ($form) {
              $form.find("input, select, textarea").on("focus", function () {
                trackFormInteraction(this.name || this.id, "focus");
              });
            };
          }

          return originalCreate.call(this, options);
        };
      })(window.hbspt.forms.create);
    }

    // Method 2: Listen for form submissions
    document.addEventListener("submit", function (e) {
      const form = e.target;
      if (form && (form.classList.contains("hs-form") || form.querySelector(".hs-form"))) {
        trackConversion({ form_class: "hs-form" });
      }
    });

    // Method 3: MutationObserver for dynamically loaded forms
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) {
            const forms = node.querySelectorAll ? node.querySelectorAll(".hs-form") : [];
            forms.forEach(function (form) {
              form.addEventListener("submit", function () {
                trackConversion({ form_loaded: "dynamic" });
              });

              // Track field interactions
              form.querySelectorAll("input, select, textarea").forEach(function (field) {
                field.addEventListener("focus", function () {
                  trackFormInteraction(this.name || this.id, "focus");
                });
              });
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

  // Main execution for control page
  async function runExperimentOnControl() {
    try {
      log("Starting PostHog A/B test on control page");

      // Check if we're in the middle of a redirect
      if (SessionManager.isRedirectPending()) {
        log("Redirect in progress, showing content");
        showContent();
        return;
      }

      // Initialize PostHog with retry
      await initializePostHogWithRetry();
      log("PostHog initialized successfully");

      // Get feature flag value
      const flagValue = await getFeatureFlagValue();
      log("Feature flag value:", flagValue);

      // Determine variant based on feature flag
      const isTestVariant = flagValue === true;
      const variant = isTestVariant ? "test" : "control";

      log("Assigned variant:", variant);

      // Handle variant
      if (isTestVariant) {
        // Track exposure before redirect to ensure it's counted
        trackExperimentExposure(variant, {
          exposure_type: "redirect_pending",
          source_page: "control",
        });

        // Small delay to ensure tracking completes
        setTimeout(() => {
          redirectToTestPage();
        }, 100);
      } else {
        // Track control exposure and show content
        trackExperimentExposure(variant, {
          exposure_type: "control_view",
          source_page: "control",
        });
        showContent();
      }

      // Setup conversion tracking
      setupHubSpotFormTracking();
    } catch (error) {
      log("Error running experiment:", error);

      // Track error
      if (window.posthog) {
        posthog.capture("experiment_error", {
          experiment_key: CONFIG.experimentKey,
          error: error.message,
          page_path: getCurrentPath(),
          error_type: "control_page_error",
        });
      }

      // Fallback behavior
      if (CONFIG.fallbackToControl) {
        log("Falling back to control variant");
        showContent();
      }
    }
  }

  // Main execution for test page
  async function runExperimentOnTest() {
    try {
      log("Starting PostHog A/B test on test page");

      // Initialize PostHog
      await initializePostHogWithRetry();
      log("PostHog initialized successfully");

      // Check if user should be on test page
      const flagValue = await getFeatureFlagValue();
      const isTestVariant = flagValue === true;

      if (isTestVariant) {
        // User correctly assigned to test
        trackExperimentExposure("test", {
          exposure_type: "test_view",
          source_page: "test",
          navigation_type: "direct",
        });
        showContent();
      } else {
        // User should be on control page
        log("User not assigned to test variant, redirecting to control");
        trackExperimentExposure("control", {
          exposure_type: "incorrect_page_access",
          source_page: "test",
        });

        // Redirect after tracking
        setTimeout(() => {
          redirectToControlPage();
        }, 100);
      }

      // Setup conversion tracking
      setupHubSpotFormTracking();
    } catch (error) {
      log("Error on test page:", error);

      // Track error
      if (window.posthog) {
        posthog.capture("experiment_error", {
          experiment_key: CONFIG.experimentKey,
          error: error.message,
          page_path: getCurrentPath(),
          error_type: "test_page_error",
        });
      }

      // Show content to prevent blank page
      showContent();
    }
  }

  // Main execution
  async function runExperiment() {
    if (isControlPage()) {
      await runExperimentOnControl();
    } else if (isTestPage()) {
      await runExperimentOnTest();
    } else {
      // Not on experiment pages, just show content
      log("Not on experiment page, showing content");
      showContent();
    }
  }

  // Run experiment when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runExperiment);
  } else {
    runExperiment();
  }
})();
