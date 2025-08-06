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

  // --- Precise HubSpot form tracking (no false positives) ---
  console.log("🚀 HubSpot Precise Tracking v1 LOADED at:", new Date().toISOString());
  console.log("📍 Current page:", window.location.href);

  // Very strict tracking - only fire on confirmed form submission
  let formSubmitted = false;
  let formFieldsInteracted = 0;
  let submitButtonClicked = false;

  // Function to fire all tracking pixels (only called on confirmed submission)
  function fireTrackingPixels(method = "unknown") {
    if (formSubmitted) return; // Prevent double firing
    formSubmitted = true;

    console.log("🎉 CONFIRMED FORM SUBMISSION - FIRING PIXELS - Method:", method);

    // Fire Facebook Pixel
    if (typeof fbq !== "undefined") {
      try {
        fbq("track", TRACKING_CONFIG.facebookEventName);
        console.log("✅ Facebook Pixel Lead event fired");
      } catch (error) {
        console.error("❌ Facebook Pixel error:", error);
      }
    }

    // Fire PostHog event
    if (window.posthog) {
      try {
        posthog.capture(TRACKING_CONFIG.posthogEventName, {
          page_path: window.location.pathname,
          method: method,
          fields_interacted: formFieldsInteracted
        });
        console.log("✅ PostHog event fired");
      } catch (error) {
        console.error("❌ PostHog error:", error);
      }
    }

    // Fire Reddit Pixel
    if (typeof rdt !== "undefined") {
      try {
        rdt("track", TRACKING_CONFIG.redditEventName);
        console.log("✅ Reddit Pixel Lead event fired");
      } catch (error) {
        console.error("❌ Reddit Pixel error:", error);
      }
    }
  }

  // Method 1: Monitor for redirect to meetings.hubspot.com with form data
  let currentUrl = window.location.href;
  const checkForFormRedirect = setInterval(() => {
    if (window.location.href !== currentUrl) {
      const newUrl = window.location.href;
      
      // Very specific check: redirect to meetings.hubspot.com with form parameters
      if (newUrl.includes('meetings.hubspot.com') && 
          newUrl.includes('referrer=FORMS') &&
          (newUrl.includes('firstname=') || newUrl.includes('email='))) {
        
        console.log("🎯 CONFIRMED: Redirecting to HubSpot meetings with form data");
        console.log("🔗 Redirect URL:", newUrl);
        
        fireTrackingPixels("confirmed_redirect");
        clearInterval(checkForFormRedirect);
        return;
      }
      
      // If redirecting somewhere else, stop monitoring
      clearInterval(checkForFormRedirect);
    }
  }, 100);

  // Method 2: Monitor iframe for form field interactions (more precise)
  function monitorHubSpotIframe() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.tagName === 'IFRAME' && 
              node.src && node.src.includes('hsforms.net')) {
            
            console.log("🖼️ HubSpot form iframe detected:", node.src);
            
            // Monitor iframe for any activity (limited by cross-origin)
            node.addEventListener('load', () => {
              console.log("✅ HubSpot iframe loaded");
              
              // Set up very conservative interaction detection
              let iframeClicks = 0;
              
              node.addEventListener('click', () => {
                iframeClicks++;
                console.log(`📝 Iframe click #${iframeClicks}`);
                
                // Only consider it form interaction after multiple clicks
                if (iframeClicks >= 2) {
                  formFieldsInteracted++;
                  console.log("📝 Multiple iframe clicks - likely form interaction");
                }
              });
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Method 3: Monitor for HubSpot's success/redirect patterns
  function monitorHubSpotPatterns() {
    // Watch for URL changes that indicate form submission
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      originalPushState.apply(history, arguments);
      checkUrlForFormSubmission();
    };
    
    history.replaceState = function() {
      originalReplaceState.apply(history, arguments);
      checkUrlForFormSubmission();
    };
    
    window.addEventListener('popstate', checkUrlForFormSubmission);
  }

  function checkUrlForFormSubmission() {
    const url = window.location.href;
    
    // Check for HubSpot form submission indicators
    if (url.includes('hsFormSubmitted=true') || 
        url.includes('submissionGuid=') ||
        url.includes('thank-you') ||
        url.includes('success')) {
      
      console.log("🎯 URL indicates form submission:", url);
      fireTrackingPixels("url_pattern");
    }
  }

  // Method 4: Very conservative beforeunload (only with strong indicators)
  window.addEventListener('beforeunload', function(e) {
    // Only fire if we have VERY strong indicators of form submission
    const strongIndicators = 
      formFieldsInteracted >= 3 && // Multiple form interactions
      submitButtonClicked && // Submit button was clicked
      !formSubmitted; // Haven't already tracked
    
    if (strongIndicators) {
      console.log("🚨 Strong form submission indicators - firing beforeunload tracking");
      
      // Use PostHog's send_instantly for reliability
      if (window.posthog) {
        try {
          posthog.capture(TRACKING_CONFIG.posthogEventName, {
            page_path: window.location.pathname,
            method: "beforeunload_confirmed",
            fields_interacted: formFieldsInteracted
          }, {
            send_instantly: true
          });
        } catch (error) {
          console.error("PostHog beforeunload error:", error);
        }
      }

      // Try other pixels
      try {
        if (typeof fbq !== "undefined") {
          fbq("track", TRACKING_CONFIG.facebookEventName);
        }
        if (typeof rdt !== "undefined") {
          rdt("track", TRACKING_CONFIG.redditEventName);
        }
      } catch (error) {
        // Silent fail
      }
    }
  });

  // Start monitoring
  monitorHubSpotIframe();
  monitorHubSpotPatterns();

  // Stop redirect monitoring after 5 minutes
  setTimeout(() => {
    clearInterval(checkForFormRedirect);
  }, 300000);

  // Status logging (only show when there's activity)
  if (DEBUG_ENABLED) {
    setInterval(() => {
      if (formFieldsInteracted > 0 || submitButtonClicked) {
        console.log(`📊 Form Status: Fields=${formFieldsInteracted}, SubmitClicked=${submitButtonClicked}, Submitted=${formSubmitted}`);
      }
    }, 15000);
  }

  // Utility function
  window.customizeHubSpotTracking = function(config) {
    Object.assign(TRACKING_CONFIG, config);
    if (DEBUG_ENABLED) {
      console.log("Tracking config updated:", TRACKING_CONFIG);
    }
  };

})(); // End IIFE