'use client';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ShopifyProductEditor } from '@/admin/components/product/ShopifyProductEditor';
import { supabase } from '@/admin/lib/supabase';
import { getCategories, getProductBySlug, invalidateCache } from '@/lib/api';
import Swal from 'sweetalert2';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!productId) return;
      try {
        const [cats, invRes, prod] = await Promise.all([
          getCategories(),
          supabase.from('inventory').select('id, name, sku, current_stock'),
          getProductBySlug(productId)
        ]);

        setCategories(cats || []);
        if (invRes?.data) setInventoryItems(invRes.data);
        if (prod) {
          setProduct(prod);
        } else {
          // Fallback direct query
          const { data } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
          if (data) setProduct({ id: data.id, ...data.data });
        }
      } catch (err) {
        console.error('Failed to load product data:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [productId]);

  const handleSave = async (payload, isDraft = false) => {
    setIsSaving(true);
    try {
      const targetId = product?.id || productId;
      const { error } = await supabase
        .from('products')
        .update({ data: payload })
        .eq('id', targetId);

      if (error) throw error;

      try {
        await supabase
          .from('cb_products')
          .update({ data: payload })
          .eq('id', targetId);
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
            sku: payload.sku || `SKU-${String(targetId).toUpperCase().slice(0, 6)}`,
            category: payload.category || 'Apparel',
            current_stock: totalStock,
            image: primaryImg,
            image_url: primaryImg,
            product_id: targetId,
            selling_price: Number(payload.price) || 0,
            unit_price: Number(payload.price) || 0,
            making_cost: Number(payload.cost_per_item) || 0,
            variants: payload.variants || []
          })
          .eq('id', finalInventoryId);
      } else {
        // Find existing inventory item by product_id, sku, or matching name
        let { data: matchedInv } = await supabase
          .from('inventory')
          .select('id')
          .or(`product_id.eq.${targetId},sku.eq.${payload.sku},name.ilike.${payload.name}`)
          .limit(1)
          .maybeSingle();

        if (matchedInv && matchedInv.id) {
          finalInventoryId = matchedInv.id;
          await supabase
            .from('inventory')
            .update({
              name: payload.name,
              sku: payload.sku || `SKU-${String(targetId).toUpperCase().slice(0, 6)}`,
              category: payload.category || 'Apparel',
              current_stock: totalStock,
              image: primaryImg,
              image_url: primaryImg,
              product_id: targetId,
              selling_price: Number(payload.price) || 0,
              unit_price: Number(payload.price) || 0,
              making_cost: Number(payload.cost_per_item) || 0,
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
              sku: payload.sku || `SKU-${String(targetId).toUpperCase().slice(0, 6)}`,
              category: payload.category || 'Apparel',
              current_stock: totalStock,
              min_stock_level: 5,
              unit_price: Number(payload.price) || 0,
              selling_price: Number(payload.price) || 0,
              making_cost: Number(payload.cost_per_item) || 0,
              product_id: targetId,
              image: primaryImg,
              image_url: primaryImg,
              variants: payload.variants || []
            }]);
        }
      }

      if (finalInventoryId && payload.inventory_id !== finalInventoryId) {
        payload.inventory_id = finalInventoryId;
        payload.stock = totalStock;
        await supabase.from('products').update({ data: payload }).eq('id', targetId);
        try {
          await supabase.from('cb_products').update({ data: payload }).eq('id', targetId);
        } catch (_) {}
      }

      invalidateCache();

      await Swal.fire({
        title: isDraft ? 'Saved as Draft ✓' : 'Product Updated ✓',
        text: `"${payload.name}" has been successfully updated.`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });

      router.push('/admin/storefront');
    } catch (err) {
      console.error('Error updating product:', err);
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

  const handleDuplicate = (productData) => {
    const copySlug = `${productData.slug || 'product'}-copy-${Date.now().toString(36).slice(-4)}`;
    router.push(`/admin/products/new?duplicate=${encodeURIComponent(productData.id || productData.slug)}`);
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

  if (!product) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-foreground">Product Not Found</h2>
        <p className="text-xs text-muted-foreground">The requested product could not be located in your database.</p>
        <button
          type="button"
          onClick={() => router.push('/admin/storefront')}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
        >
          Return to Storefront
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0">
      <ShopifyProductEditor
        initialProduct={product}
        categories={categories}
        inventoryItems={inventoryItems}
        onSave={handleSave}
        onCancel={() => router.push('/admin/storefront')}
        onDuplicate={handleDuplicate}
        onQuickAddCategory={handleQuickAddCategory}
        isSaving={isSaving}
      />
    </div>
  );
}
