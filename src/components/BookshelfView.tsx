import React, { useState } from 'react';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Clock,
  Star,
  Trash2,
  ExternalLink,
  Download,
  Search,
  Filter,
  FileText,
  Sparkles,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { ShelfItem, ShelfStatus, BookAnalysis } from '../types';

interface BookshelfViewProps {
  shelf: ShelfItem[];
  onSelectBook: (book: BookAnalysis) => void;
  onUpdateStatus: (id: string, status: ShelfStatus) => void;
  onUpdateRating: (id: string, rating: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onRemoveFromShelf: (id: string) => void;
  onNavigateToScan: () => void;
}

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  shelf,
  onSelectBook,
  onUpdateStatus,
  onUpdateRating,
  onUpdateNotes,
  onRemoveFromShelf,
  onNavigateToScan,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | ShelfStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');

  const filteredShelf = shelf.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
    const matchesSearch =
      item.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.book.genre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const exportShelfAsMarkdown = () => {
    let md = `# 📚 My BookLens Reading Shelf\n\nExported on: ${new Date().toLocaleDateString()}\n\n`;
    shelf.forEach((item, idx) => {
      md += `## ${idx + 1}. ${item.book.title}\n`;
      md += `**Author**: ${item.book.author} | **Genre**: ${item.book.genre}\n`;
      md += `**Shelf Status**: ${item.status.replace('_', ' ').toUpperCase()}\n`;
      if (item.userRating) md += `**Personal Rating**: ${'★'.repeat(item.userRating)}\n`;
      if (item.userNotes) md += `**Personal Notes**: ${item.userNotes}\n`;
      md += `\n**Summary**: ${item.book.summary}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booklens-shelf-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wantToReadCount = shelf.filter((i) => i.status === 'want_to_read').length;
  const readingCount = shelf.filter((i) => i.status === 'reading').length;
  const finishedCount = shelf.filter((i) => i.status === 'finished').length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Stats Banner */}
      <div className="bg-white rounded-2xl border border-[#e5e1d7] p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-600" />
              <h2 className="font-serif font-bold text-2xl text-[#1d2430]">
                My Reading Shelf
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#6b7787] mt-1">
              Your personalized collection of scanned books, reading logs, and notes.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {shelf.length > 0 && (
              <button
                onClick={exportShelfAsMarkdown}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#faf8f4] hover:bg-[#eae4d5] border border-[#d6d0c2] text-xs font-semibold text-[#1d2430] transition-colors"
                id="btn-export-shelf"
              >
                <Download className="w-3.5 h-3.5 text-amber-700" />
                <span>Export Journal (.md)</span>
              </button>
            )}

            <button
              onClick={onNavigateToScan}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1d2430] hover:bg-[#2c3647] text-white text-xs font-semibold transition-colors shadow-xs"
              id="btn-scan-new-from-shelf"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Scan Book</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#f0ede6]">
          <div className="bg-[#faf8f4] rounded-xl p-3 border border-[#e8e4da] text-center sm:text-left">
            <div className="text-[11px] text-[#6b7787] font-medium">Want to Read</div>
            <div className="text-lg font-serif font-bold text-[#1d2430]">{wantToReadCount}</div>
          </div>
          <div className="bg-[#faf8f4] rounded-xl p-3 border border-[#e8e4da] text-center sm:text-left">
            <div className="text-[11px] text-[#6b7787] font-medium">Reading</div>
            <div className="text-lg font-serif font-bold text-amber-800">{readingCount}</div>
          </div>
          <div className="bg-[#faf8f4] rounded-xl p-3 border border-[#e8e4da] text-center sm:text-left">
            <div className="text-[11px] text-[#6b7787] font-medium">Finished</div>
            <div className="text-lg font-serif font-bold text-emerald-800">{finishedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap rounded-xl border border-[#d6d0c2] bg-white p-1 shadow-2xs gap-1 max-w-full">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#1d2430] text-white shadow-xs'
                : 'text-[#4b5563] hover:text-[#1d2430]'
            }`}
          >
            All ({shelf.length})
          </button>
          <button
            onClick={() => setActiveFilter('want_to_read')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'want_to_read'
                ? 'bg-[#1d2430] text-white shadow-xs'
                : 'text-[#4b5563] hover:text-[#1d2430]'
            }`}
          >
            Want to Read
          </button>
          <button
            onClick={() => setActiveFilter('reading')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'reading'
                ? 'bg-[#1d2430] text-white shadow-xs'
                : 'text-[#4b5563] hover:text-[#1d2430]'
            }`}
          >
            Reading
          </button>
          <button
            onClick={() => setActiveFilter('finished')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'finished'
                ? 'bg-[#1d2430] text-white shadow-xs'
                : 'text-[#4b5563] hover:text-[#1d2430]'
            }`}
          >
            Finished
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter shelf by title or author..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#d6d0c2] bg-white text-xs text-[#1d2430] placeholder-[#9ca3af] outline-none focus:border-[#1d2430]"
          />
          <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Book Items List */}
      {filteredShelf.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e5e1d7] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base text-[#1d2430]">
            {shelf.length === 0 ? 'Your shelf is empty' : 'No books match your filter'}
          </h3>
          <p className="text-xs text-[#6b7787] max-w-sm mx-auto">
            {shelf.length === 0
              ? 'Snap a book cover or search a title to build your smart reading library.'
              : 'Try selecting a different status filter or clearing your search term.'}
          </p>
          {shelf.length === 0 && (
            <button
              onClick={onNavigateToScan}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1d2430] text-white text-xs font-semibold hover:bg-[#2c3647] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Scan Your First Book</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredShelf.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#e5e1d7] p-4 sm:p-5 shadow-2xs hover:border-[#1d2430]/30 transition-all flex flex-col sm:flex-row gap-4 sm:gap-5"
            >
              {/* Cover thumbnail */}
              <div
                onClick={() => onSelectBook(item.book)}
                className="w-20 sm:w-24 aspect-2/3 rounded-lg bg-[#ede8de] overflow-hidden shrink-0 border border-black/10 shadow-xs cursor-pointer group"
              >
                {item.book.coverUrl ? (
                  <img
                    src={item.book.coverUrl}
                    alt={item.book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-xs p-2 text-center bg-[#e2dcce] font-serif font-bold text-[#1d2430]">
                    {item.book.title}
                  </div>
                )}
              </div>

              {/* Book content and controls */}
              <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {item.book.genre}
                        </span>
                        <span className="text-[11px] text-[#8c96a5]">
                          Added {new Date(item.addedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4
                        onClick={() => onSelectBook(item.book)}
                        className="font-serif font-bold text-base text-[#1d2430] hover:text-amber-800 cursor-pointer mt-1"
                      >
                        {item.book.title}
                      </h4>
                      <p className="text-xs text-[#6b7787]">by {item.book.author}</p>
                    </div>

                    <button
                      onClick={() => onRemoveFromShelf(item.id)}
                      className="p-1.5 rounded-lg text-[#9ca3af] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove from shelf"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-[#4b5563] mt-2 line-clamp-2 leading-relaxed">
                    {item.book.summary}
                  </p>
                </div>

                {/* Status Switcher & User Rating */}
                <div className="pt-2 border-t border-[#f2eee5] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        onUpdateStatus(item.id, e.target.value as ShelfStatus)
                      }
                      className="text-xs font-semibold bg-[#faf8f4] border border-[#d6d0c2] text-[#1d2430] rounded-lg px-2.5 py-1 outline-none"
                    >
                      <option value="want_to_read">Want to Read</option>
                      <option value="reading">Currently Reading</option>
                      <option value="finished">Finished</option>
                    </select>

                    {/* Star Rating */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() =>
                            onUpdateRating(
                              item.id,
                              item.userRating === star ? 0 : star
                            )
                          }
                          className="p-0.5 text-amber-400 hover:scale-110 transition-transform"
                          title={`Rate ${star} star`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              (item.userRating || 0) >= star
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-[#d1cac0]'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (editingNotesId === item.id) {
                          setEditingNotesId(null);
                        } else {
                          setEditingNotesId(item.id);
                          setNoteText(item.userNotes || '');
                        }
                      }}
                      className="text-xs font-medium text-amber-800 hover:text-amber-950 flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{item.userNotes ? 'Edit Notes' : 'Add Note'}</span>
                    </button>

                    <button
                      onClick={() => onSelectBook(item.book)}
                      className="text-xs font-semibold text-[#1d2430] bg-[#faf8f4] hover:bg-[#eae4d5] border border-[#d6d0c2] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <span>Full Lens</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Personal Notes Inline Box */}
                {(editingNotesId === item.id || item.userNotes) && (
                  <div className="pt-2">
                    {editingNotesId === item.id ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Your personal thoughts, favorite quotes, or reading reflections..."
                          className="w-full text-xs p-2.5 rounded-lg border border-[#d6d0c2] bg-[#faf8f4] outline-none focus:border-[#1d2430] text-[#1d2430]"
                          rows={2}
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingNotesId(null)}
                            className="text-xs px-2.5 py-1 rounded-md text-[#6b7787] hover:bg-[#f2eee5]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              onUpdateNotes(item.id, noteText);
                              setEditingNotesId(null);
                            }}
                            className="text-xs px-3 py-1 rounded-md bg-[#1d2430] text-white font-semibold"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : item.userNotes ? (
                      <div className="text-xs bg-[#faf8f4] border border-[#e8e4da] p-2.5 rounded-lg text-[#374151] italic">
                        &ldquo;{item.userNotes}&rdquo;
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
