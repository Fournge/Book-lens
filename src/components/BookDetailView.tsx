import React, { useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  Star,
  ExternalLink,
  Share2,
  Copy,
  BookOpen,
  Sparkles,
  Compass,
  Lightbulb,
  Users,
  AlertTriangle,
  Quote,
  Flame,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { BookAnalysis, ShelfStatus, BookRecommendation } from '../types';
import { AudioNarration } from './AudioNarration';
import { AskBookChat } from './AskBookChat';

interface BookDetailViewProps {
  book: BookAnalysis;
  onBack: () => void;
  onSaveToShelf: (book: BookAnalysis, status: ShelfStatus) => void;
  onDeepDiveRecommend: (rec: BookRecommendation) => void;
  isSavedInShelf?: boolean;
  currentShelfStatus?: ShelfStatus;
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  book,
  onBack,
  onSaveToShelf,
  onDeepDiveRecommend,
  isSavedInShelf = false,
  currentShelfStatus,
}) => {
  const [selectedShelfStatus, setSelectedShelfStatus] = useState<ShelfStatus>(
    currentShelfStatus || 'want_to_read'
  );
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');

  const handleCopySummaryCard = () => {
    const text = `📚 BookLens Reading Card: ${book.title} by ${book.author}
Genre: ${book.genre} | Published: ${book.publishedYear || 'N/A'}

✨ Hook: ${book.hook || ''}

📖 Summary:
${book.summary}

🧭 What to Expect:
${book.whatToExpect?.map((e) => `• ${e}`).join('\n')}

💡 Key Takeaways:
${book.keyTakeaways?.map((t) => `• ${t}`).join('\n')}

🙋 Best For: ${book.bestFor}
`;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Check className="w-3 h-3" /> Exact Match
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            Probable Match
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
            Low Confidence
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 sm:space-y-6 pb-12 overflow-hidden">
      {/* Top Navigation / Action bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#dedad0] hover:bg-[#f5f2ea] text-xs font-semibold text-[#1d2430] transition-colors shadow-xs cursor-pointer"
          id="btn-back-to-scanner"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Scanner</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <AudioNarration book={book} />

          <button
            onClick={handleCopySummaryCard}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#dedad0] hover:bg-[#f5f2ea] text-xs font-semibold text-[#1d2430] transition-colors shadow-xs cursor-pointer"
            title="Copy Reading Card Markdown"
            id="btn-copy-card"
          >
            {copiedNotification ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#6b7787]" />
                <span className="hidden sm:inline">Copy Card</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Note / Confidence alert if medium or low */}
      {book.note && (
        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="min-w-0 break-words">
            <span className="font-semibold">Match Notice: </span>
            {book.note}
          </div>
        </div>
      )}

      {/* Hero Book Presentation Card */}
      <div className="bg-white rounded-2xl border border-[#e5e1d7] shadow-sm p-4 sm:p-7">
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-7 items-center sm:items-start">
          {/* Book Cover Artwork */}
          <div className="relative shrink-0 group">
            {book.coverUrl ? (
              <div className="w-32 sm:w-44 aspect-2/3 rounded-xl overflow-hidden shadow-xl border border-black/10 bg-[#f4f1ea] transition-transform group-hover:scale-102">
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-32 sm:w-44 aspect-2/3 rounded-xl bg-gradient-to-br from-[#1d2430] to-[#374151] p-4 text-white flex flex-col justify-between shadow-xl border border-black/20">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">
                  {book.genre}
                </span>
                <div>
                  <h4 className="font-serif font-bold text-sm leading-snug line-clamp-3">
                    {book.title}
                  </h4>
                  <p className="text-xs text-white/70 mt-1">{book.author}</p>
                </div>
                <BookOpen className="w-5 h-5 text-white/30" />
              </div>
            )}
          </div>

          {/* Book Main Info */}
          <div className="flex-1 min-w-0 w-full text-center sm:text-left space-y-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100/90 text-amber-900 border border-amber-300">
                {book.genre}
              </span>
              {getConfidenceBadge(book.confidence)}
              {book.publishedYear && (
                <span className="text-xs text-[#6b7787] font-medium">
                  {book.publishedYear}
                </span>
              )}
            </div>

            <div className="break-words">
              <h1 className="text-xl sm:text-3xl font-serif font-bold text-[#1d2430] leading-tight">
                {book.title}
              </h1>
              {book.subtitle && (
                <p className="text-xs sm:text-sm text-[#526071] font-medium mt-0.5">
                  {book.subtitle}
                </p>
              )}
              <p className="text-sm sm:text-base text-[#4b5563] font-medium mt-1">
                by <span className="text-[#1d2430] font-semibold">{book.author}</span>
              </p>
            </div>

            {/* Google Books Rating & Metadata */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs text-[#526071] pt-1">
              {book.averageRating ? (
                <div className="flex items-center gap-1.5 font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{book.averageRating.toFixed(1)} / 5</span>
                  {book.ratingsCount && (
                    <span className="text-[#718096] font-normal">
                      ({book.ratingsCount.toLocaleString()})
                    </span>
                  )}
                </div>
              ) : null}

              {book.pageCount && (
                <div className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#6b7787]" />
                  <span>{book.pageCount} pages</span>
                </div>
              )}

              {book.googleBooksUrl && (
                <a
                  href={book.googleBooksUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-800 hover:text-amber-950 font-medium hover:underline"
                >
                  <span>Google Books</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Save to Shelf Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2">
              <div className="flex flex-wrap justify-center rounded-xl border border-[#d6d0c2] bg-[#faf8f4] p-1 shadow-2xs gap-1 max-w-full">
                <button
                  onClick={() => onSaveToShelf(book, 'want_to_read')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSavedInShelf && selectedShelfStatus === 'want_to_read'
                      ? 'bg-[#1d2430] text-white shadow-xs'
                      : 'text-[#4b5563] hover:text-[#1d2430] hover:bg-[#eae4d5]'
                  }`}
                >
                  Want to Read
                </button>
                <button
                  onClick={() => onSaveToShelf(book, 'reading')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSavedInShelf && selectedShelfStatus === 'reading'
                      ? 'bg-[#1d2430] text-white shadow-xs'
                      : 'text-[#4b5563] hover:text-[#1d2430] hover:bg-[#eae4d5]'
                  }`}
                >
                  Currently Reading
                </button>
                <button
                  onClick={() => onSaveToShelf(book, 'finished')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSavedInShelf && selectedShelfStatus === 'finished'
                      ? 'bg-[#1d2430] text-white shadow-xs'
                      : 'text-[#4b5563] hover:text-[#1d2430] hover:bg-[#eae4d5]'
                  }`}
                >
                  Finished
                </button>
              </div>

              {isSavedInShelf && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  Saved on Shelf
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subgenres tags */}
        {book.subgenres && book.subgenres.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#e5e1d7] flex flex-wrap gap-1.5">
            {book.subgenres.map((tag, i) => (
              <span
                key={i}
                className="text-xs bg-[#f4f1ea] text-[#4b5563] px-2.5 py-1 rounded-md border border-[#e0dad0]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reading Vibe Metric Bar */}
      {book.readingVibe && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white rounded-xl border border-[#e5e1d7] p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#6b7787] font-medium mb-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>Pacing</span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#1d2430] leading-snug break-words">
              {book.readingVibe.pace}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e5e1d7] p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#6b7787] font-medium mb-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Difficulty</span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#1d2430] leading-snug break-words">
              {book.readingVibe.difficulty}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e5e1d7] p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#6b7787] font-medium mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Tone</span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#1d2430] leading-snug break-words">
              {book.readingVibe.tone}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e5e1d7] p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#6b7787] font-medium mb-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span>Atmosphere</span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#1d2430] leading-snug break-words">
              {book.readingVibe.mood}
            </div>
          </div>
        </div>
      )}

      {/* Memorable Quote / Elevator Hook */}
      {(book.hook || book.memorableQuoteOrVibe) && (
        <div className="bg-gradient-to-r from-[#faf8f4] to-[#f5f1e8] rounded-2xl border border-[#e4dfd4] p-4 sm:p-6 relative shadow-2xs overflow-hidden break-words">
          <Quote className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600/20 absolute right-3 sm:right-4 top-3 sm:top-4" />
          {book.hook && (
            <p className="text-sm sm:text-lg font-serif italic text-[#1d2430] font-medium leading-relaxed pr-6 sm:pr-8">
              &ldquo;{book.hook}&rdquo;
            </p>
          )}
          {book.memorableQuoteOrVibe && book.hook !== book.memorableQuoteOrVibe && (
            <p className="text-xs text-[#6b7787] mt-2 font-medium">
              Vibe: {book.memorableQuoteOrVibe}
            </p>
          )}
        </div>
      )}

      {/* Main Core Intelligence Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Summary Card */}
        <div className="bg-white rounded-2xl border border-[#e5e1d7] p-5 sm:p-6 space-y-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-serif font-bold text-[#1d2430]">
              <BookOpen className="w-4 h-4 text-amber-700" />
              <h3>Spoiler-Free Synopsis</h3>
            </div>
            <p className="text-sm text-[#374151] leading-relaxed mt-2.5">
              {book.summary}
            </p>
          </div>

          <div className="pt-3 border-t border-[#f0ece3] text-xs text-[#6b7787] flex items-center justify-between">
            <span>Verified AI Summary</span>
            <span className="font-mono text-[11px]">Zero Spoilers</span>
          </div>
        </div>

        {/* What to Expect */}
        <div className="bg-white rounded-2xl border border-[#e5e1d7] p-5 sm:p-6 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-sm font-serif font-bold text-[#1d2430]">
            <Compass className="w-4 h-4 text-amber-700" />
            <h3>What to Expect</h3>
          </div>
          <ul className="space-y-2 mt-2">
            {book.whatToExpect?.map((item, idx) => (
              <li
                key={idx}
                className="text-xs sm:text-sm text-[#374151] flex items-start gap-2 leading-relaxed"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Key Takeaways & Themes */}
        <div className="bg-white rounded-2xl border border-[#e5e1d7] p-5 sm:p-6 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-sm font-serif font-bold text-[#1d2430]">
            <Lightbulb className="w-4 h-4 text-amber-700" />
            <h3>Core Takeaways &amp; Themes</h3>
          </div>
          <ul className="space-y-2 mt-2">
            {book.keyTakeaways?.map((item, idx) => (
              <li
                key={idx}
                className="text-xs sm:text-sm text-[#374151] flex items-start gap-2 leading-relaxed"
              >
                <span className="w-4 h-4 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Best For & Content Guidance */}
        <div className="bg-white rounded-2xl border border-[#e5e1d7] p-5 sm:p-6 space-y-4 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 text-sm font-serif font-bold text-[#1d2430]">
              <Users className="w-4 h-4 text-amber-700" />
              <h3>Who Will Adore This Book</h3>
            </div>
            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed mt-2">
              {book.bestFor}
            </p>
          </div>

          {book.contentNotes && book.contentNotes.length > 0 && (
            <div className="pt-3 border-t border-[#f0ece3]">
              <div className="text-xs font-semibold text-[#4b5563] mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Reader Advisory &amp; Content Notes:</span>
              </div>
              <ul className="space-y-1">
                {book.contentNotes.map((note, i) => (
                  <li key={i} className="text-xs text-[#6b7787]">
                    • {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Interactive AI Companion Chat */}
      <AskBookChat book={book} />

      {/* 5 Curated Next Reads (Recommendations) */}
      <div className="bg-white rounded-2xl border border-[#e5e1d7] p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h3 className="font-serif font-bold text-lg text-[#1d2430]">
              If You Enjoyed This, Read Next
            </h3>
          </div>
          <span className="text-xs text-[#6b7787]">5 Curated Matches</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 pt-1">
          {book.recommendations?.map((rec, index) => (
            <div
              key={index}
              className="bg-[#faf8f4] hover:bg-white rounded-xl border border-[#e4dfd4] hover:border-[#1d2430] p-3 sm:p-3.5 flex gap-3 sm:gap-3.5 transition-all group overflow-hidden max-w-full"
            >
              {/* Cover thumbnail */}
              <div className="w-14 h-20 rounded-md bg-[#ede8de] overflow-hidden shrink-0 border border-black/10 shadow-2xs">
                {rec.coverUrl ? (
                  <img
                    src={rec.coverUrl}
                    alt={rec.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl bg-[#e5dfd2]">
                    📖
                  </div>
                )}
              </div>

              {/* Rec Details */}
              <div className="flex-1 min-w-0 flex flex-col justify-between overflow-hidden">
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded truncate">
                      {rec.genre || 'Match'}
                    </span>
                    {rec.rating && (
                      <span className="text-[11px] font-medium text-amber-700 flex items-center gap-0.5 shrink-0">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {rec.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <h4 className="font-serif font-bold text-sm text-[#1d2430] mt-1 truncate">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-[#6b7787] truncate">by {rec.author}</p>
                  <p className="text-xs text-[#374151] mt-1.5 line-clamp-2 leading-relaxed break-words">
                    {rec.why}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between gap-1 min-w-0">
                  {rec.matchReason && (
                    <span className="text-[10px] text-[#6b7787] italic truncate flex-1 min-w-0">
                      {rec.matchReason}
                    </span>
                  )}
                  <button
                    onClick={() => onDeepDiveRecommend(rec)}
                    className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 shrink-0 ml-auto cursor-pointer"
                  >
                    <span>Analyze</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
