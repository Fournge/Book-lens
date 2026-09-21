import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles, User, Bot, HelpCircle, Loader2 } from 'lucide-react';
import { BookAnalysis, ChatMessage } from '../types';

interface AskBookChatProps {
  book: BookAnalysis;
}

export const AskBookChat: React.FC<AskBookChatProps> = ({ book }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const starterPrompts = [
    '3 Great Book Club discussion questions',
    'Is there a romantic subplot or major angst?',
    'What other books have a similar writing style?',
    'Explain the central conflict without spoiling the end',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ask-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: book.title,
          bookAuthor: book.author,
          question: query.trim(),
          history: messages,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get answer from AI.');
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.answer || 'I could not generate a response. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Sorry, I ran into an error connecting to Gemini. Please try asking again in a moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e5e1d7] shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 bg-[#fbf9f5] border-b border-[#e5e1d7] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-sm text-[#1d2430]">
              Ask BookLens about &ldquo;{book.title}&rdquo;
            </h4>
            <p className="text-[11px] text-[#6b7787]">
              Spoiler-safe insights, reading difficulty, book club guides &amp; trivia
            </p>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="p-4 sm:p-5 space-y-3.5 max-h-[360px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <Bot className="w-8 h-8 mx-auto text-amber-600/70" />
            <p className="text-xs text-[#6b7787] max-w-sm mx-auto">
              Curious about this book? Ask anything regarding characters, pace, suitability, or choose a prompt below:
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-lg mx-auto pt-1">
              {starterPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-xs bg-[#f4f1ea] hover:bg-amber-100/70 text-[#374151] hover:text-amber-900 px-3 py-1.5 rounded-lg border border-[#ded9cd] transition-all text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#1d2430] text-white rounded-br-xs'
                    : 'bg-[#f7f5ee] border border-[#e4dfd4] text-[#1f2937] rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>
                <div
                  className={`text-[10px] mt-1 text-right ${
                    msg.sender === 'user' ? 'text-white/60' : 'text-[#8c96a5]'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-[#1d2430] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#6b7787] bg-[#f7f5ee] border border-[#e4dfd4] px-3.5 py-2.5 rounded-xl w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span>BookLens is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-[#fbf9f5] border-t border-[#e5e1d7] flex gap-2"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask a question about this book..."
          disabled={isLoading}
          className="flex-1 bg-white border border-[#d8d3c7] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#1d2430] placeholder-[#9ca3af] outline-none focus:border-[#1d2430]"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="px-3.5 py-2 bg-[#1d2430] text-white rounded-xl hover:bg-[#2c3647] transition-colors disabled:opacity-40 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
