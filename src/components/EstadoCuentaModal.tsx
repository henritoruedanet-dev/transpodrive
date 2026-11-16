import React, { useRef, useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  FileSpreadsheet,
  Share2,
  X,
  User,
  Building2,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { DatosEmpresa } from '../types';
import { exportToExcel, exportElementToPDF, handlePrintDocument } from '../utils/exportUtils';

export interface MovimientoEstadoCuenta {
  id: string;
  fecha: string;
  referencia: string; // e.g. MIC-104 / Factura #5521
  nroComprobante?: string; // REC-001 / REC-042 / FACT-102
  concepto: string;
  caja?: string; // Caja Central, Banco Unión QR, Efectivo Chofer
  debitoBs: number; // Cargo / Importe Total
  creditoBs: number; // Abono / Pago Realizado
  saldoBs: number; // Saldo gradual acumulado
  estado?: string;
}

export interface ItemHistorialAbono {
  fecha: string;
  nroComprobante: string;
  concepto: string;
  cargo: number;
  abono: number;
  caja: string;
}

export interface EntidadEstadoCuenta {
  tipo: 'CLIENTE' | 'AGENCIA_ORIGEN' | 'AGENCIA_DESTINO' | 'PROVEEDOR';
  nombre: string;
  nitCi?: string;
  telefono?: string;
  rubro?: string;
  direccion?: string;
  saldoConsolidadoBs: number;
  totalCargosBs: number;
  totalAbonosBs: number;
  historialAbonos?: ItemHistorialAbono[];
  movimientos: MovimientoEstadoCuenta[];
}

interface EstadoCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  entidad: EntidadEstadoCuenta | null;
  empresa?: DatosEmpresa;
}

