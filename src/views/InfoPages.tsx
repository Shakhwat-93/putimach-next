'use client';
// @ts-nocheck
// src/pages/InfoPages.jsx
import React, { useState, useEffect } from 'react';
import { Truck, ShieldAlert, Ruler, BookOpen, Loader2 } from 'lucide-react';

function useSiteSettings(key) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/admin-api/site-settings/${key}?t=${Date.now()}`)
      .then(r => r.json())
      .then(res => { if (res.success && res.data) setData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [key]);
  return { data, loading };
}

export function SizingGuide() {
  const { data: guide, loading } = useSiteSettings('sizing_guide');
  const defaultGuide = {
    title: 'Sizing Guide',
    description: 'Our garments are designed with a modern, relaxed/oversized streetwear fit.',
    columns: ['Size', 'Chest', 'Waist', 'Length'],
    rows: [
      { Size: 'S', Chest: '36 - 38', Waist: '28 - 30', Length: '27' },
      { Size: 'M', Chest: '38 - 40', Waist: '30 - 32', Length: '28' },
      { Size: 'L', Chest: '40 - 42', Waist: '32 - 34', Length: '29' },
      { Size: 'XL', Chest: '42 - 44', Waist: '34 - 36', Length: '30' }
    ]
  };
  const content = guide || defaultGuide;
  const columns = content.columns || defaultGuide.columns;
  const rows = content.rows || defaultGuide.rows;

  return (
    <div className="min-h-screen pt-24 pb-16 bg-base-800 text-surface-primary">
      <div className="container-site max-w-3xl">
        <p className="section-label mb-2">Help &amp; Guides</p>
        <h1 className="font-black text-3xl sm:text-4xl text-surface-primary mb-6">{content.title || 'Sizing Guide'}</h1>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C5A880]" size={32} /></div> : (
          <div className="glass-dark p-6 sm:p-8 rounded-xl border border-base-300/40 space-y-6">
            <div className="flex gap-4 items-start">
              <Ruler className="text-brand flex-shrink-0 mt-1" size={24} />
              <div>
                <h2 className="font-bold text-lg text-surface-primary">How to Find Your Fit</h2>
                <p className="text-surface-secondary text-sm mt-1">{content.description}</p>
              </div>
            </div>
            <div className="border-t border-base-300/30 pt-6">
              <h3 className="font-bold text-sm text-surface-secondary uppercase tracking-wider mb-4">Standard Sizing Table (Inches)</h3>
              <div className="overflow-x-auto rounded-lg border border-base-300/30">
                <table className="w-full text-center border-collapse font-mono text-sm">
                  <thead>
                    <tr className="bg-base-900/80 border-b border-base-300/30">
                      {columns.map((col, idx) => (
                        <th key={idx} className="py-3 px-4 font-bold text-surface-secondary uppercase text-xs">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-300/30">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-base-900/20">
                        {columns.map((col, cIdx) => (
                          <td key={cIdx} className={`py-3 px-4 ${cIdx === 0 ? 'font-bold text-brand' : ''}`}>
                            {row[col] || row[col.toLowerCase()] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ShippingInfo() {
  const { data: contact } = useSiteSettings('contact_info');
  const { data: shipping } = useSiteSettings('shipping_rates');
  const phone = contact?.phone || '01827-406756';
  const facebook = contact?.facebook_url || 'https://www.facebook.com/share/1HitDwyphD';
  const inside = shipping?.inside ?? 60;
  const sub = shipping?.sub ?? 100;
  const outside = shipping?.outside ?? 120;
  return (
    <div className="min-h-screen pt-24 pb-16 bg-base-800 text-surface-primary">
      <div className="container-site max-w-3xl">
        <p className="section-label mb-2">Help &amp; Guides</p>
        <h1 className="font-black text-3xl sm:text-4xl text-surface-primary mb-6">Shipping Policy</h1>
        <div className="glass-dark p-6 sm:p-8 rounded-xl border border-base-300/40 space-y-6">
          <div className="flex gap-4 items-start"><Truck className="text-brand flex-shrink-0 mt-1" size={24} /><div><h2 className="font-bold text-lg text-surface-primary">Cash On Delivery All Over Bangladesh</h2><p className="text-surface-secondary text-sm mt-1">We provide cash on delivery service to all locations across Bangladesh.</p></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-base-300/30 pt-6">
            <div className="p-4 rounded-lg bg-base-900/40 border border-base-300/30"><h3 className="font-bold text-brand text-xs uppercase tracking-wider mb-2">Inside Dhaka</h3><p className="text-xl font-black text-surface-primary">৳ {inside}</p></div>
            <div className="p-4 rounded-lg bg-base-900/40 border border-base-300/30"><h3 className="font-bold text-brand text-xs uppercase tracking-wider mb-2">Sub Dhaka</h3><p className="text-xl font-black text-surface-primary">৳ {sub}</p><p className="text-[10px] text-surface-muted mt-1">(Narayanganj, Keraniganj, Savar, Gazipur)</p></div>
            <div className="p-4 rounded-lg bg-base-900/40 border border-base-300/30"><h3 className="font-bold text-brand text-xs uppercase tracking-wider mb-2">Outside Dhaka</h3><p className="text-xl font-black text-surface-primary">৳ {outside}</p></div>
          </div>
          <div className="border-t border-base-300/30 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-surface-muted">
            <div><p className="font-bold text-surface-primary">PutiMach</p><p className="mt-1">Mobile: <a href={`tel:${phone.replace(/-/g,'')}`} className="hover:text-brand font-mono">{phone}</a></p></div>
            <a href={facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#C5A880] font-bold hover:underline">Follow us on Facebook →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReturnsExchanges() {
  const { data: sections, loading } = useSiteSettings('return_policy');
  const defaultSections = [
    { id: 1, title: 'Delivery Inspection Policy', text: 'To guarantee absolute peace of mind, we allow and encourage all customers to inspect the quality, color, and size of their heritage garments at the time of delivery before finalizing Cash on Delivery payments.\n\nIf you find any manufacturing defect, sizing discrepancy, or if the garment does not meet your expectations, you may return it immediately with the delivery concierge without any charge.' },
    { id: 2, title: '7-Day Easy Exchange', text: 'If you have accepted the garment and later decide to exchange it for a different size, color, or a different style, we offer a hassle-free 7-day exchange window.\n\n• The garment must be unworn, unwashed, and in its original pristine condition.\n• All security tags, designer labels, and packaging must remain completely intact.\n• Exchanges are subject to stock availability.' },
    { id: 3, title: 'Non-Returnable & Conditions', text: 'Garments that have been custom altered, bespoke tailormade, or show signs of wear, dry cleaning, or washing cannot be accepted for returns or exchanges.\n\nReturn delivery shipping charges are the responsibility of the customer unless the return is due to a verified manufacturing damage or shipping error from our end.' },
  ];
  const list = (Array.isArray(sections) && sections.length > 0) ? sections : defaultSections;
  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#FDFBF7] text-[#1C1613]">
      <div className="container-site max-w-3xl">
        <p className="text-[10px] font-bold text-[#C5A880] uppercase tracking-[0.25em] font-serif mb-2">OUR GUARANTEE &amp; PROMISE</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#1C1613] uppercase tracking-wider mb-3">RETURNS &amp; EXCHANGES</h1>
        <p className="text-xs text-[#7C6E65] uppercase tracking-wider mb-8 leading-relaxed">We hold our craftsmanship to the highest standards.</p>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C5A880]" size={32} /></div> : (
          <div className="space-y-8">
            {list.map((s, i) => (
              <div key={s.id || i} className="border-t border-[#E9E2D2] pt-6">
                <h2 className="font-serif text-lg text-[#1C1613] uppercase tracking-wider mb-3">{i+1}. {s.title}</h2>
                <div className="space-y-3 text-xs text-[#7C6E65] uppercase tracking-wider leading-relaxed">
                  {s.text.split('\n').map((ln, j) => ln.trim() ? <p key={j} className={ln.startsWith('•') ? 'pl-4' : ''}>{ln}</p> : null)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ContactUs() {
  const { data: c, loading } = useSiteSettings('contact_info');
  const phone = c?.phone || '01827-406756';
  const whatsapp = c?.whatsapp || '01827406756';
  const email = c?.email || 'putimach324@gmail.com';
  const address = c?.address || 'House 42, Road 11, Banani, Dhaka, Bangladesh';
  const facebook = c?.facebook_url || 'https://www.facebook.com/share/1HitDwyphD';
  const instagram = c?.instagram_url || 'https://www.instagram.com/putimachhh?igsh=dnYxeXhhdHhodzdn';
  const mapsUrl = c?.google_maps_url || 'https://maps.google.com/?q=House+42,+Road+11,+Banani,+Dhaka';
  const flagName = c?.flagship_name || 'PUTIMACH BANANI FLAGSHIP';
  const flagAddr = c?.flagship_address || 'House 42, Road 11, Banani, Dhaka';
  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#FDFBF7] text-[#1C1613]">
      <div className="container-site max-w-3xl">
        <p className="text-[10px] font-bold text-[#C5A880] uppercase tracking-[0.25em] font-serif mb-2">CONNECT WITH US</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#1C1613] uppercase tracking-wider mb-3">WE ARE ALWAYS HERE</h1>
        <p className="text-xs text-[#7C6E65] uppercase tracking-wider mb-8 leading-relaxed">Have questions about sizes, weaving details, or custom orders? Reach out to our concierge.</p>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C5A880]" size={32} /></div> : (
          <div className="space-y-8">
            <div className="border-t border-[#E9E2D2] pt-6">
              <h2 className="font-serif text-lg text-[#1C1613] uppercase tracking-wider mb-4">Concierge Office</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[#7C6E65] uppercase tracking-wider leading-relaxed">
                <div className="space-y-1"><p className="font-bold text-[#1C1613]">Email</p><a href={`mailto:${email}`} className="hover:text-[#C5A880] break-all normal-case">{email}</a></div>
                <div className="space-y-1"><p className="font-bold text-[#1C1613]">Phone</p><a href={`tel:${phone.replace(/-/g,'')}`} className="hover:text-[#C5A880]">{phone}</a></div>
                <div className="space-y-1"><p className="font-bold text-[#1C1613]">Address</p><p className="normal-case">{address}</p></div>
              </div>
            </div>
            <div className="border-t border-[#E9E2D2] pt-6">
              <h2 className="font-serif text-lg text-[#1C1613] uppercase tracking-wider mb-4">Direct Channels</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[#7C6E65] uppercase tracking-wider">
                <div className="space-y-1"><p className="font-bold text-[#1C1613]">WhatsApp</p><a href={`https://wa.me/88${whatsapp.replace(/-/g,'')}`} target="_blank" rel="noreferrer" className="text-[#C5A880] hover:underline font-bold">Chat Now →</a></div>
                <div className="space-y-1"><p className="font-bold text-[#1C1613]">Instagram</p><a href={instagram} target="_blank" rel="noreferrer" className="text-[#C5A880] hover:underline font-bold">Follow Us →</a></div>
                <div className="space-y-1"><p className="font-bold text-[#1C1613]">Facebook</p><a href={facebook} target="_blank" rel="noreferrer" className="text-[#C5A880] hover:underline font-bold">Connect →</a></div>
              </div>
            </div>
            <div className="border-t border-[#E9E2D2] pt-6">
              <h2 className="font-serif text-[#C5A880] text-xs uppercase tracking-widest mb-1">Find Us</h2>
              <h3 className="font-serif text-lg text-[#1C1613] uppercase tracking-wider mb-2">{flagName}</h3>
              <p className="text-xs text-[#7C6E65] normal-case">{flagAddr}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function OurStory() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-base-800 text-surface-primary">
      <div className="container-site max-w-3xl">
        <p className="section-label mb-2">About PutiMach</p>
        <h1 className="font-black text-3xl sm:text-4xl text-surface-primary mb-6">Our Story</h1>
        <div className="glass-dark p-6 sm:p-8 rounded-xl border border-base-300/40 space-y-6">
          <div className="flex gap-4 items-start"><BookOpen className="text-[#C5A880] flex-shrink-0 mt-1" size={24} /><div><h2 className="font-bold text-lg text-surface-primary">Woven in Nostalgia, Tailored for Today.</h2><p className="text-surface-secondary text-sm mt-3">PutiMach was born in Dhaka out of frustration — the frustration of losing our handloom heritage, and the rush of fast fashion that ignores stories and craft.</p><p className="text-surface-secondary text-sm mt-3">Every button is selected to age, every stitch is positioned to hold, and every weave carries the legacy of master weavers of Sonargaon and Tangail.</p></div></div>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  const { data: c } = useSiteSettings('contact_info');
  const email = c?.email || 'putimach324@gmail.com';
  const phone = c?.phone || '01827-406756';
  return (
    <div className="min-h-screen pt-24 pb-16 bg-base-800 text-surface-primary">
      <div className="container-site max-w-3xl">
        <p className="section-label mb-2">Legal</p>
        <h1 className="font-black text-3xl sm:text-4xl text-surface-primary mb-6">Privacy Policy</h1>
        <div className="glass-dark p-6 sm:p-8 rounded-xl border border-base-300/40 space-y-6 text-sm text-surface-secondary leading-relaxed">
          <p className="font-medium text-surface-primary text-base">At PutiMach, your privacy is very important to us.</p>
          <div className="pt-4 border-t border-base-300/30"><h2 className="font-black text-lg text-surface-primary mb-2">Contact Us</h2><p>Email: <a href={`mailto:${email}`} className="text-[#C5A880] hover:underline">{email}</a></p><p>Phone: <a href={`tel:${phone.replace(/-/g,'')}`} className="text-[#C5A880] hover:underline">{phone}</a></p></div>
        </div>
      </div>
    </div>
  );
}

