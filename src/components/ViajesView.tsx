import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Fuel, 
  MapPin, 
  Calendar, 
  User, 
  Receipt, 
  DollarSign, 
  CheckCircle, 
  ArrowRight, 
  Eye, 
  FileText, 
  AlertCircle, 
  ExternalLink, 
  ChevronRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Printer,
  Edit3,
  LayoutList,
  Layers,
  Wrench,
  Package,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Trash2
} from 'lucide-react';
import { Viaje, ManifiestoOrigen, ManifiestoDestino, GastoRutaCamion, Catalogos, EstadoViaje, DatosEmpresa, TransaccionDiaria } from '../types';
import { generarProximoIdViaje } from '../utils/viajeUtils';
import { calcularSaldosSubManifiesto } from '../utils/subManifiestoSaldos';
import { ReporteViajeChoferView } from './ReporteViajeChoferView';
import { LiquidacionRutaModal } from './LiquidacionRutaModal';

interface ViajesViewProps {
  viajes: Viaje[];
  manifiestosOrigen: ManifiestoOrigen[];
  manifiestosDestino?: ManifiestoDestino[];
  gastosRuta: GastoRutaCamion[];
  transacciones?: TransaccionDiaria[];
  catalogos: Catalogos;
  selectedPlaca: string;
  onOpenGastoModal: (idViajePrefill?: string) => void;
  onOpenTransaccionModal?: (idViajePrefill?: string) => void;
  onCrearViaje: (viaje: Viaje) => Promise<void>;
  onActualizarEstadoViaje: (idViaje: string, nuevoEstado: EstadoViaje) => void;
  onVerComprobante: (fotoUrl: string) => void;
  onEditViaje?: (viaje: Viaje) => void;
  onPrintViaje?: (viaje: Viaje) => void;
  empresa?: DatosEmpresa;
  onReporteSaved?: () => void;
}