export const EstadoCuentaModal: React.FC<EstadoCuentaModalProps> = ({
  isOpen,
  onClose,
  entidad,
  empresa
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!isOpen || !entidad) return null;

  const getTipoLabel = () => {
    switch (entidad.tipo) {
      case 'CLIENTE':
        return 'Cliente Directo (Deudor CxC)';
      case 'AGENCIA_ORIGEN':
        return 'Agencia / Sucursal de Origen (Rendición CxC)';
      case 'AGENCIA_DESTINO':
        return 'Agencia / Sucursal de Destino (CxC Agencia)';
      case 'PROVEEDOR':
        return `Proveedor de ${entidad.rubro || 'Servicios y Repuestos'} (CxP)`;
      default:
        return 'Cuenta Corriente';
    }
  };

  const isCxP = entidad.tipo === 'PROVEEDOR';

  // Exportar a Excel formato Kardex detallado
  const handleExportarExcel = () => {
    const dataExcel = entidad.movimientos.map((m) => ({
      FECHA: m.fecha,
      NRO_COMPROBANTE: m.nroComprobante || m.referencia || '',
      CONCEPTO_DETALLE: m.concepto,
      CAJA_BANCO: m.caja || 'No aplica / Crédito',
      CARGO_BS: m.debitoBs,
      ABONO_BS: m.creditoBs,
      SALDO_RESULTANTE_BS: m.saldoBs,
      ESTADO: m.estado || ''
    }));

    const cleanName = entidad.nombre.replace(/[^a-zA-Z0-9]/g, '_');
    exportToExcel(
      dataExcel,
      `Estado_Cuenta_${cleanName}_${new Date().toISOString().split('T')[0]}`,
      'Estado_Cuenta'
    );
  };

  // Descargar PDF en el cliente
  const handleDownloadPDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const cleanName = entidad.nombre.replace(/[^a-zA-Z0-9]/g, '_');
      await exportElementToPDF(
        printAreaRef.current || 'estado-cuenta-print-area',
        `Estado_Cuenta_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Enviar resumen por WhatsApp
  const handleShareWhatsApp = () => {
    const texto = `*ESTADO DE CUENTA - ${empresa?.nombre || 'TRANSPODRIVE'}*\n` +
      `Deudor/Cuenta: *${entidad.nombre}*\n` +
      `Tipo: ${getTipoLabel()}\n` +
      `Total Cargas/Facturado: Bs. ${entidad.totalCargosBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}\n` +
      `Total Pagado/Abonado: Bs. ${entidad.totalAbonosBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}\n` +
      `*SALDO PENDIENTE ACTUAL: Bs. ${entidad.saldoConsolidadoBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}*\n\n` +
      `Detalle de ${entidad.movimientos.length} operaciones emitido al ${new Date().toLocaleDateString('es-BO')}.`;

    const url = `https://wa.me/${(entidad.telefono || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(texto)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 lg:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 my-auto flex flex-col max-h-[90vh]">
        {/* Encabezado Material Design 3 */}
        <div className="bg-slate-50/80 px-8 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${isCxP ? 'bg-rose-600' : 'bg-[#1A73E8]'}`}>
              {isCxP ? <Building2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
                Estado de Cuenta: {entidad.nombre}
              </h3>
              <p className="text-xs text-slate-500">
                {getTipoLabel()} • Saldo Pendiente: <strong className="text-slate-800 font-bold">Bs. {entidad.saldoConsolidadoBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap no-print">
            {/* Botón Imprimir */}
            <button
              type="button"
              onClick={handlePrintDocument}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Imprimir Estado de Cuenta"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Botón Descargar PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="p-2 sm:px-4 sm:py-2 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] disabled:opacity-50 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              title="Descargar archivo PDF"
            >
              <Download className={`w-4 h-4 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">
                {isGeneratingPDF ? 'Generando...' : 'PDF'}
              </span>
            </button>

            {/* Botón Exportar a Excel */}
            <button
              type="button"
              onClick={handleExportarExcel}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
              title="Exportar a Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* Botón WhatsApp */}
            {entidad.telefono && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                title="Compartir resumen por WhatsApp"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo Material Design 3 con scroll controlado */}
        <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto text-xs flex-1" ref={printAreaRef} id="estado-cuenta-print-area">
          {/* Membrete Corporativo */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {empresa?.nombre || 'TRANSPODRIVE - GESTIÓN DE TRANSPORTE Y ENCOMIENDAS'}
              </h2>
              <p className="text-slate-500 text-[11px]">
                {empresa?.direccion || 'Oficina Central: Av. Panamericana #1020'} • Tel: {empresa?.telefono || '72984512'}
              </p>
              <p className="text-slate-500 text-[11px]">
                NIT: {empresa?.nit || '1029384756'} • {empresa?.ciudad || 'Tarija - Bolivia'}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-300">
                ESTADO DE CUENTA OFICIAL
              </span>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Fecha de Emisión: {new Date().toLocaleDateString('es-BO')}
              </p>
            </div>
          </div>

          {/* Ficha del Deudor / Proveedor */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {isCxP ? 'Proveedor / Acreedor:' : 'Deudor / Titular:'}
              </span>
              <span className="font-extrabold text-slate-900 text-sm block truncate" title={entidad.nombre}>
                {entidad.nombre}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                NIT / CI:
              </span>
              <span className="font-semibold text-slate-800 text-xs block font-mono">
                {entidad.nitCi || 'S/N'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Teléfono / Contacto:
              </span>
              <span className="font-semibold text-slate-800 text-xs block font-mono flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {entidad.telefono || 'Sin teléfono registrado'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Clasificación:
              </span>
              <span className={`inline-block font-bold text-[11px] px-2 py-0.5 rounded-full border ${
                isCxP ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-blue-100 text-blue-800 border-blue-300'
              }`}>
                {getTipoLabel()}
              </span>
            </div>
          </div>

          {/* Tarjetas KPI de Saldo Consolidado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-100/80 border border-slate-200 p-3.5 rounded-xl text-center">
              <span className="text-[11px] font-bold text-slate-600 block">
                {isCxP ? 'Total Compras / Gastos (Bs.)' : 'Total Fletes Asignados (Bs.)'}
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                Bs. {entidad.totalCargosBs.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-center">
              <span className="text-[11px] font-bold text-emerald-800 block">
                {isCxP ? 'Total Pagado / Abonado (Bs.)' : 'Total Cobrado / Rendido (Bs.)'}
              </span>
              <span className="text-base font-black text-emerald-700 tabular-nums">
                Bs. {entidad.totalAbonosBs.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className={`p-3.5 rounded-xl text-center border-2 ${
              entidad.saldoConsolidadoBs > 0
                ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs'
                : 'bg-emerald-50 border-emerald-400 text-emerald-950'
            }`}>
              <span className="text-[11px] font-black uppercase tracking-wider block">
                SALDO PENDIENTE CONSOLIDADO:
              </span>
              <span className={`text-xl font-black tabular-nums ${
                entidad.saldoConsolidadoBs > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                Bs. {entidad.saldoConsolidadoBs.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Histórico Cronológico de Movimientos */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Histórico de Operaciones y Movimientos Cronológicos ({entidad.movimientos.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                Ordenado cronológicamente
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs bg-white">
              <table className="w-full text-xs min-w-[760px]">
                <thead className="bg-slate-100/90 text-slate-700 border-b-2 border-slate-200 uppercase font-bold select-none text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-left whitespace-nowrap">Fecha</th>
                    <th className="py-2.5 px-3 text-left whitespace-nowrap">Nro. Comprobante</th>
                    <th className="py-2.5 px-3 text-left">Concepto / Detalle</th>
                    <th className="py-2.5 px-3 text-left whitespace-nowrap">Caja / Banco</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Cargo (Bs.)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Abono (Bs.)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Saldo Resultante (Bs.)</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entidad.movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        No se registran movimientos para esta cuenta en el periodo consultado.
                      </td>
                    </tr>
                  ) : (
                    entidad.movimientos.map((mov, idx) => (
                      <tr key={mov.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-slate-700 font-mono text-left whitespace-nowrap">
                          {mov.fecha}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700 text-left whitespace-nowrap">
                          {mov.nroComprobante || mov.referencia || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 text-left font-medium">
                          {mov.concepto}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-left whitespace-nowrap">
                          {mov.caja ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                              🏦 {mov.caja}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Crédito</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black tabular-nums text-slate-900 whitespace-nowrap">
                          {mov.debitoBs > 0 ? `Bs. ${mov.debitoBs.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black tabular-nums text-emerald-600 whitespace-nowrap">
                          {mov.creditoBs > 0 ? `Bs. ${mov.creditoBs.toFixed(2)}` : '-'}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black tabular-nums whitespace-nowrap ${
                          mov.saldoBs > 0 ? 'text-rose-600 bg-rose-50/40' : 'text-emerald-700 bg-emerald-50/40'
                        }`}>
                          Bs. {mov.saldoBs.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            mov.saldoBs <= 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}>
                            {mov.saldoBs <= 0 ? 'Liquidado' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pie del documento impreso */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-400">
            <div>
              <p>Este estado de cuenta refleja los registros operativos vigentes en el sistema.</p>
              <p>Para consultas o conciliaciones, comuníquese con el departamento contable.</p>
            </div>
            <div className="text-right">
              <div className="w-36 border-t border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-700">Firma / Sello de Conformidad</p>
            </div>
          </div>
        </div>

        {/* Pie Material Design 3 */}
        <div className="bg-slate-50/80 px-8 py-4 border-t border-slate-100 flex justify-end gap-3 no-print shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl text-slate-700 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-200 transition-colors font-bold text-xs min-h-[44px]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
