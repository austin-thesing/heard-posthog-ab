// Debug window for persistent logging
let debugWindow = null;
let debugLogs = [];

function openDebugWindow() {
  if (!debugWindow || debugWindow.closed) {
    debugWindow = window.open('', 'debug', 'width=600,height=400,scrollbars=yes');
    debugWindow.document.write(`
      <html>
        <head><title>Form Tracking Debug Log</title></head>
        <body style="font-family: monospace; padding: 10px; background: #000; color: #0f0;">
          <h3>Form Tracking Debug Log</h3>
          <div id="logs"></div>
        </body>
      </html>
    `);
  }
  return debugWindow;
}

function updateDebugWindow() {
  if (debugWindow && !debugWindow.closed) {
    const logsDiv = debugWindow.document.getElementById('logs');
    if (logsDiv) {
      logsDiv.innerHTML = debugLogs.map(log => `<div>${log}</div>`).join('');
      logsDiv.scrollTop = logsDiv.scrollHeight;
    }
  }
}

function debugLog(...args) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const message = `[${timestamp}] ${args.join(' ')}`;
  console.log(message);
  
  // Also log to debug window
  debugLogs.push(message);
  if (debugLogs.length > 100) debugLogs.shift(); // Keep only last 100 logs
  
  openDebugWindow();
  updateDebugWindow();
}

// --- HubSpot iframe form submission tracking ---
debugLog("Setting up iframe message listener");

window.addEventListener("message", function (event) {
  // Filter out React dev tools and other noise
  const isReactDevTools = event.origin.includes('react-devtools') || 
                         (event.data && typeof event.data === 'object' && event.data.source === 'react-devtools');
  const isExtension = event.origin.includes('extension://') || event.origin.includes('chrome-extension://');
  const isInspector = event.data && typeof event.data === 'object' && 
                     (event.data.type === 'inspector' || JSON.stringify(event.data).includes('inspector'));
  
  // Skip logging noise
  if (isReactDevTools || isExtension || isInspector) {
    return;
  }
  
  // Debug: Log relevant messages only
  debugLog("Message received from:", event.origin, "data:", event.data);
  
  // Log the type of data we received
  if (event.data) {
    debugLog("Message data type:", typeof event.data, "value:", JSON.stringify(event.data));
  } else {
    debugLog("Message with no data received");
  }
  
  // Handle HubSpot form callbacks - try multiple possible formats
  let isHubSpotFormEvent = false;
  let eventName = null;
  
  // Format 1: Standard hsFormCallback
  if (event.data && typeof event.data === "object" && event.data.type === "hsFormCallback") {
    debugLog("HubSpot form callback (standard format):", event.data.eventName, JSON.stringify(event.data));
    isHubSpotFormEvent = true;
    eventName = event.data.eventName;
  }
  
  // Format 2: Direct event name
  if (event.data && typeof event.data === "object" && event.data.eventName) {
    debugLog("HubSpot form callback (direct eventName):", event.data.eventName, JSON.stringify(event.data));
    isHubSpotFormEvent = true;
    eventName = event.data.eventName;
  }
  
  // Format 3: HubSpot form submission with different structure
  if (event.data && typeof event.data === "object" && 
      (event.data.type === "FORM_SUBMISSION" || event.data.action === "FORM_SUBMISSION")) {
    debugLog("HubSpot form submission (alternative format):", JSON.stringify(event.data));
    isHubSpotFormEvent = true;
    eventName = "onFormSubmit";
  }
  
  // Format 4: Check for any HubSpot-related keywords
  if (event.data && typeof event.data === "object" && 
      JSON.stringify(event.data).toLowerCase().includes('hubspot')) {
    debugLog("Potential HubSpot message:", JSON.stringify(event.data));
    isHubSpotFormEvent = true;
    eventName = "unknown_hubspot_event";
  }
  
  // Also check for other possible HubSpot message formats
  if (event.data && typeof event.data === "string") {
    try {
      const parsed = JSON.parse(event.data);
      debugLog("Parsed string message:", parsed);
      if (parsed.type === "hsFormCallback") {
        debugLog("Found HubSpot callback in string format!");
      }
    } catch (e) {
      // Not JSON, that's fine
    }
  }
  
  // Check for any message that might be form-related
  if (event.data && (
    JSON.stringify(event.data).includes("form") ||
    JSON.stringify(event.data).includes("submit") ||
    JSON.stringify(event.data).includes("hubspot") ||
    JSON.stringify(event.data).includes("hs-")
  )) {
    debugLog("Potentially form-related message detected:", JSON.stringify(event.data));
  }
  
  if (isHubSpotFormEvent) {
    // Track on form submit - be more flexible with event names
    if (eventName === "onFormSubmit" || 
        eventName === "onFormSubmitted" || 
        eventName === "onFormReady" ||
        eventName === "FORM_SUBMISSION" ||
        eventName === "unknown_hubspot_event") {
      if (window.posthog) {
        debugLog("Tracking conversion for iframe form submission");
        
        posthog.capture("free_consult_hero_form_submitted", {
          conversion_type: "form_submission",
          page_path: window.location.pathname,
          form_id: event.data.id || "unknown",
          form_type: "hubspot_iframe",
          event_name: eventName,
        });

        debugLog("PostHog event sent, waiting 200ms before redirect");

        // Add small delay to ensure PostHog event is sent before redirect
        setTimeout(() => {
          debugLog("Redirect delay complete");
        }, 200);
      } else {
        debugLog("PostHog not available for iframe tracking");
      }
    }
  }
});

