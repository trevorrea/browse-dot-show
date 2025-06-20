// Site configuration loaded at build time
// This file reads from environment variables that are injected by Vite during build

import type { AppHeader, SocialAndMetadata } from '@browse-dot-show/sites';

export interface SiteRuntimeConfig {
  id: string;
  domain: string;
  appHeader: AppHeader;
  socialAndMetadata: SocialAndMetadata;
  podcastLinks: Record<string, {
      title: string;
      url: string;
      status: 'active' | 'inactive';
    }>;
  themeColor: string;
  themeColorDark: string;
  searchPlaceholderOptions: string[];
}

// Read site config from environment variables injected at build time
const siteConfig: SiteRuntimeConfig = {
  id: (import.meta.env.VITE_SITE_ID as string) ?? 'unknown',
  domain: (import.meta.env.VITE_SITE_DOMAIN as string) ?? 'unknown',
  appHeader: JSON.parse((import.meta.env.VITE_APP_HEADER as string) ?? '{"primaryTitle":"Browse Dot Show","includeTitlePrefix":false,"taglinePrimaryPodcastName":"Unknown","taglinePrimaryPodcastExternalURL":"#","taglineSuffix":"podcast archives"}') as AppHeader,
  socialAndMetadata: JSON.parse((import.meta.env.VITE_SOCIAL_AND_METADATA as string) ?? '{"pageTitle":"Browse Dot Show","canonicalUrl":"https://browse.show","openGraphImagePath":"./assets/social-cards/open-graph-card-1200x630.jpg","metaDescription":"Search podcast episodes","metaTitle":"Browse Dot Show"}') as SocialAndMetadata,
  podcastLinks: JSON.parse((import.meta.env.VITE_SITE_PODCAST_LINKS as string) ?? '{}') as Record<string, { title: string; url: string; status: 'active' | 'inactive' }>,
  themeColor: (import.meta.env.VITE_SITE_THEME_COLOR as string) ?? '#000000',
  themeColorDark: (import.meta.env.VITE_SITE_THEME_COLOR_DARK as string) ?? '#000000',
  searchPlaceholderOptions: JSON.parse((import.meta.env.VITE_SITE_SEARCH_PLACEHOLDER_OPTIONS as string) ?? '["example search"]') as string[]
};

export default siteConfig; 