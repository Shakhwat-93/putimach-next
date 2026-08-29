'use client';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ShopifyProductEditor } from '@/admin/components/product/ShopifyProductEditor';
import { supabase } from '@/admin/lib/supabase';
import { getCategories, getProductBySlug } from '@/lib/api';
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

      // Sync inventory stock
      if (payload.inventory_id && payload.variants?.length > 0) {
        const totalStock = payload.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        await supabase
          .from('inventory')
          .update({ current_stock: totalStock })
          .eq('id', payload.inventory_id);
      }

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
