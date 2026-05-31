import React, { useEffect, useMemo, useState } from 'react';
import { resolveMediaUrl } from '@/shared/utils/mediaUrl';

type TeacherRow = {
  id: string;
  name: string;
  designation?: string | null;
  department?: string | null;
  avatar_url?: string | null;
};

type Props = {
  value: string;
  onChange: (name: string) => void;
  onSelect?: (teacher: TeacherRow) => void;
  placeholder?: string;
  required?: boolean;
  allowCustom?: boolean;
};

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function TeacherAvatar({ name, url }: { name: string; url?: string | null }) {
  const [failed, setFailed] = useState(false);
  const src = url ? resolveMediaUrl(url) : '';
  if (!src || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400 font-black">
        {name?.charAt(0) || '?'}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover"
    />
  );
}

export default function TeacherDirectorySelect({
  value,
  onChange,
  onSelect,
  placeholder = 'Search teacher name…',
  required = false,
  allowCustom = false,
}: Props) {
  const [allTeachers, setAllTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');

  useEffect(() => setQuery(value || ''), [value]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${API_BASE}/teachers`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setAllTeachers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!alive) return;
        setAllTeachers([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTeachers.slice(0, 20);
    return allTeachers
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [allTeachers, query]);

  return (
    <div className="relative">
      <input
        type="text"
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold dark:text-white text-sm"
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          if (allowCustom) onChange(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // allow click selection before closing
          setTimeout(() => setOpen(false), 120);
        }}
      />

      {open && (
        <div className="absolute z-[100] left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden max-h-[260px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <p className="text-xs font-bold text-slate-400">Loading teachers…</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="p-2 space-y-1">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => {
                    onChange(t.name);
                    onSelect?.(t);
                    setQuery(t.name);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                    <TeacherAvatar name={t.name} url={t.avatar_url} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 dark:text-white truncate">{t.name}</p>
                    <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 truncate">
                      {t.department || '—'}{t.designation ? ` • ${t.designation}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs font-bold text-slate-400">No teachers found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

