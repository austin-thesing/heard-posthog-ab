// Configuration
const DEBUG_ENABLED = true; // Set to true to enable debug logging for testing

// --- Simplified HubSpot form submission tracking for /free-consult ---

window.addEventListener("message", function (event) {
  // Debug logging (disable in production)
  if (DEBUG_ENABLED) {
    console.log("Message received:", event.data);
  }

  // Only handle HubSpot form callback events
  if (event.data && 
      event.data.type === "hsFormCallback") {
    
    if (DEBUG_ENABLED) {
      console.log("HubSpot event detected:", event.data.eventName);
    }

    // CRITICAL: Only track onFormSubmitted - this fires AFTER validation, BEFORE redirect
    if (event.data.eventName === "onFormSubmitted") {
      
      if (DEBUG_ENABLED) {
        console.log("FREE CONSULT FORM SUBMITTED - TRACKING NOW!");
        console.log("Form ID:", event.data.id);
      }

      // Track with Facebook Pixel - bare minimum
      if (typeof fbq !== "undefined") {
        try {
          fbq("track", "Lead");
          if (DEBUG_ENABLED) {
            console.log("Facebook Pixel Lead event fired");
          }
        } catch (error) {
          if (DEBUG_ENABLED) {
            console.error("Facebook Pixel error:", error);
          }
        }
      }

      // Track with PostHog custom event
      if (window.posthog) {
        try {
          posthog.capture("free_consult_form_conversion", {
            form_id: event.data.id || "002af025-1d67-4e7f-b2bf-2d221f555805",
            page_path: window.location.pathname,
            timestamp: new Date().toISOString()
          });
          if (DEBUG_ENABLED) {
            console.log("PostHog conversion event fired");
          }
        } catch (error) {
          if (DEBUG_ENABLED) {
            console.error("PostHog error:", error);
          }
        }
      }

      // Track with Reddit Pixel if available
      if (typeof rdt !== "undefined") {
        try {
          rdt("track", "Lead");
          if (DEBUG_ENABLED) {
            console.log("Reddit Pixel Lead event fired");
          }
        } catch (error) {
          if (DEBUG_ENABLED) {
            console.error("Reddit Pixel error:", error);
          }
        }
      }
    }
  }
});

// Test tracking setup on page load (only in debug mode)
if (DEBUG_ENABLED) {
  console.log("Free Consult form tracking initialized - listening for onFormSubmitted events");
  
  if (window.posthog) {
    posthog.capture("free_consult_tracking_initialized", {
      page_url: window.location.href
    });
  }
}
