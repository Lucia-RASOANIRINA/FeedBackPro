'use client';

import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState } from 'react';
import { TrendingUp, Plus, Pencil, Trash2, X, Image as ImageIcon } from 'lucide-react';

type Improvement = {
  id: string;
  establishment_id: string | null;
  title: string;
  description: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  published_at: string | null;
};

type EstablishmentOption = { id: string; name: string };

const emptyForm = {
  establishment_id: '',
  title: '',
  description: '',
  before_photo_url: '',
  after_photo_url: '',
};

export default function ImprovementsPage() {
  const [rows, setRows] = useState<Improvement[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [impRes, estRes] = await Promise.all([
      supabase
        .from('improvements')
        .select('id, establishment_id, title, description, before_photo_url, after_photo_url, published_at')
        .order('published_at', { ascending: false }),
      supabase.from('establishments').select('id, name').order('name'),
    ]);
    if (impRes.error) setError(impRes.error.message);
    else {
      setError(null);
      setRows((impRes.data as Improvement[]) ?? []);
    }
    setEstablishments((estRes.data as EstablishmentOption[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(r: Improvement) {
    setEditingId(r.id);
    setForm({
      establishment_id: r.establishment_id ?? '',
      title: r.title,
      description: r.description ?? '',
      before_photo_url: r.before_photo_url ?? '',
      after_photo_url: r.after_photo_url ?? '',
    });
    setShowForm(true);
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      establishment_id: form.establishment_id || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      before_photo_url: form.before_photo_url.trim() || null,
      after_photo_url: form.after_photo_url.trim() || null,
    };
    const { error: e } = editingId
      ? await supabase.from('improvements').update(payload).eq('id', editingId)
      : await supabase.from('improvements').insert(payload);
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette amélioration ?')) return;
    const supabase = createClient();
    const { error: e } = await supabase.from('improvements').delete().eq('id', id);
    if (e) setError(e.message);
    else setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const estName = (id: string | null) =>
    establishments.find((e) => e.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Améliorations</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand text-white px-3 py-2 rounded-lg text-sm hover:bg-brand-dark"
        >
          <Plus size={16} /> Publier
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand"></div>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-10 text-center text-gray-400">
          <TrendingUp size={40} className="mx-auto mb-2 opacity-50" />
          Aucune amélioration publiée. Cliquez sur « Publier ».
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="bg-white border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-lg">{r.title}</h4>
                  <p className="text-xs text-gray-500">{estName(r.establishment_id)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(r)} title="Modifier" className="text-gray-400 hover:text-brand">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => remove(r.id)} title="Supprimer" className="text-gray-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {r.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.description}</p>}
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { url: r.before_photo_url, label: 'Avant' },
                  { url: r.after_photo_url, label: 'Après' },
                ].map((ph) => (
                  <div key={ph.label} className="rounded-lg overflow-hidden bg-gray-100 aspect-video relative">
                    {ph.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ph.url} alt={ph.label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon size={22} />
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                      {ph.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <form onSubmit={save} className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingId ? 'Modifier l’amélioration' : 'Nouvelle amélioration'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Titre *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Établissement</label>
              <select
                value={form.establishment_id}
                onChange={(e) => setForm({ ...form, establishment_id: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">— Aucun —</option>
                {establishments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">URL photo « Avant »</label>
              <input
                value={form.before_photo_url}
                onChange={(e) => setForm({ ...form, before_photo_url: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">URL photo « Après »</label>
              <input
                value={form.after_photo_url}
                onChange={(e) => setForm({ ...form, after_photo_url: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
                Annuler
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-brand text-white hover:bg-brand-dark disabled:opacity-60">
                {saving ? 'Enregistrement…' : 'Publier'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
