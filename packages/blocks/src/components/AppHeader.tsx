import { Button } from '@browse-dot-show/ui'
import ResponsiveDrawerOrDialog from './ResponsiveDrawerOrDialog.js'
import { ThemeToggle } from './ThemeToggle.js'

import { InfoCircledIcon, GitHubLogoIcon, GearIcon } from '@radix-ui/react-icons'

interface InfoDrawerProps {
  siteConfig: {
    podcastLinks: Record<string, { status: string; url: string; title: string }>;
    appHeader: {
      includeTitlePrefix?: boolean;
      primaryTitle: string;
      taglinePrimaryPodcastExternalURL: string;
      taglinePrimaryPodcastName: string;
      taglineSuffix: string;
    };
  };
  AudioSourceSelect?: React.ComponentType;
  BlueskyLogo?: string;
}

function InfoDrawer({ siteConfig, BlueskyLogo }: InfoDrawerProps) {
  const childTrigger = (
    <Button variant="ghost" size="icon">
      <InfoCircledIcon className="size-6" />
    </Button>
  )

  // Get the first active podcast for the main link
  const activePodcasts = Object.entries(siteConfig.podcastLinks).filter(([_, podcast]) => podcast.status === 'active');
  const primaryPodcast = activePodcasts.length > 0 ? activePodcasts[0] : null;

  return (
    <ResponsiveDrawerOrDialog
      childTrigger={childTrigger}
      title="About"
      description="About the application"
      descriptionHidden={true}
    >
      <div>
        <p className="mb-2">
          Find your favorite moments & quotes from the{' '}
          {primaryPodcast ? (
            <strong>
              <a href={primaryPodcast[1].url} className="underline" target="_blank" rel="noopener noreferrer">
                {primaryPodcast[1].title}
              </a>
            </strong>
          ) : (
            <strong>podcast</strong>
          )}{' '}
          podcast.
        </p>
        <p className="mb-2">
          <span className="font-bold italic">
            {siteConfig.appHeader.includeTitlePrefix ? <span>[browse.show] </span> : null}
            <span>{siteConfig.appHeader.primaryTitle}</span>
          </span>{' '}
          transcribes and indexes all episodes. Select a search result to jump to that point in the audio.
        </p>
        <p>
          The code is fully open source, and available on <a href="https://github.com/jackkoppa/browse-dot-show" className="underline" target="_blank" rel="noopener noreferrer">GitHub</a>.
        </p>
        <br />
        <p className="mb-2">Something not working? Suggestion for a new feature? Let me know.</p>
        <p>
          <span><GitHubLogoIcon className="size-4 inline-block mr-1" /> <a href="https://github.com/jackkoppa/browse-dot-show/issues/new" className="underline" target="_blank" rel="noopener noreferrer">GitHub</a></span>
          <span className="mx-6">|</span>
          {BlueskyLogo && (
            <span><img src={BlueskyLogo} alt="Bluesky Logo" className="size-4 inline-block mr-1" /> <a href="https://bsky.app/profile/jackkoppa.dev" className="underline" target="_blank" rel="noopener noreferrer">Bluesky</a></span>
          )}
        </p>
        <p className="mt-6 mb-2 text-sm">
          <em>created by <a href="http://jackkoppa.com" className="underline" target="_blank" rel="noopener noreferrer">Jack Koppa</a></em>
        </p>
      </div>
    </ResponsiveDrawerOrDialog>
  )
}

interface SettingsDrawerProps {
  AudioSourceSelect?: React.ComponentType;
}

function SettingsDrawer({ AudioSourceSelect }: SettingsDrawerProps) {
  const childTrigger = (
    <Button variant="ghost" size="icon">
      <GearIcon className="size-6" />
    </Button>
  )

  return (
    <ResponsiveDrawerOrDialog
      childTrigger={childTrigger}
      title="Settings"
      description="App settings and information"
      descriptionHidden={true}
    >
      <div className="w-full pt-4">
        <div className="flex gap-2 text-sm mb-10">
          Theme <ThemeToggle />
        </div>
        {AudioSourceSelect && (
          <div className="flex flex-col gap-3 text-sm mb-10">
            <div className="flex gap-3">
              <span>Audio<br />Source</span>
              <AudioSourceSelect />
            </div>
            <span className="text-[12px]"><strong>Transcribed File</strong> is recommended, to best align transcription with the podcast audio timing.</span>
          </div>
        )}
      </div>
    </ResponsiveDrawerOrDialog>
  )
}

interface AppHeaderProps {
  scrolled: boolean;
  siteConfig: {
    podcastLinks: Record<string, { status: string; url: string; title: string }>;
    appHeader: {
      includeTitlePrefix?: boolean;
      primaryTitle: string;
      taglinePrimaryPodcastExternalURL: string;
      taglinePrimaryPodcastName: string;
      taglineSuffix: string;
    };
  };
  AudioSourceSelect?: React.ComponentType;
  BlueskyLogo?: string;
  showSettings?: boolean;
}

export default function AppHeader({ 
  scrolled, 
  siteConfig, 
  AudioSourceSelect, 
  BlueskyLogo,
  showSettings = true 
}: AppHeaderProps) {

  return (
    <header className={`fixed text-foreground top-0 left-0 right-0 z-20 bg-transparent light:bg-browse-dot-show-theme-light dark:bg-browse-dot-show-theme-dark border-b-2 border-foreground shadow-[0px_4px_0px_rgba(0,0,0,1)]`}>
      <div className={`max-w-3xl mx-auto pr-3 pl-6 flex justify-end gap-2 sm:gap-4 transition-all duration-400 ease-in-out ${scrolled ? 'py-1 xs:py-2' : 'py-2 sm:py-5'}`}>
        <div className="flex flex-col justify-center text-right">
          <h1 className={`font-bold transition-all duration-200 ${scrolled ? 'text-xl xs:text-2xl mb-0' : 'text-2xl xs:text-3xl mb-1'}`}>
            {siteConfig.appHeader.includeTitlePrefix ? <span className={`font-bold ${scrolled ? 'text-[12px] xs:text-[18px]' : 'text-[18px] xs:text-lg'}`}>[browse.show] </span> : null}
            <span className="font-thin">{siteConfig.appHeader.primaryTitle}</span>
          </h1>
          <p className={`text-[12px] italic transition-all duration-200 ${scrolled ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            <span>Search the </span>
            <a href={siteConfig.appHeader.taglinePrimaryPodcastExternalURL} className="underline" target="_blank" rel="noopener noreferrer">{siteConfig.appHeader.taglinePrimaryPodcastName}</a>
            <br className="xs:hidden" />
            {' '}<span>{siteConfig.appHeader.taglineSuffix}</span>
          </p>
        </div>
        <div className={`flex flex-col items-center gap-1 sm:flex-row sm:gap-3 ${scrolled ? 'hidden sm:flex' : ''}`}>
          <InfoDrawer siteConfig={siteConfig} BlueskyLogo={BlueskyLogo} />
          {showSettings && <SettingsDrawer AudioSourceSelect={AudioSourceSelect} />}
        </div>
      </div>
    </header>
  );
} 