export function TermsOfService() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-base-800 text-surface-primary">
      <div className="container-site max-w-3xl">
        <p className="section-label mb-2">Legal</p>
        <h1 className="font-black text-3xl sm:text-4xl text-surface-primary mb-6">Terms of Service</h1>
        <div className="glass-dark p-6 sm:p-8 rounded-xl border border-base-300/40"><div className="flex gap-4 items-start"><ShieldAlert className="text-brand flex-shrink-0 mt-1" size={24} /><div><h2 className="font-bold text-lg text-surface-primary">Terms &amp; Conditions</h2><p className="text-surface-secondary text-sm mt-2">By purchasing from PutiMach, you agree to our shipping policy (cash on delivery, non-refundable delivery charges) and exchange policies.</p></div></div></div>
      </div>
    </div>
  );
}

export function CookiePolicy() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-base-800 text-surface-primary">
      <div className="container-site max-w-3xl">
        <p className="section-label mb-2">Legal</p>
        <h1 className="font-black text-3xl sm:text-4xl text-surface-primary mb-6">Cookie Policy</h1>
        <div className="glass-dark p-6 sm:p-8 rounded-xl border border-base-300/40"><div className="flex gap-4 items-start"><ShieldAlert className="text-brand flex-shrink-0 mt-1" size={24} /><div><h2 className="font-bold text-lg text-surface-primary">How We Use Cookies</h2><p className="text-surface-secondary text-sm mt-2">We use cookies to maintain your shopping cart state, recall your checkout preferences, and analyze website traffic.</p></div></div></div>
      </div>
    </div>
  );
}

