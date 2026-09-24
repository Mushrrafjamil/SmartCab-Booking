'use client';

import { useEffect, useState } from 'react';
import { addressService } from '@/services';
import { toast } from '@/components/auth/Toast';
import { Search, MapPin } from 'lucide-react';

interface AddressSearchProps {
  onSelect: (result: {
    fullAddress: string;
    lat: number;
    lng: number;
    houseFlatNumber?: string;
    streetName?: string;
    areaLocality?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  }) => void;
  placeholder?: string;
}

export default function AddressSearch({ onSelect, placeholder = 'Search address...' }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{
    fullAddress: string; lat: number; lng: number;
    houseFlatNumber?: string; streetName?: string; areaLocality?: string;
    city?: string; state?: string; country?: string; pincode?: string;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await addressService.search(query);
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      {(results.length > 0 || loading) && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading && <p className="px-4 py-3 text-sm text-slate-500">Searching...</p>}
          {results.map((r: { fullAddress: string; lat: number; lng: number; city?: string }, i: number) => (
            <button
              key={i}
              type="button"
              onClick={() => { onSelect(r); setQuery(r.fullAddress); setResults([]); }}
              className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm hover:bg-amber-50"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>{r.fullAddress}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
