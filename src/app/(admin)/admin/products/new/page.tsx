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

      // Sync/connect inventory with product image and details
      const primaryImg = payload.image || payload.images?.[0] || Object.values(payload.color_images || {})[0] || null;
      const totalStock = payload.variants?.length > 0
        ? payload.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
        : (payload.stock !== undefined && payload.stock !== null && payload.stock !== '' ? Number(payload.stock) : 0);

      let finalInventoryId = payload.inventory_id;
      if (finalInventoryId) {
        await supabase
          .from('inventory')
          .update({
            name: payload.name,
            sku: payload.sku || `SKU-${targetId.slice(0, 6).toUpperCase()}`,
            category: payload.category || 'general',
            current_stock: totalStock,
            image: primaryImg,
            image_url: primaryImg,
            product_id: targetId,
            selling_price: Number(payload.price) || 0,
            unit_price: Number(payload.price) || 0,
            variants: payload.variants || []
          })
          .eq('id', finalInventoryId);
      } else {
        // Check if existing inventory item matches product_id, sku, or name
        let { data: matchedInv } = await supabase
          .from('inventory')
          .select('id')
          .or(`product_id.eq.${targetId},name.ilike.${payload.name}`)
          .limit(1)
          .maybeSingle();

        if (matchedInv?.id) {
          finalInventoryId = matchedInv.id;
          await supabase
            .from('inventory')
            .update({
              name: payload.name,
              sku: payload.sku || `SKU-${targetId.slice(0, 6).toUpperCase()}`,
              category: payload.category || 'general',
              current_stock: totalStock,
              image: primaryImg,
              image_url: primaryImg,
              product_id: targetId,
              selling_price: Number(payload.price) || 0,
              unit_price: Number(payload.price) || 0,
              variants: payload.variants || []
            })
            .eq('id', finalInventoryId);
        } else {
          finalInventoryId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : 'inv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);

          await supabase
            .from('inventory')
            .insert([{
              id: finalInventoryId,
              name: payload.name,
              sku: payload.sku || `SKU-${targetId.slice(0, 6).toUpperCase()}`,
              category: payload.category || 'general',
              current_stock: totalStock,
              min_stock_level: 5,
              selling_price: Number(payload.price) || 0,
              unit_price: Number(payload.price) || 0,
              making_cost: Number(payload.cost_per_item) || (Number(payload.price) || 0) * 0.4,
              image: primaryImg,
              image_url: primaryImg,
              product_id: targetId,
              variants: payload.variants || [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
        }
      }

      // Attach inventory_id to product payload and update in DB
      payload.inventory_id = finalInventoryId;
      payload.stock = totalStock;
      await supabase.from('products').update({ data: payload }).eq('id', targetId);
      try {
        await supabase.from('cb_products').update({ data: payload }).eq('id', targetId);
      } catch (_) {}

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
    <div className="w-full max-w-full min-w-0">
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
