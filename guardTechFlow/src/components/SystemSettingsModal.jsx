import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X, Edit2, Trash2, Loader } from 'lucide-react';
import { toast } from 'sonner';

export default function SystemSettingsModal({ onClose }) {
  const [deviceCategories, setDeviceCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getDeviceCategories', {})
      .then(res => setDeviceCategories(res.data.data || []))
      .catch(() => toast.error('שגיאה בטעינת סוגי המכשירים'))
      .finally(() => setLoadingCategories(false));
  }, []);

  const refreshCategories = async () => {
    const res = await base44.functions.invoke('getDeviceCategories', {});
    setDeviceCategories(res.data.data || []);
    localStorage.removeItem('deviceCategories');
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      await base44.functions.invoke('addDeviceCategory', { name: newCategoryName.trim() });
      toast.success('סוג מכשיר התווסף בהצלחה');
      setNewCategoryName('');
      await refreshCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה בהוספת סוג מכשיר');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק קטגוריה זו?')) return;
    try {
      await base44.functions.invoke('deleteDeviceCategory', { categoryId });
      toast.success('קטגוריה נמחקה בהצלחה');
      await refreshCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה במחיקת קטגוריה');
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    try {
      await base44.functions.invoke('updateDeviceCategory', {
        categoryId: editingCategory.id,
        name: editName.trim()
      });
      toast.success('קטגוריה עודכנה בהצלחה');
      setEditingCategory(null);
      await refreshCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה בעדכון קטגוריה');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 transition text-slate-500 hover:text-slate-800"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-right">
            <h2 className="text-lg font-semibold text-slate-900">הגדרות מערכת</h2>
            <p className="text-sm text-slate-500">ניהול סוגי אמצעי תקשוב</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {loadingCategories ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              {/* Category Tags */}
              <div className="flex flex-wrap gap-2">
                {deviceCategories.length === 0 && (
                  <p className="text-sm text-slate-500">אין סוגי מכשירים. הוסף את הראשון למטה.</p>
                )}
                {deviceCategories.map(category => (
                  <div key={category.id} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1.5 rounded-full">
                    <span>{category.name}</span>
                    <button
                      onClick={() => { setEditingCategory(category); setEditName(category.name); }}
                      className="ml-2 p-0.5 hover:bg-blue-200 rounded transition"
                      title="עריכה"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-0.5 hover:bg-red-200 rounded transition"
                      title="מחיקה"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Category Form */}
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="הוסף סוג מכשיר חדש"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-sm"
                  disabled={addingCategory}
                />
                <Button type="submit" disabled={addingCategory || !newCategoryName.trim()} className="gap-2">
                  {addingCategory && <Loader className="w-4 h-4 animate-spin" />}
                  הוסף
                </Button>
              </form>

              {/* Inline Edit Form */}
              {editingCategory && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">עריכת קטגוריה: <span className="text-blue-700">{editingCategory.name}</span></p>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-sm"
                  />
                  <div className="flex gap-2 justify-start">
                    <Button variant="outline" size="sm" onClick={() => setEditingCategory(null)}>ביטול</Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={!editName.trim()}>שמור</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}