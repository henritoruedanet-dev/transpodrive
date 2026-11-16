import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  Truck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Printer,
  Edit3,
  Trash2,
  Search,
  Filter,
  Calendar,
  Layers,
  FileText,
  Receipt,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  User,
  ShieldCheck,
  Check,
  CreditCard,
  QrCode,
  Banknote,
  MapPin,
  FileDown,
  LayoutList,
  Eye,
  ExternalLink,
  Fuel,
  Wrench,
  RotateCw,
  X
} from 'lucide-react';
import {
  TransaccionDiaria,
  GastoRutaCamion,
  Viaje,
  Catalogos,
  DatosEmpresa,
  ManifiestoOrigen,
  ManifiestoDestino
} from '../types';
import { storage } from '../services/storageService';
import { exportToExcel } from '../utils/exportUtils';
import { PropietariosChoferesModal } from './PropietariosChoferesModal';
import { TransactionReceiptModal } from './TransactionReceiptModal';
import { LiquidacionRutaModal } from './LiquidacionRutaModal';
import { ReporteViajeEconomico } from './ReporteViajeEconomico';

interface PropietariosChoferesViewProps {
  transacciones: TransaccionDiaria[];
  gastosRuta?: GastoRutaCamion[];
  viajes: Viaje[];
  manifiestosOrigen?: ManifiestoOrigen[];
  manifiestosDestino?: ManifiestoDestino[];
  catalogos: Catalogos;
  empresa?: DatosEmpresa;
  onRefreshData?: () => void;
  onEditTransaccion?: (tx: TransaccionDiaria) => void;
  onDeleteTransaccion?: (id: string) => void;
  onDeleteSubManifiesto?: (id: string) => Promise<void> | void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

// Estructura normalizada de transacción unitaria
export interface TransaccionItemSegmento {
  id: string;
  fecha: string;
  tipo: 'Ingreso' | 'Gasto' | 'Traspaso';
  categoria: string;
  metodoPago: string;
  detalle: string;
  ingresoBs: number;
  gastoBs: number;
  idViaje: string;
  placaCamion: string;
  rolUsuario: 'Propietario' | 'Chofer';
  nroManifiesto?: string;
  nombreProveedor?: string;
  nombreCliente?: string;
  comprobanteFotoUrl?: string;
  rawTx: TransaccionDiaria;
  esGastoRutaPuro: boolean;
}

// Estructura consolidada por viaje
export interface ViajeMaestroItem {
  idSegmento: string; // idViaje o '__GENERAL__'
  idReporte: string;
  idViaje: string;
  placaCamion: string;
  centroCosto: string;
  choferAsignado: string;
  origenRuta: string;
  destinosRuta: string;
  nroMICManifiesto: string;
  estadoViaje?: string;
  viajeObj?: Viaje;
  totalIngresosBs: number;
  totalGastosBs: number;
  saldoNetoBs: number;
  transacciones: TransaccionItemSegmento[];
  ingresosAdmin: TransaccionItemSegmento[];
  gastosChofer: TransaccionItemSegmento[];
  gastosAdmin: TransaccionItemSegmento[];
}

export const PropietariosChoferesView: React.FC<PropietariosChoferesViewProps> = ({
  transacciones = [],
  gastosRuta = [],
  viajes = [],
  manifiestosOrigen = [],
  manifiestosDestino = [],
  catalogos,
  empresa,
  onRefreshData,
  onEditTransaccion,
  onDeleteTransaccion,
  onDeleteSubManifiesto,
  showToast
}) => {
  // 1. MODO DE VISTA: [📋 Tabla General] | [📄 Ficha en Detalle] | [📊 Reporte Viaje]
  const [vistaModo, setVistaModo] = useState<'tabla' | 'detalle' | 'reporte'>('tabla');

  // 2. PANEL SUPERIOR DE FILTROS ÁGILES EN UNA LÍNEA ADAPTABLE
  const [filtroViaje, setFiltroViaje] = useState<string>('Todos');
  const [filtroRol, setFiltroRol] = useState<'Todos' | 'Propietarios' | 'Choferes'>('Todos');
  const [filtroPlaca, setFiltroPlaca] = useState<string>('Todas');
  const [busqueda, setBusqueda] = useState<string>('');

  // Viaje seleccionado para el panel Ficha en Detalle
  const [selectedViajeIdFicha, setSelectedViajeIdFicha] = useState<string>('');

  // Viaje seleccionado para el panel Reporte Viaje Económico
  const [selectedViajeIdReporte, setSelectedViajeIdReporte] = useState<string>('');

  // Modales interactivos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRol, setModalRol] = useState<'Propietario' | 'Chofer'>('Propietario');
  const [modalPestaña, setModalPestaña] = useState<'Gasto' | 'Ingreso' | 'Transferencia'>('Gasto');

  // Modal de Liquidación de Ruta completa
  const [liquidacionModalViaje, setLiquidacionModalViaje] = useState<Viaje | null>(null);

  // Modal de impresión de recibo individual
  const [receiptTx, setReceiptTx] = useState<TransaccionDiaria | null>(null);

  // Visor de foto comprobante
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);

  // Control de acordeón / expansión de filas en vista tabla (por defecto expandidas)
  const [filasExpandidas, setFilasExpandidas] = useState<Record<string, boolean>>({});

  const toggleFila = (idSegmento: string) => {
    setFilasExpandidas(prev => ({
      ...prev,
      [idSegmento]: !prev[idSegmento]
    }));
  };

  const expandirTodas = () => {
    const exp: Record<string, boolean> = {};
    viajesMaestros.forEach(v => { exp[v.idSegmento] = true; });
    setFilasExpandidas(exp);
  };

  const colapsarTodas = () => setFilasExpandidas({});

  // Abrir modal de captura ágil continua
  const handleOpenModal = (rol: 'Propietario' | 'Chofer', pestaña: 'Gasto' | 'Ingreso' | 'Transferencia' = 'Gasto') => {
    setModalRol(rol);
    setModalPestaña(pestaña);
    setIsModalOpen(true);
  };

