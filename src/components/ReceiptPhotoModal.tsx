import React from 'react';
import { X, ExternalLink, Download, FileText } from 'lucide-react';

interface ReceiptPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fotoUrl: string | null;
}

export const ReceiptPhotoModal: React.FC<ReceiptPhotoModalProps> = ({
  isOpen,
  onClose,
  fotoUrl
}) => {
  if (!isOpen || !fotoUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-6">
        <div className="flex items-center justify-between px-5 py-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">Comprobante de Gasto / Factura</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto">
          <img
            src={fotoUrl}
            alt="Factura o Recibo"
            className="max-h-[65vh] w-auto object-contain rounded-lg shadow-xl"
          />
        </div>

        <div className="px-5 py-3 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Almacenado en Google Drive / Carpeta Comprobantes</span>
          <div className="flex items-center gap-2">
            <a
              href={fotoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-amber-400 hover:underline font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Original</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
