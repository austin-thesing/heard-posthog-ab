/**
 * PostHog A/B Test Script for Webflow - Dual Content Version
 * Uses control-content/test-content divs and data attributes for hero text
 * Supports data-hide-until-ready="true" for adjacent elements that should be hidden until content loads
 * Defaults to control variant on any failure
 */

(function () {
  "use strict";



  // Hide content initially to prevent flicker
  function hideContentInitially() {
    // Hide below-the-fold content divs
    const controlDiv = document.querySelector(".control-content");
    const testDiv = document.querySelector(".test-content");

    if (controlDiv) {
      controlDiv.style.setProperty("display", "none", "important");
    }
    if (testDiv) {
      testDiv.style.setProperty("display", "none", "important");
    }

    // Hide hero text elements with data attributes (set opacity to 0)
    const elementsWithTestContent = document.querySelectorAll("[data-test-content]");
    const elementsWithControlContent = document.querySelectorAll("[data-control-content]");
    const elementsWithHideUntilReady = document.querySelectorAll('[data-hide-until-ready="true"]');

    [...elementsWithTestContent, ...elementsWithControlContent, ...elementsWithHideUntilReady].forEach((el) => {
      el.style.setProperty("opacity", "0", "important");
      el.style.transition = "opacity 0.3s ease";
    });
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

    if (variant === "test") {
      // Show test below-the-fold content
      const testDiv = document.querySelector(".test-content");
      if (testDiv) {
        testDiv.style.setProperty("display", "block", "important");
      }

      // Show test hero content
      const testElements = document.querySelectorAll("[data-test-content]");
      testElements.forEach((el) => {
        setElementTextFromAttr(el, "data-test-content");
      });
    } else {
      // Show control below-the-fold content (default)
      const controlDiv = document.querySelector(".control-content");
      if (controlDiv) {
        controlDiv.style.setProperty("display", "block", "important");
      }

      // Show control hero content
      const controlElements = document.querySelectorAll("[data-control-content]");
      controlElements.forEach((el) => {
        setElementTextFromAttr(el, "data-control-content");
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

    // Show elements marked with data-hide-until-ready="true"
    document.querySelectorAll('[data-hide-until-ready="true"]').forEach((el) => {
      el.style.setProperty("opacity", "1", "important");
    });
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
          resolve(flagValue);
        } else if (attempts >= maxAttempts && !callbackFired) {
          callbackFired = true;
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

      } catch (error) {
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

        } catch (error) {
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
      showVariantContent("control");
      setupFormTracking();
    }, 750); // maxWaitTime from old CONFIG

    try {
      // Check if PostHog is available
      if (!window.posthog) {
        throw new Error("PostHog is not available on window.posthog");
      }

      // Get feature flag value
      const flagValue = await getFeatureFlagValue();

      // Clear emergency timeout since we got the flag value
      clearTimeout(emergencyTimeout);

      // Determine variant based on feature flag
      // Handle string values "test" and "control"
      const variant = flagValue === "test" ? "test" : "control";

      // Track experiment exposure
      trackExperimentExposure(variant, {
        exposure_type: "page_view",
        page_path: window.location.pathname,
      });

      // Show appropriate content
      showVariantContent(variant);

      // Test PostHog connection immediately
      if (window.posthog) {
        try {
          posthog.capture("test_event_ab_test", {
            test: true,
            variant: variant,
            timestamp: new Date().toISOString(),
            page_url: window.location.href,
          });
        } catch (error) {
          // Silent error handling
        }
      }

      // Setup conversion tracking
      setupFormTracking();
    } catch (error) {

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
  // --- HubSpot form submission tracking with redirect detection ---

  // Track form submissions and redirects
  let formSubmissionDetected = false;
  let redirectDetected = false;

  window.addEventListener("message", function (event) {
    // Filter out React dev tools and other noise
    const isReactDevTools = event.origin.includes("react-devtools") || (event.data && typeof event.data === "object" && event.data.source === "react-devtools");
    const isExtension = event.origin.includes("extension://") || event.origin.includes("chrome-extension://");
    const isInspector = event.data && typeof event.data === "object" && (event.data.type === "inspector" || JSON.stringify(event.data).includes("inspector"));

    // Skip logging noise
    if (isReactDevTools || isExtension || isInspector) {
      return;
    }



    // Check if it's HubSpot-related
    const isHubSpotRelated =
      event.origin.includes("hsforms.net") || (event.data && typeof event.data === "object" && (event.data.type === "hsFormCallback" || JSON.stringify(event.data).includes("hubspot") || JSON.stringify(event.data).includes("hsform")));



    // Handle HubSpot form callbacks
    let isHubSpotFormEvent = false;
    let eventName = null;

    // Standard hsFormCallback format
    if (event.data && typeof event.data === "object" && event.data.type === "hsFormCallback") {
      isHubSpotFormEvent = true;
      eventName = event.data.eventName;
    }

    // Direct event name format
    if (event.data && typeof event.data === "object" && event.data.eventName) {
      isHubSpotFormEvent = true;
      eventName = event.data.eventName;
    }

    if (isHubSpotFormEvent) {
      // Track form submission events
      if (eventName === "onFormSubmit" || eventName === "onFormSubmitted" || eventName === "onFormReady") {
        formSubmissionDetected = true;

        if (window.posthog) {
          const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");

          try {
            // Create custom event for form submission
            posthog.capture("free_consult_form_conversion", {
              experiment_key: "free-consult-ab-test",
              variant: variant,
              conversion_type: "form_submission",
              page_path: window.location.pathname,
              feature_flag: "free-consult-lp2-test",
              feature_flag_value: variant,
              experiment_version: "1.0",
              form_id: event.data.id || event.data.formId || "002af025-1d67-4e7f-b2bf-2d221f555805",
              form_type: "hubspot_iframe_no_redirect",
              event_name: eventName,
              hubspot_portal_id: "7507639",
              redirect_disabled: true,
              timestamp: new Date().toISOString(),
              user_agent: navigator.userAgent,
              page_url: window.location.href,
            });

          } catch (error) {
            // Silent error handling
          }
        }
      }
    }
  });



  // Simple iframe monitoring for HubSpot forms
  function setupBasicIframeMonitoring() {
    const iframes = document.querySelectorAll('iframe[src*="hsforms.net"]');

    iframes.forEach((iframe, index) => {
      // Check if redirects are disabled - no action needed, just checking
      if (iframe.src.includes("_hsDisableRedirect=true")) {
        // Redirects disabled - will track via iframe messages
      }
    });
  }

  // Set up basic monitoring
  setTimeout(setupBasicIframeMonitoring, 1000);

  // Add URL monitoring to detect redirects
  function setupRedirectDetection() {

    let currentUrl = window.location.href;
    let urlCheckCount = 0;

    // Check for URL changes every 100ms
    const urlCheckInterval = setInterval(() => {
      urlCheckCount++;

      if (window.location.href !== currentUrl) {
        const isHubSpotMeeting = window.location.href.includes("meetings.hubspot.com");

        if (isHubSpotMeeting) {
          redirectDetected = true;

          // Track the conversion
          if (window.posthog) {
            const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");

            try {
              posthog.capture("free_consult_form_conversion", {
                experiment_key: "free-consult-ab-test",
                variant: variant,
                conversion_type: "form_submission",
                page_path: "/free-consult",
                redirect_url: window.location.href,
                feature_flag: "free-consult-lp2-test",
                feature_flag_value: variant,
                experiment_version: "1.0",
                form_type: "hubspot_meeting_redirect",
                detection_method: "url_change_monitoring",
                timestamp: new Date().toISOString(),
                is_hubspot_meeting: true,
              });

            } catch (error) {
              // Silent error handling
            }
          }
        }

        // Stop monitoring after redirect
        clearInterval(urlCheckInterval);
        return;
      }

      // Stop after 5 minutes to prevent infinite monitoring
      if (urlCheckCount > 3000) {
        clearInterval(urlCheckInterval);
      }
    }, 100);


  }

  // Add form interaction tracking
  function trackFormInteractions() {

    // Track clicks anywhere on the page
    document.addEventListener("click", function (e) {
      // Track clicks in form areas
      const formContainer = document.querySelector("#hubspot-form-container, .custom_step_form, .right_step_form");
      if (formContainer && formContainer.contains(e.target)) {
        // Check for button clicks
        if (e.target.tagName === "BUTTON" || e.target.type === "submit") {
          formSubmissionDetected = true;
        }
      }
    });
  }

  // Set up both tracking methods
  setTimeout(setupRedirectDetection, 1000);
  setTimeout(trackFormInteractions, 2000);

  // Enhanced beforeunload tracking with redirect detection
  window.addEventListener("beforeunload", function (e) {
    // Check if we're likely redirecting to HubSpot meetings
    const isLikelyFormSubmission = window.location.href.includes("/free-consult");

    if (isLikelyFormSubmission && window.posthog) {

      const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");

      try {
        // Track the conversion immediately
        posthog.capture("free_consult_form_conversion", {
          experiment_key: "free-consult-ab-test",
          variant: variant,
          conversion_type: "form_submission",
          page_path: window.location.pathname,
          feature_flag: "free-consult-lp2-test",
          feature_flag_value: variant,
          experiment_version: "1.0",
          form_type: "hubspot_redirect",
          detection_method: "beforeunload_redirect",
          timestamp: new Date().toISOString(),
          redirect_expected: true,
        });

      } catch (error) {
        // Silent error handling
      }

      // Also use sendBeacon for reliability
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          event: "free_consult_form_conversion_beacon",
          properties: {
            experiment_key: "free-consult-ab-test",
            variant: variant,
            conversion_type: "form_submission",
            page_path: window.location.pathname,
            feature_flag: "free-consult-lp2-test",
            feature_flag_value: variant,
            detection_method: "sendBeacon",
            timestamp: new Date().toISOString(),
          },
        });

        // Send to a generic endpoint (this will likely fail but shows the attempt)
        navigator.sendBeacon("/api/analytics", data);
      }
    }
  });


})();
