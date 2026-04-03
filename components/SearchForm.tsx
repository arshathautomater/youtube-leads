'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { Search, X, Plus } from 'lucide-react';
import type { Keyword } from '@/lib/types';

interface Props {
  onSearch: (keywords: string[]) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: Props) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);

  // Load persisted keywords on mount
  useEffect(() => {
    fetch('/api/keywords')
      .then((r) => r.json())
      .then((d) => {
        setKeywords(d.keywords ?? []);
      });
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function addKeyword() {
    const text = custom.trim();
    if (!text) return;
    setSaving(true);
    const res = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (res.ok && data.keyword) {
      setKeywords((prev) => [...prev, data.keyword]);
      setSelected((prev) => new Set([...prev, data.keyword.id]));
    }
    setCustom('');
    setSaving(false);
  }

  async function removeKeyword(kw: Keyword) {
    await fetch(`/api/keywords/${kw.id}`, { method: 'DELETE' });
    setKeywords((prev) => prev.filter((k) => k.id !== kw.id));
    setSelected((prev) => { const n = new Set(prev); n.delete(kw.id); return n; });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') addKeyword();
  }

  const savedTexts = keywords.filter((k) => selected.has(k.id)).map((k) => k.text);
  const customTexts = custom.trim()
    ? custom.split(',').map((t) => t.trim()).filter(Boolean)
    : [];
  const activeTexts = [...new Set([...savedTexts, ...customTexts])];

  return (
    <div className="flex flex-col gap-4">
      {/* Keyword chips */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <div key={kw.id}
              className={`flex items-center gap-1 rounded-full text-sm font-medium transition-colors ${
                selected.has(kw.id)
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-800 text-neutral-400'
              }`}>
              <button
                onClick={() => toggleSelect(kw.id)}
                className="pl-3 pr-1 py-1.5 cursor-pointer"
              >
                {kw.text}
              </button>
              <button
                onClick={() => removeKeyword(kw)}
                className={`pr-2 py-1.5 cursor-pointer ${
                  selected.has(kw.id) ? 'text-red-200 hover:text-white' : 'text-neutral-600 hover:text-neutral-300'
                }`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input + Search */}
      <div className="flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
          <Plus className="h-4 w-4 text-neutral-500 shrink-0" />
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. pasta, cooking, italian — separate tags with commas…"
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-600 outline-none"
          />
          {custom && (
            <button
              onClick={addKeyword}
              disabled={saving}
              className="text-xs text-neutral-400 hover:text-white disabled:opacity-50"
            >
              Add
            </button>
          )}
        </div>

        <button
          onClick={() => onSearch(activeTexts)}
          disabled={loading || activeTexts.length === 0}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Search className="h-4 w-4" />
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {keywords.length === 0 && (
        <p className="text-xs text-neutral-600">Type a keyword above and press Enter to add it. Selected keywords are searched.</p>
      )}
    </div>
  );
}