  // Placas únicas disponibles para el selector
  const listaPlacas = useMemo(() => {
    const set = new Set<string>();
    (catalogos?.camiones || []).forEach(c => { if (c.placa) set.add(c.placa); });
    viajes.forEach(v => { if (v.placaCamion) set.add(v.placaCamion); });
    transacciones.forEach(t => { if (t.placaCamion) set.add(t.placaCamion); });
    gastosRuta.forEach(g => { if (g.placaCamion) set.add(g.placaCamion); });
    return Array.from(set).sort();
  }, [catalogos, viajes, transacciones, gastosRuta]);

  // Mapa rápido de viajes
  const viajesMap = useMemo(() => {
    const map = new Map<string, Viaje>();
    viajes.forEach(v => map.set(v.idViaje, v));
    return map;
  }, [viajes]);

  // Mapa de Reportes de Chofer
  const reportesChoferMap = useMemo(() => {
    const reportes = storage.getReportesChofer();
    const map = new Map<string, typeof reportes[0]>();
    reportes.forEach(r => {
      if (r.idViaje) map.set(r.idViaje, r);
    });
    return map;
  }, []);

  // 1. UNIFICACIÓN DE TODAS LAS TRANSACCIONES (Propietarios + Choferes)
  const todasLasTransacciones = useMemo<TransaccionItemSegmento[]>(() => {
    const lista: TransaccionItemSegmento[] = [];
    const existingTxIds = new Set<string>();

    // A. Transacciones de Transacciones_Diarias
    (transacciones || []).forEach(t => {
      existingTxIds.add(t.idTransaccion);
      const isChofer = t.rolUsuario === 'Chofer' || t.origenRegistro === 'Reporte_Chofer';
      const rol: 'Propietario' | 'Chofer' = isChofer ? 'Chofer' : 'Propietario';
      const monto = Number(t.montoBs || 0);
      const isIng = t.tipo === 'Ingreso';

      lista.push({
        id: t.idTransaccion,
        fecha: t.fecha || '',
        tipo: t.tipo as 'Ingreso' | 'Gasto' | 'Traspaso',
        categoria: t.categoria || (isChofer ? 'Gasto de Ruta' : 'Operación Propietario'),
        metodoPago: t.metodoPago || (isChofer ? 'Efectivo Chofer' : 'Banco / Transferencia'),
        detalle: t.notas || '-',
        ingresoBs: isIng ? monto : 0,
        gastoBs: !isIng ? monto : 0,
        idViaje: t.idViaje ? t.idViaje.trim() : '',
        placaCamion: t.placaCamion || '',
        rolUsuario: rol,
        nroManifiesto: t.nroManifiesto || t.nroFacturaBoleta || '',
        nombreProveedor: t.nombreProveedor,
        nombreCliente: t.nombreCliente || t.deudorNombre,
        comprobanteFotoUrl: t.comprobanteFotoUrl,
        rawTx: t,
        esGastoRutaPuro: false
      });
    });

    // B. Gastos de Ruta del Chofer (Gastos_Ruta_Camion)
    (gastosRuta || []).forEach(g => {
      if (!existingTxIds.has(g.idGastoRuta)) {
        const isIng = g.tipoOperacion === 'Ingreso';
        const fechaLimpia = g.fechaHora ? g.fechaHora.split(' ')[0] : new Date().toISOString().split('T')[0];
        const monto = Number(g.importeBs || 0);

        const virtualTx: TransaccionDiaria = {
          idTransaccion: g.idGastoRuta,
          tipo: isIng ? 'Ingreso' : 'Gasto',
          fecha: fechaLimpia,
          categoria: g.categoriaGasto || 'Gasto Operativo Ruta',
          montoBs: monto,
          metodoPago: g.cajaCuentaUtilizada || 'Efectivo Chofer Ruta',
          notas: g.detalleGasto || '',
          idViaje: g.idViajeAsignado,
          placaCamion: g.placaCamion,
          nroFacturaBoleta: g.nroFacturaBoleta,
          idProveedor: g.idProveedor,
          nombreProveedor: g.nombreProveedor,
          idCliente: g.idCliente,
          nombreCliente: g.nombreCliente,
          rolUsuario: 'Chofer',
          origenRegistro: 'Reporte_Chofer',
          comprobanteFotoUrl: g.comprobanteFotoUrl
        };

        lista.push({
          id: g.idGastoRuta,
          fecha: fechaLimpia,
          tipo: isIng ? 'Ingreso' : 'Gasto',
          categoria: g.categoriaGasto || 'Gasto Ruta',
          metodoPago: g.cajaCuentaUtilizada || 'Efectivo Chofer',
          detalle: g.detalleGasto || '-',
          ingresoBs: isIng ? monto : 0,
          gastoBs: !isIng ? monto : 0,
          idViaje: g.idViajeAsignado ? g.idViajeAsignado.trim() : '',
          placaCamion: g.placaCamion || '',
          rolUsuario: 'Chofer',
          nroManifiesto: g.nroFacturaBoleta || '',
          nombreProveedor: g.nombreProveedor,
          nombreCliente: g.nombreCliente,
          comprobanteFotoUrl: g.comprobanteFotoUrl,
          rawTx: virtualTx,
          esGastoRutaPuro: true
        });
      }
    });

    return lista;
  }, [transacciones, gastosRuta]);

