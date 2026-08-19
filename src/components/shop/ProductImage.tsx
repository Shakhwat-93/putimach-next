'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_PRODUCT_FALLBACK, cleanImageUrl } from '@/lib/productMedia';

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
  const [hasError, setHasError] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);

  // Sync state if src prop changes
  useEffect(() => {
    const validSrc = cleanImageUrl(src);
    if (validSrc && validSrc !== currentSrc) {
      setCurrentSrc(validSrc);
      setCandidateIndex(0);
      setHasError(false);
      setLoaded(false);
    }
  }, [src]);

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
      setHasError(true);
    }
  };

  const handleLoaded = () => {
    setLoaded(true);
    if (onLoad) onLoad();
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-base-900">
      {/* Loading Shimmer / Skeleton */}
      {!loaded && !hasError && (
        <div className="absolute inset-0 bg-base-800 animate-pulse pointer-events-none" />
      )}

      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding={decoding}
        sizes={sizes}
        onLoad={handleLoaded}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      />
    </div>
  );
}

export default ProductImage;