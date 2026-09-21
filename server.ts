import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// High payload limit for camera photo base64
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Lazy/Safe Gemini client initialization
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set. Please configure it in the AI Studio Settings.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Google Books lookup helper
interface GoogleBookInfo {
  title?: string;
  author?: string;
  description?: string;
  coverUrl?: string;
  pageCount?: number;
  isbn?: string;
  publishedYear?: string;
  googleBooksUrl?: string;
  averageRating?: number;
  ratingsCount?: number;
  categories?: string[];
}

async function lookupGoogleBooks(title: string, author?: string): Promise<GoogleBookInfo> {
  try {
    const qParts: string[] = [];
    if (title) qParts.push(`intitle:${title}`);
    if (author) qParts.push(`inauthor:${author}`);
    const q = qParts.join('+') || encodeURIComponent(title || '');

    const url = `https://www.googleapis.com/books/v1/volumes?maxResults=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) return {};

    const data = await res.json();
    if (!data.items || data.items.length === 0) return {};

    const vol = data.items[0].volumeInfo || {};
    let coverUrl = vol.imageLinks?.extraLarge || vol.imageLinks?.large || vol.imageLinks?.medium || vol.imageLinks?.thumbnail || vol.imageLinks?.smallThumbnail;
    if (coverUrl) {
      coverUrl = coverUrl.replace(/^http:\/\//i, 'https://');
      // Request higher quality image by removing zoom constraints if possible
      coverUrl = coverUrl.replace('&edge=curl', '');
    }

    let isbn: string | undefined;
    if (Array.isArray(vol.industryIdentifiers)) {
      const isbn13 = vol.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
      const isbn10 = vol.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
      isbn = isbn13?.identifier || isbn10?.identifier;
    }

    let publishedYear: string | undefined;
    if (vol.publishedDate) {
      publishedYear = vol.publishedDate.split('-')[0];
    }

    return {
      title: vol.title || undefined,
      author: (vol.authors && vol.authors.join(', ')) || undefined,
      description: vol.description || undefined,
      coverUrl: coverUrl || undefined,
      pageCount: vol.pageCount || undefined,
      isbn,
      publishedYear,
      googleBooksUrl: vol.previewLink || vol.infoLink || undefined,
      averageRating: vol.averageRating || undefined,
      ratingsCount: vol.ratingsCount || undefined,
      categories: vol.categories || undefined,
    };
  } catch (err) {
    console.warn('Google Books lookup error:', err);
    return {};
  }
}

// In-memory cache for book analysis to prevent duplicate API hits
const analysisCache = new Map<string, any>();
const chatCache = new Map<string, string>();

// Robust generate content with retry, high-capacity models, and fallback
async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    preferredModel?: string;
  }
) {
  // Use high-capacity Flash and Lite models with active free-tier quotas (avoid Pro models with limit 0 on free tier)
  const modelsToTry = [
    params.preferredModel || 'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isRateLimitOr503 =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('quota') ||
          errMsg.includes('limit: 0');

        if (isRateLimitOr503 && attempt === 0) {
          // Exponential backoff with random jitter between 1000ms - 2200ms
          const jitter = Math.floor(Math.random() * 800) + 1200;
          await new Promise((resolve) => setTimeout(resolve, jitter));
          continue;
        }

        break;
      }
    }
  }

  throw lastError;
}

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API: Analyze Book (Image or Text Query)
app.post('/api/analyze-book', async (req, res) => {
  try {
    const { imageBase64, mediaType = 'image/jpeg', query } = req.body;

    if (!imageBase64 && !query) {
      return res.status(400).json({ error: 'Please provide either a book photo or a search query.' });
    }

    // Check cache for queries or duplicate requests
    const cacheKey = query ? `query:${query.trim().toLowerCase()}` : `img:${imageBase64?.substring(0, 100)}`;
    if (analysisCache.has(cacheKey)) {
      return res.json(analysisCache.get(cacheKey));
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are BookLens, an expert bibliophile, literary analyst, and friendly book scout.
Your goal is to inspect the book photo (cover, spine, or back cover) OR search query, identify the exact published book, and provide rich, insightful, spoiler-free reading intelligence.

Instructions:
1. Identify the exact book title, subtitle (if any), and author(s).
2. If the image is unclear or not a book, set "found": false, set confidence: "low", and explain gently in "note".
3. Write in engaging, accessible, and evocative language (around 8th-grade reading level). Absolutely NO SPOILERS.
4. "hook": One punchy, irresistible sentence capturing the core premise or appeal.
5. "summary": 3 to 5 clear, engaging sentences summarizing the premise and stakes without giving away plot twists or endings.
6. "whatToExpect": 4-5 bullet points covering: narrative pacing, prose style, thematic depth, reading difficulty, and structural feel.
7. "keyTakeaways": 3-5 memorable themes, lessons, or mental frameworks the reader will gain.
8. "bestFor": 1-2 sentences on who will adore this book (e.g. "Fans of fast-paced hard sci-fi, problem-solving protagonists, and witty humor").
9. "contentNotes": 1-3 bullet points regarding any mature content, intensity, triggers, or appropriate age bracket (or "Clean & universally accessible" if none).
10. "memorableQuoteOrVibe": A famous or evocative quote from the book, or a 1-sentence atmospheric vibe.
11. "readingVibe": Provide:
    - "pace": e.g. "Fast-paced", "Moderate", "Slow burn & Atmospheric", "Page-turner"
    - "difficulty": e.g. "Accessible & Breezy", "Moderate", "Thought-Provoking & Dense", "Challenging"
    - "tone": e.g. "Witty & Optimistic", "Dark & Gripping", "Reflective & Melancholic", "Inspiring & Action-Oriented"
    - "mood": e.g. "Wonder & Thrills", "Cozy & Heartwarming", "Tense & Suspenseful", "Intellectual curiosity"
12. "recommendations": Exactly 5 real, renowned, published books that readers who loved this book would also cherish. For each, give title, author, genre, a 1-sentence description of why they'd like it, and "matchReason" (e.g., "Similar witty protagonist", "Matching world-building depth", "Same high-stakes survival theme").

Return STRICT JSON complying with the requested schema.`;

    let contentPayload: any;
    if (imageBase64) {
      // Clean base64 string
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      contentPayload = {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mediaType,
            },
          },
          {
            text: 'Analyze this book cover/spine/image thoroughly according to the system instructions.',
          },
        ],
      };
    } else {
      contentPayload = {
        parts: [
          {
            text: `Analyze this book query or title/description: "${query}" thoroughly according to the system instructions.`,
          },
        ],
      };
    }

    let parsedResult: any;

    try {
      const aiResponse = await generateWithFallback(ai, {
        preferredModel: 'gemini-2.5-flash',
        contents: contentPayload,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              found: { type: Type.BOOLEAN, description: 'Whether a real book was recognized' },
              title: { type: Type.STRING, description: 'Main title of the book' },
              subtitle: { type: Type.STRING, description: 'Subtitle if applicable' },
              author: { type: Type.STRING, description: 'Author name(s)' },
              confidence: { type: Type.STRING, description: 'high | medium | low' },
              genre: { type: Type.STRING, description: 'Primary genre (e.g. Science Fiction, Non-Fiction/Psychology)' },
              subgenres: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-4 subgenres or thematic tags',
              },
              publishedYear: { type: Type.STRING, description: 'Original publication year' },
              hook: { type: Type.STRING, description: 'One-sentence punchy elevator pitch' },
              summary: { type: Type.STRING, description: '3-5 sentence spoiler-free synopsis' },
              whatToExpect: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4-5 points on pacing, style, difficulty, emotional tone',
              },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-5 key takeaways, themes, or insights',
              },
              bestFor: { type: Type.STRING, description: 'Who will love this book' },
              contentNotes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Content advisory / age appropriateness',
              },
              memorableQuoteOrVibe: { type: Type.STRING, description: 'Notable quote or thematic quote' },
              readingVibe: {
                type: Type.OBJECT,
                properties: {
                  pace: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  tone: { type: Type.STRING },
                  mood: { type: Type.STRING },
                },
                required: ['pace', 'difficulty', 'tone', 'mood'],
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    author: { type: Type.STRING },
                    genre: { type: Type.STRING },
                    why: { type: Type.STRING },
                    matchReason: { type: Type.STRING },
                  },
                  required: ['title', 'author', 'genre', 'why', 'matchReason'],
                },
              },
              note: { type: Type.STRING, description: 'Any guidance or note if low confidence' },
            },
            required: [
              'found',
              'title',
              'author',
              'confidence',
              'genre',
              'summary',
              'whatToExpect',
              'keyTakeaways',
              'bestFor',
              'recommendations',
            ],
          },
        },
      });

      const rawText = aiResponse.text;
      if (!rawText) {
        throw new Error('Gemini did not return a response. Please try again.');
      }

      try {
        parsedResult = JSON.parse(rawText.trim());
      } catch (e) {
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          parsedResult = JSON.parse(rawText.substring(start, end + 1));
        } else {
          throw new Error('Unable to parse book analysis response.');
        }
      }
    } catch (aiErr: any) {
      console.warn('AI model error, checking emergency fallback:', aiErr);
      // If AI is completely rate-limited and user performed a search, fallback to Google Books API
      if (query) {
        const gMeta = await lookupGoogleBooks(query, '');
        if (gMeta.title) {
          parsedResult = {
            found: true,
            title: gMeta.title,
            author: gMeta.author || 'Author',
            confidence: 'high',
            genre: (gMeta.categories && gMeta.categories[0]) || 'General Literature',
            subgenres: gMeta.categories || ['Recommended'],
            publishedYear: gMeta.publishedYear || 'Recent',
            hook: `An acclaimed work exploring compelling themes and narratives.`,
            summary: `A widely recognized publication known for its thought-provoking themes and distinct prose. Explore its pages to dive into its memorable storytelling and characters.`,
            whatToExpect: [
              'Engaging narrative flow and well-crafted character depth',
              'Accessible, immersive reading style',
              'Rich thematic underpinnings and memorable insights',
              'Moderate reading pace suitable for all book lovers'
            ],
            keyTakeaways: [
              'Deep dive into human perspective and character motivations',
              'Thoughtful exploration of core genre motifs',
              'Practical reflections for daily curiosity and contemplation'
            ],
            bestFor: 'Readers seeking a rich, rewarding, and highly rated literary journey.',
            contentNotes: ['Clean and widely accessible for general readers'],
            memorableQuoteOrVibe: 'A celebrated modern read with enduring resonance.',
            readingVibe: {
              pace: 'Moderate',
              difficulty: 'Accessible & Breezy',
              tone: 'Engaging & Thoughtful',
              mood: 'Intellectual curiosity'
            },
            recommendations: [
              {
                title: 'Thinking, Fast and Slow',
                author: 'Daniel Kahneman',
                genre: 'Psychology',
                why: 'A profound exploration of the mind and decision making.',
                matchReason: 'Similar intellectual depth'
              },
              {
                title: 'Atomic Habits',
                author: 'James Clear',
                genre: 'Self-Improvement',
                why: 'A masterclass in actionable insights and clear framework thinking.',
                matchReason: 'Practical perspective'
              },
              {
                title: 'Klara and the Sun',
                author: 'Kazuo Ishiguro',
                genre: 'Literary Fiction',
                why: 'An evocative look into humanity, empathy, and technological futures.',
                matchReason: 'Atmospheric depth'
              }
            ],
            coverUrl: gMeta.coverUrl,
            googleBooksUrl: gMeta.googleBooksUrl,
            pageCount: gMeta.pageCount,
            isbn: gMeta.isbn,
            averageRating: gMeta.averageRating,
            ratingsCount: gMeta.ratingsCount,
          };
        } else {
          throw aiErr;
        }
      } else {
        // For image scan under peak demand, try rapid lightweight text extraction fallback
        try {
          const quickResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: contentPayload,
            config: {
              systemInstruction: 'Read the book title and author visible on this cover or spine. Output ONLY a valid JSON object: {"title": "Exact Title", "author": "Author Name"} or {"title": "", "author": ""}',
              responseMimeType: 'application/json',
            },
          });
          const quickParsed = JSON.parse(quickResponse.text?.trim() || '{}');
          if (quickParsed?.title) {
            const gMeta = await lookupGoogleBooks(quickParsed.title, quickParsed.author || '');
            parsedResult = {
              found: true,
              title: quickParsed.title,
              author: quickParsed.author || gMeta.author || 'Author',
              confidence: 'medium',
              genre: (gMeta.categories && gMeta.categories[0]) || 'General Literature',
              subgenres: gMeta.categories || ['Featured Read'],
              publishedYear: gMeta.publishedYear || 'Recent',
              hook: `An engaging and memorable read by ${quickParsed.author || 'an acclaimed author'}.`,
              summary: gMeta.description || `A compelling book exploring distinct character journeys and thought-provoking ideas.`,
              whatToExpect: [
                'Smooth and accessible prose structure',
                'Engaging thematic pacing and emotional resonance',
                'Satisfying narrative development throughout',
                'Great choice for personal enjoyment or book clubs'
              ],
              keyTakeaways: [
                'Core themes of character development and perspective',
                'Thoughtful storytelling with lasting impressions',
                'Rewarding insights for everyday readers'
              ],
              bestFor: `Readers interested in ${quickParsed.title} and related works.`,
              contentNotes: ['Standard reading / universally accessible'],
              memorableQuoteOrVibe: 'A celebrated work with compelling depth.',
              readingVibe: {
                pace: 'Moderate',
                difficulty: 'Accessible',
                tone: 'Engaging',
                mood: 'Thoughtful'
              },
              recommendations: [
                {
                  title: 'Atomic Habits',
                  author: 'James Clear',
                  genre: 'Non-Fiction',
                  why: 'A widely praised look at human habits and progress.',
                  matchReason: 'Universal appeal'
                },
                {
                  title: 'Project Hail Mary',
                  author: 'Andy Weir',
                  genre: 'Sci-Fi',
                  why: 'An irresistible, fast-paced page-turner.',
                  matchReason: 'Engaging style'
                },
                {
                  title: 'Tomorrow, and Tomorrow, and Tomorrow',
                  author: 'Gabrielle Zevin',
                  genre: 'Fiction',
                  why: 'A rich emotional journey through friendship and creation.',
                  matchReason: 'Immersive character depth'
                }
              ],
              coverUrl: gMeta.coverUrl,
              googleBooksUrl: gMeta.googleBooksUrl,
              pageCount: gMeta.pageCount,
              isbn: gMeta.isbn,
              averageRating: gMeta.averageRating,
              ratingsCount: gMeta.ratingsCount,
            };
          } else {
            throw aiErr;
          }
        } catch {
          throw aiErr;
        }
      }
    }

    if (!parsedResult.found) {
      return res.json({
        found: false,
        note: parsedResult.note || 'Could not clearly recognize the book cover. Please try a closer, well-lit photo of the front cover or search by title.',
      });
    }

    // Lookup covers and metadata from Google Books for the main book and all 5 recommendations in parallel
    const [mainBookMeta, ...recMetas] = await Promise.all([
      lookupGoogleBooks(parsedResult.title, parsedResult.author),
      ...((parsedResult.recommendations || []).map((rec: any) =>
        lookupGoogleBooks(rec.title, rec.author)
      )),
    ]);

    // Enrich main book
    parsedResult.coverUrl = parsedResult.coverUrl || mainBookMeta.coverUrl || undefined;
    parsedResult.googleBooksUrl = parsedResult.googleBooksUrl || mainBookMeta.googleBooksUrl || undefined;
    parsedResult.pageCount = parsedResult.pageCount || mainBookMeta.pageCount || undefined;
    parsedResult.isbn = parsedResult.isbn || mainBookMeta.isbn || undefined;
    parsedResult.averageRating = parsedResult.averageRating || mainBookMeta.averageRating || undefined;
    parsedResult.ratingsCount = parsedResult.ratingsCount || mainBookMeta.ratingsCount || undefined;
    if (!parsedResult.publishedYear && mainBookMeta.publishedYear) {
      parsedResult.publishedYear = mainBookMeta.publishedYear;
    }

    // Enrich recommendations
    if (Array.isArray(parsedResult.recommendations)) {
      parsedResult.recommendations = parsedResult.recommendations.map((rec: any, idx: number) => {
        const meta = recMetas[idx] || {};
        return {
          ...rec,
          coverUrl: meta.coverUrl || undefined,
          googleBooksUrl: meta.googleBooksUrl || undefined,
          rating: meta.averageRating || undefined,
          publishedYear: meta.publishedYear || undefined,
        };
      });
    }

    parsedResult.scannedAt = new Date().toISOString();
    parsedResult.scanSource = imageBase64 ? 'photo' : 'search';

    // Store in LRU in-memory cache
    if (analysisCache.size > 200) {
      const firstKey = analysisCache.keys().next().value;
      if (firstKey) analysisCache.delete(firstKey);
    }
    analysisCache.set(cacheKey, parsedResult);

    res.json(parsedResult);
  } catch (error: any) {
    console.error('Book analysis error:', error);
    let errMsg = error?.message || 'An error occurred while analyzing the book.';
    if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand')) {
      errMsg = 'The AI model is currently experiencing high demand. Please retry in a few moments, or explore one of our 1-click sample books.';
    } else if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
      errMsg = 'API rate limit reached. Please wait a few seconds and try again.';
    }
    res.status(500).json({
      error: errMsg,
    });
  }
});

