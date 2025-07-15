// Configuration
const DEBUG_ENABLED = false; // Set to false to disable debug logging and window

// Debug window for persistent logging
let debugWindow = null;
let debugLogs = [];

function openDebugWindow() {
  if (!DEBUG_ENABLED) return;

  if (!debugWindow || debugWindow.closed) {
    debugWindow = window.open("", "debug", "width=600,height=400,scrollbars=yes");
    debugWindow.document.write(`
      <html>
        <head><title>Form Tracking Debug Log</title></head>
        <body style="font-family: monospace; padding: 10px; background: #000; color: #0f0;">
          <h3>Form Tracking Debug Log</h3>
          <div id="logs"></div>
        </body>
      </html>
    `);
  }
  return debugWindow;
}

function updateDebugWindow() {
  if (!DEBUG_ENABLED || !debugWindow || debugWindow.closed) return;

  const logsDiv = debugWindow.document.getElementById("logs");
  if (logsDiv) {
    logsDiv.innerHTML = debugLogs.map((log) => `<div>${log}</div>`).join("");
    logsDiv.scrollTop = logsDiv.scrollHeight;
  }
}

function debugLog(...args) {
  if (!DEBUG_ENABLED) return;

  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const message = `[${timestamp}] ${args.join(" ")}`;
  console.log(message);

  // Also log to debug window
  debugLogs.push(message);
  if (debugLogs.length > 100) debugLogs.shift(); // Keep only last 100 logs

  openDebugWindow();
  updateDebugWindow();
}

// --- Enhanced HubSpot form submission tracking ---
debugLog("Setting up enhanced form submission tracking");

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

  // Only log HubSpot-related messages to reduce noise
  const isHubSpotRelated =
    event.origin.includes("hsforms.net") || (event.data && typeof event.data === "object" && (event.data.type === "hsFormCallback" || JSON.stringify(event.data).includes("hubspot") || JSON.stringify(event.data).includes("hsform")));

  if (isHubSpotRelated) {
    debugLog("🎯 HUBSPOT MESSAGE detected from:", event.origin);
    debugLog("🎯 HubSpot data:", JSON.stringify(event.data));
  }

  // Handle HubSpot form callbacks
  let isHubSpotFormEvent = false;
  let eventName = null;

  // Standard hsFormCallback format
  if (event.data && typeof event.data === "object" && event.data.type === "hsFormCallback") {
    debugLog("HubSpot form callback detected:", event.data.eventName);
    isHubSpotFormEvent = true;
    eventName = event.data.eventName;
  }

  // Direct event name format
  if (event.data && typeof event.data === "object" && event.data.eventName) {
    debugLog("HubSpot form event detected:", event.data.eventName);
    isHubSpotFormEvent = true;
    eventName = event.data.eventName;
  }

  if (isHubSpotFormEvent) {
    // Track form submission events
    if (eventName === "onFormSubmit" || eventName === "onFormSubmitted" || eventName === "onFormReady") {
      formSubmissionDetected = true;
      debugLog("✅ FORM SUBMISSION DETECTED! Event:", eventName);

      if (window.posthog) {
        debugLog("Tracking conversion for form submission");

        // Create custom event for form submission
        try {
          posthog.capture("free_consult_form_conversion", {
            conversion_type: "form_submission",
            page_path: window.location.pathname,
            form_id: event.data.id || event.data.formId || "002af025-1d67-4e7f-b2bf-2d221f555805",
            form_type: "hubspot_iframe_redirect",
            event_name: eventName,
            hubspot_portal_id: "7507639",
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            page_url: window.location.href,
          });

          debugLog("✅ CONVERSION TRACKED! Event: free_consult_form_conversion");
          debugLog("📊 PostHog project key:", window.posthog?.config?.token || "unknown");
          debugLog("🔗 PostHog API host:", window.posthog?.config?.api_host || "unknown");
        } catch (error) {
          debugLog("❌ ERROR tracking conversion:", error.message);
        }
      } else {
        debugLog("❌ PostHog not available for tracking");
      }
    } else {
      debugLog("Other HubSpot event:", eventName, "- not tracking as conversion");
    }
  }
});

debugLog("Iframe message listener setup complete");

