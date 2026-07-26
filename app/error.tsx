"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0b0b] px-6">
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/10 blur-[140px]" />

      <div className="relative w-full max-w-lg rounded-[32px] border border-red-500/20 bg-gradient-to-br from-[#1b1b1b] via-[#141414] to-[#0c0c0c] p-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[32px] border border-red-500/20 bg-red-500/10 text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
          <AlertTriangle size={55} />
        </div>

        <h1 className="mt-8 text-6xl font-black tracking-tight text-red-500">
          Error
        </h1>
        <h2 className="mt-3 text-2xl font-bold text-white">
          Something went wrong
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-gray-400">
          An unexpected error occurred. Please try again or contact your
          administrator if the problem persists.
        </p>

        {error.digest && (
          <p className="mt-3 text-xs text-gray-600">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => unstable_retry()}
            className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 px-7 py-3.5 font-semibold text-white shadow-[0_10px_30px_rgba(239,68,68,0.25)] transition hover:shadow-[0_15px_40px_rgba(239,68,68,0.35)]"
          >
            <RefreshCw
              size={19}
              className="transition-transform group-hover:rotate-180"
            />
            Try Again
          </button>
        </div>

        <div className="mt-8 border-t border-white/10 pt-5 text-xs uppercase tracking-[0.25em] text-gray-600">
          Blink &amp; Bliss CRM
        </div>
      </div>
    </div>
  );
}
