import React, { useState, useMemo } from 'react';
import {
  Building2,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Percent,
  Upload,
  Calendar,
  X
} from 'lucide-react';
import {
  ManifiestoDestino,
  Viaje,
  CategoriaFinanciera,
  Catalogos
} from '../types';

interface LiquidacionDestinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifiestosDestino: ManifiestoDestino[];
  viajes?: Viaje[];
  catalogos: Catalogos;
  categorias?: CategoriaFinanciera[];
  cajasDisponibles: string[];
  onLiquidar: (payload: {
    tipo: 'DESTINO';
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
}

export const LiquidacionDestinoModal: React.FC<LiquidacionDestinoModalProps> = ({
  isOpen,
  onClose,
  manifiestosDestino,
  viajes = [],
  catalogos,
  categorias = [],
  cajasDisponibles,
  onLiquidar,
  onAddCategoria
}) => {
  // Paso A: Filtros
  const sucursalesDestino = useMemo(() => {
    return catalogos.sucursales || ['Tarija', 'Potosí', 'Oruro', 'La Paz', 'Santa Cruz', 'Cochabamba'];
  }, [catalogos.sucursales]);

  const [selectedAgencia, setSelectedAgencia] = useState<string>(sucursalesDestino[0] || 'Tarija');
  const [filtroViaje, setFiltroViaje] = useState<string>('Todos');

  // Paso B: Selección de Encomiendas / Cargas
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);

  // Paso C: Deducciones y Descuentos
  const [comisionPct, setComisionPct] = useState<number>(7);
  const [descargaBs, setDescargaBs] = useState<number>(0);
  const [otrasDeducciones, setOtrasDeducciones] = useState<DeduccionItem[]>([]);

  // Nueva categoría
  const [showNewCatInput, setShowNewCatInput] = useState<boolean>(false);
  const [newCatNombre, setNewCatNombre] = useState<string>('');

  // Paso E: Cierre y Rendición
  const [cuentaDestino, setCuentaDestino] = useState<string>(cajasDisponibles[0] || 'Banco Unión Central');
  const [fechaRendicion, setFechaRendicion] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nroComprobante, setNroComprobante] = useState<string>('');
  const [comprobanteFoto, setComprobanteFoto] = useState<string>('');
  const [notasLiquidacion, setNotasLiquidacion] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manifiestos/Cargas recaudadas por la agencia en destino (Monto Retenido o cobros realizados)
  const cargasAgenciaDestino = useMemo(() => {
    return manifiestosDestino.filter(s => {
      const matchAgencia = (s.agenciaDestinoResponsable || s.sucursalDestino || '').toLowerCase().trim() === selectedAgencia.toLowerCase().trim();
      
      // Debe tener monto recaudado retenido o cobros realizados pendientes de traspasar
      const tieneRetencion = (s.montoRetenidoAgenciaBs || 0) > 0 ||
        (s.cobrosRealizadosBs || 0) > 0 ||
        (s.estadoRendicionDestino === 'Retenido en Agencia (CxC Agencia)');

      let matchViaje = true;
      if (filtroViaje !== 'Todos') {
        matchViaje = s.idViaje === filtroViaje || s.nroManifiesto?.includes(filtroViaje);
      }

      return matchAgencia && tieneRetencion && matchViaje;
    });
  }, [manifiestosDestino, selectedAgencia, filtroViaje]);

  // Actualizar seleccionados al cambiar de agencia
  React.useEffect(() => {
    setSelectedSubIds(cargasAgenciaDestino.map(s => s.idSubManifiesto));
  }, [cargasAgenciaDestino]);

  const toggleSelectSub = (id: string) => {
    setSelectedSubIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSubIds.length === cargasAgenciaDestino.length) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(cargasAgenciaDestino.map(s => s.idSubManifiesto));
    }
  };

  // Monto Bruto Recaudado
  const montoBrutoRecaudado = useMemo(() => {
    return cargasAgenciaDestino
      .filter(s => selectedSubIds.includes(s.idSubManifiesto))
      .reduce((sum, s) => {
        const monto = (s.montoRetenidoAgenciaBs || 0) > 0 ? (s.montoRetenidoAgenciaBs || 0) : (s.cobrosRealizadosBs || 0);
        return sum + monto;
      }, 0);
  }, [cargasAgenciaDestino, selectedSubIds]);

  // Deducciones
  const comisionMontoBs = useMemo(() => {
    return (montoBrutoRecaudado * (comisionPct || 0)) / 100;
  }, [montoBrutoRecaudado, comisionPct]);

  const totalOtrasDeduccionesBs = useMemo(() => {
    return otrasDeducciones.reduce((sum, d) => sum + (Number(d.montoBs) || 0), 0);
  }, [otrasDeducciones]);

  const totalComisionesGastos = useMemo(() => {
    return comisionMontoBs + (Number(descargaBs) || 0) + totalOtrasDeduccionesBs;
  }, [comisionMontoBs, descargaBs, totalOtrasDeduccionesBs]);

  // Monto Neto a Transferir
  const montoNetoTransferir = useMemo(() => {
    return Math.max(0, montoBrutoRecaudado - totalComisionesGastos);
  }, [montoBrutoRecaudado, totalComisionesGastos]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedSubIds.length === 0) {
      setErrorMsg('Seleccione al menos una encomienda recaudada por la agencia en destino.');
      return;
    }

    if (!cuentaDestino) {
      setErrorMsg('Seleccione la cuenta o caja donde ingresará la transferencia bancaria.');
      return;
    }

    setIsSubmitting(true);
    try {
      const listaDeducciones: Array<{ categoria: string; montoBs: number; detalle?: string; porcentaje?: number }> = [];

      if (comisionMontoBs > 0) {
        listaDeducciones.push({
          categoria: 'Comisiones por Cobranza Destino',
          montoBs: comisionMontoBs,
          porcentaje: comisionPct,
          detalle: `Comisión cobros en destino (${comisionPct}%)`
        });
      }

      if (descargaBs > 0) {
        listaDeducciones.push({
          categoria: 'Servicio de Descarga y Manipuleo',
          montoBs: descargaBs,
          detalle: 'Servicio de descargadores y manipuleo en sucursal'
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
        tipo: 'DESTINO',
        agencia: selectedAgencia,
        subManifiestosIds: selectedSubIds,
        montoBruto: montoBrutoRecaudado,
        deducciones: listaDeducciones,
        totalDeducciones: totalComisionesGastos,
        montoNeto: montoNetoTransferir,
        cuentaDestino,
        fecha: fechaRendicion,
        nroComprobante,
        comprobanteFotoUrl: comprobanteFoto || undefined,
        notas: notasLiquidacion
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar liquidación de destino.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-600 to-orange-700 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Cobranzas Destino Liquidación</h3>
              <p className="text-xs text-amber-100">
                Liquidación de recaudaciones de agencias de destino hacia cuenta bancaria central
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

          {/* PASO A: Selector de Sucursal / Agencia de Destino y Filtro */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">A</span>
                1. Selección de Sucursal / Agencia de Destino
              </label>
              <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                Paso Obligatorio
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Agencia de Destino *
                </label>
                <select
                  value={selectedAgencia}
                  onChange={(e) => setSelectedAgencia(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 min-h-[42px]"
                >
                  {sucursalesDestino.map((suc) => (
                    <option key={suc} value={suc}>{suc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Filtro por Viaje / Manifiesto
                </label>
                <select
                  value={filtroViaje}
                  onChange={(e) => setFiltroViaje(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 min-h-[42px]"
                >
                  <option value="Todos">-- Todos los Viajes --</option>
                  {viajes.map((v) => (
                    <option key={v.idViaje} value={v.idViaje}>
                      {v.idViaje} ({v.placaCamion})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Fecha de Transferencia
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={fechaRendicion}
                    onChange={(e) => setFechaRendicion(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 min-h-[42px]"
                    required
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* PASO B: Selección de Manifiestos/Cargas recaudadas */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">B</span>
                2. Encomiendas Recaudadas por Agencia {selectedAgencia}
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline"
                >
                  {selectedSubIds.length === cargasAgenciaDestino.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </button>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {selectedSubIds.length} de {cargasAgenciaDestino.length} seleccionadas
                </span>
              </div>
            </div>

            {cargasAgenciaDestino.length === 0 ? (
              <div className="p-5 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No existen cobranzas retenidas pendientes de liquidación para la agencia de destino {selectedAgencia}.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100/90 text-slate-600 border-b border-slate-200 uppercase font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-center w-8">
                        <input
                          type="checkbox"
                          checked={selectedSubIds.length === cargasAgenciaDestino.length && cargasAgenciaDestino.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                      </th>
                      <th className="py-2 px-3 text-left">Manifiesto MIC</th>
                      <th className="py-2 px-3 text-left">Destinatario</th>
                      <th className="py-2 px-3 text-center">Estado Rendición</th>
                      <th className="py-2 px-3 text-right">Recaudado (Bs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cargasAgenciaDestino.map((sub) => {
                      const isChecked = selectedSubIds.includes(sub.idSubManifiesto);
                      const montoRecaudado = (sub.montoRetenidoAgenciaBs || 0) > 0 ? (sub.montoRetenidoAgenciaBs || 0) : (sub.cobrosRealizadosBs || 0);

                      return (
                        <tr
                          key={sub.idSubManifiesto}
                          onClick={() => toggleSelectSub(sub.idSubManifiesto)}
                          className={`cursor-pointer transition-colors ${isChecked ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}
                        >
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectSub(sub.idSubManifiesto)}
                              className="rounded text-amber-600 focus:ring-amber-500"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-amber-900 text-left">{sub.nroManifiesto}</td>
                          <td className="py-2 px-3 text-slate-800 font-medium text-left truncate max-w-[160px]">{sub.destinatario || 'Cliente General'}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              {sub.estadoRendicionDestino || 'Retenido'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-black tabular-nums text-emerald-700">
                            Bs {montoRecaudado.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Bruto */}
            <div className="flex justify-between items-center bg-amber-50/80 p-3 rounded-xl border border-amber-300">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                Total Bruto Recaudado en {selectedAgencia}:
              </span>
              <span className="text-base font-black text-amber-950 tabular-nums">
                Bs {montoBrutoRecaudado.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* PASO C: Panel dinámico de Descuentos y Deducciones de Agencia */}
          <div className="bg-orange-50/50 border border-orange-200 p-4 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-orange-950 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">C</span>
                3. Descuentos y Deducciones de Agencia Destino
              </label>
              <button
                type="button"
                onClick={handleAddOtraDeduccion}
                className="text-xs font-bold text-orange-900 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg border border-orange-300 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar Otro Descuento / Gasto</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1) Comisión por Cargas Destino (%) */}
              <div className="bg-white p-3.5 rounded-xl border border-orange-300 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-orange-600" />
                    1) Comisión por Cargas Destino (%)
                  </span>
                  <span className="text-[10px] text-slate-500">Calculado sobre recaudado</span>
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

              {/* 2) Servicio de Cargadores / Descarga */}
              <div className="bg-white p-3.5 rounded-xl border border-orange-300 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-xs">
                    2) Cargadores / Descarga (Bs.)
                  </span>
                  <span className="text-[10px] text-slate-500">Importe en Bs.</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={descargaBs}
                      onChange={(e) => setDescargaBs(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 min-h-[38px]"
                    />
                  </div>
                  <div className="shrink-0 text-right w-28">
                    <span className="text-[10px] text-slate-500 block">Deducción:</span>
                    <span className="font-black text-rose-600 text-sm tabular-nums">
                      - Bs {Number(descargaBs || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Otras deducciones */}
            {otrasDeducciones.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-orange-200">
                <span className="text-[11px] font-bold text-orange-950 block">Otros Gastos y Retenciones:</span>
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
                      placeholder="Detalle o notas..."
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
                  className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline"
                >
                  + ¿Crear nueva categoría de gasto financiero al vuelo?
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-300">
                  <input
                    type="text"
                    placeholder="Nombre nueva categoría de gasto..."
                    value={newCatNombre}
                    onChange={(e) => setNewCatNombre(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategoria}
                    className="bg-amber-700 text-white font-bold px-3 py-1 rounded-lg text-xs"
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

          {/* PASO D: Cálculo Neto */}
          <div className="bg-amber-50/70 border border-amber-200/90 text-slate-900 p-4 sm:p-5 rounded-2xl space-y-3 shadow-sm">
            <span className="text-xs uppercase font-extrabold tracking-wider text-amber-900 block flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white inline-flex items-center justify-center text-[10px] font-bold">D</span>
              4. Resultado de Liquidación Neta Destino
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white border border-amber-200/70 p-3.5 rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 block">Total Recaudado en Destino:</span>
                <span className="text-base sm:text-lg font-black text-amber-900 tabular-nums">
                  Bs {montoBrutoRecaudado.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-white border border-rose-200/70 p-3.5 rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 block">(-) Deducciones y Comisiones:</span>
                <span className="text-base sm:text-lg font-black text-rose-600 tabular-nums">
                  - Bs {totalComisionesGastos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border border-emerald-500/40 p-3.5 rounded-xl shadow-sm">
                <span className="text-[11px] text-emerald-100 font-bold block">(=) IMPORTE NETO A TRANSFERIR:</span>
                <span className="text-lg sm:text-xl font-black text-white tabular-nums">
                  Bs {montoNetoTransferir.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* PASO E: Registro de Depósito a Caja Central / Banco */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">E</span>
              5. Depósito / Transferencia a Cuenta Bancaria de Empresa
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Cuenta / Banco Destino (Arqueo_Cajas) *
                </label>
                <select
                  value={cuentaDestino}
                  onChange={(e) => setCuentaDestino(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 min-h-[42px] focus:ring-2 focus:ring-amber-500"
                  required
                >
                  {cajasDisponibles.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  El monto neto transferido (Bs. {montoNetoTransferir.toFixed(2)}) aumentará el saldo disponible en esta cuenta.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Nro. Comprobante / Boleta de Depósito
                </label>
                <input
                  type="text"
                  placeholder="Ej. Transf. Bancaria #77123"
                  value={nroComprobante}
                  onChange={(e) => setNroComprobante(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 min-h-[42px]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Adjuntar Comprobante o Foto de Boleta (Opcional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-amber-600" />
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
                      <CheckCircle2 className="w-4 h-4" /> Comprobante cargado
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Notas u Observaciones
                </label>
                <input
                  type="text"
                  placeholder="Detalles sobre la liquidación o entrega de valores..."
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
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 active:scale-95 transition-all flex items-center gap-2 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Procesando...' : 'Procesar y Liquidar Agencia Destino'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
