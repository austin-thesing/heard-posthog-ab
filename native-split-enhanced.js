/**
 * PostHog A/B Test Script for Webflow - Dual Content Version
 * Uses control-content/test-content divs and data attributes for hero text
 * Supports data-hide-until-ready for adjacent elements that should be hidden until content loads
 * Defaults to control variant on any failure
 */

(function () {
  "use strict";

  // Utility functions
  function log(...args) {
    const DEBUG = true; // Set to true to enable debug logging
    if (DEBUG) console.log("[PostHog A/B Test Dual Content]", ...args);
  }

  // Hide content initially to prevent flicker
  function hideContentInitially() {
    // Hide below-the-fold content divs
    const controlDiv = document.querySelector(".control-content");
    const testDiv = document.querySelector(".test-content");

    if (controlDiv) {
      controlDiv.style.setProperty("display", "none", "important");
      log("Hidden control content div");
    }
    if (testDiv) {
      testDiv.style.setProperty("display", "none", "important");
      log("Hidden test content div");
    }

    // Hide hero text elements with data attributes (set opacity to 0)
    const elementsWithTestContent = document.querySelectorAll("[data-test-content]");
    const elementsWithControlContent = document.querySelectorAll("[data-control-content]");
    const elementsWithHideUntilReady = document.querySelectorAll("[data-hide-until-ready]");

    [...elementsWithTestContent, ...elementsWithControlContent, ...elementsWithHideUntilReady].forEach((el) => {
      el.style.setProperty("opacity", "0", "important");
      el.style.transition = "opacity 0.3s ease";
    });

    log("Hidden hero text elements with data attributes and adjacent elements marked with data-hide-until-ready");
  }

  function setElementTextFromAttr(el, attr) {
    const newText = el.getAttribute(attr);
    if (newText !== null) {
      // Store original display style before making changes
      const originalDisplay = window.getComputedStyle(el).display;

      if (el.childNodes.length > 1 || (el.childNodes.length === 1 && el.childNodes[0].nodeType !== Node.TEXT_NODE)) {
        // Update only the first text node, preserve children (e.g., h1 with span)
        let foundTextNode = false;
        for (let i = 0; i < el.childNodes.length; i++) {
          if (el.childNodes[i].nodeType === Node.TEXT_NODE) {
            el.childNodes[i].textContent = newText;
            foundTextNode = true;
            break;
          }
        }
        if (!foundTextNode) {
          // If no text node exists, insert one at the start
          el.insertBefore(document.createTextNode(newText), el.firstChild);
        }
      } else {
        // Leaf node, just set textContent
        el.textContent = newText;
      }

      // Preserve the original display style to prevent layout shifts
      if (originalDisplay !== "block") {
        el.style.setProperty("display", originalDisplay, "important");
      }
    }
    // Always set opacity to 1 to override anti-flicker.css
    el.style.setProperty("opacity", "1", "important");
  }

  // Show appropriate content based on variant
  function showVariantContent(variant) {
    log("Showing content for variant:", variant);

    if (variant === "test") {
      // Show test below-the-fold content
      const testDiv = document.querySelector(".test-content");
      if (testDiv) {
        testDiv.style.setProperty("display", "block", "important");
        log("Showed test content div");
      } else {
        log("No .test-content div found");
      }

      // Show test hero content
      const testElements = document.querySelectorAll("[data-test-content]");
      log("Found", testElements.length, "elements with data-test-content");
      testElements.forEach((el) => {
        setElementTextFromAttr(el, "data-test-content");
        log("Applied test content to element:", el.tagName, el.getAttribute("data-test-content"));
      });
    } else {
      // Show control below-the-fold content (default)
      const controlDiv = document.querySelector(".control-content");
      if (controlDiv) {
        controlDiv.style.setProperty("display", "block", "important");
        log("Showed control content div");
      } else {
        log("No .control-content div found");
      }

      // Show control hero content
      const controlElements = document.querySelectorAll("[data-control-content]");
      log("Found", controlElements.length, "elements with data-control-content");
      controlElements.forEach((el) => {
        setElementTextFromAttr(el, "data-control-content");
        log("Applied control content to element:", el.tagName, el.getAttribute("data-control-content"));
      });
    }

    // Show any elements that don't have content but were hidden
    document.querySelectorAll("[data-test-content], [data-control-content]").forEach((el) => {
      if (el.style.opacity === "0" || el.style.opacity === "") {
        if (!el.getAttribute("data-test-content") && !el.getAttribute("data-control-content")) {
          el.style.setProperty("opacity", "1", "important");
        } else if (el.textContent.trim() === "") {
          el.style.setProperty("opacity", "1", "important");
        }
      }
    });

    // Show elements marked with data-hide-until-ready
    document.querySelectorAll("[data-hide-until-ready]").forEach((el) => {
      el.style.setProperty("opacity", "1", "important");
    });

    log("Content visibility update completed for variant:", variant, "- also showed adjacent elements with data-hide-until-ready");
  }

  // PostHog initialization with retry logic (REMOVED)
  // function initializePostHogWithRetry ... (REMOVED)

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
          const flagValue = posthog.getFeatureFlag("free-consult-lp2-test");
          log("Feature flag 'free-consult-lp2-test' loaded via callback:", flagValue);
          resolve(flagValue);
        }
      });

      // Also poll for feature flags
      let attempts = 0;
      const maxAttempts = Math.floor(750 / 25); // maxWaitTime from old CONFIG

      const pollForFlags = () => {
        attempts++;
        const flagValue = posthog.getFeatureFlag("free-consult-lp2-test");

        if (flagValue !== undefined && !callbackFired) {
          callbackFired = true;
          log("Feature flag 'free-consult-lp2-test' loaded via polling after", attempts * 25, "ms:", flagValue);
          resolve(flagValue);
        } else if (attempts >= maxAttempts && !callbackFired) {
          callbackFired = true;
          log("Feature flag 'free-consult-lp2-test' timeout after", attempts * 25, "ms");
          reject(new Error("Feature flag timeout"));
        } else if (!callbackFired) {
          setTimeout(pollForFlags, 25);
        }
      };

      // Start polling
      setTimeout(pollForFlags, 25);
    });
  }

  // Track experiment exposure
  function trackExperimentExposure(variant, context = {}) {
    if (window.posthog && !window._posthogExposureTracked) {
      // Prevent duplicate exposure tracking
      window._posthogExposureTracked = true;

      try {
        // Use PostHog's native experiment tracking
        posthog.capture("$feature_flag_called", {
          $feature_flag: "free-consult-lp2-test",
          $feature_flag_response: variant,
          $feature_flag_payload: {
            experiment_key: "free-consult-ab-test",
            variant: variant,
            version: "1.0",
            ...context,
          },
        });

        // Also track custom event for additional analysis
        posthog.capture("experiment_exposure", {
          experiment_key: "free-consult-ab-test",
          variant: variant,
          page_path: window.location.pathname,
          feature_flag: "free-consult-lp2-test",
          experiment_version: "1.0",
          exposure_type: context.exposure_type || "standard",
          ...context,
        });

        log("Tracked experiment exposure:", variant, context);
      } catch (error) {
        log("Error tracking exposure:", error);
        // Reset flag on error
        window._posthogExposureTracked = false;
      }
    }
  }

  // Setup form conversion tracking
  function setupFormTracking() {
    // Store variant to avoid repeated PostHog calls during tracking
    let cachedVariant = null;
    let cachedFlagValue = null;

    // Get variant once and cache it
    function getCachedVariant() {
      if (cachedVariant === null && window.posthog) {
        cachedFlagValue = posthog.getFeatureFlag("free-consult-lp2-test");
        cachedVariant = cachedFlagValue === "test" ? "test" : "control";
      }
      return { variant: cachedVariant, flagValue: cachedFlagValue };
    }

    // Track form submissions as conversions
    function trackConversion(formData = {}) {
      if (window.posthog) {
        const { variant, flagValue } = getCachedVariant();

        // Prevent recursive calls by checking if we're already tracking
        if (window._posthogTrackingInProgress) {
          return;
        }
        window._posthogTrackingInProgress = true;

        try {
          // Track as PostHog goal
          posthog.capture("goal_completed", {
            goal_key: "form_submission",
            experiment_key: "free-consult-ab-test",
            variant: variant,
            feature_flag: "free-consult-lp2-test",
            feature_flag_value: flagValue,
            experiment_version: "1.0",
            page_path: window.location.pathname,
            ...formData,
          });

          // Also track standard conversion event
          posthog.capture("conversion", {
            experiment_key: "free-consult-ab-test",
            variant: variant,
            conversion_type: "form_submission",
            page_path: window.location.pathname,
            feature_flag: "free-consult-lp2-test",
            feature_flag_value: flagValue,
            experiment_version: "1.0",
            ...formData,
          });

          log("Tracked conversion for variant:", variant);
        } finally {
          // Clear the flag after a short delay
          setTimeout(() => {
            window._posthogTrackingInProgress = false;
          }, 100);
        }
      }
    }

    // Listen for form submissions
    document.addEventListener("submit", function (e) {
      const form = e.target;
      if (form && form.tagName === "FORM") {
        trackConversion({
          form_id: form.id || "unknown",
          form_class: form.className || "unknown",
        });
      }
    });

    // HubSpot form tracking if available
    if (window.hbspt) {
      window.hbspt.forms.create = (function (originalCreate) {
        return function (options) {
          // Wrap onFormSubmit
          if (options.onFormSubmit) {
            const originalOnSubmit = options.onFormSubmit;
            options.onFormSubmit = function ($form) {
              trackConversion({ form_id: options.formId || "unknown", form_type: "hubspot" });
              return originalOnSubmit.apply(this, arguments);
            };
          } else {
            options.onFormSubmit = function ($form) {
              trackConversion({ form_id: options.formId || "unknown", form_type: "hubspot" });
            };
          }

          return originalCreate.call(this, options);
        };
      })(window.hbspt.forms.create);
    }

    // MutationObserver for dynamically loaded forms
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) {
            const forms = node.querySelectorAll ? node.querySelectorAll("form, .hs-form") : [];
            forms.forEach(function (form) {
              form.addEventListener("submit", function () {
                trackConversion({ form_loaded: "dynamic" });
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

  // Main experiment execution
  async function runExperiment() {
    // Hide content initially to prevent flicker
    hideContentInitially();

    // Emergency fallback to control after max wait time
    const emergencyTimeout = setTimeout(() => {
      log("Emergency: Showing control content after", 750, "ms timeout");
      showVariantContent("control");
      setupFormTracking();
    }, 750); // maxWaitTime from old CONFIG

    try {
      log("Starting PostHog A/B test");

      // Check if PostHog is available
      if (!window.posthog) {
        throw new Error("PostHog is not available on window.posthog");
      }
      log("PostHog is available, proceeding with feature flag check");

      // Get feature flag value
      const flagValue = await getFeatureFlagValue();
      log("Feature flag 'free-consult-lp2-test' value:", flagValue);

      // Clear emergency timeout since we got the flag value
      clearTimeout(emergencyTimeout);

      // Determine variant based on feature flag
      // Handle string values "test" and "control"
      const variant = flagValue === "test" ? "test" : "control";
      log("Determined variant:", variant, "(from flag value:", flagValue + ")");

      // Track experiment exposure
      trackExperimentExposure(variant, {
        exposure_type: "page_view",
        page_path: window.location.pathname,
      });

      // Show appropriate content
      showVariantContent(variant);

      // Setup conversion tracking
      setupFormTracking();
    } catch (error) {
      log("Error running experiment:", error);

      // Clear emergency timeout
      clearTimeout(emergencyTimeout);

      // Track error
      if (window.posthog) {
        posthog.capture("experiment_error", {
          experiment_key: "free-consult-ab-test",
          error: error.message,
          page_path: window.location.pathname,
          error_type: "initialization_error",
        });
      }

      // Fallback to control
      // fallbackToControl always true
      log("Falling back to control variant");
      showVariantContent("control");
      setupFormTracking();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runExperiment);
  } else {
    runExperiment();
  }
})();