export function FAQ() {
  const { data: faqs, loading } = useSiteSettings('faq_page');
  const defaults = [
    { id: 1, q: 'Do you offer custom sizes?', a: 'No, we currently offer standard sizes only. Please refer to the Size Guide before placing your order.' },
    { id: 2, q: 'How long does delivery take?', a: 'Deliveries within Dhaka take 1 to 2 business days. Savar, Gazipur, and Narayanganj take 2 to 3 days. Outside Dhaka, courier deliveries take 3 to 5 business days.' },
    { id: 3, q: 'What are the shipping charges?', a: 'Shipping fees are 80 BDT for inside Dhaka, 100 BDT for Savar/Gazipur/Narayanganj, and 150 BDT for all other districts in Bangladesh.' },
    { id: 4, q: 'Can I inspect the garment before payment?', a: 'Yes. For Cash on Delivery, we allow customers to inspect the garment at the time of delivery before handing over the payment.' },
  ];
  const list = (Array.isArray(faqs) && faqs.length > 0) ? faqs : defaults;
  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#FDFBF7] text-[#1C1613]">
      <div className="container-site max-w-3xl">
        <p className="text-[10px] font-bold text-[#C5A880] uppercase tracking-[0.25em] font-serif mb-2">QUESTIONS &amp; ANSWERS</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#1C1613] uppercase tracking-wider mb-8">FAQ</h1>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C5A880]" size={32} /></div> : (
          <div className="space-y-8">
            {list.map((item, idx) => (
              <div key={item.id || idx} className="border-t border-[#E9E2D2] pt-6">
                <h2 className="font-serif text-lg text-[#1C1613] uppercase tracking-wider mb-3">{item.q}</h2>
                <p className="text-xs text-[#7C6E65] uppercase tracking-wider leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
