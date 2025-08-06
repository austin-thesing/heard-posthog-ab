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

  // --- Modern HubSpot embed tracking ---
  console.log("🚀 HubSpot Modern Embed Tracking v1 LOADED at:", new Date().toISOString());
  console.log("📍 Current page:", window.location.href);
  console.log("📊 Tracking pixels available:");
  console.log("  - PostHog:", !!window.posthog);
  console.log("  - Facebook:", typeof fbq !== "undefined");
  console.log("  - Reddit:", typeof rdt !== "undefined");

  // Track form interactions
  let formInteracted = false;
  let formSubmitted = false;
  let lastInteractionTime = 0;

  // Function to fire all tracking pixels
  function fireTrackingPixels(method = "unknown") {
    if (formSubmitted) return; // Prevent double firing
    formSubmitted = true;

    console.log("🎉 FIRING TRACKING PIXELS - Method:", method);

    // Fire Facebook Pixel
    if (typeof fbq !== "undefined") {
      try {
        fbq("track", TRACKING_CONFIG.facebookEventName);
        console.log("✅ Facebook Pixel Lead event fired");
      } catch (error) {
        console.error("❌ Facebook Pixel error:", error);
      }
    } else {
      console.log("⚠️ Facebook Pixel not available");
    }

    // Fire PostHog event
    if (window.posthog) {
      try {
        posthog.capture(TRACKING_CONFIG.posthogEventName, {
          page_path: window.location.pathname,
          timestamp: new Date().toISOString(),
          method: method
        });
        console.log("✅ PostHog event fired:", TRACKING_CONFIG.posthogEventName);
      } catch (error) {
        console.error("❌ PostHog error:", error);
      }
    } else {
      console.log("⚠️ PostHog not available");
    }

    // Fire Reddit Pixel
    if (typeof rdt !== "undefined") {
      try {
        rdt("track", TRACKING_CONFIG.redditEventName);
        console.log("✅ Reddit Pixel Lead event fired");
      } catch (error) {
        console.error("❌ Reddit Pixel error:", error);
      }
    } else {
      console.log("⚠️ Reddit Pixel not available");
    }
  }

  // Method 1: Monitor for HubSpot form container and form elements
  function monitorHubSpotForms() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if this is a HubSpot form or contains one
            const hsForm = node.querySelector ? 
              node.querySelector('.hs-form, form[data-hs-form], [class*="hs-"], [id*="hs-"]') : 
              (node.classList && (node.classList.contains('hs-form') || node.id.includes('hs-')) ? node : null);
            
            if (hsForm) {
              console.log("📝 HubSpot form detected in DOM:", hsForm);
              setupFormMonitoring(hsForm);
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also check existing forms
    setTimeout(() => {
      const existingForms = document.querySelectorAll('.hs-form, form[data-hs-form], [class*="hs-"], [id*="hs-"], .hs-form-frame');
      console.log(`🔍 Found ${existingForms.length} potential HubSpot form elements`);
      existingForms.forEach(form => setupFormMonitoring(form));
    }, 1000);
  }

  // Setup monitoring for a specific form
  function setupFormMonitoring(formElement) {
    console.log("🎯 Setting up monitoring for form:", formElement);

    // Check if this is a hs-form-frame container
    if (formElement.classList.contains('hs-form-frame')) {
      console.log("📦 Found hs-form-frame container, monitoring for iframe creation...");
      
      // Monitor for iframe creation inside this container
      const iframeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.tagName === 'IFRAME') {
              console.log("🖼️ HubSpot iframe created:", node.src);
              
              // Set up click monitoring on the iframe itself
              node.addEventListener('load', () => {
                console.log("✅ HubSpot iframe loaded");
                
                // Monitor clicks on the iframe (indicates form interaction)
                node.addEventListener('click', () => {
                  formInteracted = true;
                  lastInteractionTime = Date.now();
                  console.log("📝 HubSpot iframe clicked (form interaction)");
                });
              });
            }
          });
        });
      });
      
      iframeObserver.observe(formElement, {
        childList: true,
        subtree: true
      });
      
      // Also set up general click monitoring on the container
      formElement.addEventListener('click', function(e) {
        formInteracted = true;
        lastInteractionTime = Date.now();
        console.log("📝 Form container clicked");
      }, true);
      
      return; // Don't set up regular form monitoring for containers
    }

    // Regular form monitoring for actual form elements
    formElement.addEventListener('click', function(e) {
      formInteracted = true;
      lastInteractionTime = Date.now();
      console.log("📝 Form clicked");

      // Check if it's a submit button
      if (e.target.type === 'submit' || 
          e.target.tagName === 'BUTTON' || 
          e.target.classList.contains('hs-button') ||
          e.target.textContent.toLowerCase().includes('submit') ||
          e.target.textContent.toLowerCase().includes('book') ||
          e.target.textContent.toLowerCase().includes('send')) {
        
        console.log("🎯 Submit button clicked!");
        
        // Fire pixels immediately
        setTimeout(() => {
          fireTrackingPixels("button_click");
        }, 100);
      }
    }, true);

    // Monitor input changes
    formElement.addEventListener('input', function(e) {
      formInteracted = true;
      lastInteractionTime = Date.now();
    }, true);

    formElement.addEventListener('change', function(e) {
      formInteracted = true;
      lastInteractionTime = Date.now();
    }, true);

    // Monitor form submission
    formElement.addEventListener('submit', function(e) {
      console.log("📤 Form submit event detected!");
      formInteracted = true;
      fireTrackingPixels("form_submit");
    }, true);
  }

  // Method 2: Monitor for navigation/redirect
  let currentUrl = window.location.href;
  const checkForRedirect = setInterval(() => {
    if (window.location.href !== currentUrl) {
      console.log("🚀 Page is redirecting to:", window.location.href);
      
      if (formInteracted && !formSubmitted) {
        fireTrackingPixels("redirect_detected");
      }
      
      clearInterval(checkForRedirect);
    }
  }, 100);

  // Method 3: Monitor ANY interaction with the page (more aggressive)
  let anyInteraction = false;
  let interactionCount = 0;
  
  // Monitor all clicks on the page
  document.addEventListener('click', function(e) {
    anyInteraction = true;
    interactionCount++;
    lastInteractionTime = Date.now();
    
    // Check if click is near a HubSpot form
    const hsFormFrame = document.querySelector('.hs-form-frame');
    if (hsFormFrame) {
      const rect = hsFormFrame.getBoundingClientRect();
      const clickX = e.clientX;
      const clickY = e.clientY;
      
      // Check if click is within or near the form area
      if (clickX >= rect.left - 50 && clickX <= rect.right + 50 &&
          clickY >= rect.top - 50 && clickY <= rect.bottom + 50) {
        formInteracted = true;
        console.log("📝 Click detected near HubSpot form area");
      }
    }
  }, true);

  // Method 4: BeforeUnload as final fallback
  window.addEventListener('beforeunload', function(e) {
    const shouldTrack = (formInteracted || (anyInteraction && interactionCount >= 3)) && 
                       !formSubmitted && 
                       (Date.now() - lastInteractionTime) < 60000; // 1 minute window
    
    if (shouldTrack) {
      console.log("🚨 Page unloading with interaction - firing pixels!");
      console.log(`  - Form interacted: ${formInteracted}`);
      console.log(`  - Total interactions: ${interactionCount}`);
      console.log(`  - Time since last: ${Math.round((Date.now() - lastInteractionTime) / 1000)}s`);
      
      // Use PostHog's send_instantly for reliability
      if (window.posthog) {
        try {
          posthog.capture(TRACKING_CONFIG.posthogEventName, {
            page_path: window.location.pathname,
            method: "beforeunload",
            interaction_count: interactionCount,
            form_interacted: formInteracted
          }, {
            send_instantly: true
          });
          console.log("✅ PostHog beforeunload fired");
        } catch (error) {
          console.error("PostHog beforeunload error:", error);
        }
      }

      // Try other pixels
      try {
        if (typeof fbq !== "undefined") {
          fbq("track", TRACKING_CONFIG.facebookEventName);
          console.log("✅ Facebook beforeunload fired");
        }
        if (typeof rdt !== "undefined") {
          rdt("track", TRACKING_CONFIG.redditEventName);
          console.log("✅ Reddit beforeunload fired");
        }
      } catch (error) {
        console.error("Pixel error:", error);
      }
    }
  });

  // Method 4: Monitor for HubSpot's own success indicators
  function monitorHubSpotSuccess() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Look for success messages or redirects
            const successIndicators = [
              '.hs-form-success',
              '.submitted-message',
              '[class*="success"]',
              '[class*="thank"]'
            ];
            
            const hasSuccess = successIndicators.some(selector => {
              return node.matches && node.matches(selector) || 
                     (node.querySelector && node.querySelector(selector));
            });

            if (hasSuccess && formInteracted && !formSubmitted) {
              console.log("✅ HubSpot success indicator detected!");
              fireTrackingPixels("success_message");
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Start all monitoring methods
  monitorHubSpotForms();
  monitorHubSpotSuccess();

  // Stop redirect monitoring after 2 minutes
  setTimeout(() => {
    clearInterval(checkForRedirect);
  }, 120000);

  // Status logging
  if (DEBUG_ENABLED) {
    setInterval(() => {
      if (formInteracted) {
        console.log(`📊 Form Status: Interacted=${formInteracted}, Submitted=${formSubmitted}, LastInteraction=${Math.round((Date.now() - lastInteractionTime) / 1000)}s ago`);
      }
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
    posthog.capture("hubspot_modern_tracking_loaded", {
      page_url: window.location.href,
      tracking_version: "modern_v1"
    });
  }

})(); // End IIFE