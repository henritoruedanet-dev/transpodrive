import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Truck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Printer,
  FileSpreadsheet,
  RotateCw,
  Layers,
  FileText,
  User,
  ShieldCheck,
  Building2,
  Wallet,
  MapPin,
  ChevronDown,
  ChevronUp,
  Fuel,
  Wrench,
  Package,
  Scale,
  Plus,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Receipt,
  Check,
  Trash2
} from 'lucide-react';
import {
  Viaje,
  EstadoViaje,
  ManifiestoOrigen,
  ManifiestoDestino,
  GastoRutaCamion,
  TransaccionDiaria,
  Catalogos,
  DatosEmpresa
} from '../types';
import { storage } from '../services/storageService';
import { exportToExcel } from '../utils/exportUtils';
import { formatBs, formatPercent } from '../utils/formatUtils';
import { calcularSaldosSubManifiesto } from '../utils/subManifiestoSaldos';
import { PropietariosChoferesModal } from './PropietariosChoferesModal';

interface ReporteViajeEconomicoProps {
  viajes: Viaje[];
  manifiestosOrigen?: ManifiestoOrigen[];
  manifiestosDestino?: ManifiestoDestino[];
  gastosRuta?: GastoRutaCamion[];
  transacciones?: TransaccionDiaria[];
  catalogos?: Catalogos;
  empresa?: DatosEmpresa;
  selectedViajeIdInicial?: string;
  onVerComprobante?: (url: string) => void;
  onRefreshData?: () => void;
  onDeleteSubManifiesto?: (id: string) => Promise<void> | void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

// Limpieza de formato de fecha YYYY-MM-DD
const formatFechaClean = (fechaHora?: string): string => {
  if (!fechaHora) return '-';
  if (fechaHora.includes('T')) return fechaHora.split('T')[0];
  if (fechaHora.includes(' ')) return fechaHora.split(' ')[0];
  return fechaHora;
};

// Renderizado de badge sutil para Método / Fondo
const renderMetodoBadge = (metodo?: string) => {
  const m = metodo || 'Efectivo Chofer Ruta';
  const mLower = m.toLowerCase();

  if (mLower.includes('por pagar') || mLower.includes('pendiente')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
        {m}
      </span>
    );
  }
  if (mLower.includes('banco') || mLower.includes('qr') || mLower.includes('transf')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/80">
        {m}
      </span>
    );
  }
  if (mLower.includes('efectivo')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
        {m}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
      {m}
    </span>
  );
};

