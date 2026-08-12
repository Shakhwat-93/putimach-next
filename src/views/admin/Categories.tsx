'use client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Check, FolderKanban, AlertCircle, Loader2 } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../lib/api';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    image_url: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError('Failed to fetch categories.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditCategory(null);
    setFormData({ slug: '', name: '', description: '', image_url: '' });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditCategory(cat);
    setFormData({
      slug: cat.slug,
      name: cat.name,
      description: cat.description || '',
      image_url: cat.image_url || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);

    try {
      if (editCategory) {
        await updateCategory(editCategory.id, formData);
      } else {
        await createCategory(formData);
      }
      await fetchCategories();
      setModalOpen(false);
    } catch (err) {
      setError(err.message || 'Error saving category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      await fetchCategories();
    } catch (err) {
      alert('Error deleting category: ' + (err.message || err));
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-lg">Categories</h2>
          <p className="text-surface-muted text-xs mt-0.5">{categories.length} total categories</p>
        </div>
        <button onClick={handleOpenAdd} className="btn-primary text-xs py-2 px-3 h-auto" id="add-category-btn">
          <Plus size={14} />
          <span className="hidden xs:inline">Add</span> Category
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted" />
        <input
          type="text"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-8 text-xs h-9 w-full"
        />
      </div>

      {/* Table / Loading */}
      {loading ? (
        <div className="card py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 size={28} className="text-brand animate-spin" />
          <p className="text-surface-muted text-xs">Loading categories...</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-2">
            {filtered.length === 0 ? (
              <div className="card py-12 flex flex-col items-center justify-center gap-2">
                <FolderKanban size={24} className="text-surface-muted" />
                <p className="text-surface-muted text-xs">No categories found</p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((cat, i) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="card p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-base-500 flex-shrink-0 border border-base-300 flex items-center justify-center font-black text-sm text-surface-muted">
                          {cat.image_url ? (
                            <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                          ) : cat.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-surface-primary">{cat.name}</p>
                          <span className="font-mono text-[10px] text-brand">{cat.slug}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleOpenEdit(cat)} className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-muted hover:text-brand hover:bg-brand/10 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setDeleteId(cat.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {cat.description && (
                      <p className="text-[10px] text-surface-muted mt-2 line-clamp-2">{cat.description}</p>
                    )}
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
                    <th>Category</th>
                    <th>Slug</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((cat, i) => (
                      <motion.tr
                        key={cat.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-base-500 flex-shrink-0 border border-base-300 flex items-center justify-center font-black text-surface-muted">
                              {cat.image_url ? <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" /> : cat.name[0]}
                            </div>
                            <p className="font-bold text-xs text-surface-primary">{cat.name}</p>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-[10px] px-2 py-1 rounded-md bg-base-500 text-brand font-bold">{cat.slug}</span>
                        </td>
                        <td className="max-w-xs">
                          <p className="text-xs text-surface-muted line-clamp-2">{cat.description || '—'}</p>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleOpenEdit(cat)} className="btn-icon w-8 h-8 text-surface-muted hover:text-brand" title="Edit"><Edit2 size={13} /></button>
                            <button onClick={() => setDeleteId(cat.id)} className="btn-icon w-8 h-8 text-surface-muted hover:text-red-400" title="Delete"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-10 text-surface-muted text-xs">No categories found</td></tr>
                  )}
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
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-3 bottom-4 top-auto z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
            >
              <div className="glass-dark rounded-2xl p-5 w-full max-w-sm mx-auto border border-base-300 shadow-2xl">
                <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <h3 className="font-black text-base text-center mb-1.5">Delete Category?</h3>
                <p className="text-surface-muted text-xs text-center mb-5">
                  This cannot be undone. Ensure no products reference this slug.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 text-xs py-2.5">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteId)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-colors"
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
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4"
            >
              <div className="glass-dark rounded-t-3xl sm:rounded-2xl p-5 w-full sm:max-w-md border border-base-300 max-h-[90vh] overflow-y-auto hide-scrollbar shadow-2xl">
                {/* Drag handle for mobile */}
                <div className="w-10 h-1 rounded-full bg-base-300 mx-auto mb-4 sm:hidden" />
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-base">{editCategory ? 'Edit Category' : 'Add Category'}</h3>
                  <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-xl bg-base-800 border border-base-300 flex items-center justify-center text-surface-secondary hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4">
                    <AlertCircle size={16} />
                    <p>{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-surface-secondary mb-1 uppercase tracking-wider">Category Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Hoodies"
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          name,
                          slug: editCategory ? prev.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                        }));
                      }}
                      className="input text-xs h-10"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-surface-secondary mb-1 uppercase tracking-wider">Slug * (Unique ID)</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. hoodies"
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      className="input text-xs h-10 font-mono text-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-surface-secondary mb-1 uppercase tracking-wider">Image URL (optional)</label>
                    <input
                      type="text"
                      placeholder="/images/hoodie-rust.webp"
                      value={formData.image_url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                      className="input text-xs h-10 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-surface-secondary mb-1 uppercase tracking-wider">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Category description..."
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      className="input resize-none text-xs py-2.5"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 text-xs py-2.5">
                      Cancel
                    </button>
                    <button type="submit" disabled={formLoading} className="btn-primary flex-1 text-xs py-2.5 flex items-center justify-center gap-1.5">
                      {formLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Check size={14} />
                          {editCategory ? 'Update' : 'Save Category'}
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
