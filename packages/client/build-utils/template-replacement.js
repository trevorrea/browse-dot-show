import { generateFavicon } from '@browse-dot-show/favicon';

/**
 * Replace template placeholders in HTML content
 * @param {string} htmlContent - The HTML content to process
 * @param {object} siteConfig - Site configuration object
 * @param {string} [faviconHtml] - Generated favicon HTML (optional)
 * @returns {string} - Processed HTML content
 */
export function replaceTemplateVariables(htmlContent, siteConfig, faviconHtml = '') {
  return htmlContent
    .replace(/##CANONICAL_URL##/g, siteConfig.canonicalUrl || `https://${siteConfig.domain}`)
    .replace(/##SITE_NAME##/g, siteConfig.shortTitle)
    .replace(/##SITE_DESCRIPTION##/g, siteConfig.description)
    .replace(/##THEME_COLOR##/g, siteConfig.themeColor || '#000000')
    .replace(/##GENERATED_FAVICON_HTML##/g, faviconHtml);
}

/**
 * Generate favicon files and HTML for a site
 * @param {string} siteId - Site identifier
 * @returns {Promise<{files: Array, html: string}>} - Generated favicon files and HTML
 */
export async function generateFaviconForSite(siteId) {
  try {
    const result = await generateFavicon(siteId);
    return result;
  } catch (error) {
    console.warn(`Failed to generate favicon for site ${siteId}:`, error.message);
    return { files: [], html: '' };
  }
}

/**
 * Apply template replacements with favicon generation
 * @param {string} htmlContent - The HTML content to process
 * @param {object} siteConfig - Site configuration object
 * @returns {Promise<string>} - Processed HTML content with favicon
 */
export async function applyTemplateReplacements(htmlContent, siteConfig) {
  const faviconResult = await generateFaviconForSite(siteConfig.id);
  return replaceTemplateVariables(htmlContent, siteConfig, faviconResult.html);
}

/**
 * Create a temporary index.html with site-specific replacements
 * @param {object} siteConfig - Site configuration object
 * @param {string} templatePath - Path to the template HTML file
 * @param {string} outputPath - Path where to write the temporary file
 * @returns {Promise<{tempPath: string, faviconFiles: Array}>} - Temporary file path and favicon files
 */
export async function createSiteIndexHtml(siteConfig, templatePath, outputPath) {
  const fs = await import('fs');
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  
  const faviconResult = await generateFaviconForSite(siteConfig.id);
  const replacedContent = replaceTemplateVariables(templateContent, siteConfig, faviconResult.html);
  
  fs.writeFileSync(outputPath, replacedContent);
  
  return {
    tempPath: outputPath,
    faviconFiles: faviconResult.files
  };
} 