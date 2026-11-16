import React from 'react';
import { 
  X, 
  Printer, 
  MessageSquare, 
  FileText, 
  Truck, 
  MapPin, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone,
  AlertTriangle
} from 'lucide-react';
import { Cliente, ManifiestoDestino, ManifiestoOrigen, Viaje } from '../types';

interface CuentasCobrarModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  manifiestosDestino: ManifiestoDestino[];
  manifiestosOrigen: ManifiestoOrigen[];
  viajes: Viaje[];
}

export const CuentasCobrarModal: React.FC<CuentasCobrarModalProps> = ({
  isOpen,
  onClose,
  cliente,
  manifiestosDestino = [],
  manifiestosOrigen = [],
  viajes = []
}) => {
  if (!isOpen || !cliente) return null;

  // Filtrar todos los subconocimientos asociados a este cliente
  const subManifiestosCliente = manifiestosDestino.filter(
    s => s.destinatario?.toLowerCase().trim() === cliente.nombre.toLowerCase().trim()
  );

  // Mapear cada subconocimiento con su Manifiesto Origen (MIC) y Viaje
  const itemsDetallados = subManifiestosCliente.map(sub => {
    const origen = manifiestosOrigen.find(m => m.idManifiesto === sub.idManifiestoPadre);
    const viaje = origen ? viajes.find(v => v.idViaje === origen.idViajeAsignado) : undefined;
    const porPagarDestino = sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : sub.saldoInicialCobrarBs;
    const saldoPendiente = sub.saldoPendienteClienteBs !== undefined 
      ? sub.saldoPendienteClienteBs 
      : Math.max(0, porPagarDestino - sub.cobrosRealizadosBs);

    return {
      sub,
      origen,
      viaje,
      fleteAsignado: sub.fleteAsignadoBs,
      pagadoOrigen: sub.pagadoOrigenBs,
      porPagarDestino,
      cobradoDestino: sub.cobrosRealizadosBs,
      saldoPendiente,
      estado: sub.estadoLiquidacion
    };
  });

  // Totales acumulados
  const totalFletes = itemsDetallados.reduce((sum, item) => sum + item.fleteAsignado, 0);
  const totalPagadoOrigen = itemsDetallados.reduce((sum, item) => sum + item.pagadoOrigen, 0);
  const totalPorPagarDestino = itemsDetallados.reduce((sum, item) => sum + item.porPagarDestino, 0);
  const totalCobradoDestino = itemsDetallados.reduce((sum, item) => sum + item.cobradoDestino, 0);
  const totalSaldoPendiente = itemsDetallados.reduce((sum, item) => sum + item.saldoPendiente, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!cliente.telefono) return;
    const cleanPhone = cliente.telefono.replace(/\D/g, '');
    const num = cleanPhone.length === 8 ? `591${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hola ${cliente.nombre}, le saludamos de TranspoDrive.\n\nLe enviamos el resumen de su Estado de Cuenta por Encomiendas/Fletes:\n` +
      `• Total Envíos: ${itemsDetallados.length}\n` +
      `• Flete Total Asignado: Bs ${totalFletes.toLocaleString('es-BO', { minimumFractionDigits: 2 })}\n` +
      `• Pagado en Origen: Bs ${totalPagadoOrigen.toLocaleString('es-BO', { minimumFractionDigits: 2 })}\n` +
      `• Cobrado en Destino: Bs ${totalCobradoDestino.toLocaleString('es-BO', { minimumFractionDigits: 2 })}\n` +
      `• *SALDO PENDIENTE POR PAGAR: Bs ${totalSaldoPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}*\n\n` +
      `Por favor coordine la cancelación en su sucursal de destino. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-150 my-auto flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100 gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/50 flex items-center justify-center text-[#1A73E8] shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">
                Ficha de Cuentas por Cobrar & Saldos • {cliente.nombre}
              </h3>
              <p className="text-xs text-slate-500">
                Control y determinación de saldos por Viajes, Conocimientos (MIC) y Subconocimientos
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            {cliente.telefono && (
              <button
                onClick={handleSendWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Cobrar por WhatsApp</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs flex-1">
          {/* Ficha Informativa del Cliente */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#1d4ed8] uppercase tracking-wider">Cliente Destinatario</span>
              <h4 className="text-base font-black text-slate-900">{cliente.nombre}</h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 text-xs">
                {cliente.telefono && (
                  <span className="flex items-center gap-1 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    {cliente.telefono}
                  </span>
                )}
                {cliente.direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {cliente.direccion}
                  </span>
                )}
                {cliente.ciudad && (
                  <span className="bg-white border border-[#e2e8f0] px-2 py-0.5 rounded text-[11px] text-slate-600">
                    Agencia: {cliente.ciudad}
                  </span>
                )}
                {cliente.nitCi && (
                  <span className="bg-white border border-[#e2e8f0] px-2 py-0.5 rounded text-[11px] text-slate-600 font-mono">
                    NIT/CI: {cliente.nitCi}
                  </span>
                )}
              </div>
            </div>

            {/* Estado de Deuda Badge */}
            <div className="text-left sm:text-right">
              <span className="text-[11px] text-slate-500 block mb-0.5">Estado de Cuentas:</span>
              {totalSaldoPendiente > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-[#dc2626] border border-rose-200 rounded-xl font-bold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Saldo Pendiente por Cobrar
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-[#16a34a] border border-emerald-200 rounded-xl font-bold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Al Día (Sin Deuda)
                </span>
              )}
            </div>
          </div>

          {/* Tarjetas de Resumen Económico */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-[#e2e8f0] shadow-sm">
              <span className="text-[10px] text-slate-500 block">Total Fletes Asignados</span>
              <span className="text-base font-black text-slate-900">
                Bs {totalFletes.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#e2e8f0] shadow-sm">
              <span className="text-[10px] text-slate-500 block">Pagado en Origen</span>
              <span className="text-base font-black text-[#16a34a]">
                Bs {totalPagadoOrigen.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#e2e8f0] shadow-sm">
              <span className="text-[10px] text-slate-500 block">Por Pagar Destino</span>
              <span className="text-base font-black text-[#d97706]">
                Bs {totalPorPagarDestino.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#e2e8f0] shadow-sm">
              <span className="text-[10px] text-slate-500 block">Cobrado en Destino</span>
              <span className="text-base font-black text-[#1d4ed8]">
                Bs {totalCobradoDestino.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border col-span-2 sm:col-span-1 shadow-sm ${
              totalSaldoPendiente > 0 
                ? 'bg-rose-50 border-rose-200 text-[#dc2626]' 
                : 'bg-emerald-50 border-emerald-200 text-[#16a34a]'
            }`}>
              <span className="text-[10px] font-bold block uppercase">Saldo Pendiente</span>
              <span className="text-base font-black">
                Bs {totalSaldoPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Tabla de Detalle por Viajes, Conocimientos (MIC) y Subconocimientos */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1d4ed8]" />
              Detalle de Saldos por Viajes, Conocimientos y Subconocimientos ({itemsDetallados.length})
            </h4>

            {itemsDetallados.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0]">
                No existen manifiestos o envíos registrados para este cliente.
              </div>
            ) : (
              <div className="overflow-x-auto lg:overflow-x-visible border border-slate-200 rounded-xl bg-white shadow-sm">
                <table className="w-full table-auto lg:table-fixed border-collapse min-w-[750px] lg:min-w-0">
                  <thead>
                    <tr>
                      <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[12%]">1. Viaje / Camión</th>
                      <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[13%]">2. MIC (Origen)</th>
                      <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-left lg:w-[15%]">3. Sub-Manifiesto</th>
                      <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[10%]">Flete Total</th>
                      <th className="bg-slate-100 text-emerald-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[10%]">Pagado Origen</th>
                      <th className="bg-slate-100 text-amber-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[10%]">Por Pagar</th>
                      <th className="bg-slate-100 text-blue-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[10%]">Cobrado</th>
                      <th className="bg-slate-100 text-rose-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-right lg:w-[10%]">Saldo Pendiente</th>
                      <th className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-3 px-2 lg:px-3 border-b-2 border-slate-300 select-none text-center lg:w-[10%]">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {itemsDetallados.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        {/* Viaje */}
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200">
                          {item.viaje ? (
                            <div>
                              <span className="font-bold text-slate-900 block truncate text-xs lg:text-sm">{item.viaje.idViaje}</span>
                              <span className="text-[10px] text-[#1d4ed8] font-mono block">{item.viaje.placaCamion}</span>
                              <span className="text-[10px] text-slate-400 block">{item.viaje.fechaSalida}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Sin viaje directo</span>
                          )}
                        </td>

                        {/* Conocimiento MIC */}
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200">
                          {item.origen ? (
                            <div>
                              <span className="font-bold text-slate-900 block font-mono text-xs truncate">{item.origen.nroManifiestoMIC}</span>
                              <span className="text-[10px] text-slate-600 block truncate">Orig: {item.origen.sucursalOrigen}</span>
                              <span className="text-[10px] text-slate-400 block">{item.origen.fechaEmision}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">S/N</span>
                          )}
                        </td>

                        {/* Subconocimiento */}
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200">
                          <div>
                            <span className="font-bold text-[#1d4ed8] block font-mono text-xs truncate">{item.sub.nroManifiesto}</span>
                            <span className="text-[10px] text-slate-600 block truncate">Dest: {item.sub.sucursalDestino}</span>
                            <span className="text-[10px] text-slate-500 block truncate" title={item.sub.descripcionCarga}>
                              {item.sub.descripcionCarga || 'Mercadería General'}
                            </span>
                          </div>
                        </td>

                        {/* Flete Asignado */}
                        <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold text-slate-900 whitespace-nowrap text-xs lg:text-sm">
                          Bs {item.fleteAsignado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Pagado Origen */}
                        <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold text-[#16a34a] whitespace-nowrap text-xs lg:text-sm">
                          Bs {item.pagadoOrigen.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Por Pagar Destino */}
                        <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold text-[#d97706] whitespace-nowrap text-xs lg:text-sm">
                          Bs {item.porPagarDestino.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Cobrado en Destino */}
                        <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold text-[#1d4ed8] whitespace-nowrap text-xs lg:text-sm">
                          Bs {item.cobradoDestino.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Saldo Pendiente */}
                        <td className="text-sm py-3 px-2 lg:px-3 border-b border-slate-200 text-right font-bold whitespace-nowrap text-xs lg:text-sm">
                          {item.saldoPendiente > 0 ? (
                            <span className="text-[#dc2626]">
                              Bs {item.saldoPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-[#16a34a]">Bs 0.00</span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="text-sm font-normal text-slate-800 py-3 px-2 lg:px-3 border-b border-slate-200 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                            item.estado === 'Liquidado en Sucursal'
                              ? 'bg-emerald-50 text-[#16a34a] border border-emerald-200'
                              : 'bg-amber-50 text-[#d97706] border border-amber-200'
                          }`}>
                            {item.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-xs">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-slate-800 font-bold uppercase tracking-wider text-xs">
                        TOTALES CONSOLIDADOS:
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-900 font-bold text-xs lg:text-sm whitespace-nowrap">
                        Bs {totalFletes.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#16a34a] font-bold text-xs lg:text-sm whitespace-nowrap">
                        Bs {totalPagadoOrigen.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#d97706] font-bold text-xs lg:text-sm whitespace-nowrap">
                        Bs {totalPorPagarDestino.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#1d4ed8] font-bold text-xs lg:text-sm whitespace-nowrap">
                        Bs {totalCobradoDestino.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#dc2626] font-bold text-xs lg:text-sm whitespace-nowrap">
                        Bs {totalSaldoPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-slate-500 text-xs">
            {itemsDetallados.length} subconocimiento(s) registrados para este destinatario
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
