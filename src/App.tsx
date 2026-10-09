import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { getAllBooks, addBook, deleteBook, Book, updateLastPage } from './db';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

type View = 'list' | 'reader';

function App() {
  const [view, setView] = useState<View>('list');
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    const allBooks = await getAllBooks();
    setBooks(allBooks);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa sách này?')) {
      await deleteBook(id);
      await loadBooks();
    }
  };

  const openBook = async (book: Book) => {
    setCurrentBook(book);
    setView('reader');
  };

  const goBack = async (lastPage?: number) => {
    if (currentBook && lastPage) {
      await updateLastPage(currentBook.id, lastPage);
    }
    setView('list');
    setCurrentBook(null);
    await loadBooks();
  };

  if (view === 'reader' && currentBook) {
    return <BookReader book={currentBook} onBack={goBack} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
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

      {/* Book Grid */}
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
              <div
                key={book.id}
                onClick={() => openBook(book)}
                className="group relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
              >
                {/* Book Cover */}
                <div className="aspect-[3/4] bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 group-hover:from-blue-600/30 group-hover:to-purple-600/30 transition-all" />
                  <svg className="w-16 h-16 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded-md text-xs text-slate-300">
                      PDF
                    </span>
                  </div>
                  {book.lastPage > 1 && (
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2 py-1 bg-blue-600/80 backdrop-blur-sm rounded-md text-xs text-white">
                        Trang {book.lastPage}
                      </span>
                    </div>
                  )}
                </div>
                {/* Book Info */}
                <div className="p-4">
                  <h3 className="font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                    {book.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(book.uploadedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(book.id, e)}
                  className="absolute top-3 left-3 w-8 h-8 bg-red-500/0 group-hover:bg-red-500/80 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500"
                  title="Xóa sách"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Book Reader Component
function BookReader({ book, onBack }: { book: Book; onBack: (lastPage?: number) => void }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(book.lastPage || 1);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleBack = useCallback(() => {
    onBack(pageNumber);
  }, [onBack, pageNumber]);

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setPageNumber(prev => Math.min(prev + 1, numPages));
        resetControlsTimeout();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setPageNumber(prev => Math.max(prev - 1, 1));
        resetControlsTimeout();
      } else if (e.key === '+' || e.key === '=') {
        setScale(prev => Math.min(prev + 0.1, 3));
        resetControlsTimeout();
      } else if (e.key === '-') {
        setScale(prev => Math.max(prev - 0.1, 0.5));
        resetControlsTimeout();
      } else if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, handleBack, resetControlsTimeout]);

  const pdfData = new Uint8Array(book.data);

  return (
    <div
      className="fixed inset-0 bg-neutral-900 overflow-hidden"
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
    >
      {/* Back Button - always visible but small */}
      <button
        onClick={handleBack}
        className="fixed top-4 left-4 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300"
        title="Quay lại (Esc)"
      >
        <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* PDF Content */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-auto flex justify-center py-8"
      >
        <Document
          file={{ data: pdfData }}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n);
            setIsLoaded(true);
          }}
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

      {/* Controls - auto hide */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-500 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-16 pb-6 px-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale(prev => Math.max(prev - 0.1, 0.5))}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                title="Thu nhỏ (-)"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-white/80 text-sm font-mono w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(prev => Math.min(prev + 0.1, 3))}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                title="Phóng to (+)"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                disabled={pageNumber <= 1}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-lg flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageNumber}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= numPages) setPageNumber(val);
                  }}
                  className="w-14 h-9 bg-white/10 border border-white/20 rounded-lg text-center text-white text-sm focus:outline-none focus:border-blue-400"
                />
                <span className="text-white/60 text-sm">/ {numPages}</span>
              </div>
              <button
                onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                disabled={pageNumber >= numPages}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-lg flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Page slider */}
            <div className="hidden sm:block flex-1 max-w-[200px]">
              <input
                type="range"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={(e) => setPageNumber(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Book title - shows briefly */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full">
          <p className="text-white/80 text-sm font-medium truncate max-w-[300px]">
            {book.name}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