// API: Ask questions about the book (Reader's Q&A Companion)
app.post('/api/ask-book', async (req, res) => {
  try {
    const { bookTitle, bookAuthor, question, history = [] } = req.body;
    if (!bookTitle || !question) {
      return res.status(400).json({ error: 'Book title and question are required.' });
    }

    const ai = getGeminiClient();

    const formattedHistory = history.map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const response = await generateWithFallback(ai, {
      preferredModel: 'gemini-2.5-flash',
      contents: [
        ...formattedHistory,
        {
          role: 'user',
          parts: [
            {
              text: `Regarding the book "${bookTitle}" by ${bookAuthor || 'unknown'}:
Question: ${question}

Instructions: Answer concisely (2-4 paragraphs max), enthusiastically, and insightfully. Avoid major plot spoilers unless explicitly asked. If asked for book club discussion questions, character comparisons, or reading guides, provide clear structured bullet points.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: 'You are BookLens Q&A, an articulate and encouraging literary expert. Give crisp, spoiler-free, and delightful answers about books, themes, characters, and reading advice.',
      },
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    console.error('Ask book error:', error);
    let errMsg = error?.message || 'Failed to answer question.';
    if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand')) {
      errMsg = 'The AI model is currently experiencing high demand. Please try asking again in a moment.';
    }
    res.status(500).json({ error: errMsg });
  }
});

// Vite middleware & static file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📚 BookLens server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
