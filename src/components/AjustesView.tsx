import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Truck, 
  Users, 
  Wallet, 
  MapPin, 
  Plus, 
  Edit3, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Coins, 
  Landmark, 
  DollarSign, 
  Save, 
  X,
  CreditCard,
  QrCode,
  Phone,
  Search,
  ExternalLink,
  Receipt,
  FileText,
  UserCheck,
  Building2,
  Share2,
  Tag,
  Image as ImageIcon,
  Upload,
  Check,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { 
  Catalogos, 
  CajaCuenta, 
  CamionCentroCosto, 
  Chofer, 
  Cliente, 
  Proveedor,
  CuentaPorPagar,
  ManifiestoDestino, 
  ManifiestoOrigen, 
  Viaje,
  TransaccionDiaria,
  GastoRutaCamion,
  CategoriaFinanciera,
  DatosEmpresa
} from '../types';
import { storage } from '../services/storageService';
import { CuentasCobrarModal } from './CuentasCobrarModal';
import { PanelAuditoriaContable } from './PanelAuditoriaContable';

interface AjustesViewProps {
  catalogos: Catalogos;
  cajas: CajaCuenta[];
  manifiestosDestino?: ManifiestoDestino[];
  manifiestosOrigen?: ManifiestoOrigen[];
  viajes?: Viaje[];
  transacciones?: TransaccionDiaria[];
  gastosRuta?: GastoRutaCamion[];
  categorias?: CategoriaFinanciera[];
  onAddCategoria?: (cat: CategoriaFinanciera) => void;
  empresa?: DatosEmpresa;
  onUpdateEmpresa?: (emp: DatosEmpresa) => void;
  onAddCamion: (camion: CamionCentroCosto) => void;
  onUpdateCamion: (placaOriginal: string, camion: CamionCentroCosto) => void;
  onDeleteCamion: (placa: string) => void;
  onAddChofer: (chofer: Chofer) => void;
  onUpdateChofer: (chofer: Chofer) => void;
  onDeleteChofer: (idChofer: string) => void;
  onAddCajaCuenta: (caja: CajaCuenta) => void;
  onUpdateCajaCuenta: (nombreOriginal: string, caja: CajaCuenta) => void;
  onDeleteCajaCuenta: (nombre: string) => void;
  onAddSucursal: (nombre: string) => void;
  onDeleteSucursal: (nombre: string) => void;
  onAddCliente?: (cliente: Cliente) => void;
  onUpdateCliente?: (cliente: Cliente) => void;
  onDeleteCliente?: (idCliente: string) => void;
  onAddProveedor?: (proveedor: Proveedor) => void;
  onUpdateProveedor?: (proveedor: Proveedor) => void;
  onDeleteProveedor?: (idProveedor: string) => void;
  showToast?: (text: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onDataMutated?: () => void;
}

export const AjustesView: React.FC<AjustesViewProps> = ({
  catalogos,
  cajas,
  manifiestosDestino = [],
  manifiestosOrigen = [],
  viajes = [],
  transacciones = [],
  gastosRuta = [],
  categorias = [],
  onAddCategoria,
  empresa,
  onUpdateEmpresa,
  onAddCamion,
  onUpdateCamion,
  onDeleteCamion,
  onAddChofer,
  onUpdateChofer,
  onDeleteChofer,
  onAddCajaCuenta,
  onUpdateCajaCuenta,
  onDeleteCajaCuenta,
  onAddSucursal,
  onDeleteSucursal,
  onAddCliente,
  onUpdateCliente,
  onDeleteCliente,
  onAddProveedor,
  onUpdateProveedor,
  onDeleteProveedor,
  showToast = () => {},
  onDataMutated = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<'cajas' | 'camiones' | 'choferes' | 'clientes' | 'proveedores' | 'sucursales' | 'categorias' | 'empresa' | 'auditoria'>('cajas');

  // Modales
  const [camionModal, setCamionModal] = useState<{ open: boolean; isEdit: boolean; placaOriginal?: string; data: CamionCentroCosto }>({
    open: false,
    isEdit: false,
    data: { placa: '', modelo: '', choferHabitual: '', capacidadKg: 28000 }
  });

  const [choferModal, setChoferModal] = useState<{ open: boolean; isEdit: boolean; data: Chofer }>({
    open: false,
    isEdit: false,
    data: { idChofer: '', nombre: '', telefono: '', licencia: 'Cat. C', placaAsignada: '', estado: 'Activo' }
  });

  const [cajaModal, setCajaModal] = useState<{ open: boolean; isEdit: boolean; nombreOriginal?: string; data: CajaCuenta }>({
    open: false,
    isEdit: false,
    data: { nombre: '', tipo: 'Caja Sucursal', ubicacion: 'Tarija', saldoInicial: 0, totalCobrado: 0, totalGastado: 0, saldoDisponible: 0 }
  });

  const [sucursalModal, setSucursalModal] = useState<{ open: boolean; nombre: string }>({
    open: false,
    nombre: ''
  });

  // Modal y Estado de Clientes / Cuentas por Cobrar
  const [clienteModal, setClienteModal] = useState<{ open: boolean; isEdit: boolean; data: Cliente }>({
    open: false,
    isEdit: false,
    data: { idCliente: '', nombre: '', telefono: '', direccion: '', ciudad: 'Tarija', nitCi: '', activo: true }
  });

  const [searchCliente, setSearchCliente] = useState<string>('');
  const [filtroClienteSaldo, setFiltroClienteSaldo] = useState<'todos' | 'con_saldo' | 'al_dia'>('todos');
  const [selectedClienteCobranza, setSelectedClienteCobranza] = useState<Cliente | null>(null);
  const [isCuentasCobrarOpen, setIsCuentasCobrarOpen] = useState<boolean>(false);

  // Modal y Estado de Proveedores (Tabla Maestra)
  const [proveedorModal, setProveedorModal] = useState<{ open: boolean; isEdit: boolean; data: Proveedor }>({
    open: false,
    isEdit: false,
    data: { idProveedor: '', nombre: '', telefono: '', direccion: '', rubro: 'Combustible y Diésel', nitCi: '', ciudad: 'Tarija' }
  });
  const [searchProveedor, setSearchProveedor] = useState<string>('');

  // Modal Confirmación de Eliminación In-App
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Print Master Cashbox Report
  const handlePrintAjustes = () => {
    window.print();
  };

  // Estado para Datos de la Empresa
  const [empresaForm, setEmpresaForm] = useState<DatosEmpresa>(() => empresa || storage.getEmpresa());
  const [empresaGuardadaMsg, setEmpresaGuardadaMsg] = useState<boolean>(false);

  // Modal y Filtros para Categorías Financieras
  const [catModal, setCatModal] = useState<{ open: boolean; nombre: string; tipo: 'Ingreso' | 'Gasto'; color: string }>({
    open: false,
    nombre: '',
    tipo: 'Gasto',
    color: '#1d4ed8'
  });
  const [filtroTipoCat, setFiltroTipoCat] = useState<'Todos' | 'Ingreso' | 'Gasto'>('Todos');
  const [searchCat, setSearchCat] = useState<string>('');

  const handleGuardarEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveEmpresa(empresaForm);
    if (onUpdateEmpresa) onUpdateEmpresa(empresaForm);
    setEmpresaGuardadaMsg(true);
    setTimeout(() => setEmpresaGuardadaMsg(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setEmpresaForm(prev => ({ ...prev, logoUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const totalSaldoInicial = cajas.reduce((sum, c) => sum + (Number(c.saldoInicial) || 0), 0);
  const totalCobrado = cajas.reduce((sum, c) => sum + (Number(c.totalCobrado) || 0), 0);
  const totalGastado = cajas.reduce((sum, c) => sum + (Number(c.totalGastado) || 0), 0);
  const totalDisponible = cajas.reduce((sum, c) => sum + (Number(c.saldoDisponible) || 0), 0);

  // Cálculos consolidados para Clientes y Cuentas por Cobrar
  const clientesCalculados = useMemo(() => {
    const list = catalogos.clientes || [];
    return list.map(cli => {
      const subs = manifiestosDestino.filter(
        s => s.destinatario?.toLowerCase().trim() === cli.nombre.toLowerCase().trim()
      );
      const totalFletes = subs.reduce((sum, s) => sum + (s.fleteAsignadoBs || 0), 0);
      const totalPagadoOrigen = subs.reduce((sum, s) => sum + (s.pagadoOrigenBs || 0), 0);
      const totalPorPagarDestino = subs.reduce((sum, s) => {
        const porPagar = s.porPagarDestinoBs !== undefined ? s.porPagarDestinoBs : s.saldoInicialCobrarBs;
        return sum + (porPagar || 0);
      }, 0);
      const totalCobradoDestino = subs.reduce((sum, s) => sum + (s.cobrosRealizadosBs || 0), 0);
      const saldoPendiente = subs.reduce((sum, s) => {
        const saldo = s.saldoPendienteClienteBs !== undefined 
          ? s.saldoPendienteClienteBs 
          : Math.max(0, (s.porPagarDestinoBs ?? s.saldoInicialCobrarBs) - s.cobrosRealizadosBs);
        return sum + (saldo || 0);
      }, 0);

      return {
        ...cli,
        subsCount: subs.length,
        totalFletes,
        totalPagadoOrigen,
        totalPorPagarDestino,
        totalCobradoDestino,
        saldoPendiente
      };
    });
  }, [catalogos.clientes, manifiestosDestino]);

  // Filtrado de clientes
  const clientesFiltrados = useMemo(() => {
    return clientesCalculados.filter(cli => {
      if (filtroClienteSaldo === 'con_saldo' && cli.saldoPendiente <= 0) return false;
      if (filtroClienteSaldo === 'al_dia' && cli.saldoPendiente > 0) return false;

      if (!searchCliente.trim()) return true;
      const q = searchCliente.toLowerCase().trim();
      return (
        cli.nombre.toLowerCase().includes(q) ||
        (cli.telefono && cli.telefono.toLowerCase().includes(q)) ||
        (cli.direccion && cli.direccion.toLowerCase().includes(q)) ||
        (cli.ciudad && cli.ciudad.toLowerCase().includes(q)) ||
        (cli.nitCi && cli.nitCi.toLowerCase().includes(q))
      );
    });
  }, [clientesCalculados, filtroClienteSaldo, searchCliente]);

  const totalCuentasPorCobrarGlobal = useMemo(() => {
    return clientesCalculados.reduce((sum, c) => sum + c.saldoPendiente, 0);
  }, [clientesCalculados]);

  const totalClientesConSaldo = useMemo(() => {
    return clientesCalculados.filter(c => c.saldoPendiente > 0).length;
  }, [clientesCalculados]);

  const handleOpenCobranzasModal = (cliente: Cliente) => {
    setSelectedClienteCobranza(cliente);
    setIsCuentasCobrarOpen(true);
  };

  // Cálculos consolidados para Proveedores y Cuentas por Pagar (CxP)
  const proveedoresCalculados = useMemo(() => {
    const list = catalogos.proveedores || [];
    const allCxP = catalogos.cuentasPorPagar || [];
    return list.map(prov => {
      const txs = transacciones.filter(t => 
        (t.idProveedor && t.idProveedor === prov.idProveedor) ||
        (t.nombreProveedor && t.nombreProveedor.toLowerCase().trim() === prov.nombre.toLowerCase().trim())
      );
      const totalGastosBs = txs.reduce((sum, t) => sum + (t.montoBs || 0), 0);

      const cxps = allCxP.filter(c => 
        (c.idProveedor && c.idProveedor === prov.idProveedor) ||
        ((c.nombreProveedor || c.proveedorNombre) && (c.nombreProveedor || c.proveedorNombre)!.toLowerCase().trim() === prov.nombre.toLowerCase().trim())
      );
      const totalCxPPendienteBs = cxps.reduce((sum, c) => sum + (c.saldoPendienteBs ?? c.montoTotalBs ?? 0), 0);

      return {
        ...prov,
        txCount: txs.length,
        totalGastosBs,
        cxpCount: cxps.length,
        totalCxPPendienteBs
      };
    });
  }, [catalogos.proveedores, catalogos.cuentasPorPagar, transacciones]);

  const proveedoresFiltrados = useMemo(() => {
    return proveedoresCalculados.filter(p => {
      if (!searchProveedor.trim()) return true;
      const q = searchProveedor.toLowerCase().trim();
      return (
        p.idProveedor.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        (p.telefono && p.telefono.toLowerCase().includes(q)) ||
        (p.direccion && p.direccion.toLowerCase().includes(q)) ||
        (p.rubro && p.rubro.toLowerCase().includes(q)) ||
        (p.ciudad && p.ciudad.toLowerCase().includes(q))
      );
    });
  }, [proveedoresCalculados, searchProveedor]);

  const totalCxPGlobal = useMemo(() => {
    return proveedoresCalculados.reduce((sum, p) => sum + p.totalCxPPendienteBs, 0);
  }, [proveedoresCalculados]);

  const totalGastosProveedoresGlobal = useMemo(() => {
    return proveedoresCalculados.reduce((sum, p) => sum + p.totalGastosBs, 0);
  }, [proveedoresCalculados]);

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Top Banner de Ajustes */}
      <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-9 h-9 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Sector de Ajustes & Configuración Maestra
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#64748b] mt-1 max-w-2xl">
              Administre Cajas con Saldo Inicial, Centros de Costo (Camiones), Choferes, Tabla Maestra de Clientes (Destinatarios & Cuentas por Cobrar) y Agencias.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintAjustes}
              className="bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-[#e2e8f0] transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Printer className="w-4 h-4 text-[#1d4ed8]" />
              <span>Imprimir / Exportar PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas de Ajustes */}
      <div className="flex items-center space-x-2 border-b border-[#e2e8f0] pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('cajas')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
            activeTab === 'cajas'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>1. Métodos de Pago & Cajas ({cajas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('camiones')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
            activeTab === 'camiones'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>2. Centros de Costo (Camiones) ({catalogos.camiones.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('choferes')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
            activeTab === 'choferes'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>3. Choferes ({catalogos.choferes?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('clientes')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
            activeTab === 'clientes'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>4. Clientes Destinatarios ({catalogos.clientes?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('proveedores')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
            activeTab === 'proveedores'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>5. Proveedores ({catalogos.proveedores?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('sucursales')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
            activeTab === 'sucursales'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>6. Sucursales / Agencias ({catalogos.sucursales.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categorias')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
            activeTab === 'categorias'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>7. Categorías Financieras ({categorias.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('empresa')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
            activeTab === 'empresa'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>8. Datos de la Empresa & Logo</span>
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
            activeTab === 'auditoria'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>9. Auditoría & Consistencia Contable</span>
        </button>
      </div>

      {/* PESTAÑA AUDITORÍA: PANEL DE AUDITORÍA Y CONSISTENCIA */}
      {activeTab === 'auditoria' && (
        <PanelAuditoriaContable
          showToast={showToast}
          onDataMutated={onDataMutated}
        />
      )}

      {/* PESTAÑA 1: MÉTODOS DE PAGO Y CUENTAS CON SALDO INICIAL */}
      {activeTab === 'cajas' && (
        <div className="space-y-4">
          {/* Resumen Superior */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Arqueo y Cuentas con Saldo Inicial</h3>
              <p className="text-xs text-[#64748b]">
                Ajuste y declare el saldo inicial de apertura de sus cajas físicas, cuentas bancarias y billeteras móviles.
              </p>
            </div>
            <button
              onClick={() => setCajaModal({ 
                open: true, 
                isEdit: false, 
                data: { nombre: '', tipo: 'Caja Sucursal', ubicacion: 'Tarija', saldoInicial: 0, totalCobrado: 0, totalGastado: 0, saldoDisponible: 0 } 
              })}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Añadir Cuenta / Caja</span>
            </button>
          </div>

          {/* Tarjetas de Métricas de Cajas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block font-semibold">Total Saldo Inicial</span>
              <span className="text-lg font-black text-[#d97706]">
                Bs {totalSaldoInicial.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block font-semibold">Total Cobros Acumulados</span>
              <span className="text-lg font-black text-[#16a34a]">
                +Bs {totalCobrado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block font-semibold">Total Egresos Acumulados</span>
              <span className="text-lg font-black text-[#dc2626]">
                -Bs {totalGastado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block font-semibold">Saldo Disponible Neto</span>
              <span className="text-lg font-black text-[#1d4ed8]">
                Bs {totalDisponible.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Tabla de Cajas y Cuentas */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto lg:overflow-x-visible">
              <table className="w-full table-auto lg:table-fixed border-collapse min-w-[650px] lg:min-w-0">
                <thead>
                  <tr>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[22%]">Cuenta / Caja</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[16%]">Tipo & Ubicación</th>
                    <th className="bg-slate-100 text-amber-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-right lg:w-[13%]">Saldo Inicial</th>
                    <th className="bg-slate-100 text-emerald-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-right lg:w-[13%]">Total Cobrado</th>
                    <th className="bg-slate-100 text-rose-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-right lg:w-[13%]">Total Gastado</th>
                    <th className="bg-slate-100 text-blue-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-right lg:w-[13%]">Saldo Disponible</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-center lg:w-[10%]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] font-mono text-slate-800">
                  {cajas.map((caja) => (
                    <tr key={caja.nombre} className="hover:bg-slate-50 transition-colors">
                      <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200 font-sans font-bold text-slate-900 flex items-center gap-2">
                        {caja.tipo === 'Banco' && <Landmark className="w-4 h-4 text-[#1d4ed8] shrink-0" />}
                        {caja.tipo === 'Caja Sucursal' && <Coins className="w-4 h-4 text-[#16a34a] shrink-0" />}
                        {caja.tipo === 'Efectivo Chofer' && <Truck className="w-4 h-4 text-[#d97706] shrink-0" />}
                        {caja.tipo === 'Billetera' && <QrCode className="w-4 h-4 text-purple-600 shrink-0" />}
                        {caja.tipo === 'Tarjeta' && <CreditCard className="w-4 h-4 text-sky-600 shrink-0" />}
                        <span className="truncate" title={caja.nombre}>{caja.nombre}</span>
                      </td>
                      <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200 font-sans text-slate-600">
                        <span className="text-[11px] font-semibold block text-slate-800">{caja.tipo}</span>
                        <span className="text-[10px] text-slate-500">{caja.ubicacion}</span>
                      </td>
                      <td className="text-sm py-3 px-3 border-b border-slate-200 text-right font-bold text-[#d97706] whitespace-nowrap text-xs lg:text-sm">
                        Bs {Number(caja.saldoInicial || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-sm py-3 px-3 border-b border-slate-200 text-right font-bold text-[#16a34a] whitespace-nowrap text-xs lg:text-sm">
                        Bs {Number(caja.totalCobrado || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-sm py-3 px-3 border-b border-slate-200 text-right font-bold text-[#dc2626] whitespace-nowrap text-xs lg:text-sm">
                        Bs {Number(caja.totalGastado || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-sm py-3 px-3 border-b border-slate-200 text-right font-bold text-[#1d4ed8] whitespace-nowrap text-xs lg:text-sm">
                        Bs {Number(caja.saldoDisponible || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200 text-center">
                        <div className="flex items-center justify-center space-x-1 font-sans">
                          <button
                            onClick={() => setCajaModal({
                              open: true,
                              isEdit: true,
                              nombreOriginal: caja.nombre,
                              data: { ...caja }
                            })}
                            className="p-1.5 bg-[#eff6ff] hover:bg-blue-100 text-[#1d4ed8] rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Editar cuenta y saldo inicial"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirm({
                                title: `¿Eliminar la cuenta "${caja.nombre}"?`,
                                message: 'Se eliminará la cuenta del catálogo maestro de cajas y métodos de pago.',
                                onConfirm: () => onDeleteCajaCuenta(caja.nombre)
                              });
                            }}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-[#dc2626] rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Eliminar cuenta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: CENTROS DE COSTO (CAMIONES) */}
      {activeTab === 'camiones' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Flota de Transporte Pesado (Centros de Costo)</h3>
              <p className="text-xs text-[#64748b]">
                Cada camión actúa como centro de costos independiente para imputación de diésel, peajes y fletes.
              </p>
            </div>
            <button
              onClick={() => setCamionModal({
                open: true,
                isEdit: false,
                data: { placa: '', modelo: '', choferHabitual: '', capacidadKg: 28000 }
              })}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Añadir Camión</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogos.camiones.map((camion) => (
              <div key={camion.placa} className="bg-white border border-[#e2e8f0] hover:border-blue-200 rounded-[18px] p-4 shadow-sm transition-all">
                <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-9 h-9 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </span>
                    <div>
                      <span className="font-black text-slate-900 font-mono text-base">{camion.placa}</span>
                      <span className="text-[11px] text-[#64748b] block">{camion.modelo}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCamionModal({
                        open: true,
                        isEdit: true,
                        placaOriginal: camion.placa,
                        data: { ...camion }
                      })}
                      className="p-1.5 text-slate-500 hover:text-[#1d4ed8] hover:bg-[#eff6ff] rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Editar camión"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirm({
                          title: `¿Eliminar el camión ${camion.placa}?`,
                          message: 'Se desvinculará este centro de costo de la flota activa.',
                          onConfirm: () => onDeleteCamion(camion.placa)
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-[#dc2626] hover:bg-rose-50 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Eliminar camión"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chofer Habitual:</span>
                    <span className="font-bold text-slate-800">{camion.choferHabitual || 'Sin asignar'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Capacidad de Carga:</span>
                    <span className="font-mono text-[#1d4ed8] font-bold">{camion.capacidadKg.toLocaleString('es-BO')} Kg</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: CHOFERES */}
      {activeTab === 'choferes' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Nómina de Choferes de Ruta</h3>
              <p className="text-xs text-[#64748b]">
                Choferes encargados de la conducción de las unidades y registro de gastos y comprobantes con cámara en carretera.
              </p>
            </div>
            <button
              onClick={() => setChoferModal({
                open: true,
                isEdit: false,
                data: { 
                  idChofer: `CH-${Date.now().toString().slice(-4)}`, 
                  nombre: '', 
                  telefono: '', 
                  licencia: 'Cat. C', 
                  placaAsignada: '', 
                  estado: 'Activo' 
                }
              })}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Añadir Chofer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(catalogos.choferes || []).map((chofer) => (
              <div key={chofer.idChofer} className="bg-white border border-[#e2e8f0] hover:border-blue-200 rounded-[18px] p-4 shadow-sm transition-all">
                <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-9 h-9 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{chofer.nombre}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">ID: {chofer.idChofer}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setChoferModal({
                        open: true,
                        isEdit: true,
                        data: { ...chofer }
                      })}
                      className="p-1.5 text-slate-500 hover:text-[#1d4ed8] hover:bg-[#eff6ff] rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Editar chofer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirm({
                          title: `¿Eliminar a ${chofer.nombre}?`,
                          message: 'Se retirará al chofer de la nómina de conductores.',
                          onConfirm: () => onDeleteChofer(chofer.idChofer)
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-[#dc2626] hover:bg-rose-50 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Eliminar chofer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Teléfono:</span>
                    <span className="font-semibold text-slate-800">{chofer.telefono || 'Sin teléfono'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Licencia:</span>
                    <span className="font-mono text-slate-700">{chofer.licencia || 'Cat. C'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Camión Asignado:</span>
                    <span className="font-mono text-[#1d4ed8] font-bold">{chofer.placaAsignada || 'Flota general'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: CLIENTES (DESTINATARIOS & CUENTAS POR COBRAR) */}
      {activeTab === 'clientes' && (
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="w-9 h-9 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Tabla Maestra de Clientes (Destinatarios) y Cuentas por Cobrar
                </h3>
              </div>
              <p className="text-xs text-[#64748b] mt-1 max-w-3xl">
                Catálogo de destinatarios para Sub-Manifiestos y control de cuentas por cobrar en destino.
              </p>
            </div>

            <button
              onClick={() => setClienteModal({
                open: true,
                isEdit: false,
                data: {
                  idCliente: `CLI-${Date.now().toString().slice(-4)}`,
                  nombre: '',
                  telefono: '',
                  direccion: '',
                  ciudad: 'Tarija',
                  nitCi: '',
                  activo: true
                }
              })}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Cliente / Destinatario</span>
            </button>
          </div>

          {/* Tarjetas Métricas de Cuentas por Cobrar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block font-semibold">Total Clientes</span>
              <span className="text-lg font-black text-slate-900">{catalogos.clientes?.length || 0}</span>
            </div>
            <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block font-semibold">Con Deuda Pendiente</span>
              <span className="text-lg font-black text-[#d97706]">{totalClientesConSaldo}</span>
            </div>
            <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block font-semibold">Total Cuentas por Cobrar</span>
              <span className="text-lg font-black text-[#dc2626]">
                Bs {totalCuentasPorCobrarGlobal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block font-semibold">Sub-Manifiestos Monitoreados</span>
              <span className="text-lg font-black text-[#16a34a]">{manifiestosDestino.length}</span>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-[#e2e8f0] p-3 rounded-xl shadow-sm text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                placeholder="Buscar por nombre, teléfono, dirección..."
                className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[40px]"
              />
            </div>

            <div className="flex items-center space-x-1.5 w-full sm:w-auto">
              <button
                onClick={() => setFiltroClienteSaldo('todos')}
                className={`px-3 py-2 rounded-xl font-bold text-xs transition-all min-h-[38px] ${
                  filtroClienteSaldo === 'todos'
                    ? 'bg-[#1d4ed8] text-white shadow-sm'
                    : 'bg-[#f4f6fa] text-slate-600 hover:text-slate-900 border border-[#e2e8f0]'
                }`}
              >
                Todos ({clientesCalculados.length})
              </button>
              <button
                onClick={() => setFiltroClienteSaldo('con_saldo')}
                className={`px-3 py-2 rounded-xl font-bold text-xs transition-all min-h-[38px] ${
                  filtroClienteSaldo === 'con_saldo'
                    ? 'bg-[#d97706] text-white shadow-sm'
                    : 'bg-[#f4f6fa] text-[#d97706] hover:bg-amber-50 border border-[#e2e8f0]'
                }`}
              >
                Con Saldo Pendiente ({totalClientesConSaldo})
              </button>
              <button
                onClick={() => setFiltroClienteSaldo('al_dia')}
                className={`px-3 py-2 rounded-xl font-bold text-xs transition-all min-h-[38px] ${
                  filtroClienteSaldo === 'al_dia'
                    ? 'bg-[#16a34a] text-white shadow-sm'
                    : 'bg-[#f4f6fa] text-[#16a34a] hover:bg-emerald-50 border border-[#e2e8f0]'
                }`}
              >
                Al Día ({clientesCalculados.length - totalClientesConSaldo})
              </button>
            </div>
          </div>

          {/* Tabla de Clientes con Cuentas por Cobrar */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto lg:overflow-x-visible">
              <table className="w-full table-auto lg:table-fixed border-collapse min-w-[700px] lg:min-w-0">
                <thead>
                  <tr>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[26%]">Cliente / Destinatario</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[16%]">Teléfono & WhatsApp</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[22%]">Dirección de Entrega</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-center lg:w-[12%]">Subconocimientos</th>
                    <th className="bg-slate-100 text-rose-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-right lg:w-[12%]">Saldo por Cobrar</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-center lg:w-[12%]">Control & Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {clientesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No se encontraron clientes que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    clientesFiltrados.map((cli) => {
                      const tieneSaldo = cli.saldoPendiente > 0;
                      return (
                        <tr key={cli.idCliente} className="hover:bg-slate-50 transition-colors">
                          <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200">
                            <div className="flex items-center space-x-2.5">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                tieneSaldo ? 'bg-rose-50 text-[#dc2626]' : 'bg-emerald-50 text-[#16a34a]'
                              }`}>
                                <UserCheck className="w-4 h-4" />
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 text-sm block truncate" title={cli.nombre}>{cli.nombre}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {cli.nitCi && (
                                    <span className="text-[10px] text-slate-500 font-mono">NIT/CI: {cli.nitCi}</span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono">ID: {cli.idCliente}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200">
                            {cli.telefono ? (
                              <a
                                href={`https://wa.me/591${cli.telefono.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg font-bold text-xs"
                                title="Enviar WhatsApp de cobranza"
                              >
                                <Phone className="w-3 h-3 text-[#16a34a]" />
                                <span>{cli.telefono}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Sin teléfono</span>
                            )}
                          </td>

                          <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200">
                            <div className="flex items-start space-x-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-slate-700 block truncate text-xs" title={cli.direccion || 'Dirección no registrada'}>{cli.direccion || 'Dirección no registrada'}</span>
                                {cli.ciudad && (
                                  <span className="text-[10px] text-[#1d4ed8] font-semibold">{cli.ciudad}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200 text-center">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f4f6fa] text-slate-700 border border-[#e2e8f0]">
                              {cli.subsCount} entrega(s)
                            </span>
                          </td>

                          <td className="text-sm py-3 px-3 border-b border-slate-200 text-right font-mono">
                            <div className="flex flex-col items-end">
                              <span className={`text-sm font-bold whitespace-nowrap ${tieneSaldo ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
                                Bs {cli.saldoPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </span>
                              {tieneSaldo ? (
                                <span className="text-[10px] text-[#dc2626] font-sans font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Pendiente
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#16a34a] font-sans font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Al día
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleOpenCobranzasModal(cli)}
                                className="px-3 py-1.5 bg-[#eff6ff] hover:bg-blue-100 text-[#1d4ed8] border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-all min-h-[36px]"
                                title="Ver Cuentas por Cobrar detalladas"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Ver Cuentas / Saldos</span>
                              </button>

                              <button
                                onClick={() => setClienteModal({
                                  open: true,
                                  isEdit: true,
                                  data: { ...cli }
                                })}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                                title="Editar cliente"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setDeleteConfirm({
                                    title: `¿Eliminar al cliente "${cli.nombre}"?`,
                                    message: 'Se retirará al cliente del catálogo maestro.',
                                    onConfirm: () => onDeleteCliente && onDeleteCliente(cli.idCliente)
                                  });
                                }}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-[#dc2626] rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                                title="Eliminar cliente"
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
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: PROVEEDORES (CATÁLOGO MAESTRO & VINCULACIÓN CxP / GASTOS) */}
      {activeTab === 'proveedores' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="w-9 h-9 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-slate-900 text-base">Tabla Maestra de Proveedores</h3>
              </div>
              <p className="text-xs text-[#64748b] mt-1 max-w-2xl">
                Catálogo centralizado de proveedores (estaciones de servicio, peajes, talleres mecánicos, repuestos y terceros).
              </p>
            </div>
            <button
              onClick={() => {
                const nextId = `PRV-${String((catalogos.proveedores?.length || 0) + 1).padStart(2, '0')}`;
                setProveedorModal({
                  open: true,
                  isEdit: false,
                  data: {
                    idProveedor: nextId,
                    nombre: '',
                    telefono: '',
                    direccion: '',
                    rubro: 'Combustible y Diésel',
                    nitCi: '',
                    ciudad: 'Tarija'
                  }
                });
              }}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Añadir Proveedor</span>
            </button>
          </div>

          {/* Tarjetas de Métricas de Proveedores */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Proveedores</span>
                <span className="text-xl font-black text-slate-900">{catalogos.proveedores?.length || 0}</span>
                <span className="text-[10px] text-slate-400 block">Registrados en catálogo</span>
              </div>
              <span className="w-10 h-10 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Gastos / Compras Vinculados</span>
                <span className="text-xl font-black text-[#dc2626]">
                  Bs {totalGastosProveedoresGlobal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block">En transacciones registradas</span>
              </div>
              <span className="w-10 h-10 rounded-full bg-rose-50 text-[#dc2626] flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Cuentas por Pagar (CxP)</span>
                <span className={`text-xl font-black ${totalCxPGlobal > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
                  Bs {totalCxPGlobal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block">Saldos pendientes a proveedores</span>
              </div>
              <span className="w-10 h-10 rounded-full bg-amber-50 text-[#d97706] flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </span>
            </div>
          </div>

          {/* Barra de Búsqueda de Proveedores */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchProveedor}
                onChange={(e) => setSearchProveedor(e.target.value)}
                placeholder="Buscar por ID, Razón Social, Teléfono, Dirección, Rubro..."
                className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[40px]"
              />
            </div>
            <div className="text-xs text-slate-500">
              Mostrando: <strong className="text-slate-800">{proveedoresFiltrados.length}</strong> de {catalogos.proveedores?.length || 0}
            </div>
          </div>

          {/* Tabla de Proveedores */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto lg:overflow-x-visible">
              <table className="w-full table-auto lg:table-fixed border-collapse min-w-[750px] lg:min-w-0">
                <thead>
                  <tr>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[10%]">ID Proveedor</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[20%]">Nombre o Razón Social</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[12%]">Teléfono</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[16%]">Dirección</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[14%]">Rubro / Ciudad</th>
                    <th className="bg-slate-100 text-rose-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-right lg:w-[10%]">Gastos / Compras</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-right lg:w-[10%]">CxP Pendiente</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-center lg:w-[8%]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] text-slate-800">
                  {proveedoresFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No se encontraron proveedores que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    proveedoresFiltrados.map((prov) => (
                      <tr key={prov.idProveedor} className="hover:bg-slate-50 transition-colors">
                        <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200 font-mono font-bold text-[#1d4ed8]">
                          {prov.idProveedor}
                        </td>
                        <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200">
                          <div className="font-bold text-slate-900 truncate" title={prov.nombre}>{prov.nombre}</div>
                          {prov.nitCi && (
                            <div className="text-[10px] text-slate-500 font-mono">NIT/CI: {prov.nitCi}</div>
                          )}
                        </td>
                        <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200 whitespace-nowrap">
                          {prov.telefono ? (
                            <a
                              href={`https://wa.me/591${prov.telefono.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-xs"
                            >
                              <Phone className="w-3 h-3 text-[#16a34a]" />
                              <span>{prov.telefono}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="text-sm font-normal text-slate-600 py-3 px-3 border-b border-slate-200 truncate" title={prov.direccion}>
                          {prov.direccion || <span className="text-slate-400">-</span>}
                        </td>
                        <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#eff6ff] text-[#1d4ed8] border border-blue-200 block w-max">
                            {prov.rubro || 'General'}
                          </span>
                          {prov.ciudad && (
                            <span className="text-[10px] text-slate-500 block mt-0.5">{prov.ciudad}</span>
                          )}
                        </td>
                        <td className="text-sm py-3 px-3 border-b border-slate-200 text-right whitespace-nowrap text-xs lg:text-sm">
                          <span className="font-bold text-[#dc2626]">
                            Bs {prov.totalGastosBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-sans">
                            {prov.txCount} reg.
                          </span>
                        </td>
                        <td className="text-sm py-3 px-3 border-b border-slate-200 text-right whitespace-nowrap text-xs lg:text-sm">
                          <span className={`font-bold ${prov.totalCxPPendienteBs > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
                            Bs {prov.totalCxPPendienteBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => {
                                setProveedorModal({
                                  open: true,
                                  isEdit: true,
                                  data: { ...prov }
                                });
                              }}
                              className="p-1.5 bg-[#eff6ff] hover:bg-blue-100 text-[#1d4ed8] rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="Editar proveedor"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirm({
                                  title: `¿Eliminar al proveedor "${prov.nombre}"?`,
                                  message: 'Se retirará al proveedor del catálogo maestro.',
                                  onConfirm: () => onDeleteProveedor && onDeleteProveedor(prov.idProveedor)
                                });
                              }}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-[#dc2626] rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="Eliminar proveedor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 6: SUCURSALES / AGENCIAS */}
      {activeTab === 'sucursales' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Agencias y Sucursales de Operación</h3>
              <p className="text-xs text-[#64748b]">
                Ciudades donde operan los depósitos de origen, despacho y sucursales de entrega en destino.
              </p>
            </div>
            <button
              onClick={() => setSucursalModal({ open: true, nombre: '' })}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Añadir Sucursal</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {catalogos.sucursales.map((suc) => (
              <div key={suc} className="bg-white border border-[#e2e8f0] hover:border-blue-200 rounded-[18px] p-4 flex items-center justify-between text-xs shadow-sm transition-all">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{suc}</span>
                </div>
                <button
                  onClick={() => {
                    setDeleteConfirm({
                      title: `¿Eliminar la sucursal "${suc}"?`,
                      message: 'Se desvinculará esta agencia de los catálogos de despacho y destino.',
                      onConfirm: () => onDeleteSucursal(suc)
                    });
                  }}
                  className="p-1.5 text-slate-400 hover:text-[#dc2626] hover:bg-rose-50 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 7: CATEGORÍAS FINANCIERAS */}
      {activeTab === 'categorias' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#1d4ed8]" />
                <span>Catálogo de Categorías y Conceptos Financieros</span>
              </h3>
              <p className="text-xs text-[#64748b]">
                Categorías maestras para clasificar ingresos de transporte y egresos operativos, fletes y viáticos.
              </p>
            </div>
            <button
              onClick={() => setCatModal({ open: true, nombre: '', tipo: 'Gasto', color: '#dc2626' })}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Añadir Categoría</span>
            </button>
          </div>

          {/* Filtros de Categorías */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#e2e8f0] shadow-sm">
            <div className="flex items-center gap-1.5">
              {(['Todos', 'Ingreso', 'Gasto'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFiltroTipoCat(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[38px] ${
                    filtroTipoCat === t
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'bg-[#f4f6fa] text-slate-600 hover:text-slate-900 border border-[#e2e8f0]'
                  }`}
                >
                  {t === 'Todos' ? `Todas (${categorias.length})` : t === 'Ingreso' ? `Solo Ingresos (${categorias.filter(c => c.tipo === 'Ingreso').length})` : `Solo Gastos (${categorias.filter(c => c.tipo === 'Gasto').length})`}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchCat}
                onChange={(e) => setSearchCat(e.target.value)}
                placeholder="Buscar categoría..."
                className="bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 w-full sm:w-60 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
              />
            </div>
          </div>

          {/* Tabla de Categorías */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto lg:overflow-x-visible">
              <table className="w-full table-auto lg:table-fixed border-collapse min-w-[650px] lg:min-w-0">
                <thead>
                  <tr>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[32%]">Categoría / Concepto</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-left lg:w-[18%]">Tipo Operación</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-right lg:w-[22%]">Transacciones Vinculadas</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-right lg:w-[18%]">Total Acumulado (Bs)</th>
                    <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-3 border-b-2 border-slate-300 select-none text-center lg:w-[10%]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] font-mono">
                  {categorias
                    .filter(c => {
                      if (filtroTipoCat !== 'Todos' && c.tipo !== filtroTipoCat) return false;
                      if (searchCat.trim() && !c.nombre.toLowerCase().includes(searchCat.toLowerCase().trim())) return false;
                      return true;
                    })
                    .map((cat) => {
                      const txs = transacciones.filter(t => t.categoria.toLowerCase().trim() === cat.nombre.toLowerCase().trim());
                      const totalBs = txs.reduce((sum, t) => sum + (t.montoBs || 0), 0);
                      return (
                        <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                          <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200 font-sans font-bold text-slate-900 flex items-center gap-2.5">
                            <span 
                              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: cat.color || '#1d4ed8' }}
                            />
                            <span className="truncate" title={cat.nombre}>{cat.nombre}</span>
                          </td>
                          <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200 font-sans">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              cat.tipo === 'Ingreso' 
                                ? 'bg-emerald-50 text-[#16a34a] border border-emerald-200' 
                                : 'bg-rose-50 text-[#dc2626] border border-rose-200'
                            }`}>
                              {cat.tipo}
                            </span>
                          </td>
                          <td className="text-sm py-3 px-3 border-b border-slate-200 text-right font-bold text-slate-600 whitespace-nowrap text-xs lg:text-sm">
                            {txs.length} ops
                          </td>
                          <td className="text-sm py-3 px-3 border-b border-slate-200 text-right font-bold whitespace-nowrap text-xs lg:text-sm">
                            <span className={cat.tipo === 'Ingreso' ? 'text-[#16a34a]' : 'text-[#dc2626]'}>
                              Bs {totalBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="text-sm font-normal text-slate-800 py-3 px-3 border-b border-slate-200 text-center font-sans">
                            <span className="text-[10px] font-bold text-[#16a34a] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Activa
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 8: DATOS DE LA EMPRESA & LOGOTIPO */}
      {activeTab === 'empresa' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1d4ed8]" />
                <span>Configuración de Datos de la Empresa & Logo</span>
              </h3>
              <p className="text-xs text-[#64748b]">
                Esta información y logotipo aparecerán en todos los recibos de cobranza, tickets térmicos, hojas de ruta y reportes oficiales.
              </p>
            </div>
            {empresaGuardadaMsg && (
              <div className="bg-emerald-50 text-[#16a34a] border border-emerald-200 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
                <Check className="w-4 h-4" />
                <span>¡Datos guardados con éxito!</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulario de Edición */}
            <form onSubmit={handleGuardarEmpresa} className="lg:col-span-7 bg-white border border-[#e2e8f0] rounded-[18px] p-5 sm:p-6 space-y-4 text-xs shadow-sm">
              <h4 className="font-bold text-[#1d4ed8] text-sm uppercase tracking-wider mb-2">
                Formulario Oficial de la Empresa
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Nombre Oficial de la Empresa / Razón Social *</label>
                  <input
                    type="text"
                    value={empresaForm.nombre}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, nombre: e.target.value })}
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                    placeholder="Ej. TRANS-LOGÍSTICA DEL SUR S.R.L."
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">NIT / Identificación Tributaria *</label>
                  <input
                    type="text"
                    value={empresaForm.nit}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, nit: e.target.value })}
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                    placeholder="Ej. 1029384756"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Teléfono / Celular de Contacto *</label>
                  <input
                    type="text"
                    value={empresaForm.telefono}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, telefono: e.target.value })}
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                    placeholder="Ej. +591 4 664-3210 / 71890123"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Dirección Central / Oficinas *</label>
                  <input
                    type="text"
                    value={empresaForm.direccion}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, direccion: e.target.value })}
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                    placeholder="Ej. Av. Panamericana #1420, Zona Mercado Campesino"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Ciudad y País *</label>
                  <input
                    type="text"
                    value={empresaForm.ciudad}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, ciudad: e.target.value })}
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                    placeholder="Ej. Tarija, Bolivia"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Slogan o Rubro Institucional</label>
                  <input
                    type="text"
                    value={empresaForm.slogan}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, slogan: e.target.value })}
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                    placeholder="Ej. Transporte de Carga Pesada & Logística"
                  />
                </div>
              </div>

              {/* Subida y Configuración de Logotipo */}
              <div className="pt-3 border-t border-[#e2e8f0] space-y-3">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Logotipo de la Empresa (Para Recibos y Reportes)
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0]">
                  <div className="w-24 h-24 bg-white rounded-xl border border-[#e2e8f0] flex items-center justify-center overflow-hidden shrink-0 p-1 shadow-sm">
                    {empresaForm.logoUrl ? (
                      <img src={empresaForm.logoUrl} alt="Logo Empresa" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-slate-400 text-[10px]">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                        <span>Sin Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 w-full text-xs">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer bg-white hover:bg-slate-50 text-[#1d4ed8] font-bold px-3 py-2 rounded-xl border border-[#e2e8f0] flex items-center gap-1.5 transition-all min-h-[40px]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Cargar Imagen de Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>

                      {empresaForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setEmpresaForm({ ...empresaForm, logoUrl: '' })}
                          className="text-[#dc2626] hover:bg-rose-50 px-3 py-2 rounded-xl font-bold min-h-[40px]"
                        >
                          Quitar
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={empresaForm.logoUrl || ''}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, logoUrl: e.target.value })}
                      placeholder="O introduzca URL de la imagen del Logo (https://...)"
                      className="w-full bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 text-xs text-slate-800 min-h-[40px]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 min-h-[44px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar y Aplicar a Todas las Impresiones</span>
                </button>
              </div>
            </form>

            {/* Vista Previa de la Cabecera de Impresión */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 space-y-3 shadow-sm">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-[#1d4ed8]" />
                  <span>Vista Previa del Encabezado de Impresión</span>
                </h4>
                <p className="text-[11px] text-[#64748b]">
                  Así se verá el membrete oficial en los tickets y hojas impresas:
                </p>

                <div className="bg-white text-slate-900 p-5 rounded-xl border border-slate-300 shadow font-mono text-center space-y-2">
                  {empresaForm.logoUrl && (
                    <div className="flex justify-center mb-1">
                      <img src={empresaForm.logoUrl} alt="Logo" className="h-10 object-contain max-w-[160px]" />
                    </div>
                  )}
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-900">
                    {empresaForm.nombre || 'NOMBRE DE LA EMPRESA'}
                  </h3>
                  {empresaForm.slogan && (
                    <p className="text-[10px] text-slate-600">{empresaForm.slogan}</p>
                  )}
                  <div className="text-[10px] text-slate-600 border-t border-b border-dashed border-slate-400 py-1.5 my-1 space-y-0.5">
                    <p><strong>NIT:</strong> {empresaForm.nit || '00000000'}</p>
                    <p><strong>TEL:</strong> {empresaForm.telefono || 'Sin teléfono'}</p>
                    <p><strong>DIR:</strong> {empresaForm.direccion || 'Sin dirección'}</p>
                    <p><strong>CIUDAD:</strong> {empresaForm.ciudad || 'Bolivia'}</p>
                  </div>
                  <p className="text-[9px] text-slate-400 pt-1">
                    * Membrete activo para Comprobantes, Recibos y Liquidaciones *
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA NUEVA CATEGORÍA FINANCIERA */}
      {catModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-sm rounded-t-[20px] sm:rounded-[18px] p-5 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#1d4ed8]" />
                <span>Nueva Categoría Financiera</span>
              </h3>
              <button 
                onClick={() => setCatModal({ ...catModal, open: false })} 
                className="p-2 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!catModal.nombre.trim()) return;
                const nuevaCat: CategoriaFinanciera = {
                  id: `CAT-${Date.now().toString().slice(-4)}`,
                  nombre: catModal.nombre.trim(),
                  tipo: catModal.tipo,
                  color: catModal.color
                };
                if (onAddCategoria) {
                  onAddCategoria(nuevaCat);
                }
                setCatModal({ ...catModal, open: false });
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Nombre de la Categoría *</label>
                <input
                  type="text"
                  value={catModal.nombre}
                  onChange={(e) => setCatModal({ ...catModal, nombre: e.target.value })}
                  placeholder="Ej. Combustible Ruta, Peajes..."
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Tipo de Operación *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatModal({ ...catModal, tipo: 'Gasto' })}
                    className={`py-2 rounded-xl font-bold border transition-all min-h-[44px] ${
                      catModal.tipo === 'Gasto'
                        ? 'bg-rose-50 text-[#dc2626] border-rose-300 shadow-sm'
                        : 'bg-[#f4f6fa] text-slate-600 border-[#e2e8f0]'
                    }`}
                  >
                    Gasto (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatModal({ ...catModal, tipo: 'Ingreso' })}
                    className={`py-2 rounded-xl font-bold border transition-all min-h-[44px] ${
                      catModal.tipo === 'Ingreso'
                        ? 'bg-emerald-50 text-[#16a34a] border-emerald-300 shadow-sm'
                        : 'bg-[#f4f6fa] text-slate-600 border-[#e2e8f0]'
                    }`}
                  >
                    Ingreso (+)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Color Identificador</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={catModal.color}
                    onChange={(e) => setCatModal({ ...catModal, color: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-slate-600 font-mono font-semibold">{catModal.color}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setCatModal({ ...catModal, open: false })}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold px-4 py-2 rounded-xl shadow-sm min-h-[44px]"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CLIENTE / DESTINATARIO */}
      {clienteModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-md rounded-t-[20px] sm:rounded-[18px] p-5 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center space-x-2.5">
                <span className="w-8 h-8 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  {clienteModal.isEdit ? 'Editar Cliente / Destinatario' : 'Registrar Nuevo Cliente / Destinatario'}
                </h3>
              </div>
              <button 
                onClick={() => setClienteModal({ ...clienteModal, open: false })} 
                className="p-2 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!clienteModal.data.nombre.trim()) return;

                const cliFinal: Cliente = {
                  ...clienteModal.data,
                  idCliente: clienteModal.data.idCliente || `CLI-${Date.now().toString().slice(-4)}`,
                  nombre: clienteModal.data.nombre.trim(),
                  telefono: clienteModal.data.telefono.trim(),
                  direccion: clienteModal.data.direccion.trim(),
                  activo: true
                };

                if (clienteModal.isEdit && onUpdateCliente) {
                  onUpdateCliente(cliFinal);
                } else if (onAddCliente) {
                  onAddCliente(cliFinal);
                }
                setClienteModal({ ...clienteModal, open: false });
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Nombre Completo / Razón Social *
                </label>
                <input
                  type="text"
                  value={clienteModal.data.nombre}
                  onChange={(e) => setClienteModal({
                    ...clienteModal,
                    data: { ...clienteModal.data, nombre: e.target.value }
                  })}
                  placeholder="Ej. Comercializadora San Jorge S.R.L."
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                    Teléfono Contacto / Celular *
                  </label>
                  <input
                    type="text"
                    value={clienteModal.data.telefono}
                    onChange={(e) => setClienteModal({
                      ...clienteModal,
                      data: { ...clienteModal.data, telefono: e.target.value }
                    })}
                    placeholder="Ej. 72984512"
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                    NIT o C.I. (Opcional)
                  </label>
                  <input
                    type="text"
                    value={clienteModal.data.nitCi || ''}
                    onChange={(e) => setClienteModal({
                      ...clienteModal,
                      data: { ...clienteModal.data, nitCi: e.target.value }
                    })}
                    placeholder="Ej. 1029384019"
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 font-mono min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Dirección de Entrega Completa *
                </label>
                <textarea
                  rows={2}
                  value={clienteModal.data.direccion}
                  onChange={(e) => setClienteModal({
                    ...clienteModal,
                    data: { ...clienteModal.data, direccion: e.target.value }
                  })}
                  placeholder="Ej. Av. Panamericana esq. Calle Bolívar #250, Zona Mercado Campesino"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Ciudad / Agencia Habitual
                </label>
                <select
                  value={clienteModal.data.ciudad || 'Tarija'}
                  onChange={(e) => setClienteModal({
                    ...clienteModal,
                    data: { ...clienteModal.data, ciudad: e.target.value }
                  })}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                >
                  {catalogos.sucursales.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setClienteModal({ ...clienteModal, open: false })}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold px-5 py-2 rounded-xl shadow-sm transition-all min-h-[44px]"
                >
                  {clienteModal.isEdit ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CAMIÓN */}
      {camionModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-sm rounded-t-[20px] sm:rounded-[18px] p-5 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <h3 className="font-bold text-slate-900 text-sm">
                {camionModal.isEdit ? 'Editar Camión (Centro de Costos)' : 'Añadir Nuevo Camión'}
              </h3>
              <button onClick={() => setCamionModal({ ...camionModal, open: false })} className="p-2 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (camionModal.isEdit && camionModal.placaOriginal) {
                onUpdateCamion(camionModal.placaOriginal, camionModal.data);
              } else {
                onAddCamion(camionModal.data);
              }
              setCamionModal({ ...camionModal, open: false });
            }} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Placa del Camión *</label>
                <input
                  type="text"
                  value={camionModal.data.placa}
                  onChange={(e) => setCamionModal({ ...camionModal, data: { ...camionModal.data, placa: e.target.value.toUpperCase() } })}
                  placeholder="2341-NXZ"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 font-mono font-bold min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Modelo / Marca *</label>
                <input
                  type="text"
                  value={camionModal.data.modelo}
                  onChange={(e) => setCamionModal({ ...camionModal, data: { ...camionModal.data, modelo: e.target.value } })}
                  placeholder="Volvo FH 460 - 3 Ejes"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Chofer Habitual Asignado</label>
                <input
                  type="text"
                  value={camionModal.data.choferHabitual}
                  onChange={(e) => setCamionModal({ ...camionModal, data: { ...camionModal.data, choferHabitual: e.target.value } })}
                  placeholder="Nombre del chofer"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Capacidad de Carga (Kilogramos)</label>
                <input
                  type="number"
                  value={camionModal.data.capacidadKg}
                  onChange={(e) => setCamionModal({ ...camionModal, data: { ...camionModal.data, capacidadKg: parseInt(e.target.value) || 0 } })}
                  placeholder="28000"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e2e8f0]">
                <button type="button" onClick={() => setCamionModal({ ...camionModal, open: false })} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold min-h-[44px]">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold px-4 py-2 rounded-xl min-h-[44px]">
                  Guardar Camión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHOFER */}
      {choferModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-sm rounded-t-[20px] sm:rounded-[18px] p-5 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <h3 className="font-bold text-slate-900 text-sm">
                {choferModal.isEdit ? 'Editar Chofer' : 'Añadir Nuevo Chofer'}
              </h3>
              <button onClick={() => setChoferModal({ ...choferModal, open: false })} className="p-2 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (choferModal.isEdit) {
                onUpdateChofer(choferModal.data);
              } else {
                onAddChofer(choferModal.data);
              }
              setChoferModal({ ...choferModal, open: false });
            }} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Nombre Completo *</label>
                <input
                  type="text"
                  value={choferModal.data.nombre}
                  onChange={(e) => setChoferModal({ ...choferModal, data: { ...choferModal.data, nombre: e.target.value } })}
                  placeholder="Juan Carlos Mamani"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Teléfono / Celular</label>
                <input
                  type="text"
                  value={choferModal.data.telefono}
                  onChange={(e) => setChoferModal({ ...choferModal, data: { ...choferModal.data, telefono: e.target.value } })}
                  placeholder="72984512"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Licencia de Conducir</label>
                <input
                  type="text"
                  value={choferModal.data.licencia}
                  onChange={(e) => setChoferModal({ ...choferModal, data: { ...choferModal.data, licencia: e.target.value } })}
                  placeholder="Cat. C - 4589123"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Camión Asignado Habitual</label>
                <select
                  value={choferModal.data.placaAsignada}
                  onChange={(e) => setChoferModal({ ...choferModal, data: { ...choferModal.data, placaAsignada: e.target.value } })}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                >
                  <option value="">(Flota General)</option>
                  {catalogos.camiones.map(c => (
                    <option key={c.placa} value={c.placa}>{c.placa} - {c.modelo}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e2e8f0]">
                <button type="button" onClick={() => setChoferModal({ ...choferModal, open: false })} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold min-h-[44px]">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold px-4 py-2 rounded-xl min-h-[44px]">
                  Guardar Chofer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CAJA / CUENTA CON SALDO INICIAL */}
      {cajaModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-sm rounded-t-[20px] sm:rounded-[18px] p-5 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <h3 className="font-bold text-slate-900 text-sm">
                {cajaModal.isEdit ? 'Editar Cuenta & Saldo Inicial' : 'Añadir Cuenta / Caja'}
              </h3>
              <button onClick={() => setCajaModal({ ...cajaModal, open: false })} className="p-2 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (cajaModal.isEdit && cajaModal.nombreOriginal) {
                onUpdateCajaCuenta(cajaModal.nombreOriginal, cajaModal.data);
              } else {
                onAddCajaCuenta(cajaModal.data);
              }
              setCajaModal({ ...cajaModal, open: false });
            }} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Nombre de Cuenta / Caja *</label>
                <input
                  type="text"
                  value={cajaModal.data.nombre}
                  onChange={(e) => setCajaModal({ ...cajaModal, data: { ...cajaModal.data, nombre: e.target.value } })}
                  placeholder="Ej. Caja Sucursal Yacuiba, Banco BCP..."
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Tipo de Método de Pago *</label>
                <select
                  value={cajaModal.data.tipo}
                  onChange={(e) => setCajaModal({ ...cajaModal, data: { ...cajaModal.data, tipo: e.target.value as any } })}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                >
                  <option value="Caja Sucursal">Caja Sucursal</option>
                  <option value="Banco">Cuenta Bancaria</option>
                  <option value="Efectivo Chofer">Efectivo Chofer Ruta</option>
                  <option value="Billetera">Billetera Móvil / QR</option>
                  <option value="Tarjeta">Tarjeta Débito / Crédito</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Ubicación / Ciudad</label>
                <input
                  type="text"
                  value={cajaModal.data.ubicacion}
                  onChange={(e) => setCajaModal({ ...cajaModal, data: { ...cajaModal.data, ubicacion: e.target.value } })}
                  placeholder="Tarija, Oruro, Central..."
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <label className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1 block">
                  Saldo Inicial de Apertura (Bs) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cajaModal.data.saldoInicial}
                  onChange={(e) => setCajaModal({ ...cajaModal, data: { ...cajaModal.data, saldoInicial: parseFloat(e.target.value) || 0 } })}
                  placeholder="0.00"
                  className="w-full bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 text-base font-black text-[#d97706] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                  required
                />
                <p className="text-[10px] text-slate-500">
                  El saldo disponible se calculará en vivo: Saldo Inicial + Cobros - Gastos.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e2e8f0]">
                <button type="button" onClick={() => setCajaModal({ ...cajaModal, open: false })} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold min-h-[44px]">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold px-4 py-2 rounded-xl min-h-[44px]">
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUCURSAL */}
      {sucursalModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-sm rounded-t-[20px] sm:rounded-[18px] p-5 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <h3 className="font-bold text-slate-900 text-sm">Añadir Nueva Sucursal / Agencia</h3>
              <button onClick={() => setSucursalModal({ open: false, nombre: '' })} className="p-2 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (sucursalModal.nombre.trim()) {
                onAddSucursal(sucursalModal.nombre.trim());
              }
              setSucursalModal({ open: false, nombre: '' });
            }} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Nombre de la Sucursal *</label>
                <input
                  type="text"
                  value={sucursalModal.nombre}
                  onChange={(e) => setSucursalModal({ ...sucursalModal, nombre: e.target.value })}
                  placeholder="Ej. Yacuiba, Sucre, Cochabamba..."
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e2e8f0]">
                <button type="button" onClick={() => setSucursalModal({ open: false, nombre: '' })} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold min-h-[44px]">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold px-4 py-2 rounded-xl min-h-[44px]">
                  Guardar Sucursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PROVEEDOR (TABLA MAESTRA) */}
      {proveedorModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-md rounded-t-[20px] sm:rounded-[18px] p-5 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center space-x-2.5">
                <span className="w-8 h-8 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  {proveedorModal.isEdit ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
                </h3>
              </div>
              <button 
                onClick={() => setProveedorModal({ ...proveedorModal, open: false })} 
                className="p-2 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!proveedorModal.data.nombre.trim()) return;

                const provFinal: Proveedor = {
                  ...proveedorModal.data,
                  idProveedor: proveedorModal.data.idProveedor || `PRV-${Date.now().toString().slice(-4)}`,
                  nombre: proveedorModal.data.nombre.trim(),
                  telefono: proveedorModal.data.telefono.trim(),
                  direccion: proveedorModal.data.direccion.trim()
                };

                if (proveedorModal.isEdit && onUpdateProveedor) {
                  onUpdateProveedor(provFinal);
                } else if (onAddProveedor) {
                  onAddProveedor(provFinal);
                }

                setProveedorModal({ ...proveedorModal, open: false });
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">ID Proveedor (Key) *</label>
                  <input
                    type="text"
                    value={proveedorModal.data.idProveedor}
                    onChange={(e) => setProveedorModal({ ...proveedorModal, data: { ...proveedorModal.data, idProveedor: e.target.value.toUpperCase() } })}
                    placeholder="PRV-01"
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-[#1d4ed8] font-mono font-bold min-h-[44px]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">NIT o C.I.</label>
                  <input
                    type="text"
                    value={proveedorModal.data.nitCi || ''}
                    onChange={(e) => setProveedorModal({ ...proveedorModal, data: { ...proveedorModal.data, nitCi: e.target.value } })}
                    placeholder="102938475"
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Nombre o Razón Social *</label>
                <input
                  type="text"
                  value={proveedorModal.data.nombre}
                  onChange={(e) => setProveedorModal({ ...proveedorModal, data: { ...proveedorModal.data, nombre: e.target.value } })}
                  placeholder="Ej. YPFB Estación Central de Servicios Caracollo"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 font-medium min-h-[44px]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Teléfono (Phone) *</label>
                  <input
                    type="tel"
                    value={proveedorModal.data.telefono}
                    onChange={(e) => setProveedorModal({ ...proveedorModal, data: { ...proveedorModal.data, telefono: e.target.value } })}
                    placeholder="71234567"
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Ciudad / Ubicación</label>
                  <input
                    type="text"
                    value={proveedorModal.data.ciudad || ''}
                    onChange={(e) => setProveedorModal({ ...proveedorModal, data: { ...proveedorModal.data, ciudad: e.target.value } })}
                    placeholder="Tarija, Oruro, Sucre..."
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Dirección (Text) *</label>
                <input
                  type="text"
                  value={proveedorModal.data.direccion}
                  onChange={(e) => setProveedorModal({ ...proveedorModal, data: { ...proveedorModal.data, direccion: e.target.value } })}
                  placeholder="Ej. Carretera Panamericana Km 140"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Rubro / Especialidad</label>
                <select
                  value={proveedorModal.data.rubro || 'General'}
                  onChange={(e) => setProveedorModal({ ...proveedorModal, data: { ...proveedorModal.data, rubro: e.target.value } })}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-900 min-h-[44px]"
                >
                  <option value="Combustible y Diésel">Combustible y Diésel (Surtidor / YPFB)</option>
                  <option value="Peajes y Balanzas">Peajes y Balanzas (Vías Bolivia / Retenes)</option>
                  <option value="Taller y Mantenimiento">Taller Mecánico y Mantenimiento</option>
                  <option value="Llantas y Repuestos">Llantas y Repuestos</option>
                  <option value="Comisiones y Fleteros">Comisiones y Fleteros Locales</option>
                  <option value="Alimentación y Viáticos">Alimentación y Viáticos Chofer</option>
                  <option value="Seguros y Legal">Seguros y Trámites Legales</option>
                  <option value="General">Otro Proveedor General</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setProveedorModal({ ...proveedorModal, open: false })}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold px-4 py-2 rounded-xl shadow-sm transition-all min-h-[44px]"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN GENERAL EN AJUSTES */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-md rounded-t-[20px] sm:rounded-[18px] shadow-2xl p-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-[#dc2626] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{deleteConfirm.title}</h3>
                <p className="text-xs text-[#64748b]">{deleteConfirm.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-slate-700 hover:bg-slate-50 font-semibold min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#dc2626] hover:bg-rose-700 text-white font-bold shadow-sm transition-all min-h-[44px] flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CUENTAS POR COBRAR POR CLIENTE */}
      <CuentasCobrarModal
        isOpen={isCuentasCobrarOpen}
        onClose={() => {
          setIsCuentasCobrarOpen(false);
          setSelectedClienteCobranza(null);
        }}
        cliente={selectedClienteCobranza}
        manifiestosDestino={manifiestosDestino}
        manifiestosOrigen={manifiestosOrigen}
        viajes={viajes}
      />
    </div>
  );
};
