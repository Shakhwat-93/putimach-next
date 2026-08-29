// SERVER COMPONENT — no 'use client'
// Fetches all homepage data on the server so HTML arrives pre-populated.
// Zero flicker, zero loading state, zero localStorage dependency.
import { createClient } from '@supabase/supabase-js';
import HomeClient from '@/views/Home';
import { normalizeProduct, cleanImageUrl } from '@/lib/productMedia';

// Force dynamic: fetch fresh data from Supabase on every request
export const dynamic = 'force-dynamic';

async function getServerData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) return { settings: null, products: [], categories: [] };

  const sb = createClient(supabaseUrl, supabaseKey);

  const [siteSettingsRes, cbSettingsRes, productsRes, categoriesRes] = await Promise.all([
    sb.from('site_settings').select('data').eq('id', 'home_page').maybeSingle(),
    sb.from('cb_settings').select('data').eq('id', 'home_page').maybeSingle(),
    sb.from('cb_products').select('id, data, created_at').order('created_at', { ascending: false }).limit(50),
    sb.from('cb_categories').select('id, data, created_at').order('created_at', { ascending: true }).limit(100),
  ]);

  const settings = siteSettingsRes.data?.data || cbSettingsRes.data?.data || null;

  const products = (productsRes.data || []).map(row => normalizeProduct({
    id: row.id,
    created_at: row.created_at,
    slug: row.data?.slug || row.id,
    ...(row.data || {}),
  })).filter(Boolean);

  const categories = (categoriesRes.data || []).map(row => ({
    id: row.id,
    created_at: row.created_at,
    ...(row.data || {}),
  }));

  return { settings, products, categories };
}

export default async function Page() {
  const { settings, products, categories } = await getServerData();
  const heroImage = cleanImageUrl(settings?.heroBgImage) || '/api/media/uploads/img_1786604752550_8584.webp';

  return (
    <>
      {/* High-priority preload hint for LCP Hero Banner */}
      {heroImage && (
        <link
          rel="preload"
          as="image"
          href={heroImage}
          // @ts-ignore
          fetchPriority="high"
        />
      )}
      <HomeClient initialSettings={settings} initialProducts={products} initialCategories={categories} />
    </>
  );
}
