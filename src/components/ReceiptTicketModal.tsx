import React from 'react';
import { X, Printer, Share2, CheckCircle2, Truck, Calendar, MapPin, User, FileText } from 'lucide-react';
import { ManifiestoDestino, DatosEmpresa } from '../types';
import { storage } from '../services/storageService';

interface ReceiptTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  subManifiesto: ManifiestoDestino | null;
  reciboData: {
    nroRecibo: string;
    cobroSaldo: number | string;
    delivery: number | string;
    comision?: number | string;
    recaudacionNeta?: number | string;
    nuevoSaldo: number | string;
    cajaAfectada?: string;
    fecha: string;
  } | null;
  empresa?: DatosEmpresa;
}

export const ReceiptTicketModal: React.FC<ReceiptTicketModalProps> = ({
  isOpen,
  onClose,
  subManifiesto,
  reciboData,
  empresa
}) => {
  if (!isOpen || !subManifiesto || !reciboData) return null;

  const empresaInfo = empresa || storage.getEmpresa();

  // Parseo exacto como decimal sin concatenaciones accidentales de texto
  const cobroNum = typeof reciboData.cobroSaldo === 'number' 
    ? reciboData.cobroSaldo 
    : (parseFloat(String(reciboData.cobroSaldo).replace(/,/g, '')) || 0);
  const deliveryNum = typeof reciboData.delivery === 'number' 
    ? reciboData.delivery 
    : (parseFloat(String(reciboData.delivery).replace(/,/g, '')) || 0);
  const totalCobradoNum = cobroNum + deliveryNum;
  const saldoPendienteNum = typeof reciboData.nuevoSaldo === 'number' 
    ? reciboData.nuevoSaldo 
    : (parseFloat(String(reciboData.nuevoSaldo).replace(/,/g, '')) || 0);

  const formatDecimal = (val: number): string => {
    return new Intl.NumberFormat('es-BO', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `📦 *COMPROBANTE DE ENTREGA Y COBRANZA - ${empresaInfo.nombre.toUpperCase()}*
----------------------------------------
*Nro Recibo:* ${reciboData.nroRecibo}
*ID de Viaje:* ${subManifiesto.idViaje || 'N/A'}
*Manifiesto MIC:* ${subManifiesto.nroManifiesto}
*Fecha:* ${reciboData.fecha}
*Destinatario:* ${subManifiesto.destinatario || 'Cliente'}
*Sucursal Destino:* ${subManifiesto.sucursalDestino}
${reciboData.cajaAfectada ? `*Caja / Cuenta:* ${reciboData.cajaAfectada}\n` : ''}
*DETALLE ECONÓMICO:*
• Cobro Saldo Flete: Bs. ${formatDecimal(cobroNum)}
${deliveryNum > 0 ? `• Servicio Delivery: Bs. ${formatDecimal(deliveryNum)}\n` : ''}----------------------------------------
*TOTAL COBRADO:* Bs. ${formatDecimal(totalCobradoNum)}
*Saldo Pendiente:* Bs. ${formatDecimal(saldoPendienteNum)}

*Carga:* ${subManifiesto.descripcionCarga || 'Encomiendas y Cargas'}
_${empresaInfo.slogan}_
_Teléfono: ${empresaInfo.telefono} • ${empresaInfo.ciudad}_`;

    const encoded = encodeURIComponent(text);
    const phone = subManifiesto.telefonoContacto ? subManifiesto.telefonoContacto.replace(/\D/g, '') : '';
    const whatsappUrl = phone ? `https://wa.me/591${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-md rounded-t-[20px] sm:rounded-[18px] shadow-2xl overflow-hidden my-0 sm:my-4 flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8fafc] border-b border-[#e2e8f0] shrink-0">
          <div className="flex items-center space-x-2.5 text-[#16a34a]">
            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#16a34a]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Comprobante de Entrega</h3>
              <p className="text-[11px] text-[#64748b]">Recibo oficial generado con éxito</p>
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

        {/* Printable Ticket Receipt */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="bg-[#f8fafc] text-slate-900 rounded-xl p-5 shadow-sm font-mono text-xs space-y-3 border border-[#e2e8f0]">
            <div className="text-center pb-2 border-b border-dashed border-slate-300 space-y-1">
              {empresaInfo.logoUrl && (
                <div className="flex justify-center mb-1">
                  <img src={empresaInfo.logoUrl} alt="Logo" className="h-10 object-contain max-w-[150px]" />
                </div>
              )}
              <h2 className="font-extrabold text-sm uppercase tracking-wide text-slate-900">
                {empresaInfo.nombre}
              </h2>
              <p className="text-[10px] text-slate-500">{empresaInfo.slogan}</p>
              {empresaInfo.nit && (
                <p className="text-[10px] text-slate-600 font-bold">NIT: {empresaInfo.nit}</p>
              )}
              <p className="text-[9px] text-slate-500">{empresaInfo.direccion} • {empresaInfo.ciudad}</p>
              <p className="text-[9px] text-slate-500">Telf: {empresaInfo.telefono}</p>
              <p className="text-[11px] font-bold mt-1 text-[#1d4ed8] pt-1 border-t border-slate-200">
                RECIBO DE CAJA #{reciboData.nroRecibo}
              </p>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha:</span>
                <span className="font-semibold">{reciboData.fecha}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Agencia Entrega:</span>
                <span className="font-bold">{subManifiesto.sucursalDestino}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sub-Manifiesto:</span>
                <span className="font-semibold">{subManifiesto.nroManifiesto}</span>
              </div>
              {subManifiesto.idViaje && (
                <div className="flex justify-between">
                  <span className="text-slate-500">ID de Viaje:</span>
                  <span className="font-bold text-[#1d4ed8]">{subManifiesto.idViaje}</span>
                </div>
              )}
              {reciboData.cajaAfectada && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Caja Recaudadora:</span>
                  <span className="font-bold text-[#1d4ed8]">{reciboData.cajaAfectada}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente / Destinatario:</span>
                <span className="font-bold truncate max-w-[170px]">{subManifiesto.destinatario}</span>
              </div>
              {subManifiesto.telefonoContacto && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Teléfono:</span>
                  <span>{subManifiesto.telefonoContacto}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Cobro Saldo Flete:</span>
                <span className="font-bold">Bs {formatDecimal(cobroNum)}</span>
              </div>
              {deliveryNum > 0 && (
                <div className="flex justify-between">
                  <span>Servicio Delivery / Puerta:</span>
                  <span className="font-bold">Bs {formatDecimal(deliveryNum)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>TOTAL COBRADO:</span>
                <span className="text-[#16a34a]">Bs {formatDecimal(totalCobradoNum)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Saldo Pendiente Cliente:</span>
                <span className="font-bold text-amber-600">Bs {formatDecimal(saldoPendienteNum)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-500">
              <p>Descripción: {subManifiesto.descripcionCarga}</p>
              <p className="mt-1 font-semibold text-slate-700">¡Gracias por su preferencia!</p>
              <p className="text-[9px]">Sincronizado en tiempo real con Google Drive / Sheets</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-[#e2e8f0] flex flex-col sm:flex-row gap-2.5 sticky bottom-0 bg-white">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 bg-[#16a34a] hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all shadow-md shadow-emerald-600/25 min-h-[46px]"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir por WhatsApp</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all border border-[#e2e8f0] min-h-[46px]"
          >
            <Printer className="w-4 h-4 text-[#1d4ed8]" />
            <span>Imprimir Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
