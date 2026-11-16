import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Printer, 
  Save, 
  Trash2, 
  MapPin, 
  Building2, 
  User, 
  Phone, 
  CheckCircle2, 
  UserCheck, 
  ShieldCheck, 
  DollarSign, 
  Truck, 
  AlertCircle,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  ManifiestoOrigen, 
  ManifiestoDestino, 
  Catalogos, 
  EstadoManifiesto, 
  EstadoLiquidacionSub, 
  Cliente, 
  MetodoCobroOrigen, 
  EstadoLiquidacionAgencia, 
  ModalidadCobroDestino, 
  TipoDeudor 
} from '../types';
import { storage } from '../services/storageService';
import { INITIAL_CATALOGOS } from '../data/initialData';

interface EditManifiestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifiestoOrigen?: ManifiestoOrigen | null;
  subManifiesto?: ManifiestoDestino | null;
  catalogos: Catalogos;
  onUpdateOrigen?: (man: ManifiestoOrigen) => void;
  onDeleteOrigen?: (id: string) => void;
  onUpdateSub?: (sub: ManifiestoDestino) => void;
  onDeleteSub?: (id: string) => void;
}

export const EditManifiestoModal: React.FC<EditManifiestoModalProps> = ({
  isOpen,
  onClose,
  manifiestoOrigen,
  subManifiesto,
  catalogos,
  onUpdateOrigen,
  onDeleteOrigen,
  onUpdateSub,
  onDeleteSub
}) => {
  const isEditingSub = !!subManifiesto;

  // State para Manifiesto Origen (MIC Padre)
  const [nroMIC, setNroMIC] = useState<string>(manifiestoOrigen?.nroManifiestoMIC || '');
  const [sucursalOrigen, setSucursalOrigen] = useState<string>(manifiestoOrigen?.sucursalOrigen || 'Oruro');
  const [fechaEmision, setFechaEmision] = useState<string>(manifiestoOrigen?.fechaEmision || '');
  const [estadoManifiesto, setEstadoManifiesto] = useState<EstadoManifiesto>(manifiestoOrigen?.estadoManifiesto || 'Despachado');

  // State para Sub-Manifiesto / Encomienda
  const [nroSub, setNroSub] = useState<string>(subManifiesto?.nroManifiesto || '');
  const [sucursalDestino, setSucursalDestino] = useState<string>(subManifiesto?.sucursalDestino || 'Tarija');
  const [pagadoOrigenBs, setPagadoOrigenBs] = useState<string>(String(subManifiesto?.pagadoOrigenBs || 0));
  const [porPagarDestinoBs, setPorPagarDestinoBs] = useState<string>(
    String(subManifiesto?.porPagarDestinoBs !== undefined ? subManifiesto.porPagarDestinoBs : (subManifiesto?.saldoInicialCobrarBs || 0))
  );
  
  // Datos Generales
  const [descripcionCarga, setDescripcionCarga] = useState<string>(subManifiesto?.descripcionCarga || '');
  const [estadoLiquidacion, setEstadoLiquidacion] = useState<EstadoLiquidacionSub>(subManifiesto?.estadoLiquidacion || 'En Reparto');

  // Lógica Dual Origen: Cliente Directo vs Agencia / Sucursal Intermediaria
  const [tipoDeudorOrigen, setTipoDeudorOrigen] = useState<'CLIENTE' | 'AGENCIA'>(
    subManifiesto?.metodoCobroOrigen === 'Por Liquidar / Crédito Agencia' ? 'AGENCIA' : 'CLIENTE'
  );
  const [remitente, setRemitente] = useState<string>(subManifiesto?.remitente || '');
  const [telefonoRemitente, setTelefonoRemitente] = useState<string>(subManifiesto?.telefonoRemitente || '');
  const [agenciaOrigenResponsable, setAgenciaOrigenResponsable] = useState<string>(
    subManifiesto?.cuentaAfectadaOrigen?.replace('Caja Agencia ', '').replace('CxC Agencia ', '') || 'Oruro'
  );
  const [metodoCobroOrigen, setMetodoCobroOrigen] = useState<MetodoCobroOrigen>(subManifiesto?.metodoCobroOrigen || 'Efectivo en Agencia');
  const [cuentaAfectadaOrigen, setCuentaAfectadaOrigen] = useState<string>(subManifiesto?.cuentaAfectadaOrigen || 'Caja Agencia Oruro');
  const [estadoLiquidacionAgencia, setEstadoLiquidacionAgencia] = useState<EstadoLiquidacionAgencia>(subManifiesto?.estadoLiquidacionAgencia || 'Pendiente de Liquidación');

  // Lógica Dual Destino: Cliente Directo vs Agencia / Sucursal Intermediaria
  const [tipoDeudorDestino, setTipoDeudorDestino] = useState<TipoDeudor>(
    subManifiesto?.tipoDeudor || (subManifiesto?.modalidadCobroDestino === 'Cobro Directo Empresa / Cliente' ? 'CLIENTE' : 'AGENCIA')
  );
  const [destinatario, setDestinatario] = useState<string>(subManifiesto?.destinatario || '');
  const [telefonoContacto, setTelefonoContacto] = useState<string>(subManifiesto?.telefonoContacto || '');
  const [direccionDestinatario, setDireccionDestinatario] = useState<string>(subManifiesto?.direccionDestinatario || '');
  const [agenciaDestinoResponsable, setAgenciaDestinoResponsable] = useState<string>(
    subManifiesto?.agenciaDestinoResponsable || subManifiesto?.sucursalDestino || 'Tarija'
  );

  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<boolean>(false);

  // Cálculos matemáticos en vivo
  const pagadoNum = parseFloat(pagadoOrigenBs) || 0;
  const porPagarNum = parseFloat(porPagarDestinoBs) || 0;
  const fleteAsignadoCalculado = pagadoNum + porPagarNum;

  // Catálogo completo de Clientes para búsqueda limpia sin sugerencias rápidas
  const clientesDisponibles = useMemo(() => {
    const listCat = catalogos?.clientes || [];
    const listStorage = storage.getClientes() || [];
    const listInitial = INITIAL_CATALOGOS.clientes || [];

    const map = new Map<string, Cliente>();
    listInitial.forEach((c: Cliente) => { if (c?.nombre) map.set(c.nombre.toLowerCase().trim(), c); });
    listStorage.forEach((c: Cliente) => { if (c?.nombre) map.set(c.nombre.toLowerCase().trim(), c); });
    listCat.forEach((c: Cliente) => { if (c?.nombre) map.set(c.nombre.toLowerCase().trim(), c); });

    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [catalogos?.clientes]);

  const handleClienteDestinoSelect = (nombreOId: string) => {
    const found = clientesDisponibles.find(
      c => c.nombre.toLowerCase().trim() === nombreOId.toLowerCase().trim() ||
           c.idCliente.toLowerCase().trim() === nombreOId.toLowerCase().trim()
    );
    if (found) {
      setDestinatario(found.nombre);
      if (found.telefono) setTelefonoContacto(found.telefono);
      if (found.direccion) setDireccionDestinatario(found.direccion);
      if (found.ciudad && catalogos.sucursales.includes(found.ciudad)) {
        setSucursalDestino(found.ciudad);
      }
    } else {
      setDestinatario(nombreOId);
    }
  };

  const handleClienteRemitenteSelect = (nombreOId: string) => {
    const found = clientesDisponibles.find(
      c => c.nombre.toLowerCase().trim() === nombreOId.toLowerCase().trim() ||
           c.idCliente.toLowerCase().trim() === nombreOId.toLowerCase().trim()
    );
    if (found) {
      setRemitente(found.nombre);
      if (found.telefono) setTelefonoRemitente(found.telefono);
    } else {
      setRemitente(nombreOId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingSub && subManifiesto && onUpdateSub) {
      const pagado = pagadoNum;
      const porPagar = porPagarNum;

      // 1. Destino: Resolución del Deudor y Modalidad Contable
      const esAgenciaDestino = tipoDeudorDestino === 'AGENCIA';
      const modalidadCobro: ModalidadCobroDestino | undefined = porPagar > 0 
        ? (esAgenciaDestino ? 'Agencia Recauda en Destino y Rinde a Empresa' : 'Cobro Directo Empresa / Cliente')
        : undefined;
      const tDeudorDestino: TipoDeudor | undefined = porPagar > 0 
        ? (esAgenciaDestino ? 'AGENCIA' : 'CLIENTE')
        : undefined;
      const agenciaResp = esAgenciaDestino ? (agenciaDestinoResponsable || sucursalDestino) : undefined;
      const idDeudor = porPagar > 0 
        ? (esAgenciaDestino ? (agenciaDestinoResponsable || sucursalDestino) : (destinatario || 'Cliente General'))
        : undefined;
      const nombreDeudor = porPagar > 0 
        ? (esAgenciaDestino ? `Agencia ${agenciaDestinoResponsable || sucursalDestino}` : (destinatario || 'Cliente General'))
        : undefined;

      // 2. Origen: Resolución del Flujo Contable
      const esAgenciaOrigen = tipoDeudorOrigen === 'AGENCIA';
      const metodoOrigenFinal: MetodoCobroOrigen | undefined = pagado > 0
        ? (esAgenciaOrigen ? 'Por Liquidar / Crédito Agencia' : metodoCobroOrigen)
        : undefined;
      const cuentaOrigenFinal: string | undefined = pagado > 0
        ? (esAgenciaOrigen ? (cuentaAfectadaOrigen || `Caja Agencia ${agenciaOrigenResponsable || 'Oruro'}`) : cuentaAfectadaOrigen)
        : undefined;
      const estadoLiqAgenciaFinal: EstadoLiquidacionAgencia | undefined = pagado > 0
        ? (esAgenciaOrigen ? estadoLiquidacionAgencia : 'Liquidado a Central')
        : undefined;

      onUpdateSub({
        ...subManifiesto,
        nroManifiesto: nroSub,
        sucursalDestino,
        fleteAsignadoBs: pagado + porPagar,
        pagadoOrigenBs: pagado,
        porPagarDestinoBs: porPagar,
        saldoInicialCobrarBs: porPagar,
        saldoPendienteClienteBs: Math.max(0, porPagar - (subManifiesto.cobrosRealizadosBs || 0)),
        destinatario: esAgenciaDestino ? `Agencia ${agenciaResp}` : destinatario,
        remitente: esAgenciaOrigen ? `Agencia ${agenciaOrigenResponsable}` : remitente,
        telefonoRemitente: esAgenciaOrigen ? undefined : telefonoRemitente,
        descripcionCarga,
        telefonoContacto: esAgenciaDestino ? undefined : telefonoContacto,
        direccionDestinatario: esAgenciaDestino ? undefined : direccionDestinatario,
        estadoLiquidacion,
        metodoCobroOrigen: metodoOrigenFinal,
        cuentaAfectadaOrigen: cuentaOrigenFinal,
        estadoLiquidacionAgencia: estadoLiqAgenciaFinal,
        modalidadCobroDestino: modalidadCobro,
        tipoDeudor: tDeudorDestino,
        idDeudor,
        nombreDeudor,
        agenciaDestinoResponsable: agenciaResp,
        estadoCobranzaDestino: porPagar > 0 
          ? (!esAgenciaDestino ? 'Pendiente de Pago Cliente' : 'Pendiente de Cobro y Liquidación por Agencia')
          : undefined
      });
    } else if (manifiestoOrigen && onUpdateOrigen) {
      onUpdateOrigen({
        ...manifiestoOrigen,
        nroManifiestoMIC: nroMIC,
        sucursalOrigen,
        fechaEmision,
        estadoManifiesto
      });
    }
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || (!manifiestoOrigen && !subManifiesto)) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera Ejecutiva */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                  {isEditingSub 
                    ? `Sub-Manifiesto / Encomienda • ${subManifiesto?.nroManifiesto || nroSub}` 
                    : `Manifiesto de Carga MIC • ${manifiestoOrigen?.nroManifiestoMIC || nroMIC}`}
                </h3>
                {isEditingSub && subManifiesto?.idViaje && (
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{subManifiesto.idViaje}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isEditingSub
                  ? 'Control dual simétrico de responsabilidades de flete en Origen y Destino'
                  : 'Edición oficial del manifiesto matriz y ruta troncal'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setPrintMode(!printMode)}
              className="bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-2 transition-colors min-h-[40px]"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">{printMode ? 'Formulario' : 'Vista de Impresión'}</span>
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODO IMPRESIÓN */}
        {printMode ? (
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
            <div className="bg-white text-slate-900 p-6 rounded-2xl font-sans text-xs space-y-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight">TranspoDrive Carga & Encomiendas</h2>
                  <p className="text-xs text-slate-500">Hoja Oficial de Despacho y Liquidación</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200">
                    {isEditingSub ? subManifiesto?.nroManifiesto : manifiestoOrigen?.nroManifiestoMIC}
                  </span>
                </div>
              </div>

              {isEditingSub && subManifiesto ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 block">Agencia Destino:</span>
                      <strong className="text-slate-900 text-sm">{subManifiesto.sucursalDestino}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">ID de Viaje:</span>
                      <strong className="text-blue-700 font-mono text-sm">{subManifiesto.idViaje || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Estado Encomienda:</span>
                      <strong className="text-slate-900">{subManifiesto.estadoLiquidacion}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Remitente:</span>
                      <strong className="text-slate-900">{subManifiesto.remitente || 'No especificado'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Destinatario:</span>
                      <strong className="text-slate-900">{subManifiesto.destinatario || 'Cliente General'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Teléfono Contacto:</span>
                      <span className="text-slate-900">{subManifiesto.telefonoContacto || 'S/N'}</span>
                    </div>
                    <div className="sm:col-span-3">
                      <span className="text-slate-500 block">Descripción Carga:</span>
                      <span className="text-slate-900">{subManifiesto.descripcionCarga || 'Sin detalle'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center border-y border-slate-200 py-3 bg-slate-50 rounded-xl">
                    <div>
                      <span className="text-slate-500 block text-xs">Flete Asignado</span>
                      <strong className="text-slate-900 text-base font-black tabular-nums">Bs {subManifiesto.fleteAsignadoBs.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Pagado en Origen</span>
                      <strong className="text-emerald-600 text-base font-black tabular-nums">Bs {subManifiesto.pagadoOrigenBs.toFixed(2)}</strong>
                      <span className="block text-[9px] font-semibold text-amber-700">Por Liquidar a Central (CxC)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Saldo por Cobrar</span>
                      <strong className="text-amber-600 text-base font-black tabular-nums">Bs {subManifiesto.saldoPendienteClienteBs.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Sucursal Origen:</span>
                    <strong className="text-slate-900">{manifiestoOrigen?.sucursalOrigen}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Viaje Troncal:</span>
                    <strong className="text-blue-700">{manifiestoOrigen?.idViajeAsignado}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fecha Emisión:</span>
                    <span>{manifiestoOrigen?.fechaEmision}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Flete Total MIC:</span>
                    <strong className="text-blue-700">Bs {manifiestoOrigen?.fleteTotalBs.toFixed(2)}</strong>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-[10px] text-slate-500">
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-bold text-slate-800">Despachador Origen</p>
                  <p>Firma y Sello</p>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-bold text-slate-800">Recepción Agencia / Destino</p>
                  <p>Firma y Sello</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 text-xs shadow-md shadow-blue-600/25 min-h-[44px]"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Documento / Guardar PDF</span>
              </button>
            </div>
          </div>
        ) : (
          /* FORMULARIO EJECUTIVO DE EDICIÓN */
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
            {isEditingSub ? (
              <>
                {/* 1. Datos Generales de la Encomienda */}
                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>1. Identificación del Documento y Ruta</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      ID Sub-Manifiesto: <strong className="font-mono text-slate-800">{subManifiesto?.idSubManifiesto}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Nro Sub-Manifiesto / Encomienda *
                      </label>
                      <input
                        type="text"
                        value={nroSub}
                        onChange={(e) => setNroSub(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Sucursal / Agencia de Destino Física *
                      </label>
                      <select
                        value={sucursalDestino}
                        onChange={(e) => {
                          setSucursalDestino(e.target.value);
                          if (tipoDeudorDestino === 'AGENCIA') {
                            setAgenciaDestinoResponsable(e.target.value);
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                        required
                      >
                        {catalogos.sucursales.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Estado de la Encomienda *
                      </label>
                      <select
                        value={estadoLiquidacion}
                        onChange={(e) => setEstadoLiquidacion(e.target.value as EstadoLiquidacionSub)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-blue-700 font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                        required
                      >
                        <option value="En Reparto">En Reparto</option>
                        <option value="Liquidado en Sucursal">Liquidado en Sucursal</option>
                        <option value="Liquidado">Liquidado</option>
                        <option value="Pendiente Parcial">Pendiente Parcial</option>
                        <option value="Por Cobrar">Por Cobrar</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                      Descripción de la Carga / Bultos
                    </label>
                    <textarea
                      rows={2}
                      value={descripcionCarga}
                      onChange={(e) => setDescripcionCarga(e.target.value)}
                      placeholder="Detalle de mercadería, cantidad de bultos o cajas..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* 2. Estructura Financiera del Flete */}
                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>2. Estructura y Balanza del Flete (Bs)</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Suma simétrica: Origen + Destino
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                      <label className="text-xs font-bold text-emerald-900 mb-1 block">
                        Pagado en Origen (Bs)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pagadoOrigenBs}
                        onChange={(e) => setPagadoOrigenBs(e.target.value)}
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 text-emerald-700 font-mono font-black text-sm focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                      />
                      <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                        Cobrado al momento del despacho • Por Liquidar a Central (CxC)
                      </span>
                    </div>

                    <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                      <label className="text-xs font-bold text-amber-900 mb-1 block">
                        Por Pagar en Destino (Bs) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={porPagarDestinoBs}
                        onChange={(e) => setPorPagarDestinoBs(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-amber-800 font-mono font-black text-sm focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                        required
                      />
                      <span className="text-[10px] text-amber-700 font-medium block mt-1">
                        Saldo a percibir en agencia destino
                      </span>
                    </div>

                    <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-blue-900 mb-1 block">
                          Flete Asignado Total (Bs)
                        </span>
                        <div className="font-mono font-black text-xl text-blue-700 tabular-nums">
                          Bs {fleteAsignadoCalculado.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <span className="text-[10px] text-blue-600 font-semibold block mt-1">
                        (Cálculo automático: Origen + Destino)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. LÓGICA DUAL EN ORIGEN (PAGADO EN ORIGEN) */}
                {pagadoNum > 0 && (
                  <div className="bg-emerald-50/50 p-5 rounded-2xl border-2 border-emerald-300 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-200">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                          O
                        </span>
                        <div>
                          <h4 className="text-xs font-black uppercase text-emerald-950 tracking-wide">
                            Gestión y Responsabilidad de Cobro en Origen (Bs {pagadoNum.toFixed(2)})
                          </h4>
                          <p className="text-[11px] text-emerald-800 font-medium">
                            Defina si el pago lo realizó el cliente directo o la agencia intermediaria
                          </p>
                        </div>
                      </div>

                      {/* Selector Dual Simétrico Origen */}
                      <div className="inline-flex rounded-xl p-1 bg-white border border-emerald-300 shadow-xs">
                        <button
                          type="button"
                          onClick={() => setTipoDeudorOrigen('CLIENTE')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            tipoDeudorOrigen === 'CLIENTE'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-emerald-900 hover:bg-emerald-50'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Cliente Directo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoDeudorOrigen('AGENCIA')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            tipoDeudorOrigen === 'AGENCIA'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-emerald-900 hover:bg-emerald-50'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Agencia Intermediaria</span>
                        </button>
                      </div>
                    </div>

                    {/* Campos condicionales Origen */}
                    {tipoDeudorOrigen === 'CLIENTE' ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        <div>
                          <label className="text-xs font-bold text-emerald-950 mb-1.5 block">
                            Cliente Remitente / Pagador *
                          </label>
                          <select
                            value={clientesDisponibles.find(c => c.nombre.toLowerCase().trim() === remitente.toLowerCase().trim())?.nombre || remitente}
                            onChange={(e) => handleClienteRemitenteSelect(e.target.value)}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                            required
                          >
                            <option value="">-- Seleccionar Cliente del Catálogo ({clientesDisponibles.length}) --</option>
                            {clientesDisponibles.map(c => (
                              <option key={c.idCliente || c.nombre} value={c.nombre}>{c.nombre}</option>
                            ))}
                            {remitente && !clientesDisponibles.some(c => c.nombre.toLowerCase().trim() === remitente.toLowerCase().trim()) && (
                              <option value={remitente}>{remitente}</option>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-emerald-950 mb-1.5 block">
                            Teléfono Remitente
                          </label>
                          <input
                            type="text"
                            value={telefonoRemitente}
                            onChange={(e) => setTelefonoRemitente(e.target.value)}
                            placeholder="Ej. 76543210"
                            className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-emerald-950 mb-1.5 block">
                            Método de Cobro en Origen *
                          </label>
                          <select
                            value={metodoCobroOrigen}
                            onChange={(e) => setMetodoCobroOrigen(e.target.value as MetodoCobroOrigen)}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                            required
                          >
                            <option value="Efectivo en Agencia">Efectivo en Agencia</option>
                            <option value="Transferencia / QR Origen">Transferencia / QR Origen</option>
                          </select>
                        </div>

                        <div className="md:col-span-3 bg-white p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            Cobro percibido directamente del cliente <strong>{remitente || 'Remitente'}</strong> y asentado en caja física de la empresa.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        <div>
                          <label className="text-xs font-bold text-emerald-950 mb-1.5 block">
                            Agencia / Sucursal Afectada en Origen *
                          </label>
                          <select
                            value={agenciaOrigenResponsable}
                            onChange={(e) => {
                              setAgenciaOrigenResponsable(e.target.value);
                              setCuentaAfectadaOrigen(`Caja Agencia ${e.target.value}`);
                            }}
                            className="w-full bg-white border border-emerald-400 rounded-xl px-3.5 py-2.5 text-emerald-950 font-black text-xs focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                            required
                          >
                            {catalogos.sucursales.map(s => (
                              <option key={s} value={s}>Agencia {s}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-emerald-950 mb-1.5 block">
                            Estado Liquidación de Agencia *
                          </label>
                          <select
                            value={estadoLiquidacionAgencia}
                            onChange={(e) => setEstadoLiquidacionAgencia(e.target.value as EstadoLiquidacionAgencia)}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                            required
                          >
                            <option value="Pendiente de Liquidación">Pendiente de Liquidación a Central</option>
                            <option value="Liquidado a Central">Liquidado a Central</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-emerald-950 mb-1.5 block">
                            Cuenta / Caja Afectada en Origen *
                          </label>
                          <select
                            value={cuentaAfectadaOrigen}
                            onChange={(e) => setCuentaAfectadaOrigen(e.target.value)}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                            required
                          >
                            <option value={`Caja Agencia ${agenciaOrigenResponsable}`}>Caja Agencia {agenciaOrigenResponsable}</option>
                            <option value={`CxC Agencia ${agenciaOrigenResponsable}`}>CxC Agencia {agenciaOrigenResponsable}</option>
                            {catalogos.cajasCuentas?.filter(c => !c.includes(agenciaOrigenResponsable)).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-3 bg-white p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>
                            El flete cobrado en origen es gestionado y retenido por la <strong>Agencia {agenciaOrigenResponsable}</strong>, sujeta a rendición de cuentas a caja central.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. LÓGICA DUAL EN DESTINO (POR PAGAR EN DESTINO) */}
                {porPagarNum > 0 && (
                  <div className="bg-amber-50/50 p-5 rounded-2xl border-2 border-amber-300 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black text-xs">
                          D
                        </span>
                        <div>
                          <h4 className="text-xs font-black uppercase text-amber-950 tracking-wide">
                            Responsabilidad de Saldo en Destino (Bs {porPagarNum.toFixed(2)})
                          </h4>
                          <p className="text-[11px] text-amber-800 font-medium">
                            Defina quién asume la deuda y la rendición de cuentas al chofer o propietario
                          </p>
                        </div>
                      </div>

                      {/* Selector Dual Simétrico Destino */}
                      <div className="inline-flex rounded-xl p-1 bg-white border border-amber-300 shadow-xs">
                        <button
                          type="button"
                          onClick={() => setTipoDeudorDestino('CLIENTE')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            tipoDeudorDestino === 'CLIENTE'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-amber-900 hover:bg-amber-50'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Cliente Directo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTipoDeudorDestino('AGENCIA');
                            if (!agenciaDestinoResponsable) {
                              setAgenciaDestinoResponsable(sucursalDestino);
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            tipoDeudorDestino === 'AGENCIA'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-amber-900 hover:bg-amber-50'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Agencia / Sucursal Intermediaria</span>
                        </button>
                      </div>
                    </div>

                    {/* Campos condicionales Destino */}
                    {tipoDeudorDestino === 'CLIENTE' ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        <div>
                          <label className="text-xs font-bold text-blue-950 mb-1.5 block">
                            Cliente Destinatario (Deudor Directo) *
                          </label>
                          <select
                            value={clientesDisponibles.find(c => c.nombre.toLowerCase().trim() === destinatario.toLowerCase().trim())?.nombre || destinatario}
                            onChange={(e) => handleClienteDestinoSelect(e.target.value)}
                            className="w-full bg-white border border-blue-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                            required
                          >
                            <option value="">-- Seleccionar Cliente ({clientesDisponibles.length}) --</option>
                            {clientesDisponibles.map(c => (
                              <option key={c.idCliente || c.nombre} value={c.nombre}>{c.nombre}</option>
                            ))}
                            {destinatario && !clientesDisponibles.some(c => c.nombre.toLowerCase().trim() === destinatario.toLowerCase().trim()) && (
                              <option value={destinatario}>{destinatario}</option>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-blue-950 mb-1.5 block">
                            Teléfono de Contacto
                          </label>
                          <input
                            type="text"
                            value={telefonoContacto}
                            onChange={(e) => setTelefonoContacto(e.target.value)}
                            placeholder="Ej. 71234567"
                            className="w-full bg-white border border-blue-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-blue-950 mb-1.5 block">
                            Dirección de Entrega
                          </label>
                          <input
                            type="text"
                            value={direccionDestinatario}
                            onChange={(e) => setDireccionDestinatario(e.target.value)}
                            placeholder="Calle, zona o referencia..."
                            className="w-full bg-white border border-blue-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                          />
                        </div>

                        <div className="md:col-span-3 bg-white p-3 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>
                            <strong>Cuenta por Cobrar (CxC):</strong> Se genera directamente a nombre del cliente <strong>{destinatario || 'Cliente Directo'}</strong>. La agencia receptora queda libre de pasivo contable.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="text-xs font-bold text-amber-950 mb-1.5 block">
                            Agencia / Sucursal Afectada (Responsable de Rendición) *
                          </label>
                          <select
                            value={agenciaDestinoResponsable || sucursalDestino}
                            onChange={(e) => setAgenciaDestinoResponsable(e.target.value)}
                            className="w-full bg-white border border-amber-400 rounded-xl px-3.5 py-2.5 text-amber-950 font-black text-xs focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                            required
                          >
                            {catalogos.sucursales.map(s => (
                              <option key={s} value={s}>Agencia {s} (Rinde cuentas al chofer/propietario)</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col justify-end">
                          <div className="p-3 bg-white rounded-xl border border-amber-300 text-xs text-amber-950 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-amber-700 shrink-0" />
                            <span>
                              <strong>Saldo por Cobrar en Destino:</strong> Se audita y rinde exclusivamente a través de la <strong>Agencia {agenciaDestinoResponsable || sucursalDestino}</strong>.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* EDICIÓN DE MANIFIESTO MATRIZ (MIC) */
              <div className="space-y-5">
                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Datos del Manifiesto Matriz (MIC)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Nro Manifiesto (MIC) *</label>
                      <input
                        type="text"
                        value={nroMIC}
                        onChange={(e) => setNroMIC(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 uppercase font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Sucursal Origen *</label>
                      <select
                        value={sucursalOrigen}
                        onChange={(e) => setSucursalOrigen(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      >
                        {catalogos.sucursales.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Fecha Emisión *</label>
                      <input
                        type="date"
                        value={fechaEmision}
                        onChange={(e) => setFechaEmision(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Estado Manifiesto *</label>
                      <select
                        value={estadoManifiesto}
                        onChange={(e) => setEstadoManifiesto(e.target.value as EstadoManifiesto)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-blue-700 font-bold text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      >
                        <option value="En Preparación">En Preparación</option>
                        <option value="Despachado">Despachado</option>
                        <option value="En Destino">En Destino</option>
                        <option value="Liquidado">Liquidado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cuadro de Confirmación de Eliminación Segura */}
            {showConfirmDelete && (
              <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2.5 text-rose-700 font-black text-sm">
                  <Trash2 className="w-5 h-5 shrink-0 text-rose-600" />
                  <span>
                    {isEditingSub 
                      ? `¿Eliminar sub-entrega ${nroSub}?` 
                      : `¿Eliminar Manifiesto MIC ${nroMIC} y toda su cascada?`}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-rose-200">
                  {isEditingSub
                    ? 'Esta acción eliminará el sub-manifiesto, sus movimientos y transacciones vinculadas, revirtiendo los cobros en arqueo de cajas y recalculando el manifiesto padre y el viaje.'
                    : 'Esta acción eliminará automáticamente todos sus sub-manifiestos de encomiendas (hijos), movimientos de destino, transacciones asociadas, revertirá los cobros registrados en Arqueo de Cajas y recalculará la utilidad del viaje. ¿Desea continuar?'}
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-4 py-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold min-h-[40px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingSub && subManifiesto && onDeleteSub) {
                        onDeleteSub(subManifiesto.idSubManifiesto);
                        onClose();
                      } else if (manifiestoOrigen && onDeleteOrigen) {
                        onDeleteOrigen(manifiestoOrigen.idManifiesto);
                        onClose();
                      }
                    }}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl font-black min-h-[40px] flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar Definitivamente</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pie de Acciones */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-200 sticky bottom-0 bg-white">
              {!showConfirmDelete ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Registro</span>
                </button>
              ) : <div />}

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs min-h-[44px] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md shadow-blue-600/25 min-h-[44px] transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
