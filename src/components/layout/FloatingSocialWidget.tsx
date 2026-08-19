'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function FloatingSocialWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [contact, setContact] = useState<{
    whatsapp?: string;
    phone?: string;
    facebook_url?: string;
    instagram_url?: string;
  } | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadContactInfo() {
      try {
        let contactData = null;
        const { data: siteData } = await supabase
          .from('site_settings')
          .select('data')
          .eq('id', 'contact_info')
          .maybeSingle();

        if (siteData?.data) {
          contactData = siteData.data;
        } else {
          const { data: cbData } = await supabase
            .from('cb_settings')
            .select('data')
            .eq('id', 'contact_info')
            .maybeSingle();
          contactData = cbData?.data;
        }

        if (contactData) {
          setContact(contactData);
        }
      } catch (err) {
        console.warn('[FloatingSocialWidget] Contact info load notice:', err);
      }
    }

    loadContactInfo();
  }, []);

  // Close widget when clicking outside (only active when open)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchend', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchend', handleClickOutside);
    };
  }, [isOpen]);

  // Format WhatsApp number
  const rawWhatsapp = contact?.whatsapp || contact?.phone || '01827406756';
  const cleanWhatsappPhone = rawWhatsapp.replace(/[^0-9]/g, '');
  const formattedWhatsapp = cleanWhatsappPhone.startsWith('880') 
    ? cleanWhatsappPhone 
    : cleanWhatsappPhone.startsWith('0') 
    ? `88${cleanWhatsappPhone}` 
    : `880${cleanWhatsappPhone}`;
  
  const whatsappUrl = `https://wa.me/${formattedWhatsapp}?text=${encodeURIComponent("Hello PutiMach! I have a question about your products.")}`;
  const instagramUrl = contact?.instagram_url || 'https://www.instagram.com/putimachhh?igsh=dnYxeXhhdHhodzdn';
  const facebookUrl = contact?.facebook_url || 'https://www.facebook.com/share/1HitDwyphD';

  if (pathname === '/checkout') return null;

  return (
    <div ref={widgetRef} className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[999] flex flex-col items-end gap-3 select-none">
      
      {/* ── EXPANDED SPEED-DIAL SOCIAL BUTTONS ── */}
      <div 
        className={`flex flex-col items-end gap-3 transition-all duration-300 transform origin-bottom-right ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 scale-90 translate-y-4 pointer-events-none'
        }`}
      >
        {/* 1. WhatsApp Button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsOpen(false)}
          className="group flex items-center gap-3 bg-[#1C1613] hover:bg-[#2A221E] text-white p-2.5 pl-4 rounded-full border border-[#25D366]/40 shadow-xl shadow-[#25D366]/10 hover:shadow-[#25D366]/25 transition-all duration-200 hover:scale-105"
        >
          <span className="text-xs font-medium font-sans tracking-wide text-white group-hover:text-[#25D366] transition-colors whitespace-nowrap">
            Chat on WhatsApp
          </span>
          <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-md group-hover:rotate-12 transition-transform duration-200">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.151 4.204 4.294-1.127z"/>
            </svg>
          </div>
        </a>

        {/* 2. Instagram Button */}
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsOpen(false)}
          className="group flex items-center gap-3 bg-[#1C1613] hover:bg-[#2A221E] text-white p-2.5 pl-4 rounded-full border border-[#E1306C]/40 shadow-xl shadow-[#E1306C]/10 hover:shadow-[#E1306C]/25 transition-all duration-200 hover:scale-105"
        >
          <span className="text-xs font-medium font-sans tracking-wide text-white group-hover:text-[#E1306C] transition-colors whitespace-nowrap">
            Follow on Instagram
          </span>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-md group-hover:rotate-12 transition-transform duration-200">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
        </a>

        {/* 3. Facebook Button */}
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsOpen(false)}
          className="group flex items-center gap-3 bg-[#1C1613] hover:bg-[#2A221E] text-white p-2.5 pl-4 rounded-full border border-[#1877F2]/40 shadow-xl shadow-[#1877F2]/10 hover:shadow-[#1877F2]/25 transition-all duration-200 hover:scale-105"
        >
          <span className="text-xs font-medium font-sans tracking-wide text-white group-hover:text-[#1877F2] transition-colors whitespace-nowrap">
            Message on Facebook
          </span>
          <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white shadow-md group-hover:rotate-12 transition-transform duration-200">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.583 9 4.615V8z"/>
            </svg>
          </div>
        </a>
      </div>

      {/* ── MAIN LUXURY TRIGGER BUTTON ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Contact and Social Support Options"
        className={`relative group flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#1C1613] to-[#2E241F] text-[#C5A880] border-2 border-[#C5A880]/60 shadow-2xl hover:border-[#C5A880] hover:shadow-[#C5A880]/30 transition-all duration-300 cursor-pointer ${
          isOpen ? 'rotate-90 bg-[#C5A880] text-[#1C1613] border-[#C5A880]' : 'hover:scale-110'
        }`}
      >
        {/* Pulse Dot Indicator */}
        {!isOpen && (
          <span className="absolute top-0 right-0 flex h-3 w-3 -mt-0.5 -mr-0.5 sm:h-3.5 sm:w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 bg-emerald-500 border-2 border-[#1C1613]"></span>
          </span>
        )}

        {isOpen ? (
          <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
        ) : (
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2] group-hover:scale-110 transition-transform" />
        )}
      </button>
    </div>
  );
}
