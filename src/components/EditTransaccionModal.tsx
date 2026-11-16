import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Tag, 
  ArrowRightLeft, 
  Camera, 
  Upload, 
  Edit3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { TransaccionDiaria, CategoriaFinanciera, Catalogos, Viaje } from '../types';
import { CategorySelectModal } from './CategorySelectModal';
import { compressImageFile } from '../utils/imageCompressor';
import { ErrorBoundary } from './ErrorBoundary';

interface EditTransaccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaccion: TransaccionDiaria | null;
  categorias: CategoriaFinanciera[];
  catalogos: Catalogos;
  viajes: Viaje[];
  transacciones?: TransaccionDiaria[];
  onAddCategoria?: (cat: Omit<CategoriaFinanciera, 'id' | 'esPredefinida'>) => void;
  onUpdateTransaccion: (tx: TransaccionDiaria) => void;
  onDeleteTransaccion: (id: string) => void;
}

/**
 * Componente interno con el formulario de edición.
 * Se monta únicamente cuando 'isOpen' es true y 'transaccion' existe,
 * garantizando la regla de hooks de React y protegiendo contra valores nulos o incompletos.
 */
const EditTransaccionFormContent: React.FC<EditTransaccionModalProps & { transaccion: TransaccionDiaria }> = ({
  onClose,
  transaccion,
  categorias = [],
  catalogos,
  viajes = [],
  transacciones = [],
  onAddCategoria,
  onUpdateTransaccion,
  onDeleteTransaccion
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extracción defensiva y desestructuración segura con valores por defecto
  const rawTx: any = transaccion || {};

  const safeIdTransaccion = String(rawTx.idTransaccion || rawTx.ID_Transaccion || `TX-${Date.now()}`);
  const rawTipo = rawTx.tipo || rawTx.Tipo || 'Gasto';
  const initialTipo: 'Ingreso' | 'Gasto' | 'Traspaso' = 
    rawTipo === 'Ingreso' || rawTipo === 'Traspaso' ? rawTipo : 'Gasto';

  const initialCategoria = String(rawTx.categoria || rawTx.Categoria || rawTx.rubro || rawTx.concepto || '');

  const rawMonto = rawTx.montoBs ?? rawTx.Monto_Bs ?? rawTx.fleteTotalBs ?? rawTx.montoTotalBs ?? 0;
  const initialMontoNum = typeof rawMonto === 'number' ? rawMonto : (parseFloat(String(rawMonto)) || 0);

  const initialMetodoPago = String(rawTx.metodoPago || rawTx.Metodo_Pago || 'Efectivo');

  const rawFecha = rawTx.fecha || rawTx.Fecha || rawTx.fechaEmision;
  const initialFecha = rawFecha 
    ? (String(rawFecha).includes('T') ? String(rawFecha).split('T')[0] : String(rawFecha).split(' ')[0]) 
    : new Date().toISOString().split('T')[0];

  const initialNotas = String(rawTx.notas || rawTx.Notas_Detalle || rawTx.detalleGasto || rawTx.detalleGlosa || '');
  const initialIdProveedor = String(rawTx.idProveedor || rawTx.ID_Proveedor || '');
  const initialIdCliente = String(rawTx.idCliente || rawTx.ID_Cliente || '');
  const initialCliente = String(rawTx.cliente || rawTx.destinatario || rawTx.nombreCliente || rawTx.deudorNombre || rawTx.nombreDeudor || '');
  const initialCuentaDestino = String(rawTx.cuentaDestino || rawTx.Cuenta_Destino || '');

  const rawAnticipo = rawTx.montoAnticipoBs ?? rawTx.montoAbonadoBs ?? rawTx.pagadoBs;
  const initialMontoAnticipo = (rawAnticipo != null && !isNaN(Number(rawAnticipo))) ? String(rawAnticipo) : '';

  const defaultCaja = (catalogos?.cajasCuentas && catalogos.cajasCuentas.length > 0) ? catalogos.cajasCuentas[0] : 'Caja Central';
  const initialCuentaAnticipo = String(rawTx.cuentaAnticipo || rawTx.Cuenta_Anticipo || initialMetodoPago || defaultCaja);

  const rawModalidad = rawTx.modalidadPago || rawTx.Modalidad_Pago;
  const initialModalidadPago: 'Contado' | 'Credito' | 'Anticipo_Saldo' = rawModalidad || (
    initialMetodoPago === 'Por Cobrar' || initialMetodoPago === 'Por Pagar'
      ? 'Credito'
      : (Number(rawAnticipo) > 0 ? 'Anticipo_Saldo' : 'Contado')
  );

  const initialSucursal = String(rawTx.sucursal || rawTx.Sucursal || '');
  const initialPlacaCamion = String(rawTx.placaCamion || rawTx.Placa_Camion || '');
  const initialIdViaje = String(rawTx.idViaje || rawTx.ID_Viaje || '');
  const initialFechaVencimiento = String(rawTx.fechaVencimiento || rawTx.Fecha_Vencimiento || '');
  const initialNroFacturaBoleta = String(rawTx.nroFacturaBoleta || rawTx.Nro_Factura_Boleta || rawTx.nroManifiesto || rawTx.Nro_Manifiesto || '');
  const initialFotoPreview = rawTx.comprobanteFotoUrl || rawTx.Comprobante_Foto_URL || null;

  // Estados locales del formulario
  const [tipo, setTipo] = useState<'Ingreso' | 'Gasto' | 'Traspaso'>(initialTipo);
  const [modalidadPago, setModalidadPago] = useState<'Contado' | 'Credito' | 'Anticipo_Saldo'>(initialModalidadPago);
  const [categoria, setCategoria] = useState<string>(initialCategoria);
  const [montoBs, setMontoBs] = useState<string>(String(initialMontoNum));
  const [montoAnticipo, setMontoAnticipo] = useState<string>(initialMontoAnticipo);
  const [cuentaAnticipo, setCuentaAnticipo] = useState<string>(initialCuentaAnticipo);
  const [fecha, setFecha] = useState<string>(initialFecha);
  const [metodoPago, setMetodoPago] = useState<string>(initialMetodoPago);
  const [cuentaDestino, setCuentaDestino] = useState<string>(initialCuentaDestino);
  const [notas, setNotas] = useState<string>(initialNotas);
  const [sucursal, setSucursal] = useState<string>(initialSucursal);
  const [placaCamion, setPlacaCamion] = useState<string>(initialPlacaCamion);
  const [idViaje, setIdViaje] = useState<string>(initialIdViaje);
  const [idProveedor, setIdProveedor] = useState<string>(initialIdProveedor);
  const [idCliente, setIdCliente] = useState<string>(initialIdCliente);
  const [nombreClienteDeudor, setNombreClienteDeudor] = useState<string>(initialCliente);
  const [fechaVencimiento, setFechaVencimiento] = useState<string>(initialFechaVencimiento);
  const [nroFacturaBoleta, setNroFacturaBoleta] = useState<string>(initialNroFacturaBoleta);
  const [fotoPreview, setFotoPreview] = useState<string | null>(initialFotoPreview);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  // Sincronización si la transacción cambia dinámicamente
  useEffect(() => {
    if (transaccion) {
      const currentRaw: any = transaccion;
      const cTipo = currentRaw.tipo || currentRaw.Tipo || 'Gasto';
      setTipo(cTipo === 'Ingreso' || cTipo === 'Traspaso' ? cTipo : 'Gasto');
      
      const cMetodo = String(currentRaw.metodoPago || currentRaw.Metodo_Pago || 'Efectivo');
      const cAnt = currentRaw.montoAnticipoBs ?? currentRaw.montoAbonadoBs ?? currentRaw.pagadoBs;
      const cMod = currentRaw.modalidadPago || currentRaw.Modalidad_Pago || (
        cMetodo === 'Por Cobrar' || cMetodo === 'Por Pagar'
          ? 'Credito'
          : (Number(cAnt) > 0 ? 'Anticipo_Saldo' : 'Contado')
      );
      setModalidadPago(cMod);
      setCategoria(String(currentRaw.categoria || currentRaw.Categoria || currentRaw.rubro || currentRaw.concepto || ''));
      
      const cMonto = currentRaw.montoBs ?? currentRaw.Monto_Bs ?? currentRaw.fleteTotalBs ?? currentRaw.montoTotalBs ?? 0;
      setMontoBs(String(typeof cMonto === 'number' ? cMonto : (parseFloat(String(cMonto)) || 0)));
      setMontoAnticipo(cAnt != null && !isNaN(Number(cAnt)) ? String(cAnt) : '');
      
      const cCajas = catalogos?.cajasCuentas || [];
      const cDefCaja = cCajas.length > 0 ? cCajas[0] : 'Caja Central';
      setCuentaAnticipo(String(currentRaw.cuentaAnticipo || currentRaw.Cuenta_Anticipo || cMetodo || cDefCaja));
      
      const cFecha = currentRaw.fecha || currentRaw.Fecha || currentRaw.fechaEmision;
      setFecha(cFecha ? (String(cFecha).includes('T') ? String(cFecha).split('T')[0] : String(cFecha).split(' ')[0]) : new Date().toISOString().split('T')[0]);
      
      setMetodoPago(cMetodo);
      setCuentaDestino(String(currentRaw.cuentaDestino || currentRaw.Cuenta_Destino || ''));
      setNotas(String(currentRaw.notas || currentRaw.Notas_Detalle || currentRaw.detalleGasto || currentRaw.detalleGlosa || ''));
      setSucursal(String(currentRaw.sucursal || currentRaw.Sucursal || ''));
      setPlacaCamion(String(currentRaw.placaCamion || currentRaw.Placa_Camion || ''));
      setIdViaje(String(currentRaw.idViaje || currentRaw.ID_Viaje || ''));
      setIdProveedor(String(currentRaw.idProveedor || currentRaw.ID_Proveedor || ''));
      setIdCliente(String(currentRaw.idCliente || currentRaw.ID_Cliente || ''));
      setNombreClienteDeudor(String(currentRaw.cliente || currentRaw.destinatario || currentRaw.nombreCliente || currentRaw.deudorNombre || currentRaw.nombreDeudor || ''));
      setFechaVencimiento(String(currentRaw.fechaVencimiento || currentRaw.Fecha_Vencimiento || ''));
      setNroFacturaBoleta(String(currentRaw.nroFacturaBoleta || currentRaw.Nro_Factura_Boleta || currentRaw.nroManifiesto || currentRaw.Nro_Manifiesto || ''));
      setFotoPreview(currentRaw.comprobanteFotoUrl || currentRaw.Comprobante_Foto_URL || null);
      setShowConfirmDelete(false);
      setErrorMsg(null);
    }
  }, [transaccion, catalogos]);

  // Conceptos dinámicos y sugerencias
  const allConceptos = useMemo(() => {
    if (tipo === 'Traspaso') {
      return [{ nombre: 'Traspaso entre Cuentas', color: '#1d4ed8', esPredefinida: true }];
    }

    const list: { nombre: string; color: string; esPredefinida?: boolean }[] = [];
    const seen = new Set<string>();

    const addConcept = (nombre?: string, color?: string, esPredefinida?: boolean) => {
      if (!nombre || typeof nombre !== 'string') return;
      const clean = nombre.trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          nombre: clean,
          color: color || (tipo === 'Ingreso' ? '#16a34a' : '#dc2626'),
          esPredefinida
        });
      }
    };

    (categorias || []).filter(c => c && c.tipo === tipo).forEach(c => {
      addConcept(c.nombre, c.color, c.esPredefinida);
    });

    if (tipo === 'Gasto') {
      (catalogos?.categoriasGastoRuta || []).forEach(c => addConcept(c, '#f59e0b', true));
      (catalogos?.categoriasGastoDestino || []).forEach(c => addConcept(c, '#ec4899', true));
    } else {
      (catalogos?.categoriasIngresoDestino || []).forEach(c => addConcept(c, '#10b981', true));
    }

    (transacciones || []).filter(t => t && t.tipo === tipo).forEach(t => {
      addConcept(t.categoria);
    });

    return list;
  }, [tipo, categorias, catalogos, transacciones]);

  const sugerenciasMasUtilizadas = useMemo(() => {
    return (allConceptos || []).slice(0, 5);
  }, [allConceptos]);

  // Cálculos en tiempo real protegidos contra NaN
  const montoTotalNum = parseFloat(String(montoBs ?? 0)) || 0;
  const montoAnticipoNum = parseFloat(String(montoAnticipo ?? 0)) || 0;
  const saldoPendienteCalculado = Math.max(0, parseFloat((montoTotalNum - montoAnticipoNum).toFixed(2)) || 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressing(true);
      const compressed = await compressImageFile(file, 1200, 0.75);
      setFotoPreview(compressed);
    } catch (err) {
      setErrorMsg('No se pudo procesar la imagen seleccionada.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleCondicionChange = (newCond: 'Contado' | 'Credito' | 'Anticipo_Saldo' | 'Parcial' | 'Por Pagar' | 'Por Cobrar' | string) => {
    const normalized = (newCond === 'Parcial' ? 'Contado' : (newCond === 'Por Pagar' || newCond === 'Por Cobrar') ? 'Credito' : newCond) as 'Contado' | 'Credito' | 'Anticipo_Saldo';
    setModalidadPago(normalized);
    if (normalized === 'Credito') {
      setMetodoPago(tipo === 'Ingreso' ? 'Por Cobrar' : 'Por Pagar');
    } else if (normalized === 'Contado') {
      if (metodoPago === 'Por Cobrar' || metodoPago === 'Por Pagar' || metodoPago === 'Anticipo_Saldo') {
        const cCajas = catalogos?.cajasCuentas || [];
        setMetodoPago(cuentaAnticipo || (cCajas.length > 0 ? cCajas[0] : 'Caja Central'));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(String(montoBs ?? 0));
    if (isNaN(monto) || monto <= 0) {
      setErrorMsg('Ingrese un monto válido mayor a 0 Bs.');
      return;
    }
    if (!categoria && tipo !== 'Traspaso') {
      setErrorMsg('Seleccione un concepto o categoría.');
      return;
    }

    let metodoFinal = metodoPago;
    let anticipoFinal: number | undefined = undefined;
    let saldoFinal: number | undefined = undefined;
    let cuentaAnticipoFinal: string | undefined = undefined;

    const cCajas = catalogos?.cajasCuentas || [];
    const defCaja = cCajas.length > 0 ? cCajas[0] : 'Caja Central';

    if (modalidadPago === 'Contado') {
      metodoFinal = (metodoPago === 'Por Cobrar' || metodoPago === 'Por Pagar' || metodoPago === 'Anticipo_Saldo')
        ? (cuentaAnticipo || defCaja)
        : metodoPago;
    } else if (modalidadPago === 'Credito') {
      metodoFinal = tipo === 'Ingreso' ? 'Por Cobrar' : 'Por Pagar';
      anticipoFinal = 0;
      saldoFinal = monto;
    } else if (modalidadPago === 'Anticipo_Saldo') {
      const ant = parseFloat(String(montoAnticipo ?? 0));
      if (isNaN(ant) || ant < 0) {
        setErrorMsg('Para la modalidad de Anticipo + Saldo, ingrese un monto de anticipo válido (0 o mayor).');
        return;
      }
      if (ant >= monto) {
        setErrorMsg('El anticipo debe ser menor al monto total para generar un saldo pendiente a crédito.');
        return;
      }
      if (!cuentaAnticipo) {
        setErrorMsg('Seleccione la caja o cuenta donde se abonó el anticipo.');
        return;
      }
      metodoFinal = tipo === 'Ingreso' ? 'Por Cobrar' : 'Por Pagar';
      anticipoFinal = ant;
      saldoFinal = parseFloat((monto - ant).toFixed(2));
      cuentaAnticipoFinal = cuentaAnticipo;
    }

    // Validaciones para Por Cobrar (CxC Clientes)
    if (tipo === 'Ingreso' && (modalidadPago === 'Credito' || modalidadPago === 'Anticipo_Saldo' || metodoFinal === 'Por Cobrar')) {
      const deudor = ((nombreClienteDeudor || '').trim() || (idCliente ? (catalogos?.clientes || []).find(c => c.idCliente === idCliente)?.nombre : '') || '').trim();
      if (!deudor) {
        setErrorMsg('Para registrar una transacción con saldo a crédito por cobrar, es OBLIGATORIO indicar el Cliente / Empresa Deudora.');
        return;
      }
    }

    // Validaciones para Por Pagar (CxP Proveedores)
    if (tipo === 'Gasto' && (modalidadPago === 'Credito' || modalidadPago === 'Anticipo_Saldo' || metodoFinal === 'Por Pagar')) {
      if (!idProveedor) {
        setErrorMsg('Para registrar una transacción con saldo a crédito por pagar, es OBLIGATORIO seleccionar el Proveedor / Acreedor.');
        return;
      }
      if (!(nroFacturaBoleta || '').trim()) {
        setErrorMsg('Para registrar una transacción con saldo a crédito por pagar, es OBLIGATORIO ingresar el Nro. de Factura / Nota de Crédito / Recibo.');
        return;
      }
    }

    const prov = tipo === 'Gasto' && idProveedor ? (catalogos?.proveedores || []).find(p => p.idProveedor === idProveedor) : undefined;
    const cli = tipo === 'Ingreso' && idCliente ? (catalogos?.clientes || []).find(c => c.idCliente === idCliente) : undefined;
    const deudorFinal = tipo === 'Ingreso'
      ? ((nombreClienteDeudor || '').trim() || cli?.nombre || idCliente || (transaccion as any)?.nombreCliente || undefined)
      : undefined;

    onUpdateTransaccion({
      ...transaccion,
      idTransaccion: safeIdTransaccion,
      tipo,
      categoria: tipo === 'Traspaso' ? 'Traspaso entre Cuentas' : (categoria || 'Varios'),
      montoBs: monto,
      fecha: fecha || new Date().toISOString().split('T')[0],
      metodoPago: metodoFinal,
      modalidadPago: tipo === 'Traspaso' ? 'Contado' : modalidadPago,
      montoAnticipoBs: modalidadPago === 'Anticipo_Saldo' ? anticipoFinal : undefined,
      saldoPendienteBs: modalidadPago === 'Anticipo_Saldo' ? saldoFinal : (modalidadPago === 'Credito' ? monto : 0),
      cuentaAnticipo: modalidadPago === 'Anticipo_Saldo' ? cuentaAnticipoFinal : undefined,
      cuentaDestino: tipo === 'Traspaso' ? ((cuentaDestino || '').trim() || undefined) : undefined,
      notas: (notas || '').trim(),
      sucursal: (sucursal || '').trim() || undefined,
      placaCamion: (placaCamion || '').trim() || undefined,
      idViaje: (idViaje || '').trim() || undefined,
      nroManifiesto: (nroFacturaBoleta || '').trim() || transaccion.nroManifiesto || undefined,
      nroFacturaBoleta: (nroFacturaBoleta || '').trim() || undefined,
      fechaVencimiento: (fechaVencimiento || '').trim() || undefined,
      idProveedor: tipo === 'Gasto' ? ((idProveedor || '').trim() || undefined) : undefined,
      nombreProveedor: tipo === 'Gasto' ? (prov?.nombre || (transaccion as any)?.nombreProveedor) : undefined,
      idCliente: tipo === 'Ingreso' ? ((idCliente || '').trim() || undefined) : undefined,
      nombreCliente: deudorFinal,
      deudorNombre: deudorFinal,
      comprobanteFotoUrl: fotoPreview || undefined
    });

    onClose();
  };

  const handleEjecutarEliminar = () => {
    const targetId = transaccion?.idTransaccion || (transaccion as any)?.ID_Transaccion || safeIdTransaccion;
    if (targetId) {
      onDeleteTransaccion(targetId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 lg:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header Material Design 3 */}
        <div className="bg-slate-50/80 px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eff6ff] flex items-center justify-center text-[#1d4ed8] shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Editar Transacción • {safeIdTransaccion}</h3>
              <p className="text-xs text-[#64748b]">Ajuste montos, modalidad de pago, anticipos, proveedores o cuentas</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body Material Design 3 */}
        <form id="edit-transaccion-form" onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-[#dc2626] flex items-center gap-3 text-xs font-semibold shadow-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selector de Tipo (Botones de Selección Rápida) */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5 block">Tipo de Operación</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTipo('Gasto');
                  if (modalidadPago === 'Credito') setMetodoPago('Por Pagar');
                }}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border text-xs font-bold transition-all min-h-[46px] ${
                  tipo === 'Gasto'
                    ? 'bg-rose-50 border-[#dc2626] text-[#dc2626] shadow-sm font-black'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>Gasto (-)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipo('Ingreso');
                  if (modalidadPago === 'Credito') setMetodoPago('Por Cobrar');
                }}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border text-xs font-bold transition-all min-h-[46px] ${
                  tipo === 'Ingreso'
                    ? 'bg-emerald-50 border-[#16a34a] text-[#16a34a] shadow-sm font-black'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Ingreso (+)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipo('Traspaso');
                  setCategoria('Traspaso entre Cuentas');
                  setModalidadPago('Contado');
                }}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border text-xs font-bold transition-all min-h-[46px] ${
                  tipo === 'Traspaso'
                    ? 'bg-[#eff6ff] border-[#1d4ed8] text-[#1d4ed8] shadow-sm font-black'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Traspaso (⇄)</span>
              </button>
            </div>
          </div>

          {/* Fila: Monto Total & Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                {modalidadPago === 'Anticipo_Saldo' ? 'Monto Total de la Operación (Bs.) *' : 'Monto (Bs.) *'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-black text-sm">Bs</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={montoBs ?? ""}
                  onChange={(e) => setMontoBs(e.target.value)}
                  className={`w-full bg-[#f8fafc] border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-lg font-black focus:bg-white focus:outline-none focus:ring-2 min-h-[50px] transition-all ${
                    tipo === 'Ingreso' ? 'text-[#16a34a] focus:ring-[#16a34a]' : tipo === 'Gasto' ? 'text-[#dc2626] focus:ring-[#dc2626]' : 'text-[#1d4ed8] focus:ring-[#1d4ed8]'
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">Fecha de Registro *</label>
              <input
                type="date"
                value={fecha ?? ""}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm font-semibold cursor-pointer focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] min-h-[50px] transition-all"
                required
              />
            </div>
          </div>

          {/* Condición de Pago y Cuentas */}
          {tipo !== 'Traspaso' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Condición / Términos de Pago *</span>
                  {modalidadPago === 'Contado' && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      100% Contado
                    </span>
                  )}
                  {modalidadPago === 'Credito' && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      tipo === 'Ingreso' ? 'text-amber-800 bg-amber-100' : 'text-rose-800 bg-rose-100'
                    }`}>
                      100% Crédito ({tipo === 'Ingreso' ? 'CxC' : 'CxP'})
                    </span>
                  )}
                  {modalidadPago === 'Anticipo_Saldo' && (
                    <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                      ⚡ Mixto: Anticipo + Saldo
                    </span>
                  )}
                </label>
                <select
                  value={modalidadPago ?? "Contado"}
                  onChange={(e) => handleCondicionChange(e.target.value as any)}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] min-h-[50px] transition-all"
                >
                  <option value="Contado">100% Contado / Efectivo</option>
                  <option value="Credito">
                    {tipo === 'Ingreso' 
                      ? '100% Crédito (Por Cobrar / Cuenta por Cobrar a Cliente)' 
                      : '100% Crédito (Por Pagar / Cuenta por Pagar a Proveedor)'}
                  </option>
                  <option value="Anticipo_Saldo">Mixto: Anticipo / Pago Parcial + Saldo Pendiente</option>
                </select>
              </div>

              <div>
                {modalidadPago === 'Contado' ? (
                  <>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                      Caja / Cuenta de Pago *
                    </label>
                    <select
                      value={metodoPago ?? ""}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-300 rounded-2xl px-4 py-3 text-slate-800 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] min-h-[50px] transition-all"
                      required
                    >
                      {(catalogos?.cajasCuentas || []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </>
                ) : modalidadPago === 'Credito' ? (
                  <>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                      Clasificación Contable
                    </label>
                    <div className={`p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold min-h-[50px] ${
                      tipo === 'Ingreso' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      <span>📌</span>
                      <span>
                        {tipo === 'Ingreso'
                          ? 'Cuenta por Cobrar (CxC Clientes) - Saldo en Caja intacto'
                          : 'Cuenta por Pagar (CxP Proveedores) - Fondos en Caja intactos'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="text-xs font-bold uppercase tracking-wide text-indigo-900 mb-1.5 block">
                      Modalidad Contable Mixta
                    </label>
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-indigo-900 min-h-[50px]">
                      <span className="p-1 bg-indigo-200 rounded-lg">⚡</span>
                      <span>Anticipo en Caja + Saldo Pendiente en Balance (Cx{tipo === 'Ingreso' ? 'C' : 'P'})</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">Cuenta Origen (Salida) *</label>
                <select
                  value={metodoPago ?? ""}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-2xl px-4 py-3 text-slate-800 text-xs font-semibold min-h-[50px]"
                >
                  {(catalogos?.cajasCuentas || []).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">Cuenta Destino (Ingreso) *</label>
                <select
                  value={cuentaDestino ?? ""}
                  onChange={(e) => setCuentaDestino(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-2xl px-4 py-3 text-slate-800 text-xs font-semibold min-h-[50px]"
                  required
                >
                  <option value="">-- Seleccionar Cuenta Receptora --</option>
                  {(catalogos?.cajasCuentas || []).filter(c => c !== metodoPago).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* PANEL DE DESGLOSE DINÁMICO: ANTICIPO / PAGO PARCIAL + SALDO PENDIENTE */}
          {tipo !== 'Traspaso' && modalidadPago === 'Anticipo_Saldo' && (
            <div className="p-6 bg-slate-50/90 border-2 border-indigo-200 rounded-3xl space-y-5 shadow-xs animate-in fade-in zoom-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2 text-indigo-900 font-black text-sm">
                  <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-xl">⚡</span>
                  <span>Desglose Dinámico de la Operación (Anticipo + Saldo a Crédito)</span>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                  {tipo === 'Ingreso' ? 'Cobro Parcial + CxC Cliente' : 'Pago Parcial + CxP Proveedor'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1) Monto Total de la Operación */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                    1) Monto Total Operación (Bs.)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">Bs</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={montoBs ?? ""}
                      onChange={(e) => setMontoBs(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[46px]"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Total pactado en la transacción.</span>
                </div>

                {/* 2) Monto Pagado / Cobrado en Efectivo o Banco */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                    2) Monto {tipo === 'Ingreso' ? 'Cobrado' : 'Pagado'} en Efectivo / Banco *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-emerald-600 font-bold text-sm">Bs</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={montoTotalNum > 0 ? montoTotalNum : undefined}
                      value={montoAnticipo ?? ""}
                      onChange={(e) => setMontoAnticipo(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border border-emerald-300 rounded-xl pl-10 pr-3 py-2.5 text-base font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[46px]"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium mt-1 block">Dinero real que ingresa/egresa de la caja seleccionada.</span>
                </div>

                {/* 3) Caja / Cuenta del Anticipo */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                    3) Caja / Cuenta del Anticipo *
                  </label>
                  <select
                    value={cuentaAnticipo ?? ""}
                    onChange={(e) => setCuentaAnticipo(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500 min-h-[46px]"
                    required
                  >
                    {(catalogos?.cajasCuentas || []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">Caja receptora o pagadora del anticipo.</span>
                </div>
              </div>

              {/* 4) Saldo Pendiente Restante (Bs.) Calculado en Tiempo Real con Color Destacado */}
              <div className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                tipo === 'Ingreso'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide block">
                    4) Saldo Pendiente Restante (a Crédito):
                  </span>
                  <span className="text-[11px] opacity-90 block">
                    {tipo === 'Ingreso' 
                      ? 'Se actualizará en Cuentas por Cobrar (CxC Clientes) para liquidar después con 1 clic.' 
                      : 'Se actualizará en Cuentas por Pagar (CxP Proveedores) para liquidar después con 1 clic.'}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-black ${tipo === 'Ingreso' ? 'text-amber-600' : 'text-rose-600'}`}>
                    Bs {saldoPendienteCalculado.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Campos condicionales del Saldo Restante según el Tipo */}
              {tipo === 'Ingreso' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-indigo-100">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-1 block">
                      Cliente / Deudor Obligado por el Saldo Restante *
                    </label>
                    <select
                      value={idCliente ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIdCliente(val);
                        if (val && val !== '__custom__') {
                          const cl = (catalogos?.clientes || []).find(c => c.idCliente === val);
                          if (cl) setNombreClienteDeudor(cl.nombre);
                        }
                      }}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                    >
                      <option value="">-- Seleccionar Cliente del Catálogo --</option>
                      {(catalogos?.clientes || []).map((c) => (
                        <option key={c.idCliente} value={c.idCliente}>
                          {c.nombre} {c.telefono ? `(${c.telefono})` : ''} - {c.ciudad || 'Bolivia'}
                        </option>
                      ))}
                      <option value="__custom__">✍️ Escribir otro Deudor / Empresa...</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-1 block">
                      Nombre o Razón Social del Deudor *
                    </label>
                    <input
                      type="text"
                      value={nombreClienteDeudor ?? ""}
                      onChange={(e) => setNombreClienteDeudor(e.target.value)}
                      placeholder="Ej. Comercial Los Andes S.R.L."
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                      required
                    />
                  </div>
                </div>
              )}

              {tipo === 'Gasto' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-indigo-100">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-rose-900 mb-1 block">
                      Proveedor Acreedor (Saldo Pendiente) *
                    </label>
                    <select
                      value={idProveedor ?? ""}
                      onChange={(e) => setIdProveedor(e.target.value)}
                      className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-rose-500 min-h-[44px]"
                      required
                    >
                      <option value="">-- Seleccionar Proveedor del Catálogo --</option>
                      {(catalogos?.proveedores || []).map((p) => (
                        <option key={p.idProveedor} value={p.idProveedor}>
                          {p.nombre} ({p.rubro || 'Proveedor'} - {p.ciudad || 'Bolivia'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-rose-900 mb-1 block">
                      Nro. de Factura / Nota de Crédito / Recibo *
                    </label>
                    <input
                      type="text"
                      value={nroFacturaBoleta ?? ""}
                      onChange={(e) => setNroFacturaBoleta(e.target.value)}
                      placeholder="Ej. FACT-9821 / NOTA-402"
                      className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-rose-500 min-h-[44px]"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 100% Crédito Panels */}
          {tipo === 'Ingreso' && modalidadPago === 'Credito' && (
            <div className="p-5 bg-amber-50/80 border border-amber-200/90 rounded-3xl space-y-4 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wide">
                <span className="p-1 bg-amber-200/80 rounded-lg">📌</span>
                <span>Registro de Cuenta por Cobrar (CxC Cliente / Venta a Crédito 100%)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-1 block">
                    Cliente / Empresa Deudora *
                  </label>
                  <select
                    value={idCliente ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setIdCliente(val);
                      if (val && val !== '__custom__') {
                        const cl = (catalogos?.clientes || []).find(c => c.idCliente === val);
                        if (cl) setNombreClienteDeudor(cl.nombre);
                      }
                    }}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                  >
                    <option value="">-- Seleccionar Cliente del Catálogo --</option>
                    {(catalogos?.clientes || []).map((c) => (
                      <option key={c.idCliente} value={c.idCliente}>
                        {c.nombre} {c.telefono ? `(${c.telefono})` : ''} - {c.ciudad || 'Bolivia'}
                      </option>
                    ))}
                    <option value="__custom__">✍️ Escribir otro Deudor / Empresa...</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-1 block">
                    Nombre o Razón Social Deudor *
                  </label>
                  <input
                    type="text"
                    value={nombreClienteDeudor ?? ""}
                    onChange={(e) => setNombreClienteDeudor(e.target.value)}
                    placeholder="Ej. Comercial Los Andes S.R.L."
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                    required={modalidadPago === 'Credito'}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block flex items-center justify-between">
                    <span>Fecha Límite / Vencimiento del Cobro</span>
                    <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                  </label>
                  <input
                    type="date"
                    value={fechaVencimiento ?? ""}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          )}

          {tipo === 'Gasto' && modalidadPago === 'Credito' && (
            <div className="p-5 bg-rose-50/80 border border-rose-200/90 rounded-3xl space-y-4 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wide">
                <span className="p-1 bg-rose-200/80 rounded-lg">📌</span>
                <span>Registro de Cuenta por Pagar (CxP Proveedor / Compra a Crédito 100%)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-rose-900 mb-1 block">
                    Proveedor / Acreedor *
                  </label>
                  <select
                    value={idProveedor ?? ""}
                    onChange={(e) => setIdProveedor(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-rose-500 min-h-[44px]"
                    required={modalidadPago === 'Credito'}
                  >
                    <option value="">-- Seleccionar Proveedor del Catálogo --</option>
                    {(catalogos?.proveedores || []).map((p) => (
                      <option key={p.idProveedor} value={p.idProveedor}>
                        {p.nombre} ({p.rubro || 'Proveedor'} - {p.ciudad || 'Bolivia'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-rose-900 mb-1 block">
                    Nro. de Factura / Nota / Recibo *
                  </label>
                  <input
                    type="text"
                    value={nroFacturaBoleta ?? ""}
                    onChange={(e) => setNroFacturaBoleta(e.target.value)}
                    placeholder="Ej. FACT-9821 / NOTA-402"
                    className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-rose-500 min-h-[44px]"
                    required={modalidadPago === 'Credito'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Categoría / Concepto */}
          {tipo !== 'Traspaso' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                  Concepto / Categoría * {categoria && <span className="text-[#1d4ed8] font-bold ml-1">• {categoria}</span>}
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[#1d4ed8] hover:text-[#1e40af] text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explorar Sugerencias</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="w-full bg-[#f8fafc] hover:bg-slate-50 border border-slate-200 hover:border-[#1d4ed8] rounded-2xl px-4 py-3 text-left flex items-center justify-between transition-all group min-h-[50px]"
              >
                <div className="flex items-center gap-3 truncate">
                  <Tag className="w-5 h-5 text-[#1d4ed8] shrink-0" />
                  {categoria ? (
                    <span className="text-sm font-bold text-slate-900 truncate">{categoria}</span>
                  ) : (
                    <span className="text-xs text-slate-400">Toca aquí para seleccionar concepto o categoría...</span>
                  )}
                </div>
                <span className="text-xs font-bold text-[#1d4ed8] bg-[#eff6ff] px-3 py-1 rounded-xl border border-blue-200 group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
                  Elegir ↗
                </span>
              </button>

              <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs pb-1">
                <span className="text-[11px] text-slate-400 font-semibold shrink-0">Sugeridos:</span>
                {(sugerenciasMasUtilizadas || []).map(cat => (
                  <button
                    key={cat.nombre}
                    type="button"
                    onClick={() => setCategoria(cat.nombre)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border shrink-0 transition-all ${
                      categoria === cat.nombre
                        ? 'bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-sm font-bold'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Camión & Viaje */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                Camión (Centro de Costos)
              </label>
              <select
                value={placaCamion ?? ""}
                onChange={(e) => setPlacaCamion(e.target.value)}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-xs font-medium min-h-[50px]"
              >
                <option value="">(Ninguno / Operativo General)</option>
                {(catalogos?.camiones || []).map((c) => (
                  <option key={c.placa} value={c.placa}>{c.placa} - {c.modelo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                Viaje en Ruta Asociado
              </label>
              <select
                value={idViaje ?? ""}
                onChange={(e) => setIdViaje(e.target.value)}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-xs font-medium min-h-[50px]"
              >
                <option value="">(Sin viaje directo)</option>
                {(viajes || []).map((v) => (
                  <option key={v.idViaje} value={v.idViaje}>
                    {v.idViaje} ({v.placaCamion}) - {v.estadoViaje}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sucursal & Referencia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                Sucursal / Agencia
              </label>
              <select
                value={sucursal ?? ""}
                onChange={(e) => setSucursal(e.target.value)}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-xs font-medium min-h-[50px]"
              >
                <option value="">(Sin asignar)</option>
                {(catalogos?.sucursales || []).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                Nro. Factura / Manifiesto / Referencia
              </label>
              <input
                type="text"
                value={nroFacturaBoleta ?? ""}
                onChange={(e) => setNroFacturaBoleta(e.target.value)}
                placeholder="Ej. FACT-102 o MIC-04"
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-xs min-h-[50px]"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
              Notas / Detalle de la Operación
            </label>
            <input
              type="text"
              value={notas ?? ""}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalle de la transacción..."
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-xs min-h-[50px]"
            />
          </div>

          {/* Foto comprobante */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
              Foto de Recibo / Factura / Comprobante
            </label>
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {fotoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
                <img src={fotoPreview} alt="Preview" className="h-20 w-28 object-cover rounded-xl border border-slate-200" />
                <button
                  type="button"
                  onClick={() => setFotoPreview(null)}
                  className="px-4 py-2 bg-rose-50 text-[#dc2626] hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200 transition-colors min-h-[42px]"
                >
                  Eliminar Foto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl border border-slate-200 transition-colors min-h-[50px]"
                >
                  <Camera className="w-5 h-5 text-[#1d4ed8]" />
                  <span className="font-semibold text-xs">Tomar Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl border border-slate-200 transition-colors min-h-[50px]"
                >
                  <Upload className="w-5 h-5 text-[#1d4ed8]" />
                  <span className="font-semibold text-xs">Subir Galería</span>
                </button>
              </div>
            )}
            {isCompressing && (
              <p className="text-[11px] text-[#1d4ed8] mt-1 font-medium">Optimizando y comprimiendo imagen...</p>
            )}
          </div>

          {/* Confirmación de Eliminación Integrada */}
          {showConfirmDelete && (
            <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-[#dc2626] font-bold text-xs">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>¿Está seguro de eliminar esta transacción permanentemente?</span>
              </div>
              <p className="text-[11px] text-slate-700">
                Se revertirá el importe en caja según la modalidad original (Bs {montoBs}) y se actualizarán los saldos operativos.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl font-bold text-xs min-h-[38px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEjecutarEliminar}
                  className="px-4 py-2 bg-[#dc2626] hover:bg-rose-700 text-white rounded-xl font-bold text-xs min-h-[38px] shadow-sm"
                >
                  Sí, Eliminar Definitivamente
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Pie Material Design 3 */}
        <div className="bg-slate-50/80 px-8 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          {!showConfirmDelete ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="text-[#dc2626] hover:text-rose-700 hover:bg-rose-50 px-4 py-2.5 rounded-2xl font-bold flex items-center gap-1.5 transition-colors min-h-[44px] text-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          ) : <div />}

          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-2xl font-bold text-xs transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              form="edit-transaccion-form"
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-black text-xs px-6 py-2.5 rounded-2xl shadow-md transition-all min-h-[44px] flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal selector de categorías */}
      <CategorySelectModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        tipo={tipo === 'Traspaso' ? 'Gasto' : tipo}
        selectedCategory={categoria}
        allCategories={allConceptos}
        frequentCategories={sugerenciasMasUtilizadas}
        onSelectCategory={(catName) => {
          setCategoria(catName);
          setIsCategoryModalOpen(false);
        }}
        onAddNewCategory={(nombre) => {
          if (onAddCategoria) {
            onAddCategoria({
              nombre,
              tipo: tipo === 'Traspaso' ? 'Gasto' : tipo,
              color: tipo === 'Ingreso' ? '#10b981' : '#f43f5e',
              icono: 'Tag'
            });
          }
          setCategoria(nombre);
          setIsCategoryModalOpen(false);
        }}
      />
    </div>
  );
};

/**
 * Componente Contenedor del Modal de Edición de Transacción.
 * Implementa renderizado condicional limpio: si isOpen es false o transaccion es nula,
 * devuelve null sin disparar violaciones en los hooks ni excepciones en render.
 * Además envuelve la ejecución en un ErrorBoundary defensivo.
 */
export const EditTransaccionModal: React.FC<EditTransaccionModalProps> = (props) => {
  if (!props.isOpen || !props.transaccion) {
    return null;
  }

  const rawTx: any = props.transaccion;
  const safeKey = String(rawTx.idTransaccion || rawTx.ID_Transaccion || `edit-tx-${Date.now()}`);

  return (
    <ErrorBoundary 
      onReset={props.onClose} 
      fallbackMessage="Aviso al abrir editor de transacción"
    >
      <EditTransaccionFormContent
        {...props}
        key={safeKey}
        transaccion={props.transaccion}
      />
    </ErrorBoundary>
  );
};
