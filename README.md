# PostHog A/B Test Script for Webflow

This script enables A/B testing between two pages using PostHog analytics with minimal flicker.

## Test Setup
- **Control**: `/free-consult` (existing page)
- **Test**: `/free-consult/lp2` (new variant)
- **Conversion**: HubSpot form submission
- **Traffic Split**: 50/50

## Two Versions Available

### Version 1: Manual Bucketing (`posthog-ab-test.js`)
- Fastest performance, minimal flicker
- Manual 50/50 split using hashing
- No PostHog dashboard control

### Version 2: Native PostHog Feature Flags (`native-split.js`)
- Uses PostHog's feature flag system
- Full PostHog dashboard control
- Slightly slower due to API calls

## Installation Instructions

### Step 1: Add Anti-Flicker CSS
1. In Webflow, go to your site settings
2. Navigate to **Custom Code** → **Head Code**
3. Add the contents of `anti-flicker.css` wrapped in `<style>` tags:

```html
<style>
/* Paste the contents of anti-flicker.css here */
</style>
```

### Step 2: Configure PostHog Settings
1. Open `posthog-ab-test.js`
2. Replace `YOUR_POSTHOG_PROJECT_KEY` with your actual PostHog project key
3. Update `posthogHost` if you're using self-hosted PostHog
4. Adjust `testTrafficPercentage` if you want a different split (default: 50%)

### Step 3: Add JavaScript
Choose one version:

**For Manual Bucketing (fastest):**
```html
<script>
/* Paste the contents of posthog-ab-test.js here */
</script>
```

**For Native PostHog Feature Flags:**
```html
<script>
/* Paste the contents of native-split.js here */
</script>
```

### Step 4: Create Test Page
1. Create a new page at `/free-consult/lp2` in Webflow
2. Design your test variant
3. Ensure it has the same HubSpot form as the control page

### Step 5: Setup PostHog Feature Flag (Native Version Only)
If using `native-split.js`:
1. Go to PostHog → Feature Flags
2. Create a new feature flag named `free-consult-lp2-test`
3. Set it to 50% rollout
4. Enable the flag

### Step 6: Publish and Test
1. Publish your Webflow site
2. Test by visiting `/free-consult` multiple times in incognito windows
3. Check PostHog for `experiment_exposure` events

## How It Works

### Anti-Flicker Strategy
- CSS hides the page content initially
- JavaScript quickly determines the user's variant
- Content is revealed once the decision is made
- 2-second fallback ensures content shows even if script fails

### User Bucketing
- Generates persistent user ID stored in localStorage
- Uses consistent hashing to assign users to variants
- Same user always sees the same variant

### Conversion Tracking
- Automatically detects HubSpot form submissions
- Tracks conversions with the user's assigned variant
- Works with dynamically loaded forms

### PostHog Events
- `experiment_exposure`: Fired when user sees a variant
- `conversion`: Fired when user submits the form

## Debugging

Enable debug mode by setting `debug: true` in the CONFIG object. This will log:
- User ID generation
- Variant assignment
- PostHog initialization
- Conversion tracking

## Configuration Options

```javascript
const CONFIG = {
  experimentKey: 'free-consult-ab-test',        // Experiment identifier
  controlPath: '/free-consult',                 // Control page path
  testPath: '/free-consult/lp2',               // Test page path
  testTrafficPercentage: 50,                   // % of users to test variant
  posthogProjectKey: 'YOUR_KEY',               // Your PostHog project key
  posthogHost: 'https://app.posthog.com',      // PostHog host URL
  debug: false                                 // Enable debug logging
};
```

## Important Notes

1. **Page Load Speed**: The script runs as early as possible to minimize flicker
2. **Persistent Assignment**: Users maintain their variant across sessions
3. **Fallback Safety**: Content shows after 2 seconds even if script fails
4. **Form Compatibility**: Works with standard HubSpot embed forms
5. **Analytics**: All events are tracked in PostHog for analysis

## Troubleshooting

- **Content not showing**: Check browser console for JavaScript errors
- **No PostHog events**: Verify your project key and host URL
- **Forms not tracking**: Ensure HubSpot forms have proper class names
- **Flicker issues**: Ensure anti-flicker CSS is in the `<head>` section