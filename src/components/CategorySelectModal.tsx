import React, { useState, useMemo } from 'react';
import { X, Search, Sparkles, Tag, Plus, Check } from 'lucide-react';

interface CategorySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'Ingreso' | 'Gasto';
  selectedCategory: string;
  onSelectCategory: (categoria: string) => void;
  allCategories: { nombre: string; color?: string }[];
  frequentCategories?: { nombre: string; color?: string }[];
  onAddNewCategory?: (nombre: string) => void;
}

export const CategorySelectModal: React.FC<CategorySelectModalProps> = ({
  isOpen,
  onClose,
  tipo,
  selectedCategory,
  onSelectCategory,
  allCategories,
  frequentCategories = [],
  onAddNewCategory
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Take top 4 suggestions strictly as requested (Diésel, Peajes, Viáticos, Mantenimiento para gastos; Fletes, Encomiendas, Giros, Otros para ingresos)
  const top4Suggestions = useMemo(() => {
    const defaultPriority = tipo === 'Gasto'
      ? [
          { nombre: 'Combustible (Diésel)', color: '#d97706' },
          { nombre: 'Peajes y Balanzas', color: '#1d4ed8' },
          { nombre: 'Viáticos y Alimentación', color: '#16a34a' },
          { nombre: 'Mantenimiento y Taller', color: '#9333ea' }
        ]
      : [
          { nombre: 'Cobro de Fletes', color: '#16a34a' },
          { nombre: 'Encomiendas y Paquetería', color: '#1d4ed8' },
          { nombre: 'Giros y Remesas', color: '#0284c7' },
          { nombre: 'Otros Ingresos', color: '#6366f1' }
        ];

    const result: { nombre: string; color?: string }[] = [];
    const seen = new Set<string>();

    // 1. Prioritize matching catalog categories for the 4 key concepts
    defaultPriority.forEach(def => {
      const match = allCategories.find(c => {
        const cn = c.nombre.toLowerCase().trim();
        const dn = def.nombre.toLowerCase().trim();
        return cn === dn || cn.includes(dn.split(' ')[0].toLowerCase()) || dn.includes(cn);
      });
      const chosen = match || def;
      const key = chosen.nombre.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(chosen);
      }
    });

    // 2. If still < 4, fill with frequentCategories or allCategories
    for (const c of [...frequentCategories, ...allCategories]) {
      if (result.length >= 4) break;
      const key = c.nombre.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(c);
      }
    }

    return result.slice(0, 4);
  }, [tipo, frequentCategories, allCategories]);

  // Filtered full list
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return allCategories;
    const q = searchTerm.toLowerCase().trim();
    return allCategories.filter(c => c.nombre.toLowerCase().includes(q));
  }, [allCategories, searchTerm]);

  if (!isOpen) return null;

  const handleSelect = (catName: string) => {
    onSelectCategory(catName);
    onClose();
  };

  const handleCreate = () => {
    const clean = newCatName.trim() || searchTerm.trim();
    if (!clean) return;
    if (onAddNewCategory) {
      onAddNewCategory(clean);
    }
    onSelectCategory(clean);
    setNewCatName('');
    setIsCreating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-md rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden my-0 sm:my-4 flex flex-col max-h-[88vh] sm:max-h-[85vh]">
        {/* Header Fijo */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8fafc] border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              tipo === 'Ingreso' ? 'bg-emerald-50 text-[#16a34a]' : 'bg-rose-50 text-[#dc2626]'
            }`}>
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Categoría de {tipo === 'Ingreso' ? 'Ingreso' : 'Gasto'}
              </h3>
              <p className="text-[11px] text-[#64748b]">
                Selecciona una tarjeta rápida o busca en catálogo
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* SECCIÓN 1: ACCESOS RÁPIDOS / SUGERENCIAS (TOP 4 COMO TARJETAS) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1d4ed8]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Accesos Rápidos Recomendados (Top 4):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {top4Suggestions.map((cat, idx) => {
                const isSelected = selectedCategory === cat.nombre;
                return (
                  <button
                    key={`${cat.nombre}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(cat.nombre)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 min-h-[46px] transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#eff6ff] text-[#1d4ed8] border-[#1d4ed8] shadow-sm ring-1 ring-[#1d4ed8]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-[#e2e8f0]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                        style={{ backgroundColor: cat.color || (tipo === 'Ingreso' ? '#16a34a' : '#dc2626') }}
                      />
                      <span className="truncate">{cat.nombre}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 shrink-0 text-[#1d4ed8]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN 2: BUSCADOR EN TIEMPO REAL */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
              Buscar en Catálogo Completo:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar concepto de ${tipo.toLowerCase()}...`}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[44px]"
                autoFocus
              />
            </div>
          </div>

          {/* SECCIÓN 3: LISTA COMPLETA DE CATEGORÍAS */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[#64748b] block">
              Todas las Categorías ({filteredList.length}):
            </span>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1 divide-y divide-[#f1f5f9] border border-[#e2e8f0] rounded-xl p-1 bg-white">
              {filteredList.map((cat, idx) => {
                const isSelected = selectedCategory === cat.nombre;
                return (
                  <button
                    key={`${cat.nombre}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(cat.nombre)}
                    className={`w-full p-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-colors min-h-[40px] ${
                      isSelected
                        ? 'bg-[#eff6ff] text-[#1d4ed8] font-bold border border-blue-200'
                        : 'text-slate-700 hover:bg-[#f8fafc]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: cat.color || (tipo === 'Ingreso' ? '#16a34a' : '#dc2626') }} 
                      />
                      <span className="truncate">{cat.nombre}</span>
                    </div>
                    {isSelected ? (
                      <span className="text-[10px] text-[#1d4ed8] font-bold bg-blue-100/60 px-2 py-0.5 rounded">Seleccionado</span>
                    ) : null}
                  </button>
                );
              })}

              {filteredList.length === 0 && (
                <div className="py-5 text-center text-slate-500 text-xs space-y-2">
                  <p>No se encontraron categorías para "{searchTerm}".</p>
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl font-bold text-xs shadow min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear "{searchTerm}" y seleccionar</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Opción rápida para añadir nueva categoría */}
          <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between">
            {!isCreating ? (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="text-xs text-[#1d4ed8] hover:text-[#1e40af] font-bold flex items-center gap-1.5 py-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Crear nueva categoría personalizada</span>
              </button>
            ) : (
              <div className="w-full flex items-center gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nombre de categoría..."
                  className="flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[40px]"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  className="px-3.5 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold rounded-xl text-xs min-h-[40px]"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs px-2"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
