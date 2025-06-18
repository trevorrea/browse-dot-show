export interface SiteConfig {
  id: string;
  canonicalUrl?: string;
  domain: string;
  shortTitle: string;
  description: string;
  themeColor?: string;
}

export interface FaviconResult {
  files: Array<any>;
  html: string;
}

export interface SiteIndexResult {
  tempPath: string;
  faviconFiles: Array<any>;
}

/**
 * Replace template placeholders in HTML content
 */
export function replaceTemplateVariables(
  htmlContent: string,
  siteConfig: SiteConfig,
  faviconHtml?: string
): string;

/**
 * Generate favicon files and HTML for a site
 */
export function generateFaviconForSite(siteId: string): Promise<FaviconResult>;

/**
 * Apply template replacements with favicon generation
 */
export function applyTemplateReplacements(
  htmlContent: string,
  siteConfig: SiteConfig
): Promise<string>;

/**
 * Create a temporary index.html with site-specific replacements
 */
export function createSiteIndexHtml(
  siteConfig: SiteConfig,
  templatePath: string,
  outputPath: string
): Promise<SiteIndexResult>;
