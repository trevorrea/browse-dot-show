import { useState, useEffect } from 'react'
import fuzzysort from 'fuzzysort'
import './App.css'

// Import transcript files directly
import COMG8015171916 from './assets/transcripts/COMG8015171916.srt?raw'
import COMG3990255774 from './assets/transcripts/COMG3990255774.srt?raw'

// Import SearchResult component
import SearchResult, { TranscriptEntry } from './components/SearchResult'

// Define search result interface with score
interface SearchResultWithContext {
  result: TranscriptEntry;
  score: number;
  previousLine: TranscriptEntry | null;
  nextLine: TranscriptEntry | null;
}

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultWithContext[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load transcript files on component mount
  useEffect(() => {
    const loadTranscripts = async () => {
      setIsLoading(true);
      try {
        // Get transcripts from imported files
        const transcriptFiles = [
          { content: COMG8015171916, fileName: 'COMG8015171916.srt' },
          { content: COMG3990255774, fileName: 'COMG3990255774.srt' }
        ];
        
        const allTranscripts: TranscriptEntry[] = [];
        
        // Process each file
        for (const { content, fileName } of transcriptFiles) {
          // Parse SRT format
          const lines = content.split('\n');
          let currentEntry: Partial<TranscriptEntry> = {};
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!isNaN(Number(line)) && line !== '') {
              // This is an entry ID
              currentEntry = { id: Number(line) };
            } else if (line.includes('-->')) {
              // This is a timestamp
              const [startTime, endTime] = line.split('-->').map(t => t.trim());
              currentEntry.startTime = startTime;
              currentEntry.endTime = endTime;
            } else if (line.startsWith('[SPEAKER_')) {
              // This is a speaker line with text
              const speakerMatch = line.match(/\[SPEAKER_\d+\]:/);
              const speaker = speakerMatch ? speakerMatch[0] : '';
              const text = line.replace(speaker, '').trim();
              
              currentEntry.speaker = speaker;
              currentEntry.text = text;
              currentEntry.fullText = line;
              currentEntry.fileName = fileName;
              
              if (currentEntry.id !== undefined && 
                  currentEntry.startTime && 
                  currentEntry.text) {
                allTranscripts.push(currentEntry as TranscriptEntry);
                currentEntry = {};
              }
            }
          }
        }
        
        setTranscripts(allTranscripts);
      } catch (error) {
        console.error('Error loading transcripts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTranscripts();
  }, []);

  // Search through transcripts when query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    if (transcripts.length === 0) {
      return;
    }
    
    // Use fuzzysort to search through transcripts
    const results = fuzzysort.go(searchQuery, transcripts, {
      keys: ['text'],
      limit: 100,
      threshold: 0.75 // Lower threshold allows more fuzzy matches
    });
    
    // Map results to transcript entries with context and score
    const searchResultsWithContext = results.map(result => {
      const entry = result.obj;
      const entryIndex = transcripts.findIndex(t => 
        t.id === entry.id && t.fileName === entry.fileName
      );
      
      // Get previous and next lines if they exist
      const previousLine = entryIndex > 0 ? transcripts[entryIndex - 1] : null;
      const nextLine = entryIndex < transcripts.length - 1 ? transcripts[entryIndex + 1] : null;
      
      // Calculate score - take the first score from the key scores array
      // Higher scores are better in fuzzysort
      const score = result.score || -10000;
      
      return {
        result: entry,
        score,
        previousLine,
        nextLine
      };
    });
    
    setSearchResults(searchResultsWithContext);
  }, [searchQuery, transcripts]);

  return (
    <div className="app-container">
      <header>
        <h1>Football Cliches Transcript Search</h1>
        <p>Search through podcast transcripts by typing below</p>
      </header>
      
      <div className="search-container">
        <input
          type="text"
          placeholder="Search transcripts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div className="results-container">
        {isLoading ? (
          <p className="loading-message">Loading transcripts...</p>
        ) : searchResults.length > 0 ? (
          <ul className="results-list">
            {searchResults.map((resultWithContext, index) => (
              <SearchResult 
                key={index}
                result={resultWithContext.result}
                score={resultWithContext.score}
                previousLine={resultWithContext.previousLine}
                nextLine={resultWithContext.nextLine}
              />
            ))}
          </ul>
        ) : searchQuery.trim() !== '' ? (
          <p className="no-results">No results found for "{searchQuery}"</p>
        ) : null}
      </div>
    </div>
  )
}

export default App
