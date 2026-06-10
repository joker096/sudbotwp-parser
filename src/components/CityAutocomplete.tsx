import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapPin, X, ChevronDown, Loader2 } from 'lucide-react';
import { russianCities } from '../data/russianCities';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Simple fuzzy search - matches if all query chars appear in order
function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const t = text;
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let ti = 0;
  let qi = 0;
  let currentRun = '';
  
  while (ti < t.length && qi < q.length) {
    if (t[ti].toLowerCase() === q[qi]) {
      if (currentRun) {
        parts.push(currentRun);
        currentRun = '';
      }
      parts.push(<strong key={ti} className="text-accent">{t[ti]}</strong>);
      qi++;
    } else {
      currentRun += t[ti];
    }
    ti++;
  }
  
  if (ti < t.length) {
    currentRun += t.slice(ti);
  }
  if (currentRun) {
    parts.push(currentRun);
  }
  
  return parts.length > 0 ? parts : text;
}

export default function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Начните вводить город...',
  className = '',
  disabled = false,
}: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query with external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Filter cities
  const filteredCities = useMemo(() => {
    if (!query.trim()) return russianCities.slice(0, 20); // Show popular cities when empty
    const q = query.trim();
    return russianCities.filter(city => fuzzyMatch(city, q)).slice(0, 20);
  }, [query]);

  // Reset active index when filtered changes
  useEffect(() => {
    setActiveIndex(0);
  }, [filteredCities.length]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((city: string) => {
    setQuery(city);
    onChange(city);
    setIsOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredCities.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredCities.length) % filteredCities.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCities[activeIndex]) {
          handleSelect(filteredCities[activeIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, filteredCities, activeIndex, handleSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    // Only call onChange when user clears or when they explicitly select
    if (val === '') {
      onChange('');
    }
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  // Scroll active item into view
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  
  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="city-listbox"
          aria-activedescendant={isOpen && filteredCities[activeIndex] ? `city-option-${activeIndex}` : undefined}
          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-12 pr-10 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-accent/20 transition-all"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all"
              aria-label="Очистить"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          id="city-listbox"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto scrollbar-thin"
        >
          {filteredCities.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
              Город не найден
            </li>
          ) : (
            filteredCities.map((city, index) => (
              <li
                key={city}
                ref={el => { itemRefs.current[index] = el; }}
                id={`city-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onClick={() => handleSelect(city)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-all flex items-center gap-2 ${
                  index === activeIndex
                    ? 'bg-accent/10 text-accent dark:bg-accent/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <MapPin className="w-4 h-4 shrink-0 opacity-50" />
                <span>{highlightMatch(city, query)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
