/**
 * PostHog A/B Test Script for Webflow - Dual Content Version
 * Uses control-content/test-content divs and data attributes for hero text
 * Supports data-hide-until-ready="true" for adjacent elements that should be hidden until content loads
 * Defaults to control variant on any failure
 */

(function () {
  "use strict";

  // Debug window for persistent logging
  let debugWindow = null;
  let debugLogs = [];
  
  function openDebugWindow() {
    if (!debugWindow || debugWindow.closed) {
      debugWindow = window.open('', 'debug', 'width=600,height=400,scrollbars=yes');
      debugWindow.document.write(`
        <html>
          <head><title>A/B Test Debug Log</title></head>
          <body style="font-family: monospace; padding: 10px; background: #000; color: #0f0;">
            <h3>A/B Test Debug Log</h3>
            <div id="logs"></div>
          </body>
        </html>
      `);
    }
    return debugWindow;
  }
  
  function updateDebugWindow() {
    if (debugWindow && !debugWindow.closed) {
      const logsDiv = debugWindow.document.getElementById('logs');
      if (logsDiv) {
        logsDiv.innerHTML = debugLogs.map(log => `<div>${log}</div>`).join('');
        logsDiv.scrollTop = logsDiv.scrollHeight;
      }
    }
  }

  // Utility functions
  function log(...args) {
    const DEBUG = true; // Set to true to enable debug logging
    if (DEBUG) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const message = `[${timestamp}] [A/B Test] ${args.join(' ')}`;
      console.log(message);
      
      // Also log to debug window
      debugLogs.push(message);
      if (debugLogs.length > 100) debugLogs.shift(); // Keep only last 100 logs
      
      openDebugWindow();
      updateDebugWindow();
    }
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
    const elementsWithHideUntilReady = document.querySelectorAll('[data-hide-until-ready="true"]');

    [...elementsWithTestContent, ...elementsWithControlContent, ...elementsWithHideUntilReady].forEach((el) => {
      el.style.setProperty("opacity", "0", "important");
      el.style.transition = "opacity 0.3s ease";
    });

    log('Hidden hero text elements with data attributes and adjacent elements marked with data-hide-until-ready="true"');
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

    // Show elements marked with data-hide-until-ready="true"
    document.querySelectorAll('[data-hide-until-ready="true"]').forEach((el) => {
      el.style.setProperty("opacity", "1", "important");
    });

    log("Content visibility update completed for variant:", variant, '- also showed adjacent elements with data-hide-until-ready="true"');
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
  // --- HubSpot iframe form submission tracking ---
  log("Setting up iframe message listener");
  
  window.addEventListener("message", function (event) {
    // Filter out React dev tools and other noise
    const isReactDevTools = event.origin.includes('react-devtools') || 
                           (event.data && typeof event.data === 'object' && event.data.source === 'react-devtools');
    const isExtension = event.origin.includes('extension://') || event.origin.includes('chrome-extension://');
    const isInspector = event.data && typeof event.data === 'object' && 
                       (event.data.type === 'inspector' || JSON.stringify(event.data).includes('inspector'));
    
    // Skip logging noise
    if (isReactDevTools || isExtension || isInspector) {
      return;
    }
    
    // Debug: Log relevant messages only
    log("Message received from:", event.origin, "data:", event.data);
    
    // Log the type of data we received
    if (event.data) {
      log("Message data type:", typeof event.data, "value:", JSON.stringify(event.data));
    } else {
      log("Message with no data received");
    }
    
    // Handle HubSpot form callbacks - try multiple possible formats
    let isHubSpotFormEvent = false;
    let eventName = null;
    
    // Format 1: Standard hsFormCallback
    if (event.data && typeof event.data === "object" && event.data.type === "hsFormCallback") {
      log("HubSpot form callback (standard format):", event.data.eventName, JSON.stringify(event.data));
      isHubSpotFormEvent = true;
      eventName = event.data.eventName;
    }
    
    // Format 2: Direct event name
    if (event.data && typeof event.data === "object" && event.data.eventName) {
      log("HubSpot form callback (direct eventName):", event.data.eventName, JSON.stringify(event.data));
      isHubSpotFormEvent = true;
      eventName = event.data.eventName;
    }
    
    // Format 3: HubSpot form submission with different structure
    if (event.data && typeof event.data === "object" && 
        (event.data.type === "FORM_SUBMISSION" || event.data.action === "FORM_SUBMISSION")) {
      log("HubSpot form submission (alternative format):", JSON.stringify(event.data));
      isHubSpotFormEvent = true;
      eventName = "onFormSubmit";
    }
    
    // Format 4: Check for any HubSpot-related keywords
    if (event.data && typeof event.data === "object" && 
        JSON.stringify(event.data).toLowerCase().includes('hubspot')) {
      log("Potential HubSpot message:", JSON.stringify(event.data));
      isHubSpotFormEvent = true;
      eventName = "unknown_hubspot_event";
    }
    
    if (isHubSpotFormEvent) {
      // Track on form submit - be more flexible with event names
      if (eventName === "onFormSubmit" || 
          eventName === "onFormSubmitted" || 
          eventName === "onFormReady" ||
          eventName === "FORM_SUBMISSION" ||
          eventName === "unknown_hubspot_event") {
        if (window.posthog) {
          log("Tracking conversion for iframe form submission");
          
          const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");
          log("Current variant:", variant);
          
          posthog.capture("free_consult_hero_form_submitted", {
            experiment_key: "free-consult-ab-test",
            variant: variant,
            conversion_type: "form_submission",
            page_path: window.location.pathname,
            feature_flag: "free-consult-lp2-test",
            feature_flag_value: variant,
            experiment_version: "1.0",
            form_id: event.data.id || "unknown",
            form_type: "hubspot_iframe",
            event_name: event.data.eventName,
          });
          
          log("PostHog event sent, waiting 200ms before redirect");
          
          // Add small delay to ensure PostHog event is sent before redirect
          setTimeout(() => {
            log("Redirect delay complete");
          }, 200);
        } else {
          log("PostHog not available for iframe tracking");
        }
      }
    }
    
    // Also check for other possible HubSpot message formats
    if (event.data && typeof event.data === "string") {
      try {
        const parsed = JSON.parse(event.data);
        log("Parsed string message:", parsed);
        if (parsed.type === "hsFormCallback") {
          log("Found HubSpot callback in string format!");
        }
      } catch (e) {
        // Not JSON, that's fine
      }
    }
    
    // Check for any message that might be form-related
    if (event.data && (
      JSON.stringify(event.data).includes("form") ||
      JSON.stringify(event.data).includes("submit") ||
      JSON.stringify(event.data).includes("hubspot") ||
      JSON.stringify(event.data).includes("hs-")
    )) {
      log("Potentially form-related message detected:", JSON.stringify(event.data));
    }
  });
  
  log("Iframe message listener setup complete");
  
  // Alternative approach: Monitor for iframe changes and form elements
  function setupIframeMonitoring() {
    log("Setting up iframe monitoring as backup");
    
    // Look for iframes on the page
    const iframes = document.querySelectorAll('iframe');
    log("Found", iframes.length, "iframes on page");
    
    iframes.forEach((iframe, index) => {
      log("Iframe", index, "src:", iframe.src, "id:", iframe.id, "class:", iframe.className);
      
      // Try to monitor iframe load events
      iframe.addEventListener('load', function() {
        log("Iframe", index, "loaded");
        
        // Try to access iframe content (will fail for cross-origin)
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          log("Can access iframe", index, "content");
          
          // Look for forms in the iframe
          const forms = iframeDoc.querySelectorAll('form');
          log("Found", forms.length, "forms in iframe", index);
          
          forms.forEach((form, formIndex) => {
            form.addEventListener('submit', function(e) {
              log("Form submission detected in iframe", index, "form", formIndex);
              // Track the submission here
            });
          });
        } catch (e) {
          log("Cannot access iframe", index, "content (cross-origin):", e.message);
        }
      });
    });
  }
  
  // Set up iframe monitoring after a short delay
  setTimeout(setupIframeMonitoring, 1000);
  
  // Also monitor for new iframes being added
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.tagName === 'IFRAME') {
          log("New iframe detected:", node.src);
          setupIframeMonitoring();
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  log("Iframe mutation observer setup complete");
  
  // Alternative method: Monitor for URL changes (redirect detection)
  let currentUrl = window.location.href;
  let urlCheckInterval;
  let urlCheckCount = 0;
  
  function checkForRedirect() {
    urlCheckCount++;
    
    // Log every 100 checks to show it's working
    if (urlCheckCount % 100 === 0) {
      log("URL monitoring active - check #" + urlCheckCount + " - current URL:", window.location.href);
    }
    
    if (window.location.href !== currentUrl) {
      log("URL change detected - FORM SUBMISSION REDIRECT!");
      log("Old URL:", currentUrl);
      log("New URL:", window.location.href);
      
      const isHubSpotMeeting = window.location.href.includes('meetings.hubspot.com');
      
      if (isHubSpotMeeting) {
        log("SUCCESS: Redirected to HubSpot meeting page!");
      }
      
      // If we're being redirected, this might be a form submission
      if (window.posthog) {
        log("Tracking conversion based on URL change");
        const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");
        
        posthog.capture("free_consult_hero_form_submitted", {
          experiment_key: "free-consult-ab-test",
          variant: variant,
          conversion_type: "form_submission",
          page_path: currentUrl, // Original page
          redirect_url: window.location.href,
          is_hubspot_meeting: isHubSpotMeeting,
          feature_flag: "free-consult-lp2-test",
          feature_flag_value: variant,
          experiment_version: "1.0",
          form_type: isHubSpotMeeting ? "hubspot_meeting_redirect" : "redirect_detection",
          detection_method: "url_change",
        });
        
        log("Conversion tracked via URL change" + (isHubSpotMeeting ? " (HubSpot meeting confirmed)" : ""));
      }
      
      currentUrl = window.location.href;
      
      // Stop monitoring once we've detected a redirect
      if (urlCheckInterval) {
        clearInterval(urlCheckInterval);
        log("URL monitoring stopped after successful redirect detection");
      }
    }
  }
  
  // Check for URL changes every 50ms (more frequent for better detection)
  urlCheckInterval = setInterval(checkForRedirect, 50);
  log("URL change monitoring setup complete (checking every 50ms)");
  log("Initial URL being monitored:", currentUrl);
  
  // Also add a more aggressive approach - monitor for any navigation events
  window.addEventListener('beforeunload', function(e) {
    log("BEFOREUNLOAD: About to leave page");
    log("Current URL at beforeunload:", window.location.href);
    log("URL checks performed:", urlCheckCount);
  });
  
  // Monitor for popstate events (back/forward navigation)
  window.addEventListener('popstate', function(e) {
    log("POPSTATE: Navigation detected");
    log("New URL:", window.location.href);
  });
  
  // Monitor for hashchange events
  window.addEventListener('hashchange', function(e) {
    log("HASHCHANGE: Hash changed");
    log("Old URL:", e.oldURL);
    log("New URL:", e.newURL);
  });
  
  // Track navigation destination for HubSpot meeting detection
  let navigationDestination = null;
  let redirectMethod = null;
  
  // Method 1: Override window.open to capture popup destinations
  const originalWindowOpen = window.open;
  window.open = function(...args) {
    const url = args[0];
    log("Window.open detected with URL:", url);
    navigationDestination = url;
    redirectMethod = "window.open";
    if (url && url.includes('meetings.hubspot.com')) {
      log("HubSpot meeting URL detected in window.open:", url);
    }
    return originalWindowOpen.apply(this, args);
  };
  
  // Method 2: Override window.location assignments
  let originalLocationHref = window.location.href;
  Object.defineProperty(window.location, 'href', {
    get: function() { return originalLocationHref; },
    set: function(url) {
      log("window.location.href set to:", url);
      navigationDestination = url;
      redirectMethod = "location.href";
      originalLocationHref = url;
    }
  });
  
  // Method 3: Override history.pushState and replaceState
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(state, title, url) {
    log("history.pushState called with URL:", url);
    if (url) {
      navigationDestination = url;
      redirectMethod = "history.pushState";
    }
    return originalPushState.apply(this, arguments);
  };
  
  history.replaceState = function(state, title, url) {
    log("history.replaceState called with URL:", url);
    if (url) {
      navigationDestination = url;
      redirectMethod = "history.replaceState";
    }
    return originalReplaceState.apply(this, arguments);
  };
  
  // Method 4: Monitor for form target changes and submissions
  function monitorForms() {
    const forms = document.querySelectorAll('form');
    log("Found", forms.length, "forms on page");
    
    forms.forEach((form, index) => {
      log("Form", index, "action:", form.action, "target:", form.target, "method:", form.method);
      
      // Monitor form submissions
      form.addEventListener('submit', function(e) {
        log("FORM SUBMISSION DETECTED! Form", index, "submitted with action:", form.action);
        
        // Track immediately since this is likely a conversion
        if (window.posthog) {
          const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");
          
          posthog.capture("free_consult_hero_form_submitted", {
            experiment_key: "free-consult-ab-test",
            variant: variant,
            conversion_type: "form_submission",
            page_path: window.location.pathname,
            form_action: form.action || "unknown",
            form_method: form.method || "unknown",
            form_target: form.target || "unknown",
            is_hubspot_meeting: form.action && form.action.includes('meetings.hubspot.com'),
            feature_flag: "free-consult-lp2-test",
            feature_flag_value: variant,
            experiment_version: "1.0",
            form_type: "direct_form_submit",
            detection_method: "form_submit_event",
          });
          
          log("CONVERSION TRACKED via direct form submission");
        }
        
        if (form.action) {
          navigationDestination = form.action;
          redirectMethod = "form.submit";
          if (form.action.includes('meetings.hubspot.com')) {
            log("HubSpot meeting URL detected in form action:", form.action);
          }
        }
      });
      
      // Monitor for dynamic action changes
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'action') {
            log("Form", index, "action changed to:", form.action);
            navigationDestination = form.action;
            redirectMethod = "form.action.change";
            
            if (form.action && form.action.includes('meetings.hubspot.com')) {
              log("HubSpot meeting URL detected in form action change:", form.action);
            }
          }
        });
      });
      observer.observe(form, { attributes: true });
    });
    
    // Also monitor for forms being added dynamically
    const formObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.tagName === 'FORM') {
            log("New form detected:", node.action);
            // Re-run form monitoring for new forms
            setTimeout(monitorForms, 100);
          }
        });
      });
    });
    formObserver.observe(document.body, { childList: true, subtree: true });
  }
  
  // Method 5: Monitor for meta refresh redirects
  function monitorMetaRefresh() {
    const metaTags = document.querySelectorAll('meta[http-equiv="refresh"]');
    metaTags.forEach((meta, index) => {
      const content = meta.getAttribute('content');
      log("Meta refresh tag", index, "content:", content);
      if (content) {
        const urlMatch = content.match(/url=(.+)/i);
        if (urlMatch) {
          const url = urlMatch[1];
          log("Meta refresh URL detected:", url);
          navigationDestination = url;
          redirectMethod = "meta.refresh";
        }
      }
    });
    
    // Monitor for new meta refresh tags
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.tagName === 'META' && node.getAttribute('http-equiv') === 'refresh') {
            const content = node.getAttribute('content');
            log("New meta refresh tag added:", content);
            if (content) {
              const urlMatch = content.match(/url=(.+)/i);
              if (urlMatch) {
                navigationDestination = urlMatch[1];
                redirectMethod = "meta.refresh.dynamic";
              }
            }
          }
        });
      });
    });
    observer.observe(document.head, { childList: true });
  }
  
  // Method 6: Monitor for JavaScript redirects via setTimeout/setInterval
  const originalSetTimeout = window.setTimeout;
  const originalSetInterval = window.setInterval;
  
  window.setTimeout = function(callback, delay, ...args) {
    const wrappedCallback = function() {
      // Check if the callback contains redirect code
      const callbackStr = callback.toString();
      if (callbackStr.includes('location') || callbackStr.includes('href') || callbackStr.includes('redirect')) {
        log("setTimeout callback may contain redirect:", callbackStr.substring(0, 200));
      }
      return callback.apply(this, args);
    };
    return originalSetTimeout.call(this, wrappedCallback, delay);
  };
  
  // Method 7: Monitor for iframe src changes that might indicate redirects
  function monitorIframes() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe, index) => {
      log("Monitoring iframe", index, "src:", iframe.src);
      
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
            log("Iframe", index, "src changed to:", iframe.src);
            if (iframe.src && iframe.src.includes('meetings.hubspot.com')) {
              log("HubSpot meeting URL detected in iframe src:", iframe.src);
              navigationDestination = iframe.src;
              redirectMethod = "iframe.src.change";
            }
          }
        });
      });
      observer.observe(iframe, { attributes: true });
    });
  }
  
  // Initialize all monitoring
  setTimeout(() => {
    monitorForms();
    monitorMetaRefresh();
    monitorIframes();
  }, 500);
  
  // Monitor for ALL clicks to see what's happening
  document.addEventListener('click', function(e) {
    log("CLICK DETECTED on:", e.target.tagName, e.target.className, e.target.id);
    
    const target = e.target.closest('a');
    if (target && target.href) {
      log("Link clicked:", target.href);
      if (target.href.includes('meetings.hubspot.com')) {
        log("HubSpot meeting link clicked:", target.href);
        navigationDestination = target.href;
        
        // Track immediately since this is a clear conversion
        if (window.posthog) {
          const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");
          
          posthog.capture("free_consult_hero_form_submitted", {
            experiment_key: "free-consult-ab-test",
            variant: variant,
            conversion_type: "form_submission",
            page_path: window.location.pathname,
            destination_url: target.href,
            feature_flag: "free-consult-lp2-test",
            feature_flag_value: variant,
            experiment_version: "1.0",
            form_type: "hubspot_meeting_link",
            detection_method: "link_click",
          });
          
          log("CONVERSION TRACKED via HubSpot meeting link click");
        }
      }
    }
    
    // Check if click is on a button that might submit a form
    const button = e.target.closest('button, input[type="submit"], input[type="button"]');
    if (button) {
      log("BUTTON CLICKED:", button.type, button.value, button.textContent);
      
      // Track button clicks that might be form submissions
      if (window.posthog) {
        const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");
        
        posthog.capture("free_consult_hero_form_submitted", {
          experiment_key: "free-consult-ab-test",
          variant: variant,
          conversion_type: "form_submission",
          page_path: window.location.pathname,
          button_type: button.type || "unknown",
          button_text: button.textContent || button.value || "unknown",
          feature_flag: "free-consult-lp2-test",
          feature_flag_value: variant,
          experiment_version: "1.0",
          form_type: "button_click",
          detection_method: "button_click",
        });
        
        log("CONVERSION TRACKED via button click");
      }
    }
  });
  
  // Alternative method: Monitor for beforeunload (page leaving)
  window.addEventListener('beforeunload', function(e) {
    log("Page unload detected - possible form submission");
    log("Last known navigation destination:", navigationDestination);
    log("Redirect method used:", redirectMethod);
    
    // Try to capture current navigation target from various sources
    const possibleDestinations = [
      navigationDestination,
      document.activeElement?.href,
      document.activeElement?.action,
      window.location.href !== originalLocationHref ? window.location.href : null
    ].filter(Boolean);
    
    log("All possible destinations:", possibleDestinations);
    
    // Check if we're likely going to a HubSpot meeting
    const isHubSpotMeeting = possibleDestinations.some(url => url.includes('meetings.hubspot.com'));
    const hubspotUrl = possibleDestinations.find(url => url.includes('meetings.hubspot.com'));
    
    if (hubspotUrl) {
      log("HubSpot meeting URL detected:", hubspotUrl);
    }
    
    // Quick synchronous tracking attempt
    if (window.posthog) {
      const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");
      
      // Use sendBeacon for reliable delivery during page unload
      const data = {
        experiment_key: "free-consult-ab-test",
        variant: variant,
        conversion_type: "form_submission",
        page_path: window.location.pathname,
        destination_url: navigationDestination || "unknown",
        redirect_method: redirectMethod || "unknown",
        all_possible_destinations: possibleDestinations,
        is_hubspot_meeting: isHubSpotMeeting,
        hubspot_meeting_url: hubspotUrl || null,
        feature_flag: "free-consult-lp2-test",
        feature_flag_value: variant,
        experiment_version: "1.0",
        form_type: isHubSpotMeeting ? "hubspot_meeting_redirect" : "beforeunload_detection",
        detection_method: "page_unload",
      };
      
      try {
        // Try to send via PostHog's capture method first
        posthog.capture("free_consult_hero_form_submitted", data);
        log("Tracked conversion via beforeunload" + (isHubSpotMeeting ? " (HubSpot meeting detected)" : ""));
      } catch (error) {
        log("Error tracking via beforeunload:", error);
      }
    }
  });
  
  // Also monitor for form redirects by checking document.referrer on new pages
  if (document.referrer && document.referrer.includes('joinheard.com/free-consult')) {
    log("REFERRER DETECTION: Navigated from free-consult page");
    log("Current URL:", window.location.href);
    log("Referrer:", document.referrer);
    
    if (window.location.href.includes('meetings.hubspot.com')) {
      log("SUCCESS: Currently on HubSpot meeting page - CONVERSION CONFIRMED!");
      
      // Track this as a successful conversion
      if (window.posthog) {
        // Try to get variant from localStorage if available
        let variant = null;
        try {
          const storedVariant = localStorage.getItem('posthog_feature_flag_free-consult-lp2-test');
          variant = storedVariant || 'unknown';
        } catch (e) {
          variant = 'unknown';
        }
        
        posthog.capture("free_consult_hero_form_submitted", {
          experiment_key: "free-consult-ab-test",
          variant: variant,
          conversion_type: "form_submission",
          page_path: "/free-consult",
          destination_url: window.location.href,
          referrer: document.referrer,
          is_hubspot_meeting: true,
          feature_flag: "free-consult-lp2-test",
          feature_flag_value: variant,
          experiment_version: "1.0",
          form_type: "hubspot_meeting_success",
          detection_method: "referrer_tracking",
        });
        
        log("CONVERSION TRACKED via referrer tracking on HubSpot meeting page");
      }
    } else {
      log("Not on HubSpot meeting page, current URL:", window.location.href);
    }
  } else {
    log("No relevant referrer detected, referrer:", document.referrer);
  }
})();
