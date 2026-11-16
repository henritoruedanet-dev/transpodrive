import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  Truck, 
  AlertTriangle, 
  Fuel, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock,
  Landmark,
  Coins,
  Cloud
} from 'lucide-react';
import { Viaje, ManifiestoOrigen, ManifiestoDestino, GastoRutaCamion, CajaCuenta } from '../types';

interface DashboardViewProps {
  viajes: Viaje[];
  manifiestosOrigen: ManifiestoOrigen[];
  manifiestosDestino: ManifiestoDestino[];
  gastosRuta: GastoRutaCamion[];
  cajas: CajaCuenta[];
  selectedSucursal: string;
  selectedPlaca: string;
  onOpenGastoModal: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  viajes,
  manifiestosOrigen,
  manifiestosDestino,
  gastosRuta,
  cajas,
  selectedSucursal,
  selectedPlaca,
  onOpenGastoModal,
  onNavigateTab
}) => {
  // Filtros transversales
  const filteredViajes = viajes.filter(v => {
    if (selectedPlaca !== 'Todos' && v.placaCamion !== selectedPlaca) return false;
    return true;
  });

  const activeTripIds = new Set(filteredViajes.map(v => v.idViaje));

  const filteredOrigenes = manifiestosOrigen.filter(m => {
    if (selectedPlaca !== 'Todos' && !activeTripIds.has(m.idViajeAsignado)) return false;
    if (selectedSucursal !== 'Todas' && m.sucursalOrigen !== selectedSucursal) return false;
    return true;
  });

  const filteredDestinos = manifiestosDestino.filter(d => {
    if (selectedSucursal !== 'Todas' && d.sucursalDestino !== selectedSucursal) return false;
    return true;
  });

  const filteredGastos = gastosRuta.filter(g => {
    if (selectedPlaca !== 'Todos' && g.placaCamion !== selectedPlaca) return false;
    return true;
  });

  // KPIs Totales Calculados
  const totalFletes = filteredOrigenes.reduce((sum, m) => sum + (m.fleteTotalBs || 0), 0);
  const totalCobradoOrigen = filteredOrigenes.reduce((sum, m) => sum + (m.cobradoOrigenBs || 0), 0);
  const totalPorCobrarDestino = filteredDestinos.reduce((sum, d) => sum + (d.saldoPendienteClienteBs || 0), 0);
  const totalCobradoDestino = filteredDestinos.reduce((sum, d) => sum + (d.cobrosRealizadosBs || 0), 0);
  const totalGastosRuta = filteredGastos.reduce((sum, g) => sum + (g.importeBs || 0), 0);
  
  // Utilidad neta operativa
  const utilidadNetaGlobal = totalFletes - totalGastosRuta;
  const margenGlobal = totalFletes > 0 ? ((utilidadNetaGlobal / totalFletes) * 100).toFixed(1) : '0.0';

  // Gastos desagregados en Diésel y Peajes
  const gastosDiesel = filteredGastos
    .filter(g => g.categoriaGasto.includes('Combustible'))
    .reduce((sum, g) => sum + (g.importeBs || 0), 0);
  const gastosPeajes = filteredGastos
    .filter(g => g.categoriaGasto.includes('Peajes'))
    .reduce((sum, g) => sum + (g.importeBs || 0), 0);
  const totalLitrosDiesel = filteredGastos
    .reduce((sum, g) => sum + (g.litrosDiesel || 0), 0);

  // Arqueo total
  const saldoTotalCajas = cajas.reduce((sum, c) => sum + c.saldoDisponible, 0);

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      {/* Welcome Banner & Filter Indicator (Mobile-First Card) */}
      <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Base de Datos: Google Drive</span>
              </span>
              <span className="text-xs text-slate-500">
                Filtros: <strong className="text-slate-800">{selectedSucursal}</strong> · <strong className="text-slate-800">{selectedPlaca}</strong>
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
              Tablero Ejecutivo de Rendimiento y Recaudaciones
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Control financiero en tiempo real para transporte de carga pesada y encomiendas interprovinciales.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onOpenGastoModal}
              className="w-full sm:w-auto bg-[#1d4ed8] hover:bg-blue-800 active:scale-95 text-white font-extrabold text-xs sm:text-sm px-4 py-3 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 min-h-[44px]"
            >
              <Fuel className="w-4 h-4" />
              <span>Registrar Diésel / Gasto</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP 5 METRIC CARDS (White cards rounded-18px with subtle border #e2e8f0) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Total Fletes Despachados (Azul vibrante #1d4ed8) */}
        <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-[18px] p-4 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Total Fletes</span>
            <div className="p-2 bg-blue-100 text-[#1d4ed8] rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg sm:text-2xl font-black text-[#1d4ed8] tracking-tight">
              Bs {totalFletes.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 flex items-center text-[11px] text-blue-700 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>{filteredOrigenes.length} manifiesto(s) MIC</span>
          </div>
        </div>

        {/* KPI 2: Total Cobrado en Origen (CxC Agencia Origen) */}
        <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Cobrado Origen</span>
            <div className="p-2 bg-emerald-50 text-[#16a34a] rounded-xl">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg sm:text-2xl font-black text-[#16a34a] tracking-tight">
              Bs {totalCobradoOrigen.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-300 w-fit">
              Por Liquidar a Central (CxC)
            </span>
            <span className="text-[10px] text-slate-400 italic">
              (No ingresa a caja de propietario/chofer hasta liquidar)
            </span>
          </div>
        </div>

        {/* KPI 3: Saldo por Cobrar en Destinos (Rojo #dc2626) */}
        <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Por Cobrar Destino</span>
            <div className="p-2 bg-rose-50 text-[#dc2626] rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg sm:text-2xl font-black text-[#dc2626] tracking-tight">
              Bs {totalPorCobrarDestino.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            Cobrado: Bs {totalCobradoDestino.toLocaleString('es-BO')}
          </div>
        </div>

        {/* KPI 4: Gastos Operación Carretera (Rojo #dc2626) */}
        <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Gastos Carretera</span>
            <div className="p-2 bg-rose-50 text-[#dc2626] rounded-xl">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg sm:text-2xl font-black text-[#dc2626] tracking-tight">
              Bs {totalGastosRuta.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            Diésel: Bs {gastosDiesel.toLocaleString('es-BO')} ({totalLitrosDiesel.toFixed(0)} L)
          </div>
        </div>

        {/* KPI 5: Utilidad Neta Global */}
        <div className="col-span-2 lg:col-span-1 bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Utilidad Neta</span>
            <div className="p-2 bg-blue-50 text-[#1d4ed8] rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className={`text-lg sm:text-2xl font-black tracking-tight ${utilidadNetaGlobal >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
              Bs {utilidadNetaGlobal.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-[#1d4ed8] font-bold">Margen: {margenGlobal}%</span>
            <span className="text-slate-400">Fletes - Gastos</span>
          </div>
        </div>
      </div>

      {/* ARQUEO DE CAJAS EN TIEMPO REAL (Celeste suave #eff6ff / White cards) */}
      <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#e2e8f0] gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#1d4ed8]" />
                Arqueo Ejecutivo de Disponibilidad en Cajas y Cuentas
              </h2>
              <span className="text-[10px] font-bold bg-emerald-50 text-[#16a34a] px-2 py-0.5 rounded-full border border-emerald-200">
                En Vivo
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Desglose de liquidez por sucursal, fondos para choferes en ruta y cuenta bancaria central
            </p>
          </div>

          <div className="text-left sm:text-right bg-[#eff6ff] p-2.5 rounded-xl border border-[#dbeafe]">
            <span className="text-xs text-slate-600 font-semibold block">Disponibilidad Total en Mano:</span>
            <p className="text-lg font-black text-[#1d4ed8]">
              Bs {saldoTotalCajas.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Cards Grid de Cajas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
          {cajas.map((caja) => {
            const isNegative = caja.saldoDisponible < 0;
            const isBank = caja.tipo === 'Banco';
            const isDriver = caja.tipo === 'Efectivo Chofer';

            return (
              <div 
                key={caja.nombre}
                className={`p-4 rounded-xl border transition-all ${
                  isNegative
                    ? 'bg-rose-50/70 border-rose-200'
                    : isBank
                    ? 'bg-blue-50/70 border-blue-200'
                    : isDriver
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-[#f8fafc] border-[#e2e8f0] hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      {caja.tipo} • {caja.ubicacion}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-0.5">{caja.nombre}</h3>
                  </div>
                  <div className={`p-2 rounded-xl ${
                    isNegative ? 'bg-rose-100 text-rose-600' : isBank ? 'bg-blue-100 text-[#1d4ed8]' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isBank ? <Landmark className="w-4 h-4" /> : isDriver ? <Truck className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 font-medium">Saldo Disponible:</span>
                  <span className={`text-base sm:text-lg font-black ${
                    isNegative ? 'text-[#dc2626]' : 'text-[#16a34a]'
                  }`}>
                    {isNegative ? `(Bs ${Math.abs(caja.saldoDisponible).toLocaleString('es-BO', { minimumFractionDigits: 2 })})` : `Bs ${caja.saldoDisponible.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
                  </span>
                </div>

                {/* Subdetalles */}
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                  <span>Cobrado: +{caja.totalCobrado.toLocaleString('es-BO')}</span>
                  <span>Gastado: -{caja.totalGastado.toLocaleString('es-BO')}</span>
                </div>

                {isNegative && (
                  <div className="mt-2 text-[10px] text-rose-700 bg-rose-100/80 p-1.5 rounded-lg flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0 text-rose-600" />
                    <span>Fondo chofer sobregirado (reembolso pendiente)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN INFERIOR: RENDIMIENTO POR CAMIÓN / FLOTA Y ACCESOS RÁPIDOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Rendimiento por Camión */}
        <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#1d4ed8]" />
                Rendimiento y Utilidad por Centro de Costos (Camión)
              </h3>
              <p className="text-xs text-slate-500">Comparativa de fletes facturados versus diésel y gastos de peaje</p>
            </div>
            <button
              onClick={() => onNavigateTab('viajes')}
              className="text-xs text-[#1d4ed8] hover:underline font-bold"
            >
              Ver todos →
            </button>
          </div>

          <div className="divide-y divide-[#e2e8f0] mt-3">
            {filteredViajes.map((viaje, idx) => (
              <div key={`${viaje.idViaje}-${idx}`} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-slate-900">{viaje.placaCamion}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      viaje.estadoViaje === 'En Tránsito'
                        ? 'bg-blue-50 text-[#1d4ed8] border border-blue-100'
                        : viaje.estadoViaje === 'En Reparto'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-[#16a34a] border border-emerald-200'
                    }`}>
                      {viaje.estadoViaje}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">({viaje.idViaje})</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">Chofer: <strong className="text-slate-800">{viaje.choferAsignado}</strong></p>
                  <p className="text-[11px] text-slate-500 truncate max-w-md">{viaje.observacionesRuta}</p>
                </div>

                <div className="flex items-center space-x-4 sm:space-x-6 shrink-0 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Fletes</span>
                    <span className="font-bold text-xs text-slate-800">Bs {viaje.fletesManifiestosBs.toLocaleString('es-BO')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Gastos Ruta</span>
                    <span className="font-bold text-xs text-[#dc2626]">-Bs {viaje.gastosRutaBs.toLocaleString('es-BO')}</span>
                  </div>
                  <div className="bg-[#eff6ff] px-3 py-1.5 rounded-xl border border-[#dbeafe]">
                    <span className="text-[10px] text-[#1d4ed8] block font-bold">Utilidad ({viaje.margenPct}%)</span>
                    <span className="font-black text-sm text-[#16a34a]">Bs {viaje.utilidadViajeBs.toLocaleString('es-BO')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones Rápidas & Estado Operativo */}
        <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Accesos Operativos Rápidos</h3>

          <div className="space-y-2.5">
            <button
              onClick={() => onNavigateTab('despachos')}
              className="w-full p-3 rounded-xl bg-[#f8fafc] hover:bg-slate-100 border border-[#e2e8f0] text-left transition-all flex items-center justify-between group min-h-[44px]"
            >
              <div>
                <span className="font-bold text-xs text-[#1d4ed8] group-hover:underline">Despacho en Origen (MIC)</span>
                <p className="text-[11px] text-slate-500">Crear manifiesto y desglosar por agencias</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#1d4ed8]" />
            </button>

            <button
              onClick={() => onNavigateTab('cobranzas')}
              className="w-full p-3 rounded-xl bg-[#f8fafc] hover:bg-slate-100 border border-[#e2e8f0] text-left transition-all flex items-center justify-between group min-h-[44px]"
            >
              <div>
                <span className="font-bold text-xs text-[#16a34a] group-hover:underline">Cobranza y Reparto en Destino</span>
                <p className="text-[11px] text-slate-500">Cobrar saldos, delivery y liquidar sucursal</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#16a34a]" />
            </button>

            <button
              onClick={onOpenGastoModal}
              className="w-full p-3 rounded-xl bg-[#eff6ff] hover:bg-blue-100 border border-[#dbeafe] text-left transition-all flex items-center justify-between group min-h-[44px]"
            >
              <div>
                <span className="font-bold text-xs text-[#1d4ed8] group-hover:underline">+ Registrar Gasto Diésel / Peaje</span>
                <p className="text-[11px] text-slate-500">Captura foto de recibo con cámara offline</p>
              </div>
              <Fuel className="w-4 h-4 text-[#1d4ed8]" />
            </button>

            <button
              onClick={() => onNavigateTab('conector')}
              className="w-full p-3 rounded-xl bg-[#f8fafc] hover:bg-slate-100 border border-[#e2e8f0] text-left transition-all flex items-center justify-between group min-h-[44px]"
            >
              <div>
                <span className="font-bold text-xs text-slate-700 group-hover:underline">Google Drive & Code.gs</span>
                <p className="text-[11px] text-slate-500">Ver script backend y guía de sincronización</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#1d4ed8]" />
            </button>
          </div>

          <div className="bg-[#f8fafc] rounded-xl p-3 border border-[#e2e8f0] text-xs">
            <span className="text-slate-500 block font-semibold mb-1">Estatus del Sistema:</span>
            <div className="flex items-center gap-2 text-[#16a34a] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Conexión normal con hoja de cálculo</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Las operaciones locales se sincronizan automáticamente con Google Sheets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
