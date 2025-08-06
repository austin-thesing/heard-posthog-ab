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

  // --- BeforeUnload-based HubSpot form submission tracking ---
  console.log("🚀 HubSpot BeforeUnload Tracking v2 LOADED at:", new Date().toISOString());
  console.log("📍 Current page:", window.location.href);
  console.log("📊 Tracking pixels available:");
  console.log("  - PostHog:", !!window.posthog);
  console.log("  - Facebook:", typeof fbq !== "undefined");
  console.log("  - Reddit:", typeof rdt !== "undefined");

  // Track form interactions to avoid false positives
  let formInteracted = false;
  let formFieldsFilled = 0;
  let lastInteractionTime = 0;

  // Monitor form interactions
  document.addEventListener('click', function(e) {
    // Check if click is within a HubSpot form area
    const formElement = e.target.closest('.hs-form, [id*="hbspt-form"], [id*="hubspot"], .hbspt-form');
    if (formElement) {
      formInteracted = true;
      lastInteractionTime = Date.now();
      if (DEBUG_ENABLED) {
        console.log("📝 Form interaction detected");
      }
      
      // Check if it's the submit button
      if (e.target.type === 'submit' || e.target.type === 'button' || e.target.tagName === 'BUTTON') {
        if (DEBUG_ENABLED) {
          console.log("🎯 Submit button clicked!");
        }
        
        // Fire pixels immediately on button click
        // This might work if the form validates client-side first
        setTimeout(() => {
          if (window.location.href === e.target.baseURI) {
            // Still on same page, might be validating
            if (DEBUG_ENABLED) {
              console.log("⏳ Form validating...");
            }
          }
        }, 100);
      }
    }
  });

  // Monitor form field changes
  document.addEventListener('change', function(e) {
    const formElement = e.target.closest('.hs-form, [id*="hbspt-form"], [id*="hubspot"], .hbspt-form');
    if (formElement) {
      formFieldsFilled++;
      formInteracted = true;
      lastInteractionTime = Date.now();
      if (DEBUG_ENABLED && formFieldsFilled === 1) {
        console.log("📝 Form fields being filled");
      }
    }
  });

  // Track form focus
  document.addEventListener('focusin', function(e) {
    const formElement = e.target.closest('.hs-form, [id*="hbspt-form"], [id*="hubspot"], .hbspt-form');
    if (formElement && e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      formInteracted = true;
      if (DEBUG_ENABLED && !lastInteractionTime) {
        console.log("📝 Form focused");
      }
      lastInteractionTime = Date.now();
    }
  });

  // Main tracking on beforeunload
  window.addEventListener('beforeunload', function(e) {
    // Check if we should track
    const shouldTrack = 
      formInteracted && 
      (Date.now() - lastInteractionTime) < 30000; // Within last 30 seconds

    if (!shouldTrack) {
      if (DEBUG_ENABLED && formInteracted) {
        console.log("⏭️ Skipping tracking - interaction too old (>30s)");
      }
      return;
    }

    if (DEBUG_ENABLED) {
      console.log("🚀 Page unloading after form interaction - TRACKING NOW!");
      console.log("  - Form interacted:", formInteracted);
      console.log("  - Fields filled:", formFieldsFilled);
      console.log("  - Time since last interaction:", Date.now() - lastInteractionTime, "ms");
    }

    // Method 1: PostHog with send_instantly (most reliable)
    if (window.posthog) {
      try {
        // PostHog's send_instantly uses sendBeacon internally
        posthog.capture(TRACKING_CONFIG.posthogEventName, {
          page_path: window.location.pathname,
          form_interacted: true,
          fields_filled: formFieldsFilled,
          method: "beforeunload"
        }, {
          send_instantly: true // This ensures it uses sendBeacon
        });
        
        if (DEBUG_ENABLED) {
          console.log("✅ PostHog event sent with sendBeacon");
        }
      } catch (error) {
        if (DEBUG_ENABLED) {
          console.error("PostHog error:", error);
        }
      }
    }

    // Method 2: Try Facebook Pixel (might work if fast enough)
    if (typeof fbq !== "undefined") {
      try {
        fbq("track", TRACKING_CONFIG.facebookEventName);
        // Also try additional events for better chance of success
        fbq("track", "SubmitApplication");
        
        if (DEBUG_ENABLED) {
          console.log("✅ Facebook Pixel fired (may or may not complete)");
        }
      } catch (error) {
        if (DEBUG_ENABLED) {
          console.error("Facebook error:", error);
        }
      }
    }

    // Method 3: Try Reddit Pixel
    if (typeof rdt !== "undefined") {
      try {
        rdt("track", TRACKING_CONFIG.redditEventName);
        
        if (DEBUG_ENABLED) {
          console.log("✅ Reddit Pixel fired (may or may not complete)");
        }
      } catch (error) {
        if (DEBUG_ENABLED) {
          console.error("Reddit error:", error);
        }
      }
    }

    // Method 4: Fallback image pixel for Facebook (old school but reliable)
    try {
      if (typeof fbq !== "undefined" && window.fbq.getState) {
        const pixelId = window.fbq.getState().pixels[0].id;
        if (pixelId) {
          const img = new Image(1, 1);
          img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=Lead&noscript=1`;
          
          if (DEBUG_ENABLED) {
            console.log("✅ Facebook image pixel fired as fallback");
          }
        }
      }
    } catch (error) {
      // Silent fail
    }

    // Method 5: Custom sendBeacon to your own endpoint (if you have one)
    if (navigator.sendBeacon) {
      try {
        const data = JSON.stringify({
          event: "form_submission",
          page: window.location.pathname,
          timestamp: Date.now(),
          fields_filled: formFieldsFilled
        });
        
        // You would need to replace this with your actual endpoint
        // navigator.sendBeacon('https://your-domain.com/api/track', data);
        
        if (DEBUG_ENABLED) {
          console.log("📡 sendBeacon data prepared:", data);
        }
      } catch (error) {
        // Silent fail
      }
    }

    // Small delay to allow pixels to fire
    // This is a hack but can help with pixel firing
    const start = Date.now();
    while (Date.now() - start < 50) {
      // Busy wait for 50ms to give pixels time to fire
    }
  });

  // Also track if we arrive at meetings.hubspot.com from any form page
  if (window.location.hostname === 'meetings.hubspot.com') {
    // Check if we came from your domain
    if (document.referrer && (document.referrer.includes('joinheard.com') || document.referrer.includes('webflow.io'))) {
      console.log("🎯 Arrived at HubSpot meetings from form page!");
      
      // Fire all pixels here as confirmation
      if (typeof fbq !== "undefined") {
        fbq("track", TRACKING_CONFIG.facebookEventName);
        fbq("track", "Schedule");
        console.log("✅ Facebook Pixel fired on meetings page");
      }
      
      if (window.posthog) {
        posthog.capture(TRACKING_CONFIG.posthogEventName + "_confirmed", {
          referrer: document.referrer,
          meeting_url: window.location.href
        });
        console.log("✅ PostHog confirmed event fired");
      }
      
      if (typeof rdt !== "undefined") {
        rdt("track", TRACKING_CONFIG.redditEventName);
        console.log("✅ Reddit Pixel fired on meetings page");
      }
    }
  }

  // Utility function to customize tracking for specific pages
  window.customizeHubSpotTracking = function(config) {
    Object.assign(TRACKING_CONFIG, config);
    if (DEBUG_ENABLED) {
      console.log("Tracking config updated:", TRACKING_CONFIG);
    }
  };

  // Log status periodically in debug mode
  if (DEBUG_ENABLED) {
    setInterval(() => {
      if (formInteracted) {
        console.log(`📊 Form tracking active - Fields filled: ${formFieldsFilled}, Last interaction: ${Math.round((Date.now() - lastInteractionTime) / 1000)}s ago`);
      }
    }, 10000);
  }

})(); // End IIFE