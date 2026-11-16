import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  ArrowRightLeft, 
  Calendar, 
  Tag, 
  Trash2, 
  Edit3, 
  Bell, 
  PieChart, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Receipt, 
  Search, 
  Filter,
  DollarSign,
  PlusCircle,
  FolderPlus,
  Building2,
  Percent,
  Printer,
  Store,
  UserCheck,
  User,
  Truck,
  MapPin,
  Briefcase
} from 'lucide-react';
import { 
  TransaccionDiaria, 
  CategoriaFinanciera, 
  PresupuestoMensual, 
  RecordatorioRecurrente, 
  Catalogos,
  Viaje,
  DatosEmpresa
} from '../types';
import { TransactionReceiptModal } from './TransactionReceiptModal';

interface FinanzasDiariasViewProps {
  transacciones: TransaccionDiaria[];
  categorias: CategoriaFinanciera[];
  presupuestos: PresupuestoMensual[];
  recordatorios: RecordatorioRecurrente[];
  catalogos: Catalogos;
  viajes?: Viaje[];
  empresa?: DatosEmpresa;
  onOpenTransaccionModal: (tipo: 'Ingreso' | 'Gasto') => void;
  onOpenTraspasoModal: () => void;
  onDeleteTransaccion: (id: string) => void;
  onEditTransaccion?: (tx: TransaccionDiaria) => void;
  onAddCategoria: (cat: Omit<CategoriaFinanciera, 'id' | 'esPredefinida'>) => void;
  onDeleteCategoria: (id: string) => void;
  onSetPresupuesto: (categoria: string, monto: number, mesAno: string) => void;
  onAddRecordatorio: (rec: Omit<RecordatorioRecurrente, 'id'>) => void;
  onDeleteRecordatorio: (id: string) => void;
  onVerComprobante: (fotoUrl: string) => void;
}

