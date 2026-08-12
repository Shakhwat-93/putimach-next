'use client';
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import './CommandPalette.css';
import { useRouter } from 'next/navigation';

import { 
    const handleKeyDown = (e) => {
      // Toggle Palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      // Close: Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
      }

      if (!isOpen) return;

      // Navigate Results: Arrows
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % allResults.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length);
      }

      // Execute: Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        if (allResults[selectedIndex]) {
          allResults[selectedIndex].action();
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allResults, selectedIndex]);

  // Focus Input on Open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Grouping logic for rendering
  const categories = [...new Set(allResults.map(r => r.category))];

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="command-palette" onClick={e => e.stopPropagation()} ref={paletteRef}>
        <div className="palette-search-wrapper">
          <Search size={20} className="palette-search-icon" />
          <input 
            ref={inputRef}
            type="text" 
            className="palette-input" 
            placeholder="Search commands, orders, or customers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="palette-kbd-hint">ESC</div>
        </div>

        <div className="palette-results">
          {categories.length === 0 && (
            <div className="empty-logs" style={{ padding: '40px' }}>No results found for "{search}"</div>
          )}
          
          {categories.map(cat => (
            <div key={cat} className="palette-section">
              <div className="palette-section-label">{cat}</div>
              {allResults
                .filter(r => r.category === cat)
                .map((result) => {
                  const globalIndex = allResults.indexOf(result);
                  return (
                    <div 
                      key={result.id} 
                      className={`palette-item ${selectedIndex === globalIndex ? 'selected' : ''}`}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      onClick={() => {
                        result.action();
                        setIsOpen(false);
                      }}
                    >
                      <div className="palette-item-icon">
                        {result.icon}
                      </div>
                      <div className="palette-item-content">
                        <span className="palette-item-name">{result.name}</span>
                        {result.meta && <span className="palette-item-meta">{result.meta}</span>}
                      </div>
                      {selectedIndex === globalIndex && <Command size={14} style={{ opacity: 0.5 }} />}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>

        <div className="palette-footer">
          <div className="footer-hint">
            <kbd>↑↓</kbd> to navigate
          </div>
          <div className="footer-hint">
            <kbd>↵</kbd> to select
          </div>
          <div className="footer-hint">
            <kbd>ESC</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
};
