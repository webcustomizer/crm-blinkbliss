"use client";

import { useState } from "react";
import { X, Download } from "lucide-react";

interface ChatImageProps {
  src: string;
  alt?: string;
  fileName?: string | null;
}

function isImageFile(fileName?: string | null): boolean {
  if (!fileName) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(fileName);
}

export default function ChatImage({ src, alt = "Image", fileName }: ChatImageProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <div className="mt-1.5 relative group/img cursor-pointer" onClick={() => setOpen(true)}>
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={`max-w-[260px] max-h-[300px] rounded-xl object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
        {!loaded && (
          <div className="w-[200px] h-[150px] rounded-xl bg-white/5 animate-pulse flex items-center justify-center">
            <span className="text-[10px] text-white/30">Loading...</span>
          </div>
        )}
        {fileName && (
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between rounded-lg bg-black/60 px-2 py-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
            <span className="text-[10px] text-white/70 truncate">{fileName}</span>
            <a href={src} download={fileName} onClick={(e) => e.stopPropagation()} className="text-white/50 hover:text-white">
              <Download size={12} />
            </a>
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition z-10"
          >
            <X size={24} />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {fileName && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white/70 text-xs px-3 py-1.5 rounded-full">
              {fileName}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export { isImageFile };
