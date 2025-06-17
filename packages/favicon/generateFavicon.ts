import { 
    FaviconSettings,
    IconTransformationType,
    MasterIcon,
    generateFaviconFiles,
    generateFaviconHtml
} from '@realfavicongenerator/generate-favicon';
import { getNodeImageAdapter, loadAndConvertToSvg } from "@realfavicongenerator/image-adapter-node";
import { getSiteById, SiteConfig } from '@browse-dot-show/sites';

const imageAdapter = await getNodeImageAdapter();

async function getMasterIcon(site: SiteConfig) {
    const masterIcon: MasterIcon = {
        icon: await loadAndConvertToSvg("path/to/master-icon.svg"),
    }
    return masterIcon
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
                backgroundColor: site.themeColor,
                themeColor: site.themeColor,
                name: site.fullTitle,
                shortName: site.shortTitle
            }
        },
        path: "/",
    };

    return faviconSettings;
}




export async function generateFavicon(siteId: string) {
    const site = getSiteById(siteId);
    if (!site) {
        throw new Error(`Site ${siteId} not found`);
    }

    const faviconSettings = getFaviconSettings(site);
    const masterIcon = await getMasterIcon(site);

    // Generate files
    const files = await generateFaviconFiles(masterIcon, faviconSettings, imageAdapter);
    // Do something with the files: store them, etc.

    // Generate HTML
    const html = await generateFaviconHtml(faviconSettings);
    // Do something with the markups: store them, inject them in your HTML pages, etc.
}