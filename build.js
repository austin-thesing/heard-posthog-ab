#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { transform } from 'esbuild';

const isDev = process.argv.includes('--dev');
const srcDir = './src';
const distDir = './dist';

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Minify JavaScript using ESBuild
async function minifyJS(content) {
  if (isDev) return content;
  
  try {
    // First, do some custom preprocessing for debug removal
    let preprocessed = content
      // Remove debug comment blocks (/* debug */ ... /* end debug */)
      .replace(/\/\* debug \*\/[\s\S]*?\/\* end debug \*\//g, '')
      .replace(/\/\* DEBUG \*\/[\s\S]*?\/\* END DEBUG \*\//g, '')
      
      // Remove debug logic patterns
      .replace(/if\s*\(\s*CONFIG\.debug\s*\)/g, 'if(false)')
      .replace(/const\s+DEBUG\s*=\s*true\s*;/g, 'const DEBUG = false;')
      
      // Remove console methods (ESBuild will handle the rest)
      .replace(/console\.(log|warn|info|debug|error|trace|table|group|groupEnd|time|timeEnd)\s*\([^)]*\)\s*;?/g, '');

    // Use ESBuild for proper minification
    const result = await transform(preprocessed, {
      minify: true,
      target: 'es2017', // Good browser support
      format: 'iife', // Keep as IIFE
      keepNames: false, // Allow name mangling for smaller size
    });
    
    return result.code;
  } catch (error) {
    console.warn(`ESBuild minification failed, falling back to original: ${error.message}`);
    return content;
  }
}

// Minify CSS using ESBuild
async function minifyCSS(content) {
  if (isDev) return content;
  
  try {
    const result = await transform(content, {
      loader: 'css',
      minify: true,
    });
    
    return result.code;
  } catch (error) {
    console.warn(`ESBuild CSS minification failed, falling back to simple minification: ${error.message}`);
    // Fallback to simple CSS minification
    return content
      .replace(/\/\*.*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove semicolon before closing brace
      .replace(/\s*{\s*/g, '{') // Clean up braces
      .replace(/;\s*/g, ';') // Clean up semicolons
      .trim();
  }
}

// Recursively find all files in src directory
function findFiles(dir, baseDir = dir) {
  const files = [];
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findFiles(fullPath, baseDir));
    } else if (item.endsWith('.js') || item.endsWith('.css')) {
      const relativePath = fullPath.replace(baseDir + '/', '').replace('src/', '');
      files.push({
        src: fullPath,
        dest: relativePath,
        type: item.endsWith('.js') ? 'js' : 'css'
      });
    }
  }
  
  return files;
}

async function build() {
  console.log(`Building ${isDev ? 'development' : 'production'} files...`);

  // Find all files in src directory
  const files = findFiles(srcDir);

  for (const file of files) {
    try {
      const content = readFileSync(file.src, 'utf8');
      const processed = file.type === 'js' ? await minifyJS(content) : await minifyCSS(content);
      
      // Ensure destination directory exists
      const destPath = join(distDir, file.dest);
      const destDir = dirname(destPath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      
      writeFileSync(destPath, processed);
      console.log(`✓ ${file.dest} (${Math.round(processed.length / 1024 * 100) / 100}KB)`);
    } catch (error) {
      console.error(`✗ Failed to process ${file.src}:`, error.message);
    }
  }

  console.log('Build complete!');
}

// Run the build
build().catch(console.error);