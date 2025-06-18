import {
    FaviconSettings,
    IconTransformationType,
    MasterIcon,
    generateFaviconFiles,
    generateFaviconHtml
} from '@realfavicongenerator/generate-favicon';
import { getNodeImageAdapter, loadAndConvertToSvg } from "@realfavicongenerator/image-adapter-node";
import { getSiteById, getSiteDirectory, type SiteConfig } from '@browse-dot-show/sites';
import path from 'path';
import fs from 'fs';

interface FileNameAndBuffer {
    filename: string;
    content: Buffer;
}

async function getMasterIcon(site: SiteConfig) {
    const siteDir = getSiteDirectory(site.id);
    if (!siteDir) {
        throw new Error(`Site directory not found for ${site.id}`);
    }

    // Try to find the icon file - check for fullSizeIconPath first, then fallback to common patterns
    let iconPath: string;

    if (site.fullSizeIconPath) {
        iconPath = path.join(siteDir, site.fullSizeIconPath);
    } else {
        throw new Error(`No icon file found for site ${site.id}. Checked: ${site.fullSizeIconPath}`);
    }

    if (!fs.existsSync(iconPath)) {
        throw new Error(`Icon file not found: ${iconPath}`);
    }

    console.log(`Loading icon file: ${iconPath}`);
    const icon = await loadAndConvertToSvg(iconPath);
    console.log(`Icon loaded: ${icon}, type: ${typeof icon}`);
    const masterIcon: MasterIcon = {
        icon,
    };
    return masterIcon;
}

function getFaviconSettings(site: SiteConfig) {
    const faviconSettings: FaviconSettings = {
        icon: {
            desktop: {
                // @ts-expect-error - generated config from https://realfavicongenerator.net/favicon-generator/node, 
                // but doesn't yet match TS types - ideally remove @ts-expect-error in future versions 
                regularIconTransformation: {
                    type: IconTransformationType.Background,
                    backgroundColor: "#ffffff",
                    backgroundRadius: 1,
                    imageScale: 1,
                },
                darkIconType: "none",
            },
            touch: {
                // @ts-expect-error - generated config from https://realfavicongenerator.net/favicon-generator/node, 
                // but doesn't yet match TS types - ideally remove @ts-expect-error in future versions
                transformation: {
                    type: IconTransformationType.None,
                },
                appTitle: site.shortTitle
            },
            webAppManifest: {
                // @ts-expect-error - generated config from https://realfavicongenerator.net/favicon-generator/node, 
                // but doesn't yet match TS types - ideally remove @ts-expect-error in future versions
                transformation: {
                    type: IconTransformationType.None,
                },
                backgroundColor: site.themeColor || '#ffffff',
                themeColor: site.themeColor || '#000000',
                name: site.fullTitle,
                shortName: site.shortTitle
            }
        },
        path: "/",
    };

    return faviconSettings;
}

function getFileNameAndBufferFromFiles(files: { [filename: string]: any }): FileNameAndBuffer[] {
    return Object.entries(files).map(([filename, fileContent]) => ({
        filename,
        content: fileContent
    }));
}

/**
 * Generate favicon files and HTML for a site
 * @param siteId - Site identifier
 * @returns Promise with files array (with filename and content) and HTML string
 */
export async function generateFavicon(siteId: string): Promise<{ files: Array<{ filename: string, content: Buffer }>, html: string }> {
    const imageAdapter = await getNodeImageAdapter();

    const site = getSiteById(siteId);
    if (!site) {
        throw new Error(`Site ${siteId} not found`);
    }

    const faviconSettings = getFaviconSettings(site);
    const masterIcon = await getMasterIcon(site);

    // Generate files
    const files = await generateFaviconFiles(masterIcon, faviconSettings, imageAdapter);

    // Files are returned as an object with filename keys

    // Transform files to the format expected by our build system
    let transformedFiles: Array<{ filename: string, content: Buffer }> = [];

    if (files && typeof files === 'object') {
        transformedFiles = getFileNameAndBufferFromFiles(files);
    } else {
        console.warn('Unexpected files format from generateFaviconFiles:', files);
    }

    // Generate HTML
    const faviconMarkups = generateFaviconHtml(faviconSettings);

    // Convert markups to HTML string 
    const html = Object.values(faviconMarkups)
        .flat()
        .filter(markup => typeof markup === 'string')
        .join('\n');

    return {
        files: transformedFiles,
        html
    };
}