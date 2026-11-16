import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Fuel, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Wallet, 
  Search, 
  Plus, 
  Building2, 
  User, 
  TrendingDown, 
  TrendingUp, 
  Truck, 
  Calendar, 
  Save, 
  LogOut, 
  Layers, 
  Clock, 
  Eye, 
  Scale 
} from 'lucide-react';
import { Viaje, Catalogos, GastoRutaCamion, CategoriaFinanciera } from '../types';
import { compressImageFile } from '../utils/imageCompressor';

interface GastoRutaModalProps {
  isOpen: boolean;
  onClose: () => void;
  viajesActivos: Viaje[];
  catalogos: Catalogos;
  selectedPlaca: string;
  gastosRuta?: GastoRutaCamion[];
  categorias?: CategoriaFinanciera[];
  onSaveGasto: (gasto: any, fotoBase64?: string) => Promise<void>;
  onAddCategoria?: (cat: Omit<CategoriaFinanciera, 'id' | 'esPredefinida'>) => void;
  isOnline: boolean;
  prefillIdViaje?: string;
}

const DEFAULT_CONCEPTOS_GASTO = [
  'Combustible / Diésel',
  'Peajes y Balanzas',
  'Estibadores / Cargadores',
  'Viáticos Chofer',
  'Mantenimiento / Taller de Emergencia',
  'Llantería / Gomería',
  'Policía / Tránsito',
  'Otros Gastos de Ruta'
];

const DEFAULT_CONCEPTOS_INGRESO = [
  'Cobro Flete Origen',
  'Cobro Flete Destino',
  'Anticipo Viáticos Central',
  'Traspaso Banco / QR',
  'Otros Ingresos Carga'
];

