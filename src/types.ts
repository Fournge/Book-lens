export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface BookRecommendation {
  title: string;
  author: string;
  genre: string;
  why: string;
  matchReason?: string;
  coverUrl?: string;
  googleBooksUrl?: string;
  rating?: number;
  publishedYear?: string;
}

export interface ReadingVibe {
  pace: string;
  difficulty: string;
  tone: string;
  mood: string;
}

export interface BookAnalysis {
  found: boolean;
  title: string;
  subtitle?: string;
  author: string;
  confidence: ConfidenceLevel;
  genre: string;
  subgenres?: string[];
  publishedYear?: string;
  pageCount?: number;
  isbn?: string;
  coverUrl?: string;
  googleBooksUrl?: string;
  averageRating?: number;
  ratingsCount?: number;
  hook?: string;
  summary: string;
  whatToExpect: string[];
  keyTakeaways: string[];
  bestFor: string;
  contentNotes?: string[];
  memorableQuoteOrVibe?: string;
  readingVibe?: ReadingVibe;
  recommendations: BookRecommendation[];
  note?: string;
  scannedAt?: string;
  scanSource?: 'photo' | 'search' | 'sample';
}

export type ShelfStatus = 'want_to_read' | 'reading' | 'finished';

export interface ShelfItem {
  id: string;
  book: BookAnalysis;
  status: ShelfStatus;
  userRating?: number;
  userNotes?: string;
  addedAt: string;
  favorite?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface SampleBookPreset {
  id: string;
  title: string;
  author: string;
  genre: string;
  tagline: string;
  imageUrl: string;
  data: BookAnalysis;
}
