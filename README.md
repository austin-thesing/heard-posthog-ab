# PostHog A/B Testing for Webflow

A lightweight, production-ready A/B testing solution designed specifically for Webflow integration with PostHog analytics. This project enables split testing between two page variants with minimal setup and comprehensive anti-flicker protection.

## 🚀 Quick Start

1. **Copy the files** from `/free-consult/` to your Webflow project
2. **Configure PostHog** with your project key
3. **Set up the feature flag** in PostHog dashboard
4. **Add HTML structure** to your Webflow page

## 📁 Project Structure

```
heard-posthog-ab/
├── free-consult/
│   ├── native-split-enhanced.js      # Main A/B testing script
│   ├── anti-flicker.css              # Anti-flicker protection
│   └── free-consult-iframe-tracking.js # HubSpot form tracking
├── dist/                             # Minified production files
├── build.js                          # Build script for minification
└── package.json
```

## 🎯 Features

- **Zero-flicker experience** with CSS-based content hiding
- **HubSpot form tracking** with redirect detection
- **PostHog integration** with feature flags
- **Automatic fallback** to control variant on errors
- **Comprehensive analytics** tracking experiment exposure and conversions
- **Mobile-responsive** and performance-optimized
- **Debug mode** for development

## 🔧 Setup Instructions

### 1. PostHog Configuration

Create a feature flag in your PostHog dashboard:
- **Name**: `free-consult-lp2-test`
- **Type**: Release toggle
- **Variants**: `control` (50%) and `test` (50%)

### 2. Webflow Integration

#### Add to Page Settings > Custom Code

**In the `<head>` tag:**
```html
<!-- Anti-flicker CSS -->
<link rel="stylesheet" href="https://your-cdn.com/anti-flicker.css">
```

**Before closing `</body>` tag:**
```html
<!-- PostHog A/B Testing -->
<script src="https://your-cdn.com/native-split-enhanced.js"></script>
<script src="https://your-cdn.com/free-consult-iframe-tracking.js"></script>
```

> **Note**: PostHog is already loaded globally on your project, so no additional PostHog script is needed.

### 3. HTML Structure

Add this structure to your Webflow page:

```html
<!-- Hero Section -->
<h1 data-control-content="Original Headline" data-test-content="New Test Headline"></h1>
<p data-control-content="Original description text" data-test-content="New test description"></p>

<!-- Below-the-fold content -->
<div class="control-content">
  <!-- Original content -->
</div>

<div class="test-content">
  <!-- Test variant content -->
</div>
```

### 4. Configuration

The script uses hardcoded values. To modify, edit these lines in `native-split-enhanced.js`:

**Feature Flag Name**: Line 33
```javascript
const flagValue = posthog.getFeatureFlag("free-consult-lp2-test");
```

**Experiment Key**: Lines 174, 182, 375
```javascript
experiment_key: "free-consult-ab-test"
```

**Debug Mode**: Add at top of script
```javascript
const DEBUG = true;
```

## 📊 Tracking Events

The system automatically tracks these events in PostHog:

### Experiment Events
- `experiment_exposure` - When a user sees a variant
- `$feature_flag_called` - PostHog native feature flag event
- `test_event_ab_test` - Connection test event

### Conversion Events
- `conversion` - Standard conversion tracking
- `goal_completed` - PostHog goal completion
- `free_consult_form_conversion` - HubSpot form submission

### Error Events
- `experiment_error` - When initialization fails

## 🧪 Development

### Local Development

```bash
# Install dependencies
npm install

# Build development files
npm run dev

# Build production files
npm run build
```

### Debug Mode

To enable debug mode, add this at the top of `native-split-enhanced.js`:

```javascript
const DEBUG = true;
```

This will enable console logging for troubleshooting. To add more comprehensive debugging, you can add console.log statements throughout the code.

### Testing

1. **Test in incognito mode** to avoid caching issues
2. **Check PostHog dashboard** for events
3. **Verify both variants** load correctly
4. **Test form submissions** and conversion tracking
5. **Test error scenarios** by blocking PostHog

## 🛠️ Customization

### Adding New Test Elements

Use data attributes for dynamic content:

```html
<!-- Text content -->
<h1 data-control-content="Control text" data-test-content="Test text"></h1>

<!-- Images -->
<img data-control-src="control-image.jpg" data-test-src="test-image.jpg" />

<!-- Links -->
<a data-control-href="/control-link" data-test-href="/test-link">Link Text</a>
```

### Custom Tracking

Add custom events:

```javascript
// Track custom events
posthog.capture('custom_event', {
  experiment_key: 'free-consult-ab-test',
  variant: 'test', // or 'control'
  custom_property: 'value'
});
```

### Styling Variants

Target specific variants with CSS:

```css
/* Test variant specific styles */
body[data-variant="test"] .hero-section {
  background-color: #f0f0f0;
}

/* Control variant specific styles */
body[data-variant="control"] .hero-section {
  background-color: #ffffff;
}
```

## 📈 Performance

- **Anti-flicker CSS** prevents content flash
- **2-second timeout** ensures content always loads
- **Minified files** for production use
- **Lazy loading** of PostHog SDK
- **Optimized DOM queries** with caching

## 🔍 Troubleshooting

### Common Issues

**Content not showing:**
- Check anti-flicker CSS is loaded
- Verify PostHog is initialized
- Check browser console for errors

**Events not tracking:**
- Verify PostHog project key is correct
- Check feature flag is active
- Test in incognito mode

**Form submissions not tracked:**
- Ensure HubSpot form tracking script is loaded
- Check for iframe-related issues
- Verify redirect detection is working

### Debug Checklist

1. ✅ PostHog loaded on page
2. ✅ Feature flag `free-consult-lp2-test` is active
3. ✅ Anti-flicker CSS is applied
4. ✅ HTML structure matches requirements
5. ✅ Console shows no errors
6. ✅ Events appear in PostHog dashboard

## 🔄 Build Process

The project includes a build system for minification:

```bash
# Development build (unminified)
npm run dev

# Production build (minified)
npm run build
```

Built files are output to `/dist/` directory:
- `native-split-enhanced.js` (minified)
- `free-consult-iframe-tracking.js` (minified)
- `anti-flicker.css` (minified)

## 📄 License

This project is proprietary to Heard. All rights reserved.

## 🤝 Support

For technical support:
1. Check the troubleshooting section
2. Enable debug mode for detailed logging
3. Review PostHog dashboard for event tracking
4. Test in incognito mode to avoid caching issues