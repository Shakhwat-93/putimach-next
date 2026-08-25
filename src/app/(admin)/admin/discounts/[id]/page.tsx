'use client';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DiscountForm } from '@/admin/components/discount/DiscountForm';
import { getDiscountById, saveDiscount } from '@/lib/discounts/db';
import { getCategories, getProducts } from '@/lib/api';
import Swal from 'sweetalert2';

export default function EditDiscountPage() {
  const router = useRouter();
  const params = useParams();
  const discountId = params?.id as string;

  const [discount, setDiscount] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!discountId) return;
      try {
        const [cats, prods, disc] = await Promise.all([
          getCategories(),
          getProducts(),
          getDiscountById(discountId)
        ]);
        setCategories(cats || []);
        setProducts(prods || []);
        setDiscount(disc);
      } catch (err) {
        console.error('Failed to load discount data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [discountId]);

  const handleSave = async (discountData, isDraft = false) => {
    setIsSaving(true);
    try {
      await saveDiscount(discountData);
      await Swal.fire({
        title: isDraft ? 'Saved as Draft ✓' : 'Discount Updated ✓',
        text: `"${discountData.title || discountData.code}" has been updated.`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });
      router.push('/admin/discounts');
    } catch (err: any) {
      Swal.fire({
        title: 'Error Saving Discount',
        text: err?.message || 'Failed to update discount.',
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

  if (!discount) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-foreground">Discount Not Found</h2>
        <p className="text-xs text-muted-foreground">The requested discount could not be located.</p>
        <button
          type="button"
          onClick={() => router.push('/admin/discounts')}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
        >
          Back to Discounts
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <DiscountForm
        initialDiscount={discount}
        categories={categories}
        products={products}
        onSave={handleSave}
        onCancel={() => router.push('/admin/discounts')}
        isSaving={isSaving}
      />
    </div>
  );
}
