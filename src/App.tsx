import { useState, useEffect } from 'react'
import fuzzysort from 'fuzzysort'
import './App.css'

// Import transcript files directly
import COMG8015171916 from './assets/transcripts/COMG8015171916.srt?raw'
import COMG3990255774 from './assets/transcripts/COMG3990255774.srt?raw'

// Define transcript entry interface
interface TranscriptEntry {
  id: number;
  startTime: string;
  endTime: string;
  speaker: string;
  text: string;
  fullText: string; // Original line with speaker and text
  fileName: string;
}

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TranscriptEntry[]>([]);
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
      limit: 20, // Limit to 20 results
      threshold: -10000 // Lower threshold allows more fuzzy matches
    });
    
    // Map results to transcript entries
    const searchResults = results.map(result => result.obj);
    setSearchResults(searchResults);
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
            {searchResults.map((result, index) => (
              <li key={index} className="result-item">
                <div className="result-header">
                  <span className="result-timestamp">{result.startTime.split(',')[0]}</span>
                  <span className="result-filename">{result.fileName}</span>
                </div>
                <div className="result-content">
                  <span className="result-speaker">{result.speaker}</span>
                  <span className="result-text">{result.text}</span>
                </div>
              </li>
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
