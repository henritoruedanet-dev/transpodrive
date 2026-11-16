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
  Truck,
  Tag
} from 'lucide-react';
import { CategoriaFinanciera } from '../types';

export interface ItemPagoCxP {
  idCxP?: string;
  idProveedor: string;
  nombreProveedor: string;
  rubro?: string;
  concepto: string;
  nroFacturaBoleta?: string;
  placaCamion?: string;
  idViaje?: string;
  saldoPendienteBs: number;
  montoTotalBs: number;
  categoriaSugerida?: string;
}

interface RegistrarPagoProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemPagoCxP | null;
  cajasDisponibles: string[];
  categorias?: CategoriaFinanciera[];
  onConfirmPago: (payload: {
    idCxP?: string;
    idProveedor: string;
    nombreProveedor: string;
    montoPagoBs: number;
    cajaCuentaEgreso: string;
    categoriaGasto: string;
    fecha: string;
    nroComprobante?: string;
    notas?: string;
    placaCamion?: string;
    idViaje?: string;
  }) => Promise<void>;
}

export const RegistrarPagoProveedorModal: React.FC<RegistrarPagoProveedorModalProps> = ({
  isOpen,
  onClose,
  item,
  cajasDisponibles,
  categorias = [],
  onConfirmPago
}) => {
  // Determinar categoría por defecto según rubro o sugerencia
  const getCategoriaDefault = () => {
    if (!item) return 'Pago a Proveedores / CxP';
    if (item.categoriaSugerida) return item.categoriaSugerida;
    const rubroLower = (item.rubro || '').toLowerCase();
    if (rubroLower.includes('combustible') || rubroLower.includes('diésel') || rubroLower.includes('diesel')) {
      return 'Combustible / Diésel';
    }
    if (rubroLower.includes('taller') || rubroLower.includes('repuesto') || rubroLower.includes('mantenimiento')) {
      return 'Mantenimiento y Repuestos';
    }
    if (rubroLower.includes('peaje') || rubroLower.includes('llanta')) {
      return 'Peajes y Viáticos';
    }
    return 'Pago a Proveedores / CxP';
  };

  const [montoBs, setMontoBs] = useState<string>(String(item?.saldoPendienteBs || ''));
  const [cajaEgreso, setCajaEgreso] = useState<string>(cajasDisponibles[0] || 'Caja Oficina Central');
  const [categoriaGasto, setCategoriaGasto] = useState<string>(getCategoriaDefault());
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nroComprobante, setNroComprobante] = useState<string>(item?.nroFacturaBoleta || `EGR-${Date.now().toString().slice(-6)}`);
  const [notas, setNotas] = useState<string>(`Pago por ${item?.concepto || 'compra/servicio'} a ${item?.nombreProveedor || ''}`);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const montoNum = parseFloat(montoBs) || 0;
  const nuevoSaldo = Math.max(0, (item?.saldoPendienteBs || 0) - montoNum);

  const categoriasGasto = categorias.filter(c => c.tipo === 'Gasto');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setErrorMsg(null);

    if (montoNum <= 0) {
      setErrorMsg('El importe a pagar debe ser mayor a 0 Bs.');
      return;
    }

    if (!cajaEgreso) {
      setErrorMsg('Seleccione la caja o cuenta de egreso.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmPago({
        idCxP: item.idCxP,
        idProveedor: item.idProveedor,
        nombreProveedor: item.nombreProveedor,
        montoPagoBs: montoNum,
        cajaCuentaEgreso: cajaEgreso,
        categoriaGasto,
        fecha,
        nroComprobante,
        notas,
        placaCamion: item.placaCamion,
        idViaje: item.idViaje
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el pago al proveedor');
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
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/50 flex items-center justify-center text-rose-600 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Registrar Pago a Proveedor (CxP)
              </h3>
              <p className="text-xs text-slate-500">
                Cancelación o abono directo de cuenta por pagar e impacto en Arqueo_Cajas
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
              {/* COLUMNA 1: PROVEEDOR & IMPORTE */}
              <div className="space-y-4">
                {/* Ficha Resumen del Proveedor y Compra */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Proveedor / Acreedor:
                    </span>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center bg-rose-50 text-rose-700 border border-rose-200/50">
                      {item.rubro || 'Proveedor Operativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-extrabold text-slate-900 truncate">
                      {item.nombreProveedor}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500">Ref. Factura / Recibo: </span>
                      <span className="font-mono font-bold text-slate-800">{item.nroFacturaBoleta || item.idCxP || 'S/N'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">Saldo Pendiente: </span>
                      <span className="font-mono font-black text-rose-600">
                        Bs. {item.saldoPendienteBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {item.placaCamion && (
                      <div className="col-span-2 flex items-center gap-1.5 text-slate-600">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        <span>Asignado a Camión: <strong>{item.placaCamion}</strong> {item.idViaje ? `(Viaje ${item.idViaje})` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Campo: Importe a Pagar */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                    Importe a Abonar / Pagar (Bs.) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={montoBs}
                      onChange={(e) => setMontoBs(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-rose-600 text-base font-black focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all placeholder:text-slate-400"
                      required
                    />
                    <span className="absolute right-4 top-3.5 font-bold text-slate-400 text-sm">Bs.</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                    <span>Saldo que quedará pendiente:</span>
                    <span className="font-bold text-slate-800">
                      Bs. {nuevoSaldo.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* COLUMNA 2: CAJA, CATEGORÍA, FECHAS Y NOTAS */}
              <div className="space-y-4">
                {/* Campo: Caja / Cuenta Egreso */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-rose-600" />
                    <span>Caja / Cuenta de Egreso (Arqueo_Cajas) *</span>
                  </label>
                  <select
                    value={cajaEgreso}
                    onChange={(e) => setCajaEgreso(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
                    required
                  >
                    {cajasDisponibles.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Campo: Categoría Financiera */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    <span>Vínculo a Categoría Financiera de Gasto *</span>
                  </label>
                  <select
                    value={categoriaGasto}
                    onChange={(e) => setCategoriaGasto(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
                    required
                  >
                    {categoriasGasto.length > 0 ? (
                      categoriasGasto.map((cat) => (
                        <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                      ))
                    ) : (
                      <>
                        <option value="Combustible / Diésel">Combustible / Diésel</option>
                        <option value="Mantenimiento y Repuestos">Mantenimiento y Repuestos</option>
                        <option value="Peajes y Viáticos">Peajes y Viáticos</option>
                        <option value="Pago a Proveedores / CxP">Pago a Proveedores / CxP</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Fecha y Nro Comprobante */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                      Fecha del Pago *
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
                      Nro. Recibo / Boleta / Egreso
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
                    Detalle u Observaciones
                  </label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej. Pago parcial por repuestos motor..."
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
              className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Procesando...' : 'Confirmar Pago a Proveedor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