export const ReporteViajeEconomico: React.FC<ReporteViajeEconomicoProps> = ({
  viajes = [],
  manifiestosOrigen = [],
  manifiestosDestino = [],
  gastosRuta = [],
  transacciones = [],
  catalogos,
  empresa,
  selectedViajeIdInicial,
  onVerComprobante,
  onRefreshData,
  onDeleteSubManifiesto,
  showToast
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // 1. SELECTOR DE VIAJE ACTIVO
  const [selectedViajeId, setSelectedViajeId] = useState<string>(() => {
    if (selectedViajeIdInicial) return selectedViajeIdInicial;
    const viajeEnCurso = viajes.find(v => v.estadoViaje === 'En Tránsito' || v.estadoViaje === 'En Reparto');
    return viajeEnCurso?.idViaje || viajes[0]?.idViaje || '';
  });

  useEffect(() => {
    if (selectedViajeIdInicial) {
      setSelectedViajeId(selectedViajeIdInicial);
    }
  }, [selectedViajeIdInicial]);

  // Filtro de camión (placa)
  const [filtroPlaca, setFiltroPlaca] = useState<string>('Todas');

  // Estado de secciones plegables (acordeones)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    bloque1: true,
    sec1_1: true, // MIC
    sec1_2: true, // Sub-Manifiestos Destino
    sec1_3: true, // Ingresos Liquidación Fletes
    sec1_4: true, // Otros Ingresos Chofer/Admin
    bloqueCxC: true, // Sección Cuentas por Cobrar (Créditos)
    bloque2: true,
    sec2_1: true, // Gastos Admin
    sec2_2: true, // Gastos Chofer
    bloqueBalance: true // Balance & Firmas
  });

  // Modal de registro unificado
  const [isModalOperacionOpen, setIsModalOperacionOpen] = useState(false);
  const [modalRolInicial, setModalRolInicial] = useState<'Propietario' | 'Chofer'>('Chofer');
  const [modalPestañaInicial, setModalPestañaInicial] = useState<'Gasto' | 'Ingreso' | 'Transferencia'>('Gasto');

  // Sub-manifiesto seleccionado para ver Estado de Cuenta desplegado
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Sub-manifiesto a eliminar en cascada
  const [subToDelete, setSubToDelete] = useState<ManifiestoDestino | null>(null);

  // Prefill dinámico para el modal de operaciones
  const [modalPrefill, setModalPrefill] = useState<{
    concepto?: string;
    detalle?: string;
    importe?: string;
    cliente?: string;
    nroManifiesto?: string;
  }>({});

  // Modal foto comprobante
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);

  // Estado de sincronización
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleExpandSub = (id: string) => {
    setExpandedSubId(prev => (prev === id ? null : id));
  };

  const handleDeleteSub = async (sub: ManifiestoDestino) => {
    const id = sub.idSubManifiesto;
    try {
      if (onDeleteSubManifiesto) {
        await onDeleteSubManifiesto(id);
      } else {
        const res = await storage.eliminarSubManifiestoCascada(id);
        if (onRefreshData) onRefreshData();
        showToast(res.message || `Sub-manifiesto ${sub.nroManifiesto || id} eliminado por completo.`, 'info');
      }
    } catch (err: any) {
      showToast(`Error al eliminar sub-manifiesto: ${err.message || 'Error'}`, 'warning');
    }
  };

  const handleAbrirModalOperacion = (rol: 'Propietario' | 'Chofer', pestaña: 'Gasto' | 'Ingreso' | 'Transferencia') => {
    setModalRolInicial(rol);
    setModalPestañaInicial(pestaña);
    setModalPrefill({});
    setIsModalOperacionOpen(true);
  };

  const handleAbrirModalPagoSubManifiesto = (d: ManifiestoDestino, saldo: number) => {
    const nroDoc = d.nroManifiesto || d.idSubManifiesto;
    setModalRolInicial('Chofer');
    setModalPestañaInicial('Ingreso');
    setModalPrefill({
      concepto: 'Cobro Flete Destino',
      detalle: `Cobro Flete Sub-MIC [${nroDoc}] - Destino ${d.sucursalDestino} (${d.destinatario || 'General'})`,
      importe: saldo > 0 ? saldo.toFixed(2) : '',
      cliente: d.destinatario || '',
      nroManifiesto: nroDoc
    });
    setIsModalOperacionOpen(true);
  };

  const toggleSection = (sec: string) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const expandirTodasSecciones = () => {
    setOpenSections({
      bloque1: true,
      sec1_1: true,
      sec1_2: true,
      sec1_3: true,
      sec1_4: true,
      bloqueCxC: true,
      bloque2: true,
      sec2_1: true,
      sec2_2: true,
      bloqueBalance: true
    });
  };

  const colapsarTodasSecciones = () => {
    setOpenSections({
      bloque1: false,
      sec1_1: false,
      sec1_2: false,
      sec1_3: false,
      sec1_4: false,
      bloqueCxC: false,
      bloque2: false,
      sec2_1: false,
      sec2_2: false,
      bloqueBalance: false
    });
  };

  // Placas únicas
  const listaPlacas = useMemo(() => {
    const set = new Set<string>();
    viajes.forEach(v => { if (v.placaCamion) set.add(v.placaCamion); });
    return Array.from(set).sort();
  }, [viajes]);

  // Viajes filtrados por placa
  const viajesDisponibles = useMemo(() => {
    if (filtroPlaca === 'Todas') return viajes;
    return viajes.filter(v => v.placaCamion === filtroPlaca);
  }, [viajes, filtroPlaca]);

  // Viaje actualmente activo
  const viajeActivo = useMemo<Viaje | null>(() => {
    if (!selectedViajeId) return viajes[0] || null;
    return viajes.find(v => v.idViaje === selectedViajeId) || viajes[0] || null;
  }, [viajes, selectedViajeId]);

  const handlePlacaChange = (placa: string) => {
    setFiltroPlaca(placa);
    if (placa !== 'Todas') {
      const primerViaje = viajes.find(v => v.placaCamion === placa);
      if (primerViaje) {
        setSelectedViajeId(primerViaje.idViaje);
      }
    }
  };

  // =========================================================================
  // BLOQUE 1: INGRESOS DEL VIAJE (4 SUB-SECCIONES)
  // =========================================================================
  
  // 1.1 Manifiestos de Carga Maestros (MIC)
  const manifiestosMIC = useMemo(() => {
    if (!viajeActivo) return [];
    return manifiestosOrigen.filter(m => m.idViajeAsignado === viajeActivo.idViaje);
  }, [manifiestosOrigen, viajeActivo]);

  const totalFleteMIC = useMemo(() => {
    return manifiestosMIC.reduce((acc, m) => acc + (Number(m.fleteTotalBs) || 0), 0);
  }, [manifiestosMIC]);

  const totalCobradoOrigenMIC = useMemo(() => {
    return manifiestosMIC.reduce((acc, m) => acc + (Number(m.cobradoOrigenBs) || 0), 0);
  }, [manifiestosMIC]);

  // 1.2 Sub-Manifiestos y Encomiendas de Destino
  const subManifiestosDestino = useMemo(() => {
    if (!viajeActivo) return [];
    const idsMIC = new Set(manifiestosMIC.map(m => m.idManifiesto));
    return manifiestosDestino.filter(m => 
      m.idViaje === viajeActivo.idViaje || idsMIC.has(m.idManifiestoPadre)
    );
  }, [manifiestosDestino, viajeActivo, manifiestosMIC]);

  const totalFleteDestino = useMemo(() => {
    return subManifiestosDestino.reduce((acc, m) => acc + (Number(m.fleteAsignadoBs) || 0), 0);
  }, [subManifiestosDestino]);

  const totalCobradoEnDestino = useMemo(() => {
    return subManifiestosDestino.reduce((acc, m) => {
      const cobrado = (m.estadoLiquidacion === 'Liquidado en Sucursal' || m.estadoCobranzaDestino === 'Cobrado / Liquidado a Empresa')
        ? (Number(m.fleteAsignadoBs) || 0)
        : (Number(m.cobrosRealizadosBs) || 0);
      return acc + cobrado;
    }, 0);
  }, [subManifiestosDestino]);

  // Fletes consolidados del viaje (Informativo de Carga Operativa Pactada)
  const fletesConsolidadosViaje = useMemo(() => {
    if (viajeActivo && typeof viajeActivo.fletesManifiestosBs === 'number' && viajeActivo.fletesManifiestosBs > 0) {
      return viajeActivo.fletesManifiestosBs;
    }
    const suma = totalFleteMIC + totalFleteDestino;
    return suma > 0 ? suma : (viajeActivo?.fletesManifiestosBs || 0);
  }, [viajeActivo, totalFleteMIC, totalFleteDestino]);

  // =========================================================================
  // SUB-SECCIÓN 1.3: INGRESOS POR LIQUIDACIÓN DE FLETES
  // (Cobros reales recaudados en origen + recaudaciones efectivas de destino)
  // =========================================================================
  const fletesLiquidadosOrigen = useMemo(() => {
    if (!viajeActivo) return [];

    // Buscar transacciones reales de origen (despachos MIC / cobros en origen)
    const txOrigen = transacciones.filter(t => 
      t.tipo === 'Ingreso' &&
      t.idViaje === viajeActivo.idViaje &&
      (
        t.categoria === 'Fletes Despachos MIC' ||
        t.categoria === 'Cobro Flete Origen' ||
        (t.notas && t.notas.toLowerCase().includes('pago en origen')) ||
        (t.notas && t.notas.toLowerCase().includes('cobro en origen')) ||
        t.origenRegistro === 'Cobro_Origen'
      )
    );

    // Si existen transacciones registradas de flete en origen, mostrar dichas transacciones reales
    if (txOrigen.length > 0) {
      return txOrigen.map(t => ({
        id: `TX-ORIGEN-${t.idTransaccion}`,
        fecha: formatFechaClean(t.fecha),
        tipo: 'Ingreso' as const,
        categoria: t.categoria || 'Cobro Flete Origen',
        metodoPago: t.metodoPago === 'Por Cobrar' ? 'Por Cobrar (CxC Sucursal Origen)' : (t.metodoPago || `Caja Sucursal`),
        detalle: t.notas || `Cobro en origen por MIC (${t.sucursal || 'Origen'})`,
        montoBs: Number(t.montoBs || 0),
        nroDoc: t.nroManifiesto || viajeActivo.idViaje || 'MIC'
      }));
    }

    // Fallback: Si no existen transacciones explícitas pero el MIC tiene cobradoOrigenBs
    return manifiestosMIC.filter(m => (Number(m.cobradoOrigenBs) || 0) > 0).map(m => ({
      id: `MIC-COB-${m.idManifiesto}`,
      fecha: formatFechaClean(m.fechaEmision),
      tipo: 'Ingreso' as const,
      categoria: 'Cobro Flete Origen',
      metodoPago: `Caja Sucursal ${m.sucursalOrigen || 'Origen'}`,
      detalle: `Cobro en origen por MIC ${m.nroManifiestoMIC} (${m.sucursalOrigen || 'Origen'})`,
      montoBs: Number(m.cobradoOrigenBs || 0),
      nroDoc: m.nroManifiestoMIC
    }));
  }, [manifiestosMIC, transacciones, viajeActivo]);

  const fletesLiquidadosDestino = useMemo(() => {
    return subManifiestosDestino.filter(d => {
      const cobrado = (d.estadoLiquidacion === 'Liquidado en Sucursal' || d.estadoCobranzaDestino === 'Cobrado / Liquidado a Empresa')
        ? (Number(d.fleteAsignadoBs) || 0)
        : (Number(d.cobrosRealizadosBs) || 0);
      return cobrado > 0;
    }).map(d => {
      const cobrado = (d.estadoLiquidacion === 'Liquidado en Sucursal' || d.estadoCobranzaDestino === 'Cobrado / Liquidado a Empresa')
        ? (Number(d.fleteAsignadoBs) || 0)
        : (Number(d.cobrosRealizadosBs) || 0);
      return {
        id: `SUB-COB-${d.idSubManifiesto}`,
        fecha: formatFechaClean(viajeActivo?.fechaSalida),
        tipo: 'Ingreso' as const,
        categoria: 'Recaudación Flete Destino',
        metodoPago: d.estadoLiquidacion || d.estadoCobranzaDestino || 'Liquidado en Sucursal',
        detalle: `Recaudación Sub-MIC [${d.nroManifiesto || d.idSubManifiesto}] - ${d.sucursalDestino} (Para: ${d.destinatario || 'General'})`,
        montoBs: cobrado,
        nroDoc: d.nroManifiesto || d.idSubManifiesto
      };
    });
  }, [subManifiestosDestino, viajeActivo]);

  // Transacciones directas de flete extraordinarias que no provengan del cobro en origen ni de cobros ya listados en subManifiestos
  const transaccionesFleteExtra = useMemo(() => {
    if (!viajeActivo) return [];
    return transacciones.filter(t => 
      t.tipo === 'Ingreso' &&
      t.idViaje === viajeActivo.idViaje &&
      t.origenRegistro !== 'Cobro_Manifiesto' &&
      t.origenRegistro !== 'Cobro_Origen' &&
      t.categoria !== 'Fletes Despachos MIC' &&
      t.categoria !== 'Cobro Flete Origen' &&
      !(t.notas && t.notas.toLowerCase().includes('pago en origen')) &&
      !(t.notas && t.notas.toLowerCase().includes('cobro en origen')) &&
      (t.categoria.toLowerCase().includes('flete') || t.categoria.toLowerCase().includes('liquidaci') || t.categoria.toLowerCase().includes('cobro flete'))
    );
  }, [transacciones, viajeActivo]);

  // Total recaudado de fletes computable para el viaje (Origen exacto + Destino exacto + Extraordinarios)
  const totalLiquidacionFletes = useMemo(() => {
    const sumOrig = fletesLiquidadosOrigen.reduce((acc, item) => acc + (Number(item.montoBs) || 0), 0);
    const sumDest = totalCobradoEnDestino;
    const sumExtra = transaccionesFleteExtra.reduce((acc, t) => acc + (Number(t.montoBs) || 0), 0);
    return sumOrig + sumDest + sumExtra;
  }, [fletesLiquidadosOrigen, totalCobradoEnDestino, transaccionesFleteExtra]);

  // =========================================================================
  // SUB-SECCIÓN 1.4: OTROS INGRESOS DE PROPIETARIOS Y CHOFERES
  // (Anticipos de viáticos recibidos, transferencias, aportes extraordinarios)
  // =========================================================================
  const otrosIngresosAdmin = useMemo(() => {
    if (!viajeActivo) return [];
    return transacciones.filter(t => 
      t.tipo === 'Ingreso' &&
      t.idViaje === viajeActivo.idViaje &&
      t.rolUsuario !== 'Chofer' &&
      t.origenRegistro !== 'Cobro_Manifiesto' &&
      !t.categoria.toLowerCase().includes('flete') &&
      !t.categoria.toLowerCase().includes('liquidaci') &&
      !t.categoria.toLowerCase().includes('cobro flete')
    );
  }, [transacciones, viajeActivo]);

  const totalOtrosIngresosAdmin = useMemo(() => {
    return otrosIngresosAdmin.reduce((acc, t) => acc + (Number(t.montoBs) || 0), 0);
  }, [otrosIngresosAdmin]);

  // Ingresos Chofer (Anticipos recibidos para combustible, peajes o viáticos)
  const ingresosChofer = useMemo(() => {
    if (!viajeActivo) return { deRuta: [], deTx: [] };
    const deRuta = gastosRuta.filter(g => 
      g.idViajeAsignado === viajeActivo.idViaje && 
      (g.tipoOperacion === 'Ingreso' || g.categoriaGasto?.toLowerCase().includes('anticipo'))
    );
    const deTx = transacciones.filter(t => 
      t.tipo === 'Ingreso' &&
      t.idViaje === viajeActivo.idViaje &&
      t.rolUsuario === 'Chofer'
    );
    return { deRuta, deTx };
  }, [gastosRuta, transacciones, viajeActivo]);

  const totalIngresosChofer = useMemo(() => {
    const sumRuta = ingresosChofer.deRuta.reduce((acc, g) => acc + (Number(g.importeBs) || 0), 0);
    const sumTx = ingresosChofer.deTx.reduce((acc, t) => acc + (Number(t.montoBs) || 0), 0);
    return sumRuta + sumTx;
  }, [ingresosChofer]);

  const totalOtrosIngresos = totalOtrosIngresosAdmin + totalIngresosChofer;

  // =========================================================================
  // CUENTAS POR COBRAR (CxC / CRÉDITOS DEL VIAJE)
  // =========================================================================
  const itemsCxCViaje = useMemo(() => {
    const items: Array<{
      id: string;
      tipoDoc: 'MIC' | 'Sub-MIC';
      nroDocumento: string;
      clienteDestinatario: string;
      fleteTotalBs: number;
      totalPagadoBs: number;
      saldoPendienteBs: number;
      estado: 'Pagado' | 'Parcial' | 'Por Cobrar';
      sucursal: string;
    }> = [];

    // Manifiestos de Carga Origen (MIC)
    manifiestosMIC.forEach(m => {
      const fleteTotal = Number(m.fleteTotalBs || 0);
      const pagado = Number(m.cobradoOrigenBs || 0);
      const saldo = Number(m.saldoCobrarDestinosBs !== undefined ? m.saldoCobrarDestinosBs : Math.max(0, fleteTotal - pagado));
      const estado = saldo <= 0 ? 'Pagado' : pagado > 0 ? 'Parcial' : 'Por Cobrar';
      items.push({
        id: m.idManifiesto,
        tipoDoc: 'MIC',
        nroDocumento: m.nroManifiestoMIC,
        clienteDestinatario: `Agencia Origen: ${m.sucursalOrigen || 'Origen'} (Carga Consolidada)`,
        fleteTotalBs: fleteTotal,
        totalPagadoBs: pagado,
        saldoPendienteBs: saldo,
        estado,
        sucursal: m.sucursalOrigen || 'Origen'
      });
    });

    // Sub-Manifiestos y Encomiendas de Destino
    subManifiestosDestino.forEach(d => {
      const calc = calcularSaldosSubManifiesto(d);
      const fleteTotal = calc.fleteTotal;
      const pagado = (d.estadoLiquidacion === 'Liquidado en Sucursal' || d.estadoCobranzaDestino === 'Cobrado / Liquidado a Empresa')
        ? fleteTotal
        : (calc.pagadoOrigen + calc.cobrosRealizados);
      const saldo = calc.saldoPendienteCliente + calc.saldoPendienteAgencia;
      const estado = calc.estaLiquidadoTotal ? 'Pagado' : pagado > 0 ? 'Parcial' : 'Por Cobrar';
      items.push({
        id: d.idSubManifiesto,
        tipoDoc: 'Sub-MIC',
        nroDocumento: d.nroManifiesto || d.idSubManifiesto,
        clienteDestinatario: `${d.destinatario || 'General'} (${d.sucursalDestino})${calc.esResponsableAgencia ? ' • [Resp: Agencia]' : ' • [Resp: Cliente]'}`,
        fleteTotalBs: fleteTotal,
        totalPagadoBs: pagado,
        saldoPendienteBs: saldo,
        estado,
        sucursal: d.sucursalDestino || 'Destino'
      });
    });

    return items;
  }, [manifiestosMIC, subManifiestosDestino]);

  const totalFleteCxC = useMemo(() => itemsCxCViaje.reduce((acc, i) => acc + i.fleteTotalBs, 0), [itemsCxCViaje]);
  const totalPagadoCxC = useMemo(() => itemsCxCViaje.reduce((acc, i) => acc + i.totalPagadoBs, 0), [itemsCxCViaje]);
  const totalSaldoPendienteCxC = useMemo(() => itemsCxCViaje.reduce((acc, i) => acc + i.saldoPendienteBs, 0), [itemsCxCViaje]);

  // =========================================================================
  // BLOQUE 2: GASTOS DEL VIAJE (2 SUB-SECCIONES)
  // =========================================================================

  // 2.1 Transacciones de Gastos de Administrador
  const gastosAdmin = useMemo(() => {
    if (!viajeActivo) return [];
    return transacciones.filter(t => 
      t.tipo === 'Gasto' &&
      t.idViaje === viajeActivo.idViaje &&
      t.rolUsuario !== 'Chofer'
    );
  }, [transacciones, viajeActivo]);

  const totalGastosAdmin = useMemo(() => {
    return gastosAdmin.reduce((acc, t) => acc + (Number(t.montoBs) || 0), 0);
  }, [gastosAdmin]);

  // 2.2 Transacciones de Gastos de Chofer
  const gastosChofer = useMemo(() => {
    if (!viajeActivo) return { deRuta: [], deTx: [] };
    const deRuta = gastosRuta.filter(g => 
      g.idViajeAsignado === viajeActivo.idViaje && 
      g.tipoOperacion !== 'Ingreso' &&
      !g.categoriaGasto?.toLowerCase().includes('anticipo')
    );
    const deTx = transacciones.filter(t => 
      t.tipo === 'Gasto' &&
      t.idViaje === viajeActivo.idViaje &&
      t.rolUsuario === 'Chofer'
    );
    return { deRuta, deTx };
  }, [gastosRuta, transacciones, viajeActivo]);

  const totalGastosChofer = useMemo(() => {
    const sumRuta = gastosChofer.deRuta.reduce((acc, g) => acc + (Number(g.importeBs) || 0), 0);
    const sumTx = gastosChofer.deTx.reduce((acc, t) => acc + (Number(t.montoBs) || 0), 0);
    return sumRuta + sumTx;
  }, [gastosChofer]);

  // =========================================================================
  // RESUMEN ECONÓMICO FINAL Y RENDICIÓN
  // SEPARACIÓN FINANCIERA: Las secciones 1.1 y 1.2 son informativas operativas.
  // El ingreso computable proviene estrictamente de la Sección 1.3 + Sección 1.4
  // =========================================================================
  const granTotalIngresos = totalLiquidacionFletes + totalOtrosIngresos;
  const granTotalGastos = totalGastosChofer + totalGastosAdmin;
  const utilidadNetaViaje = granTotalIngresos - granTotalGastos;
  const margenPct = granTotalIngresos > 0 
    ? Number(((utilidadNetaViaje / granTotalIngresos) * 100).toFixed(1))
    : 0;

  // Saldo a Rendir por el Chofer: Anticipos recibidos (-) Gastos justificados en ruta
  const saldoRendirChofer = totalIngresosChofer - totalGastosChofer;

  // Desglose de Cuentas y Cajas Afectadas en Ruta
  const metodosPagoDesglose = useMemo(() => {
    if (!viajeActivo) return [];
    const map = new Map<string, number>();

    gastosChofer.deRuta.forEach(g => {
      const metodo = g.cajaCuentaUtilizada || 'Efectivo Chofer Ruta';
      const actual = map.get(metodo) || 0;
      map.set(metodo, actual + (Number(g.importeBs) || 0));
    });

    gastosChofer.deTx.forEach(t => {
      const metodo = t.metodoPago || 'Efectivo Chofer Ruta';
      const actual = map.get(metodo) || 0;
      map.set(metodo, actual + (Number(t.montoBs) || 0));
    });

    return Array.from(map.entries()).map(([metodo, total]) => ({ metodo, total }));
  }, [gastosChofer, viajeActivo]);

  // Actualizar estado operativo/financiero del viaje
  const handleCambiarEstadoViaje = (nuevoEstado: EstadoViaje) => {
    if (!viajeActivo) return;
    try {
      const viajeActualizado: Viaje = {
        ...viajeActivo,
        estadoViaje: nuevoEstado
      };
      storage.updateViaje(viajeActualizado);
      showToast(`Estado del viaje ${viajeActivo.idViaje} actualizado a "${nuevoEstado}".`, 'success');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(`Error al actualizar estado: ${err.message || 'Error'}`, 'warning');
    }
  };

  // Botón Sincronizar Datos
  const handleSincronizarDatos = () => {
    setIsRefreshing(true);
    try {
      if (onRefreshData) {
        onRefreshData();
      }
      setTimeout(() => {
        setIsRefreshing(false);
        showToast('Datos del viaje y transacciones sincronizados en tiempo real.', 'success');
      }, 350);
    } catch (err: any) {
      setIsRefreshing(false);
      showToast('Error al sincronizar datos.', 'warning');
    }
  };

  // Exportar a Excel
  const handleExportExcel = () => {
    if (!viajeActivo) return;
    try {
      const fechaHoy = new Date().toISOString().split('T')[0];
      const rows: Record<string, any>[] = [];

      // Resumen Ejecutivo
      rows.push({
        Seccion: 'RESUMEN EJECUTIVO',
        'ID Viaje': viajeActivo.idViaje,
        'Placa Camion': viajeActivo.placaCamion,
        'Chofer': viajeActivo.choferAsignado,
        'Concepto / Detalle': 'Fletes Operativos Pactados (Informativo)',
        'Origen del Fondo / Caja': '-',
        'Ingreso (Bs)': fletesConsolidadosViaje,
        'Gasto (Bs)': 0
      });

      // 1.1 MIC Operativo
      manifiestosMIC.forEach(m => {
        rows.push({
          Seccion: '1.1 MANIFIESTOS MIC (OPERATIVO)',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': `MIC: ${m.nroManifiestoMIC} (${m.sucursalOrigen || 'Origen'}) - Cobrado Origen: Bs. ${Number(m.cobradoOrigenBs || 0).toFixed(2)}`,
          'Origen del Fondo / Caja': 'Agencia Origen',
          'Ingreso (Bs)': Number(m.fleteTotalBs || 0),
          'Gasto (Bs)': 0
        });
      });

      // 1.2 Destino Operativo
      subManifiestosDestino.forEach(d => {
        const saldos = calcularSaldosSubManifiesto(d);
        rows.push({
          Seccion: '1.2 ENCOMIENDAS DESTINO (OPERATIVO)',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': `Sub-MIC: ${d.nroManifiesto || d.idSubManifiesto} - Dest: ${d.destinatario || 'General'} (Cobrado: Bs. ${(saldos.pagadoOrigen + saldos.cobrosRealizados).toFixed(2)}, Saldo Cliente: Bs. ${saldos.saldoPendienteCliente.toFixed(2)}, Saldo Agencia: Bs. ${saldos.saldoPendienteAgencia.toFixed(2)})`,
          'Origen del Fondo / Caja': saldos.esResponsableAgencia ? `Agencia ${d.sucursalDestino}` : (d.modalidadCobroDestino || 'Cliente Destino'),
          'Ingreso (Bs)': saldos.fleteTotal,
          'Gasto (Bs)': 0
        });
      });

      // 1.3 Liquidación de Fletes (Efectivo/Caja Real)
      fletesLiquidadosOrigen.forEach(item => {
        rows.push({
          Seccion: '1.3 LIQUIDACIÓN FLETES - ORIGEN',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': item.detalle,
          'Origen del Fondo / Caja': item.metodoPago,
          'Ingreso (Bs)': item.montoBs,
          'Gasto (Bs)': 0
        });
      });

      fletesLiquidadosDestino.forEach(item => {
        rows.push({
          Seccion: '1.3 LIQUIDACIÓN FLETES - DESTINO',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': item.detalle,
          'Origen del Fondo / Caja': item.metodoPago,
          'Ingreso (Bs)': item.montoBs,
          'Gasto (Bs)': 0
        });
      });

      transaccionesFleteExtra.forEach(t => {
        rows.push({
          Seccion: '1.3 LIQUIDACIÓN FLETES - EXTRA',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': `${t.categoria}: ${t.notas || '-'}`,
          'Origen del Fondo / Caja': t.metodoPago,
          'Ingreso (Bs)': Number(t.montoBs || 0),
          'Gasto (Bs)': 0
        });
      });

      // 1.4 Otros Ingresos
      otrosIngresosAdmin.forEach(t => {
        rows.push({
          Seccion: '1.4 OTROS INGRESOS - ADMINISTRACIÓN',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': `${t.categoria}: ${t.notas || '-'}`,
          'Origen del Fondo / Caja': t.metodoPago,
          'Ingreso (Bs)': Number(t.montoBs || 0),
          'Gasto (Bs)': 0
        });
      });

      ingresosChofer.deRuta.forEach(g => {
        rows.push({
          Seccion: '1.4 OTROS INGRESOS - CHOFER RUTA',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': `${g.categoriaGasto}: ${g.detalleGasto || '-'}`,
          'Origen del Fondo / Caja': g.cajaCuentaUtilizada || 'Efectivo Chofer',
          'Ingreso (Bs)': Number(g.importeBs || 0),
          'Gasto (Bs)': 0
        });
      });

      ingresosChofer.deTx.forEach(t => {
        rows.push({
          Seccion: '1.4 OTROS INGRESOS - CHOFER TX',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': `${t.categoria}: ${t.notas || '-'}`,
          'Origen del Fondo / Caja': t.metodoPago || 'Efectivo Chofer',
          'Ingreso (Bs)': Number(t.montoBs || 0),
          'Gasto (Bs)': 0
        });
      });

      // 2.1 Gastos Admin
      gastosAdmin.forEach(t => {
        rows.push({
          Seccion: '2.1 GASTOS ADMIN / TALLER',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': `${t.categoria}: ${t.notas || '-'} (Prov: ${t.nombreProveedor || '-'})`,
          'Origen del Fondo / Caja': t.metodoPago,
          'Ingreso (Bs)': 0,
          'Gasto (Bs)': Number(t.montoBs || 0)
        });
      });

      // 2.2 Gastos Chofer
      gastosChofer.deRuta.forEach(g => {
        rows.push({
          Seccion: '2.2 GASTOS CHOFER RUTA',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': `${g.categoriaGasto}: ${g.detalleGasto || '-'} (Prov: ${g.nombreProveedor || '-'})`,
          'Origen del Fondo / Caja': g.cajaCuentaUtilizada || 'Efectivo Chofer Ruta',
          'Ingreso (Bs)': 0,
          'Gasto (Bs)': Number(g.importeBs || 0)
        });
      });

      gastosChofer.deTx.forEach(t => {
        rows.push({
          Seccion: '2.2 GASTOS CHOFER RUTA (TX)',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': `${t.categoria}: ${t.notas || '-'} (Prov: ${t.nombreProveedor || '-'})`,
          'Origen del Fondo / Caja': t.metodoPago || 'Efectivo Chofer Ruta',
          'Ingreso (Bs)': 0,
          'Gasto (Bs)': Number(t.montoBs || 0)
        });
      });

      // ESTADO DE CUENTAS POR COBRAR (CxC)
      itemsCxCViaje.forEach(item => {
        rows.push({
          Seccion: 'ESTADO CUENTAS POR COBRAR (CxC)',
          'ID Viaje': viajeActivo.idViaje,
          'Placa Camion': viajeActivo.placaCamion,
          'Chofer': viajeActivo.choferAsignado,
          'Concepto / Detalle': `[${item.tipoDoc}] Doc: ${item.nroDocumento} | Cliente: ${item.clienteDestinatario} | Estado: ${item.estado}`,
          'Origen del Fondo / Caja': item.sucursal || 'Sucursal',
          'Ingreso (Bs)': item.totalPagadoBs,
          'Gasto (Bs)': item.saldoPendienteBs
        });
      });

      // Totales
      rows.push({
        Seccion: 'TOTALES',
        'ID Viaje': `Utilidad Neta: Bs. ${utilidadNetaViaje.toFixed(2)} (${margenPct}%)`,
        'Placa Camion': `Saldo Rendir Chofer: Bs. ${saldoRendirChofer.toFixed(2)}`,
        'Chofer': '',
        'Concepto / Detalle': `Total Saldo CxC Pendiente: Bs. ${totalSaldoPendienteCxC.toFixed(2)}`,
        'Origen del Fondo / Caja': '',
        'Ingreso (Bs)': granTotalIngresos,
        'Gasto (Bs)': granTotalGastos
      });

      exportToExcel(rows, `Reporte_Economico_${viajeActivo.idViaje}_${fechaHoy}`, 'Reporte_Viaje');
      showToast('Reporte económico exportado a Excel con éxito.', 'success');
    } catch (err: any) {
      showToast(`Error al exportar: ${err.message || 'Error'}`, 'warning');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Renderizador del Estado de Cuenta Histórico por Sub-Manifiesto
  const renderEstadoCuentaSubManifiesto = (d: ManifiestoDestino) => {
    const flete = Number(d.fleteAsignadoBs) || 0;
    const nroCodigo = d.nroManifiesto || d.idSubManifiesto;

    // Buscar transacciones asociadas a este sub-manifiesto
    const matchedTxs = transacciones.filter(t => {
      if (t.tipo !== 'Ingreso') return false;
      if (t.idViaje && viajeActivo && t.idViaje !== viajeActivo.idViaje) return false;
      if (t.nroManifiesto && (t.nroManifiesto === nroCodigo || t.nroManifiesto === d.idSubManifiesto)) return true;
      if (t.notas && (t.notas.includes(d.idSubManifiesto) || (d.nroManifiesto && t.notas.includes(d.nroManifiesto)))) return true;
      if (d.destinatario && (t.nombreCliente === d.destinatario || t.deudorNombre === d.destinatario)) {
        const cat = (t.categoria || '').toLowerCase();
        if (cat.includes('flete') || cat.includes('destino') || cat.includes('cobro') || cat.includes('encomienda') || cat.includes('recaud')) {
          return true;
        }
      }
      return false;
    });

    const pagosHistorial: Array<{
      id: string;
      fecha: string;
      tipo: string;
      metodo: string;
      detalle: string;
      monto: number;
      badgeStyle?: string;
    }> = [];

    const pagadoOrigen = Number(d.pagadoOrigenBs) || 0;

    // 1. Clasificar transacciones registradas de origen y destino
    const matchedOriginTxs = matchedTxs.filter(t => 
      t.categoria === 'Fletes Despachos MIC' ||
      t.categoria === 'Cobro Flete Origen' ||
      (t.categoria && t.categoria.toLowerCase().includes('origen')) ||
      (t.notas && t.notas.toLowerCase().includes('pago en origen')) ||
      (t.notas && t.notas.toLowerCase().includes('cobro en origen')) ||
      t.origenRegistro === 'Cobro_Origen'
    );

    const matchedDestinoTxs = matchedTxs.filter(t => !matchedOriginTxs.includes(t));

    // Si existen transacciones reales de origen, mostrarlas sin duplicar
    if (matchedOriginTxs.length > 0) {
      matchedOriginTxs.forEach(t => {
        pagosHistorial.push({
          id: t.idTransaccion,
          fecha: formatFechaClean(t.fecha),
          tipo: t.categoria || 'Cobro Flete Origen',
          metodo: t.metodoPago || 'Caja Origen',
          detalle: t.notas || `Cobro registrado en origen para ${d.destinatario || 'cliente'}`,
          monto: Number(t.montoBs) || 0,
          badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200'
        });
      });
    } else if (pagadoOrigen > 0) {
      // Fallback únicamente si no existe ninguna transacción real de origen registrada
      pagosHistorial.push({
        id: `PAGO-ORIG-${d.idSubManifiesto}`,
        fecha: formatFechaClean(viajeActivo?.fechaSalida),
        tipo: 'Cobro Flete Origen (Anticipo)',
        metodo: d.cuentaAfectadaOrigen || 'Efectivo Caja Origen',
        detalle: `Pago inicial registrado en agencia origen para ${d.destinatario || 'encomienda'}`,
        monto: pagadoOrigen,
        badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200'
      });
    }

    // 2. Transacciones registradas de destino
    matchedDestinoTxs.forEach(t => {
      pagosHistorial.push({
        id: t.idTransaccion,
        fecha: formatFechaClean(t.fecha),
        tipo: t.categoria || 'Cobro Flete Destino',
        metodo: t.metodoPago,
        detalle: t.notas || `Cobro registrado para ${d.destinatario || 'cliente'}`,
        monto: Number(t.montoBs) || 0,
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      });
    });

    // 3. Si no hay transacciones pero existen cobros registrados en el sub-manifiesto
    const cobrosReg = Number(d.cobrosRealizadosBs) || 0;
    if (pagosHistorial.length === 0 && cobrosReg > 0) {
      pagosHistorial.push({
        id: `REG-DEST-${d.idSubManifiesto}`,
        fecha: formatFechaClean(viajeActivo?.fechaLlegada || viajeActivo?.fechaSalida),
        tipo: 'Cobro Flete Destino',
        metodo: d.estadoLiquidacion || d.estadoCobranzaDestino || 'Liquidado en Sucursal',
        detalle: `Recaudación registrada en sucursal destino (${d.sucursalDestino})`,
        monto: cobrosReg,
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      });
    }

    // 4. Si el sub-manifiesto figura liquidado pero no tiene registros individuales
    const estaLiquidadoFlag = d.estadoLiquidacion === 'Liquidado en Sucursal' || d.estadoCobranzaDestino === 'Cobrado / Liquidado a Empresa';
    if (pagosHistorial.length === 0 && estaLiquidadoFlag && flete > 0) {
      pagosHistorial.push({
        id: `LIQ-SUC-${d.idSubManifiesto}`,
        fecha: formatFechaClean(viajeActivo?.fechaLlegada || viajeActivo?.fechaSalida),
        tipo: 'Liquidación en Sucursal',
        metodo: 'Liquidado en Sucursal',
        detalle: `Flete liquidado en sucursal destino ${d.sucursalDestino}`,
        monto: flete,
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      });
    }

    // Totales calculados
    const totalCobrado = estaLiquidadoFlag && pagosHistorial.length === 0
      ? flete
      : pagosHistorial.reduce((acc, p) => acc + p.monto, 0);

    const saldosCalc = calcularSaldosSubManifiesto(d);
    const estaLiquidado = saldosCalc.estaLiquidadoTotal || estaLiquidadoFlag;
    const esParcial = !estaLiquidado && totalCobrado > 0;
    const estadoBadgeTexto = estaLiquidado ? 'Liquidado' : esParcial ? 'Pendiente Parcial' : 'Por Cobrar';

    return (
      <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs animate-in fade-in duration-200">
        {/* Cabecera del Estado de Cuenta */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm text-blue-900 bg-blue-100/80 border border-blue-300 px-2.5 py-0.5 rounded-lg shadow-2xs">
                {nroCodigo}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                • Estado de Cuenta Histórico
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 mt-1.5 font-medium">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Sucursal Destino: <strong className="text-slate-900">{d.sucursalDestino}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Destinatario: <strong className="text-slate-900">{d.destinatario || 'General'}</strong></span>
              </span>
              {d.descripcionCarga && (
                <span className="text-slate-500 italic">
                  ({d.descripcionCarga})
                </span>
              )}
            </div>
          </div>

          <div className="text-right self-end sm:self-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Flete Asignado Total</span>
            <span className="text-base font-black font-mono tabular-nums text-slate-900">{formatBs(flete)}</span>
          </div>
        </div>

        {/* Tabla de Historial de Pagos / Amortizaciones */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              <span>Historial de Pagos y Amortizaciones ({pagosHistorial.length})</span>
            </span>
            {pagosHistorial.length > 0 && (
              <span className="text-xs text-slate-500">
                {pagosHistorial.length} movimiento{pagosHistorial.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {pagosHistorial.length === 0 ? (
            <div className="py-7 px-4 text-center bg-white rounded-xl border border-dashed border-slate-200">
              <FileText className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">No se registran pagos o amortizaciones asociadas a este sub-manifiesto aún.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">El importe total de este flete se encuentra pendiente de cobro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3 w-28">Fecha</th>
                    <th className="py-2.5 px-3 w-44">Tipo de Pago</th>
                    <th className="py-2.5 px-3 w-40">Método / Cuenta</th>
                    <th className="py-2.5 px-3">Detalle / Nota</th>
                    <th className="py-2.5 px-3 text-right w-36">Monto Pagado (Bs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagosHistorial.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {p.fecha}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.badgeStyle || 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {p.tipo}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderMetodoBadge(p.metodo)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {p.detalle}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-emerald-600 whitespace-nowrap">
                        + {formatBs(p.monto, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Barra de Resumen de Saldos al pie del estado de cuenta desplegado */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full md:w-auto flex-1 font-mono">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Flete Asignado</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">{formatBs(flete)}</span>
            </div>

            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-700 uppercase font-bold block">Total Cobrado</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-700 tabular-nums">{formatBs(totalCobrado)}</span>
            </div>

            {/* Saldo Pendiente Cliente */}
            <div className={`p-2.5 rounded-xl border ${saldosCalc.saldoPendienteCliente > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
              <span className="text-[10px] font-bold uppercase block flex items-center gap-1">
                <User className="w-3 h-3 text-blue-600" />
                <span>Saldo Cliente</span>
              </span>
              <span className={`text-xs sm:text-sm font-black tabular-nums block mt-0.5 ${saldosCalc.saldoPendienteCliente > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {formatBs(saldosCalc.saldoPendienteCliente)}
              </span>
            </div>

            {/* Saldo Pendiente Agencia */}
            <div className={`p-2.5 rounded-xl border ${saldosCalc.saldoPendienteAgencia > 0 ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
              <span className="text-[10px] font-bold uppercase block flex items-center gap-1">
                <Building2 className="w-3 h-3 text-purple-600" />
                <span>Saldo Agencia</span>
              </span>
              <span className={`text-xs sm:text-sm font-black tabular-nums block mt-0.5 ${saldosCalc.saldoPendienteAgencia > 0 ? 'text-purple-700' : 'text-slate-400'}`}>
                {formatBs(saldosCalc.saldoPendienteAgencia)}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center items-start">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Responsable / Estado</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                estaLiquidado
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {estaLiquidado ? <Check className="w-3 h-3 text-emerald-700" /> : null}
                {saldosCalc.estadoBadgeTexto} ({saldosCalc.responsableTipo === 'AGENCIA' ? 'Agencia' : 'Cliente'})
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="w-full md:w-auto shrink-0 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSubToDelete(d);
              }}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/90 font-bold text-xs rounded-xl shadow-2xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
              title="Eliminar este sub-manifiesto por completo en cascada"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Eliminar Sub-Manifiesto</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAbrirModalPagoSubManifiesto(d, saldosCalc.saldoPendienteCliente + saldosCalc.saldoPendienteAgencia);
              }}
              className="w-full md:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Nuevo Pago / Cobro para este Sub-Manifiesto</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150">
      
      {/* ======================================================== */}
      {/* 1. CABECERA DE CONTROL SUPERIOR (ESTILO EJECUTIVO)       */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        {/* Selectores de Viaje / Camión */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
          {/* Selector de Placa */}
          <div className="flex items-center gap-2 min-w-[170px]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">
              Camión:
            </span>
            <select
              value={filtroPlaca}
              onChange={(e) => handlePlacaChange(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 font-mono outline-none cursor-pointer transition-colors"
            >
              <option value="Todas">🚛 Todas las Placas ({listaPlacas.length})</option>
              {listaPlacas.map(placa => (
                <option key={placa} value={placa}>🚛 {placa}</option>
              ))}
            </select>
          </div>

          {/* Selector de Viaje */}
          <div className="flex items-center gap-2 min-w-[260px] flex-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">
              Viaje:
            </span>
            <select
              value={selectedViajeId}
              onChange={(e) => setSelectedViajeId(e.target.value)}
              className="w-full bg-blue-50/60 hover:bg-blue-50 border border-blue-200 text-blue-950 rounded-xl px-3 py-2 text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-colors"
            >
              {viajesDisponibles.map(v => (
                <option key={v.idViaje} value={v.idViaje}>
                  {v.idViaje} • {v.placaCamion} ({v.choferAsignado}) - {v.estadoViaje}
                </option>
              ))}
            </select>
          </div>

          {/* Selector en Vivo de Estado Operativo */}
          {viajeActivo && (
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70">
              <span className="text-xs font-semibold text-slate-500 uppercase">Estado:</span>
              <select
                value={viajeActivo.estadoViaje}
                onChange={(e) => handleCambiarEstadoViaje(e.target.value as EstadoViaje)}
                className="bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-2 py-0.5 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="En Tránsito">🟡 En Tránsito</option>
                <option value="En Reparto">🔵 En Reparto</option>
                <option value="Liquidado / Cerrado">🟢 Liquidado / Cerrado</option>
              </select>
            </div>
          )}
        </div>

        {/* Botones de Acción Rápida con Iconos y Bordes Sutiles */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Botón Sincronizar / Actualizar Datos */}
          <button
            type="button"
            onClick={handleSincronizarDatos}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            title="Sincronizar datos del viaje y transacciones"
          >
            <RotateCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          {/* Botón Exportar a Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 bg-white hover:bg-emerald-50/50 text-emerald-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-emerald-200/80 shadow-2xs transition-all active:scale-95"
            title="Exportar Reporte a Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          {/* Botón Imprimir Reporte */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95"
            title="Imprimir Reporte Membretado Oficial"
          >
            <Printer className="w-3.5 h-3.5 text-blue-300" />
            <span>Imprimir Reporte</span>
          </button>

          {/* Botón Acción Rápida: + Operación */}
          <button
            type="button"
            onClick={() => handleAbrirModalOperacion('Chofer', 'Gasto')}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95"
            title="Registrar Operación con el Modal Ágil"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Operación</span>
          </button>
        </div>
      </div>

      {/* ÁREA DE CONTENIDO IMPRIMIBLE */}
      <div ref={printRef} className="space-y-6">
        
        {/* Cabecera Oficial Membretada (Impresión / PDF) */}
        <div className="hidden print:block p-6 border-b-2 border-slate-900 mb-4 bg-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black uppercase text-slate-900">
                {empresa?.nombre || 'TRANSPODRIVE - GESTIÓN DE TRANSPORTE Y ENCOMIENDAS'}
              </h1>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mt-0.5">
                REPORTE VIAJE Y CONTROL INTEGRAL POR UNIDAD
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-700">
              <div>Fecha Emisión: {new Date().toLocaleDateString('es-BO')}</div>
              <div>ID Viaje: <strong>{viajeActivo?.idViaje}</strong></div>
              <div>Camión: <strong>{viajeActivo?.placaCamion}</strong></div>
            </div>
          </div>
        </div>

        {/* FICHA EJECUTIVA DE LA UNIDAD Y RUTA */}
        {viajeActivo && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200/70">
                    {viajeActivo.idViaje}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Reporte Viaje • Camión {viajeActivo.placaCamion}
                  </h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase mt-1">
                  Chofer Titular: <strong className="text-slate-800 normal-case">{viajeActivo.choferAsignado}</strong> • Salida: {viajeActivo.fechaSalida} • Estimada: {viajeActivo.fechaLlegada || 'En curso'}
                </p>
                {viajeActivo.observacionesRuta && (
                  <p className="text-xs text-slate-500 italic mt-0.5">
                    "{viajeActivo.observacionesRuta}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  viajeActivo.estadoViaje === 'En Tránsito'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : viajeActivo.estadoViaje === 'En Reparto'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {viajeActivo.estadoViaje}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div>
                <span className="text-xs font-semibold text-slate-500 block uppercase">Unidad / Camión:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">🚛 {viajeActivo.placaCamion}</span>
                <span className="text-slate-400 block text-[11px] font-mono mt-0.5">CC-{viajeActivo.placaCamion.replace(/\s+/g, '')}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block uppercase">Chofer Asignado:</span>
                <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {viajeActivo.choferAsignado}
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5">Responsable en ruta</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block uppercase">Ruta Origen / Destino:</span>
                <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {viajeActivo.origen || 'Origen'} ➔ {viajeActivo.destino || 'Destino'}
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5">Salida: {viajeActivo.fechaSalida}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block uppercase">Manifiestos MIC:</span>
                <span className="font-mono font-bold text-blue-700 text-sm block truncate">
                  {manifiestosMIC.length > 0 ? manifiestosMIC.map(m => m.nroManifiestoMIC).join(', ') : 'Sin MIC registrado'}
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5">{manifiestosMIC.length} MICs • {subManifiestosDestino.length} Destinos</span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. TARJETAS DE INDICADORES CLAVE (KPIs / RESUMEN ECONÓMICO) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
          
          {/* Card 1: Total Ingresos (Bs.) - Acento en Verde Esmeralda */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between transition-all hover:border-emerald-300">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Ingresos (Bs.)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-slate-900 block tabular-nums tracking-tight">
                {formatBs(granTotalIngresos)}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
              <span>Fletes Liq: <strong className="text-slate-700 tabular-nums">{formatBs(totalLiquidacionFletes, false)}</strong></span>
              <span>Otros Ing: <strong className="text-slate-700 tabular-nums">{formatBs(totalOtrosIngresos, false)}</strong></span>
            </div>
          </div>

          {/* Card 2: Total Gastos (Bs.) - Acento en Rojo/Slate */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between transition-all hover:border-rose-300">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Gastos (Bs.)
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-rose-600 block tabular-nums tracking-tight">
                - {formatBs(granTotalGastos, false)}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
              <span>Chofer: <strong className="text-slate-700 tabular-nums">{formatBs(totalGastosChofer, false)}</strong></span>
              <span>Admin: <strong className="text-slate-700 tabular-nums">{formatBs(totalGastosAdmin, false)}</strong></span>
            </div>
          </div>

          {/* Card 3: Utilidad Neta del Viaje (Bs.) - Margen Porcentual */}
          <div className={`rounded-2xl border p-6 shadow-sm flex flex-col justify-between transition-all ${
            utilidadNetaViaje >= 0 
              ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300' 
              : 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  utilidadNetaViaje >= 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}>
                  Utilidad Neta (Bs.)
                </span>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                  utilidadNetaViaje >= 0 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-100 text-rose-800 border-rose-200'
                }`}>
                  {margenPct}% margen
                </span>
              </div>
              <span className={`text-2xl font-extrabold block tabular-nums tracking-tight ${
                utilidadNetaViaje >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {formatBs(utilidadNetaViaje)}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
              <span className="font-medium">Rentabilidad Operativa</span>
              <span className="font-bold text-slate-700">Unidad {viajeActivo?.placaCamion}</span>
            </div>
          </div>

          {/* Card 4: Saldo a Rendir por Chofer (Bs.) - Destacado en Contenedor Azul o Neutro */}
          <div className="bg-blue-50/50 rounded-2xl border border-blue-200/80 p-6 shadow-sm flex flex-col justify-between transition-all hover:border-blue-300">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
                  Saldo a Rendir Chofer
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <span className={`text-2xl font-extrabold block tabular-nums tracking-tight ${
                saldoRendirChofer >= 0 ? 'text-blue-950' : 'text-amber-800'
              }`}>
                {formatBs(Math.abs(saldoRendirChofer))}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-4 pt-3 border-t border-blue-200/60 block truncate">
              {saldoRendirChofer > 0
                ? 'Chofer debe devolver a empresa'
                : saldoRendirChofer < 0
                ? 'Empresa debe reembolsar a chofer'
                : 'Cuentas cuadradas (Bs. 0)'}
            </div>
          </div>
        </div>

        {/* Desglose de Cuentas y Cajas Afectadas en Ruta */}
        {metodosPagoDesglose.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 no-print">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              Fondos y métodos de pago utilizados en ruta:
            </span>
            <div className="flex flex-wrap gap-2">
              {metodosPagoDesglose.map((mp) => (
                <div
                  key={mp.metodo}
                  className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="text-slate-600 font-medium">{mp.metodo}:</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    Bs. {mp.total.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controles de expansión general */}
        <div className="flex items-center justify-between pt-2 pb-1 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Estructura Desglosada del Viaje
            </span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={expandirTodasSecciones}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
            >
              Expandir Todo
            </button>
            <button
              type="button"
              onClick={colapsarTodasSecciones}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
            >
              Colapsar Todo
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. DISEÑO POR SECCIONES PLEGABLES (ACORDEONES SAAS)     */}
        {/* ======================================================== */}

        {/* ======================================================== */}
        {/* BLOQUE 1: REPORTE INGRESOS DE VIAJE                      */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
          
          {/* Cabecera Principal de Bloque 1 */}
          <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                1
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>BLOQUE 1: REPORTE INGRESOS DE VIAJE</span>
                </h3>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Fletes MIC Maestros • Sub-Manifiestos y Encomiendas • Transacciones Admin y Chofer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleAbrirModalOperacion('Chofer', 'Ingreso')}
                className="no-print px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 shadow-2xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ingreso / Anticipo</span>
              </button>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Total Ingresos:</span>
                <span className="text-base font-extrabold text-emerald-600 tabular-nums">
                  {formatBs(granTotalIngresos)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            
            {/* SUB-SECCIÓN 1.1: Manifiestos de Carga Maestros (MIC) */}
            <div className="rounded-xl border border-slate-200/90 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('sec1_1')}
                className="w-full px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/70 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-800">
                    Sub-sección 1.1: Manifiestos de Carga Maestros (MIC) ({manifiestosMIC.length})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-emerald-600">
                    {formatBs(totalFleteMIC)}
                  </span>
                  {openSections.sec1_1 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.sec1_1 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase font-semibold tracking-wider border-b border-slate-200">
                        <th className="py-3 px-3 sm:px-4">Nro. Manifiesto</th>
                        <th className="py-3 px-3 sm:px-4">Origen</th>
                        <th className="py-3 px-3 sm:px-4">Fecha Emisión</th>
                        <th className="py-3 px-3 sm:px-4">Despachado</th>
                        <th className="py-3 px-3 sm:px-4 text-right">Flete Total</th>
                        <th className="py-3 px-3 sm:px-4 text-right">
                          <span>Cobrado en Origen</span>
                          <span className="block text-[9px] font-normal text-amber-700">Por Liquidar a Central (CxC)</span>
                        </th>
                        <th className="py-3 px-3 sm:px-4 text-right">Saldo en Destino</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {manifiestosMIC.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 italic text-sm">
                            No hay manifiestos de carga registrados para este viaje.
                          </td>
                        </tr>
                      ) : (
                        manifiestosMIC.map(m => {
                          const total = Number(m.fleteTotalBs || 0);
                          const cobrado = Number(m.cobradoOrigenBs || 0);
                          const saldo = Number(m.saldoCobrarDestinosBs !== undefined ? m.saldoCobrarDestinosBs : Math.max(0, total - cobrado));
                          return (
                            <tr key={m.idManifiesto} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3 sm:px-4 font-mono font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>{m.nroManifiestoMIC}</span>
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-sm font-semibold text-slate-800">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span>{m.sucursalOrigen}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-xs font-mono text-slate-600">
                                {formatFechaClean(m.fechaEmision)}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-xs">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <Check className="w-3 h-3 text-blue-600" />
                                  <span>{m.estadoManifiesto || 'Despachado'}</span>
                                </span>
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-slate-900 font-mono">
                                {formatBs(total)}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-emerald-600 font-mono">
                                <div>{formatBs(cobrado)}</div>
                                {cobrado > 0 && (
                                  <span className="inline-block text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 mt-0.5">
                                    Por Liquidar a Central (CxC)
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-slate-700 font-mono">
                                {formatBs(saldo)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-200 text-xs">
                        <td colSpan={4} className="py-3 px-3 sm:px-4 text-right uppercase tracking-wider">
                          Subtotal Manifiestos MIC:
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-sm tabular-nums text-slate-900 font-mono">
                          {formatBs(totalFleteMIC)}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-sm tabular-nums text-emerald-600 font-mono">
                          <div>{formatBs(totalCobradoOrigenMIC)}</div>
                          {totalCobradoOrigenMIC > 0 && (
                            <span className="inline-block text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 mt-0.5">
                              Por Liquidar a Central (CxC)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-sm tabular-nums text-slate-800 font-mono">
                          {formatBs(Math.max(0, totalFleteMIC - totalCobradoOrigenMIC))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* SUB-SECCIÓN 1.2: Sub-Manifiestos y Encomiendas de Destino */}
            <div className="rounded-xl border border-slate-200/90 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('sec1_2')}
                className="w-full px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/70 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-bold text-slate-800">
                    Sub-sección 1.2: Sub-Manifiestos y Encomiendas de Destino ({subManifiestosDestino.length})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-emerald-600">
                    {formatBs(totalFleteDestino)}
                  </span>
                  {openSections.sec1_2 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.sec1_2 && (
                <div className="space-y-4">
                  {/* Tarjetas Ejecutivas Estilizadas de Sub-Manifiestos Interactivas con Estado de Cuenta */}
                  {subManifiestosDestino.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 p-4 bg-slate-50/70 border-b border-slate-200">
                      {subManifiestosDestino.map(d => {
                        const saldos = calcularSaldosSubManifiesto(d);
                        const flete = saldos.fleteTotal;
                        const cobrado = (d.estadoLiquidacion === 'Liquidado en Sucursal' || d.estadoCobranzaDestino === 'Cobrado / Liquidado a Empresa')
                          ? flete
                          : (saldos.pagadoOrigen + saldos.cobrosRealizados);
                        const saldoCliente = saldos.saldoPendienteCliente;
                        const saldoAgencia = saldos.saldoPendienteAgencia;
                        const nroCodigo = d.nroManifiesto || d.idSubManifiesto;
                        const isExpanded = expandedSubId === d.idSubManifiesto;

                        return (
                          <div
                            key={d.idSubManifiesto}
                            onClick={() => toggleExpandSub(d.idSubManifiesto)}
                            className={`bg-white p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs space-y-3 ${
                              isExpanded
                                ? 'md:col-span-2 lg:col-span-3 ring-2 ring-blue-500/80 border-blue-400 bg-blue-50/15 shadow-md'
                                : 'border-slate-200/90 hover:border-blue-400 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-xs text-blue-900 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
                                  {nroCodigo}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                                  {isExpanded ? (
                                    <span className="text-blue-700 font-bold flex items-center gap-1">
                                      <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                                      Desplegado
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 flex items-center gap-1">
                                      <ChevronDown className="w-3.5 h-3.5" />
                                      Ver Detalle
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                {saldos.esResponsableAgencia ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                    🏢 Agencia
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    👤 Cliente
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  d.estadoLiquidacion === 'Liquidado en Sucursal' || d.estadoCobranzaDestino === 'Cobrado / Liquidado a Empresa'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : saldos.estaLiquidadoTotal
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : cobrado > 0
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}>
                                  {d.estadoLiquidacion || d.estadoCobranzaDestino || (saldos.estaLiquidadoTotal ? 'Liquidado' : cobrado > 0 ? 'Pendiente Parcial' : 'Por Cobrar')}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSubToDelete(d);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar Sub-Manifiesto de todo el sistema"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span>Destino: {d.sucursalDestino}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Para: <strong className="text-slate-800">{d.destinatario || 'General'}</strong></span>
                              </div>
                              {d.descripcionCarga && (
                                <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-1">
                                  {d.descripcionCarga}
                                </p>
                              )}
                            </div>

                            {/* Separación Financiera Dual: Flete | Cobrado | Saldo Cliente | Saldo Agencia */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center font-mono">
                              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase">Flete Total</span>
                                <span className="text-xs font-bold text-slate-900 tabular-nums">{formatBs(flete, false)}</span>
                              </div>
                              <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-100">
                                <span className="text-[10px] text-emerald-700 font-bold block uppercase">Cobrado</span>
                                <span className="text-xs font-bold text-emerald-700 tabular-nums">{formatBs(cobrado, false)}</span>
                                {cobrado > 0 && (
                                  <span className="block text-[8px] font-semibold text-amber-700">Por Liquidar a Central (CxC)</span>
                                )}
                              </div>
                              <div className={`p-1.5 rounded-lg border ${saldoCliente > 0 ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-slate-50 text-slate-600 border-slate-200/60'}`}>
                                <span className="text-[10px] font-bold block uppercase text-amber-700">👤 Saldo Cliente</span>
                                <span className="text-xs font-bold tabular-nums">{formatBs(saldoCliente, false)}</span>
                              </div>
                              <div className={`p-1.5 rounded-lg border ${saldoAgencia > 0 ? 'bg-purple-50/80 border-purple-200 text-purple-900' : 'bg-slate-50 text-slate-600 border-slate-200/60'}`}>
                                <span className="text-[10px] font-bold block uppercase text-purple-700">🏢 Saldo Agencia</span>
                                <span className="text-xs font-bold tabular-nums">{formatBs(saldoAgencia, false)}</span>
                              </div>
                            </div>

                            {/* Botón indicador para expandir detalle en la tabla inferior */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                              <span className={`inline-flex items-center gap-1.5 ${isExpanded ? 'text-blue-700' : 'text-slate-600 hover:text-blue-700'}`}>
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>{isExpanded ? 'Ocultar Detalle en Tabla' : 'Ver Detalle en Tabla'}</span>
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tabla con la Estructura de 7 Columnas: Fecha | Tipo | Categoria | Metodo /Cuenta | Detalle | Ingreso | Gasto */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase font-semibold tracking-wider border-b border-slate-200">
                          <th className="py-3 px-3 sm:px-4 w-28">Fecha</th>
                          <th className="py-3 px-3 sm:px-4 w-20">Tipo</th>
                          <th className="py-3 px-3 sm:px-4 w-56">Categoría / Destino</th>
                          <th className="py-3 px-3 sm:px-4 w-44">Método / Cuenta</th>
                          <th className="py-3 px-3 sm:px-4">Detalle</th>
                          <th className="py-3 px-3 sm:px-4 text-right w-36">Ingreso (Bs.)</th>
                          <th className="py-3 px-3 sm:px-4 text-right w-36">Gasto (Bs.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subManifiestosDestino.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400 italic text-sm">
                              No hay sub-manifiestos de destino registrados.
                            </td>
                          </tr>
                        ) : (
                          subManifiestosDestino.map(d => {
                            const saldos = calcularSaldosSubManifiesto(d);
                            const flete = saldos.fleteTotal;
                            const cobrado = (d.estadoLiquidacion === 'Liquidado en Sucursal' || d.estadoCobranzaDestino === 'Cobrado / Liquidado a Empresa')
                              ? flete
                              : (saldos.pagadoOrigen + saldos.cobrosRealizados);
                            const saldoCliente = saldos.saldoPendienteCliente;
                            const saldoAgencia = saldos.saldoPendienteAgencia;
                            const nroCodigo = d.nroManifiesto || d.idSubManifiesto;
                            const fecha = formatFechaClean(viajeActivo?.fechaSalida);
                            const isExpanded = expandedSubId === d.idSubManifiesto;

                            return (
                              <React.Fragment key={d.idSubManifiesto}>
                                <tr
                                  onClick={() => toggleExpandSub(d.idSubManifiesto)}
                                  className={`transition-colors cursor-pointer ${
                                    isExpanded
                                      ? 'bg-blue-50/50 font-medium'
                                      : 'hover:bg-blue-50/30'
                                  }`}
                                  title="Clic para ver u ocultar el Estado de Cuenta Histórico"
                                >
                                  <td className="py-3 px-3 sm:px-4 font-mono text-sm text-slate-600 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      {isExpanded ? (
                                        <ChevronUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      )}
                                      <span>{fecha}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Ingreso
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-sm text-slate-900 block">Flete {d.sucursalDestino}</span>
                                      {saldos.esResponsableAgencia ? (
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                          🏢 Agencia
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                          👤 Cliente
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-slate-500 block">Para: {d.destinatario || 'General'}</span>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                                      {d.estadoLiquidacion || d.estadoCobranzaDestino || (saldos.estaLiquidadoTotal ? 'Liquidado' : 'Por Cobrar')}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4 text-sm font-medium text-slate-700">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                                        [{nroCodigo}]
                                      </span>
                                      <span>{d.descripcionCarga || `Destino ${d.sucursalDestino}`}</span>
                                      <div className="flex items-center gap-1 text-[11px] font-mono">
                                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                          👤 Saldo Cli: Bs. {saldoCliente.toFixed(2)}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                                          🏢 Saldo Ag: Bs. {saldoAgencia.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="ml-auto flex items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50/70 border border-blue-200 px-2 py-0.5 rounded-md">
                                          <FileText className="w-3 h-3" />
                                          {isExpanded ? 'Ocultar Estado de Cuenta' : 'Ver Estado de Cuenta'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSubToDelete(d);
                                          }}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                          title="Eliminar Sub-Manifiesto de todo el sistema"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                                    + {formatBs(flete, false)}
                                  </td>
                                  <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                                    -
                                  </td>
                                </tr>

                                {/* FILA DESPLEGABLE: ESTADO DE CUENTA HISTÓRICO DE ESTE SUB-MANIFIESTO */}
                                {isExpanded && (
                                  <tr key={`${d.idSubManifiesto}-desplegado`} className="bg-slate-50/90 border-b-2 border-blue-200">
                                    <td colSpan={7} className="p-3 sm:p-5">
                                      {renderEstadoCuentaSubManifiesto(d)}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-200 text-xs">
                          <td colSpan={5} className="py-3 px-3 sm:px-4 text-right uppercase tracking-wider">
                            Subtotal Destinos:
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-right text-sm tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                            + {formatBs(totalFleteDestino)}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                            -
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* SUB-SECCIÓN 1.3: Ingresos por Liquidación de Fletes (Cobros en Origen y Recaudaciones en Destino) */}
            <div className="rounded-xl border border-slate-200/90 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('sec1_3')}
                className="w-full px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/70 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-800">
                    Sub-sección 1.3: Ingresos por Liquidación de Fletes (Cobros Reales en Origen + Destino) ({fletesLiquidadosOrigen.length + fletesLiquidadosDestino.length + transaccionesFleteExtra.length})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-emerald-600">
                    {formatBs(totalLiquidacionFletes)}
                  </span>
                  {openSections.sec1_3 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.sec1_3 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                        <th className="py-3 px-3 sm:px-4 w-28">Fecha</th>
                        <th className="py-3 px-3 sm:px-4 w-24">Tipo</th>
                        <th className="py-3 px-3 sm:px-4 w-52">Categoría</th>
                        <th className="py-3 px-3 sm:px-4 w-44">Método / Cuenta</th>
                        <th className="py-3 px-3 sm:px-4">Detalle</th>
                        <th className="py-3 px-3 sm:px-4 text-right w-36">Ingreso (Bs.)</th>
                        <th className="py-3 px-3 sm:px-4 text-right w-32">Gasto (Bs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fletesLiquidadosOrigen.length === 0 && fletesLiquidadosDestino.length === 0 && transaccionesFleteExtra.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 italic text-sm">
                            Sin cobros o liquidaciones efectivas de flete registradas para este viaje.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {/* 1. Cobros en Origen (MIC) */}
                          {fletesLiquidadosOrigen.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3 sm:px-4 font-mono text-sm text-slate-600 whitespace-nowrap">{m.fecha}</td>
                              <td className="py-3 px-3 sm:px-4">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Ingreso
                                </span>
                              </td>
                              <td className="py-3 px-3 sm:px-4 font-bold text-sm text-slate-900">
                                <span className="block">{m.categoria}</span>
                                <span className="text-xs font-mono text-blue-700">MIC: {m.nroDoc}</span>
                              </td>
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                {renderMetodoBadge(m.metodoPago)}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-sm font-medium text-slate-700">{m.detalle}</td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                                + {formatBs(m.montoBs, false)}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                                -
                              </td>
                            </tr>
                          ))}

                          {/* 2. Recaudaciones en Destino (Sub-MICs) */}
                          {fletesLiquidadosDestino.map(d => (
                            <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3 sm:px-4 font-mono text-sm text-slate-600 whitespace-nowrap">{d.fecha}</td>
                              <td className="py-3 px-3 sm:px-4">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Ingreso
                                </span>
                              </td>
                              <td className="py-3 px-3 sm:px-4 font-bold text-sm text-slate-900">
                                <span className="block">{d.categoria}</span>
                                <span className="text-xs font-mono text-purple-700">Sub-MIC: {d.nroDoc}</span>
                              </td>
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                {renderMetodoBadge(d.metodoPago)}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-sm font-medium text-slate-700">{d.detalle}</td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                                + {formatBs(d.montoBs, false)}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                                -
                              </td>
                            </tr>
                          ))}

                          {/* 3. Transacciones Extraordinarias de Liquidación / Cobranza */}
                          {transaccionesFleteExtra.map(t => (
                            <tr key={t.idTransaccion} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3 sm:px-4 font-mono text-sm text-slate-600 whitespace-nowrap">{formatFechaClean(t.fecha)}</td>
                              <td className="py-3 px-3 sm:px-4">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Ingreso
                                </span>
                              </td>
                              <td className="py-3 px-3 sm:px-4">
                                <span className="font-bold text-sm text-slate-900 block">{t.categoria}</span>
                                {t.nombreCliente && (
                                  <span className="text-xs text-slate-500 block">Cliente: {t.nombreCliente}</span>
                                )}
                              </td>
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                {renderMetodoBadge(t.metodoPago)}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-sm font-medium text-slate-700">{t.notas || '-'}</td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                                + {formatBs(t.montoBs, false)}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                                -
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-200 text-xs">
                        <td colSpan={5} className="py-3 px-3 sm:px-4 text-right uppercase tracking-wider">
                          Subtotal Ingresos por Liquidación de Fletes:
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-sm tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                          + {formatBs(totalLiquidacionFletes)}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                          -
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* SUB-SECCIÓN 1.4: Otros Ingresos de Propietarios y Choferes */}
            <div className="rounded-xl border border-slate-200/90 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('sec1_4')}
                className="w-full px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/70 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-800">
                    Sub-sección 1.4: Otros Ingresos de Propietarios y Choferes (Anticipos, Aportes y Transferencias) ({ingresosChofer.deRuta.length + ingresosChofer.deTx.length + otrosIngresosAdmin.length})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-emerald-600">
                    {formatBs(totalOtrosIngresos)}
                  </span>
                  {openSections.sec1_4 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.sec1_4 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                        <th className="py-3 px-3 sm:px-4 w-28">Fecha</th>
                        <th className="py-3 px-3 sm:px-4 w-24">Tipo</th>
                        <th className="py-3 px-3 sm:px-4 w-52">Categoría</th>
                        <th className="py-3 px-3 sm:px-4 w-44">Método / Cuenta</th>
                        <th className="py-3 px-3 sm:px-4">Detalle</th>
                        <th className="py-3 px-3 sm:px-4 text-right w-36">Ingreso (Bs.)</th>
                        <th className="py-3 px-3 sm:px-4 text-right w-32">Gasto (Bs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ingresosChofer.deRuta.length === 0 && ingresosChofer.deTx.length === 0 && otrosIngresosAdmin.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 italic text-sm">
                            Sin otros ingresos o anticipos extraordinarios registrados.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {/* Ingresos / Anticipos en Ruta Chofer */}
                          {ingresosChofer.deRuta.map(g => (
                            <tr key={g.idGastoRuta} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3 sm:px-4 font-mono text-sm text-slate-600 whitespace-nowrap">{formatFechaClean(g.fechaHora)}</td>
                              <td className="py-3 px-3 sm:px-4">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Ingreso
                                </span>
                              </td>
                              <td className="py-3 px-3 sm:px-4 font-bold text-sm text-slate-900">{g.categoriaGasto}</td>
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                {renderMetodoBadge(g.cajaCuentaUtilizada || 'Efectivo Chofer Ruta')}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-sm font-medium text-slate-700">{g.detalleGasto || '-'}</td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                                + {formatBs(g.importeBs, false)}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                                -
                              </td>
                            </tr>
                          ))}

                          {/* Ingresos / Anticipos por Transacción Chofer */}
                          {ingresosChofer.deTx.map(t => (
                            <tr key={t.idTransaccion} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3 sm:px-4 font-mono text-sm text-slate-600 whitespace-nowrap">{formatFechaClean(t.fecha)}</td>
                              <td className="py-3 px-3 sm:px-4">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Ingreso
                                </span>
                              </td>
                              <td className="py-3 px-3 sm:px-4 font-bold text-sm text-slate-900">{t.categoria}</td>
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                {renderMetodoBadge(t.metodoPago || 'Efectivo Chofer Ruta')}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-sm font-medium text-slate-700">{t.notas || '-'}</td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                                + {formatBs(t.montoBs, false)}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                                -
                              </td>
                            </tr>
                          ))}

                          {/* Otros Ingresos Extraordinarios de Administración */}
                          {otrosIngresosAdmin.map(t => (
                            <tr key={t.idTransaccion} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3 sm:px-4 font-mono text-sm text-slate-600 whitespace-nowrap">{formatFechaClean(t.fecha)}</td>
                              <td className="py-3 px-3 sm:px-4">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Ingreso
                                </span>
                              </td>
                              <td className="py-3 px-3 sm:px-4 font-bold text-sm text-slate-900">{t.categoria}</td>
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                {renderMetodoBadge(t.metodoPago || 'Efectivo')}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-sm font-medium text-slate-700">{t.notas || '-'}</td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                                + {formatBs(t.montoBs, false)}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                                -
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-200 text-xs">
                        <td colSpan={5} className="py-3 px-3 sm:px-4 text-right uppercase tracking-wider">
                          Subtotal Otros Ingresos:
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-sm tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                          + {formatBs(totalOtrosIngresos)}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                          -
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* SECCIÓN DEDICADA: ESTADO DE CUENTAS POR COBRAR (CxC)     */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
          <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>ESTADO DE CUENTAS POR COBRAR Y CRÉDITOS DEL VIAJE (CxC)</span>
                </h3>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Auditoría Relacional de Créditos • Saldos Pendientes de Manifiestos y Sub-Manifiestos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Saldo Pendiente Total:</span>
                <span className={`text-base font-extrabold tabular-nums ${totalSaldoPendienteCxC > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatBs(totalSaldoPendienteCxC)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('bloqueCxC')}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Plegar / Desplegar Cuentas por Cobrar"
              >
                {openSections.bloqueCxC ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {openSections.bloqueCxC && (
            <div className="p-5 sm:p-6">
              <div className="overflow-x-auto rounded-xl border border-slate-200/90">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                      <th className="py-3 px-3 sm:px-4 w-44">Nro. Documento</th>
                      <th className="py-3 px-3 sm:px-4">Cliente / Destinatario</th>
                      <th className="py-3 px-3 sm:px-4 text-right w-36">Flete Total (Bs.)</th>
                      <th className="py-3 px-3 sm:px-4 text-right w-44">Total Pagado / Amortizado (Bs.)</th>
                      <th className="py-3 px-3 sm:px-4 text-right w-40">Saldo Pendiente (Bs.)</th>
                      <th className="py-3 px-3 sm:px-4 text-center w-36">Estado</th>
                      <th className="py-3 px-3 sm:px-4 text-center w-28 no-print">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsCxCViaje.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 italic text-sm">
                          No hay manifiestos o sub-manifiestos asociados a este viaje para control de cuentas por cobrar.
                        </td>
                      </tr>
                    ) : (
                      itemsCxCViaje.map(item => {
                        const badgeClass = item.estado === 'Pagado'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90'
                          : item.estado === 'Parcial'
                          ? 'bg-amber-50 text-amber-800 border-amber-200/90'
                          : 'bg-rose-50 text-rose-800 border-rose-200/90';

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-3 sm:px-4 font-mono font-bold text-sm text-slate-900 whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                <FileText className={`w-3.5 h-3.5 shrink-0 ${item.tipoDoc === 'MIC' ? 'text-blue-600' : 'text-purple-600'}`} />
                                <span>{item.nroDocumento}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <span className="font-bold text-sm text-slate-800 block">{item.clienteDestinatario}</span>
                              <span className="text-[11px] text-slate-500 block">Sucursal: {item.sucursal} • Doc: {item.tipoDoc}</span>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-slate-900 font-mono whitespace-nowrap">
                              {formatBs(item.fleteTotalBs, false)}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                              {formatBs(item.totalPagadoBs, false)}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums font-mono whitespace-nowrap">
                              <span className={item.saldoPendienteBs > 0 ? 'text-rose-600' : 'text-slate-400'}>
                                {formatBs(item.saldoPendienteBs, false)}
                              </span>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}`}>
                                {item.estado}
                              </span>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap no-print">
                              {item.saldoPendienteBs > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirModalOperacion('Chofer', 'Ingreso')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors shadow-2xs active:scale-95"
                                  title="Registrar cobro o amortización para esta cuenta"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  <span>Cobrar</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Al día</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-200 text-xs">
                      <td colSpan={2} className="py-3 px-3 sm:px-4 uppercase tracking-wider text-slate-700">
                        Totales Cuentas por Cobrar (CxC):
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right text-sm tabular-nums text-slate-900 font-mono whitespace-nowrap">
                        {formatBs(totalFleteCxC)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right text-sm tabular-nums text-emerald-600 font-mono whitespace-nowrap">
                        {formatBs(totalPagadoCxC)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right text-sm tabular-nums text-rose-600 font-mono whitespace-nowrap">
                        {formatBs(totalSaldoPendienteCxC)}
                      </td>
                      <td colSpan={2} className="py-3 px-3 sm:px-4 text-center text-[11px] text-slate-500 font-medium">
                        {totalSaldoPendienteCxC <= 0 ? 'Sin saldos pendientes' : `${itemsCxCViaje.filter(i => i.saldoPendienteBs > 0).length} documentos con saldo pendiente`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* BLOQUE 2: REPORTE GASTOS DE VIAJE                        */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
          
          {/* Cabecera Principal de Bloque 2 */}
          <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                2
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>BLOQUE 2: REPORTE GASTOS DE VIAJE</span>
                </h3>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Gastos de Administración y Taller • Gastos Operativos de Ruta del Chofer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleAbrirModalOperacion('Chofer', 'Gasto')}
                className="no-print px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 shadow-2xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Registrar Gasto</span>
              </button>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Total Gastos:</span>
                <span className="text-base font-extrabold text-rose-600 tabular-nums">
                  - {formatBs(granTotalGastos, false)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            
            {/* SUB-SECCIÓN 2.1: Transacciones de Gastos de Administrador */}
            <div className="rounded-xl border border-slate-200/90 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('sec2_1')}
                className="w-full px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/70 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Wrench className="w-4 h-4 text-slate-700" />
                  <span className="text-sm font-bold text-slate-800">
                    Sub-sección 2.1: Transacciones de Gastos de Administrador ({gastosAdmin.length})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-rose-600">
                    - {formatBs(totalGastosAdmin, false)}
                  </span>
                  {openSections.sec2_1 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.sec2_1 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                        <th className="py-3 px-3 sm:px-4 w-28">Fecha</th>
                        <th className="py-3 px-3 sm:px-4 w-24">Tipo</th>
                        <th className="py-3 px-3 sm:px-4 w-56">Categoría</th>
                        <th className="py-3 px-3 sm:px-4 w-44">Método / Cuenta</th>
                        <th className="py-3 px-3 sm:px-4">Detalle</th>
                        <th className="py-3 px-3 sm:px-4 text-right w-32">Ingreso (Bs.)</th>
                        <th className="py-3 px-3 sm:px-4 text-right w-36">Gasto (Bs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gastosAdmin.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 italic text-sm">
                            Sin gastos extraordinarios de administración o taller central para este viaje.
                          </td>
                        </tr>
                      ) : (
                        gastosAdmin.map(t => (
                          <tr key={t.idTransaccion} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-3 sm:px-4 font-mono text-sm text-slate-600 whitespace-nowrap">{formatFechaClean(t.fecha)}</td>
                            <td className="py-3 px-3 sm:px-4">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Gasto
                              </span>
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <span className="font-bold text-sm text-slate-900 block">{t.categoria}</span>
                              {t.nombreProveedor && (
                                <span className="text-xs text-slate-500 block">Proveedor: {t.nombreProveedor}</span>
                              )}
                            </td>
                            <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                              {renderMetodoBadge(t.metodoPago)}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-sm font-medium text-slate-700">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{t.notas || '-'}</span>
                                {t.comprobanteFotoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => onVerComprobante ? onVerComprobante(t.comprobanteFotoUrl!) : setFotoModalUrl(t.comprobanteFotoUrl!)}
                                    className="text-slate-400 hover:text-blue-600 p-0.5 transition-colors"
                                    title="Ver foto de comprobante"
                                  >
                                    📸
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                              -
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-rose-600 font-mono whitespace-nowrap">
                              - {formatBs(t.montoBs, false)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-200 text-xs">
                        <td colSpan={5} className="py-3 px-3 sm:px-4 text-right uppercase tracking-wider">
                          Subtotal Gastos Admin:
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                          -
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-sm tabular-nums text-rose-600 font-mono whitespace-nowrap">
                          - {formatBs(totalGastosAdmin)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* SUB-SECCIÓN 2.2: Transacciones de Gastos de Chofer */}
            <div className="rounded-xl border border-slate-200/90 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('sec2_2')}
                className="w-full px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/70 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Fuel className="w-4 h-4 text-rose-600" />
                  <span className="text-sm font-bold text-slate-800">
                    Sub-sección 2.2: Transacciones de Gastos de Chofer ({gastosChofer.deRuta.length + gastosChofer.deTx.length})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-rose-600">
                    - {formatBs(totalGastosChofer, false)}
                  </span>
                  {openSections.sec2_2 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.sec2_2 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                        <th className="py-3 px-3 sm:px-4 w-28">Fecha</th>
                        <th className="py-3 px-3 sm:px-4 w-24">Tipo</th>
                        <th className="py-3 px-3 sm:px-4 w-60">Categoría</th>
                        <th className="py-3 px-3 sm:px-4 w-44">Método / Cuenta</th>
                        <th className="py-3 px-3 sm:px-4">Detalle</th>
                        <th className="py-3 px-3 sm:px-4 text-right w-32">Ingreso (Bs.)</th>
                        <th className="py-3 px-3 sm:px-4 text-right w-36">Gasto (Bs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gastosChofer.deRuta.length === 0 && gastosChofer.deTx.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 italic text-sm">
                            No se registraron gastos de ruta para este chofer.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {/* Gastos de Ruta del Chofer */}
                          {gastosChofer.deRuta.map(g => (
                            <tr key={g.idGastoRuta} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3 sm:px-4 font-mono text-sm text-slate-600 whitespace-nowrap">
                                {formatFechaClean(g.fechaHora)}
                              </td>
                              <td className="py-3 px-3 sm:px-4">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Gasto
                                </span>
                              </td>
                              <td className="py-3 px-3 sm:px-4">
                                <span className="font-bold text-sm text-slate-900 block">{g.categoriaGasto}</span>
                                {g.nombreProveedor ? (
                                  <span className="text-xs text-slate-500 block">
                                    Prov: {g.nombreProveedor}
                                  </span>
                                ) : g.litrosDiesel ? (
                                  <span className="text-xs text-amber-700 block font-mono">
                                    ⛽ {g.litrosDiesel} Litros
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                {renderMetodoBadge(g.cajaCuentaUtilizada || 'Efectivo Chofer Ruta')}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-sm font-medium text-slate-700">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{g.detalleGasto || '-'}</span>
                                  {g.comprobanteFotoUrl && (
                                    <button
                                      type="button"
                                      onClick={() => onVerComprobante ? onVerComprobante(g.comprobanteFotoUrl!) : setFotoModalUrl(g.comprobanteFotoUrl!)}
                                      className="text-slate-400 hover:text-blue-600 p-0.5 transition-colors"
                                      title="Ver foto de comprobante"
                                    >
                                      📸
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                                -
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-rose-600 font-mono whitespace-nowrap">
                                - {formatBs(g.importeBs, false)}
                              </td>
                            </tr>
                          ))}

                          {/* Gastos Chofer procedentes de transacciones */}
                          {gastosChofer.deTx.map(t => (
                            <tr key={t.idTransaccion} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3 sm:px-4 font-mono text-sm text-slate-600 whitespace-nowrap">
                                {formatFechaClean(t.fecha)}
                              </td>
                              <td className="py-3 px-3 sm:px-4">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Gasto
                                </span>
                              </td>
                              <td className="py-3 px-3 sm:px-4">
                                <span className="font-bold text-sm text-slate-900 block">{t.categoria}</span>
                                {t.nombreProveedor && (
                                  <span className="text-xs text-slate-500 block">
                                    Prov: {t.nombreProveedor}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                {renderMetodoBadge(t.metodoPago || 'Efectivo Chofer Ruta')}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-sm font-medium text-slate-700">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{t.notas || '-'}</span>
                                  {t.comprobanteFotoUrl && (
                                    <button
                                      type="button"
                                      onClick={() => onVerComprobante ? onVerComprobante(t.comprobanteFotoUrl!) : setFotoModalUrl(t.comprobanteFotoUrl!)}
                                      className="text-slate-400 hover:text-blue-600 p-0.5 transition-colors"
                                      title="Ver foto de comprobante"
                                    >
                                      📸
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                                -
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold tabular-nums text-rose-600 font-mono whitespace-nowrap">
                                - {formatBs(t.montoBs, false)}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-200 text-xs">
                        <td colSpan={5} className="py-3 px-3 sm:px-4 text-right uppercase tracking-wider">
                          Subtotal Gastos Chofer:
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono text-slate-300">
                          -
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-sm tabular-nums text-rose-600 font-mono whitespace-nowrap">
                          - {formatBs(totalGastosChofer)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* BLOQUE DE CONCILIACIÓN FINAL, PROTOCOLO DE CIERRE Y FIRMAS */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
          <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xs">
                3
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>RESUMEN DE CONCILIACIÓN, RENDICIÓN Y FIRMAS</span>
                  <Scale className="w-4 h-4 text-slate-500" />
                </h3>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Balance cruzado • Saldo Empresa vs Saldo Chofer • Protocolo de Auditoría
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-500 uppercase">
              Auditoría Contable TranspoDrive
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Lado A: Utilidad Empresa */}
            <div className="p-6 rounded-2xl bg-slate-900 text-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Saldo Empresa (Utilidad Neta del Viaje)
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    utilidadNetaViaje >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {utilidadNetaViaje >= 0 ? 'Superávit' : 'Déficit'}
                  </span>
                </div>

                <div className="space-y-1.5 my-3 text-sm">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>(+) Fletes Totales + Ingresos Admin:</span>
                    <span className="font-mono text-emerald-300 font-bold tabular-nums">{formatBs(granTotalIngresos)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>(-) Gastos Consolidación (Chofer + Admin):</span>
                    <span className="font-mono text-rose-300 font-bold tabular-nums">{formatBs(granTotalGastos)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-baseline justify-between mt-4">
                <span className="text-xs uppercase font-extrabold text-slate-300">
                  Utilidad Neta Real ({margenPct}%):
                </span>
                <span className={`text-2xl font-black tabular-nums font-mono ${
                  utilidadNetaViaje >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatBs(utilidadNetaViaje)}
                </span>
              </div>
            </div>

            {/* Lado B: Rendición Chofer */}
            <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-amber-200 mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                      Rendición del Chofer ({viajeActivo?.choferAsignado || 'Chofer'})
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    saldoRendirChofer >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {saldoRendirChofer >= 0 ? 'A Devolver' : 'A Reembolsar'}
                  </span>
                </div>

                <div className="space-y-1.5 my-3 text-sm">
                  <div className="flex justify-between text-slate-700 font-medium">
                    <span>(+) Anticipos y Viáticos Recibidos:</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">{formatBs(totalIngresosChofer)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 font-medium">
                    <span>(-) Gastos de Ruta Descargados:</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">{formatBs(totalGastosChofer)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-amber-200 flex items-baseline justify-between mt-4">
                <div>
                  <span className="text-xs uppercase font-extrabold text-amber-900 block">
                    {saldoRendirChofer >= 0 ? 'Saldo a Devolver a Caja Central:' : 'Saldo a Favor del Chofer:'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {saldoRendirChofer >= 0 ? 'Efectivo en posesión del chofer' : 'Empresa debe abonar el excedente'}
                  </span>
                </div>
                <span className={`text-2xl font-black tabular-nums font-mono ${
                  saldoRendirChofer >= 0 ? 'text-amber-800' : 'text-blue-700'
                }`}>
                  {formatBs(Math.abs(saldoRendirChofer))}
                </span>
              </div>
            </div>
          </div>

          {/* Firmas de Validación */}
          <div className="p-6 bg-slate-50/70 border-t border-slate-200/80">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <span>Validación de Conformidad y Cierre Contable</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center space-y-3">
                <div className="h-16 flex items-end justify-center pb-2 border-b border-dashed border-slate-300">
                  <div className="text-[10px] font-mono text-slate-400">
                    [ Sello de Auditoría Central / Tesorería ]
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Administrador Central / Auditor
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    Revisión de comprobantes y cierre de arqueo
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center space-y-3">
                <div className="h-16 flex items-end justify-center pb-2 border-b border-dashed border-slate-300">
                  <div className="text-[10px] font-mono text-slate-400">
                    [ Firma del Chofer Responsable ]
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {viajeActivo?.choferAsignado || 'Chofer Asignado'}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 font-mono">
                    Camión: {viajeActivo?.placaCamion || 'S/P'} • Fecha: {new Date().toLocaleDateString('es-BO')}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-500 text-center mt-4">
              Documento oficial de control económico y operativo. Válido para conciliación interna de cajas y liquidación de cuentas de viaje.
            </p>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 4. MODAL DE REGISTRO / EDICIÓN UNIFORME                  */}
      {/* ======================================================== */}
      {isModalOperacionOpen && (
        <PropietariosChoferesModal
          isOpen={isModalOperacionOpen}
          onClose={() => {
            setIsModalOperacionOpen(false);
            setModalPrefill({});
            if (onRefreshData) onRefreshData();
          }}
          rolInicial={modalRolInicial}
          pestañaInicial={modalPestañaInicial}
          viajeIdInicial={selectedViajeId}
          viajes={viajes}
          catalogos={catalogos || storage.getCatalogos()}
          conceptoInicial={modalPrefill.concepto}
          detalleInicial={modalPrefill.detalle}
          importeInicial={modalPrefill.importe}
          clienteInicial={modalPrefill.cliente}
          nroManifiestoInicial={modalPrefill.nroManifiesto}
          onTransaccionGuardada={(tx, continuar) => {
            if (onRefreshData) onRefreshData();
            showToast('Transacción registrada exitosamente.', 'success');
            if (!continuar) {
              setIsModalOperacionOpen(false);
              setModalPrefill({});
            }
          }}
          showToast={showToast}
        />
      )}

      {/* ======================================================== */}
      {/* 5. MODAL VISOR DE FOTO COMPROBANTE DIGITALIZADO          */}
      {/* ======================================================== */}
      {fotoModalUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="font-extrabold text-sm text-slate-900">Comprobante de Gasto Digitalizado</span>
              <button
                type="button"
                onClick={() => setFotoModalUrl(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex-1 overflow-auto flex items-center justify-center bg-slate-50 rounded-2xl my-3">
              <img src={fotoModalUrl} alt="Comprobante" className="max-h-[70vh] object-contain rounded-xl shadow-xs" />
            </div>
            <button
              type="button"
              onClick={() => setFotoModalUrl(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cerrar visor
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL CONFIRMACIÓN ELIMINACIÓN EN CASCADA DE SUB-MANIFIESTO */}
      {/* ======================================================== */}
      {subToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              ¿Eliminar Sub-Manifiesto en Cascada?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Se eliminará el sub-manifiesto <strong className="font-mono text-slate-900 font-bold">[{subToDelete.nroManifiesto || subToDelete.idSubManifiesto}]</strong> asignado a <strong className="text-slate-900">{subToDelete.sucursalDestino}</strong> para <strong className="text-slate-900">{subToDelete.destinatario || 'General'}</strong> (Flete: Bs. {Number(subToDelete.fleteAsignadoBs || 0).toFixed(2)}).
            </p>
            <div className="mt-3 p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl text-[11px] text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>⚠️ Eliminación Total en Cascada:</span>
              </p>
              <p>
                Esta acción ejecutará <strong className="font-mono text-rose-900">eliminarSubManifiestoCascada</strong>, purgando de inmediato sus registros en Transacciones, Gastos, Cobranzas, Reporte Viajes y Reportes Generales.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSubToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = subToDelete;
                  setSubToDelete(null);
                  if (target) {
                    await handleDeleteSub(target);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
