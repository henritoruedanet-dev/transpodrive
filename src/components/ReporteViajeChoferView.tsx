import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  DollarSign,
  Fuel,
  Receipt,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Printer,
  FileSpreadsheet,
  Download,
  Truck,
  User,
  MapPin,
  Calendar,
  Layers,
  Building2,
  Wallet,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  X,
  Eye,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Scale
} from 'lucide-react';
import {
  Viaje,
  ManifiestoOrigen,
  ManifiestoDestino,
  Catalogos,
  ReporteViajeChofer,
  DetalleIngresoChofer,
  DetalleGastoChofer,
  DatosEmpresa
} from '../types';
import { storage } from '../services/storageService';
import { compressImageFile } from '../utils/imageCompressor';
import { exportToExcel, exportElementToPDF } from '../utils/exportUtils';

interface ReporteViajeChoferViewProps {
  viajes: Viaje[];
  manifiestosOrigen: ManifiestoOrigen[];
  manifiestosDestino?: ManifiestoDestino[];
  catalogos: Catalogos;
  selectedPlaca?: string;
  empresa?: DatosEmpresa;
  onReporteSaved?: () => void;
  onVerComprobante?: (fotoUrl: string) => void;
}

const CONCEPTOS_INGRESO_DEFAULT = [
  'Cobro Flete Destino',
  'Cobro Flete Origen',
  'Traspaso Viáticos Central',
  'Traspaso Banco / QR',
  'Otros Ingresos Carga'
];

const CONCEPTOS_GASTO_DEFAULT = [
  'Combustible / Diésel',
  'Peajes / Pesajes',
  'Estibadores / Cargadores',
  'Viáticos / Alimentación',
  'Mantenimiento / Taller de Emergencia',
  'Llantería / Gomería',
  'Otros Gastos de Ruta'
];

const METODOS_PAGO_INGRESO = [
  'Efectivo',
  'Traspaso Central',
  'Banco / QR',
  'Cheque'
];

