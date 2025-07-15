// --- HubSpot iframe form submission tracking ---
window.addEventListener("message", function (event) {
  if (event.data && typeof event.data === "object" && event.data.type === "hsFormCallback" && event.data.eventName === "onFormSubmit") {
    if (window.posthog) {
      posthog.capture("free_consult_hero_form_submitted", {
        page_path: window.location.pathname,
        form_id: event.data.id || "unknown",
        form_type: "hubspot_iframe",
      });
    }
  }
});
