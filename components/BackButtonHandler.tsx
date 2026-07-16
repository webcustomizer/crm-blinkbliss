// components/BackButtonHandler.tsx
"use client";

<<<<<<< HEAD
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

// useSearchParams() requires a Suspense boundary during static export,
// otherwise Next.js fails to prerender auto-generated pages like
// /_not-found (since this component is mounted globally in layout.tsx).
// This wrapper is the actual default export; the real logic lives in
// BackButtonHandlerInner below.
export default function BackButtonHandler() {
  return (
    <Suspense fallback={null}>
      <BackButtonHandlerInner />
    </Suspense>
  );
}

function BackButtonHandlerInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
=======
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export default function BackButtonHandler() {
  const router = useRouter();
  const pathname = usePathname();
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3

  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

<<<<<<< HEAD
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

=======
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = App.addListener("backButton", () => {
      const currentPath = pathnameRef.current;
<<<<<<< HEAD
      const currentParams = searchParamsRef.current;

      // Agar URL mein koi query param hai jo ek panel/modal open kiye
      // hue hai (jaise ?leadId=xyz for LeadDetails), to back button
      // sirf usko band kare — seedha dashboard ya exit tak na jaye.
      // Ye check generic hai, kisi bhi query-param-based panel ke liye
      // kaam karega, na sirf leads ke liye.
      if (currentParams && currentParams.toString().length > 0) {
        router.replace(currentPath, { scroll: false });
        return;
      }
=======
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3

      if (currentPath === "/" || currentPath === "/home") {
        setShowExitDialog(true);
      } else if (window.history.length > 1) {
        router.back();
      } else {
        App.exitApp();
      }
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, [router]);

  return (
    <>
      {showExitDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">Exit app?</h2>
            <p className="mt-1 text-sm text-gray-500">
              Are you sure you want to close Blink &amp; Bliss CRM?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowExitDialog(false)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => App.exitApp()}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
