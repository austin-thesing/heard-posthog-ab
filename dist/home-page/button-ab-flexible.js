/**
 * Simple Button A/B Testing for Homepage
 * Changes button text to "Get Started" for test variant, keeps original for control
 * 
 * Usage:
 * <button data-ab-button="true">Book a Free Consultation</button>
 * 
 * Test variant: Changes text to "Get Started"
 * Control variant: Keeps original text
 */

(function() {
  "use strict";

  // Configuration
  const CONFIG = {
    featureFlagKey: "home-page-cta-text",
    experimentKey: "home-page-cta-text", 
    testButtonText: "Get Started",
    fadeInDuration: 300 // milliseconds
  };

  // Hide buttons initially to prevent flicker
  function hideButtonsInitially() {
    const abButtons = document.querySelectorAll('[data-ab-button="true"]');
    
    abButtons.forEach((button) => {
      button.style.setProperty("opacity", "0", "important");
      button.style.transition = `opacity ${CONFIG.fadeInDuration}ms ease`;
      
      // Store original text
      button.setAttribute('data-original-text', button.textContent.trim());
    });
  }

  // Apply button variant - simple text change
  function applyButtonVariant(variant) {
    const abButtons = document.querySelectorAll('[data-ab-button="true"]');
    
    abButtons.forEach((button) => {
      if (variant === "test") {
        // Change to test text
        button.textContent = CONFIG.testButtonText;
      } else {
        // Keep original text (control)
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
          button.textContent = originalText;
        }
      }
      
      // Fade in the button
      button.style.setProperty("opacity", "1", "important");
    });
  }

  // Simple button click tracking
  function setupButtonTracking() {
    let cachedVariant = null;
    let cachedFlagValue = null;

    function getCachedVariant() {
      if (cachedVariant === null && window.posthog) {
        cachedFlagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);
        cachedVariant = cachedFlagValue === "test" ? "test" : "control";
      }
      return { variant: cachedVariant, flagValue: cachedFlagValue };
    }

    document.addEventListener('click', function(e) {
      if (e.target.matches('[data-ab-button="true"]')) {
        const { variant, flagValue } = getCachedVariant();
        const button = e.target;
        
        if (window.posthog) {
          try {
            posthog.capture('homepage_button_clicked', {
              experiment_key: CONFIG.experimentKey,
              variant: variant,
              button_text: button.textContent,
              original_text: button.getAttribute('data-original-text'),
              button_id: button.id || 'unknown',
              page_path: window.location.pathname,
              feature_flag: CONFIG.featureFlagKey,
              feature_flag_value: flagValue,
              experiment_version: "1.0",
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            // Silent error handling
          }
        }
      }
    });
  }

  // Main initialization function
  function initButtonTesting() {
    // Hide buttons initially
    hideButtonsInitially();

    // Emergency fallback to control after timeout
    const emergencyTimeout = setTimeout(() => {
      applyButtonVariant("control");
      setupButtonTracking();
    }, 2000);

    try {
      // Check if PostHog is available
      if (!window.posthog) {
        throw new Error("PostHog is not available");
      }

      // Get feature flag value with callback
      let callbackFired = false;
      posthog.onFeatureFlags(() => {
        if (!callbackFired) {
          callbackFired = true;
          const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);
          const variant = flagValue === "test" ? "test" : "control";
          
          clearTimeout(emergencyTimeout);
          applyButtonVariant(variant);
          setupButtonTracking();
          
          // Track experiment exposure
          if (!window._homepageButtonExposureTracked) {
            window._homepageButtonExposureTracked = true;
            posthog.capture("experiment_exposure", {
              experiment_key: CONFIG.experimentKey,
              variant: variant,
              feature_flag: CONFIG.featureFlagKey,
              experiment_type: "button_text_test",
              page_path: window.location.pathname
            });
          }
        }
      });

      // Polling fallback
      let attempts = 0;
      const maxAttempts = 80; // 2 seconds / 25ms
      
      const pollForFlags = () => {
        attempts++;
        const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);

        if (flagValue !== undefined && !callbackFired) {
          callbackFired = true;
          const variant = flagValue === "test" ? "test" : "control";
          
          clearTimeout(emergencyTimeout);
          applyButtonVariant(variant);
          setupButtonTracking();
        } else if (attempts >= maxAttempts && !callbackFired) {
          callbackFired = true;
          clearTimeout(emergencyTimeout);
          applyButtonVariant("control");
          setupButtonTracking();
        } else if (!callbackFired) {
          setTimeout(pollForFlags, 25);
        }
      };

      setTimeout(pollForFlags, 25);

    } catch (error) {
      clearTimeout(emergencyTimeout);
      applyButtonVariant("control");
      setupButtonTracking();
      
      if (window.posthog) {
        posthog.capture("homepage_button_test_error", {
          experiment_key: CONFIG.experimentKey,
          error: error.message,
          page_path: window.location.pathname
        });
      }
    }
  }



  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initButtonTesting);
  } else {
    initButtonTesting();
  }

  // Export configuration for external modification if needed
  window.HomepageButtonConfig = CONFIG;

})();