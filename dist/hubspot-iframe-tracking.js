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
  };

  // --- Simple HubSpot iframe form tracking ---
  console.log("🚀 HubSpot Iframe Tracking v1 LOADED at:", new Date().toISOString());
  console.log("📍 Current page:", window.location.href);
  console.log("📊 Tracking pixels available:");
  console.log("  - PostHog:", !!window.posthog);
  console.log("  - Facebook:", typeof fbq !== "undefined");
  console.log("  - Reddit:", typeof rdt !== "undefined");

  // Count messages for debugging
  let totalMessages = 0;
  let hubspotMessages = 0;

  // Listen for postMessage events from HubSpot iframes
  window.addEventListener("message", function(event) {
    totalMessages++;
    
    // Log first 10 messages to see what's coming through
    if (totalMessages <= 10 && DEBUG_ENABLED) {
      console.log(`📨 Message #${totalMessages}:`, {
        origin: event.origin,
        data: event.data
      });
    }

    // Check if this is from a HubSpot domain
    const isHubSpotOrigin = event.origin && (
      event.origin.includes('hsforms.com') ||
      event.origin.includes('hsforms.net') ||
      event.origin.includes('hubspot.com')
    );

    if (!isHubSpotOrigin) {
      return; // Not from HubSpot
    }

    // Check for HubSpot form callback events
    if (event.data && typeof event.data === "object" && event.data.type === "hsFormCallback") {
      hubspotMessages++;
      
      if (DEBUG_ENABLED) {
        console.log(`🎯 HubSpot form event #${hubspotMessages}:`, event.data.eventName);
        console.log("Full event data:", event.data);
      }

      // Track on form submission (after validation, before redirect)
      if (event.data.eventName === "onFormSubmitted") {
        
        if (DEBUG_ENABLED) {
          console.log("🎉 FORM SUBMITTED - TRACKING NOW!");
          console.log("Form ID:", event.data.id);
          if (event.data.data) {
            console.log("Form data:", event.data.data);
          }
        }

        // Fire Facebook Pixel
        if (typeof fbq !== "undefined") {
          try {
            fbq("track", TRACKING_CONFIG.facebookEventName);
            if (DEBUG_ENABLED) {
              console.log("✅ Facebook Pixel Lead event fired");
            }
          } catch (error) {
            if (DEBUG_ENABLED) {
              console.error("❌ Facebook Pixel error:", error);
            }
          }
        } else if (DEBUG_ENABLED) {
          console.log("⚠️ Facebook Pixel not available");
        }

        // Fire PostHog event
        if (window.posthog) {
          try {
            posthog.capture(TRACKING_CONFIG.posthogEventName, {
              form_id: event.data.id || "unknown",
              page_path: window.location.pathname,
              timestamp: new Date().toISOString(),
              method: "iframe_postmessage"
            });
            if (DEBUG_ENABLED) {
              console.log("✅ PostHog event fired:", TRACKING_CONFIG.posthogEventName);
            }
          } catch (error) {
            if (DEBUG_ENABLED) {
              console.error("❌ PostHog error:", error);
            }
          }
        } else if (DEBUG_ENABLED) {
          console.log("⚠️ PostHog not available");
        }

        // Fire Reddit Pixel
        if (typeof rdt !== "undefined") {
          try {
            rdt("track", TRACKING_CONFIG.redditEventName);
            if (DEBUG_ENABLED) {
              console.log("✅ Reddit Pixel Lead event fired");
            }
          } catch (error) {
            if (DEBUG_ENABLED) {
              console.error("❌ Reddit Pixel error:", error);
            }
          }
        } else if (DEBUG_ENABLED) {
          console.log("⚠️ Reddit Pixel not available");
        }

        // Optional: Identify user with PostHog if email is available
        if (event.data.data && event.data.data.email && window.posthog) {
          try {
            posthog.identify(event.data.data.email, {
              email: event.data.data.email,
              form_source: window.location.pathname,
              identified_via: "hubspot_iframe_form"
            });
            if (DEBUG_ENABLED) {
              console.log("✅ PostHog identify called for:", event.data.data.email);
            }
          } catch (error) {
            if (DEBUG_ENABLED) {
              console.error("❌ PostHog identify error:", error);
            }
          }
        }
      }
      
      // Also log other form events for debugging
      else if (DEBUG_ENABLED) {
        if (event.data.eventName === "onFormReady") {
          console.log("📝 Form is ready and loaded");
        } else if (event.data.eventName === "onFormSubmit") {
          console.log("⏳ Form submit started (before validation)");
        } else {
          console.log("ℹ️ Other form event:", event.data.eventName);
        }
      }
    }
    
    // Check for other HubSpot message formats
    else if (event.data && typeof event.data === "object") {
      const dataStr = JSON.stringify(event.data);
      if (dataStr.includes("hsForm") || dataStr.includes("hubspot") || event.data.eventName) {
        if (DEBUG_ENABLED) {
          console.log("🔍 Potential HubSpot message (different format):", event.data);
        }
      }
    }
  });

  // Check for HubSpot iframes on the page
  setTimeout(() => {
    const iframes = document.querySelectorAll('iframe');
    const hubspotIframes = Array.from(iframes).filter(iframe => 
      iframe.src && (
        iframe.src.includes('hsforms.com') ||
        iframe.src.includes('hsforms.net') ||
        iframe.src.includes('hubspot.com')
      )
    );
    
    if (DEBUG_ENABLED) {
      console.log(`🔍 Found ${iframes.length} total iframes on page`);
      console.log(`🎯 Found ${hubspotIframes.length} HubSpot iframes`);
      
      hubspotIframes.forEach((iframe, index) => {
        console.log(`  Iframe ${index + 1}:`, iframe.src);
      });
      
      if (hubspotIframes.length === 0) {
        console.log("⚠️ No HubSpot iframes detected. Make sure you're using iframe embed code like:");
        console.log('   <iframe src="https://share.hsforms.com/1/YOUR_FORM_ID" width="100%" height="500"></iframe>');
      }
    }
  }, 1000);

  // Status logging every 10 seconds in debug mode
  if (DEBUG_ENABLED) {
    setInterval(() => {
      console.log(`📊 Status: ${totalMessages} total messages, ${hubspotMessages} HubSpot form events`);
    }, 10000);
  }

  // Utility function to customize tracking
  window.customizeHubSpotTracking = function(config) {
    Object.assign(TRACKING_CONFIG, config);
    if (DEBUG_ENABLED) {
      console.log("Tracking config updated:", TRACKING_CONFIG);
    }
  };

  // Test PostHog connection
  if (DEBUG_ENABLED && window.posthog) {
    posthog.capture("hubspot_iframe_tracking_loaded", {
      page_url: window.location.href,
      tracking_version: "iframe_v1"
    });
  }

})(); // End IIFE