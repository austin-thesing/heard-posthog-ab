# AGENTS.md

## Build/Test Commands
- **No build process** - Files are designed for direct browser execution in Webflow
- **Testing**: Manual testing only - visit `/free-consult` in incognito windows
- **Debug mode**: Set `const DEBUG = true` on line 43 in `native-split-enhanced.js`
- **Validation**: Check PostHog dashboard for `experiment_exposure` and `conversion` events

## Code Style Guidelines

### File Structure
- JavaScript files: Direct browser execution, no modules or imports
- CSS files: Vanilla CSS with `!important` declarations for anti-flicker
- No dependencies or package.json - pure vanilla implementation

### JavaScript Conventions
- Use strict mode: `"use strict";` at top of IIFE
- IIFE pattern: `(function() { ... })();` for encapsulation
- camelCase for variables and functions
- UPPER_CASE for constants and config values
- Detailed logging with timestamps for debugging

### Error Handling
- Always provide fallback to control variant after timeout (750ms)
- Use try-catch blocks around PostHog API calls
- Emergency timeout patterns for critical path operations
- Graceful degradation when PostHog unavailable

### Performance Requirements
- Anti-flicker CSS must load before JavaScript
- Maximum 750ms wait time before showing content
- Use `setProperty()` with `!important` for style overrides
- Minimize DOM queries with caching patterns