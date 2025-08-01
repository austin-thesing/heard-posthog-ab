(()=>{(function(){"use strict";const a={featureFlagKey:"homepage-button-test",experimentKey:"homepage-button-ab-test",defaultTestText:"Get Started",fadeInDuration:300};function f(){document.querySelectorAll('[data-ab-button="true"]').forEach(t=>{t.style.setProperty("opacity","0","important"),t.style.transition=`opacity ${a.fadeInDuration}ms ease`,t.hasAttribute("data-original-text")||t.setAttribute("data-original-text",t.textContent.trim());const o=t.getAttribute("data-control-text"),n=t.getAttribute("data-test-text");o||t.setAttribute("data-control-text",t.textContent.trim()),n||t.setAttribute("data-test-text",a.defaultTestText)})}function r(e){document.querySelectorAll('[data-ab-button="true"]').forEach(o=>{let n;e==="test"?n=o.getAttribute("data-test-text")||a.defaultTestText:n=o.getAttribute("data-control-text")||o.getAttribute("data-original-text"),n&&(o.textContent=n),o.setAttribute("data-current-variant",e),o.style.setProperty("opacity","1","important")})}function l(){let e=null,t=null;function o(){return e===null&&window.posthog&&(t=posthog.getFeatureFlag(a.featureFlagKey),e=t==="test"?"test":"control"),{variant:e,flagValue:t}}document.addEventListener("click",function(n){if(n.target.matches('[data-ab-button="true"]')){const{variant:u,flagValue:s}=o(),i=n.target;if(window.posthog)try{posthog.capture("flexible_ab_button_clicked",{experiment_key:a.experimentKey,variant:u,button_text:i.textContent,control_text:i.getAttribute("data-control-text"),test_text:i.getAttribute("data-test-text"),original_text:i.getAttribute("data-original-text"),button_id:i.id||"unknown",button_class:i.className||"unknown",page_path:window.location.pathname,feature_flag:a.featureFlagKey,feature_flag_value:s,experiment_version:"1.0",timestamp:new Date().toISOString()})}catch(g){}}})}function c(){f();const e=setTimeout(()=>{r("control"),l()},2e3);try{if(!window.posthog)throw new Error("PostHog is not available");let t=!1;posthog.onFeatureFlags(()=>{if(!t){t=!0;const i=posthog.getFeatureFlag(a.featureFlagKey)==="test"?"test":"control";clearTimeout(e),r(i),l(),window._flexibleButtonExposureTracked||(window._flexibleButtonExposureTracked=!0,posthog.capture("experiment_exposure",{experiment_key:a.experimentKey,variant:i,feature_flag:a.featureFlagKey,experiment_type:"flexible_button_test",page_path:window.location.pathname}))}});let o=0;const n=80,u=()=>{o++;const s=posthog.getFeatureFlag(a.featureFlagKey);if(s!==void 0&&!t){t=!0;const i=s==="test"?"test":"control";clearTimeout(e),r(i),l()}else o>=n&&!t?(t=!0,clearTimeout(e),r("control"),l()):t||setTimeout(u,25)};setTimeout(u,25)}catch(t){clearTimeout(e),r("control"),l(),window.posthog&&posthog.capture("flexible_button_test_error",{experiment_key:a.experimentKey,error:t.message,page_path:window.location.pathname})}}function d(){const e=document.createElement("style");e.textContent=`
      /* Flexible button A/B testing styles */
      [data-ab-button="true"] {
        opacity: 0 !important;
        transition: opacity ${a.fadeInDuration}ms ease;
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
    `,document.head.appendChild(e)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",function(){d(),c()}):(d(),c()),window.FlexibleButtonABConfig=a})();})();
