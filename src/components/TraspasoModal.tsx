import React, { useState } from 'react';
import { X, ArrowRightLeft, CheckCircle2, AlertCircle, Building2, Wallet } from 'lucide-react';
import { Catalogos, TraspasoFondos } from '../types';

interface TraspasoModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogos: Catalogos;
  onSaveTraspaso: (traspaso: Omit<TraspasoFondos, 'idTraspaso'>) => Promise<void>;
}

export const TraspasoModal: React.FC<TraspasoModalProps> = ({
  isOpen,
  onClose,
  catalogos,
  onSaveTraspaso
}) => {
  const [cuentaOrigen, setCuentaOrigen] = useState<string>(catalogos.cajasCuentas[1] || 'Caja Sucursal Tarija');
  const [cuentaDestino, setCuentaDestino] = useState<string>(catalogos.cajasCuentas[7] || 'Cuenta Bancaria Central');
  const [montoBs, setMontoBs] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('Remesa de recaudación semanal');
  const [nroComprobante, setNroComprobante] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(montoBs);
    if (isNaN(monto) || monto <= 0) {
      setErrorMsg('Ingrese un monto válido mayor a 0 Bs.');
      return;
    }
    if (cuentaOrigen === cuentaDestino) {
      setErrorMsg('La cuenta origen y destino deben ser distintas.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveTraspaso({
        fechaHora: new Date().toISOString().replace('T', ' ').substring(0, 16),
        cuentaOrigen,
        cuentaDestino,
        montoBs: monto,
        motivo: motivo || 'Traspaso de fondos entre cuentas',
        nroComprobante: nroComprobante || `TRS-${Date.now().toString().slice(-4)}`
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error realizando traspaso');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-md rounded-t-[20px] sm:rounded-[18px] shadow-2xl overflow-hidden my-0 sm:my-4 flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8fafc] border-b border-[#e2e8f0] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Traspaso entre Cuentas</h3>
              <p className="text-[11px] text-[#64748b]">Movimiento de fondos entre cajas y bancos</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[#dc2626] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Origen y Destino */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Cuenta / Caja de Origen (Sale el dinero) *</label>
              <select
                value={cuentaOrigen}
                onChange={(e) => setCuentaOrigen(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[46px]"
                required
              >
                {catalogos.cajasCuentas.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center -my-1 text-[#1d4ed8]">
              <div className="p-1.5 bg-[#eff6ff] rounded-full border border-blue-200">
                <ArrowRightLeft className="w-4 h-4 rotate-90 sm:rotate-0" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Cuenta / Caja de Destino (Ingresa el dinero) *</label>
              <select
                value={cuentaDestino}
                onChange={(e) => setCuentaDestino(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[46px]"
                required
              >
                {catalogos.cajasCuentas.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Monto a Traspasar (Bs) *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">Bs</span>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={montoBs}
                onChange={(e) => setMontoBs(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl pl-10 pr-3 py-2.5 text-base font-black text-[#1d4ed8] focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[46px]"
                required
              />
            </div>
          </div>

          {/* Motivo & Nro Comprobante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Motivo / Concepto</label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Remesa, reposición viáticos..."
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[46px]"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Nro Boleta / Transf.</label>
              <input
                type="text"
                value={nroComprobante}
                onChange={(e) => setNroComprobante(e.target.value)}
                placeholder="TRF-0981"
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[46px]"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-[#e2e8f0] flex justify-end space-x-2 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-semibold min-h-[46px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-blue-600/25 transition-all min-h-[46px]"
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar Traspaso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
