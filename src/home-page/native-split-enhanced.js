/**
 * PostHog Button A/B Test Script for Homepage
 * Simple implementation that changes button text from original to "Get Started"
 * Uses PostHog feature flags with anti-flicker protection
 */

(function () {
  "use strict";

  // Configuration
  const CONFIG = {
    featureFlagKey: "homepage-button-test",
    experimentKey: "homepage-button-ab-test",
    testButtonText: "Get Started",
    maxWaitTime: 2000, // 2 seconds
    debug: false // Set to true for debugging
  };

  function log(...args) {
    if (CONFIG.debug) {
      console.log('[Homepage Button A/B]', ...args);
    }
  }

  // Hide buttons initially to prevent flicker
  function hideButtonsInitially() {
    const abButtons = document.querySelectorAll('[data-ab-button="true"]');
    
    log('Found', abButtons.length, 'buttons to test');
    
    abButtons.forEach((button) => {
      button.style.setProperty("opacity", "0", "important");
      button.style.transition = "opacity 0.3s ease";
      
      // Store original text
      const originalText = button.textContent.trim();
      button.setAttribute('data-original-text', originalText);
      
      log('Button stored with original text:', originalText);
    });

    // Also hide elements marked to wait for button readiness
    const elementsToHide = document.querySelectorAll('[data-hide-until-button-ready="true"]');
    elementsToHide.forEach((el) => {
      el.style.setProperty("opacity", "0", "important");
      el.style.transition = "opacity 0.3s ease";
    });
  }

  // Apply button variant based on test assignment
  function applyButtonVariant(variant) {
    const abButtons = document.querySelectorAll('[data-ab-button="true"]');
    
    log('Applying variant:', variant, 'to', abButtons.length, 'buttons');
    
    abButtons.forEach((button) => {
      if (variant === "test") {
        button.textContent = CONFIG.testButtonText;
        log('Button changed to test text:', CONFIG.testButtonText);
      } else {
        // Keep original text (control)
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
          button.textContent = originalText;
          log('Button kept original text:', originalText);
        }
      }
      
      // Fade in the button
      button.style.setProperty("opacity", "1", "important");
    });

    // Show elements that were waiting for button readiness
    document.querySelectorAll('[data-hide-until-button-ready="true"]').forEach((el) => {
      el.style.setProperty("opacity", "1", "important");
    });

    // Set body attribute for CSS targeting if needed
    document.body.setAttribute('data-button-variant', variant);
  }

  // Get feature flag value from PostHog
  function getFeatureFlagValue() {
    return new Promise((resolve, reject) => {
      if (!window.posthog) {
        reject(new Error("PostHog not initialized"));
        return;
      }

      log('Getting feature flag:', CONFIG.featureFlagKey);

      // Register callback for feature flags
      let callbackFired = false;
      posthog.onFeatureFlags(() => {
        if (!callbackFired) {
          callbackFired = true;
          const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);
          log('Feature flag callback fired with value:', flagValue);
          resolve(flagValue);
        }
      });

      // Also poll for feature flags
      let attempts = 0;
      const maxAttempts = Math.floor(CONFIG.maxWaitTime / 25);

      const pollForFlags = () => {
        attempts++;
        const flagValue = posthog.getFeatureFlag(CONFIG.featureFlagKey);

        if (flagValue !== undefined && !callbackFired) {
          callbackFired = true;
          log('Feature flag polling succeeded with value:', flagValue);
          resolve(flagValue);
        } else if (attempts >= maxAttempts && !callbackFired) {
          callbackFired = true;
          log('Feature flag polling timed out');
          reject(new Error("Feature flag timeout"));
        } else if (!callbackFired) {
          setTimeout(pollForFlags, 25);
        }
      };

      // Start polling
      setTimeout(pollForFlags, 25);
    });
  }

  // Track experiment exposure
  function trackExperimentExposure(variant) {
    if (window.posthog && !window._homepageButtonExposureTracked) {
      window._homepageButtonExposureTracked = true;

      try {
        log('Tracking experiment exposure for variant:', variant);

        // Use PostHog's native experiment tracking
        posthog.capture("$feature_flag_called", {
          $feature_flag: CONFIG.featureFlagKey,
          $feature_flag_response: variant,
          $feature_flag_payload: {
            experiment_key: CONFIG.experimentKey,
            variant: variant,
            experiment_type: "button_text_test",
            version: "1.0"
          },
        });

        // Also track custom event for additional analysis
        posthog.capture("experiment_exposure", {
          experiment_key: CONFIG.experimentKey,
          variant: variant,
          page_path: window.location.pathname,
          feature_flag: CONFIG.featureFlagKey,
          experiment_version: "1.0",
          experiment_type: "button_text_test"
        });

      } catch (error) {
        log('Error tracking exposure:', error);
        window._homepageButtonExposureTracked = false;
      }
    }
  }

  // Setup button click tracking
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

    // Track button clicks
    document.addEventListener('click', function(e) {
      if (e.target.matches('[data-ab-button="true"]')) {
        const { variant, flagValue } = getCachedVariant();
        
        if (window.posthog) {
          try {
            log('Tracking button click for variant:', variant);

            posthog.capture('homepage_button_clicked', {
              experiment_key: CONFIG.experimentKey,
              variant: variant,
              button_text: e.target.textContent,
              original_text: e.target.getAttribute('data-original-text'),
              button_id: e.target.id || 'unknown',
              button_class: e.target.className || 'unknown',
              page_path: window.location.pathname,
              feature_flag: CONFIG.featureFlagKey,
              feature_flag_value: flagValue,
              experiment_version: "1.0",
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            log('Error tracking button click:', error);
          }
        }
      }
    });
  }

  // Main experiment execution
  async function runButtonExperiment() {
    log('Starting homepage button experiment');

    // Hide buttons initially to prevent flicker
    hideButtonsInitially();

    // Emergency fallback to control after max wait time
    const emergencyTimeout = setTimeout(() => {
      log('Emergency timeout triggered, showing control variant');
      applyButtonVariant("control");
      setupButtonTracking();
    }, CONFIG.maxWaitTime);

    try {
      // Check if PostHog is available
      if (!window.posthog) {
        throw new Error("PostHog is not available on window.posthog");
      }

      log('PostHog is available, getting feature flag');

      // Get feature flag value
      const flagValue = await getFeatureFlagValue();

      // Clear emergency timeout since we got the flag value
      clearTimeout(emergencyTimeout);

      // Determine variant based on feature flag
      const variant = flagValue === "test" ? "test" : "control";
      
      log('Determined variant:', variant, 'from flag value:', flagValue);

      // Track experiment exposure
      trackExperimentExposure(variant);

      // Apply button variant
      applyButtonVariant(variant);

      // Setup button click tracking
      setupButtonTracking();

      // Test PostHog connection
      if (window.posthog) {
        try {
          posthog.capture("homepage_button_test_initialized", {
            experiment_key: CONFIG.experimentKey,
            variant: variant,
            timestamp: new Date().toISOString(),
            page_url: window.location.href,
          });
        } catch (error) {
          log('Error sending test event:', error);
        }
      }

    } catch (error) {
      log('Experiment error:', error);

      // Clear emergency timeout
      clearTimeout(emergencyTimeout);

      // Track error
      if (window.posthog) {
        try {
          posthog.capture("homepage_button_test_error", {
            experiment_key: CONFIG.experimentKey,
            error: error.message,
            page_path: window.location.pathname,
            error_type: "initialization_error",
          });
        } catch (trackingError) {
          log('Error tracking error:', trackingError);
        }
      }

      // Fallback to control
      applyButtonVariant("control");
      setupButtonTracking();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runButtonExperiment);
  } else {
    runButtonExperiment();
  }

  // Export config for external modification if needed
  window.HomepageButtonABConfig = CONFIG;

})();