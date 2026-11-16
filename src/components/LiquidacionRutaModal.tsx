import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Fuel,
  Wrench,
  Receipt,
  FileText,
  User,
  Truck,
  Building2,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  PlusCircle,
  Package,
  Layers,
  ArrowRightLeft,
  ShieldCheck
} from 'lucide-react';
import { Viaje, ManifiestoOrigen, ManifiestoDestino, GastoRutaCamion, TransaccionDiaria, DatosEmpresa } from '../types';
import { storage, DetalleLiquidacionViajeData } from '../services/storageService';
import { calcularSaldosSubManifiesto } from '../utils/subManifiestoSaldos';

interface LiquidacionRutaModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaje: Viaje | null;
  manifiestosOrigen?: ManifiestoOrigen[];
  manifiestosDestino?: ManifiestoDestino[];
  gastosRuta?: GastoRutaCamion[];
  transacciones?: TransaccionDiaria[];
  empresa?: DatosEmpresa;
  onVerComprobante?: (fotoUrl: string) => void;
  onOpenGastoModal?: (idViaje: string) => void;
  onOpenTransaccionModal?: (idViaje: string) => void;
}

export const LiquidacionRutaModal: React.FC<LiquidacionRutaModalProps> = ({
  isOpen,
  onClose,
  viaje,
  manifiestosOrigen = [],
  manifiestosDestino = [],
  gastosRuta = [],
  transacciones = [],
  empresa,
  onVerComprobante,
  onOpenGastoModal,
  onOpenTransaccionModal
}) => {
  const [activeTab, setActiveTab] = useState<'consolidado' | 'ingresos' | 'gastos_chofer' | 'admin'>('consolidado');
  const [isLoadingBackend, setIsLoadingBackend] = useState<boolean>(false);
  const [dataConsolidada, setDataConsolidada] = useState<DetalleLiquidacionViajeData | null>(null);
  const [filtroGastoChofer, setFiltroGastoChofer] = useState<string>('todos');

  // Función para cargar / sincronizar datos con backend o local
  const cargarDatos = async () => {
    if (!viaje?.idViaje) return;
    setIsLoadingBackend(true);
    try {
      const res = await storage.getDetalleLiquidacionViaje(viaje.idViaje);
      setDataConsolidada(res);
    } catch (err) {
      console.warn('Error cargando liquidación:', err);
    } finally {
      setIsLoadingBackend(false);
    }
  };

  useEffect(() => {
    if (viaje?.idViaje) {
      cargarDatos();
    }
  }, [viaje?.idViaje]);

  // Si los datos consolidados aún no cargan o para cálculo reactivo en vivo:
  const manifiestosDelViaje = useMemo(() => {
    if (dataConsolidada?.detalleManifiestos?.length) {
      return dataConsolidada.detalleManifiestos;
    }
    return (manifiestosOrigen || []).filter(m => m.idViajeAsignado === viaje?.idViaje);
  }, [dataConsolidada, manifiestosOrigen, viaje?.idViaje]);

  const subManifiestosDelViaje = useMemo(() => {
    if (dataConsolidada?.detalleSubManifiestos?.length) {
      return dataConsolidada.detalleSubManifiestos;
    }
    const manIds = new Set(manifiestosDelViaje.map(m => m.idManifiesto));
    return (manifiestosDestino || []).filter(
      s => s.idViaje === viaje?.idViaje || (s.idManifiestoPadre && manIds.has(s.idManifiestoPadre))
    );
  }, [dataConsolidada, manifiestosDestino, manifiestosDelViaje, viaje?.idViaje]);

  const gastosChofer = useMemo(() => {
    if (dataConsolidada?.detalleGastosChofer?.length) {
      return dataConsolidada.detalleGastosChofer;
    }
    return (gastosRuta || []).filter(g => g.idViajeAsignado === viaje?.idViaje);
  }, [dataConsolidada, gastosRuta, viaje?.idViaje]);

  const transaccionesAdmin = useMemo(() => {
    if (dataConsolidada?.detalleTransaccionesAdmin?.length) {
      return dataConsolidada.detalleTransaccionesAdmin;
    }
    return (transacciones || [])
      .filter(t => {
        if (t.origenRegistro === 'Gasto_Ruta') return false;
        if (t.idViaje === viaje?.idViaje) return true;
        if (viaje?.placaCamion && t.placaCamion === viaje.placaCamion && t.idViaje === viaje?.idViaje) return true;
        return false;
      })
      .map(t => ({
        idTransaccion: t.idTransaccion,
        fecha: t.fecha,
        tipo: t.tipo,
        categoria: t.categoria || 'Gasto Operativo',
        monto: Number(t.montoBs || 0),
        metodoPago: t.metodoPago || 'Efectivo',
        notas: t.notas || '',
        registradoPor: t.origenRegistro || 'Admin',
        cuentaDestino: t.cuentaDestino,
        proveedor: t.nombreProveedor || t.idProveedor
      }));
  }, [dataConsolidada, transacciones, viaje?.idViaje, viaje?.placaCamion]);

  // Cálculos de Bloque 1 (Ingresos)
  const totalFletes = useMemo(() => {
    if (dataConsolidada?.resumenFinanciero?.fletesManifiestosBs !== undefined) {
      return dataConsolidada.resumenFinanciero.fletesManifiestosBs;
    }
    let total = manifiestosDelViaje.reduce((acc, m) => acc + (Number(m.fleteTotalBs) || 0), 0);
    if (total === 0 && subManifiestosDelViaje.length > 0) {
      total = subManifiestosDelViaje.reduce((acc, s) => acc + (Number(s.fleteAsignadoBs) || 0), 0);
    }
    return total || viaje?.fletesManifiestosBs || 0;
  }, [dataConsolidada, manifiestosDelViaje, subManifiestosDelViaje, viaje?.fletesManifiestosBs]);

  const ingresosAdmin = useMemo(() => {
    return transaccionesAdmin.filter(t => t.tipo === 'Ingreso');
  }, [transaccionesAdmin]);

  const totalIngresosAdmin = useMemo(() => {
    if (dataConsolidada?.resumenFinanciero?.ingresosAdminBs !== undefined) {
      return dataConsolidada.resumenFinanciero.ingresosAdminBs;
    }
    return ingresosAdmin.reduce((acc, t) => acc + Number(t.monto || 0), 0);
  }, [dataConsolidada, ingresosAdmin]);

  const granTotalIngresos = totalFletes + totalIngresosAdmin;

  // Cálculos de Bloque 2 (Gastos Chofer)
  const totalGastosChofer = useMemo(() => {
    if (dataConsolidada?.resumenFinanciero?.gastosChoferBs !== undefined) {
      return dataConsolidada.resumenFinanciero.gastosChoferBs;
    }
    return gastosChofer
      .filter(g => g.tipoOperacion !== 'Ingreso')
      .reduce((acc, g) => acc + (Number(g.importeBs) || 0), 0);
  }, [dataConsolidada, gastosChofer]);

  const totalIngresosChofer = useMemo(() => {
    if (dataConsolidada?.resumenFinanciero?.totalIngresosChoferBs !== undefined) {
      return dataConsolidada.resumenFinanciero.totalIngresosChoferBs;
    }
    return gastosChofer
      .filter(g => g.tipoOperacion === 'Ingreso' || g.categoriaGasto === 'Anticipo Viáticos' || g.categoriaGasto === 'Ingreso Extra')
      .reduce((acc, g) => acc + (Number(g.importeBs) || 0), 0);
  }, [dataConsolidada, gastosChofer]);

  // Cálculos de Bloque 3 (Gastos Admin)
  const gastosAdmin = useMemo(() => {
    return transaccionesAdmin.filter(t => t.tipo === 'Gasto');
  }, [transaccionesAdmin]);

  const totalGastosAdmin = useMemo(() => {
    if (dataConsolidada?.resumenFinanciero?.gastosAdminBs !== undefined) {
      return dataConsolidada.resumenFinanciero.gastosAdminBs;
    }
    return gastosAdmin.reduce((acc, t) => acc + Number(t.monto || 0), 0);
  }, [dataConsolidada, gastosAdmin]);

  // Gran Total de Gastos y Utilidad Neta
  const granTotalGastos = totalGastosChofer + totalGastosAdmin;
  const utilidadNeta = granTotalIngresos - granTotalGastos;
  const margenPct = granTotalIngresos > 0 ? ((utilidadNeta / granTotalIngresos) * 100).toFixed(2) : '0.00';
  const saldoRendirChofer = totalIngresosChofer - totalGastosChofer;

  // Filtrado de gastos de chofer en vista
  const gastosChoferFiltrados = useMemo(() => {
    if (filtroGastoChofer === 'todos') return gastosChofer;
    if (filtroGastoChofer === 'diesel') {
      return gastosChofer.filter(g => g.categoriaGasto?.toLowerCase().includes('combustible') || g.categoriaGasto?.toLowerCase().includes('diésel') || g.categoriaGasto?.toLowerCase().includes('diesel'));
    }
    if (filtroGastoChofer === 'peajes') {
      return gastosChofer.filter(g => g.categoriaGasto?.toLowerCase().includes('peaje') || g.categoriaGasto?.toLowerCase().includes('viático') || g.categoriaGasto?.toLowerCase().includes('balanza'));
    }
    if (filtroGastoChofer === 'talleres') {
      return gastosChofer.filter(g => g.categoriaGasto?.toLowerCase().includes('mecán') || g.categoriaGasto?.toLowerCase().includes('taller') || g.categoriaGasto?.toLowerCase().includes('llant') || g.categoriaGasto?.toLowerCase().includes('repuesto'));
    }
    if (filtroGastoChofer === 'ingresos') {
      return gastosChofer.filter(g => g.tipoOperacion === 'Ingreso' || g.categoriaGasto?.toLowerCase().includes('anticipo') || g.categoriaGasto?.toLowerCase().includes('ingreso'));
    }
    return gastosChofer;
  }, [gastosChofer, filtroGastoChofer]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !viaje) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#e2e8f0] w-full max-w-5xl rounded-[20px] shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="px-5 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1d4ed8] flex items-center justify-center shrink-0 shadow-sm border border-blue-200">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-blue-50 text-[#1d4ed8] px-2 py-0.5 rounded border border-blue-200">
                  {viaje.idViaje}
                </span>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Liquidación de Ruta • Camión {viaje.placaCamion}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  viaje.estadoViaje === 'Liquidado / Cerrado'
                    ? 'bg-emerald-100 text-[#16a34a] border border-emerald-200'
                    : 'bg-blue-100 text-[#1d4ed8] border border-blue-200'
                }`}>
                  {viaje.estadoViaje}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chofer: <strong className="text-slate-700">{viaje.choferAsignado}</strong> • Salida: {viaje.fechaSalida} • Llegada: {viaje.fechaLlegada || 'En curso'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={cargarDatos}
              disabled={isLoadingBackend}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-[#e2e8f0] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 min-h-[38px]"
              title="Recargar y sincronizar con Google Sheets"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#1d4ed8] ${isLoadingBackend ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-[#e2e8f0] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm min-h-[38px]"
              title="Imprimir / Exportar a PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Imprimir PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* RESUMEN FINANCIERO CONSOLIDADO (KPI CARDS) */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/70 border-b border-[#e2e8f0] shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-left">
            
            {/* Total Ingresos */}
            <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-0.5">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#1d4ed8]" />
                  Total Ingresos
                </span>
                <span className="text-[9px] font-mono bg-blue-50 text-[#1d4ed8] px-1 rounded">Fletes + Admin</span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Bs {granTotalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between mt-0.5">
                <span>MIC: Bs {totalFletes.toLocaleString('es-BO')}</span>
                <span>Admin: Bs {totalIngresosAdmin.toLocaleString('es-BO')}</span>
              </div>
            </div>

            {/* Gran Total Gastos */}
            <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-0.5">
                <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-[#dc2626]" />
                  (-) Gran Total Gastos
                </span>
                <span className="text-[9px] font-mono bg-rose-50 text-rose-700 px-1 rounded">Chofer + Admin</span>
              </div>
              <div className="text-base sm:text-lg font-black text-[#dc2626] tracking-tight">
                -Bs {granTotalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between mt-0.5">
                <span>Chofer: Bs {totalGastosChofer.toLocaleString('es-BO')}</span>
                <span>Admin: Bs {totalGastosAdmin.toLocaleString('es-BO')}</span>
              </div>
            </div>

            {/* Utilidad Neta & Margen */}
            <div className={`p-3 rounded-xl border shadow-xs ${
              utilidadNeta >= 0 ? 'bg-emerald-50/80 border-emerald-200' : 'bg-red-50/80 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[11px] font-bold flex items-center gap-1 ${
                  utilidadNeta >= 0 ? 'text-[#16a34a]' : 'text-red-700'
                }`}>
                  <DollarSign className="w-3.5 h-3.5" />
                  = Utilidad Neta
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  utilidadNeta >= 0 ? 'bg-emerald-200/80 text-emerald-800' : 'bg-red-200 text-red-800'
                }`}>
                  Margen: {margenPct}%
                </span>
              </div>
              <div className={`text-base sm:text-lg font-black tracking-tight ${
                utilidadNeta >= 0 ? 'text-[#16a34a]' : 'text-red-700'
              }`}>
                Bs {utilidadNeta.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                Rendimiento operativo neto de la unidad
              </div>
            </div>

            {/* Saldo a Rendir por el Chofer */}
            <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-0.5">
                <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-amber-600" />
                  Saldo a Rendir (Chofer)
                </span>
                <span className={`text-[9px] font-bold px-1 rounded ${
                  saldoRendirChofer >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {saldoRendirChofer >= 0 ? 'En Mano Chofer' : 'Por Reembolsar'}
                </span>
              </div>
              <div className={`text-base sm:text-lg font-black tracking-tight ${
                saldoRendirChofer >= 0 ? 'text-slate-900' : 'text-amber-700'
              }`}>
                Bs {Math.abs(saldoRendirChofer).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                {saldoRendirChofer > 0
                  ? 'A favor empresa (devolver excedente)'
                  : saldoRendirChofer < 0
                  ? 'A favor chofer (empresa debe reintegrar)'
                  : 'Cuentas cuadradas (saldo Bs 0)'}
              </div>
            </div>

          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="px-5 pt-3 pb-2 bg-white border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('consolidado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'consolidado'
                  ? 'bg-white text-slate-900 shadow-xs border border-[#e2e8f0]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#1d4ed8]" />
              <span>Consolidado (3 Bloques)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ingresos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'ingresos'
                  ? 'bg-white text-[#16a34a] shadow-xs border border-[#e2e8f0]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#16a34a]" />
              <span>Bloque 1: Ingresos</span>
              <span className="text-[10px] font-mono bg-emerald-50 text-[#16a34a] px-1.5 py-0.2 rounded-full border border-emerald-200">
                Bs {granTotalIngresos.toLocaleString('es-BO')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gastos_chofer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'gastos_chofer'
                  ? 'bg-white text-[#dc2626] shadow-xs border border-[#e2e8f0]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Fuel className="w-3.5 h-3.5 text-[#dc2626]" />
              <span>Bloque 2: Gastos Chofer</span>
              <span className="text-[10px] font-mono bg-rose-50 text-[#dc2626] px-1.5 py-0.2 rounded-full border border-rose-200">
                Bs {totalGastosChofer.toLocaleString('es-BO')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-white text-purple-700 shadow-xs border border-[#e2e8f0]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-purple-600" />
              <span>Bloque 3: Transacciones Admin</span>
              <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded-full border border-purple-200">
                Bs {totalGastosAdmin.toLocaleString('es-BO')}
              </span>
            </button>
          </div>

          {/* Botones de acción rápida para agregar datos vinculados */}
          <div className="flex items-center gap-2">
            {onOpenGastoModal && (
              <button
                type="button"
                onClick={() => onOpenGastoModal(viaje.idViaje)}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1d4ed8] rounded-lg text-xs font-bold border border-blue-200 flex items-center gap-1 shadow-xs transition-colors"
              >
                <Fuel className="w-3.5 h-3.5" />
                <span>+ Gasto Chofer</span>
              </button>
            )}

            {onOpenTransaccionModal && (
              <button
                type="button"
                onClick={() => onOpenTransaccionModal(viaje.idViaje)}
                className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 flex items-center gap-1 shadow-xs transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>+ Transacción Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* CONTENIDO SCROLLEABLE DE LOS BLOQUES */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          
          {/* ========================================================= */}
          {/* BLOQUE 1: INGRESOS DEL VIAJE                             */}
          {/* ========================================================= */}
          {(activeTab === 'consolidado' || activeTab === 'ingresos') && (
            <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e2e8f0] gap-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#16a34a] flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-800">
                      BLOQUE 1: INGRESOS DEL VIAJE
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Fletes de Manifiestos MIC, encomiendas de destino y anticipos inyectados
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Total Ingresos Bloque 1</span>
                  <span className="text-base sm:text-lg font-black text-[#16a34a]">
                    Bs {granTotalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Sub-tabla 1A: Manifiestos de Carga (MIC) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    Fletes y Manifiestos de Carga MIC ({manifiestosDelViaje.length})
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Subtotal Fletes: Bs {totalFletes.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {manifiestosDelViaje.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-[#e2e8f0] rounded-xl text-xs text-slate-500 text-center">
                    No se registran manifiestos maestros MIC para este viaje.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                        <tr>
                          <th className="py-2 px-3">Nro. Manifiesto / MIC</th>
                          <th className="py-2 px-3">Sucursal Origen</th>
                          <th className="py-2 px-3 text-center">Estado</th>
                          <th className="py-2 px-3 text-right">Flete Total</th>
                          <th className="py-2 px-3 text-right">
                            <div>Cobrado Origen</div>
                            <span className="block text-[9px] font-normal text-amber-700">Por Liquidar a Central (CxC)</span>
                          </th>
                          <th className="py-2 px-3 text-right">Saldo Destino</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]">
                        {manifiestosDelViaje.map((m) => (
                          <tr key={m.idManifiesto} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">
                              {m.nroManifiestoMIC}
                              <span className="text-[10px] text-slate-400 block font-sans">{m.fechaEmision}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-700 font-medium">
                              {m.sucursalOrigen}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#1d4ed8]">
                                {m.estadoManifiesto}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-black text-slate-800">
                              Bs {Number(m.fleteTotalBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-[#16a34a]">
                              <div>Bs {Number(m.cobradoOrigenBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</div>
                              {Number(m.cobradoOrigenBs || 0) > 0 && (
                                <span className="inline-block text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 mt-0.5">
                                  Por Liquidar a Central (CxC)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-[#dc2626]">
                              Bs {Number(m.saldoCobrarDestinosBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Sub-tabla 1B: Sub-manifiestos / Encomiendas Destino (si existen) */}
              {subManifiestosDelViaje.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[#16a34a]" />
                      Sub-Manifiestos y Encomiendas de Destino ({subManifiestosDelViaje.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Cobrado Destino: Bs {subManifiestosDelViaje.reduce((acc, s) => acc + (s.cobrosRealizadosBs || 0), 0).toLocaleString('es-BO')}
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl max-h-48">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                        <tr>
                          <th className="py-2 px-3">Sub-Manifiesto</th>
                          <th className="py-2 px-3">Destino / Cliente</th>
                          <th className="py-2 px-3">Responsable</th>
                          <th className="py-2 px-3 text-right">Flete Total</th>
                          <th className="py-2 px-3 text-right">Cobrado</th>
                          <th className="py-2 px-3 text-right text-amber-700">👤 Saldo Cliente</th>
                          <th className="py-2 px-3 text-right text-purple-700">🏢 Saldo Agencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]">
                        {subManifiestosDelViaje.map((s) => {
                          const saldos = calcularSaldosSubManifiesto(s);
                          const flete = saldos.fleteTotal;
                          const cobrado = saldos.pagadoOrigen + saldos.cobrosRealizados;
                          return (
                            <tr key={s.idSubManifiesto} className="hover:bg-slate-50/80">
                              <td className="py-1.5 px-3 font-mono font-bold text-slate-800">
                                {s.nroManifiesto}
                              </td>
                              <td className="py-1.5 px-3 text-slate-700">
                                <span className="font-semibold">{s.sucursalDestino}</span>
                                {s.destinatario && <span className="text-[10px] text-slate-500 block">Para: {s.destinatario}</span>}
                              </td>
                              <td className="py-1.5 px-3">
                                {saldos.esResponsableAgencia ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
                                    🏢 Agencia
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                    👤 Cliente
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-3 text-right font-medium text-slate-800 tabular-nums">
                                Bs {flete.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold text-[#16a34a] tabular-nums">
                                Bs {cobrado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold tabular-nums">
                                <span className={saldos.saldoPendienteCliente > 0 ? 'text-amber-700 font-extrabold' : 'text-slate-400 font-normal'}>
                                  Bs {saldos.saldoPendienteCliente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold tabular-nums">
                                <span className={saldos.saldoPendienteAgencia > 0 ? 'text-purple-700 font-extrabold' : 'text-slate-400 font-normal'}>
                                  Bs {saldos.saldoPendienteAgencia.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tabla 1C: Ingresos Extraordinarios registrados por el Admin */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    Ingresos Extraordinarios Admin / Central ({ingresosAdmin.length})
                  </span>
                  <span className="text-[11px] font-bold text-purple-700">
                    Total: Bs {totalIngresosAdmin.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {ingresosAdmin.length === 0 ? (
                  <div className="p-2.5 bg-slate-50 border border-[#e2e8f0] rounded-xl text-xs text-slate-400 text-center italic">
                    Sin ingresos extraordinarios registrados por el Administrador para este viaje.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                        <tr>
                          <th className="py-2 px-3">Fecha</th>
                          <th className="py-2 px-3">Categoría</th>
                          <th className="py-2 px-3">Detalle / Notas</th>
                          <th className="py-2 px-3">Método / Caja</th>
                          <th className="py-2 px-3 text-right">Monto (Bs.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]">
                        {ingresosAdmin.map((t) => (
                          <tr key={t.idTransaccion} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-mono text-slate-600">{t.fecha}</td>
                            <td className="py-2 px-3 font-semibold text-purple-700">{t.categoria}</td>
                            <td className="py-2 px-3 text-slate-700">{t.notas || 'Sin detalle'}</td>
                            <td className="py-2 px-3 text-slate-600">{t.metodoPago}</td>
                            <td className="py-2 px-3 text-right font-black text-[#16a34a]">
                              +Bs {Number(t.monto || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* BLOQUE 2: GASTOS DE RUTA (CHOFER)                        */}
          {/* ========================================================= */}
          {(activeTab === 'consolidado' || activeTab === 'gastos_chofer') && (
            <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e2e8f0] gap-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-[#dc2626] flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-800">
                      BLOQUE 2: GASTOS DE RUTA (CHOFER)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Combustible (diésel), peajes, balanzas, viáticos, estibadores y reparaciones en ruta
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Total Gastos Chofer</span>
                  <span className="text-base sm:text-lg font-black text-[#dc2626]">
                    -Bs {totalGastosChofer.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Filtro rápido por tipo de gasto chofer */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-bold mr-1">Filtrar:</span>
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'diesel', label: 'Diésel' },
                  { id: 'peajes', label: 'Peajes / Viáticos' },
                  { id: 'talleres', label: 'Talleres / Llantería' },
                  { id: 'ingresos', label: 'Anticipos Chofer' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroGastoChofer(f.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      filtroGastoChofer === f.id
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {gastosChoferFiltrados.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-[#e2e8f0] rounded-xl text-xs text-slate-500 text-center">
                  No se registran gastos de chofer con el filtro seleccionado.
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                      <tr>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Categoría</th>
                        <th className="py-2.5 px-3">Detalle / Glosa</th>
                        <th className="py-2.5 px-3">Proveedor / Factura</th>
                        <th className="py-2.5 px-3">Caja / Origen</th>
                        <th className="py-2.5 px-3 text-right">Importe (Bs.)</th>
                        <th className="py-2.5 px-2 text-center">Doc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {gastosChoferFiltrados.map((g) => {
                        const isIngreso = g.tipoOperacion === 'Ingreso' || g.categoriaGasto?.toLowerCase().includes('anticipo') || g.categoriaGasto?.toLowerCase().includes('ingreso');
                        return (
                          <tr key={g.idGastoRuta} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {g.fechaHora}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                              {g.categoriaGasto}
                              {g.litrosDiesel ? (
                                <span className="ml-1.5 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                                  {g.litrosDiesel} L
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 px-3 text-slate-700 max-w-xs">
                              {g.detalleGasto || 'Sin glosa'}
                            </td>
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                              {g.nombreProveedor ? (
                                <span className="font-semibold text-blue-700 block">{g.nombreProveedor}</span>
                              ) : null}
                              <span className="text-[10px] text-slate-400">
                                Fac/Ticket: {g.nroFacturaBoleta || 'S/N'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 font-medium">
                                {g.cajaCuentaUtilizada || 'Efectivo Chofer'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right whitespace-nowrap">
                              <span className={`font-black text-xs sm:text-sm ${
                                isIngreso ? 'text-[#16a34a]' : 'text-[#dc2626]'
                              }`}>
                                {isIngreso ? '+' : '-'}Bs {Number(g.importeBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              {g.comprobanteFotoUrl && onVerComprobante ? (
                                <button
                                  type="button"
                                  onClick={() => onVerComprobante(g.comprobanteFotoUrl!)}
                                  className="p-1 text-[#1d4ed8] hover:bg-blue-50 rounded"
                                  title="Ver Comprobante"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* BLOQUE 3: TRANSACCIONES EXTRAORDINARIAS (ADMIN / PROPIETARIO) */}
          {/* ========================================================= */}
          {(activeTab === 'consolidado' || activeTab === 'admin') && (
            <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e2e8f0] gap-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-800">
                      BLOQUE 3: TRANSACCIONES EXTRAORDINARIAS (ADMINISTRADOR / PROPIETARIO)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Repuestos mayores, mantenimiento pagado por banco central, anticipos extraordinarios y seguros
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Total Gastos Admin</span>
                  <span className="text-base sm:text-lg font-black text-purple-700">
                    -Bs {totalGastosAdmin.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {transaccionesAdmin.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-[#e2e8f0] rounded-xl text-xs text-slate-500 text-center">
                  <p className="font-semibold text-slate-600">No hay transacciones extraordinarias registradas para este viaje.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Las operaciones que el administrador registre en Finanzas Diarias vinculadas al ID de Viaje o camión aparecerán automáticamente aquí.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                      <tr>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Categoría</th>
                        <th className="py-2.5 px-3">Detalle / Notas</th>
                        <th className="py-2.5 px-3">Método de Pago / Banco</th>
                        <th className="py-2.5 px-3 text-right">Monto (Bs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {transaccionesAdmin.map((t) => (
                        <tr key={t.idTransaccion} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {t.fecha}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-800 block">{t.categoria}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              t.tipo === 'Ingreso' ? 'bg-emerald-100 text-[#16a34a]' : 'bg-rose-100 text-[#dc2626]'
                            }`}>
                              {t.tipo}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 max-w-sm">
                            <p className="font-medium">{t.notas || 'Sin descripción'}</p>
                            {t.proveedor && (
                              <span className="text-[10px] text-purple-700 font-bold block mt-0.5">
                                Proveedor / Taller: {t.proveedor}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                              <Wallet className="w-3 h-3 text-purple-600" />
                              {t.metodoPago || 'Banco Central'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className={`font-black text-xs sm:text-sm ${
                              t.tipo === 'Ingreso' ? 'text-[#16a34a]' : 'text-[#dc2626]'
                            }`}>
                              {t.tipo === 'Ingreso' ? '+' : '-'}Bs {Number(t.monto || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
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

          {/* BALANCE Y FIRMAS DE LIQUIDACIÓN PARA IMPRESIÓN */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 text-xs text-slate-600 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between font-bold border-b border-[#e2e8f0] pb-2 text-slate-700">
              <span>Resumen de Cierre de Viaje</span>
              <span className="font-mono text-[#1d4ed8]">TranspoDrive Carga Pesada • Sistema Integrado</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center pt-1">
              <div className="p-2.5 bg-white rounded-lg border border-[#e2e8f0]">
                <span className="text-[10px] text-slate-400 block font-bold">1. Ingresos Generales</span>
                <span className="text-sm font-black text-[#16a34a]">Bs {granTotalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-[#e2e8f0]">
                <span className="text-[10px] text-slate-400 block font-bold">2. Gastos Totales (Chofer + Admin)</span>
                <span className="text-sm font-black text-[#dc2626]">-Bs {granTotalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-[#e2e8f0]">
                <span className="text-[10px] text-slate-400 block font-bold">3. Utilidad Neta Consolidada</span>
                <span className="text-sm font-black text-[#1d4ed8]">Bs {utilidadNeta.toLocaleString('es-BO', { minimumFractionDigits: 2 })} ({margenPct}%)</span>
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER MODAL */}
        <div className="px-5 py-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Fusión en tiempo real: <strong className="text-slate-700">Gastos Chofer ({gastosChofer.length})</strong> + <strong className="text-slate-700">Transacciones Admin ({transaccionesAdmin.length})</strong>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-[#e2e8f0] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs min-h-[38px]"
            >
              <Printer className="w-3.5 h-3.5 text-[#1d4ed8]" />
              <span>Imprimir Liquidación</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-blue-600/20 min-h-[38px]"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
