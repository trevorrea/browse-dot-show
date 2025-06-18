#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { getSiteById } from '../../../sites/dist/index.js';
import { createSiteIndexHtml, generateFaviconForSite } from '../build-utils/template-replacement.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to build a single site
async function buildSite(siteConfig) {
  console.log(`\n🏗️  Building site: ${siteConfig.id} (${siteConfig.shortTitle})`);
  
  try {
    // Create temporary index.html with site-specific content
    const clientDir = path.dirname(__dirname); // Go up from scripts to client directory
    const tempIndexPath = path.join(clientDir, `index-${siteConfig.id}.html`);
    const templatePath = path.join(clientDir, 'index.html');
    
    console.log(`   📝 Creating site-specific index.html with favicon generation...`);
    const { tempPath, faviconFiles } = await createSiteIndexHtml(siteConfig, templatePath, tempIndexPath);
    
    // Set environment variables for the build
    const buildEnv = {
      ...process.env,
      SELECTED_SITE_ID: siteConfig.id,
      SITE_ID: siteConfig.id,
      BUILD_OUT_DIR: `dist-${siteConfig.id}`
    };
    
    // Build the site with Vite
    const buildCommand = `npx vite build --config vite.config.ts`;
    
    console.log(`   🔨 Running: ${buildCommand}`);
    execSync(buildCommand, {
      cwd: clientDir,
      env: buildEnv,
      stdio: 'inherit'
    });
    
    // Copy favicon files to the dist directory
    const distDir = path.join(clientDir, `dist-${siteConfig.id}`);
    if (faviconFiles && faviconFiles.length > 0) {
      console.log(`   📄 Copying ${faviconFiles.length} favicon files...`);
      for (const faviconFile of faviconFiles) {
        const faviconPath = path.join(distDir, faviconFile.filename);
        fs.writeFileSync(faviconPath, faviconFile.content);
      }
    }
    
    // Replace the built index.html with our template-replaced version
    const builtIndexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(builtIndexPath)) {
      // Read the built HTML to preserve Vite's asset transformations
      const builtContent = fs.readFileSync(builtIndexPath, 'utf8');
      
      // Generate favicon HTML and apply all template replacements
      const faviconResult = await generateFaviconForSite(siteConfig.id);
      const { replaceTemplateVariables } = await import('../build-utils/template-replacement.js');
      
      const finalContent = replaceTemplateVariables(builtContent, siteConfig, faviconResult.html);
      fs.writeFileSync(builtIndexPath, finalContent);
    }
    
    // Clean up temporary file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    
    console.log(`   ✅ Successfully built ${siteConfig.id} to dist-${siteConfig.id}/`);
    
  } catch (error) {
    console.error(`   ❌ Failed to build ${siteConfig.id}:`, error.message);
    throw error;
  }
}

// Main function to build a specific site
async function buildSpecificSite() {
  const siteId = process.argv[2];
  
  if (!siteId) {
    console.error('❌ Please provide a site ID as an argument');
    console.log('Usage: node build-specific-site.js <siteId>');
    console.log('');
    console.log('Available sites can be found in sites/origin-sites/ or sites/my-sites/');
    process.exit(1);
  }
  
  console.log(`🚀 Building site: ${siteId}...\n`);
  
  try {
    // Get site configuration
    const siteConfig = getSiteById(siteId);
    
    if (!siteConfig) {
      console.error(`❌ Site configuration not found for site ID: ${siteId}`);
      console.log('');
      console.log('Available sites can be found in sites/origin-sites/ or sites/my-sites/');
      process.exit(1);
    }
    
    // Build the site
    await buildSite(siteConfig);
    
    console.log(`\n🎉 Site ${siteId} built successfully!`);
    
    // Print summary
    const clientDir = path.dirname(__dirname); // Go up from scripts to client directory
    const distPath = path.join(clientDir, `dist-${siteId}`);
    if (fs.existsSync(distPath)) {
      console.log(`\n📦 Build Output: packages/client/dist-${siteId}/`);
    } else {
      console.log(`\n❌ Build failed - output directory not found`);
    }
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildSpecificSite(); 