export const ViajesView: React.FC<ViajesViewProps> = ({
  viajes,
  manifiestosOrigen,
  manifiestosDestino = [],
  gastosRuta,
  transacciones = [],
  catalogos,
  selectedPlaca,
  onOpenGastoModal,
  onOpenTransaccionModal,
  onCrearViaje,
  onActualizarEstadoViaje,
  onVerComprobante,
  onEditViaje,
  onPrintViaje,
  empresa,
  onReporteSaved
}) => {
  const [vistaModo, setVistaModo] = useState<'tabla' | 'detalle' | 'reporte_chofer'>('tabla');
  const [selectedViajeId, setSelectedViajeId] = useState<string>(
    viajes.find(v => v.estadoViaje !== 'Liquidado / Cerrado')?.idViaje || viajes[0]?.idViaje || ''
  );
  const [showLiquidacionModal, setShowLiquidacionModal] = useState<boolean>(false);
  const [viajeParaLiquidar, setViajeParaLiquidar] = useState<Viaje | null>(null);
  const [bloqueFiltroDetalle, setBloqueFiltroDetalle] = useState<'todos' | 'ingresos' | 'gastos_chofer' | 'admin'>('todos');
  const [showNewTripModal, setShowNewTripModal] = useState<boolean>(false);
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');
  const [filtroCentroCosto, setFiltroCentroCosto] = useState<string>(selectedPlaca || 'Todos');
  const [filtroViajeAsignado, setFiltroViajeAsignado] = useState<string>('Todos');
  const [filtroSubManifiesto, setFiltroSubManifiesto] = useState<string>('Todos');

  // Form State for new trip
  const [newPlaca, setNewPlaca] = useState<string>(catalogos.camiones[0]?.placa || '');
  const [newChofer, setNewChofer] = useState<string>(catalogos.camiones[0]?.choferHabitual || '');
  const [newFechaSalida, setNewFechaSalida] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newFechaLlegada, setNewFechaLlegada] = useState<string>('');
  const [newObservaciones, setNewObservaciones] = useState<string>('');

  const sucursalesDestinoDisponibles = useMemo(() => {
    return Array.from(new Set(manifiestosDestino.map(s => s.sucursalDestino).filter(Boolean)));
  }, [manifiestosDestino]);

  const filteredViajes = viajes.filter(v => {
    if (filtroCentroCosto !== 'Todos' && v.placaCamion !== filtroCentroCosto && (v as any).centroCosto !== filtroCentroCosto) return false;
    if (filtroEstado !== 'Todos' && v.estadoViaje !== filtroEstado) return false;
    if (filtroViajeAsignado !== 'Todos' && v.idViaje !== filtroViajeAsignado) return false;

    if (filtroSubManifiesto !== 'Todos') {
      const manifDelViaje = manifiestosOrigen.filter(m => m.idViajeAsignado === v.idViaje);
      const subManifDelViaje = manifiestosDestino.filter(
        s => s.idViaje === v.idViaje || manifDelViaje.some(m => m.idManifiesto === s.idManifiestoPadre)
      );

      if (filtroSubManifiesto === 'con_sub' && subManifDelViaje.length === 0) return false;
      if (filtroSubManifiesto === 'sin_sub' && subManifDelViaje.length > 0) return false;
      if (filtroSubManifiesto === 'pendientes' && !subManifDelViaje.some(s => s.estadoLiquidacion !== 'Liquidado en Sucursal')) return false;
      if (filtroSubManifiesto === 'liquidados' && !subManifDelViaje.some(s => s.estadoLiquidacion === 'Liquidado en Sucursal')) return false;
      if (!['con_sub', 'sin_sub', 'pendientes', 'liquidados'].includes(filtroSubManifiesto)) {
        const matches = subManifDelViaje.some(s => 
          s.idSubManifiesto === filtroSubManifiesto || 
          s.nroManifiesto === filtroSubManifiesto ||
          s.sucursalDestino === filtroSubManifiesto
        );
        if (!matches) return false;
      }
    }

    return true;
  });

  const selectedViaje = viajes.find(v => v.idViaje === selectedViajeId) || filteredViajes[0];

  const manifiestosDelViaje = selectedViaje
    ? manifiestosOrigen.filter(m => m.idViajeAsignado === selectedViaje.idViaje)
    : [];

  const subManifiestosDelViaje = selectedViaje
    ? manifiestosDestino.filter(
        s => s.idViaje === selectedViaje.idViaje || manifiestosDelViaje.some(m => m.idManifiesto === s.idManifiestoPadre)
      )
    : [];

  const gastosDelViaje = selectedViaje
    ? gastosRuta.filter(g => g.idViajeAsignado === selectedViaje.idViaje)
    : [];

  const gastosCombustible = gastosDelViaje.filter(g => 
    (g.categoriaGasto.toLowerCase().includes('combustible') || 
     g.categoriaGasto.toLowerCase().includes('diésel') || 
     g.categoriaGasto.toLowerCase().includes('diesel')) && 
    g.tipoOperacion !== 'Ingreso'
  );

  const gastosTalleresMantenimiento = gastosDelViaje.filter(g =>
    (g.categoriaGasto.toLowerCase().includes('taller') || 
     g.categoriaGasto.toLowerCase().includes('mecánica') || 
     g.categoriaGasto.toLowerCase().includes('mecanica') || 
     g.categoriaGasto.toLowerCase().includes('repuesto') || 
     g.categoriaGasto.toLowerCase().includes('mantenimiento') ||
     g.categoriaGasto.toLowerCase().includes('llanta')) &&
    g.tipoOperacion !== 'Ingreso'
  );

  const otrosGastosRuta = gastosDelViaje.filter(g => 
    !gastosCombustible.includes(g) &&
    !gastosTalleresMantenimiento.includes(g) &&
    g.tipoOperacion !== 'Ingreso'
  );

  const ingresosRuta = gastosDelViaje.filter(g => g.tipoOperacion === 'Ingreso');
  const totalLitros = gastosCombustible.reduce((sum, g) => sum + (g.litrosDiesel || 0), 0);
  const totalIngresosRuta = ingresosRuta.reduce((sum, g) => sum + (g.importeBs || 0), 0);

  // Transacciones Extraordinarias del Administrador (Propietario) asociadas a este viaje / camión
  const transaccionesAdminDelViaje = useMemo(() => {
    if (!selectedViaje) return [];
    return (transacciones || []).filter(t => {
      if (t.origenRegistro === 'Gasto_Ruta') return false;
      if (t.idViaje === selectedViaje.idViaje) return true;
      if (selectedViaje.placaCamion && t.placaCamion === selectedViaje.placaCamion && t.idViaje === selectedViaje.idViaje) return true;
      return false;
    });
  }, [selectedViaje, transacciones]);

  const ingresosAdminDelViaje = useMemo(() => {
    return transaccionesAdminDelViaje.filter(t => t.tipo === 'Ingreso');
  }, [transaccionesAdminDelViaje]);

  const gastosAdminDelViaje = useMemo(() => {
    return transaccionesAdminDelViaje.filter(t => t.tipo === 'Gasto');
  }, [transaccionesAdminDelViaje]);

  const totalIngresosAdminDelViaje = useMemo(() => {
    return ingresosAdminDelViaje.reduce((sum, t) => sum + (Number(t.montoBs) || 0), 0);
  }, [ingresosAdminDelViaje]);

  const totalGastosAdminDelViaje = useMemo(() => {
    return gastosAdminDelViaje.reduce((sum, t) => sum + (Number(t.montoBs) || 0), 0);
  }, [gastosAdminDelViaje]);

  const totalGastosChoferDelViaje = useMemo(() => {
    return gastosDelViaje
      .filter(g => g.tipoOperacion !== 'Ingreso')
      .reduce((sum, g) => sum + (Number(g.importeBs) || 0), 0);
  }, [gastosDelViaje]);

  const granTotalGastosDelViaje = totalGastosChoferDelViaje + totalGastosAdminDelViaje;
  const granTotalIngresosDelViaje = (selectedViaje?.fletesManifiestosBs || 0) + totalIngresosAdminDelViaje;
  const utilidadConsolidadaDelViaje = granTotalIngresosDelViaje - granTotalGastosDelViaje;
  const margenConsolidadoPct = granTotalIngresosDelViaje > 0
    ? Number(((utilidadConsolidadaDelViaje / granTotalIngresosDelViaje) * 100).toFixed(1))
    : 0;
  const saldoRendirChoferDelViaje = totalIngresosRuta - totalGastosChoferDelViaje;

  // Totales de flota filtrada para KPIs superiores
  const kpiTotales = useMemo(() => {
    const fletes = filteredViajes.reduce((sum, v) => sum + (v.fletesManifiestosBs || 0), 0);
    const gastos = filteredViajes.reduce((sum, v) => sum + (v.gastosRutaBs || 0), 0);
    const utilidad = fletes - gastos;
    const margen = fletes > 0 ? Number(((utilidad / fletes) * 100).toFixed(1)) : 0;
    const viajesActivos = filteredViajes.filter(v => v.estadoViaje !== 'Liquidado / Cerrado').length;
    
    const tripIds = new Set(filteredViajes.map(v => v.idViaje));
    const litros = gastosRuta
      .filter(g => tripIds.has(g.idViajeAsignado) && g.litrosDiesel)
      .reduce((sum, g) => sum + (g.litrosDiesel || 0), 0);

    return { fletes, gastos, utilidad, margen, viajesActivos, litros };
  }, [filteredViajes, gastosRuta]);

  const metodosPagoDesglose = useMemo(() => {
    const map: Record<string, number> = {};
    gastosDelViaje.filter(g => g.tipoOperacion !== 'Ingreso').forEach(g => {
      const met = g.cajaCuentaUtilizada || 'Efectivo Chofer Ruta';
      map[met] = (map[met] || 0) + g.importeBs;
    });
    return Object.entries(map).map(([metodo, total]) => ({ metodo, total }));
  }, [gastosDelViaje]);

  const proximoIdViajeCalculado = useMemo(() => {
    return generarProximoIdViaje(viajes);
  }, [viajes]);

  const handleCreateTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = proximoIdViajeCalculado;
    const nuevoViaje: Viaje = {
      idViaje: id,
      placaCamion: newPlaca,
      choferAsignado: newChofer,
      fechaSalida: newFechaSalida,
      fechaLlegada: newFechaLlegada || newFechaSalida,
      estadoViaje: 'En Tránsito',
      observacionesRuta: newObservaciones || `Ruta para camión ${newPlaca}`,
      fletesManifiestosBs: 0,
      gastosRutaBs: 0,
      utilidadViajeBs: 0,
      margenPct: 0
    };

    await onCrearViaje(nuevoViaje);
    setSelectedViajeId(id);
    setShowNewTripModal(false);
  };

  return (
    <div className="w-full space-y-6 pb-16 md:pb-6">
      {/* Header Bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#1d4ed8]" />
            Control Integral por Unidad y Liquidación de Viajes
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo en tiempo real de fletes cargados (MIC y Encomiendas), gastos operativos en ruta (diésel, peajes, viáticos, talleres) y utilidad neta por camión.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switcher Modo de Visualización */}
          <div className="bg-[#f4f6fa] border border-[#e2e8f0] p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setVistaModo('tabla')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                vistaModo === 'tabla'
                  ? 'bg-[#1d4ed8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver tabla general con todas las columnas visibles de un vistazo"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Tabla General</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaModo('detalle')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                vistaModo === 'detalle'
                  ? 'bg-[#1d4ed8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver ficha de liquidación detallada por viaje"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ficha en Detalle</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaModo('reporte_chofer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                vistaModo === 'reporte_chofer'
                  ? 'bg-[#1d4ed8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Control integral por unidad y reporte de viaje del chofer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📋 Reporte Viaje Chofer</span>
            </button>
          </div>

          <button
            onClick={() => onOpenGastoModal(selectedViaje?.idViaje)}
            className="flex items-center space-x-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] font-bold text-xs px-3.5 py-2.5 rounded-xl border border-[#bfdbfe] transition-all min-h-[40px]"
          >
            <Fuel className="w-4 h-4 text-[#1d4ed8]" />
            <span>+ Gasto en Ruta</span>
          </button>

          <button
            onClick={() => setShowNewTripModal(true)}
            className="flex items-center space-x-1.5 bg-[#1d4ed8] hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Viaje</span>
          </button>
        </div>
      </div>

      {vistaModo !== 'reporte_chofer' && (
        <>
          {/* KPI Strip Superior: Resumen de Flota y Utilidad Operativa */}
          <div className="w-full grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Viajes Totales</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-slate-900">{filteredViajes.length}</span>
            <span className="text-xs text-[#1d4ed8] font-bold">({kpiTotales.viajesActivos} en ruta)</span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Ingreso Bruto Fletes</span>
          <span className="text-xl font-black text-slate-900 block mt-1">
            Bs {kpiTotales.fletes.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Gastos Operativos Ruta</span>
          <span className="text-xl font-black text-[#dc2626] block mt-1">
            -Bs {kpiTotales.gastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Diésel Consumido</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-amber-600">{kpiTotales.litros.toFixed(1)}</span>
            <span className="text-xs font-bold text-slate-500">Litros</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-[#16a34a] uppercase tracking-wider block">Utilidad Operativa</span>
          <span className="text-xl font-black text-[#16a34a] block mt-1">
            Bs {kpiTotales.utilidad.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-[#1d4ed8] uppercase tracking-wider block">Margen Operativo Promedio</span>
          <span className="text-xl font-black text-[#1d4ed8] block mt-1">
            {kpiTotales.margen}%
          </span>
        </div>
      </div>

      {/* Filter Tabs & Selectores de Filtro Avanzados */}
      <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Botones de Estado */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {['Todos', 'En Tránsito', 'En Reparto', 'Liquidado / Cerrado'].map((estado) => (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] ${
                  filtroEstado === estado
                    ? 'bg-[#1A73E8] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {estado}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto text-xs text-slate-500 font-semibold">
            <span>Resultados:</span>
            <span className="font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
              {filteredViajes.length} de {viajes.length} viaje(s)
            </span>
          </div>
        </div>

        {/* Fila de Filtros Clave: Centro de Costo, Viaje Asignado, Sub-Manifiestos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* 1. Centro de Costo (Camión) */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#1A73E8]" />
              Centro de Costo (Camión):
            </label>
            <select
              value={filtroCentroCosto}
              onChange={(e) => setFiltroCentroCosto(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all cursor-pointer min-h-[38px]"
            >
              <option value="Todos">Todas las Unidades / Placas</option>
              {catalogos.camiones.map(c => (
                <option key={c.placa} value={c.placa}>
                  {c.placa} - {c.modelo} ({c.choferHabitual})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Viaje Asignado */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#1A73E8]" />
              Viaje Asignado:
            </label>
            <select
              value={filtroViajeAsignado}
              onChange={(e) => setFiltroViajeAsignado(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all cursor-pointer min-h-[38px]"
            >
              <option value="Todos">Todos los Viajes</option>
              {viajes.map(v => (
                <option key={v.idViaje} value={v.idViaje}>
                  {v.idViaje} ({v.placaCamion} - {v.estadoViaje})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Sub-Manifiestos */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#1A73E8]" />
              Sub-Manifiestos:
            </label>
            <select
              value={filtroSubManifiesto}
              onChange={(e) => setFiltroSubManifiesto(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all cursor-pointer min-h-[38px]"
            >
              <option value="Todos">Todos los Sub-Manifiestos</option>
              <option value="con_sub">Solo con Sub-Manifiestos</option>
              <option value="sin_sub">Solo sin Sub-Manifiestos</option>
              <option value="pendientes">Con Sub-Manifiestos Pendientes</option>
              <option value="liquidados">Con Sub-Manifiestos Liquidados</option>
              {sucursalesDestinoDisponibles.length > 0 && (
                <optgroup label="Filtrar por Destino de Entrega">
                  {sucursalesDestinoDisponibles.map(suc => (
                    <option key={suc} value={suc}>
                      Destino: {suc}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Botón de Limpiar Filtros */}
          <div className="flex flex-col justify-end">
            {(filtroCentroCosto !== 'Todos' || filtroViajeAsignado !== 'Todos' || filtroSubManifiesto !== 'Todos' || filtroEstado !== 'Todos') ? (
              <button
                type="button"
                onClick={() => {
                  setFiltroCentroCosto('Todos');
                  setFiltroViajeAsignado('Todos');
                  setFiltroSubManifiesto('Todos');
                  setFiltroEstado('Todos');
                }}
                className="w-full px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-1.5 min-h-[38px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar todos los filtros</span>
              </button>
            ) : (
              <div className="hidden xl:flex items-center text-[11px] text-slate-400 font-medium px-2 py-2">
                Filtros activos en tiempo real
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )}

  {/* MODO 1: TABLA GENERAL DE VIAJES Y RENTABILIDAD (100% ANCHO DE PANTALLA) */}
      {vistaModo === 'tabla' && (
        <div className="w-full bg-white border border-[#e2e8f0] rounded-[18px] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <LayoutList className="w-4 h-4 text-[#1d4ed8]" />
                Tabla Maestra de Viajes y Control Operativo por Camión
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribución horizontal completa con fletes (MIC + encomiendas), gastos de ruta, cobros y margen operativo.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {filteredViajes.length} viaje(s) registrados
            </span>
          </div>

          <div className="w-full overflow-x-auto lg:overflow-x-visible">
            <table className="w-full table-auto lg:table-fixed border-collapse min-w-[900px] lg:min-w-0">
              <thead>
                <tr className="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider border-b-2 border-slate-200">
                  <th className="py-3 px-3 text-left lg:w-[11%]">ID Viaje / Estado</th>
                  <th className="py-3 px-3 text-left lg:w-[12%]">Camión / Chofer</th>
                  <th className="py-3 px-3 text-left lg:w-[11%]">Fechas Salida/Llegada</th>
                  <th className="py-3 px-3 text-left lg:w-[12%]">Ruta Asignada</th>
                  <th className="py-3 px-3 text-right lg:w-[11%]">Ingreso Fletes</th>
                  <th className="py-3 px-3 text-right lg:w-[11%]">Gastos de Ruta</th>
                  <th className="py-3 px-3 text-right lg:w-[10%]">Cobrado Destino</th>
                  <th className="py-3 px-3 text-right lg:w-[11%]">Utilidad Operativa</th>
                  <th className="py-3 px-3 text-center lg:w-[8%]">Margen %</th>
                  <th className="py-3 px-3 text-center lg:w-[13%]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredViajes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                      No se encontraron viajes con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredViajes.map((viaje) => {
                    const manifDelViaje = manifiestosOrigen.filter(m => m.idViajeAsignado === viaje.idViaje);
                    const subManifDelViaje = manifiestosDestino.filter(
                      s => s.idViaje === viaje.idViaje || manifDelViaje.some(m => m.idManifiesto === s.idManifiestoPadre)
                    );
                    const origenViajeStr = viaje.origen || manifDelViaje[0]?.sucursalOrigen || 'Oruro';
                    const destinosUnicos = Array.from(new Set(subManifDelViaje.map(s => s.sucursalDestino).filter(Boolean)));
                    const destinosViajeStr = destinosUnicos.length > 0 ? destinosUnicos.join(', ') : (viaje.destino || 'Tarija');
                    const cobradoDestinoBs = viaje.cobradoDestinoBs !== undefined 
                      ? viaje.cobradoDestinoBs 
                      : subManifDelViaje.reduce((acc, s) => acc + (s.cobrosRealizadosBs || 0), 0);

                    const isSelected = selectedViajeId === viaje.idViaje;

                    return (
                      <tr 
                        key={viaje.idViaje} 
                        className={`hover:bg-blue-50/40 transition-colors ${isSelected ? 'bg-blue-50/60 font-semibold' : ''}`}
                      >
                        {/* ID Viaje & Estado */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-mono font-black text-xs text-[#1d4ed8] bg-blue-100/70 px-1.5 py-0.5 rounded border border-blue-200">
                              {viaje.idViaje}
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              viaje.estadoViaje === 'En Tránsito'
                                ? 'bg-blue-100 text-[#1d4ed8] border border-blue-200'
                                : viaje.estadoViaje === 'En Reparto'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-emerald-100 text-[#16a34a] border border-emerald-200'
                            }`}>
                              {viaje.estadoViaje}
                            </span>
                          </div>
                        </td>

                        {/* Camión / Chofer */}
                        <td className="py-3 px-3">
                          <div className="font-black text-slate-800 text-xs flex items-center gap-1">
                            <Truck className="w-3 h-3 text-[#1d4ed8] shrink-0" />
                            <span>{viaje.placaCamion}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{viaje.choferAsignado}</span>
                          </div>
                        </td>

                        {/* Fechas */}
                        <td className="py-3 px-3 text-[11px] text-slate-600">
                          <div><strong className="text-slate-800">Sal:</strong> {viaje.fechaSalida}</div>
                          <div><strong className="text-slate-800">Lleg:</strong> {viaje.fechaLlegada || '-'}</div>
                        </td>

                        {/* Ruta */}
                        <td className="py-3 px-3 text-[11px]">
                          <div className="text-slate-700 font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{origenViajeStr}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{destinosViajeStr}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                            {manifDelViaje.length} MIC / {subManifDelViaje.length} encomiendas
                          </span>
                        </td>

                        {/* Ingreso Fletes */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-black text-slate-900 text-xs block">
                            Bs {viaje.fletesManifiestosBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Gastos de Ruta */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-black text-[#dc2626] text-xs block">
                            -Bs {viaje.gastosRutaBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Cobrado Destino */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-black text-[#1d4ed8] text-xs block">
                            Bs {cobradoDestinoBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Utilidad Operativa */}
                        <td className="py-3 px-3 text-right">
                          <span className={`font-black text-xs block ${
                            viaje.utilidadViajeBs >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'
                          }`}>
                            Bs {viaje.utilidadViajeBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Margen % */}
                        <td className="py-3 px-3 text-center">
                          <span className={`font-black text-[11px] px-2 py-0.5 rounded-full inline-block ${
                            viaje.margenPct >= 30
                              ? 'bg-emerald-100 text-[#16a34a] border border-emerald-200'
                              : viaje.margenPct > 0
                              ? 'bg-blue-100 text-[#1d4ed8] border border-blue-200'
                              : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}>
                            {viaje.margenPct}%
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setViajeParaLiquidar(viaje);
                                setShowLiquidacionModal(true);
                              }}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#16a34a] rounded-lg transition-colors border border-emerald-200"
                              title="Abrir Liquidación Integral (Admin + Chofer)"
                            >
                              <Layers className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedViajeId(viaje.idViaje);
                                setVistaModo('detalle');
                              }}
                              className="p-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] rounded-lg transition-colors border border-blue-200"
                              title="Ver Ficha de Liquidación en Detalle"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenGastoModal(viaje.idViaje)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors border border-amber-200"
                              title="Registrar Gasto de Ruta"
                            >
                              <Fuel className="w-3.5 h-3.5" />
                            </button>

                            {onEditViaje && (
                              <button
                                type="button"
                                onClick={() => onEditViaje(viaje)}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200"
                                title="Editar Viaje"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                            )}

                            {onPrintViaje && (
                              <button
                                type="button"
                                onClick={() => onPrintViaje(viaje)}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200"
                                title="Imprimir Liquidación / PDF"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODO 2: FICHA DE LIQUIDACIÓN EN VIVO (DETALLE POR VIAJE) */}
      {vistaModo === 'detalle' && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Trip Selector Cards (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Viajes Registrados ({filteredViajes.length})
              </span>
              <button
                type="button"
                onClick={() => setVistaModo('tabla')}
                className="text-xs text-[#1d4ed8] hover:underline font-bold flex items-center gap-1"
              >
                <LayoutList className="w-3 h-3" />
                <span>Ver en tabla completa</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[780px] overflow-y-auto pr-1">
              {filteredViajes.map((viaje) => {
                const isSelected = selectedViaje?.idViaje === viaje.idViaje;

                const manifDelViaje = manifiestosOrigen.filter(m => m.idViajeAsignado === viaje.idViaje);
                const subManifDelViaje = manifiestosDestino.filter(
                  s => s.idViaje === viaje.idViaje || manifDelViaje.some(m => m.idManifiesto === s.idManifiestoPadre)
                );
                const cobradoDestinoBs = viaje.cobradoDestinoBs !== undefined 
                  ? viaje.cobradoDestinoBs 
                  : subManifDelViaje.reduce((acc, s) => acc + (s.cobrosRealizadosBs || 0), 0);

                return (
                  <div
                    key={viaje.idViaje}
                    onClick={() => setSelectedViajeId(viaje.idViaje)}
                    className={`p-4 rounded-[18px] border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 border-[#1d4ed8] shadow-md ring-1 ring-[#1d4ed8]'
                        : 'bg-white border-[#e2e8f0] hover:border-blue-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-[#1d4ed8] bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">
                          {viaje.idViaje}
                        </span>
                        <span className="font-extrabold text-sm text-slate-800 tracking-wide">{viaje.placaCamion}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          viaje.estadoViaje === 'En Tránsito'
                            ? 'bg-blue-100 text-[#1d4ed8] border border-blue-200'
                            : viaje.estadoViaje === 'En Reparto'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-emerald-100 text-[#16a34a] border border-emerald-200'
                        }`}>
                          {viaje.estadoViaje}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1.5 text-xs text-slate-600 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{viaje.choferAsignado}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{viaje.fechaSalida}</span>
                      </div>
                    </div>

                    {/* Financial Mini Summary */}
                    <div className="mt-3 pt-2 border-t border-[#e2e8f0] grid grid-cols-3 gap-1.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Fletes</span>
                        <span className="font-bold text-slate-800">Bs {viaje.fletesManifiestosBs.toLocaleString('es-BO')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-blue-600 block font-semibold">Cobrado Dest.</span>
                        <span className="font-bold text-[#1d4ed8]">Bs {cobradoDestinoBs.toLocaleString('es-BO')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Utilidad ({viaje.margenPct}%)</span>
                        <span className="font-black text-[#16a34a]">Bs {viaje.utilidadViajeBs.toLocaleString('es-BO')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Ficha de Liquidación en Vivo (8 cols) */}
          <div className="lg:col-span-8">
            {selectedViaje ? (
              <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 sm:p-6 shadow-sm space-y-6">
                {/* Top Banner of Selected Trip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#e2e8f0] gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-[#1d4ed8] bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">
                        {selectedViaje.idViaje}
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-slate-800">
                        Liquidación de Ruta • Camión {selectedViaje.placaCamion}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Chofer Asignado: <strong className="text-slate-700">{selectedViaje.choferAsignado}</strong> • Salida: {selectedViaje.fechaSalida} • Estimada: {selectedViaje.fechaLlegada}
                    </p>
                    <p className="text-xs text-slate-500 italic mt-0.5">
                      "{selectedViaje.observacionesRuta}"
                    </p>
                  </div>

                  {/* State changer dropdown & Action Buttons */}
                  {/* State changer dropdown & Action Buttons */}
                  <div className="shrink-0 flex flex-wrap items-center gap-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-slate-500 font-bold">Estado:</span>
                      <select
                        value={selectedViaje.estadoViaje}
                        onChange={(e) => onActualizarEstadoViaje(selectedViaje.idViaje, e.target.value as EstadoViaje)}
                        className="bg-[#f8fafc] border border-[#e2e8f0] text-xs font-bold text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[40px]"
                      >
                        <option value="En Tránsito">En Tránsito</option>
                        <option value="En Reparto">En Reparto</option>
                        <option value="Liquidado / Cerrado">Liquidado / Cerrado</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setViajeParaLiquidar(selectedViaje);
                        setShowLiquidacionModal(true);
                      }}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm min-h-[40px] transition-colors"
                      title="Abrir Ficha de Liquidación en Ventana Emergente"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Liquidación Completa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenGastoModal(selectedViaje.idViaje)}
                      className="px-3.5 py-2 bg-[#1d4ed8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm min-h-[40px]"
                      title="Registrar Operación de Ruta"
                    >
                      <Fuel className="w-3.5 h-3.5" />
                      <span>+ Gasto / Ingreso</span>
                    </button>

                    {onEditViaje && (
                      <button
                        type="button"
                        onClick={() => onEditViaje(selectedViaje)}
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-[#e2e8f0] text-xs font-bold flex items-center gap-1.5 min-h-[40px]"
                        title="Editar Información de Viaje"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Editar</span>
                      </button>
                    )}

                    {onPrintViaje && (
                      <button
                        type="button"
                        onClick={() => onPrintViaje(selectedViaje)}
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-[#e2e8f0] text-xs font-bold flex items-center gap-1.5 min-h-[40px]"
                        title="Imprimir / Exportar PDF"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>PDF</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* RESUMEN FINANCIERO CONSOLIDADO (UTILIDAD Y SALDO A RENDIR) */}
                <div className="bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border border-blue-200/80 rounded-[18px] p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1d4ed8] flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      Liquidación Económica Integrada del Viaje (Chofer + Admin)
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold bg-white/80 px-2 py-0.5 rounded border border-blue-100">
                      Cálculo Consolidado en Vivo
                    </span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Total Ingresos Generales */}
                    <div className="bg-white p-3.5 rounded-xl border border-[#dbeafe] shadow-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[11px] font-bold text-slate-600">Total Ingresos Generales</span>
                        <TrendingUp className="w-3.5 h-3.5 text-[#16a34a]" />
                      </div>
                      <span className="text-base sm:text-lg font-black text-slate-800 block">
                        Bs {granTotalIngresosDelViaje.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                        <span>Fletes: Bs {selectedViaje.fletesManifiestosBs.toLocaleString('es-BO')}</span>
                        <span>Admin: Bs {totalIngresosAdminDelViaje.toLocaleString('es-BO')}</span>
                      </div>
                    </div>

                    {/* (-) Gran Total de Gastos */}
                    <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[11px] font-bold text-rose-700">(-) Gran Total Gastos</span>
                        <TrendingDown className="w-3.5 h-3.5 text-[#dc2626]" />
                      </div>
                      <span className="text-base sm:text-lg font-black text-[#dc2626] block">
                        -Bs {granTotalGastosDelViaje.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                        <span>Chofer: Bs {totalGastosChoferDelViaje.toLocaleString('es-BO')}</span>
                        <span>Admin: Bs {totalGastosAdminDelViaje.toLocaleString('es-BO')}</span>
                      </div>
                    </div>

                    {/* = Utilidad Neta del Viaje & Margen */}
                    <div className={`p-3.5 rounded-xl border shadow-xs ${
                      utilidadConsolidadaDelViaje >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-bold ${
                          utilidadConsolidadaDelViaje >= 0 ? 'text-[#16a34a]' : 'text-rose-700'
                        }`}>
                          = Utilidad Neta Viaje
                        </span>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                          utilidadConsolidadaDelViaje >= 0 ? 'bg-emerald-200/70 text-emerald-800' : 'bg-rose-200 text-rose-800'
                        }`}>
                          {margenConsolidadoPct}%
                        </span>
                      </div>
                      <span className={`text-base sm:text-lg font-black block ${
                        utilidadConsolidadaDelViaje >= 0 ? 'text-[#16a34a]' : 'text-rose-700'
                      }`}>
                        Bs {utilidadConsolidadaDelViaje.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Margen Operativo consolidado
                      </span>
                    </div>

                    {/* Saldo a Rendir por el Chofer */}
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[11px] font-bold text-amber-800">Saldo a Rendir (Chofer)</span>
                        <Wallet className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <span className={`text-base sm:text-lg font-black block ${
                        saldoRendirChoferDelViaje >= 0 ? 'text-slate-800' : 'text-amber-700'
                      }`}>
                        Bs {Math.abs(saldoRendirChoferDelViaje).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 block truncate">
                        {saldoRendirChoferDelViaje > 0
                          ? 'A favor empresa (devolver excedente)'
                          : saldoRendirChoferDelViaje < 0
                          ? 'A favor chofer (empresa debe reembolsar)'
                          : 'Cuentas en cero'}
                      </span>
                    </div>
                  </div>

                  {/* Desglose por Método de Pago en Ruta */}
                  {metodosPagoDesglose.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#dbeafe] flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-[#1d4ed8]" />
                        Cuentas y cajas afectadas en ruta:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {metodosPagoDesglose.map((mp) => (
                          <div
                            key={mp.metodo}
                            className="bg-white border border-[#dbeafe] px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="text-slate-600 font-medium">{mp.metodo}:</span>
                            <span className="font-black text-[#1d4ed8]">
                              Bs {mp.total.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* SELECTOR DE TABS / BLOQUES PARA CONTROL TOTAL */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setBloqueFiltroDetalle('todos')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                        bloqueFiltroDetalle === 'todos'
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-[#1d4ed8]" />
                      <span>Todos los Bloques</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBloqueFiltroDetalle('ingresos')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                        bloqueFiltroDetalle === 'ingresos'
                          ? 'bg-white text-[#16a34a] shadow-xs border border-emerald-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-[#16a34a]" />
                      <span>Bloque 1: Ingresos</span>
                      <span className="text-[10px] font-mono bg-emerald-50 text-[#16a34a] px-1.5 rounded">
                        Bs {granTotalIngresosDelViaje.toLocaleString('es-BO')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBloqueFiltroDetalle('gastos_chofer')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                        bloqueFiltroDetalle === 'gastos_chofer'
                          ? 'bg-white text-[#dc2626] shadow-xs border border-rose-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Fuel className="w-3.5 h-3.5 text-[#dc2626]" />
                      <span>Bloque 2: Gastos Chofer</span>
                      <span className="text-[10px] font-mono bg-rose-50 text-[#dc2626] px-1.5 rounded">
                        Bs {totalGastosChoferDelViaje.toLocaleString('es-BO')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBloqueFiltroDetalle('admin')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                        bloqueFiltroDetalle === 'admin'
                          ? 'bg-white text-purple-700 shadow-xs border border-purple-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5 text-purple-600" />
                      <span>Bloque 3: Transacciones Admin</span>
                      <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-1.5 rounded">
                        Bs {totalGastosAdminDelViaje.toLocaleString('es-BO')}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenTransaccionModal && (
                      <button
                        type="button"
                        onClick={() => onOpenTransaccionModal(selectedViaje.idViaje)}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition-colors"
                        title="Inyectar gasto o anticipo de administración"
                      >
                        + Transacción Admin
                      </button>
                    )}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* BLOQUE 1: INGRESOS DEL VIAJE                             */}
                {/* ========================================================= */}
                {(bloqueFiltroDetalle === 'todos' || bloqueFiltroDetalle === 'ingresos') && (
                  <div className="space-y-3 bg-[#f8fafc]/60 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-100 text-[#16a34a] flex items-center justify-center font-black text-xs">
                          1
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-800">
                          BLOQUE 1: INGRESOS DEL VIAJE
                        </h4>
                      </div>
                      <span className="text-xs font-black text-[#16a34a]">
                        Total Ingresos: Bs {granTotalIngresosDelViaje.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Sub-tabla 1A: Manifiestos de Carga Transportados (MIC) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#1d4ed8]" />
                          Manifiestos de Carga Maestros (MIC) ({manifiestosDelViaje.length})
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          Subtotal Fletes: Bs {selectedViaje.fletesManifiestosBs.toLocaleString('es-BO')}
                        </span>
                      </div>

                      {manifiestosDelViaje.length === 0 ? (
                        <div className="p-3 bg-white border border-[#e2e8f0] rounded-xl text-xs text-slate-500 text-center">
                          No hay manifiestos MIC de origen asignados a este viaje aún.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {manifiestosDelViaje.map((man) => (
                            <div key={man.idManifiesto} className="p-3 bg-white border border-[#e2e8f0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 font-mono text-xs">{man.nroManifiestoMIC}</span>
                                  <span className="text-slate-500">Origen: <strong className="text-slate-700">{man.sucursalOrigen}</strong></span>
                                  <span className="text-[10px] bg-blue-100 text-[#1d4ed8] px-2 py-0.5 rounded-full font-bold">{man.estadoManifiesto}</span>
                                </div>
                                <span className="text-[11px] text-slate-400">Emisión: {man.fechaEmision} • ID: {man.idManifiesto}</span>
                              </div>

                              <div className="flex items-center space-x-4 text-right">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-medium">Flete Total</span>
                                  <span className="font-bold text-slate-800">Bs {man.fleteTotalBs.toLocaleString('es-BO')}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-medium">Cobrado Origen</span>
                                  <span className="font-bold text-[#16a34a]">Bs {man.cobradoOrigenBs.toLocaleString('es-BO')}</span>
                                  {man.cobradoOrigenBs > 0 && (
                                    <span className="block text-[8px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 mt-0.5">
                                      Por Liquidar a Central (CxC)
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-medium">Por Cobrar Destino</span>
                                  <span className="font-bold text-[#dc2626]">Bs {man.saldoCobrarDestinosBs.toLocaleString('es-BO')}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sub-tabla 1B: Sub-Manifiestos y Encomiendas Destino */}
                    {subManifiestosDelViaje.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-[#16a34a]" />
                            Sub-Manifiestos y Encomiendas de Destino ({subManifiestosDelViaje.length})
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Total Flete Encomiendas: <strong>Bs {subManifiestosDelViaje.reduce((acc, s) => acc + (s.fleteAsignadoBs || 0), 0).toLocaleString('es-BO')}</strong>
                          </span>
                        </div>

                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {subManifiestosDelViaje.map((sub) => {
                            const saldos = calcularSaldosSubManifiesto(sub);
                            return (
                              <div key={sub.idSubManifiesto} className="p-2.5 bg-white border border-[#e2e8f0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-slate-800">{sub.nroManifiesto}</span>
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                      Destino: {sub.sucursalDestino}
                                    </span>
                                    {sub.destinatario && (
                                      <span className="text-slate-600 font-semibold">
                                        Para: {sub.destinatario}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                      {saldos.estadoBadgeTexto}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-3 text-right shrink-0">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block font-medium">Flete</span>
                                    <span className="font-bold text-slate-800 tabular-nums">Bs {saldos.fleteTotal.toLocaleString('es-BO')}</span>
                                  </div>
                                  {saldos.pagadoOrigen > 0 && (
                                    <div>
                                      <span className="text-[10px] text-slate-400 block font-medium">Pagado Origen</span>
                                      <span className="font-bold text-[#16a34a] tabular-nums">Bs {saldos.pagadoOrigen.toLocaleString('es-BO')}</span>
                                      <span className="block text-[8px] font-semibold text-amber-700">Por Liquidar (CxC)</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-[10px] text-slate-400 block font-medium">Cobrado Destino</span>
                                    <span className="font-bold text-[#1d4ed8] tabular-nums">Bs {saldos.cobrosRealizados.toLocaleString('es-BO')}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-500 block font-bold">👤 Saldo Cliente</span>
                                    <span className={`font-bold tabular-nums ${saldos.saldoPendienteCliente > 0 ? 'text-[#dc2626]' : 'text-slate-400 font-normal'}`}>
                                      Bs {saldos.saldoPendienteCliente.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-500 block font-bold">🏢 Saldo Agencia</span>
                                    <span className={`font-bold tabular-nums ${saldos.saldoPendienteAgencia > 0 ? 'text-purple-700' : 'text-slate-400 font-normal'}`}>
                                      Bs {saldos.saldoPendienteAgencia.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sub-tabla 1C: Ingresos Extraordinarios Admin */}
                    {ingresosAdminDelViaje.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-purple-700 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-purple-600" />
                            Ingresos Extraordinarios Inyectados por Admin ({ingresosAdminDelViaje.length})
                          </span>
                          <span className="text-[11px] font-black text-purple-700">
                            Bs {totalIngresosAdminDelViaje.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {ingresosAdminDelViaje.map((t) => (
                            <div key={t.idTransaccion} className="p-2.5 bg-purple-50/50 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-slate-800">{t.categoria}</span>
                                <span className="text-slate-600 ml-2">- {t.notas || 'Sin detalle'}</span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {t.fecha} • {t.metodoPago}
                                </div>
                              </div>
                              <span className="font-black text-[#16a34a] text-xs sm:text-sm">
                                +Bs {Number(t.montoBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================= */}
                {/* BLOQUE 2: GASTOS DE RUTA (CHOFER)                        */}
                {/* ========================================================= */}
                {(bloqueFiltroDetalle === 'todos' || bloqueFiltroDetalle === 'gastos_chofer') && (
                  <div className="space-y-3 bg-[#f8fafc]/60 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-rose-100 text-[#dc2626] flex items-center justify-center font-black text-xs">
                          2
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-800">
                          BLOQUE 2: GASTOS DE RUTA (CHOFER)
                        </h4>
                      </div>
                      <span className="text-xs font-black text-[#dc2626]">
                        Total Gastos Chofer: -Bs {totalGastosChoferDelViaje.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Cargas de Diésel */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                          <Fuel className="w-3.5 h-3.5 text-[#1d4ed8]" />
                          Cargas de Diésel ({gastosCombustible.length}) • Total: {totalLitros.toFixed(1)} L
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenGastoModal(selectedViaje.idViaje)}
                          className="text-[11px] text-[#1d4ed8] hover:underline font-bold"
                        >
                          + Cargar Diésel
                        </button>
                      </div>

                      {gastosCombustible.length === 0 ? (
                        <div className="p-2.5 bg-white border border-[#e2e8f0] rounded-xl text-xs text-slate-400 text-center italic">
                          No se han registrado cargas de combustible para este viaje.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {gastosCombustible.map((g) => (
                            <div key={g.idGastoRuta} className="p-2.5 bg-white border border-[#e2e8f0] rounded-xl flex items-center justify-between text-xs shadow-2xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800">{g.detalleGasto}</span>
                                  {g.litrosDiesel && (
                                    <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                      {g.litrosDiesel} L
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  {g.fechaHora} • Factura: {g.nroFacturaBoleta || 'S/N'} • {g.cajaCuentaUtilizada || 'Efectivo'} {g.nombreProveedor ? `• ${g.nombreProveedor}` : ''}
                                </span>
                              </div>

                              <div className="flex items-center space-x-2">
                                <span className="font-black text-[#dc2626] text-xs sm:text-sm">
                                  -Bs {g.importeBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                                </span>
                                {g.comprobanteFotoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => onVerComprobante(g.comprobanteFotoUrl!)}
                                    className="p-1 bg-slate-100 hover:bg-slate-200 text-[#1d4ed8] rounded"
                                    title="Ver foto comprobante"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Peajes, Balanzas y Viáticos */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-[#dc2626]" />
                          Peajes, Balanzas y Viáticos de Carretera ({otrosGastosRuta.length})
                        </span>
                      </div>

                      {otrosGastosRuta.length === 0 ? (
                        <div className="p-2.5 bg-white border border-[#e2e8f0] rounded-xl text-xs text-slate-400 text-center italic">
                          No hay otros gastos registrados en ruta.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {otrosGastosRuta.map((g) => (
                            <div key={g.idGastoRuta} className="p-2.5 bg-white border border-[#e2e8f0] rounded-xl flex items-center justify-between text-xs shadow-2xs">
                              <div>
                                <span className="font-bold text-slate-800">{g.categoriaGasto}</span>
                                <span className="text-slate-600 ml-1.5">- {g.detalleGasto}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {g.fechaHora} • Nro: {g.nroFacturaBoleta || 'Ticket'} • {g.cajaCuentaUtilizada || 'Efectivo Chofer'}
                                </span>
                              </div>

                              <div className="flex items-center space-x-2">
                                <span className="font-black text-[#dc2626] text-xs sm:text-sm">
                                  -Bs {g.importeBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                                </span>
                                {g.comprobanteFotoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => onVerComprobante(g.comprobanteFotoUrl!)}
                                    className="p-1 bg-slate-100 hover:bg-slate-200 text-[#1d4ed8] rounded"
                                    title="Ver foto del recibo"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Anticipos de Carretera recibidos por el Chofer */}
                    {ingresosRuta.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <span className="font-bold text-xs text-[#16a34a] flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-[#16a34a]" />
                          Anticipos y Recargas Recibidas por el Chofer ({ingresosRuta.length}) • Total: Bs {totalIngresosRuta.toLocaleString('es-BO')}
                        </span>
                        <div className="space-y-1.5">
                          {ingresosRuta.map((g) => (
                            <div key={g.idGastoRuta} className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-slate-800">{g.categoriaGasto}</span>
                                <span className="text-slate-600 ml-1.5">- {g.detalleGasto}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{g.fechaHora} • {g.cajaCuentaUtilizada || 'Efectivo'}</span>
                              </div>
                              <span className="font-black text-[#16a34a] text-xs sm:text-sm">
                                +Bs {g.importeBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================= */}
                {/* BLOQUE 3: TRANSACCIONES EXTRAORDINARIAS (ADMIN / PROPIETARIO) */}
                {/* ========================================================= */}
                {(bloqueFiltroDetalle === 'todos' || bloqueFiltroDetalle === 'admin') && (
                  <div className="space-y-3 bg-purple-50/30 p-4 rounded-2xl border border-purple-200/80">
                    <div className="flex items-center justify-between pb-2 border-b border-purple-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
                          3
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-800">
                            BLOQUE 3: TRANSACCIONES EXTRAORDINARIAS (ADMINISTRADOR / PROPIETARIO)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Repuestos mayores, mantenimiento pagado por banco, anticipos centrales y seguros
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Gastos Admin</span>
                        <span className="text-xs sm:text-sm font-black text-purple-700">
                          -Bs {totalGastosAdminDelViaje.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {transaccionesAdminDelViaje.length === 0 ? (
                      <div className="p-4 bg-white border border-purple-100 rounded-xl text-xs text-slate-500 text-center">
                        <p className="font-semibold text-slate-700">No hay transacciones extraordinarias del Administrador para este viaje.</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Las operaciones registradas por el Propietario en Finanzas Diarias asignadas a este viaje aparecerán desglosadas aquí.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-purple-200 rounded-xl bg-white">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-purple-50/70 text-slate-700 font-bold border-b border-purple-200">
                            <tr>
                              <th className="py-2.5 px-3">Fecha</th>
                              <th className="py-2.5 px-3">Categoría</th>
                              <th className="py-2.5 px-3">Detalle / Notas</th>
                              <th className="py-2.5 px-3">Método de Pago / Banco</th>
                              <th className="py-2.5 px-3 text-right">Monto (Bs.)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e2e8f0]">
                            {transaccionesAdminDelViaje.map((t) => (
                              <tr key={t.idTransaccion} className="hover:bg-purple-50/30">
                                <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                                  {t.fecha}
                                </td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  <span className="font-bold text-slate-800 block">{t.categoria}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                    t.tipo === 'Ingreso' ? 'bg-emerald-100 text-[#16a34a]' : 'bg-rose-100 text-[#dc2626]'
                                  }`}>
                                    {t.tipo}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-700 max-w-sm">
                                  <span className="font-medium">{t.notas || 'Sin detalle'}</span>
                                  {(t.nombreProveedor || t.idProveedor) && (
                                    <span className="text-[10px] text-purple-700 block font-semibold mt-0.5">
                                      Proveedor: {t.nombreProveedor || t.idProveedor}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                    <Wallet className="w-3 h-3 text-purple-600" />
                                    {t.metodoPago || 'Banco Central'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right whitespace-nowrap">
                                  <span className={`font-black text-xs sm:text-sm ${
                                    t.tipo === 'Ingreso' ? 'text-[#16a34a]' : 'text-[#dc2626]'
                                  }`}>
                                    {t.tipo === 'Ingreso' ? '+' : '-'}Bs {Number(t.montoBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* RESUMEN FINAL CONSOLIDADO (BALANCE Y UTILIDAD NETA) */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-md space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                      Balance Financiero Consolidado del Viaje
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      Unidad: {selectedViaje.placaCamion} • Chofer: {selectedViaje.choferAsignado}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-[10px] text-slate-400 block font-semibold">Total Ingresos Generales</span>
                      <span className="text-sm sm:text-base font-black text-emerald-400">
                        Bs {granTotalIngresosDelViaje.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-[10px] text-slate-400 block font-semibold">(-) Gran Total Gastos</span>
                      <span className="text-sm sm:text-base font-black text-rose-400">
                        -Bs {granTotalGastosDelViaje.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-[10px] text-slate-400 block font-semibold">= Utilidad Neta Viaje</span>
                      <span className={`text-sm sm:text-base font-black ${
                        utilidadConsolidadaDelViaje >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        Bs {utilidadConsolidadaDelViaje.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-[10px] text-slate-400 block font-semibold">Margen % Neto</span>
                      <span className="text-sm sm:text-base font-black text-blue-400">
                        {margenConsolidadoPct}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-12 text-center text-slate-500 shadow-sm">
                Seleccione un viaje de la lista para ver su liquidación detallada.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODO 3: REPORTE VIAJE CHOFER / RENDICIÓN Y LIQUIDACIÓN INTEGRAL */}
      {vistaModo === 'reporte_chofer' && (
        <ReporteViajeChoferView
          viajes={viajes}
          manifiestosOrigen={manifiestosOrigen}
          manifiestosDestino={manifiestosDestino}
          catalogos={catalogos}
          selectedPlaca={selectedPlaca}
          empresa={empresa}
          onReporteSaved={onReporteSaved}
          onVerComprobante={onVerComprobante}
        />
      )}
      {showNewTripModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-md rounded-t-[20px] sm:rounded-[18px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-[#f8fafc] border-b border-[#e2e8f0]">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#1d4ed8]" />
                Registrar Nuevo Viaje / Despacho
              </h3>
              <button onClick={() => setShowNewTripModal(false)} className="text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateTripSubmit} className="p-5 space-y-4 text-xs">
              {/* Código / ID de Viaje Automático Único */}
              <div className="bg-[#eff6ff] p-3 rounded-xl border border-[#bfdbfe] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-600 block font-semibold">Código / ID de Viaje Único (Automático):</span>
                  <span className="font-mono text-base font-black text-[#1d4ed8]">{proximoIdViajeCalculado}</span>
                </div>
                <span className="text-[10px] bg-blue-100 text-[#1d4ed8] font-bold px-2 py-0.5 rounded border border-blue-200">
                  Generado Automáticamente
                </span>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Camión (Centro de Costos) *</label>
                <select
                  value={newPlaca}
                  onChange={(e) => {
                    setNewPlaca(e.target.value);
                    const cam = catalogos.camiones.find(c => c.placa === e.target.value);
                    if (cam) setNewChofer(cam.choferHabitual);
                  }}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 focus:ring-1 focus:ring-blue-500 min-h-[44px]"
                  required
                >
                  {catalogos.camiones.map(c => (
                    <option key={c.placa} value={c.placa}>{c.placa} - {c.modelo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Chofer Asignado *</label>
                <input
                  type="text"
                  value={newChofer}
                  onChange={(e) => setNewChofer(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 focus:ring-1 focus:ring-blue-500 min-h-[44px]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Fecha Salida *</label>
                  <input
                    type="date"
                    value={newFechaSalida}
                    onChange={(e) => setNewFechaSalida(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Fecha Estimada Llegada</label>
                  <input
                    type="date"
                    value={newFechaLlegada}
                    onChange={(e) => setNewFechaLlegada(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Ruta y Observaciones</label>
                <textarea
                  rows={3}
                  value={newObservaciones}
                  onChange={(e) => setNewObservaciones(e.target.value)}
                  placeholder="Ej. Ruta Oruro - Potosí - Tarija - Bermejo..."
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewTripModal(false)}
                  className="px-4 py-2.5 font-semibold text-slate-500 hover:text-slate-800 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl min-h-[44px] shadow-sm"
                >
                  Crear Viaje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE LIQUIDACIÓN DE RUTA INTEGRADORA (Admin + Chofer) */}
      {showLiquidacionModal && (viajeParaLiquidar || selectedViaje) && (
        <LiquidacionRutaModal
          isOpen={showLiquidacionModal}
          onClose={() => {
            setShowLiquidacionModal(false);
            setViajeParaLiquidar(null);
          }}
          viaje={viajeParaLiquidar || selectedViaje}
          manifiestosOrigen={manifiestosOrigen}
          manifiestosDestino={manifiestosDestino}
          gastosRuta={gastosRuta}
          transacciones={transacciones}
          empresa={empresa}
          onVerComprobante={onVerComprobante}
          onOpenGastoModal={onOpenGastoModal}
          onOpenTransaccionModal={onOpenTransaccionModal}
        />
      )}
    </div>
  );
};
