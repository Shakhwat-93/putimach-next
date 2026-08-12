'use client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Check, Package, Eye, AlertCircle, Loader2, Layers, Table, Code, Ruler } from 'lucide-react';
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct } from '../../lib/api';
import Link from 'next/link';


const formatPrice = (p) => `৳${Number(p).toLocaleString('en-BD')}`;

const defaultSizeColumns = ['Size', 'Waist', 'Thigh', 'Length', 'Leg Opening'];
const defaultSizeRows = [
  { 'Size': '28', 'Waist': '28', 'Thigh': '26', 'Length': '42', 'Leg Opening': '16' },
  { 'Size': '30', 'Waist': '30', 'Thigh': '28', 'Length': '43', 'Leg Opening': '17' },
  { 'Size': '32', 'Waist': '32', 'Thigh': '38', 'Length': '43', 'Leg Opening': '17' },
  { 'Size': '34', 'Waist': '34', 'Thigh': '29', 'Length': '43', 'Leg Opening': '18' },
  { 'Size': '36', 'Waist': '36', 'Thigh': '30', 'Length': '44', 'Leg Opening': '18' },
  { 'Size': '38', 'Waist': '38', 'Thigh': '32', 'Length': '44', 'Leg Opening': '19' },
];

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: '',
    price: '',
    original_price: '',
    badge: '',
    image: '',
    description: '',
    long_description: '',
    in_stock: true,
    sizes: '28, 30, 32, 34, 36, 38',
    colors: 'black',
    material: 'Cotton 100%',
    sizeColumns: [...defaultSizeColumns],
    sizeRows: [...defaultSizeRows],
    sizeGuideTab: 'table', // 'table' or 'json'
    size_guide_json: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodData, catData] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prodData);
      setCategories(catData);
    } catch (err) {
      setError('Failed to load products or categories.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditProduct(null);
    setFormData({
      name: '',
      slug: '',
      category: categories[0]?.slug || '',
      price: '',
      original_price: '',
      badge: '',
      image: '',
      description: '',
      long_description: '',
      in_stock: true,
      sizes: '28, 30, 32, 34, 36, 38',
      colors: 'black',
      material: 'Cotton 100%',
      sizeColumns: [...defaultSizeColumns],
      sizeRows: [...defaultSizeRows],
      sizeGuideTab: 'table',
      size_guide_json: JSON.stringify({ material: 'Cotton 100%', columns: defaultSizeColumns, rows: defaultSizeRows }, null, 2),
    });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditProduct(p);

    let mat = 'Cotton 100%';
    let cols = [...defaultSizeColumns];
    let rows = [...defaultSizeRows];

    if (p.size_guide?.columns && p.size_guide?.rows) {
      mat = p.size_guide.material || 'Cotton 100%';
      cols = p.size_guide.columns;
      rows = p.size_guide.rows;
    } else if (p.size_guide && typeof p.size_guide === 'object') {
      mat = p.size_guide.material || 'Cotton 100%';
      const cleanGuide = { ...p.size_guide };
      delete cleanGuide.material;
      cols = ['Size', 'Dimensions'];
      rows = Object.entries(cleanGuide).map(([sz, dim]) => ({ 'Size': sz, 'Dimensions': String(dim) }));
    }

    setFormData({
      name: p.name,
      slug: p.slug,
      category: p.category || categories[0]?.slug || '',
      price: p.price,
      original_price: p.original_price || '',
      badge: p.badge || '',
      image: p.image || '',
      description: p.description || '',
      long_description: p.long_description || '',
      in_stock: p.in_stock ?? true,
      sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : p.sizes || '',
      colors: Array.isArray(p.colors) ? p.colors.join(', ') : p.colors || '',
      material: mat,
      sizeColumns: cols,
      sizeRows: rows,
      sizeGuideTab: 'table',
      size_guide_json: p.size_guide ? JSON.stringify(p.size_guide, null, 2) : JSON.stringify({ material: mat, columns: cols, rows: rows }, null, 2),
    });
    setError('');
    setModalOpen(true);
  };

  const handleColumnChange = (valueStr) => {
    const cols = valueStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (cols.length === 0) return;
    setFormData((prev) => {
      const updatedRows = prev.sizeRows.map((row) => {
        const newRow = {};
        cols.forEach((c) => {
          newRow[c] = row[c] || '';
        });
        return newRow;
      });
      return { ...prev, sizeColumns: cols, sizeRows: updatedRows };
    });
  };

  const handleRowValueChange = (rIdx, colName, val) => {
    setFormData((prev) => {
      const nextRows = [...prev.sizeRows];
      nextRows[rIdx] = { ...nextRows[rIdx], [colName]: val };
      return { ...prev, sizeRows: nextRows };
    });
  };

  const handleAddRow = () => {
    setFormData((prev) => {
      const newRow = {};
      prev.sizeColumns.forEach((c) => {
        newRow[c] = '';
      });
      return { ...prev, sizeRows: [...prev.sizeRows, newRow] };
    });
  };

  const handleRemoveRow = (rIdx) => {
    setFormData((prev) => ({
      ...prev,
      sizeRows: prev.sizeRows.filter((_, idx) => idx !== rIdx),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);

    try {
      // Parse sizes & colors
      const sizesArray = formData.sizes.split(',').map((s) => s.trim()).filter(Boolean);
      const colorsArray = formData.colors.split(',').map((c) => c.trim()).filter(Boolean);

      let sizeGuidePayload;
      if (formData.sizeGuideTab === 'table') {
        sizeGuidePayload = {
          material: formData.material || 'Cotton 100%',
          columns: formData.sizeColumns,
          rows: formData.sizeRows,
        };
      } else {
        try {
          sizeGuidePayload = JSON.parse(formData.size_guide_json);
        } catch (err) {
          throw new Error('Invalid JSON format in raw Size Guide JSON');
        }
      }

      const payload = {
        name: formData.name,
        slug: formData.slug,
        category: formData.category,
        price: Number(formData.price),
        original_price: formData.original_price ? Number(formData.original_price) : null,
        badge: formData.badge || null,
        image: formData.image,
        images: [formData.image],
        description: formData.description,
        long_description: formData.long_description,
        in_stock: Boolean(formData.in_stock),
        sizes: sizesArray,
        colors: colorsArray,
        size_guide: sizeGuidePayload,
      };

      if (editProduct) {
        await updateProduct(editProduct.id, payload);
      } else {
        await createProduct(payload);
      }
      await fetchData();
      setModalOpen(false);
    } catch (err) {
      setError(err.message || 'Error saving product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      await fetchData();
    } catch (err) {
      alert('Error deleting product: ' + (err.message || err));
    } finally {
      setDeleteId(null);
    }
  };

  const toggleStock = async (product) => {
    try {
      const updated = await updateProduct(product.id, { in_stock: !product.in_stock });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    } catch (err) {
      alert('Error updating stock status');
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-lg">Products</h2>
          <p className="text-surface-muted text-xs mt-0.5">{products.length} total products</p>
        </div>
        <button onClick={handleOpenAdd} className="btn-primary text-xs py-2 px-3 h-auto" id="add-product-btn">
          <Plus size={14} />
          <span className="hidden xs:inline">Add</span> Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-8 text-xs h-9 w-full"
          id="products-search"
        />
      </div>

      {/* Product List */}
      {loading ? (
        <div className="card py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 size={28} className="text-brand animate-spin" />
          <p className="text-surface-muted text-xs">Loading products...</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-2">
            {filtered.length === 0 ? (
              <div className="card py-12 flex flex-col items-center gap-2">
                <Package size={24} className="text-surface-muted" />
                <p className="text-surface-muted text-xs">No products found</p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((product, i) => (
                  <motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }} className="card p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-base-500 flex-shrink-0 border border-base-300">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-surface-primary line-clamp-1">{product.name}</p>
                        <p className="text-[10px] text-surface-muted font-mono">{product.slug}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-black text-brand">{formatPrice(product.price)}</span>
                          <button onClick={() => toggleStock(product)} className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${product.in_stock ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                            <span className={`w-1 h-1 rounded-full ${product.in_stock ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            {product.in_stock ? 'In Stock' : 'Out'}
                          </button>
                          {product.badge && <span className="badge badge-brand text-[9px]">{product.badge}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button onClick={() => handleOpenEdit(product)} className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-muted hover:text-brand hover:bg-brand/10 transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => setDeleteId(product.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Badge</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((product, i) => (
                      <motion.tr key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.04 }}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-base-500 flex-shrink-0 border border-base-300">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-bold text-xs text-surface-primary">{product.name}</p>
                              <p className="text-[10px] text-surface-muted font-mono">{product.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="capitalize text-xs">{product.category}</td>
                        <td>
                          <p className="font-black text-xs text-surface-primary">{formatPrice(product.price)}</p>
                          {product.original_price && <p className="text-[10px] text-surface-muted line-through">{formatPrice(product.original_price)}</p>}
                        </td>
                        <td>
                          <button onClick={() => toggleStock(product)} className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors ${product.in_stock ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${product.in_stock ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                            {product.in_stock ? 'In Stock' : 'Out'}
                          </button>
                        </td>
                        <td>{product.badge ? <span className="badge badge-brand text-[10px]">{product.badge}</span> : <span className="text-surface-muted text-xs">—</span>}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Link href={`/product/${product.slug}`} target="_blank" className="btn-icon w-7 h-7 text-surface-muted hover:text-blue-400" title="View"><Eye size={13} /></Link>
                            <button onClick={() => handleOpenEdit(product)} className="btn-icon w-7 h-7 text-surface-muted hover:text-brand" title="Edit"><Edit2 size={13} /></button>
                            <button onClick={() => setDeleteId(product.id)} className="btn-icon w-7 h-7 text-surface-muted hover:text-red-400" title="Delete"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-surface-muted text-xs">No products found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="glass-dark rounded-2xl p-6 max-w-sm w-full border border-base-300">
                <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={20} className="text-red-400" />
                </div>
                <h3 className="font-bold text-h4 text-center mb-2">Delete Product?</h3>
                <p className="text-surface-muted text-small text-center mb-6">
                  This action cannot be undone. The product will be permanently removed from Supabase.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteId)}
                    className="flex-1 py-3 rounded-lg bg-red-500 text-white font-semibold text-small hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4"
            >
              <div className="glass-dark rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-3xl border border-base-300 max-h-[92vh] overflow-y-auto hide-scrollbar shadow-2xl">
                {/* Mobile drag handle */}
                <div className="w-10 h-1 rounded-full bg-base-300 mx-auto mb-3 sm:hidden" />
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-base-300">
                  <h3 className="font-black text-base text-surface-primary">{editProduct ? 'Edit Product' : 'Add Product'}</h3>
                  <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-xl bg-base-800 border border-base-300 flex items-center justify-center text-surface-secondary hover:text-white transition-colors">
                    <X size={15} />
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-6">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                        Product Name *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Void Cargo Pants"
                        value={formData.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            name,
                            slug: editProduct ? prev.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                          }));
                        }}
                        className="input text-small"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                        Slug * (Unique URL identifier)
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. void-cargo-pants"
                        value={formData.slug}
                        onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                        className="input text-small font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                        Category *
                      </label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                        className="input text-small capitalize"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.slug}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                        Price (BDT) *
                      </label>
                      <input
                        required
                        type="number"
                        placeholder="3200"
                        value={formData.price}
                        onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                        className="input text-small font-mono font-bold text-brand"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                        Original Price (Optional)
                      </label>
                      <input
                        type="number"
                        placeholder="3800"
                        value={formData.original_price}
                        onChange={(e) => setFormData((prev) => ({ ...prev, original_price: e.target.value }))}
                        className="input text-small font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                        Image URL *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="/images/cargo-fit.webp or https://..."
                        value={formData.image}
                        onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                        className="input text-small font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                        Badge Tag (Optional)
                      </label>
                      <select
                        value={formData.badge}
                        onChange={(e) => setFormData((prev) => ({ ...prev, badge: e.target.value }))}
                        className="input text-small font-bold tracking-wide uppercase"
                      >
                        <option value="">No Badge</option>
                        <option value="NEW DROP">New Drop</option>
                        <option value="BESTSELLER">Bestseller</option>
                        <option value="LIMITED">Limited</option>
                        <option value="SALE">Sale</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                        Available Sizes (comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="28, 30, 32, 34, 36, 38"
                        value={formData.sizes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, sizes: e.target.value }))}
                        className="input text-small font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                        Available Colors (comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="black, rust, charcoal"
                        value={formData.colors}
                        onChange={(e) => setFormData((prev) => ({ ...prev, colors: e.target.value }))}
                        className="input text-small font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                      Short Description (Card Subtitle)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Heavy premium fleece. Dropped shoulders..."
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      className="input resize-none text-small"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                      Long Description (Detail Page Overview)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Detailed overview of fabric, cut, and design philosophy..."
                      value={formData.long_description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, long_description: e.target.value }))}
                      className="input resize-none text-small"
                    />
                  </div>

                  {/* ─── Elite Size Chart & Fit Guide Builder ─── */}
                  <div className="rounded-2xl p-6 border border-brand/30 bg-base-900/60 space-y-6">
                    <div className="flex items-center justify-between border-b border-base-300 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-brand font-bold">
                          <Ruler size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-surface-primary">Size Chart & Fit Guide Builder</h4>
                          <p className="text-xs text-surface-muted">Fully dynamic multi-column measurement table</p>
                        </div>
                      </div>

                      <div className="flex bg-base-950 p-1 rounded-xl border border-base-300 gap-1">
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, sizeGuideTab: 'table' }))}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            formData.sizeGuideTab === 'table' ? 'bg-brand text-white shadow-glow-sm' : 'text-surface-secondary hover:text-surface-primary'
                          }`}
                        >
                          <Table size={14} />
                          <span>Table Builder</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, sizeGuideTab: 'json' }))}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            formData.sizeGuideTab === 'json' ? 'bg-brand text-white shadow-glow-sm' : 'text-surface-secondary hover:text-surface-primary'
                          }`}
                        >
                          <Code size={14} />
                          <span>Raw JSON</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand mb-1.5 uppercase tracking-wider flex items-center gap-1">
                        <Layers size={14} />
                        Fabric / Material Composition
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cotton 100% or 400 GSM Heavyweight Fleece"
                        value={formData.material}
                        onChange={(e) => setFormData((prev) => ({ ...prev, material: e.target.value }))}
                        className="input text-small bg-base-950/80 border-brand/40 font-semibold"
                      />
                    </div>

                    {formData.sizeGuideTab === 'table' ? (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                            Table Column Headers (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={formData.sizeColumns.join(', ')}
                            onChange={(e) => handleColumnChange(e.target.value)}
                            placeholder="Size, Waist, Thigh, Length, Leg Opening"
                            className="input text-small font-mono text-brand font-bold"
                          />
                          <p className="text-[10px] text-surface-muted mt-1">Change column headers here to dynamically update the measurement grid below.</p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-surface-secondary uppercase tracking-wider">
                              Measurements Grid (Inches)
                            </label>
                            <button
                              type="button"
                              onClick={handleAddRow}
                              className="btn-ghost text-xs py-1.5 px-3 text-brand hover:bg-brand/10 font-bold flex items-center gap-1"
                            >
                              <Plus size={14} />
                              <span>Add Row</span>
                            </button>
                          </div>

                          <div className="rounded-xl border border-base-300 overflow-hidden bg-base-950 overflow-x-auto">
                            <table className="w-full text-center border-collapse font-mono text-sm">
                              <thead>
                                <tr className="bg-base-900 border-b border-base-300">
                                  {formData.sizeColumns.map((col, idx) => (
                                    <th key={idx} className="py-2.5 px-3 text-xs font-bold text-surface-secondary uppercase tracking-wider border-r border-base-300/50 last:border-0">
                                      {col}
                                    </th>
                                  ))}
                                  <th className="py-2.5 px-3 w-12"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-base-300/50">
                                {formData.sizeRows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-base-900/30 transition-colors">
                                    {formData.sizeColumns.map((col, cIdx) => (
                                      <td key={cIdx} className="p-1.5 border-r border-base-300/50 last:border-0">
                                        <input
                                          type="text"
                                          value={row[col] || ''}
                                          onChange={(e) => handleRowValueChange(rIdx, col, e.target.value)}
                                          placeholder="..."
                                          className={`w-full bg-transparent text-center focus:outline-none focus:bg-base-800 rounded py-1 text-xs font-semibold ${
                                            cIdx === 0 ? 'text-brand font-bold' : 'text-surface-primary'
                                          }`}
                                        />
                                      </td>
                                    ))}
                                    <td className="p-1.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveRow(rIdx)}
                                        className="btn-icon w-7 h-7 text-surface-muted hover:text-red-400 mx-auto"
                                        title="Remove Row"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-surface-secondary mb-1.5 uppercase tracking-wider">
                          Raw Advanced JSON Object
                        </label>
                        <textarea
                          rows={8}
                          placeholder='{\n  "material": "Cotton 100%",\n  "columns": ["Size", "Waist"],\n  "rows": [\n    { "Size": "28", "Waist": "28" }\n  ]\n}'
                          value={formData.size_guide_json}
                          onChange={(e) => setFormData((prev) => ({ ...prev, size_guide_json: e.target.value }))}
                          className="input font-mono text-xs bg-base-950 text-emerald-400 focus:text-emerald-300 leading-relaxed"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl bg-base-500/50 border border-base-300">
                    <input
                      type="checkbox"
                      id="in-stock-checkbox"
                      checked={formData.in_stock}
                      onChange={(e) => setFormData((prev) => ({ ...prev, in_stock: e.target.checked }))}
                      className="w-5 h-5 accent-brand rounded cursor-pointer"
                    />
                    <label htmlFor="in-stock-checkbox" className="text-small font-semibold cursor-pointer select-none">
                      Product is currently In Stock
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-base-300">
                    <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 py-3 text-xs font-bold">
                      Cancel
                    </button>
                    <button type="submit" disabled={formLoading} className="btn-primary flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-glow">
                      {formLoading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <>
                          <Check size={15} />
                          {editProduct ? 'Update' : 'Save Product'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
