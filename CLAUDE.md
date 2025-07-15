# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a lightweight A/B testing solution designed for Webflow integration with PostHog analytics. The project provides drop-in JavaScript and CSS files that enable split testing between two page variants with minimal setup and anti-flicker protection.

## Development Commands

This project has no build process or dependencies. Files are designed to be copy-pasted directly into Webflow's custom code sections.

### Testing
- Manual testing only - visit `/free-consult` in incognito windows
- Enable debug mode: Set `CONFIG.debug = true` in native-split.js
- Check PostHog dashboard for `experiment_exposure` and `conversion` events

## Architecture

### Key Files
- **native-split.js**: PostHog feature flag-based A/B testing implementation
- **anti-flicker.css**: CSS to prevent page flicker during variant assignment
- **README.md**: Comprehensive setup and usage documentation

### Implementation Details

The dual-content solution works by:
1. Hiding content divs (.control-content, .test-content) and hero text elements initially via CSS
2. Loading PostHog and checking feature flags
3. Showing appropriate content based on variant assignment (test vs control)
4. Tracking experiment exposure and form conversions
5. Fallback to control content after 2.5 seconds if script fails

### HTML Structure Required
```html
<!-- Hero section with data attributes -->
<h1 data-control-content="Original Headline" data-test-content="New Test Headline"></h1>
<p data-control-content="Original description" data-test-content="New test description"></p>

<!-- Below-the-fold content -->
<div class="control-content">
    <!-- Original content -->
</div>

<div class="test-content">
    <!-- Test variant content -->
</div>
```

### PostHog Integration
- Uses PostHog's JavaScript SDK loaded dynamically
- Requires feature flag configured in PostHog dashboard (default: `free-consult-lp2-test`)
- Tracks events: `$feature_flag_called`, `experiment_exposure`, `conversion`
- Automatically tracks form submissions as conversions

### Configuration Points
All configuration is in the `CONFIG` object in native-split-enhanced.js:
- `posthogProjectKey`: Must be replaced with actual PostHog project key
- `featureFlagKey`: Feature flag name in PostHog (default: `free-consult-lp2-test`)
- `experimentKey`: Experiment identifier for tracking
- `maxWaitTime`: Maximum time to wait for PostHog (default: 2000ms)
- `debug`: Enable console logging for troubleshooting

## Important Considerations

1. **No build process** - Code is written for direct browser execution
2. **Webflow-specific** - Designed for Webflow's custom code injection
3. **Performance-critical** - Script runs early to minimize flicker
4. **Form tracking** - Works with standard HubSpot embedded forms
5. **Fallback safety** - Always shows content after 2 seconds to prevent blank pages