// Add URL monitoring to detect redirects to HubSpot meetings
function setupRedirectDetection() {
  debugLog("Setting up redirect detection for HubSpot meetings");

  let currentUrl = window.location.href;
  let urlCheckCount = 0;

  // Check for URL changes every 100ms
  const urlCheckInterval = setInterval(() => {
    urlCheckCount++;

    if (window.location.href !== currentUrl) {
      debugLog("🚀 URL CHANGE DETECTED!");
      debugLog("Old URL:", currentUrl);
      debugLog("New URL:", window.location.href);

      const isHubSpotMeeting = window.location.href.includes("meetings.hubspot.com");

      if (isHubSpotMeeting) {
        debugLog("🎯 SUCCESS: Redirected to HubSpot meeting page!");
        redirectDetected = true;

        // Track the conversion
        if (window.posthog) {
          try {
            posthog.capture("free_consult_form_conversion", {
              conversion_type: "form_submission",
              page_path: "/free-consult",
              redirect_url: window.location.href,
              form_type: "hubspot_meeting_redirect",
              detection_method: "url_change_monitoring",
              timestamp: new Date().toISOString(),
              is_hubspot_meeting: true,
            });

            debugLog("✅ CONVERSION TRACKED via URL change detection");
            debugLog("📊 Event sent to PostHog project:", window.posthog?.config?.token || "unknown");
          } catch (error) {
            debugLog("❌ ERROR tracking URL change conversion:", error.message);
          }
        } else {
          debugLog("❌ PostHog not available for URL change tracking");
        }
      }

      // Stop monitoring after redirect
      clearInterval(urlCheckInterval);
      return;
    }

    // Log every 50 checks to show it's working
    if (urlCheckCount % 50 === 0) {
      debugLog("🔍 URL monitoring active - check #" + urlCheckCount);
    }

    // Stop after 5 minutes to prevent infinite monitoring
    if (urlCheckCount > 3000) {
      clearInterval(urlCheckInterval);
      debugLog("URL monitoring stopped after 5 minutes");
    }
  }, 100);

  debugLog("URL monitoring started - checking every 100ms");
}

// Add form interaction tracking
function trackFormInteractions() {
  debugLog("Setting up form interaction tracking");

  // Track clicks in form areas
  document.addEventListener("click", function (e) {
    const formContainer = document.querySelector("#hubspot-form-container, .custom_step_form, .right_step_form");
    if (formContainer && formContainer.contains(e.target)) {
      debugLog("🎯 CLICK inside form container on:", e.target.tagName, "class:", e.target.className);

      // Check for button clicks
      if (e.target.tagName === "BUTTON" || e.target.type === "submit") {
        debugLog("🔘 FORM BUTTON clicked:", e.target.textContent || e.target.value);
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
  debugLog("🚀 BEFOREUNLOAD: Page is about to redirect");
  debugLog("Current URL:", window.location.href);
  debugLog("Form submission detected:", formSubmissionDetected);

  // Check if we're likely redirecting from the form page
  const isLikelyFormSubmission = window.location.href.includes("/free-consult");

  if (isLikelyFormSubmission && window.posthog) {
    debugLog("🎯 TRACKING: Form submission redirect detected");

    // Track the conversion immediately
    posthog.capture("free_consult_form_conversion", {
      conversion_type: "form_submission",
      page_path: window.location.pathname,
      form_type: "hubspot_redirect",
      detection_method: "beforeunload_redirect",
      timestamp: new Date().toISOString(),
      redirect_expected: true,
      form_submission_detected: formSubmissionDetected,
    });

    debugLog("✅ CONVERSION TRACKED via beforeunload redirect detection");

    // Also use sendBeacon for reliability
    if (navigator.sendBeacon) {
      const data = JSON.stringify({
        event: "free_consult_form_conversion_beacon",
        properties: {
          conversion_type: "form_submission",
          page_path: window.location.pathname,
          detection_method: "sendBeacon",
          timestamp: new Date().toISOString(),
        },
      });

      // Send to a generic endpoint (this will likely fail but shows the attempt)
      navigator.sendBeacon("/api/analytics", data);
      debugLog("📡 Backup tracking sent via sendBeacon");
    }
  } else {
    debugLog("Page unload detected but not from form page or no form submission detected");
  }
});

// Monitor for successful redirects to HubSpot meeting pages
if (document.referrer && document.referrer.includes("joinheard.com/free-consult")) {
  debugLog("🔍 REFERRER DETECTION: Navigated from free-consult page");
  debugLog("Current URL:", window.location.href);
  debugLog("Referrer:", document.referrer);

  if (window.location.href.includes("meetings.hubspot.com")) {
    debugLog("🎯 SUCCESS: Currently on HubSpot meeting page - CONVERSION CONFIRMED!");

    // Track this as a successful conversion
    if (window.posthog) {
      posthog.capture("free_consult_form_conversion", {
        conversion_type: "form_submission",
        page_path: "/free-consult",
        destination_url: window.location.href,
        referrer: document.referrer,
        is_hubspot_meeting: true,
        form_type: "hubspot_meeting_success",
        detection_method: "referrer_tracking",
        timestamp: new Date().toISOString(),
      });

      debugLog("✅ CONVERSION TRACKED via referrer tracking on HubSpot meeting page");
    }
  } else {
    debugLog("Not on HubSpot meeting page, current URL:", window.location.href);
  }
} else {
  debugLog("No relevant referrer detected, referrer:", document.referrer);
}

// Test PostHog connection immediately
if (window.posthog) {
  debugLog("✅ PostHog is available, sending test event");
  posthog.capture("test_event_form_tracking", {
    test: true,
    timestamp: new Date().toISOString(),
    page_url: window.location.href,
  });
  debugLog("📤 Test event sent to PostHog");
} else {
  debugLog("❌ PostHog is NOT available");
}

debugLog("🚀 Enhanced form tracking setup complete - ready to detect submissions and redirects");
