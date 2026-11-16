import React, { useState, useMemo } from 'react';
import { 
  PackageCheck, 
  MapPin, 
  DollarSign, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  Truck, 
  User, 
  Phone, 
  Share2, 
  Printer, 
  AlertCircle,
  Receipt,
  FileCheck,
  Table as TableIcon,
  LayoutGrid,
  Search,
  ArrowRight,
  Wallet,
  AlertTriangle,
  Zap,
  Building2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  X,
  ShieldCheck,
  FileText,
  Calendar,
  Check
} from 'lucide-react';
import { 
  ManifiestoDestino, 
  MovimientoManifDestino, 
  Catalogos, 
  CategoriaFinanciera, 
  Viaje, 
  ManifiestoOrigen,
  CajaCuenta,
  TipoRecaudadorDestino,
  EstadoRendicionDestino,
  TransaccionDiaria
} from '../types';
import { storage } from '../services/storageService';
import { formatBs } from '../utils/formatUtils';
import { calcularSaldosSubManifiesto } from '../utils/subManifiestoSaldos';
import { LiquidacionOrigenModal } from './LiquidacionOrigenModal';
import { LiquidacionDestinoModal } from './LiquidacionDestinoModal';
import { RegistrarCobranzaOrigenModal } from './RegistrarCobranzaOrigenModal';

interface CobranzasDestinoViewProps {
  manifiestosDestino: ManifiestoDestino[];
  movimientos: MovimientoManifDestino[];
  catalogos: Catalogos;
  viajes?: Viaje[];
  manifiestosOrigen?: ManifiestoOrigen[];
  categorias?: CategoriaFinanciera[];
  cajas?: CajaCuenta[];
  selectedSucursal: string;
  onRegistrarCobranza: (
    subManifiesto: ManifiestoDestino,
    cobroSaldoBs: number,
    deliveryBs: number,
    comisionBs: number,
    conceptoComision: string,
    cajaAfectada: string,
    nroComprobante: string,
    detalle: string,
    conceptoIngresoExtra?: string,
    idProveedorGasto?: string,
    tipoRecaudador?: TipoRecaudadorDestino,
    estadoRendicion?: EstadoRendicionDestino,
    comprobanteDepositoUrl?: string
  ) => Promise<void>;
  onOpenReceiptModal: (sub: ManifiestoDestino, reciboData: any) => void;
  onEditSub?: (sub: ManifiestoDestino) => void;
  onDeleteSub?: (sub: ManifiestoDestino) => void;
  onLiquidarCobroOrigen?: (idSubManifiesto: string, cuentaCentral: string, fecha?: string, notas?: string) => Promise<void>;
  onLiquidarSaldosAgenciaDestino?: (
    agenciaDestino: string,
    cuentaCentral: string,
    montoALiquidar: number,
    fecha?: string,
    notas?: string
  ) => Promise<void>;
  onLiquidarAgenciaConDeducciones?: (payload: any) => Promise<void>;
  onAddCategoria?: (cat: Omit<CategoriaFinanciera, 'id'>) => void;
  transacciones?: TransaccionDiaria[];
  onRefreshData?: () => void;
  showToast?: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export const CobranzasDestinoView: React.FC<CobranzasDestinoViewProps> = ({
  manifiestosDestino,
  movimientos,
  catalogos,
  viajes = [],
  manifiestosOrigen = [],
  categorias = [],
  cajas = [],
  transacciones = [],
  selectedSucursal,
  onRegistrarCobranza,
  onOpenReceiptModal,
  onEditSub,
  onDeleteSub,
  onLiquidarCobroOrigen,
  onLiquidarSaldosAgenciaDestino,
  onLiquidarAgenciaConDeducciones,
  onAddCategoria,
  onRefreshData,
  showToast
}) => {
  // Estado para confirmación de eliminación
  const [subToDelete, setSubToDelete] = useState<ManifiestoDestino | null>(null);

  // Estados de Modales de Liquidación Independientes
  const [isLiqOrigenModalOpen, setIsLiqOrigenModalOpen] = useState<boolean>(false);
  const [isLiqDestinoModalOpen, setIsLiqDestinoModalOpen] = useState<boolean>(false);

  // Modal para Registro de Cobranza en Origen
  const [isCobranzaOrigenModalOpen, setIsCobranzaOrigenModalOpen] = useState<boolean>(false);
  const [subParaCobroOrigen, setSubParaCobroOrigen] = useState<ManifiestoDestino | null>(null);

  // Acordeón de Estado de Cuenta desplegable en la misma ventana
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Modal State para Registro en Cascada
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedViajeId, setSelectedViajeId] = useState<string>('');
  const [selectedSubManifiestoId, setSelectedSubManifiestoId] = useState<string>('');

  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');
  const [filtroCentroCosto, setFiltroCentroCosto] = useState<string>('Todos');
  const [filtroViaje, setFiltroViaje] = useState<string>('Todos');
  const [filtroOrigen, setFiltroOrigen] = useState<string>('Todas');
  const [filtroDestino, setFiltroDestino] = useState<string>(selectedSucursal !== 'Todas' ? selectedSucursal : 'Todas');
  const [filtroDestinatario, setFiltroDestinatario] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table'); // Default Table como solicitado

  // Modal para liquidar cobro origen a central
  const [liquidarModal, setLiquidarModal] = useState<{
    open: boolean;
    sub: ManifiestoDestino | null;
    cuentaCentral: string;
    fecha: string;
    notas: string;
  }>({
    open: false,
    sub: null,
    cuentaCentral: 'Caja Oficina Central',
    fecha: new Date().toISOString().split('T')[0],
    notas: ''
  });

  // Modal para liquidar saldos retenidos por Agencias de Destino (Acción Rápida 3)
  const [liquidarAgenciasModal, setLiquidarAgenciasModal] = useState<{
    open: boolean;
    agencia: string;
    montoMax: number;
    montoALiquidar: number;
    cuentaCentral: string;
    fecha: string;
    notas: string;
  }>({
    open: false,
    agencia: '',
    montoMax: 0,
    montoALiquidar: 0,
    cuentaCentral: 'Caja Oficina Central',
    fecha: new Date().toISOString().split('T')[0],
    notas: ''
  });

  // Modalidades y Rendición de Cobranzas en Destino (Acción 2)
  const [tipoRecaudador, setTipoRecaudador] = useState<TipoRecaudadorDestino>('Agencia de Destino Cobró');
  const [estadoRendicion, setEstadoRendicion] = useState<EstadoRendicionDestino>('Retenido en Agencia (CxC Agencia)');
  const [comprobanteDepositoUrl, setComprobanteDepositoUrl] = useState<string>('');

  // Form State para la operación de cobro/reparto
  const [cobroSaldoBs, setCobroSaldoBs] = useState<string>('');
  const [deliveryBs, setDeliveryBs] = useState<string>('');
  const [conceptoIngresoExtra, setConceptoIngresoExtra] = useState<string>('Servicio Delivery Puerta a Puerta');
  const [comisionBs, setComisionBs] = useState<string>('');
  const [conceptoComision, setConceptoComision] = useState<string>('Comisiones y Fleteros Locales');
  const [idProveedorGasto, setIdProveedorGasto] = useState<string>('');
  const [cajaAfectada, setCajaAfectada] = useState<string>('');
  const [nroComprobante, setNroComprobante] = useState<string>('');
  const [detalleOperacion, setDetalleOperacion] = useState<string>('');
  const [mostrarOpcionesExtras, setMostrarOpcionesExtras] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mapeo de retenciones acumuladas por Agencia de Destino
  const agenciasRetenciones = useMemo(() => {
    const map: Record<string, number> = {};
    manifiestosDestino.forEach(s => {
      const monto = Number(s.montoRetenidoAgenciaBs) || 0;
      if (monto > 0 && s.estadoRendicionDestino === 'Retenido en Agencia (CxC Agencia)') {
        map[s.sucursalDestino] = (map[s.sucursalDestino] || 0) + monto;
      }
    });
    return map;
  }, [manifiestosDestino]);

  const totalRetenidoTodasAgencias = useMemo(() => {
    return Object.values(agenciasRetenciones).reduce((sum, v) => sum + v, 0);
  }, [agenciasRetenciones]);

  // 1. CASCADA: Lista de Viajes disponibles con Placa, Chofer y Conteo de pendientes
  const viajesDisponibles = useMemo(() => {
    const map = new Map<string, { idViaje: string; placa: string; chofer: string; pendientes: number }>();
    
    // Registrar viajes formales
    viajes.forEach(v => {
      map.set(v.idViaje, {
        idViaje: v.idViaje,
        placa: v.placaCamion || 'Camión asignado',
        chofer: v.choferAsignado || 'Chofer registrado',
        pendientes: 0
      });
    });

    // Detectar viajes vinculados a encomiendas de destino
    manifiestosDestino.forEach(sub => {
      const padre = manifiestosOrigen.find(m => m.idManifiesto === sub.idManifiestoPadre);
      const vId = sub.idViaje || padre?.idViajeAsignado;
      if (vId) {
        if (!map.has(vId)) {
          map.set(vId, {
            idViaje: vId,
            placa: 'Camión Asignado',
            chofer: 'Chofer',
            pendientes: 0
          });
        }
        if (sub.saldoPendienteClienteBs > 0) {
          const item = map.get(vId)!;
          item.pendientes += 1;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.pendientes - a.pendientes);
  }, [viajes, manifiestosDestino, manifiestosOrigen]);

  // 2. CASCADA: Sub-manifiestos / MICs dinámicos vinculados al ID Viaje seleccionado que tengan Saldo > 0
  const subManifiestosDisponibles = useMemo(() => {
    if (!selectedViajeId) return [];
    return manifiestosDestino.filter(sub => {
      const padre = manifiestosOrigen.find(m => m.idManifiesto === sub.idManifiestoPadre);
      const pertenece = sub.idViaje === selectedViajeId || padre?.idViajeAsignado === selectedViajeId;
      return pertenece && sub.saldoPendienteClienteBs > 0;
    });
  }, [selectedViajeId, manifiestosDestino, manifiestosOrigen]);

  // Sub-manifiesto seleccionado actual
  const selectedSub = useMemo(() => {
    return manifiestosDestino.find(s => s.idSubManifiesto === selectedSubManifiestoId) || null;
  }, [selectedSubManifiestoId, manifiestosDestino]);

  // Cajas disponibles cargadas desde la tabla Arqueo_Cajas (cajas) y Catálogos
  const cajasDisponibles = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const add = (nombre: string) => {
      const clean = nombre?.trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        list.push(clean);
      }
    };

    (cajas || []).forEach(c => add(c.nombre));
    (catalogos.cajasCuentas || []).forEach(add);

    // Opciones frecuentes aseguradas
    add('Caja Tarija');
    add('Caja Oficina Central');
    add('Banco Unión QR');
    add('Efectivo');
    add('Caja Sucursal Santa Cruz');
    add('Caja Sucursal La Paz');
    add('Caja Cochabamba');

    return list;
  }, [cajas, catalogos]);

