'use client';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DiscountForm } from '@/admin/components/discount/DiscountForm';
import { saveDiscount } from '@/lib/discounts/db';
import { getCategories, getProducts } from '@/lib/api';
import Swal from 'sweetalert2';

export default function CreateDiscountPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, prods] = await Promise.all([
          getCategories(),
          getProducts()
        ]);
        setCategories(cats || []);
        setProducts(prods || []);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (discountData, isDraft = false) => {
    setIsSaving(true);
    try {
      await saveDiscount(discountData);
      await Swal.fire({
        title: isDraft ? 'Saved as Draft ✓' : 'Discount Created ✓',
        text: `"${discountData.title || discountData.code}" has been saved.`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });
      router.push('/admin/discounts');
    } catch (err: any) {
      Swal.fire({
        title: 'Error Saving Discount',
        text: err?.message || 'Failed to save discount.',
        icon: 'error'
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
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
      <DiscountForm
        categories={categories}
        products={products}
        onSave={handleSave}
        onCancel={() => router.push('/admin/discounts')}
        isSaving={isSaving}
      />
    </div>
  );
}
