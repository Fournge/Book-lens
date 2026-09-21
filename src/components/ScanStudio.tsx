import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  UploadCloud,
  Search,
  RefreshCw,
  Sparkles,
  Zap,
  Image as ImageIcon,
  AlertCircle,
  X,
  FlipHorizontal,
  ChevronRight,
  BookMarked,
} from 'lucide-react';
import { SAMPLE_BOOKS, SampleBookItem } from '../data/sampleBooks';
import { BookAnalysis } from '../types';

interface ScanStudioProps {
  onAnalyze: (payload: { imageBase64?: string; mediaType?: string; query?: string }) => Promise<void>;
  onSelectSample: (sample: BookAnalysis) => void;
  isLoading: boolean;
  activeMode: 'scan' | 'search';
  setActiveMode: (mode: 'scan' | 'search') => void;
}

export const ScanStudio: React.FC<ScanStudioProps> = ({
  onAnalyze,
  onSelectSample,
  isLoading,
  activeMode,
  setActiveMode,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dragOver, setDragOver] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera
  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setFacingMode(facing);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Could not access camera. Please allow camera permissions or upload an image.');
      setIsCameraActive(false);
    }
  };

  // Switch camera front/back
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  // Capture frame from live video
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const maxDimension = 900;
    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    setSelectedImage(dataUrl);
    stopCamera();
  };

  // Process file upload with client-side downscaling
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 900;
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
          setSelectedImage(compressedDataUrl);
          stopCamera();
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleScanImage = () => {
    if (!selectedImage) return;
    onAnalyze({
      imageBase64: selectedImage,
      mediaType: 'image/jpeg',
    });
  };

  const handleTextSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onAnalyze({
      query: searchQuery.trim(),
    });
  };

  const handleQuickPrompt = (prompt: string) => {
    setSearchQuery(prompt);
    onAnalyze({ query: prompt });
  };

  return (
    <div className="w-full space-y-8">
      {/* Hero Welcome banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300/60 text-amber-900 text-xs font-semibold tracking-wide shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Point. Scan. Know what to read next.</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1a2332] tracking-tight">
          Read any book by its cover
        </h1>
        <p className="text-sm sm:text-base text-[#526071] max-w-xl mx-auto">
          Photograph a cover, spine, or search by title. Get spoiler-free synopses, reading pace &amp; vibe insights, key takeaways, and curated recommendations.
        </p>
      </div>

      {/* Main Scanner / Search Card */}
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#e5e1d7] shadow-sm overflow-hidden">
        {/* Toggle Mode Bar */}
        <div className="flex border-b border-[#e5e1d7] bg-[#fbf9f5]">
          <button
            onClick={() => {
              setActiveMode('scan');
              setSearchQuery('');
            }}
            className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeMode === 'scan'
                ? 'border-[#1d2430] text-[#1d2430] bg-white'
                : 'border-transparent text-[#6b7787] hover:text-[#1d2430]'
            }`}
            id="tab-camera-mode"
          >
            <Camera className="w-4 h-4 text-amber-600" />
            <span>Camera &amp; Upload</span>
          </button>
          <button
            onClick={() => {
              setActiveMode('search');
              stopCamera();
              setSelectedImage(null);
            }}
            className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeMode === 'search'
                ? 'border-[#1d2430] text-[#1d2430] bg-white'
                : 'border-transparent text-[#6b7787] hover:text-[#1d2430]'
            }`}
            id="tab-search-mode"
          >
            <Search className="w-4 h-4 text-amber-600" />
            <span>Title &amp; Author Search</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-7">
          {activeMode === 'scan' ? (
            <div className="space-y-5">
              {/* Live Camera Viewfinder */}
              {isCameraActive ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center shadow-inner max-w-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Target Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4 sm:p-8">
                    <div className="w-48 sm:w-64 max-w-[80%] max-h-[80%] aspect-3/4 border-2 border-white/80 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-xs text-white text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap">
                        Frame Cover or Spine
                      </div>
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
                    </div>
                  </div>

                  {/* Controls on Top */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      onClick={toggleFacingMode}
                      className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      title="Switch Camera"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      onClick={stopCamera}
                      className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      title="Close Camera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Shutter Button */}
                  <div className="absolute bottom-4 inset-x-0 flex justify-center">
                    <button
                      onClick={captureFrame}
                      className="group flex items-center justify-center w-16 h-16 rounded-full bg-white/90 p-1 shadow-lg hover:scale-105 active:scale-95 transition-all"
                      id="btn-shutter-snap"
                    >
                      <div className="w-full h-full rounded-full bg-amber-500 border-2 border-white group-hover:bg-amber-600 transition-colors flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </button>
                  </div>
                </div>
              ) : selectedImage ? (
                /* Selected / Snapped Image Preview */
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-[#f3f0e8] border border-[#e3dfd6] p-2 flex items-center justify-center min-h-[260px] max-h-[380px]">
                    <img
                      src={selectedImage}
                      alt="Selected Book Cover"
                      className="max-h-[340px] w-auto object-contain rounded-lg shadow-md"
                    />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-4 right-4 p-1.5 rounded-full bg-[#1d2430]/80 text-white hover:bg-[#1d2430] transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleScanImage}
                      disabled={isLoading}
                      className="flex-1 py-3.5 px-6 rounded-xl bg-[#1d2430] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#2c3647] active:scale-[0.99] transition-all shadow-sm disabled:opacity-50"
                      id="btn-analyze-photo"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                          <span>Scanning with Gemini AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-amber-400" />
                          <span>Scan &amp; Retrieve Book Intelligence</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedImage(null)}
                      disabled={isLoading}
                      className="py-3.5 px-4 rounded-xl border border-[#d8d3c7] text-[#4b5563] font-medium hover:bg-[#f6f4ee] transition-colors text-sm"
                    >
                      Retake / Change
                    </button>
                  </div>
                </div>
              ) : (
                /* Initial Scan & Upload Options */
                <div className="space-y-4">
                  {cameraError && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Live Camera Button */}
                    <button
                      onClick={() => startCamera()}
                      className="group p-5 rounded-xl border-2 border-dashed border-[#dcd7cb] hover:border-[#1d2430] bg-[#faf8f4] hover:bg-white flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer"
                      id="btn-open-camera"
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#1d2430]">
                          Open Camera
                        </div>
                        <div className="text-xs text-[#6b7787] mt-0.5">
                          Snap a physical book cover or spine
                        </div>
                      </div>
                    </button>

                    {/* Upload / Drag and Drop Area */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        if (e.dataTransfer.files?.[0]) {
                          processImageFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`group p-5 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer ${
                        dragOver
                          ? 'border-amber-600 bg-amber-50/60'
                          : 'border-[#dcd7cb] hover:border-[#1d2430] bg-[#faf8f4] hover:bg-white'
                      }`}
                      id="dropzone-upload"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            processImageFile(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#1d2430]">
                          Upload Photo
                        </div>
                        <div className="text-xs text-[#6b7787] mt-0.5">
                          Drag &amp; drop or browse gallery
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Search by Title & Author */
            <form onSubmit={handleTextSearch} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#4b5563] uppercase tracking-wider">
                  Book Title, Author, or Premise
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Sapiens by Yuval Noah Harari, or 'sci-fi math mystery'"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#d8d3c7] focus:border-[#1d2430] focus:ring-2 focus:ring-[#1d2430]/10 bg-white text-sm text-[#1d2430] placeholder-[#9ca3af] outline-none transition-all shadow-xs"
                    id="input-book-query"
                  />
                  <Search className="w-5 h-5 text-[#9ca3af] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-[#1d2430] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#2c3647] active:scale-[0.99] transition-all shadow-sm disabled:opacity-50"
                id="btn-search-submit"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                    <span>Searching with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Retrieve Book Analysis</span>
                  </>
                )}
              </button>

              {/* Quick Suggestion Chips */}
              <div className="pt-2">
                <div className="text-xs font-medium text-[#6b7787] mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Popular quick searches:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Klara and the Sun',
                    'Thinking, Fast and Slow',
                    'Dune by Frank Herbert',
                    'The Midnight Library',
                    'Atomic Habits',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleQuickPrompt(chip)}
                      className="text-xs bg-[#f4f1ea] hover:bg-[#eae5da] text-[#374151] px-2.5 py-1.5 rounded-lg border border-[#ded9cd] transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 1-Click Sample Book Showcase */}
      <div className="max-w-4xl mx-auto space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-amber-600" />
            <h3 className="font-serif font-bold text-base text-[#1d2430]">
              Don't have a book handy? Try a 1-Click Sample
            </h3>
          </div>
          <span className="text-xs text-[#6b7787] hidden sm:inline">Instant live preview</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {SAMPLE_BOOKS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample.sampleAnalysis)}
              className="text-left bg-white rounded-xl border border-[#e4e0d6] hover:border-[#1d2430] p-3.5 flex gap-3.5 group hover:shadow-md transition-all cursor-pointer"
              id={`sample-book-${sample.id}`}
            >
              <div className="w-14 h-20 rounded-md bg-[#ede9e0] overflow-hidden shrink-0 border border-black/10 shadow-xs group-hover:scale-105 transition-transform">
                <img
                  src={sample.coverImage}
                  alt={sample.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mb-1">
                    {sample.genre}
                  </span>
                  <h4 className="font-serif font-bold text-sm text-[#1d2430] truncate group-hover:text-amber-800 transition-colors">
                    {sample.title}
                  </h4>
                  <p className="text-xs text-[#6b7787] truncate">{sample.author}</p>
                </div>
                <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Explore Lens</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
