"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

type MagazinePdfViewerProps = {
  pdfUrl: string;
  title: string;
  onDownload?: () => void;
  downloading?: boolean;
};

type ViewMode = "single" | "double" | "scroll";

export function MagazinePdfViewer({
  pdfUrl,
  title,
  onDownload,
  downloading = false,
}: MagazinePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasLeftRef = useRef<HTMLCanvasElement>(null);
  const canvasRightRef = useRef<HTMLCanvasElement>(null);
  const scrollListRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.3);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  // Keep track of active render tasks to avoid overlapping rendering
  const renderTaskLeftRef = useRef<{ cancel: () => void } | null>(null);
  const renderTaskRightRef = useRef<{ cancel: () => void } | null>(null);
  const lastWheelTime = useRef<number>(0);
  const touchStartX = useRef<number | null>(null);

  // Initialize PDF.js and load document
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      try {
        setLoading(true);
        setError("");

        // Dynamically import pdfjs-dist
        const pdfjs = await import("pdfjs-dist");

        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/",
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setJumpPageInput("1");
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Erreur lors de l'ouverture du PDF.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (pdfUrl) {
      loadPdf();
    }

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  // Render a specific page onto a canvas with high-DPI scaling
  const renderPageToCanvas = useCallback(
    async (
      pageNumber: number,
      canvas: HTMLCanvasElement,
      renderTaskHolder: { current: { cancel: () => void } | null }
    ) => {
      if (!pdfDoc) return;
      if (pageNumber < 1 || pageNumber > pdfDoc.numPages) return;

      if (renderTaskHolder.current) {
        try {
          renderTaskHolder.current.cancel();
        } catch {
          // ignore
        }
        renderTaskHolder.current = null;
      }

      let page: PDFPageProxy | null = null;
      try {
        page = await pdfDoc.getPage(pageNumber);
      } catch {
        return;
      }

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const viewport = page.getViewport({ scale });

      // Output size on screen
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      // Bitmap internal size (scaled for high crispness)
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
      };

      const task = page.render(renderContext);
      renderTaskHolder.current = task;

      try {
        await task.promise;
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== "RenderingCancelledException") {
          // ignore
        }
      } finally {
        renderTaskHolder.current = null;
      }
    },
    [pdfDoc, scale]
  );

  // Trigger page render
  useEffect(() => {
    if (!pdfDoc || viewMode === "scroll") return;

    setIsFlipping(true);
    const timer = setTimeout(() => setIsFlipping(false), 220);

    if (canvasLeftRef.current) {
      renderPageToCanvas(currentPage, canvasLeftRef.current, renderTaskLeftRef);
    }

    if (viewMode === "double") {
      if (currentPage + 1 <= numPages && canvasRightRef.current) {
        renderPageToCanvas(currentPage + 1, canvasRightRef.current, renderTaskRightRef);
      }
    }

    return () => clearTimeout(timer);
  }, [pdfDoc, currentPage, scale, viewMode, numPages, renderPageToCanvas]);

  // Sync jump input
  useEffect(() => {
    setJumpPageInput(String(currentPage));
  }, [currentPage]);

  // Navigation functions
  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => {
      const step = viewMode === "double" ? 2 : 1;
      return Math.max(1, prev - step);
    });
  }, [viewMode]);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => {
      const step = viewMode === "double" ? 2 : 1;
      return Math.min(numPages, prev + step);
    });
  }, [viewMode, numPages]);

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setCurrentPage(p);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  // Zoom helpers
  const zoomIn = () => setScale((s) => Math.min(2.4, +(s + 0.15).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.7, +(s - 0.15).toFixed(2)));
  const zoomReset = () => setScale(1.3);

  // Wheel scroll to flip pages like a magazine
  const handleWheel = (e: React.WheelEvent) => {
    if (viewMode === "scroll") return;
    const now = Date.now();
    if (now - lastWheelTime.current < 280) return;

    if (e.deltaY > 35) {
      lastWheelTime.current = now;
      handleNextPage();
    } else if (e.deltaY < -35) {
      lastWheelTime.current = now;
      handlePrevPage();
    }
  };

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff < -50) {
      handleNextPage();
    } else if (diff > 50) {
      handlePrevPage();
    }
    touchStartX.current = null;
  };

  // Fullscreen support
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentPage(1);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentPage(numPages);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevPage, handleNextPage, numPages]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative flex flex-col rounded-3xl overflow-hidden border border-slate-300 shadow-2xl transition-all duration-300 ${
        isFullscreen ? "h-screen w-screen rounded-none bg-slate-950" : "min-h-[760px] bg-slate-900"
      }`}
    >
      {/* 1. TOP TOOLBAR & CONTROLS */}
      <div className="z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
        {/* Title and Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white text-xs font-bold shadow-xs">
            📖
          </span>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-100 block truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {title}
            </span>
            <span className="text-[10px] text-slate-400">
              Format Magazine Interactif • {numPages > 0 ? `${numPages} pages au total` : "Chargement…"}
            </span>
          </div>
        </div>

        {/* Top Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl bg-slate-800/95 p-1 border border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("single")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                viewMode === "single"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="1 Page grande taille et lisible"
            >
              1 Page
            </button>
            <button
              type="button"
              onClick={() => setViewMode("double")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                viewMode === "double"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="2 Pages - Double page magazine"
            >
              2 Pages
            </button>
            <button
              type="button"
              onClick={() => setViewMode("scroll")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                viewMode === "scroll"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Défilement continu vertical"
            >
              Défilement
            </button>
          </div>

          {/* Zoom Controls */}
          {viewMode !== "scroll" && (
            <div className="flex items-center rounded-xl bg-slate-800/95 p-1 border border-slate-700/80 text-xs">
              <button
                type="button"
                onClick={zoomOut}
                className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-md transition-colors"
                title="Zoom arrière (-)"
              >
                −
              </button>
              <button
                type="button"
                onClick={zoomReset}
                className="px-2.5 py-1 font-mono text-[11px] font-bold text-slate-200 hover:text-white"
                title="Taille optimale (130%)"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-md transition-colors"
                title="Zoom avant (+)"
              >
                +
              </button>
            </div>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            title="Basculer en plein écran pour lire confortablement"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {isFullscreen ? (
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              ) : (
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              )}
            </svg>
            <span className="hidden md:inline">{isFullscreen ? "Quitter" : "Plein écran"}</span>
          </button>

          {/* Download Button */}
          {onDownload && (
            <button
              type="button"
              disabled={downloading}
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Télécharger le fichier PDF sur votre ordinateur"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{downloading ? "Téléchargement…" : "Télécharger"}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN READING STAGE */}
      <div className="relative flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-auto select-none bg-slate-900 min-h-[620px]">
        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 text-slate-300">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent" />
            <p className="mt-4 text-xs font-semibold tracking-wide">
              Préparation des pages du magazine…
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-8 text-center max-w-md bg-slate-900 rounded-2xl border border-rose-500/30 text-rose-300 text-xs">
            <p className="font-bold text-sm">Impossible d&apos;afficher le document</p>
            <p className="mt-1 opacity-80">{error}</p>
          </div>
        )}

        {/* A. CONTINUOUS SCROLL MODE */}
        {!loading && !error && viewMode === "scroll" && (
          <div
            ref={scrollListRef}
            className="w-full max-w-4xl py-6 flex flex-col items-center gap-8 overflow-y-auto"
          >
            {Array.from({ length: numPages }).map((_, idx) => (
              <ScrollPageCanvas
                key={idx + 1}
                pageNumber={idx + 1}
                pdfDoc={pdfDoc}
                scale={scale}
              />
            ))}
          </div>
        )}

        {/* B. MAGAZINE FLIPBOOK VIEW (Single or Double Page) */}
        {!loading && !error && viewMode !== "scroll" && (
          <div className="relative flex items-center justify-center max-w-full">
            {/* FLOATING LEFT PAGE-FLIP BUTTON */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={handlePrevPage}
              className="absolute -left-3 sm:-left-7 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white text-slate-800 shadow-2xl border-2 border-slate-100 hover:bg-slate-50 hover:scale-110 active:scale-95 transition-all duration-150 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              title="Page précédente (Flèche Gauche ← ou Molette Haut)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* MAGAZINE PAGES SPREAD */}
            <div
              className={`flex items-center justify-center transition-opacity duration-200 ${
                isFlipping ? "opacity-85 scale-[0.99]" : "opacity-100 scale-100"
              }`}
            >
              {/* Left Page */}
              <div
                className="relative bg-white rounded-lg overflow-hidden border border-slate-200/90 shadow-2xl transition-all"
                style={{
                  boxShadow:
                    viewMode === "double"
                      ? "-10px 15px 35px rgba(0,0,0,0.5), inset -12px 0 25px rgba(0,0,0,0.08)"
                      : "0 22px 50px -10px rgba(0,0,0,0.5)",
                }}
              >
                <canvas ref={canvasLeftRef} className="block max-w-full h-auto" />
                <div className="absolute bottom-2.5 left-4 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono font-bold text-white select-none">
                  Page {currentPage} / {numPages}
                </div>
              </div>

              {/* Right Page (In Double Mode) */}
              {viewMode === "double" && currentPage + 1 <= numPages && (
                <div
                  className="relative bg-white rounded-lg overflow-hidden border border-slate-200/90 shadow-2xl transition-all"
                  style={{
                    boxShadow: "10px 15px 35px rgba(0,0,0,0.5), inset 12px 0 25px rgba(0,0,0,0.08)",
                  }}
                >
                  <canvas ref={canvasRightRef} className="block max-w-full h-auto" />
                  <div className="absolute bottom-2.5 right-4 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono font-bold text-white select-none">
                    Page {currentPage + 1} / {numPages}
                  </div>
                </div>
              )}
            </div>

            {/* FLOATING RIGHT PAGE-FLIP BUTTON */}
            <button
              type="button"
              disabled={viewMode === "double" ? currentPage + 1 >= numPages : currentPage >= numPages}
              onClick={handleNextPage}
              className="absolute -right-3 sm:-right-7 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white text-slate-800 shadow-2xl border-2 border-slate-100 hover:bg-slate-50 hover:scale-110 active:scale-95 transition-all duration-150 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              title="Page suivante (Flèche Droite → ou Molette Bas)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 3. BOTTOM SCRUBBER & NAVIGATION BAR */}
      <div className="z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-300 text-xs">
        {/* Navigation Buttons + Slider */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={handlePrevPage}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-35 transition-colors font-semibold text-xs cursor-pointer"
          >
            ‹ Précédent
          </button>

          {numPages > 1 && (
            <input
              type="range"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
              className="w-28 sm:w-48 accent-indigo-500 cursor-pointer"
              title="Faire glisser pour feuilleter rapidement"
            />
          )}

          <button
            type="button"
            disabled={viewMode === "double" ? currentPage + 1 >= numPages : currentPage >= numPages}
            onClick={handleNextPage}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-35 transition-colors font-semibold text-xs cursor-pointer"
          >
            Suivant ›
          </button>
        </div>

        {/* Page counter & input */}
        <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">Page</span>
          <input
            type="text"
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            className="w-12 rounded-lg bg-slate-800 border border-slate-700 px-1.5 py-1 text-center font-mono text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
          />
          <span className="text-[11px] text-slate-400 font-medium">sur {numPages}</span>
        </form>

        {/* Keyboard hints */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400">
          <span>Feuilleter :</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200 font-mono">←</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200 font-mono">→</kbd>
          <span>ou molette souris</span>
        </div>
      </div>
    </div>
  );
}

// Subcomponent to render individual pages in continuous scroll mode
function ScrollPageCanvas({
  pageNumber,
  pdfDoc,
  scale,
}: {
  pageNumber: number;
  pdfDoc: PDFDocumentProxy | null;
  scale: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const taskRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return;

      if (taskRef.current) {
        try {
          taskRef.current.cancel();
        } catch {
          // ignore
        }
        taskRef.current = null;
      }

      let page: PDFPageProxy | null = null;
      try {
        page = await pdfDoc.getPage(pageNumber);
      } catch {
        return;
      }

      if (isCancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const viewport = page.getViewport({ scale });

      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
      };

      const task = page.render(renderContext);
      taskRef.current = task;

      try {
        await task.promise;
      } catch {
        // ignore
      } finally {
        taskRef.current = null;
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (taskRef.current) {
        try {
          taskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageNumber, scale]);

  return (
    <div className="relative bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200">
      <canvas ref={canvasRef} className="block max-w-full h-auto" />
      <div className="absolute bottom-2 right-4 px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono font-bold text-white">
        Page {pageNumber}
      </div>
    </div>
  );
}
