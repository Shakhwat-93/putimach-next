'use client';
// @ts-nocheck
import React, { useState } from 'react';
import { Globe, Search, ChevronDown, ChevronUp, Sparkles, Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProductSeoPreviewProps {
  title: string;
  description: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  seoHandle?: string;
  onChange: (seo: { seo_title?: string; seo_description?: string; seo_handle?: string }) => void;
  siteUrl?: string;
}

export const ProductSeoPreview: React.FC<ProductSeoPreviewProps> = ({
  title = '',
  description = '',
  slug = '',
  seoTitle = '',
  seoDescription = '',
  seoHandle = '',
  onChange,
  siteUrl = 'https://putimach.com'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Clean raw html tags from description for snippet display
  const cleanDescription = (raw: string) => {
    return raw.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  };

  const displayTitle = seoTitle || (title ? `${title} — Rust & Revive | PutiMach` : 'Product Title — Rust & Revive');
  const displaySlug = seoHandle || slug || 'product-handle';
  const displayDesc = seoDescription || cleanDescription(description) || 'Premium streetwear & lifestyle apparel. Crafted with high quality materials, distinct fit, and timeless design.';
  const previewUrl = `${siteUrl}/product/${displaySlug}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Globe size={14} className="text-primary" />
            <span>Search Engine Listing Preview</span>
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            This is how your product will appear on Google and social media search results.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>{isExpanded ? 'Collapse' : 'Edit SEO'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Google Snippet Visual Card */}
      <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1 font-sans">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
          <span className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
            P
          </span>
          <span className="truncate">{siteUrl} › product › {displaySlug}</span>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="ml-auto text-[10px] text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-0.5"
            title="Copy URL"
          >
            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
          </button>
        </div>

        <h5 className="text-sm sm:text-base font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer line-clamp-1">
          {displayTitle}
        </h5>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {displayDesc}
        </p>
      </div>

      {/* Expandable Inputs */}
      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-border animate-in fade-in duration-200">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-foreground">Page Title</label>
              <span className={cn("text-[10px] font-mono", displayTitle.length > 70 ? "text-amber-500" : "text-muted-foreground")}>
                {displayTitle.length} / 70 chars
              </span>
            </div>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => onChange({ seo_title: e.target.value, seo_description: seoDescription, seo_handle: seoHandle })}
              placeholder={title || 'Page Title'}
              className="w-full h-8 px-3 rounded-lg border border-input bg-background text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-foreground">Meta Description</label>
              <span className={cn("text-[10px] font-mono", displayDesc.length > 160 ? "text-amber-500" : "text-muted-foreground")}>
                {displayDesc.length} / 160 chars
              </span>
            </div>
            <textarea
              rows={2}
              value={seoDescription}
              onChange={(e) => onChange({ seo_title: seoTitle, seo_description: e.target.value, seo_handle: seoHandle })}
              placeholder={cleanDescription(description) || 'Summary of product...'}
              className="w-full p-2.5 rounded-lg border border-input bg-background text-xs font-medium resize-none leading-relaxed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">URL Handle / Slug</label>
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-muted-foreground shrink-0">{siteUrl}/product/</span>
              <input
                type="text"
                value={seoHandle || slug}
                onChange={(e) => onChange({ seo_title: seoTitle, seo_description: seoDescription, seo_handle: e.target.value })}
                className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
