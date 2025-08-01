/**
 * Flexible Button A/B Testing Extension
 * Alternative implementation using data attributes for different button texts
 * 
 * Usage:
 * <button data-ab-button="true" 
 *         data-control-text="Book a Free Consultation" 
 *         data-test-text="Get Started">
 *   Book a Free Consultation
 * </button>
 * 
 * This version allows different test texts per button and can be easily extended
 * for multiple variants or different button properties (colors, sizes, etc.)
 */

(function() {
  "use strict";

  // Configuration - can be customized per implementation
  const BUTTON_CONFIG = {
    featureFlagKey: "homepage-button-test", // Can be different from main experiment
    experimentKey: "homepage-button-ab-test",
    defaultTestText: "Get Started", // Fallback if data-test-text not provided
    fadeInDuration: 300 // milliseconds
  };

  // Hide buttons initially to prevent flicker
  function hideButtonsInitially() {
    const abButtons = document.querySelectorAll('[data-ab-button="true"]');
    
    abButtons.forEach((button) => {
      button.style.setProperty("opacity", "0", "important");
      button.style.transition = `opacity ${BUTTON_CONFIG.fadeInDuration}ms ease`;
      
      // Store original text if not already stored
      if (!button.hasAttribute('data-original-text')) {
        button.setAttribute('data-original-text', button.textContent.trim());
      }
      
      // Validate data attributes
      const controlText = button.getAttribute('data-control-text');
      const testText = button.getAttribute('data-test-text');
      
      if (!controlText) {
        // Use current text as control if not specified
        button.setAttribute('data-control-text', button.textContent.trim());
      }
      
      if (!testText) {
        // Use default test text if not specified
        button.setAttribute('data-test-text', BUTTON_CONFIG.defaultTestText);
      }
    });
  }

  // Apply button variant with flexible text options
  function applyFlexibleButtonVariant(variant) {
    const abButtons = document.querySelectorAll('[data-ab-button="true"]');
    
    abButtons.forEach((button) => {
      let newText;
      
      if (variant === "test") {
        newText = button.getAttribute('data-test-text') || BUTTON_CONFIG.defaultTestText;
      } else {
        newText = button.getAttribute('data-control-text') || button.getAttribute('data-original-text');
      }
      
      if (newText) {
        button.textContent = newText;
      }
      
      // Apply any additional variant-specific styling
      button.setAttribute('data-current-variant', variant);
      
      // Fade in the button
      button.style.setProperty("opacity", "1", "important");
    });
  }

  // Enhanced button click tracking with flexible attributes
  function setupFlexibleButtonTracking() {
    let cachedVariant = null;
    let cachedFlagValue = null;

    function getCachedVariant() {
      if (cachedVariant === null && window.posthog) {
        cachedFlagValue = posthog.getFeatureFlag(BUTTON_CONFIG.featureFlagKey);
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
            posthog.capture('flexible_ab_button_clicked', {
              experiment_key: BUTTON_CONFIG.experimentKey,
              variant: variant,
              button_text: button.textContent,
              control_text: button.getAttribute('data-control-text'),
              test_text: button.getAttribute('data-test-text'),
              original_text: button.getAttribute('data-original-text'),
              button_id: button.id || 'unknown',
              button_class: button.className || 'unknown',
              page_path: window.location.pathname,
              feature_flag: BUTTON_CONFIG.featureFlagKey,
              feature_flag_value: flagValue,
              experiment_version: "1.0",
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.warn('Button tracking error:', error);
          }
        }
      }
    });
  }

  // Main initialization function for flexible button testing
  function initFlexibleButtonTesting() {
    // Hide buttons initially
    hideButtonsInitially();

    // Emergency fallback to control after timeout
    const emergencyTimeout = setTimeout(() => {
      applyFlexibleButtonVariant("control");
      setupFlexibleButtonTracking();
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
          const flagValue = posthog.getFeatureFlag(BUTTON_CONFIG.featureFlagKey);
          const variant = flagValue === "test" ? "test" : "control";
          
          clearTimeout(emergencyTimeout);
          applyFlexibleButtonVariant(variant);
          setupFlexibleButtonTracking();
          
          // Track experiment exposure
          if (!window._flexibleButtonExposureTracked) {
            window._flexibleButtonExposureTracked = true;
            posthog.capture("experiment_exposure", {
              experiment_key: BUTTON_CONFIG.experimentKey,
              variant: variant,
              feature_flag: BUTTON_CONFIG.featureFlagKey,
              experiment_type: "flexible_button_test",
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
        const flagValue = posthog.getFeatureFlag(BUTTON_CONFIG.featureFlagKey);

        if (flagValue !== undefined && !callbackFired) {
          callbackFired = true;
          const variant = flagValue === "test" ? "test" : "control";
          
          clearTimeout(emergencyTimeout);
          applyFlexibleButtonVariant(variant);
          setupFlexibleButtonTracking();
        } else if (attempts >= maxAttempts && !callbackFired) {
          callbackFired = true;
          clearTimeout(emergencyTimeout);
          applyFlexibleButtonVariant("control");
          setupFlexibleButtonTracking();
        } else if (!callbackFired) {
          setTimeout(pollForFlags, 25);
        }
      };

      setTimeout(pollForFlags, 25);

    } catch (error) {
      clearTimeout(emergencyTimeout);
      applyFlexibleButtonVariant("control");
      setupFlexibleButtonTracking();
      
      if (window.posthog) {
        posthog.capture("flexible_button_test_error", {
          experiment_key: BUTTON_CONFIG.experimentKey,
          error: error.message,
          page_path: window.location.pathname
        });
      }
    }
  }

  // CSS injection for flexible button testing
  function injectFlexibleButtonCSS() {
    const style = document.createElement('style');
    style.textContent = `
      /* Flexible button A/B testing styles */
      [data-ab-button="true"] {
        opacity: 0 !important;
        transition: opacity ${BUTTON_CONFIG.fadeInDuration}ms ease;
      }
      
      /* Variant-specific styling examples */
      [data-ab-button="true"][data-current-variant="test"] {
        /* Add test-specific styles here if needed */
      }
      
      [data-ab-button="true"][data-current-variant="control"] {
        /* Add control-specific styles here if needed */
      }
      
      /* Fallback: Show buttons after 2.5s if script fails */
      @keyframes show-button-fallback {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      
      [data-ab-button="true"] {
        animation: show-button-fallback 0s 2.5s forwards;
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      injectFlexibleButtonCSS();
      initFlexibleButtonTesting();
    });
  } else {
    injectFlexibleButtonCSS();
    initFlexibleButtonTesting();
  }

  // Export configuration for external modification if needed
  window.FlexibleButtonABConfig = BUTTON_CONFIG;

})();