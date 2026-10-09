import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { getAllBooks, addBook, deleteBook, Book, updateLastPage } from './db';

// Import worker directly via Vite - ensures version matches react-pdf's bundled pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type View = 'list' | 'reader';

// Memoized book card component for performance
const BookCard = memo(({ book, onOpen, onDelete }: { book: Book; onOpen: (book: Book) => void; onDelete: (id: string, e: React.MouseEvent) => void }) => (
  <div
    onClick={() => onOpen(book)}
    className="group relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
  >
    <div className="aspect-[3/4] bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 group-hover:from-blue-600/30 group-hover:to-purple-600/30 transition-all" />
      <svg className="w-16 h-16 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <div className="absolute top-3 right-3">
        <span className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded-md text-xs text-slate-300">PDF</span>
      </div>
      {book.lastPage > 1 && (
        <div className="absolute bottom-3 left-3">
          <span className="px-2 py-1 bg-blue-600/80 backdrop-blur-sm rounded-md text-xs text-white">
            Trang {book.lastPage}
          </span>
        </div>
      )}
    </div>
    <div className="p-4">
      <h3 className="font-medium text-slate-200 truncate group-hover:text-white transition-colors">
        {book.name}
      </h3>
      <p className="text-xs text-slate-500 mt-1">
        {new Date(book.uploadedAt).toLocaleDateString('vi-VN')}
      </p>
    </div>
    <button
      onClick={(e) => onDelete(book.id, e)}
      className="absolute top-3 left-3 w-8 h-8 bg-red-500/0 group-hover:bg-red-500/80 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500"
      title="Xóa sách"
    >
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
));

