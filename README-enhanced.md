# PostHog A/B Test Script for Webflow - Enhanced Version

This enhanced script provides robust A/B testing between two pages using PostHog's native experiment tracking features with advanced false-positive prevention.

## Key Features

- **Native PostHog Experiments**: Uses PostHog's built-in experiment tracking (`$feature_flag_called`)
- **False Positive Prevention**: Only tracks exposure after redirect decisions are final
- **Direct Navigation Handling**: Validates and redirects users who directly access test pages
- **Session Consistency**: Maintains variant assignment throughout user sessions
- **Enhanced Conversion Tracking**: Tracks goals and micro-conversions
- **Retry Logic**: Robust initialization with automatic retries
- **Error Tracking**: Comprehensive error monitoring

## Test Setup

- **Control**: `/free-consult` (existing page)
- **Test**: `/free-consult/lp2` (new variant)
- **Conversion**: HubSpot form submission with goal tracking
- **Traffic Split**: Controlled via PostHog feature flags

## Installation Instructions

### Step 1: Add Anti-Flicker CSS

1. In Webflow, go to your site settings
2. Navigate to **Custom Code** → **Head Code**
3. Add the contents of `anti-flicker.css` wrapped in `<style>` tags:

```html
<style>
  /* Anti-flicker CSS - prevents content flash during A/B test */
  body {
    opacity: 0 !important;
  }

  body[data-ab-test="resolved"] {
    opacity: 1 !important;
  }

  /* Fallback: Show content after 2 seconds */
  @keyframes show-content {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  body {
    animation: show-content 0s 2s forwards;
  }
</style>
```

### Step 2: Configure PostHog Settings

1. Open `native-split-enhanced.js`
2. Replace `YOUR_POSTHOG_PROJECT_KEY` with your actual PostHog project key
3. Update other configuration options as needed:

```javascript
const CONFIG = {
  experimentKey: "free-consult-ab-test",
  featureFlagKey: "free-consult-lp2-test",
  controlPath: "/free-consult",
  testPath: "/free-consult/lp2",
  posthogProjectKey: "YOUR_POSTHOG_PROJECT_KEY",
  posthogHost: "https://app.posthog.com",
  experimentVersion: "1.0",
  debug: false, // Set to true for console logging
};
```

### Step 3: Add JavaScript to BOTH Pages

**On the Control Page (`/free-consult`):**

```html
<script>
  /* Paste the contents of native-split-enhanced.js here */
</script>
```

**On the Test Page (`/free-consult/lp2`):**

```html
<script>
  /* Paste the same native-split-enhanced.js content here */
</script>
```

> **Important**: The script must be added to BOTH pages to handle direct navigation properly.

### Step 4: Setup PostHog Feature Flag

1. Go to PostHog → Feature Flags
2. Create a new feature flag named `free-consult-lp2-test`
3. Configure rollout percentage (e.g., 50% for even split)
4. Add any targeting conditions if needed
5. Enable the flag

### Step 5: Configure PostHog Experiment (Recommended)

1. Go to PostHog → Experiments
2. Create a new experiment
3. Link it to your feature flag `free-consult-lp2-test`
4. Set the goal metric to track `goal_completed` events where `goal_key = "hubspot_form_submission"`
5. Start the experiment

### Step 6: Publish and Test

1. Publish your Webflow site
2. Test in incognito windows:
   - Visit `/free-consult` - should either stay or redirect
   - Try direct access to `/free-consult/lp2` - should validate assignment
3. Check PostHog for events

## How It Works

### Anti-Flicker Strategy

- CSS hides page content initially
- JavaScript determines user's variant using PostHog feature flags
- Content is revealed once decision is made
- 2-second CSS fallback ensures content always appears

### Variant Assignment Flow

1. User visits control page → Check feature flag → Redirect if test variant
2. User visits test page directly → Validate assignment → Redirect if control variant
3. Session storage maintains consistency during browsing session

### Exposure Tracking

- **Before Redirect**: Tracks `exposure_type: "redirect_pending"`
- **Control View**: Tracks `exposure_type: "control_view"`
- **Test View**: Tracks `exposure_type: "test_view"`
- **Invalid Access**: Tracks `exposure_type: "incorrect_page_access"`

### Conversion Tracking

- **Primary Goal**: HubSpot form submissions tracked as `goal_completed`
- **Standard Conversion**: Also tracks as `conversion` event
- **Micro-conversions**: Form field interactions tracked as `form_interaction`

## PostHog Events Reference

### Experiment Events

- `$feature_flag_called`: Native PostHog experiment exposure
- `experiment_exposure`: Custom exposure event with metadata
- `goal_completed`: Conversion goal for PostHog Experiments
- `conversion`: Standard conversion tracking
- `form_interaction`: Micro-conversion tracking
- `experiment_error`: Error tracking for debugging

### Event Properties

```javascript
{
  experiment_key: "free-consult-ab-test",
  variant: "control" | "test",
  feature_flag: "free-consult-lp2-test",
  experiment_version: "1.0",
  exposure_type: "redirect_pending" | "control_view" | "test_view" | "incorrect_page_access",
  page_path: "/free-consult" | "/free-consult/lp2"
}
```

## Debugging

Enable debug mode for detailed console logging:

```javascript
CONFIG.debug = true;
```

### Common Issues and Solutions

**No redirect happening:**

- Check feature flag is enabled in PostHog
- Verify PostHog project key is correct
- Look for errors in browser console
- Check if user has ad blockers

**False positives in analytics:**

- Ensure script is on both pages
- Check exposure_type in events
- Verify session storage is working

**Direct test page access issues:**

- Confirm script is added to test page
- Check browser console for redirect logs
- Verify feature flag assignment

**Form tracking not working:**

- Ensure HubSpot forms have correct class names
- Check for JavaScript errors
- Verify PostHog is initialized before form loads

## Advanced Configuration

### Retry Logic

```javascript
retryAttempts: 3,      // Number of initialization retries
retryDelay: 500,       // Delay between retries (ms)
maxWaitTime: 3000      // Maximum wait time (ms)
```

### Session Management

- Variant assignments cached in sessionStorage
- Prevents re-bucketing during active sessions
- Includes experiment version for cache invalidation

### Error Handling

- Automatic retries for PostHog initialization
- Graceful fallbacks on all errors
- Comprehensive error event tracking

## Best Practices

1. **Always test in incognito** to avoid session persistence
2. **Monitor both pages** for proper tracking
3. **Check PostHog dashboard** for real-time event flow
4. **Use debug mode** during initial setup
5. **Version your experiments** when making changes

## PostHog Dashboard Setup

1. **Feature Flags**: Control test rollout percentage
2. **Experiments**: Track performance and statistical significance
3. **Insights**: Create funnels for conversion analysis
4. **Dashboards**: Monitor key metrics in real-time

## Performance Considerations

- Script loads PostHog asynchronously
- Feature flag checks use polling with 25ms intervals
- Session caching reduces API calls
- Redirects use `replace()` to prevent back button issues

## Security Notes

- No sensitive data stored in session storage
- All tracking is anonymous unless user identified
- Feature flags checked server-side by PostHog
- No PII included in event properties
