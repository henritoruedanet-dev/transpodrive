import React, { useState } from 'react';
import {
  DollarSign,
  Wallet,
  Receipt,
  Calendar,
  X,
  AlertCircle,
  CheckCircle2,
  Building2,
  User
} from 'lucide-react';

export interface ItemCobroCxC {
  idSubManifiesto?: string;
  nroManifiesto?: string;
  deudor: string;
  tipoDeudor: 'CLIENTE' | 'AGENCIA_ORIGEN' | 'AGENCIA_DESTINO';
  saldoPendienteBs: number;
  fleteTotalBs: number;
  sucursal?: string;
  viajeId?: string;
}

interface RegistrarCobroReporteModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemCobroCxC | null;
  cajasDisponibles: string[];
  onConfirmCobro: (payload: {
    idSubManifiesto?: string;
    nroManifiesto?: string;
    deudor: string;
    tipoDeudor: string;
    montoBs: number;
    cajaCuentaRecaudadora: string;
    fecha: string;
    nroComprobante: string;
    notas: string;
  }) => Promise<void>;
}

export const RegistrarCobroReporteModal: React.FC<RegistrarCobroReporteModalProps> = ({
  isOpen,
  onClose,
  item,
  cajasDisponibles,
  onConfirmCobro
}) => {
  const [montoBs, setMontoBs] = useState<string>(String(item?.saldoPendienteBs || ''));
  const [cajaRecaudadora, setCajaRecaudadora] = useState<string>(cajasDisponibles[0] || 'Banco Unión QR');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nroComprobante, setNroComprobante] = useState<string>(`REC-${Date.now().toString().slice(-6)}`);
  const [notas, setNotas] = useState<string>(`Cobro de saldo flete ${item?.nroManifiesto || ''} - ${item?.deudor || ''}`);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const montoNum = parseFloat(montoBs) || 0;
  const nuevoSaldo = Math.max(0, (item?.saldoPendienteBs || 0) - montoNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setErrorMsg(null);

    if (montoNum <= 0) {
      setErrorMsg('El importe a cobrar debe ser mayor a 0 Bs.');
      return;
    }

    if (!cajaRecaudadora) {
      setErrorMsg('Seleccione la caja o cuenta donde ingresará el dinero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmCobro({
        idSubManifiesto: item.idSubManifiesto,
        nroManifiesto: item.nroManifiesto,
        deudor: item.deudor,
        tipoDeudor: item.tipoDeudor,
        montoBs: montoNum,
        cajaCuentaRecaudadora: cajaRecaudadora,
        fecha,
        nroComprobante,
        notas
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el cobro');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 lg:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl xl:max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Encabezado de Modal (Header) */}
        <div className="bg-slate-50/80 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/50 flex items-center justify-center text-emerald-600 shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Registrar Cobro de Saldo (CxC)
              </h3>
              <p className="text-xs text-slate-500">
                Abono directo de cuenta por cobrar hacia caja/banco y actualización de saldo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario y Contenido */}
        <form onSubmit={handleSubmit}>
          {/* Cuerpo del Modal (Body) con 2 columnas paralelas en Desktop */}
          <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200/60 rounded-2xl text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* COLUMNA 1: DEUDOR & IMPORTE */}
              <div className="space-y-4">
                {/* Ficha Resumen del Deudor */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Deudor Responsable:
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      {item.tipoDeudor === 'CLIENTE' ? 'Cliente Directo' : (item.tipoDeudor === 'AGENCIA_ORIGEN' ? 'Agencia Origen' : 'Agencia Destino')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.tipoDeudor === 'CLIENTE' ? (
                      <User className="w-4 h-4 text-slate-600" />
                    ) : (
                      <Building2 className="w-4 h-4 text-slate-600" />
                    )}
                    <span className="text-sm font-extrabold text-slate-900 truncate">
                      {item.deudor}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500">Ref. Manifiesto: </span>
                      <span className="font-mono font-bold text-blue-700">{item.nroManifiesto || 'S/N'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">Saldo Pendiente: </span>
                      <span className="font-mono font-black text-rose-600">
                        Bs. {item.saldoPendienteBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Campo: Importe a Cobrar */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                    Importe a Cobrar (Bs.) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={montoBs}
                      onChange={(e) => setMontoBs(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-emerald-700 text-base font-black focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all placeholder:text-slate-400"
                      required
                    />
                    <span className="absolute right-4 top-3.5 font-bold text-slate-400 text-sm">Bs.</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                    <span>Nuevo saldo tras este cobro:</span>
                    <span className="font-bold text-slate-800">
                      Bs. {nuevoSaldo.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* COLUMNA 2: CAJA, FECHAS Y NOTAS */}
              <div className="space-y-4">
                {/* Campo: Caja / Cuenta Recaudadora */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Caja o Cuenta Recaudadora (Arqueo_Cajas) *</span>
                  </label>
                  <select
                    value={cajaRecaudadora}
                    onChange={(e) => setCajaRecaudadora(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
                    required
                  >
                    {cajasDisponibles.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Fecha y Nro Comprobante */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                      Fecha del Cobro *
                    </label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                      Nro. Recibo / Comprobante
                    </label>
                    <input
                      type="text"
                      value={nroComprobante}
                      onChange={(e) => setNroComprobante(e.target.value)}
                      placeholder="REC-001"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                    Concepto / Notas
                  </label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Detalle u observaciones del cobro..."
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pie del Modal (Footer) */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || montoNum <= 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Procesando...' : 'Confirmar Cobranza'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