export const GastoRutaModal: React.FC<GastoRutaModalProps> = ({
  isOpen,
  onClose,
  viajesActivos,
  catalogos,
  selectedPlaca,
  gastosRuta = [],
  categorias = [],
  onSaveGasto,
  onAddCategoria,
  isOnline,
  prefillIdViaje
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const detalleInputRef = useRef<HTMLInputElement>(null);
  const importeInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef<boolean>(false);

  // Selector de Tipo de Operación
  const [tipoOperacion, setTipoOperacion] = useState<'Gasto' | 'Ingreso'>('Gasto');

  // Cabecera del Viaje
  const [idViaje, setIdViaje] = useState<string>('');
  const [placaCamion, setPlacaCamion] = useState<string>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);

  // Formulario de Transacción
  const [categoriaGasto, setCategoriaGasto] = useState<string>('Combustible / Diésel');
  const [detalleGasto, setDetalleGasto] = useState<string>('');
  const [importeBs, setImporteBs] = useState<string>('');
  const [litrosDiesel, setLitrosDiesel] = useState<string>('');
  const [cajaCuenta, setCajaCuenta] = useState<string>('Efectivo Chofer Ruta');
  const [nroFactura, setNroFactura] = useState<string>('');
  const [idProveedor, setIdProveedor] = useState<string>('');
  const [idCliente, setIdCliente] = useState<string>('');
  const [metodoOrigenFondo, setMetodoOrigenFondo] = useState<string>('Efectivo');

  // Búsqueda en Selectores
  const [searchProveedor, setSearchProveedor] = useState<string>('');
  const [searchCliente, setSearchCliente] = useState<string>('');

  // Creación dinámica de nuevos conceptos
  const [showNuevoConceptoInput, setShowNuevoConceptoInput] = useState<boolean>(false);
  const [nuevoConceptoTexto, setNuevoConceptoTexto] = useState<string>('');

  // Foto / Comprobante
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [visorFotoUrl, setVisorFotoUrl] = useState<string | null>(null);

  // Estados de Operación y Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [registrosEnSesion, setRegistrosEnSesion] = useState<any[]>([]);

  // Inicializar viaje activo al abrir el modal o cambiar props
  useEffect(() => {
    if (!isOpen) return;

    let targetViaje = viajesActivos.find(v => v.idViaje === prefillIdViaje);
    if (!targetViaje && selectedPlaca && selectedPlaca !== 'todas') {
      targetViaje = viajesActivos.find(v => v.placaCamion === selectedPlaca);
    }
    if (!targetViaje && viajesActivos.length > 0) {
      targetViaje = viajesActivos[0];
    }

    if (targetViaje) {
      setIdViaje(targetViaje.idViaje);
      setPlacaCamion(targetViaje.placaCamion);
    }
    setFecha(new Date().toISOString().split('T')[0]);
    setErrorMsg(null);
    setToastMsg(null);
    setRegistrosEnSesion([]);
  }, [isOpen, prefillIdViaje, selectedPlaca, viajesActivos]);

  // Actualizar placa al cambiar viaje
  const handleViajeChange = (newIdViaje: string) => {
    setIdViaje(newIdViaje);
    const v = viajesActivos.find(item => item.idViaje === newIdViaje);
    if (v) setPlacaCamion(v.placaCamion);
  };

  // Viaje actualmente seleccionado
  const viajeSeleccionado = useMemo(() => {
    return viajesActivos.find(v => v.idViaje === idViaje);
  }, [viajesActivos, idViaje]);

  // Conceptos dinámicos unificados
  const conceptosDisponibles = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const add = (c: string) => {
      const clean = c?.trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(clean);
      }
    };

    if (tipoOperacion === 'Gasto') {
      DEFAULT_CONCEPTOS_GASTO.forEach(add);
      (catalogos.categoriasGastoRuta || []).forEach(add);
      categorias.filter(c => c.tipo === 'Gasto').forEach(c => add(c.nombre));
    } else {
      DEFAULT_CONCEPTOS_INGRESO.forEach(add);
      (catalogos.categoriasIngresoDestino || []).forEach(add);
      categorias.filter(c => c.tipo === 'Ingreso').forEach(c => add(c.nombre));
    }
    return list;
  }, [tipoOperacion, catalogos, categorias]);

  // Cambiar tipo de operación (Gasto vs Ingreso)
  const handleTipoOperacionChange = (tipo: 'Gasto' | 'Ingreso') => {
    setTipoOperacion(tipo);
    setErrorMsg(null);
    if (tipo === 'Gasto') {
      setCategoriaGasto('Combustible / Diésel');
      setCajaCuenta('Efectivo Chofer Ruta');
    } else {
      setCategoriaGasto('Cobro Flete Destino');
      setCajaCuenta('Efectivo Chofer Ruta');
      setMetodoOrigenFondo('Efectivo');
    }
  };

  // Agregar nuevo concepto personalizado
  const handleCrearNuevoConcepto = () => {
    if (!nuevoConceptoTexto.trim()) return;
    const nuevo = nuevoConceptoTexto.trim();

    if (onAddCategoria) {
      onAddCategoria({
        nombre: nuevo,
        tipo: tipoOperacion,
        color: tipoOperacion === 'Ingreso' ? '#16a34a' : '#dc2626',
        icono: 'Fuel'
      });
    }

    setCategoriaGasto(nuevo);
    setNuevoConceptoTexto('');
    setShowNuevoConceptoInput(false);
    setToastMsg({ text: `Concepto "${nuevo}" añadido y seleccionado.`, type: 'info' });
  };

  // Manejo de archivo/foto
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressedDataUrl = await compressImageFile(file, 1200, 0.75);
      setFotoPreview(compressedDataUrl);
      setToastMsg({ text: 'Comprobante optimizado y adjuntado.', type: 'info' });
    } catch (err) {
      console.error('Error al procesar foto:', err);
      setErrorMsg('No se pudo procesar la fotografía.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Historial en vivo del viaje activo (registros previos + registros en esta sesión)
  const historialViajeActivo = useMemo(() => {
    const previos = (gastosRuta || []).filter(g => g.idViajeAsignado === idViaje);
    // Unir sin duplicar por ID
    const map = new Map<string, any>();
    previos.forEach(p => map.set(p.idGastoRuta, { ...p, esNuevo: false }));
    registrosEnSesion.forEach(r => map.set(r.idGastoRuta, { ...r, esNuevo: true }));
    return Array.from(map.values()).sort((a, b) => (b.fechaHora || '').localeCompare(a.fechaHora || ''));
  }, [gastosRuta, idViaje, registrosEnSesion]);

  // Totales en vivo del viaje activo
  const totalesViaje = useMemo(() => {
    let gastosTotal = 0;
    let ingresosTotal = 0;

    historialViajeActivo.forEach(item => {
      const monto = Number(item.importeBs) || 0;
      if (item.tipoOperacion === 'Ingreso') {
        ingresosTotal += monto;
      } else {
        gastosTotal += monto;
      }
    });

    return {
      gastos: gastosTotal,
      ingresos: ingresosTotal,
      saldoNeto: ingresosTotal - gastosTotal
    };
  }, [historialViajeActivo]);

  // Proveedores filtrados
  const proveedoresFiltrados = useMemo(() => {
    const provs = catalogos.proveedores || [];
    if (!searchProveedor.trim()) return provs;
    const q = searchProveedor.toLowerCase();
    return provs.filter(p => 
      p.nombre.toLowerCase().includes(q) || 
      (p.rubro && p.rubro.toLowerCase().includes(q)) ||
      (p.ciudad && p.ciudad.toLowerCase().includes(q))
    );
  }, [catalogos.proveedores, searchProveedor]);

  // Clientes filtrados
  const clientesFiltrados = useMemo(() => {
    const clis = catalogos.clientes || [];
    if (!searchCliente.trim()) return clis;
    const q = searchCliente.toLowerCase();
    return clis.filter(c => 
      c.nombre.toLowerCase().includes(q) || 
      (c.ciudad && c.ciudad.toLowerCase().includes(q)) ||
      (c.telefono && c.telefono.includes(q))
    );
  }, [catalogos.clientes, searchCliente]);

  // Función interna para validar y guardar un registro
  const ejecutarGuardado = async (): Promise<boolean> => {
    if (isSubmitting || submittingRef.current) return false;
    setErrorMsg(null);

    const importe = parseFloat(importeBs);
    if (isNaN(importe) || importe <= 0) {
      setErrorMsg('Por favor ingrese un Importe Total válido (mayor a 0 Bs.).');
      if (importeInputRef.current) importeInputRef.current.focus();
      return false;
    }

    if (!idViaje) {
      setErrorMsg('Debe seleccionar el viaje asignado.');
      return false;
    }

    if (!categoriaGasto) {
      setErrorMsg('Seleccione un concepto o categoría.');
      return false;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    const prov = tipoOperacion === 'Gasto' && idProveedor ? catalogos.proveedores?.find(p => p.idProveedor === idProveedor) : undefined;
    const cli = tipoOperacion === 'Ingreso' && idCliente ? catalogos.clientes?.find(c => c.idCliente === idCliente) : undefined;

    const fechaHoraCompleta = `${fecha} ${new Date().toTimeString().substring(0, 5)}`;
    const tempId = `GST-${Date.now()}`;

    const payload = {
      idGastoRuta: tempId,
      idViajeAsignado: idViaje,
      placaCamion,
      fechaHora: fechaHoraCompleta,
      categoriaGasto,
      tipoOperacion,
      importeBs: importe,
      litrosDiesel: (tipoOperacion === 'Gasto' && litrosDiesel) ? parseFloat(litrosDiesel) : undefined,
      cajaCuentaUtilizada: tipoOperacion === 'Ingreso' && metodoOrigenFondo ? `${metodoOrigenFondo} (${cajaCuenta})` : cajaCuenta,
      nroFacturaBoleta: nroFactura.trim() || 'S/N',
      detalleGasto: detalleGasto.trim() || `${categoriaGasto} en ruta (${placaCamion})`,
      idProveedor: tipoOperacion === 'Gasto' ? (idProveedor || undefined) : undefined,
      nombreProveedor: tipoOperacion === 'Gasto' ? prov?.nombre : undefined,
      idCliente: tipoOperacion === 'Ingreso' ? (idCliente || undefined) : undefined,
      nombreCliente: tipoOperacion === 'Ingreso' ? cli?.nombre : undefined,
      metodoOrigenFondo: tipoOperacion === 'Ingreso' ? metodoOrigenFondo : undefined,
      comprobanteFotoUrl: fotoPreview || undefined
    };

    try {
      await onSaveGasto(payload, fotoPreview || undefined);

      // Agregar al estado de sesión en tiempo real
      setRegistrosEnSesion(prev => [payload, ...prev]);

      return true;
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Ocurrió un error al guardar la transacción. Intente nuevamente.');
      return false;
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  // Botón 1: [💾 Guardar y Continuar]
  const handleGuardarYContinuar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const exito = await ejecutarGuardado();
    if (!exito) return;

    // Toast discreto de confirmación
    const labelTipo = tipoOperacion === 'Ingreso' ? 'Ingreso / Anticipo' : 'Gasto de ruta';
    setToastMsg({
      text: `✓ ${labelTipo} de Bs. ${parseFloat(importeBs).toFixed(2)} registrado exitosamente. Listo para el siguiente registro.`,
      type: 'success'
    });

    // LIMPIAR únicamente los campos específicos del formulario
    setImporteBs('');
    setLitrosDiesel('');
    setDetalleGasto('');
    setNroFactura('');
    setFotoPreview(null);
    setIdProveedor('');
    setIdCliente('');
    setSearchProveedor('');
    setSearchCliente('');

    // Reenfocar campo para siguiente registro fluido
    setTimeout(() => {
      if (detalleInputRef.current) {
        detalleInputRef.current.focus();
      } else if (importeInputRef.current) {
        importeInputRef.current.focus();
      }
    }, 100);
  };

  // Botón 2: [✅ Guardar y Salir]
  const handleGuardarYSalir = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Si el usuario tiene un monto escrito, guardarlo primero
    const tieneMontoPendiente = parseFloat(importeBs) > 0;
    if (tieneMontoPendiente) {
      const exito = await ejecutarGuardado();
      if (!exito) return;
    }

    // Cerrar el modal
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* ========================================================================= */}
        {/* HEADER: OPERACIÓN EN CARRETERA (CHOFER / RUTA) */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/90 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
              tipoOperacion === 'Gasto'
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            }`}>
              {tipoOperacion === 'Gasto' ? <Fuel className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Operación en Carretera (Chofer / Ruta)
                </h3>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                  {idViaje || 'Sin Viaje'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro ágil y múltiple de gastos operativos, cobros de fletes y anticipos en ruta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isOnline && (
              <span className="text-xs text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                Offline
              </span>
            )}
            <button 
              type="button"
              onClick={onClose} 
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BARRA DE CABECERA DEL VIAJE ACTIVO & PESTAÑAS DE TIPO */}
        {/* ========================================================================= */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Pestañas de Tipo: [Gasto en Ruta] vs [Ingreso / Anticipo] */}
          <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => handleTipoOperacionChange('Gasto')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all min-h-[38px] ${
                tipoOperacion === 'Gasto'
                  ? 'bg-[#dc2626] text-white shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Gasto en Ruta (-)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTipoOperacionChange('Ingreso')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all min-h-[38px] ${
                tipoOperacion === 'Ingreso'
                  ? 'bg-[#16a34a] text-white shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Ingreso / Anticipo (+)</span>
            </button>
          </div>

          {/* Ficha Resumen del Viaje Activo (Conserva intacto el contexto) */}
          <div className="flex items-center gap-4 text-xs bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Camión: <strong>{placaCamion || 'General'}</strong></span>
            </div>
            {viajeSeleccionado?.choferAsignado && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Chofer: <strong>{viajeSeleccionado.choferAsignado}</strong></span>
              </div>
            )}
            {viajeSeleccionado?.destino && (
              <div className="hidden sm:flex items-center gap-1.5 text-slate-500">
                <span>Ruta: <strong>{viajeSeleccionado.origen || 'Origen'} → {viajeSeleccionado.destino}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CUERPO DEL MODAL (FORMULARIO EN 2 COLUMNAS + TABLA INFERIOR) */}
        {/* ========================================================================= */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Mensajes de Alerta y Toast Inline */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-2.5 font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {toastMsg && (
            <div className={`p-3.5 rounded-2xl flex items-center justify-between font-semibold animate-in fade-in ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{toastMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMsg(null)}
                className="text-slate-400 hover:text-slate-600 ml-2 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Grilla de 2 Columnas de Formulario */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* ------------------------------------------------------------- */}
            {/* COLUMNA 1: VIAJE, FECHA, CONCEPTO Y MONTOS */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-4">
              
              {/* Fila: Viaje Asignado y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                    Viaje Asignado *
                  </label>
                  <select
                    value={idViaje}
                    onChange={(e) => handleViajeChange(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[44px]"
                    required
                  >
                    {viajesActivos.map(v => (
                      <option key={v.idViaje} value={v.idViaje}>
                        {v.idViaje} • {v.placaCamion} ({v.choferAsignado})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Fecha de Operación *</span>
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[44px]"
                    required
                  />
                </div>
              </div>

              {/* Concepto / Categoría */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Concepto / Categoría ({tipoOperacion}) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNuevoConceptoInput(!showNuevoConceptoInput)}
                    className="text-[11px] text-[#1d4ed8] hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Nuevo Concepto</span>
                  </button>
                </div>

                {/* Input para nuevo concepto si se activa */}
                {showNuevoConceptoInput && (
                  <div className="flex gap-2 mb-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl animate-in fade-in">
                    <input
                      type="text"
                      value={nuevoConceptoTexto}
                      onChange={(e) => setNuevoConceptoTexto(e.target.value)}
                      placeholder="Nombre del nuevo concepto..."
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleCrearNuevoConcepto}
                      className="px-3 py-1.5 bg-[#1d4ed8] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-blue-700"
                    >
                      Añadir
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNuevoConceptoInput(false)}
                      className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Chips rápidos de conceptos */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {conceptosDisponibles.slice(0, 5).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategoriaGasto(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        categoriaGasto === c
                          ? (tipoOperacion === 'Ingreso'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-400 shadow-xs'
                              : 'bg-rose-100 text-rose-800 border border-rose-400 shadow-xs')
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <select
                  value={categoriaGasto}
                  onChange={(e) => setCategoriaGasto(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[44px]"
                  required
                >
                  {conceptosDisponibles.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Detalle / Glosa descriptiva */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Detalle / Glosa Descriptiva *
                </label>
                <input
                  ref={detalleInputRef}
                  type="text"
                  value={detalleGasto}
                  onChange={(e) => setDetalleGasto(e.target.value)}
                  placeholder={
                    tipoOperacion === 'Ingreso'
                      ? 'Ej. Cobro saldo flete Ferretería Guadalquivir...'
                      : 'Ej. Carga de diésel 250 L Surtidor Caracollo / Peaje Challapata...'
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[44px]"
                />
              </div>

              {/* Importe Total (Bs.) y Litros Diésel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                    Importe Total (Bs.) *
                  </label>
                  <div className="relative">
                    <input
                      ref={importeInputRef}
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={importeBs}
                      onChange={(e) => setImporteBs(e.target.value)}
                      placeholder="0.00"
                      className={`w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-base font-black tabular-nums text-right focus:bg-white focus:ring-2 focus:border-transparent min-h-[44px] ${
                        tipoOperacion === 'Ingreso'
                          ? 'text-emerald-700 focus:ring-emerald-500'
                          : 'text-rose-600 focus:ring-rose-500'
                      }`}
                      required
                    />
                    <span className="absolute left-3 top-3 text-xs font-bold text-slate-400 pointer-events-none">
                      Bs.
                    </span>
                  </div>
                </div>

                {/* Litros Diésel condicional si aplica a combustible */}
                {tipoOperacion === 'Gasto' && (categoriaGasto.includes('Combustible') || categoriaGasto.includes('Diésel')) ? (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                      Litros Diésel Cargados
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={litrosDiesel}
                        onChange={(e) => setLitrosDiesel(e.target.value)}
                        placeholder="Ej. 250"
                        className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[44px]"
                      />
                      {litrosDiesel && importeBs && parseFloat(litrosDiesel) > 0 && (
                        <span className="absolute right-2.5 top-3 text-[10px] text-[#1d4ed8] bg-blue-50 px-2 py-0.5 rounded font-mono font-bold border border-blue-200">
                          {(parseFloat(importeBs) / parseFloat(litrosDiesel)).toFixed(2)} Bs/L
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                      Nro. Factura / Recibo / Boleta
                    </label>
                    <input
                      type="text"
                      value={nroFactura}
                      onChange={(e) => setNroFactura(e.target.value)}
                      placeholder="FAC-98432 / REC-102"
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[44px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* COLUMNA 2: PROVEEDOR/CLIENTE, CAJA, ORIGEN Y FOTO */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-4">
              
              {/* Proveedor (en Gasto) vs Cliente (en Ingreso) */}
              {tipoOperacion === 'Gasto' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Proveedor / Estación de Servicio</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Opcional</span>
                  </div>

                  {/* Input de filtro rápido */}
                  <div className="relative mb-1.5">
                    <input
                      type="text"
                      value={searchProveedor}
                      onChange={(e) => setSearchProveedor(e.target.value)}
                      placeholder="Buscar proveedor por nombre o rubro..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-rose-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>

                  <select
                    value={idProveedor}
                    onChange={(e) => setIdProveedor(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[44px]"
                  >
                    <option value="">-- Sin Proveedor asignado --</option>
                    {proveedoresFiltrados.map(p => (
                      <option key={p.idProveedor} value={p.idProveedor}>
                        {p.nombre} ({p.rubro || 'Proveedor'} - {p.ciudad || 'Bolivia'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Cliente Asociado / Deudor / Agencia</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Opcional</span>
                  </div>

                  {/* Input de filtro rápido */}
                  <div className="relative mb-1.5">
                    <input
                      type="text"
                      value={searchCliente}
                      onChange={(e) => setSearchCliente(e.target.value)}
                      placeholder="Buscar cliente por nombre o ciudad..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>

                  <select
                    value={idCliente}
                    onChange={(e) => setIdCliente(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[44px]"
                  >
                    <option value="">-- Sin Cliente asignado (General) --</option>
                    {clientesFiltrados.map(c => (
                      <option key={c.idCliente} value={c.idCliente}>
                        {c.nombre} {c.telefono ? `(${c.telefono})` : ''} - {c.ciudad || 'Bolivia'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Método / Origen del Fondo (en Ingreso) o Caja Afectada (en Gasto) */}
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    {tipoOperacion === 'Ingreso' ? 'Método / Origen del Fondo *' : 'Caja / Cuenta Afectada *'}
                  </label>
                  <span className="text-[11px] font-mono font-bold text-[#1d4ed8]">{cajaCuenta}</span>
                </div>

                {tipoOperacion === 'Ingreso' && (
                  <div className="grid grid-cols-3 gap-2 pb-1.5">
                    {['Efectivo', 'Transferencia', 'QR'].map(met => (
                      <button
                        key={met}
                        type="button"
                        onClick={() => setMetodoOrigenFondo(met)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                          metodoOrigenFondo === met
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {met}
                      </button>
                    ))}
                  </div>
                )}

                <select
                  value={cajaCuenta}
                  onChange={(e) => setCajaCuenta(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] min-h-[40px]"
                  required
                >
                  {catalogos.cajasCuentas.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Adjuntar Foto / Comprobante */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    Foto de Factura / Ticket / Boleta
                  </span>
                  {fotoPreview && (
                    <button
                      type="button"
                      onClick={() => setFotoPreview(null)}
                      className="text-[11px] text-rose-600 hover:underline font-bold"
                    >
                      Eliminar foto
                    </button>
                  )}
                </label>

                {fotoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-36 flex items-center justify-center bg-slate-50 p-2">
                    <img src={fotoPreview} alt="Comprobante" className="max-h-32 object-contain rounded-xl" />
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <CheckCircle2 className="w-3 h-3" /> Foto Lista
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center justify-center space-x-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors min-h-[44px]"
                    >
                      <Camera className="w-4 h-4 text-[#1d4ed8]" />
                      <span className="text-xs font-bold">Tomar Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center space-x-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors min-h-[44px]"
                    >
                      <Upload className="w-4 h-4 text-[#1d4ed8]" />
                      <span className="text-xs font-bold">Subir Galería</span>
                    </button>
                  </div>
                )}

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
                {isCompressing && (
                  <p className="text-[11px] text-[#1d4ed8] mt-1 font-medium">Optimizando y comprimiendo imagen...</p>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABLA INFERIOR DE HISTORIAL DEL VIAJE ACTIVO (EN TIEMPO REAL) */}
          {/* ========================================================================= */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Historial de Operaciones Registradas en este Viaje ({historialViajeActivo.length})
                </h4>
              </div>

              {/* Subtotales en Vivo */}
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="text-rose-600 font-bold">
                  Gastos: <strong>Bs. {totalesViaje.gastos.toFixed(2)}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-bold">
                  Ingresos: <strong>Bs. {totalesViaje.ingresos.toFixed(2)}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className={`font-black ${totalesViaje.saldoNeto >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                  Saldo Neto: <strong>Bs. {totalesViaje.saldoNeto.toFixed(2)}</strong>
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs bg-white">
              <table className="w-full text-xs min-w-[760px]">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-bold text-[10px] select-none">
                  <tr>
                    <th className="py-2 px-3 text-left w-20">Tipo</th>
                    <th className="py-2 px-3 text-left w-28">Fecha</th>
                    <th className="py-2 px-3 text-left w-40">Concepto</th>
                    <th className="py-2 px-3 text-left">Detalle / Glosa</th>
                    <th className="py-2 px-3 text-left w-36">Proveedor / Cliente</th>
                    <th className="py-2 px-3 text-left w-32">Caja / Origen</th>
                    <th className="py-2 px-3 text-right w-28">Monto (Bs.)</th>
                    <th className="py-2 px-2 text-center w-16">Foto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historialViajeActivo.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 italic text-[11px]">
                        No hay movimientos registrados para este viaje todavía. Utilice los botones de guardado arriba para registrar.
                      </td>
                    </tr>
                  ) : (
                    historialViajeActivo.slice(0, 10).map((item, idx) => {
                      const esIng = item.tipoOperacion === 'Ingreso';
                      return (
                        <tr key={item.idGastoRuta || idx} className={`hover:bg-slate-50 transition-colors ${item.esNuevo ? 'bg-emerald-50/40' : ''}`}>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              esIng ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {esIng ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {esIng ? 'Ingreso' : 'Gasto'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                            {item.fechaHora || '-'}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800 whitespace-nowrap truncate max-w-[140px]">
                            {item.categoriaGasto}
                          </td>
                          <td className="py-2 px-3 text-slate-700 truncate max-w-[200px]">
                            {item.detalleGasto || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-[140px]">
                            {item.nombreProveedor || item.nombreCliente || item.idProveedor || item.idCliente || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap text-[11px]">
                            {item.cajaCuentaUtilizada || 'Efectivo Chofer Ruta'}
                          </td>
                          <td className={`py-2 px-3 text-right font-black tabular-nums whitespace-nowrap ${
                            esIng ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {esIng ? '+' : '-'}Bs. {Number(item.importeBs || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            {item.comprobanteFotoUrl ? (
                              <button
                                type="button"
                                onClick={() => setVisorFotoUrl(item.comprobanteFotoUrl)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                title="Ver comprobante"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER: BOTONES DE GUARDADO Y ACCIÓN FLUIDA */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          {/* Contador de operaciones registradas */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold self-start sm:self-auto">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Operaciones en esta sesión:</span>
            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              {registrosEnSesion.length}
            </span>
          </div>

          {/* Botones requeridos: Cancelar, Guardar y Continuar, Guardar y Salir */}
          <div className="flex items-center justify-end space-x-2.5 w-full sm:w-auto">
            {/* Botón 3: Cancelar / Cerrar */}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl font-bold min-h-[44px] transition-colors"
            >
              Cancelar / Cerrar
            </button>

            {/* Botón 1: [💾 Guardar y Continuar] */}
            <button
              type="button"
              onClick={handleGuardarYContinuar}
              disabled={isSubmitting || isCompressing}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all min-h-[44px] active:scale-95 disabled:opacity-50"
              title="Guarda la transacción, limpia el formulario y mantiene el modal abierto para registrar la siguiente"
            >
              <Save className="w-4 h-4 text-blue-400" />
              <span>{isSubmitting ? 'Guardando...' : '💾 Guardar y Continuar'}</span>
            </button>

            {/* Botón 2: [✅ Guardar y Salir] */}
            <button
              type="button"
              onClick={handleGuardarYSalir}
              disabled={isSubmitting || isCompressing}
              className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 shadow-md transition-all min-h-[44px] active:scale-95 disabled:opacity-50 text-white ${
                tipoOperacion === 'Ingreso'
                  ? 'bg-[#16a34a] hover:bg-emerald-700 shadow-emerald-600/25'
                  : 'bg-[#dc2626] hover:bg-rose-700 shadow-rose-600/25'
              }`}
              title="Guarda la última transacción y cierra automáticamente la ventana emergente"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : '✅ Guardar y Salir'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Visor emergente de foto de comprobante */}
      {visorFotoUrl && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-4 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="font-bold text-xs text-slate-800">Comprobante de Operación</span>
              <button
                type="button"
                onClick={() => setVisorFotoUrl(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex-1 overflow-auto flex items-center justify-center bg-slate-50 rounded-2xl my-2">
              <img src={visorFotoUrl} alt="Comprobante" className="max-h-[70vh] object-contain rounded-xl" />
            </div>
            <button
              type="button"
              onClick={() => setVisorFotoUrl(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              Cerrar Visor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
