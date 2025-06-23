import { useState } from 'react'
import { Button } from '@browse-dot-show/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@browse-dot-show/ui'
import { Input } from '@browse-dot-show/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@browse-dot-show/ui'
import { ThemeToggle } from '@browse-dot-show/blocks'
import { SearchIcon, ExternalLinkIcon, GitHubLogoIcon } from '@radix-ui/react-icons'
import deployedSites from './deployed-sites.config.jsonc'

interface Site {
  isOriginSite: boolean;
  name: string;
  podcastFullDescription: string;
  url: string;
  imageUrl: string;
}

function UniversalSearch() {
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const sites = deployedSites.sites as Record<string, Site>

  const handleSearch = () => {
    if (selectedSite && searchQuery.trim()) {
      const site = sites[selectedSite]
      const encodedQuery = encodeURIComponent(searchQuery.trim())
      const searchUrl = `${site.url}/?q=${encodedQuery}`
      window.open(searchUrl, '_blank')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          <span className="text-2xl mb-2 block">📝🔍🎙️</span>
          <span className="text-xl">transcribe & search any podcast</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <label htmlFor="site-select" className="block text-sm font-medium mb-2">
              Choose a podcast site:
            </label>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger id="site-select">
                <SelectValue placeholder="Select a podcast site..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sites).map(([siteId, site]) => (
                  <SelectItem key={siteId} value={siteId}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label htmlFor="search-input" className="block text-sm font-medium mb-2">
              Search term:
            </label>
            <div className="flex gap-2">
              <Input
                id="search-input"
                type="text"
                placeholder={selectedSite ? "Enter your search term..." : "Select a site first"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!selectedSite}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={!selectedSite || !searchQuery.trim()}
                size="icon"
              >
                <SearchIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CTASection() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Want your favorite podcast here?</h2>
        <p className="text-muted-foreground">
          This tool can transcribe and make searchable any podcast. You have two options:
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-lg">🗳️ Request a Podcast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vote for podcasts you'd like to see added to browse.show
            </p>
            <Button 
              className="w-full" 
              onClick={() => window.open('https://docs.google.com/document/d/11p38njNdKeJF49XHPtYN-Gb6fotPCkoQIW8V4UDC9hA/edit?usp=sharing', '_blank')}
            >
              Vote for Podcasts
              <ExternalLinkIcon className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-lg">🔧 Self-Host</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Deploy your own instance for any podcast
            </p>
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => window.open('https://github.com/jackkoppa/browse-dot-show/blob/main/docs/GETTING_STARTED.md', '_blank')}
            >
              <GitHubLogoIcon className="mr-2 h-4 w-4" />
              Getting Started Guide
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-foreground bg-transparent">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="text-lg">[browse.show]</span>{' '}
              <span className="font-thin">Homepage</span>
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 space-y-16">
        <UniversalSearch />
        <CTASection />
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-foreground mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>
            Created by{' '}
            <a 
              href="http://jackkoppa.com" 
              className="underline hover:text-foreground"
              target="_blank" 
              rel="noopener noreferrer"
            >
              Jack Koppa
            </a>
            {' '}• Open source on{' '}
            <a 
              href="https://github.com/jackkoppa/browse-dot-show" 
              className="underline hover:text-foreground"
              target="_blank" 
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App 