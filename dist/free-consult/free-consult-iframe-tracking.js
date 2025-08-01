// Configuration
const DEBUG_ENABLED = false; // Set to false to disable debug logging and window



// --- Enhanced HubSpot form submission tracking ---

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

        } catch (error) {
          // Silent error handling
        }
      }
    }
  }
});



// Add URL monitoring to detect redirects to HubSpot meetings
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

  // Track clicks in form areas
  document.addEventListener("click", function (e) {
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
  // Check if we're likely redirecting from the form page
  const isLikelyFormSubmission = window.location.href.includes("/free-consult");

  if (isLikelyFormSubmission && window.posthog) {

    // Track the conversion immediately
    try {
      posthog.capture("free_consult_form_conversion", {
        conversion_type: "form_submission",
        page_path: window.location.pathname,
        form_type: "hubspot_redirect",
        detection_method: "beforeunload_redirect",
        timestamp: new Date().toISOString(),
        redirect_expected: true,
        form_submission_detected: formSubmissionDetected,
      });
    } catch (error) {
      // Silent error handling
    }



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
    }
  }
});

// Monitor for successful redirects to HubSpot meeting pages
if (document.referrer && document.referrer.includes("joinheard.com/free-consult")) {
  if (window.location.href.includes("meetings.hubspot.com")) {

    // Track this as a successful conversion
    if (window.posthog) {
      try {
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
      } catch (error) {
        // Silent error handling
      }

    }
  }
}

// Test PostHog connection immediately
if (window.posthog) {
  try {
    posthog.capture("test_event_form_tracking", {
      test: true,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
    });
  } catch (error) {
    // Silent error handling
  }
}
