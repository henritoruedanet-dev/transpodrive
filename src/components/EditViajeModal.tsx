import React, { useState } from 'react';
import { X, Truck, Printer, Calendar, User, Save, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Viaje, Catalogos, EstadoViaje, GastoRutaCamion, ManifiestoOrigen } from '../types';
import { storage } from '../services/storageService';

interface EditViajeModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaje: Viaje | null;
  catalogos: Catalogos;
  gastosRuta: GastoRutaCamion[];
  manifiestos: ManifiestoOrigen[];
  onUpdateViaje: (viaje: Viaje) => void;
  onDeleteViaje: (idViaje: string) => void;
}

export const EditViajeModal: React.FC<EditViajeModalProps> = ({
  isOpen,
  onClose,
  viaje,
  catalogos,
  gastosRuta,
  manifiestos,
  onUpdateViaje,
  onDeleteViaje
}) => {
  const [placaCamion, setPlacaCamion] = useState<string>(viaje?.placaCamion || '');
  const [choferAsignado, setChoferAsignado] = useState<string>(viaje?.choferAsignado || '');
  const [fechaSalida, setFechaSalida] = useState<string>(viaje?.fechaSalida || '');
  const [fechaLlegada, setFechaLlegada] = useState<string>(viaje?.fechaLlegada || '');
  const [estadoViaje, setEstadoViaje] = useState<EstadoViaje>(viaje?.estadoViaje || 'En Tránsito');
  const [observacionesRuta, setObservacionesRuta] = useState<string>(viaje?.observacionesRuta || '');
  const [printMode, setPrintMode] = useState<boolean>(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  const gastosDelViaje = (gastosRuta || []).filter(g => g.idViajeAsignado === viaje?.idViaje);
  const manifiestosDelViaje = (manifiestos || []).filter(m => m.idViajeAsignado === viaje?.idViaje);
  const transaccionesAdminDelViaje = (storage.getTransacciones() || []).filter(t => 
    t.origenRegistro !== 'Gasto_Ruta' &&
    (t.idViaje === viaje?.idViaje || (viaje?.placaCamion && t.placaCamion === viaje.placaCamion && t.idViaje === viaje?.idViaje))
  );
  const totalIngresosAdmin = transaccionesAdminDelViaje.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + (t.montoBs || 0), 0);
  const totalGastosAdmin = transaccionesAdminDelViaje.filter(t => t.tipo === 'Gasto').reduce((sum, t) => sum + (t.montoBs || 0), 0);
  const granTotalIngresos = (viaje?.fletesManifiestosBs || 0) + totalIngresosAdmin;
  const granTotalGastos = (viaje?.gastosRutaBs || 0) + totalGastosAdmin;
  const utilidadConsolidada = granTotalIngresos - granTotalGastos;
  const margenConsolidado = granTotalIngresos > 0 ? ((utilidadConsolidada / granTotalIngresos) * 100).toFixed(1) : '0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viaje) return;
    onUpdateViaje({
      ...viaje,
      placaCamion,
      choferAsignado,
      fechaSalida,
      fechaLlegada,
      estadoViaje,
      observacionesRuta
    });
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !viaje) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-xl rounded-t-[20px] sm:rounded-[18px] shadow-2xl overflow-hidden my-0 sm:my-4 flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8fafc] border-b border-[#e2e8f0] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Editar Viaje • {viaje.idViaje}</h3>
              <p className="text-[11px] text-[#64748b]">Ruta, fechas, chofer asignado y liquidación</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPrintMode(!printMode)}
              className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[38px]"
              title="Vista de Impresión / PDF"
            >
              <Printer className="w-4 h-4 text-[#1d4ed8]" />
              <span className="hidden sm:inline">{printMode ? 'Formulario' : 'Ficha PDF'}</span>
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODO IMPRESIÓN / EXPORTAR A PDF */}
        {printMode ? (
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <div className="bg-white text-slate-900 p-5 rounded-xl font-sans text-xs space-y-4 border border-[#e2e8f0] shadow-sm">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
                <div>
                  <h2 className="text-base font-black uppercase text-slate-950">TranspoDrive Carga Pesada</h2>
                  <p className="text-[11px] text-[#64748b]">Hoja Oficial de Liquidación de Ruta y Rendimiento</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm bg-blue-50 text-[#1d4ed8] px-2.5 py-1 rounded border border-blue-200">
                    {viaje.idViaje}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">Estado: {viaje.estadoViaje}</p>
                </div>
              </div>

              {/* Datos de Cabecera */}
              <div className="grid grid-cols-2 gap-2.5 text-[11px] bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
                <div>
                  <span className="text-[#64748b] block">Camión / Centro de Costos:</span>
                  <strong className="text-slate-900">{viaje.placaCamion}</strong>
                </div>
                <div>
                  <span className="text-[#64748b] block">Chofer Asignado:</span>
                  <strong className="text-slate-900">{viaje.choferAsignado}</strong>
                </div>
                <div>
                  <span className="text-[#64748b] block">Fecha Salida:</span>
                  <span className="text-slate-900">{viaje.fechaSalida}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block">Fecha Llegada:</span>
                  <span className="text-slate-900">{viaje.fechaLlegada || 'En tránsito'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[#64748b] block">Ruta / Observaciones:</span>
                  <span className="text-slate-800 italic">{viaje.observacionesRuta || 'Sin observaciones'}</span>
                </div>
              </div>

              {/* Resumen Económico */}
              <div className="grid grid-cols-4 gap-2 text-center border-y border-[#e2e8f0] py-3">
                <div className="p-2.5 bg-[#eff6ff] rounded-xl border border-blue-100">
                  <span className="text-[10px] text-slate-600 block">Total Ingresos</span>
                  <strong className="text-sm font-black text-[#1d4ed8]">Bs {granTotalIngresos.toFixed(2)}</strong>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                  <span className="text-[10px] text-slate-600 block">Gran Total Gastos</span>
                  <strong className="text-sm font-black text-[#dc2626]">-Bs {granTotalGastos.toFixed(2)}</strong>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 block font-bold">Utilidad Neta</span>
                  <strong className="text-sm font-black text-[#16a34a]">Bs {utilidadConsolidada.toFixed(2)}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-600 block">Margen %</span>
                  <strong className="text-sm font-black text-slate-900">{margenConsolidado}%</strong>
                </div>
              </div>

              {/* Bloque 1: Manifiestos */}
              <div>
                <h4 className="font-bold text-slate-900 mb-1">1. Manifiestos de Carga ({manifiestosDelViaje.length})</h4>
                <div className="divide-y divide-[#e2e8f0] border border-[#e2e8f0] rounded-xl overflow-hidden">
                  {manifiestosDelViaje.map(m => (
                    <div key={m.idManifiesto} className="p-2.5 flex justify-between text-[11px] bg-white">
                      <span className="font-semibold text-slate-800">{m.nroManifiestoMIC} ({m.sucursalOrigen})</span>
                      <span className="font-bold text-[#1d4ed8]">Flete: Bs {Number(m.fleteTotalBs || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bloque 2: Gastos de Ruta Chofer */}
              <div>
                <h4 className="font-bold text-slate-900 mb-1">2. Detalle de Gastos de Ruta Chofer ({gastosDelViaje.length})</h4>
                <div className="divide-y divide-[#e2e8f0] border border-[#e2e8f0] rounded-xl overflow-hidden">
                  {gastosDelViaje.length === 0 ? (
                    <div className="p-2 text-center text-[10px] text-slate-400 italic bg-white">Sin gastos de chofer registrados.</div>
                  ) : (
                    gastosDelViaje.map(g => (
                      <div key={g.idGastoRuta} className="p-2.5 flex justify-between text-[11px] bg-white">
                        <span className="text-slate-700">{g.fechaHora} • {g.categoriaGasto} - {g.detalleGasto}</span>
                        <strong className="text-[#dc2626]">-Bs {Number(g.importeBs || 0).toFixed(2)}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bloque 3: Transacciones Extraordinarias Administrador */}
              <div>
                <h4 className="font-bold text-purple-900 mb-1">3. Transacciones Extraordinarias (Admin / Propietario) ({transaccionesAdminDelViaje.length})</h4>
                <div className="divide-y divide-purple-100 border border-purple-200 rounded-xl overflow-hidden">
                  {transaccionesAdminDelViaje.length === 0 ? (
                    <div className="p-2 text-center text-[10px] text-slate-400 italic bg-white">Sin transacciones extraordinarias del Administrador.</div>
                  ) : (
                    transaccionesAdminDelViaje.map(t => (
                      <div key={t.idTransaccion} className="p-2.5 flex justify-between text-[11px] bg-purple-50/20">
                        <span className="text-slate-700">
                          {t.fecha} • <strong className="text-purple-800">{t.categoria}</strong> - {t.notas || 'Sin detalle'} ({t.metodoPago})
                        </span>
                        <strong className={t.tipo === 'Ingreso' ? 'text-[#16a34a]' : 'text-[#dc2626]'}>
                          {t.tipo === 'Ingreso' ? '+' : '-'}Bs {Number(t.montoBs || 0).toFixed(2)}
                        </strong>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Firmas de Conformidad */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-[10px] text-[#64748b]">
                <div className="border-t border-slate-300 pt-1">
                  <p className="font-bold text-slate-800">{viaje.choferAsignado}</p>
                  <p>Firma Chofer de Ruta</p>
                </div>
                <div className="border-t border-slate-300 pt-1">
                  <p className="font-bold text-slate-800">Administración Central</p>
                  <p>V° B° Liquidación y Control</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={handlePrint}
                className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/25 min-h-[44px]"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Guardar como PDF</span>
              </button>
            </div>
          </div>
        ) : (
          /* FORMULARIO DE EDICIÓN */
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Camión / Placa (Centro Costo) *</label>
                <select
                  value={placaCamion}
                  onChange={(e) => {
                    setPlacaCamion(e.target.value);
                    const cam = catalogos.camiones.find(c => c.placa === e.target.value);
                    if (cam) setChoferAsignado(cam.choferHabitual);
                  }}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[46px]"
                  required
                >
                  {catalogos.camiones.map(c => (
                    <option key={c.placa} value={c.placa}>{c.placa} - {c.modelo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Chofer Asignado *</label>
                <input
                  type="text"
                  value={choferAsignado}
                  onChange={(e) => setChoferAsignado(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[46px]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Fecha Salida *</label>
                <input
                  type="date"
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[46px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Fecha Llegada</label>
                <input
                  type="date"
                  value={fechaLlegada}
                  onChange={(e) => setFechaLlegada(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[46px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Estado del Viaje</label>
                <select
                  value={estadoViaje}
                  onChange={(e) => setEstadoViaje(e.target.value as EstadoViaje)}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[#1d4ed8] font-bold focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[46px]"
                >
                  <option value="En Tránsito">En Tránsito</option>
                  <option value="En Reparto">En Reparto</option>
                  <option value="Liquidado / Cerrado">Liquidado / Cerrado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Observaciones de la Ruta</label>
              <textarea
                rows={3}
                value={observacionesRuta}
                onChange={(e) => setObservacionesRuta(e.target.value)}
                placeholder="Detalle o incidencias de ruta..."
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8]"
              ></textarea>
            </div>

            {showConfirmDelete && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-[#dc2626] font-extrabold text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-[#dc2626]" />
                  <span>¿Eliminar Viaje {viaje.idViaje} y toda su cascada operativa?</span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/80 p-2.5 rounded-lg border border-rose-200">
                  Esta acción eliminará el viaje, todos sus manifiestos, gastos de ruta y movimientos asociados. ¿Desea continuar?
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-3 py-1.5 text-slate-600 bg-white border border-[#e2e8f0] hover:bg-slate-50 rounded-lg font-bold min-h-[38px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteViaje(viaje.idViaje);
                      onClose();
                    }}
                    className="px-4 py-1.5 bg-[#dc2626] hover:bg-rose-700 active:scale-95 text-white rounded-lg font-extrabold min-h-[38px] flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, Eliminar Definitivamente</span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-3 flex items-center justify-between border-t border-[#e2e8f0] sticky bottom-0 bg-white">
              {!showConfirmDelete ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="text-[#dc2626] hover:text-rose-700 text-xs font-semibold flex items-center gap-1.5 py-2 min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Viaje</span>
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-semibold min-h-[46px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-blue-600/25 min-h-[46px] transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
