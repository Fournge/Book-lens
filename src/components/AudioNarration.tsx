import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { BookAnalysis } from '../types';

interface AudioNarrationProps {
  book: BookAnalysis;
}

export const AudioNarration: React.FC<AudioNarrationProps> = ({ book }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [rate, setRate] = useState<number>(1);
  const [progressText, setProgressText] = useState<string>('');

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const fullTextToRead = `Book overview for ${book.title}, by ${book.author}. ${book.hook || ''} Summary: ${book.summary}. What to expect: ${book.whatToExpect?.join('. ') || ''}. Best for: ${book.bestFor || ''}`;

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleTogglePlay = () => {
    if (!isSupported) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel(); // clear previous
      const utterance = new SpeechSynthesisUtterance(fullTextToRead);
      utterance.rate = rate;
      utterance.pitch = 1.0;

      // Select natural sounding voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en')
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = (e) => {
        console.warn('TTS error:', e);
        setIsPlaying(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleRateChange = () => {
    const rates = [1, 1.25, 1.5];
    const nextIdx = (rates.indexOf(rate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setRate(nextRate);
    if (isPlaying) {
      // restart with new rate
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(fullTextToRead);
      utterance.rate = nextRate;
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-[#f4f0e6] border border-[#e1dcce] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-medium text-[#2d3748]">
      <button
        onClick={handleTogglePlay}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
          isPlaying
            ? 'bg-amber-600 text-white shadow-xs'
            : 'bg-white text-[#1d2430] border border-[#d5cfc0] hover:bg-[#eae4d5]'
        }`}
        id="btn-audio-listen"
      >
        {isPlaying ? (
          <>
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pause Audio</span>
            <span className="sm:hidden">Pause</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Listen to Summary</span>
            <span className="sm:hidden">Listen</span>
          </>
        )}
      </button>

      {isPlaying && (
        <div className="flex items-center gap-1 px-1 text-amber-700">
          <span className="w-1 h-3 bg-amber-600 rounded-full animate-pulse" />
          <span className="w-1 h-4 bg-amber-600 rounded-full animate-pulse delay-75" />
          <span className="w-1 h-2 bg-amber-600 rounded-full animate-pulse delay-150" />
        </div>
      )}

      <button
        onClick={handleRateChange}
        className="px-1.5 sm:px-2 py-1 bg-white hover:bg-[#eae4d5] border border-[#d5cfc0] rounded-md text-[11px] font-mono font-semibold cursor-pointer"
        title="Playback Speed"
      >
        {rate}x
      </button>
    </div>
  );
};
