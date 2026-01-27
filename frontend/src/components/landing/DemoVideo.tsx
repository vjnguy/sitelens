"use client";

import { useState, useRef, useEffect } from "react";
import { Play, X, Loader2 } from "lucide-react";

interface DemoVideoProps {
  thumbnailSrc?: string;
  videoSrc?: string;
}

export function DemoVideo({
  thumbnailSrc = "/demo-thumbnail.png",
  videoSrc = "/demo.mp4"
}: DemoVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy load video when modal opens
  useEffect(() => {
    if (isPlaying && !videoLoaded) {
      setIsLoading(true);
    }
  }, [isPlaying, videoLoaded]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleClose = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleVideoLoaded = () => {
    setIsLoading(false);
    setVideoLoaded(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isPlaying) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isPlaying]);

  return (
    <>
      {/* Thumbnail with Play Button */}
      <div
        ref={containerRef}
        className="relative max-w-6xl mx-auto cursor-pointer group"
        onClick={handlePlay}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-10 pointer-events-none" />

        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-orange-500/10">
          {/* Browser chrome */}
          <div className="bg-zinc-900 px-4 py-3 flex items-center gap-2 border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-zinc-800 rounded-lg px-4 py-1.5 text-xs text-zinc-500">
                app.siteora.com
              </div>
            </div>
          </div>

          {/* Screenshot/Thumbnail */}
          <div className="relative aspect-[16/10] bg-zinc-900">
            {/* Placeholder map UI */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950">
              {/* Simulated map */}
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
                  `,
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Fake UI elements */}
              <div className="absolute top-4 left-4 w-64 h-10 bg-zinc-800/80 rounded-lg" />
              <div className="absolute top-4 right-4 w-72 h-[400px] bg-zinc-800/50 rounded-xl border border-white/5" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-10 h-10 bg-zinc-800/80 rounded-lg" />
                ))}
              </div>

              {/* Property highlight */}
              <div className="absolute top-1/3 left-1/3 w-32 h-24 border-2 border-orange-500 bg-orange-500/20 rounded" />
            </div>

            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-orange-500/30 rounded-full blur-xl scale-150 group-hover:scale-175 transition-transform duration-300" />

                {/* Button */}
                <button className="relative flex items-center justify-center w-20 h-20 rounded-full bg-orange-500 hover:bg-orange-600 transition-all duration-200 group-hover:scale-110 shadow-lg shadow-orange-500/30">
                  <Play className="h-8 w-8 text-white fill-white ml-1" />
                </button>
              </div>
            </div>

            {/* Watch Demo text */}
            <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 z-20">
              <span className="text-white/80 text-lg font-medium">Watch Demo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {isPlaying && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={handleClose}
        >
          {/* Close button */}
          <button
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={handleClose}
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* Video container */}
          <div
            className="relative w-full max-w-5xl mx-4 aspect-video rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
              </div>
            )}

            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              controls
              onLoadedData={handleVideoLoaded}
              onEnded={handleClose}
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </>
  );
}
