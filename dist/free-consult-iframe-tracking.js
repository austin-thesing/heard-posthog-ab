const DEBUG_ENABLED = false; // Set to false to disable debug logging and window
let formSubmissionDetected = false;
let redirectDetected = false;
window.addEventListener("message", function (event) {
const isReactDevTools = event.origin.includes("react-devtools") || (event.data && typeof event.data === "object" && event.data.source === "react-devtools");
const isExtension = event.origin.includes("extension://") || event.origin.includes("chrome-extension://");
const isInspector = event.data && typeof event.data === "object" && (event.data.type === "inspector" || JSON.stringify(event.data).includes("inspector"));
if (isReactDevTools || isExtension || isInspector) {
return;
}
const isHubSpotRelated =
event.origin.includes("hsforms.net") || (event.data && typeof event.data === "object" && (event.data.type === "hsFormCallback" || JSON.stringify(event.data).includes("hubspot") || JSON.stringify(event.data).includes("hsform")));
let isHubSpotFormEvent = false;
let eventName = null;
if (event.data && typeof event.data === "object" && event.data.type === "hsFormCallback") {
isHubSpotFormEvent = true;
eventName = event.data.eventName;
}
if (event.data && typeof event.data === "object" && event.data.eventName) {
isHubSpotFormEvent = true;
eventName = event.data.eventName;
}
if (isHubSpotFormEvent) {
if (eventName === "onFormSubmit" || eventName === "onFormSubmitted" || eventName === "onFormReady") {
formSubmissionDetected = true;
if (window.posthog) {
try {
posthog.capture("free_consult_form_conversion", {
conversion_type: "form_submission",
page_path: window.location.pathname,
form_id: event.data.id || event.data.formId || "002af025-1d67-4e7f-b2bf-2d221f555805",
form_type: "hubspot_iframe_redirect",
event_name: eventName,
hubspot_portal_id: "7507639",
timestamp: new Date().toISOString(),
user_agent: navigator.userAgent,
page_url: window.location.href,
});
} catch (error) {
}
}
}
}
});
function setupRedirectDetection() {
let currentUrl = window.location.href;
let urlCheckCount = 0;
const urlCheckInterval = setInterval(() => {
urlCheckCount++;
if (window.location.href !== currentUrl) {
const isHubSpotMeeting = window.location.href.includes("meetings.hubspot.com");
if (isHubSpotMeeting) {
redirectDetected = true;
if (window.posthog) {
try {
posthog.capture("free_consult_form_conversion", {
conversion_type: "form_submission",
page_path: "/free-consult",
redirect_url: window.location.href,
form_type: "hubspot_meeting_redirect",
detection_method: "url_change_monitoring",
timestamp: new Date().toISOString(),
is_hubspot_meeting: true,
});
} catch (error) {
}
}
}
clearInterval(urlCheckInterval);
return;
}
if (urlCheckCount > 3000) {
clearInterval(urlCheckInterval);
}
}, 100);
}
function trackFormInteractions() {
document.addEventListener("click", function (e) {
const formContainer = document.querySelector("#hubspot-form-container, .custom_step_form, .right_step_form");
if (formContainer && formContainer.contains(e.target)) {
if (e.target.tagName === "BUTTON" || e.target.type === "submit") {
formSubmissionDetected = true;
}
}
});
}
setTimeout(setupRedirectDetection, 1000);
setTimeout(trackFormInteractions, 2000);
window.addEventListener("beforeunload", function (e) {
const isLikelyFormSubmission = window.location.href.includes("/free-consult");
if (isLikelyFormSubmission && window.posthog) {
posthog.capture("free_consult_form_conversion", {
conversion_type: "form_submission",
page_path: window.location.pathname,
form_type: "hubspot_redirect",
detection_method: "beforeunload_redirect",
timestamp: new Date().toISOString(),
redirect_expected: true,
form_submission_detected: formSubmissionDetected,
});
if (navigator.sendBeacon) {
const data = JSON.stringify({
event: "free_consult_form_conversion_beacon",
properties: {
conversion_type: "form_submission",
page_path: window.location.pathname,
detection_method: "sendBeacon",
timestamp: new Date().toISOString(),
},
});
navigator.sendBeacon("/api/analytics", data);
}
}
});
if (document.referrer && document.referrer.includes("joinheard.com/free-consult")) {
if (window.location.href.includes("meetings.hubspot.com")) {
if (window.posthog) {
posthog.capture("free_consult_form_conversion", {
conversion_type: "form_submission",
page_path: "/free-consult",
destination_url: window.location.href,
referrer: document.referrer,
is_hubspot_meeting: true,
form_type: "hubspot_meeting_success",
detection_method: "referrer_tracking",
timestamp: new Date().toISOString(),
});
}
}
}
if (window.posthog) {
posthog.capture("test_event_form_tracking", {
test: true,
timestamp: new Date().toISOString(),
page_url: window.location.href,
});
}