import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface BookThumbnailProps {
  data: ArrayBuffer;
  className?: string;
}

export default function BookThumbnail({ data, className = '' }: BookThumbnailProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy load - only create blob URL when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !data || data.byteLength === 0) return;
    const bufferCopy = data.slice(0);
    const blob = new Blob([bufferCopy], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [data, isVisible]);

  if (!isVisible || !pdfUrl) {
    return (
      <div ref={containerRef} className={`bg-gradient-to-br from-red-900 to-red-950 flex items-center justify-center ${className}`}>
        <svg className="w-12 h-12 text-red-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      <Document
        file={pdfUrl}
        loading={
          <div className="w-full h-full bg-gradient-to-br from-red-900 to-red-950 flex items-center justify-center">
            <svg className="w-8 h-8 animate-spin text-red-400/50" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        }
        onLoadError={() => {}}
      >
        <Page
          pageNumber={1}
          width={300}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="w-full h-full object-cover"
        />
      </Document>
    </div>
  );
}
