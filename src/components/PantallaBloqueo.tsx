import React, { useState } from 'react';
import { Lock, Fingerprint, Delete, ShieldCheck, AlertCircle } from 'lucide-react';
import { ConfigSeguridad } from '../types';

interface PantallaBloqueoProps {
  isLocked: boolean;
  onUnlock: () => void;
  seguridad: ConfigSeguridad;
}

export const PantallaBloqueo: React.FC<PantallaBloqueoProps> = ({
  isLocked,
  onUnlock,
  seguridad
}) => {
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBiometricScanning, setIsBiometricScanning] = useState<boolean>(false);

  if (!isLocked || !seguridad.pinHabilitado) return null;

  const handleDigit = (d: string) => {
    if (enteredPin.length >= 6) return;
    const newPin = enteredPin + d;
    setEnteredPin(newPin);
    setErrorMsg(null);

    // Auto verify if matches pin length
    if (newPin === seguridad.pinCodigo) {
      setTimeout(() => {
        setEnteredPin('');
        onUnlock();
      }, 150);
    } else if (newPin.length >= (seguridad.pinCodigo.length || 4)) {
      setErrorMsg('PIN Incorrecto');
      setTimeout(() => {
        setEnteredPin('');
      }, 500);
    }
  };

  const handleDelete = () => {
    setEnteredPin(enteredPin.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setEnteredPin('');
    setErrorMsg(null);
  };

  const handleBiometricAuth = () => {
    setIsBiometricScanning(true);
    setErrorMsg(null);

    // Simular o utilizar sensor biométrico
    setTimeout(() => {
      setIsBiometricScanning(false);
      onUnlock();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-xs flex flex-col items-center text-center space-y-6">
        {/* Logo / Candado */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white tracking-tight">TranspoDrive Seguridad</h2>
          <p className="text-xs text-slate-400 mt-1">Ingrese su PIN o use su huella dactilar</p>
        </div>

        {/* Indicadores de PIN */}
        <div className="flex items-center space-x-3 h-8">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  isFilled
                    ? 'bg-amber-400 scale-125 shadow-md shadow-amber-400/50'
                    : 'border-2 border-slate-700 bg-slate-900'
                }`}
              ></div>
            );
          })}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Teclado Numérico */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xl font-bold active:scale-95 transition-all shadow-sm"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-900/40 text-slate-400 hover:text-white text-xs font-semibold active:scale-95 transition-all"
          >
            Limpiar
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xl font-bold active:scale-95 transition-all"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-900/40 text-slate-400 hover:text-white flex items-center justify-center active:scale-95 transition-all"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Botón de Huella Dactilar */}
        {seguridad.huellaHabilitada && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleBiometricAuth}
              disabled={isBiometricScanning}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border transition-all ${
                isBiometricScanning
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300 animate-pulse'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Fingerprint className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold">
                {isBiometricScanning ? 'Escaneando Huella...' : 'Desbloquear con Huella'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
