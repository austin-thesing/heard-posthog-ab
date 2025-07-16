#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const isDev = process.argv.includes('--dev');
const distDir = './dist';

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Minify JavaScript
function minifyJS(content) {
  if (isDev) return content;
  
  // Remove debug sections and console logs, then minify
  let cleaned = content
    // Remove debug comment blocks (/* debug */ ... /* end debug */)
    .replace(/\/\* debug \*\/[\s\S]*?\/\* end debug \*\//g, '')
    .replace(/\/\* DEBUG \*\/[\s\S]*?\/\* END DEBUG \*\//g, '')
    
    // Remove debug logic patterns
    .replace(/if\s*\(\s*CONFIG\.debug\s*\)/g, 'if(false)')
    .replace(/const\s+DEBUG\s*=\s*true\s*;/g, 'const DEBUG = false;')
    
    // Remove all console methods
    .replace(/console\.(log|warn|info|debug|error|trace|table|group|groupEnd|time|timeEnd)\s*\([^)]*\)\s*;?/g, '')
    
    // Remove debug function calls more carefully - only standalone calls
    .replace(/^\s*debugLog\s*\([^)]*\)\s*;?\s*$/gm, '') // Remove entire lines that only contain debugLog
    .replace(/\s+debugLog\s*\([^)]*\)\s*;?\s*$/gm, '') // Remove debugLog calls at end of line with leading whitespace
    .replace(/debugLog\s*\([^)]*\)\s*;?\s*$/gm, '') // Remove debugLog calls at end of line
    .replace(/\n\s*\n+/g, '\n') // Clean up excessive empty lines after removal
    
    // Remove all comments more carefully
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/^(\s*)\/\/.*$/gm, '$1') // Remove single line comments at start of line
    
    // Very conservative cleanup: Only remove excessive whitespace
    .replace(/\n\s*\n+/g, '\n') // Remove excessive empty lines
    .replace(/^\s+/gm, '') // Remove leading whitespace from each line
    .replace(/\s+$/gm, '') // Remove trailing whitespace from each line
    .trim();
  
  return cleaned;
}

// Minify CSS
function minifyCSS(content) {
  if (isDev) return content;
  
  return content
    .replace(/\/\*.*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/;\s*}/g, '}') // Remove semicolon before closing brace
    .replace(/\s*{\s*/g, '{') // Clean up braces
    .replace(/;\s*/g, ';') // Clean up semicolons
    .trim();
}

// Process files
const files = [
  { src: 'free-consult/native-split-enhanced.js', dest: 'native-split-enhanced.js', type: 'js' },
  { src: 'free-consult/free-consult-iframe-tracking.js', dest: 'free-consult-iframe-tracking.js', type: 'js' },
  { src: 'free-consult/anti-flicker.css', dest: 'anti-flicker.css', type: 'css' }
];

console.log(`Building ${isDev ? 'development' : 'production'} files...`);

for (const file of files) {
  try {
    const content = readFileSync(file.src, 'utf8');
    const processed = file.type === 'js' ? minifyJS(content) : minifyCSS(content);
    
    writeFileSync(join(distDir, file.dest), processed);
    console.log(`✓ ${file.dest} (${Math.round(processed.length / 1024 * 100) / 100}KB)`);
  } catch (error) {
    console.error(`✗ Failed to process ${file.src}:`, error.message);
  }
}

console.log('Build complete!');