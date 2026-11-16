import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Building2,
  DollarSign,
  User,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Percent,
  Check
} from 'lucide-react';
import {
  ManifiestoDestino,
  ManifiestoOrigen,
  Catalogos,
  Viaje
} from '../types';
import { storage } from '../services/storageService';
import { formatBs } from '../utils/formatUtils';

interface RegistrarCobranzaOrigenModalProps {
  isOpen: boolean;
  onClose: () => void;
  subManifiestos?: ManifiestoDestino[];
  manifiestosDestino?: ManifiestoDestino[];
  manifiestosOrigen?: ManifiestoOrigen[];
  catalogos: Catalogos;
  viajes?: Viaje[];
  cajas?: any[];
  subInicial?: ManifiestoDestino | null;
  subManifiestoPreseleccionado?: ManifiestoDestino | null;
  onCobroGuardado?: () => void;
  onSuccess?: () => void;
  showToast?: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export const RegistrarCobranzaOrigenModal: React.FC<RegistrarCobranzaOrigenModalProps> = ({
  isOpen,
  onClose,
  subManifiestos,
  manifiestosDestino,
  manifiestosOrigen = [],
  catalogos,
  viajes = [],
  cajas = [],
  subInicial,
  subManifiestoPreseleccionado,
  onCobroGuardado,
  onSuccess,
  showToast
}) => {
  const listaSubs = manifiestosDestino || subManifiestos || [];
  const initialSub = subManifiestoPreseleccionado || subInicial;

  // Sub-manifiesto seleccionado
  const [selectedSubId, setSelectedSubId] = useState<string>(() => {
    return initialSub?.idSubManifiesto || listaSubs[0]?.idSubManifiesto || '';
  });

  const [busquedaDoc, setBusquedaDoc] = useState<string>('');

  const subSeleccionado = useMemo(() => {
    return listaSubs.find(s => s.idSubManifiesto === selectedSubId) || null;
  }, [listaSubs, selectedSubId]);

  // Manifiesto padre y origen sugerido
  const padreManifiesto = useMemo(() => {
    if (!subSeleccionado?.idManifiestoPadre) return null;
    return manifiestosOrigen.find(m => m.idManifiesto === subSeleccionado.idManifiestoPadre) || null;
  }, [subSeleccionado, manifiestosOrigen]);

  // Cálculos del sub-manifiesto
  const fleteTotal = Number(subSeleccionado?.fleteAsignadoBs || 0);
  const pagadoPrevioOrigen = Number(subSeleccionado?.pagadoOrigenBs || 0);
  const cobradoPrevioDestino = Number(subSeleccionado?.cobrosRealizadosBs || 0);
  const totalCobradoPrevio = pagadoPrevioOrigen + cobradoPrevioDestino;
  const saldoPendienteActual = subSeleccionado?.saldoPendienteClienteBs !== undefined
    ? Number(subSeleccionado.saldoPendienteClienteBs)
    : Math.max(0, parseFloat((fleteTotal - totalCobradoPrevio).toFixed(2)));

  // Campos del formulario
  const [montoBs, setMontoBs] = useState<string>(() => {
    return saldoPendienteActual > 0 ? saldoPendienteActual.toFixed(2) : '';
  });

  const [tipoCobro, setTipoCobro] = useState<'Total' | 'Parcial' | 'Anticipo'>('Total');
  const [sucursalOrigen, setSucursalOrigen] = useState<string>(() => {
    return padreManifiesto?.sucursalOrigen || subSeleccionado?.origenViaje || catalogos.sucursales[0] || 'Oruro';
  });

  const listaCajas = useMemo(() => {
    const defaults = [
      'Efectivo Caja Central',
      'Banco Unión',
      'QR',
      'Caja Sucursal Oruro',
      'Caja Sucursal La Paz',
      'Caja Sucursal Cochabamba',
      'Caja Sucursal Santa Cruz'
    ];
    const fromCat = catalogos.cajasCuentas || [];
    return Array.from(new Set([...defaults, ...fromCat]));
  }, [catalogos.cajasCuentas]);

  const [cajaCuentaOrigen, setCajaCuentaOrigen] = useState<string>(listaCajas[0]);
  const [fechaCobro, setFechaCobro] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [esLiquidadoACentral, setEsLiquidadoACentral] = useState<boolean>(true);
  const [notas, setNotas] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Efecto cuando cambia el sub inicial o seleccionado
  useEffect(() => {
    if (subInicial) {
      setSelectedSubId(subInicial.idSubManifiesto);
    }
  }, [subInicial]);

  useEffect(() => {
    if (subSeleccionado) {
      const flete = Number(subSeleccionado.fleteAsignadoBs || 0);
      const pagOrig = Number(subSeleccionado.pagadoOrigenBs || 0);
      const cobDest = Number(subSeleccionado.cobrosRealizadosBs || 0);
      const saldo = subSeleccionado.saldoPendienteClienteBs !== undefined
        ? Number(subSeleccionado.saldoPendienteClienteBs)
        : Math.max(0, flete - (pagOrig + cobDest));
      
      setMontoBs(saldo > 0 ? saldo.toFixed(2) : '');
      const orig = padreManifiesto?.sucursalOrigen || subSeleccionado.origenViaje || catalogos.sucursales[0] || 'Oruro';
      setSucursalOrigen(orig);
      setNotas(`Cobranza de flete en origen (${orig}) para encomienda [${subSeleccionado.nroManifiesto || subSeleccionado.idSubManifiesto}] - Cliente: ${subSeleccionado.destinatario || 'General'}`);
    }
  }, [subSeleccionado, padreManifiesto, catalogos.sucursales]);

  // Lista de sub-manifiestos filtrados para búsqueda rápida
  const subsFiltrados = useMemo(() => {
    if (!busquedaDoc.trim()) return listaSubs;
    const q = busquedaDoc.toLowerCase().trim();
    return listaSubs.filter(s => 
      (s.nroManifiesto || '').toLowerCase().includes(q) ||
      (s.idSubManifiesto || '').toLowerCase().includes(q) ||
      (s.destinatario || '').toLowerCase().includes(q) ||
      (s.remitente || '').toLowerCase().includes(q) ||
      (s.sucursalDestino || '').toLowerCase().includes(q)
    );
  }, [listaSubs, busquedaDoc]);

  const montoNum = parseFloat(montoBs) || 0;
  const nuevoSaldoCalculado = Math.max(0, parseFloat((saldoPendienteActual - montoNum).toFixed(2)));

  const handleAplicarPorcentaje = (pct: number) => {
    if (saldoPendienteActual <= 0) return;
    const valor = parseFloat(((saldoPendienteActual * pct) / 100).toFixed(2));
    setMontoBs(valor.toString());
    setTipoCobro(pct === 100 ? 'Total' : 'Anticipo');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subSeleccionado) {
      if (showToast) showToast('Seleccione un sub-manifiesto para aplicar el cobro.', 'warning');
      return;
    }

    if (isNaN(montoNum) || montoNum <= 0) {
      if (showToast) showToast('Ingrese un monto válido mayor a 0 Bs.', 'warning');
      return;
    }

    if (montoNum > saldoPendienteActual && saldoPendienteActual > 0) {
      const confirmarExcedente = window.confirm(
        `El monto ingresado (Bs. ${montoNum.toFixed(2)}) supera el saldo pendiente (Bs. ${saldoPendienteActual.toFixed(2)}). ¿Desea continuar registrando el excedente?`
      );
      if (!confirmarExcedente) return;
    }

    setIsSubmitting(true);
    try {
      const res = await storage.registrarCobranzaOrigen({
        idSubManifiesto: subSeleccionado.idSubManifiesto,
        nroManifiesto: subSeleccionado.nroManifiesto,
        montoBs: montoNum,
        sucursalOrigen: sucursalOrigen,
        cajaCuentaOrigen: cajaCuentaOrigen,
        clienteNombre: subSeleccionado.destinatario || subSeleccionado.remitente,
        fecha: fechaCobro,
        notas: notas.trim() || `Cobro en origen (${sucursalOrigen}) para ${subSeleccionado.destinatario || 'cliente'}`,
        esLiquidadoACentral: esLiquidadoACentral,
        tipoCobro: tipoCobro
      });

      if (res.status === 'success') {
        if (showToast) {
          showToast(`Cobranza en origen de Bs. ${montoNum.toLocaleString('es-BO', { minimumFractionDigits: 2 })} registrada con éxito.`, 'success');
        }
        if (onCobroGuardado) onCobroGuardado();
        if (onSuccess) onSuccess();
        onClose();
      } else {
        if (showToast) showToast(res.message || 'Error al registrar cobranza.', 'warning');
      }
    } catch (err: any) {
      if (showToast) showToast(`Error al procesar: ${err.message || 'Error inesperado'}`, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200/90 shadow-2xl overflow-hidden my-6">
        
        {/* Cabecera del Modal */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 px-6 sm:px-8 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-xs shrink-0">
              <Building2 className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-black tracking-tight">
                Registrar Cobranza en Origen
              </h3>
              <p className="text-xs sm:text-sm text-blue-100 font-medium mt-0.5">
                Recepción de fletes, anticipos o pagos completos recaudados en la agencia de origen.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Selector de Sub-Manifiesto / Encomienda */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Documento / Sub-Manifiesto a Cobrar:</span>
              </label>
              <span className="text-xs text-slate-500 font-medium">
                {listaSubs.length} documentos disponibles
              </span>
            </div>

            {/* Buscador de apoyo si hay muchos */}
            {listaSubs.length > 5 && (
              <div>
                <input
                  type="text"
                  value={busquedaDoc}
                  onChange={(e) => setBusquedaDoc(e.target.value)}
                  placeholder="Filtrar por código, cliente o destino..."
                  className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>
            )}

            <select
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors shadow-2xs"
            >
              {subsFiltrados.map((s) => {
                const flete = Number(s.fleteAsignadoBs || 0);
                const cobrado = (Number(s.pagadoOrigenBs) || 0) + (Number(s.cobrosRealizadosBs) || 0);
                const saldo = s.saldoPendienteClienteBs !== undefined ? Number(s.saldoPendienteClienteBs) : Math.max(0, flete - cobrado);
                return (
                  <option key={s.idSubManifiesto} value={s.idSubManifiesto}>
                    [{s.nroManifiesto || s.idSubManifiesto}] • Destino: {s.sucursalDestino} • Para: {s.destinatario || 'General'} (Saldo: Bs. {saldo.toFixed(2)})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Tarjeta Informativa del Documento Seleccionado en Grid Amplio */}
          {subSeleccionado && (
            <div className="bg-slate-50/80 border border-blue-200/80 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-blue-100/80">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono font-black text-xs text-blue-900 bg-white border border-blue-200 px-3 py-1 rounded-lg shadow-2xs">
                    {subSeleccionado.nroManifiesto || subSeleccionado.idSubManifiesto}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    Agencia Destino: <strong className="text-blue-950 font-black">{subSeleccionado.sucursalDestino}</strong>
                  </span>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  saldoPendienteActual <= 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {saldoPendienteActual <= 0 ? 'Liquidado' : 'Saldo Pendiente'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-slate-700 bg-white/70 p-2.5 rounded-xl border border-slate-200/60">
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Destinatario: <strong className="text-slate-900">{subSeleccionado.destinatario || 'General'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 bg-white/70 p-2.5 rounded-xl border border-slate-200/60">
                  <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Remitente: <strong className="text-slate-900">{subSeleccionado.remitente || 'No especificado'}</strong></span>
                </div>
              </div>

              {/* Métricas del Sub-Manifiesto */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-mono text-center">
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 block">Flete Total</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">{formatBs(fleteTotal)}</span>
                </div>
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 shadow-2xs">
                  <span className="text-[10px] sm:text-xs uppercase font-bold text-emerald-800 block">Cobrado Origen</span>
                  <span className="text-sm sm:text-base font-bold text-emerald-700 tabular-nums">{formatBs(totalCobradoPrevio)}</span>
                  {totalCobradoPrevio > 0 && (
                    <span className="block text-[9px] font-semibold text-amber-700 mt-0.5">Por Liquidar a Central (CxC)</span>
                  )}
                </div>
                <div className={`p-3 rounded-xl border shadow-2xs ${saldoPendienteActual > 0 ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-white border-slate-200/80 text-slate-700'}`}>
                  <span className="text-[10px] sm:text-xs uppercase font-bold block text-amber-800">Por Cobrar Destino</span>
                  <span className="text-sm sm:text-base font-black tabular-nums">{formatBs(saldoPendienteActual)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Formulario en Grid Dual de 2 Columnas para Pantallas Grandes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Columna Izquierda: Datos Financieros del Cobro */}
            <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200/80">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Importe y Modalidad de Cobro</span>
              </h4>

              {/* Monto a Cobrar */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Monto a Cobrar en Origen (Bs.):</span>
                  {saldoPendienteActual > 0 && (
                    <button
                      type="button"
                      onClick={() => handleAplicarPorcentaje(100)}
                      className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      100% Saldo
                    </button>
                  )}
                </label>
                
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={montoBs}
                    onChange={(e) => setMontoBs(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base font-black font-mono text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                    Bs.
                  </span>
                </div>

                {/* Botones de porcentaje rápido */}
                {saldoPendienteActual > 0 && (
                  <div className="flex items-center gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={() => handleAplicarPorcentaje(100)}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Total ({formatBs(saldoPendienteActual)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAplicarPorcentaje(50)}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      50% Anticipo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAplicarPorcentaje(30)}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      30%
                    </button>
                  </div>
                )}
              </div>

              {/* Tipo de Cobro */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                  Modalidad del Cobro:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTipoCobro('Total')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      tipoCobro === 'Total'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs font-extrabold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Cobro Total Saldo
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoCobro('Anticipo')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      tipoCobro === 'Anticipo'
                        ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-2xs font-extrabold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Anticipo / Parcial
                  </button>
                </div>

                {/* Indicador de impacto en saldo */}
                {montoNum > 0 && (
                  <div className="mt-3 text-xs text-slate-700 flex items-center justify-between font-mono bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <span>Nuevo saldo restante:</span>
                    <strong className={nuevoSaldoCalculado > 0 ? 'text-amber-800 font-black' : 'text-emerald-700 font-black'}>
                      {formatBs(nuevoSaldoCalculado)}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Agencia, Cuenta y Rendición */}
            <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200/80">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Agencia y Destino de los Fondos</span>
              </h4>

              {/* Agencia de Origen */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <span>Agencia / Sucursal de Origen:</span>
                </label>
                <select
                  value={sucursalOrigen}
                  onChange={(e) => setSucursalOrigen(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {catalogos.sucursales.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Caja / Cuenta Receptora */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Caja / Cuenta Receptora del Fondo:</span>
                </label>
                <select
                  value={cajaCuentaOrigen}
                  onChange={(e) => setCajaCuentaOrigen(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {listaCajas.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Fecha del Cobro en Origen */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Fecha del Cobro en Origen:</span>
                </label>
                <input
                  type="date"
                  value={fechaCobro}
                  onChange={(e) => setFechaCobro(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  required
                />
              </div>

              {/* Estado de Rendición a Central */}
              <div>
                <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={esLiquidadoACentral}
                    onChange={(e) => setEsLiquidadoACentral(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 shrink-0"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">Rendido / Liquidado a Central</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {esLiquidadoACentral ? 'El dinero ya ingresó formalmente a caja central' : 'Queda como Por Liquidar a Central (CxC Agencia Origen) • No ingresa a caja de chofer o propietario'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Notas / Detalle */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
              Detalle / Observaciones del Cobro:
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalle o referencia del recibo de origen..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Guardando cobranza...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Cobranza en Origen</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
