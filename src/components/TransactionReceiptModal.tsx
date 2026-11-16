import React from 'react';
import { X, Printer, Share2, CheckCircle2, TrendingUp, TrendingDown, ArrowRightLeft, Building2, User, Truck, Calendar, Wallet } from 'lucide-react';
import { TransaccionDiaria, DatosEmpresa } from '../types';
import { storage } from '../services/storageService';

interface TransactionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaccion: TransaccionDiaria | null;
  empresa?: DatosEmpresa;
}

export const TransactionReceiptModal: React.FC<TransactionReceiptModalProps> = ({
  isOpen,
  onClose,
  transaccion,
  empresa
}) => {
  if (!isOpen || !transaccion) return null;

  const empresaInfo = empresa || storage.getEmpresa();

  const montoNum = typeof transaccion.montoBs === 'number' 
    ? transaccion.montoBs 
    : (parseFloat(String(transaccion.montoBs).replace(/,/g, '')) || 0);

  const formatMonto = (n: number) => {
    return new Intl.NumberFormat('es-BO', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(n);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const tipoTitulo = transaccion.tipo === 'Ingreso' ? 'COMPROBANTE DE INGRESO' : transaccion.tipo === 'Gasto' ? 'COMPROBANTE DE EGRESO' : 'COMPROBANTE DE TRASPASO';
    const text = `📄 *${tipoTitulo}*
*${empresaInfo.nombre.toUpperCase()}*
----------------------------------------
*Nro Transacción:* ${transaccion.idTransaccion}
*Fecha:* ${transaccion.fecha}
*Tipo:* ${transaccion.tipo.toUpperCase()}
*Categoría:* ${transaccion.categoria}
*Monto:* Bs ${formatMonto(montoNum)}
*Cuenta / Método:* ${transaccion.metodoPago}${transaccion.cuentaDestino ? ` ➔ Destino: ${transaccion.cuentaDestino}` : ''}
${transaccion.nombreCliente ? `*Cliente:* ${transaccion.nombreCliente}\n` : ''}${transaccion.nombreProveedor ? `*Proveedor:* ${transaccion.nombreProveedor}\n` : ''}${transaccion.idViaje ? `*Viaje:* ${transaccion.idViaje}\n` : ''}${transaccion.placaCamion ? `*Camión:* ${transaccion.placaCamion}\n` : ''}*Detalle:* ${transaccion.notas || '-'}
----------------------------------------
_${empresaInfo.slogan}_
_Teléfono: ${empresaInfo.telefono} • ${empresaInfo.ciudad}_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const isIngreso = transaccion.tipo === 'Ingreso';
  const isGasto = transaccion.tipo === 'Gasto';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-lg rounded-t-[20px] sm:rounded-[18px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#e2e8f0] shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isIngreso ? 'bg-emerald-50 text-[#16a34a]' : isGasto ? 'bg-rose-50 text-[#dc2626]' : 'bg-[#eff6ff] text-[#1d4ed8]'
            }`}>
              {isIngreso ? <TrendingUp className="w-4 h-4" /> : isGasto ? <TrendingDown className="w-4 h-4" /> : <ArrowRightLeft className="w-4 h-4" />}
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {isIngreso ? 'Comprobante de Ingreso' : isGasto ? 'Comprobante de Egreso / Gasto' : 'Comprobante de Traspaso de Fondos'}
              </h3>
              <p className="text-[11px] text-[#64748b]">Recibo oficial y registro contable</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Voucher */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          <div className="bg-white text-slate-900 rounded-xl p-5 font-mono text-xs space-y-3.5 border border-[#e2e8f0] shadow-sm">
            {/* Header de la Empresa */}
            <div className="text-center pb-2.5 border-b border-dashed border-slate-300 space-y-1">
              {empresaInfo.logoUrl && (
                <div className="flex justify-center mb-1">
                  <img src={empresaInfo.logoUrl} alt="Logo Empresa" className="h-10 object-contain max-w-[160px]" />
                </div>
              )}
              <h2 className="font-black text-sm uppercase tracking-wide text-slate-900">
                {empresaInfo.nombre}
              </h2>
              <p className="text-[10px] text-slate-600">{empresaInfo.slogan}</p>
              {empresaInfo.nit && (
                <p className="text-[10px] text-slate-500 font-bold">NIT: {empresaInfo.nit}</p>
              )}
              <p className="text-[9px] text-slate-500">{empresaInfo.direccion} • {empresaInfo.ciudad}</p>
              <p className="text-[9px] text-slate-500">Tel: {empresaInfo.telefono}</p>
              
              <div className="mt-2 pt-1 border-t border-slate-200">
                <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-black uppercase ${
                  isIngreso ? 'bg-emerald-50 text-[#16a34a] border border-emerald-200' : isGasto ? 'bg-rose-50 text-[#dc2626] border border-rose-200' : 'bg-blue-50 text-[#1d4ed8] border border-blue-200'
                }`}>
                  {isIngreso ? 'RECIBO DE INGRESO' : isGasto ? 'COMPROBANTE DE EGRESO' : 'TRASPASO BANCARIO / CAJA'}
                </span>
                <p className="text-[11px] font-bold text-slate-800 mt-0.5">#{transaccion.idTransaccion}</p>
              </div>
            </div>

            {/* Metadatos */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha Operación:</span>
                <span className="font-semibold text-slate-800">{transaccion.fecha}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Categoría / Concepto:</span>
                <span className="font-bold text-slate-900">{transaccion.categoria}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Método de Pago / Cuenta:</span>
                <span className="font-semibold text-slate-800">{transaccion.metodoPago}</span>
              </div>
              {transaccion.cuentaDestino && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Cuenta Destino:</span>
                  <span className="font-bold text-[#1d4ed8]">{transaccion.cuentaDestino}</span>
                </div>
              )}
              {transaccion.sucursal && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Sucursal / Agencia:</span>
                  <span className="text-slate-700">{transaccion.sucursal}</span>
                </div>
              )}
              {transaccion.placaCamion && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Camión (Centro de Costo):</span>
                  <span className="font-bold text-slate-800">{transaccion.placaCamion}</span>
                </div>
              )}
              {transaccion.idViaje && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Viaje en Ruta:</span>
                  <span className="font-bold text-[#1d4ed8]">{transaccion.idViaje}</span>
                </div>
              )}
              {transaccion.nombreCliente && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente Destinatario:</span>
                  <span className="font-bold text-[#16a34a] truncate max-w-[200px]">{transaccion.nombreCliente}</span>
                </div>
              )}
              {transaccion.nombreProveedor && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Proveedor Asociado:</span>
                  <span className="font-bold text-[#dc2626] truncate max-w-[200px]">{transaccion.nombreProveedor}</span>
                </div>
              )}
            </div>

            {/* Importe Total */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between items-center text-sm font-black pt-1">
                <span className="text-slate-800">IMPORTE TOTAL:</span>
                <span className={`text-base font-black ${isIngreso ? 'text-[#16a34a]' : isGasto ? 'text-[#dc2626]' : 'text-[#1d4ed8]'}`}>
                  Bs {formatMonto(montoNum)}
                </span>
              </div>
              {transaccion.notas && (
                <div className="pt-1 text-[10px] text-slate-600">
                  <span className="font-bold">Detalle / Glosa: </span>
                  <span>{transaccion.notas}</span>
                </div>
              )}
            </div>

            {/* Firmas de constancia */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-center text-[9px] text-slate-500">
              <div className="border-t border-slate-300 pt-1">
                <span className="font-bold text-slate-700">Entregué Conforme</span><br/>
                <span>Firma / Aclaración</span>
              </div>
              <div className="border-t border-slate-300 pt-1">
                <span className="font-bold text-slate-700">Recibí Conforme</span><br/>
                <span>Caja / Responsable</span>
              </div>
            </div>

            <div className="pt-2 text-center text-[9px] text-slate-400">
              <p>Comprobante registrado en el sistema contable de {empresaInfo.nombre}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 pb-4 pt-2 border-t border-[#e2e8f0] flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all shadow-sm min-h-[44px]"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir por WhatsApp</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all shadow-sm min-h-[44px]"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Comprobante</span>
          </button>
        </div>
      </div>
    </div>
  );
};