export const FinanzasDiariasView: React.FC<FinanzasDiariasViewProps> = ({
  transacciones,
  categorias,
  presupuestos,
  recordatorios,
  catalogos,
  viajes = [],
  empresa,
  onOpenTransaccionModal,
  onOpenTraspasoModal,
  onDeleteTransaccion,
  onEditTransaccion,
  onAddCategoria,
  onDeleteCategoria,
  onSetPresupuesto,
  onAddRecordatorio,
  onDeleteRecordatorio,
  onVerComprobante
}) => {
  const [subTab, setSubTab] = useState<'transacciones' | 'presupuestos' | 'recordatorios'>('transacciones');

  // Filtros de transacciones
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('este_mes');
  const [filtroMes, setFiltroMes] = useState<string>(new Date().toISOString().substring(0, 7));
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('Todos');
  const [filtroCentroCosto, setFiltroCentroCosto] = useState<string>('Todos');
  const [filtroViaje, setFiltroViaje] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [selectedTxToPrint, setSelectedTxToPrint] = useState<TransaccionDiaria | null>(null);
  const [txToDelete, setTxToDelete] = useState<TransaccionDiaria | null>(null);

  // Modales locales para añadir Categoría, Presupuesto o Recordatorio
  const [showCatModal, setShowCatModal] = useState<boolean>(false);
  const [nuevaCatNombre, setNuevaCatNombre] = useState<string>('');
  const [nuevaCatTipo, setNuevaCatTipo] = useState<'Ingreso' | 'Gasto'>('Gasto');
  const [nuevaCatColor, setNuevaCatColor] = useState<string>('#3b82f6');

  const [showPresupuestoModal, setShowPresupuestoModal] = useState<boolean>(false);
  const [presupuestoCat, setPresupuestoCat] = useState<string>('');
  const [presupuestoMonto, setPresupuestoMonto] = useState<string>('');
  const [presupuestoMesAno, setPresupuestoMesAno] = useState<string>('2026-10');

  const [showRecModal, setShowRecModal] = useState<boolean>(false);
  const [recTitulo, setRecTitulo] = useState<string>('');
  const [recMonto, setRecMonto] = useState<string>('');
  const [recTipo, setRecTipo] = useState<'Ingreso' | 'Gasto'>('Gasto');
  const [recCategoria, setRecCategoria] = useState<string>('');
  const [recFrecuencia, setRecFrecuencia] = useState<'Diario' | 'Semanal' | 'Quincenal' | 'Mensual' | 'Anual'>('Mensual');
  const [recFecha, setRecFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [recMetodo, setRecMetodo] = useState<string>(catalogos.cajasCuentas[0] || 'Cuenta Bancaria Central');
  const [recNotas, setRecNotas] = useState<string>('');

  // Fechas de referencia
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // Fecha de inicio efectiva para cálculo de Saldo Anterior
  const fechaInicioEfectiva = React.useMemo(() => {
    if (filtroPeriodo === 'hoy') return todayStr;
    if (filtroPeriodo === 'esta_semana') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    }
    if (filtroPeriodo === 'este_mes') return `${currentMonthStr}-01`;
    if (filtroPeriodo === 'mensual') return filtroMes ? `${filtroMes}-01` : null;
    if (filtroPeriodo === 'rango_fechas') return fechaDesde || null;
    return null;
  }, [filtroPeriodo, filtroMes, fechaDesde, todayStr, currentMonthStr]);

  // Saldo Anterior Acumulado previo a la fecha de inicio del filtro
  const saldoAnterior = React.useMemo(() => {
    if (!fechaInicioEfectiva) return 0;
    return transacciones
      .filter(t => t.fecha < fechaInicioEfectiva)
      .reduce((acc, t) => {
        if (filtroMetodo !== 'Todos') {
          if (t.tipo === 'Ingreso' && t.metodoPago === filtroMetodo) return acc + t.montoBs;
          if (t.tipo === 'Gasto' && t.metodoPago === filtroMetodo) return acc - t.montoBs;
          if (t.tipo === 'Traspaso') {
            if (t.cuentaDestino === filtroMetodo) return acc + t.montoBs;
            if (t.metodoPago === filtroMetodo) return acc - t.montoBs;
          }
          return acc;
        }
        if (t.tipo === 'Ingreso') return acc + t.montoBs;
        if (t.tipo === 'Gasto') return acc - t.montoBs;
        return acc;
      }, 0);
  }, [transacciones, fechaInicioEfectiva, filtroMetodo]);

  // Filtrado de transacciones
  const filteredTx = transacciones.filter(tx => {
    if (filtroTipo !== 'Todos' && tx.tipo !== filtroTipo) return false;
    if (filtroCategoria !== 'Todas' && tx.categoria !== filtroCategoria) return false;
    if (filtroMetodo !== 'Todos' && tx.metodoPago !== filtroMetodo && tx.cuentaDestino !== filtroMetodo) return false;
    if (filtroCentroCosto !== 'Todos' && tx.placaCamion !== filtroCentroCosto) return false;
    if (filtroViaje !== 'Todos' && tx.idViaje !== filtroViaje) return false;

    if (filtroPeriodo === 'hoy' && tx.fecha !== todayStr) return false;
    if (filtroPeriodo === 'este_mes' && !tx.fecha.startsWith(currentMonthStr)) return false;
    if (filtroPeriodo === 'mensual' && filtroMes && !tx.fecha.startsWith(filtroMes)) return false;
    if (filtroPeriodo === 'rango_fechas') {
      if (fechaDesde && tx.fecha < fechaDesde) return false;
      if (fechaHasta && tx.fecha > fechaHasta) return false;
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const matchNota = tx.notas.toLowerCase().includes(q);
      const matchCat = tx.categoria.toLowerCase().includes(q);
      const matchMetodo = tx.metodoPago.toLowerCase().includes(q);
      const matchCamion = tx.placaCamion?.toLowerCase().includes(q);
      const matchProv = tx.nombreProveedor?.toLowerCase().includes(q);
      const matchCli = (tx.nombreCliente || tx.deudorNombre)?.toLowerCase().includes(q);
      const matchSuc = tx.sucursal?.toLowerCase().includes(q);
      const matchViaje = tx.idViaje?.toLowerCase().includes(q);
      if (!matchNota && !matchCat && !matchMetodo && !matchCamion && !matchProv && !matchCli && !matchSuc && !matchViaje) return false;
    }

    return true;
  });

  // Totales
  const totalIngresos = filteredTx
    .filter(t => t.tipo === 'Ingreso' || (t.tipo === 'Traspaso' && filtroMetodo !== 'Todos' && t.cuentaDestino === filtroMetodo))
    .reduce((sum, t) => sum + t.montoBs, 0);

  const totalGastos = filteredTx
    .filter(t => t.tipo === 'Gasto' || (t.tipo === 'Traspaso' && filtroMetodo !== 'Todos' && t.metodoPago === filtroMetodo))
    .reduce((sum, t) => sum + t.montoBs, 0);

  const balanceNeto = totalIngresos - totalGastos;
  const saldoFinal = saldoAnterior + balanceNeto;

  // Manejo de nueva categoría
  const handleSaveCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCatNombre.trim()) return;
    onAddCategoria({
      nombre: nuevaCatNombre.trim(),
      tipo: nuevaCatTipo,
      icono: 'Tag',
      color: nuevaCatColor
    });
    setNuevaCatNombre('');
    setShowCatModal(false);
  };

  // Manejo de nuevo presupuesto
  const handleSavePresupuesto = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(presupuestoMonto);
    if (!presupuestoCat || isNaN(monto) || monto <= 0) return;
    onSetPresupuesto(presupuestoCat, monto, presupuestoMesAno);
    setPresupuestoMonto('');
    setShowPresupuestoModal(false);
  };

  // Manejo de nuevo recordatorio
  const handleSaveRecordatorio = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(recMonto);
    if (!recTitulo || isNaN(monto) || monto <= 0) return;
    onAddRecordatorio({
      titulo: recTitulo,
      montoBs: monto,
      tipo: recTipo,
      categoria: recCategoria || categorias.find(c => c.tipo === recTipo)?.nombre || 'Varios',
      frecuencia: recFrecuencia,
      proximaFecha: recFecha,
      metodoPago: recMetodo,
      activo: true,
      notas: recNotas
    });
    setRecTitulo('');
    setRecMonto('');
    setShowRecModal(false);
  };

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Top Banner de Finanzas Diarias */}
      <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-blue-50 text-[#1d4ed8] rounded-xl border border-blue-100">
                <Wallet className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Finanzas y Gastos Diarios
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Controla tus ingresos y gastos en un solo lugar, crea presupuestos mensuales, administra métodos de pago y establece recordatorios recurrentes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenTransaccionModal('Gasto')}
              className="bg-[#dc2626] hover:bg-red-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-red-500/20 transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Gasto</span>
            </button>
            <button
              onClick={() => onOpenTransaccionModal('Ingreso')}
              className="bg-[#16a34a] hover:bg-green-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-green-600/20 transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Ingreso</span>
            </button>
            <button
              onClick={onOpenTraspasoModal}
              className="bg-[#1d4ed8] hover:bg-blue-800 active:scale-95 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>⇄ Traspaso</span>
            </button>
          </div>
        </div>

        {/* Resumen Superior de Finanzas Diarias */}
        <div className={`grid gap-3 mt-4 pt-4 border-t border-[#e2e8f0] ${
          fechaInicioEfectiva ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-1 sm:grid-cols-3'
        }`}>
          {fechaInicioEfectiva && (
            <div className="bg-[#eff6ff] p-3.5 rounded-xl border border-[#dbeafe] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block truncate">Saldo Anterior Acum.</span>
                <span className={`text-base sm:text-lg font-black ${saldoAnterior >= 0 ? 'text-[#1d4ed8]' : 'text-[#dc2626]'}`}>
                  Bs {saldoAnterior.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">Al {fechaInicioEfectiva}</span>
              </div>
              <div className="p-2 bg-blue-100 text-[#1d4ed8] rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
            </div>
          )}

          <div className="bg-white p-3.5 rounded-xl border border-[#e2e8f0] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">Total Ingresos Periodo</span>
              <span className="text-base sm:text-xl font-black text-[#16a34a]">
                +Bs {totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-50 text-[#16a34a] rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#e2e8f0] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">Total Gastos Periodo</span>
              <span className="text-base sm:text-xl font-black text-[#dc2626]">
                -Bs {totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2.5 bg-rose-50 text-[#dc2626] rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            balanceNeto >= 0 ? 'bg-[#f0fdf4] border-[#dcfce7]' : 'bg-[#fef2f2] border-[#fee2e2]'
          }`}>
            <div>
              <span className="text-[11px] font-bold text-slate-600 block">Saldo del Periodo</span>
              <span className={`text-base sm:text-xl font-black ${balanceNeto >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                Bs {balanceNeto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className={`p-2.5 rounded-xl ${balanceNeto >= 0 ? 'bg-emerald-100 text-[#16a34a]' : 'bg-rose-100 text-[#dc2626]'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {fechaInicioEfectiva && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              saldoFinal >= 0 ? 'bg-[#eff6ff] border-[#bfdbfe]' : 'bg-[#fef2f2] border-[#fee2e2]'
            }`}>
              <div>
                <span className="text-[10px] font-black text-[#1d4ed8] block uppercase">Saldo Total Final</span>
                <span className={`text-base sm:text-xl font-black ${saldoFinal >= 0 ? 'text-[#1d4ed8]' : 'text-[#dc2626]'}`}>
                  Bs {saldoFinal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">Anterior + Periodo</span>
              </div>
              <div className="p-2 bg-blue-100 text-[#1d4ed8] rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-tabs de navegación */}
      <div className="flex items-center space-x-2 border-b border-[#e2e8f0] pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setSubTab('transacciones')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap min-h-[44px] ${
            subTab === 'transacciones'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-[#e2e8f0]'
          }`}
        >
          1. Transacciones Diarias ({filteredTx.length})
        </button>

        <button
          onClick={() => setSubTab('presupuestos')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap min-h-[44px] ${
            subTab === 'presupuestos'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-[#e2e8f0]'
          }`}
        >
          2. Presupuestos Mensuales ({presupuestos.length})
        </button>

        <button
          onClick={() => setSubTab('recordatorios')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
            subTab === 'recordatorios'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-[#e2e8f0]'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>3. Recordatorios Recurrentes ({recordatorios.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: TRANSACCIONES */}
      {subTab === 'transacciones' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
              {/* Búsqueda por texto */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar notas, detalle..."
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                />
              </div>

              {/* Rango de Fecha / Periodo */}
              <div>
                <select
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value)}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                >
                  <option value="este_mes">Mes Actual ({currentMonthStr})</option>
                  <option value="mensual">Filtrado Mensual (Seleccionar Mes)</option>
                  <option value="rango_fechas">Rango entre 2 Fechas (Desde / Hasta)</option>
                  <option value="hoy">Solo Hoy</option>
                  <option value="esta_semana">Últimos 7 días</option>
                  <option value="todos">Todo el Historial</option>
                </select>
              </div>

              {/* Centro de Costo (Camión) */}
              <div>
                <select
                  value={filtroCentroCosto}
                  onChange={(e) => setFiltroCentroCosto(e.target.value)}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                  title="Filtrar por Centro de Costo (Camión / Placa)"
                >
                  <option value="Todos">Todos los Centros de Costo</option>
                  {catalogos.camiones.map(c => (
                    <option key={c.placa} value={c.placa}>{c.placa} - {c.modelo}</option>
                  ))}
                </select>
              </div>

              {/* Viaje en Ruta */}
              <div>
                <select
                  value={filtroViaje}
                  onChange={(e) => setFiltroViaje(e.target.value)}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                  title="Filtrar por ID de Viaje"
                >
                  <option value="Todos">Todos los Viajes</option>
                  {(viajes || []).map(v => (
                    <option key={v.idViaje} value={v.idViaje}>{v.idViaje} ({v.placaCamion})</option>
                  ))}
                </select>
              </div>

              {/* Método de Pago / Caja */}
              <div>
                <select
                  value={filtroMetodo}
                  onChange={(e) => setFiltroMetodo(e.target.value)}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                >
                  <option value="Todos">Todos los Métodos / Cajas</option>
                  {catalogos.cajasCuentas.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                >
                  <option value="Todos">Todos los Tipos</option>
                  <option value="Gasto">Solo Gastos (-)</option>
                  <option value="Ingreso">Solo Ingresos (+)</option>
                  <option value="Traspaso">Solo Traspasos (⇄)</option>
                </select>
              </div>

              {/* Categoría */}
              <div>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                >
                  <option value="Todas">Todas las Categorías</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Inputs adicionales si es mensual o rango de fechas */}
            {filtroPeriodo === 'mensual' && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#e2e8f0] text-xs">
                <span className="text-slate-600 font-semibold">Seleccionar Mes (YYYY-MM):</span>
                <input
                  type="month"
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className="bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-1.5 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[40px]"
                />
              </div>
            )}

            {filtroPeriodo === 'rango_fechas' && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#e2e8f0] text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-semibold">Desde:</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[40px]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-semibold">Hasta:</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[40px]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tabla de Transacciones con 2 Columnas (Ingresos y Gastos) y Totales al Pie */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] shadow-sm overflow-hidden">
            <div className="w-full overflow-x-auto lg:overflow-x-visible">
              <table className="w-full table-auto lg:table-fixed border-collapse min-w-[700px] lg:min-w-0">
                <thead>
                  <tr>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[8%]">
                      Fecha
                    </th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[7%]">
                      Tipo
                    </th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[11%]">
                      Categoría
                    </th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[15%]">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>Cliente / Proveedor</span>
                      </div>
                    </th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[13%]">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Sucursal / Agencia</span>
                      </div>
                    </th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[12%]">
                      Método / Cuenta
                    </th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[13%]">
                      Detalle / Notas
                    </th>
                    <th className="bg-slate-100 text-emerald-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[9%]">
                      Ingresos (Bs)
                    </th>
                    <th className="bg-slate-100 text-rose-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[9%]">
                      Gastos (Bs)
                    </th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-center lg:w-[7%]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        No se encontraron transacciones con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTx.map((tx) => {
                      const isInc = tx.tipo === 'Ingreso';
                      const isGas = tx.tipo === 'Gasto';
                      const isTrf = tx.tipo === 'Traspaso';
                      const ingresoVal = isInc 
                        ? tx.montoBs 
                        : (isTrf && filtroMetodo !== 'Todos' && tx.cuentaDestino === filtroMetodo) 
                        ? tx.montoBs 
                        : null;
                      const gastoVal = isGas 
                        ? tx.montoBs 
                        : (isTrf && filtroMetodo !== 'Todos' && tx.metodoPago === filtroMetodo) 
                        ? tx.montoBs 
                        : null;

                      return (
                        <tr key={tx.idTransaccion} className="hover:bg-slate-50 transition-colors">
                          <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 font-mono whitespace-nowrap text-xs lg:text-sm">
                            {tx.fecha}
                          </td>
                          <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                              isInc ? 'bg-emerald-50 text-[#16a34a] border border-emerald-200' : isTrf ? 'bg-blue-50 text-[#1d4ed8] border border-blue-200' : 'bg-rose-50 text-[#dc2626] border border-rose-200'
                            }`}>
                              {tx.tipo}
                            </span>
                          </td>
                          <td className="text-sm font-semibold text-slate-900 py-3 px-2 lg:px-3 border-b border-slate-200 truncate" title={tx.categoria}>
                            {tx.categoria}
                          </td>

                          {/* Cliente / Proveedor con Iconos */}
                          <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200">
                            {isGas ? (
                              tx.nombreProveedor ? (
                                <div className="flex items-center gap-1.5" title={`Proveedor: ${tx.nombreProveedor}`}>
                                  <Store className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span className="font-semibold text-slate-900 truncate text-xs">{tx.nombreProveedor}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-400" title="Gasto Operativo General">
                                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-xs truncate italic">Operativo General</span>
                                </div>
                              )
                            ) : isInc ? (
                              (tx.nombreCliente || tx.deudorNombre) ? (
                                <div className="flex items-center gap-1.5" title={`Cliente: ${tx.nombreCliente || tx.deudorNombre}`}>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="font-semibold text-slate-900 truncate text-xs">{tx.nombreCliente || tx.deudorNombre}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-400" title="Ingreso General">
                                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-xs truncate italic">Ingreso General</span>
                                </div>
                              )
                            ) : (
                              <div className="flex items-center gap-1.5 text-indigo-600" title="Transferencia Interna">
                                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="text-xs font-semibold truncate">Mov. Interno</span>
                              </div>
                            )}
                          </td>

                          {/* Sucursal / Agencia con Iconos y Camión/Viaje */}
                          <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200">
                            <div className="flex items-center gap-1.5" title={`Sucursal / Agencia: ${tx.sucursal || 'Central'}`}>
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-bold text-slate-800 text-xs truncate">
                                {tx.sucursal || 'Central'}
                              </span>
                            </div>
                            {(tx.placaCamion || tx.idViaje) && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate font-mono">
                                {tx.placaCamion && (
                                  <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded font-bold">
                                    <Truck className="w-3 h-3 text-slate-500 shrink-0" />
                                    {tx.placaCamion}
                                  </span>
                                )}
                                {tx.idViaje && (
                                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-100 px-1 rounded">
                                    {tx.idViaje}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Método de Pago / Cuenta y Modalidad */}
                          <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200">
                            <span className="truncate block font-medium text-xs text-slate-800" title={`${tx.metodoPago}${tx.cuentaDestino ? ` ➔ ${tx.cuentaDestino}` : ''}`}>
                              {tx.metodoPago}
                              {tx.cuentaDestino && <span className="text-slate-400"> ➔ {tx.cuentaDestino}</span>}
                            </span>
                            {tx.modalidadPago === 'Credito' && (
                              <span className="inline-block mt-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-full">
                                Crédito
                              </span>
                            )}
                            {tx.modalidadPago === 'Anticipo_Saldo' && (
                              <span className="inline-block mt-0.5 text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded-full">
                                Mixto
                              </span>
                            )}
                            {tx.modalidadPago === 'Contado' && (
                              <span className="inline-block mt-0.5 text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full">
                                Contado
                              </span>
                            )}
                          </td>

                          {/* Notas / Detalle */}
                          <td className="text-sm font-normal text-slate-600 py-3 px-2 lg:px-3 border-b border-slate-200 truncate" title={tx.notas || ''}>
                            {tx.notas || '-'}
                          </td>
                          
                          {/* Columna 1: Ingresos (Bs) */}
                          <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold whitespace-nowrap text-[#16a34a] bg-emerald-50/20 text-xs lg:text-sm font-mono tabular-nums">
                            {ingresoVal !== null && !isNaN(Number(ingresoVal)) ? `+Bs ${Number(ingresoVal || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                          </td>

                          {/* Columna 2: Gastos (Bs) */}
                          <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold whitespace-nowrap text-[#dc2626] bg-rose-50/20 text-xs lg:text-sm font-mono tabular-nums">
                            {gastoVal !== null && !isNaN(Number(gastoVal)) ? `-Bs ${Number(gastoVal || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                          </td>

                          {/* Acciones Rápidas */}
                          <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {tx.comprobanteFotoUrl && (
                                <button
                                  onClick={() => onVerComprobante(tx.comprobanteFotoUrl!)}
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#1d4ed8] rounded-lg transition-colors border border-blue-200 flex items-center justify-center shadow-xs"
                                  title="Ver Comprobante adjunto"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {onEditTransaccion && (
                                <button
                                  onClick={() => onEditTransaccion(tx)}
                                  className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 rounded-lg transition-colors border border-blue-200 flex items-center justify-center shadow-xs"
                                  title="Editar transacción"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedTxToPrint(tx)}
                                className="p-1.5 text-sky-600 bg-sky-50 hover:bg-sky-100 hover:text-sky-800 rounded-lg transition-colors border border-sky-200 flex items-center justify-center shadow-xs"
                                title="Imprimir Comprobante de Transacción"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setTxToDelete(tx)}
                                className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 rounded-lg transition-colors border border-rose-200 flex items-center justify-center shadow-xs"
                                title="Eliminar transacción"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Fila Inferior de Totales y Saldo Anterior */}
                <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-xs">
                  <tr className="text-slate-600 border-b border-slate-200">
                    <td colSpan={7} className="py-2.5 px-3 text-right font-semibold">
                      <div className="flex items-center justify-end gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#1d4ed8]" />
                        <span>
                          {fechaInicioEfectiva 
                            ? `Saldo Anterior Acumulado (previo al ${fechaInicioEfectiva}):` 
                            : 'Saldo Anterior Acumulado (historial inicial):'}
                        </span>
                      </div>
                    </td>
                    <td colSpan={2} className={`py-2.5 px-3 text-right font-bold text-xs lg:text-sm whitespace-nowrap font-mono tabular-nums ${saldoAnterior >= 0 ? 'text-[#1d4ed8]' : 'text-[#dc2626]'}`}>
                      Bs {saldoAnterior.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3"></td>
                  </tr>

                  <tr className="bg-white text-slate-800 font-bold border-b border-slate-200">
                    <td colSpan={7} className="py-2.5 px-3 text-right uppercase tracking-wider text-xs text-slate-600 font-bold">
                      Suma de Totales del Periodo:
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-xs lg:text-sm text-[#16a34a] bg-emerald-50/50 whitespace-nowrap font-mono tabular-nums">
                      Bs {totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-xs lg:text-sm text-[#dc2626] bg-rose-50/50 whitespace-nowrap font-mono tabular-nums">
                      Bs {totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3"></td>
                  </tr>

                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <td colSpan={7} className="py-2.5 px-3 text-right text-slate-700 font-bold text-xs">
                      Saldo del Periodo (Total Ingresos - Total Gastos):
                    </td>
                    <td colSpan={2} className={`py-2.5 px-3 text-right font-bold text-xs lg:text-sm whitespace-nowrap font-mono tabular-nums ${balanceNeto >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                      {balanceNeto >= 0 ? '+' : ''}Bs {balanceNeto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3"></td>
                  </tr>

                  <tr className="bg-blue-50 text-[#1d4ed8] border-t-2 border-blue-200">
                    <td colSpan={7} className="py-3 px-3 text-right font-bold text-xs uppercase tracking-wider">
                      Saldo Total Final (Saldo Anterior + Saldo del Periodo):
                    </td>
                    <td colSpan={2} className={`py-3 px-3 text-right font-bold text-sm lg:text-base whitespace-nowrap font-mono tabular-nums ${saldoFinal >= 0 ? 'text-[#1d4ed8]' : 'text-[#dc2626]'}`}>
                      Bs {saldoFinal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PRESUPUESTOS MENSUALES */}
      {subTab === 'presupuestos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Presupuestos Mensuales por Categoría</h3>
              <p className="text-xs text-slate-500">Supervisa que tus gastos reales de ruta y agencias no superen el límite</p>
            </div>
            <button
              onClick={() => {
                setPresupuestoCat(categorias.filter(c => c.tipo === 'Gasto')[0]?.nombre || '');
                setShowPresupuestoModal(true);
              }}
              className="bg-[#1d4ed8] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 min-h-[44px]"
            >
              + Fijar Presupuesto
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presupuestos.map((pre) => {
              // Calcular gasto real para esta categoría en el mes
              const gastoReal = transacciones
                .filter(t => t.tipo === 'Gasto' && t.categoria === pre.categoria && t.fecha.startsWith(pre.mesAno))
                .reduce((sum, t) => sum + t.montoBs, 0);

              const porcentaje = pre.montoPresupuestadoBs > 0 ? (gastoReal / pre.montoPresupuestadoBs) * 100 : 0;
              const disponible = pre.montoPresupuestadoBs - gastoReal;
              const sobregirado = disponible < 0;

              return (
                <div key={pre.id} className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{pre.categoria}</span>
                    <span className="text-[10px] text-[#1d4ed8] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 font-mono font-bold">
                      Mes: {pre.mesAno}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Gastado: <strong className="text-slate-800">Bs {gastoReal.toLocaleString('es-BO')}</strong></span>
                      <span className="text-slate-500">Límite: <strong className="text-slate-800">Bs {pre.montoPresupuestadoBs.toLocaleString('es-BO')}</strong></span>
                    </div>

                    <div className="w-full bg-[#f1f5f9] h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          porcentaje >= 100
                            ? 'bg-[#dc2626]'
                            : porcentaje >= 75
                            ? 'bg-amber-500'
                            : 'bg-[#16a34a]'
                        }`}
                        style={{ width: `${Math.min(100, porcentaje)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className={`font-bold ${sobregirado ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
                      {sobregirado
                        ? `Sobregirado por: Bs ${Math.abs(disponible).toLocaleString('es-BO')}`
                        : `Disponible: Bs ${disponible.toLocaleString('es-BO')}`}
                    </span>
                    <span className="text-slate-500 font-bold">{porcentaje.toFixed(1)}%</span>
                  </div>

                  {sobregirado && (
                    <div className="text-[10px] text-[#dc2626] bg-rose-50 p-2 rounded-xl flex items-center gap-1.5 border border-rose-200">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Has superado el presupuesto mensual estimado.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: RECORDATORIOS RECURRENTES */}
      {subTab === 'recordatorios' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Recordatorios de Gastos e Ingresos Recurrentes</h3>
              <p className="text-xs text-slate-500">Seguros SOAT, cuotas bancarias, alquileres de agencias y mantenimientos programados</p>
            </div>
            <button
              onClick={() => {
                setRecCategoria(categorias[0]?.nombre || '');
                setShowRecModal(true);
              }}
              className="bg-[#1d4ed8] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 min-h-[44px]"
            >
              + Nuevo Recordatorio
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recordatorios.map((rec) => (
              <div key={rec.id} className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 space-y-2 text-xs shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{rec.titulo}</span>
                  <span className="bg-blue-50 text-[#1d4ed8] border border-blue-100 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    {rec.frecuencia}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Categoría: <strong className="text-slate-800">{rec.categoria}</strong></span>
                  <span className={`font-black text-sm ${rec.tipo === 'Gasto' ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
                    Bs {rec.montoBs.toLocaleString('es-BO')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-500 pt-1 text-[11px]">
                  <span>Vence: <strong className="text-[#1d4ed8]">{rec.proximaFecha}</strong></span>
                  <span>Pago: {rec.metodoPago}</span>
                </div>

                {rec.notas && (
                  <p className="text-[11px] text-slate-600 italic bg-[#f4f6fa] p-2 rounded-xl">"{rec.notas}"</p>
                )}

                <div className="pt-2 border-t border-[#e2e8f0] flex justify-end space-x-2">
                  <button
                    onClick={() => onDeleteRecordatorio(rec.id)}
                    className="text-slate-400 hover:text-[#dc2626] p-1 text-xs"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Fijar Presupuesto */}
      {showPresupuestoModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-sm rounded-t-[20px] sm:rounded-[18px] p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <h3 className="font-bold text-slate-900 text-sm">Fijar Presupuesto Mensual</h3>
              <button onClick={() => setShowPresupuestoModal(false)} className="p-2 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={handleSavePresupuesto} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Categoría de Gasto *</label>
                <select
                  value={presupuestoCat}
                  onChange={(e) => setPresupuestoCat(e.target.value)}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 min-h-[44px]"
                >
                  {categorias.filter(c => c.tipo === 'Gasto').map(c => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Monto Límite Presupuestado (Bs) *</label>
                <input
                  type="number"
                  step="1"
                  min="10"
                  value={presupuestoMonto}
                  onChange={(e) => setPresupuestoMonto(e.target.value)}
                  placeholder="Ej. 10000"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 font-bold text-[#1d4ed8] min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Mes y Año</label>
                <input
                  type="month"
                  value={presupuestoMesAno}
                  onChange={(e) => setPresupuestoMesAno(e.target.value)}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 min-h-[44px]"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowPresupuestoModal(false)} className="px-3 py-2 text-slate-600 font-semibold min-h-[44px]">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#1d4ed8] text-white font-bold px-4 py-2 rounded-xl shadow-sm min-h-[44px]">
                  Guardar Presupuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Recordatorio */}
      {showRecModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-md rounded-t-[20px] sm:rounded-[18px] p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <h3 className="font-bold text-slate-900 text-sm">Nuevo Recordatorio Recurrente</h3>
              <button onClick={() => setShowRecModal(false)} className="p-2 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={handleSaveRecordatorio} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Título del Recordatorio *</label>
                <input
                  type="text"
                  value={recTitulo}
                  onChange={(e) => setRecTitulo(e.target.value)}
                  placeholder="Ej. Seguro SOAT, Alquiler sucursal..."
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 min-h-[44px]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Monto (Bs) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={recMonto}
                    onChange={(e) => setRecMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 font-bold min-h-[44px]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Frecuencia *</label>
                  <select
                    value={recFrecuencia}
                    onChange={(e) => setRecFrecuencia(e.target.value as any)}
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 min-h-[44px]"
                  >
                    <option value="Diario">Diario</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Fecha Próximo Pago</label>
                  <input
                    type="date"
                    value={recFecha}
                    onChange={(e) => setRecFecha(e.target.value)}
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 min-h-[44px]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Cuenta</label>
                  <select
                    value={recMetodo}
                    onChange={(e) => setRecMetodo(e.target.value)}
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 min-h-[44px]"
                  >
                    {catalogos.cajasCuentas.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Notas Opcionales</label>
                <textarea
                  rows={2}
                  value={recNotas}
                  onChange={(e) => setRecNotas(e.target.value)}
                  placeholder="Detalles sobre contrato o cuenta..."
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 min-h-[44px]"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowRecModal(false)} className="px-3 py-2 text-slate-600 font-semibold min-h-[44px]">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#1d4ed8] text-white font-bold px-4 py-2 rounded-xl shadow-sm min-h-[44px]">
                  Guardar Recordatorio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación de Transacción (100% Funcional sin window.confirm) */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-md rounded-t-[20px] sm:rounded-[18px] shadow-2xl p-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-[#dc2626] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">¿Eliminar Transacción?</h3>
                <p className="text-xs text-[#64748b]">Esta acción revertirá el saldo de caja automáticamente.</p>
              </div>
            </div>

            <div className="bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">ID Transacción:</span>
                <span className="font-mono font-bold text-slate-800">{txToDelete.idTransaccion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Categoría / Concepto:</span>
                <span className="font-bold text-slate-900">{txToDelete.categoria}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monto:</span>
                <span className={`font-black text-sm ${txToDelete.tipo === 'Ingreso' ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                  {txToDelete.tipo === 'Ingreso' ? '+' : '-'}Bs {txToDelete.montoBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Caja / Cuenta:</span>
                <span className="font-semibold text-slate-800">{txToDelete.metodoPago}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha:</span>
                <span className="font-medium text-slate-700">{txToDelete.fecha}</span>
              </div>
              {txToDelete.notas && (
                <div className="pt-1 border-t border-slate-200 text-slate-600">
                  <span className="text-slate-400">Detalle: </span>{txToDelete.notas}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-slate-700 hover:bg-slate-50 font-semibold min-h-[44px] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaccion(txToDelete.idTransaccion);
                  setTxToDelete(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#dc2626] hover:bg-rose-700 text-white font-bold shadow-sm transition-all min-h-[44px] flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar Transacción</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Impresión de Recibo / Comprobante de Transacción */}
      <TransactionReceiptModal
        isOpen={!!selectedTxToPrint}
        onClose={() => setSelectedTxToPrint(null)}
        transaccion={selectedTxToPrint}
        empresa={empresa}
      />
    </div>
  );
};
