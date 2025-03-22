import React from 'react';

// Define the structure of a transcript entry
export interface TranscriptEntry {
  id: number;
  startTime: string;
  endTime: string;
  speaker: string;
  text: string;
  fullText: string;
  fileName: string;
}

// Define the structure of a search result with score and context
export interface SearchResultProps {
  result: TranscriptEntry;
  score: number;
  previousLine?: TranscriptEntry | null;
  nextLine?: TranscriptEntry | null;
}

const SearchResult: React.FC<SearchResultProps> = ({ 
  result, 
  score, 
  previousLine, 
  nextLine 
}) => {
  return (
    <li className="result-item">
      <div className="result-header">
        <span className="result-timestamp">{result.startTime.split(',')[0]}</span>
        <span className="result-score">Score: {score.toFixed(2)}</span>
        <span className="result-filename">{result.fileName}</span>
      </div>
      
      {previousLine && (
        <div className="result-context result-context-previous">
          <span className="result-speaker">{previousLine.speaker}</span>
          <span className="result-text">{previousLine.text}</span>
        </div>
      )}
      
      <div className="result-content">
        <span className="result-speaker">{result.speaker}</span>
        <span className="result-text">{result.text}</span>
      </div>
      
      {nextLine && (
        <div className="result-context result-context-next">
          <span className="result-speaker">{nextLine.speaker}</span>
          <span className="result-text">{nextLine.text}</span>
        </div>
      )}
    </li>
  );
};

export default SearchResult; 