// Page Selection Modal
const PageSelectionModal = memo(({ book, onStart, onCancel }: { book: Book | null; onStart: (page: number) => void; onCancel: () => void }) => {
  const [customPage, setCustomPage] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (book) {
      setCustomPage('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [book]);

  if (!book) return null;

  const hasLastPage = book.lastPage > 1;

  const handleCustomPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(customPage);
    if (isNaN(page) || page < 1) {
      setError('Vui lòng nhập số trang hợp lệ (≥ 1)');
      return;
    }
    onStart(page);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        <h2 className="text-xl font-semibold text-white mb-2">Bắt đầu đọc</h2>
        <p className="text-slate-400 text-sm mb-6 truncate">{book.name}</p>

        <div className="space-y-3">
          {/* Start from page 1 */}
          <button
            onClick={() => onStart(1)}
            className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-blue-500 rounded-xl transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-medium">Đọc từ trang 1</p>
              <p className="text-slate-400 text-xs">Bắt đầu lại từ đầu</p>
            </div>
          </button>

          {/* Continue from last page */}
          {hasLastPage && (
            <button
              onClick={() => onStart(book.lastPage)}
              className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-purple-500 rounded-xl transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors shrink-0">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">Tiếp tục từ trang {book.lastPage}</p>
                <p className="text-slate-400 text-xs">Đọc tiếp từ lần đọc trước</p>
              </div>
            </button>
          )}

          {/* Custom page input */}
          <form onSubmit={handleCustomPageSubmit} className="flex items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            <div className="flex-1">
              <input
                ref={inputRef}
                type="number"
                min={1}
                value={customPage}
                onChange={(e) => { setCustomPage(e.target.value); setError(''); }}
                placeholder="Nhập số trang..."
                className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
              />
              {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={!customPage}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
            >
              Đến
            </button>
          </form>
        </div>

        <button
          onClick={onCancel}
          className="w-full mt-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
        >
          Hủy
        </button>
      </div>
    </div>
  );
});

function App() {
  const [view, setView] = useState<View>('list');
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    const allBooks = await getAllBooks();
    setBooks(allBooks);
    setLoading(false);
  }, []);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        await addBook(file.name, buffer);
      }
    }
    await loadBooks();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [loadBooks]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa sách này?')) {
      await deleteBook(id);
      await loadBooks();
    }
  }, [loadBooks]);

  const openBook = useCallback((book: Book) => {
    setSelectedBook(book);
  }, []);

  const startReading = useCallback((startPage: number) => {
    if (!selectedBook) return;
    const dataCopy = selectedBook.data.slice(0);
    setCurrentBook({ ...selectedBook, data: dataCopy, lastPage: startPage });
    setSelectedBook(null);
    setView('reader');
  }, [selectedBook]);

  const cancelSelection = useCallback(() => {
    setSelectedBook(null);
  }, []);

  const goBack = useCallback(async (lastPage?: number) => {
    if (currentBook && lastPage) {
      await updateLastPage(currentBook.id, lastPage);
    }
    setView('list');
    setCurrentBook(null);
    await loadBooks();
  }, [currentBook, loadBooks]);

  if (view === 'reader' && currentBook) {
    return <BookReader book={currentBook} onBack={goBack} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/70 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              PDF Book Reader
            </h1>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50"
          >
            {uploading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            <span>{uploading ? 'Đang tải lên...' : 'Tải sách lên'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-300 mb-2">Chưa có sách nào</h2>
            <p className="text-slate-500 mb-6">Tải lên file PDF đầu tiên để bắt đầu đọc</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
            >
              Tải sách lên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {books.map((book) => (
              <BookCard key={book.id} book={book} onOpen={openBook} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      <PageSelectionModal book={selectedBook} onStart={startReading} onCancel={cancelSelection} />
    </div>
  );
}

// Book Reader Component
function BookReader({ book, onBack }: { book: Book; onBack: (lastPage?: number) => void }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(book.lastPage || 1);
  const [scale, setScale] = useState<number>(1.2);
  const [showControls, setShowControls] = useState(true);
  const [flipState, setFlipState] = useState<'idle' | 'flipping-left' | 'flipping-right' | 'flipping-in'>('idle');
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const isFlippingRef = useRef(false);

  const handleBack = useCallback(() => {
    onBack(pageNumber);
  }, [onBack, pageNumber]);

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);

  // Page transition with realistic flip effect
  const goToPage = useCallback((targetPage: number, direction: 'left' | 'right') => {
    if (isFlippingRef.current) return;
    if (targetPage < 1 || targetPage > numPages || targetPage === pageNumber) return;

    isFlippingRef.current = true;
    setFlipState(direction === 'left' ? 'flipping-left' : 'flipping-right');

    // After flip out animation, change page and flip in
    setTimeout(() => {
      setPageNumber(targetPage);
      setFlipState('flipping-in');
      // Scroll to top of new page
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      setTimeout(() => {
        setFlipState('idle');
        isFlippingRef.current = false;
      }, 300);
    }, 400);
  }, [numPages, pageNumber]);

  const goToNextPage = useCallback(() => {
    if (pageNumber < numPages) {
      goToPage(pageNumber + 1, 'left');
    }
  }, [pageNumber, numPages, goToPage]);

  const goToPrevPage = useCallback(() => {
    if (pageNumber > 1) {
      goToPage(pageNumber - 1, 'right');
    }
  }, [pageNumber, goToPage]);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;
    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        goToNextPage();
      } else {
        goToPrevPage();
      }
    }
  }, [goToNextPage, goToPrevPage]);

  // Keyboard: arrows left/right for page, up/down for scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextPage();
        resetControlsTimeout();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevPage();
        resetControlsTimeout();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Let browser handle scroll naturally
        resetControlsTimeout();
      } else if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack, resetControlsTimeout, goToNextPage, goToPrevPage]);

  // Ctrl + wheel to zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
        resetControlsTimeout();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [resetControlsTimeout]);

  // Create Blob URL for PDF
  const pdfUrl = useMemo(() => {
    if (!book.data || book.data.byteLength === 0) return null;
    const bufferCopy = book.data.slice(0);
    const blob = new Blob([bufferCopy], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }, [book.data]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Compute flip animation style
  const flipStyle = useMemo(() => {
    const base = {
      transformStyle: 'preserve-3d' as const,
      backfaceVisibility: 'hidden' as const,
      transition: flipState === 'idle' ? 'none' : undefined,
    };

    if (flipState === 'flipping-left') {
      return {
        ...base,
        transformOrigin: 'left center',
        animation: 'flipOutLeft 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) forwards',
      };
    }
    if (flipState === 'flipping-right') {
      return {
        ...base,
        transformOrigin: 'right center',
        animation: 'flipOutRight 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) forwards',
      };
    }
    if (flipState === 'flipping-in') {
      return {
        ...base,
        animation: 'flipIn 0.3s cubic-bezier(0.0, 0.0, 0.2, 1) forwards',
      };
    }
    return base;
  }, [flipState]);

  return (
    <div
      className="fixed inset-0 bg-neutral-900 overflow-hidden"
      onMouseMove={resetControlsTimeout}
      onTouchStart={(e) => {
        resetControlsTimeout();
        handleTouchStart(e);
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Back Button */}
      <button
        onClick={(e) => { e.stopPropagation(); handleBack(); }}
        className="fixed top-4 left-4 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300"
        title="Quay lại (Esc)"
      >
        <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Tap zones for page navigation */}
      <button
        onClick={(e) => { e.stopPropagation(); goToPrevPage(); resetControlsTimeout(); }}
        disabled={pageNumber <= 1 || flipState !== 'idle'}
        className="fixed left-0 top-0 bottom-0 w-1/4 z-30 cursor-pointer disabled:cursor-default group"
        aria-label="Trang trước"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); goToNextPage(); resetControlsTimeout(); }}
        disabled={pageNumber >= numPages || flipState !== 'idle'}
        className="fixed right-0 top-0 bottom-0 w-1/4 z-30 cursor-pointer disabled:cursor-default group"
        aria-label="Trang sau"
      >
        <div className="absolute inset-0 bg-gradient-to-l from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      </button>

      {/* PDF Content with page flip animation */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-auto flex justify-center py-8"
        style={{ perspective: '2500px', perspectiveOrigin: 'center center' }}
      >
        {!pdfUrl ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/60">Không thể tải sách. Vui lòng thử lại.</p>
          </div>
        ) : (
          <div
            className="relative page-wrapper"
            style={flipStyle}
          >
            {/* Shadow overlay during flip */}
            {flipState !== 'idle' && (
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  background: flipState === 'flipping-left'
                    ? 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 40%)'
                    : flipState === 'flipping-right'
                    ? 'linear-gradient(to left, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 40%)'
                    : 'transparent',
                  animation: flipState === 'flipping-in' ? 'shadowFade 0.3s ease-out forwards' : undefined,
                }}
              />
            )}
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages: n }) => {
                setNumPages(n);
                // Clamp page number if it exceeds total pages
                if (pageNumber > n) {
                  setPageNumber(n);
                }
              }}
              onLoadError={(error) => console.error('PDF loading error:', error)}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-white/60">Đang tải sách...</p>
                  </div>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-2xl"
              />
            </Document>
          </div>
        )}
      </div>

      {/* Page indicator - simple and minimal */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full">
          <p className="text-white/80 text-sm font-medium">
            Trang {pageNumber} / {numPages}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
