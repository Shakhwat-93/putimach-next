'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_PRODUCT_FALLBACK, cleanImageUrl } from '@/lib/productMedia';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductImageProps {
  src?: string | null;
  fallbackCandidates?: string[];
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'auto' | 'sync';
  sizes?: string;
  onLoad?: () => void;
}

export function ProductImage({
  src,
  fallbackCandidates = [],
  alt = 'Product Image',
  className = '',
  loading = 'lazy',
  decoding = 'async',
  sizes,
  onLoad,
}: ProductImageProps) {
  const initialSrc = cleanImageUrl(src) || (fallbackCandidates.length > 0 ? fallbackCandidates[0] : DEFAULT_PRODUCT_FALLBACK);
  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Sync state if src prop changes
  useEffect(() => {
    const validSrc = cleanImageUrl(src) || (fallbackCandidates.length > 0 ? fallbackCandidates[0] : DEFAULT_PRODUCT_FALLBACK);
    if (validSrc && validSrc !== currentSrc) {
      setCurrentSrc(validSrc);
      setCandidateIndex(0);
      setIsLoaded(false);
    }
  }, [src, fallbackCandidates]);

  const handleImageLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    // Try next candidate in the fallback list if available
    const nextIdx = candidateIndex + 1;
    if (fallbackCandidates && nextIdx < fallbackCandidates.length) {
      const nextCandidate = cleanImageUrl(fallbackCandidates[nextIdx]);
      if (nextCandidate && nextCandidate !== currentSrc) {
        setCandidateIndex(nextIdx);
        setCurrentSrc(nextCandidate);
        return;
      }
    }

    // If all candidates exhausted, fallback to default neutral product asset
    if (currentSrc !== DEFAULT_PRODUCT_FALLBACK) {
      setCurrentSrc(DEFAULT_PRODUCT_FALLBACK);
    }
    setIsLoaded(true);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-base-900">
      {!isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full bg-base-800/80 z-0" />
      )}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding={decoding}
        sizes={sizes}
        onLoad={handleImageLoad}
        onError={handleError}
        className={`w-full h-full object-cover relative z-10 transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      />
    </div>
  );
}

export default ProductImage;