debugLog("Iframe message listener setup complete");

// Track navigation destination for HubSpot meeting detection
let navigationDestination = null;

// Override window.open to capture popup destinations
const originalWindowOpen = window.open;
window.open = function(...args) {
  const url = args[0];
  debugLog("Window.open detected with URL:", url);
  if (url && url.includes('meetings.hubspot.com')) {
    debugLog("HubSpot meeting URL detected in window.open:", url);
    navigationDestination = url;
  }
  return originalWindowOpen.apply(this, args);
};

// Monitor for link clicks that might lead to HubSpot
document.addEventListener('click', function(e) {
  const target = e.target.closest('a');
  if (target && target.href) {
    debugLog("Link clicked:", target.href);
    if (target.href.includes('meetings.hubspot.com')) {
      debugLog("HubSpot meeting link clicked:", target.href);
      navigationDestination = target.href;
      
      // Track immediately since this is a clear conversion
      if (window.posthog) {
        posthog.capture("free_consult_hero_form_submitted", {
          conversion_type: "form_submission",
          page_path: window.location.pathname,
          destination_url: target.href,
          form_type: "hubspot_meeting_link",
          detection_method: "link_click",
        });
        
        debugLog("Tracked conversion via HubSpot meeting link click");
      }
    }
  }
});

// Alternative method: Monitor for URL changes (redirect detection)
let currentUrl = window.location.href;
function checkForRedirect() {
  if (window.location.href !== currentUrl) {
    debugLog("URL change detected - possible form submission redirect");
    debugLog("Old URL:", currentUrl);
    debugLog("New URL:", window.location.href);
    
    // If we're being redirected, this might be a form submission
    if (window.posthog) {
      debugLog("Tracking potential conversion based on URL change");
      
      posthog.capture("free_consult_hero_form_submitted", {
        conversion_type: "form_submission",
        page_path: currentUrl, // Original page
        redirect_url: window.location.href,
        form_type: "redirect_detection",
        detection_method: "url_change",
      });
    }
    
    currentUrl = window.location.href;
  }
}

// Check for URL changes every 100ms
setInterval(checkForRedirect, 100);
debugLog("URL change monitoring setup complete");

// Alternative method: Monitor for beforeunload (page leaving)
window.addEventListener('beforeunload', function(e) {
  debugLog("Page unload detected - possible form submission");
  debugLog("Last known navigation destination:", navigationDestination);
  
  // Check if we're likely going to a HubSpot meeting
  const isHubSpotMeeting = navigationDestination && navigationDestination.includes('meetings.hubspot.com');
  
  // Quick synchronous tracking attempt
  if (window.posthog) {
    const data = {
      conversion_type: "form_submission",
      page_path: window.location.pathname,
      destination_url: navigationDestination || "unknown",
      is_hubspot_meeting: isHubSpotMeeting,
      form_type: isHubSpotMeeting ? "hubspot_meeting_redirect" : "beforeunload_detection",
      detection_method: "page_unload",
    };
    
    try {
      // Try to send via PostHog's capture method first
      posthog.capture("free_consult_hero_form_submitted", data);
      debugLog("Tracked conversion via beforeunload" + (isHubSpotMeeting ? " (HubSpot meeting detected)" : ""));
    } catch (error) {
      debugLog("Error tracking via beforeunload:", error);
    }
  }
});

// Also monitor for form redirects by checking document.referrer on new pages
if (document.referrer && document.referrer.includes('joinheard.com/free-consult')) {
  debugLog("Detected navigation from free-consult page, current URL:", window.location.href);
  if (window.location.href.includes('meetings.hubspot.com')) {
    debugLog("Successfully navigated to HubSpot meeting page!");
    
    // Track this as a successful conversion
    if (window.posthog) {
      posthog.capture("free_consult_hero_form_submitted", {
        conversion_type: "form_submission",
        page_path: "/free-consult",
        destination_url: window.location.href,
        referrer: document.referrer,
        is_hubspot_meeting: true,
        form_type: "hubspot_meeting_success",
        detection_method: "referrer_tracking",
      });
      
      debugLog("Tracked conversion via referrer tracking on HubSpot meeting page");
    }
  }
}
