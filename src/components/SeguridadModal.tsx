import React, { useState } from 'react';
import { X, ShieldCheck, Lock, Fingerprint, KeyRound, CheckCircle2 } from 'lucide-react';
import { ConfigSeguridad } from '../types';

interface SeguridadModalProps {
  isOpen: boolean;
  onClose: () => void;
  seguridad: ConfigSeguridad;
  onSaveSeguridad: (cfg: ConfigSeguridad) => void;
  onLockNow: () => void;
}

export const SeguridadModal: React.FC<SeguridadModalProps> = ({
  isOpen,
  onClose,
  seguridad,
  onSaveSeguridad,
  onLockNow
}) => {
  const [pinHabilitado, setPinHabilitado] = useState<boolean>(seguridad.pinHabilitado);
  const [pinCodigo, setPinCodigo] = useState<string>(seguridad.pinCodigo || '1234');
  const [huellaHabilitada, setHuellaHabilitada] = useState<boolean>(seguridad.huellaHabilitada);
  const [guardado, setGuardado] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSeguridad({
      ...seguridad,
      pinHabilitado,
      pinCodigo: pinCodigo.trim() || '1234',
      huellaHabilitada
    });
    setGuardado(true);
    setTimeout(() => {
      setGuardado(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-md rounded-t-[20px] sm:rounded-[18px] shadow-2xl overflow-hidden my-0 sm:my-4 flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8fafc] border-b border-[#e2e8f0] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Seguridad y Bloqueo</h3>
              <p className="text-[11px] text-[#64748b]">Protección con PIN y biometría</p>
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
          {guardado && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[#16a34a] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold">Configuración de seguridad guardada.</span>
            </div>
          )}

          {/* Toggle PIN */}
          <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
            <div>
              <span className="font-bold text-slate-900 text-sm block">Habilitar Bloqueo por PIN</span>
              <span className="text-[#64748b] text-[11px]">Exige código para ver saldos y transacciones</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pinHabilitado}
                onChange={(e) => setPinHabilitado(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1d4ed8]"></div>
            </label>
          </div>

          {/* Ingreso de PIN */}
          {pinHabilitado && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Código PIN (4 a 6 dígitos)</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    maxLength={6}
                    value={pinCodigo}
                    onChange={(e) => setPinCodigo(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl pl-10 pr-3 py-2.5 text-slate-900 font-mono text-sm tracking-widest focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[46px]"
                    required
                  />
                </div>
              </div>

              {/* Toggle Huella Dactilar */}
              <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                <div className="flex items-center gap-2.5">
                  <Fingerprint className="w-5 h-5 text-[#1d4ed8]" />
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">Autenticación por Huella</span>
                    <span className="text-[#64748b] text-[11px]">Permite desbloqueo biométrico</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={huellaHabilitada}
                    onChange={(e) => setHuellaHabilitada(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1d4ed8]"></div>
                </label>
              </div>

              {/* Botón Bloquear Ahora */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLockNow();
                  }}
                  className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-800 font-bold flex items-center justify-center gap-2 min-h-[46px] transition-colors"
                >
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Bloquear Aplicación Ahora</span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-[#e2e8f0] flex justify-end space-x-2 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-semibold min-h-[46px]"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="bg-[#1d4ed8] hover:bg-[#1e40af] active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-blue-600/25 transition-all min-h-[46px]"
            >
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
