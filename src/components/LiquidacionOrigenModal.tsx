import React, { useState, useMemo } from 'react';
import {
  Building2,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Percent,
  Receipt,
  Upload,
  Calendar,
  X
} from 'lucide-react';
import {
  ManifiestoDestino,
  ManifiestoOrigen,
  CategoriaFinanciera,
  Catalogos
} from '../types';

interface LiquidacionOrigenModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifiestosDestino: ManifiestoDestino[];
  manifiestosOrigen?: ManifiestoOrigen[];
  catalogos: Catalogos;
  categorias?: CategoriaFinanciera[];
  cajasDisponibles: string[];
  onLiquidar: (payload: {
    tipo: 'ORIGEN';
    agencia: string;
    subManifiestosIds: string[];
    montoBruto: number;
    deducciones: Array<{ categoria: string; montoBs: number; detalle?: string; porcentaje?: number }>;
    totalDeducciones: number;
    montoNeto: number;
    cuentaDestino: string;
    fecha?: string;
    nroComprobante?: string;
    comprobanteFotoUrl?: string;
    notas?: string;
    idViaje?: string;
  }) => Promise<void>;
  onAddCategoria?: (cat: Omit<CategoriaFinanciera, 'id'>) => void;
}

interface DeduccionItem {
  id: string;
  categoria: string;
  montoBs: number;
  detalle: string;
  esPorcentaje?: boolean;
  porcentajeVal?: number;
}