  // Categorías de Ingresos y Gastos desde la tabla de Categorías Financieras y Catálogos
  const categoriasGastoDisponibles = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const add = (nombre: string) => {
      const clean = nombre?.trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        list.push(clean);
      }
    };

    // De la tabla Categorias Financieras tipo Gasto
    categorias.filter(c => c.tipo === 'Gasto').forEach(c => add(c.nombre));
    // Del catálogo tradicional
    (catalogos.categoriasGastoDestino || []).forEach(add);
    (catalogos.categoriasGastoRuta || []).forEach(add);

    add('Comisiones y Fleteros Locales');
    add('Comisión Cobrador');
    add('Fletero Local / Moto');
    add('Carga y Estiba Local');

    return list;
  }, [categorias, catalogos]);

  const categoriasIngresoDisponibles = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const add = (nombre: string) => {
      const clean = nombre?.trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        list.push(clean);
      }
    };

    // De la tabla Categorias Financieras tipo Ingreso
    categorias.filter(c => c.tipo === 'Ingreso').forEach(c => add(c.nombre));
    // Del catálogo tradicional
    (catalogos.categoriasIngresoDestino || []).forEach(add);

    add('Servicio Delivery Puerta a Puerta');
    add('Servicio Delivery');
    add('Almacenaje y Custodia');
    add('Otros Ingresos Varios');

    return list;
  }, [categorias, catalogos]);

  // Filtrar por Centro de Costo, Viaje, Origen, Destino, Estado y búsqueda
  const filteredSubs = useMemo(() => {
    return manifiestosDestino.filter(sub => {
      const padre = manifiestosOrigen.find(m => m.idManifiesto === sub.idManifiestoPadre);
      const viajeAsoc = viajes.find(v => v.idViaje === sub.idViaje || v.idViaje === padre?.idViajeAsignado);
      const origenViaje = sub.origenViaje || padre?.sucursalOrigen || viajeAsoc?.origen || 'Oruro';
      const centroCosto = viajeAsoc?.placaCamion || (viajeAsoc as any)?.centroCosto || '';

      if (filtroDestino !== 'Todas' && sub.sucursalDestino !== filtroDestino) return false;
      if (selectedSucursal !== 'Todas' && sub.sucursalDestino !== selectedSucursal) return false;
      if (filtroOrigen !== 'Todas' && origenViaje !== filtroOrigen) return false;
      if (filtroCentroCosto !== 'Todos' && centroCosto !== filtroCentroCosto) return false;
      if (filtroViaje !== 'Todos' && sub.idViaje !== filtroViaje && padre?.idViajeAsignado !== filtroViaje) return false;
      if (filtroEstado !== 'Todos' && sub.estadoLiquidacion !== filtroEstado) return false;
      if (filtroDestinatario.trim()) {
        const destQ = filtroDestinatario.toLowerCase().trim();
        const destName = (sub.destinatario || '').toLowerCase();
        if (!destName.includes(destQ)) return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const matchManif = sub.nroManifiesto.toLowerCase().includes(q);
        const matchViaje = sub.idViaje ? sub.idViaje.toLowerCase().includes(q) : false;
        const matchDest = sub.destinatario ? sub.destinatario.toLowerCase().includes(q) : false;
        const matchCarga = sub.descripcionCarga ? sub.descripcionCarga.toLowerCase().includes(q) : false;
        const matchOrigen = origenViaje.toLowerCase().includes(q);
        if (!matchManif && !matchViaje && !matchDest && !matchCarga && !matchOrigen) return false;
      }
      return true;
    });
  }, [manifiestosDestino, manifiestosOrigen, viajes, filtroDestino, selectedSucursal, filtroOrigen, filtroCentroCosto, filtroViaje, filtroEstado, filtroDestinatario, busqueda]);

  // Handlers para el flujo en cascada
  const handleOpenNewCobroModal = () => {
    // Buscar el primer viaje con encomiendas pendientes
    const viajeConPendientes = viajesDisponibles.find(v => v.pendientes > 0);
    const vId = viajeConPendientes ? viajeConPendientes.idViaje : (viajesDisponibles[0]?.idViaje || '');
    
    setSelectedViajeId(vId);
    
    // Obtener los manifiestos vinculados
    const subs = manifiestosDestino.filter(sub => {
      const padre = manifiestosOrigen.find(m => m.idManifiesto === sub.idManifiestoPadre);
      return (sub.idViaje === vId || padre?.idViajeAsignado === vId) && sub.saldoPendienteClienteBs > 0;
    });

    if (subs.length > 0) {
      const first = subs[0];
      setSelectedSubManifiestoId(first.idSubManifiesto);
      setCobroSaldoBs(String(first.saldoPendienteClienteBs));
      if (first.modalidadCobroDestino === 'Cobro Directo Empresa / Cliente') {
        setTipoRecaudador('Cobro Directo (Cliente canceló a Empresa/Chofer)');
        setCajaAfectada(cajasDisponibles[0] || 'Banco Unión QR');
      } else {
        setTipoRecaudador('Agencia de Destino Cobró');
        setEstadoRendicion('Retenido en Agencia (CxC Agencia)');
        setCajaAfectada(`CxC Agencia ${first.sucursalDestino}`);
      }
      setComprobanteDepositoUrl('');
      setNroComprobante(`REC-${first.sucursalDestino.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
      setDetalleOperacion(`Cobro flete saldo encomienda ${first.nroManifiesto} - ${first.destinatario || 'Cliente'}`);
    } else {
      setSelectedSubManifiestoId('');
      setCobroSaldoBs('');
      setTipoRecaudador('Agencia de Destino Cobró');
      setEstadoRendicion('Retenido en Agencia (CxC Agencia)');
      setCajaAfectada(cajasDisponibles[0] || 'Caja Tarija');
      setComprobanteDepositoUrl('');
      setNroComprobante(`REC-${Date.now().toString().slice(-4)}`);
      setDetalleOperacion('');
    }

    setDeliveryBs('0');
    setComisionBs('0');
    setMostrarOpcionesExtras(false);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenCobroModalFromSub = (sub: ManifiestoDestino) => {
    const padre = manifiestosOrigen.find(m => m.idManifiesto === sub.idManifiestoPadre);
    const vId = sub.idViaje || padre?.idViajeAsignado || '';

    setSelectedViajeId(vId);
    setSelectedSubManifiestoId(sub.idSubManifiesto);
    setCobroSaldoBs(sub.saldoPendienteClienteBs > 0 ? String(sub.saldoPendienteClienteBs) : '');
    setDeliveryBs('0');
    setComisionBs('0');
    if (sub.modalidadCobroDestino === 'Cobro Directo Empresa / Cliente') {
      setTipoRecaudador('Cobro Directo (Cliente canceló a Empresa/Chofer)');
      setCajaAfectada(cajasDisponibles[0] || 'Banco Unión QR');
    } else {
      setTipoRecaudador('Agencia de Destino Cobró');
      setEstadoRendicion('Retenido en Agencia (CxC Agencia)');
      setCajaAfectada(`CxC Agencia ${sub.sucursalDestino}`);
    }
    setComprobanteDepositoUrl('');
    setNroComprobante(`REC-${sub.sucursalDestino.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
    setDetalleOperacion(`Cobro flete saldo encomienda ${sub.nroManifiesto} - ${sub.destinatario || 'Cliente'}`);
    setMostrarOpcionesExtras(false);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSelectViaje = (vId: string) => {
    setSelectedViajeId(vId);
    // Filtrar los MICs vinculados a ese viaje con saldo pendiente
    const subs = manifiestosDestino.filter(sub => {
      const padre = manifiestosOrigen.find(m => m.idManifiesto === sub.idManifiestoPadre);
      return (sub.idViaje === vId || padre?.idViajeAsignado === vId) && sub.saldoPendienteClienteBs > 0;
    });

    if (subs.length > 0) {
      const first = subs[0];
      setSelectedSubManifiestoId(first.idSubManifiesto);
      setCobroSaldoBs(String(first.saldoPendienteClienteBs));
      if (first.modalidadCobroDestino === 'Cobro Directo Empresa / Cliente') {
        setTipoRecaudador('Cobro Directo (Cliente canceló a Empresa/Chofer)');
        setCajaAfectada(cajasDisponibles[0] || 'Banco Unión QR');
      } else {
        setTipoRecaudador('Agencia de Destino Cobró');
        setEstadoRendicion('Retenido en Agencia (CxC Agencia)');
        setCajaAfectada(`CxC Agencia ${first.sucursalDestino}`);
      }
      setNroComprobante(`REC-${first.sucursalDestino.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
      setDetalleOperacion(`Cobro flete saldo encomienda ${first.nroManifiesto} - ${first.destinatario || 'Cliente'}`);
    } else {
      setSelectedSubManifiestoId('');
      setCobroSaldoBs('');
    }
  };

  const handleSelectMIC = (subId: string) => {
    setSelectedSubManifiestoId(subId);
    const found = manifiestosDestino.find(s => s.idSubManifiesto === subId);
    if (found) {
      setCobroSaldoBs(String(found.saldoPendienteClienteBs));
      if (found.modalidadCobroDestino === 'Cobro Directo Empresa / Cliente') {
        setTipoRecaudador('Cobro Directo (Cliente canceló a Empresa/Chofer)');
        setCajaAfectada(cajasDisponibles[0] || 'Banco Unión QR');
      } else {
        setTipoRecaudador('Agencia de Destino Cobró');
        setEstadoRendicion('Retenido en Agencia (CxC Agencia)');
        setCajaAfectada(`CxC Agencia ${found.sucursalDestino}`);
      }
      setNroComprobante(`REC-${found.sucursalDestino.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
      setDetalleOperacion(`Cobro flete saldo encomienda ${found.nroManifiesto} - ${found.destinatario || 'Cliente'}`);
    } else {
      setCobroSaldoBs('');
    }
  };

  // Cálculos en vivo en el modal
  const cobroNum = parseFloat(cobroSaldoBs) || 0;
  const deliveryNum = parseFloat(deliveryBs) || 0;
  const comisionNum = parseFloat(comisionBs) || 0;
  const recaudacionNetaOperacion = cobroNum + deliveryNum - comisionNum;
  const nuevoSaldoPendiente = selectedSub ? Math.max(0, selectedSub.saldoPendienteClienteBs - cobroNum) : 0;

  const handleSubmitCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedSub) {
      setErrorMsg('Por favor seleccione un Manifiesto MIC con saldo pendiente.');
      return;
    }

    if (cobroNum <= 0 && deliveryNum <= 0) {
      setErrorMsg('El Importe a Cobrar debe ser mayor a 0 (ej. Bs. 180,00).');
      return;
    }

    const cajaFinal = (tipoRecaudador === 'Agencia de Destino Cobró' && estadoRendicion === 'Retenido en Agencia (CxC Agencia)')
      ? `CxC Agencia ${selectedSub.sucursalDestino}`
      : cajaAfectada;

    if (!cajaFinal || !cajaFinal.trim()) {
      setErrorMsg('Por favor seleccione la Caja o Cuenta Recaudadora (obligatorio).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onRegistrarCobranza(
        selectedSub,
        cobroNum,
        deliveryNum,
        comisionNum,
        conceptoComision,
        cajaFinal,
        nroComprobante,
        detalleOperacion || `Cobro flete saldo encomienda ${selectedSub.nroManifiesto}`,
        conceptoIngresoExtra,
        idProveedorGasto || undefined,
        tipoRecaudador,
        estadoRendicion,
        comprobanteDepositoUrl || undefined
      );

      // Abrir recibo listo para WhatsApp e impresión
      onOpenReceiptModal(selectedSub, {
        nroRecibo: nroComprobante,
        cobroSaldo: cobroNum,
        delivery: deliveryNum,
        comision: comisionNum,
        recaudacionNeta: recaudacionNetaOperacion,
        nuevoSaldo: nuevoSaldoPendiente,
        cajaAfectada: cajaFinal,
        tipoRecaudador,
        estadoRendicion,
        fecha: new Date().toLocaleString('es-BO')
      });

      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error registrando cobranza');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper para consolidar el historial de pagos y amortizaciones de un Sub-Manifiesto
  const getHistorialPagosSub = (sub: ManifiestoDestino) => {
    interface ItemPago {
      id: string;
      fecha: string;
      monto: number;
      metodo: string;
      detalle: string;
      quienCobro: string;
      tipoEstado: 'rendido' | 'liquidado_propietario' | 'retenido_agencia' | 'pendiente';
      estadoTexto: string;
      origenRegistro: string;
    }

    const items: ItemPago[] = [];

    // 1. Anticipo / Cobro en Origen (Exactamente 1 registro si hubo flete pagado en origen)
    if (sub.pagadoOrigenBs > 0) {
      const liquidado = sub.estadoLiquidacionAgencia === 'Liquidado a Central';
      // Buscar si existe transacción registrada en el libro diario para este cobro en origen
      const txOrigen = transacciones.find(t => 
        (t.idSubManifiesto === sub.idSubManifiesto || (t.nroManifiesto && t.nroManifiesto === sub.nroManifiesto)) &&
        (t.categoria === 'Fletes Despachos MIC' || t.categoria === 'Cobro Flete Origen' || (t.notas && t.notas.toLowerCase().includes('pago en origen')) || (t.notas && t.notas.toLowerCase().includes('cobranza en origen')) || t.origenRegistro === 'Cobro_Origen')
      );

      items.push({
        id: txOrigen?.idTransaccion || `orig-${sub.idSubManifiesto}`,
        fecha: txOrigen?.fecha ? txOrigen.fecha.substring(0, 10) : (sub.fechaIngreso ? sub.fechaIngreso.substring(0, 10) : 'Al Despacho'),
        monto: Number(txOrigen?.montoBs || sub.pagadoOrigenBs),
        metodo: txOrigen?.cuentaAnticipo || sub.cuentaAfectadaOrigen || 'Caja Agencia Origen',
        detalle: txOrigen?.notas || `Cobro en origen registrado en agencia (${sub.origenViaje || 'Origen'}) - Pendiente liquidación a propietario`,
        quienCobro: txOrigen?.rolUsuario || 'Encargado Agencia Origen',
        tipoEstado: liquidado ? 'rendido' : 'retenido_agencia',
        estadoTexto: liquidado ? 'Liquidado a Central / Propietario' : 'Pendiente Liquidación Agencia (CxC Sucursal Origen)',
        origenRegistro: 'Cobro en Origen'
      });
    }

    // 2. Movimientos registrados en la app para DESTINO (excluyendo origen)
    const movs = movimientos.filter(m => 
      m.idSubManifiesto === sub.idSubManifiesto &&
      m.categoriaConcepto !== 'Cobro Flete Origen' &&
      m.categoriaConcepto !== 'Anticipo Flete Origen' &&
      !(m.detalleOperacion && m.detalleOperacion.toLowerCase().includes('origen'))
    );

    movs.forEach(m => {
      let tipoEstado: 'rendido' | 'liquidado_propietario' | 'retenido_agencia' | 'pendiente' = 'pendiente';
      const estLower = (m.estadoRendicion || '').toLowerCase();
      if (estLower.includes('rendido') || estLower.includes('central') || estLower.includes('banco') || estLower.includes('depositado')) {
        tipoEstado = 'rendido';
      } else if (estLower.includes('retenido') || estLower.includes('cxc')) {
        tipoEstado = 'retenido_agencia';
      } else if (estLower.includes('liquidado') || estLower.includes('propietario') || estLower.includes('chofer')) {
        tipoEstado = 'liquidado_propietario';
      }

      items.push({
        id: m.idMovimiento || `mov-${m.fecha}-${m.montoCobrado}`,
        fecha: m.fecha ? m.fecha.substring(0, 10) : 'Al Cobro',
        monto: Number(m.montoCobrado || 0),
        metodo: m.cajaAfectada || 'Caja Efectivo',
        detalle: m.observaciones || `Cobro en destino contra entrega (${sub.sucursalDestino})`,
        quienCobro: m.tipoRecaudador || 'Encargado Agencia Destino',
        tipoEstado,
        estadoTexto: m.estadoRendicion || (tipoEstado === 'rendido' ? 'Rendido a Caja Central' : 'Pendiente de Rendición'),
        origenRegistro: 'Cobranza en Destino'
      });
    });

    // 3. Transacciones Diarias de DESTINO (excluyendo transacciones de fletes de origen para evitar duplicados)
    const txsDestino = transacciones.filter(t => 
      (t.idSubManifiesto === sub.idSubManifiesto || (t.nroManifiesto && t.nroManifiesto === sub.nroManifiesto)) &&
      t.categoria !== 'Fletes Despachos MIC' &&
      t.categoria !== 'Cobro Flete Origen' &&
      !(t.notas && t.notas.toLowerCase().includes('pago en origen')) &&
      !(t.notas && t.notas.toLowerCase().includes('cobranza en origen')) &&
      t.origenRegistro !== 'Cobro_Origen' &&
      (t.tipo === 'Ingreso' || t.categoria.includes('Flete') || t.categoria.includes('Cobro'))
    );

    txsDestino.forEach(t => {
      const yaExiste = items.some(it => Math.abs(it.monto - Number(t.montoBs || 0)) < 0.01 && it.fecha === t.fecha);
      if (!yaExiste) {
        const esCredito = t.condicionPago === '100% Crédito (Por Cobrar)' || t.modalidadPago === 'Credito';
        const tipoEstado = esCredito ? 'pendiente' : 'rendido';
        items.push({
          id: t.idTransaccion || `tx-${t.fecha}-${t.montoBs}`,
          fecha: t.fecha || 'S/F',
          monto: Number(t.montoBs || 0),
          metodo: t.metodoPago || 'Caja Central',
          detalle: t.notas || `${t.categoria} - ${t.tipo}`,
          quienCobro: t.rolUsuario || 'Administrador Central',
          tipoEstado,
          estadoTexto: esCredito ? 'Pendiente de Cobro' : 'Rendido a Caja Central',
          origenRegistro: t.origenRegistro || 'Transacción Diaria'
        });
      }
    });

    return items;
  };

  const renderEstadoCuentaSubManifiesto = (sub: ManifiestoDestino) => {
    const historialPagos = getHistorialPagosSub(sub);
    const saldos = calcularSaldosSubManifiesto(sub);
    const totalCobradoConsolidado = sub.pagadoOrigenBs + sub.cobrosRealizadosBs;
    const isLiquidado = saldos.estaLiquidadoTotal;

    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-4 sm:p-5 space-y-4 text-left">
        {/* Cabecera del Estado de Cuenta */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-black shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {sub.nroManifiesto}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  ID: {sub.idSubManifiesto}
                </span>
                {sub.idViaje && (
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Truck className="w-3 h-3 text-blue-600" />
                    Viaje: {sub.idViaje}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-black text-slate-900 mt-1 flex items-center gap-2">
                <span>Estado de Cuenta Histórico de Pagos</span>
                <span className="text-xs font-normal text-slate-500">
                  • Destinatario: <strong>{sub.destinatario || 'Cliente'}</strong>
                  {sub.telefonoContacto && ` (${sub.telefonoContacto})`}
                </span>
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <span className="text-xs text-slate-500">Destino:</span>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              {sub.sucursalDestino}
            </span>
            <span className="text-xs text-slate-500 ml-1">Remitente:</span>
            <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              {sub.remitente}
            </span>
          </div>
        </div>

        {/* Tabla de Pagos y Amortizaciones */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Historial de Pagos y Amortizaciones Recibidas</span>
              <span className="text-[11px] font-bold text-slate-400">({historialPagos.length} registros)</span>
            </h5>
          </div>

          {historialPagos.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
              <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Sin pagos registrados aún</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                El flete completo de Bs. {sub.fleteAsignadoBs.toLocaleString('es-BO')} permanece pendiente de cobro contra entrega.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 text-[11px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3 text-right">Monto Cobrado (Bs.)</th>
                    <th className="py-2.5 px-3">Método / Caja</th>
                    <th className="py-2.5 px-3">Detalle / Concepto</th>
                    <th className="py-2.5 px-3">Quién Cobró (Usuario / Encargado)</th>
                    <th className="py-2.5 px-3 text-center">Estado de Rendición / Liquidación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historialPagos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-600 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.fecha}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-emerald-700 tabular-nums text-xs">
                        Bs. {p.monto.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200 text-slate-700">
                          {p.metodo}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs">
                        <span className="truncate block" title={p.detalle}>{p.detalle}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{p.quienCobro}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {p.tipoEstado === 'rendido' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{p.estadoTexto}</span>
                          </span>
                        )}
                        {p.tipoEstado === 'liquidado_propietario' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            <span>{p.estadoTexto}</span>
                          </span>
                        )}
                        {p.tipoEstado === 'retenido_agencia' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{p.estadoTexto}</span>
                          </span>
                        )}
                        {p.tipoEstado === 'pendiente' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                            <Clock className="w-3 h-3 text-rose-600" />
                            <span>{p.estadoTexto}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Barra de Resumen de Saldos al pie del Acordeón con Saldos Independientes */}
        <div className="pt-3 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs w-full md:w-auto flex-1">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Flete Asignado</span>
              <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                Bs. {saldos.fleteTotal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Cobrado Origen</span>
                <span className="font-mono font-extrabold text-emerald-700 text-sm tabular-nums">
                  Bs. {sub.pagadoOrigenBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {sub.pagadoOrigenBs > 0 && (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-100/90 px-1 py-0.5 rounded border border-amber-300 w-fit mt-1">
                  {sub.estadoLiquidacionAgencia === 'Liquidado a Central' ? 'Liquidado a Central' : 'Por Liquidar a Central (CxC)'}
                </span>
              )}
            </div>
            <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">Cobrado Destino</span>
              <span className="font-mono font-extrabold text-blue-700 text-sm tabular-nums">
                Bs. {sub.cobrosRealizadosBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {/* Saldo Pendiente Cliente */}
            <div className={`p-2.5 rounded-lg border ${saldos.saldoPendienteCliente > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] uppercase font-bold flex items-center gap-1 ${saldos.saldoPendienteCliente > 0 ? 'text-rose-800' : 'text-slate-500'}`}>
                <User className="w-3 h-3 text-blue-600" />
                <span>Saldo Cliente</span>
              </span>
              <span className={`font-mono font-black text-sm tabular-nums block mt-0.5 ${saldos.saldoPendienteCliente > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                Bs. {saldos.saldoPendienteCliente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {/* Saldo Pendiente Agencia */}
            <div className={`p-2.5 rounded-lg border ${saldos.saldoPendienteAgencia > 0 ? 'bg-purple-50/70 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] uppercase font-bold flex items-center gap-1 ${saldos.saldoPendienteAgencia > 0 ? 'text-purple-800' : 'text-slate-500'}`}>
                <Building2 className="w-3 h-3 text-purple-600" />
                <span>Saldo Agencia</span>
              </span>
              <span className={`font-mono font-black text-sm tabular-nums block mt-0.5 ${saldos.saldoPendienteAgencia > 0 ? 'text-purple-700' : 'text-slate-400'}`}>
                Bs. {saldos.saldoPendienteAgencia.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col justify-center items-start">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Responsable / Estado</span>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full inline-block ${
                isLiquidado 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {saldos.estadoBadgeTexto} ({saldos.responsableTipo === 'AGENCIA' ? 'Agencia' : 'Cliente'})
              </span>
            </div>
          </div>

          {/* Acciones directas dentro del acordeón */}
          <div className="flex items-center gap-2 flex-wrap">
            {sub.saldoPendienteClienteBs > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenCobroModalFromSub(sub);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                title="Registrar cobro de saldo contra entrega"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Cobrar Saldo Destino</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSubParaCobroOrigen(sub);
                setIsCobranzaOrigenModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              title="Registrar cobro de flete o anticipo efectuado en origen para esta encomienda"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Registrar Cobro en Origen</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReceiptModal(sub, {
                  nroRecibo: `REC-${sub.sucursalDestino.substring(0, 3).toUpperCase()}-${sub.idSubManifiesto.slice(-4)}`,
                  cobroSaldo: sub.cobrosRealizadosBs > 0 ? sub.cobrosRealizadosBs : (sub.porPagarDestinoBs ?? sub.saldoInicialCobrarBs),
                  delivery: sub.ingresosDeliveryOtrosBs || 0,
                  comision: sub.gastosComisionesBs || 0,
                  recaudacionNeta: sub.recaudacionNetaCajaBs,
                  nuevoSaldo: sub.saldoPendienteClienteBs,
                  fecha: new Date().toISOString().split('T')[0]
                });
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-slate-300 active:scale-95 transition-all"
              title="Imprimir comprobante / recibo"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir Recibo</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Totales de la sucursal seleccionada
  const totalRecaudadoEnCaja = filteredSubs.reduce((sum, s) => sum + s.recaudacionNetaCajaBs, 0);
  const totalPendienteCobro = filteredSubs.reduce((sum, s) => sum + s.saldoPendienteClienteBs, 0);
  const totalFletePagadoOrigen = filteredSubs.reduce((sum, s) => sum + s.pagadoOrigenBs, 0);
  const totalFletePorPagar = filteredSubs.reduce((sum, s) => sum + (s.porPagarDestinoBs !== undefined ? s.porPagarDestinoBs : s.saldoInicialCobrarBs), 0);

  // Totales independientes de saldos calculados por entidad responsable
  const { totalSaldoCliente, totalSaldoAgencia } = useMemo(() => {
    let sCli = 0;
    let sAge = 0;
    filteredSubs.forEach(s => {
      const calc = calcularSaldosSubManifiesto(s);
      sCli += calc.saldoPendienteCliente;
      sAge += calc.saldoPendienteAgencia;
    });
    return { totalSaldoCliente: sCli, totalSaldoAgencia: sAge };
  }, [filteredSubs]);

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-50 text-[#16a34a] rounded-xl border border-emerald-100">
              <PackageCheck className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Recepción y Cobranzas en Destino (Agencias)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Control de encomiendas recibidas, cobro de saldo contra entrega, delivery y liquidación neta de caja.
          </p>
        </div>

        {/* Acciones Principales de Liquidación y Cobranza */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap">
          {/* Botón Destacado: Registrar Cobranza en Origen */}
          <button
            type="button"
            onClick={() => {
              setSubParaCobroOrigen(null);
              setIsCobranzaOrigenModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl shadow-md shadow-emerald-700/20 text-xs flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
            title="Registrar cobro de flete total, parcial o anticipo realizado en agencia de origen"
          >
            <PlusCircle className="w-4 h-4 text-emerald-100 shrink-0" />
            <span>➕ Registrar Cobranza en Origen</span>
          </button>

          {/* Botón 1: Cobranzas Origen Liquidación */}
          <button
            type="button"
            onClick={() => setIsLiqOrigenModalOpen(true)}
            className="bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-black px-4 py-2.5 rounded-xl shadow-md shadow-blue-800/20 text-xs flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
            title="Liquidación de fletes cobrados en origen por agencia con retenciones de comisiones y estibadores"
          >
            <Building2 className="w-4 h-4 text-blue-200 shrink-0" />
            <span>Cobranzas Origen Liquidación</span>
          </button>

          {/* Botón 2: Cobranzas Destino Liquidación */}
          <button
            type="button"
            onClick={() => setIsLiqDestinoModalOpen(true)}
            className="bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white font-black px-4 py-2.5 rounded-xl shadow-md shadow-amber-600/20 text-xs flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
            title="Liquidación de recaudaciones de agencias de destino con comisiones y gastos deducidos"
          >
            <DollarSign className="w-4 h-4 text-amber-200 shrink-0" />
            <span>Cobranzas Destino Liquidación</span>
            {totalRetenidoTodasAgencias > 0 && (
              <span className="bg-amber-950 text-amber-200 text-[10px] px-2 py-0.5 rounded-full font-black border border-amber-800">
                Bs {totalRetenidoTodasAgencias.toLocaleString('es-BO')}
              </span>
            )}
          </button>

          {/* Botón 3: Registrar Cobranza en Destino */}
          <button
            type="button"
            onClick={handleOpenNewCobroModal}
            className="bg-white hover:bg-slate-100 text-slate-800 font-extrabold px-3.5 py-2.5 rounded-xl border border-slate-300 shadow-xs text-xs flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
            title="Registrar cobro individual contra entrega"
          >
            <PlusCircle className="w-4 h-4 text-[#1d4ed8]" />
            <span>+ Registrar Cobranza en Destino</span>
          </button>

          <div className="flex items-center space-x-2 sm:space-x-3 text-right flex-wrap gap-y-2">
            <div className="bg-[#f0fdf4] px-3.5 py-2.5 rounded-xl border border-[#dcfce7]">
              <span className="text-[10px] font-bold text-slate-600 block">Recaudación Neta Caja</span>
              <span className="font-black text-sm sm:text-base text-[#16a34a]">Bs {totalRecaudadoEnCaja.toLocaleString('es-BO')}</span>
            </div>
            <div className="bg-[#fef2f2] px-3.5 py-2.5 rounded-xl border border-[#fee2e2]">
              <span className="text-[10px] font-bold text-slate-600 block">Flete por Cobrar</span>
              <span className="font-black text-sm sm:text-base text-[#dc2626]">Bs {totalFletePorPagar.toLocaleString('es-BO')}</span>
            </div>
            <div className="bg-[#eff6ff] px-3.5 py-2.5 rounded-xl border border-[#dbeafe] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-600 block">Pagado en Origen</span>
                <span className="font-black text-sm sm:text-base text-[#1d4ed8]">Bs {totalFletePagadoOrigen.toLocaleString('es-BO')}</span>
              </div>
              <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 mt-1 w-fit">
                Por Liquidar a Central (CxC)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs, Search & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
          {['Todos', 'En Reparto', 'Liquidado en Sucursal'].map((st) => (
            <button
              key={st}
              onClick={() => setFiltroEstado(st)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all min-h-[44px] ${
                filtroEstado === st
                  ? 'bg-[#1d4ed8] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-[#e2e8f0]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de Tipo de Vista: Tabla (Filas) vs Tarjetas */}
          <div className="flex items-center bg-white border border-[#e2e8f0] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all min-h-[36px] ${
                viewMode === 'table'
                  ? 'bg-[#1d4ed8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista de Tabla (Filas ordenadas con Viaje, Flete Pagado, Flete por Pagar y Acción Rápida)"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all min-h-[36px] ${
                viewMode === 'cards'
                  ? 'bg-[#1d4ed8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista de Tarjetas / Cuadrícula"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tarjetas</span>
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por ID de Viaje, Cliente o Manifiesto..."
              className="w-full bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Barra de Filtros Avanzados: Centro de Costo, Viaje, Origen, Destino, Destinatario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-white border border-[#e2e8f0] p-3.5 rounded-[18px] text-xs shadow-sm">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block flex items-center gap-1">
            <Truck className="w-3 h-3 text-[#1d4ed8]" />
            <span>Centro de Costo (Camión):</span>
          </label>
          <select
            value={filtroCentroCosto}
            onChange={(e) => setFiltroCentroCosto(e.target.value)}
            className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-2.5 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[40px]"
          >
            <option value="Todos">Todos los Centros de Costo</option>
            {catalogos.camiones.map(c => (
              <option key={c.placa} value={c.placa}>{c.placa} ({c.modelo})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block flex items-center gap-1">
            <Truck className="w-3 h-3 text-[#1d4ed8]" />
            <span>Viaje Asignado:</span>
          </label>
          <select
            value={filtroViaje}
            onChange={(e) => setFiltroViaje(e.target.value)}
            className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-2.5 py-2 text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[40px]"
          >
            <option value="Todos">Todos los Viajes</option>
            {viajes.map(v => (
              <option key={v.idViaje} value={v.idViaje}>{v.idViaje} ({v.placaCamion})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#16a34a]" />
            <span>Origen de Viaje:</span>
          </label>
          <select
            value={filtroOrigen}
            onChange={(e) => setFiltroOrigen(e.target.value)}
            className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-2.5 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[40px]"
          >
            <option value="Todas">Todos los Orígenes</option>
            {catalogos.sucursales.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#dc2626]" />
            <span>Sucursal Destino:</span>
          </label>
          <select
            value={filtroDestino}
            onChange={(e) => setFiltroDestino(e.target.value)}
            className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-2.5 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] min-h-[40px]"
          >
            <option value="Todas">Todos los Destinos</option>
            {catalogos.sucursales.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block flex items-center gap-1">
            <User className="w-3 h-3 text-[#16a34a]" />
            <span>Filtrar por Destinatario / Cliente:</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={filtroDestinatario}
              onChange={(e) => setFiltroDestinatario(e.target.value)}
              placeholder="Buscar por cliente..."
              className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl pl-2.5 pr-7 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#16a34a] min-h-[40px]"
            />
            {filtroDestinatario && (
              <button
                type="button"
                onClick={() => setFiltroDestinatario('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                title="Limpiar filtro de cliente"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VISTA 1: TABLA / FILAS (TABLE VIEW - SOLICITADO) */}
      {viewMode === 'table' && (
        <div className="bg-white border border-[#e2e8f0] rounded-[18px] shadow-sm overflow-hidden">
          <div className="p-3.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-[#1d4ed8]" />
              <span className="font-bold text-slate-800 text-xs">
                Listado de Encomiendas y Cobranzas en Destino ({filteredSubs.length} registros)
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Columnas: <strong>Viaje | Origen | Sub-Manifiesto | Cliente | Fletes | Acciones</strong>
            </span>
          </div>

          <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full table-auto border-collapse min-w-[1260px]">
              <thead>
                <tr>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-left w-[95px] min-w-[95px]">
                    Viaje (ID)
                  </th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-left w-[90px] min-w-[90px]">
                    Origen
                  </th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-left w-[115px] min-w-[115px]">
                    Sub-Manifiesto
                  </th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-left min-w-[170px]">
                    Destinatario
                  </th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-left min-w-[140px]">
                    Destino / Remite
                  </th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-right w-[95px] min-w-[95px]">
                    Flete Total
                  </th>
                  <th className="bg-slate-100 text-emerald-700 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-right w-[110px] min-w-[110px]">
                    Flete Pagado (Origen)
                  </th>
                  <th className="bg-slate-100 text-rose-700 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-right w-[110px] min-w-[110px]">
                    Flete por Cobrar
                  </th>
                  <th className="bg-slate-100 text-blue-700 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-right w-[105px] min-w-[105px]">
                    Cobrado Destino
                  </th>
                  <th className="bg-slate-100 text-blue-900 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-right w-[125px] min-w-[125px]" title="Monto exclusivo adeudado por el cliente final">
                    <div className="flex items-center justify-end gap-1">
                      <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Saldo Cliente</span>
                    </div>
                  </th>
                  <th className="bg-slate-100 text-purple-900 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-right w-[130px] min-w-[130px]" title="Monto exclusivo que la agencia intermediaria debe rendir">
                    <div className="flex items-center justify-end gap-1">
                      <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Saldo Agencia</span>
                    </div>
                  </th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-center w-[95px] min-w-[95px]">
                    Estado
                  </th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3.5 px-3 border-b-2 border-slate-300 select-none text-center sticky right-0 z-20 shadow-[-4px_0_6px_rgba(0,0,0,0.06)] min-w-[195px] w-[195px]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((sub) => {
                  const saldosSub = calcularSaldosSubManifiesto(sub);
                  const isPending = !saldosSub.estaLiquidadoTotal;
                  const fletePorPagar = sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : sub.saldoInicialCobrarBs;
                  const isExpanded = expandedSubId === sub.idSubManifiesto;

                  // Obtener Origen del viaje o manifiesto
                  const padre = manifiestosOrigen.find(m => m.idManifiesto === sub.idManifiestoPadre);
                  const viajeAsoc = viajes.find(v => v.idViaje === sub.idViaje || v.idViaje === padre?.idViajeAsignado);
                  const origenViaje = sub.origenViaje || padre?.sucursalOrigen || viajeAsoc?.origen || 'Oruro';

                  return (
                    <React.Fragment key={sub.idSubManifiesto}>
                      <tr 
                        onClick={() => setExpandedSubId(prev => prev === sub.idSubManifiesto ? null : sub.idSubManifiesto)}
                        className={`transition-colors cursor-pointer select-none group ${
                          isExpanded 
                            ? 'bg-blue-50/70 border-b border-blue-200' 
                            : isPending 
                            ? 'bg-amber-50/15 hover:bg-slate-50' 
                            : 'hover:bg-slate-50'
                        }`}
                        title="Haz clic para ver el Estado de Cuenta Histórico de Pagos"
                      >
                        {/* Columna: Viaje (Clickeable para desplegar Estado de Cuenta Histórico de Pagos) */}
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-2.5 border-b border-slate-200 font-mono">
                          {sub.idViaje || padre?.idViajeAsignado ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSubId(prev => prev === sub.idSubManifiesto ? null : sub.idSubManifiesto);
                              }}
                              className={`w-full text-left font-bold px-2 py-1 rounded-lg border transition-all inline-flex items-center justify-between gap-1 text-xs cursor-pointer shadow-2xs ${
                                isExpanded 
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                  : 'text-[#1d4ed8] bg-blue-50/90 hover:bg-blue-100 hover:border-blue-300 border-blue-200'
                              }`}
                              title={isExpanded ? 'Ocultar Estado de Cuenta Histórico' : 'Haz clic aquí para desplegar el Estado de Cuenta Histórico de Pagos'}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <Truck className={`w-3.5 h-3.5 shrink-0 ${isExpanded ? 'text-white' : 'text-[#1d4ed8]'}`} />
                                <span className="truncate">{sub.idViaje || padre?.idViajeAsignado}</span>
                              </div>
                              <span className="shrink-0 ml-0.5">
                                {isExpanded ? <ChevronUp className="w-3 h-3 text-white" /> : <ChevronDown className="w-3 h-3 text-blue-600" />}
                              </span>
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Sin Viaje</span>
                          )}
                        </td>

                        {/* Columna: Origen de Viaje */}
                        <td className="text-sm font-normal text-slate-700 py-3 px-2 lg:px-2.5 border-b border-slate-200 whitespace-nowrap">
                          <span className="flex items-center gap-1 font-semibold text-xs">
                            <MapPin className="w-3 h-3 text-[#1d4ed8] shrink-0" />
                            <span className="truncate">{origenViaje}</span>
                          </span>
                        </td>

                        {/* Columna: Sub-Manifiesto con Indicador de Expansión */}
                        <td className="text-sm font-bold text-slate-900 py-3 px-2 lg:px-2.5 border-b border-slate-200 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className={`p-0.5 rounded transition-transform ${isExpanded ? 'text-blue-600 bg-blue-100' : 'text-slate-400 group-hover:text-blue-600'}`}>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </span>
                            <span className="truncate block font-bold text-slate-900 group-hover:text-blue-600 transition-colors" title={sub.nroManifiesto}>
                              {sub.nroManifiesto}
                            </span>
                          </div>
                        </td>

                        {/* Columna: Destinatario */}
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-2.5 border-b border-slate-200">
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <User className="w-3 h-3 text-[#16a34a] shrink-0" />
                              <span className="truncate text-xs lg:text-sm font-semibold text-slate-900" title={sub.destinatario}>{sub.destinatario || 'Cliente'}</span>
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                                  <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                  <span>Saldo Pendiente</span>
                                </span>
                              )}
                            </div>
                            {sub.telefonoContacto && (
                              <span className="text-[10px] text-slate-500 block truncate font-mono">{sub.telefonoContacto}</span>
                            )}
                          </div>
                        </td>

                        {/* Columna: Destino / Remite */}
                        <td className="text-sm font-normal text-slate-700 py-3 px-2 lg:px-2.5 border-b border-slate-200">
                          <span className="font-bold text-slate-800 block text-xs truncate" title={sub.sucursalDestino}>{sub.sucursalDestino}</span>
                          <span className="text-[10px] text-slate-500 block truncate" title={`De: ${sub.remitente}`}>De: {sub.remitente}</span>
                        </td>

                        {/* Columna: Flete Total */}
                        <td className="text-sm py-3 px-2 lg:px-2.5 border-b border-slate-200 text-right font-bold text-slate-800 whitespace-nowrap text-xs lg:text-sm tabular-nums">
                          Bs {sub.fleteAsignadoBs.toLocaleString('es-BO')}
                        </td>

                        {/* Columna: Flete Pagado */}
                        <td className="text-sm py-3 px-2 lg:px-2.5 border-b border-slate-200 text-right font-bold text-[#16a34a] bg-emerald-50/20 whitespace-nowrap text-xs lg:text-sm tabular-nums">
                          <div>Bs {sub.pagadoOrigenBs.toLocaleString('es-BO')}</div>
                          {sub.pagadoOrigenBs > 0 && (
                            <span className="inline-block text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 mt-0.5">
                              Por Liquidar a Central (CxC)
                            </span>
                          )}
                        </td>

                        {/* Columna: Flete por Cobrar */}
                        <td className="text-sm py-3 px-2 lg:px-2.5 border-b border-slate-200 text-right font-bold text-[#dc2626] bg-rose-50/20 whitespace-nowrap text-xs lg:text-sm tabular-nums">
                          Bs {fletePorPagar.toLocaleString('es-BO')}
                        </td>

                        {/* Columna: Cobrado Destino */}
                        <td className="text-sm py-3 px-2 lg:px-2.5 border-b border-slate-200 text-right font-bold text-[#1d4ed8] whitespace-nowrap text-xs lg:text-sm tabular-nums">
                          Bs {sub.cobrosRealizadosBs.toLocaleString('es-BO')}
                        </td>

                        {/* Columna: 👤 Saldo Pendiente Cliente */}
                        <td className="text-sm py-3 px-2 lg:px-2.5 border-b border-slate-200 text-right whitespace-nowrap text-xs lg:text-sm tabular-nums">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            saldosSub.saldoPendienteCliente > 0 
                              ? 'text-[#dc2626] bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200' 
                              : 'text-slate-400 font-normal'
                          }`}>
                            Bs {saldosSub.saldoPendienteCliente.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Columna: 🏢 Saldo Pendiente Agencia / Sucursal */}
                        <td className="text-sm py-3 px-2 lg:px-2.5 border-b border-slate-200 text-right whitespace-nowrap text-xs lg:text-sm tabular-nums">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            saldosSub.saldoPendienteAgencia > 0 
                              ? 'text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200' 
                              : 'text-slate-400 font-normal'
                          }`}>
                            Bs {saldosSub.saldoPendienteAgencia.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Columna: Estado */}
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-2.5 border-b border-slate-200 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            !isPending
                              ? 'bg-emerald-50 text-[#16a34a] border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {sub.estadoLiquidacion}
                          </span>
                        </td>

                        {/* Columna: Acciones Rápidas (Sticky right-0 para visualización completa de iconos) */}
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 border-b border-slate-200 text-center sticky right-0 bg-white/95 backdrop-blur-xs z-10 shadow-[-4px_0_6px_rgba(0,0,0,0.06)] min-w-[195px] w-[195px]">
                          <div className="flex items-center justify-center gap-1.5 flex-nowrap" onClick={(e) => e.stopPropagation()}>
                            {/* Cobrar */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCobroModalFromSub(sub);
                              }}
                              className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-0.5 transition-all shadow-xs active:scale-95 whitespace-nowrap ${
                                isPending
                                  ? 'bg-[#1d4ed8] hover:bg-blue-800 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                              }`}
                              title={isPending ? 'Registrar cobro contra entrega' : 'Registrar cobranza / operación adicional'}
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>{isPending ? 'Cobrar' : '+ Pago'}</span>
                            </button>

                            {/* Liquidar Cobro en Origen si está pendiente */}
                            {Number(sub.pagadoOrigenBs) > 0 && sub.estadoLiquidacionAgencia === 'Pendiente de Liquidación' && onLiquidarCobroOrigen && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLiquidarModal({
                                    open: true,
                                    sub,
                                    cuentaCentral: 'Caja Oficina Central',
                                    fecha: new Date().toISOString().split('T')[0],
                                    notas: ''
                                  });
                                }}
                                className="px-1.5 py-1 rounded-lg font-bold text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-all flex items-center gap-0.5 whitespace-nowrap shadow-xs"
                                title={`Liquidar Cobro de Origen (Bs ${sub.pagadoOrigenBs}) a Caja Central`}
                              >
                                <DollarSign className="w-3 h-3 text-emerald-600" />
                                <span>Liq. Origen</span>
                              </button>
                            )}

                            {/* Liquidar Cobro en Destino si está retenido por agencia */}
                            {Number(sub.montoRetenidoAgenciaBs) > 0 && sub.estadoRendicionDestino === 'Retenido en Agencia (CxC Agencia)' && onLiquidarSaldosAgenciaDestino && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLiquidarAgenciasModal({
                                    open: true,
                                    agencia: sub.sucursalDestino,
                                    montoMax: sub.montoRetenidoAgenciaBs || 0,
                                    montoALiquidar: sub.montoRetenidoAgenciaBs || 0,
                                    cuentaCentral: cajasDisponibles[0] || 'Caja Oficina Central',
                                    fecha: new Date().toISOString().split('T')[0],
                                    notas: `Liquidación saldo retenido encomienda ${sub.nroManifiesto} (${sub.sucursalDestino})`
                                  });
                                }}
                                className="px-1.5 py-1 rounded-lg font-bold text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all flex items-center gap-0.5 whitespace-nowrap shadow-xs"
                                title={`Liquidar Saldo Retenido por Agencia ${sub.sucursalDestino} (Bs ${sub.montoRetenidoAgenciaBs}) a Empresa`}
                              >
                                <Building2 className="w-3 h-3 text-amber-700" />
                                <span>Liq. Destino</span>
                              </button>
                            )}

                            {/* Editar */}
                            {onEditSub && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSub(sub);
                                }}
                                className="p-1 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 rounded-lg transition-colors border border-blue-200 flex items-center justify-center shadow-xs"
                                title="Editar encomienda / sub-manifiesto"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Imprimir */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenReceiptModal(sub, {
                                  nroRecibo: `REC-${sub.sucursalDestino.substring(0, 3).toUpperCase()}-${sub.idSubManifiesto.slice(-4)}`,
                                  cobroSaldo: sub.cobrosRealizadosBs > 0 ? sub.cobrosRealizadosBs : (sub.porPagarDestinoBs ?? sub.saldoInicialCobrarBs),
                                  delivery: sub.ingresosDeliveryOtrosBs || 0,
                                  comision: sub.gastosComisionesBs || 0,
                                  recaudacionNeta: sub.recaudacionNetaCajaBs,
                                  nuevoSaldo: sub.saldoPendienteClienteBs,
                                  fecha: new Date().toISOString().split('T')[0]
                                });
                              }}
                              className="p-1 text-sky-600 bg-sky-50 hover:bg-sky-100 hover:text-sky-800 rounded-lg transition-colors border border-sky-200 flex items-center justify-center shadow-xs"
                              title="Imprimir Recibo / Comprobante de Encomienda"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Eliminar */}
                            {onDeleteSub && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSubToDelete(sub);
                                }}
                                className="p-1 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 rounded-lg transition-colors border border-rose-200 flex items-center justify-center shadow-xs"
                                title="Eliminar encomienda"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Acordeón Desplegable en la misma ventana con Estado de Cuenta */}
                      {isExpanded && (
                        <tr key={`${sub.idSubManifiesto}-desplegado`} className="border-b-2 border-blue-200 animate-in fade-in duration-150">
                          <td colSpan={13} className="p-4 sm:p-6 bg-gradient-to-b from-blue-50/40 via-slate-50 to-slate-100/60">
                            {renderEstadoCuentaSubManifiesto(sub)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-800 text-xs">
                <tr>
                  <td colSpan={5} className="py-2.5 px-2 lg:px-2.5 text-right uppercase tracking-wider text-xs text-slate-600 font-bold">
                    Totales ({filteredSubs.length} Encomiendas):
                  </td>
                  <td className="py-2.5 px-2 lg:px-2.5 text-right font-bold text-xs lg:text-sm whitespace-nowrap">
                    Bs {filteredSubs.reduce((s, x) => s + x.fleteAsignadoBs, 0).toLocaleString('es-BO')}
                  </td>
                  <td className="py-2.5 px-2 lg:px-2.5 text-right font-bold text-xs lg:text-sm text-[#16a34a] bg-emerald-50/50 whitespace-nowrap">
                    Bs {totalFletePagadoOrigen.toLocaleString('es-BO')}
                  </td>
                  <td className="py-2.5 px-2 lg:px-2.5 text-right font-bold text-xs lg:text-sm text-[#dc2626] bg-rose-50/50 whitespace-nowrap">
                    Bs {totalFletePorPagar.toLocaleString('es-BO')}
                  </td>
                  <td className="py-2.5 px-2 lg:px-2.5 text-right font-bold text-xs lg:text-sm text-[#1d4ed8] whitespace-nowrap">
                    Bs {filteredSubs.reduce((s, x) => s + x.cobrosRealizadosBs, 0).toLocaleString('es-BO')}
                  </td>
                  <td className="py-2.5 px-2 lg:px-2.5 text-right font-bold text-xs lg:text-sm text-[#dc2626] bg-rose-50/50 whitespace-nowrap tabular-nums">
                    Bs {totalSaldoCliente.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-2 lg:px-2.5 text-right font-bold text-xs lg:text-sm text-purple-700 bg-purple-50/50 whitespace-nowrap tabular-nums">
                    Bs {totalSaldoAgencia.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-2 lg:px-2.5 text-center text-[10px] text-slate-500 uppercase">
                    Totales
                  </td>
                  <td className="py-2.5 px-2 text-center text-xs text-slate-700 whitespace-nowrap sticky right-0 bg-slate-50 z-10 shadow-[-4px_0_6px_rgba(0,0,0,0.06)] min-w-[195px] w-[195px]">
                    <span className="text-[11px] text-slate-500">Caja: </span>
                    <strong className="text-[#16a34a] font-bold">Bs {totalRecaudadoEnCaja.toLocaleString('es-BO')}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: TARJETAS (CARDS VIEW) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubs.map((sub) => {
            const saldosCard = calcularSaldosSubManifiesto(sub);
            const isPending = !saldosCard.estaLiquidadoTotal;
            const fletePorPagar = sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : sub.saldoInicialCobrarBs;
            const isExpanded = expandedSubId === sub.idSubManifiesto;

            return (
              <div
                key={sub.idSubManifiesto}
                className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#1d4ed8] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                        {sub.nroManifiesto}
                      </span>
                      {sub.idViaje && (
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-[#e2e8f0] flex items-center gap-1" title="ID de Viaje">
                          <Truck className="w-3 h-3 text-[#1d4ed8]" />
                          <span>{sub.idViaje}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        !isPending
                          ? 'bg-emerald-50 text-[#16a34a] border border-emerald-200'
                          : 'bg-rose-50 text-[#dc2626] border border-rose-200'
                      }`}>
                        {sub.estadoLiquidacion}
                      </span>
                      {onEditSub && (
                        <button
                          type="button"
                          onClick={() => onEditSub(sub)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          title="Editar Encomienda / Destinatario"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info Destinatario y Carga */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-900 font-semibold flex-wrap">
                      <User className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                      <span className="truncate">{sub.destinatario || 'Cliente'}</span>
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                          <span>Saldo Pendiente</span>
                        </span>
                      )}
                    </div>

                    {/* Identificación clara del deudor / responsable */}
                    <div className="pt-0.5">
                      {sub.modalidadCobroDestino === 'Cobro Directo Empresa / Cliente' || sub.tipoDeudor === 'CLIENTE' ? (
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-600" />
                          Cliente Deudor: {sub.destinatario || 'Cliente Directo'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-amber-700" />
                          Responsable de Rendición: Agencia {sub.agenciaDestinoResponsable || sub.sucursalDestino}
                        </span>
                      )}
                    </div>

                    {sub.telefonoContacto && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{sub.telefonoContacto}</span>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-600 pt-1 line-clamp-2">
                      <strong className="text-slate-800">Carga:</strong> {sub.descripcionCarga}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Remite: {sub.remitente} • Destino: <strong>{sub.sucursalDestino}</strong>
                    </p>
                  </div>

                  {/* Financial Grid */}
                  <div className="mt-4 pt-3 border-t border-[#e2e8f0] grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-[#e2e8f0]">
                      <span className="text-[10px] text-slate-500 block">Viaje</span>
                      <span className="font-bold text-[#1d4ed8] truncate block">{sub.idViaje || '-'}</span>
                    </div>
                    <div className="bg-[#f0fdf4] p-2.5 rounded-xl border border-[#dcfce7]">
                      <span className="text-[10px] text-slate-500 block">Flete Pagado</span>
                      <span className="font-bold text-[#16a34a]">Bs {sub.pagadoOrigenBs.toLocaleString('es-BO')}</span>
                    </div>
                    <div className="bg-[#fef2f2] p-2.5 rounded-xl border border-[#fee2e2]">
                      <span className="text-[10px] text-slate-500 block">Flete por Cobrar</span>
                      <span className="font-bold text-[#dc2626]">Bs {fletePorPagar.toLocaleString('es-BO')}</span>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${saldosCard.saldoPendienteCliente > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-500 font-bold block flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-600" />
                        <span>Saldo Cliente</span>
                      </span>
                      <span className={`font-black tabular-nums block mt-0.5 ${saldosCard.saldoPendienteCliente > 0 ? 'text-[#dc2626]' : 'text-slate-400'}`}>
                        Bs {saldosCard.saldoPendienteCliente.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${saldosCard.saldoPendienteAgencia > 0 ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-500 font-bold block flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-purple-600" />
                        <span>Saldo Agencia</span>
                      </span>
                      <span className={`font-black tabular-nums block mt-0.5 ${saldosCard.saldoPendienteAgencia > 0 ? 'text-purple-700' : 'text-slate-400'}`}>
                        Bs {saldosCard.saldoPendienteAgencia.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Recaudación Neta acumulada */}
                  <div className="mt-2 text-[11px] text-slate-500 flex justify-between px-1">
                    <span>Delivery: +Bs {sub.ingresosDeliveryOtrosBs}</span>
                    <span>Comisión: -Bs {sub.gastosComisionesBs}</span>
                    <span className="text-[#16a34a] font-bold">Neto Remesar: Bs {sub.recaudacionNetaCajaBs}</span>
                  </div>
                </div>

                {/* Botones de Acción en Tarjeta: Cobrar, Editar, Imprimir y Eliminar */}
                <div className="mt-4 pt-3 border-t border-[#e2e8f0] flex items-center gap-2">
                  <button
                    onClick={() => handleOpenCobroModalFromSub(sub)}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all min-h-[40px] ${
                      isPending
                        ? 'bg-[#1d4ed8] hover:bg-blue-800 text-white shadow-md shadow-blue-500/20 active:scale-95'
                        : 'bg-[#f4f6fa] hover:bg-slate-200 text-slate-700 border border-[#e2e8f0]'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>{isPending ? 'Cobrar' : '+ Pago'}</span>
                  </button>

                  {onEditSub && (
                    <button
                      type="button"
                      onClick={() => onEditSub(sub)}
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Editar encomienda"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onOpenReceiptModal(sub, {
                        nroRecibo: `REC-${sub.sucursalDestino.substring(0, 3).toUpperCase()}-${sub.idSubManifiesto.slice(-4)}`,
                        cobroSaldo: sub.cobrosRealizadosBs > 0 ? sub.cobrosRealizadosBs : (sub.porPagarDestinoBs ?? sub.saldoInicialCobrarBs),
                        delivery: sub.ingresosDeliveryOtrosBs || 0,
                        comision: sub.gastosComisionesBs || 0,
                        recaudacionNeta: sub.recaudacionNetaCajaBs,
                        nuevoSaldo: sub.saldoPendienteClienteBs,
                        fecha: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="p-2 text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                    title="Imprimir Recibo"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {onDeleteSub && (
                    <button
                      type="button"
                      onClick={() => setSubToDelete(sub)}
                      className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Eliminar encomienda"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Botón Acordeón en Tarjeta */}
                <button
                  type="button"
                  onClick={() => setExpandedSubId(prev => prev === sub.idSubManifiesto ? null : sub.idSubManifiesto)}
                  className={`w-full mt-3 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    isExpanded 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                  }`}
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />}
                  <span>{isExpanded ? 'Ocultar Estado de Cuenta' : 'Ver Estado de Cuenta y Pagos'}</span>
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-blue-200 animate-in fade-in duration-150">
                    {renderEstadoCuentaSubManifiesto(sub)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: REGISTRO DE COBRANZAS EN DESTINO (FLUJO EN CASCADA: VIAJE -> MIC -> CLIENTE -> COBRO -> CAJA) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-5xl xl:max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-slate-50/80 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#16a34a] border border-emerald-100 flex items-center justify-center shadow-xs">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Registro de Cobranzas en Destino
                  </h3>
                  <p className="text-xs text-slate-500">
                    Flujo en cascada: Selección de Viaje ➔ Manifiesto MIC ➔ Cobro y Caja Recaudadora
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                title="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCobro} className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-[#dc2626] flex items-center gap-2.5 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* MAQUETACIÓN EN 2 COLUMNAS PARALELAS (DESKTOP/LAPTOP FULL-WIDTH RESPONSIVE) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* COLUMNA IZQUIERDA: INFORMACIÓN DEL VIAJE, MIC Y DEUDOR */}
                <div className="space-y-4">
                  <div className="bg-slate-50/80 border border-slate-200 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#1d4ed8]" />
                        1. Selección en Cascada (Viaje ➔ MIC)
                      </span>
                  <span className="text-[10px] text-slate-500 font-medium">Paso 1 de 3</span>
                </div>

                {/* Campo 1: Selector Desplegable de ID Viaje (muestra Placa y Chofer) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                    ID Viaje (Placa y Chofer Asignado) *
                  </label>
                  <select
                    value={selectedViajeId}
                    onChange={(e) => handleSelectViaje(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none min-h-[44px]"
                    required
                  >
                    <option value="">-- Seleccione un ID de Viaje --</option>
                    {viajesDisponibles.map((v) => (
                      <option key={v.idViaje} value={v.idViaje}>
                        {v.idViaje} • Placa: {v.placa} • Chofer: {v.chofer} {v.pendientes > 0 ? `(${v.pendientes} pendientes)` : '(0 pendientes)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo 2: Selector Dinámico de Manifiesto MIC / Sub-manifiesto */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block flex items-center justify-between">
                    <span>Manifiesto MIC / Sub-manifiesto (Saldo Pendiente &gt; 0) *</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {subManifiestosDisponibles.length} disponible(s) con saldo
                    </span>
                  </label>
                  <select
                    value={selectedSubManifiestoId}
                    onChange={(e) => handleSelectMIC(e.target.value)}
                    disabled={!selectedViajeId || subManifiestosDisponibles.length === 0}
                    className="w-full bg-white border border-[#cbd5e1] rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none min-h-[44px] disabled:opacity-60 disabled:bg-slate-100"
                    required
                  >
                    <option value="">
                      {!selectedViajeId
                        ? '-- Primero seleccione un ID de Viaje arriba --'
                        : subManifiestosDisponibles.length === 0
                        ? '-- No existen encomiendas con saldo pendiente en este viaje --'
                        : '-- Seleccione el Manifiesto MIC a cobrar --'}
                    </option>
                    {subManifiestosDisponibles.map((sub) => (
                      <option key={sub.idSubManifiesto} value={sub.idSubManifiesto}>
                        {sub.nroManifiesto} - {sub.destinatario || 'Cliente'} - Saldo: Bs. {Number(sub.saldoPendienteClienteBs).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campos Informativos de Solo Lectura al Seleccionar un MIC */}
                {selectedSub ? (
                  <div className="mt-3 bg-white border border-[#e2e8f0] rounded-xl p-3.5 space-y-3 animate-in fade-in">
                    {/* CONDICIONAMIENTO CLARO DEL DEUDOR / RESPONSABLE SEGÚN MODALIDAD */}
                    {selectedSub.modalidadCobroDestino === 'Cobro Directo Empresa / Cliente' || selectedSub.tipoDeudor === 'CLIENTE' ? (
                      <div className="p-3 bg-blue-50 border-2 border-blue-400 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-[#1d4ed8] shrink-0 font-bold">
                            <User className="w-4 h-4 text-[#1d4ed8]" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-black tracking-wider text-blue-700 block">
                              Modalidad B: Cobro Directo Empresa / Cliente
                            </span>
                            <span className="text-sm font-black text-blue-950 block">
                              Cliente Deudor: {selectedSub.destinatario || 'Cliente Sin Nombre'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-black bg-blue-200 text-blue-900 border border-blue-300 shrink-0">
                          CxC Cliente Directo
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 font-bold">
                            <Building2 className="w-4 h-4 text-amber-800" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 block">
                              Modalidad A: Agencia Recauda en Destino y Rinde a Empresa
                            </span>
                            <span className="text-sm font-black text-amber-950 block">
                              Responsable de Rendición: Agencia {selectedSub.agenciaDestinoResponsable || selectedSub.sucursalDestino}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-black bg-amber-200 text-amber-900 border border-amber-300 shrink-0">
                          CxC Agencia Destino
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Datos del Cliente y Carga
                      </span>
                      <span className="font-mono text-xs font-black text-[#1d4ed8] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                        MIC: {selectedSub.nroManifiesto}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          {selectedSub.modalidadCobroDestino === 'Cobro Directo Empresa / Cliente' || selectedSub.tipoDeudor === 'CLIENTE'
                            ? 'Cliente / Destinatario (Deudor):'
                            : 'Consignatario (Entrega Física):'}
                        </span>
                        <span className="font-bold text-slate-900 block truncate">
                          {selectedSub.destinatario || 'Cliente General'}
                        </span>
                        {selectedSub.telefonoContacto && (
                          <span className="text-[10px] text-slate-500 block">
                            Tel: {selectedSub.telefonoContacto}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block">Sucursal de Destino:</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#dc2626]" />
                          {selectedSub.sucursalDestino}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Remite: {selectedSub.remitente}
                        </span>
                      </div>

                      <div className="bg-[#f8fafc] p-2 rounded-lg border border-[#e2e8f0]">
                        <span className="text-[10px] text-slate-500 block">Flete Total:</span>
                        <span className="font-black text-slate-900 text-sm">
                          Bs. {Number(selectedSub.fleteAsignadoBs).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-[#16a34a] block font-semibold">
                          Pagó Origen: Bs. {Number(selectedSub.pagadoOrigenBs).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-rose-50/70 p-2 rounded-lg border border-rose-200">
                        <span className="text-[10px] text-rose-700 block font-bold">Saldo Actual por Cobrar:</span>
                        <span className="font-black text-[#dc2626] text-base">
                          Bs. {Number(selectedSub.saldoPendienteClienteBs).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {selectedSub.descripcionCarga && (
                      <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <strong className="text-slate-800">Carga:</strong> {selectedSub.descripcionCarga}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic bg-white p-3 rounded-xl border border-dashed border-slate-300 text-center">
                    Seleccione un Manifiesto MIC para desplegar la información del cliente, flete total y saldo por cobrar.
                  </p>
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA: IMPORTE, RECAUDACIÓN, DETALLES Y SERVICIOS */}
            <div className="space-y-4">
              {/* PASO 2: INGRESO DEL MONTO */}
              <div className="bg-white border border-[#cbd5e1] p-4 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#16a34a]" />
                    2. Importe a Cobrar (Bs.) *
                  </label>
                  {selectedSub && selectedSub.saldoPendienteClienteBs > 0 && (
                    <button
                      type="button"
                      onClick={() => setCobroSaldoBs(String(selectedSub.saldoPendienteClienteBs))}
                      className="px-2.5 py-1 text-[11px] font-extrabold text-[#1d4ed8] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all active:scale-95"
                      title="Copiar exactamente el saldo pendiente actual"
                    >
                      ⚡ Cobrar Saldo Total (Bs. {Number(selectedSub.saldoPendienteClienteBs).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-extrabold text-sm">
                    Bs
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={cobroSaldoBs}
                    onChange={(e) => setCobroSaldoBs(e.target.value)}
                    placeholder="0.00"
                    disabled={!selectedSub}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl pl-11 pr-3.5 py-2.5 text-base font-extrabold text-[#16a34a] focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none min-h-[44px] disabled:opacity-50"
                    required
                  />
                </div>

                {/* Advertencia en vivo si el monto a cobrar supera el saldo pendiente */}
                {selectedSub && cobroNum > selectedSub.saldoPendienteClienteBs && (
                  <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      <strong>Atención:</strong> El importe a cobrar (Bs. {cobroNum.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) supera el saldo pendiente de Bs. {Number(selectedSub.saldoPendienteClienteBs).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                    </span>
                  </div>
                )}

                {selectedSub && (
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                    <span>Nuevo saldo cliente tras cobro:</span>
                    <span className="font-extrabold text-slate-900">
                      Bs. {nuevoSaldoPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* PASO 3: MODALIDAD Y CUENTA RECAUDADORA */}
              <div className="bg-white border border-[#cbd5e1] p-4 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-[#1d4ed8]" />
                    3. Modalidad y Recaudación del Cobro *
                  </label>
                  <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                    Obligatorio
                  </span>
                </div>

                {/* Campo 1: Tipo de Recaudador */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                    Tipo de Recaudador:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoRecaudador('Agencia de Destino Cobró');
                        if (estadoRendicion === 'Retenido en Agencia (CxC Agencia)') {
                          setCajaAfectada(`CxC Agencia ${selectedSub?.sucursalDestino || 'Destino'}`);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        tipoRecaudador === 'Agencia de Destino Cobró'
                          ? 'bg-amber-50/80 border-amber-400 text-amber-950 ring-2 ring-amber-300 font-bold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-bold">Opción A: Agencia de Destino Cobró</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        La agencia recauda y rinde / transfiere posteriormente.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTipoRecaudador('Cobro Directo (Cliente canceló a Empresa/Chofer)');
                        setCajaAfectada(cajasDisponibles[0] || 'Banco Unión QR');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        tipoRecaudador === 'Cobro Directo (Cliente canceló a Empresa/Chofer)'
                          ? 'bg-blue-50/80 border-blue-400 text-blue-950 ring-2 ring-blue-300 font-bold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold">Opción B: Cobro Directo</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Cliente canceló directo a empresa (QR/transferencia) o chofer.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sub-opciones de Opción A: Agencia de Destino Cobró */}
                {tipoRecaudador === 'Agencia de Destino Cobró' && (
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-1 block">
                        Estado de Rendición *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEstadoRendicion('Retenido en Agencia (CxC Agencia)');
                            setCajaAfectada(`CxC Agencia ${selectedSub?.sucursalDestino || 'Destino'}`);
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                            estadoRendicion === 'Retenido en Agencia (CxC Agencia)'
                              ? 'bg-amber-200/70 border-amber-500 text-amber-950 font-black shadow-xs ring-2 ring-amber-400'
                              : 'bg-white border-amber-200 text-amber-800 hover:bg-amber-100'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Retenido en Agencia (CxC Agencia)</span>
                          </div>
                          <span className="text-[10px] text-amber-900/80 block mt-0.5">
                            Saldo cliente pasa a 0 Bs; queda como deuda por rendir de la agencia.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEstadoRendicion('Depositado a Cuenta de Empresa');
                            setCajaAfectada(cajasDisponibles[0] || 'Banco Unión QR');
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                            estadoRendicion === 'Depositado a Cuenta de Empresa'
                              ? 'bg-emerald-100 border-emerald-500 text-emerald-950 font-black shadow-xs ring-2 ring-emerald-400'
                              : 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Depositado a Cuenta de Empresa</span>
                          </div>
                          <span className="text-[10px] text-emerald-900/80 block mt-0.5">
                            La agencia depositó directo a la empresa; ingresa a Arqueo_Cajas.
                          </span>
                        </button>
                      </div>
                    </div>

                    {estadoRendicion === 'Retenido en Agencia (CxC Agencia)' ? (
                      <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-lg text-xs text-amber-950 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Efecto Contable:</span>
                        </div>
                        <p className="text-[11px] text-amber-900">
                          El saldo del cliente se da por <strong>cancelado (0 Bs.)</strong>, y el monto de <strong>Bs. {cobroNum.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong> pasa a ser una <strong>Cuenta por Cobrar (CxC) a la Agencia {selectedSub?.sucursalDestino}</strong>. Podrá liquidarlo posteriormente hacia tu cuenta bancaria o caja central desde el botón rápido de liquidación.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 pt-1 border-t border-amber-200">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                            Cuenta / Banco Destino de la Empresa (Arqueo_Cajas) *
                          </label>
                          <select
                            value={cajaAfectada}
                            onChange={(e) => setCajaAfectada(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none min-h-[44px]"
                            required
                          >
                            <option value="">-- Seleccione Cuenta / Banco Destino --</option>
                            {cajasDisponibles.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                            Nro. Comprobante / Boleta de Depósito Bancario
                          </label>
                          <input
                            type="text"
                            value={comprobanteDepositoUrl}
                            onChange={(e) => setComprobanteDepositoUrl(e.target.value)}
                            placeholder="Ej. Depósito Banco Unión #548962"
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 min-h-[40px] focus:ring-2 focus:ring-[#1d4ed8]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-opciones de Opción B: Cobro Directo */}
                {tipoRecaudador === 'Cobro Directo (Cliente canceló a Empresa/Chofer)' && (
                  <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 space-y-2.5">
                    <div className="p-2 bg-blue-100/70 border border-blue-300 rounded-lg text-xs text-blue-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>El cliente pagó directamente a la empresa o al chofer. El dinero ingresará de inmediato a la cuenta seleccionada en Arqueo_Cajas.</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                        Accesos Rápidos de Cuenta / Caja:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {['Banco Unión QR', 'Caja Chofer', 'Efectivo', 'Caja Oficina Central'].map((quickCaja) => (
                          <button
                            key={quickCaja}
                            type="button"
                            onClick={() => setCajaAfectada(quickCaja)}
                            className={`px-2 py-2 rounded-xl text-xs font-extrabold transition-all border min-h-[38px] text-center truncate ${
                              cajaAfectada === quickCaja
                                ? 'bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-sm ring-2 ring-blue-300'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {quickCaja}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                        O seleccione desde la lista de Cajas y Cuentas:
                      </label>
                      <select
                        value={cajaAfectada}
                        onChange={(e) => setCajaAfectada(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none min-h-[44px]"
                        required
                      >
                        <option value="">-- Seleccione Caja / Cuenta de Arqueo --</option>
                        {cajasDisponibles.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Nro Comprobante & Detalle Operación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Nro Recibo / Boleta *</label>
                  <input
                    type="text"
                    value={nroComprobante}
                    onChange={(e) => setNroComprobante(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 min-h-[40px] focus:ring-2 focus:ring-[#1d4ed8]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Glosa / Detalle</label>
                  <input
                    type="text"
                    value={detalleOperacion}
                    onChange={(e) => setDetalleOperacion(e.target.value)}
                    placeholder="Cobro de saldo contra entrega..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 min-h-[40px] focus:ring-2 focus:ring-[#1d4ed8]"
                  />
                </div>
              </div>

              {/* Sección Opcional Colapsable: Delivery y Gastos Directos */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMostrarOpcionesExtras(!mostrarOpcionesExtras)}
                  className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-slate-700 font-bold text-xs transition-colors"
                >
                  <span>Servicios Adicionales (Delivery y Fletero Local)</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {mostrarOpcionesExtras ? '▲ Ocultar' : '▼ Expandir'}
                  </span>
                </button>

                {mostrarOpcionesExtras && (
                  <div className="p-3.5 bg-white space-y-3 border-t border-slate-200">
                    {/* Delivery */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                        Ingreso Adicional Delivery (Bs):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={deliveryBs}
                          onChange={(e) => setDeliveryBs(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 min-h-[40px]"
                        />
                        <select
                          value={conceptoIngresoExtra}
                          onChange={(e) => setConceptoIngresoExtra(e.target.value)}
                          className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 min-h-[40px]"
                        >
                          {categoriasIngresoDisponibles.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Comisión Fletero */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-rose-600 mb-1 block">
                        Deducción de Comisión / Fletero Local (Bs):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={comisionBs}
                          onChange={(e) => setComisionBs(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 min-h-[40px]"
                        />
                        <select
                          value={conceptoComision}
                          onChange={(e) => setConceptoComision(e.target.value)}
                          className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 min-h-[40px]"
                        >
                          {categoriasGastoDisponibles.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Proveedor / Fletero:</label>
                      <select
                        value={idProveedorGasto}
                        onChange={(e) => setIdProveedorGasto(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 min-h-[40px]"
                      >
                        <option value="">-- Sin Proveedor asignado --</option>
                        {(catalogos.proveedores || []).map((p) => (
                          <option key={p.idProveedor} value={p.idProveedor}>
                            {p.nombre} ({p.rubro || 'Proveedor'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen de Liquidación Neta de Caja */}
              <div className="p-3.5 bg-[#f0fdf4] border border-[#dcfce7] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-black text-[#16a34a] tracking-wider block">
                    RECAUDACIÓN NETA DE CAJA
                  </span>
                  <p className="text-[10px] text-slate-500">
                    (Cobro Saldo: Bs {cobroNum.toFixed(2)} + Delivery: Bs {deliveryNum.toFixed(2)} - Gasto: Bs {comisionNum.toFixed(2)})
                  </p>
                </div>
                <span className="text-xl font-black text-[#16a34a]">
                  Bs {recaudacionNetaOperacion.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

              {/* Botones de Acción */}
              <div className="pt-2 flex justify-end space-x-2.5 sticky bottom-0 bg-white py-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedSub || cobroNum <= 0 || !cajaAfectada || isSubmitting}
                  className="bg-[#16a34a] hover:bg-emerald-700 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/25 min-h-[44px] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>{isSubmitting ? 'Registrando...' : 'Confirmar Cobro y Generar Recibo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Sub-Manifiesto */}
      {subToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full max-w-md rounded-[20px] shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Eliminar Encomienda</h3>
                <p className="text-xs text-slate-500 font-mono">{subToDelete.nroManifiesto}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
              ¿Está seguro de eliminar esta encomienda de <strong className="text-slate-800">{subToDelete.destinatario}</strong>?
              Esta acción eliminará el registro y revertirá los saldos y comisiones asociados.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSubToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors min-h-[40px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSub && subToDelete) {
                    onDeleteSub(subToDelete);
                  }
                  setSubToDelete(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 min-h-[40px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal para Liquidar Cobro de Origen a Caja Central */}
      {liquidarModal.open && liquidarModal.sub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-[#e2e8f0] w-full max-w-md rounded-[18px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 bg-emerald-50 border-b border-emerald-100">
              <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Liquidar Cobro de Origen a Caja Central
              </h3>
              <button 
                type="button"
                onClick={() => setLiquidarModal({ ...liquidarModal, open: false, sub: null })} 
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sub-Manifiesto:</span>
                  <span className="font-mono font-bold text-slate-800">{liquidarModal.sub.nroManifiesto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destinatario:</span>
                  <span className="font-bold text-slate-800">{liquidarModal.sub.destinatario}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cuenta de Origen (CxC):</span>
                  <span className="font-semibold text-slate-700">{liquidarModal.sub.cuentaAfectadaOrigen || 'Caja Agencia Origen'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Monto a Rendir / Liquidar:</span>
                  <span className="font-black text-emerald-600 text-sm">
                    Bs {Number(liquidarModal.sub.pagadoOrigenBs).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Cuenta / Caja Destino (Central / Bancos) *
                </label>
                <select
                  value={liquidarModal.cuentaCentral}
                  onChange={(e) => setLiquidarModal({ ...liquidarModal, cuentaCentral: e.target.value })}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 font-bold min-h-[44px]"
                  required
                >
                  <option value="Caja Oficina Central">Caja Oficina Central</option>
                  <option value="Banco Unión Central">Banco Unión Central</option>
                  <option value="Banco Central QR">Banco Central QR</option>
                  {catalogos.cajasCuentas?.filter(c => c !== 'Caja Oficina Central' && c !== 'Banco Unión Central' && c !== 'Banco Central QR').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Fecha de Rendición / Depósito *
                </label>
                <input
                  type="date"
                  value={liquidarModal.fecha}
                  onChange={(e) => setLiquidarModal({ ...liquidarModal, fecha: e.target.value })}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 font-mono min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Comprobante / Notas de Liquidación
                </label>
                <input
                  type="text"
                  value={liquidarModal.notas}
                  onChange={(e) => setLiquidarModal({ ...liquidarModal, notas: e.target.value })}
                  placeholder="Ej. Depósito boleta rendido por agencia"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 min-h-[44px]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setLiquidarModal({ ...liquidarModal, open: false, sub: null })}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (onLiquidarCobroOrigen && liquidarModal.sub) {
                      await onLiquidarCobroOrigen(
                        liquidarModal.sub.idSubManifiesto,
                        liquidarModal.cuentaCentral,
                        liquidarModal.fecha,
                        liquidarModal.notas
                      );
                      setLiquidarModal({ ...liquidarModal, open: false, sub: null });
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl shadow-md min-h-[44px] active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Abonar a Caja Central</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Liquidar / Descargar Saldos de Agencias de Destino (Acción 3) */}
      {liquidarAgenciasModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-[#e2e8f0] w-full max-w-md rounded-[18px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 bg-amber-50 border-b border-amber-200">
              <h3 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                Liquidar / Descargar Saldos de Agencias de Destino
              </h3>
              <button 
                type="button"
                onClick={() => setLiquidarAgenciasModal({ ...liquidarAgenciasModal, open: false })} 
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-500 text-[11px]">
                Registra el depósito que la Agencia de Destino realiza hacia tu cuenta bancaria o caja central, reduciendo la deuda retenida por la agencia y sumando el disponible a tu caja.
              </p>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                  Agencia de Destino *
                </label>
                <select
                  value={liquidarAgenciasModal.agencia}
                  onChange={(e) => {
                    const ag = e.target.value;
                    const saldo = agenciasRetenciones[ag] || 0;
                    setLiquidarAgenciasModal({
                      ...liquidarAgenciasModal,
                      agencia: ag,
                      montoMax: saldo,
                      montoALiquidar: saldo
                    });
                  }}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold min-h-[44px]"
                  required
                >
                  {catalogos.sucursales?.map((s) => {
                    const ret = agenciasRetenciones[s] || 0;
                    return (
                      <option key={s} value={s}>
                        {s} {ret > 0 ? `(Retiene Bs. ${ret.toLocaleString('es-BO')})` : '(Sin retención pendiente)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-3 flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Total Cobros que Retiene la Agencia:</span>
                <span className="font-black text-amber-950 text-base">
                  Bs {(liquidarAgenciasModal.montoMax || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                  Monto a Liquidar / Abonar (Bs) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={liquidarAgenciasModal.montoALiquidar}
                  onChange={(e) => setLiquidarAgenciasModal({ ...liquidarAgenciasModal, montoALiquidar: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                  Cuenta / Caja Destino de la Empresa *
                </label>
                <select
                  value={liquidarAgenciasModal.cuentaCentral}
                  onChange={(e) => setLiquidarAgenciasModal({ ...liquidarAgenciasModal, cuentaCentral: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold min-h-[44px]"
                  required
                >
                  <option value="Caja Oficina Central">Caja Oficina Central</option>
                  <option value="Banco Unión Central">Banco Unión Central</option>
                  <option value="Banco Unión QR">Banco Unión QR</option>
                  <option value="Efectivo">Efectivo</option>
                  {cajasDisponibles.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                  Fecha del Depósito / Liquidación *
                </label>
                <input
                  type="date"
                  value={liquidarAgenciasModal.fecha}
                  onChange={(e) => setLiquidarAgenciasModal({ ...liquidarAgenciasModal, fecha: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                  Comprobante / Nro. Transferencia Bancaria
                </label>
                <input
                  type="text"
                  value={liquidarAgenciasModal.notas}
                  onChange={(e) => setLiquidarAgenciasModal({ ...liquidarAgenciasModal, notas: e.target.value })}
                  placeholder="Ej. Depósito boleta #98421 Banco Unión"
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl px-3 py-2 text-slate-800 min-h-[44px]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setLiquidarAgenciasModal({ ...liquidarAgenciasModal, open: false })}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={liquidarAgenciasModal.montoALiquidar <= 0}
                  onClick={async () => {
                    if (onLiquidarSaldosAgenciaDestino && liquidarAgenciasModal.montoALiquidar > 0) {
                      await onLiquidarSaldosAgenciaDestino(
                        liquidarAgenciasModal.agencia,
                        liquidarAgenciasModal.cuentaCentral,
                        liquidarAgenciasModal.montoALiquidar,
                        liquidarAgenciasModal.fecha,
                        liquidarAgenciasModal.notas
                      );
                      setLiquidarAgenciasModal({ ...liquidarAgenciasModal, open: false });
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl shadow-md min-h-[44px] active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Confirmar y Liquidar Saldo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Módulo 1: Cobranzas Origen Liquidación (Agencias de Origen) */}
      <LiquidacionOrigenModal
        isOpen={isLiqOrigenModalOpen}
        onClose={() => setIsLiqOrigenModalOpen(false)}
        manifiestosDestino={manifiestosDestino}
        manifiestosOrigen={manifiestosOrigen}
        catalogos={catalogos}
        categorias={categorias}
        cajasDisponibles={cajasDisponibles}
        onLiquidar={async (payload) => {
          if (onLiquidarAgenciaConDeducciones) {
            await onLiquidarAgenciaConDeducciones(payload);
          }
        }}
        onAddCategoria={onAddCategoria}
      />

      {/* Módulo 2: Cobranzas Destino Liquidación (Agencias de Destino) */}
      <LiquidacionDestinoModal
        isOpen={isLiqDestinoModalOpen}
        onClose={() => setIsLiqDestinoModalOpen(false)}
        manifiestosDestino={manifiestosDestino}
        viajes={viajes}
        catalogos={catalogos}
        categorias={categorias}
        cajasDisponibles={cajasDisponibles}
        onLiquidar={async (payload) => {
          if (onLiquidarAgenciaConDeducciones) {
            await onLiquidarAgenciaConDeducciones(payload);
          }
        }}
        onAddCategoria={onAddCategoria}
      />

      {/* Modal: Registrar Cobranza en Origen */}
      <RegistrarCobranzaOrigenModal
        isOpen={isCobranzaOrigenModalOpen}
        onClose={() => {
          setIsCobranzaOrigenModalOpen(false);
          setSubParaCobroOrigen(null);
        }}
        manifiestosDestino={manifiestosDestino}
        manifiestosOrigen={manifiestosOrigen}
        viajes={viajes}
        catalogos={catalogos}
        cajas={cajas}
        subManifiestoPreseleccionado={subParaCobroOrigen}
        onSuccess={() => {
          if (onRefreshData) onRefreshData();
          if (showToast) showToast('Cobranza en origen registrada y saldos actualizados en cascada.', 'success');
        }}
      />
    </div>
  );
};
