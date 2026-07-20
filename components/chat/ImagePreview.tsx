"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { X, Send, Image as ImageIcon } from "lucide-react";

interface ImagePreviewProps {
  file: File;
  previewUrl: string;
  onSend: (caption: string) => void;
  onCancel: () => void;
  sending?: boolean;
}

export default function ImagePreview({ file, previewUrl, onSend, onCancel, sending }: ImagePreviewProps) {
  const captionRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const caption = captionRef.current?.value?.trim() || "";
    onSend(caption);
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col bg-black/95 backdrop-blur-sm">
      {/* Top bar */}
      <div style={{ paddingTop: "env(safe-area-inset-top)" }} className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center">
            <ImageIcon size={16} className="text-[#D4AF37]" />
          </div>
          <div>
            <p className="text-sm text-white font-medium truncate max-w-[200px]">{file.name}</p>
            <p className="text-[10px] text-white/40">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          disabled={sending}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Image preview */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <img
          src={previewUrl}
          alt="Preview"
          className="max-w-full max-h-full object-contain rounded-xl"
        />
      </div>

      {/* Caption + Send */}
      <form onSubmit={handleSubmit} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }} className="px-4 pt-2 border-t border-white/10">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <input
            ref={captionRef}
            placeholder="Add a caption..."
            disabled={sending}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]/50"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-[#D4AF37] px-5 py-3 text-black font-medium hover:bg-[#c79f27] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {sending ? (
              <span className="h-4 w-4 block animate-spin rounded-full border-2 border-black/30 border-t-black" />
            ) : (
              <>
                <Send size={16} />
                <span className="hidden sm:inline text-sm">Send</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
