import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  MapPin, 
  Truck, 
  Calendar, 
  ArrowRight, 
  Building2, 
  CheckCircle2, 
  DollarSign,
  Trash2,
  ChevronDown,
  ChevronUp,
  Percent,
  User,
  UserCheck,
  Phone,
  UserPlus,
  Flame,
  AlertCircle,
  Edit3,
  Printer,
  Save,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { Viaje, ManifiestoOrigen, ManifiestoDestino, Catalogos, Cliente, MetodoCobroOrigen, EstadoLiquidacionAgencia, ModalidadCobroDestino, EstadoCobranzaDestino, TipoDeudor } from '../types';
import { storage } from '../services/storageService';
import { INITIAL_CATALOGOS } from '../data/initialData';

interface DespachosOrigenViewProps {
  manifiestosOrigen: ManifiestoOrigen[];
  manifiestosDestino: ManifiestoDestino[];
  viajes: Viaje[];
  catalogos: Catalogos;
  selectedSucursal: string;
  onCrearDespacho: (origen: ManifiestoOrigen, destinos: ManifiestoDestino[]) => Promise<void>;
  onEditOrigen?: (man: ManifiestoOrigen) => void;
  onEditSub?: (sub: ManifiestoDestino) => void;
  onAddCliente?: (cliente: Cliente) => void;
  onLiquidarCobroOrigen?: (idSubManifiesto: string, cuentaCentral: string, fecha?: string, notas?: string) => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export const DespachosOrigenView: React.FC<DespachosOrigenViewProps> = ({
  manifiestosOrigen,
  manifiestosDestino,
  viajes,
  catalogos,
  selectedSucursal,
  onCrearDespacho,
  onEditOrigen,
  onEditSub,
  onAddCliente,
  onLiquidarCobroOrigen,
  showToast
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(manifiestosOrigen[0]?.idManifiesto || null);
  const [filtroCentroCosto, setFiltroCentroCosto] = useState<string>('Todos');
  const [filtroViajeAsignado, setFiltroViajeAsignado] = useState<string>('Todos');

  // Modal para registrar cliente rápido desde el formulario de despacho
  const [inlineClienteModal, setInlineClienteModal] = useState<{ open: boolean; subIndex: number; data: Cliente }>({
    open: false,
    subIndex: 0,
    data: { idCliente: '', nombre: '', telefono: '', direccion: '', ciudad: 'Tarija', nitCi: '', activo: true }
  });

  // Form State for new master dispatch
  const [nroMIC, setNroMIC] = useState<string>('');
  const [idViaje, setIdViaje] = useState<string>(viajes[0]?.idViaje || '');
  const [sucursalOrigen, setSucursalOrigen] = useState<string>(
    selectedSucursal !== 'Todas' ? selectedSucursal : catalogos.sucursales[0] || 'Oruro'
  );
  const [fechaEmision, setFechaEmision] = useState<string>(new Date().toISOString().split('T')[0]);

  // Lista unificada y garantizada de Clientes desde Catálogo, Storage y Base
  const clientesDisponibles = useMemo(() => {
    const listCat = catalogos?.clientes || [];
    const listStorage = storage.getClientes() || [];
    const listInitial = INITIAL_CATALOGOS.clientes || [];

    const map = new Map<string, Cliente>();

    // 1. Clientes base de configuración inicial
    listInitial.forEach((c: Cliente) => {
      if (c?.nombre?.trim()) map.set(c.nombre.toLowerCase().trim(), c);
    });

    // 2. Clientes persistidos en storage
    listStorage.forEach((c: Cliente) => {
      if (c?.nombre?.trim()) map.set(c.nombre.toLowerCase().trim(), c);
    });

    // 3. Clientes pasados por props de catálogo
    listCat.forEach((c: Cliente) => {
      if (c?.nombre?.trim()) map.set(c.nombre.toLowerCase().trim(), c);
    });

    // 4. Clientes en histórico de despachos
    manifiestosDestino.forEach((m, idx) => {
      if (m.destinatario && m.destinatario.trim()) {
        const key = m.destinatario.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, {
            idCliente: `CLI-HIST-${idx + 1}`,
            nombre: m.destinatario.trim(),
            telefono: m.telefonoContacto || '',
            direccion: m.direccionDestinatario || '',
            ciudad: m.sucursalDestino || 'Tarija',
            nitCi: '',
            activo: true
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [catalogos?.clientes, manifiestosDestino]);

  // Modal para liquidar cobro de origen a caja central
  const [liquidarModal, setLiquidarModal] = useState<{
    open: boolean;
    sub: ManifiestoDestino | null;
    cuentaCentral: string;
    fecha: string;
    notas: string;
  }>({
    open: false,
    sub: null,
    cuentaCentral: 'Caja Oficina Central',
    fecha: new Date().toISOString().split('T')[0],
    notas: ''
  });

  // Interfaz de cada entrega desglosada con bloques A (Origen) y B (Destino) independientes
  interface SubEntregaForm {
    sucursalDestino: string;
    pagadoOrigenBs: number;
    porPagarDestinoBs: number;
    fleteAsignadoBs: number;
    descripcionCarga: string;

    // BLOQUE A: PAGADO EN ORIGEN
    tipoResponsableOrigen: 'CLIENTE' | 'AGENCIA';
    clienteRemitente: string;
    agenciaOrigenAfectada: string;
    metodoCobroOrigen: MetodoCobroOrigen;
    cuentaAfectadaOrigen: string;
    estadoLiquidacionAgencia: EstadoLiquidacionAgencia;

    // BLOQUE B: POR PAGAR EN DESTINO
    tipoResponsableDestino: 'CLIENTE' | 'AGENCIA';
    clienteDestinatario: string;
    telefonoContacto: string;
    direccionDestinatario: string;
    agenciaDestinoResponsable: string;

    // Campos de compatibilidad histórica
    remitente: string;
    destinatario: string;
    tipoDeudor: TipoDeudor;
    modalidadCobroDestino: ModalidadCobroDestino;
  }

  const createInitialSubEntrega = (defaultDest?: string): SubEntregaForm => {
    const dest = defaultDest || catalogos.sucursales.find(s => s !== sucursalOrigen) || 'Tarija';
    return {
      sucursalDestino: dest,
      pagadoOrigenBs: 0,
      porPagarDestinoBs: 0,
      fleteAsignadoBs: 0,
      descripcionCarga: '',

      // BLOQUE A: ORIGEN
      tipoResponsableOrigen: 'CLIENTE',
      clienteRemitente: '',
      agenciaOrigenAfectada: sucursalOrigen,
      metodoCobroOrigen: 'Efectivo en Agencia',
      cuentaAfectadaOrigen: `Caja Agencia ${sucursalOrigen}`,
      estadoLiquidacionAgencia: 'Pendiente de Liquidación',

      // BLOQUE B: DESTINO
      tipoResponsableDestino: 'CLIENTE',
      clienteDestinatario: '',
      telefonoContacto: '',
      direccionDestinatario: '',
      agenciaDestinoResponsable: dest,

      // Compatibilidad
      remitente: '',
      destinatario: '',
      tipoDeudor: 'CLIENTE',
      modalidadCobroDestino: 'Cobro Directo Empresa / Cliente'
    };
  };

  const [subEntregas, setSubEntregas] = useState<SubEntregaForm[]>([
    createInitialSubEntrega()
  ]);

  const handleOpenNuevoDespacho = () => {
    setNroMIC('');
    const defaultDest = catalogos.sucursales.find(s => s !== sucursalOrigen) || 'Tarija';
    setSubEntregas([createInitialSubEntrega(defaultDest)]);
    setShowModal(true);
  };

  const handleAddSubEntrega = () => {
    const defaultDest = catalogos.sucursales.find(s => s !== sucursalOrigen) || 'Tarija';
    setSubEntregas([...subEntregas, createInitialSubEntrega(defaultDest)]);
  };

  const handleRemoveSubEntrega = (index: number) => {
    if (subEntregas.length <= 1) return;
    setSubEntregas(subEntregas.filter((_, idx) => idx !== index));
  };

  const handleSubChange = (index: number, field: keyof SubEntregaForm | string, value: any) => {
    const updated = [...subEntregas];
    (updated[index] as any)[field] = value;
    
    // Flete Asignado es la suma automática de Pagado en Origen + Por pagar Destino
    if (field === 'pagadoOrigenBs' || field === 'porPagarDestinoBs') {
      const pagado = parseFloat(field === 'pagadoOrigenBs' ? value : updated[index].pagadoOrigenBs) || 0;
      const porPagar = parseFloat(field === 'porPagarDestinoBs' ? value : updated[index].porPagarDestinoBs) || 0;
      updated[index].fleteAsignadoBs = pagado + porPagar;
    }

    // Sincronizaciones de Destino
    if (field === 'sucursalDestino') {
      if (updated[index].tipoResponsableDestino === 'AGENCIA' || !updated[index].agenciaDestinoResponsable) {
        updated[index].agenciaDestinoResponsable = value;
      }
    }

    if (field === 'tipoResponsableDestino') {
      if (value === 'AGENCIA') {
        updated[index].tipoDeudor = 'AGENCIA';
        updated[index].modalidadCobroDestino = 'Agencia Recauda en Destino y Rinde a Empresa';
        if (!updated[index].agenciaDestinoResponsable) {
          updated[index].agenciaDestinoResponsable = updated[index].sucursalDestino;
        }
        updated[index].destinatario = `Agencia ${updated[index].agenciaDestinoResponsable || updated[index].sucursalDestino}`;
      } else {
        updated[index].tipoDeudor = 'CLIENTE';
        updated[index].modalidadCobroDestino = 'Cobro Directo Empresa / Cliente';
        updated[index].destinatario = updated[index].clienteDestinatario || '';
      }
    }

    // Sincronizaciones de Origen
    if (field === 'tipoResponsableOrigen') {
      if (value === 'AGENCIA') {
        if (!updated[index].agenciaOrigenAfectada) {
          updated[index].agenciaOrigenAfectada = sucursalOrigen;
        }
        updated[index].remitente = `Agencia ${updated[index].agenciaOrigenAfectada || sucursalOrigen}`;
        updated[index].cuentaAfectadaOrigen = `Caja Agencia ${updated[index].agenciaOrigenAfectada || sucursalOrigen}`;
      } else {
        updated[index].remitente = updated[index].clienteRemitente || '';
      }
    }
    
    setSubEntregas(updated);
  };

  const handleClienteDestinoSelect = (index: number, clienteNombreOId: string) => {
    const updated = [...subEntregas];
    const foundClient = clientesDisponibles.find(
      c => c.nombre.toLowerCase().trim() === clienteNombreOId.toLowerCase().trim() ||
           c.idCliente.toLowerCase().trim() === clienteNombreOId.toLowerCase().trim()
    );
    const nombre = foundClient ? foundClient.nombre : clienteNombreOId;
    updated[index].clienteDestinatario = nombre;
    updated[index].destinatario = nombre;
    if (foundClient) {
      if (foundClient.telefono) updated[index].telefonoContacto = foundClient.telefono;
      if (foundClient.direccion) updated[index].direccionDestinatario = foundClient.direccion;
    }
    setSubEntregas(updated);
  };

  const handleClienteRemitenteSelect = (index: number, clienteNombreOId: string) => {
    const updated = [...subEntregas];
    const foundClient = clientesDisponibles.find(
      c => c.nombre.toLowerCase().trim() === clienteNombreOId.toLowerCase().trim() ||
           c.idCliente.toLowerCase().trim() === clienteNombreOId.toLowerCase().trim()
    );
    const nombre = foundClient ? foundClient.nombre : clienteNombreOId;
    updated[index].clienteRemitente = nombre;
    updated[index].remitente = nombre;
    setSubEntregas(updated);
  };

  // Cálculos en vivo del formulario modal
  const totalFleteCalculado = subEntregas.reduce((sum, s) => sum + (Number(s.fleteAsignadoBs) || 0), 0);
  const totalCobradoOrigenCalculado = subEntregas.reduce((sum, s) => sum + (Number(s.pagadoOrigenBs) || 0), 0);
  const totalSaldoCobrarCalculado = subEntregas.reduce((sum, s) => sum + (Number(s.porPagarDestinoBs) || 0), 0);
  const porcCobranzaCalculado = totalFleteCalculado > 0 ? ((totalCobradoOrigenCalculado / totalFleteCalculado) * 100).toFixed(1) : '0';

  const executeCrearDespacho = async (cerrarAlFinal: boolean) => {
    if (!nroMIC.trim()) {
      alert('Por favor ingrese el Nro de Manifiesto (MIC).');
      return;
    }

    // Validación según los bloques A y B de cada entrega
    for (let i = 0; i < subEntregas.length; i++) {
      const s = subEntregas[i];
      const porPagar = Number(s.porPagarDestinoBs) || 0;
      const pagadoOrigen = Number(s.pagadoOrigenBs) || 0;

      // Destino
      if (s.tipoResponsableDestino === 'CLIENTE') {
        const destCliente = s.clienteDestinatario || s.destinatario;
        if (porPagar > 0 && (!destCliente || !destCliente.trim())) {
          alert(`Por favor seleccione el Cliente Destinatario para la Entrega #${i + 1}.`);
          return;
        }
      } else {
        const agenciaFinal = s.agenciaDestinoResponsable || s.sucursalDestino;
        if (!agenciaFinal || !agenciaFinal.trim()) {
          alert(`Por favor seleccione la Agencia / Sucursal de Destino para la Entrega #${i + 1}.`);
          return;
        }
      }

      // Origen
      if (s.tipoResponsableOrigen === 'AGENCIA') {
        const agenciaOrigenFinal = s.agenciaOrigenAfectada || sucursalOrigen;
        if (!agenciaOrigenFinal || !agenciaOrigenFinal.trim()) {
          alert(`Por favor seleccione la Agencia / Sucursal de Origen para la Entrega #${i + 1}.`);
          return;
        }
      }
    }

    const idManifiesto = `MAN-${sucursalOrigen.substring(0, 2).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    
    const nuevoOrigen: ManifiestoOrigen = {
      idManifiesto,
      nroManifiestoMIC: nroMIC.toUpperCase(),
      idViajeAsignado: idViaje,
      sucursalOrigen,
      fechaEmision,
      estadoManifiesto: 'Despachado',
      fleteTotalBs: totalFleteCalculado,
      cobradoOrigenBs: totalCobradoOrigenCalculado,
      saldoCobrarDestinosBs: totalSaldoCobrarCalculado,
      porcCobranza: parseFloat(porcCobranzaCalculado)
    };

    const nuevosSub: ManifiestoDestino[] = subEntregas.map((s, idx) => {
      const subId = `SUB-${idManifiesto.replace('MAN-', '')}-${s.sucursalDestino.substring(0, 3).toUpperCase()}-${idx + 1}`;
      const pagadoOrigen = Number(s.pagadoOrigenBs) || 0;
      const porPagar = Number(s.porPagarDestinoBs) || 0;
      const fleteTotal = pagadoOrigen + porPagar;

      // Destino: Deudor y modalidad
      const esModalidadAgencia = s.tipoResponsableDestino === 'AGENCIA';
      const modalidadCobro: ModalidadCobroDestino | undefined = porPagar > 0 
        ? (esModalidadAgencia ? 'Agencia Recauda en Destino y Rinde a Empresa' : 'Cobro Directo Empresa / Cliente')
        : undefined;
      const tipoDeudor: TipoDeudor | undefined = porPagar > 0 
        ? (esModalidadAgencia ? 'AGENCIA' : 'CLIENTE')
        : undefined;
      const agenciaResp = esModalidadAgencia ? (s.agenciaDestinoResponsable || s.sucursalDestino) : undefined;
      const destinatarioFinal = esModalidadAgencia 
        ? `Agencia ${agenciaResp}` 
        : (s.clienteDestinatario || s.destinatario || 'Cliente General Destino');
      const idDeudor = porPagar > 0 
        ? (esModalidadAgencia ? agenciaResp : destinatarioFinal)
        : undefined;
      const nombreDeudor = porPagar > 0 
        ? (esModalidadAgencia ? `Agencia ${agenciaResp}` : destinatarioFinal)
        : undefined;

      // Origen: Remitente y cuenta
      const esAgenciaOrigen = s.tipoResponsableOrigen === 'AGENCIA';
      const agenciaOrigenFinal = esAgenciaOrigen ? (s.agenciaOrigenAfectada || sucursalOrigen) : undefined;
      const remitenteFinal = esAgenciaOrigen 
        ? `Agencia ${agenciaOrigenFinal}` 
        : (s.clienteRemitente || s.remitente || `Cliente Origen ${sucursalOrigen}`);
      const metodoOrigenFinal: MetodoCobroOrigen | undefined = pagadoOrigen > 0
        ? (esAgenciaOrigen ? 'Por Liquidar / Crédito Agencia' : s.metodoCobroOrigen)
        : undefined;
      const cuentaOrigenFinal: string | undefined = pagadoOrigen > 0
        ? (esAgenciaOrigen ? (s.cuentaAfectadaOrigen || `Caja Agencia ${agenciaOrigenFinal}`) : s.cuentaAfectadaOrigen)
        : undefined;
      const estadoLiqAgenciaFinal: EstadoLiquidacionAgencia | undefined = pagadoOrigen > 0
        ? (esAgenciaOrigen ? s.estadoLiquidacionAgencia : 'Liquidado a Central')
        : undefined;

      return {
        idSubManifiesto: subId,
        idManifiestoPadre: idManifiesto,
        idViaje: idViaje,
        nroManifiesto: `${nroMIC.toUpperCase()}-${s.sucursalDestino.substring(0, 3).toUpperCase()}`,
        sucursalDestino: s.sucursalDestino,
        fleteAsignadoBs: fleteTotal,
        pagadoOrigenBs: pagadoOrigen,
        porPagarDestinoBs: porPagar,
        saldoInicialCobrarBs: porPagar,
        cobrosRealizadosBs: 0,
        ingresosDeliveryOtrosBs: 0,
        gastosComisionesBs: 0,
        recaudacionNetaCajaBs: 0,
        saldoPendienteClienteBs: esModalidadAgencia ? 0 : porPagar,
        saldoPendienteAgenciaBs: esModalidadAgencia ? porPagar : (esAgenciaOrigen && estadoLiqAgenciaFinal !== 'Liquidado a Central' ? pagadoOrigen : 0),
        tipoResponsableDestino: esModalidadAgencia ? 'AGENCIA' : 'CLIENTE',
        tipoResponsableOrigen: esAgenciaOrigen ? 'AGENCIA' : 'CLIENTE',
        responsableDestinoTipo: esModalidadAgencia ? 'agencia' : 'cliente',
        responsableOrigenTipo: esAgenciaOrigen ? 'agencia' : 'cliente',
        estadoLiquidacion: 'En Reparto',
        destinatario: destinatarioFinal,
        remitente: remitenteFinal,
        descripcionCarga: s.descripcionCarga || 'Mercadería General',
        telefonoContacto: esModalidadAgencia ? '' : (s.telefonoContacto || ''),
        direccionDestinatario: s.direccionDestinatario || '',
        metodoCobroOrigen: metodoOrigenFinal,
        cuentaAfectadaOrigen: cuentaOrigenFinal,
        estadoLiquidacionAgencia: estadoLiqAgenciaFinal,
        modalidadCobroDestino: modalidadCobro,
        tipoDeudor,
        idDeudor,
        nombreDeudor,
        agenciaDestinoResponsable: agenciaResp,
        estadoCobranzaDestino: porPagar > 0 
          ? (!esModalidadAgencia 
              ? 'Pendiente de Pago Cliente' 
              : 'Pendiente de Cobro y Liquidación por Agencia') 
          : undefined
      };
    });

    await onCrearDespacho(nuevoOrigen, nuevosSub);

    if (showToast) {
      showToast(`Despacho ${nuevoOrigen.nroManifiestoMIC} guardado exitosamente.`, 'success');
    }

    const defaultDest = catalogos.sucursales.find(s => s !== sucursalOrigen) || 'Tarija';
    setNroMIC('');
    setSubEntregas([createInitialSubEntrega(defaultDest)]);

    if (cerrarAlFinal) {
      setShowModal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCrearDespacho(true);
  };

  const filteredOrigenes = manifiestosOrigen.filter(m => {
    if (selectedSucursal !== 'Todas' && m.sucursalOrigen !== selectedSucursal) return false;
    if (filtroViajeAsignado !== 'Todos' && m.idViajeAsignado !== filtroViajeAsignado) return false;
    if (filtroCentroCosto !== 'Todos') {
      const viajeAsoc = viajes.find(v => v.idViaje === m.idViajeAsignado);
      if (!viajeAsoc || (viajeAsoc.placaCamion !== filtroCentroCosto && (viajeAsoc as any).centroCosto !== filtroCentroCosto)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-50 text-[#1d4ed8] rounded-xl border border-blue-100">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Despachos en Origen (Manifiestos Maestros MIC)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registro de manifiestos internacionales/interdepartamentales de carga y desglose por sucursales de entrega.
          </p>
        </div>

        <button
          onClick={handleOpenNuevoDespacho}
          className="flex items-center justify-center space-x-1.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Despacho MIC</span>
        </button>
      </div>

      {/* Barra de Filtros: Centro de Costo (Camión) y Viaje Asignado */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 flex-wrap">
          {/* Filtro Centro de Costo (Camión) */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 min-h-[42px] focus-within:ring-2 focus-within:ring-[#1A73E8] focus-within:border-transparent transition-all">
            <Truck className="w-4 h-4 text-[#1A73E8] shrink-0" />
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
              Centro de Costo (Camión):
            </label>
            <select
              value={filtroCentroCosto}
              onChange={(e) => setFiltroCentroCosto(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="Todos">Todos los Camiones</option>
              {catalogos.camiones.map(c => (
                <option key={c.placa} value={c.placa}>
                  {c.placa} - {c.modelo} ({c.choferHabitual})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Viaje Asignado */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 min-h-[42px] focus-within:ring-2 focus-within:ring-[#1A73E8] focus-within:border-transparent transition-all">
            <MapPin className="w-4 h-4 text-[#1A73E8] shrink-0" />
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
              Viaje Asignado:
            </label>
            <select
              value={filtroViajeAsignado}
              onChange={(e) => setFiltroViajeAsignado(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="Todos">Todos los Viajes</option>
              {viajes.map(v => (
                <option key={v.idViaje} value={v.idViaje}>
                  {v.idViaje} ({v.placaCamion} - {v.estadoViaje})
                </option>
              ))}
            </select>
          </div>

          {(filtroCentroCosto !== 'Todos' || filtroViajeAsignado !== 'Todos') && (
            <button
              type="button"
              onClick={() => {
                setFiltroCentroCosto('Todos');
                setFiltroViajeAsignado('Todos');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-all border border-rose-200 flex items-center gap-1 self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 self-end md:self-auto">
          <span>Mostrando:</span>
          <span className="font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
            {filteredOrigenes.length} manifiesto(s) MIC
          </span>
        </div>
      </div>

      {/* List of Master Manifests */}
      <div className="space-y-4">
        {filteredOrigenes.map((manifiesto) => {
          const isExpanded = expandedId === manifiesto.idManifiesto;
          const subManifiestos = manifiestosDestino.filter(s => s.idManifiestoPadre === manifiesto.idManifiesto);
          const viajeAsociado = viajes.find(v => v.idViaje === manifiesto.idViajeAsignado);

          return (
            <div
              key={manifiesto.idManifiesto}
              className="bg-white border border-[#e2e8f0] rounded-[18px] shadow-sm overflow-hidden transition-all"
            >
              {/* Manifest Card Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : manifiesto.idManifiesto)}
                className="p-4 sm:p-5 bg-white hover:bg-slate-50 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-base sm:text-lg text-slate-900 font-mono">
                      {manifiesto.nroManifiestoMIC}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1d4ed8] border border-blue-200">
                      {manifiesto.estadoManifiesto}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {manifiesto.idManifiesto}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#1d4ed8]" />
                      Origen: <strong className="text-slate-800">{manifiesto.sucursalOrigen}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-[#1d4ed8]" />
                      Camión: <strong className="text-slate-800">{viajeAsociado?.placaCamion || 'Asignado'}</strong> ({manifiesto.idViajeAsignado})
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {manifiesto.fechaEmision}
                    </span>
                  </div>
                </div>

                {/* Financial Overview */}
                <div className="flex items-center justify-between lg:justify-end space-x-6 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#e2e8f0]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Flete Total MIC</span>
                    <span className="font-black text-sm text-slate-900">
                      Bs {manifiesto.fleteTotalBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Cobrado Origen</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-[#16a34a]">
                        Bs {manifiesto.cobradoOrigenBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                      {manifiesto.cobradoOrigenBs > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          subManifiestos.length > 0 && subManifiestos.every(s => s.estadoLiquidacionAgencia === 'Liquidado a Central')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`} title="Para el propietario, el cobro en origen en sucursal es CxC Agencia hasta que la sucursal liquide a Central">
                          {subManifiestos.length > 0 && subManifiestos.every(s => s.estadoLiquidacionAgencia === 'Liquidado a Central')
                            ? 'Liquidado a Central'
                            : 'Por Liquidar a Central (CxC)'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Por Cobrar Destino</span>
                    <span className="font-black text-sm text-[#dc2626]">
                      Bs {manifiesto.saldoCobrarDestinosBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="hidden sm:block">
                    <span className="text-[10px] text-slate-500 block">% Cobranza</span>
                    <span className="font-bold text-xs text-[#1d4ed8]">
                      {manifiesto.porcCobranza}%
                    </span>
                  </div>

                  <div className="text-slate-500 flex items-center gap-2">
                    {onEditOrigen && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditOrigen(manifiesto);
                        }}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors flex items-center gap-1.5 shadow-xs"
                        title="Editar / Imprimir Manifiesto MIC"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar / Imprimir</span>
                      </button>
                    )}
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-[#1d4ed8]" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Breakdown by Destination Agencies */}
              {isExpanded && (
                <div className="p-4 sm:p-5 bg-[#f8fafc] border-t border-[#e2e8f0] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#1d4ed8]">
                      Sub-Manifiestos Desglosados por Agencia de Destino ({subManifiestos.length})
                    </h4>
                    <span className="text-xs text-slate-500">Entregas programadas para esta carga</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {subManifiestos.map((sub) => (
                      <div
                        key={sub.idSubManifiesto}
                        className="bg-white border border-[#e2e8f0] rounded-[18px] p-3.5 space-y-2 text-xs shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-[#1d4ed8]" />
                            {sub.sucursalDestino}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-[#1d4ed8] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1" title="ID de Viaje Asignado">
                              <Truck className="w-3 h-3 text-[#1d4ed8]" />
                              <span>{sub.idViaje || manifiesto.idViajeAsignado}</span>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sub.estadoLiquidacion === 'Liquidado en Sucursal'
                                ? 'bg-emerald-50 text-[#16a34a] border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {sub.estadoLiquidacion}
                            </span>
                            {onEditSub && (
                              <button
                                type="button"
                                onClick={() => onEditSub(sub)}
                                className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 rounded-lg border border-blue-200 transition-colors shadow-xs"
                                title="Editar Datos de Encomienda"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-[#f4f6fa] px-2.5 py-1 rounded-lg">
                          <span className="font-mono text-slate-800 font-semibold">{sub.nroManifiesto}</span>
                          <span className="text-[10px] text-[#1d4ed8] font-bold">Viaje: {sub.idViaje || manifiesto.idViajeAsignado}</span>
                        </div>

                        <p className="text-slate-800 font-semibold truncate">Destinatario: {sub.destinatario}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2">Carga: {sub.descripcionCarga}</p>

                        <div className="pt-2 border-t border-[#e2e8f0] grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Flete Asignado:</span>
                            <span className="font-bold text-slate-800">Bs {sub.fleteAsignadoBs.toLocaleString('es-BO')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Pagado Origen:</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-[#16a34a]">Bs {sub.pagadoOrigenBs.toLocaleString('es-BO')}</span>
                              {sub.pagadoOrigenBs > 0 && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  sub.estadoLiquidacionAgencia === 'Liquidado a Central'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`} title="El cobro en origen es CxC Agencia pendiente de liquidación. No es ingreso en caja hasta liquidar a Central.">
                                  {sub.estadoLiquidacionAgencia === 'Liquidado a Central' ? 'Liquidado a Central' : 'Por Liquidar a Central (CxC)'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Por Cobrar Destino:</span>
                            <span className="font-bold text-[#dc2626]">Bs {sub.saldoInicialCobrarBs.toLocaleString('es-BO')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">
                              {sub.tipoResponsableDestino === 'AGENCIA' ? 'Pendiente Agencia:' : 'Pendiente Cliente:'}
                            </span>
                            <span className={`font-bold ${
                              (sub.tipoResponsableDestino === 'AGENCIA' ? (sub.saldoPendienteAgenciaBs !== undefined ? sub.saldoPendienteAgenciaBs : sub.saldoPendienteClienteBs) : sub.saldoPendienteClienteBs) === 0 
                                ? 'text-[#16a34a]' 
                                : 'text-[#dc2626]'
                            }`}>
                              Bs {(sub.tipoResponsableDestino === 'AGENCIA' ? (sub.saldoPendienteAgenciaBs !== undefined ? sub.saldoPendienteAgenciaBs : sub.saldoPendienteClienteBs) : sub.saldoPendienteClienteBs).toLocaleString('es-BO')}
                            </span>
                          </div>
                        </div>

                        {Number(sub.cobrosRealizadosBs) > 0 && (
                          <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium flex items-center justify-between">
                            <span>Cobrado en Destino (Abonos):</span>
                            <strong className="font-mono font-bold">Bs {Number(sub.cobrosRealizadosBs).toLocaleString('es-BO')}</strong>
                          </div>
                        )}

                        {/* Traza y Acción de Liquidación de Cobro en Origen */}
                        {Number(sub.pagadoOrigenBs) > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] gap-2">
                            <div className="truncate">
                              <span className="text-slate-400 block text-[9px] uppercase font-bold">Liquidación Agencia:</span>
                              <span className={`inline-flex items-center gap-1 font-bold ${
                                sub.estadoLiquidacionAgencia === 'Liquidado a Central'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}>
                                {sub.estadoLiquidacionAgencia || 'Pendiente de Liquidación'}
                              </span>
                            </div>

                            {sub.estadoLiquidacionAgencia !== 'Liquidado a Central' && onLiquidarCobroOrigen && (
                              <button
                                type="button"
                                onClick={() => setLiquidarModal({
                                  open: true,
                                  sub,
                                  cuentaCentral: 'Caja Oficina Central',
                                  fecha: new Date().toISOString().split('T')[0],
                                  notas: ''
                                })}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors shrink-0 flex items-center gap-1"
                                title="Liquidar Cobro de Origen a Caja Central"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Liquidar a Central</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal para Crear Despacho MIC con Desglose Múltiple */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-5xl xl:max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            
            {/* Header del Modal Ejecutivo */}
            <div className="flex items-center justify-between px-6 md:px-8 py-5 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-xs shrink-0">
                  <FileText className="w-6 h-6 text-blue-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                    Crear Despacho en Origen (Manifiesto MIC Multi-Destino)
                  </h3>
                  <p className="text-xs text-blue-100 font-medium mt-0.5">
                    Emisión y registro maestro de manifiesto de carga internacional / interdepartamental con control dual de deudores
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="w-9 h-9 rounded-full flex items-center justify-center text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 text-xs overflow-y-auto flex-1">
              
              {/* Sección 1: Datos Maestros del Manifiesto MIC (Grid Simétrico 4 Columnas) */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>1. Datos Maestros del Manifiesto de Carga (MIC)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Campos obligatorios marcados con *
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                      Nro Manifiesto (MIC) *
                    </label>
                    <input
                      type="text"
                      value={nroMIC}
                      onChange={(e) => setNroMIC(e.target.value)}
                      placeholder="MIC-DTA-5550"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 uppercase font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none min-h-[44px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                      Viaje / Camión Asignado *
                    </label>
                    <select
                      value={idViaje}
                      onChange={(e) => setIdViaje(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none min-h-[44px]"
                      required
                    >
                      {viajes.map(v => (
                        <option key={v.idViaje} value={v.idViaje}>
                          {v.idViaje} ({v.placaCamion || 'Camión'}) - {v.choferAsignado || 'Chofer'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                      Sucursal Origen *
                    </label>
                    <select
                      value={sucursalOrigen}
                      onChange={(e) => setSucursalOrigen(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none min-h-[44px]"
                    >
                      {catalogos.sucursales.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                      Fecha Emisión *
                    </label>
                    <input
                      type="date"
                      value={fechaEmision}
                      onChange={(e) => setFechaEmision(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none min-h-[44px]"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Desglose de Cargas por Sucursales de Entrega */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>2. Desglose de Carga y Destinos ({subEntregas.length} {subEntregas.length === 1 ? 'entrega' : 'entregas'})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure cada destino del flete, especificando montos y si la gestión contable corresponde al Cliente o a la Agencia.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSubEntrega}
                    className="text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-black px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Agregar Otra Sucursal de Entrega</span>
                  </button>
                </div>

                <div className="space-y-6">
                  {subEntregas.map((sub, idx) => (
                    <div
                      key={idx}
                      className="p-6 md:p-7 bg-white border-2 border-slate-200 rounded-3xl space-y-5 shadow-xs transition-all hover:border-slate-300"
                    >
                      {/* Cabecera de la Entrega & Datos Físicos */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="bg-blue-600 text-white font-black text-xs px-3 py-1 rounded-lg">
                            Entrega #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            Destino Físico: <strong className="text-blue-900">{sub.sucursalDestino}</strong>
                          </span>
                        </div>

                        {subEntregas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubEntrega(idx)}
                            className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Eliminar esta entrega"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Quitar Entrega</span>
                          </button>
                        )}
                      </div>

                      {/* Parámetros Generales de la Entrega */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            <span>Sucursal Destino de Llegada *</span>
                          </label>
                          <select
                            value={sub.sucursalDestino}
                            onChange={(e) => handleSubChange(idx, 'sucursalDestino', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 min-h-[42px]"
                          >
                            {catalogos.sucursales.filter(s => s !== sucursalOrigen).map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                            Descripción de Carga / Encomienda:
                          </label>
                          <input
                            type="text"
                            value={sub.descripcionCarga}
                            onChange={(e) => handleSubChange(idx, 'descripcionCarga', e.target.value)}
                            placeholder="Detalle de mercadería, cantidad de bultos o cajas..."
                            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 text-xs min-h-[42px] focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* BLOQUE A: PAGADO EN ORIGEN (Flete cobrado en la sucursal de salida) */}
                      <div className="bg-emerald-50/50 border-2 border-emerald-300 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                              A
                            </span>
                            <div>
                              <h5 className="font-black text-xs uppercase tracking-wider text-emerald-950">
                                BLOQUE A: PAGADO EN ORIGEN (Flete Cobrado en Sucursal de Salida)
                              </h5>
                              <p className="text-[11px] text-emerald-800">
                                Defina quién efectuó o retuvo el pago en la agencia de origen
                              </p>
                            </div>
                          </div>

                          {/* Selector de Responsable en Origen: [ Cliente Directo ] o [ Agencia / Sucursal Intermediaria ] */}
                          <div className="inline-flex rounded-xl p-1 bg-white border border-emerald-300 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleSubChange(idx, 'tipoResponsableOrigen', 'CLIENTE')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                sub.tipoResponsableOrigen === 'CLIENTE'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-emerald-900 hover:bg-emerald-50'
                              }`}
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>Cliente Directo</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSubChange(idx, 'tipoResponsableOrigen', 'AGENCIA')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                sub.tipoResponsableOrigen === 'AGENCIA'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-emerald-900 hover:bg-emerald-50'
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Agencia / Sucursal Intermediaria</span>
                            </button>
                          </div>
                        </div>

                        {/* Importe y Campos Condicionales de Origen */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-bold uppercase tracking-wide text-emerald-900 mb-1.5 block">
                              Importe Pagado en Origen (Bs.)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={sub.pagadoOrigenBs}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleSubChange(idx, 'pagadoOrigenBs', e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0))}
                              className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 text-xs text-emerald-700 font-mono font-bold tabular-nums focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                              placeholder="0.00"
                            />
                          </div>

                          {sub.tipoResponsableOrigen === 'CLIENTE' ? (
                            /* Condicional Cliente en Origen */
                            <>
                              <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                                  Cliente Remitente / Pagador *
                                </label>
                                <select
                                  value={clientesDisponibles.find(c => c.nombre.toLowerCase().trim() === (sub.clienteRemitente || sub.remitente).toLowerCase().trim())?.nombre || sub.clienteRemitente || sub.remitente}
                                  onChange={(e) => handleClienteRemitenteSelect(idx, e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs min-h-[44px] focus:ring-2 focus:ring-emerald-500"
                                >
                                  <option value="">-- Seleccionar Cliente del Catálogo ({clientesDisponibles.length}) --</option>
                                  {clientesDisponibles.map(c => (
                                    <option key={c.idCliente} value={c.nombre}>{c.nombre}</option>
                                  ))}
                                  {(sub.clienteRemitente || sub.remitente) && !clientesDisponibles.some(c => c.nombre.toLowerCase().trim() === (sub.clienteRemitente || sub.remitente).toLowerCase().trim()) && (
                                    <option value={sub.clienteRemitente || sub.remitente}>{sub.clienteRemitente || sub.remitente}</option>
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                                  Método de Cobro en Origen *
                                </label>
                                <select
                                  value={sub.metodoCobroOrigen}
                                  onChange={(e) => handleSubChange(idx, 'metodoCobroOrigen', e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                                >
                                  <option value="Efectivo en Agencia">Efectivo en Agencia</option>
                                  <option value="Transferencia / QR Origen">Transferencia / QR Origen</option>
                                </select>
                              </div>
                            </>
                          ) : (
                            /* Condicional Agencia en Origen */
                            <>
                              <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-emerald-950 mb-1.5 block">
                                  Agencia / Sucursal Afectada *
                                </label>
                                <select
                                  value={sub.agenciaOrigenAfectada || sucursalOrigen}
                                  onChange={(e) => {
                                    handleSubChange(idx, 'agenciaOrigenAfectada', e.target.value);
                                    handleSubChange(idx, 'cuentaAfectadaOrigen', `Caja Agencia ${e.target.value}`);
                                  }}
                                  className="w-full bg-white border border-emerald-400 rounded-xl px-3.5 py-2.5 text-xs text-emerald-950 font-black min-h-[44px] focus:ring-2 focus:ring-emerald-500"
                                >
                                  {catalogos.sucursales.map(s => (
                                    <option key={s} value={s}>Agencia {s}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                                  Estado Liquidación Agencia *
                                </label>
                                <select
                                  value={sub.estadoLiquidacionAgencia}
                                  onChange={(e) => handleSubChange(idx, 'estadoLiquidacionAgencia', e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                                >
                                  <option value="Pendiente de Liquidación">Pendiente de Liquidación a Central</option>
                                  <option value="Liquidado a Central">Liquidado a Central</option>
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* BLOQUE B: POR PAGAR EN DESTINO (Flete a cobrar en el punto de llegada) */}
                      <div className="bg-amber-50/40 border-2 border-amber-300 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                              B
                            </span>
                            <div>
                              <h5 className="font-black text-xs uppercase tracking-wider text-amber-950">
                                BLOQUE B: POR PAGAR EN DESTINO (Flete a Cobrar en Punto de Llegada)
                              </h5>
                              <p className="text-[11px] text-amber-800">
                                Defina quién asume la deuda y la rendición de cuentas al chofer o propietario
                              </p>
                            </div>
                          </div>

                          {/* Selector de Responsable en Destino: [ Cliente Destinatario ] o [ Agencia / Sucursal Destino ] */}
                          <div className="inline-flex rounded-xl p-1 bg-white border border-amber-300 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleSubChange(idx, 'tipoResponsableDestino', 'CLIENTE')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                sub.tipoResponsableDestino === 'CLIENTE'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-amber-950 hover:bg-amber-50'
                              }`}
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>Cliente Destinatario</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSubChange(idx, 'tipoResponsableDestino', 'AGENCIA')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                sub.tipoResponsableDestino === 'AGENCIA'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-amber-950 hover:bg-amber-50'
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Agencia / Sucursal Destino</span>
                            </button>
                          </div>
                        </div>

                        {/* Importe Por Pagar Destino */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wide text-rose-800 mb-1.5 block">
                            Importe Por Pagar Destino (Bs.) * (Genera saldo por cobrar)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={sub.porPagarDestinoBs}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleSubChange(idx, 'porPagarDestinoBs', e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0))}
                            className="w-full sm:w-1/3 bg-white border border-rose-300 rounded-xl px-3.5 py-2.5 text-xs text-rose-700 font-mono font-black tabular-nums focus:ring-2 focus:ring-rose-500 min-h-[44px]"
                            placeholder="0.00"
                            required
                          />
                        </div>

                        {/* Campos Condicionales de Destino */}
                        {sub.tipoResponsableDestino === 'CLIENTE' ? (
                          /* FLUJO CLIENTE DESTINATARIO: Muestra Cliente, oculta completamente Agencia */
                          <div className="bg-white/80 border border-blue-200 rounded-xl p-4.5 space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-blue-100 flex-wrap gap-2">
                              <span className="font-black text-xs uppercase tracking-wider text-blue-900 flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" />
                                <span>Datos del Cliente Destinatario (Deudor Contable de CxC Directa) *</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setInlineClienteModal({
                                  open: true,
                                  subIndex: idx,
                                  data: { idCliente: '', nombre: '', telefono: '', direccion: '', ciudad: sub.sucursalDestino, nitCi: '', activo: true }
                                })}
                                className="text-xs bg-white hover:bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg border border-blue-300 flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                                <span>+ Registrar Nuevo Cliente</span>
                              </button>
                            </div>

                            {/* Selector Principal de Cliente (Sin sugerencias rápidas ni chips flotantes) */}
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                                Seleccionar Cliente del Catálogo *
                              </label>
                              <select
                                value={clientesDisponibles.find(c => c.nombre.toLowerCase().trim() === (sub.clienteDestinatario || sub.destinatario).toLowerCase().trim())?.nombre || sub.clienteDestinatario || sub.destinatario}
                                onChange={(e) => handleClienteDestinoSelect(idx, e.target.value)}
                                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-600 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs min-h-[44px]"
                                required
                              >
                                <option value="">-- Seleccionar Nombre de Cliente ({clientesDisponibles.length} disponibles) --</option>
                                {clientesDisponibles.map((c) => (
                                  <option key={c.idCliente} value={c.nombre}>
                                    {c.nombre} {c.telefono ? `(Tel: ${c.telefono})` : ''}
                                  </option>
                                ))}
                                {(sub.clienteDestinatario || sub.destinatario) && !clientesDisponibles.some(c => c.nombre.toLowerCase().trim() === (sub.clienteDestinatario || sub.destinatario).toLowerCase().trim()) && (
                                  <option value={sub.clienteDestinatario || sub.destinatario}>
                                    {sub.clienteDestinatario || sub.destinatario}
                                  </option>
                                )}
                              </select>
                            </div>

                            {/* Teléfono y Dirección */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Teléfono de Contacto:</span>
                                </label>
                                <input
                                  type="text"
                                  value={sub.telefonoContacto}
                                  onChange={(e) => handleSubChange(idx, 'telefonoContacto', e.target.value)}
                                  placeholder="Ej: 71234567 / 4-6644000"
                                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-xs font-bold min-h-[40px] focus:ring-2 focus:ring-blue-600"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Dirección / Contacto de Entrega:</span>
                                </label>
                                <input
                                  type="text"
                                  value={sub.direccionDestinatario}
                                  onChange={(e) => handleSubChange(idx, 'direccionDestinatario', e.target.value)}
                                  placeholder="Zona, calle, mercado o local..."
                                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-xs min-h-[40px] focus:ring-2 focus:ring-blue-600"
                                />
                              </div>
                            </div>

                            {/* Ficha Informativa CxC Cliente */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-950 font-medium leading-relaxed">
                              ✓ <strong>Cuenta por Cobrar (CxC):</strong> Se genera directamente a nombre de <strong>{sub.clienteDestinatario || sub.destinatario || 'Cliente Destinatario'}</strong> por Bs. {Number(sub.porPagarDestinoBs || 0).toFixed(2)}. La sucursal o chofer en destino entregará la carga contra cobro de dicho saldo.
                            </div>
                          </div>
                        ) : (
                          /* FLUJO SUCURSAL / AGENCIA DESTINO: Muestra Agencia, oculta completamente campos de cliente */
                          <div className="bg-white/80 border border-amber-300 rounded-xl p-4.5 space-y-4">
                            <div className="pb-2 border-b border-amber-200">
                              <span className="font-black text-xs uppercase tracking-wider text-amber-950 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-amber-700" />
                                <span>Agencia de Destino Encargada del Cobro y Rendición *</span>
                              </span>
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                La agencia de destino asume la recaudación contable y la rendición de cuentas al chofer o propietario.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-amber-950 mb-1.5 flex items-center justify-between">
                                  <span>Agencia / Sucursal Destino *</span>
                                  <span className="text-[10px] text-amber-700 font-bold">Obligatorio</span>
                                </label>
                                <select
                                  value={sub.agenciaDestinoResponsable || sub.sucursalDestino}
                                  onChange={(e) => {
                                    handleSubChange(idx, 'agenciaDestinoResponsable', e.target.value);
                                    handleSubChange(idx, 'destinatario', `Agencia ${e.target.value}`);
                                  }}
                                  className="w-full bg-white border border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-amber-950 font-black focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                                  required
                                >
                                  {catalogos.sucursales.map(s => (
                                    <option key={s} value={s}>Agencia {s}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                                  Referencia u Observaciones de la Entrega en Agencia:
                                </label>
                                <input
                                  type="text"
                                  value={sub.direccionDestinatario}
                                  onChange={(e) => handleSubChange(idx, 'direccionDestinatario', e.target.value)}
                                  placeholder="Ej: Depósito central agencia, mercadería consolidada para reparto local..."
                                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs min-h-[44px] focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                            </div>

                            {/* Ficha Informativa CxC Agencia */}
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-950 font-medium leading-relaxed">
                              📌 <strong>Cuenta por Cobrar / Rendición Agencia:</strong> Se genera a nombre de la <strong>Agencia {sub.agenciaDestinoResponsable || sub.sucursalDestino}</strong> por Bs. {Number(sub.porPagarDestinoBs || 0).toFixed(2)}. Esta obligación queda registrada para auditoría de liquidación al chofer o propietario, desacoplada de clientes particulares.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resumen al pie de la entrega */}
                      <div className="flex flex-wrap items-center justify-between text-xs bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 gap-2">
                        <span className="text-slate-600">
                          Cobrado en Origen: <strong className="text-emerald-700 font-mono font-bold tabular-nums">Bs {Number(sub.pagadoOrigenBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
                        </span>
                        <span className="text-slate-600">
                          Por Pagar en Destino ({sub.sucursalDestino}): <strong className="text-rose-600 font-mono font-bold tabular-nums">Bs {Number(sub.porPagarDestinoBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
                        </span>
                        <span className="text-slate-900">
                          Flete Total Entrega: <strong className="text-blue-700 font-mono font-black text-sm tabular-nums">Bs {Number(sub.fleteAsignadoBs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección 3: Resumen Ejecutivo de Totales en Vivo (4 KPI Cards) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Flete Total MIC</span>
                    <span className="font-mono font-black text-base sm:text-lg text-slate-900 tabular-nums">
                      Bs {totalFleteCalculado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-800 uppercase font-bold block">Cobrado en Origen</span>
                      <span className="font-mono font-black text-base sm:text-lg text-emerald-700 tabular-nums">
                        Bs {totalCobradoOrigenCalculado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100/90 px-1 py-0.5 rounded border border-amber-300 block mt-1">
                      Por Liquidar a Central (CxC)
                    </span>
                  </div>
                  <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 shadow-2xs">
                    <span className="text-[10px] text-rose-800 uppercase font-bold block">Por Cobrar Destino</span>
                    <span className="font-mono font-black text-base sm:text-lg text-rose-700 tabular-nums">
                      Bs {totalSaldoCobrarCalculado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 shadow-2xs">
                    <span className="text-[10px] text-blue-800 uppercase font-bold block">% Cobranza Origen</span>
                    <span className="font-mono font-black text-base sm:text-lg text-blue-700 tabular-nums">
                      {porcCobranzaCalculado}%
                    </span>
                  </div>
                </div>

                {/* Nota Conceptual Obligatoria */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Concepto Contable del Flete:</strong> Flete Total = Cobrado en Origen + Por Cobrar en Destino. El flete cobrado en origen por la sucursal (Bs. {totalCobradoOrigenCalculado.toFixed(2)}) es una <strong>Cuenta por Cobrar a la Agencia de Origen (Por Liquidar a Central - CxC)</strong>. No constituye ingreso en caja efectiva ni para el propietario ni para el chofer hasta su formal liquidación a Central.
                  </span>
                </div>
              </div>

              {/* Sección 4: Pie de Acciones Estándar [💾 Guardar y Continuar] y [✅ Guardar y Salir] */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors min-h-[44px] cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5">
                  {/* Botón: Guardar y Continuar */}
                  <button
                    type="button"
                    onClick={() => executeCrearDespacho(false)}
                    className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs px-5 py-2.5 rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-2 min-h-[44px] active:scale-95 shadow-xs cursor-pointer"
                    title="Emitir el manifiesto y mantener el formulario abierto para ingresar otro despacho"
                  >
                    <Save className="w-4 h-4 text-slate-700" />
                    <span>💾 Guardar y Continuar</span>
                  </button>

                  {/* Botón: Guardar y Salir */}
                  <button
                    type="button"
                    onClick={() => executeCrearDespacho(true)}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 min-h-[44px] active:scale-95 cursor-pointer"
                    title="Emitir el manifiesto, guardar en base de datos y cerrar la ventana"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>✅ Guardar y Salir</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INLINE REGISTRO RÁPIDO DE CLIENTE */}
      {inlineClienteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-[#e2e8f0] w-full max-w-md rounded-[18px] p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-blue-50 text-[#1d4ed8] rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Registrar Nuevo Cliente en la Tabla Maestra
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInlineClienteModal({ ...inlineClienteModal, open: false })}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inlineClienteModal.data.nombre.trim()) return;

                const nuevoCliente: Cliente = {
                  ...inlineClienteModal.data,
                  idCliente: inlineClienteModal.data.idCliente || `CLI-${Date.now().toString().slice(-4)}`,
                  nombre: inlineClienteModal.data.nombre.trim(),
                  telefono: inlineClienteModal.data.telefono.trim(),
                  direccion: inlineClienteModal.data.direccion.trim(),
                  activo: true
                };

                if (onAddCliente) {
                  onAddCliente(nuevoCliente);
                }
                handleClienteDestinoSelect(inlineClienteModal.subIndex, nuevoCliente.nombre);
                setInlineClienteModal({ ...inlineClienteModal, open: false });
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Nombre Completo / Razón Social *
                </label>
                <input
                  type="text"
                  value={inlineClienteModal.data.nombre}
                  onChange={(e) => setInlineClienteModal({
                    ...inlineClienteModal,
                    data: { ...inlineClienteModal.data, nombre: e.target.value }
                  })}
                  placeholder="Ej. Distribuidora Santa Cruz S.R.L."
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                    Teléfono Contacto / Celular *
                  </label>
                  <input
                    type="text"
                    value={inlineClienteModal.data.telefono}
                    onChange={(e) => setInlineClienteModal({
                      ...inlineClienteModal,
                      data: { ...inlineClienteModal.data, telefono: e.target.value }
                    })}
                    placeholder="Ej. 72984512"
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-[#1d4ed8] min-h-[44px]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                    NIT o C.I. (Opcional)
                  </label>
                  <input
                    type="text"
                    value={inlineClienteModal.data.nitCi || ''}
                    onChange={(e) => setInlineClienteModal({
                      ...inlineClienteModal,
                      data: { ...inlineClienteModal.data, nitCi: e.target.value }
                    })}
                    placeholder="Ej. 1029384019"
                    className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 font-mono min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Dirección de Entrega Completa *
                </label>
                <textarea
                  rows={2}
                  value={inlineClienteModal.data.direccion}
                  onChange={(e) => setInlineClienteModal({
                    ...inlineClienteModal,
                    data: { ...inlineClienteModal.data, direccion: e.target.value }
                  })}
                  placeholder="Ej. Av. Panamericana #120, Mercado Campesino"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Ciudad / Agencia Habitual
                </label>
                <select
                  value={inlineClienteModal.data.ciudad || 'Tarija'}
                  onChange={(e) => setInlineClienteModal({
                    ...inlineClienteModal,
                    data: { ...inlineClienteModal.data, ciudad: e.target.value }
                  })}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 min-h-[44px]"
                >
                  {catalogos.sucursales.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setInlineClienteModal({ ...inlineClienteModal, open: false })}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-blue-800 text-white font-bold px-5 py-2 rounded-xl shadow-md min-h-[44px] active:scale-95 transition-all"
                >
                  Guardar y Asignar a la Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal para Liquidar Cobro de Origen a Caja Central */}
      {liquidarModal.open && liquidarModal.sub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-[#e2e8f0] w-full max-w-md rounded-[18px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 bg-emerald-50 border-b border-emerald-100">
              <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Liquidar Cobro de Origen a Caja Central
              </h3>
              <button 
                type="button"
                onClick={() => setLiquidarModal({ ...liquidarModal, open: false, sub: null })} 
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sub-Manifiesto:</span>
                  <span className="font-mono font-bold text-slate-800">{liquidarModal.sub.nroManifiesto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destinatario:</span>
                  <span className="font-bold text-slate-800">{liquidarModal.sub.destinatario}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cuenta de Origen (CxC):</span>
                  <span className="font-semibold text-slate-700">{liquidarModal.sub.cuentaAfectadaOrigen || 'Caja Agencia Origen'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Monto a Rendir / Liquidar:</span>
                  <span className="font-black text-emerald-600 text-sm">
                    Bs {Number(liquidarModal.sub.pagadoOrigenBs).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Cuenta / Caja Destino (Central / Bancos) *
                </label>
                <select
                  value={liquidarModal.cuentaCentral}
                  onChange={(e) => setLiquidarModal({ ...liquidarModal, cuentaCentral: e.target.value })}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 font-bold min-h-[44px]"
                  required
                >
                  <option value="Caja Oficina Central">Caja Oficina Central</option>
                  <option value="Banco Unión Central">Banco Unión Central</option>
                  <option value="Banco Central QR">Banco Central QR</option>
                  {catalogos.cajasCuentas?.filter(c => c !== 'Caja Oficina Central' && c !== 'Banco Unión Central' && c !== 'Banco Central QR').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Fecha de Rendición / Depósito *
                </label>
                <input
                  type="date"
                  value={liquidarModal.fecha}
                  onChange={(e) => setLiquidarModal({ ...liquidarModal, fecha: e.target.value })}
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 font-mono min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">
                  Comprobante / Notas de Liquidación
                </label>
                <input
                  type="text"
                  value={liquidarModal.notas}
                  onChange={(e) => setLiquidarModal({ ...liquidarModal, notas: e.target.value })}
                  placeholder="Ej. Depósito boleta #48291 rendido por agencia"
                  className="w-full bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-3 py-2 text-slate-800 min-h-[44px]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setLiquidarModal({ ...liquidarModal, open: false, sub: null })}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (onLiquidarCobroOrigen && liquidarModal.sub) {
                      await onLiquidarCobroOrigen(
                        liquidarModal.sub.idSubManifiesto,
                        liquidarModal.cuentaCentral,
                        liquidarModal.fecha,
                        liquidarModal.notas
                      );
                      setLiquidarModal({ ...liquidarModal, open: false, sub: null });
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl shadow-md min-h-[44px] active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Abonar a Caja Central</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
