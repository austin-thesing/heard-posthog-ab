(function () {
"use strict";
function hideContentInitially() {
const controlDiv = document.querySelector(".control-content");
const testDiv = document.querySelector(".test-content");
if (controlDiv) {
controlDiv.style.setProperty("display", "none", "important");
}
if (testDiv) {
testDiv.style.setProperty("display", "none", "important");
}
const elementsWithTestContent = document.querySelectorAll("[data-test-content]");
const elementsWithControlContent = document.querySelectorAll("[data-control-content]");
const elementsWithHideUntilReady = document.querySelectorAll('[data-hide-until-ready="true"]');
[...elementsWithTestContent, ...elementsWithControlContent, ...elementsWithHideUntilReady].forEach((el) => {
el.style.setProperty("opacity", "0", "important");
el.style.transition = "opacity 0.3s ease";
});
}
function setElementTextFromAttr(el, attr) {
const newText = el.getAttribute(attr);
if (newText !== null) {
const originalDisplay = window.getComputedStyle(el).display;
if (el.childNodes.length > 1 || (el.childNodes.length === 1 && el.childNodes[0].nodeType !== Node.TEXT_NODE)) {
let foundTextNode = false;
for (let i = 0; i < el.childNodes.length; i++) {
if (el.childNodes[i].nodeType === Node.TEXT_NODE) {
el.childNodes[i].textContent = newText;
foundTextNode = true;
break;
}
}
if (!foundTextNode) {
el.insertBefore(document.createTextNode(newText), el.firstChild);
}
} else {
el.textContent = newText;
}
if (originalDisplay !== "block") {
el.style.setProperty("display", originalDisplay, "important");
}
}
el.style.setProperty("opacity", "1", "important");
}
function showVariantContent(variant) {
if (variant === "test") {
const testDiv = document.querySelector(".test-content");
if (testDiv) {
testDiv.style.setProperty("display", "block", "important");
}
const testElements = document.querySelectorAll("[data-test-content]");
testElements.forEach((el) => {
setElementTextFromAttr(el, "data-test-content");
});
} else {
const controlDiv = document.querySelector(".control-content");
if (controlDiv) {
controlDiv.style.setProperty("display", "block", "important");
}
const controlElements = document.querySelectorAll("[data-control-content]");
controlElements.forEach((el) => {
setElementTextFromAttr(el, "data-control-content");
});
}
document.querySelectorAll("[data-test-content], [data-control-content]").forEach((el) => {
if (el.style.opacity === "0" || el.style.opacity === "") {
if (!el.getAttribute("data-test-content") && !el.getAttribute("data-control-content")) {
el.style.setProperty("opacity", "1", "important");
} else if (el.textContent.trim() === "") {
el.style.setProperty("opacity", "1", "important");
}
}
});
document.querySelectorAll('[data-hide-until-ready="true"]').forEach((el) => {
el.style.setProperty("opacity", "1", "important");
});
}
function getFeatureFlagValue() {
return new Promise((resolve, reject) => {
if (!window.posthog) {
reject(new Error("PostHog not initialized"));
return;
}
let callbackFired = false;
posthog.onFeatureFlags(() => {
if (!callbackFired) {
callbackFired = true;
const flagValue = posthog.getFeatureFlag("free-consult-lp2-test");
resolve(flagValue);
}
});
let attempts = 0;
const maxAttempts = Math.floor(750 / 25); // maxWaitTime from old CONFIG
const pollForFlags = () => {
attempts++;
const flagValue = posthog.getFeatureFlag("free-consult-lp2-test");
if (flagValue !== undefined && !callbackFired) {
callbackFired = true;
resolve(flagValue);
} else if (attempts >= maxAttempts && !callbackFired) {
callbackFired = true;
reject(new Error("Feature flag timeout"));
} else if (!callbackFired) {
setTimeout(pollForFlags, 25);
}
};
setTimeout(pollForFlags, 25);
});
}
function trackExperimentExposure(variant, context = {}) {
if (window.posthog && !window._posthogExposureTracked) {
window._posthogExposureTracked = true;
try {
posthog.capture("$feature_flag_called", {
$feature_flag: "free-consult-lp2-test",
$feature_flag_response: variant,
$feature_flag_payload: {
experiment_key: "free-consult-ab-test",
variant: variant,
version: "1.0",
...context,
},
});
posthog.capture("experiment_exposure", {
experiment_key: "free-consult-ab-test",
variant: variant,
page_path: window.location.pathname,
feature_flag: "free-consult-lp2-test",
experiment_version: "1.0",
exposure_type: context.exposure_type || "standard",
...context,
});
} catch (error) {
window._posthogExposureTracked = false;
}
}
}
function setupFormTracking() {
let cachedVariant = null;
let cachedFlagValue = null;
function getCachedVariant() {
if (cachedVariant === null && window.posthog) {
cachedFlagValue = posthog.getFeatureFlag("free-consult-lp2-test");
cachedVariant = cachedFlagValue === "test" ? "test" : "control";
}
return { variant: cachedVariant, flagValue: cachedFlagValue };
}
function trackConversion(formData = {}) {
if (window.posthog) {
const { variant, flagValue } = getCachedVariant();
if (window._posthogTrackingInProgress) {
return;
}
window._posthogTrackingInProgress = true;
try {
posthog.capture("goal_completed", {
goal_key: "form_submission",
experiment_key: "free-consult-ab-test",
variant: variant,
feature_flag: "free-consult-lp2-test",
feature_flag_value: flagValue,
experiment_version: "1.0",
page_path: window.location.pathname,
...formData,
});
posthog.capture("conversion", {
experiment_key: "free-consult-ab-test",
variant: variant,
conversion_type: "form_submission",
page_path: window.location.pathname,
feature_flag: "free-consult-lp2-test",
feature_flag_value: flagValue,
experiment_version: "1.0",
...formData,
});
} catch (error) {
} finally {
setTimeout(() => {
window._posthogTrackingInProgress = false;
}, 100);
}
}
}
document.addEventListener("submit", function (e) {
const form = e.target;
if (form && form.tagName === "FORM") {
trackConversion({
form_id: form.id || "unknown",
form_class: form.className || "unknown",
});
}
});
if (window.hbspt) {
window.hbspt.forms.create = (function (originalCreate) {
return function (options) {
if (options.onFormSubmit) {
const originalOnSubmit = options.onFormSubmit;
options.onFormSubmit = function ($form) {
trackConversion({ form_id: options.formId || "unknown", form_type: "hubspot" });
return originalOnSubmit.apply(this, arguments);
};
} else {
options.onFormSubmit = function ($form) {
trackConversion({ form_id: options.formId || "unknown", form_type: "hubspot" });
};
}
return originalCreate.call(this, options);
};
})(window.hbspt.forms.create);
}
const observer = new MutationObserver(function (mutations) {
mutations.forEach(function (mutation) {
mutation.addedNodes.forEach(function (node) {
if (node.nodeType === 1) {
const forms = node.querySelectorAll ? node.querySelectorAll("form, .hs-form") : [];
forms.forEach(function (form) {
form.addEventListener("submit", function () {
trackConversion({ form_loaded: "dynamic" });
});
});
}
});
});
});
observer.observe(document.body, {
childList: true,
subtree: true,
});
}
async function runExperiment() {
hideContentInitially();
const emergencyTimeout = setTimeout(() => {
showVariantContent("control");
setupFormTracking();
}, 750); // maxWaitTime from old CONFIG
try {
if (!window.posthog) {
throw new Error("PostHog is not available on window.posthog");
}
const flagValue = await getFeatureFlagValue();
clearTimeout(emergencyTimeout);
const variant = flagValue === "test" ? "test" : "control";
trackExperimentExposure(variant, {
exposure_type: "page_view",
page_path: window.location.pathname,
});
showVariantContent(variant);
if (window.posthog) {
try {
posthog.capture("test_event_ab_test", {
test: true,
variant: variant,
timestamp: new Date().toISOString(),
page_url: window.location.href,
});
} catch (error) {
}
}
setupFormTracking();
} catch (error) {
clearTimeout(emergencyTimeout);
if (window.posthog) {
posthog.capture("experiment_error", {
experiment_key: "free-consult-ab-test",
error: error.message,
page_path: window.location.pathname,
error_type: "initialization_error",
});
}
showVariantContent("control");
setupFormTracking();
}
}
if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", runExperiment);
} else {
runExperiment();
}
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
const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");
try {
posthog.capture("free_consult_form_conversion", {
experiment_key: "free-consult-ab-test",
variant: variant,
conversion_type: "form_submission",
page_path: window.location.pathname,
feature_flag: "free-consult-lp2-test",
feature_flag_value: variant,
experiment_version: "1.0",
form_id: event.data.id || event.data.formId || "002af025-1d67-4e7f-b2bf-2d221f555805",
form_type: "hubspot_iframe_no_redirect",
event_name: eventName,
hubspot_portal_id: "7507639",
redirect_disabled: true,
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
function setupBasicIframeMonitoring() {
const iframes = document.querySelectorAll('iframe[src*="hsforms.net"]');
iframes.forEach((iframe, index) => {
if (iframe.src.includes("_hsDisableRedirect=true")) {
}
});
}
setTimeout(setupBasicIframeMonitoring, 1000);
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
const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");
try {
posthog.capture("free_consult_form_conversion", {
experiment_key: "free-consult-ab-test",
variant: variant,
conversion_type: "form_submission",
page_path: "/free-consult",
redirect_url: window.location.href,
feature_flag: "free-consult-lp2-test",
feature_flag_value: variant,
experiment_version: "1.0",
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
const variant = posthog.getFeatureFlag && posthog.getFeatureFlag("free-consult-lp2-test");
try {
posthog.capture("free_consult_form_conversion", {
experiment_key: "free-consult-ab-test",
variant: variant,
conversion_type: "form_submission",
page_path: window.location.pathname,
feature_flag: "free-consult-lp2-test",
feature_flag_value: variant,
experiment_version: "1.0",
form_type: "hubspot_redirect",
detection_method: "beforeunload_redirect",
timestamp: new Date().toISOString(),
redirect_expected: true,
});
} catch (error) {
}
if (navigator.sendBeacon) {
const data = JSON.stringify({
event: "free_consult_form_conversion_beacon",
properties: {
experiment_key: "free-consult-ab-test",
variant: variant,
conversion_type: "form_submission",
page_path: window.location.pathname,
feature_flag: "free-consult-lp2-test",
feature_flag_value: variant,
detection_method: "sendBeacon",
timestamp: new Date().toISOString(),
},
});
navigator.sendBeacon("/api/analytics", data);
}
}
});
})();