export const LiquidacionOrigenModal: React.FC<LiquidacionOrigenModalProps> = ({
  isOpen,
  onClose,
  manifiestosDestino,
  manifiestosOrigen = [],
  catalogos,
  categorias = [],
  cajasDisponibles,
  onLiquidar,
  onAddCategoria
}) => {
  // Paso A: Filtros
  const sucursalesOrigen = useMemo(() => {
    return catalogos.sucursales || ['Oruro', 'La Paz', 'Santa Cruz', 'Cochabamba', 'Tarija', 'Potosí'];
  }, [catalogos.sucursales]);

  const [selectedAgencia, setSelectedAgencia] = useState<string>(sucursalesOrigen[0] || 'Oruro');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [filtroViajeMIC, setFiltroViajeMIC] = useState<string>('Todos');

  // Paso B: Selección de Encomiendas / Cargas
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);

  // Paso C: Deducciones y Descuentos
  const [comisionPct, setComisionPct] = useState<number>(10);
  const [estibadoresBs, setEstibadoresBs] = useState<number>(0);
  const [otrasDeducciones, setOtrasDeducciones] = useState<DeduccionItem[]>([]);

  // Nueva categoría modal/inline
  const [showNewCatInput, setShowNewCatInput] = useState<boolean>(false);
  const [newCatNombre, setNewCatNombre] = useState<string>('');

  // Paso E: Cierre y Rendición
  const [cuentaDestino, setCuentaDestino] = useState<string>(cajasDisponibles[0] || 'Caja Oficina Central');
  const [fechaRendicion, setFechaRendicion] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nroComprobante, setNroComprobante] = useState<string>('');
  const [comprobanteFoto, setComprobanteFoto] = useState<string>('');
  const [notasLiquidacion, setNotasLiquidacion] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sub-manifiestos cobrados en origen pendientes de liquidación a central
  const subManifiestosOrigen = useMemo(() => {
    return manifiestosDestino.filter(s => {
      const matchAgencia = s.origenViaje?.toLowerCase().trim() === selectedAgencia.toLowerCase().trim() ||
        s.cuentaAfectadaOrigen?.toLowerCase().includes(selectedAgencia.toLowerCase().trim());
      const tienePagoOrigen = (s.pagadoOrigenBs || 0) > 0;
      const pendienteLiq = s.estadoLiquidacionAgencia !== 'Liquidado a Central';
      
      let matchViaje = true;
      if (filtroViajeMIC !== 'Todos') {
        matchViaje = s.idViaje === filtroViajeMIC || s.nroManifiesto?.includes(filtroViajeMIC);
      }

      return matchAgencia && tienePagoOrigen && pendienteLiq && matchViaje;
    });
  }, [manifiestosDestino, selectedAgencia, filtroViajeMIC]);

  // Inicializar seleccionados cuando cambia la agencia
  React.useEffect(() => {
    setSelectedSubIds(subManifiestosOrigen.map(s => s.idSubManifiesto));
  }, [subManifiestosOrigen]);

  const toggleSelectSub = (id: string) => {
    setSelectedSubIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSubIds.length === subManifiestosOrigen.length) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(subManifiestosOrigen.map(s => s.idSubManifiesto));
    }
  };

  // Cálculo de Paso B: Monto Bruto Retenido
  const montoBrutoCobrado = useMemo(() => {
    return subManifiestosOrigen
      .filter(s => selectedSubIds.includes(s.idSubManifiesto))
      .reduce((sum, s) => sum + (s.pagadoOrigenBs || 0), 0);
  }, [subManifiestosOrigen, selectedSubIds]);

  // Cálculo de Paso C: Deducciones
  const comisionMontoBs = useMemo(() => {
    return (montoBrutoCobrado * (comisionPct || 0)) / 100;
  }, [montoBrutoCobrado, comisionPct]);

  const totalOtrasDeduccionesBs = useMemo(() => {
    return otrasDeducciones.reduce((sum, d) => sum + (Number(d.montoBs) || 0), 0);
  }, [otrasDeducciones]);

  const totalGastosDeducidos = useMemo(() => {
    return comisionMontoBs + (Number(estibadoresBs) || 0) + totalOtrasDeduccionesBs;
  }, [comisionMontoBs, estibadoresBs, totalOtrasDeduccionesBs]);

  // Paso D: Monto Neto
  const montoNetoLiquidacion = useMemo(() => {
    return Math.max(0, montoBrutoCobrado - totalGastosDeducidos);
  }, [montoBrutoCobrado, totalGastosDeducidos]);

  // Agregar otra deducción
  const handleAddOtraDeduccion = () => {
    const catsGasto = categorias.filter(c => c.tipo === 'Gasto');
    const defaultCat = catsGasto[0]?.nombre || 'Gastos Operativos Agencia';
    const nueva: DeduccionItem = {
      id: `ded-${Date.now()}`,
      categoria: defaultCat,
      montoBs: 0,
      detalle: ''
    };
    setOtrasDeducciones([...otrasDeducciones, nueva]);
  };

  const handleUpdateOtraDeduccion = (id: string, field: keyof DeduccionItem, value: any) => {
    setOtrasDeducciones(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleRemoveOtraDeduccion = (id: string) => {
    setOtrasDeducciones(prev => prev.filter(d => d.id !== id));
  };

  // Crear categoría al vuelo
  const handleCreateCategoria = () => {
    if (!newCatNombre.trim() || !onAddCategoria) return;
    onAddCategoria({
      nombre: newCatNombre.trim(),
      tipo: 'Gasto',
      icono: 'Tag',
      color: 'slate'
    });
    setNewCatNombre('');
    setShowNewCatInput(false);
  };

  // Subida de comprobante
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setComprobanteFoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Enviar liquidación
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedSubIds.length === 0) {
      setErrorMsg('Debe seleccionar al menos una carga o flete cobrado en origen para liquidar.');
      return;
    }

    if (!cuentaDestino) {
      setErrorMsg('Seleccione la cuenta o caja donde ingresará el depósito neto.');
      return;
    }

    setIsSubmitting(true);
    try {
      const listaDeducciones: Array<{ categoria: string; montoBs: number; detalle?: string; porcentaje?: number }> = [];

      if (comisionMontoBs > 0) {
        listaDeducciones.push({
          categoria: 'Comisiones y Fleteros Locales',
          montoBs: comisionMontoBs,
          porcentaje: comisionPct,
          detalle: `Comisión por cargas en origen (${comisionPct}%)`
        });
      }

      if (estibadoresBs > 0) {
        listaDeducciones.push({
          categoria: 'Cargadores y Estibadores',
          montoBs: estibadoresBs,
          detalle: 'Servicio de cargadores / estibadores en origen'
        });
      }

      otrasDeducciones.forEach(d => {
        if (d.montoBs > 0) {
          listaDeducciones.push({
            categoria: d.categoria,
            montoBs: Number(d.montoBs),
            detalle: d.detalle || `Deducción por ${d.categoria}`
          });
        }
      });

      await onLiquidar({
        tipo: 'ORIGEN',
        agencia: selectedAgencia,
        subManifiestosIds: selectedSubIds,
        montoBruto: montoBrutoCobrado,
        deducciones: listaDeducciones,
        totalDeducciones: totalGastosDeducidos,
        montoNeto: montoNetoLiquidacion,
        cuentaDestino,
        fecha: fechaRendicion,
        nroComprobante,
        comprobanteFotoUrl: comprobanteFoto || undefined,
        notas: notasLiquidacion
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar liquidación de origen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Cobranzas Origen Liquidación</h3>
              <p className="text-xs text-blue-200">
                Rendición de fletes cobrados en origen por agencia con retención de comisiones y gastos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario con Pasos Scrollable */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PASO A: Selector de Agencia de Origen y Filtros */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">A</span>
                1. Selección de Sucursal / Agencia de Origen y Periodo
              </label>
              <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Paso Obligatorio
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Agencia de Origen *
                </label>
                <select
                  value={selectedAgencia}
                  onChange={(e) => setSelectedAgencia(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 min-h-[42px]"
                >
                  {sucursalesOrigen.map((suc) => (
                    <option key={suc} value={suc}>{suc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Filtrar por MIC / Viaje
                </label>
                <select
                  value={filtroViajeMIC}
                  onChange={(e) => setFiltroViajeMIC(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 min-h-[42px]"
                >
                  <option value="Todos">-- Todos los Viajes / MICs --</option>
                  {manifiestosOrigen.map((m) => (
                    <option key={m.idManifiesto} value={m.nroManifiestoMIC}>
                      {m.nroManifiestoMIC} ({m.idViajeAsignado})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Fecha Rendición
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={fechaRendicion}
                    onChange={(e) => setFechaRendicion(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 min-h-[42px]"
                    required
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* PASO B: Resumen de Fletes Cobrados en Origen */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">B</span>
                2. Fletes Cobrados en Origen por {selectedAgencia}
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline"
                >
                  {selectedSubIds.length === subManifiestosOrigen.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </button>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {selectedSubIds.length} de {subManifiestosOrigen.length} seleccionados
                </span>
              </div>
            </div>

            {subManifiestosOrigen.length === 0 ? (
              <div className="p-5 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No existen fletes cobrados en origen pendientes de liquidación para la agencia {selectedAgencia}.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100/90 text-slate-600 border-b border-slate-200 uppercase font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-center w-8">
                        <input
                          type="checkbox"
                          checked={selectedSubIds.length === subManifiestosOrigen.length && subManifiestosOrigen.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="py-2 px-3 text-left">Manifiesto MIC</th>
                      <th className="py-2 px-3 text-left">Destino</th>
                      <th className="py-2 px-3 text-left">Destinatario</th>
                      <th className="py-2 px-3 text-right">Cobrado en Origen (Bs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subManifiestosOrigen.map((sub) => {
                      const isChecked = selectedSubIds.includes(sub.idSubManifiesto);
                      return (
                        <tr
                          key={sub.idSubManifiesto}
                          onClick={() => toggleSelectSub(sub.idSubManifiesto)}
                          className={`cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                        >
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectSub(sub.idSubManifiesto)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-800 text-left">{sub.nroManifiesto}</td>
                          <td className="py-2 px-3 text-slate-700 text-left">{sub.sucursalDestino}</td>
                          <td className="py-2 px-3 text-slate-800 font-medium text-left truncate max-w-[160px]">{sub.destinatario || 'Cliente General'}</td>
                          <td className="py-2 px-3 text-right font-black tabular-nums text-emerald-700">
                            Bs {Number(sub.pagadoOrigenBs).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Bruto */}
            <div className="flex justify-between items-center bg-blue-50/80 p-3 rounded-xl border border-blue-200">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Total Bruto Retenido por Agencia {selectedAgencia}:
              </span>
              <span className="text-base font-black text-blue-950 tabular-nums">
                Bs {montoBrutoCobrado.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* PASO C: Panel dinámico de Descuentos y Deducciones de Agencia */}
          <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">C</span>
                3. Descuentos y Deducciones de Agencia (Gastos Retenidos)
              </label>
              <button
                type="button"
                onClick={handleAddOtraDeduccion}
                className="text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-300 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar Otro Concepto de Gasto</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1) Comisión por Cargas (%) */}
              <div className="bg-white p-3.5 rounded-xl border border-amber-300 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-amber-600" />
                    1) Comisión por Cargas (%)
                  </span>
                  <span className="text-[10px] text-slate-500">Calculado sobre el Bruto</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-28 shrink-0">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={comisionPct}
                      onChange={(e) => setComisionPct(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 pr-6 min-h-[38px]"
                    />
                    <span className="absolute right-2 top-2 text-slate-500 font-bold text-xs">%</span>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-[10px] text-slate-500 block">Monto Comisión:</span>
                    <span className="font-black text-rose-600 text-sm tabular-nums">
                      - Bs {comisionMontoBs.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2) Servicio de Cargadores / Estibadores */}
              <div className="bg-white p-3.5 rounded-xl border border-amber-300 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-xs">
                    2) Cargadores / Estibadores (Bs.)
                  </span>
                  <span className="text-[10px] text-slate-500">Monto fijo variable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={estibadoresBs}
                      onChange={(e) => setEstibadoresBs(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 min-h-[38px]"
                    />
                  </div>
                  <div className="shrink-0 text-right w-28">
                    <span className="text-[10px] text-slate-500 block">Deducción:</span>
                    <span className="font-black text-rose-600 text-sm tabular-nums">
                      - Bs {Number(estibadoresBs || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3) Otras Deducciones dinámicas */}
            {otrasDeducciones.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-amber-200">
                <span className="text-[11px] font-bold text-amber-900 block">Otros Gastos y Deducciones Retenidos:</span>
                {otrasDeducciones.map((item) => (
                  <div key={item.id} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <select
                      value={item.categoria}
                      onChange={(e) => handleUpdateOtraDeduccion(item.id, 'categoria', e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 flex-1 min-w-[140px]"
                    >
                      {categorias.filter(c => c.tipo === 'Gasto').map((cat) => (
                        <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Detalle o nota (ej. Boleta #12)"
                      value={item.detalle}
                      onChange={(e) => handleUpdateOtraDeduccion(item.id, 'detalle', e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 flex-1 min-w-[120px]"
                    />

                    <div className="w-28 shrink-0">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="Monto Bs."
                        value={item.montoBs || ''}
                        onChange={(e) => handleUpdateOtraDeduccion(item.id, 'montoBs', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 text-right"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveOtraDeduccion(item.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar línea"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Crear categoría al vuelo */}
            <div className="pt-1">
              {!showNewCatInput ? (
                <button
                  type="button"
                  onClick={() => setShowNewCatInput(true)}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline"
                >
                  + ¿No encuentra la categoría de gasto? Crear nueva categoría aquí
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-blue-200">
                  <input
                    type="text"
                    placeholder="Nombre nueva categoría de gasto (ej. Viáticos de Agencia)"
                    value={newCatNombre}
                    onChange={(e) => setNewCatNombre(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategoria}
                    className="bg-blue-600 text-white font-bold px-3 py-1 rounded-lg text-xs"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewCatInput(false)}
                    className="text-slate-500 hover:text-slate-700 px-2 py-1 text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PASO D: Resultado de Liquidación */}
          <div className="bg-blue-50/70 border border-blue-200/90 text-slate-900 p-4 sm:p-5 rounded-2xl space-y-3 shadow-sm">
            <span className="text-xs uppercase font-extrabold tracking-wider text-blue-900 block flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-[10px] font-bold">D</span>
              4. Resumen Contable de Liquidación
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white border border-blue-200/70 p-3.5 rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 block">Total Cobrado Bruto en Origen:</span>
                <span className="text-base sm:text-lg font-black text-blue-900 tabular-nums">
                  Bs {montoBrutoCobrado.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-white border border-rose-200/70 p-3.5 rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 block">(-) Deducciones y Gastos:</span>
                <span className="text-base sm:text-lg font-black text-rose-600 tabular-nums">
                  - Bs {totalGastosDeducidos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border border-emerald-500/40 p-3.5 rounded-xl shadow-sm">
                <span className="text-[11px] text-emerald-100 font-bold block">(=) IMPORTE NETO A DEPOSITAR:</span>
                <span className="text-lg sm:text-xl font-black text-white tabular-nums">
                  Bs {montoNetoLiquidacion.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* PASO E: Cierre y Rendición */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">E</span>
              5. Cierre y Depósito a Cuenta Central
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Cuenta / Caja Destino del Depósito (Arqueo_Cajas) *
                </label>
                <select
                  value={cuentaDestino}
                  onChange={(e) => setCuentaDestino(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 min-h-[42px] focus:ring-2 focus:ring-blue-600"
                  required
                >
                  {cajasDisponibles.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  El saldo neto (Bs. {montoNetoLiquidacion.toFixed(2)}) ingresará directamente a esta caja.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Nro. Comprobante / Boleta de Depósito
                </label>
                <input
                  type="text"
                  placeholder="Ej. Transf. Banco Unión #98412"
                  value={nroComprobante}
                  onChange={(e) => setNroComprobante(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 min-h-[42px]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Adjuntar Foto de Boleta / Comprobante de Depósito (Opcional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Seleccionar Archivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {comprobanteFoto && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Comprobante adjuntado
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Notas u Observaciones de la Liquidación
                </label>
                <input
                  type="text"
                  placeholder="Detalles adicionales sobre la rendición de la agencia..."
                  value={notasLiquidacion}
                  onChange={(e) => setNotasLiquidacion(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 min-h-[40px]"
                />
              </div>
            </div>
          </div>

          {/* Footer Botones de Acción */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedSubIds.length === 0}
              className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-blue-700/20 active:scale-95 transition-all flex items-center gap-2 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Procesando...' : 'Procesar y Liquidar Agencia Origen'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