  // 2. APLICAR FILTROS (Viaje, Rol/Perfil, Camión/Centro de Costo, Búsqueda)
  const transaccionesFiltradas = useMemo(() => {
    return todasLasTransacciones.filter(t => {
      // Filtro por Viaje
      if (filtroViaje !== 'Todos' && t.idViaje !== filtroViaje) return false;

      // Filtro por Rol / Perfil: [Todos] | [Propietarios] | [Choferes]
      if (filtroRol === 'Propietarios' && t.rolUsuario !== 'Propietario') return false;
      if (filtroRol === 'Choferes' && t.rolUsuario !== 'Chofer') return false;

      // Filtro por Camión / Placa (Centro de Costo)
      if (filtroPlaca !== 'Todas') {
        const viajeObj = t.idViaje ? viajesMap.get(t.idViaje) : undefined;
        const placaEfectiva = t.placaCamion || viajeObj?.placaCamion;
        if (placaEfectiva !== filtroPlaca) return false;
      }

      // Buscador ágil por texto
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const match =
          t.categoria.toLowerCase().includes(q) ||
          t.detalle.toLowerCase().includes(q) ||
          t.idViaje.toLowerCase().includes(q) ||
          t.placaCamion.toLowerCase().includes(q) ||
          (t.nroManifiesto || '').toLowerCase().includes(q) ||
          (t.metodoPago || '').toLowerCase().includes(q) ||
          (t.nombreProveedor || '').toLowerCase().includes(q) ||
          (t.nombreCliente || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [todasLasTransacciones, filtroViaje, filtroRol, filtroPlaca, busqueda, viajesMap]);

  // 3. CONSOLIDACIÓN DE FILAS MAESTRAS DE VIAJE
  const viajesMaestros = useMemo<ViajeMaestroItem[]>(() => {
    const grupos = new Map<string, TransaccionItemSegmento[]>();

    // Inicializar viajes que coincidan con los filtros de viaje y placa
    viajes.forEach(v => {
      if (filtroViaje !== 'Todos' && v.idViaje !== filtroViaje) return;
      if (filtroPlaca !== 'Todas' && v.placaCamion !== filtroPlaca) return;
      grupos.set(v.idViaje, []);
    });

    // Asignar transacciones filtradas
    transaccionesFiltradas.forEach(tx => {
      const key = tx.idViaje ? tx.idViaje : '__GENERAL__';
      if (!grupos.has(key)) {
        if (filtroViaje !== 'Todos' && key !== filtroViaje) return;
        grupos.set(key, []);
      }
      grupos.get(key)!.push(tx);
    });

    const lista: ViajeMaestroItem[] = [];

    grupos.forEach((txs, key) => {
      const isGeneral = key === '__GENERAL__';
      const viajeObj = !isGeneral ? viajesMap.get(key) : undefined;
      const reporteObj = !isGeneral ? reportesChoferMap.get(key) : undefined;

      // Descartar viajes vacíos si hay búsqueda de texto activa
      if (txs.length === 0 && busqueda.trim()) return;
      if (isGeneral && txs.length === 0) return;

      const placa = viajeObj?.placaCamion || txs.find(i => i.placaCamion)?.placaCamion || (isGeneral ? 'Sede Central' : 'S/P');
      const chofer = viajeObj?.choferAsignado || (isGeneral ? 'Administración / Propietario' : 'Sin Chofer');
      const centroCosto = (viajeObj as any)?.centroCosto || `CC-${placa.replace(/\s+/g, '')}`;

      // Origen / Ruta
      const origen = viajeObj?.origen || reporteObj?.rutaOrigen || (isGeneral ? 'Sede Central' : 'Oruro');

      // Destino(s)
      let destinos = viajeObj?.destino || reporteObj?.rutaDestino || '';
      if (!destinos && !isGeneral) {
        const destSet = new Set<string>();
        manifiestosDestino.filter(m => m.idViaje === key).forEach(m => {
          if (m.sucursalDestino) destSet.add(m.sucursalDestino);
        });
        destinos = Array.from(destSet).join(', ') || 'Tarija';
      } else if (isGeneral) {
        destinos = 'Operación Nacional';
      }

      // Nro. MIC / Manifiesto
      let micManifiesto = reporteObj?.manifiestosAsociados || '';
      if (!micManifiesto && !isGeneral) {
        const mics = new Set<string>();
        manifiestosOrigen.filter(m => m.idViajeAsignado === key && m.nroManifiestoMIC).forEach(m => mics.add(m.nroManifiestoMIC));
        manifiestosDestino.filter(m => m.idViaje === key && m.nroManifiesto).forEach(m => mics.add(m.nroManifiesto));
        txs.forEach(t => {
          if (t.nroManifiesto && t.nroManifiesto !== 'S/N') mics.add(t.nroManifiesto);
        });
        micManifiesto = Array.from(mics).join(', ') || 'MIC-S/N';
      } else if (isGeneral) {
        micManifiesto = 'N/A';
      }

      // ID Reporte
      const idReporte = isGeneral
        ? `REP-ADM-${new Date().getFullYear()}`
        : (reporteObj?.idReporteChofer || `REP-VIAJE-${key}`);

      // Orden cronológico
      txs.sort((a, b) => b.fecha.localeCompare(a.fecha));

      const totalIng = txs.reduce((sum, i) => sum + i.ingresoBs, 0);
      const totalGas = txs.reduce((sum, i) => sum + i.gastoBs, 0);
      const saldoNeto = totalIng - totalGas;

      const ingresosAdmin = txs.filter(t => t.tipo === 'Ingreso' && t.rolUsuario === 'Propietario');
      const gastosChofer = txs.filter(t => t.tipo === 'Gasto' && t.rolUsuario === 'Chofer');
      const gastosAdmin = txs.filter(t => t.tipo === 'Gasto' && t.rolUsuario === 'Propietario');

      lista.push({
        idSegmento: key,
        idReporte,
        idViaje: isGeneral ? 'Transacciones Centrales / Admin' : key,
        placaCamion: placa,
        centroCosto,
        choferAsignado: chofer,
        origenRuta: origen,
        destinosRuta: destinos,
        nroMICManifiesto: micManifiesto,
        estadoViaje: viajeObj?.estadoViaje,
        viajeObj,
        totalIngresosBs: totalIng,
        totalGastosBs: totalGas,
        saldoNetoBs: saldoNeto,
        transacciones: txs,
        ingresosAdmin,
        gastosChofer,
        gastosAdmin
      });
    });

    lista.sort((a, b) => {
      if (a.idSegmento === '__GENERAL__') return 1;
      if (b.idSegmento === '__GENERAL__') return -1;
      return b.idSegmento.localeCompare(a.idSegmento);
    });

    return lista;
  }, [viajes, transaccionesFiltradas, filtroViaje, filtroPlaca, busqueda, viajesMap, reportesChoferMap, manifiestosOrigen, manifiestosDestino]);

  // Selección automática de viaje para Ficha en Detalle
  const viajeSeleccionadoFicha = useMemo(() => {
    if (viajesMaestros.length === 0) return null;
    if (selectedViajeIdFicha) {
      const found = viajesMaestros.find(v => v.idSegmento === selectedViajeIdFicha);
      if (found) return found;
    }
    return viajesMaestros[0];
  }, [viajesMaestros, selectedViajeIdFicha]);

  // Totales Globales
  const totalesGenerales = useMemo(() => {
    let ing = 0;
    let gas = 0;
    viajesMaestros.forEach(v => {
      ing += v.totalIngresosBs;
      gas += v.totalGastosBs;
    });
    return {
      ingresos: ing,
      gastos: gas,
      saldo: ing - gas,
      totalViajes: viajesMaestros.length,
      totalTransacciones: transaccionesFiltradas.length
    };
  }, [viajesMaestros, transaccionesFiltradas]);

  // Exportar a Excel con formato tabular completo
  const handleExportarExcel = () => {
    if (viajesMaestros.length === 0) {
      showToast('No hay datos visibles para exportar.', 'warning');
      return;
    }

    try {
      const fechaHoy = new Date().toISOString().split('T')[0];
      const rowsExport: Record<string, any>[] = [];

      viajesMaestros.forEach(v => {
        // Fila Resumen de Viaje
        rowsExport.push({
          Jerarquia: 'RESUMEN VIAJE',
          'ID Viaje': v.idViaje,
          'Placa Camion': v.placaCamion,
          'Centro Costo': v.centroCosto,
          'Chofer Asignado': v.choferAsignado,
          'Ruta Origen': v.origenRuta,
          'Ruta Destino': v.destinosRuta,
          'Nro MIC / Manifiesto': v.nroMICManifiesto,
          'Total Ingreso (Bs)': v.totalIngresosBs,
          'Total Gasto (Bs)': v.totalGastosBs,
          'Saldo Neto (Bs)': v.saldoNetoBs,
          'Fecha Tx': '',
          'Tipo Operacion': '',
          'Categoria / Concepto': '',
          'Metodo Pago': '',
          'Detalle / Glosa': '',
          'Rol Ejecutor': ''
        });

        // Filas de Detalle de Transacciones
        v.transacciones.forEach(tx => {
          rowsExport.push({
            Jerarquia: '  > TRANSACCION',
            'ID Viaje': v.idViaje,
            'Placa Camion': tx.placaCamion || v.placaCamion,
            'Centro Costo': v.centroCosto,
            'Chofer Asignado': v.choferAsignado,
            'Ruta Origen': '',
            'Ruta Destino': '',
            'Nro MIC / Manifiesto': tx.nroManifiesto || '',
            'Total Ingreso (Bs)': tx.ingresoBs > 0 ? tx.ingresoBs : 0,
            'Total Gasto (Bs)': tx.gastoBs > 0 ? tx.gastoBs : 0,
            'Saldo Neto (Bs)': tx.ingresoBs - tx.gastoBs,
            'Fecha Tx': tx.fecha,
            'Tipo Operacion': tx.tipo,
            'Categoria / Concepto': tx.categoria,
            'Metodo Pago': tx.metodoPago,
            'Detalle / Glosa': tx.detalle,
            'Rol Ejecutor': tx.rolUsuario
          });
        });
      });

      // Fila de Sumatoria General
      rowsExport.push({
        Jerarquia: '=== TOTALES GENERALES ===',
        'ID Viaje': `Total ${viajesMaestros.length} Viajes / ${transaccionesFiltradas.length} Movimientos`,
        'Placa Camion': '',
        'Centro Costo': '',
        'Chofer Asignado': '',
        'Ruta Origen': '',
        'Ruta Destino': '',
        'Nro MIC / Manifiesto': '',
        'Total Ingreso (Bs)': totalesGenerales.ingresos,
        'Total Gasto (Bs)': totalesGenerales.gastos,
        'Saldo Neto (Bs)': totalesGenerales.saldo,
        'Fecha Tx': '',
        'Tipo Operacion': '',
        'Categoria / Concepto': '',
        'Metodo Pago': '',
        'Detalle / Glosa': '',
        'Rol Ejecutor': ''
      });

      exportToExcel(rowsExport, `Reporte_Propietarios_Choferes_${fechaHoy}`, 'Viajes_y_Liquidacion');
      showToast('Reporte en Excel descargado exitosamente.', 'success');
    } catch (err: any) {
      showToast(`Error al exportar: ${err.message || 'Error inesperado'}`, 'warning');
    }
  };

  // Eliminar transacción
  const handleDeleteTx = (item: TransaccionItemSegmento) => {
    const desc = item.categoria || item.detalle;
    const monto = item.ingresoBs > 0 ? item.ingresoBs : item.gastoBs;
    if (confirm(`¿Estás seguro de eliminar el registro "${desc}" por Bs. ${monto.toFixed(2)}?`)) {
      if (item.esGastoRutaPuro) {
        storage.deleteGastoRuta(item.id);
      } else {
        if (onDeleteTransaccion) {
          onDeleteTransaccion(item.id);
        } else {
          storage.deleteTransaccion(item.id);
        }
      }
      if (onRefreshData) onRefreshData();
      showToast('Registro eliminado con éxito.', 'info');
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      
      {/* ======================================================== */}
      {/* CABECERA EJECUTIVA: TÍTULO, ACCIONES PRINCIPALES Y KPIs */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Módulo Propietarios / Choferes
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80 px-2 py-0.5 rounded-full hidden sm:inline">
                  Control Ejecutivo
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Auditoría por Viaje • Centro de Costo • Rendición de Cuentas y Margen Operativo
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Registro Ágil */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => handleOpenModal('Propietario', 'Gasto')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            title="Registrar Transacciones de Propietario"
          >
            <Building2 className="w-4 h-4" />
            <span>+ Transacciones Propietario</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenModal('Chofer', 'Gasto')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            title="Registrar Transacciones de Chofer"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            <span>+ Transacciones Chofer</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenModal('Propietario', 'Transferencia')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            title="Registrar Transferencia entre Cuentas o Cajas"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-200" />
            <span>⇄ Transferencia</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. BARRA SUPERIOR DE FILTROS Y ACCIONES EJECUTIVAS */}
      {/* ======================================================== */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        
        {/* Panel Superior de Filtros Ágiles en una sola línea adaptable */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          
          {/* A. Filtro por Viaje (Selector desplegable o buscador por ID_Viaje) */}
          <div className="flex items-center gap-1.5 min-w-[190px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
              Viaje:
            </span>
            <select
              value={filtroViaje}
              onChange={(e) => setFiltroViaje(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 font-mono outline-none cursor-pointer transition-colors"
            >
              <option value="Todos">Todos los Viajes ({viajes.length})</option>
              {viajes.map(v => (
                <option key={v.idViaje} value={v.idViaje}>
                  {v.idViaje} • {v.placaCamion} ({v.estadoViaje})
                </option>
              ))}
            </select>
          </div>

          {/* B. Filtro por Rol / Perfil: [Todos] | [Propietarios] | [Choferes] */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0 hidden sm:inline">
              Perfil:
            </span>
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setFiltroRol('Todos')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filtroRol === 'Todos' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroRol('Propietarios')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filtroRol === 'Propietarios' ? 'bg-blue-600 text-white shadow-xs font-black' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Propietarios
              </button>
              <button
                type="button"
                onClick={() => setFiltroRol('Choferes')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filtroRol === 'Choferes' ? 'bg-slate-900 text-amber-400 shadow-xs font-black' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Choferes
              </button>
            </div>
          </div>

          {/* C. Filtro por Camión / Centro de Costo (Selector por placa de camión) */}
          <div className="flex items-center gap-1.5 min-w-[170px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0 hidden md:inline">
              Camión:
            </span>
            <select
              value={filtroPlaca}
              onChange={(e) => setFiltroPlaca(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 font-mono outline-none cursor-pointer transition-colors"
            >
              <option value="Todas">🚛 Todas las Placas ({listaPlacas.length})</option>
              {listaPlacas.map(placa => (
                <option key={placa} value={placa}>🚛 {placa}</option>
              ))}
            </select>
          </div>

          {/* Buscador de Texto Ágil */}
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar detalle, cuenta, notas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

        </div>

        {/* Acciones del Extremo Derecho: Botón Excel y Botones de Alternancia de Vista */}
        <div className="flex flex-wrap items-center gap-2.5 self-end xl:self-center">
          
          {/* BOTÓN DE EXPORTACIÓN A EXCEL: [📥 Exportar a Excel] con icono verde distintivo */}
          <button
            type="button"
            onClick={handleExportarExcel}
            className="px-3.5 py-2 bg-[#107c41] hover:bg-[#0e6b37] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
            title="Exportar vista filtrada a Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>📥 Exportar a Excel</span>
          </button>

          {/* BOTONES DE ALTERNANCIA DE VISTA (Estilo idéntico a Liquidación de Viajes) */}
          <div className="bg-[#f4f6fa] border border-[#e2e8f0] p-1 rounded-xl flex items-center gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setVistaModo('tabla')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                vistaModo === 'tabla'
                  ? 'bg-[#1d4ed8] text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver tabla general condensada por filas de viaje"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>📋 Tabla General</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaModo('detalle')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                vistaModo === 'detalle'
                  ? 'bg-[#1d4ed8] text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver fichas de liquidación ejecutiva por viaje"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>📄 Ficha en Detalle</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaModo('reporte')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                vistaModo === 'reporte'
                  ? 'bg-[#1d4ed8] text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver reporte económico integrado del viaje (Chofer + Admin)"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>📊 Reporte Viaje</span>
            </button>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. VISTA DE TABLA MAESTRA POR FILAS DE VIAJE */}
      {/* ======================================================== */}
      {vistaModo === 'tabla' && (
        <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          
          {/* Barra de cabecera de la tabla maestra con botones de expansión */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Tabla Maestra Consolidada por Viaje ({viajesMaestros.length} Unidades / Rutas)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Haz clic en cualquier fila para desplegar de forma fluida el desglose de transacciones internas.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandirTodas}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-2xs"
              >
                Expandir Todo
              </button>
              <button
                type="button"
                onClick={colapsarTodas}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-2xs"
              >
                Colapsar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              
              {/* Encabezados solicitados */}
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 text-[11px] uppercase font-black border-b border-slate-200">
                  <th className="py-3 px-3 w-8 text-center"></th>
                  <th className="py-3 px-3 w-36">ID Viaje</th>
                  <th className="py-3 px-3">Camión (Placa) Chofer Asignado</th>
                  <th className="py-3 px-3">Ruta Asignada / MIC</th>
                  <th className="py-3 px-3 text-right w-36">Total Ingreso (Bs.)</th>
                  <th className="py-3 px-3 text-right w-36">Total Gasto (Bs.)</th>
                  <th className="py-3 px-3 text-right w-36">Saldo Neto / Utilidad (Bs.)</th>
                  <th className="py-3 px-3 text-center w-28">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200/70 text-xs">
                {viajesMaestros.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400 font-medium">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-2">
                        <Truck className="w-6 h-6" />
                      </div>
                      No se encontraron viajes ni transacciones para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  viajesMaestros.map((viaje) => {
                    const isExpanded = Boolean(filasExpandidas[viaje.idSegmento]);
                    const saldoPositivo = viaje.saldoNetoBs >= 0;

                    return (
                      <React.Fragment key={viaje.idSegmento}>
                        
                        {/* FILA MAESTRA CONDENSADA */}
                        <tr
                          onClick={() => toggleFila(viaje.idSegmento)}
                          className={`cursor-pointer transition-colors ${
                            isExpanded ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-slate-50/90'
                          }`}
                        >
                          {/* Indicador de expansión */}
                          <td className="py-3 px-3 text-center text-slate-400">
                            <button
                              type="button"
                              className="p-1 rounded-lg hover:bg-slate-200/80 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFila(viaje.idSegmento);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-blue-600 font-black" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </td>

                          {/* 1. ID Viaje (con estilo badge monoespaciado) */}
                          <td className="py-3 px-3 font-mono font-black text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-[11px] shadow-2xs">
                                {viaje.idViaje}
                              </span>
                              {viaje.estadoViaje && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                  viaje.estadoViaje === 'En Tránsito'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {viaje.estadoViaje}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans font-medium mt-0.5 truncate max-w-[140px]">
                              {viaje.idReporte}
                            </div>
                          </td>

                          {/* 2. Camión (Placa) Chofer Asignado */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-800 flex items-center gap-1">
                              <span>🚛 {viaje.placaCamion}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({viaje.centroCosto})</span>
                            </div>
                            <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{viaje.choferAsignado}</span>
                            </div>
                          </td>

                          {/* 3. Ruta Asignada / MIC */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 font-semibold text-slate-800">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{viaje.origenRuta} ➔ {viaje.destinosRuta}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              MIC: {viaje.nroMICManifiesto}
                            </div>
                          </td>

                          {/* 4. Total Ingreso (Bs.) (alineado a la derecha, tabular-nums, color verde) */}
                          <td className="py-3 px-3 text-right font-black tabular-nums text-xs sm:text-sm text-emerald-700 whitespace-nowrap">
                            + Bs. {viaje.totalIngresosBs.toFixed(2)}
                          </td>

                          {/* 5. Total Gasto (Bs.) (alineado a la derecha, tabular-nums, color rojo/slate) */}
                          <td className="py-3 px-3 text-right font-black tabular-nums text-xs sm:text-sm text-rose-700 whitespace-nowrap">
                            - Bs. {viaje.totalGastosBs.toFixed(2)}
                          </td>

                          {/* 6. Saldo Neto / Utilidad (Bs.) (en negrita) */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-1 rounded-xl font-black tabular-nums text-xs sm:text-sm border ${
                              saldoPositivo
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              Bs. {viaje.saldoNetoBs.toFixed(2)}
                            </span>
                          </td>

                          {/* 7. Acciones rápidas por fila */}
                          <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              {/* Botón Liquidación Completa */}
                              {viaje.viajeObj && (
                                <button
                                  type="button"
                                  onClick={() => setLiquidacionModalViaje(viaje.viajeObj || null)}
                                  title="Ver Liquidación de Ruta Completa"
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Liquidación</span>
                                </button>
                              )}

                              {/* Botón Reporte Viaje Económico */}
                              {viaje.idViaje && viaje.idViaje !== '__GENERAL__' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedViajeIdReporte(viaje.idViaje);
                                    setVistaModo('reporte');
                                  }}
                                  title="Ver Reporte Económico Integrado del Viaje (Chofer + Admin)"
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <TrendingUp className="w-3 h-3" />
                                  <span>Reporte</span>
                                </button>
                              )}

                              {/* Ver Ficha */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedViajeIdFicha(viaje.idSegmento);
                                  setVistaModo('detalle');
                                }}
                                title="Ver Ficha en Detalle"
                                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>

                        {/* INTERACTIVIDAD DE LA FILA: SUB-TABLA INTERNA DESPLEGABLE (ACORDEÓN) */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-0 bg-slate-50/70 border-y-2 border-slate-200">
                              <div className="p-4 sm:p-6 space-y-3 animate-in fade-in duration-150">
                                
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                      <Layers className="w-4 h-4 text-blue-600" />
                                      Desglose Cronológico de Transacciones • {viaje.idViaje}
                                    </span>
                                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                                      {viaje.transacciones.length} Movimientos
                                    </span>
                                  </div>
                                  
                                  <div className="text-xs text-slate-500 font-medium">
                                    Placa: <strong className="font-mono text-slate-800">{viaje.placaCamion}</strong> | Chofer: <strong className="text-slate-800">{viaje.choferAsignado}</strong>
                                  </div>
                                </div>

                                {/* Sub-tabla interior */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200">
                                        <th className="py-2.5 px-3">Fecha</th>
                                        <th className="py-2.5 px-3">Tipo</th>
                                        <th className="py-2.5 px-3">Categoría</th>
                                        <th className="py-2.5 px-3">Método de Pago / Cuenta</th>
                                        <th className="py-2.5 px-3">Detalle / Notas</th>
                                        <th className="py-2.5 px-3 text-right">Monto Ingreso (Bs.)</th>
                                        <th className="py-2.5 px-3 text-right">Monto Gasto (Bs.)</th>
                                        <th className="py-2.5 px-3 text-center w-24">Acciones</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                      {viaje.transacciones.length === 0 ? (
                                        <tr>
                                          <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                                            No hay transacciones registradas para este viaje con los filtros actuales.
                                          </td>
                                        </tr>
                                      ) : (
                                        viaje.transacciones.map(tx => {
                                          const isIng = tx.tipo === 'Ingreso';

                                          return (
                                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                              {/* Fecha */}
                                              <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                                                {tx.fecha}
                                              </td>

                                              {/* Tipo (Badge Ingreso/Gasto) */}
                                              <td className="py-2.5 px-3 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide inline-flex items-center gap-1 ${
                                                  isIng
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                  {isIng ? (
                                                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                                                  ) : (
                                                    <TrendingDown className="w-3 h-3 text-rose-600" />
                                                  )}
                                                  {tx.tipo}
                                                </span>
                                                <span className="text-[9px] text-slate-400 ml-1">({tx.rolUsuario})</span>
                                              </td>

                                              {/* Categoría */}
                                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                                <div>{tx.categoria}</div>
                                                {(tx.nombreProveedor || tx.nombreCliente) && (
                                                  <div className="text-[10px] text-slate-500 font-medium">
                                                    {tx.nombreProveedor ? `Prov: ${tx.nombreProveedor}` : `Cliente: ${tx.nombreCliente}`}
                                                  </div>
                                                )}
                                              </td>

                                              {/* Método de Pago / Cuenta */}
                                              <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                  {tx.metodoPago.toLowerCase().includes('qr') ? (
                                                    <QrCode className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                  ) : tx.metodoPago.toLowerCase().includes('transferencia') || tx.metodoPago.toLowerCase().includes('banco') ? (
                                                    <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                  ) : (
                                                    <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                  )}
                                                  <span className="truncate max-w-[130px]" title={tx.metodoPago}>
                                                    {tx.metodoPago}
                                                  </span>
                                                </div>
                                              </td>

                                              {/* Detalle / Notas */}
                                              <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={tx.detalle}>
                                                {tx.detalle}
                                              </td>

                                              {/* Monto Ingreso */}
                                              <td className="py-2.5 px-3 text-right font-black tabular-nums text-emerald-700 whitespace-nowrap">
                                                {tx.ingresoBs > 0 ? `+ Bs. ${tx.ingresoBs.toFixed(2)}` : '-'}
                                              </td>

                                              {/* Monto Gasto */}
                                              <td className="py-2.5 px-3 text-right font-black tabular-nums text-rose-700 whitespace-nowrap">
                                                {tx.gastoBs > 0 ? `- Bs. ${tx.gastoBs.toFixed(2)}` : '-'}
                                              </td>

                                              {/* Acciones unitarias (Imprimir 🖨️, Editar ✏️, Eliminar 🗑️) */}
                                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                  {/* Ver comprobante foto */}
                                                  {tx.comprobanteFotoUrl && (
                                                    <button
                                                      type="button"
                                                      onClick={() => setFotoModalUrl(tx.comprobanteFotoUrl || null)}
                                                      title="Ver foto del comprobante"
                                                      className="p-1 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                                                    >
                                                      📷
                                                    </button>
                                                  )}
                                                  {/* Imprimir 🖨️ */}
                                                  <button
                                                    type="button"
                                                    onClick={() => setReceiptTx(tx.rawTx)}
                                                    title="Imprimir Comprobante"
                                                    className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                                  >
                                                    🖨️
                                                  </button>
                                                  {/* Editar ✏️ */}
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      if (onEditTransaccion) {
                                                        onEditTransaccion(tx.rawTx);
                                                      } else {
                                                        showToast('Abriendo editor...', 'info');
                                                      }
                                                    }}
                                                    title="Editar Transacción"
                                                    className="p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                  >
                                                    ✏️
                                                  </button>
                                                  {/* Eliminar 🗑️ */}
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteTx(tx)}
                                                    title="Eliminar Transacción"
                                                    className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                                                  >
                                                    🗑️
                                                  </button>
                                                </div>
                                              </td>

                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>

                                    {/* Sumatoria exacta del segmento al pie */}
                                    <tfoot>
                                      <tr className="bg-slate-50 font-black text-xs text-slate-800 border-t-2 border-slate-300">
                                        <td colSpan={5} className="py-2.5 px-3 uppercase text-slate-500 tracking-wider">
                                          Sumatoria Segmento {viaje.idViaje}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-emerald-700 tabular-nums">
                                          + Bs. {viaje.totalIngresosBs.toFixed(2)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-rose-700 tabular-nums">
                                          - Bs. {viaje.totalGastosBs.toFixed(2)}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black tabular-nums ${
                                            saldoPositivo ? 'text-emerald-800 bg-emerald-100' : 'text-rose-800 bg-rose-100'
                                          }`}>
                                            = Bs. {viaje.saldoNetoBs.toFixed(2)}
                                          </span>
                                        </td>
                                      </tr>
                                    </tfoot>

                                  </table>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}

                      </React.Fragment>
                    );
                  })
                )}
              </tbody>

              {/* Fila final de Totales Consolidados */}
              {viajesMaestros.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-black text-xs text-slate-900 border-t-2 border-slate-400">
                    <td colSpan={4} className="py-3.5 px-4 uppercase tracking-wider text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">TOTALES CONSOLIDADOS:</span>
                        <span className="font-normal text-slate-500">
                          ({viajesMaestros.length} viajes evaluados)
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-sm font-black text-emerald-700">
                      + Bs. {totalesGenerales.ingresos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-sm font-black text-rose-700">
                      - Bs. {totalesGenerales.gastos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-sm font-black text-slate-900">
                      <span className={`px-3 py-1 rounded-xl border ${
                        totalesGenerales.saldo >= 0
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        = Bs. {totalesGenerales.saldo.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}

            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 3. VISTA ALTERNATIVA "FICHA EN DETALLE" (TARJETAS EJECUTIVAS) */}
      {/* ======================================================== */}
      {vistaModo === 'detalle' && (
        <div className="w-full space-y-6">
          
          {/* Selector de Viaje en Ficha */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                Seleccionar Viaje para Ficha Ejecutiva:
              </span>
              <select
                value={viajeSeleccionadoFicha?.idSegmento || ''}
                onChange={(e) => setSelectedViajeIdFicha(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {viajesMaestros.map(v => (
                  <option key={v.idSegmento} value={v.idSegmento}>
                    {v.idViaje} • {v.placaCamion} ({v.choferAsignado})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {viajeSeleccionadoFicha?.idViaje && viajeSeleccionadoFicha.idViaje !== '__GENERAL__' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedViajeIdReporte(viajeSeleccionadoFicha.idViaje);
                    setVistaModo('reporte');
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 shadow-2xs transition-all flex items-center gap-1.5"
                  title="Ver Reporte Económico Integrado del Viaje (Chofer + Admin)"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>📊 Reporte Viaje</span>
                </button>
              )}

              {viajeSeleccionadoFicha?.viajeObj && (
                <button
                  type="button"
                  onClick={() => setLiquidacionModalViaje(viajeSeleccionadoFicha.viajeObj || null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Modal de Liquidación Consolidada</span>
                </button>
              )}
            </div>
          </div>

          {/* Ficha Ejecutiva del Viaje Activo */}
          {viajeSeleccionadoFicha ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              
              {/* Cabecera de la Ficha con Metadatos Clave */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-6 border-b border-slate-200 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-black font-mono shadow-xs">
                      {viajeSeleccionadoFicha.idViaje}
                    </span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-mono font-bold">
                      {viajeSeleccionadoFicha.idReporte}
                    </span>
                    {viajeSeleccionadoFicha.estadoViaje && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                        {viajeSeleccionadoFicha.estadoViaje}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
                    Ficha Ejecutiva de Rendición • Camión {viajeSeleccionadoFicha.placaCamion}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chofer: <strong className="text-slate-800">{viajeSeleccionadoFicha.choferAsignado}</strong> • Centro de Costo: <strong className="font-mono text-slate-800">{viajeSeleccionadoFicha.centroCosto}</strong> • Manifiestos: <strong className="font-mono text-slate-800">{viajeSeleccionadoFicha.nroMICManifiesto}</strong>
                  </p>
                </div>

                {/* Resumen Financiero Destacado de la Ficha */}
                <div className="grid grid-cols-3 gap-3 w-full lg:w-auto text-right">
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Ingresos</span>
                    <span className="text-base sm:text-lg font-black text-emerald-800 tabular-nums">
                      Bs. {viajeSeleccionadoFicha.totalIngresosBs.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl">
                    <span className="text-[10px] font-bold text-rose-700 uppercase block">Gastos</span>
                    <span className="text-base sm:text-lg font-black text-rose-800 tabular-nums">
                      Bs. {viajeSeleccionadoFicha.totalGastosBs.toFixed(2)}
                    </span>
                  </div>
                  <div className={`p-3 rounded-2xl border ${
                    viajeSeleccionadoFicha.saldoNetoBs >= 0
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-rose-100 border-rose-300 text-rose-900'
                  }`}>
                    <span className="text-[10px] font-bold uppercase block">Utilidad Neta</span>
                    <span className="text-base sm:text-lg font-black tabular-nums">
                      Bs. {viajeSeleccionadoFicha.saldoNetoBs.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Bloques Desglosados en la Ficha Ejecutiva */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* BLOQUE A: GASTOS DE RUTA (CHOFER) */}
                <div className="bg-slate-50/60 rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                      Gastos de Ruta (Chofer)
                    </span>
                    <span className="text-xs font-black text-rose-700 tabular-nums">
                      Bs. {viajeSeleccionadoFicha.gastosChofer.reduce((sum, g) => sum + g.gastoBs, 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto bg-white rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200 sticky top-0">
                          <th className="py-2 px-3">Fecha</th>
                          <th className="py-2 px-3">Concepto</th>
                          <th className="py-2 px-3">Detalle</th>
                          <th className="py-2 px-3 text-right">Monto (Bs.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {viajeSeleccionadoFicha.gastosChofer.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                              Sin gastos de ruta registrados por el chofer.
                            </td>
                          </tr>
                        ) : (
                          viajeSeleccionadoFicha.gastosChofer.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-slate-500">{item.fecha}</td>
                              <td className="py-2 px-3 font-bold text-slate-800">{item.categoria}</td>
                              <td className="py-2 px-3 text-slate-600 truncate max-w-xs">{item.detalle}</td>
                              <td className="py-2 px-3 text-right font-black text-rose-700 tabular-nums">
                                - Bs. {item.gastoBs.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* BLOQUE B: TRANSACCIONES EXTRAORDINARIAS (ADMINISTRADOR / PROPIETARIO) */}
                <div className="bg-slate-50/60 rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      Inyecciones / Gastos Centrales (Admin)
                    </span>
                    <span className="text-xs font-black text-slate-900 tabular-nums">
                      Bs. {viajeSeleccionadoFicha.gastosAdmin.reduce((sum, g) => sum + g.gastoBs, 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto bg-white rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200 sticky top-0">
                          <th className="py-2 px-3">Fecha</th>
                          <th className="py-2 px-3">Categoría</th>
                          <th className="py-2 px-3">Método / Banco</th>
                          <th className="py-2 px-3 text-right">Monto (Bs.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {viajeSeleccionadoFicha.gastosAdmin.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                              Sin gastos extraordinarios de taller o banco inyectados por el admin.
                            </td>
                          </tr>
                        ) : (
                          viajeSeleccionadoFicha.gastosAdmin.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-slate-500">{item.fecha}</td>
                              <td className="py-2 px-3 font-bold text-slate-800">{item.categoria}</td>
                              <td className="py-2 px-3 text-slate-600">{item.metodoPago}</td>
                              <td className="py-2 px-3 text-right font-black text-rose-700 tabular-nums">
                                - Bs. {item.gastoBs.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400">
              No hay viajes disponibles para mostrar ficha.
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 4. VISTA REPORTE ECONÓMICO INTEGRADO DEL VIAJE (CHOFER + ADMIN) */}
      {/* ======================================================== */}
      {vistaModo === 'reporte' && (
        <ReporteViajeEconomico
          viajes={viajes}
          manifiestosOrigen={manifiestosOrigen}
          manifiestosDestino={manifiestosDestino}
          gastosRuta={gastosRuta}
          transacciones={transacciones}
          catalogos={catalogos}
          empresa={empresa}
          selectedViajeIdInicial={selectedViajeIdReporte || (filtroViaje !== 'Todos' ? filtroViaje : undefined)}
          onVerComprobante={(url) => setFotoModalUrl(url)}
          onRefreshData={onRefreshData}
          onDeleteSubManifiesto={onDeleteSubManifiesto}
          showToast={showToast}
        />
      )}

      {/* ======================================================== */}
      {/* 5. MODAL DE REGISTRO ÁGIL CON CAPTURA CONTINUA */}
      {/* ======================================================== */}
      {isModalOpen && (
        <PropietariosChoferesModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            if (onRefreshData) onRefreshData();
          }}
          rolInicial={modalRol}
          pestañaInicial={modalPestaña}
          viajes={viajes}
          catalogos={catalogos}
          onTransaccionGuardada={(tx, continuar) => {
            if (onRefreshData) onRefreshData();
          }}
          showToast={showToast}
        />
      )}

      {/* MODAL DE LIQUIDACIÓN DE RUTA COMPLETA */}
      {liquidacionModalViaje && (
        <LiquidacionRutaModal
          isOpen={Boolean(liquidacionModalViaje)}
          onClose={() => setLiquidacionModalViaje(null)}
          viaje={liquidacionModalViaje}
          manifiestosOrigen={manifiestosOrigen}
          manifiestosDestino={manifiestosDestino}
          gastosRuta={gastosRuta}
          transacciones={transacciones}
          empresa={empresa}
          onVerComprobante={(url) => setFotoModalUrl(url)}
        />
      )}

      {/* MODAL DE IMPRESIÓN DE COMPROBANTE INDIVIDUAL */}
      {receiptTx && (
        <TransactionReceiptModal
          isOpen={Boolean(receiptTx)}
          onClose={() => setReceiptTx(null)}
          transaccion={receiptTx}
          empresa={empresa}
        />
      )}

      {/* MODAL VISOR DE FOTO COMPROBANTE */}
      {fotoModalUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="font-black text-sm text-slate-900">Comprobante de Gasto Digitalizado</span>
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

    </div>
  );
};
