(function() {
  "use strict";
  
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
// Immediately log that script is loaded
console.log("🚀 HubSpot tracking script LOADED at:", new Date().toISOString());
console.log("📍 Current page:", window.location.href);

// Count messages to see if ANY are coming through
let totalMessages = 0;
let hubspotMessages = 0;

window.addEventListener("message", function (event) {
  totalMessages++;
  
  // Log first 10 messages regardless of source to see what's happening
  if (totalMessages <= 10) {
    console.log(`📨 Message #${totalMessages}:`, {
      origin: event.origin,
      data: event.data
    });
  }
  
  // Check for HubSpot patterns in various formats
  if (event.data && typeof event.data === "object") {
    const dataStr = JSON.stringify(event.data);
    if (dataStr.includes("hsForm") || 
        dataStr.includes("hubspot") || 
        event.data.type === "hsFormCallback" ||
        event.data.eventName) {
      hubspotMessages++;
      console.log(`🎯 HubSpot-related message #${hubspotMessages}:`, event.data);
    }
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

// Test tracking setup on page load
if (DEBUG_ENABLED) {
  console.log("✅ Tracking initialized - listening for messages");
  console.log("📊 PostHog available:", !!window.posthog);
  console.log("📊 Facebook Pixel available:", typeof fbq !== "undefined");
  console.log("📊 Reddit Pixel available:", typeof rdt !== "undefined");
  
  // Log message count every 5 seconds to see if we're getting ANY messages
  setInterval(() => {
    console.log(`📊 Status: ${totalMessages} total messages, ${hubspotMessages} HubSpot messages`);
  }, 5000);
}

  // Utility function to customize tracking for specific pages
  window.customizeHubSpotTracking = function (config) {
    Object.assign(TRACKING_CONFIG, config);
    if (DEBUG_ENABLED) {
      console.log("Tracking config updated:", TRACKING_CONFIG);
    }
  };

// FALLBACK: Also try the global HubSpot callback if available
// This works when forms are NOT in iframes
if (typeof window.hbspt !== "undefined" && window.hbspt) {
  console.log("🔍 HubSpot global object detected, attempting to hook into forms");
  
  // Wait for forms object to be available
  const setupFormHook = () => {
    if (window.hbspt.forms && window.hbspt.forms.create) {
      const originalCreate = window.hbspt.forms.create;
      
      window.hbspt.forms.create = function(config) {
        console.log("📝 HubSpot form being created with config:", config);
        
        // Add our callback to the config
        const originalCallback = config.onFormSubmitted;
        config.onFormSubmitted = function(data) {
          console.log("🎉 Form submitted via global callback!", data);
          
          // Fire tracking pixels
          if (typeof fbq !== "undefined") {
            fbq("track", "Lead");
            console.log("✅ Facebook Lead event fired");
          }
          
          if (window.posthog) {
            posthog.capture(TRACKING_CONFIG.posthogEventName, {
              form_id: config.formId || "unknown",
              method: "global_callback"
            });
            console.log("✅ PostHog event fired");
          }
          
          if (typeof rdt !== "undefined") {
            rdt("track", "Lead");
            console.log("✅ Reddit Lead event fired");
          }
          
          // Call original callback if it existed
          if (originalCallback) {
            originalCallback.call(this, data);
          }
        };
        
        // Call original create function
        return originalCreate.call(this, config);
      };
      console.log("✅ Successfully hooked into HubSpot forms.create");
    } else {
      console.log("⏳ Waiting for HubSpot forms object...");
      setTimeout(setupFormHook, 500);
    }
  };
  
  setupFormHook();
} else {
  console.log("⚠️ HubSpot global object not found - relying on postMessage only");
}

})(); // End IIFE
