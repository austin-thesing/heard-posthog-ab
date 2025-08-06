// Configuration
const DEBUG_ENABLED = true; // Set to true to enable debug logging for testing

// Universal HubSpot form tracking configuration
const TRACKING_CONFIG = {
  // PostHog event name - can be customized per page
  posthogEventName: "hubspot_form_submission",
  // Facebook Pixel event name
  facebookEventName: "Lead",
  // Reddit Pixel event name
  redditEventName: "Lead",
  // Default form ID fallback
  defaultFormId: "hubspot-form",
  // HubSpot portal ID
  hubspotPortalId: "7507639",
};

// --- Simplified HubSpot form submission tracking ---
// Focuses ONLY on the reliable onFormSubmitted event that fires after validation

window.addEventListener("message", function (event) {
  // Debug logging to see all messages (disable in production)
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
    // Do NOT track onFormSubmit (fires before validation) or onFormReady (fires on load)
    if (event.data.eventName === "onFormSubmitted") {
      
      if (DEBUG_ENABLED) {
        console.log("FORM SUBMITTED - TRACKING NOW!");
        console.log("Form ID:", event.data.id);
        console.log("Form data:", event.data.data);
      }

      // Track with Facebook Pixel - bare minimum, no extra details
      if (typeof fbq !== "undefined") {
        try {
          fbq("track", TRACKING_CONFIG.facebookEventName);
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
          posthog.capture(TRACKING_CONFIG.posthogEventName, {
            form_id: event.data.id || TRACKING_CONFIG.defaultFormId,
            page_path: window.location.pathname,
            timestamp: new Date().toISOString()
          });
          if (DEBUG_ENABLED) {
            console.log("PostHog event fired:", TRACKING_CONFIG.posthogEventName);
          }
        } catch (error) {
          if (DEBUG_ENABLED) {
            console.error("PostHog error:", error);
          }
        }
      }

      // Track with Reddit Pixel - bare minimum
      if (typeof rdt !== "undefined") {
        try {
          rdt("track", TRACKING_CONFIG.redditEventName);
          if (DEBUG_ENABLED) {
            console.log("Reddit Pixel Lead event fired");
          }
        } catch (error) {
          if (DEBUG_ENABLED) {
            console.error("Reddit Pixel error:", error);
          }
        }
      }

      // Optional: Identify user with PostHog if email is available
      if (event.data.data && event.data.data.email && window.posthog) {
        try {
          posthog.identify(event.data.data.email, {
            email: event.data.data.email,
            form_source: window.location.pathname
          });
          if (DEBUG_ENABLED) {
            console.log("PostHog identify called for:", event.data.data.email);
          }
        } catch (error) {
          if (DEBUG_ENABLED) {
            console.error("PostHog identify error:", error);
          }
        }
      }
    }
  }
});

// Optional: Fallback tracking on the HubSpot meetings page after redirect
// This code runs if the script is also loaded on meetings.hubspot.com
if (document.referrer && document.referrer.includes("joinheard.com")) {
  if (window.location.href.includes("meetings.hubspot.com")) {
    
    if (DEBUG_ENABLED) {
      console.log("User arrived at HubSpot meetings from:", document.referrer);
    }

    // Fire pixels on the meeting page as confirmation
    if (typeof fbq !== "undefined") {
      fbq("track", TRACKING_CONFIG.facebookEventName);
    }

    if (window.posthog) {
      posthog.capture(TRACKING_CONFIG.posthogEventName + "_confirmed", {
        referrer: document.referrer,
        meeting_url: window.location.href
      });
    }

    if (typeof rdt !== "undefined") {
      rdt("track", TRACKING_CONFIG.redditEventName);
    }
  }
}

// Test tracking setup on page load (only in debug mode)
if (DEBUG_ENABLED && window.posthog) {
  posthog.capture("hubspot_form_tracking_initialized", {
    page_url: window.location.href,
    tracking_version: "simplified_v2"
  });
  console.log("HubSpot form tracking initialized - listening for onFormSubmitted events");
}

// Utility function to customize tracking for specific pages
window.customizeHubSpotTracking = function (config) {
  Object.assign(TRACKING_CONFIG, config);
  if (DEBUG_ENABLED) {
    console.log("Tracking config updated:", TRACKING_CONFIG);
  }
};
