import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { SAMPLE_BOOKS } from '../data/sampleBooks';
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
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsStartingCamera(false);
  }, []);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Attach stream to video element whenever camera becomes active and video element mounts
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn('Video play interrupted or delayed:', err);
      });
    }
  }, [isCameraActive]);

  // Start live webcam / video stream
  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setIsStartingCamera(true);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera streaming is not supported by your browser. Please use the Take Photo or Upload button.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setFacingMode(facing);
      setIsCameraActive(true);
      setIsStartingCamera(false);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      setIsStartingCamera(false);
      setCameraError(
        'Could not access live camera viewfinder. Please allow camera permissions in your browser or tap "Take Photo (Camera)" to snap directly with your phone.'
      );
    }
  };

  // Switch camera front/back
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  // Capture frame from live video
  const captureFrame = (autoAnalyze: boolean = true) => {
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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setSelectedImage(dataUrl);
    stopCamera();

    if (autoAnalyze) {
      onAnalyze({
        imageBase64: dataUrl,
        mediaType: 'image/jpeg',
      });
    }
  };

  // Process image file (from camera snap or file upload) with client-side downscaling
  const processImageFile = (file: File, autoAnalyze: boolean = false) => {
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
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setSelectedImage(compressedDataUrl);
          stopCamera();

          if (autoAnalyze) {
            onAnalyze({
              imageBase64: compressedDataUrl,
              mediaType: 'image/jpeg',
            });
          }
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
      {/* Hidden File Inputs */}
      {/* 1. Direct native camera capture on mobile phones */}
      <input
        type="file"
        ref={nativeCameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            processImageFile(e.target.files[0], false);
          }
        }}
      />
      {/* 2. Gallery / file picker */}
      <input
        type="file"
        ref={fileUploadInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            processImageFile(e.target.files[0], false);
          }
        }}
      />

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
            className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeMode === 'scan'
                ? 'border-[#1d2430] text-[#1d2430] bg-white'
                : 'border-transparent text-[#6b7787] hover:text-[#1d2430]'
            }`}
            id="tab-camera-mode"
          >
            <Camera className="w-4 h-4 text-amber-600" />
            <span>Camera &amp; Photo Scan</span>
          </button>
          <button
            onClick={() => {
              setActiveMode('search');
              stopCamera();
              setSelectedImage(null);
            }}
            className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
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
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center shadow-md max-w-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        videoRef.current.play().catch(console.warn);
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Target Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4 sm:p-8">
                    <div className="w-48 sm:w-64 max-w-[80%] max-h-[80%] aspect-3/4 border-2 border-amber-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1d2430] text-amber-300 text-[11px] font-semibold px-3 py-0.5 rounded-full border border-amber-400/40 shadow-xs whitespace-nowrap">
                        Center Book Cover Here
                      </div>
                      {/* Corner Accents */}
                      <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-3 border-l-3 border-amber-400 rounded-tl-lg" />
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-3 border-r-3 border-amber-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-3 border-l-3 border-amber-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-3 border-r-3 border-amber-400 rounded-br-lg" />
                    </div>
                  </div>

                  {/* Controls on Top */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                    <button
                      onClick={toggleFacingMode}
                      className="p-2.5 rounded-full bg-black/65 text-white hover:bg-black/90 transition-colors cursor-pointer backdrop-blur-xs"
                      title="Flip Camera (Front/Back)"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      onClick={stopCamera}
                      className="p-2.5 rounded-full bg-black/65 text-white hover:bg-black/90 transition-colors cursor-pointer backdrop-blur-xs"
                      title="Close Camera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom Controls Bar */}
                  <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-2 z-10">
                    <button
                      onClick={() => captureFrame(false)}
                      className="group flex items-center gap-2.5 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-[#1d2430] font-bold text-sm shadow-xl active:scale-95 transition-all cursor-pointer border-2 border-white"
                      id="btn-shutter-snap"
                    >
                      <Camera className="w-5 h-5 text-[#1d2430]" />
                      <span>Snap &amp; Scan Book</span>
                    </button>
                    <span className="text-[11px] text-white/90 drop-shadow-md font-medium">
                      Hold still and tap to capture
                    </span>
                  </div>
                </div>
              ) : selectedImage ? (
                /* Selected / Snapped Image Preview */
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-[#f3f0e8] border border-[#e3dfd6] p-3 flex items-center justify-center min-h-[260px] max-h-[380px]">
                    <img
                      src={selectedImage}
                      alt="Selected Book Cover"
                      className="max-h-[340px] w-auto object-contain rounded-xl shadow-md"
                    />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-4 right-4 p-2 rounded-full bg-[#1d2430]/85 text-white hover:bg-[#1d2430] transition-colors cursor-pointer shadow-md"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleScanImage}
                      disabled={isLoading}
                      className="flex-1 py-3.5 px-6 rounded-xl bg-[#1d2430] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#2c3647] active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 cursor-pointer text-sm sm:text-base"
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
                      onClick={() => {
                        setSelectedImage(null);
                        startCamera();
                      }}
                      disabled={isLoading}
                      className="py-3.5 px-4 rounded-xl border border-[#d8d3c7] text-[#4b5563] font-medium hover:bg-[#f6f4ee] transition-colors text-sm cursor-pointer"
                    >
                      Retake Photo
                    </button>
                  </div>
                </div>
              ) : (
                /* Initial Scan & Upload Options */
                <div className="space-y-4">
                  {cameraError && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-semibold">Notice: </span>
                        <span>{cameraError}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Option 1: Native Phone Camera Snap (Instant on Mobile) */}
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="group p-5 rounded-xl border-2 border-dashed border-amber-400/80 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-600 flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer shadow-2xs"
                      id="btn-phone-camera-snap"
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#1d2430]">
                          Take Photo (Camera)
                        </div>
                        <div className="text-xs text-amber-800/80 mt-0.5">
                          Snap directly with device camera
                        </div>
                      </div>
                    </button>

                    {/* Option 2: Live In-Browser Viewfinder */}
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      disabled={isStartingCamera}
                      className="group p-5 rounded-xl border-2 border-dashed border-[#dcd7cb] hover:border-[#1d2430] bg-[#faf8f4] hover:bg-white flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer"
                      id="btn-open-camera"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#1d2430]/10 text-[#1d2430] flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isStartingCamera ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                        ) : (
                          <Smartphone className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#1d2430]">
                          Live Viewfinder
                        </div>
                        <div className="text-xs text-[#6b7787] mt-0.5">
                          Real-time on-screen scanner
                        </div>
                      </div>
                    </button>

                    {/* Option 3: Upload from Gallery / Files */}
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
                      onClick={() => fileUploadInputRef.current?.click()}
                      className={`group p-5 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer ${
                        dragOver
                          ? 'border-blue-600 bg-blue-50/60'
                          : 'border-[#dcd7cb] hover:border-[#1d2430] bg-[#faf8f4] hover:bg-white'
                      }`}
                      id="dropzone-upload"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#1d2430]">
                          Upload Image
                        </div>
                        <div className="text-xs text-[#6b7787] mt-0.5">
                          From photo library or files
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
                className="w-full py-3.5 px-6 rounded-xl bg-[#1d2430] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#2c3647] active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
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
                      className="text-xs bg-[#f4f1ea] hover:bg-[#eae5da] text-[#374151] px-2.5 py-1.5 rounded-lg border border-[#ded9cd] transition-colors cursor-pointer"
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

