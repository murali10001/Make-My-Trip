import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Check } from "lucide-react";

export function SearchSelect({
  options = [],
  placeholder,
  value,
  onChange,
  icon,
  subtitle,
  isLoading = false,
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredOptions = (options || []).filter((option: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();
    const label = (option?.label || '').toLowerCase();
    const val = (option?.value || '').toLowerCase();
    return label.includes(term) || val.includes(term);
  });

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className={`border rounded-xl p-3 bg-white transition-all cursor-pointer ${
          isOpen ? 'border-blue-600 ring-2 ring-blue-100 shadow-sm' : 'border-slate-200 hover:border-blue-400'
        }`}
        onClick={() => {
          setIsOpen(true);
          if (inputRef.current) inputRef.current.focus();
        }}
      >
        <div className="flex items-center space-x-2">
          {icon}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">{placeholder}</div>
            <div className="flex items-center justify-between">
              <input
                ref={inputRef}
                type="text"
                value={isOpen ? (searchTerm !== '' ? searchTerm : (value || '')) : (value || '')}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (!isOpen) setIsOpen(true);
                }}
                onFocus={() => {
                  setIsOpen(true);
                }}
                className="font-bold text-slate-900 text-sm w-full bg-transparent border-none p-0 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                placeholder={placeholder}
              />
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                  title="Clear selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">{subtitle}</div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 duration-150">
          <ScrollArea className="max-h-64">
            <div className="p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option: any, idx: number) => {
                  const isSelected = option.value === value || option.label === value;
                  return (
                    <button
                      key={`${option.value}-${idx}`}
                      type="button"
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                      onClick={() => handleSelect(option.value)}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 ml-2" />}
                    </button>
                  );
                })
              ) : isLoading && !searchTerm.trim() ? (
                <div className="p-4 flex items-center justify-center space-x-2 text-xs text-slate-500">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span>Loading destinations...</span>
                </div>
              ) : searchTerm.trim() ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No cities found matching "{searchTerm.trim()}"
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  No destinations available
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
