'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { DEFAULT_PRODUCT_FALLBACK, cleanImageUrl } from '@/lib/productMedia';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductImageProps {
  src?: string | null;
  fallbackCandidates?: string[];
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  decoding?: 'async' | 'auto' | 'sync';
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function ProductImage({
  src,
  fallbackCandidates = [],
  alt = 'Product Image',
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
  decoding = 'async',
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  onLoad,
  onError,
}: ProductImageProps) {
  const initialResolvedSrc = cleanImageUrl(src) || (fallbackCandidates.length > 0 ? cleanImageUrl(fallbackCandidates[0]) : null) || DEFAULT_PRODUCT_FALLBACK;
  
  const [currentSrc, setCurrentSrc] = useState<string>(initialResolvedSrc);
  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Sync state if src or fallback list changes
  useEffect(() => {
    const validSrc = cleanImageUrl(src) || (fallbackCandidates.length > 0 ? cleanImageUrl(fallbackCandidates[0]) : null) || DEFAULT_PRODUCT_FALLBACK;
    if (validSrc && validSrc !== currentSrc) {
      setCurrentSrc(validSrc);
      setCandidateIndex(0);
      setHasError(false);
      setIsLoaded(false);
    }
  }, [src, fallbackCandidates]);

  // Synchronous and Layout check for cached images where browser fires load before React listener attaches
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    const imgEl = imgRef.current;
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      setIsLoaded(true);
      if (onLoad) onLoad();
    }
  }, [currentSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.naturalWidth > 0) {
      setIsLoaded(true);
      setHasError(false);
      if (onLoad) onLoad();
    }
  };

  const handleImageError = () => {
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
    } else {
      setHasError(true);
    }

    setIsLoaded(true);
    if (onError) onError();
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-base-900 select-none">
      {/* Background Skeleton placeholder underneath */}
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 w-full h-full bg-base-800/90 z-0 animate-pulse" />
      )}

      {/* Render actual image with zero visual lag */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
        sizes={sizes}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`w-full h-full object-cover relative z-10 transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        style={{
          opacity: (typeof window !== 'undefined' && imgRef.current?.complete && imgRef.current?.naturalWidth > 0) ? 1 : undefined,
        }}
      />
    </div>
  );
}

export default ProductImage;