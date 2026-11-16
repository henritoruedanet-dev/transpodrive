import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Database,
  ArrowRightLeft,
  FileCheck2,
  Clock,
  Zap,
  Server,
  Cloud,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Info,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Wallet,
  Activity,
  Layers,
  Sparkles,
  Search,
  Download,
  Upload,
  FolderArchive,
  HardDrive,
  FileDown,
  FileUp,
  Save
} from 'lucide-react';
import {
  DiagnosticoIntegridadReport,
  DetalleHuerfano,
  DetalleDescuadreCaja,
  DetalleInconsistenciaManifiesto,
  TrazaAuditoriaMantenimiento,
  CajaCuenta,
  Viaje,
  TransaccionDiaria,
  BackupDriveInfo
} from '../types';
import { storage } from '../services/storageService';

interface PanelAuditoriaContableProps {
  onDataMutated?: () => void;
  showToast: (text: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const PanelAuditoriaContable: React.FC<PanelAuditoriaContableProps> = ({
  onDataMutated,
  showToast
}) => {
  const [isRunningScan, setIsRunningScan] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [reporte, setReporte] = useState<DiagnosticoIntegridadReport | null>(null);
  const [trazas, setTrazas] = useState<TrazaAuditoriaMantenimiento[]>(() => storage.getAuditLogs());
  const [activeTab, setActiveTab] = useState<'anomalias' | 'cajas' | 'manifiestos' | 'logs'>('anomalias');
  const [filtroTexto, setFiltroTexto] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    tipo: 'PURGA' | 'CAJAS' | 'MANIFIESTOS' | 'INTEGRAL' | 'SUB_HUERFANOS' | 'RECALCULAR_SALDOS_SUB' | 'REINICIAR_SISTEMA' | 'REINICIAR_SISTEMA_TOTAL';
    titulo: string;
    descripcion: string;
  } | null>(null);

  // Estados para Backup y Restauración
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);
  const [backupsDrive, setBackupsDrive] = useState<BackupDriveInfo[]>([]);
  const [isLoadingBackupsDrive, setIsLoadingBackupsDrive] = useState<boolean>(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState<boolean>(false);

  // Ejecución inicial automática de diagnóstico silencioso o al montar
  useEffect(() => {
    handleRunDiagnostic(true);
  }, []);

  const handleRunDiagnostic = async (silent = false) => {
    setIsRunningScan(true);
    try {
      const res = await storage.ejecutarDiagnosticoIntegridad();
      if (res.success && res.data) {
        setReporte(res.data);
        setTrazas(storage.getAuditLogs());
        if (!silent) {
          if (res.data.resumen.totalAnomalias === 0) {
            showToast('Diagnóstico completado: Sistema contable 100% íntegro.', 'success');
          } else {
            showToast(
              `Diagnóstico completado: Se detectaron ${res.data.resumen.totalAnomalias} anomalías que requieren atención.`,
              'warning'
            );
          }
        }
      } else {
        if (!silent) showToast(res.message || 'Error al ejecutar diagnóstico.', 'warning');
      }
    } catch (err: any) {
      if (!silent) showToast(`Error en diagnóstico: ${err.message || 'Fallo desconocido'}`, 'error');
    } finally {
      setIsRunningScan(false);
    }
  };

  const handleExecutePurge = async () => {
    setActiveAction('purga');
    try {
      const res = await storage.purgarDatosHuerfanos('Administrador');
      showToast(res.message, 'success');
      setTrazas(storage.getAuditLogs());
      if (onDataMutated) onDataMutated();
      await handleRunDiagnostic(true);
    } catch (err: any) {
      showToast(`Error al purgar huérfanos: ${err.message || 'Error'}`, 'error');
    } finally {
      setActiveAction(null);
      setConfirmModal(null);
    }
  };

  const handleExecuteSyncCajas = async () => {
    setActiveAction('cajas');
    try {
      const res = await storage.sincronizarCajasDesdeHistorial('Administrador');
      showToast(res.message, 'success');
      setTrazas(storage.getAuditLogs());
      if (onDataMutated) onDataMutated();
      await handleRunDiagnostic(true);
    } catch (err: any) {
      showToast(`Error al sincronizar cajas: ${err.message || 'Error'}`, 'error');
    } finally {
      setActiveAction(null);
      setConfirmModal(null);
    }
  };

  const handleExecuteRepararManifiestos = async () => {
    setActiveAction('manifiestos');
    try {
      const res = await storage.repararSaldosManifiestos('Administrador');
      showToast(res.message, 'success');
      setTrazas(storage.getAuditLogs());
      if (onDataMutated) onDataMutated();
      await handleRunDiagnostic(true);
    } catch (err: any) {
      showToast(`Error al reparar manifiestos: ${err.message || 'Error'}`, 'error');
    } finally {
      setActiveAction(null);
      setConfirmModal(null);
    }
  };

  const handleExecuteReparacionIntegral = async () => {
    setActiveAction('integral');
    try {
      const res = await storage.reparacionIntegralSistema('Administrador');
      showToast(res.message, 'success');
      setTrazas(storage.getAuditLogs());
      if (onDataMutated) onDataMutated();
      await handleRunDiagnostic(true);
    } catch (err: any) {
      showToast(`Error en reparación integral: ${err.message || 'Error'}`, 'error');
    } finally {
      setActiveAction(null);
      setConfirmModal(null);
    }
  };

  const handleExecuteRepararSubHuerfanos = async () => {
    setActiveAction('sub_huerfanos');
    try {
      const res = await storage.repararDatosHuerfanosSubManifiestos('Administrador');
      showToast(res.message, res.success ? 'success' : 'warning');
      setTrazas(storage.getAuditLogs());
      if (onDataMutated) onDataMutated();
      await handleRunDiagnostic(true);
    } catch (err: any) {
      showToast(`Error al reparar sub-manifiestos huérfanos: ${err.message || 'Error'}`, 'error');
    } finally {
      setActiveAction(null);
      setConfirmModal(null);
    }
  };

  const handleExecuteRecalcularSaldosSub = async () => {
    setActiveAction('recalcular_saldos_sub');
    try {
      const res = await storage.recalcularSaldosSubManifiestos('Administrador');
      showToast(res.message, res.success ? 'success' : 'warning');
      setTrazas(storage.getAuditLogs());
      if (onDataMutated) onDataMutated();
      await handleRunDiagnostic(true);
    } catch (err: any) {
      showToast(`Error al recalcular saldos de sub-manifiestos: ${err.message || 'Error'}`, 'error');
    } finally {
      setActiveAction(null);
      setConfirmModal(null);
    }
  };

  const handleExecuteReiniciarSistema = async () => {
    setActiveAction('reiniciar_sistema');
    try {
      const res = await storage.reiniciarSistemaACero('Administrador');
      showToast(res.message, 'success');
      setTrazas(storage.getAuditLogs());
      if (onDataMutated) onDataMutated();
      await handleRunDiagnostic(true);
    } catch (err: any) {
      showToast(`Error al reiniciar sistema: ${err.message || 'Error'}`, 'error');
    } finally {
      setActiveAction(null);
      setConfirmModal(null);
    }
  };

  const handleEjecutarAuditoriaYReparacionTotal = async () => {
    setActiveAction('auditoria_total');
    try {
      const win = window as any;
      if (typeof win.google !== 'undefined' && win.google?.script?.run) {
        win.google.script.run
          .withSuccessHandler((res: any) => {
            alert(res?.message || 'Auditoría y consistencia completada con éxito.');
            if (onDataMutated) onDataMutated();
            handleRunDiagnostic(true);
          })
          .withFailureHandler((err: any) => {
            alert('Error en auditoría y reparación: ' + (err?.message || err));
          })
          .ejecutarAuditoriaYReparacionTotal();
      } else {
        const res = await storage.ejecutarAuditoriaYReparacionTotal('Administrador');
        alert(res.message);
        showToast(res.message, 'success');
        setTrazas(storage.getAuditLogs());
        if (onDataMutated) onDataMutated();
        await handleRunDiagnostic(true);
      }
    } catch (err: any) {
      alert('Error en la auditoría: ' + (err.message || 'Error'));
      showToast(`Error en la auditoría: ${err.message || 'Error'}`, 'error');
    } finally {
      setActiveAction(null);
    }
  };

  const handleExecuteLimpiarAbsolutamenteTodoACero = async () => {
    setActiveAction('limpieza_total');
    try {
      const resLocal = await storage.limpiarSistemaAbsolutamenteTodoACero('Administrador');
      setTrazas(storage.getAuditLogs());

      const win = window as any;
      if (typeof win.google !== 'undefined' && win.google?.script?.run) {
        win.google.script.run
          .withSuccessHandler((res: any) => {
            alert(res?.message || '¡Limpieza total completada! Tablas vaciadas y saldos en 0.');
            if (onDataMutated) onDataMutated();
            handleRunDiagnostic(true);
          })
          .withFailureHandler((err: any) => {
            alert('Aviso: Limpieza local completada a cero. Error en Google Sheets: ' + (err?.message || err));
            if (onDataMutated) onDataMutated();
            handleRunDiagnostic(true);
          })
          .limpiarSistemaAbsolutamenteTodoACero();
      } else {
        alert(resLocal.message);
        showToast(resLocal.message, 'success');
        if (onDataMutated) onDataMutated();
        await handleRunDiagnostic(true);
      }
    } catch (err: any) {
      alert('Error en limpieza total: ' + (err.message || 'Error'));
      showToast(`Error al limpiar el sistema: ${err.message || 'Error'}`, 'error');
    } finally {
      setActiveAction(null);
      setConfirmModal(null);
    }
  };

  const handleCrearBackup = async (descargarLocal = true) => {
    setActiveAction('crear_backup');
    try {
      const res = await storage.crearBackupEnDrive('Administrador', descargarLocal);
      showToast(res.message, 'success');
      setTrazas(storage.getAuditLogs());
    } catch (err: any) {
      showToast(`Error al generar backup: ${err.message || 'Error'}`, 'error');
    } finally {
      setActiveAction(null);
    }
  };

  const handleCargarBackupsDrive = async () => {
    setIsLoadingBackupsDrive(true);
    try {
      const lista = await storage.listarBackupsEnDrive();
      setBackupsDrive(lista);
      if (lista.length === 0) {
        showToast('No se encontraron copias de seguridad en Google Drive (carpeta Backups_TranspoDrive).', 'info');
      }
    } catch (err: any) {
      showToast(`Error al consultar backups en Drive: ${err.message || 'Error'}`, 'warning');
    } finally {
      setIsLoadingBackupsDrive(false);
    }
  };

  const handleRestaurarDesdeDrive = async (fileId: string, fileName: string) => {
    if (!window.confirm(`¿Está seguro de restaurar la base de datos desde el respaldo "${fileName}"? Esta acción reemplazará los datos actuales.`)) {
      return;
    }
    setIsRestoringBackup(true);
    try {
      const jsonData = await storage.descargarBackupDesdeDrive(fileId);
      const res = await storage.restaurarBackupDesdeJSON(jsonData, 'Administrador');
      showToast(res.message, 'success');
      setTrazas(storage.getAuditLogs());
      setShowBackupModal(false);
      if (onDataMutated) onDataMutated();
      await handleRunDiagnostic(true);
    } catch (err: any) {
      showToast(`Error al restaurar backup desde Drive: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleSubirArchivoBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`¿Está seguro de restaurar la base de datos desde el archivo "${file.name}"? Los datos actuales serán reemplazados por los del respaldo.`)) {
      if (event.target) event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const jsonData = JSON.parse(text);
        setIsRestoringBackup(true);
        const res = await storage.restaurarBackupDesdeJSON(jsonData, 'Administrador');
        showToast(res.message, res.success ? 'success' : 'error');
        setTrazas(storage.getAuditLogs());
        setShowBackupModal(false);
        if (onDataMutated) onDataMutated();
        await handleRunDiagnostic(true);
      } catch (err: any) {
        showToast(`Error al leer archivo JSON: ${err.message || 'Formato inválido'}`, 'error');
      } finally {
        setIsRestoringBackup(false);
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Filtrado de anomalías según búsqueda
  const huerfanosFiltrados = useMemo(() => {
    if (!reporte?.detallesHuerfanos) return [];
    if (!filtroTexto.trim()) return reporte.detallesHuerfanos;
    const q = filtroTexto.toLowerCase();
    return reporte.detallesHuerfanos.filter(
      h =>
        h.id.toLowerCase().includes(q) ||
        h.valorInvalido.toLowerCase().includes(q) ||
        (h.detalles || '').toLowerCase().includes(q) ||
        h.tabla.toLowerCase().includes(q)
    );
  }, [reporte, filtroTexto]);

  const cajasFiltradas = useMemo(() => {
    if (!reporte?.detallesCajas) return [];
    if (!filtroTexto.trim()) return reporte.detallesCajas;
    const q = filtroTexto.toLowerCase();
    return reporte.detallesCajas.filter(
      c => c.caja.toLowerCase().includes(q) || c.estado.toLowerCase().includes(q)
    );
  }, [reporte, filtroTexto]);

  const manifiestosFiltrados = useMemo(() => {
    if (!reporte?.detallesManifiestos) return [];
    if (!filtroTexto.trim()) return reporte.detallesManifiestos;
    const q = filtroTexto.toLowerCase();
    return reporte.detallesManifiestos.filter(
      m =>
        m.idDoc.toLowerCase().includes(q) ||
        m.nroDocumento.toLowerCase().includes(q) ||
        m.clienteDestinatario.toLowerCase().includes(q) ||
        m.estadoActual.toLowerCase().includes(q)
    );
  }, [reporte, filtroTexto]);

  // Cálculos consolidados para KPIs
  const montoHuerfanosTotal = useMemo(() => {
    return (reporte?.detallesHuerfanos || []).reduce((acc, h) => acc + (h.montoBs || 0), 0);
  }, [reporte]);

  const diferenciaCajasNeta = useMemo(() => {
    return (reporte?.detallesCajas || []).reduce((acc, c) => acc + Math.abs(c.diferencia || 0), 0);
  }, [reporte]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* CABECERA EJECUTIVA DEL PANEL DE AUDITORÍA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Panel de Auditoría & Consistencia Contable
                </h1>
                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Google Sheets Integrity Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Diagnóstico cruzado en tiempo real, eliminación de registros huérfanos, reconciliación de arqueo y recálculo de cascada de fletes.
              </p>
            </div>
          </div>

          {/* Botones Principales de Acción */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleRunDiagnostic(false)}
              disabled={isRunningScan}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningScan ? 'animate-spin' : ''}`} />
              <span>{isRunningScan ? 'Escaneando Tablas...' : 'Ejecutar Diagnóstico del Sistema'}</span>
            </button>

            <button
              onClick={() =>
                setConfirmModal({
                  open: true,
                  tipo: 'INTEGRAL',
                  titulo: '¿Ejecutar Reparación Integral Automática?',
                  descripcion:
                    'Esta acción ejecutará secuencialmente: 1) Purga de datos huérfanos, 2) Reparación de cascada y saldos en manifiestos, y 3) Reconciliación de cajas desde el historial de transacciones.'
                })
              }
              disabled={isRunningScan || activeAction !== null}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Reparación Integral Automática</span>
            </button>
          </div>
        </div>

        {/* Metadatos del último escaneo */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Último escaneo: <strong className="text-slate-800">{reporte?.resumen.fechaDiagnostico || 'Pendiente'}</strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              Origen: <strong className="text-slate-800">{reporte?.resumen.origen || 'Caché'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Salud del Sistema:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                reporte?.resumen.saludGeneral === 'Óptima'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : reporte?.resumen.saludGeneral === 'Atención Requerida'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {reporte?.resumen.saludGeneral || 'Evaluando...'}
            </span>
          </div>
        </div>
      </div>

      {/* PANEL DE AUDITORÍA Y CONSISTENCIA CONTABLE (ESCANEO Y REPARACIÓN EN CASCADA) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Panel de Auditoría y Consistencia Contable</h3>
            <p className="text-sm text-slate-500">Escanea la base de datos, purga huérfanos y sincroniza saldos de CxC, CxP y Sub-Manifiestos.</p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200/60">Sistema Protegido (LockService)</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleEjecutarAuditoriaYReparacionTotal}
            disabled={isRunningScan || activeAction !== null}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {activeAction === 'auditoria_total' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : null}
            <span>🛠️ Ejecutar Escaneo, Reparación y Cascada</span>
          </button>

          <button
            onClick={() =>
              setConfirmModal({
                open: true,
                tipo: 'REINICIAR_SISTEMA_TOTAL',
                titulo: '⚠️ ¡ADVERTENCIA MÁXIMA! ¿Limpiar Absolutamente Todo el Sistema a Cero?',
                descripcion:
                  'Esta función vaciará de raíz todas las 11 hojas operativas y financieras (Transacciones_Diarias, Gastos_Ruta_Camion, Gastos_Administrativos, Manifiestos_Origen, Manifiestos_Destino, Viajes, Cobros_SubManifiestos, Cuentas_Por_Pagar, Cuentas_Por_Cobrar, Anticipos_Choferes, Liquidaciones_Ruta) y restablecerá a CERO (0) todos los saldos de Arqueo_Cajas. ¡Esta acción es irreversible!'
              })
            }
            disabled={isRunningScan || activeAction !== null}
            className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>⚠️ Limpiar Absolutamente Todo a Cero</span>
          </button>
        </div>
      </div>

      {/* CUADRÍCULA DE 4 TARJETAS DE INDICADORES CLAVE (KPIs DIAGNÓSTICO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Estado General de Integridad */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Integridad Global</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                reporte?.resumen.saludGeneral === 'Óptima'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tabular-nums">
                {reporte ? `${reporte.resumen.porcentajeIntegridad}%` : '--%'}
              </span>
              <span
                className={`text-xs font-bold ${
                  (reporte?.resumen.totalAnomalias || 0) === 0 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {(reporte?.resumen.totalAnomalias || 0) === 0 ? '100% Cuadrado' : `${reporte?.resumen.totalAnomalias} Alertas`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Consistencia cruzada entre 6 hojas contables</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Evaluación:</span>
            <strong className="text-slate-800">{reporte?.resumen.saludGeneral || 'Sincronizado'}</strong>
          </div>
        </div>

        {/* KPI 2: Huérfanos Detectados */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Datos Huérfanos</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                (reporte?.resumen.huerfanos || 0) > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Trash2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-black tabular-nums ${
                  (reporte?.resumen.huerfanos || 0) > 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {reporte ? reporte.resumen.huerfanos : 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">registros sin padre</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Compromete: <strong className="text-slate-700">Bs. {montoHuerfanosTotal.toFixed(2)}</strong>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() =>
                setConfirmModal({
                  open: true,
                  tipo: 'PURGA',
                  titulo: '¿Purgar Registros Huérfanos?',
                  descripcion:
                    'Se eliminarán de forma definitiva todas las transacciones o gastos de ruta cuyo viaje asociado ya no exista en la base de datos.'
                })
              }
              disabled={(reporte?.resumen.huerfanos || 0) === 0 || activeAction !== null}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purgar Huérfanos</span>
            </button>
            <span className="text-[10px] text-slate-400">Transacciones / Gastos</span>
          </div>
        </div>

        {/* KPI 3: Descuadres de Cajas */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descuadre en Cajas</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                (reporte?.resumen.descuadresCajas || 0) > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-black tabular-nums ${
                  (reporte?.resumen.descuadresCajas || 0) > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}
              >
                {reporte ? reporte.resumen.descuadresCajas : 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">cuentas desfasadas</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Desfase absoluto: <strong className="text-slate-700">Bs. {diferenciaCajasNeta.toFixed(2)}</strong>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() =>
                setConfirmModal({
                  open: true,
                  tipo: 'CAJAS',
                  titulo: '¿Reconciliar y Sincronizar Cajas?',
                  descripcion:
                    'Se recalculará desde cero el saldo disponible de cada caja en "Arqueo_Cajas" sumando los ingresos y restando los gastos registrados en el historial.'
                })
              }
              disabled={(reporte?.resumen.descuadresCajas || 0) === 0 || activeAction !== null}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Sincronizar Cajas</span>
            </button>
            <span className="text-[10px] text-slate-400">Arqueo_Cajas</span>
          </div>
        </div>

        {/* KPI 4: Inconsistencias CxC */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inconsistencias CxC</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                (reporte?.resumen.inconsistenciasManifiestos || 0) > 0
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-black tabular-nums ${
                  (reporte?.resumen.inconsistenciasManifiestos || 0) > 0 ? 'text-blue-600' : 'text-slate-900'
                }`}
              >
                {reporte ? reporte.resumen.inconsistenciasManifiestos : 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">documentos flete</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Saldos de manifiestos y sub-MICs desfasados</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() =>
                setConfirmModal({
                  open: true,
                  tipo: 'MANIFIESTOS',
                  titulo: '¿Reparar Cascada de Manifiestos?',
                  descripcion:
                    'Se recalcularán masivamente los cobros realizados y saldos pendientes en "Manifiestos_Destino" y "Manifiestos_Origen" según las amortizaciones reales.'
                })
              }
              disabled={(reporte?.resumen.inconsistenciasManifiestos || 0) === 0 || activeAction !== null}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Reparar Cascada</span>
            </button>
            <span className="text-[10px] text-slate-400">MIC / Sub-MIC</span>
          </div>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS DE ACCIÓN RÁPIDA (BOTONES DE ACCIÓN) */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 text-blue-400">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Acciones Correctivas y Saneamiento en Cascada</h3>
            <p className="text-xs text-slate-400">
              Ejecuta acciones individuales o la reparación integral en una sola transacción segura con bloqueo de concurrencia.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() =>
              setConfirmModal({
                open: true,
                tipo: 'PURGA',
                titulo: '¿Purgar Registros Huérfanos?',
                descripcion: 'Elimina transacciones y gastos con ID de viaje que ya no existen en la base de datos.'
              })
            }
            disabled={activeAction !== null}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-900/60 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>[🧹 Purgar Huérfanos]</span>
          </button>

          <button
            onClick={() =>
              setConfirmModal({
                open: true,
                tipo: 'CAJAS',
                titulo: '¿Sincronizar y Revertir Cajas?',
                descripcion: 'Recalcula desde cero los saldos de cada caja basándose estrictamente en el historial real.'
              })
            }
            disabled={activeAction !== null}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-900/60 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>[🔄 Sincronizar Cajas]</span>
          </button>

          <button
            onClick={() =>
              setConfirmModal({
                open: true,
                tipo: 'MANIFIESTOS',
                titulo: '¿Reparar Cascada y Saldos de Manifiestos?',
                descripcion: 'Reconcilia los saldos pendientes y estados de liquidación de todos los documentos MIC / Sub-MIC.'
              })
            }
            disabled={activeAction !== null}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-900/60 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-blue-400" />
            <span>[🔗 Reparar Manifiestos]</span>
          </button>

          <button
            onClick={() =>
              setConfirmModal({
                open: true,
                tipo: 'SUB_HUERFANOS',
                titulo: '¿Escanear y Reparar Sub-Manifiestos Huérfanos?',
                descripcion: 'Escanea todas las tablas para purgar transacciones, gastos y movimientos huérfanos de sub-manifiestos eliminados, revirtiendo arqueos y recalculando saldos de viajes.'
              })
            }
            disabled={activeAction !== null}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-900/60 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            {activeAction === 'sub_huerfanos' ? (
              <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            ) : (
              <Layers className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>[🛠️ Escanear y Reparar Sub-Manifiestos Huérfanos]</span>
          </button>

          <button
            onClick={() =>
              setConfirmModal({
                open: true,
                tipo: 'RECALCULAR_SALDOS_SUB',
                titulo: '¿Recalcular Saldos y Flete Total de Sub-Manifiestos?',
                descripcion: 'Aplica la fórmula matemática estricta: Flete Total Asignado = Pagado en Origen + Por Pagar en Destino, y Saldo Pendiente Cliente = Por Pagar en Destino - Cobros Realizados, en la base de datos y Google Sheets.'
              })
            }
            disabled={activeAction !== null}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-900/60 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            {activeAction === 'recalcular_saldos_sub' ? (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>[📐 Recalcular Saldos Sub-Manifiestos (Origen + Destino)]</span>
          </button>

          <button
            onClick={() => handleCrearBackup(true)}
            disabled={activeAction !== null}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/70 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
          >
            {activeAction === 'crear_backup' ? (
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            ) : (
              <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>[💾 Generar Backup en Drive / JSON]</span>
          </button>

          <button
            onClick={() => {
              setShowBackupModal(true);
              handleCargarBackupsDrive();
            }}
            disabled={activeAction !== null}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-800/70 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
          >
            <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
            <span>[📂 Restaurar Backup (Drive / Archivo)]</span>
          </button>

          <button
            onClick={() =>
              setConfirmModal({
                open: true,
                tipo: 'REINICIAR_SISTEMA',
                titulo: '⚠️ ¡ADVERTENCIA CRÍTICA! ¿Reiniciar Todo el Sistema a Cero?',
                descripcion: 'Esta acción eliminará de forma irreversible todas las transacciones, gastos de ruta, viajes, manifiestos MIC, sub-manifiestos/encomiendas y pondrá en cero (0) todos los saldos de arqueo de cajas en la base de datos y Google Sheets. ¿Está completamente seguro de continuar?'
              })
            }
            disabled={activeAction !== null}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
          >
            {activeAction === 'reiniciar_sistema' ? (
              <RefreshCw className="w-3.5 h-3.5 text-rose-400 animate-spin" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>[🚨 Reiniciar Sistema a Cero]</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN DE INSPECCIÓN DETALLADA CON PESTAÑAS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Cabecera de Navegación de Pestañas + Buscador */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('anomalias')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'anomalias'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Registros Huérfanos ({reporte?.detallesHuerfanos.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('cajas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'cajas'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auditoría de Cajas ({reporte?.detallesCajas.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('manifiestos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'manifiestos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Manifiestos & CxC ({reporte?.detallesManifiestos.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Traza de Auditoría ({trazas.length})</span>
            </button>
          </div>

          {/* Buscador Rápido */}
          <div className="relative min-w-[200px] sm:min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
              placeholder="Filtrar por ID, documento, caja..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* CONTENIDO TAB 1: REGISTROS HUÉRFANOS */}
        {activeTab === 'anomalias' && (
          <div className="p-4 sm:p-6">
            {huerfanosFiltrados.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900">No se detectaron registros huérfanos</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Todas las transacciones y gastos de ruta están debidamente enlazados a viajes y documentos padre existentes.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3.5">ID Registro</th>
                      <th className="py-3 px-3.5">Tabla Secundaria</th>
                      <th className="py-3 px-3.5">Llave Rota / Invalida</th>
                      <th className="py-3 px-3.5">Diagnóstico del Error</th>
                      <th className="py-3 px-3.5 text-right">Importe Afectado</th>
                      <th className="py-3 px-3.5 text-center">Severidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {huerfanosFiltrados.map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3.5 font-bold text-slate-900 font-mono">{h.id}</td>
                        <td className="py-3 px-3.5 text-slate-600">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                            {h.tabla}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-rose-600 font-bold">
                          {h.campo}: "{h.valorInvalido}"
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 max-w-xs">
                          <div>{h.motivo}</div>
                          {h.detalles && <div className="text-[11px] text-slate-400 mt-0.5 truncate">{h.detalles}</div>}
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-slate-900 tabular-nums">
                          Bs. {Number(h.montoBs || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            CRÍTICA (Huérfano)
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

        {/* CONTENIDO TAB 2: AUDITORÍA DE CAJAS Y ARQUEO */}
        {activeTab === 'cajas' && (
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Caja / Cuenta</th>
                    <th className="py-3 px-3.5 text-right">Saldo Inicial</th>
                    <th className="py-3 px-3.5 text-right">Ingresos Reales</th>
                    <th className="py-3 px-3.5 text-right">Gastos Reales</th>
                    <th className="py-3 px-3.5 text-right">Saldo Histórico Esperado</th>
                    <th className="py-3 px-3.5 text-right">Saldo Registrado en Arqueo</th>
                    <th className="py-3 px-3.5 text-right">Desfase (Dif)</th>
                    <th className="py-3 px-3.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {cajasFiltradas.map((c, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/70 transition ${
                        c.estado !== 'Cuadrado' ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 font-bold text-slate-900">{c.caja}</td>
                      <td className="py-3 px-3.5 text-right tabular-nums text-slate-600">
                        Bs. {c.saldoInicial.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right tabular-nums text-emerald-600 font-semibold">
                        + Bs. {c.totalIngresosReal.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right tabular-nums text-rose-600 font-semibold">
                        - Bs. {c.totalGastosReal.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right tabular-nums font-bold text-blue-700 bg-blue-50/30">
                        Bs. {c.saldoHistoricoReal.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right tabular-nums font-bold text-slate-900">
                        Bs. {c.saldoRegistrado.toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-3.5 text-right tabular-nums font-black ${
                          Math.abs(c.diferencia) > 0.05 ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      >
                        {c.diferencia > 0 ? `+Bs. ${c.diferencia.toFixed(2)}` : c.diferencia < 0 ? `-Bs. ${Math.abs(c.diferencia).toFixed(2)}` : 'Bs. 0.00'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.estado === 'Cuadrado'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                          }`}
                        >
                          {c.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTENIDO TAB 3: CONSISTENCIA DE MANIFIESTOS (CxC) */}
        {activeTab === 'manifiestos' && (
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Documento</th>
                    <th className="py-3 px-3.5">Cliente / Destinatario</th>
                    <th className="py-3 px-3.5 text-right">Flete Asignado</th>
                    <th className="py-3 px-3.5 text-right">Cobrado en Transacciones</th>
                    <th className="py-3 px-3.5 text-right">Saldo Registrado</th>
                    <th className="py-3 px-3.5 text-right">Saldo Esperado</th>
                    <th className="py-3 px-3.5 text-right">Desfase</th>
                    <th className="py-3 px-3.5 text-center">Estado Actual</th>
                    <th className="py-3 px-3.5 text-center">Estado Recomendado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {manifiestosFiltrados.map((m, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/70 transition ${
                        m.tieneInconsistencia ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 font-bold font-mono text-slate-900">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 mr-1 text-slate-600">
                          {m.tipo}
                        </span>
                        {m.nroDocumento}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 font-semibold">{m.clienteDestinatario}</td>
                      <td className="py-3 px-3.5 text-right tabular-nums text-slate-900 font-bold">
                        Bs. {m.fleteTotalBs.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right tabular-nums text-emerald-600 font-semibold">
                        Bs. {m.cobrosRealesCalculadosBs.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right tabular-nums text-slate-700">
                        Bs. {m.saldoRegistradoBs.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right tabular-nums font-black text-blue-700 bg-blue-50/20">
                        Bs. {m.saldoRealCalculadoBs.toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-3.5 text-right tabular-nums font-bold ${
                          Math.abs(m.diferenciaSaldoBs) > 0.05 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        Bs. {m.diferenciaSaldoBs.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {m.estadoActual}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            m.estadoRecomendado === 'Liquidado'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : m.estadoRecomendado === 'Pendiente Parcial'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {m.estadoRecomendado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTENIDO TAB 4: HISTORIAL DE TRAZABILIDAD Y AUDITORÍA */}
        {activeTab === 'logs' && (
          <div className="p-4 sm:p-6">
            {trazas.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-500">
                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">No hay trazas de auditoría registradas todavía.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3.5">ID Traza</th>
                      <th className="py-3 px-3.5">Fecha y Hora</th>
                      <th className="py-3 px-3.5">Operación / Acción</th>
                      <th className="py-3 px-3.5">Ejecutado Por</th>
                      <th className="py-3 px-3.5 text-center">Registros Afectados</th>
                      <th className="py-3 px-3.5 text-center">Resultado</th>
                      <th className="py-3 px-3.5">Detalles de la Corrección</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {trazas.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3.5 font-mono text-[11px] font-bold text-slate-600">{t.idTraza}</td>
                        <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">{t.fechaHora}</td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">{t.titulo}</td>
                        <td className="py-3 px-3.5 text-slate-600">{t.usuario}</td>
                        <td className="py-3 px-3.5 text-center font-bold text-slate-800 tabular-nums">
                          {t.registrosAfectados}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              t.resultado === 'Éxito'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : t.resultado === 'Advertencia'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {t.resultado}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 text-[11px] max-w-sm">
                          {t.detalles && t.detalles.length > 0 ? (
                            <ul className="list-disc list-inside space-y-0.5">
                              {t.detalles.slice(0, 3).map((d, dIdx) => (
                                <li key={dIdx} className="truncate">{d}</li>
                              ))}
                              {t.detalles.length > 3 && (
                                <span className="text-blue-600 text-[10px] font-semibold">
                                  +{t.detalles.length - 3} detalles más
                                </span>
                              )}
                            </ul>
                          ) : (
                            <span className="text-slate-400">Sin observaciones</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN DE ACCIONES CORRECTIVAS */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 tracking-tight">{confirmModal.titulo}</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{confirmModal.descripcion}</p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setConfirmModal(null)}
                disabled={activeAction !== null}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={() => {
                  if (confirmModal.tipo === 'PURGA') handleExecutePurge();
                  else if (confirmModal.tipo === 'CAJAS') handleExecuteSyncCajas();
                  else if (confirmModal.tipo === 'MANIFIESTOS') handleExecuteRepararManifiestos();
                  else if (confirmModal.tipo === 'INTEGRAL') handleExecuteReparacionIntegral();
                  else if (confirmModal.tipo === 'SUB_HUERFANOS') handleExecuteRepararSubHuerfanos();
                  else if (confirmModal.tipo === 'RECALCULAR_SALDOS_SUB') handleExecuteRecalcularSaldosSub();
                  else if (confirmModal.tipo === 'REINICIAR_SISTEMA') handleExecuteReiniciarSistema();
                  else if (confirmModal.tipo === 'REINICIAR_SISTEMA_TOTAL') handleExecuteLimpiarAbsolutamenteTodoACero();
                }}
                disabled={activeAction !== null}
                className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm ${
                  confirmModal.tipo === 'REINICIAR_SISTEMA' || confirmModal.tipo === 'REINICIAR_SISTEMA_TOTAL'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {activeAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {confirmModal.tipo === 'REINICIAR_SISTEMA_TOTAL'
                    ? 'Sí, Vaciar Todo y Cajas a CERO'
                    : confirmModal.tipo === 'REINICIAR_SISTEMA'
                    ? 'Sí, Reiniciar Todo a Cero'
                    : 'Confirmar y Ejecutar'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GESTIÓN DE BACKUPS (DRIVE Y ARCHIVO LOCAL) */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FolderArchive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Gestor de Respaldos (Backup y Restauración)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Almacenamiento seguro en Google Drive y descarga directa en JSON
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBackupModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 mt-6">
              {/* Bloque 1: Generar Respaldo Ahora */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Save className="w-4 h-4 text-emerald-600" />
                      <span>Generar Nuevo Respaldo (Backup)</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Descarga el archivo <code className="bg-slate-200/70 px-1.5 py-0.5 rounded text-[11px] font-mono">Backup_TranspoDrive_*.json</code> en tu PC y guarda una copia automática en la carpeta <strong className="text-slate-700">"Backups_TranspoDrive"</strong> de Google Drive.
                    </p>
                  </div>
                  <button
                    onClick={() => handleCrearBackup(true)}
                    disabled={activeAction !== null}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {activeAction === 'crear_backup' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Generar y Descargar Backup</span>
                  </button>
                </div>
              </div>

              {/* Bloque 2: Restaurar desde Archivo Local */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Restaurar desde Archivo JSON Local</span>
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Selecciona un archivo de respaldo previo en tu computadora para restaurar instantáneamente todas las tablas y saldos.
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer hover:bg-slate-50">
                  <FileUp className="w-4 h-4 text-indigo-600" />
                  <span>{isRestoringBackup ? 'Restaurando archivo...' : 'Seleccionar Archivo JSON de Backup'}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleSubirArchivoBackup}
                    disabled={isRestoringBackup}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Bloque 3: Backups Disponibles en Google Drive */}
              <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Respaldos en Google Drive (Carpeta Backups_TranspoDrive)
                    </h4>
                  </div>
                  <button
                    onClick={handleCargarBackupsDrive}
                    disabled={isLoadingBackupsDrive}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackupsDrive ? 'animate-spin' : ''}`} />
                    <span>Actualizar Lista</span>
                  </button>
                </div>

                {isLoadingBackupsDrive ? (
                  <div className="text-center py-8 text-slate-500 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Consultando Google Drive...</span>
                  </div>
                ) : backupsDrive.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <HardDrive className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p>No se encontraron respaldos en la carpeta de Drive o no se ha conectado el script.</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Usa el botón "Generar y Descargar Backup" para crear la primera copia en Google Drive.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {backupsDrive.map(b => (
                      <div key={b.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="truncate">
                          <p className="font-bold text-slate-800 truncate">{b.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(b.date).toLocaleString('es-BO')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {b.url && (
                            <a
                              href={b.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            >
                              Ver en Drive
                            </a>
                          )}
                          <button
                            onClick={() => handleRestaurarDesdeDrive(b.id, b.name)}
                            disabled={isRestoringBackup}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            {isRestoringBackup ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            <span>Restaurar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pie */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowBackupModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
