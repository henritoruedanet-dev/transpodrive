import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Filter, 
  PieChart, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Truck, 
  Building2, 
  FileText, 
  Search, 
  RefreshCw, 
  Receipt,
  X,
  SlidersHorizontal,
  ChevronDown,
  Clock,
  Scale,
  Wallet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  UserCheck,
  Users,
  Phone,
  Eye,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownLeft,
  Edit3
} from 'lucide-react';
import { 
  TransaccionDiaria, 
  CategoriaFinanciera, 
  Viaje, 
  ManifiestoOrigen, 
  ManifiestoDestino,
  Catalogos 
} from '../types';
import { calcularSaldosSubManifiesto } from '../utils/subManifiestoSaldos';
import { EstadoCuentaModal, EntidadEstadoCuenta, MovimientoEstadoCuenta } from './EstadoCuentaModal';
import { RegistrarCobroReporteModal, ItemCobroCxC } from './RegistrarCobroReporteModal';
import { RegistrarPagoProveedorModal, ItemPagoCxP } from './RegistrarPagoProveedorModal';
import { storage } from '../services/storageService';
import { exportElementToPDF, exportCxCToExcel, exportCxPToExcel } from '../utils/exportUtils';

interface ReportesAvanzadosViewProps {
  transacciones: TransaccionDiaria[];
  categorias: CategoriaFinanciera[];
  viajes: Viaje[];
  manifiestos: ManifiestoOrigen[];
  manifiestosDestino?: ManifiestoDestino[];
  subManifiestos?: ManifiestoDestino[];
  catalogos: Catalogos;
  onVerComprobante: (fotoUrl: string) => void;
  onLiquidarCobroOrigen?: (idSubManifiesto: string, cuentaCentral: string, fecha?: string, notas?: string) => Promise<void>;
  onLiquidarSaldosAgenciaDestino?: (
    agenciaDestino: string,
    cuentaCentral: string,
    montoALiquidar: number,
    fecha?: string,
    notas?: string
  ) => Promise<void>;
  onRegistrarCobroCxC?: (payload: any) => Promise<void>;
  onRegistrarPagoProveedor?: (payload: any) => Promise<void>;
  onEditTransaccion?: (tx: TransaccionDiaria) => void;
}

