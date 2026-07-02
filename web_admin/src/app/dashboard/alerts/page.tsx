'use client';

import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Check, CheckCheck } from 'lucide-react';

type Alert = {
  id: string;
  level: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

/** Alertes intelligentes (feedbacks critiques / notes très basses). */
export default function AlertsPage() {
  const [rows, setRows] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error: e } = await supabase
      .from('alerts')
      .select('id, level, message, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (e) setError(e.message);
    else {
      setError(null);
      setRows((data as Alert[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string, is_read: boolean) {
    const supabase = createClient();
    const { error: e } = await supabase.from('alerts').update({ is_read }).eq('id', id);
    if (e) setError(e.message);
    else setRows((prev) => prev.map((a) => (a.id === id ? { ...a, is_read } : a)));
  }

  async function markAllRead() {
    const supabase = createClient();
    const { error: e } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('is_read', false);
    if (e) setError(e.message);
    else setRows((prev) => prev.map((a) => ({ ...a, is_read: true })));
  }

  const color = (lvl: string) =>
    lvl === 'critical'
      ? 'bg-red-100 text-red-700'
      : lvl === 'warning'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-blue-100 text-blue-700';

  const visible = showUnreadOnly ? rows.filter((a) => !a.is_read) : rows;
  const unread = rows.filter((a) => !a.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          Alertes
          {unread > 0 && (
            <span className="text-xs bg-red-600 text-white rounded-full px-2 py-0.5">{unread}</span>
          )}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUnreadOnly((v) => !v)}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            {showUnreadOnly ? <Bell size={16} /> : <BellOff size={16} />}
            {showUnreadOnly ? 'Toutes' : 'Non lues'}
          </button>
          <button
            onClick={markAllRead}
            disabled={unread === 0}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
          >
            <CheckCheck size={16} /> Tout marquer lu
          </button>
        </div>
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
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Aucune alerte.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${
                a.is_read ? 'opacity-60' : ''
              }`}
            >
              <span className={`px-2 py-1 rounded text-xs font-medium ${color(a.level)}`}>
                {a.level}
              </span>
              <span className="flex-1">{a.message}</span>
              <span className="text-xs text-gray-400 hidden sm:block whitespace-nowrap">
                {new Date(a.created_at).toLocaleString('fr-FR')}
              </span>
              <button
                onClick={() => markRead(a.id, !a.is_read)}
                title={a.is_read ? 'Marquer non lue' : 'Marquer lue'}
                className={a.is_read ? 'text-gray-300 hover:text-gray-500' : 'text-brand hover:text-brand-dark'}
              >
                <Check size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
