#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { discoverSites } from '../../sites/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to replace template placeholders in HTML content
function replaceTemplateVariables(htmlContent, siteConfig) {
  return htmlContent
    .replace(/##CANONICAL_URL##/g, siteConfig.canonicalUrl || `https://${siteConfig.domain}`)
    .replace(/##SITE_NAME##/g, siteConfig.shortTitle)
    .replace(/##SITE_DESCRIPTION##/g, siteConfig.description)
    .replace(/##THEME_COLOR##/g, siteConfig.themeColor || '#000000');
}

// Function to create a temporary index.html with site-specific replacements
function createSiteIndexHtml(siteConfig) {
  const templatePath = path.join(__dirname, 'index.html');
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  
  const replacedContent = replaceTemplateVariables(templateContent, siteConfig);
  
  const tempIndexPath = path.join(__dirname, `index-${siteConfig.id}.html`);
  fs.writeFileSync(tempIndexPath, replacedContent);
  
  return tempIndexPath;
}

// Function to build a single site
async function buildSite(siteConfig) {
  console.log(`\n🏗️  Building site: ${siteConfig.id} (${siteConfig.shortTitle})`);
  
  try {
    // Create temporary index.html with site-specific content
    const tempIndexPath = createSiteIndexHtml(siteConfig);
    
    // Set environment variables for the build
    const buildEnv = {
      ...process.env,
      SELECTED_SITE_ID: siteConfig.id,
      SITE_ID: siteConfig.id,
      BUILD_OUT_DIR: `dist-${siteConfig.id}`
    };
    
    // Build the site with Vite
    const buildCommand = `npx vite build --config vite.config.ts`;
    
    console.log(`   Running: ${buildCommand}`);
    execSync(buildCommand, {
      cwd: __dirname,
      env: buildEnv,
      stdio: 'inherit'
    });
    
    // Replace the built index.html with our template-replaced version
    const builtIndexPath = path.join(__dirname, `dist-${siteConfig.id}`, 'index.html');
    if (fs.existsSync(builtIndexPath)) {
      // Read the built HTML to preserve Vite's asset transformations
      const builtContent = fs.readFileSync(builtIndexPath, 'utf8');
      
      // Apply template replacements to the built content
      const finalContent = replaceTemplateVariables(builtContent, siteConfig);
      fs.writeFileSync(builtIndexPath, finalContent);
    }
    
    // Clean up temporary file
    if (fs.existsSync(tempIndexPath)) {
      fs.unlinkSync(tempIndexPath);
    }
    
    console.log(`   ✅ Successfully built ${siteConfig.id} to dist-${siteConfig.id}/`);
    
  } catch (error) {
    console.error(`   ❌ Failed to build ${siteConfig.id}:`, error.message);
    throw error;
  }
}

// Main function to build all sites
async function buildAllSites() {
  console.log('🚀 Starting build for all sites...\n');
  
  try {
    // Discover all available sites
    const sites = discoverSites();
    
    if (sites.length === 0) {
      console.log('❌ No sites found to build');
      process.exit(1);
    }
    
    console.log(`📋 Found ${sites.length} sites to build:`);
    sites.forEach(site => {
      console.log(`   - ${site.id} (${site.shortTitle})`);
    });
    
    // Build each site sequentially to avoid resource conflicts
    for (const site of sites) {
      await buildSite(site);
    }
    
    console.log('\n🎉 All sites built successfully!');
    
    // Print summary
    console.log('\n📦 Build Summary:');
    sites.forEach(site => {
      const distPath = path.join(__dirname, `dist-${site.id}`);
      if (fs.existsSync(distPath)) {
        console.log(`   ✅ ${site.id} -> packages/client/dist-${site.id}/`);
      } else {
        console.log(`   ❌ ${site.id} -> Build failed`);
      }
    });
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildAllSites(); 