'use client';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShopifyProductEditor } from '@/admin/components/product/ShopifyProductEditor';
import { supabase } from '@/admin/lib/supabase';
import { getCategories } from '@/lib/api';
import Swal from 'sweetalert2';

export default function AddProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [cats, invRes] = await Promise.all([
          getCategories(),
          supabase.from('inventory').select('id, name, sku, current_stock')
        ]);
        setCategories(cats || []);
        if (invRes?.data) setInventoryItems(invRes.data);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleSave = async (payload, isDraft = false) => {
    setIsSaving(true);
    try {
      let targetId = payload.slug || 'product-' + Date.now();
      const { error } = await supabase
        .from('products')
        .insert([{
          id: targetId,
          data: payload,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      try {
        await supabase
          .from('cb_products')
          .insert([{
            id: targetId,
            data: payload,
            created_at: new Date().toISOString()
          }]);
      } catch (_) {}

      // Sync inventory stock
      if (payload.inventory_id && payload.variants?.length > 0) {
        const totalStock = payload.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        await supabase
          .from('inventory')
          .update({ current_stock: totalStock })
          .eq('id', payload.inventory_id);
      }

      await Swal.fire({
        title: isDraft ? 'Saved as Draft ✓' : 'Product Published ✓',
        text: `"${payload.name}" has been successfully added to your store.`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });

      router.push('/admin/storefront');
    } catch (err) {
      console.error('Error creating product:', err);
      Swal.fire({
        title: 'Error Saving Product',
        text: err?.message || 'Something went wrong while saving.',
        icon: 'error',
        confirmButtonColor: '#0F172A'
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAddCategory = async (name) => {
    const slug = name.toLowerCase().trim().replace(/[\s\W-]+/g, '-');
    const payload = {
      name,
      slug,
      description: `Category for ${name}`,
      image_url: null
    };

    try {
      await supabase
        .from('cb_categories')
        .insert([{ id: slug, data: payload, created_at: new Date().toISOString() }]);
    } catch (e) {
      await supabase
        .from('categories')
        .insert([{ id: slug, data: payload, created_at: new Date().toISOString() }]);
    }

    const newCat = { id: slug, slug, name, ...payload };
    setCategories(prev => [...prev, newCat]);
    return newCat;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ShopifyProductEditor
        categories={categories}
        inventoryItems={inventoryItems}
        onSave={handleSave}
        onCancel={() => router.push('/admin/storefront')}
        onQuickAddCategory={handleQuickAddCategory}
        isSaving={isSaving}
      />
    </div>
  );
}
