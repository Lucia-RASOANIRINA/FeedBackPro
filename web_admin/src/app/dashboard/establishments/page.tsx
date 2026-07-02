'use client';

import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Pencil, Trash2, X } from 'lucide-react';

type Establishment = {
  id: string;
  name: string;
  sector_id: string;
  address: string | null;
  qr_code: string | null;
};

// Secteurs alignés sur l'app mobile (lib/core/constants/sectors.dart).
const SECTORS: { id: string; label: string }[] = [
  { id: 'health', label: 'Santé' },
  { id: 'education', label: 'Éducation' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'public_admin', label: 'Administration' },
  { id: 'hospitality', label: 'Restauration' },
  { id: 'transport', label: 'Transport' },
];

const emptyForm = { name: '', sector_id: 'health', address: '', qr_code: '' };

export default function EstablishmentsPage() {
  const [rows, setRows] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error: e } = await supabase
      .from('establishments')
      .select('id, name, sector_id, address, qr_code')
      .order('name');
    if (e) setError(e.message);
    else {
      setError(null);
      setRows((data as Establishment[]) ?? []);
    }
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

  function openEdit(e: Establishment) {
    setEditingId(e.id);
    setForm({
      name: e.name,
      sector_id: e.sector_id,
      address: e.address ?? '',
      qr_code: e.qr_code ?? '',
    });
    setShowForm(true);
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      sector_id: form.sector_id,
      address: form.address.trim() || null,
      qr_code: form.qr_code.trim() || null,
    };
    const { error: e } = editingId
      ? await supabase.from('establishments').update(payload).eq('id', editingId)
      : await supabase.from('establishments').insert(payload);
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cet établissement ?')) return;
    const supabase = createClient();
    const { error: e } = await supabase.from('establishments').delete().eq('id', id);
    if (e) setError(e.message);
    else setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const sectorLabel = (id: string) => SECTORS.find((s) => s.id === id)?.label || id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Établissements</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand text-white px-3 py-2 rounded-lg text-sm hover:bg-brand-dark"
        >
          <Plus size={16} /> Ajouter
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
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Nom</th>
                  <th className="p-3">Secteur</th>
                  <th className="p-3">Adresse</th>
                  <th className="p-3">QR</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{e.name}</td>
                    <td className="p-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        {sectorLabel(e.sector_id)}
                      </span>
                    </td>
                    <td className="p-3">{e.address ?? '—'}</td>
                    <td className="p-3">{e.qr_code ?? '—'}</td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(e)} title="Modifier" className="text-gray-400 hover:text-brand">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => remove(e.id)} title="Supprimer" className="text-gray-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="p-8 text-center text-gray-400" colSpan={5}>
                      <Building2 size={40} className="mx-auto mb-2 opacity-50" />
                      Aucun établissement. Cliquez sur « Ajouter ».
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Formulaire (modale) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <form
            onSubmit={save}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingId ? 'Modifier l’établissement' : 'Nouvel établissement'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Nom *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Secteur</label>
              <select
                value={form.sector_id}
                onChange={(e) => setForm({ ...form, sector_id: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {SECTORS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Adresse</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Code QR (slug unique)</label>
              <input
                value={form.qr_code}
                onChange={(e) => setForm({ ...form, qr_code: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm bg-brand text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
