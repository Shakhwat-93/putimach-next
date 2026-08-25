'use client';
// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3, 
  List, ListOrdered, Link2, Code, RemoveFormatting, Eye, Edit3
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Write product description, sizing, materials, and highlights...',
  minHeight = '140px',
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync incoming value to contentEditable when mounted or changed externally
  useEffect(() => {
    if (editorRef.current && !isHtmlMode) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isHtmlMode]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === '<br>' || html === '<p><br></p>' ? '' : html);
    }
  };

  const executeCommand = (command: string, arg: string | null = null) => {
    if (isHtmlMode) return;
    document.execCommand(command, false, arg);
    handleInput();
    editorRef.current?.focus();
  };

  const handleCreateLink = () => {
    if (isHtmlMode) return;
    const url = prompt('Enter link URL (e.g. https://putimach.com/size-chart):');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const toolbarButtons = [
    { icon: Bold, label: 'Bold', action: () => executeCommand('bold') },
    { icon: Italic, label: 'Italic', action: () => executeCommand('italic') },
    { icon: Underline, label: 'Underline', action: () => executeCommand('underline') },
    { icon: Strikethrough, label: 'Strikethrough', action: () => executeCommand('strikeThrough') },
    { divider: true },
    { icon: Heading2, label: 'Heading 2', action: () => executeCommand('formatBlock', '<h2>') },
    { icon: Heading3, label: 'Heading 3', action: () => executeCommand('formatBlock', '<h3>') },
    { divider: true },
    { icon: List, label: 'Bullet List', action: () => executeCommand('insertUnorderedList') },
    { icon: ListOrdered, label: 'Numbered List', action: () => executeCommand('insertOrderedList') },
    { icon: Link2, label: 'Insert Link', action: handleCreateLink },
    { icon: Code, label: 'Code', action: () => executeCommand('formatBlock', '<pre>') },
    { divider: true },
    { icon: RemoveFormatting, label: 'Clear Formatting', action: () => executeCommand('removeFormat') },
  ];

  if (!isMounted) {
    return (
      <div className="rounded-xl border border-input bg-background p-3 text-xs text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-muted/40 border-b border-border/80">
        <div className="flex flex-wrap items-center gap-1">
          {toolbarButtons.map((btn, idx) => {
            if (btn.divider) {
              return <div key={`div-${idx}`} className="w-[1px] h-4 bg-border mx-1" />;
            }
            const Icon = btn.icon;
            return (
              <button
                key={btn.label}
                type="button"
                onClick={btn.action}
                disabled={isHtmlMode}
                title={btn.label}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>

        {/* HTML / Visual Toggle */}
        <button
          type="button"
          onClick={() => setIsHtmlMode(!isHtmlMode)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer",
            isHtmlMode 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-background text-muted-foreground border-border hover:text-foreground"
          )}
        >
          {isHtmlMode ? <Eye size={12} /> : <Edit3 size={12} />}
          <span>{isHtmlMode ? 'Visual' : 'HTML'}</span>
        </button>
      </div>

      {/* Editor Surface */}
      {isHtmlMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="<p>Raw HTML content here...</p>"
          style={{ minHeight }}
          className="w-full p-3 font-mono text-xs bg-background text-foreground resize-y outline-none"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          style={{ minHeight }}
          data-placeholder={placeholder}
          className="p-3.5 text-xs sm:text-sm text-foreground outline-none prose prose-sm dark:prose-invert max-w-none focus:outline-none overflow-y-auto leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
        />
      )}
    </div>
  );
};