export const ReportesAvanzadosView: React.FC<ReportesAvanzadosViewProps> = ({
  transacciones,
  categorias,
  viajes,
  manifiestos,
  manifiestosDestino = [],
  subManifiestos = [],
  catalogos,
  onVerComprobante,
  onLiquidarCobroOrigen,
  onLiquidarSaldosAgenciaDestino,
  onRegistrarCobroCxC,
  onRegistrarPagoProveedor,
  onEditTransaccion
}) => {
  // Unificar sub-manifiestos
  const todosLosSubManifiestos = manifiestosDestino.length > 0 ? manifiestosDestino : subManifiestos;

  const [seccionReporte, setSeccionReporte] = useState<'transacciones' | 'submanifiestos' | 'viajes' | 'balance_operativo' | 'estado_resultados' | 'cxc' | 'cxp'>('transacciones');

  // Modal para liquidar saldos retenidos por Agencias de Destino
  const [liquidarAgenciaDestinoModal, setLiquidarAgenciaDestinoModal] = useState<{
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

  // Modal para liquidar cobro de origen a caja central desde reportes
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
  // Filtros Avanzados
  const [presetFecha, setPresetFecha] = useState<string>('este_mes');
  const [filtroMes, setFiltroMes] = useState<string>(new Date().toISOString().substring(0, 7));
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('Todos');
  const [filtroSucursal, setFiltroSucursal] = useState<string>('Todas');
  const [filtroPlaca, setFiltroPlaca] = useState<string>('Todos');
  const [filtroViaje, setFiltroViaje] = useState<string>('Todos');
  const [filtroManifiesto, setFiltroManifiesto] = useState<string>('Todos');
  const [montoMin, setMontoMin] = useState<string>('');
  const [montoMax, setMontoMax] = useState<string>('');
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');
  const [graficoModo, setGraficoModo] = useState<'gastos' | 'ingresos' | 'utilidad'>('utilidad');
  const [showPrintView, setShowPrintView] = useState<boolean>(false);
  const [printSeccion, setPrintSeccion] = useState<'transacciones' | 'submanifiestos' | 'viajes' | 'balance_operativo' | 'estado_resultados' | 'todo'>('transacciones');
  const [filtroAgenciaDestinoCxC, setFiltroAgenciaDestinoCxC] = useState<string>('Todas');
  const [busquedaClienteDirectoCxC, setBusquedaClienteDirectoCxC] = useState<string>('');

  // -------------------------------------------------------------
  // ESTADOS Y FILTROS DEL PANEL ESPECIALIZADO: CUENTAS POR COBRAR (CxC)
  // -------------------------------------------------------------
  const [filtroTipoDeudorCxC, setFiltroTipoDeudorCxC] = useState<'Todos' | 'CLIENTE' | 'AGENCIA_ORIGEN' | 'AGENCIA_DESTINO'>('Todos');
  const [filtroDeudorEspecificoCxC, setFiltroDeudorEspecificoCxC] = useState<string>('');
  const [filtroEstadoDeudaCxC, setFiltroEstadoDeudaCxC] = useState<'Todas' | 'Pendientes' | 'Vencidas'>('Pendientes');
  const [filtroViajeEspecificoCxC, setFiltroViajeEspecificoCxC] = useState<string>('Todos');
  const [filtroFechaDesdeCxC, setFiltroFechaDesdeCxC] = useState<string>('');
  const [filtroFechaHastaCxC, setFiltroFechaHastaCxC] = useState<string>('');

  // -------------------------------------------------------------
  // ESTADOS Y FILTROS DEL PANEL ESPECIALIZADO: CUENTAS POR PAGAR (CxP)
  // -------------------------------------------------------------
  const [filtroProveedorEspecificoCxP, setFiltroProveedorEspecificoCxP] = useState<string>('Todos');
  const [filtroRubroCxP, setFiltroRubroCxP] = useState<string>('Todos');
  const [filtroEstadoObligacionCxP, setFiltroEstadoObligacionCxP] = useState<'Todas' | 'Pendientes' | 'Pagadas'>('Pendientes');
  const [filtroCamionViajeCxP, setFiltroCamionViajeCxP] = useState<string>('Todos');
  const [filtroFechaDesdeCxP, setFiltroFechaDesdeCxP] = useState<string>('');
  const [filtroFechaHastaCxP, setFiltroFechaHastaCxP] = useState<string>('');

  // -------------------------------------------------------------
  // MODALES: ESTADO DE CUENTA, REGISTRAR COBRO Y REGISTRAR PAGO
  // -------------------------------------------------------------
  const [estadoCuentaModalOpen, setEstadoCuentaModalOpen] = useState<boolean>(false);
  const [estadoCuentaEntidad, setEstadoCuentaEntidad] = useState<EntidadEstadoCuenta | null>(null);

  const [cobroReporteModalOpen, setCobroReporteModalOpen] = useState<boolean>(false);
  const [cobroReporteItem, setCobroReporteItem] = useState<ItemCobroCxC | null>(null);

  const [pagoProveedorModalOpen, setPagoProveedorModalOpen] = useState<boolean>(false);
  const [pagoProveedorItem, setPagoProveedorItem] = useState<ItemPagoCxP | null>(null);

  const cajasDisponibles = useMemo(() => {
    return catalogos.cajasCuentas && catalogos.cajasCuentas.length > 0
      ? catalogos.cajasCuentas
      : ['Caja Oficina Central', 'Banco Unión Central', 'Banco Unión QR', 'Efectivo'];
  }, [catalogos.cajasCuentas]);

  // Lista Unificada de Cuentas por Cobrar (CxC) Operativas
  const itemsCxCDetallados = useMemo(() => {
    const list: Array<{
      idSubManifiesto: string;
      nroManifiesto: string;
      tipoDeudor: 'CLIENTE' | 'AGENCIA_ORIGEN' | 'AGENCIA_DESTINO';
      nombreDeudor: string;
      nitCi?: string;
      telefono?: string;
      refViaje: string;
      fechaEmision: string;
      fleteTotalBs: number;
      pagadoBs: number;
      saldoPendienteBs: number;
      estado: string;
      descripcionCarga?: string;
      sucursal?: string;
    }> = [];

    todosLosSubManifiestos.forEach(s => {
      const flete = Number(s.fleteAsignadoBs) || 0;
      const saldos = calcularSaldosSubManifiesto(s);
      const porPagarDestino = Number(s.porPagarDestinoBs !== undefined ? s.porPagarDestinoBs : (s.saldoInicialCobrarBs || 0));
      const cobrosRealizados = Number(s.cobrosRealizadosBs || 0);
      const saldoDestinoPendiente = Math.max(0, porPagarDestino - cobrosRealizados);

      // 1. Clientes Directos
      const esCliente = (s.tipoDeudor === 'CLIENTE' || s.modalidadCobroDestino === 'Cobro Directo Empresa / Cliente' || saldos.esResponsableCliente) && !saldos.esResponsableAgencia;
      if (esCliente) {
        const saldoCli = saldos.saldoPendienteCliente > 0 ? saldos.saldoPendienteCliente : (s.saldoPendienteClienteBs || 0);
        list.push({
          idSubManifiesto: s.idSubManifiesto,
          nroManifiesto: s.nroManifiesto,
          tipoDeudor: 'CLIENTE',
          nombreDeudor: s.destinatario || 'Cliente General',
          nitCi: s.nitCiDestinatario || s.nitCiRemitente,
          telefono: s.telefonoDestinatario || s.telefonoContacto,
          refViaje: s.idViaje || s.nroManifiesto,
          fechaEmision: s.fechaDespacho || s.fechaRegistro || '',
          fleteTotalBs: flete,
          pagadoBs: cobrosRealizados,
          saldoPendienteBs: saldoCli,
          estado: saldoCli <= 0 ? 'Liquidado' : (s.estadoCobranzaDestino || 'Pendiente de Pago Cliente'),
          descripcionCarga: s.descripcionCarga,
          sucursal: s.sucursalDestino
        });
      }

      // 2. Agencias de Origen
      const pagadoOrigen = Number(s.pagadoOrigenBs) || 0;
      if (pagadoOrigen > 0) {
        const agNombre = s.origenViaje || (s.cuentaAfectadaOrigen ? s.cuentaAfectadaOrigen.replace('Caja Agencia ', '').replace('CxC Agencia ', '') : 'Agencia Origen');
        const pendiente = s.estadoLiquidacionAgencia !== 'Liquidado a Central';
        list.push({
          idSubManifiesto: s.idSubManifiesto,
          nroManifiesto: s.nroManifiesto,
          tipoDeudor: 'AGENCIA_ORIGEN',
          nombreDeudor: `Agencia ${agNombre}`,
          telefono: s.telefonoRemitente,
          refViaje: s.idViaje || s.nroManifiesto,
          fechaEmision: s.fechaDespacho || s.fechaRegistro || '',
          fleteTotalBs: pagadoOrigen,
          pagadoBs: pendiente ? 0 : pagadoOrigen,
          saldoPendienteBs: pendiente ? pagadoOrigen : 0,
          estado: s.estadoLiquidacionAgencia || (pendiente ? 'Pendiente de Liquidación' : 'Liquidado a Central'),
          descripcionCarga: `Cobro Origen - ${s.destinatario || ''}`,
          sucursal: s.origenViaje
        });
      }

      // 3. Agencias de Destino
      const esModalidadAgencia = saldos.esResponsableAgencia || 
                                s.tipoResponsableDestino === 'AGENCIA' ||
                                s.tipoDeudor === 'AGENCIA' ||
                                (s.modalidadCobroDestino !== 'Cobro Directo Empresa / Cliente' && s.tipoDeudor !== 'CLIENTE');
      const saldoPorCobrar = saldos.saldoPendienteAgenciaDestino !== undefined 
        ? saldos.saldoPendienteAgenciaDestino 
        : saldoDestinoPendiente;
      const retenido = Number(s.montoRetenidoAgenciaBs) || 0;
      const saldoTotalAgencia = saldoPorCobrar + (s.estadoRendicionDestino === 'Retenido en Agencia (CxC Agencia)' ? retenido : 0);

      if (esModalidadAgencia || retenido > 0) {
        const agNombre = s.agenciaDestinoResponsable || s.sucursalDestino || 'Agencia Destino';
        const pagadoAgencia = Math.max(0, flete - saldoTotalAgencia);
        list.push({
          idSubManifiesto: s.idSubManifiesto,
          nroManifiesto: s.nroManifiesto,
          tipoDeudor: 'AGENCIA_DESTINO',
          nombreDeudor: `Agencia ${agNombre}`,
          telefono: s.telefonoContacto,
          refViaje: s.idViaje || s.nroManifiesto,
          fechaEmision: s.fechaDespacho || s.fechaRegistro || '',
          fleteTotalBs: flete,
          pagadoBs: pagadoAgencia,
          saldoPendienteBs: saldoTotalAgencia,
          estado: s.estadoRendicionDestino || s.estadoCobranzaDestino || (saldoTotalAgencia <= 0 ? 'Liquidado' : 'Pendiente'),
          descripcionCarga: `Entrega en destino - ${s.destinatario || ''}`,
          sucursal: s.sucursalDestino
        });
      }
    });

    // 4. Cuentas por Cobrar (CxC) de Transacciones Diarias Registradas con "Por Cobrar" o Anticipo Mixto
    (transacciones || []).forEach(t => {
      const modalidad = t.modalidadPago || (t.metodoPago === 'Por Cobrar' ? 'Credito' : 'Contado');
      const esPorCobrar = t.tipo === 'Ingreso' && (t.metodoPago === 'Por Cobrar' || modalidad === 'Anticipo_Saldo');
      if (esPorCobrar) {
        const monto = Number(t.montoBs) || 0;
        const esCobrado = t.estadoCobroPago === 'Cobrado';
        const anticipo = Number(t.montoAnticipoBs || 0);
        const saldo = esCobrado ? 0 : (modalidad === 'Anticipo_Saldo' ? Number(t.saldoPendienteBs ?? Math.max(0, monto - anticipo)) : monto);
        const pagado = esCobrado ? monto : (modalidad === 'Anticipo_Saldo' ? anticipo : 0);
        const deudor = (t.deudorNombre || t.nombreCliente || t.idCliente || t.notas || 'Cliente / Deudor').trim();

        list.push({
          idSubManifiesto: t.idTransaccion,
          nroManifiesto: t.nroManifiesto || t.idTransaccion,
          tipoDeudor: 'CLIENTE',
          nombreDeudor: deudor,
          nitCi: '',
          telefono: '',
          refViaje: t.idViaje || 'Directo / Sin Viaje',
          fechaEmision: t.fecha || '',
          fleteTotalBs: monto,
          pagadoBs: pagado,
          saldoPendienteBs: saldo,
          estado: saldo <= 0 ? 'Cobrado / Liquidado' : (modalidad === 'Anticipo_Saldo' ? 'Saldo Pendiente (Anticipo Cobrado)' : 'Pendiente de Cobro'),
          descripcionCarga: `${t.categoria}${t.notas ? ` - ${t.notas}` : ''}`,
          sucursal: t.sucursal || 'Oficina Central'
        });
      }
    });

    return list;
  }, [todosLosSubManifiestos, transacciones]);

  // Filtrado reactivo de Cuentas por Cobrar
  const cxcOperativasFiltradas = useMemo(() => {
    return itemsCxCDetallados.filter(item => {
      if (filtroTipoDeudorCxC !== 'Todos' && item.tipoDeudor !== filtroTipoDeudorCxC) return false;
      if (filtroDeudorEspecificoCxC && !item.nombreDeudor.toLowerCase().includes(filtroDeudorEspecificoCxC.toLowerCase())) return false;
      if (filtroEstadoDeudaCxC === 'Pendientes' && item.saldoPendienteBs <= 0) return false;
      if (filtroEstadoDeudaCxC === 'Vencidas') {
        if (item.saldoPendienteBs <= 0) return false;
        if (item.fechaEmision) {
          const dias = (Date.now() - new Date(item.fechaEmision).getTime()) / (1000 * 3600 * 24);
          if (dias < 15) return false;
        }
      }
      if (filtroViajeEspecificoCxC !== 'Todos' && item.refViaje !== filtroViajeEspecificoCxC && !item.refViaje.includes(filtroViajeEspecificoCxC)) return false;
      if (filtroFechaDesdeCxC && item.fechaEmision && item.fechaEmision < filtroFechaDesdeCxC) return false;
      if (filtroFechaHastaCxC && item.fechaEmision && item.fechaEmision > filtroFechaHastaCxC) return false;
      return true;
    });
  }, [itemsCxCDetallados, filtroTipoDeudorCxC, filtroDeudorEspecificoCxC, filtroEstadoDeudaCxC, filtroViajeEspecificoCxC, filtroFechaDesdeCxC, filtroFechaHastaCxC]);

  // Lista Unificada de Cuentas por Pagar (CxP) a Proveedores
  const itemsCxPDetallados = useMemo(() => {
    const allCxP = catalogos.cuentasPorPagar || [];
    const list = allCxP.map(c => ({
      idCxP: c.idCxP,
      idProveedor: c.idProveedor,
      nombreProveedor: c.nombreProveedor || c.proveedorNombre || 'Proveedor General',
      rubro: c.rubro || 'Servicios y Repuestos',
      nroFacturaBoleta: c.nroFacturaBoleta || c.idCxP,
      placaCamion: c.placaCamion || c.centroCostoPlaca || '',
      idViaje: c.idViaje || '',
      fechaEmision: c.fechaEmision || '',
      fechaVencimiento: c.fechaVencimiento || '',
      montoTotalBs: Number(c.montoTotalBs) || 0,
      montoAbonadoBs: Math.max(0, (Number(c.montoTotalBs) || 0) - (Number(c.saldoPendienteBs ?? c.montoTotalBs) || 0)),
      saldoPendienteBs: Number(c.saldoPendienteBs ?? c.montoTotalBs) || 0,
      estado: c.estado || ((c.saldoPendienteBs ?? c.montoTotalBs) <= 0 ? 'Pagado Totalmente' : 'Pendiente'),
      concepto: c.concepto || 'Compra / Servicio'
    }));

    // Incorporar transacciones de gastos a crédito ("Por Pagar" o "Anticipo_Saldo") que no estén duplicadas
    const existingCxPIds = new Set(list.map(x => x.idCxP));
    (transacciones || []).forEach(t => {
      const modalidad = t.modalidadPago || (t.metodoPago === 'Por Pagar' ? 'Credito' : 'Contado');
      const esPorPagar = t.tipo === 'Gasto' && (t.metodoPago === 'Por Pagar' || modalidad === 'Anticipo_Saldo');
      if (esPorPagar && !existingCxPIds.has(t.idTransaccion)) {
        const monto = Number(t.montoBs) || 0;
        const esPagado = t.estadoCobroPago === 'Pagado';
        const anticipo = Number(t.montoAnticipoBs || 0);
        const saldo = esPagado ? 0 : (modalidad === 'Anticipo_Saldo' ? Number(t.saldoPendienteBs ?? Math.max(0, monto - anticipo)) : monto);
        const abonado = esPagado ? monto : (modalidad === 'Anticipo_Saldo' ? anticipo : 0);
        const prov = (catalogos.proveedores || []).find(p => p.idProveedor === t.idProveedor);
        const nomProv = t.nombreProveedor || prov?.nombre || t.idProveedor || 'Proveedor General';

        list.push({
          idCxP: t.idTransaccion,
          idProveedor: t.idProveedor || 'PRV-GEN',
          nombreProveedor: nomProv,
          rubro: prov?.rubro || t.categoria || 'Gasto Operativo',
          nroFacturaBoleta: t.nroFacturaBoleta || t.nroManifiesto || t.idTransaccion,
          placaCamion: t.placaCamion || '',
          idViaje: t.idViaje || '',
          fechaEmision: t.fecha || '',
          fechaVencimiento: t.fechaVencimiento || '',
          montoTotalBs: monto,
          montoAbonadoBs: abonado,
          saldoPendienteBs: saldo,
          estado: saldo <= 0 ? 'Pagado' : (modalidad === 'Anticipo_Saldo' ? 'Parcial' : 'Pendiente'),
          concepto: `${t.categoria}${t.notas ? ` - ${t.notas}` : ''}`
        });
      }
    });

    return list;
  }, [catalogos.cuentasPorPagar, catalogos.proveedores, transacciones]);

  // Filtrado reactivo de Cuentas por Pagar
  const cxpOperativasFiltradas = useMemo(() => {
    return itemsCxPDetallados.filter(item => {
      if (filtroProveedorEspecificoCxP !== 'Todos' && item.nombreProveedor !== filtroProveedorEspecificoCxP && !item.nombreProveedor.toLowerCase().includes(filtroProveedorEspecificoCxP.toLowerCase())) {
        return false;
      }
      if (filtroRubroCxP !== 'Todos' && !item.rubro.toLowerCase().includes(filtroRubroCxP.toLowerCase())) {
        return false;
      }
      if (filtroEstadoObligacionCxP === 'Pendientes' && item.saldoPendienteBs <= 0) return false;
      if (filtroEstadoObligacionCxP === 'Pagadas' && item.saldoPendienteBs > 0) return false;
      if (filtroCamionViajeCxP !== 'Todos') {
        const matchPlaca = item.placaCamion === filtroCamionViajeCxP;
        const matchViaje = item.idViaje === filtroCamionViajeCxP;
        if (!matchPlaca && !matchViaje) return false;
      }
      if (filtroFechaDesdeCxP && item.fechaEmision && item.fechaEmision < filtroFechaDesdeCxP) return false;
      if (filtroFechaHastaCxP && item.fechaEmision && item.fechaEmision > filtroFechaHastaCxP) return false;
      return true;
    });
  }, [itemsCxPDetallados, filtroProveedorEspecificoCxP, filtroRubroCxP, filtroEstadoObligacionCxP, filtroCamionViajeCxP, filtroFechaDesdeCxP, filtroFechaHastaCxP]);

  // Apertura de Estado de Cuenta Dinámico
  const abrirEstadoCuentaCliente = (nombreCliente: string) => {
    const cleanNombre = nombreCliente.trim().toLowerCase();
    const subsCliente = todosLosSubManifiestos.filter(s => 
      (s.destinatario || '').trim().toLowerCase() === cleanNombre ||
      (s.destinatario || '').trim().toLowerCase().includes(cleanNombre) ||
      (s.nombreDeudor || '').trim().toLowerCase() === cleanNombre
    );

    const movimientos: MovimientoEstadoCuenta[] = [];

    // 1. Despachos y Fletes de Manifiestos
    subsCliente.forEach(s => {
      const flete = Number(s.fleteAsignadoBs) || 0;
      const cobrado = Number(s.cobrosRealizadosBs) || 0;
      const fecha = s.fechaDespacho || s.fechaRegistro || new Date().toISOString().split('T')[0];
      const nroDoc = s.nroManifiesto || s.idSubManifiesto;

      // Cargo inicial por flete
      movimientos.push({
        id: `cargo-${s.idSubManifiesto}`,
        fecha: fecha,
        referencia: nroDoc,
        nroComprobante: nroDoc,
        concepto: `Cargo Inicial por Flete - ${s.descripcionCarga || 'Mercadería general'} (Viaje: ${s.idViaje || '-'})`,
        caja: '',
        debitoBs: flete,
        creditoBs: 0,
        saldoBs: 0,
        estado: s.estadoCobranzaDestino || s.estadoLiquidacion
      });

      // Abono o cobranza realizada
      if (cobrado > 0) {
        movimientos.push({
          id: `abono-${s.idSubManifiesto}`,
          fecha: fecha,
          referencia: `REC-${nroDoc}`,
          nroComprobante: `REC-${nroDoc}`,
          concepto: `Abono / Pago Parcial de Flete`,
          caja: s.cuentaAfectadaOrigen || 'Caja Sucursal',
          debitoBs: 0,
          creditoBs: cobrado,
          saldoBs: 0,
          estado: 'Cobrado'
        });
      }
    });

    // 2. Transacciones Diarias de Ingreso asociadas al Cliente
    const txCliente = (transacciones || []).filter(t => {
      if (t.tipo !== 'Ingreso') return false;
      const deudor = (t.nombreCliente || t.deudorNombre || t.notas || '').toLowerCase();
      return deudor.includes(cleanNombre) || cleanNombre.includes(deudor);
    });

    txCliente.forEach(t => {
      const total = Number(t.montoBs) || 0;
      const anticipo = Number(t.montoAnticipoBs || 0);
      const fecha = t.fecha || new Date().toISOString().split('T')[0];
      const doc = t.nroManifiesto || t.nroFacturaBoleta || t.idTransaccion;

      // Si fue a crédito o mixto, registrar el cargo
      if (t.modalidadPago === 'Credito' || t.modalidadPago === 'Anticipo_Saldo' || t.metodoPago === 'Por Cobrar') {
        movimientos.push({
          id: `tx-cargo-${t.idTransaccion}`,
          fecha: fecha,
          referencia: doc,
          nroComprobante: doc,
          concepto: `Cargo por Servicio/Flete: ${t.categoria}${t.notas ? ` (${t.notas})` : ''}`,
          caja: '',
          debitoBs: total,
          creditoBs: 0,
          saldoBs: 0,
          estado: 'Pendiente'
        });

        // Anticipo en Efectivo o Banco
        if (anticipo > 0) {
          movimientos.push({
            id: `tx-ant-${t.idTransaccion}`,
            fecha: fecha,
            referencia: `REC-${t.idTransaccion}`,
            nroComprobante: `REC-${t.idTransaccion}`,
            concepto: `Anticipo en Efectivo / Banco`,
            caja: t.cuentaAnticipo || 'Caja Central',
            debitoBs: 0,
            creditoBs: anticipo,
            saldoBs: 0,
            estado: 'Abonado'
          });
        }
      } else if (t.categoria === 'Cobranza Fletes CxC' || (t.notas && t.notas.toLowerCase().includes('abono'))) {
        // Abono posterior registrado en transacciones
        movimientos.push({
          id: `tx-abono-${t.idTransaccion}`,
          fecha: fecha,
          referencia: `REC-${t.idTransaccion}`,
          nroComprobante: doc,
          concepto: `Abono de Cobranza: ${t.categoria}${t.notas ? ` (${t.notas})` : ''}`,
          caja: t.metodoPago || 'Caja Central',
          debitoBs: 0,
          creditoBs: total,
          saldoBs: 0,
          estado: 'Cobrado'
        });
      }
    });

    // Ordenar cronológicamente
    movimientos.sort((a, b) => (a.fecha > b.fecha ? 1 : a.fecha < b.fecha ? -1 : 0));

    // Calcular Saldo Resultante Acumulativo fila por fila (Kardex)
    let saldoAcumulado = 0;
    movimientos.forEach(m => {
      saldoAcumulado += (m.debitoBs - m.creditoBs);
      m.saldoBs = Math.max(0, Number(saldoAcumulado.toFixed(2)));
    });

    const totalCargos = movimientos.reduce((sum, m) => sum + m.debitoBs, 0);
    const totalAbonos = movimientos.reduce((sum, m) => sum + m.creditoBs, 0);
    const saldoConsolidado = Math.max(0, totalCargos - totalAbonos);

    const historialAbonos = movimientos.map(m => ({
      fecha: m.fecha,
      nroComprobante: m.nroComprobante || m.referencia || '',
      concepto: m.concepto,
      cargo: m.debitoBs,
      abono: m.creditoBs,
      caja: m.caja || ''
    }));

    const primerSub = subsCliente[0];

    setEstadoCuentaEntidad({
      tipo: 'CLIENTE',
      nombre: nombreCliente,
      nitCi: primerSub?.nitCiDestinatario || primerSub?.nitCiRemitente || '',
      telefono: primerSub?.telefonoDestinatario || primerSub?.telefonoContacto || '',
      direccion: primerSub?.sucursalDestino || '',
      totalCargosBs: totalCargos,
      totalAbonosBs: totalAbonos,
      saldoConsolidadoBs: saldoConsolidado,
      historialAbonos,
      movimientos
    });
    setEstadoCuentaModalOpen(true);
  };

  const abrirEstadoCuentaAgenciaOrigen = (agencia: string) => {
    const cleanAg = agencia.replace('Agencia ', '').trim().toLowerCase();
    const subsAgencia = todosLosSubManifiestos.filter(s =>
      (s.origenViaje || '').toLowerCase().trim() === cleanAg ||
      (s.cuentaAfectadaOrigen || '').toLowerCase().includes(cleanAg)
    );

    const movimientos: MovimientoEstadoCuenta[] = [];
    let saldoAcumulado = 0;

    subsAgencia.forEach(s => {
      const pagadoOrigen = Number(s.pagadoOrigenBs) || 0;
      if (pagadoOrigen > 0) {
        saldoAcumulado += pagadoOrigen;
        movimientos.push({
          id: `orig-${s.idSubManifiesto}`,
          fecha: s.fechaDespacho || new Date().toISOString().split('T')[0],
          referencia: s.nroManifiesto || s.idSubManifiesto,
          concepto: `Flete Cobrado en Agencia Origen - ${s.destinatario || ''} (Viaje: ${s.idViaje || '-'})`,
          debitoBs: pagadoOrigen,
          creditoBs: 0,
          saldoBs: saldoAcumulado,
          estado: s.estadoLiquidacionAgencia || 'Pendiente de Liquidación'
        });

        if (s.estadoLiquidacionAgencia === 'Liquidado a Central') {
          saldoAcumulado -= pagadoOrigen;
          movimientos.push({
            id: `orig-liq-${s.idSubManifiesto}`,
            fecha: s.fechaDespacho || new Date().toISOString().split('T')[0],
            referencia: `LIQ-${s.nroManifiesto}`,
            concepto: `Rendición / Depósito a Caja Central`,
            debitoBs: 0,
            creditoBs: pagadoOrigen,
            saldoBs: saldoAcumulado,
            estado: 'Liquidado'
          });
        }
      }
    });

    const totalCargos = subsAgencia.reduce((sum, s) => sum + (s.pagadoOrigenBs || 0), 0);
    const totalAbonos = subsAgencia.filter(s => s.estadoLiquidacionAgencia === 'Liquidado a Central').reduce((sum, s) => sum + (s.pagadoOrigenBs || 0), 0);
    const saldoConsolidado = totalCargos - totalAbonos;

    setEstadoCuentaEntidad({
      tipo: 'AGENCIA_ORIGEN',
      nombre: `Agencia / Sucursal ${agencia.replace('Agencia ', '')}`,
      rubro: 'Sucursal de Origen (Recaudaciones)',
      totalCargosBs: totalCargos,
      totalAbonosBs: totalAbonos,
      saldoConsolidadoBs: saldoConsolidado,
      movimientos
    });
    setEstadoCuentaModalOpen(true);
  };

  const abrirEstadoCuentaAgenciaDestino = (agencia: string) => {
    const cleanAg = agencia.replace('Agencia ', '').trim().toLowerCase();
    const subsAgencia = todosLosSubManifiestos.filter(s =>
      (s.agenciaDestinoResponsable || s.sucursalDestino || '').toLowerCase().trim() === cleanAg
    );

    const movimientos: MovimientoEstadoCuenta[] = [];
    let saldoAcumulado = 0;

    subsAgencia.forEach(s => {
      const flete = Number(s.fleteAsignadoBs) || 0;
      const retenido = Number(s.montoRetenidoAgenciaBs) || 0;
      const saldos = calcularSaldosSubManifiesto(s);
      const porPagarDestino = Number(s.porPagarDestinoBs !== undefined ? s.porPagarDestinoBs : (s.saldoInicialCobrarBs || 0));
      const cobrosRealizados = Number(s.cobrosRealizadosBs || 0);
      const saldoDestinoPendiente = Math.max(0, porPagarDestino - cobrosRealizados);
      const saldo = saldos.saldoPendienteAgenciaDestino !== undefined 
        ? saldos.saldoPendienteAgenciaDestino 
        : saldoDestinoPendiente;

      if (flete > 0) {
        saldoAcumulado += (saldo + retenido);
        movimientos.push({
          id: `dest-${s.idSubManifiesto}`,
          fecha: s.fechaDespacho || new Date().toISOString().split('T')[0],
          referencia: s.nroManifiesto || s.idSubManifiesto,
          concepto: `Carga para Cobro en Destino - ${s.destinatario || ''} (Viaje: ${s.idViaje || '-'})`,
          debitoBs: flete,
          creditoBs: flete - (saldo + retenido),
          saldoBs: saldoAcumulado,
          estado: s.estadoRendicionDestino || s.estadoCobranzaDestino || s.estadoLiquidacion
        });
      }
    });

    const totalCargos = subsAgencia.reduce((sum, s) => sum + (s.fleteAsignadoBs || 0), 0);
    const saldoConsolidado = subsAgencia.reduce((sum, s) => {
      const saldos = calcularSaldosSubManifiesto(s);
      const porPagarDestino = Number(s.porPagarDestinoBs !== undefined ? s.porPagarDestinoBs : (s.saldoInicialCobrarBs || 0));
      const cobrosRealizados = Number(s.cobrosRealizadosBs || 0);
      const saldoDestinoPendiente = Math.max(0, porPagarDestino - cobrosRealizados);
      const saldo = saldos.saldoPendienteAgenciaDestino !== undefined 
        ? saldos.saldoPendienteAgenciaDestino 
        : saldoDestinoPendiente;
      return sum + saldo + (Number(s.montoRetenidoAgenciaBs) || 0);
    }, 0);
    const totalAbonos = Math.max(0, totalCargos - saldoConsolidado);

    setEstadoCuentaEntidad({
      tipo: 'AGENCIA_DESTINO',
      nombre: `Agencia / Sucursal ${agencia.replace('Agencia ', '')}`,
      rubro: 'Sucursal de Destino (Cobros & Entregas)',
      totalCargosBs: totalCargos,
      totalAbonosBs: totalAbonos,
      saldoConsolidadoBs: saldoConsolidado,
      movimientos
    });
    setEstadoCuentaModalOpen(true);
  };

  const abrirEstadoCuentaProveedor = (nombreProveedor: string) => {
    const cleanNombre = nombreProveedor.toLowerCase().trim();
    const allCxP = catalogos.cuentasPorPagar || [];
    const deudasProv = allCxP.filter(c => 
      (c.nombreProveedor || c.proveedorNombre || '').toLowerCase().trim() === cleanNombre ||
      cleanNombre.includes((c.nombreProveedor || c.proveedorNombre || '').toLowerCase().trim())
    );

    const movimientos: MovimientoEstadoCuenta[] = [];

    // 1. Cuentas por Pagar registradas
    const processedIds = new Set<string>();
    deudasProv.forEach(d => {
      processedIds.add(d.idCxP);
      const total = Number(d.montoTotalBs) || 0;
      const saldo = Number(d.saldoPendienteBs ?? d.montoTotalBs) || 0;
      const pagado = total - saldo;
      const fecha = d.fechaEmision || new Date().toISOString().split('T')[0];
      const doc = d.nroFacturaBoleta || d.idCxP;

      // Cargo inicial por compra / gasto
      movimientos.push({
        id: `cxp-cargo-${d.idCxP}`,
        fecha: fecha,
        referencia: doc,
        nroComprobante: doc,
        concepto: `Cargo Inicial por Compra / Servicio: ${d.concepto} (Camión: ${d.placaCamion || d.idViaje || '-'})`,
        caja: '',
        debitoBs: total,
        creditoBs: 0,
        saldoBs: 0,
        estado: d.estado || (saldo <= 0 ? 'Pagado Totalmente' : 'Pendiente')
      });

      // Abonos / Pagos aplicados
      if (pagado > 0) {
        movimientos.push({
          id: `cxp-pago-${d.idCxP}`,
          fecha: fecha,
          referencia: `REC-${doc}`,
          nroComprobante: `REC-${doc}`,
          concepto: pagado < total ? `Anticipo / Abono Parcial en Efectivo o Banco` : `Liquidación Total de Factura`,
          caja: 'Caja Central',
          debitoBs: 0,
          creditoBs: pagado,
          saldoBs: 0,
          estado: 'Abonado'
        });
      }
    });

    // 2. Transacciones Diarias de tipo Gasto asociadas al proveedor no procesadas previamente
    const txProveedor = (transacciones || []).filter(t => {
      if (t.tipo !== 'Gasto') return false;
      if (processedIds.has(t.idTransaccion)) return false;
      const provName = (t.nombreProveedor || t.idProveedor || t.notas || '').toLowerCase();
      return provName.includes(cleanNombre) || cleanNombre.includes(provName);
    });

    txProveedor.forEach(t => {
      const total = Number(t.montoBs) || 0;
      const anticipo = Number(t.montoAnticipoBs || 0);
      const fecha = t.fecha || new Date().toISOString().split('T')[0];
      const doc = t.nroFacturaBoleta || t.nroManifiesto || t.idTransaccion;

      if (t.modalidadPago === 'Credito' || t.modalidadPago === 'Anticipo_Saldo' || t.metodoPago === 'Por Pagar') {
        movimientos.push({
          id: `tx-cargo-${t.idTransaccion}`,
          fecha: fecha,
          referencia: doc,
          nroComprobante: doc,
          concepto: `Cargo por Compra/Gasto: ${t.categoria}${t.notas ? ` (${t.notas})` : ''}`,
          caja: '',
          debitoBs: total,
          creditoBs: 0,
          saldoBs: 0,
          estado: 'Pendiente'
        });

        if (anticipo > 0) {
          movimientos.push({
            id: `tx-ant-${t.idTransaccion}`,
            fecha: fecha,
            referencia: `REC-${t.idTransaccion}`,
            nroComprobante: `REC-${t.idTransaccion}`,
            concepto: `Anticipo en Efectivo / Banco`,
            caja: t.cuentaAnticipo || 'Caja Central',
            debitoBs: 0,
            creditoBs: anticipo,
            saldoBs: 0,
            estado: 'Abonado'
          });
        }
      } else if (t.categoria === 'Pago a Proveedor' || (t.notas && t.notas.toLowerCase().includes('abono'))) {
        movimientos.push({
          id: `tx-pago-${t.idTransaccion}`,
          fecha: fecha,
          referencia: `REC-${t.idTransaccion}`,
          nroComprobante: doc,
          concepto: `Abono / Pago Realizado: ${t.categoria}${t.notas ? ` (${t.notas})` : ''}`,
          caja: t.metodoPago || 'Caja Central',
          debitoBs: 0,
          creditoBs: total,
          saldoBs: 0,
          estado: 'Pagado'
        });
      }
    });

    // Ordenar cronológicamente
    movimientos.sort((a, b) => (a.fecha > b.fecha ? 1 : a.fecha < b.fecha ? -1 : 0));

    // Calcular Saldo Resultante Acumulativo fila por fila (Kardex)
    let saldoAcumulado = 0;
    movimientos.forEach(m => {
      saldoAcumulado += (m.debitoBs - m.creditoBs);
      m.saldoBs = Math.max(0, Number(saldoAcumulado.toFixed(2)));
    });

    const totalCargos = movimientos.reduce((sum, m) => sum + m.debitoBs, 0);
    const totalAbonos = movimientos.reduce((sum, m) => sum + m.creditoBs, 0);
    const saldoConsolidado = Math.max(0, totalCargos - totalAbonos);

    const historialAbonos = movimientos.map(m => ({
      fecha: m.fecha,
      nroComprobante: m.nroComprobante || m.referencia || '',
      concepto: m.concepto,
      cargo: m.debitoBs,
      abono: m.creditoBs,
      caja: m.caja || ''
    }));

    const primerProv = deudasProv[0];

    setEstadoCuentaEntidad({
      tipo: 'PROVEEDOR',
      nombre: nombreProveedor,
      rubro: primerProv?.rubro || 'Proveedor',
      totalCargosBs: totalCargos,
      totalAbonosBs: totalAbonos,
      saldoConsolidadoBs: saldoConsolidado,
      historialAbonos,
      movimientos
    });
    setEstadoCuentaModalOpen(true);
  };

  // Procesamiento de Cobro desde Reporte
  const handleConfirmCobroReporte = async (payload: any) => {
    if (onRegistrarCobroCxC) {
      await onRegistrarCobroCxC(payload);
    } else {
      await storage.registrarCobroCxCDirecto(payload);
    }
  };

  // Procesamiento de Pago desde Reporte
  const handleConfirmPagoProveedor = async (payload: any) => {
    if (onRegistrarPagoProveedor) {
      await onRegistrarPagoProveedor(payload);
    } else {
      await storage.registrarPagoProveedor(payload);
    }
  };

  // Calcular fechas según presets
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonthStr = today.toISOString().substring(0, 7);

  // Fecha de inicio efectiva para cálculo de Saldo Anterior
  const fechaInicioEfectiva = useMemo(() => {
    if (presetFecha === 'hoy') return todayStr;
    if (presetFecha === 'esta_semana') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    }
    if (presetFecha === 'este_mes') return `${currentMonthStr}-01`;
    if (presetFecha === 'mensual') return filtroMes ? `${filtroMes}-01` : null;
    if (presetFecha === 'personalizado') return fechaDesde || null;
    return null;
  }, [presetFecha, filtroMes, fechaDesde, todayStr, currentMonthStr]);

  // Saldo Anterior Acumulado antes de la fecha de inicio del filtro
  const saldoAnterior = useMemo(() => {
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

  // Conjunto de entidades activas para exclusión estricta de registros huérfanos / eliminados
  const activeTripIds = useMemo(() => new Set(viajes.map(v => v.idViaje)), [viajes]);
  const activeManifestIds = useMemo(() => new Set((manifiestos || []).map(m => m.idManifiesto)), [manifiestos]);
  const activeManifestMICs = useMemo(() => new Set((manifiestos || []).map(m => m.nroManifiestoMIC)), [manifiestos]);
  const activeSubNros = useMemo(() => new Set((todosLosSubManifiestos || []).map(s => s.nroManifiesto)), [todosLosSubManifiestos]);

  const viajeSeleccionadoInexistente = useMemo(() => {
    return filtroViaje !== 'Todos' && !activeTripIds.has(filtroViaje);
  }, [filtroViaje, activeTripIds]);

  // Filtrado de transacciones (con exclusión de huérfanos)
  const transaccionesFiltradas = useMemo(() => {
    return transacciones.filter(t => {
      // Exclusión estricta de registros huérfanos de viajes o manifiestos eliminados
      if (t.idViaje && !activeTripIds.has(t.idViaje)) return false;
      if (t.nroManifiesto && !activeManifestMICs.has(t.nroManifiesto) && !activeSubNros.has(t.nroManifiesto)) return false;

      // Filtro Tipo
      if (filtroTipo !== 'Todos' && t.tipo !== filtroTipo) return false;

      // Filtro Fecha
      if (presetFecha === 'hoy') {
        if (t.fecha !== todayStr) return false;
      } else if (presetFecha === 'esta_semana') {
        const txDate = new Date(t.fecha);
        const diffDays = (today.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (presetFecha === 'este_mes') {
        if (!t.fecha.startsWith(currentMonthStr)) return false;
      } else if (presetFecha === 'mensual') {
        if (filtroMes && !t.fecha.startsWith(filtroMes)) return false;
      } else if (presetFecha === 'personalizado') {
        if (fechaDesde && t.fecha < fechaDesde) return false;
        if (fechaHasta && t.fecha > fechaHasta) return false;
      }

      // Filtro Categoría
      if (filtroCategoria !== 'Todas' && t.categoria !== filtroCategoria) return false;

      // Filtro Método de pago / Cuenta
      if (filtroMetodo !== 'Todos' && t.metodoPago !== filtroMetodo && t.cuentaDestino !== filtroMetodo) return false;

      // Filtro Sucursal
      if (filtroSucursal !== 'Todas' && t.sucursal !== filtroSucursal) return false;

      // Filtro Camión / Placa
      if (filtroPlaca !== 'Todos' && t.placaCamion !== filtroPlaca) return false;

      // Filtro Viaje
      if (filtroViaje !== 'Todos' && t.idViaje !== filtroViaje) return false;

      // Filtro Manifiesto
      if (filtroManifiesto !== 'Todos' && t.nroManifiesto !== filtroManifiesto) return false;

      // Monto Mínimo y Máximo
      if (montoMin && t.montoBs < parseFloat(montoMin)) return false;
      if (montoMax && t.montoBs > parseFloat(montoMax)) return false;

      // Búsqueda por texto en Notas
      if (busquedaTexto.trim()) {
        const q = busquedaTexto.toLowerCase();
        const enNota = t.notas.toLowerCase().includes(q);
        const enCat = t.categoria.toLowerCase().includes(q);
        const enMetodo = t.metodoPago.toLowerCase().includes(q);
        if (!enNota && !enCat && !enMetodo) return false;
      }

      return true;
    });
  }, [
    transacciones,
    presetFecha,
    filtroMes,
    fechaDesde,
    fechaHasta,
    filtroTipo,
    filtroCategoria,
    filtroMetodo,
    filtroSucursal,
    filtroPlaca,
    filtroViaje,
    filtroManifiesto,
    montoMin,
    montoMax,
    busquedaTexto,
    currentMonthStr,
    todayStr
  ]);

  // Totales
  const totalIngresos = transaccionesFiltradas
    .filter(t => t.tipo === 'Ingreso' || (t.tipo === 'Traspaso' && filtroMetodo !== 'Todos' && t.cuentaDestino === filtroMetodo))
    .reduce((sum, t) => sum + t.montoBs, 0);

  const totalGastos = transaccionesFiltradas
    .filter(t => t.tipo === 'Gasto' || (t.tipo === 'Traspaso' && filtroMetodo !== 'Todos' && t.metodoPago === filtroMetodo))
    .reduce((sum, t) => sum + t.montoBs, 0);

  const totalTraspasos = transaccionesFiltradas.filter(t => t.tipo === 'Traspaso').reduce((sum, t) => sum + t.montoBs, 0);
  const balanceNeto = totalIngresos - totalGastos;
  const saldoFinal = saldoAnterior + balanceNeto;
  const margenPct = totalIngresos > 0 ? ((balanceNeto / totalIngresos) * 100).toFixed(1) : '0.0';

  // Distribución y cálculo de Utilidad (Ingresos - Gastos) por categoría
  const categoriaUtilidadData = useMemo(() => {
    const map: Record<string, { ingresos: number; gastos: number; color?: string }> = {};

    categorias.forEach(c => {
      map[c.nombre] = { ingresos: 0, gastos: 0, color: c.color };
    });

    transaccionesFiltradas.forEach(t => {
      if (!map[t.categoria]) {
        map[t.categoria] = { ingresos: 0, gastos: 0 };
      }
      if (t.tipo === 'Ingreso') {
        map[t.categoria].ingresos += t.montoBs;
      } else if (t.tipo === 'Gasto') {
        map[t.categoria].gastos += t.montoBs;
      }
    });

    const colors = [
      '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899',
      '#06b6d4', '#84cc16', '#f97316', '#64748b', '#ef4444'
    ];

    return Object.entries(map)
      .filter(([_, d]) => d.ingresos > 0 || d.gastos > 0)
      .map(([cat, d], idx) => {
        const utilidad = d.ingresos - d.gastos;
        const margen = d.ingresos > 0 ? (utilidad / d.ingresos) * 100 : d.gastos > 0 ? -100 : 0;
        return {
          categoria: cat,
          ingresos: d.ingresos,
          gastos: d.gastos,
          utilidad,
          margen,
          color: d.color || colors[idx % colors.length]
        };
      })
      .sort((a, b) => b.utilidad - a.utilidad);
  }, [transaccionesFiltradas, categorias]);

  // Datos para el gráfico circular (distribución por categoría y utilidad)
  const chartData = useMemo(() => {
    if (graficoModo === 'utilidad') {
      const positiveCats = categoriaUtilidadData.filter(c => c.utilidad > 0);
      const totalPosUtilidad = positiveCats.reduce((sum, c) => sum + c.utilidad, 0);

      if (positiveCats.length > 0 && totalPosUtilidad > 0) {
        return positiveCats.map(c => ({
          categoria: c.categoria,
          monto: c.utilidad,
          porcentaje: (c.utilidad / totalPosUtilidad) * 100,
          color: c.color
        }));
      }

      // Si no hay categorías con utilidad positiva pero hay movimiento global
      if (totalIngresos > 0 || totalGastos > 0) {
        const sum = totalIngresos + totalGastos;
        return [
          { categoria: 'Ingresos Totales', monto: totalIngresos, porcentaje: sum > 0 ? (totalIngresos / sum) * 100 : 50, color: '#10b981' },
          { categoria: 'Gastos Totales', monto: totalGastos, porcentaje: sum > 0 ? (totalGastos / sum) * 100 : 50, color: '#f43f5e' }
        ];
      }

      return [];
    }

    const targetType = graficoModo === 'gastos' ? 'Gasto' : 'Ingreso';
    const targetTx = transaccionesFiltradas.filter(t => t.tipo === targetType);
    const sumTotal = targetTx.reduce((sum, t) => sum + t.montoBs, 0);

    const map: Record<string, number> = {};
    targetTx.forEach(t => {
      map[t.categoria] = (map[t.categoria] || 0) + t.montoBs;
    });

    const colors = [
      '#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6',
      '#ef4444', '#06b6d4', '#f97316', '#64748b', '#84cc16'
    ];

    return Object.entries(map).map(([cat, amount], idx) => {
      const pct = sumTotal > 0 ? (amount / sumTotal) * 100 : 0;
      const catObj = categorias.find(c => c.nombre === cat);
      return {
        categoria: cat,
        monto: amount,
        porcentaje: pct,
        color: catObj?.color || colors[idx % colors.length]
      };
    }).sort((a, b) => b.monto - a.monto);
  }, [transaccionesFiltradas, graficoModo, categorias, categoriaUtilidadData, totalIngresos, totalGastos]);

  // Filtrado de Sub-manifiestos para reporte (con ID de Viaje explícito y exclusión de huérfanos)
  const subManifiestosFiltrados = useMemo(() => {
    const list = todosLosSubManifiestos || [];
    return list.filter(s => {
      // Excluir huérfanos si el viaje o manifiesto padre fue eliminado
      if (s.idViaje && !activeTripIds.has(s.idViaje)) return false;
      if (s.idManifiestoPadre && !activeManifestIds.has(s.idManifiestoPadre)) return false;

      if (filtroSucursal !== 'Todas' && s.sucursalDestino !== filtroSucursal) return false;
      if (filtroViaje !== 'Todos' && s.idViaje !== filtroViaje) return false;
      if (filtroManifiesto !== 'Todos' && s.nroManifiesto !== filtroManifiesto) return false;
      if (busquedaTexto.trim()) {
        const q = busquedaTexto.toLowerCase();
        const enDest = s.destinatario?.toLowerCase().includes(q) || false;
        const enManif = s.nroManifiesto.toLowerCase().includes(q);
        const enViaje = s.idViaje?.toLowerCase().includes(q) || false;
        const enCarga = s.descripcionCarga?.toLowerCase().includes(q) || false;
        if (!enDest && !enManif && !enViaje && !enCarga) return false;
      }
      return true;
    });
  }, [todosLosSubManifiestos, activeTripIds, activeManifestIds, filtroSucursal, filtroViaje, filtroManifiesto, busquedaTexto]);

  // Filtrado de Viajes para reporte (con ID de Viaje)
  const viajesFiltrados = useMemo(() => {
    return viajes.filter(v => {
      if (filtroViaje !== 'Todos' && v.idViaje !== filtroViaje) return false;
      if (filtroPlaca !== 'Todos' && v.placaCamion !== filtroPlaca) return false;
      if (busquedaTexto.trim()) {
        const q = busquedaTexto.toLowerCase();
        const enId = v.idViaje.toLowerCase().includes(q);
        const enChofer = v.choferAsignado.toLowerCase().includes(q);
        const enPlaca = v.placaCamion.toLowerCase().includes(q);
        if (!enId && !enChofer && !enPlaca) return false;
      }
      return true;
    });
  }, [viajes, filtroViaje, filtroPlaca, busquedaTexto]);

  // Totales consolidados de Sub-Manifiestos
  const totalesSubManifiestos = useMemo(() => {
    return subManifiestosFiltrados.reduce((acc, s) => ({
      fleteAsignado: acc.fleteAsignado + (Number(s.fleteAsignadoBs) || 0),
      pagadoOrigen: acc.pagadoOrigen + (Number(s.pagadoOrigenBs) || 0),
      porPagarDestino: acc.porPagarDestino + (Number(s.porPagarDestinoBs) || 0),
      cobrosRealizados: acc.cobrosRealizados + (Number(s.cobrosRealizadosBs) || 0),
      saldoPendiente: acc.saldoPendiente + (Number(s.saldoPendienteClienteBs) || 0),
      deliveryOtros: acc.deliveryOtros + (Number(s.ingresosDeliveryOtrosBs) || 0),
      gastosComisiones: acc.gastosComisiones + (Number(s.gastosComisionesBs) || 0),
      recaudacionNeta: acc.recaudacionNeta + (Number(s.recaudacionNetaCajaBs) || 0)
    }), {
      fleteAsignado: 0,
      pagadoOrigen: 0,
      porPagarDestino: 0,
      cobrosRealizados: 0,
      saldoPendiente: 0,
      deliveryOtros: 0,
      gastosComisiones: 0,
      recaudacionNeta: 0
    });
  }, [subManifiestosFiltrados]);

  // Totales consolidados de Viajes
  const totalesViajes = useMemo(() => {
    const fletes = viajesFiltrados.reduce((sum, v) => sum + (Number(v.fletesManifiestosBs) || 0), 0);
    const gastos = viajesFiltrados.reduce((sum, v) => sum + (Number(v.gastosRutaBs) || 0), 0);
    const utilidad = viajesFiltrados.reduce((sum, v) => sum + (Number(v.utilidadViajeBs) || 0), 0);
    const margenProm = fletes > 0 ? ((utilidad / fletes) * 100).toFixed(1) : '0.0';
    return {
      fletes,
      gastos,
      utilidad,
      margenProm
    };
  }, [viajesFiltrados]);

  // =========================================================================
  // REPORTE 1: BALANCE OPERATIVO FINANCIERO (Por Viaje o Centro de Costo)
  // =========================================================================

  // Medios de Pago: Desglose de ingresos/egresos por método (Efectivo, Banco, QR, etc.)
  const balanceMediosPago = useMemo(() => {
    const map: Record<string, { ingresos: number; egresos: number }> = {};

    catalogos.cajasCuentas.forEach(c => {
      map[c] = { ingresos: 0, egresos: 0 };
    });

    transaccionesFiltradas.forEach(t => {
      const metodo = t.metodoPago || 'Efectivo / Caja General';
      if (!map[metodo]) {
        map[metodo] = { ingresos: 0, egresos: 0 };
      }
      if (t.tipo === 'Ingreso') {
        map[metodo].ingresos += t.montoBs;
      } else if (t.tipo === 'Gasto') {
        map[metodo].egresos += t.montoBs;
      } else if (t.tipo === 'Traspaso') {
        map[metodo].egresos += t.montoBs;
        if (t.cuentaDestino) {
          if (!map[t.cuentaDestino]) map[t.cuentaDestino] = { ingresos: 0, egresos: 0 };
          map[t.cuentaDestino].ingresos += t.montoBs;
        }
      }
    });

    const lista = Object.entries(map)
      .map(([metodo, d]) => ({
        metodo,
        ingresos: d.ingresos,
        egresos: d.egresos,
        saldoNeto: d.ingresos - d.egresos
      }))
      .filter(d => d.ingresos > 0 || d.egresos > 0)
      .sort((a, b) => b.ingresos - a.ingresos);

    const totalIngresos = lista.reduce((sum, d) => sum + d.ingresos, 0);
    const totalEgresos = lista.reduce((sum, d) => sum + d.egresos, 0);
    const saldoNeto = totalIngresos - totalEgresos;

    return {
      lista,
      totalIngresos,
      totalEgresos,
      saldoNeto
    };
  }, [transaccionesFiltradas, catalogos.cajasCuentas]);

  // Cuentas por Cobrar (CxC): Desglose contable estricto en 3 categorías requeridas:
  // 1. CxC Agencias Origen (fletes pagados en origen pendientes de liquidación a central)
  // 2. CxC Agencias Destino (filtrado y agrupado estrictamente por Nombre de la Agencia de Destino)
  // 3. CxC Clientes Directos (filtrado y agrupado estrictamente por Nombre del Cliente/Destinatario)
  const balanceCxC = useMemo(() => {
    // 1. DESGLOSE 1: CxC Agencias Origen (Fletes cobrados en origen pendientes de liquidación a central)
    const cxcAgenciasOrigen = subManifiestosFiltrados.filter(
      s => (s.pagadoOrigenBs || 0) > 0 && s.estadoLiquidacionAgencia === 'Pendiente de Liquidación'
    );
    const totalCxCAgenciasOrigen = cxcAgenciasOrigen.reduce((sum, s) => sum + (s.pagadoOrigenBs || 0), 0);

    // Agrupación de CxC Agencias Origen por Nombre de Agencia / Sucursal Origen
    const agenciasOrigenMap = new Map<string, {
      agencia: string;
      items: typeof cxcAgenciasOrigen;
      totalBs: number;
    }>();
    cxcAgenciasOrigen.forEach(item => {
      const agNombre = item.origenViaje || (item.cuentaAfectadaOrigen ? item.cuentaAfectadaOrigen.replace('Caja Agencia ', '').replace('CxC Agencia ', '') : 'Agencia Origen');
      if (!agenciasOrigenMap.has(agNombre)) {
        agenciasOrigenMap.set(agNombre, { agencia: agNombre, items: [], totalBs: 0 });
      }
      const entry = agenciasOrigenMap.get(agNombre)!;
      entry.items.push(item);
      entry.totalBs += (item.pagadoOrigenBs || 0);
    });
    const gruposAgenciasOrigen = Array.from(agenciasOrigenMap.values()).sort((a, b) => b.totalBs - a.totalBs);

    // 2. DESGLOSE 2: CxC Agencias Destino (Modalidad A - Agencia Recauda en Destino y Rinde a Empresa + Cobranzas Retenidas)
    // Se incluye:
    // a) Modalidad A / Sucursal de Destino con saldo pendiente de cobro y liquidación (la agencia asume la rendición contable)
    // b) Cobranzas ya realizadas por la agencia pero retenidas pendientes de depositar a la empresa
    const cxcAgenciasDestino = subManifiestosFiltrados.filter(s => {
      const saldos = calcularSaldosSubManifiesto(s);
      const saldoPendienteAgencia = saldos.saldoPendienteAgencia > 0 || (s.saldoPendienteAgenciaBs || 0) > 0;
      const cobroRetenidoAgencia = (s.montoRetenidoAgenciaBs || 0) > 0 && s.estadoRendicionDestino === 'Retenido en Agencia (CxC Agencia)';

      const porPagarDestino = Number(s.porPagarDestinoBs !== undefined ? s.porPagarDestinoBs : (s.saldoInicialCobrarBs || 0));
      const cobrosRealizados = Number(s.cobrosRealizadosBs || 0);
      const saldoDestinoPendiente = Math.max(0, porPagarDestino - cobrosRealizados);

      const esModalidadAgencia = saldos.esResponsableAgencia || 
                                s.tipoResponsableDestino === 'AGENCIA' ||
                                s.tipoDeudor === 'AGENCIA' ||
                                (s.modalidadCobroDestino !== 'Cobro Directo Empresa / Cliente' && s.tipoDeudor !== 'CLIENTE');

      return (esModalidadAgencia && saldoDestinoPendiente > 0) || saldoPendienteAgencia || cobroRetenidoAgencia;
    });

    // Agrupación estricta de CxC Agencias Destino por Nombre de la Agencia de Destino
    const agenciasDestinoMap = new Map<string, {
      agencia: string;
      items: typeof cxcAgenciasDestino;
      totalSaldoPorCobrarBs: number;
      totalRetenidoBs: number;
      totalCxCAgenciaBs: number;
    }>();

    cxcAgenciasDestino.forEach(item => {
      const agDestino = item.agenciaDestinoResponsable || item.sucursalDestino || 'Agencia Destino';
      if (!agenciasDestinoMap.has(agDestino)) {
        agenciasDestinoMap.set(agDestino, {
          agencia: agDestino,
          items: [],
          totalSaldoPorCobrarBs: 0,
          totalRetenidoBs: 0,
          totalCxCAgenciaBs: 0
        });
      }
      const entry = agenciasDestinoMap.get(agDestino)!;
      entry.items.push(item);

      const saldos = calcularSaldosSubManifiesto(item);
      const porPagarDestino = Number(item.porPagarDestinoBs !== undefined ? item.porPagarDestinoBs : (item.saldoInicialCobrarBs || 0));
      const cobrosRealizados = Number(item.cobrosRealizadosBs || 0);
      const saldoDestinoPendiente = Math.max(0, porPagarDestino - cobrosRealizados);

      const saldoPorCobrar = saldos.saldoPendienteAgenciaDestino !== undefined 
        ? saldos.saldoPendienteAgenciaDestino 
        : saldoDestinoPendiente;

      const retenido = (item.montoRetenidoAgenciaBs || 0) > 0 && item.estadoRendicionDestino === 'Retenido en Agencia (CxC Agencia)'
        ? (item.montoRetenidoAgenciaBs || 0)
        : 0;

      entry.totalSaldoPorCobrarBs += saldoPorCobrar;
      entry.totalRetenidoBs += retenido;
      entry.totalCxCAgenciaBs += (saldoPorCobrar + retenido);
    });

    const gruposAgenciasDestino = Array.from(agenciasDestinoMap.values()).sort((a, b) => b.totalCxCAgenciaBs - a.totalCxCAgenciaBs);
    const totalCxCAgenciasDestino = gruposAgenciasDestino.reduce((sum, g) => sum + g.totalCxCAgenciaBs, 0);

    // 3. DESGLOSE 3: CxC Clientes Directos (Modalidad B - Cobro Directo Empresa / Cliente con saldo pendiente)
    const cxcClientesDirectos = subManifiestosFiltrados.filter(s => {
      const saldos = calcularSaldosSubManifiesto(s);
      const esModalidadCliente = s.modalidadCobroDestino === 'Cobro Directo Empresa / Cliente' || s.tipoDeudor === 'CLIENTE' || saldos.esResponsableCliente;
      const tieneSaldoCliente = saldos.saldoPendienteCliente > 0 || (s.saldoPendienteClienteBs || 0) > 0;
      return esModalidadCliente && !saldos.esResponsableAgencia && tieneSaldoCliente;
    });

    // Agrupación estricta de CxC Clientes Directos por Nombre del Cliente/Destinatario
    const clientesDirectosMap = new Map<string, {
      cliente: string;
      telefono: string;
      items: typeof cxcClientesDirectos;
      totalFleteBs: number;
      totalCobradoBs: number;
      totalPendienteBs: number;
    }>();

    cxcClientesDirectos.forEach(item => {
      const cliNombre = (item.destinatario || 'Cliente General').trim();
      if (!clientesDirectosMap.has(cliNombre)) {
        clientesDirectosMap.set(cliNombre, {
          cliente: cliNombre,
          telefono: item.telefonoDestinatario || item.telefonoContacto || '',
          items: [],
          totalFleteBs: 0,
          totalCobradoBs: 0,
          totalPendienteBs: 0
        });
      }
      const entry = clientesDirectosMap.get(cliNombre)!;
      entry.items.push(item);
      if (!entry.telefono && (item.telefonoDestinatario || item.telefonoContacto)) {
        entry.telefono = item.telefonoDestinatario || item.telefonoContacto || '';
      }
      const saldos = calcularSaldosSubManifiesto(item);
      const saldoPend = saldos.saldoPendienteCliente > 0 ? saldos.saldoPendienteCliente : (item.saldoPendienteClienteBs || 0);
      entry.totalFleteBs += (item.fleteAsignadoBs || 0);
      entry.totalCobradoBs += (item.cobrosRealizadosBs || 0);
      entry.totalPendienteBs += saldoPend;
    });

    // Incorporar CxC de Transacciones Registradas con Método "Por Cobrar"
    (transaccionesFiltradas || []).forEach(t => {
      if (t.tipo === 'Ingreso' && t.metodoPago === 'Por Cobrar' && t.estadoCobroPago !== 'Cobrado') {
        const monto = Number(t.montoBs) || 0;
        if (monto > 0) {
          const cliNombre = (t.deudorNombre || t.nombreCliente || t.idCliente || t.notas || 'Cliente / Deudor').trim();
          if (!clientesDirectosMap.has(cliNombre)) {
            clientesDirectosMap.set(cliNombre, {
              cliente: cliNombre,
              telefono: '',
              items: [],
              totalFleteBs: 0,
              totalCobradoBs: 0,
              totalPendienteBs: 0
            });
          }
          const entry = clientesDirectosMap.get(cliNombre)!;
          entry.totalFleteBs += monto;
          entry.totalPendienteBs += monto;
        }
      }
    });

    const gruposClientesDirectos = Array.from(clientesDirectosMap.values()).sort((a, b) => b.totalPendienteBs - a.totalPendienteBs);
    const totalCxCClientesDirectos = gruposClientesDirectos.reduce((sum, g) => sum + g.totalPendienteBs, 0);

    // Total consolidado CxC
    const totalCxCPendiente = totalCxCAgenciasOrigen + totalCxCAgenciasDestino + totalCxCClientesDirectos;

    // Métricas globales para resumen y compatibilidad
    const totalFletes = subManifiestosFiltrados.reduce((sum, s) => sum + (s.fleteAsignadoBs || 0), 0);
    const totalCobrado = subManifiestosFiltrados.reduce((sum, s) => sum + (s.cobrosRealizadosBs || 0), 0);
    const pendientes = [...cxcClientesDirectos, ...cxcAgenciasDestino, ...cxcAgenciasOrigen];

    return {
      cxcAgenciasOrigen,
      totalCxCAgenciasOrigen,
      gruposAgenciasOrigen,
      cxcAgenciasDestino,
      totalCxCAgenciasDestino,
      gruposAgenciasDestino,
      cxcClientesDirectos,
      totalCxCClientesDirectos,
      gruposClientesDirectos,
      totalCxCPendiente,
      totalFletes,
      totalCobrado,
      // Compatibilidad con llamadas heredadas
      pendientes,
      pendientesAgencias: cxcAgenciasOrigen,
      pendientesAgenciasDestino: cxcAgenciasDestino,
      totalCxCClientes: totalCxCClientesDirectos,
      totalCxCAgencias: totalCxCAgenciasOrigen
    };
  }, [subManifiestosFiltrados, transaccionesFiltradas]);

  // Cuentas por Pagar (CxP): Lista detallada de saldos pendientes a proveedores o terceros vinculados
  const balanceCxP = useMemo(() => {
    const allCxP = [...(catalogos.cuentasPorPagar || [])];
    const existingIds = new Set(allCxP.map(c => c.idCxP));
    (transaccionesFiltradas || []).forEach(t => {
      if (t.tipo === 'Gasto' && t.metodoPago === 'Por Pagar' && !existingIds.has(t.idTransaccion)) {
        allCxP.push({
          idCxP: t.idTransaccion,
          idProveedor: t.idProveedor || 'PRV-GEN',
          nombreProveedor: t.nombreProveedor || t.idProveedor || 'Proveedor General',
          concepto: `${t.categoria}${t.notas ? ` - ${t.notas}` : ''}`,
          montoTotalBs: Number(t.montoBs) || 0,
          montoPagadoBs: t.estadoCobroPago === 'Pagado' ? Number(t.montoBs) || 0 : 0,
          saldoPendienteBs: t.estadoCobroPago === 'Pagado' ? 0 : Number(t.montoBs) || 0,
          fechaEmision: t.fecha,
          estado: t.estadoCobroPago === 'Pagado' ? 'Pagado' : 'Pendiente',
          idViaje: t.idViaje,
          placaCamion: t.placaCamion
        });
      }
    });

    const filtradas = allCxP.filter(cxp => {
      if (filtroViaje !== 'Todos' && cxp.idViaje && cxp.idViaje !== filtroViaje) return false;
      const placa = cxp.placaCamion || cxp.centroCostoPlaca;
      if (filtroPlaca !== 'Todos' && placa && placa !== filtroPlaca) return false;
      if (cxp.estado === 'Pagado') return false;
      return true;
    });

    const totalCxPPendiente = filtradas.reduce((sum, c) => sum + (c.saldoPendienteBs ?? c.montoTotalBs ?? 0), 0);
    const totalCxPMontoTotal = filtradas.reduce((sum, c) => sum + (c.montoTotalBs || 0), 0);

    return {
      filtradas,
      totalCxPPendiente,
      totalCxPMontoTotal
    };
  }, [catalogos.cuentasPorPagar, transaccionesFiltradas, filtroViaje, filtroPlaca]);

  // Resumen de Posición Neta: (Cobrado + CxC) - (Pagado + CxP)
  const balancePosicionNeta = useMemo(() => {
    const cobrado = balanceMediosPago.totalIngresos;
    const cxc = balanceCxC.totalCxCPendiente;
    const pagado = balanceMediosPago.totalEgresos;
    const cxp = balanceCxP.totalCxPPendiente;

    const totalCobradoMasCxC = cobrado + cxc;
    const totalPagadoMasCxP = pagado + cxp;
    const posicionNeta = totalCobradoMasCxC - totalPagadoMasCxP;

    return {
      cobrado,
      cxc,
      pagado,
      cxp,
      totalCobradoMasCxC,
      totalPagadoMasCxP,
      posicionNeta
    };
  }, [balanceMediosPago, balanceCxC, balanceCxP]);

  // =========================================================================
  // REPORTE 2: ESTADO DE RESULTADOS OPERATIVO (EERR / Utilidad Neta)
  // =========================================================================

  // Ingresos Operativos: Total facturado/fletes, desglosado por concepto y categoría de ingreso
  const eerrIngresos = useMemo(() => {
    const map: Record<string, { concepto: string; operaciones: number; monto: number }> = {};

    transaccionesFiltradas.filter(t => t.tipo === 'Ingreso').forEach(t => {
      const cat = t.categoria || 'Fletes de Transporte de Carga';
      if (!map[cat]) map[cat] = { concepto: cat, operaciones: 0, monto: 0 };
      map[cat].operaciones += 1;
      map[cat].monto += t.montoBs;
    });

    // Si no hubiera transacciones de ingreso pero sí sub-manifiestos en el viaje/placa:
    if (Object.keys(map).length === 0 && subManifiestosFiltrados.length > 0) {
      const totalFletes = subManifiestosFiltrados.reduce((s, m) => s + (m.fleteAsignadoBs || 0), 0);
      map['Fletes de Carga General'] = {
        concepto: 'Fletes de Carga General (Sub-Manifiestos)',
        operaciones: subManifiestosFiltrados.length,
        monto: totalFletes
      };
    }

    const lista = Object.values(map);
    const totalIngresos = lista.reduce((s, i) => s + i.monto, 0);

    return {
      lista: lista.map(item => ({
        ...item,
        porcentaje: totalIngresos > 0 ? (item.monto / totalIngresos) * 100 : 0
      })).sort((a, b) => b.monto - a.monto),
      totalIngresos
    };
  }, [transaccionesFiltradas, subManifiestosFiltrados]);

  // Costos y Gastos: Total de egresos operativos (combustible, peajes, viáticos, mantenimiento, comisiones),
  // desglosado por categoría y concepto de gasto, indicando el proveedor asociado.
  const eerrGastos = useMemo(() => {
    const provMap = new Map((catalogos.proveedores || []).map(p => [p.idProveedor, p]));

    const gastosDetalle = transaccionesFiltradas
      .filter(t => t.tipo === 'Gasto')
      .map(t => {
        let provNombre = t.nombreProveedor;
        if (!provNombre && t.idProveedor) {
          provNombre = provMap.get(t.idProveedor)?.nombre;
        }
        if (!provNombre) {
          if (t.categoria.includes('Combustible') || t.categoria.includes('Diésel')) provNombre = 'YPFB / Surtidor Ruta';
          else if (t.categoria.includes('Peajes')) provNombre = 'Vías Bolivia (Retenes)';
          else if (t.categoria.includes('Comisión') || t.categoria.includes('Fletero')) provNombre = 'Fletero Local / Tercero';
          else provNombre = 'Proveedor Operativo General';
        }

        return {
          idTransaccion: t.idTransaccion,
          fecha: t.fecha,
          categoria: t.categoria,
          concepto: t.notas || t.categoria,
          idProveedor: t.idProveedor || 'PRV-REF',
          nombreProveedor: provNombre,
          idViaje: t.idViaje || '-',
          placaCamion: t.placaCamion || '-',
          montoBs: t.montoBs
        };
      });

    const mapCategorias: Record<string, { categoria: string; operaciones: number; monto: number; proveedores: Set<string> }> = {};

    gastosDetalle.forEach(g => {
      if (!mapCategorias[g.categoria]) {
        mapCategorias[g.categoria] = { categoria: g.categoria, operaciones: 0, monto: 0, proveedores: new Set() };
      }
      mapCategorias[g.categoria].operaciones += 1;
      mapCategorias[g.categoria].monto += g.montoBs;
      if (g.nombreProveedor) mapCategorias[g.categoria].proveedores.add(g.nombreProveedor);
    });

    const totalGastos = gastosDetalle.reduce((s, g) => s + g.montoBs, 0);

    const desgloseCategorias = Object.values(mapCategorias).map(c => ({
      categoria: c.categoria,
      operaciones: c.operaciones,
      monto: c.monto,
      proveedores: Array.from(c.proveedores).join(', '),
      porcentaje: totalGastos > 0 ? (c.monto / totalGastos) * 100 : 0
    })).sort((a, b) => b.monto - a.monto);

    return {
      gastosDetalle,
      desgloseCategorias,
      totalGastos
    };
  }, [transaccionesFiltradas, catalogos.proveedores]);

  // Resultado Operativo: Utilidad o Margen Neto (Ingresos Totales - Gastos Totales)
  const eerrResultado = useMemo(() => {
    const totalIngresos = eerrIngresos.totalIngresos;
    const totalGastos = eerrGastos.totalGastos;
    const utilidadNeta = totalIngresos - totalGastos;
    const margenNetoPct = totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : totalGastos > 0 ? -100 : 0;

    return {
      totalIngresos,
      totalGastos,
      utilidadNeta,
      margenNetoPct: Number(margenNetoPct.toFixed(1))
    };
  }, [eerrIngresos, eerrGastos]);

  // Función universal para descargar planillas Excel enriquecidas (.xls HTML con estilo)
  const downloadExcelSheet = (htmlContent: string, fileName: string) => {
    const fullHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Planilla TranspoDrive</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10pt; color: #0f172a; margin: 15px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
    .company-title { font-size: 15pt; font-weight: bold; color: #0f172a; text-transform: uppercase; }
    .company-sub { font-size: 9.5pt; color: #475569; }
    .banner { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 12pt; padding: 10px; text-align: center; border: 1px solid #0f172a; }
    .section-title { background-color: #1e293b; color: #ffffff; font-weight: bold; font-size: 10.5pt; padding: 7px 10px; margin-top: 14px; margin-bottom: 6px; border-left: 4px solid #f59e0b; }
    .meta-table { width: 100%; font-size: 9.5pt; border: 1px solid #cbd5e1; margin-bottom: 10px; }
    .meta-table td { padding: 5px 8px; border: 1px solid #cbd5e1; }
    .meta-label { background-color: #f1f5f9; font-weight: bold; color: #334155; width: 18%; }
    .kpi-table { width: 100%; font-size: 10pt; border: 1px solid #cbd5e1; margin-bottom: 12px; }
    .kpi-table th { background-color: #1e293b; color: #ffffff; padding: 6px; font-weight: bold; text-align: center; border: 1px solid #334155; }
    .kpi-table td { padding: 8px; font-weight: bold; font-size: 12pt; text-align: center; border: 1px solid #cbd5e1; }
    .data-table { width: 100%; border: 1px solid #64748b; font-size: 9.5pt; }
    .data-table th { background-color: #0f172a; color: #ffffff; font-weight: bold; padding: 7px 8px; border: 1px solid #334155; text-align: left; }
    .data-table th.num { text-align: right; }
    .data-table th.center { text-align: center; }
    .data-table td { padding: 6px 8px; border: 1px solid #cbd5e1; vertical-align: middle; }
    .data-table td.num { text-align: right; font-weight: bold; mso-number-format: "\#\,\#\#0\.00"; }
    .data-table td.center { text-align: center; }
    .data-table td.text-col { mso-number-format: "\@"; }
    .bg-row-even { background-color: #ffffff; }
    .bg-row-odd { background-color: #f8fafc; }
    .row-totals { background-color: #fef3c7; font-weight: bold; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
    .row-totals td { font-weight: bold; border: 1px solid #b45309; }
    .row-saldo { background-color: #e2e8f0; font-weight: bold; }
    .text-emerald { color: #047857; font-weight: bold; }
    .text-rose { color: #be123c; font-weight: bold; }
    .text-amber { color: #b45309; font-weight: bold; }
    .text-sky { color: #0284c7; font-weight: bold; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.xls') ? fileName : `${fileName}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Exportar Sub-Manifiestos a Planilla Excel Oficial
  const handleExportSubManifiestosExcel = () => {
    const periodoTxt = presetFecha === 'mensual' ? `Mes: ${filtroMes}` : 
      presetFecha === 'personalizado' ? `${fechaDesde || 'Inicio'} hasta ${fechaHasta || 'Fin'}` :
      presetFecha === 'este_mes' ? `Mes Actual (${currentMonthStr})` :
      presetFecha === 'hoy' ? `Solo Hoy (${todayStr})` : 'Todo el Historial';

    const html = `
      <table>
        <tr>
          <td colspan="6" class="company-title">TranspoDrive S.R.L.</td>
          <td colspan="6" style="text-align: right; font-size: 9pt; color: #64748b;">
            Emisión: ${new Date().toLocaleDateString('es-BO')} ${new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
          </td>
        </tr>
        <tr>
          <td colspan="12" class="company-sub">Transporte Pesado Nacional & Logística de Encomiendas • Bolivia</td>
        </tr>
      </table>

      <div class="banner">PLANILLA OFICIAL - SUB-MANIFIESTOS Y ENCOMIENDAS POR VIAJE</div>
      <br/>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Periodo / Rango:</td>
          <td><strong>${periodoTxt}</strong></td>
          <td class="meta-label">Sucursal Destino:</td>
          <td><strong>${filtroSucursal}</strong></td>
        </tr>
        <tr>
          <td class="meta-label">Filtro de Viaje:</td>
          <td><strong>${filtroViaje}</strong></td>
          <td class="meta-label">Total Sub-Manifiestos:</td>
          <td><strong>${subManifiestosFiltrados.length} Registros</strong></td>
        </tr>
      </table>

      <table class="kpi-table">
        <tr>
          <th>Flete Total Asignado</th>
          <th>Pagado en Origen</th>
          <th>Por Cobrar en Destino</th>
          <th>Cobrado en Destino</th>
          <th>Saldo Pendiente Clientes</th>
        </tr>
        <tr>
          <td style="color: #0f172a;">Bs ${totalesSubManifiestos.fleteAsignado.toFixed(2)}</td>
          <td style="color: #047857;">Bs ${totalesSubManifiestos.pagadoOrigen.toFixed(2)}</td>
          <td style="color: #b45309;">Bs ${totalesSubManifiestos.porPagarDestino.toFixed(2)}</td>
          <td style="color: #0284c7;">Bs ${totalesSubManifiestos.cobrosRealizados.toFixed(2)}</td>
          <td style="color: #be123c;">Bs ${totalesSubManifiestos.saldoPendiente.toFixed(2)}</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th>ID Viaje</th>
            <th>Nro Sub-Manifiesto</th>
            <th>Sucursal Destino</th>
            <th>Destinatario (Cliente)</th>
            <th>Remitente</th>
            <th>Descripción Carga</th>
            <th class="num">Flete Asignado (Bs)</th>
            <th class="num">Pagado Origen (Bs)</th>
            <th class="num">Por Pagar Destino (Bs)</th>
            <th class="num">Cobrado Destino (Bs)</th>
            <th class="num">Saldo Pendiente (Bs)</th>
            <th class="center">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${subManifiestosFiltrados.map((s, idx) => `
            <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
              <td><strong>${s.idViaje || '-'}</strong></td>
              <td>${s.nroManifiesto}</td>
              <td>${s.sucursalDestino}</td>
              <td><strong>${s.destinatario || '-'}</strong></td>
              <td>${s.remitente || '-'}</td>
              <td>${s.descripcionCarga || '-'}</td>
              <td class="num">Bs ${s.fleteAsignadoBs.toFixed(2)}</td>
              <td class="num text-emerald">Bs ${s.pagadoOrigenBs.toFixed(2)}</td>
              <td class="num text-amber">Bs ${(s.porPagarDestinoBs || 0).toFixed(2)}</td>
              <td class="num text-sky">Bs ${s.cobrosRealizadosBs.toFixed(2)}</td>
              <td class="num ${s.saldoPendienteClienteBs === 0 ? 'text-emerald' : 'text-rose'}">Bs ${s.saldoPendienteClienteBs.toFixed(2)}</td>
              <td class="center">${s.estadoLiquidacion}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="row-totals">
            <td colspan="6" style="text-align: right; text-transform: uppercase;">
              TOTALES GENERALES (${subManifiestosFiltrados.length} SUB-MANIFIESTOS):
            </td>
            <td class="num">Bs ${totalesSubManifiestos.fleteAsignado.toFixed(2)}</td>
            <td class="num text-emerald">Bs ${totalesSubManifiestos.pagadoOrigen.toFixed(2)}</td>
            <td class="num text-amber">Bs ${totalesSubManifiestos.porPagarDestino.toFixed(2)}</td>
            <td class="num text-sky">Bs ${totalesSubManifiestos.cobrosRealizados.toFixed(2)}</td>
            <td class="num text-rose">Bs ${totalesSubManifiestos.saldoPendiente.toFixed(2)}</td>
            <td class="center">-</td>
          </tr>
        </tfoot>
      </table>

      <br/><br/>
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Responsable de Despacho & Cobranzas</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Sello</span>
          </td>
          <td style="width: 10%;"></td>
          <td style="width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Contabilidad & Gerencia Administrativa</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Aclaración</span>
          </td>
        </tr>
      </table>
    `;

    downloadExcelSheet(html, `Planilla_SubManifiestos_Viajes_${new Date().toISOString().split('T')[0]}`);
  };

  // Exportar Viajes a Planilla Excel Oficial
  const handleExportViajesExcel = () => {
    const periodoTxt = presetFecha === 'mensual' ? `Mes: ${filtroMes}` : 
      presetFecha === 'personalizado' ? `${fechaDesde || 'Inicio'} hasta ${fechaHasta || 'Fin'}` :
      presetFecha === 'este_mes' ? `Mes Actual (${currentMonthStr})` :
      presetFecha === 'hoy' ? `Solo Hoy (${todayStr})` : 'Todo el Historial';

    const html = `
      <table>
        <tr>
          <td colspan="5" class="company-title">TranspoDrive S.R.L.</td>
          <td colspan="6" style="text-align: right; font-size: 9pt; color: #64748b;">
            Emisión: ${new Date().toLocaleDateString('es-BO')} ${new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
          </td>
        </tr>
        <tr>
          <td colspan="11" class="company-sub">Transporte Pesado Nacional & Logística de Encomiendas • Bolivia</td>
        </tr>
      </table>

      <div class="banner">PLANILLA OFICIAL - RESUMEN FINANCIERO Y UTILIDAD POR VIAJE</div>
      <br/>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Periodo / Rango:</td>
          <td><strong>${periodoTxt}</strong></td>
          <td class="meta-label">Camión / Placa:</td>
          <td><strong>${filtroPlaca}</strong></td>
        </tr>
        <tr>
          <td class="meta-label">Filtro de Viaje:</td>
          <td><strong>${filtroViaje}</strong></td>
          <td class="meta-label">Total Viajes:</td>
          <td><strong>${viajesFiltrados.length} Registros</strong></td>
        </tr>
      </table>

      <table class="kpi-table">
        <tr>
          <th>Fletes Totales Generados</th>
          <th>Gastos Totales en Ruta</th>
          <th>Utilidad Neta Consolidada</th>
          <th>Margen Financiero Promedio</th>
        </tr>
        <tr>
          <td style="color: #0f172a;">Bs ${totalesViajes.fletes.toFixed(2)}</td>
          <td style="color: #be123c;">-Bs ${totalesViajes.gastos.toFixed(2)}</td>
          <td style="color: ${totalesViajes.utilidad >= 0 ? '#047857' : '#be123c'};">Bs ${totalesViajes.utilidad.toFixed(2)}</td>
          <td style="color: #b45309;">${totalesViajes.margenProm}%</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th>ID de Viaje</th>
            <th>Camión / Placa</th>
            <th>Chofer Asignado</th>
            <th>Fecha Salida</th>
            <th>Fecha Llegada</th>
            <th>Estado</th>
            <th class="num">Fletes Manifiestos (Bs)</th>
            <th class="num">Gastos Ruta (Bs)</th>
            <th class="num">Utilidad Neta (Bs)</th>
            <th class="num">Margen (%)</th>
            <th>Observaciones de Ruta</th>
          </tr>
        </thead>
        <tbody>
          ${viajesFiltrados.map((v, idx) => `
            <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
              <td><strong>${v.idViaje}</strong></td>
              <td><strong>${v.placaCamion}</strong></td>
              <td>${v.choferAsignado}</td>
              <td>${v.fechaSalida}</td>
              <td>${v.fechaLlegada}</td>
              <td>${v.estadoViaje}</td>
              <td class="num">Bs ${v.fletesManifiestosBs.toFixed(2)}</td>
              <td class="num text-rose">-Bs ${v.gastosRutaBs.toFixed(2)}</td>
              <td class="num ${v.utilidadViajeBs >= 0 ? 'text-emerald' : 'text-rose'}">Bs ${v.utilidadViajeBs.toFixed(2)}</td>
              <td class="num text-amber">${v.margenPct}%</td>
              <td>${v.observacionesRuta || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="row-totals">
            <td colspan="6" style="text-align: right; text-transform: uppercase;">
              TOTALES CONSOLIDADOS (${viajesFiltrados.length} VIAJES):
            </td>
            <td class="num">Bs ${totalesViajes.fletes.toFixed(2)}</td>
            <td class="num text-rose">-Bs ${totalesViajes.gastos.toFixed(2)}</td>
            <td class="num ${totalesViajes.utilidad >= 0 ? 'text-emerald' : 'text-rose'}">Bs ${totalesViajes.utilidad.toFixed(2)}</td>
            <td class="num text-amber">${totalesViajes.margenProm}%</td>
            <td>-</td>
          </tr>
        </tfoot>
      </table>

      <br/><br/>
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Jefe de Operaciones & Logística de Flota</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Sello</span>
          </td>
          <td style="width: 10%;"></td>
          <td style="width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Gerencia General & Finanzas</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Aclaración</span>
          </td>
        </tr>
      </table>
    `;

    downloadExcelSheet(html, `Planilla_Resumen_Viajes_${new Date().toISOString().split('T')[0]}`);
  };

  // Exportar Transacciones y Gastos a Planilla Excel Oficial
  const handleExportTransaccionesExcel = () => {
    const periodoTxt = presetFecha === 'mensual' ? `Mes: ${filtroMes}` : 
      presetFecha === 'personalizado' ? `${fechaDesde || 'Inicio'} hasta ${fechaHasta || 'Fin'}` :
      presetFecha === 'este_mes' ? `Mes Actual (${currentMonthStr})` :
      presetFecha === 'hoy' ? `Solo Hoy (${todayStr})` : 'Todo el Historial';

    const html = `
      <table>
        <tr>
          <td colspan="6" class="company-title">TranspoDrive S.R.L.</td>
          <td colspan="6" style="text-align: right; font-size: 9pt; color: #64748b;">
            Emisión: ${new Date().toLocaleDateString('es-BO')} ${new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
          </td>
        </tr>
        <tr>
          <td colspan="12" class="company-sub">Transporte Pesado Nacional & Logística de Encomiendas • Bolivia</td>
        </tr>
      </table>

      <div class="banner">PLANILLA OFICIAL - DETALLE DE TRANSACCIONES Y GASTOS</div>
      <br/>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Periodo / Rango:</td>
          <td><strong>${periodoTxt}</strong></td>
          <td class="meta-label">Método / Caja:</td>
          <td><strong>${filtroMetodo}</strong></td>
        </tr>
        <tr>
          <td class="meta-label">Tipo Transacción:</td>
          <td><strong>${filtroTipo}</strong></td>
          <td class="meta-label">Total Registros:</td>
          <td><strong>${transaccionesFiltradas.length} Movimientos</strong></td>
        </tr>
      </table>

      <table class="kpi-table">
        <tr>
          <th>Saldo Anterior Acumulado</th>
          <th>Total Ingresos</th>
          <th>Total Gastos</th>
          <th>Saldo Neto del Periodo</th>
          <th>Saldo Total Final</th>
        </tr>
        <tr>
          <td style="color: ${saldoAnterior >= 0 ? '#0284c7' : '#be123c'};">Bs ${saldoAnterior.toFixed(2)}</td>
          <td style="color: #047857;">Bs ${totalIngresos.toFixed(2)}</td>
          <td style="color: #be123c;">Bs ${totalGastos.toFixed(2)}</td>
          <td style="color: ${balanceNeto >= 0 ? '#047857' : '#be123c'};">${balanceNeto >= 0 ? '+' : ''}Bs ${balanceNeto.toFixed(2)}</td>
          <td style="color: ${saldoFinal >= 0 ? '#0f172a' : '#be123c'};">Bs ${saldoFinal.toFixed(2)}</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>ID Viaje</th>
            <th>Tipo</th>
            <th>Categoría</th>
            <th>Método / Cuenta</th>
            <th>Sucursal / Camión</th>
            <th>Detalle / Notas</th>
            <th class="num" style="background-color: #047857;">Ingresos (Bs)</th>
            <th class="num" style="background-color: #be123c;">Gastos (Bs)</th>
          </tr>
        </thead>
        <tbody>
          ${transaccionesFiltradas.map((t, idx) => {
            const isInc = t.tipo === 'Ingreso';
            const isGas = t.tipo === 'Gasto';
            const isTrf = t.tipo === 'Traspaso';
            const ingresoVal = isInc 
              ? t.montoBs 
              : (isTrf && filtroMetodo !== 'Todos' && t.cuentaDestino === filtroMetodo) 
              ? t.montoBs 
              : null;
            const gastoVal = isGas 
              ? t.montoBs 
              : (isTrf && filtroMetodo !== 'Todos' && t.metodoPago === filtroMetodo) 
              ? t.montoBs 
              : null;

            return `
              <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
                <td>${t.fecha}</td>
                <td><strong>${t.idViaje || '-'}</strong></td>
                <td>${t.tipo}</td>
                <td><strong>${t.categoria}</strong></td>
                <td>${t.metodoPago}${t.cuentaDestino ? ` ➔ ${t.cuentaDestino}` : ''}</td>
                <td>${t.sucursal || '-'}${t.placaCamion ? ` (${t.placaCamion})` : ''}</td>
                <td>${t.notas || '-'}</td>
                <td class="num text-emerald">${ingresoVal !== null ? `Bs ${ingresoVal.toFixed(2)}` : '-'}</td>
                <td class="num text-rose">${gastoVal !== null ? `Bs ${gastoVal.toFixed(2)}` : '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr class="row-saldo">
            <td colspan="7" style="text-align: right;">
              Saldo Anterior Acumulado ${fechaInicioEfectiva ? `(previo al ${fechaInicioEfectiva})` : '(historial inicial)'}:
            </td>
            <td colspan="2" class="num ${saldoAnterior >= 0 ? 'text-sky' : 'text-rose'}">
              Bs ${saldoAnterior.toFixed(2)}
            </td>
          </tr>
          <tr class="row-totals">
            <td colspan="7" style="text-align: right; text-transform: uppercase;">
              Suma de Totales del Periodo:
            </td>
            <td class="num text-emerald">Bs ${totalIngresos.toFixed(2)}</td>
            <td class="num text-rose">Bs ${totalGastos.toFixed(2)}</td>
          </tr>
          <tr class="row-saldo">
            <td colspan="7" style="text-align: right;">
              Saldo del Periodo (Total Ingresos - Total Gastos):
            </td>
            <td colspan="2" class="num ${balanceNeto >= 0 ? 'text-emerald' : 'text-rose'}">
              ${balanceNeto >= 0 ? '+' : ''}Bs ${balanceNeto.toFixed(2)}
            </td>
          </tr>
          <tr style="background-color: #cbd5e1; font-weight: bold; border-top: 2px solid #0f172a;">
            <td colspan="7" style="text-align: right; text-transform: uppercase;">
              Saldo Total Final Acumulado (Saldo Anterior + Periodo):
            </td>
            <td colspan="2" class="num" style="font-size: 11pt; color: #0f172a;">
              Bs ${saldoFinal.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      <br/><br/>
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Responsable de Caja / Operaciones</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Sello</span>
          </td>
          <td style="width: 10%;"></td>
          <td style="width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Contabilidad & Gerencia General</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Aclaración</span>
          </td>
        </tr>
      </table>
    `;

    downloadExcelSheet(html, `Planilla_Transacciones_Gastos_${new Date().toISOString().split('T')[0]}`);
  };

  // Exportar Reporte Consolidado Completo (Todo en una sola Planilla Excel Integral)
  const handleExportTodoExcel = () => {
    const periodoTxt = presetFecha === 'mensual' ? `Mes: ${filtroMes}` : 
      presetFecha === 'personalizado' ? `${fechaDesde || 'Inicio'} hasta ${fechaHasta || 'Fin'}` :
      presetFecha === 'este_mes' ? `Mes Actual (${currentMonthStr})` :
      presetFecha === 'hoy' ? `Solo Hoy (${todayStr})` : 'Todo el Historial';

    const html = `
      <table>
        <tr>
          <td colspan="6" class="company-title">TranspoDrive S.R.L.</td>
          <td colspan="6" style="text-align: right; font-size: 9pt; color: #64748b;">
            Emisión: ${new Date().toLocaleDateString('es-BO')} ${new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
          </td>
        </tr>
        <tr>
          <td colspan="12" class="company-sub">Transporte Pesado Nacional & Logística de Encomiendas • Bolivia</td>
        </tr>
      </table>

      <div class="banner">PLANILLA OFICIAL CONSOLIDADA - REPORTE GENERAL INTEGRAL</div>
      <br/>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Periodo / Rango:</td>
          <td><strong>${periodoTxt}</strong></td>
          <td class="meta-label">Sucursal Destino:</td>
          <td><strong>${filtroSucursal}</strong></td>
        </tr>
        <tr>
          <td class="meta-label">Filtro de Viaje:</td>
          <td><strong>${filtroViaje}</strong></td>
          <td class="meta-label">Camión / Placa:</td>
          <td><strong>${filtroPlaca}</strong></td>
        </tr>
      </table>

      <!-- 1. TRANSACCIONES Y GASTOS -->
      <div class="section-title">1. DETALLE DE TRANSACCIONES Y GASTOS (FLUJO DE FONDOS)</div>
      <table class="kpi-table">
        <tr>
          <th>Saldo Anterior</th>
          <th>Total Ingresos</th>
          <th>Total Gastos</th>
          <th>Saldo del Periodo</th>
          <th>Saldo Total Final</th>
        </tr>
        <tr>
          <td style="color: ${saldoAnterior >= 0 ? '#0284c7' : '#be123c'};">Bs ${saldoAnterior.toFixed(2)}</td>
          <td style="color: #047857;">Bs ${totalIngresos.toFixed(2)}</td>
          <td style="color: #be123c;">Bs ${totalGastos.toFixed(2)}</td>
          <td style="color: ${balanceNeto >= 0 ? '#047857' : '#be123c'};">${balanceNeto >= 0 ? '+' : ''}Bs ${balanceNeto.toFixed(2)}</td>
          <td style="color: ${saldoFinal >= 0 ? '#0f172a' : '#be123c'};">Bs ${saldoFinal.toFixed(2)}</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>ID Viaje</th>
            <th>Tipo</th>
            <th>Categoría</th>
            <th>Método / Cuenta</th>
            <th>Sucursal / Camión</th>
            <th>Detalle / Notas</th>
            <th class="num" style="background-color: #047857;">Ingresos (Bs)</th>
            <th class="num" style="background-color: #be123c;">Gastos (Bs)</th>
          </tr>
        </thead>
        <tbody>
          ${transaccionesFiltradas.map((t, idx) => {
            const isInc = t.tipo === 'Ingreso';
            const isGas = t.tipo === 'Gasto';
            const isTrf = t.tipo === 'Traspaso';
            const ingresoVal = isInc 
              ? t.montoBs 
              : (isTrf && filtroMetodo !== 'Todos' && t.cuentaDestino === filtroMetodo) 
              ? t.montoBs 
              : null;
            const gastoVal = isGas 
              ? t.montoBs 
              : (isTrf && filtroMetodo !== 'Todos' && t.metodoPago === filtroMetodo) 
              ? t.montoBs 
              : null;

            return `
              <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
                <td>${t.fecha}</td>
                <td><strong>${t.idViaje || '-'}</strong></td>
                <td>${t.tipo}</td>
                <td><strong>${t.categoria}</strong></td>
                <td>${t.metodoPago}${t.cuentaDestino ? ` ➔ ${t.cuentaDestino}` : ''}</td>
                <td>${t.sucursal || '-'}${t.placaCamion ? ` (${t.placaCamion})` : ''}</td>
                <td>${t.notas || '-'}</td>
                <td class="num text-emerald">${ingresoVal !== null ? `Bs ${ingresoVal.toFixed(2)}` : '-'}</td>
                <td class="num text-rose">${gastoVal !== null ? `Bs ${gastoVal.toFixed(2)}` : '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr class="row-saldo">
            <td colspan="7" style="text-align: right;">
              Saldo Anterior Acumulado ${fechaInicioEfectiva ? `(previo al ${fechaInicioEfectiva})` : '(historial inicial)'}:
            </td>
            <td colspan="2" class="num ${saldoAnterior >= 0 ? 'text-sky' : 'text-rose'}">
              Bs ${saldoAnterior.toFixed(2)}
            </td>
          </tr>
          <tr class="row-totals">
            <td colspan="7" style="text-align: right; text-transform: uppercase;">
              Suma de Totales del Periodo:
            </td>
            <td class="num text-emerald">Bs ${totalIngresos.toFixed(2)}</td>
            <td class="num text-rose">Bs ${totalGastos.toFixed(2)}</td>
          </tr>
          <tr class="row-saldo">
            <td colspan="7" style="text-align: right;">
              Saldo del Periodo (Total Ingresos - Total Gastos):
            </td>
            <td colspan="2" class="num ${balanceNeto >= 0 ? 'text-emerald' : 'text-rose'}">
              ${balanceNeto >= 0 ? '+' : ''}Bs ${balanceNeto.toFixed(2)}
            </td>
          </tr>
          <tr style="background-color: #cbd5e1; font-weight: bold; border-top: 2px solid #0f172a;">
            <td colspan="7" style="text-align: right; text-transform: uppercase;">
              Saldo Total Final Acumulado (Saldo Anterior + Periodo):
            </td>
            <td colspan="2" class="num" style="font-size: 11pt; color: #0f172a;">
              Bs ${saldoFinal.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
      <br/>

      <!-- 2. SUB-MANIFIESTOS Y ENCOMIENDAS CON ID DE VIAJE -->
      <div class="section-title">2. SUB-MANIFIESTOS Y ENCOMIENDAS CON ID DE VIAJE</div>
      <table class="kpi-table">
        <tr>
          <th>Flete Total Asignado</th>
          <th>Pagado en Origen</th>
          <th>Por Cobrar en Destino</th>
          <th>Cobrado en Destino</th>
          <th>Saldo Pendiente Clientes</th>
        </tr>
        <tr>
          <td style="color: #0f172a;">Bs ${totalesSubManifiestos.fleteAsignado.toFixed(2)}</td>
          <td style="color: #047857;">Bs ${totalesSubManifiestos.pagadoOrigen.toFixed(2)}</td>
          <td style="color: #b45309;">Bs ${totalesSubManifiestos.porPagarDestino.toFixed(2)}</td>
          <td style="color: #0284c7;">Bs ${totalesSubManifiestos.cobrosRealizados.toFixed(2)}</td>
          <td style="color: #be123c;">Bs ${totalesSubManifiestos.saldoPendiente.toFixed(2)}</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th>ID Viaje</th>
            <th>Nro Sub-Manifiesto</th>
            <th>Sucursal Destino</th>
            <th>Destinatario (Cliente)</th>
            <th>Remitente</th>
            <th>Descripción Carga</th>
            <th class="num">Flete Asignado (Bs)</th>
            <th class="num">Pagado Origen (Bs)</th>
            <th class="num">Por Pagar Destino (Bs)</th>
            <th class="num">Cobrado Destino (Bs)</th>
            <th class="num">Saldo Pendiente (Bs)</th>
            <th class="center">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${subManifiestosFiltrados.map((s, idx) => `
            <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
              <td><strong>${s.idViaje || '-'}</strong></td>
              <td>${s.nroManifiesto}</td>
              <td>${s.sucursalDestino}</td>
              <td><strong>${s.destinatario || '-'}</strong></td>
              <td>${s.remitente || '-'}</td>
              <td>${s.descripcionCarga || '-'}</td>
              <td class="num">Bs ${s.fleteAsignadoBs.toFixed(2)}</td>
              <td class="num text-emerald">Bs ${s.pagadoOrigenBs.toFixed(2)}</td>
              <td class="num text-amber">Bs ${(s.porPagarDestinoBs || 0).toFixed(2)}</td>
              <td class="num text-sky">Bs ${s.cobrosRealizadosBs.toFixed(2)}</td>
              <td class="num ${s.saldoPendienteClienteBs === 0 ? 'text-emerald' : 'text-rose'}">Bs ${s.saldoPendienteClienteBs.toFixed(2)}</td>
              <td class="center">${s.estadoLiquidacion}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="row-totals">
            <td colspan="6" style="text-align: right; text-transform: uppercase;">
              TOTALES SUB-MANIFIESTOS (${subManifiestosFiltrados.length} REGISTROS):
            </td>
            <td class="num">Bs ${totalesSubManifiestos.fleteAsignado.toFixed(2)}</td>
            <td class="num text-emerald">Bs ${totalesSubManifiestos.pagadoOrigen.toFixed(2)}</td>
            <td class="num text-amber">Bs ${totalesSubManifiestos.porPagarDestino.toFixed(2)}</td>
            <td class="num text-sky">Bs ${totalesSubManifiestos.cobrosRealizados.toFixed(2)}</td>
            <td class="num text-rose">Bs ${totalesSubManifiestos.saldoPendiente.toFixed(2)}</td>
            <td class="center">-</td>
          </tr>
        </tfoot>
      </table>
      <br/>

      <!-- 3. RESUMEN FINANCIERO Y RENDIMIENTO POR VIAJE -->
      <div class="section-title">3. RESUMEN FINANCIERO Y RENDIMIENTO POR VIAJE</div>
      <table class="kpi-table">
        <tr>
          <th>Fletes Totales Generados</th>
          <th>Gastos Totales en Ruta</th>
          <th>Utilidad Neta Consolidada</th>
          <th>Margen Financiero Promedio</th>
        </tr>
        <tr>
          <td style="color: #0f172a;">Bs ${totalesViajes.fletes.toFixed(2)}</td>
          <td style="color: #be123c;">-Bs ${totalesViajes.gastos.toFixed(2)}</td>
          <td style="color: ${totalesViajes.utilidad >= 0 ? '#047857' : '#be123c'};">Bs ${totalesViajes.utilidad.toFixed(2)}</td>
          <td style="color: #b45309;">${totalesViajes.margenProm}%</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th>ID de Viaje</th>
            <th>Camión / Placa</th>
            <th>Chofer Asignado</th>
            <th>Fecha Salida</th>
            <th>Fecha Llegada</th>
            <th>Estado</th>
            <th class="num">Fletes Manifiestos (Bs)</th>
            <th class="num">Gastos Ruta (Bs)</th>
            <th class="num">Utilidad Neta (Bs)</th>
            <th class="num">Margen (%)</th>
            <th>Observaciones de Ruta</th>
          </tr>
        </thead>
        <tbody>
          ${viajesFiltrados.map((v, idx) => `
            <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
              <td><strong>${v.idViaje}</strong></td>
              <td><strong>${v.placaCamion}</strong></td>
              <td>${v.choferAsignado}</td>
              <td>${v.fechaSalida}</td>
              <td>${v.fechaLlegada}</td>
              <td>${v.estadoViaje}</td>
              <td class="num">Bs ${v.fletesManifiestosBs.toFixed(2)}</td>
              <td class="num text-rose">-Bs ${v.gastosRutaBs.toFixed(2)}</td>
              <td class="num ${v.utilidadViajeBs >= 0 ? 'text-emerald' : 'text-rose'}">Bs ${v.utilidadViajeBs.toFixed(2)}</td>
              <td class="num text-amber">${v.margenPct}%</td>
              <td>${v.observacionesRuta || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="row-totals">
            <td colspan="6" style="text-align: right; text-transform: uppercase;">
              TOTALES CONSOLIDADOS (${viajesFiltrados.length} VIAJES):
            </td>
            <td class="num">Bs ${totalesViajes.fletes.toFixed(2)}</td>
            <td class="num text-rose">-Bs ${totalesViajes.gastos.toFixed(2)}</td>
            <td class="num ${totalesViajes.utilidad >= 0 ? 'text-emerald' : 'text-rose'}">Bs ${totalesViajes.utilidad.toFixed(2)}</td>
            <td class="num text-amber">${totalesViajes.margenProm}%</td>
            <td>-</td>
          </tr>
        </tfoot>
      </table>

      <br/><br/>
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Responsable de Caja & Finanzas</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Sello</span>
          </td>
          <td style="width: 5%;"></td>
          <td style="width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Despacho & Control de Encomiendas</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Sello</span>
          </td>
          <td style="width: 5%;"></td>
          <td style="width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Gerencia General & Auditoría</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Aclaración</span>
          </td>
        </tr>
      </table>
    `;

    downloadExcelSheet(html, `Planilla_Consolidada_TranspoDrive_${new Date().toISOString().split('T')[0]}`);
  };

  // Exportar Balance Operativo Financiero a Excel
  const handleExportBalanceOperativoExcel = () => {
    const periodoTxt = presetFecha === 'mensual' ? `Mes: ${filtroMes}` : 
      presetFecha === 'personalizado' ? `${fechaDesde || 'Inicio'} hasta ${fechaHasta || 'Fin'}` :
      presetFecha === 'este_mes' ? `Mes Actual (${currentMonthStr})` :
      presetFecha === 'hoy' ? `Solo Hoy (${todayStr})` : 'Todo el Historial';

    const html = `
      <table>
        <tr>
          <td colspan="5" class="company-title">TranspoDrive S.R.L.</td>
          <td colspan="4" style="text-align: right; font-size: 9pt; color: #64748b;">
            Emisión: ${new Date().toLocaleDateString('es-BO')} ${new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
          </td>
        </tr>
        <tr>
          <td colspan="9" class="company-sub">Transporte Pesado Nacional & Logística de Encomiendas • Bolivia</td>
        </tr>
      </table>

      <div class="banner">REPORTE OFICIAL: BALANCE OPERATIVO FINANCIERO (POR VIAJE / CENTRO DE COSTO)</div>
      <br/>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Periodo / Rango:</td>
          <td><strong>${periodoTxt}</strong></td>
          <td class="meta-label">Filtro de Viaje:</td>
          <td><strong>${filtroViaje}</strong></td>
        </tr>
        <tr>
          <td class="meta-label">Centro de Costo (Camión):</td>
          <td><strong>${filtroPlaca}</strong></td>
          <td class="meta-label">Sucursal / Agencia:</td>
          <td><strong>${filtroSucursal}</strong></td>
        </tr>
      </table>

      <!-- RESUMEN DE POSICIÓN NETA -->
      <div class="section-title">RESUMEN EJECUTIVO DE POSICIÓN FINANCIERA NETA: (COBRADO + CxC) - (PAGADO + CxP)</div>
      <table class="kpi-table">
        <tr>
          <th>Total Cobrado (Ingresos)</th>
          <th>(+) Cuentas por Cobrar (CxC)</th>
          <th>Total Derechos / Activo</th>
          <th>Total Pagado (Egresos)</th>
          <th>(+) Cuentas por Pagar (CxP)</th>
          <th>Total Obligaciones / Pasivo</th>
          <th>POSICIÓN NETA OPERATIVA</th>
        </tr>
        <tr>
          <td style="color: #047857;">Bs ${balancePosicionNeta.cobrado.toFixed(2)}</td>
          <td style="color: #0284c7;">+Bs ${balancePosicionNeta.cxc.toFixed(2)}</td>
          <td style="color: #047857; background-color: #f0fdf4;">Bs ${balancePosicionNeta.totalCobradoMasCxC.toFixed(2)}</td>
          <td style="color: #be123c;">-Bs ${balancePosicionNeta.pagado.toFixed(2)}</td>
          <td style="color: #be123c;">-Bs ${balancePosicionNeta.cxp.toFixed(2)}</td>
          <td style="color: #be123c; background-color: #fff1f2;">Bs ${balancePosicionNeta.totalPagadoMasCxP.toFixed(2)}</td>
          <td style="color: ${balancePosicionNeta.posicionNeta >= 0 ? '#047857' : '#be123c'}; font-size: 13pt; background-color: #fef3c7;">
            ${balancePosicionNeta.posicionNeta >= 0 ? '+' : ''}Bs ${balancePosicionNeta.posicionNeta.toFixed(2)}
          </td>
        </tr>
      </table>

      <!-- 1. MEDIOS DE PAGO -->
      <div class="section-title">1. DESGLOSE DE INGRESOS Y EGRESOS POR MEDIO DE PAGO / CUENTA</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Medio de Pago / Cuenta de Caja</th>
            <th class="num">Ingresos Recaudados (Bs)</th>
            <th class="num">Egresos / Gastos Desembolsados (Bs)</th>
            <th class="num">Saldo Neto en Cuenta (Bs)</th>
          </tr>
        </thead>
        <tbody>
          ${balanceMediosPago.lista.map((m, idx) => `
            <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
              <td><strong>${m.metodo}</strong></td>
              <td class="num text-emerald">Bs ${m.ingresos.toFixed(2)}</td>
              <td class="num text-rose">Bs ${m.egresos.toFixed(2)}</td>
              <td class="num ${m.saldoNeto >= 0 ? 'text-emerald' : 'text-rose'}">Bs ${m.saldoNeto.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="row-totals">
            <td>TOTALES FLUJO DE CAJAS:</td>
            <td class="num text-emerald">Bs ${balanceMediosPago.totalIngresos.toFixed(2)}</td>
            <td class="num text-rose">Bs ${balanceMediosPago.totalEgresos.toFixed(2)}</td>
            <td class="num ${balanceMediosPago.saldoNeto >= 0 ? 'text-emerald' : 'text-rose'}">Bs ${balanceMediosPago.saldoNeto.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <br/>

      <!-- 2. CUENTAS POR COBRAR (CxC) -->
      <div class="section-title">2. CUENTAS POR COBRAR (CxC) - SALDOS PENDIENTES DE CLIENTES</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Cliente / Destinatario</th>
            <th>ID Viaje</th>
            <th>Sub-Manifiesto / Guía</th>
            <th>Descripción de Carga</th>
            <th class="num">Flete Asignado (Bs)</th>
            <th class="num">Cobrado (Bs)</th>
            <th class="num" style="background-color: #be123c;">Saldo Pendiente CxC (Bs)</th>
            <th>Teléfono Contacto</th>
          </tr>
        </thead>
        <tbody>
          ${balanceCxC.pendientes.length === 0 ? `
            <tr><td colspan="8" style="text-align: center; color: #64748b; padding: 10px;">No existen saldos pendientes por cobrar en este viaje / período.</td></tr>
          ` : balanceCxC.pendientes.map((c, idx) => `
            <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
              <td><strong>${c.destinatario || '-'}</strong></td>
              <td>${c.idViaje || '-'}</td>
              <td>${c.nroManifiesto}</td>
              <td>${c.descripcionCarga || '-'}</td>
              <td class="num">Bs ${c.fleteAsignadoBs.toFixed(2)}</td>
              <td class="num text-emerald">Bs ${c.cobrosRealizadosBs.toFixed(2)}</td>
              <td class="num text-rose">Bs ${c.saldoPendienteClienteBs.toFixed(2)}</td>
              <td>${c.telefonoDestinatario || c.telefonoContacto || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="row-totals">
            <td colspan="4">TOTAL CUENTAS POR COBRAR (${balanceCxC.pendientes.length} CLIENTES):</td>
            <td class="num">Bs ${balanceCxC.totalFletes.toFixed(2)}</td>
            <td class="num text-emerald">Bs ${balanceCxC.totalCobrado.toFixed(2)}</td>
            <td class="num text-rose">Bs ${balanceCxC.totalCxCPendiente.toFixed(2)}</td>
            <td>-</td>
          </tr>
        </tfoot>
      </table>
      <br/>

      <!-- 3. CUENTAS POR PAGAR (CxP) -->
      <div class="section-title">3. CUENTAS POR PAGAR (CxP) - SALDOS PENDIENTES A PROVEEDORES O TERCEROS</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Proveedor / Razón Social</th>
            <th>Concepto / Compra o Servicio</th>
            <th>ID Viaje / Camión</th>
            <th class="num">Monto Total Facturado (Bs)</th>
            <th class="num" style="background-color: #be123c;">Saldo Pendiente CxP (Bs)</th>
            <th>Fecha Vencimiento</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${balanceCxP.filtradas.length === 0 ? `
            <tr><td colspan="7" style="text-align: center; color: #64748b; padding: 10px;">No existen saldos pendientes por pagar a proveedores en este viaje / período.</td></tr>
          ` : balanceCxP.filtradas.map((p, idx) => `
            <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
              <td><strong>${p.nombreProveedor || p.proveedorNombre || '-'}</strong></td>
              <td>${p.concepto}</td>
              <td>${p.idViaje || p.placaCamion || p.centroCostoPlaca || '-'}</td>
              <td class="num">Bs ${p.montoTotalBs.toFixed(2)}</td>
              <td class="num text-rose">Bs ${(p.saldoPendienteBs ?? p.montoTotalBs).toFixed(2)}</td>
              <td>${p.fechaVencimiento || '-'}</td>
              <td>${p.estado}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="row-totals">
            <td colspan="3">TOTAL CUENTAS POR PAGAR (${balanceCxP.filtradas.length} PROVEEDORES):</td>
            <td class="num">Bs ${balanceCxP.totalCxPMontoTotal.toFixed(2)}</td>
            <td class="num text-rose">Bs ${balanceCxP.totalCxPPendiente.toFixed(2)}</td>
            <td colspan="2">-</td>
          </tr>
        </tfoot>
      </table>

      <br/><br/>
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Control de Tesorería & Pagos</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Sello</span>
          </td>
          <td style="width: 5%;"></td>
          <td style="width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Jefatura de Finanzas & Cobranzas</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Sello</span>
          </td>
          <td style="width: 5%;"></td>
          <td style="width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Gerencia General</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Aclaración</span>
          </td>
        </tr>
      </table>
    `;

    downloadExcelSheet(html, `Balance_Operativo_Financiero_${filtroViaje !== 'Todos' ? filtroViaje : 'General'}_${new Date().toISOString().split('T')[0]}`);
  };

  // Exportar Estado de Resultados Operativo (EERR) a Excel
  const handleExportEstadoResultadosExcel = () => {
    const periodoTxt = presetFecha === 'mensual' ? `Mes: ${filtroMes}` : 
      presetFecha === 'personalizado' ? `${fechaDesde || 'Inicio'} hasta ${fechaHasta || 'Fin'}` :
      presetFecha === 'este_mes' ? `Mes Actual (${currentMonthStr})` :
      presetFecha === 'hoy' ? `Solo Hoy (${todayStr})` : 'Todo el Historial';

    const html = `
      <table>
        <tr>
          <td colspan="5" class="company-title">TranspoDrive S.R.L.</td>
          <td colspan="4" style="text-align: right; font-size: 9pt; color: #64748b;">
            Emisión: ${new Date().toLocaleDateString('es-BO')} ${new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
          </td>
        </tr>
        <tr>
          <td colspan="9" class="company-sub">Transporte Pesado Nacional & Logística de Encomiendas • Bolivia</td>
        </tr>
      </table>

      <div class="banner">ESTADO DE RESULTADOS OPERATIVO (EERR / UTILIDAD NETA)</div>
      <br/>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Periodo / Rango:</td>
          <td><strong>${periodoTxt}</strong></td>
          <td class="meta-label">Viaje Evaluado:</td>
          <td><strong>${filtroViaje}</strong></td>
        </tr>
        <tr>
          <td class="meta-label">Centro de Costo (Camión):</td>
          <td><strong>${filtroPlaca}</strong></td>
          <td class="meta-label">Sucursal:</td>
          <td><strong>${filtroSucursal}</strong></td>
        </tr>
      </table>

      <!-- RESUMEN EJECUTIVO EERR -->
      <div class="section-title">RESUMEN DEL RESULTADO OPERATIVO (UTILIDAD NETA)</div>
      <table class="kpi-table">
        <tr>
          <th>Ingresos Operativos Totales</th>
          <th>Costos y Gastos Totales</th>
          <th>UTILIDAD NETA OPERATIVA</th>
          <th>MARGEN NETO OPERATIVO</th>
        </tr>
        <tr>
          <td style="color: #047857;">Bs ${eerrResultado.totalIngresos.toFixed(2)}</td>
          <td style="color: #be123c;">-Bs ${eerrResultado.totalGastos.toFixed(2)}</td>
          <td style="color: ${eerrResultado.utilidadNeta >= 0 ? '#047857' : '#be123c'}; font-size: 13pt; background-color: #fef3c7;">
            ${eerrResultado.utilidadNeta >= 0 ? '+' : ''}Bs ${eerrResultado.utilidadNeta.toFixed(2)}
          </td>
          <td style="color: #b45309;">${eerrResultado.margenNetoPct}%</td>
        </tr>
      </table>

      <!-- 1. INGRESOS OPERATIVOS -->
      <div class="section-title">1. INGRESOS OPERATIVOS DESGLOSADOS POR CATEGORÍA Y CONCEPTO</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Concepto / Categoría de Ingreso</th>
            <th class="center">Nro Operaciones</th>
            <th class="num">Total Facturado / Flete (Bs)</th>
            <th class="num">% Participación</th>
          </tr>
        </thead>
        <tbody>
          ${eerrIngresos.lista.map((i, idx) => `
            <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
              <td><strong>${i.concepto}</strong></td>
              <td class="center">${i.operaciones}</td>
              <td class="num text-emerald">Bs ${i.monto.toFixed(2)}</td>
              <td class="num">${i.porcentaje.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="row-totals">
            <td>TOTAL INGRESOS OPERATIVOS:</td>
            <td class="center">${eerrIngresos.lista.reduce((s, i) => s + i.operaciones, 0)}</td>
            <td class="num text-emerald">Bs ${eerrIngresos.totalIngresos.toFixed(2)}</td>
            <td class="num">100.0%</td>
          </tr>
        </tfoot>
      </table>
      <br/>

      <!-- 2. COSTOS Y GASTOS CON PROVEEDOR ASOCIADO -->
      <div class="section-title">2. COSTOS Y GASTOS OPERATIVOS (DETALLE INDICANDO PROVEEDOR ASOCIADO)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Categoría de Gasto</th>
            <th>Concepto / Detalle Operativo</th>
            <th>Proveedor Asociado (Tabla Maestra)</th>
            <th>Viaje / Camión</th>
            <th class="num">Importe Egresado (Bs)</th>
          </tr>
        </thead>
        <tbody>
          ${eerrGastos.gastosDetalle.map((g, idx) => `
            <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
              <td>${g.fecha}</td>
              <td><strong>${g.categoria}</strong></td>
              <td>${g.concepto}</td>
              <td style="color: #b45309; font-weight: bold;">${g.nombreProveedor}</td>
              <td>${g.idViaje} (${g.placaCamion})</td>
              <td class="num text-rose">Bs ${g.montoBs.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="row-totals">
            <td colspan="5">TOTAL COSTOS Y GASTOS OPERATIVOS (${eerrGastos.gastosDetalle.length} REGISTROS):</td>
            <td class="num text-rose">Bs ${eerrGastos.totalGastos.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- 3. RESUMEN FINAL POR CATEGORÍA DE GASTO -->
      <br/>
      <div class="section-title">3. RESUMEN DE EGRESOS POR CATEGORÍA Y PROVEEDORES VINCULADOS</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Categoría de Costo</th>
            <th>Proveedores Habituales Asociados</th>
            <th class="center">Nro Operaciones</th>
            <th class="num">Total Egresado (Bs)</th>
            <th class="num">% del Gasto Total</th>
          </tr>
        </thead>
        <tbody>
          ${eerrGastos.desgloseCategorias.map((c, idx) => `
            <tr class="${idx % 2 === 0 ? 'bg-row-even' : 'bg-row-odd'}">
              <td><strong>${c.categoria}</strong></td>
              <td>${c.proveedores || '-'}</td>
              <td class="center">${c.operaciones}</td>
              <td class="num text-rose">Bs ${c.monto.toFixed(2)}</td>
              <td class="num text-amber">${c.porcentaje.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="row-totals">
            <td colspan="3">TOTAL RESUMIDO DE COSTOS Y GASTOS:</td>
            <td class="num text-rose">Bs ${eerrGastos.totalGastos.toFixed(2)}</td>
            <td class="num text-amber">100.0%</td>
          </tr>
        </tfoot>
      </table>

      <br/><br/>
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Contador General</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Sello Profesional</span>
          </td>
          <td style="width: 5%;"></td>
          <td style="width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Jefatura de Operaciones y Flota</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Sello</span>
          </td>
          <td style="width: 5%;"></td>
          <td style="width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <strong>Gerencia General & Directorio</strong><br/>
            <span style="font-size: 8pt; color: #64748b;">Firma y Aclaración</span>
          </td>
        </tr>
      </table>
    `;

    downloadExcelSheet(html, `Estado_Resultados_Operativo_${filtroViaje !== 'Todos' ? filtroViaje : 'General'}_${new Date().toISOString().split('T')[0]}`);
  };

  // Despachador principal para Exportar Excel según la sección activa o solicitada
  const handleExportExcel = (seccion?: 'transacciones' | 'submanifiestos' | 'viajes' | 'balance_operativo' | 'estado_resultados' | 'cxc' | 'cxp' | 'todo') => {
    const target = seccion || seccionReporte;
    if (target === 'submanifiestos') {
      handleExportSubManifiestosExcel();
      return;
    }
    if (target === 'viajes') {
      handleExportViajesExcel();
      return;
    }
    if (target === 'balance_operativo') {
      handleExportBalanceOperativoExcel();
      return;
    }
    if (target === 'estado_resultados') {
      handleExportEstadoResultadosExcel();
      return;
    }
    if (target === 'cxc') {
      const fecha = new Date().toISOString().split('T')[0];
      exportCxCToExcel(cxcOperativasFiltradas, `Cuentas_Por_Cobrar_${fecha}.xlsx`);
      return;
    }
    if (target === 'cxp') {
      const fecha = new Date().toISOString().split('T')[0];
      exportCxPToExcel(cxpOperativasFiltradas, `Cuentas_Por_Pagar_${fecha}.xlsx`);
      return;
    }
    if (target === 'todo') {
      handleExportTodoExcel();
      return;
    }
    handleExportTransaccionesExcel();
  };

  const handlePrintPDF = (seccion?: 'transacciones' | 'submanifiestos' | 'viajes' | 'balance_operativo' | 'estado_resultados' | 'cxc' | 'cxp' | 'todo') => {
    setPrintSeccion((seccion || seccionReporte) as any);
    setShowPrintView(true);
  };

  const handleResetFilters = () => {
    setPresetFecha('este_mes');
    setFiltroMes(currentMonthStr);
    setFechaDesde('');
    setFechaHasta('');
    setFiltroTipo('Todos');
    setFiltroCategoria('Todas');
    setFiltroMetodo('Todos');
    setFiltroSucursal('Todas');
    setFiltroPlaca('Todos');
    setFiltroViaje('Todos');
    setFiltroManifiesto('Todos');
    setMontoMin('');
    setMontoMax('');
    setBusquedaTexto('');
  };

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Top Banner de Reportes */}
      <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-blue-50 text-[#1d4ed8] rounded-xl border border-blue-100">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-slate-800">
                Apartado de Reportes & Analítica Financiera
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Filtre por fecha, categoría, método de pago, sucursal, camión, viaje o manifiesto. Exporte planillas oficiales a Excel y genere reportes oficiales impresos o PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExportExcel(seccionReporte)}
              title={`Descargar Planilla Excel de ${
                seccionReporte === 'transacciones' ? 'Transacciones' :
                seccionReporte === 'submanifiestos' ? 'Sub-Manifiestos' :
                seccionReporte === 'viajes' ? 'Resumen Viajes' :
                seccionReporte === 'balance_operativo' ? 'Balance Operativo Financiero' : 'Estado de Resultados'
              }`}
              className="bg-[#16a34a] hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                Exportar Excel (
                {seccionReporte === 'transacciones' ? 'Transacciones' :
                 seccionReporte === 'submanifiestos' ? 'Sub-Manifiestos' :
                 seccionReporte === 'viajes' ? 'Viajes' :
                 seccionReporte === 'balance_operativo' ? 'Balance Operativo' :
                 seccionReporte === 'estado_resultados' ? 'Estado de Resultados' :
                 seccionReporte === 'cxc' ? 'Cuentas por Cobrar (CxC)' : 'Cuentas por Pagar (CxP)'}
                )
              </span>
            </button>

            <button
              onClick={() => handlePrintPDF(seccionReporte as any)}
              title="Vista previa e impresión de la planilla seleccionada"
              className="bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-[#e2e8f0] transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Printer className="w-4 h-4 text-[#1d4ed8]" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Switcher de Sección de Reporte */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[#e2e8f0] mt-4">
          <button
            onClick={() => setSeccionReporte('transacciones')}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 min-h-[44px] ${
              seccionReporte === 'transacciones'
                ? 'bg-[#1d4ed8] text-white shadow-sm'
                : 'bg-[#f8fafc] border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Transacciones y Gastos ({transaccionesFiltradas.length})</span>
          </button>

          <button
            onClick={() => setSeccionReporte('submanifiestos')}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 min-h-[44px] ${
              seccionReporte === 'submanifiestos'
                ? 'bg-[#1d4ed8] text-white shadow-sm'
                : 'bg-[#f8fafc] border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Sub-Manifiestos por ID de Viaje ({subManifiestosFiltrados.length})</span>
          </button>

          <button
            onClick={() => setSeccionReporte('viajes')}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 min-h-[44px] ${
              seccionReporte === 'viajes'
                ? 'bg-[#1d4ed8] text-white shadow-sm'
                : 'bg-[#f8fafc] border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Resumen Financiero por Viaje ({viajesFiltrados.length})</span>
          </button>

          <button
            onClick={() => setSeccionReporte('balance_operativo')}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 min-h-[44px] ${
              seccionReporte === 'balance_operativo'
                ? 'bg-[#1d4ed8] text-white shadow-sm'
                : 'bg-[#f8fafc] border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Balance Operativo Financiero</span>
          </button>

          <button
            onClick={() => setSeccionReporte('estado_resultados')}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 min-h-[44px] ${
              seccionReporte === 'estado_resultados'
                ? 'bg-[#1d4ed8] text-white shadow-sm'
                : 'bg-[#f8fafc] border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Estado de Resultados (EERR)</span>
          </button>

          {/* NUEVA SECCIÓN ESPECIALIZADA: Cuentas por Cobrar (CxC) */}
          <button
            onClick={() => setSeccionReporte('cxc')}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 min-h-[44px] ${
              seccionReporte === 'cxc'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100'
            }`}
            title="Panel Especializado de Cuentas por Cobrar Operativas (Clientes y Agencias)"
          >
            <Banknote className="w-4 h-4 text-blue-600" />
            <span>Cuentas por Cobrar (CxC)</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              seccionReporte === 'cxc' ? 'bg-white text-blue-700' : 'bg-blue-200 text-blue-900'
            }`}>
              {cxcOperativasFiltradas.length}
            </span>
          </button>

          {/* NUEVA SECCIÓN ESPECIALIZADA: Cuentas por Pagar (CxP) */}
          <button
            onClick={() => setSeccionReporte('cxp')}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 min-h-[44px] ${
              seccionReporte === 'cxp'
                ? 'bg-rose-700 text-white shadow-md'
                : 'bg-rose-50 border border-rose-200 text-rose-900 hover:bg-rose-100'
            }`}
            title="Panel Especializado de Cuentas por Pagar a Proveedores"
          >
            <CreditCard className="w-4 h-4 text-rose-600" />
            <span>Cuentas por Pagar (CxP)</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              seccionReporte === 'cxp' ? 'bg-white text-rose-700' : 'bg-rose-200 text-rose-900'
            }`}>
              {cxpOperativasFiltradas.length}
            </span>
          </button>
        </div>
      </div>

      {/* PANEL DE FILTROS AVANZADOS MULTIDIMENSIONALES */}
      <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#1d4ed8]" />
            <h3 className="font-bold text-slate-800 text-sm">Filtros Multidimensionales</h3>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-[#1d4ed8] flex items-center gap-1 font-bold min-h-[44px] px-2"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Limpiar Filtros</span>
          </button>
        </div>

        {/* Fila 1: Fechas y Períodos */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Rango de Fecha / Periodo</label>
            <select
              value={presetFecha}
              onChange={(e) => setPresetFecha(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 font-semibold min-h-[44px]"
            >
              <option value="este_mes">Mes Actual ({currentMonthStr})</option>
              <option value="mensual">Filtrado Mensual (Seleccionar Mes)</option>
              <option value="personalizado">Rango entre 2 Fechas (Desde / Hasta)</option>
              <option value="hoy">Solo Hoy</option>
              <option value="esta_semana">Últimos 7 días</option>
              <option value="todos">Todo el Historial</option>
            </select>
          </div>

          {presetFecha === 'mensual' && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Seleccionar Mes</label>
              <input
                type="month"
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 font-bold min-h-[44px]"
              />
            </div>
          )}

          {presetFecha === 'personalizado' && (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Desde Fecha (Inicio)</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Hasta Fecha (Fin)</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Tipo de Transacción</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
            >
              <option value="Todos">Todos (Ingresos, Gastos, Traspasos)</option>
              <option value="Ingreso">Solo Ingresos</option>
              <option value="Gasto">Solo Gastos</option>
              <option value="Traspaso">Solo Traspasos</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
            >
              <option value="Todas">Todas las Categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Método de Pago / Caja</label>
            <select
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
            >
              <option value="Todos">Todos los Métodos / Cajas</option>
              {catalogos.cajasCuentas.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 2: Filtros por Operación de Transporte (Sucursal, Camión, Viaje, MIC) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Por Sucursal / Destino</label>
            <select
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
            >
              <option value="Todas">Todas las Sucursales</option>
              {catalogos.sucursales.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Por Camión / Placa (Centro Costo)</label>
            <select
              value={filtroPlaca}
              onChange={(e) => setFiltroPlaca(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
            >
              <option value="Todos">Todos los Camiones</option>
              {catalogos.camiones.map(c => (
                <option key={c.placa} value={c.placa}>{c.placa} - {c.modelo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Por Viaje Asignado</label>
            <select
              value={filtroViaje}
              onChange={(e) => setFiltroViaje(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
            >
              <option value="Todos">Todos los Viajes</option>
              {viajes.map(v => (
                <option key={v.idViaje} value={v.idViaje}>{v.idViaje} ({v.placaCamion})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Por Manifiesto MIC / Despacho</label>
            <select
              value={filtroManifiesto}
              onChange={(e) => setFiltroManifiesto(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
            >
              <option value="Todos">Todos los Manifiestos</option>
              {manifiestos.map(m => (
                <option key={m.idManifiesto} value={m.nroManifiestoMIC}>{m.nroManifiestoMIC} ({m.sucursalOrigen})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 3: Rango de montos y búsqueda por palabra clave */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Monto Mínimo (Bs)</label>
            <input
              type="number"
              value={montoMin}
              onChange={(e) => setMontoMin(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Monto Máximo (Bs)</label>
            <input
              type="number"
              value={montoMax}
              onChange={(e) => setMontoMax(e.target.value)}
              placeholder="Sin límite"
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 min-h-[44px]"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Buscar en Notas / Detalle</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                placeholder="Palabra clave..."
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl pl-9 pr-3 py-2.5 text-slate-800 min-h-[44px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ALERTA VIAJE INEXISTENTE O ELIMINADO */}
      {viajeSeleccionadoInexistente && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-[18px] text-amber-900 text-xs flex items-center gap-3 shadow-sm animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-extrabold text-sm text-amber-950">Viaje No Encontrado o Eliminado de la Base de Datos</p>
            <p className="text-amber-800 text-xs">
              El viaje consultado <strong>"{filtroViaje}"</strong> no existe o fue eliminado. Los reportes financieros y cálculos de Estado de Resultados excluyen automáticamente registros huérfanos para garantizar la estricta integridad contable.
            </p>
          </div>
        </div>
      )}

      {/* KPI CARDS DEL REPORTE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Total Ingresos Filtrados</span>
          <span className="text-lg sm:text-2xl font-black text-[#16a34a] block mt-1">
            Bs {totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {transaccionesFiltradas.filter(t => t.tipo === 'Ingreso').length} ingreso(s)
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Total Gastos Filtrados</span>
          <span className="text-lg sm:text-2xl font-black text-[#dc2626] block mt-1">
            Bs {totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {transaccionesFiltradas.filter(t => t.tipo === 'Gasto').length} gasto(s)
          </span>
        </div>

        <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-[18px] p-4 shadow-sm">
          <span className="text-xs font-bold text-[#1d4ed8] block">Utilidad / Flujo Neto</span>
          <span className={`text-lg sm:text-2xl font-black block mt-1 ${balanceNeto >= 0 ? 'text-[#1d4ed8]' : 'text-[#dc2626]'}`}>
            Bs {balanceNeto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-blue-700 font-semibold mt-1 block">
            Margen: {margenPct}%
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Registros Encontrados</span>
          <span className="text-lg sm:text-2xl font-black text-[#1d4ed8] block mt-1">
            {transaccionesFiltradas.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Traspasos: Bs {totalTraspasos.toLocaleString('es-BO')}
          </span>
        </div>
      </div>

      {/* GRÁFICO CIRCULAR PERSPIZAS (SVG DONUT CHART INTERACTIVO) */}
      <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e2e8f0] gap-2">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#1d4ed8]" />
              Distribución de {graficoModo === 'gastos' ? 'Gastos' : graficoModo === 'ingresos' ? 'Ingresos' : 'Utilidad y Margen'} por Categoría
            </h3>
            <p className="text-xs text-slate-500">
              {graficoModo === 'utilidad'
                ? 'Balance de rentabilidad neta (Ingresos - Gastos), utilidades y margen financiero por categoría'
                : 'Visualización de la proporción financiera de cada concepto'}
            </p>
          </div>

          <div className="flex items-center bg-[#f8fafc] p-1 rounded-xl border border-[#e2e8f0] text-xs gap-1">
            <button
              onClick={() => setGraficoModo('utilidad')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 min-h-[36px] ${
                graficoModo === 'utilidad' ? 'bg-[#1d4ed8] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Utilidad por Categoría</span>
            </button>
            <button
              onClick={() => setGraficoModo('gastos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 min-h-[36px] ${
                graficoModo === 'gastos' ? 'bg-[#dc2626] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Gastos por Categoría</span>
            </button>
            <button
              onClick={() => setGraficoModo('ingresos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 min-h-[36px] ${
                graficoModo === 'ingresos' ? 'bg-[#16a34a] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Ingresos por Categoría</span>
            </button>
          </div>
        </div>

        {graficoModo === 'utilidad' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#eff6ff] p-3 rounded-xl border border-[#dbeafe] text-xs">
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Ingresos Totales:</span>
              <strong className="text-[#16a34a] font-black text-sm">
                Bs {totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Gastos Totales:</span>
              <strong className="text-[#dc2626] font-black text-sm">
                Bs {totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Utilidad Neta del Periodo:</span>
              <strong className={`font-black text-sm ${balanceNeto >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                {balanceNeto >= 0 ? '+' : ''}Bs {balanceNeto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Margen Operativo:</span>
              <strong className={`font-black text-sm ${balanceNeto >= 0 ? 'text-[#1d4ed8]' : 'text-[#dc2626]'}`}>
                {margenPct}%
              </strong>
            </div>
          </div>
        )}

        {(graficoModo === 'utilidad' ? categoriaUtilidadData.length === 0 : chartData.length === 0) ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No hay datos para mostrar en este concepto con los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Donut SVG Chart (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    let cumulativePct = 0;
                    return chartData.map((d, i) => {
                      const strokeDash = `${d.porcentaje} ${100 - d.porcentaje}`;
                      const strokeDashOffset = -cumulativePct;
                      cumulativePct += d.porcentaje;
                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke={d.color}
                          strokeWidth="20"
                          strokeDasharray={strokeDash}
                          strokeDashoffset={strokeDashOffset}
                          className="transition-all hover:opacity-80"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    {graficoModo === 'utilidad' ? 'Utilidad Neta' : `Total ${graficoModo}`}
                  </span>
                  <span className={`text-sm font-black ${
                    graficoModo === 'utilidad'
                      ? balanceNeto >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'
                      : 'text-slate-800'
                  }`}>
                    {graficoModo === 'utilidad' && balanceNeto >= 0 ? '+' : ''}Bs {(
                      graficoModo === 'utilidad' ? balanceNeto : chartData.reduce((s, c) => s + c.monto, 0)
                    ).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {graficoModo === 'utilidad' && (
                    <span className="text-[10px] text-[#1d4ed8] font-bold mt-0.5">
                      Margen: {margenPct}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Breakdown Legend Table (7 cols) */}
            <div className="lg:col-span-7 space-y-2.5 max-h-[340px] overflow-y-auto pr-2 text-xs">
              {graficoModo === 'utilidad' ? (
                categoriaUtilidadData.map((d, idx) => (
                  <div key={idx} className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-[#e2e8f0] shadow-sm transition-colors space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color }}></span>
                        <span className="font-bold text-slate-800 text-sm">{d.categoria}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          d.utilidad >= 0 ? 'bg-emerald-50 text-[#16a34a] border border-emerald-200' : 'bg-red-50 text-[#dc2626] border border-red-200'
                        }`}>
                          Margen: {d.margen.toFixed(1)}%
                        </span>
                        <span className={`font-black text-sm ${d.utilidad >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                          {d.utilidad >= 0 ? '+' : ''}Bs {d.utilidad.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Fila de Ingresos vs Gastos de la categoría */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-[#e2e8f0]">
                      <div className="flex items-center gap-3">
                        <span>Ingresos: <strong className="text-[#16a34a]">Bs {d.ingresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong></span>
                        <span>Gastos: <strong className="text-[#dc2626]">Bs {d.gastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong></span>
                      </div>
                      <span className={`text-[10px] font-bold ${d.utilidad >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                        {d.utilidad >= 0 ? 'Utilidad Favorable' : 'Déficit / Gasto Neto'}
                      </span>
                    </div>

                    {/* Barra visual de proporción de Ingresos vs Gastos */}
                    {d.ingresos + d.gastos > 0 && (
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-[#16a34a] h-full transition-all" 
                          style={{ width: `${(d.ingresos / (d.ingresos + d.gastos)) * 100}%` }}
                          title={`Ingresos: ${(d.ingresos / (d.ingresos + d.gastos) * 100).toFixed(0)}%`}
                        />
                        <div 
                          className="bg-[#dc2626] h-full transition-all" 
                          style={{ width: `${(d.gastos / (d.ingresos + d.gastos)) * 100}%` }}
                          title={`Gastos: ${(d.gastos / (d.ingresos + d.gastos) * 100).toFixed(0)}%`}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                chartData.map((d, idx) => (
                  <div key={idx} className="p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-[#e2e8f0] shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color }}></span>
                      <span className="font-bold text-slate-800">{d.categoria}</span>
                    </div>

                    <div className="flex items-center space-x-4 text-right">
                      <span className="text-slate-500 font-bold">{d.porcentaje.toFixed(1)}%</span>
                      <span className="font-extrabold text-slate-800 text-sm">
                        Bs {d.monto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* TABLA PRINCIPAL DE REPORTES SEGÚN SECCIÓN SELECCIONADA */}
      <div className="bg-white border border-[#e2e8f0] rounded-[18px] shadow-sm overflow-hidden">
        <div className="p-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              {seccionReporte === 'transacciones' && (
                <>
                  <DollarSign className="w-4 h-4 text-[#16a34a]" />
                  <span>Detalle de Transacciones y Gastos ({transaccionesFiltradas.length})</span>
                </>
              )}
              {seccionReporte === 'submanifiestos' && (
                <>
                  <Truck className="w-4 h-4 text-[#1d4ed8]" />
                  <span>Sub-Manifiestos y Encomiendas con ID de Viaje ({subManifiestosFiltrados.length})</span>
                </>
              )}
              {seccionReporte === 'viajes' && (
                <>
                  <FileText className="w-4 h-4 text-[#1d4ed8]" />
                  <span>Resumen Financiero por Viaje ({viajesFiltrados.length})</span>
                </>
              )}
              {seccionReporte === 'balance_operativo' && (
                <>
                  <Scale className="w-4 h-4 text-[#16a34a]" />
                  <span>Balance Operativo Financiero (Medios de Pago, CxC Clientes, CxP Proveedores)</span>
                </>
              )}
              {seccionReporte === 'estado_resultados' && (
                <>
                  <TrendingUp className="w-4 h-4 text-[#1d4ed8]" />
                  <span>Estado de Resultados Operativo (Ingresos, Gastos con Proveedor, Margen Neto)</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              {seccionReporte === 'submanifiestos'
                ? 'Relación directa de sub-manifiestos asociados a cada código de Viaje, fletes y cobranzas.'
                : seccionReporte === 'balance_operativo'
                ? 'Posición neta consolidada: (Cobrado + CxC) - (Pagado + CxP) con desglose por medio de pago y terceros.'
                : seccionReporte === 'estado_resultados'
                ? 'EERR Operativo con ingresos por flete y costos clasificados indicando cada proveedor asociado.'
                : 'Listo para visualización, filtrado por ID de Viaje, exportación e impresión.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-mono hidden md:inline">
              {filtroViaje !== 'Todos' ? `Filtro: ${filtroViaje}` : 'Todos los Viajes'}
            </span>
            <button
              onClick={() => handleExportExcel(seccionReporte)}
              title="Exportar esta vista a Planilla Excel Oficial (.xls)"
              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#16a34a] border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all min-h-[44px]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel Planilla</span>
            </button>
            <button
              onClick={() => handlePrintPDF(seccionReporte)}
              title="Imprimir reporte oficial o guardar como PDF"
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#e2e8f0] text-xs font-bold flex items-center gap-1.5 transition-all min-h-[44px]"
            >
              <Printer className="w-3.5 h-3.5 text-[#1d4ed8]" />
              <span>Imprimir PDF</span>
            </button>
          </div>
        </div>

        <div className="table-responsive-container w-full overflow-x-auto lg:overflow-x-visible rounded-xl border border-slate-200 bg-white shadow-sm">
          {seccionReporte === 'transacciones' && (
            <table className="w-full table-auto lg:table-fixed border-collapse min-w-[750px] lg:min-w-0">
              <thead>
                <tr>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[9%]">Fecha</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[10%]">ID Viaje</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[8%]">Tipo</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[12%]">Categoría</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[12%]">Método / Cuenta</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[12%]">Sucursal / Camión</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[12%]">Notas</th>
                  <th className="bg-slate-100 text-[#16a34a] text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[10%]">Ingresos (Bs)</th>
                  <th className="bg-slate-100 text-[#dc2626] text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[10%]">Gastos (Bs)</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-center lg:w-[5%]">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transaccionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-400">
                      No hay transacciones que coincidan con los criterios.
                    </td>
                  </tr>
                ) : (
                  transaccionesFiltradas.map((t) => {
                    const isInc = t.tipo === 'Ingreso';
                    const isGas = t.tipo === 'Gasto';
                    const isTrf = t.tipo === 'Traspaso';
                    const ingresoVal = isInc 
                      ? t.montoBs 
                      : (isTrf && filtroMetodo !== 'Todos' && t.cuentaDestino === filtroMetodo) 
                      ? t.montoBs 
                      : null;
                    const gastoVal = isGas 
                      ? t.montoBs 
                      : (isTrf && filtroMetodo !== 'Todos' && t.metodoPago === filtroMetodo) 
                      ? t.montoBs 
                      : null;

                    return (
                      <tr key={t.idTransaccion} className="hover:bg-slate-50 transition-colors">
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 font-mono whitespace-nowrap text-xs">{t.fecha}</td>
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 font-mono text-[#1d4ed8] font-bold whitespace-nowrap text-xs">
                          {t.idViaje ? (
                            <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                              {t.idViaje}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isInc ? 'bg-emerald-50 text-[#16a34a] border border-emerald-200' : isTrf ? 'bg-blue-50 text-[#1d4ed8] border border-blue-200' : 'bg-rose-50 text-[#dc2626] border border-rose-200'
                          }`}>
                            {t.tipo}
                          </span>
                        </td>
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 font-semibold truncate text-xs" title={t.categoria}>{t.categoria}</td>
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-xs truncate" title={t.metodoPago}>
                          {t.metodoPago}
                          {t.cuentaDestino && <span className="text-slate-400"> ➔ {t.cuentaDestino}</span>}
                        </td>
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-xs truncate" title={t.sucursal || t.placaCamion || ''}>
                          {t.sucursal || '-'}
                          {t.placaCamion && <span className="font-mono text-[#1d4ed8] ml-1">({t.placaCamion})</span>}
                        </td>
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-slate-500 truncate text-xs" title={t.notas}>{t.notas}</td>
                        
                        {/* Columna 1: Ingresos (Bs) */}
                        <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold whitespace-nowrap text-[#16a34a] bg-emerald-50/30 text-xs lg:text-sm">
                          {ingresoVal !== null ? `+Bs ${ingresoVal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}` : '-'}
                        </td>

                        {/* Columna 2: Gastos (Bs) */}
                        <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold whitespace-nowrap text-[#dc2626] bg-rose-50/30 text-xs lg:text-sm">
                          {gastoVal !== null ? `-Bs ${gastoVal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}` : '-'}
                        </td>

                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-center">
                          {t.comprobanteFotoUrl ? (
                            <button
                              onClick={() => onVerComprobante(t.comprobanteFotoUrl!)}
                              className="p-1.5 bg-[#eff6ff] hover:bg-blue-100 text-[#1d4ed8] rounded-lg transition-colors min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                              title="Ver Comprobante"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Fila Inferior de Totales y Saldo Anterior */}
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-xs">
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <td colSpan={7} className="py-3 px-2 lg:px-3 text-right font-semibold">
                    <div className="flex items-center justify-end gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#1d4ed8]" />
                      <span>
                        {fechaInicioEfectiva 
                          ? `Saldo Anterior Acumulado (previo al ${fechaInicioEfectiva}):` 
                          : 'Saldo Anterior Acumulado (historial inicial):'}
                      </span>
                    </div>
                  </td>
                  <td colSpan={2} className={`py-3 px-2 lg:px-3 text-right font-bold text-sm ${saldoAnterior >= 0 ? 'text-[#1d4ed8]' : 'text-[#dc2626]'}`}>
                    Bs {saldoAnterior.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3"></td>
                </tr>

                <tr className="bg-slate-100 text-slate-800 font-bold">
                  <td colSpan={7} className="py-3 px-2 lg:px-3 text-right uppercase tracking-wider text-slate-600 text-xs">
                    Suma de Totales del Periodo:
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-right font-bold text-sm text-[#16a34a] bg-emerald-50 whitespace-nowrap">
                    Bs {totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-right font-bold text-sm text-[#dc2626] bg-rose-50 whitespace-nowrap">
                    Bs {totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3"></td>
                </tr>

                <tr className="bg-white text-slate-800 font-bold border-t border-slate-200">
                  <td colSpan={7} className="py-3 px-2 lg:px-3 text-right text-[#1d4ed8] font-bold text-xs">
                    Saldo del Periodo (Total Ingresos - Total Gastos):
                  </td>
                  <td colSpan={2} className={`py-3 px-2 lg:px-3 text-right font-bold text-sm whitespace-nowrap ${balanceNeto >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                    {balanceNeto >= 0 ? '+' : ''}Bs {balanceNeto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3"></td>
                </tr>

                <tr className="bg-[#eff6ff] text-slate-800 border-t-2 border-[#bfdbfe]">
                  <td colSpan={7} className="py-3 px-2 lg:px-3 text-right font-bold text-xs uppercase tracking-wider text-[#1d4ed8]">
                    Saldo Total Final (Saldo Anterior + Saldo del Periodo):
                  </td>
                  <td colSpan={2} className={`py-3 px-2 lg:px-3 text-right font-black text-sm lg:text-base whitespace-nowrap ${saldoFinal >= 0 ? 'text-[#1d4ed8]' : 'text-[#dc2626]'}`}>
                    Bs {saldoFinal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3"></td>
                </tr>
              </tfoot>
            </table>
          )}

          {seccionReporte === 'submanifiestos' && (
            <table className="w-full table-auto lg:table-fixed border-collapse min-w-[750px] lg:min-w-0">
              <thead>
                <tr>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[10%]">ID de Viaje</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[11%]">Sub-Manifiesto</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[10%]">Destino</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[15%]">Destinatario (Cliente)</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[9%]">Flete Asignado</th>
                  <th className="bg-slate-100 text-emerald-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[9%]">Pagado Origen</th>
                  <th className="bg-slate-100 text-amber-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[9%]">Por Pagar Destino</th>
                  <th className="bg-slate-100 text-blue-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[9%]">Cobrado Destino</th>
                  <th className="bg-slate-100 text-rose-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[9%]">Saldo Pendiente</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-center lg:w-[9%]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {subManifiestosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-400">
                      No hay sub-manifiestos que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  subManifiestosFiltrados.map((s) => (
                    <tr key={s.idSubManifiesto} className="hover:bg-slate-50 transition-colors">
                      <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 font-mono font-bold text-[#1d4ed8] whitespace-nowrap text-xs">
                        <span className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                          <Truck className="w-3 h-3 text-[#1d4ed8]" />
                          {s.idViaje || 'Sin Viaje'}
                        </span>
                      </td>
                      <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 font-mono text-slate-700 font-bold whitespace-nowrap text-xs">{s.nroManifiesto}</td>
                      <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-slate-800 font-semibold text-xs truncate" title={s.sucursalDestino}>{s.sucursalDestino}</td>
                      <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-slate-700 font-bold text-xs truncate" title={s.destinatario || ''}>{s.destinatario || '-'}</td>
                      <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold text-slate-800 whitespace-nowrap text-xs lg:text-sm">Bs {s.fleteAsignadoBs.toLocaleString('es-BO')}</td>
                      <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right text-[#16a34a] font-semibold whitespace-nowrap text-xs lg:text-sm">Bs {s.pagadoOrigenBs.toLocaleString('es-BO')}</td>
                      <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right text-amber-600 font-semibold whitespace-nowrap text-xs lg:text-sm">Bs {(s.porPagarDestinoBs || 0).toLocaleString('es-BO')}</td>
                      <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right text-[#1d4ed8] font-bold whitespace-nowrap text-xs lg:text-sm">Bs {s.cobrosRealizadosBs.toLocaleString('es-BO')}</td>
                      <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-black whitespace-nowrap text-xs lg:text-sm">
                        <span className={s.saldoPendienteClienteBs === 0 ? 'text-[#16a34a]' : 'text-amber-600'}>
                          Bs {s.saldoPendienteClienteBs.toLocaleString('es-BO')}
                        </span>
                      </td>
                      <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.estadoLiquidacion === 'Liquidado en Sucursal'
                            ? 'bg-emerald-50 text-[#16a34a] border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {s.estadoLiquidacion}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-xs font-bold">
                <tr className="bg-slate-100 text-slate-800">
                  <td colSpan={4} className="py-3 px-2 lg:px-3 text-right uppercase tracking-wider text-[#1d4ed8] font-bold text-xs">
                    Totales Sub-Manifiestos ({subManifiestosFiltrados.length} Registros):
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-right font-bold text-slate-800 bg-white whitespace-nowrap text-xs lg:text-sm">
                    Bs {totalesSubManifiestos.fleteAsignado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-right font-bold text-[#16a34a] bg-emerald-50 whitespace-nowrap text-xs lg:text-sm">
                    Bs {totalesSubManifiestos.pagadoOrigen.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-right font-bold text-amber-700 bg-amber-50 whitespace-nowrap text-xs lg:text-sm">
                    Bs {totalesSubManifiestos.porPagarDestino.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-right font-bold text-[#1d4ed8] bg-blue-50 whitespace-nowrap text-xs lg:text-sm">
                    Bs {totalesSubManifiestos.cobrosRealizados.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-right font-bold text-[#dc2626] bg-rose-50 whitespace-nowrap text-xs lg:text-sm">
                    Bs {totalesSubManifiestos.saldoPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-center text-slate-400">-</td>
                </tr>
              </tfoot>
            </table>
          )}

          {seccionReporte === 'viajes' && (
            <table className="w-full table-auto lg:table-fixed border-collapse min-w-[750px] lg:min-w-0">
              <thead>
                <tr>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[11%]">ID de Viaje</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[11%]">Camión / Placa</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[14%]">Chofer Asignado</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[15%]">Fechas (Salida - Llegada)</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[11%]">Fletes Manifiestos</th>
                  <th className="bg-slate-100 text-rose-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[11%]">Gastos Ruta</th>
                  <th className="bg-slate-100 text-emerald-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[11%]">Utilidad Neta</th>
                  <th className="bg-slate-100 text-blue-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[7%]">Margen %</th>
                  <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-center lg:w-[9%]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {viajesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      No hay viajes que coincidan con los criterios.
                    </td>
                  </tr>
                ) : (
                  viajesFiltrados.map((v) => (
                    <tr key={v.idViaje} className="hover:bg-slate-50 transition-colors">
                      <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 font-mono font-bold text-[#1d4ed8] whitespace-nowrap text-xs">
                        <span className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                          <Truck className="w-3 h-3 text-[#1d4ed8]" />
                          {v.idViaje}
                        </span>
                      </td>
                      <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 font-mono text-slate-800 font-bold whitespace-nowrap text-xs">{v.placaCamion}</td>
                      <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-slate-700 text-xs truncate" title={v.choferAsignado}>{v.choferAsignado}</td>
                      <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-slate-500 whitespace-nowrap text-xs">{v.fechaSalida} ➔ {v.fechaLlegada}</td>
                      <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold text-slate-800 whitespace-nowrap text-xs lg:text-sm">Bs {v.fletesManifiestosBs.toLocaleString('es-BO')}</td>
                      <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right text-[#dc2626] font-semibold whitespace-nowrap text-xs lg:text-sm">-Bs {v.gastosRutaBs.toLocaleString('es-BO')}</td>
                      <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold text-[#16a34a] whitespace-nowrap text-xs lg:text-sm">Bs {v.utilidadViajeBs.toLocaleString('es-BO')}</td>
                      <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold text-[#1d4ed8] whitespace-nowrap text-xs lg:text-sm">{v.margenPct}%</td>
                      <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {v.estadoViaje}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-xs font-bold">
                <tr className="bg-slate-100 text-slate-800">
                  <td colSpan={4} className="py-3 px-2 lg:px-3 text-right uppercase tracking-wider text-[#1d4ed8] font-bold text-xs">
                    Totales Consolidados ({viajesFiltrados.length} Viajes):
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-right font-bold text-slate-800 bg-white whitespace-nowrap text-xs lg:text-sm">
                    Bs {totalesViajes.fletes.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-right font-bold text-[#dc2626] bg-rose-50 whitespace-nowrap text-xs lg:text-sm">
                    -Bs {totalesViajes.gastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`py-3 px-2 lg:px-3 text-right font-bold whitespace-nowrap text-xs lg:text-sm ${totalesViajes.utilidad >= 0 ? 'text-[#16a34a] bg-emerald-50' : 'text-[#dc2626] bg-rose-50'}`}>
                    Bs {totalesViajes.utilidad.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-right font-bold text-[#1d4ed8] bg-blue-50 whitespace-nowrap text-xs lg:text-sm">
                    {totalesViajes.margenProm}%
                  </td>
                  <td className="py-3 px-2 lg:px-3 text-center text-slate-400">-</td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* SECCIÓN BALANCE OPERATIVO FINANCIERO */}
          {seccionReporte === 'balance_operativo' && (
            <div className="p-4 sm:p-5 space-y-6">
              {/* Tarjetas KPI de Resumen de Posición Neta: (Cobrado + CxC) - (Pagado + CxP) */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-[#1d4ed8] font-bold uppercase tracking-wider">
                      ECUACIÓN FINANCIERA OPERATIVA
                    </span>
                    <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-[#1d4ed8]" />
                      Resumen de Posición Neta: (Cobrado + CxC) - (Pagado + CxP)
                    </h4>
                    <p className="text-xs text-[#64748b]">
                      Balance en tiempo real entre activos líquidos proyectados frente a obligaciones operativas.
                    </p>
                  </div>

                  <div className={`px-4 py-2.5 rounded-xl border text-center ${
                    balancePosicionNeta.posicionNeta >= 0
                      ? 'bg-emerald-50 border-emerald-200 text-[#16a34a]'
                      : 'bg-rose-50 border-rose-200 text-[#dc2626]'
                  }`}>
                    <span className="text-[10px] uppercase font-bold block">
                      {balancePosicionNeta.posicionNeta >= 0 ? 'Superávit Financiero' : 'Déficit / Financiamiento'}
                    </span>
                    <span className="text-xl font-black">
                      {balancePosicionNeta.posicionNeta >= 0 ? '+' : ''}Bs {balancePosicionNeta.posicionNeta.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-sm">
                    <span className="text-[10px] text-[#64748b] uppercase font-semibold block">1. Total Cobrado</span>
                    <span className="text-lg font-bold text-[#16a34a]">
                      Bs {balancePosicionNeta.cobrado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Ingresos en caja</span>
                  </div>

                  <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-sm">
                    <span className="text-[10px] text-[#64748b] uppercase font-semibold block">2. Cuentas por Cobrar (CxC)</span>
                    <span className="text-lg font-bold text-[#1d4ed8]">
                      +Bs {balancePosicionNeta.cxc.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate" title={`1. Origen: Bs ${balanceCxC.totalCxCAgenciasOrigen.toLocaleString('es-BO')} | 2. Destino: Bs ${balanceCxC.totalCxCAgenciasDestino.toLocaleString('es-BO')} | 3. Clientes: Bs ${balanceCxC.totalCxCClientesDirectos.toLocaleString('es-BO')}`}>
                      1. Origen: Bs {balanceCxC.totalCxCAgenciasOrigen.toLocaleString('es-BO')} | 2. Destino: Bs {balanceCxC.totalCxCAgenciasDestino.toLocaleString('es-BO')} | 3. Clientes: Bs {balanceCxC.totalCxCClientesDirectos.toLocaleString('es-BO')}
                    </span>
                  </div>

                  <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-sm">
                    <span className="text-[10px] text-[#64748b] uppercase font-semibold block">3. Total Pagado</span>
                    <span className="text-lg font-bold text-[#dc2626]">
                      -Bs {balancePosicionNeta.pagado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Egresos desembolsados</span>
                  </div>

                  <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-sm">
                    <span className="text-[10px] text-[#64748b] uppercase font-semibold block">4. Cuentas por Pagar (CxP)</span>
                    <span className="text-lg font-bold text-rose-500">
                      -Bs {balancePosicionNeta.cxp.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{balanceCxP.filtradas.length} proveedores pendientes</span>
                  </div>
                </div>
              </div>

              {/* Sub-tabla 1: Medios de Pago */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-[#16a34a]" />
                    Medios de Pago: Desglose de ingresos y egresos por método
                  </h5>
                  <span className="text-xs text-slate-600">
                    Saldo neto en cajas: <strong className={balanceMediosPago.saldoNeto >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}>
                      Bs {balanceMediosPago.saldoNeto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </strong>
                  </span>
                </div>

                <div className="border border-[#e2e8f0] rounded-xl overflow-x-auto bg-white shadow-sm">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                      <tr>
                        <th className="p-3">Medio de Pago / Cuenta</th>
                        <th className="p-3 text-right text-[#16a34a] min-w-[130px]">Ingresos (Bs)</th>
                        <th className="p-3 text-right text-[#dc2626] min-w-[130px]">Egresos (Bs)</th>
                        <th className="p-3 text-right min-w-[130px]">Saldo Neto (Bs)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] text-slate-700">
                      {balanceMediosPago.lista.length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center text-slate-400">Sin movimientos registrados.</td></tr>
                      ) : (
                        balanceMediosPago.lista.map(m => (
                          <tr key={m.metodo} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{m.metodo}</td>
                            <td className="p-3 text-right font-bold text-[#16a34a]">
                              Bs {m.ingresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-bold text-[#dc2626]">
                              Bs {m.egresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`p-3 text-right font-black ${m.saldoNeto >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                              Bs {m.saldoNeto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-[#f8fafc] font-bold border-t border-[#e2e8f0]">
                      <tr>
                        <td className="p-3 text-slate-800 uppercase">Totales Medios de Pago:</td>
                        <td className="p-3 text-right font-black text-[#16a34a]">
                          Bs {balanceMediosPago.totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-black text-[#dc2626]">
                          Bs {balanceMediosPago.totalEgresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`p-3 text-right font-black ${balanceMediosPago.saldoNeto >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                          Bs {balanceMediosPago.saldoNeto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECCIÓN CUENTAS POR COBRAR (CxC): 3 DESGLOSES ESTRICTOS */}
              {/* ========================================================================= */}

              {/* DESGLOSE 1: CxC Agencias Origen */}
              <div className="space-y-2 pt-2 border-t border-[#e2e8f0]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <span>Desglose 1: Cuentas por Cobrar a Agencias de Origen (CxC Agencias Origen)</span>
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Por concepto de fletes cobrados en origen pendientes de liquidación a central ({balanceCxC.cxcAgenciasOrigen.length} sub-manifiestos). Recuerde que no representan efectivo disponible para propietario/chofer hasta ser liquidados formalmente a Central.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-black bg-purple-100 text-purple-800 border border-purple-200">
                    Total CxC Agencias Origen: Bs {balanceCxC.totalCxCAgenciasOrigen.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border border-[#e2e8f0] rounded-xl overflow-x-auto bg-white shadow-sm">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead className="bg-[#faf5ff] text-purple-950 font-bold border-b border-purple-100">
                      <tr>
                        <th className="p-3 min-w-[150px]">Agencia / Sucursal Origen</th>
                        <th className="p-3 w-[100px] min-w-[100px]">ID Viaje</th>
                        <th className="p-3 w-[110px] min-w-[110px]">Sub-Manifiesto</th>
                        <th className="p-3 min-w-[150px]">Destinatario</th>
                        <th className="p-3 min-w-[140px]">Método en Origen</th>
                        <th className="p-3 min-w-[150px]">Cuenta / Caja Afectada</th>
                        <th className="p-3 text-right text-purple-700 min-w-[150px]">
                          <div>Monto Pagado Origen</div>
                          <div className="text-[10px] font-normal text-amber-700">Por Liquidar a Central (CxC)</div>
                        </th>
                        <th className="p-3 text-center min-w-[100px]">Estado Liquidación</th>
                        <th className="p-3 text-center min-w-[120px]">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] text-slate-700">
                      {balanceCxC.cxcAgenciasOrigen.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-4 text-center text-slate-400">
                            No hay liquidaciones pendientes de agencias de origen. Todas las agencias han liquidado sus cobros a Central.
                          </td>
                        </tr>
                      ) : (
                        balanceCxC.cxcAgenciasOrigen.map(ag => (
                          <tr key={ag.idSubManifiesto} className="hover:bg-purple-50/40">
                            <td className="p-3 font-bold text-slate-900">
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                                {ag.origenViaje || 'Agencia Origen'}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[#1d4ed8]">{ag.idViaje || '-'}</td>
                            <td className="p-3 font-mono text-slate-700">{ag.nroManifiesto}</td>
                            <td className="p-3 font-medium text-slate-800">{ag.destinatario || '-'}</td>
                            <td className="p-3 text-slate-600">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                                {ag.metodoCobroOrigen || 'Por Liquidar / Crédito'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 font-mono text-[11px]">
                              {ag.cuentaAfectadaOrigen || 'CxC Agencia Origen'}
                            </td>
                            <td className="p-3 text-right font-black text-purple-700">
                              Bs {(ag.pagadoOrigenBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                {ag.estadoLiquidacionAgencia || 'Pendiente de Liquidación'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setLiquidarModal({
                                    open: true,
                                    sub: ag,
                                    cuentaCentral: catalogos.cajasCuentas?.[0] || 'Caja Oficina Central',
                                    fecha: new Date().toISOString().split('T')[0],
                                    notas: `Liquidación a Central encomienda ${ag.nroManifiesto} (${ag.origenViaje || 'Agencia Origen'})`
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors shadow-sm"
                                title="Liquidar Cobro de Origen a Caja Central"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Liquidar a Central
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-[#faf5ff] font-bold border-t border-purple-200">
                      <tr>
                        <td colSpan={6} className="p-3 text-purple-950 uppercase">
                          Total CxC Agencias de Origen ({balanceCxC.cxcAgenciasOrigen.length} Sub-Manifiestos):
                        </td>
                        <td className="p-3 text-right font-black text-purple-700">
                          Bs {balanceCxC.totalCxCAgenciasOrigen.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan={2}>-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* DESGLOSE 2: CxC Agencias Destino (Filtrado y Agrupado Estrictamente por Nombre de la Agencia de Destino) */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <span>Desglose 2: Cuentas por Cobrar a Agencias de Destino (CxC Agencias Destino)</span>
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Filtrado y agrupado estrictamente por Nombre de la Agencia de Destino ({balanceCxC.gruposAgenciasDestino.length} agencias con saldo).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Filtro específico por Agencia de Destino */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 font-bold hidden sm:inline">Filtrar Agencia:</span>
                      <select
                        value={filtroAgenciaDestinoCxC}
                        onChange={(e) => setFiltroAgenciaDestinoCxC(e.target.value)}
                        className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-950 focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="Todas">Todas las Agencias de Destino ({balanceCxC.gruposAgenciasDestino.length})</option>
                        {balanceCxC.gruposAgenciasDestino.map(g => (
                          <option key={g.agencia} value={g.agencia}>
                            {g.agencia} (Bs {g.totalCxCAgenciaBs.toLocaleString('es-BO')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-xs px-2.5 py-1 rounded-full font-black bg-amber-100 text-amber-900 border border-amber-300">
                      Total CxC Agencias Destino: Bs {balanceCxC.totalCxCAgenciasDestino.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Lista Agrupada Estrictamente por Nombre de la Agencia de Destino */}
                {balanceCxC.gruposAgenciasDestino
                  .filter(g => filtroAgenciaDestinoCxC === 'Todas' || g.agencia === filtroAgenciaDestinoCxC)
                  .length === 0 ? (
                  <div className="border border-[#e2e8f0] rounded-xl p-4 bg-white text-center text-xs text-slate-400">
                    No hay Cuentas por Cobrar asignadas a Agencias de Destino en este criterio.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {balanceCxC.gruposAgenciasDestino
                      .filter(g => filtroAgenciaDestinoCxC === 'Todas' || g.agencia === filtroAgenciaDestinoCxC)
                      .map(grupo => (
                        <div key={grupo.agencia} className="border-2 border-amber-200 rounded-xl overflow-hidden bg-white shadow-sm">
                          {/* Cabecera del Grupo de Agencia de Destino */}
                          <div className="bg-[#fffbeb] px-4 py-2.5 border-b border-amber-200 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-amber-700" />
                              <span className="font-extrabold text-sm text-amber-950">
                                Agencia de Destino: {grupo.agencia}
                              </span>
                              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                                {grupo.items.length} sub-manifiesto(s)
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              {grupo.totalSaldoPorCobrarBs > 0 && (
                                <span className="text-amber-900 font-semibold">
                                  Por Rendir: <strong className="font-bold">Bs {grupo.totalSaldoPorCobrarBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
                                </span>
                              )}
                              {grupo.totalRetenidoBs > 0 && (
                                <span className="text-amber-900 font-semibold">
                                  Retenido en Agencia: <strong className="font-bold text-amber-950">Bs {grupo.totalRetenidoBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
                                </span>
                              )}
                              <span className="font-black text-amber-950 bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300">
                                Subtotal CxC {grupo.agencia}: Bs {grupo.totalCxCAgenciaBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* Tabla de Sub-Manifiestos del Grupo */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs min-w-[950px]">
                              <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                                <tr>
                                  <th className="p-3 w-[100px] min-w-[100px]">ID Viaje</th>
                                  <th className="p-3 w-[110px] min-w-[110px]">Sub-Manifiesto</th>
                                  <th className="p-3 min-w-[150px]">Consignatario (Entrega Física)</th>
                                  <th className="p-3 min-w-[140px]">Tipo de Saldo</th>
                                  <th className="p-3 text-right min-w-[110px]">Flete Asignado</th>
                                  <th className="p-3 text-right text-amber-900 min-w-[130px]">Saldo CxC Agencia (Bs)</th>
                                  <th className="p-3 text-center min-w-[140px]">Estado Rendición</th>
                                  <th className="p-3 text-center min-w-[120px]">Acción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e2e8f0] text-slate-700">
                                {grupo.items.map(sub => {
                                  const saldos = calcularSaldosSubManifiesto(sub);
                                  const porPagarDestino = Number(sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : (sub.saldoInicialCobrarBs || 0));
                                  const cobrosRealizados = Number(sub.cobrosRealizadosBs || 0);
                                  const saldoDestinoPendiente = Math.max(0, porPagarDestino - cobrosRealizados);
                                  
                                  const saldoCobrar = saldos.saldoPendienteAgenciaDestino !== undefined 
                                    ? saldos.saldoPendienteAgenciaDestino 
                                    : saldoDestinoPendiente;

                                  const retenido = (sub.montoRetenidoAgenciaBs || 0) > 0 && sub.estadoRendicionDestino === 'Retenido en Agencia (CxC Agencia)'
                                    ? (sub.montoRetenidoAgenciaBs || 0)
                                    : 0;
                                  const montoTotalFila = saldoCobrar + retenido;

                                  return (
                                    <tr key={sub.idSubManifiesto} className="hover:bg-amber-50/40">
                                      <td className="p-3 font-mono text-[#1d4ed8]">{sub.idViaje || '-'}</td>
                                      <td className="p-3 font-mono text-slate-700">{sub.nroManifiesto}</td>
                                      <td className="p-3 font-medium text-slate-900">
                                        <div className="truncate">{sub.destinatario || 'Consignatario General'}</div>
                                        {sub.telefonoContacto && (
                                          <div className="text-[10px] text-slate-400 font-mono">Tel: {sub.telefonoContacto}</div>
                                        )}
                                      </td>
                                      <td className="p-3">
                                        {retenido > 0 ? (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                            Cobro Retenido en Agencia
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                            Agencia Recauda y Rinde
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-3 text-right font-semibold">
                                        Bs {(sub.fleteAsignadoBs || 0).toLocaleString('es-BO')}
                                      </td>
                                      <td className="p-3 text-right font-black text-amber-900">
                                        Bs {montoTotalFila.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                          {sub.estadoRendicionDestino || sub.estadoCobranzaDestino || 'Pendiente de Rendición'}
                                        </span>
                                      </td>
                                      <td className="p-3 text-center">
                                        {retenido > 0 ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setLiquidarAgenciaDestinoModal({
                                                open: true,
                                                agencia: grupo.agencia,
                                                montoMax: retenido,
                                                montoALiquidar: retenido,
                                                cuentaCentral: catalogos.cajasCuentas?.[0] || 'Caja Oficina Central',
                                                fecha: new Date().toISOString().split('T')[0],
                                                notas: `Liquidación de cobranzas retenidas en ${grupo.agencia} (Sub-manifiesto ${sub.nroManifiesto})`
                                              });
                                            }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors shadow-sm"
                                            title="Liquidar Saldo Retenido por Agencia a Cuenta de Empresa"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                                            Liquidar
                                          </button>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 italic">En custodia agencia</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* DESGLOSE 3: CxC Clientes Directos (Filtrado y Agrupado Estrictamente por Nombre del Cliente/Destinatario) */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#1d4ed8]" />
                      <span>Desglose 3: Cuentas por Cobrar a Clientes Directos (CxC Clientes Directos)</span>
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Filtrado y agrupado estrictamente por Nombre del Cliente/Destinatario ({balanceCxC.gruposClientesDirectos.length} clientes con saldo).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Buscador de Cliente */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <input
                        type="text"
                        value={busquedaClienteDirectoCxC}
                        onChange={(e) => setBusquedaClienteDirectoCxC(e.target.value)}
                        placeholder="Buscar cliente deudor..."
                        className="bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                      />
                    </div>

                    <span className="text-xs px-2.5 py-1 rounded-full font-black bg-blue-100 text-blue-900 border border-blue-300">
                      Total CxC Clientes Directos: Bs {balanceCxC.totalCxCClientesDirectos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Lista Agrupada Estrictamente por Nombre del Cliente/Destinatario */}
                {balanceCxC.gruposClientesDirectos
                  .filter(g => !busquedaClienteDirectoCxC || g.cliente.toLowerCase().includes(busquedaClienteDirectoCxC.toLowerCase()))
                  .length === 0 ? (
                  <div className="border border-[#e2e8f0] rounded-xl p-4 bg-white text-center text-xs text-slate-400">
                    No hay Cuentas por Cobrar a Clientes Directos en este criterio.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {balanceCxC.gruposClientesDirectos
                      .filter(g => !busquedaClienteDirectoCxC || g.cliente.toLowerCase().includes(busquedaClienteDirectoCxC.toLowerCase()))
                      .map(grupo => (
                        <div key={grupo.cliente} className="border-2 border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm">
                          {/* Cabecera del Grupo de Cliente */}
                          <div className="bg-[#eff6ff] px-4 py-2.5 border-b border-blue-200 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-[#1d4ed8]" />
                              <span className="font-extrabold text-sm text-blue-950">
                                Cliente Deudor: {grupo.cliente}
                              </span>
                              {grupo.telefono && (
                                <span className="text-[11px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-[#16a34a]" />
                                  {grupo.telefono}
                                </span>
                              )}
                              <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                {grupo.items.length} encomienda(s)
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-600 font-semibold">
                                Flete Total: <strong className="font-bold text-slate-900">Bs {grupo.totalFleteBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
                              </span>
                              <span className="text-[#16a34a] font-semibold">
                                Cobrado: <strong className="font-bold">Bs {grupo.totalCobradoBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
                              </span>
                              <span className="font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                                Saldo Deuda CxC: Bs {grupo.totalPendienteBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* Tabla de Encomiendas del Cliente */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs min-w-[950px]">
                              <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                                <tr>
                                  <th className="p-3 w-[100px] min-w-[100px]">ID Viaje</th>
                                  <th className="p-3 w-[110px] min-w-[110px]">Sub-Manifiesto</th>
                                  <th className="p-3 min-w-[150px]">Descripción Carga</th>
                                  <th className="p-3 min-w-[120px]">Sucursal Destino</th>
                                  <th className="p-3 text-right min-w-[110px]">Flete Asignado</th>
                                  <th className="p-3 text-right min-w-[100px] text-[#16a34a]">Cobrado</th>
                                  <th className="p-3 text-right text-rose-700 min-w-[130px]">Saldo Pendiente (CxC)</th>
                                  <th className="p-3 text-center min-w-[110px]">Estado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e2e8f0] text-slate-700">
                                {grupo.items.map(sub => (
                                  <tr key={sub.idSubManifiesto} className="hover:bg-blue-50/30">
                                    <td className="p-3 font-mono text-[#1d4ed8]">{sub.idViaje || '-'}</td>
                                    <td className="p-3 font-mono text-slate-700">{sub.nroManifiesto}</td>
                                    <td className="p-3 text-slate-600 max-w-xs truncate">{sub.descripcionCarga || 'Mercadería general'}</td>
                                    <td className="p-3 font-medium text-slate-800">{sub.sucursalDestino}</td>
                                    <td className="p-3 text-right font-semibold">
                                      Bs {(sub.fleteAsignadoBs || 0).toLocaleString('es-BO')}
                                    </td>
                                    <td className="p-3 text-right font-semibold text-[#16a34a]">
                                      Bs {(sub.cobrosRealizadosBs || 0).toLocaleString('es-BO')}
                                    </td>
                                    <td className="p-3 text-right font-black text-rose-700">
                                      Bs {(sub.saldoPendienteClienteBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                        Pendiente Pago Cliente
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* RESUMEN CONSOLIDADO CUENTAS POR COBRAR (CxC) */}
              <div className="bg-[#f8fafc] border-2 border-slate-300 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <span className="text-xs uppercase font-black tracking-wider text-slate-800 block">
                      Total General Consolidado Cuentas por Cobrar (CxC)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Suma de Agencias Origen + Agencias Destino + Clientes Directos
                    </span>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-purple-700 font-bold block">1. Agencias Origen:</span>
                      <span className="font-extrabold text-purple-900">
                        Bs {balanceCxC.totalCxCAgenciasOrigen.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-amber-700 font-bold block">2. Agencias Destino:</span>
                      <span className="font-extrabold text-amber-900">
                        Bs {balanceCxC.totalCxCAgenciasDestino.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#1d4ed8] font-bold block">3. Clientes Directos:</span>
                      <span className="font-extrabold text-blue-900">
                        Bs {balanceCxC.totalCxCClientesDirectos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-right pl-3 border-l-2 border-slate-300">
                      <span className="text-[10px] text-rose-700 font-black uppercase block">Total CxC Exigible:</span>
                      <span className="font-black text-rose-700 text-base">
                        Bs {balanceCxC.totalCxCPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-tabla 3: Cuentas por Pagar (CxP) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    Cuentas por Pagar (CxP): Lista detallada de obligaciones ({balanceCxP.filtradas.length})
                  </h5>
                  <span className="text-xs text-[#dc2626] font-bold">
                    Total CxP Pendiente: Bs {balanceCxP.totalCxPPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border border-[#e2e8f0] rounded-xl overflow-x-auto bg-white shadow-sm">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                      <tr>
                        <th className="p-3 min-w-[150px]">Proveedor / Razón Social</th>
                        <th className="p-3 min-w-[160px]">Concepto / Servicio</th>
                        <th className="p-3 min-w-[110px]">ID Viaje / Camión</th>
                        <th className="p-3 text-right min-w-[120px]">Monto Total</th>
                        <th className="p-3 text-right text-[#dc2626] min-w-[130px]">Saldo Pendiente (CxP)</th>
                        <th className="p-3 min-w-[100px]">Vencimiento</th>
                        <th className="p-3 text-center min-w-[90px]">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] text-slate-700">
                      {balanceCxP.filtradas.length === 0 ? (
                        <tr><td colSpan={7} className="p-4 text-center text-slate-400">No hay deudas u obligaciones pendientes con proveedores.</td></tr>
                      ) : (
                        balanceCxP.filtradas.map(p => (
                          <tr key={p.idCxP} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{p.nombreProveedor || p.proveedorNombre || '-'}</td>
                            <td className="p-3 text-slate-700">{p.concepto}</td>
                            <td className="p-3 font-mono text-[#1d4ed8]">{p.idViaje || p.placaCamion || p.centroCostoPlaca || '-'}</td>
                            <td className="p-3 text-right font-semibold">Bs {p.montoTotalBs.toLocaleString('es-BO')}</td>
                            <td className="p-3 text-right font-black text-[#dc2626]">
                              Bs {(p.saldoPendienteBs ?? p.montoTotalBs).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-slate-500">{p.fechaVencimiento || '-'}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-[#dc2626] border border-rose-200">
                                {p.estado}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-[#f8fafc] font-bold border-t border-[#e2e8f0]">
                      <tr>
                        <td colSpan={3} className="p-3 text-slate-800 uppercase">
                          Totales CxP ({balanceCxP.filtradas.length} Proveedores):
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          Bs {balanceCxP.totalCxPMontoTotal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-black text-[#dc2626]">
                          Bs {balanceCxP.totalCxPPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan={2}>-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN ESTADO DE RESULTADOS OPERATIVO */}
          {seccionReporte === 'estado_resultados' && (
            <div className="p-4 sm:p-5 space-y-6">
              {/* Tarjetas KPI de Estado de Resultados */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm">
                  <span className="text-[10px] text-[#64748b] uppercase font-semibold block">Ingresos Operativos</span>
                  <span className="text-xl font-black text-[#16a34a]">
                    Bs {eerrResultado.totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Total facturado / fletes</span>
                </div>

                <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm">
                  <span className="text-[10px] text-[#64748b] uppercase font-semibold block">Costos y Gastos Totales</span>
                  <span className="text-xl font-black text-[#dc2626]">
                    -Bs {eerrResultado.totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Egresos operativos en ruta</span>
                </div>

                <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm">
                  <span className="text-[10px] text-[#64748b] uppercase font-semibold block">Utilidad Neta Operativa</span>
                  <span className={`text-xl font-black ${eerrResultado.utilidadNeta >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                    {eerrResultado.utilidadNeta >= 0 ? '+' : ''}Bs {eerrResultado.utilidadNeta.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Ingresos - Gastos Totales</span>
                </div>

                <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 shadow-sm">
                  <span className="text-[10px] text-[#64748b] uppercase font-semibold block">Margen Neto Operativo</span>
                  <span className={`text-xl font-black ${eerrResultado.margenNetoPct >= 0 ? 'text-[#1d4ed8]' : 'text-[#dc2626]'}`}>
                    {eerrResultado.margenNetoPct}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">Rendimiento sobre ingresos</span>
                </div>
              </div>

              {/* Sub-tabla 1: Ingresos Operativos desglosados */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#16a34a]" />
                    1. Ingresos Operativos: Desglose por concepto y categoría
                  </h5>
                  <span className="text-xs text-[#16a34a] font-bold">
                    Total: Bs {eerrIngresos.totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border border-[#e2e8f0] rounded-xl overflow-x-auto bg-white shadow-sm">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                      <tr>
                        <th className="p-3">Concepto / Categoría de Ingreso</th>
                        <th className="p-3 text-center min-w-[110px]">Nro Operaciones</th>
                        <th className="p-3 text-right text-[#16a34a] min-w-[150px]">Total Facturado / Flete (Bs)</th>
                        <th className="p-3 text-right min-w-[110px]">% Participación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] text-slate-700">
                      {eerrIngresos.lista.map(item => (
                        <tr key={item.concepto} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{item.concepto}</td>
                          <td className="p-3 text-center">{item.operaciones}</td>
                          <td className="p-3 text-right font-bold text-[#16a34a]">
                            Bs {item.monto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right text-[#1d4ed8] font-bold">
                            {item.porcentaje.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#f8fafc] font-bold border-t border-[#e2e8f0]">
                      <tr>
                        <td className="p-3 text-slate-800 uppercase">Total Ingresos Operativos:</td>
                        <td className="p-3 text-center">{eerrIngresos.lista.reduce((s, i) => s + i.operaciones, 0)}</td>
                        <td className="p-3 text-right font-black text-[#16a34a]">
                          Bs {eerrIngresos.totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-black text-[#1d4ed8]">100.0%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Sub-tabla 2: Costos y Gastos Operativos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#dc2626]" />
                    2. Costos y Gastos: Egresos operativos indicando proveedor ({eerrGastos.gastosDetalle.length})
                  </h5>
                  <span className="text-xs text-[#dc2626] font-bold">
                    Total Gastos: -Bs {eerrGastos.totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border border-[#e2e8f0] rounded-xl overflow-x-auto bg-white shadow-sm max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs min-w-[850px]">
                    <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0] sticky top-0 z-10">
                      <tr>
                        <th className="p-3 w-[100px] min-w-[100px]">Fecha</th>
                        <th className="p-3 min-w-[140px]">Categoría de Gasto</th>
                        <th className="p-3 min-w-[160px]">Concepto / Detalle</th>
                        <th className="p-3 min-w-[150px]">Proveedor Asociado</th>
                        <th className="p-3 min-w-[110px]">Viaje / Camión</th>
                        <th className="p-3 text-right text-[#dc2626] min-w-[120px]">Importe (Bs)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] text-slate-700">
                      {eerrGastos.gastosDetalle.length === 0 ? (
                        <tr><td colSpan={6} className="p-4 text-center text-slate-400">No se registraron costos ni gastos operativos en este filtro.</td></tr>
                      ) : (
                        eerrGastos.gastosDetalle.map(g => (
                          <tr key={g.idTransaccion} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{g.fecha}</td>
                            <td className="p-3 font-semibold text-slate-900">{g.categoria}</td>
                            <td className="p-3 text-slate-600 max-w-xs truncate">{g.concepto}</td>
                            <td className="p-3 font-bold text-slate-800">
                              <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 text-amber-800">
                                <Building2 className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate max-w-[200px]">{g.nombreProveedor}</span>
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[#1d4ed8] text-[11px] whitespace-nowrap">
                              {g.idViaje} ({g.placaCamion})
                            </td>
                            <td className="p-3 text-right font-bold text-[#dc2626]">
                              -Bs {g.montoBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-[#f8fafc] font-bold border-t border-[#e2e8f0] sticky bottom-0">
                      <tr>
                        <td colSpan={5} className="p-3 text-slate-800 uppercase">
                          Total Costos y Gastos ({eerrGastos.gastosDetalle.length} Registros):
                        </td>
                        <td className="p-3 text-right font-black text-[#dc2626]">
                          -Bs {eerrGastos.totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Sub-tabla 3: Resumen por Categorías */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-[#1d4ed8]" />
                  3. Consolidado por Categoría de Costo y Proveedores Asociados
                </h5>
                <div className="border border-[#e2e8f0] rounded-xl overflow-x-auto bg-white shadow-sm">
                  <table className="w-full text-left text-xs min-w-[750px]">
                    <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                      <tr>
                        <th className="p-3 min-w-[150px]">Categoría de Gasto</th>
                        <th className="p-3 min-w-[180px]">Proveedores Habituales Vinculados</th>
                        <th className="p-3 text-center min-w-[100px]">Nro Operaciones</th>
                        <th className="p-3 text-right text-[#dc2626] min-w-[130px]">Total Gasto (Bs)</th>
                        <th className="p-3 text-right min-w-[100px]">% del Gasto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] text-slate-700">
                      {eerrGastos.desgloseCategorias.map(c => (
                        <tr key={c.categoria} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{c.categoria}</td>
                          <td className="p-3 text-slate-500 text-[11px] max-w-sm truncate">{c.proveedores || '-'}</td>
                          <td className="p-3 text-center">{c.operaciones}</td>
                          <td className="p-3 text-right font-bold text-[#dc2626]">
                            Bs {c.monto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right text-[#1d4ed8] font-bold">
                            {c.porcentaje.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#f8fafc] font-bold border-t border-[#e2e8f0]">
                      <tr>
                        <td colSpan={3} className="p-3 text-slate-800 uppercase">Total Gastos Agrupados:</td>
                        <td className="p-3 text-right font-black text-[#dc2626]">
                          -Bs {eerrGastos.totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-black text-[#1d4ed8]">100.0%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* SECCIÓN ESPECIALIZADA: CUENTAS POR COBRAR (CxC) OPERATIVAS     */}
          {/* ============================================================= */}
          {seccionReporte === 'cxc' && (
            <div className="p-4 sm:p-5 space-y-6">
              {/* Tarjetas KPI de Resumen CxC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-blue-200 rounded-[18px] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">CxC Clientes Directos</span>
                    <UserCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xl font-black text-blue-700 mt-1 block">
                    Bs {balanceCxC.totalCxCClientesDirectos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {balanceCxC.cxcClientesDirectos.length} flete(s) contra entrega
                  </span>
                </div>

                <div className="bg-white border border-purple-200 rounded-[18px] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-purple-700 uppercase font-bold tracking-wider">CxC Agencias Origen</span>
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-xl font-black text-purple-700 mt-1 block">
                    Bs {balanceCxC.totalCxCAgenciasOrigen.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {balanceCxC.cxcAgenciasOrigen.length} cobro(s) origen por rendir
                  </span>
                </div>

                <div className="bg-white border border-amber-200 rounded-[18px] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-amber-700 uppercase font-bold tracking-wider">CxC Agencias Destino</span>
                    <Building2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-xl font-black text-amber-700 mt-1 block">
                    Bs {balanceCxC.totalCxCAgenciasDestino.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {balanceCxC.cxcAgenciasDestino.length} encomienda(s) en custodia
                  </span>
                </div>

                <div className="bg-gradient-to-br from-rose-50 to-red-100 border border-rose-300 rounded-[18px] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-rose-800 uppercase font-black tracking-wider">Total CxC Consolidado</span>
                    <Banknote className="w-4 h-4 text-rose-600" />
                  </div>
                  <span className="text-xl font-black text-rose-700 mt-1 block">
                    Bs {balanceCxC.totalCxCPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-rose-900 font-semibold block">
                    {balanceCxC.pendientes.length} derechos exigibles totales
                  </span>
                </div>
              </div>

              {/* Panel de Filtros Avanzados de Cuentas por Cobrar */}
              <div className="bg-[#f8fafc] border border-blue-200 rounded-[18px] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                      Filtros de Cuentas por Cobrar (CxC)
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    Mostrando <strong className="text-blue-700">{cxcOperativasFiltradas.length}</strong> de {itemsCxCDetallados.length} cuentas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Tipo de Deudor */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      Tipo de Deudor:
                    </label>
                    <select
                      value={filtroTipoDeudorCxC}
                      onChange={(e) => setFiltroTipoDeudorCxC(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                    >
                      <option value="Todos">Todos los Tipos de Deudor</option>
                      <option value="CLIENTE">Clientes Directos (Entrega)</option>
                      <option value="AGENCIA_ORIGEN">Agencias de Origen (Rendición)</option>
                      <option value="AGENCIA_DESTINO">Agencias de Destino (Custodia/Cobro)</option>
                    </select>
                  </div>

                  {/* Deudor Específico */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      Deudor / Sucursal Específica:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={filtroDeudorEspecificoCxC}
                        onChange={(e) => setFiltroDeudorEspecificoCxC(e.target.value)}
                        placeholder="Buscar cliente o agencia..."
                        className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Estado de Deuda */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      Estado de Deuda:
                    </label>
                    <select
                      value={filtroEstadoDeudaCxC}
                      onChange={(e) => setFiltroEstadoDeudaCxC(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                    >
                      <option value="Todas">Todas (Incluye Saldadas)</option>
                      <option value="Pendientes">Pendientes &gt; 0 Bs.</option>
                      <option value="Vencidas">Vencidas / Antiguas (&gt;15 días)</option>
                    </select>
                  </div>

                  {/* Viaje / MIC */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      ID Viaje / MIC:
                    </label>
                    <select
                      value={filtroViajeEspecificoCxC}
                      onChange={(e) => setFiltroViajeEspecificoCxC(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                    >
                      <option value="Todos">Todos los Viajes</option>
                      {viajes.map(v => (
                        <option key={v.idViaje} value={v.idViaje}>
                          {v.idViaje} ({v.placaCamion})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fila secundaria: Fechas Desde / Hasta */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      Fecha Desde:
                    </label>
                    <input
                      type="date"
                      value={filtroFechaDesdeCxC}
                      onChange={(e) => setFiltroFechaDesdeCxC(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono min-h-[40px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      Fecha Hasta:
                    </label>
                    <input
                      type="date"
                      value={filtroFechaHastaCxC}
                      onChange={(e) => setFiltroFechaHastaCxC(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono min-h-[40px]"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroTipoDeudorCxC('Todos');
                        setFiltroDeudorEspecificoCxC('');
                        setFiltroEstadoDeudaCxC('Pendientes');
                        setFiltroViajeEspecificoCxC('Todos');
                        setFiltroFechaDesdeCxC('');
                        setFiltroFechaHastaCxC('');
                      }}
                      className="w-full px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors min-h-[40px] flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Limpiar Filtros CxC</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TABLA DETALLADA DE CUENTAS POR COBRAR */}
              <div className="border border-[#e2e8f0] rounded-[18px] overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-blue-300" />
                    <h4 className="font-extrabold text-sm tracking-wide">
                      Planilla Operativa de Cuentas por Cobrar (CxC)
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-blue-200 font-bold">
                      Saldo Total en Vista: Bs {cxcOperativasFiltradas.reduce((s, c) => s + c.saldoPendienteBs, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExportExcel('cxc')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                      title="Descargar Planilla Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Descargar Excel</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[1050px]">
                    <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                      <tr>
                        <th className="p-3 text-center min-w-[120px]">Tipo Deudor</th>
                        <th className="p-3 text-left min-w-[200px]">Nombre del Deudor / Sucursal</th>
                        <th className="p-3 text-left min-w-[140px]">Ref. Viaje / MIC</th>
                        <th className="p-3 text-left min-w-[110px]">Fecha Emisión</th>
                        <th className="p-3 text-right tabular-nums min-w-[120px]">Flete / Total (Bs)</th>
                        <th className="p-3 text-right tabular-nums text-emerald-600 min-w-[120px]">Pagado / Rendido (Bs)</th>
                        <th className="p-3 text-right tabular-nums text-red-600 font-bold min-w-[130px]">SALDO PENDIENTE (Bs)</th>
                        <th className="p-3 text-center min-w-[220px]">Acciones Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] text-slate-700">
                      {cxcOperativasFiltradas.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No se encontraron cuentas por cobrar con los filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        cxcOperativasFiltradas.map((item, idx) => {
                          const getBadge = () => {
                            if (item.tipoDeudor === 'CLIENTE') {
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  Cliente Directo
                                </span>
                              );
                            }
                            if (item.tipoDeudor === 'AGENCIA_ORIGEN') {
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  Agencia Origen
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Agencia Destino
                              </span>
                            );
                          };

                          return (
                            <tr key={`${item.idSubManifiesto}-${idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 text-center">
                                {getBadge()}
                              </td>
                              <td className="p-3 text-left font-semibold text-slate-900">
                                <div>{item.nombreDeudor}</div>
                                {item.telefono && (
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-emerald-600 inline" />
                                    {item.telefono}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-left font-mono text-[#1d4ed8]">
                                <div>{item.refViaje}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.nroManifiesto}</div>
                              </td>
                              <td className="p-3 text-left text-slate-600 font-medium">
                                {item.fechaEmision || '-'}
                              </td>
                              <td className="p-3 text-right tabular-nums font-semibold text-slate-800">
                                Bs {item.fleteTotalBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right tabular-nums text-emerald-600 font-semibold">
                                Bs {item.pagadoBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right tabular-nums text-red-600 font-bold">
                                Bs {item.saldoPendienteBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {/* Botón Ver Estado de Cuenta */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (item.tipoDeudor === 'CLIENTE') abrirEstadoCuentaCliente(item.nombreDeudor);
                                      else if (item.tipoDeudor === 'AGENCIA_ORIGEN') abrirEstadoCuentaAgenciaOrigen(item.sucursal || item.nombreDeudor.replace('Agencia ', ''));
                                      else abrirEstadoCuentaAgenciaDestino(item.sucursal || item.nombreDeudor.replace('Agencia ', ''));
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95"
                                    title="Ver Estado de Cuenta / Saldos Deudores"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Estado Cuenta</span>
                                  </button>

                                  {/* Botón Editar Transacción / Anticipo */}
                                  {onEditTransaccion && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const tx = (transacciones || []).find(t => 
                                          t.idTransaccion === item.idSubManifiesto || 
                                          t.nroManifiesto === item.nroManifiesto ||
                                          (t.notas && t.notas.includes(item.idSubManifiesto))
                                        );
                                        if (tx) {
                                          onEditTransaccion(tx);
                                        } else {
                                          onEditTransaccion({
                                            idTransaccion: item.idSubManifiesto,
                                            fecha: item.fechaEmision || new Date().toISOString().split('T')[0],
                                            tipo: 'Ingreso',
                                            categoria: 'Cobranza Fletes CxC',
                                            montoBs: Number(item.fleteTotalBs || 0),
                                            modalidadPago: Number(item.pagadoBs || 0) > 0 ? 'Anticipo_Saldo' : 'Credito',
                                            montoAnticipoBs: Number(item.pagadoBs || 0),
                                            saldoPendienteBs: Number(item.saldoPendienteBs || 0),
                                            cuentaAnticipo: 'Caja Sucursal',
                                            metodoPago: 'Por Cobrar',
                                            sucursal: item.sucursal || '',
                                            nombreCliente: item.nombreDeudor || '',
                                            deudorNombre: item.nombreDeudor || '',
                                            nroManifiesto: item.nroManifiesto || '',
                                            notas: `Flete / Manifiesto ${item.nroManifiesto || item.idSubManifiesto}`
                                          } as any);
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-all active:scale-95"
                                      title="Editar Transacción / Anticipos"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Editar</span>
                                    </button>
                                  )}

                                  {/* Botón Registrar Cobro */}
                                  {item.saldoPendienteBs > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCobroReporteItem({
                                          idSubManifiesto: item.idSubManifiesto,
                                          nroManifiesto: item.nroManifiesto,
                                          deudor: item.nombreDeudor,
                                          tipoDeudor: item.tipoDeudor,
                                          saldoPendienteBs: item.saldoPendienteBs,
                                          fleteTotalBs: item.fleteTotalBs,
                                          sucursal: item.sucursal,
                                          viajeId: item.refViaje
                                        });
                                        setCobroReporteModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all active:scale-95"
                                      title="Registrar Cobro Directo a Caja Central"
                                    >
                                      <Banknote className="w-3.5 h-3.5 text-emerald-100" />
                                      <span>Registrar Cobro</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-[#f8fafc] font-bold border-t border-[#e2e8f0]">
                      <tr>
                        <td colSpan={4} className="p-3 text-slate-800 uppercase tracking-wide">
                          Totales Cuentas por Cobrar ({cxcOperativasFiltradas.length} Registros):
                        </td>
                        <td className="p-3 text-right tabular-nums text-slate-900 font-bold">
                          Bs {cxcOperativasFiltradas.reduce((s, c) => s + c.fleteTotalBs, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right tabular-nums text-emerald-600 font-bold">
                          Bs {cxcOperativasFiltradas.reduce((s, c) => s + c.pagadoBs, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right tabular-nums text-red-600 font-black">
                          Bs {cxcOperativasFiltradas.reduce((s, c) => s + c.saldoPendienteBs, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td>-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* SECCIÓN ESPECIALIZADA: CUENTAS POR PAGAR (CxP) A PROVEEDORES   */}
          {/* ============================================================= */}
          {seccionReporte === 'cxp' && (
            <div className="p-4 sm:p-5 space-y-6">
              {/* Tarjetas KPI de Resumen CxP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-[18px] p-4 shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Total Facturado / Compra</span>
                  <span className="text-xl font-black text-slate-900 mt-1 block">
                    Bs {cxpOperativasFiltradas.reduce((s, c) => s + c.montoTotalBs, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Obligaciones registradas
                  </span>
                </div>

                <div className="bg-white border border-emerald-200 rounded-[18px] p-4 shadow-sm">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider block">Total Abonado / Pagado</span>
                  <span className="text-xl font-black text-emerald-700 mt-1 block">
                    Bs {cxpOperativasFiltradas.reduce((s, c) => s + c.montoAbonadoBs, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Efectivizado a proveedores
                  </span>
                </div>

                <div className="bg-gradient-to-br from-rose-50 to-red-100 border border-rose-300 rounded-[18px] p-4 shadow-sm">
                  <span className="text-[10px] text-rose-800 uppercase font-black tracking-wider block">Total Deuda Pendiente (CxP)</span>
                  <span className="text-xl font-black text-rose-700 mt-1 block">
                    Bs {cxpOperativasFiltradas.reduce((s, c) => s + c.saldoPendienteBs, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-rose-900 font-semibold block">
                    Pasivo exigible a terceros
                  </span>
                </div>

                <div className="bg-white border border-amber-200 rounded-[18px] p-4 shadow-sm">
                  <span className="text-[10px] text-amber-700 uppercase font-bold tracking-wider block">Proveedores con Saldo</span>
                  <span className="text-xl font-black text-amber-700 mt-1 block">
                    {new Set(cxpOperativasFiltradas.filter(c => c.saldoPendienteBs > 0).map(c => c.nombreProveedor)).size}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Cuentas activas pendientes
                  </span>
                </div>
              </div>

              {/* Panel de Filtros Avanzados de Cuentas por Pagar */}
              <div className="bg-[#f8fafc] border border-rose-200 rounded-[18px] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-rose-600" />
                    <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                      Filtros de Cuentas por Pagar a Proveedores (CxP)
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    Mostrando <strong className="text-rose-700">{cxpOperativasFiltradas.length}</strong> obligaciones
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Proveedor Específico */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      Proveedor Específico:
                    </label>
                    <select
                      value={filtroProveedorEspecificoCxP}
                      onChange={(e) => setFiltroProveedorEspecificoCxP(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-rose-500 min-h-[40px]"
                    >
                      <option value="Todos">Todos los Proveedores</option>
                      {Array.from(new Set([
                        ...(catalogos.proveedores || []).map(p => p.nombre),
                        ...itemsCxPDetallados.map(c => c.nombreProveedor)
                      ])).sort().map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Rubro / Categoría */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      Rubro / Categoría de Proveedor:
                    </label>
                    <select
                      value={filtroRubroCxP}
                      onChange={(e) => setFiltroRubroCxP(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-rose-500 min-h-[40px]"
                    >
                      <option value="Todos">Todos los Rubros</option>
                      <option value="Combustible">Diésel / Combustible</option>
                      <option value="Repuestos">Repuestos / Taller</option>
                      <option value="Servicios">Servicios / Peajes / Otros</option>
                    </select>
                  </div>

                  {/* Estado de Obligación */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      Estado de Obligación:
                    </label>
                    <select
                      value={filtroEstadoObligacionCxP}
                      onChange={(e) => setFiltroEstadoObligacionCxP(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-rose-500 min-h-[40px]"
                    >
                      <option value="Todas">Todas (Incluye Pagadas)</option>
                      <option value="Pendientes">Pendientes &gt; 0 Bs.</option>
                      <option value="Pagadas">Pagadas Totalmente</option>
                    </select>
                  </div>

                  {/* Asignación Camión / Viaje */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      Asignación Camión / Viaje:
                    </label>
                    <select
                      value={filtroCamionViajeCxP}
                      onChange={(e) => setFiltroCamionViajeCxP(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-rose-500 min-h-[40px]"
                    >
                      <option value="Todos">Todos los Camiones / Viajes</option>
                      {Array.from(new Set(itemsCxPDetallados.map(c => c.placaCamion || c.idViaje).filter(Boolean))).map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fechas y Reset */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      Fecha Compra Desde:
                    </label>
                    <input
                      type="date"
                      value={filtroFechaDesdeCxP}
                      onChange={(e) => setFiltroFechaDesdeCxP(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono min-h-[40px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                      Fecha Compra Hasta:
                    </label>
                    <input
                      type="date"
                      value={filtroFechaHastaCxP}
                      onChange={(e) => setFiltroFechaHastaCxP(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono min-h-[40px]"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroProveedorEspecificoCxP('Todos');
                        setFiltroRubroCxP('Todos');
                        setFiltroEstadoObligacionCxP('Pendientes');
                        setFiltroCamionViajeCxP('Todos');
                        setFiltroFechaDesdeCxP('');
                        setFiltroFechaHastaCxP('');
                      }}
                      className="w-full px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors min-h-[40px] flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Limpiar Filtros CxP</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TABLA DETALLADA DE CUENTAS POR PAGAR */}
              <div className="border border-[#e2e8f0] rounded-[18px] overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-rose-300" />
                    <h4 className="font-extrabold text-sm tracking-wide">
                      Planilla de Cuentas por Pagar a Proveedores (CxP)
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-rose-200 font-bold">
                      Deuda Total en Vista: Bs {cxpOperativasFiltradas.reduce((s, c) => s + c.saldoPendienteBs, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExportExcel('cxp')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                      title="Descargar Planilla Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Descargar Excel</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[1050px]">
                    <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-[#e2e8f0]">
                      <tr>
                        <th className="p-3 text-left min-w-[200px]">Proveedor / Razón Social</th>
                        <th className="p-3 text-left min-w-[150px]">Rubro / Categoría de Gasto</th>
                        <th className="p-3 text-left min-w-[140px]">Ref. Factura / Recibo</th>
                        <th className="p-3 text-left min-w-[130px]">Placa / ID Viaje</th>
                        <th className="p-3 text-left min-w-[110px]">Fecha Compra</th>
                        <th className="p-3 text-right tabular-nums min-w-[120px]">Monto Total (Bs)</th>
                        <th className="p-3 text-right tabular-nums text-emerald-600 min-w-[120px]">Abonado (Bs)</th>
                        <th className="p-3 text-right tabular-nums text-red-600 font-bold min-w-[130px]">SALDO PENDIENTE (Bs)</th>
                        <th className="p-3 text-center min-w-[220px]">Acciones Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] text-slate-700">
                      {cxpOperativasFiltradas.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            No se encontraron cuentas por pagar con los filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        cxpOperativasFiltradas.map((item, idx) => (
                          <tr key={`${item.idCxP}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-left font-semibold text-slate-900">
                              <div>{item.nombreProveedor}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{item.concepto}</div>
                            </td>
                            <td className="p-3 text-left">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                {item.rubro}
                              </span>
                            </td>
                            <td className="p-3 text-left font-mono text-slate-700">
                              {item.nroFacturaBoleta || '-'}
                            </td>
                            <td className="p-3 text-left font-medium text-[#1d4ed8] font-mono">
                              {item.placaCamion || item.idViaje || '-'}
                            </td>
                            <td className="p-3 text-left text-slate-600 font-medium">
                              {item.fechaEmision || '-'}
                            </td>
                            <td className="p-3 text-right tabular-nums font-semibold text-slate-800">
                              Bs {item.montoTotalBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right tabular-nums text-emerald-600 font-semibold">
                              Bs {item.montoAbonadoBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right tabular-nums text-red-600 font-bold">
                              Bs {item.saldoPendienteBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {/* Botón Ver Estado de Cuenta */}
                                <button
                                  type="button"
                                  onClick={() => abrirEstadoCuentaProveedor(item.nombreProveedor)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95"
                                  title="Ver Estado de Cuenta de Proveedor"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Estado Cuenta</span>
                                </button>

                                {/* Botón Editar Transacción / Anticipo */}
                                {onEditTransaccion && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const tx = (transacciones || []).find(t => 
                                        t.idTransaccion === item.idCxP || 
                                        t.nroFacturaBoleta === item.nroFacturaBoleta || 
                                        t.nroManifiesto === item.nroFacturaBoleta ||
                                        (t.notas && t.notas.includes(item.idCxP))
                                      );
                                      if (tx) {
                                        onEditTransaccion(tx);
                                      } else {
                                        onEditTransaccion({
                                          idTransaccion: item.idCxP,
                                          fecha: item.fechaEmision || new Date().toISOString().split('T')[0],
                                          tipo: 'Gasto',
                                          categoria: item.rubro || item.concepto || 'Gasto Operativo',
                                          montoBs: item.montoTotalBs,
                                          modalidadPago: item.montoAbonadoBs > 0 ? 'Anticipo_Saldo' : 'Credito',
                                          montoAnticipoBs: item.montoAbonadoBs,
                                          saldoPendienteBs: item.saldoPendienteBs,
                                          cuentaAnticipo: 'Caja Central',
                                          metodoPago: 'Por Pagar',
                                          idProveedor: item.idProveedor,
                                          nombreProveedor: item.nombreProveedor,
                                          nroFacturaBoleta: item.nroFacturaBoleta,
                                          placaCamion: item.placaCamion,
                                          idViaje: item.idViaje
                                        } as any);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-all active:scale-95"
                                    title="Editar Obligación / Anticipos"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Editar</span>
                                  </button>
                                )}

                                {/* Botón Registrar Pago */}
                                {item.saldoPendienteBs > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPagoProveedorItem({
                                        idCxP: item.idCxP,
                                        idProveedor: item.idProveedor,
                                        nombreProveedor: item.nombreProveedor,
                                        rubro: item.rubro,
                                        concepto: item.concepto,
                                        nroFacturaBoleta: item.nroFacturaBoleta,
                                        placaCamion: item.placaCamion,
                                        idViaje: item.idViaje,
                                        saldoPendienteBs: item.saldoPendienteBs,
                                        montoTotalBs: item.montoTotalBs
                                      });
                                      setPagoProveedorModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all active:scale-95"
                                    title="Registrar Pago / Abono a Proveedor"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-rose-100" />
                                    <span>Registrar Pago</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-[#f8fafc] font-bold border-t border-[#e2e8f0]">
                      <tr>
                        <td colSpan={5} className="p-3 text-slate-800 uppercase tracking-wide">
                          Totales Cuentas por Pagar ({cxpOperativasFiltradas.length} Obligaciones):
                        </td>
                        <td className="p-3 text-right tabular-nums text-slate-900 font-bold">
                          Bs {cxpOperativasFiltradas.reduce((s, c) => s + c.montoTotalBs, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right tabular-nums text-emerald-600 font-bold">
                          Bs {cxpOperativasFiltradas.reduce((s, c) => s + c.montoAbonadoBs, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right tabular-nums text-red-600 font-black">
                          Bs {cxpOperativasFiltradas.reduce((s, c) => s + c.saldoPendienteBs, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td>-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE VISTA PREVIA DE REPORTE OFICIAL PDF */}
      {showPrintView && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto print-modal-overlay">
          <div className="bg-white text-slate-900 w-full sm:max-w-5xl rounded-t-[20px] sm:rounded-[18px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-[#e2e8f0] print-modal-container">
            {/* Header del Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 bg-white text-slate-900 gap-3 border-b border-[#e2e8f0] no-print">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-[#eff6ff] flex items-center justify-center text-[#1d4ed8]">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">Vista Previa de Reporte Oficial / PDF</h3>
                  <p className="text-[11px] text-[#64748b]">Seleccione la planilla a imprimir o guarde como PDF</p>
                </div>
              </div>

              {/* Selector de Sección a Imprimir */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#f4f6fa] p-1 rounded-xl border border-[#e2e8f0] text-xs">
                <button
                  onClick={() => setPrintSeccion('transacciones')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    printSeccion === 'transacciones'
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Transacciones ({transaccionesFiltradas.length})
                </button>
                <button
                  onClick={() => setPrintSeccion('submanifiestos')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    printSeccion === 'submanifiestos'
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sub-Manifiestos ({subManifiestosFiltrados.length})
                </button>
                <button
                  onClick={() => setPrintSeccion('viajes')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    printSeccion === 'viajes'
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Resumen Viajes ({viajesFiltrados.length})
                </button>
                <button
                  onClick={() => setPrintSeccion('balance_operativo')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    printSeccion === 'balance_operativo'
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Balance Operativo
                </button>
                <button
                  onClick={() => setPrintSeccion('estado_resultados')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    printSeccion === 'estado_resultados'
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Estado de Resultados (EERR)
                </button>
                <button
                  onClick={() => setPrintSeccion('todo')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    printSeccion === 'todo'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Reporte Consolidado (Todo)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (printSeccion === 'submanifiestos') handleExportSubManifiestosExcel();
                    else if (printSeccion === 'viajes') handleExportViajesExcel();
                    else if (printSeccion === 'balance_operativo') handleExportBalanceOperativoExcel();
                    else if (printSeccion === 'estado_resultados') handleExportEstadoResultadosExcel();
                    else if (printSeccion === 'todo') handleExportTodoExcel();
                    else handleExportTransaccionesExcel();
                  }}
                  title="Descargar este reporte a Planilla Excel Oficial (.xls)"
                  className="bg-emerald-50 hover:bg-emerald-100 text-[#16a34a] border border-emerald-200 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all min-h-[44px]"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all min-h-[44px]"
                  title="Abrir diálogo de impresión del sistema"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={async () => {
                    const el = document.getElementById('reporte-oficial-print-area');
                    if (el) {
                      await exportElementToPDF(el, `Reporte_Oficial_${printSeccion}_${new Date().toISOString().split('T')[0]}.pdf`);
                    } else {
                      window.print();
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all min-h-[44px]"
                  title="Descargar archivo PDF directamente a su equipo"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintView(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido Imprimible Formato Documento Formal */}
            <div id="reporte-oficial-print-area" className="p-6 sm:p-8 space-y-8 font-sans text-xs overflow-y-auto bg-white">
              
              {/* SECCIÓN 1: DETALLE DE TRANSACCIONES Y GASTOS */}
              {(printSeccion === 'transacciones' || printSeccion === 'todo') && (
                <div className="space-y-4">
                  {/* Encabezado Corporativo */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                    <div>
                      <h1 className="text-xl font-black uppercase text-slate-950 tracking-wider">
                        TranspoDrive S.R.L.
                      </h1>
                      <p className="text-[11px] text-slate-600 font-semibold">
                        Transporte Pesado Nacional & Logística de Encomiendas • Bolivia
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-slate-100 text-slate-900 font-mono font-bold text-xs px-3 py-1 rounded border border-slate-300">
                        ESTADO DE FLUJO Y MOVIMIENTOS - TRANSACCIONES
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Fecha: {new Date().toLocaleDateString('es-BO')} {new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Parámetros del Reporte */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Periodo / Rango:</span>
                      <strong className="text-slate-900">
                        {presetFecha === 'mensual' ? `Mes: ${filtroMes}` : 
                         presetFecha === 'personalizado' ? `${fechaDesde || 'Inicio'} hasta ${fechaHasta || 'Fin'}` :
                         presetFecha === 'este_mes' ? `Mes Actual (${currentMonthStr})` :
                         presetFecha === 'hoy' ? `Solo Hoy (${todayStr})` : 'Todo el Historial'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Método / Caja:</span>
                      <strong className="text-slate-900">{filtroMetodo}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Filtro Tipo:</span>
                      <strong className="text-slate-900">{filtroTipo}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Registros:</span>
                      <strong className="text-slate-900">{transaccionesFiltradas.length} fila(s)</strong>
                    </div>
                  </div>

                  {/* Resumen Ejecutivo KPI */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-100 p-2.5 rounded-lg border border-slate-300 text-center text-[10px]">
                    <div>
                      <span className="text-slate-600 block">Saldo Anterior</span>
                      <strong className={`text-xs ${saldoAnterior >= 0 ? 'text-sky-800' : 'text-rose-700'}`}>
                        Bs {saldoAnterior.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Total Ingresos</span>
                      <strong className="text-xs text-emerald-800">
                        Bs {totalIngresos.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Total Gastos</span>
                      <strong className="text-xs text-rose-800">
                        Bs {totalGastos.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Saldo del Periodo</span>
                      <strong className={`text-xs ${balanceNeto >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {balanceNeto >= 0 ? '+' : ''}Bs {balanceNeto.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Saldo Total Final</span>
                      <strong className="text-xs text-slate-950 font-black">
                        Bs {saldoFinal.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* Tabla Formal de 2 Columnas: Ingresos y Gastos */}
                  <div className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-white">
                    <table className="w-full min-w-[850px] text-left text-[11px] border-collapse divide-y divide-slate-200">
                      <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2 border-r border-slate-200">Fecha</th>
                          <th className="p-2 border-r border-slate-200">ID Viaje</th>
                          <th className="p-2 border-r border-slate-200">Tipo</th>
                          <th className="p-2 border-r border-slate-200">Categoría</th>
                          <th className="p-2 border-r border-slate-200">Método / Caja</th>
                          <th className="p-2 border-r border-slate-200">Detalle / Notas</th>
                          <th className="p-2 text-right border-r border-slate-200 bg-emerald-50 text-emerald-800 font-bold">Ingresos (Bs)</th>
                          <th className="p-2 text-right bg-rose-50 text-rose-800 font-bold">Gastos (Bs)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {transaccionesFiltradas.map((t) => {
                          const isInc = t.tipo === 'Ingreso';
                          const isGas = t.tipo === 'Gasto';
                          const isTrf = t.tipo === 'Traspaso';
                          const ingresoVal = isInc 
                            ? t.montoBs 
                            : (isTrf && filtroMetodo !== 'Todos' && t.cuentaDestino === filtroMetodo) 
                            ? t.montoBs 
                            : null;
                          const gastoVal = isGas 
                            ? t.montoBs 
                            : (isTrf && filtroMetodo !== 'Todos' && t.metodoPago === filtroMetodo) 
                            ? t.montoBs 
                            : null;

                          return (
                            <tr key={t.idTransaccion} className="hover:bg-slate-50">
                              <td className="p-2 font-mono whitespace-nowrap border-r border-slate-200">{t.fecha}</td>
                              <td className="p-2 font-mono font-bold text-sky-800 whitespace-nowrap border-r border-slate-200">{t.idViaje || '-'}</td>
                              <td className="p-2 border-r border-slate-200">{t.tipo}</td>
                              <td className="p-2 font-semibold border-r border-slate-200">{t.categoria}</td>
                              <td className="p-2 border-r border-slate-200">{t.metodoPago}</td>
                              <td className="p-2 border-r border-slate-200 truncate max-w-xs">{t.notas}</td>
                              <td className="p-2 text-right font-bold text-emerald-700 bg-emerald-50/40 border-r border-slate-200 whitespace-nowrap">
                                {ingresoVal !== null ? `Bs ${ingresoVal.toFixed(2)}` : '-'}
                              </td>
                              <td className="p-2 text-right font-bold text-rose-700 bg-rose-50/40 whitespace-nowrap">
                                {gastoVal !== null ? `Bs ${gastoVal.toFixed(2)}` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-900 bg-slate-50 text-[11px] font-bold">
                        <tr className="border-b border-slate-300">
                          <td colSpan={6} className="p-2 text-right font-semibold text-slate-700">
                            {fechaInicioEfectiva 
                              ? `Saldo Anterior Acumulado (al ${fechaInicioEfectiva}):` 
                              : 'Saldo Anterior Acumulado (historial inicial):'}
                          </td>
                          <td colSpan={2} className={`p-2 text-right font-black text-xs ${saldoAnterior >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                            Bs {saldoAnterior.toFixed(2)}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-300 bg-slate-100">
                          <td colSpan={6} className="p-2 text-right uppercase tracking-wider text-slate-700">
                            Suma de Totales del Periodo:
                          </td>
                          <td className="p-2 text-right font-black text-emerald-800 bg-emerald-100 border-r border-slate-300">
                            Bs {totalIngresos.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-black text-rose-800 bg-rose-100">
                            Bs {totalGastos.toFixed(2)}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td colSpan={6} className="p-2 text-right font-bold text-slate-800">
                            Saldo del Periodo (Total Ingresos - Total Gastos):
                          </td>
                          <td colSpan={2} className={`p-2 text-right font-black text-xs ${balanceNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {balanceNeto >= 0 ? '+' : ''}Bs {balanceNeto.toFixed(2)}
                          </td>
                        </tr>
                        <tr className="bg-slate-200">
                          <td colSpan={6} className="p-2 text-right font-black text-slate-900 uppercase">
                            Saldo Total Final Acumulado (Saldo Anterior + Saldo del Periodo):
                          </td>
                          <td colSpan={2} className="p-2 text-right font-black text-sm text-slate-900">
                            Bs {saldoFinal.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {printSeccion !== 'todo' && (
                    <div className="grid grid-cols-2 gap-12 pt-6 text-center text-[10px] text-slate-600">
                      <div className="border-t border-slate-400 pt-1">
                        <p className="font-bold text-slate-900">Responsable de Caja / Operaciones</p>
                        <p>Firma y Aclaración</p>
                      </div>
                      <div className="border-t border-slate-400 pt-1">
                        <p className="font-bold text-slate-900">Contabilidad & Gerencia General</p>
                        <p>Firma y Sello</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECCIÓN 2: SUB-MANIFIESTOS Y ENCOMIENDAS CON ID DE VIAJE */}
              {(printSeccion === 'submanifiestos' || printSeccion === 'todo') && (
                <div className={`space-y-4 ${printSeccion === 'todo' ? 'pt-8 border-t-2 border-dashed border-slate-400' : ''}`}>
                  {/* Encabezado Corporativo */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                    <div>
                      <h1 className="text-xl font-black uppercase text-slate-950 tracking-wider">
                        TranspoDrive S.R.L.
                      </h1>
                      <p className="text-[11px] text-slate-600 font-semibold">
                        Transporte Pesado Nacional & Logística de Encomiendas • Bolivia
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-slate-100 text-slate-900 font-mono font-bold text-xs px-3 py-1 rounded border border-slate-300">
                        SUB-MANIFIESTOS Y ENCOMIENDAS POR VIAJE
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Fecha: {new Date().toLocaleDateString('es-BO')} {new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Parámetros del Reporte */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Sucursal Destino:</span>
                      <strong className="text-slate-900">{filtroSucursal}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Filtro de Viaje:</span>
                      <strong className="text-slate-900">{filtroViaje}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Manifiesto MIC:</span>
                      <strong className="text-slate-900">{filtroManifiesto}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Registros:</span>
                      <strong className="text-slate-900">{subManifiestosFiltrados.length} fila(s)</strong>
                    </div>
                  </div>

                  {/* Resumen Ejecutivo KPI de Sub-Manifiestos */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-100 p-2.5 rounded-lg border border-slate-300 text-center text-[10px]">
                    <div>
                      <span className="text-slate-600 block">Flete Total Asignado</span>
                      <strong className="text-xs text-slate-950 font-black">
                        Bs {totalesSubManifiestos.fleteAsignado.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Pagado en Origen</span>
                      <strong className="text-xs text-emerald-800">
                        Bs {totalesSubManifiestos.pagadoOrigen.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Por Cobrar en Destino</span>
                      <strong className="text-xs text-amber-800">
                        Bs {totalesSubManifiestos.porPagarDestino.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Cobrado en Destino</span>
                      <strong className="text-xs text-blue-800">
                        Bs {totalesSubManifiestos.cobrosRealizados.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Saldo Pendiente Clientes</span>
                      <strong className="text-xs text-rose-700">
                        Bs {totalesSubManifiestos.saldoPendiente.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* Tabla Oficial de Sub-Manifiestos con Totales */}
                  <div className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-white">
                    <table className="w-full min-w-[850px] text-left text-[11px] border-collapse divide-y divide-slate-200">
                      <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2 border-r border-slate-200">ID Viaje</th>
                          <th className="p-2 border-r border-slate-200">Sub-Manifiesto</th>
                          <th className="p-2 border-r border-slate-200">Destino</th>
                          <th className="p-2 border-r border-slate-200">Destinatario</th>
                          <th className="p-2 text-right border-r border-slate-200">Flete Asig.</th>
                          <th className="p-2 text-right border-r border-slate-200 text-emerald-800">Pagado Origen</th>
                          <th className="p-2 text-right border-r border-slate-200 text-amber-800">Por Pagar</th>
                          <th className="p-2 text-right border-r border-slate-200 text-blue-800">Cobrado</th>
                          <th className="p-2 text-right border-r border-slate-200 text-rose-800">Saldo Pend.</th>
                          <th className="p-2 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {subManifiestosFiltrados.map((s) => (
                          <tr key={s.idSubManifiesto} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-sky-800 border-r border-slate-200 whitespace-nowrap">{s.idViaje || '-'}</td>
                            <td className="p-2 font-mono font-semibold border-r border-slate-200 whitespace-nowrap">{s.nroManifiesto}</td>
                            <td className="p-2 border-r border-slate-200">{s.sucursalDestino}</td>
                            <td className="p-2 border-r border-slate-200 font-semibold">{s.destinatario || '-'}</td>
                            <td className="p-2 text-right border-r border-slate-200 font-bold">Bs {s.fleteAsignadoBs.toFixed(2)}</td>
                            <td className="p-2 text-right border-r border-slate-200 text-emerald-700 font-semibold">Bs {s.pagadoOrigenBs.toFixed(2)}</td>
                            <td className="p-2 text-right border-r border-slate-200 text-amber-700">Bs {(s.porPagarDestinoBs || 0).toFixed(2)}</td>
                            <td className="p-2 text-right border-r border-slate-200 text-blue-700 font-bold">Bs {s.cobrosRealizadosBs.toFixed(2)}</td>
                            <td className="p-2 text-right border-r border-slate-200 font-bold text-rose-700">Bs {s.saldoPendienteClienteBs.toFixed(2)}</td>
                            <td className="p-2 text-center text-[10px] whitespace-nowrap">{s.estadoLiquidacion}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-900 bg-slate-100 text-[11px] font-bold">
                        <tr className="bg-slate-200">
                          <td colSpan={4} className="p-2 text-right uppercase tracking-wider text-slate-800">
                            Totales Sub-Manifiestos ({subManifiestosFiltrados.length} Registros):
                          </td>
                          <td className="p-2 text-right font-black border-r border-slate-300">
                            Bs {totalesSubManifiestos.fleteAsignado.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-black text-emerald-800 border-r border-slate-300">
                            Bs {totalesSubManifiestos.pagadoOrigen.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-black text-amber-800 border-r border-slate-300">
                            Bs {totalesSubManifiestos.porPagarDestino.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-black text-blue-800 border-r border-slate-300">
                            Bs {totalesSubManifiestos.cobrosRealizados.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-black text-rose-800 border-r border-slate-300">
                            Bs {totalesSubManifiestos.saldoPendiente.toFixed(2)}
                          </td>
                          <td className="p-2 text-center">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {printSeccion !== 'todo' && (
                    <div className="grid grid-cols-2 gap-12 pt-6 text-center text-[10px] text-slate-600">
                      <div className="border-t border-slate-400 pt-1">
                        <p className="font-bold text-slate-900">Responsable de Despacho & Cobranzas</p>
                        <p>Firma y Aclaración</p>
                      </div>
                      <div className="border-t border-slate-400 pt-1">
                        <p className="font-bold text-slate-900">Contabilidad & Auditoría</p>
                        <p>Firma y Sello</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECCIÓN 3: RESUMEN FINANCIERO POR VIAJE */}
              {(printSeccion === 'viajes' || printSeccion === 'todo') && (
                <div className={`space-y-4 ${printSeccion === 'todo' ? 'pt-8 border-t-2 border-dashed border-slate-400' : ''}`}>
                  {/* Encabezado Corporativo */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                    <div>
                      <h1 className="text-xl font-black uppercase text-slate-950 tracking-wider">
                        TranspoDrive S.R.L.
                      </h1>
                      <p className="text-[11px] text-slate-600 font-semibold">
                        Transporte Pesado Nacional & Logística de Encomiendas • Bolivia
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-slate-100 text-slate-900 font-mono font-bold text-xs px-3 py-1 rounded border border-slate-300">
                        RESUMEN FINANCIERO Y UTILIDAD POR VIAJE
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Fecha: {new Date().toLocaleDateString('es-BO')} {new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Parámetros del Reporte */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Camión / Placa:</span>
                      <strong className="text-slate-900">{filtroPlaca}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Filtro de Viaje:</span>
                      <strong className="text-slate-900">{filtroViaje}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Periodo:</span>
                      <strong className="text-slate-900">
                        {presetFecha === 'mensual' ? `Mes: ${filtroMes}` : 
                         presetFecha === 'personalizado' ? `${fechaDesde || 'Inicio'} a ${fechaHasta || 'Fin'}` :
                         presetFecha === 'este_mes' ? `Mes Actual (${currentMonthStr})` : 'Historial'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Viajes:</span>
                      <strong className="text-slate-900">{viajesFiltrados.length} fila(s)</strong>
                    </div>
                  </div>

                  {/* Resumen Ejecutivo KPI de Viajes */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-2.5 rounded-lg border border-slate-300 text-center text-[10px]">
                    <div>
                      <span className="text-slate-600 block">Fletes Manifiestos</span>
                      <strong className="text-xs text-slate-950 font-black">
                        Bs {totalesViajes.fletes.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Gastos Totales Ruta</span>
                      <strong className="text-xs text-rose-800">
                        -Bs {totalesViajes.gastos.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Utilidad Neta Consolidada</span>
                      <strong className={`text-xs ${totalesViajes.utilidad >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                        Bs {totalesViajes.utilidad.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Margen Promedio</span>
                      <strong className="text-xs text-amber-800">
                        {totalesViajes.margenProm}%
                      </strong>
                    </div>
                  </div>

                  {/* Tabla Oficial de Rendimiento por Viaje con Totales */}
                  <div className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-white">
                    <table className="w-full min-w-[850px] text-left text-[11px] border-collapse divide-y divide-slate-200">
                      <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2 border-r border-slate-200">ID Viaje</th>
                          <th className="p-2 border-r border-slate-200">Placa Camión</th>
                          <th className="p-2 border-r border-slate-200">Chofer Asignado</th>
                          <th className="p-2 border-r border-slate-200">Fechas (Salida - Llegada)</th>
                          <th className="p-2 text-right border-r border-slate-200">Fletes Manifiesto</th>
                          <th className="p-2 text-right border-r border-slate-200 text-rose-800">Gastos Ruta</th>
                          <th className="p-2 text-right border-r border-slate-200 text-emerald-800">Utilidad Neta</th>
                          <th className="p-2 text-right border-r border-slate-200 text-amber-800">Margen %</th>
                          <th className="p-2 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {viajesFiltrados.map((v) => (
                          <tr key={v.idViaje} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-black text-amber-800 border-r border-slate-200 whitespace-nowrap">{v.idViaje}</td>
                            <td className="p-2 font-mono font-bold border-r border-slate-200">{v.placaCamion}</td>
                            <td className="p-2 border-r border-slate-200">{v.choferAsignado}</td>
                            <td className="p-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">{v.fechaSalida} ➔ {v.fechaLlegada}</td>
                            <td className="p-2 text-right border-r border-slate-200 font-bold">Bs {v.fletesManifiestosBs.toFixed(2)}</td>
                            <td className="p-2 text-right border-r border-slate-200 text-rose-700">-Bs {v.gastosRutaBs.toFixed(2)}</td>
                            <td className={`p-2 text-right border-r border-slate-200 font-black ${v.utilidadViajeBs >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              Bs {v.utilidadViajeBs.toFixed(2)}
                            </td>
                            <td className="p-2 text-right border-r border-slate-200 font-bold text-amber-700">{v.margenPct}%</td>
                            <td className="p-2 text-center text-[10px] whitespace-nowrap">{v.estadoViaje}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-900 bg-slate-100 text-[11px] font-bold">
                        <tr className="bg-slate-200">
                          <td colSpan={4} className="p-2 text-right uppercase tracking-wider text-slate-800">
                            Totales Consolidados ({viajesFiltrados.length} Viajes):
                          </td>
                          <td className="p-2 text-right font-black border-r border-slate-300">
                            Bs {totalesViajes.fletes.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-black text-rose-800 border-r border-slate-300">
                            -Bs {totalesViajes.gastos.toFixed(2)}
                          </td>
                          <td className={`p-2 text-right font-black border-r border-slate-300 ${totalesViajes.utilidad >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                            Bs {totalesViajes.utilidad.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-black text-amber-800 border-r border-slate-300">
                            {totalesViajes.margenProm}%
                          </td>
                          <td className="p-2 text-center">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-12 pt-6 text-center text-[10px] text-slate-600">
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold text-slate-900">Jefe de Operaciones & Flota</p>
                      <p>Firma y Aclaración</p>
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold text-slate-900">Gerencia General & Finanzas</p>
                      <p>Firma y Sello</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN 4: BALANCE OPERATIVO FINANCIERO */}
              {(printSeccion === 'balance_operativo' || printSeccion === 'todo') && (
                <div className={`space-y-4 ${printSeccion === 'todo' ? 'pt-8 border-t-2 border-dashed border-slate-400' : ''}`}>
                  {/* Encabezado Corporativo */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                    <div>
                      <h1 className="text-xl font-black uppercase text-slate-950 tracking-wider">
                        TranspoDrive S.R.L.
                      </h1>
                      <p className="text-[11px] text-slate-600 font-semibold">
                        Transporte Pesado Nacional & Logística de Encomiendas • Bolivia
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-slate-100 text-slate-900 font-mono font-bold text-xs px-3 py-1 rounded border border-slate-300">
                        BALANCE OPERATIVO FINANCIERO
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Fecha: {new Date().toLocaleDateString('es-BO')} {new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Parámetros del Reporte */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Camión / Placa:</span>
                      <strong className="text-slate-900">{filtroPlaca}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Filtro de Viaje:</span>
                      <strong className="text-slate-900">{filtroViaje}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Periodo:</span>
                      <strong className="text-slate-900">
                        {presetFecha === 'mensual' ? `Mes: ${filtroMes}` : 
                         presetFecha === 'personalizado' ? `${fechaDesde || 'Inicio'} a ${fechaHasta || 'Fin'}` :
                         presetFecha === 'este_mes' ? `Mes Actual (${currentMonthStr})` : 'Historial'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Sucursal / Agencia:</span>
                      <strong className="text-slate-900">{filtroSucursal}</strong>
                    </div>
                  </div>

                  {/* Resumen Ejecutivo KPI de Posición Neta: (Cobrado + CxC) - (Pagado + CxP) */}
                  <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 text-xs">
                      <span className="font-bold text-slate-800 uppercase tracking-wider">
                        Ecuación de Posición Neta: (Cobrado + CxC) - (Pagado + CxP)
                      </span>
                      <span className={`font-black text-sm px-2.5 py-0.5 rounded ${
                        balancePosicionNeta.posicionNeta >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {balancePosicionNeta.posicionNeta >= 0 ? 'Superávit: ' : 'Déficit: '}
                        Bs {balancePosicionNeta.posicionNeta.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                      <div>
                        <span className="text-slate-600 block">1. Total Cobrado</span>
                        <strong className="text-xs text-emerald-800 font-bold">
                          Bs {balancePosicionNeta.cobrado.toFixed(2)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-600 block">2. (+) CxC Clientes</span>
                        <strong className="text-xs text-sky-800 font-bold">
                          +Bs {balancePosicionNeta.cxc.toFixed(2)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-600 block">3. Total Pagado</span>
                        <strong className="text-xs text-rose-800 font-bold">
                          -Bs {balancePosicionNeta.pagado.toFixed(2)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-600 block">4. (-) CxP Proveedores</span>
                        <strong className="text-xs text-rose-700 font-bold">
                          -Bs {balancePosicionNeta.cxp.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* 1. Medios de Pago */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 mb-1">1. Desglose de Medios de Pago y Cajas</h4>
                    <div className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-white">
                      <table className="w-full min-w-[750px] text-left text-[11px] border-collapse divide-y divide-slate-200">
                        <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2 border-r border-slate-200">Medio de Pago / Cuenta</th>
                            <th className="p-2 text-right border-r border-slate-200 text-emerald-800">Ingresos Recaudados (Bs)</th>
                            <th className="p-2 text-right border-r border-slate-200 text-rose-800">Egresos Desembolsados (Bs)</th>
                            <th className="p-2 text-right">Saldo Neto (Bs)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {balanceMediosPago.lista.map(m => (
                            <tr key={m.metodo} className="hover:bg-slate-50">
                              <td className="p-2 font-bold border-r border-slate-200">{m.metodo}</td>
                              <td className="p-2 text-right font-bold text-emerald-700 border-r border-slate-200">Bs {m.ingresos.toFixed(2)}</td>
                              <td className="p-2 text-right font-bold text-rose-700 border-r border-slate-200">Bs {m.egresos.toFixed(2)}</td>
                              <td className={`p-2 text-right font-black ${m.saldoNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                Bs {m.saldoNeto.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-900 bg-slate-100 text-[11px] font-bold">
                          <tr className="bg-slate-200">
                            <td className="p-2 uppercase tracking-wider text-slate-800">Totales Medios de Pago:</td>
                            <td className="p-2 text-right font-black text-emerald-800 border-r border-slate-300">
                              Bs {balanceMediosPago.totalIngresos.toFixed(2)}
                            </td>
                            <td className="p-2 text-right font-black text-rose-800 border-r border-slate-300">
                              Bs {balanceMediosPago.totalEgresos.toFixed(2)}
                            </td>
                            <td className="p-2 text-right font-black text-slate-950">
                              Bs {balanceMediosPago.saldoNeto.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* 2. Cuentas por Cobrar (CxC) */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 mb-1">
                      2. Cuentas por Cobrar (CxC) - Clientes ({balanceCxC.pendientes.length} Pendientes)
                    </h4>
                    <div className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-white">
                      <table className="w-full min-w-[850px] text-left text-[11px] border-collapse divide-y divide-slate-200">
                        <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2 border-r border-slate-200">Cliente / Destinatario</th>
                            <th className="p-2 border-r border-slate-200">ID Viaje</th>
                            <th className="p-2 border-r border-slate-200">Sub-Manifiesto</th>
                            <th className="p-2 text-right border-r border-slate-200">Flete Total</th>
                            <th className="p-2 text-right border-r border-slate-200 text-emerald-800">Cobrado</th>
                            <th className="p-2 text-right border-r border-slate-200 text-rose-800">Saldo Pendiente (CxC)</th>
                            <th className="p-2">Teléfono</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {balanceCxC.pendientes.length === 0 ? (
                            <tr><td colSpan={7} className="p-2 text-center text-slate-500">Sin saldos pendientes de cobro.</td></tr>
                          ) : (
                            balanceCxC.pendientes.map(c => (
                              <tr key={c.idSubManifiesto} className="hover:bg-slate-50">
                                <td className="p-2 font-bold border-r border-slate-200">{c.destinatario || '-'}</td>
                                <td className="p-2 font-mono text-sky-800 border-r border-slate-200">{c.idViaje || '-'}</td>
                                <td className="p-2 font-mono border-r border-slate-200">{c.nroManifiesto}</td>
                                <td className="p-2 text-right border-r border-slate-200 font-bold">Bs {c.fleteAsignadoBs.toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-slate-200 text-emerald-700 font-semibold">Bs {c.cobrosRealizadosBs.toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-slate-200 font-black text-rose-700">Bs {c.saldoPendienteClienteBs.toFixed(2)}</td>
                                <td className="p-2">{c.telefonoDestinatario || c.telefonoContacto || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-900 bg-slate-100 text-[11px] font-bold">
                          <tr className="bg-slate-200">
                            <td colSpan={3} className="p-2 text-right uppercase tracking-wider text-slate-800">Totales CxC:</td>
                            <td className="p-2 text-right font-black border-r border-slate-300">Bs {balanceCxC.totalFletes.toFixed(2)}</td>
                            <td className="p-2 text-right font-black text-emerald-800 border-r border-slate-300">Bs {balanceCxC.totalCobrado.toFixed(2)}</td>
                            <td className="p-2 text-right font-black text-rose-800 border-r border-slate-300">Bs {balanceCxC.totalCxCPendiente.toFixed(2)}</td>
                            <td>-</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* 3. Cuentas por Pagar (CxP) */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 mb-1">
                      3. Cuentas por Pagar (CxP) - Proveedores ({balanceCxP.filtradas.length} Pendientes)
                    </h4>
                    <div className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-white">
                      <table className="w-full min-w-[850px] text-left text-[11px] border-collapse divide-y divide-slate-200">
                        <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2 border-r border-slate-200">Proveedor / Razón Social</th>
                            <th className="p-2 border-r border-slate-200">Concepto / Servicio</th>
                            <th className="p-2 border-r border-slate-200">ID Viaje / Camión</th>
                            <th className="p-2 text-right border-r border-slate-200">Monto Facturado</th>
                            <th className="p-2 text-right border-r border-slate-200 text-rose-800">Saldo Pendiente (CxP)</th>
                            <th className="p-2">Vencimiento</th>
                            <th className="p-2 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {balanceCxP.filtradas.length === 0 ? (
                            <tr><td colSpan={7} className="p-2 text-center text-slate-500">Sin deudas pendientes con proveedores.</td></tr>
                          ) : (
                            balanceCxP.filtradas.map(p => (
                              <tr key={p.idCxP} className="hover:bg-slate-50">
                                <td className="p-2 font-bold border-r border-slate-200">{p.nombreProveedor || p.proveedorNombre || '-'}</td>
                                <td className="p-2 border-r border-slate-200">{p.concepto}</td>
                                <td className="p-2 font-mono text-sky-800 border-r border-slate-200">{p.idViaje || p.placaCamion || p.centroCostoPlaca || '-'}</td>
                                <td className="p-2 text-right border-r border-slate-200 font-bold">Bs {p.montoTotalBs.toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-slate-200 font-black text-rose-700">
                                  Bs {(p.saldoPendienteBs ?? p.montoTotalBs).toFixed(2)}
                                </td>
                                <td className="p-2">{p.fechaVencimiento || '-'}</td>
                                <td className="p-2 text-center text-[10px] font-bold">{p.estado}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-900 bg-slate-100 text-[11px] font-bold">
                          <tr className="bg-slate-200">
                            <td colSpan={3} className="p-2 text-right uppercase tracking-wider text-slate-800">Totales CxP:</td>
                            <td className="p-2 text-right font-black border-r border-slate-300">Bs {balanceCxP.totalCxPMontoTotal.toFixed(2)}</td>
                            <td className="p-2 text-right font-black text-rose-800 border-r border-slate-300">Bs {balanceCxP.totalCxPPendiente.toFixed(2)}</td>
                            <td colSpan={2}>-</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {printSeccion !== 'todo' && (
                    <div className="grid grid-cols-2 gap-12 pt-6 text-center text-[10px] text-slate-600">
                      <div className="border-t border-slate-400 pt-1">
                        <p className="font-bold text-slate-900">Jefatura de Finanzas & Cobranzas</p>
                        <p>Firma y Aclaración</p>
                      </div>
                      <div className="border-t border-slate-400 pt-1">
                        <p className="font-bold text-slate-900">Gerencia General & Auditoría</p>
                        <p>Firma y Sello</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECCIÓN 5: ESTADO DE RESULTADOS OPERATIVO */}
              {(printSeccion === 'estado_resultados' || printSeccion === 'todo') && (
                <div className={`space-y-4 ${printSeccion === 'todo' ? 'pt-8 border-t-2 border-dashed border-slate-400' : ''}`}>
                  {/* Encabezado Corporativo */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                    <div>
                      <h1 className="text-xl font-black uppercase text-slate-950 tracking-wider">
                        TranspoDrive S.R.L.
                      </h1>
                      <p className="text-[11px] text-slate-600 font-semibold">
                        Transporte Pesado Nacional & Logística de Encomiendas • Bolivia
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-slate-100 text-slate-900 font-mono font-bold text-xs px-3 py-1 rounded border border-slate-300">
                        ESTADO DE RESULTADOS OPERATIVO (EERR)
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Fecha: {new Date().toLocaleDateString('es-BO')} {new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Parámetros del Reporte */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Camión / Placa:</span>
                      <strong className="text-slate-900">{filtroPlaca}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Viaje Evaluado:</span>
                      <strong className="text-slate-900">{filtroViaje}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Periodo:</span>
                      <strong className="text-slate-900">
                        {presetFecha === 'mensual' ? `Mes: ${filtroMes}` : 
                         presetFecha === 'personalizado' ? `${fechaDesde || 'Inicio'} a ${fechaHasta || 'Fin'}` :
                         presetFecha === 'este_mes' ? `Mes Actual (${currentMonthStr})` : 'Historial'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Sucursal:</span>
                      <strong className="text-slate-900">{filtroSucursal}</strong>
                    </div>
                  </div>

                  {/* Resumen Ejecutivo KPI de EERR */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-2.5 rounded-lg border border-slate-300 text-center text-[10px]">
                    <div>
                      <span className="text-slate-600 block">Ingresos Operativos Totales</span>
                      <strong className="text-xs text-emerald-800 font-black">
                        Bs {eerrResultado.totalIngresos.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Costos y Gastos Totales</span>
                      <strong className="text-xs text-rose-800 font-black">
                        -Bs {eerrResultado.totalGastos.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Utilidad Neta Operativa</span>
                      <strong className={`text-xs font-black ${eerrResultado.utilidadNeta >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {eerrResultado.utilidadNeta >= 0 ? '+' : ''}Bs {eerrResultado.utilidadNeta.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Margen Neto Operativo</span>
                      <strong className="text-xs text-amber-800 font-black">
                        {eerrResultado.margenNetoPct}%
                      </strong>
                    </div>
                  </div>

                  {/* 1. Ingresos Operativos Desglosados */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 mb-1">
                      1. Ingresos Operativos: Total facturado/fletes desglosado por concepto y categoría
                    </h4>
                    <div className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-white">
                      <table className="w-full min-w-[750px] text-left text-[11px] border-collapse divide-y divide-slate-200">
                        <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2 border-r border-slate-200">Concepto / Categoría de Ingreso</th>
                            <th className="p-2 text-center border-r border-slate-200">Nro Operaciones</th>
                            <th className="p-2 text-right border-r border-slate-200 text-emerald-800">Total Facturado / Flete (Bs)</th>
                            <th className="p-2 text-right">% Participación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {eerrIngresos.lista.map(item => (
                            <tr key={item.concepto} className="hover:bg-slate-50">
                              <td className="p-2 font-bold border-r border-slate-200">{item.concepto}</td>
                              <td className="p-2 text-center border-r border-slate-200">{item.operaciones}</td>
                              <td className="p-2 text-right font-bold text-emerald-700 border-r border-slate-200">Bs {item.monto.toFixed(2)}</td>
                              <td className="p-2 text-right font-bold text-amber-800">{item.porcentaje.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-900 bg-slate-100 text-[11px] font-bold">
                          <tr className="bg-slate-200">
                            <td className="p-2 uppercase tracking-wider text-slate-800">Total Ingresos Operativos:</td>
                            <td className="p-2 text-center border-r border-slate-300">{eerrIngresos.lista.reduce((s, i) => s + i.operaciones, 0)}</td>
                            <td className="p-2 text-right font-black text-emerald-800 border-r border-slate-300">
                              Bs {eerrIngresos.totalIngresos.toFixed(2)}
                            </td>
                            <td className="p-2 text-right font-black">100.0%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* 2. Costos y Gastos con Proveedor Asociado */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 mb-1">
                      2. Costos y Gastos Operativos Indicando Proveedor Asociado ({eerrGastos.gastosDetalle.length} Registros)
                    </h4>
                    <div className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-white">
                      <table className="w-full min-w-[850px] text-left text-[11px] border-collapse divide-y divide-slate-200">
                        <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2 border-r border-slate-200">Fecha</th>
                            <th className="p-2 border-r border-slate-200">Categoría</th>
                            <th className="p-2 border-r border-slate-200">Concepto / Detalle</th>
                            <th className="p-2 border-r border-slate-200 font-black text-amber-900">Proveedor Asociado (Tabla Maestra)</th>
                            <th className="p-2 border-r border-slate-200">Viaje / Camión</th>
                            <th className="p-2 text-right text-rose-800">Importe (Bs)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {eerrGastos.gastosDetalle.length === 0 ? (
                            <tr><td colSpan={6} className="p-2 text-center text-slate-500">Sin costos ni gastos en este período.</td></tr>
                          ) : (
                            eerrGastos.gastosDetalle.map(g => (
                              <tr key={g.idTransaccion} className="hover:bg-slate-50">
                                <td className="p-2 font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap">{g.fecha}</td>
                                <td className="p-2 font-bold border-r border-slate-200">{g.categoria}</td>
                                <td className="p-2 border-r border-slate-200">{g.concepto}</td>
                                <td className="p-2 font-bold text-amber-900 border-r border-slate-200">{g.nombreProveedor}</td>
                                <td className="p-2 font-mono text-sky-800 border-r border-slate-200 whitespace-nowrap">{g.idViaje} ({g.placaCamion})</td>
                                <td className="p-2 text-right font-black text-rose-700">Bs {g.montoBs.toFixed(2)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-900 bg-slate-100 text-[11px] font-bold">
                          <tr className="bg-slate-200">
                            <td colSpan={5} className="p-2 text-right uppercase tracking-wider text-slate-800">
                              Total Costos y Gastos ({eerrGastos.gastosDetalle.length} Registros):
                            </td>
                            <td className="p-2 text-right font-black text-rose-800">
                              -Bs {eerrGastos.totalGastos.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 pt-6 text-center text-[10px] text-slate-600">
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold text-slate-900">Contador General</p>
                      <p>Firma y Sello Profesional</p>
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold text-slate-900">Gerencia General</p>
                      <p>Firma y Aclaración</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Modal para Liquidar Cobro de Origen a Caja Central */}
      {liquidarModal.open && liquidarModal.sub && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-base font-extrabold text-slate-800 tracking-tight">
                  Liquidar Cobro de Origen a Caja Central
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setLiquidarModal({ ...liquidarModal, open: false, sub: null })}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="font-semibold text-purple-900">Sub-Manifiesto:</span>
                  <span className="font-mono font-bold text-purple-950">{liquidarModal.sub.nroManifiesto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-purple-900">Agencia de Origen:</span>
                  <span className="font-semibold">{liquidarModal.sub.origenViaje || 'Agencia Origen'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-purple-900">Destinatario:</span>
                  <span className="truncate max-w-[200px]">{liquidarModal.sub.destinatario || '-'}</span>
                </div>
                <div className="flex justify-between border-t border-purple-200/60 pt-1.5">
                  <span className="font-bold text-purple-900">Monto Cobrado en Origen:</span>
                  <span className="font-black text-purple-700 text-sm">
                    Bs {(liquidarModal.sub.pagadoOrigenBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Cuenta origen a liquidar:</span>
                  <span className="font-mono">{liquidarModal.sub.cuentaAfectadaOrigen || 'CxC Agencia Origen'}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Caja / Cuenta Central Receptora:
                </label>
                <select
                  value={liquidarModal.cuentaCentral}
                  onChange={(e) => setLiquidarModal({ ...liquidarModal, cuentaCentral: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
                >
                  {catalogos.cajasCuentas?.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Este abono cancelará la CxC de la agencia y sumará el saldo a esta caja central.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Fecha de Liquidación:
                </label>
                <input
                  type="date"
                  value={liquidarModal.fecha}
                  onChange={(e) => setLiquidarModal({ ...liquidarModal, fecha: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Notas / Nro. Comprobante Depósito:
                </label>
                <input
                  type="text"
                  value={liquidarModal.notas}
                  onChange={(e) => setLiquidarModal({ ...liquidarModal, notas: e.target.value })}
                  placeholder="Ej: Depósito bancario en cuenta o entrega en efectivo"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLiquidarModal({ ...liquidarModal, open: false, sub: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!liquidarModal.sub) return;
                  if (onLiquidarCobroOrigen) {
                    await onLiquidarCobroOrigen(
                      liquidarModal.sub.idSubManifiesto,
                      liquidarModal.cuentaCentral,
                      liquidarModal.fecha,
                      liquidarModal.notas
                    );
                  }
                  setLiquidarModal({ ...liquidarModal, open: false, sub: null });
                }}
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Liquidación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Liquidar Saldos Retenidos por Agencia de Destino */}
      {liquidarAgenciaDestinoModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                  Liquidar Saldo Retenido por Agencia
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLiquidarAgenciaDestinoModal({ ...liquidarAgenciaDestinoModal, open: false })}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Agencia de Destino:</span>
                  <span className="font-bold text-slate-900">{liquidarAgenciaDestinoModal.agencia}</span>
                </div>
                <div className="flex justify-between border-t border-amber-200/60 pt-1.5">
                  <span className="text-slate-600 font-medium">Saldo Retenido Total:</span>
                  <span className="font-black text-amber-900 text-sm">
                    Bs {liquidarAgenciaDestinoModal.montoMax.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Monto a Liquidar / Transferir (Bs) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={liquidarAgenciaDestinoModal.montoMax}
                  value={liquidarAgenciaDestinoModal.montoALiquidar}
                  onChange={(e) => setLiquidarAgenciaDestinoModal({ ...liquidarAgenciaDestinoModal, montoALiquidar: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Cuenta / Caja Destino (Empresa) *
                </label>
                <select
                  value={liquidarAgenciaDestinoModal.cuentaCentral}
                  onChange={(e) => setLiquidarAgenciaDestinoModal({ ...liquidarAgenciaDestinoModal, cuentaCentral: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
                  required
                >
                  <option value="Caja Oficina Central">Caja Oficina Central</option>
                  <option value="Banco Unión Central">Banco Unión Central</option>
                  <option value="Banco Unión QR">Banco Unión QR</option>
                  <option value="Efectivo">Efectivo</option>
                  {catalogos.cajasCuentas?.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Fecha de Depósito / Liquidación *
                </label>
                <input
                  type="date"
                  value={liquidarAgenciaDestinoModal.fecha}
                  onChange={(e) => setLiquidarAgenciaDestinoModal({ ...liquidarAgenciaDestinoModal, fecha: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Notas / Comprobante de Depósito:
                </label>
                <input
                  type="text"
                  value={liquidarAgenciaDestinoModal.notas}
                  onChange={(e) => setLiquidarAgenciaDestinoModal({ ...liquidarAgenciaDestinoModal, notas: e.target.value })}
                  placeholder="Ej: Depósito bancario boleta #123456"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLiquidarAgenciaDestinoModal({ ...liquidarAgenciaDestinoModal, open: false })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onLiquidarSaldosAgenciaDestino && liquidarAgenciaDestinoModal.montoALiquidar > 0) {
                    await onLiquidarSaldosAgenciaDestino(
                      liquidarAgenciaDestinoModal.agencia,
                      liquidarAgenciaDestinoModal.cuentaCentral,
                      liquidarAgenciaDestinoModal.montoALiquidar,
                      liquidarAgenciaDestinoModal.fecha,
                      liquidarAgenciaDestinoModal.notas
                    );
                  }
                  setLiquidarAgenciaDestinoModal({ ...liquidarAgenciaDestinoModal, open: false });
                }}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Liquidación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Estado de Cuenta (Clientes, Agencias y Proveedores) */}
      <EstadoCuentaModal
        isOpen={estadoCuentaModalOpen}
        onClose={() => {
          setEstadoCuentaModalOpen(false);
          setEstadoCuentaEntidad(null);
        }}
        entidad={estadoCuentaEntidad}
        empresa={catalogos.empresa}
      />

      {/* Modal 2: Registrar Cobro Directo de CxC desde Reportes */}
      <RegistrarCobroReporteModal
        isOpen={cobroReporteModalOpen}
        onClose={() => {
          setCobroReporteModalOpen(false);
          setCobroReporteItem(null);
        }}
        item={cobroReporteItem}
        cajasDisponibles={cajasDisponibles}
        onConfirmCobro={handleConfirmCobroReporte}
      />

      {/* Modal 3: Registrar Pago Directo a Proveedores CxP desde Reportes */}
      <RegistrarPagoProveedorModal
        isOpen={pagoProveedorModalOpen}
        onClose={() => {
          setPagoProveedorModalOpen(false);
          setPagoProveedorItem(null);
        }}
        item={pagoProveedorItem}
        cajasDisponibles={cajasDisponibles}
        categorias={categorias}
        onConfirmPago={handleConfirmPagoProveedor}
      />
    </div>
  );
};
