/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ScanStudio } from './components/ScanStudio';
import { BookDetailView } from './components/BookDetailView';
import { BookshelfView } from './components/BookshelfView';
import { BookAnalysis, ShelfItem, ShelfStatus, BookRecommendation } from './types';
import { SAMPLE_BOOKS } from './data/sampleBooks';
import { AlertCircle, X, Sparkles, BookOpen, Check, RefreshCw } from 'lucide-react';

const SHELF_STORAGE_KEY = 'booklens_reading_shelf_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'search' | 'shelf'>('scan');
  const [currentBook, setCurrentBook] = useState<BookAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<{ imageBase64?: string; mediaType?: string; query?: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shelf, setShelf] = useState<ShelfItem[]>(() => {
    try {
      const saved = localStorage.getItem(SHELF_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync shelf to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SHELF_STORAGE_KEY, JSON.stringify(shelf));
    } catch (e) {
      console.warn('Could not save shelf to localStorage:', e);
    }
  }, [shelf]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  // Error cleaner helper
  const cleanErrorMessage = (raw: string): string => {
    if (!raw) return 'Something went wrong. Please try again.';
    try {
      if (raw.includes('{') && raw.includes('}')) {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        const parsed = JSON.parse(raw.substring(start, end + 1));
        if (parsed?.error?.message) return parsed.error.message;
        if (parsed?.message) return parsed.message;
      }
    } catch {
      // Ignore parse errors
    }
    if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
      return 'The AI service is experiencing high demand right now. Please try again in a few moments, or explore one of our 1-click sample books!';
    }
    if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
      return 'Request limit reached. Please wait a few seconds before trying again.';
    }
    return raw;
  };

  // Perform AI analysis on book image or query
  const handleAnalyze = async (payload: {
    imageBase64?: string;
    mediaType?: string;
    query?: string;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLastPayload(payload);

    try {
      const res = await fetch('/api/analyze-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with error status ${res.status}`);
      }

      const data: BookAnalysis = await res.json();

      if (!data.found) {
        setErrorMessage(
          data.note ||
            "We couldn't clearly recognize the book. Try a clearer photo of the front cover or type the title directly."
        );
        return;
      }

      setCurrentBook(data);
      showToast(`Recognized "${data.title}" by ${data.author}!`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Analyze book error:', err);
      setErrorMessage(
        cleanErrorMessage(
          err.message ||
            'Something went wrong while reading the book. Please try again or search by title.'
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click sample selection
  const handleSelectSample = (sample: BookAnalysis) => {
    setCurrentBook(sample);
    setErrorMessage(null);
    showToast(`Loaded "${sample.title}"!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save book to shelf
  const handleSaveToShelf = (book: BookAnalysis, status: ShelfStatus) => {
    setShelf((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.book.title.toLowerCase() === book.title.toLowerCase()
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          status,
        };
        return updated;
      } else {
        const newItem: ShelfItem = {
          id: Date.now().toString(),
          book,
          status,
          addedAt: new Date().toISOString(),
        };
        return [newItem, ...prev];
      }
    });

    const statusLabel =
      status === 'want_to_read'
        ? 'Want to Read'
        : status === 'reading'
        ? 'Currently Reading'
        : 'Finished';
    showToast(`Saved to "${statusLabel}"!`);
  };

  // Update shelf status
  const handleUpdateStatus = (id: string, status: ShelfStatus) => {
    setShelf((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  // Update shelf personal rating
  const handleUpdateRating = (id: string, rating: number) => {
    setShelf((prev) =>
      prev.map((item) => (item.id === id ? { ...item, userRating: rating } : item))
    );
  };

  // Update shelf user notes
  const handleUpdateNotes = (id: string, notes: string) => {
    setShelf((prev) =>
      prev.map((item) => (item.id === id ? { ...item, userNotes: notes } : item))
    );
  };

  // Remove from shelf
  const handleRemoveFromShelf = (id: string) => {
    setShelf((prev) => prev.filter((item) => item.id !== id));
    showToast('Removed from shelf.');
  };

  // Deep dive a recommendation
  const handleDeepDiveRecommend = (rec: BookRecommendation) => {
    handleAnalyze({
      query: `${rec.title} ${rec.author}`,
    });
  };

  const isCurrentBookSaved = currentBook
    ? shelf.some(
        (i) => i.book.title.toLowerCase() === currentBook.title.toLowerCase()
      )
    : false;

  const currentBookShelfStatus = currentBook
    ? shelf.find(
        (i) => i.book.title.toLowerCase() === currentBook.title.toLowerCase()
      )?.status
    : undefined;

  return (
    <div className="min-h-screen bg-[#f8f6f1] flex flex-col font-sans text-[#1d2430] w-full max-w-full overflow-x-hidden">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'shelf') {
            // Keep currentBook in background
          }
        }}
        shelfCount={shelf.length}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 overflow-x-hidden">
        {/* Error Notification Alert with One-Click Recovery */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm flex flex-col gap-3 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Notice: </span>
                  <span>{errorMessage}</span>
                </div>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="p-1 rounded-md text-red-700 hover:bg-red-100 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-200/60 mt-1">
              {lastPayload && (
                <button
                  onClick={() => handleAnalyze(lastPayload)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-medium text-xs transition-colors shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Retry Scan
                </button>
              )}
              <span className="text-xs text-red-700 font-medium">Or explore instantly:</span>
              {SAMPLE_BOOKS.slice(0, 3).map((sample) => (
                <button
                  key={sample.title}
                  onClick={() => handleSelectSample(sample.sampleAnalysis)}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-50 border border-red-200 text-stone-800 text-xs font-medium transition-colors"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* View Routing */}
        {activeTab === 'shelf' ? (
          <BookshelfView
            shelf={shelf}
            onSelectBook={(b) => {
              setCurrentBook(b);
              setActiveTab('scan');
            }}
            onUpdateStatus={handleUpdateStatus}
            onUpdateRating={handleUpdateRating}
            onUpdateNotes={handleUpdateNotes}
            onRemoveFromShelf={handleRemoveFromShelf}
            onNavigateToScan={() => {
              setCurrentBook(null);
              setActiveTab('scan');
            }}
          />
        ) : currentBook ? (
          <BookDetailView
            book={currentBook}
            onBack={() => {
              setCurrentBook(null);
            }}
            onSaveToShelf={handleSaveToShelf}
            onDeepDiveRecommend={handleDeepDiveRecommend}
            isSavedInShelf={isCurrentBookSaved}
            currentShelfStatus={currentBookShelfStatus}
          />
        ) : (
          <ScanStudio
            onAnalyze={handleAnalyze}
            onSelectSample={handleSelectSample}
            isLoading={isLoading}
            activeMode={activeTab === 'search' ? 'search' : 'scan'}
            setActiveMode={(mode) => setActiveTab(mode)}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1d2430] text-white px-4 py-2.5 rounded-xl shadow-lg border border-white/10 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#e7e3da] bg-[#fbf9f5] py-6 text-center text-xs text-[#6b7787]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 font-serif font-semibold text-[#1d2430]">
            <BookOpen className="w-4 h-4 text-amber-700" />
            <span>BookLens</span>
            <span className="font-sans font-normal text-xs text-[#8c96a5]">
              — Powered by Gemini Vision &amp; Google Books
            </span>
          </div>
          <div className="text-xs text-[#6b7787]">
            Visual bibliophile discovery • Spoiler-free reader insights
          </div>
        </div>
      </footer>
    </div>
  );
}