export const ReporteViajeChoferView: React.FC<ReporteViajeChoferViewProps> = ({
  viajes,
  manifiestosOrigen,
  manifiestosDestino = [],
  catalogos,
  selectedPlaca,
  empresa,
  onReporteSaved,
  onVerComprobante
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Lista de viajes disponibles (priorizar en tránsito o repartos)
  const viajesDisponibles = useMemo(() => {
    let list = [...viajes];
    if (selectedPlaca && selectedPlaca !== 'todas') {
      list = list.filter(v => v.placaCamion === selectedPlaca);
    }
    return list.sort((a, b) => b.idViaje.localeCompare(a.idViaje));
  }, [viajes, selectedPlaca]);

  // Selección de Viaje
  const [selectedViajeId, setSelectedViajeId] = useState<string>(() => {
    const enTransito = viajesDisponibles.find(v => v.estadoViaje === 'En Tránsito' || v.estadoViaje === 'En Reparto');
    return enTransito ? enTransito.idViaje : (viajesDisponibles[0]?.idViaje || '');
  });

  const viajeActivo = useMemo(() => {
    return viajes.find(v => v.idViaje === selectedViajeId);
  }, [viajes, selectedViajeId]);

  // Manifiestos asociados al viaje
  const manifiestosAsociadosList = useMemo(() => {
    if (!selectedViajeId) return [];
    const origenes = manifiestosOrigen.filter(m => m.idViajeAsignado === selectedViajeId);
    const destinos = manifiestosDestino.filter(m => m.idViaje === selectedViajeId);

    const mics = new Set<string>();
    origenes.forEach(m => { if (m.nroManifiestoMIC) mics.add(m.nroManifiestoMIC); });
    destinos.forEach(m => { if (m.nroManifiesto) mics.add(m.nroManifiesto); });
    return Array.from(mics);
  }, [selectedViajeId, manifiestosOrigen, manifiestosDestino]);

  // Estado del Formulario del Reporte
  const [idReporte, setIdReporte] = useState<string>('');
  const [placaCamion, setPlacaCamion] = useState<string>('');
  const [choferAsignado, setChoferAsignado] = useState<string>('');
  const [centroCosto, setCentroCosto] = useState<string>('');
  const [rutaOrigen, setRutaOrigen] = useState<string>('');
  const [rutaDestino, setRutaDestino] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fechaCierre, setFechaCierre] = useState<string>('');
  const [estadoReporte, setEstadoReporte] = useState<'Borrador' | 'Liquidado' | 'Cerrado'>('Borrador');
  const [observaciones, setObservaciones] = useState<string>('');

  // Filas de Ingresos y Gastos
  const [ingresos, setIngresos] = useState<DetalleIngresoChofer[]>([]);
  const [gastos, setGastos] = useState<DetalleGastoChofer[]>([]);

  // Estados de carga/guardado
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);
  const [showConfirmLiquidarModal, setShowConfirmLiquidarModal] = useState(false);

  // Cargar o inicializar reporte al cambiar de viaje
  useEffect(() => {
    if (!selectedViajeId) return;

    // Buscar si ya existe un reporte para este viaje en storage
    const reporteExistente = storage.getReporteChoferByViaje(selectedViajeId);

    if (reporteExistente) {
      setIdReporte(reporteExistente.idReporteChofer);
      setPlacaCamion(reporteExistente.placaCamion);
      setChoferAsignado(reporteExistente.choferAsignado);
      setCentroCosto(reporteExistente.centroCosto);
      setRutaOrigen(reporteExistente.rutaOrigen);
      setRutaDestino(reporteExistente.rutaDestino);
      setFechaInicio(reporteExistente.fechaInicio);
      setFechaCierre(reporteExistente.fechaCierre || '');
      setEstadoReporte(reporteExistente.estadoReporte);
      setObservaciones(reporteExistente.observaciones || '');
      setIngresos(reporteExistente.ingresos || []);
      setGastos(reporteExistente.gastos || []);
    } else if (viajeActivo) {
      // Auto-completar desde los datos del viaje
      const origenes = manifiestosOrigen
        .filter(m => m.idViajeAsignado === selectedViajeId)
        .map(m => m.sucursalOrigen);
      const destinos = manifiestosDestino
        .filter(m => m.idViaje === selectedViajeId)
        .map(m => m.sucursalDestino);

      const origenCalculado = Array.from(new Set(origenes)).join(', ') || viajeActivo.origen || 'Oruro';
      const destinoCalculado = Array.from(new Set(destinos)).join(', ') || viajeActivo.destino || 'Tarija';

      setIdReporte(`REP-CHOF-${selectedViajeId}-${Date.now().toString().slice(-4)}`);
      setPlacaCamion(viajeActivo.placaCamion);
      setChoferAsignado(viajeActivo.choferAsignado);
      setCentroCosto(`${viajeActivo.placaCamion} - ${viajeActivo.choferAsignado}`);
      setRutaOrigen(origenCalculado);
      setRutaDestino(destinoCalculado);
      setFechaInicio(viajeActivo.fechaSalida || new Date().toISOString().split('T')[0]);
      setFechaCierre('');
      setEstadoReporte('Borrador');
      setObservaciones(viajeActivo.observacionesRuta || '');

      // Inicializar con conceptos sugeridos
      setIngresos([
        {
          idIngresoChofer: `ING-${Date.now()}-1`,
          idReporteChofer: '',
          idViaje: selectedViajeId,
          fecha: viajeActivo.fechaSalida || new Date().toISOString().split('T')[0],
          conceptoIngreso: 'Traspaso Viáticos Central',
          detalleGlosa: 'Fondo inicial asignado por administración central',
          origenFondo: 'Traspaso Central',
          montoBs: 2500,
          nroReciboComprobante: ''
        }
      ]);

      setGastos([
        {
          idGastoChofer: `GST-${Date.now()}-1`,
          idReporteChofer: '',
          idViaje: selectedViajeId,
          placaCamion: viajeActivo.placaCamion,
          fecha: viajeActivo.fechaSalida || new Date().toISOString().split('T')[0],
          conceptoGasto: 'Combustible / Diésel',
          detalleGasto: 'Carga inicial diésel estación central',
          idProveedor: '',
          nroFacturaRecibo: '',
          montoBs: 1000,
          comprobanteFotoUrl: ''
        }
      ]);
    }
  }, [selectedViajeId, viajeActivo]);

  // Cálculos en tiempo real
  const totalIngresos = useMemo(() => {
    return ingresos.reduce((sum, item) => sum + (Number(item.montoBs) || 0), 0);
  }, [ingresos]);

  const totalGastos = useMemo(() => {
    return gastos.reduce((sum, item) => sum + (Number(item.montoBs) || 0), 0);
  }, [gastos]);

  const saldoFavorContra = useMemo(() => {
    return Number((totalIngresos - totalGastos).toFixed(2));
  }, [totalIngresos, totalGastos]);

  // Manejo de Filas de Ingresos
  const handleAddIngreso = () => {
    const nuevo: DetalleIngresoChofer = {
      idIngresoChofer: `ING-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      idReporteChofer: idReporte,
      idViaje: selectedViajeId,
      fecha: new Date().toISOString().split('T')[0],
      conceptoIngreso: 'Cobro Flete Destino',
      detalleGlosa: '',
      origenFondo: 'Efectivo',
      montoBs: 0,
      nroReciboComprobante: ''
    };
    setIngresos([...ingresos, nuevo]);
  };

  const handleUpdateIngreso = (index: number, field: keyof DetalleIngresoChofer, value: any) => {
    const updated = [...ingresos];
    updated[index] = { ...updated[index], [field]: value };
    setIngresos(updated);
  };

  const handleRemoveIngreso = (index: number) => {
    setIngresos(ingresos.filter((_, i) => i !== index));
  };

  // Manejo de Filas de Gastos
  const handleAddGasto = () => {
    const nuevo: DetalleGastoChofer = {
      idGastoChofer: `GST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      idReporteChofer: idReporte,
      idViaje: selectedViajeId,
      placaCamion: placaCamion,
      fecha: new Date().toISOString().split('T')[0],
      conceptoGasto: 'Peajes / Pesajes',
      detalleGasto: '',
      idProveedor: '',
      nroFacturaRecibo: '',
      montoBs: 0,
      comprobanteFotoUrl: ''
    };
    setGastos([...gastos, nuevo]);
  };

  const handleUpdateGasto = (index: number, field: keyof DetalleGastoChofer, value: any) => {
    const updated = [...gastos];
    updated[index] = { ...updated[index], [field]: value };
    setGastos(updated);
  };

  const handleRemoveGasto = (index: number) => {
    setGastos(gastos.filter((_, i) => i !== index));
  };

  // Subir / Comprimir Comprobante de Foto en Gasto
  const handleFotoUpload = async (index: number, file: File) => {
    try {
      const compressedDataUrl = await compressImageFile(file, 1200, 0.75);
      handleUpdateGasto(index, 'comprobanteFotoUrl', compressedDataUrl);
      setFeedbackMsg({ text: 'Foto del comprobante optimizada y adjuntada.', type: 'info' });
    } catch (err) {
      console.error('Error al procesar foto:', err);
      setFeedbackMsg({ text: 'No se pudo procesar la imagen seleccionada.', type: 'error' });
    }
  };

  // Guardar Borrador
  const handleGuardarBorrador = async () => {
    if (!selectedViajeId) {
      setFeedbackMsg({ text: 'Seleccione un viaje activo para guardar el reporte.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const reporte: ReporteViajeChofer = {
        idReporteChofer: idReporte,
        idViaje: selectedViajeId,
        placaCamion,
        choferAsignado,
        centroCosto,
        rutaOrigen,
        rutaDestino,
        manifiestosAsociados: manifiestosAsociadosList.join(', ') || '-',
        fechaInicio,
        fechaCierre,
        totalIngresosBs: totalIngresos,
        totalGastosBs: totalGastos,
        saldoFavorContraBs: saldoFavorContra,
        estadoReporte: 'Borrador',
        observaciones,
        ingresos,
        gastos
      };

      const res = await storage.saveReporteChofer(reporte, false);
      setEstadoReporte('Borrador');
      setFeedbackMsg({ text: res.message || 'Borrador de reporte guardado correctamente.', type: 'success' });
      if (onReporteSaved) onReporteSaved();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al guardar borrador.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir diálogo de confirmación para Cerrar y Liquidar Viaje
  const handleCerrarYLiquidar = () => {
    if (!selectedViajeId) {
      setFeedbackMsg({ text: 'Seleccione un viaje activo para liquidar.', type: 'error' });
      return;
    }

    if (ingresos.length === 0 && gastos.length === 0) {
      setFeedbackMsg({ text: 'Debe ingresar al menos un concepto de ingreso o gasto para liquidar.', type: 'error' });
      return;
    }

    setShowConfirmLiquidarModal(true);
  };

  // Ejecución confirmada de Cierre y Liquidación
  const ejecutarCierreYLiquidacion = async () => {
    setIsSubmitting(true);
    setFeedbackMsg(null);
    setShowConfirmLiquidarModal(false);

    try {
      const fechaCierreHoy = new Date().toISOString().split('T')[0];
      const reporte: ReporteViajeChofer = {
        idReporteChofer: idReporte,
        idViaje: selectedViajeId,
        placaCamion,
        choferAsignado,
        centroCosto,
        rutaOrigen,
        rutaDestino,
        manifiestosAsociados: manifiestosAsociadosList.join(', ') || '-',
        fechaInicio,
        fechaCierre: fechaCierreHoy,
        totalIngresosBs: totalIngresos,
        totalGastosBs: totalGastos,
        saldoFavorContraBs: saldoFavorContra,
        estadoReporte: 'Liquidado',
        observaciones,
        ingresos,
        gastos
      };

      const res = await storage.saveReporteChofer(reporte, true);
      setEstadoReporte('Liquidado');
      setFechaCierre(fechaCierreHoy);
      setFeedbackMsg({ text: res.message || 'Reporte de viaje liquidado y contabilizado exitosamente.', type: 'success' });
      if (onReporteSaved) onReporteSaved();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al liquidar reporte.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Descargar Excel Detallado
  const handleExportExcel = () => {
    const dataIngresos = ingresos.map(i => ({
      SECCION: 'INGRESO / COBRO',
      FECHA: i.fecha,
      CONCEPTO: i.conceptoIngreso,
      DETALLE_GLOSA: i.detalleGlosa,
      ORIGEN_FONDO: i.origenFondo,
      MONTO_BS: Number(Number(i.montoBs || 0).toFixed(2)),
      NRO_COMPROBANTE: i.nroReciboComprobante || ''
    }));

    const dataGastos = gastos.map(g => ({
      SECCION: 'GASTO DE RUTA',
      FECHA: g.fecha,
      CONCEPTO: g.conceptoGasto,
      DETALLE_GLOSA: g.detalleGasto,
      ORIGEN_FONDO: g.idProveedor ? `Proveedor: ${g.idProveedor}` : 'Ruta / Estación',
      MONTO_BS: Number(Number(g.montoBs || 0).toFixed(2)),
      NRO_COMPROBANTE: g.nroFacturaRecibo || ''
    }));

    const dataCompleta = [...dataIngresos, ...dataGastos];
    const cleanPlaca = (placaCamion || 'General').replace(/[^a-zA-Z0-9]/g, '_');
    exportToExcel(
      dataCompleta,
      `Reporte_Viaje_${selectedViajeId}_${cleanPlaca}_${new Date().toISOString().split('T')[0]}`,
      'Reporte_Chofer'
    );
  };

  // Exportar PDF Resumen
  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    try {
      const cleanPlaca = (placaCamion || 'General').replace(/[^a-zA-Z0-9]/g, '_');
      await exportElementToPDF(
        printAreaRef.current || 'reporte-viaje-print-area',
        `Hoja_Ruta_${selectedViajeId}_${cleanPlaca}_${new Date().toISOString().split('T')[0]}.pdf`
      );
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Imprimir Hoja de Ruta
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Notificaciones y Mensajes */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl flex items-center justify-between shadow-sm transition-all text-xs font-semibold ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : feedbackMsg.type === 'error'
            ? 'bg-rose-50 border border-rose-200 text-rose-800'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : feedbackMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Contenedor Imprimible y Exportable */}
      <div ref={printAreaRef} id="reporte-viaje-print-area" className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none">
        
        {/* Cabecera Principal del Reporte */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1d4ed8] shadow-xs shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Reporte Viaje Chofer • Rendición de Ruta
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  estadoReporte === 'Liquidado'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {estadoReporte}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {empresa?.nombre || 'TranspoDrive S.R.L.'} • Control de Viáticos, Fletes Cobrados y Gastos Operativos de Chofer
              </p>
            </div>
          </div>

          {/* Selector de Viaje en Tránsito (no-print) */}
          <div className="no-print flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-2 flex items-center gap-1.5 shrink-0">
              <Truck className="w-4 h-4 text-[#1d4ed8]" />
              <span>Viaje:</span>
            </label>
            <select
              value={selectedViajeId}
              onChange={(e) => setSelectedViajeId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[40px]"
            >
              {viajesDisponibles.map(v => (
                <option key={v.idViaje} value={v.idViaje}>
                  {v.idViaje} • {v.placaCamion} ({v.choferAsignado}) - {v.estadoViaje}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ficha Resumen de la Unidad y el Viaje (Auto-rellenada) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unidad / Placa:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Truck className="w-4 h-4 text-slate-600" />
              <span className="font-mono font-black text-slate-900 text-sm">{placaCamion || 'Sin Placa'}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Chofer Asignado:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <User className="w-4 h-4 text-slate-600" />
              <span className="font-bold text-slate-900">{choferAsignado || 'Sin Chofer'}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ruta Origen / Destino:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-800 truncate">{rutaOrigen} → {rutaDestino}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Manifiestos Asociados (MIC):</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Layers className="w-4 h-4 text-slate-600" />
              <span className="font-mono font-bold text-blue-700 truncate">
                {manifiestosAsociadosList.length > 0 ? manifiestosAsociadosList.join(', ') : 'Sin MIC registrado'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Centro de Costos:</span>
            <span className="font-medium text-slate-700 block mt-0.5 truncate">{centroCosto || `Camión ${placaCamion}`}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fecha de Inicio:</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="mt-0.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800"
            />
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fecha de Liquidación:</span>
            <input
              type="date"
              value={fechaCierre}
              onChange={(e) => setFechaCierre(e.target.value)}
              placeholder="En curso..."
              className="mt-0.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800"
            />
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nro. de Reporte:</span>
            <span className="font-mono font-bold text-slate-600 block mt-0.5 text-[11px] truncate">{idReporte}</span>
          </div>
        </div>

        {/* Tarjetas de KPI en Tiempo Real */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Ingresos */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                Total Ingresos / Cobros (Bs.)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-700 tabular-nums">
                Bs. {totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium block mt-1">
              Viáticos asignados + Cobros de flete en ruta
            </span>
          </div>

          {/* Total Gastos */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                Total Gastos de Ruta (Bs.)
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-rose-600 tabular-nums">
                Bs. {totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[11px] text-rose-600 font-medium block mt-1">
              Diésel, peajes, viáticos y talleres de emergencia
            </span>
          </div>

          {/* Saldo a Rendir / Liquidación Neta */}
          <div className={`border-2 rounded-2xl p-5 shadow-xs ${
            saldoFavorContra >= 0
              ? 'bg-blue-50/80 border-blue-400 text-blue-950'
              : 'bg-amber-50/80 border-amber-400 text-amber-950'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">
                {saldoFavorContra >= 0 ? 'Saldo a Rendir por Chofer (Bs.)' : 'Saldo a Favor del Chofer (Reembolso)'}
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                saldoFavorContra >= 0 ? 'bg-blue-200 text-blue-800' : 'bg-amber-200 text-amber-800'
              }`}>
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-2xl font-black tabular-nums ${
                saldoFavorContra >= 0 ? 'text-[#1d4ed8]' : 'text-amber-700'
              }`}>
                Bs. {saldoFavorContra.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[11px] font-semibold opacity-80 block mt-1">
              {saldoFavorContra >= 0
                ? 'Efectivo sobrante que el chofer entrega a Caja Central'
                : 'Importe adeudado al chofer por gastos que superaron los fondos'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 1: INGRESOS Y FONDOS ASIGNADOS (GRID DINÁMICO) */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Detalle de Ingresos, Cobros y Viáticos Recibidos ({ingresos.length})
              </h3>
            </div>

            <button
              type="button"
              onClick={handleAddIngreso}
              className="no-print inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar Concepto de Ingreso</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs bg-white">
            <table className="w-full text-xs min-w-[780px]">
              <thead className="bg-slate-100/90 text-slate-700 border-b-2 border-slate-200 font-bold uppercase select-none text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 text-left w-32">Fecha</th>
                  <th className="py-2.5 px-3 text-left w-48">Concepto de Ingreso</th>
                  <th className="py-2.5 px-3 text-left">Detalle / Glosa</th>
                  <th className="py-2.5 px-3 text-left w-40">Método / Origen</th>
                  <th className="py-2.5 px-3 text-left w-36">Nro. Comprobante</th>
                  <th className="py-2.5 px-3 text-right w-36">Monto (Bs.)</th>
                  <th className="py-2.5 px-2 text-center w-12 no-print">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ingresos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      No se registraron ingresos ni viáticos. Haga clic en "+ Agregar Concepto de Ingreso" para registrar.
                    </td>
                  </tr>
                ) : (
                  ingresos.map((ing, idx) => (
                    <tr key={ing.idIngresoChofer || idx} className="hover:bg-slate-50/80 transition-colors">
                      {/* Fecha */}
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={ing.fecha}
                          onChange={(e) => handleUpdateIngreso(idx, 'fecha', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-medium focus:bg-white focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Concepto (Datalist para escribir o elegir) */}
                      <td className="py-2 px-3">
                        <input
                          list={`conceptos-ingreso-${idx}`}
                          value={ing.conceptoIngreso}
                          onChange={(e) => handleUpdateIngreso(idx, 'conceptoIngreso', e.target.value)}
                          placeholder="Seleccionar o escribir..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                        />
                        <datalist id={`conceptos-ingreso-${idx}`}>
                          {CONCEPTOS_INGRESO_DEFAULT.map(c => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </td>

                      {/* Detalle / Glosa */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={ing.detalleGlosa}
                          onChange={(e) => handleUpdateIngreso(idx, 'detalleGlosa', e.target.value)}
                          placeholder="Observaciones / destinatario..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Método / Origen del Fondo */}
                      <td className="py-2 px-3">
                        <select
                          value={ing.origenFondo}
                          onChange={(e) => handleUpdateIngreso(idx, 'origenFondo', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                        >
                          {METODOS_PAGO_INGRESO.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </td>

                      {/* Nro Recibo */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={ing.nroReciboComprobante || ''}
                          onChange={(e) => handleUpdateIngreso(idx, 'nroReciboComprobante', e.target.value)}
                          placeholder="REC-001"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Monto (Bs.) */}
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={ing.montoBs}
                          onChange={(e) => handleUpdateIngreso(idx, 'montoBs', parseFloat(e.target.value) || 0)}
                          className="w-28 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black tabular-nums text-emerald-700 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Eliminar */}
                      <td className="py-2 px-2 text-center no-print">
                        <button
                          type="button"
                          onClick={() => handleRemoveIngreso(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-600">
                    Total Ingresos y Cobros Registrados:
                  </td>
                  <td className="py-2.5 px-3 text-right font-black tabular-nums text-emerald-700 text-sm">
                    Bs. {totalIngresos.toFixed(2)}
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 2: GASTOS DE RUTA DEL CHOFER (GRID DINÁMICO) */}
        {/* ========================================================================= */}
        <div className="space-y-3 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                <Fuel className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Detalle de Gastos de Ruta y Comprobantes ({gastos.length})
              </h3>
            </div>

            <button
              type="button"
              onClick={handleAddGasto}
              className="no-print inline-flex items-center gap-1.5 bg-[#dc2626] hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar Concepto de Gasto</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs bg-white">
            <table className="w-full text-xs min-w-[880px]">
              <thead className="bg-slate-100/90 text-slate-700 border-b-2 border-slate-200 font-bold uppercase select-none text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 text-left w-32">Fecha</th>
                  <th className="py-2.5 px-3 text-left w-48">Categoría / Concepto</th>
                  <th className="py-2.5 px-3 text-left">Detalle / Estación / Tramo</th>
                  <th className="py-2.5 px-3 text-left w-44">Proveedor / Estación</th>
                  <th className="py-2.5 px-3 text-left w-36">Nro. Factura / Recibo</th>
                  <th className="py-2.5 px-3 text-right w-36">Monto (Bs.)</th>
                  <th className="py-2.5 px-3 text-center w-36">Comprobante</th>
                  <th className="py-2.5 px-2 text-center w-12 no-print">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gastos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No se registraron gastos de ruta. Haga clic en "+ Agregar Concepto de Gasto" para registrar.
                    </td>
                  </tr>
                ) : (
                  gastos.map((gas, idx) => (
                    <tr key={gas.idGastoChofer || idx} className="hover:bg-slate-50/80 transition-colors">
                      {/* Fecha */}
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={gas.fecha}
                          onChange={(e) => handleUpdateGasto(idx, 'fecha', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-medium focus:bg-white focus:ring-1 focus:ring-rose-500"
                        />
                      </td>

                      {/* Categoría / Concepto */}
                      <td className="py-2 px-3">
                        <input
                          list={`conceptos-gasto-${idx}`}
                          value={gas.conceptoGasto}
                          onChange={(e) => handleUpdateGasto(idx, 'conceptoGasto', e.target.value)}
                          placeholder="Seleccionar o escribir..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-rose-500"
                        />
                        <datalist id={`conceptos-gasto-${idx}`}>
                          {CONCEPTOS_GASTO_DEFAULT.map(c => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </td>

                      {/* Detalle de Gasto */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={gas.detalleGasto}
                          onChange={(e) => handleUpdateGasto(idx, 'detalleGasto', e.target.value)}
                          placeholder="Ej. Surtidor Caracollo / Retén Challapata..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-rose-500"
                        />
                      </td>

                      {/* Proveedor / Estación */}
                      <td className="py-2 px-3">
                        <select
                          value={gas.idProveedor || ''}
                          onChange={(e) => handleUpdateGasto(idx, 'idProveedor', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-rose-500 truncate"
                        >
                          <option value="">-- Sin Proveedor --</option>
                          {(catalogos.proveedores || []).map(p => (
                            <option key={p.idProveedor} value={p.idProveedor}>
                              {p.nombre} ({p.rubro || 'Proveedor'})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Nro Factura / Recibo */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={gas.nroFacturaRecibo || ''}
                          onChange={(e) => handleUpdateGasto(idx, 'nroFacturaRecibo', e.target.value)}
                          placeholder="FAC-98432"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:bg-white focus:ring-1 focus:ring-rose-500"
                        />
                      </td>

                      {/* Monto (Bs.) */}
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={gas.montoBs}
                          onChange={(e) => handleUpdateGasto(idx, 'montoBs', parseFloat(e.target.value) || 0)}
                          className="w-28 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black tabular-nums text-rose-600 focus:bg-white focus:ring-1 focus:ring-rose-500"
                        />
                      </td>

                      {/* Comprobante / Foto */}
                      <td className="py-2 px-3 text-center">
                        {gas.comprobanteFotoUrl ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (onVerComprobante) onVerComprobante(gas.comprobanteFotoUrl!);
                                else setFotoModalUrl(gas.comprobanteFotoUrl!);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 text-[11px] font-bold transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Foto</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateGasto(idx, 'comprobanteFotoUrl', '')}
                              className="no-print p-1 text-slate-400 hover:text-rose-600 rounded-md"
                              title="Quitar foto"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="no-print cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 text-[11px] font-semibold transition-colors">
                            <Camera className="w-3.5 h-3.5 text-slate-500" />
                            <span>Adjuntar</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFotoUpload(idx, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        )}
                      </td>

                      {/* Eliminar */}
                      <td className="py-2 px-2 text-center no-print">
                        <button
                          type="button"
                          onClick={() => handleRemoveGasto(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-600">
                    Total Gastos de Ruta Registrados:
                  </td>
                  <td className="py-2.5 px-3 text-right font-black tabular-nums text-rose-600 text-sm">
                    Bs. {totalGastos.toFixed(2)}
                  </td>
                  <td colSpan={2} className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Observaciones del Reporte */}
        <div className="pt-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
            Observaciones Generales de la Ruta / Justificación de Gastos:
          </label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Novedades mecánicas, demoras en aduana o retenes, acuerdos de entrega de flete..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8]"
          />
        </div>

        {/* Firmas para Hoja de Ruta Imprimible (Solo visible en print) */}
        <div className="hidden print:grid grid-cols-2 gap-12 pt-16 text-center text-xs text-slate-700">
          <div className="border-t border-slate-400 pt-2">
            <span className="font-bold block">{choferAsignado}</span>
            <span className="text-[10px] text-slate-500">Firma del Chofer Responsable</span>
          </div>
          <div className="border-t border-slate-400 pt-2">
            <span className="font-bold block">Administración Central / Finanzas</span>
            <span className="text-[10px] text-slate-500">V.B. Liquidación y Cajas</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* BARRA INFERIOR DE ACCIONES (MATERIAL DESIGN 3 FULL-WIDTH) */}
      {/* ========================================================================= */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Resumen Rápido */}
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ingresos:</span>
            <span className="font-black text-emerald-700 tabular-nums">Bs. {totalIngresos.toFixed(2)}</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gastos:</span>
            <span className="font-black text-rose-600 tabular-nums">Bs. {totalGastos.toFixed(2)}</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Neto:</span>
            <span className={`font-black tabular-nums ${saldoFavorContra >= 0 ? 'text-[#1d4ed8]' : 'text-amber-700'}`}>
              Bs. {saldoFavorContra.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
          {/* Botones de Exportación e Impresión */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            title="Imprimir Hoja de Ruta"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimir Hoja de Ruta</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
            title="Descargar resumen en formato PDF"
          >
            <Download className="w-4 h-4 text-rose-600" />
            <span>{isExportingPDF ? 'Exportando...' : 'Exportar PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            title="Descargar planilla Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Descargar Excel</span>
          </button>

          {/* Guardar Borrador */}
          <button
            type="button"
            onClick={handleGuardarBorrador}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando...' : 'Guardar Borrador'}</span>
          </button>

          {/* Cerrar y Liquidar */}
          <button
            type="button"
            onClick={handleCerrarYLiquidar}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#16a34a] hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Procesando...' : 'Cerrar y Liquidar Viaje'}</span>
          </button>
        </div>
      </div>

      {/* Modal visor de foto comprobante si no se pasa handler externo */}
      {fotoModalUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-4 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="font-bold text-xs text-slate-800">Comprobante de Gasto</span>
              <button
                type="button"
                onClick={() => setFotoModalUrl(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex-1 overflow-auto flex items-center justify-center bg-slate-50 rounded-2xl my-2">
              <img src={fotoModalUrl} alt="Comprobante" className="max-h-[70vh] object-contain rounded-xl" />
            </div>
            <button
              type="button"
              onClick={() => setFotoModalUrl(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      {/* Modal Confirmación de Cierre y Liquidación (100% Funcional sin window.confirm) */}
      {showConfirmLiquidarModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Cierre y Liquidación de Viaje</h3>
                <p className="text-xs text-slate-500">¿Confirmar liquidación para {selectedViajeId}?</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Camión / Placa:</span>
                <span className="font-bold text-slate-800 font-mono">{placaCamion || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Chofer Asignado:</span>
                <span className="font-bold text-slate-800">{choferAsignado || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 text-emerald-700">
                <span className="font-semibold">Total Ingresos / Cobros:</span>
                <span className="font-extrabold font-mono tabular-nums">Bs. {totalIngresos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 text-rose-600">
                <span className="font-semibold">Total Gastos de Ruta:</span>
                <span className="font-extrabold font-mono tabular-nums">Bs. {totalGastos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-sm bg-blue-50/80 -mx-2 px-2 rounded-lg">
                <span className="text-blue-900">Saldo Neto a Rendir:</span>
                <span className="text-blue-700 font-mono tabular-nums">Bs. {saldoFavorContra.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-[11px] text-amber-800 space-y-1">
              <p className="font-bold">Efectos contables de la confirmación:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                <li>Gastos sincronizados en <strong>Gastos_Ruta_Camion</strong> y contabilidad.</li>
                <li>Amortización de saldos pendientes de clientes en <strong>Manifiestos_Destino</strong>.</li>
                <li>Actualización del saldo en <strong>Arqueo_Cajas</strong> (Caja Chofer).</li>
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmLiquidarModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarCierreYLiquidacion}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-extrabold text-white bg-[#16a34a] hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/25 transition-all flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Procesando...' : 'Confirmar y Liquidar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
