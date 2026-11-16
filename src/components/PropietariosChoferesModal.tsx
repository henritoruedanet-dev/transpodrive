import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Save,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Truck,
  Building2,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  User,
  Receipt,
  Camera,
  Layers,
  Sparkles,
  ArrowRightLeft,
  AlertCircle,
  Wallet,
  ShieldCheck
} from 'lucide-react';
import {
  Viaje,
  Catalogos,
  TransaccionDiaria,
  GastoRutaCamion
} from '../types';
import { storage } from '../services/storageService';
import { compressImageFile } from '../utils/imageCompressor';
import { formatBs } from '../utils/formatUtils';

interface PropietariosChoferesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rolInicial: 'Propietario' | 'Chofer';
  pestañaInicial?: 'Gasto' | 'Ingreso' | 'Transferencia';
  viajeIdInicial?: string;
  viajes: Viaje[];
  catalogos: Catalogos;
  onTransaccionGuardada: (tx: TransaccionDiaria, continuar: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
  conceptoInicial?: string;
  detalleInicial?: string;
  importeInicial?: string;
  clienteInicial?: string;
  nroManifiestoInicial?: string;
}

const CONCEPTOS_GASTO_DEFAULT = [
  'Diésel / Combustible',
  'Peajes y Pesajes',
  'Estibadores y Cuadrilla',
  'Mecánica y Reparación Taller',
  'Llantería y Vulcanizado',
  'Mantenimiento Preventivo / Correctivo',
  'Viáticos y Alimentación Chofer',
  'Hospedaje de Ruta',
  'Aceites y Lubricantes',
  'Repuestos y Autopartes',
  'Permisos, Balanza y SENASAG',
  'Comisiones y Encomiendas',
  'Gastos de Agencia',
  'Otros Gastos Operativos'
];

const CONCEPTOS_INGRESO_DEFAULT = [
  'Cobro Flete Origen',
  'Cobro Flete Destino',
  'Anticipo Viáticos Central',
  'Cobranza Delivery Destino',
  'Aporte Capital Propietario',
  'Ingreso Extraordinario / Flete Adicional'
];

export const PropietariosChoferesModal: React.FC<PropietariosChoferesModalProps> = ({
  isOpen,
  onClose,
  rolInicial,
  pestañaInicial = 'Gasto',
  viajeIdInicial,
  viajes = [],
  catalogos,
  onTransaccionGuardada,
  showToast,
  conceptoInicial,
  detalleInicial,
  importeInicial,
  clienteInicial,
  nroManifiestoInicial
}) => {
  // Rol activo del modal
  const [rolModal, setRolModal] = useState<'Propietario' | 'Chofer'>(rolInicial);

  // Pestañas Superiores: 'Gasto' | 'Ingreso' | 'Transferencia'
  const [tabTipo, setTabTipo] = useState<'Gasto' | 'Ingreso' | 'Transferencia'>(pestañaInicial);

  // Lista unificada de cajas y cuentas
  const listaCajas = useMemo(() => {
    const defaultCajas = [
      'Efectivo Chofer Ruta',
      'Efectivo Caja Central',
      'Banco Unión',
      'QR',
      'Caja Sucursal Tarija',
      'Caja Sucursal Oruro'
    ];
    const cat = catalogos.cajasCuentas || [];
    return Array.from(new Set([...defaultCajas, ...cat]));
  }, [catalogos.cajasCuentas]);

  // Contexto activo de Viaje / Camión / Chofer
  const [selectedViajeId, setSelectedViajeId] = useState<string>(() => {
    if (viajeIdInicial) return viajeIdInicial;
    const viajeEnCurso = viajes.find(v => v.estadoViaje === 'En Tránsito' || v.estadoViaje === 'En Reparto') || viajes[0];
    return viajeEnCurso?.idViaje || '';
  });
  const [placaCamion, setPlacaCamion] = useState<string>(() => {
    const vId = viajeIdInicial || (viajes.find(v => v.estadoViaje === 'En Tránsito' || v.estadoViaje === 'En Reparto') || viajes[0])?.idViaje;
    const v = viajes.find(item => item.idViaje === vId);
    return v?.placaCamion || '';
  });
  const [choferNombre, setChoferNombre] = useState<string>(() => {
    const vId = viajeIdInicial || (viajes.find(v => v.estadoViaje === 'En Tránsito' || v.estadoViaje === 'En Reparto') || viajes[0])?.idViaje;
    const v = viajes.find(item => item.idViaje === vId);
    return v?.choferAsignado || '';
  });

  useEffect(() => {
    if (viajeIdInicial) {
      setSelectedViajeId(viajeIdInicial);
      const v = viajes.find(item => item.idViaje === viajeIdInicial);
      if (v) {
        setPlacaCamion(v.placaCamion || '');
        setChoferNombre(v.choferAsignado || '');
      }
    } else if (!selectedViajeId && viajes.length > 0) {
      const viajeEnCurso = viajes.find(v => v.estadoViaje === 'En Tránsito' || v.estadoViaje === 'En Reparto') || viajes[0];
      if (viajeEnCurso) {
        setSelectedViajeId(viajeEnCurso.idViaje);
        setPlacaCamion(viajeEnCurso.placaCamion || '');
        setChoferNombre(viajeEnCurso.choferAsignado || '');
      }
    }
  }, [viajes, selectedViajeId, viajeIdInicial]);

  const handleViajeChange = (idViaje: string) => {
    setSelectedViajeId(idViaje);
    const v = viajes.find(item => item.idViaje === idViaje);
    if (v) {
      setPlacaCamion(v.placaCamion || '');
      setChoferNombre(v.choferAsignado || '');
    }
  };

  // Conceptos dinámicos
  const [conceptosGasto, setConceptosGasto] = useState<string[]>(() => {
    const fromCat = catalogos.categoriasGastoRuta || [];
    return Array.from(new Set([...CONCEPTOS_GASTO_DEFAULT, ...fromCat]));
  });

  const [conceptosIngreso, setConceptosIngreso] = useState<string[]>(() => {
    const fromCat = catalogos.categoriasIngresoDestino || [];
    return Array.from(new Set([...CONCEPTOS_INGRESO_DEFAULT, ...fromCat]));
  });

  const [isCreandoNuevoConcepto, setIsCreandoNuevoConcepto] = useState(false);
  const [nuevoConceptoTexto, setNuevoConceptoTexto] = useState('');

  // =========================================================================
  // 1. CAMPOS ACTIVOS EN LA PESTAÑA "GASTOS":
  // =========================================================================
  const [fechaGasto, setFechaGasto] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [conceptoGasto, setConceptoGasto] = useState<string>(CONCEPTOS_GASTO_DEFAULT[0]);
  const [importeGasto, setImporteGasto] = useState<string>('');
  const [detalleGasto, setDetalleGasto] = useState<string>('');
  const [idProveedor, setIdProveedor] = useState<string>('');
  const [nombreProveedor, setNombreProveedor] = useState<string>('');
  const [busquedaProveedor, setBusquedaProveedor] = useState<string>('');
  const [mostrarDropdownProveedor, setMostrarDropdownProveedor] = useState<boolean>(false);
  
  // CONDICIÓN Y TÉRMINOS DE PAGO EN GASTOS
  const [modalidadPagoGasto, setModalidadPagoGasto] = useState<'Contado' | 'Credito' | 'Anticipo_Saldo'>('Contado');
  const [metodoPagoGasto, setMetodoPagoGasto] = useState<string>(() => {
    return rolInicial === 'Chofer' ? 'Efectivo Chofer Ruta' : 'Efectivo Caja Central';
  });
  const [montoAnticipoGasto, setMontoAnticipoGasto] = useState<string>('');
  const [cuentaAnticipoGasto, setCuentaAnticipoGasto] = useState<string>(() => {
    return rolInicial === 'Chofer' ? 'Efectivo Chofer Ruta' : 'Efectivo Caja Central';
  });

  // =========================================================================
  // 2. CAMPOS ACTIVOS EN LA PESTAÑA "INGRESO / ANTICIPO":
  // =========================================================================
  const [fechaIngreso, setFechaIngreso] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [conceptoIngreso, setConceptoIngreso] = useState<string>(() => conceptoInicial || CONCEPTOS_INGRESO_DEFAULT[0]);
  const [detalleIngreso, setDetalleIngreso] = useState<string>(() => detalleInicial || '');
  const [importeIngreso, setImporteIngreso] = useState<string>(() => importeInicial || '');
  const [idCliente, setIdCliente] = useState<string>('');
  const [nombreCliente, setNombreCliente] = useState<string>(() => clienteInicial || '');
  const [busquedaCliente, setBusquedaCliente] = useState<string>(() => clienteInicial || '');
  const [mostrarDropdownCliente, setMostrarDropdownCliente] = useState<boolean>(false);
  const [nroManifiestoDoc, setNroManifiestoDoc] = useState<string>(() => nroManifiestoInicial || '');

  // Efecto para actualizar campos si cambian las props iniciales
  useEffect(() => {
    if (isOpen) {
      if (rolInicial) setRolModal(rolInicial);
      if (pestañaInicial) setTabTipo(pestañaInicial);
      if (conceptoInicial) setConceptoIngreso(conceptoInicial);
      if (detalleInicial) setDetalleIngreso(detalleInicial);
      if (importeInicial) setImporteIngreso(importeInicial);
      if (clienteInicial) {
        setNombreCliente(clienteInicial);
        setBusquedaCliente(clienteInicial);
      }
      if (nroManifiestoInicial) {
        setNroManifiestoDoc(nroManifiestoInicial);
      }
    }
  }, [isOpen, rolInicial, pestañaInicial, conceptoInicial, detalleInicial, importeInicial, clienteInicial, nroManifiestoInicial]);

  // CONDICIÓN Y TÉRMINOS DE PAGO EN INGRESOS
  const [modalidadPagoIngreso, setModalidadPagoIngreso] = useState<'Contado' | 'Credito' | 'Anticipo_Saldo'>('Contado');
  const [metodoOrigenFondo, setMetodoOrigenFondo] = useState<string>('Efectivo Caja Central');
  const [montoAnticipoIngreso, setMontoAnticipoIngreso] = useState<string>('');
  const [cuentaAnticipoIngreso, setCuentaAnticipoIngreso] = useState<string>('Efectivo Caja Central');

  // =========================================================================
  // 3. CAMPOS ACTIVOS EN LA PESTAÑA "TRANSFERENCIA":
  // =========================================================================
  const [fechaTransferencia, setFechaTransferencia] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [cuentaOrigenTransferencia, setCuentaOrigenTransferencia] = useState<string>('Efectivo Caja Central');
  const [cuentaDestinoTransferencia, setCuentaDestinoTransferencia] = useState<string>('Efectivo Chofer Ruta');
  const [importeTransferencia, setImporteTransferencia] = useState<string>('');
  const [detalleTransferencia, setDetalleTransferencia] = useState<string>('');
  const [nroComprobanteTransferencia, setNroComprobanteTransferencia] = useState<string>('');

  // Foto comprobante digitalizado
  const [comprobanteFoto, setComprobanteFoto] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Historial de sesión continua
  const [sesionHistorial, setSesionHistorial] = useState<Array<{
    id: string;
    tipo: 'Gasto' | 'Ingreso' | 'Traspaso';
    concepto: string;
    detalle: string;
    monto: number;
    hora: string;
    rol: string;
  }>>([]);

  // Estados de carga y referencias
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const conceptoSelectRef = useRef<HTMLSelectElement>(null);
  const importeInputRef = useRef<HTMLInputElement>(null);
  const detalleInputRef = useRef<HTMLInputElement>(null);

  // Cálculos dinámicos de saldo pendiente en Gasto Mixto
  const importeGastoNum = parseFloat(importeGasto) || 0;
  const anticipoGastoNum = parseFloat(montoAnticipoGasto) || 0;
  const saldoPendienteGasto = Math.max(0, parseFloat((importeGastoNum - anticipoGastoNum).toFixed(2)));

  // Cálculos dinámicos de saldo pendiente en Ingreso Mixto
  const importeIngresoNum = parseFloat(importeIngreso) || 0;
  const anticipoIngresoNum = parseFloat(montoAnticipoIngreso) || 0;
  const saldoPendienteIngreso = Math.max(0, parseFloat((importeIngresoNum - anticipoIngresoNum).toFixed(2)));

  // Proveedores filtrados para autocompletado
  const proveedoresFiltrados = useMemo(() => {
    const list = catalogos.proveedores || [];
    if (!busquedaProveedor.trim()) return list.slice(0, 8);
    const q = busquedaProveedor.toLowerCase();
    return list.filter(p => (p.nombre || '').toLowerCase().includes(q) || (p.idProveedor || '').toLowerCase().includes(q)).slice(0, 8);
  }, [catalogos.proveedores, busquedaProveedor]);

  // Clientes filtrados para autocompletado
  const clientesFiltrados = useMemo(() => {
    const list = catalogos.clientes || [];
    if (!busquedaCliente.trim()) return list.slice(0, 8);
    const q = busquedaCliente.toLowerCase();
    return list.filter(c => (c.nombre || '').toLowerCase().includes(q) || (c.idCliente || '').toLowerCase().includes(q)).slice(0, 8);
  }, [catalogos.clientes, busquedaCliente]);

  // Manejo de Fotos y Comprobantes
  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoFoto(true);
    try {
      const compressed = await compressImageFile(file, 1024, 0.7);
      setComprobanteFoto(compressed);
      showToast('Comprobante digitalizado con éxito.', 'info');
    } catch (err) {
      showToast('No se pudo procesar la imagen.', 'warning');
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Crear nuevo concepto dinámico
  const handleCrearNuevoConcepto = () => {
    if (!nuevoConceptoTexto.trim()) return;
    const nuevo = nuevoConceptoTexto.trim();
    if (tabTipo === 'Gasto') {
      if (!conceptosGasto.includes(nuevo)) {
        setConceptosGasto(prev => [nuevo, ...prev]);
      }
      setConceptoGasto(nuevo);
    } else if (tabTipo === 'Ingreso') {
      if (!conceptosIngreso.includes(nuevo)) {
        setConceptosIngreso(prev => [nuevo, ...prev]);
      }
      setConceptoIngreso(nuevo);
    }
    setNuevoConceptoTexto('');
    setIsCreandoNuevoConcepto(false);
    showToast(`Concepto "${nuevo}" añadido a la lista.`, 'info');
  };

  // =========================================================================
  // GUARDADO Y EJECUCIÓN TRANSACCIONAL
  // =========================================================================
  const handleSave = async (continuar: boolean) => {
    if (isSubmitting) return;

    // -----------------------------------------------------------------------
    // CASO A: FLUJO DE TRANSFERENCIA ENTRE CUENTAS
    // -----------------------------------------------------------------------
    if (tabTipo === 'Transferencia') {
      const monto = parseFloat(importeTransferencia);
      if (isNaN(monto) || monto <= 0) {
        showToast('Ingrese un monto válido mayor a 0 Bs. para la transferencia.', 'warning');
        return;
      }
      if (!cuentaOrigenTransferencia || !cuentaDestinoTransferencia) {
        showToast('Seleccione la cuenta de origen y la de destino.', 'warning');
        return;
      }
      if (cuentaOrigenTransferencia === cuentaDestinoTransferencia) {
        showToast('La cuenta origen y destino deben ser diferentes.', 'warning');
        return;
      }

      setIsSubmitting(true);
      try {
        const detalleFinal = detalleTransferencia.trim() || `Transferencia de ${cuentaOrigenTransferencia} a ${cuentaDestinoTransferencia}`;

        const nuevaTransferencia: Omit<TransaccionDiaria, 'idTransaccion' | 'sincronizado'> = {
          tipo: 'Traspaso',
          fecha: fechaTransferencia,
          categoria: 'Transferencia entre Cuentas',
          montoBs: monto,
          metodoPago: cuentaOrigenTransferencia,
          cuentaDestino: cuentaDestinoTransferencia,
          notas: detalleFinal,
          idViaje: selectedViajeId || undefined,
          placaCamion: placaCamion || undefined,
          comprobanteFotoUrl: comprobanteFoto || undefined,
          nroFacturaBoleta: nroComprobanteTransferencia.trim() || undefined,
          rolUsuario: rolModal,
          origenRegistro: rolModal === 'Chofer' ? 'Reporte_Chofer' : 'Reporte_Propietario',
          modalidadPago: 'Contado'
        };

        const res = await storage.addTransaccion(nuevaTransferencia, comprobanteFoto || undefined);

        const itemHistorial = {
          id: res.id || `TX-${Date.now()}`,
          tipo: 'Traspaso' as const,
          concepto: `Transferencia: ${cuentaOrigenTransferencia} ➔ ${cuentaDestinoTransferencia}`,
          detalle: detalleFinal,
          monto,
          hora: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
          rol: rolModal
        };
        setSesionHistorial(prev => [itemHistorial, ...prev]);

        const txCompleta: TransaccionDiaria = {
          ...nuevaTransferencia,
          idTransaccion: res.id || `TX-${Date.now()}`,
          sincronizado: !res.queued
        };

        onTransaccionGuardada(txCompleta, continuar);

        if (continuar) {
          showToast(`✅ Transferencia de Bs. ${monto.toFixed(2)} registrada exitosamente.`, 'success');
          setImporteTransferencia('');
          setDetalleTransferencia('');
          setNroComprobanteTransferencia('');
          setComprobanteFoto(null);
        } else {
          showToast('Transferencia guardada exitosamente.', 'success');
          onClose();
        }
      } catch (err: any) {
        showToast(`Error al transferir: ${err.message || 'Error'}`, 'warning');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // -----------------------------------------------------------------------
    // CASO B: FLUJOS DE GASTO O INGRESO CON CONDICIÓN DE PAGO
    // -----------------------------------------------------------------------
    const esGasto = tabTipo === 'Gasto';
    const monto = parseFloat(esGasto ? importeGasto : importeIngreso);

    if (isNaN(monto) || monto <= 0) {
      showToast('Por favor ingrese un importe válido mayor a 0 Bs.', 'warning');
      if (importeInputRef.current) importeInputRef.current.focus();
      return;
    }

    const concepto = esGasto ? conceptoGasto : conceptoIngreso;
    const detalle = esGasto ? detalleGasto.trim() : detalleIngreso.trim();

    if (!concepto) {
      showToast('Seleccione un concepto o categoría.', 'warning');
      if (conceptoSelectRef.current) conceptoSelectRef.current.focus();
      return;
    }

    // Resolución de Condición de Pago y método contable
    const modalidad = esGasto ? modalidadPagoGasto : modalidadPagoIngreso;
    let metodoFinal = esGasto ? metodoPagoGasto : metodoOrigenFondo;
    let anticipoFinal: number | undefined = undefined;
    let saldoFinal: number | undefined = undefined;
    let cuentaAnticipoFinal: string | undefined = undefined;

    if (modalidad === 'Contado') {
      metodoFinal = (metodoFinal === 'Por Pagar' || metodoFinal === 'Por Cobrar') 
        ? (rolModal === 'Chofer' ? 'Efectivo Chofer Ruta' : 'Efectivo Caja Central')
        : metodoFinal;
    } else if (modalidad === 'Credito') {
      metodoFinal = esGasto ? 'Por Pagar' : 'Por Cobrar';
      anticipoFinal = 0;
      saldoFinal = monto;

      if (esGasto && !idProveedor && !nombreProveedor.trim()) {
        showToast('Para registrar a 100% Crédito (Por Pagar), es obligatorio asociar el Proveedor.', 'warning');
        return;
      }
      if (!esGasto && !idCliente && !nombreCliente.trim()) {
        showToast('Para registrar a 100% Crédito (Por Cobrar), es obligatorio asociar el Cliente.', 'warning');
        return;
      }
    } else if (modalidad === 'Anticipo_Saldo') {
      const ant = esGasto ? anticipoGastoNum : anticipoIngresoNum;
      if (isNaN(ant) || ant < 0) {
        showToast('Ingrese un anticipo válido mayor o igual a 0.', 'warning');
        return;
      }
      if (ant >= monto) {
        showToast('El anticipo debe ser menor al total. Si cubre el 100%, seleccione "100% Contado / Efectivo".', 'warning');
        return;
      }

      metodoFinal = esGasto ? 'Por Pagar' : 'Por Cobrar';
      anticipoFinal = ant;
      saldoFinal = parseFloat((monto - ant).toFixed(2));
      cuentaAnticipoFinal = esGasto ? cuentaAnticipoGasto : cuentaAnticipoIngreso;
    }

    setIsSubmitting(true);
    try {
      const fechaActual = esGasto ? fechaGasto : fechaIngreso;

      const nuevaTx: Omit<TransaccionDiaria, 'idTransaccion' | 'sincronizado'> = {
        tipo: esGasto ? 'Gasto' : 'Ingreso',
        fecha: fechaActual,
        categoria: concepto,
        montoBs: monto,
        metodoPago: metodoFinal,
        modalidadPago: modalidad,
        montoAnticipoBs: anticipoFinal,
        saldoPendienteBs: saldoFinal,
        cuentaAnticipo: cuentaAnticipoFinal,
        notas: detalle || `${concepto} (${rolModal})`,
        idViaje: selectedViajeId || undefined,
        placaCamion: placaCamion || undefined,
        idProveedor: esGasto ? (idProveedor || undefined) : undefined,
        nombreProveedor: esGasto ? (nombreProveedor || undefined) : undefined,
        idCliente: !esGasto ? (idCliente || undefined) : undefined,
        nombreCliente: !esGasto ? (nombreCliente || undefined) : undefined,
        deudorNombre: !esGasto ? (nombreCliente || undefined) : undefined,
        comprobanteFotoUrl: comprobanteFoto || undefined,
        nroManifiesto: nroManifiestoDoc || nroManifiestoInicial || undefined,
        rolUsuario: rolModal,
        origenRegistro: (nroManifiestoDoc || nroManifiestoInicial) && !esGasto ? 'Cobro_Manifiesto' : (rolModal === 'Chofer' ? 'Reporte_Chofer' : 'Reporte_Propietario'),
        estadoCobroPago: modalidad === 'Contado' ? (esGasto ? 'Pagado' : 'Cobrado') : (anticipoFinal && anticipoFinal > 0 ? 'Pendiente' : 'Pendiente')
      };

      const res = await storage.addTransaccion(nuevaTx, comprobanteFoto || undefined);

      // Sincronizar en Gastos_Ruta_Camion si aplica para mantener cálculo de ruta
      const cajaRutaAfectada = modalidad === 'Credito' 
        ? (esGasto ? 'Por Pagar' : 'Por Cobrar') 
        : (modalidad === 'Anticipo_Saldo' ? cuentaAnticipoFinal || 'Efectivo Chofer Ruta' : metodoFinal);

      if (rolModal === 'Chofer' && esGasto) {
        try {
          await storage.addGastoRuta({
            idViajeAsignado: selectedViajeId || 'VIAJE-GENERAL',
            placaCamion: placaCamion || 'FLOTA',
            fechaHora: `${fechaActual} ${new Date().toLocaleTimeString('es-BO', { hour12: false })}`,
            categoriaGasto: concepto,
            tipoOperacion: 'Gasto',
            importeBs: monto,
            cajaCuentaUtilizada: cajaRutaAfectada || 'Efectivo Chofer Ruta',
            nroFacturaBoleta: 'S/N',
            detalleGasto: detalle || concepto,
            idProveedor: idProveedor || undefined,
            nombreProveedor: nombreProveedor || undefined
          }, comprobanteFoto || undefined);
        } catch (e) {
          console.warn('Sync gasto ruta:', e);
        }
      } else if (rolModal === 'Chofer' && !esGasto) {
        try {
          await storage.addGastoRuta({
            idViajeAsignado: selectedViajeId || 'VIAJE-GENERAL',
            placaCamion: placaCamion || 'FLOTA',
            fechaHora: `${fechaActual} ${new Date().toLocaleTimeString('es-BO', { hour12: false })}`,
            categoriaGasto: concepto,
            tipoOperacion: 'Ingreso',
            importeBs: monto,
            cajaCuentaUtilizada: cajaRutaAfectada || 'Efectivo Chofer Ruta',
            nroFacturaBoleta: 'REC-ANTICIPO',
            detalleGasto: detalle || `Anticipo / Ingreso Chofer: ${concepto}`,
            idCliente: idCliente || undefined,
            nombreCliente: nombreCliente || undefined
          }, comprobanteFoto || undefined);
        } catch (e) {
          console.warn('Sync ingreso anticipo:', e);
        }
      }

      // Añadir al historial de sesión
      const itemHistorial = {
        id: res.id || `TX-${Date.now()}`,
        tipo: esGasto ? 'Gasto' as const : 'Ingreso' as const,
        concepto: `${concepto} (${modalidad === 'Contado' ? 'Contado' : modalidad === 'Credito' ? 'Crédito' : 'Mixto'})`,
        detalle: detalle || '-',
        monto,
        hora: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
        rol: rolModal
      };
      setSesionHistorial(prev => [itemHistorial, ...prev]);

      const txCompleta: TransaccionDiaria = {
        ...nuevaTx,
        idTransaccion: res.id || `TX-${Date.now()}`,
        sincronizado: !res.queued
      };

      onTransaccionGuardada(txCompleta, continuar);

      if (continuar) {
        showToast(`✅ ${esGasto ? 'Gasto' : 'Ingreso'} de Bs. ${monto.toFixed(2)} registrado correctamente.`, 'success');

        // Limpieza de campos transaccionales manteniendo viaje y fecha
        if (esGasto) {
          setDetalleGasto('');
          setImporteGasto('');
          setIdProveedor('');
          setNombreProveedor('');
          setBusquedaProveedor('');
          setMontoAnticipoGasto('');
        } else {
          setDetalleIngreso('');
          setImporteIngreso('');
          setIdCliente('');
          setNombreCliente('');
          setBusquedaCliente('');
          setMontoAnticipoIngreso('');
        }
        setComprobanteFoto(null);

        setTimeout(() => {
          if (conceptoSelectRef.current) {
            conceptoSelectRef.current.focus();
          } else if (importeInputRef.current) {
            importeInputRef.current.focus();
          }
        }, 100);
      } else {
        showToast(`Registro guardado exitosamente.`, 'success');
        onClose();
      }
    } catch (err: any) {
      showToast(`Error al registrar: ${err.message || 'Error'}`, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 lg:p-6 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Contenedor Modal de diseño ejecutivo */}
      <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        
        {/* ======================================================== */}
        {/* ENCABEZADO UNIFICADO CON PESTAÑAS: GASTO | INGRESO | TRANSFERENCIA */}
        {/* ======================================================== */}
        <div className="bg-slate-50/80 px-6 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 shrink-0">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Pestañas Superiores de Tipo de Operación */}
            <div className="flex bg-slate-200/80 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setTabTipo('Gasto')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 ${
                  tabTipo === 'Gasto'
                    ? 'bg-[#dc2626] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>- Gasto / Operación</span>
              </button>

              <button
                type="button"
                onClick={() => setTabTipo('Ingreso')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 ${
                  tabTipo === 'Ingreso'
                    ? 'bg-[#16a34a] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+ Ingreso / Anticipo</span>
              </button>

              <button
                type="button"
                onClick={() => setTabTipo('Transferencia')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 ${
                  tabTipo === 'Transferencia'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>⇄ Transferencia</span>
              </button>
            </div>

            {/* Selector de Perfil: Propietario / Chofer */}
            <div className="flex bg-slate-200/80 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setRolModal('Propietario')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[38px] ${
                  rolModal === 'Propietario'
                    ? 'bg-[#1d4ed8] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Propietario</span>
              </button>
              <button
                type="button"
                onClick={() => setRolModal('Chofer')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[38px] ${
                  rolModal === 'Chofer'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Chofer</span>
              </button>
            </div>

            <span className="text-xs text-slate-500 font-semibold hidden xl:inline">
              Captura Continua • {rolModal === 'Propietario' ? 'Transacciones Propietario' : 'Transacciones Chofer'}
            </span>
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

        {/* ======================================================== */}
        {/* BARRA DE VINCULACIÓN DE CONTEXTO (VIAJE / CAMIÓN / CHOFER) */}
        {/* ======================================================== */}
        <div className="bg-[#f8fafc] border-b border-slate-100 px-6 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#1d4ed8]" />
              Contexto Activo:
            </span>

            {/* Selector de Viaje */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="text-slate-400 font-bold text-[11px]">Viaje:</span>
              <select
                value={selectedViajeId}
                onChange={(e) => handleViajeChange(e.target.value)}
                className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer font-mono"
              >
                <option value="">-- Sin Viaje Específico --</option>
                {viajes.map(v => (
                  <option key={v.idViaje} value={v.idViaje}>
                    {v.idViaje} ({v.placaCamion} - {v.choferAsignado})
                  </option>
                ))}
              </select>
            </div>

            {/* Placa / Unidad */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs font-mono font-bold text-slate-800">
              <span className="text-slate-400 font-bold text-[11px]">Camión:</span>
              <span>{placaCamion || 'General'}</span>
            </div>

            {/* Chofer Titular */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs font-bold text-slate-800">
              <span className="text-slate-400 font-bold text-[11px]">Chofer:</span>
              <span>{choferNombre || 'General'}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium hidden md:block">
            El ID de Viaje permanece fijo durante la captura continua para agilizar la rendición.
          </div>
        </div>

        {/* ======================================================== */}
        {/* CUERPO DEL MODAL (FORMULARIOS DINÁMICOS)                 */}
        {/* ======================================================== */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* ======================================================== */}
          {/* PESTAÑA 1: GASTO / OPERACIÓN CON CONDICIÓN DE PAGO       */}
          {/* ======================================================== */}
          {tabTipo === 'Gasto' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Formulario de Gastos / Operación
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  Perfil de Captura: <strong className="text-slate-700">{rolModal}</strong>
                </span>
              </div>

              {/* FILA 1: Fecha de Gasto | Concepto / Categoría | Importe Total (Bs.) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* 1. Fecha de Gasto */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Fecha de Gasto *
                  </label>
                  <input
                    type="date"
                    value={fechaGasto}
                    onChange={(e) => setFechaGasto(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm font-semibold cursor-pointer focus:bg-white focus:ring-2 focus:ring-[#dc2626] focus:border-[#dc2626] min-h-[48px] transition-all outline-none"
                    required
                  />
                </div>

                {/* 2. Concepto / Categoría de Gasto */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      Concepto / Categoría *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreandoNuevoConcepto(true)}
                      className="text-[11px] font-extrabold text-[#1d4ed8] hover:text-blue-800 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      + Nuevo Concepto
                    </button>
                  </div>

                  {isCreandoNuevoConcepto ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Escriba nuevo concepto..."
                        value={nuevoConceptoTexto}
                        onChange={(e) => setNuevoConceptoTexto(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCrearNuevoConcepto()}
                        autoFocus
                        className="w-full bg-white border-2 border-blue-500 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none min-h-[48px]"
                      />
                      <button
                        type="button"
                        onClick={handleCrearNuevoConcepto}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 min-h-[48px] shrink-0"
                      >
                        Crear
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreandoNuevoConcepto(false)}
                        className="px-3 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 min-h-[48px] shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      ref={conceptoSelectRef}
                      value={conceptoGasto}
                      onChange={(e) => {
                        if (e.target.value === '__NUEVO__') {
                           setIsCreandoNuevoConcepto(true);
                        } else {
                          setConceptoGasto(e.target.value);
                        }
                      }}
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#dc2626] focus:border-[#dc2626] outline-none min-h-[48px] transition-all cursor-pointer"
                    >
                      {conceptosGasto.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                      <option value="__NUEVO__" className="text-blue-600 font-bold">+ Nuevo Concepto...</option>
                    </select>
                  )}
                </div>

                {/* 3. Importe Total (Bs.) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#dc2626]">
                      <DollarSign className="w-3.5 h-3.5 text-[#dc2626]" />
                      Importe Total (Bs.) *
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Obligatorio</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-black text-sm">Bs.</span>
                    <input
                      ref={importeInputRef}
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={importeGasto}
                      onChange={(e) => setImporteGasto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave(true);
                      }}
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-lg font-black text-[#dc2626] text-right tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-[#dc2626] min-h-[48px] transition-all"
                      required
                    />
                  </div>
                </div>

              </div>

              {/* FILA 2: CONDICIÓN Y TÉRMINOS DE PAGO (SELECTOR OBLIGATORIO) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50/70 border border-slate-200/90 rounded-2xl">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-slate-500" />
                      Condición y Término de Pago *
                    </span>
                    {modalidadPagoGasto === 'Contado' && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                        100% Contado
                      </span>
                    )}
                    {modalidadPagoGasto === 'Credito' && (
                      <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                        100% Crédito (CxP)
                      </span>
                    )}
                    {modalidadPagoGasto === 'Anticipo_Saldo' && (
                      <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                        ⚡ Mixto: Anticipo + Saldo
                      </span>
                    )}
                  </label>
                  <select
                    value={modalidadPagoGasto}
                    onChange={(e) => setModalidadPagoGasto(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#dc2626] outline-none min-h-[46px] transition-all cursor-pointer"
                  >
                    <option value="Contado">[1] 100% Contado / Efectivo</option>
                    <option value="Credito">[2] 100% Crédito (Por Pagar / CxP Proveedores)</option>
                    <option value="Anticipo_Saldo">[3] Mixto: Anticipo / Pago Parcial + Saldo Pendiente</option>
                  </select>
                </div>

                {/* Sub-campo Condicional según Condición de Pago */}
                <div>
                  {modalidadPagoGasto === 'Contado' ? (
                    <>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                        Método de Pago / Caja de Egreso *
                      </label>
                      <select
                        value={metodoPagoGasto}
                        onChange={(e) => setMetodoPagoGasto(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#dc2626] outline-none min-h-[46px] transition-all cursor-pointer"
                      >
                        {listaCajas.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </>
                  ) : modalidadPagoGasto === 'Credito' ? (
                    <>
                      <label className="text-xs font-bold uppercase tracking-wide text-rose-900 mb-1.5 block">
                        Clasificación Contable
                      </label>
                      <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800 min-h-[46px]">
                        <span>📌</span>
                        <span>100% Crédito Por Pagar: Saldo en caja física se mantiene intacto. Se registra pasivo a Proveedor.</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="text-xs font-bold uppercase tracking-wide text-indigo-900 mb-1.5 block">
                        Modalidad Contable Mixta
                      </label>
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2 text-xs font-bold text-indigo-900 min-h-[46px]">
                        <span>⚡</span>
                        <span>Desembolso parcial de caja + Saldo restante registrado en Cuentas por Pagar.</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* PANEL CONDICIONAL DINÁMICO SI ES MIXTO (ANTICIPO + SALDO PENDIENTE GASTO) */}
              {modalidadPagoGasto === 'Anticipo_Saldo' && (
                <div className="p-5 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Desglose de Pago Parcial y Saldo a Crédito
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-700">
                      Total Operación: {formatBs(importeGastoNum)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                        Monto de Anticipo / Pago Real (Bs.) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={importeGastoNum > 0 ? importeGastoNum : undefined}
                        placeholder="0.00"
                        value={montoAnticipoGasto}
                        onChange={(e) => setMontoAnticipoGasto(e.target.value)}
                        className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-sm font-bold text-emerald-700 text-right tabular-nums focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Efectivo real que descuenta de la caja.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                        Caja / Fondo que paga el Anticipo *
                      </label>
                      <select
                        value={cuentaAnticipoGasto}
                        onChange={(e) => setCuentaAnticipoGasto(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {listaCajas.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 bg-white border border-indigo-200 rounded-xl flex flex-col justify-between">
                      <span className="text-xs font-bold text-rose-800 uppercase block">
                        Saldo Pendiente (a Crédito CxP):
                      </span>
                      <span className="text-lg font-black text-rose-600 font-mono tabular-nums text-right">
                        {formatBs(saldoPendienteGasto)}
                      </span>
                      <span className="text-[10px] text-slate-400 text-right block">
                        Se registrará en pasivos pendientes.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* FILA 3: Detalle del Gasto | Proveedor Asociado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Detalle del Gasto */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Detalle del Gasto (Glosa / Descripción)
                  </label>
                  <input
                    ref={detalleInputRef}
                    type="text"
                    placeholder="Ej. Carga de diésel estación El Mirador..."
                    value={detalleGasto}
                    onChange={(e) => setDetalleGasto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(true);
                    }}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#dc2626] focus:border-[#dc2626] outline-none min-h-[48px] transition-all"
                  />
                </div>

                {/* Proveedor Asociado / Deudor */}
                <div className="relative">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Proveedor Asociado / Acreedor {modalidadPagoGasto === 'Credito' && <strong className="text-rose-600">* Obligatorio</strong>}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Catálogo</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar o elegir proveedor del catálogo..."
                      value={nombreProveedor || busquedaProveedor}
                      onChange={(e) => {
                        setBusquedaProveedor(e.target.value);
                        setNombreProveedor(e.target.value);
                        setMostrarDropdownProveedor(true);
                      }}
                      onFocus={() => setMostrarDropdownProveedor(true)}
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl pl-4 pr-9 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#dc2626] focus:border-[#dc2626] outline-none min-h-[48px] transition-all"
                    />
                    {nombreProveedor && (
                      <button
                        type="button"
                        onClick={() => {
                          setIdProveedor('');
                          setNombreProveedor('');
                          setBusquedaProveedor('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                        title="Limpiar proveedor"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {mostrarDropdownProveedor && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 max-h-52 overflow-y-auto divide-y divide-slate-100">
                      {(proveedoresFiltrados || []).map((p) => (
                        <div
                          key={p.idProveedor}
                          onClick={() => {
                            setIdProveedor(p.idProveedor);
                            setNombreProveedor(p.nombre);
                            setBusquedaProveedor('');
                            setMostrarDropdownProveedor(false);
                          }}
                          className="px-4 py-2.5 hover:bg-rose-50 cursor-pointer text-xs font-medium text-slate-800 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{p.nombre}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({p.idProveedor})</span>
                          </div>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
                            {p.rubro || 'General'}
                          </span>
                        </div>
                      ))}
                      <div
                        onClick={() => setMostrarDropdownProveedor(false)}
                        className="px-3 py-2 text-center text-[11px] font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                      >
                        Cerrar lista desplegable
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Digitalización de Comprobante / Recibo (Opcional) */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#f8fafc] rounded-2xl border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-slate-700">Comprobante / Foto Digitalizada (Opcional):</span>
                  <span className="text-slate-500 text-[11px]">
                    {comprobanteFoto ? '✅ Foto digitalizada lista para adjuntar' : 'Capturar con cámara o cargar archivo'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={subiendoFoto}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-600" />
                    <span>{subiendoFoto ? 'Procesando...' : comprobanteFoto ? 'Cambiar Foto' : 'Tomar Foto / Subir'}</span>
                  </button>

                  {comprobanteFoto && (
                    <button
                      type="button"
                      onClick={() => setComprobanteFoto(null)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
                      title="Quitar foto"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 2: INGRESO / ANTICIPO CON CONDICIÓN DE PAGO      */}
          {/* ======================================================== */}
          {tabTipo === 'Ingreso' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Formulario de Ingresos / Anticipos
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  Perfil de Captura: <strong className="text-slate-700">{rolModal}</strong>
                </span>
              </div>

              {/* FILA 1: Fecha de Ingreso | Concepto / Motivo | Importe Total (Bs.) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* 1. Fecha */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Fecha de Ingreso *
                  </label>
                  <input
                    type="date"
                    value={fechaIngreso}
                    onChange={(e) => setFechaIngreso(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm font-semibold cursor-pointer focus:bg-white focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] min-h-[48px] transition-all outline-none"
                    required
                  />
                </div>

                {/* 2. Concepto / Categoría de Ingreso */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      Concepto / Categoría de Ingreso *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreandoNuevoConcepto(true)}
                      className="text-[11px] font-extrabold text-[#1d4ed8] hover:text-blue-800 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      + Nuevo Concepto
                    </button>
                  </div>

                  {isCreandoNuevoConcepto ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Escriba nuevo concepto..."
                        value={nuevoConceptoTexto}
                        onChange={(e) => setNuevoConceptoTexto(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCrearNuevoConcepto()}
                        autoFocus
                        className="w-full bg-white border-2 border-blue-500 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none min-h-[48px]"
                      />
                      <button
                        type="button"
                        onClick={handleCrearNuevoConcepto}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 min-h-[48px] shrink-0"
                      >
                        Crear
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreandoNuevoConcepto(false)}
                        className="px-3 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 min-h-[48px] shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={conceptoIngreso}
                      onChange={(e) => {
                        if (e.target.value === '__NUEVO__') {
                          setIsCreandoNuevoConcepto(true);
                        } else {
                          setConceptoIngreso(e.target.value);
                        }
                      }}
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] outline-none min-h-[48px] transition-all cursor-pointer"
                    >
                      {conceptosIngreso.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                      <option value="__NUEVO__" className="text-blue-600 font-bold">+ Nuevo Concepto...</option>
                    </select>
                  )}
                </div>

                {/* 3. Importe Total (Bs.) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#16a34a]">
                      <DollarSign className="w-3.5 h-3.5 text-[#16a34a]" />
                      Importe Total (Bs.) *
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Obligatorio</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-black text-sm">Bs.</span>
                    <input
                      ref={importeInputRef}
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={importeIngreso}
                      onChange={(e) => setImporteIngreso(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave(true);
                      }}
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-lg font-black text-[#16a34a] text-right tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] min-h-[48px] transition-all"
                      required
                    />
                  </div>
                </div>

              </div>

              {/* FILA 2: CONDICIÓN Y TÉRMINOS DE PAGO EN INGRESOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50/70 border border-slate-200/90 rounded-2xl">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-slate-500" />
                      Condición y Término de Cobro *
                    </span>
                    {modalidadPagoIngreso === 'Contado' && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                        100% Contado
                      </span>
                    )}
                    {modalidadPagoIngreso === 'Credito' && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        100% Crédito (CxC)
                      </span>
                    )}
                    {modalidadPagoIngreso === 'Anticipo_Saldo' && (
                      <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                        ⚡ Mixto: Cobro Parcial + Saldo
                      </span>
                    )}
                  </label>
                  <select
                    value={modalidadPagoIngreso}
                    onChange={(e) => setModalidadPagoIngreso(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#16a34a] outline-none min-h-[46px] transition-all cursor-pointer"
                  >
                    <option value="Contado">[1] 100% Contado / Efectivo</option>
                    <option value="Credito">[2] 100% Crédito (Por Cobrar / CxC Clientes)</option>
                    <option value="Anticipo_Saldo">[3] Mixto: Anticipo / Cobro Parcial + Saldo Pendiente</option>
                  </select>
                </div>

                {/* Sub-campo Condicional según Condición de Pago */}
                <div>
                  {modalidadPagoIngreso === 'Contado' ? (
                    <>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block">
                        Método / Caja Receptora de Ingreso *
                      </label>
                      <select
                        value={metodoOrigenFondo}
                        onChange={(e) => setMetodoOrigenFondo(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#16a34a] outline-none min-h-[46px] transition-all cursor-pointer"
                      >
                        {listaCajas.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </>
                  ) : modalidadPagoIngreso === 'Credito' ? (
                    <>
                      <label className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-1.5 block">
                        Clasificación Contable
                      </label>
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-900 min-h-[46px]">
                        <span>📌</span>
                        <span>100% Crédito Por Cobrar: Saldo en caja intacto. Se registra activo exigible en Cuentas por Cobrar.</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="text-xs font-bold uppercase tracking-wide text-indigo-900 mb-1.5 block">
                        Modalidad Contable Mixta
                      </label>
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2 text-xs font-bold text-indigo-900 min-h-[46px]">
                        <span>⚡</span>
                        <span>Cobro parcial registrado en caja + Saldo restante registrado en CxC Clientes.</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* PANEL CONDICIONAL DINÁMICO SI ES MIXTO (ANTICIPO + SALDO PENDIENTE INGRESO) */}
              {modalidadPagoIngreso === 'Anticipo_Saldo' && (
                <div className="p-5 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Desglose de Cobro Parcial y Saldo por Cobrar
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-700">
                      Total Operación: {formatBs(importeIngresoNum)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                        Monto de Anticipo / Cobro Real (Bs.) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={importeIngresoNum > 0 ? importeIngresoNum : undefined}
                        placeholder="0.00"
                        value={montoAnticipoIngreso}
                        onChange={(e) => setMontoAnticipoIngreso(e.target.value)}
                        className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-sm font-bold text-emerald-700 text-right tabular-nums focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Efectivo real que ingresa a la caja.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1 block">
                        Caja / Cuenta Receptora *
                      </label>
                      <select
                        value={cuentaAnticipoIngreso}
                        onChange={(e) => setCuentaAnticipoIngreso(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {listaCajas.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 bg-white border border-indigo-200 rounded-xl flex flex-col justify-between">
                      <span className="text-xs font-bold text-amber-800 uppercase block">
                        Saldo Pendiente (a Crédito CxC):
                      </span>
                      <span className="text-lg font-black text-amber-700 font-mono tabular-nums text-right">
                        {formatBs(saldoPendienteIngreso)}
                      </span>
                      <span className="text-[10px] text-slate-400 text-right block">
                        Se registrará en cuentas por cobrar.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* FILA 3: Detalle | Cliente Asociado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Detalle */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Detalle / Glosa del Ingreso
                  </label>
                  <input
                    ref={detalleInputRef}
                    type="text"
                    placeholder="Ej. Cobro de flete en destino, anticipo en central..."
                    value={detalleIngreso}
                    onChange={(e) => setDetalleIngreso(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(true);
                    }}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] outline-none min-h-[48px] transition-all"
                  />
                </div>

                {/* Cliente Asociado */}
                <div className="relative">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Cliente Asociado / Pagador {modalidadPagoIngreso === 'Credito' && <strong className="text-amber-700">* Obligatorio</strong>}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Catálogo</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar cliente en catálogo..."
                      value={nombreCliente || busquedaCliente}
                      onChange={(e) => {
                        setBusquedaCliente(e.target.value);
                        setNombreCliente(e.target.value);
                        setMostrarDropdownCliente(true);
                      }}
                      onFocus={() => setMostrarDropdownCliente(true)}
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl pl-4 pr-9 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] outline-none min-h-[48px] transition-all"
                    />
                    {nombreCliente && (
                      <button
                        type="button"
                        onClick={() => {
                          setIdCliente('');
                          setNombreCliente('');
                          setBusquedaCliente('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                        title="Limpiar cliente"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {mostrarDropdownCliente && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 max-h-52 overflow-y-auto divide-y divide-slate-100">
                      {(clientesFiltrados || []).map((c) => (
                        <div
                          key={c.idCliente}
                          onClick={() => {
                            setIdCliente(c.idCliente);
                            setNombreCliente(c.nombre);
                            setBusquedaCliente('');
                            setMostrarDropdownCliente(false);
                          }}
                          className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer text-xs font-medium text-slate-800 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{c.nombre}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({c.idCliente})</span>
                          </div>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
                            {c.ciudad || 'Cliente'}
                          </span>
                        </div>
                      ))}
                      <div
                        onClick={() => setMostrarDropdownCliente(false)}
                        className="px-3 py-2 text-center text-[11px] font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                      >
                        Cerrar lista desplegable
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Digitalización de Comprobante / Recibo (Opcional) */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#f8fafc] rounded-2xl border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-slate-700">Comprobante / Foto Digitalizada (Opcional):</span>
                  <span className="text-slate-500 text-[11px]">
                    {comprobanteFoto ? '✅ Foto digitalizada lista para adjuntar' : 'Capturar con cámara o cargar archivo'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={subiendoFoto}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-600" />
                    <span>{subiendoFoto ? 'Procesando...' : comprobanteFoto ? 'Cambiar Foto' : 'Tomar Foto / Subir'}</span>
                  </button>

                  {comprobanteFoto && (
                    <button
                      type="button"
                      onClick={() => setComprobanteFoto(null)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
                      title="Quitar foto"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 3: TRANSFERENCIA ENTRE CUENTAS / CAJAS           */}
          {/* ======================================================== */}
          {tabTipo === 'Transferencia' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Formulario de Transferencia entre Cajas / Cuentas
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  Traspaso de Fondos • <strong className="text-slate-700">{rolModal}</strong>
                </span>
              </div>

              {/* FILA 1: Fecha | Cuenta Origen | Cuenta Destino */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Fecha */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Fecha de Transferencia *
                  </label>
                  <input
                    type="date"
                    value={fechaTransferencia}
                    onChange={(e) => setFechaTransferencia(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm font-semibold cursor-pointer focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 min-h-[48px] transition-all outline-none"
                    required
                  />
                </div>

                {/* 2. Cuenta Origen (Entrega) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-rose-500" />
                    Caja / Cuenta Origen (Entrega Fondos) *
                  </label>
                  <select
                    value={cuentaOrigenTransferencia}
                    onChange={(e) => setCuentaOrigenTransferencia(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none min-h-[48px] transition-all cursor-pointer"
                  >
                    {listaCajas.map((c) => (
                      <option key={c} value={c}>📤 {c}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Cuenta Destino (Recibe) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                    Caja / Cuenta Destino (Recibe Fondos) *
                  </label>
                  <select
                    value={cuentaDestinoTransferencia}
                    onChange={(e) => setCuentaDestinoTransferencia(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none min-h-[48px] transition-all cursor-pointer"
                  >
                    {listaCajas.map((c) => (
                      <option key={c} value={c}>📥 {c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* FILA 2: Importe Total | Nro. Comprobante / Referencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-indigo-700">
                      <DollarSign className="w-3.5 h-3.5 text-indigo-700" />
                      Monto a Transferir (Bs.) *
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Obligatorio</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-black text-sm">Bs.</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={importeTransferencia}
                      onChange={(e) => setImporteTransferencia(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-lg font-black text-indigo-700 text-right tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 min-h-[48px] transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    Nro. Comprobante / Referencia Bancaria (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. TRANS-84920, Recibo Nro. 102..."
                    value={nroComprobanteTransferencia}
                    onChange={(e) => setNroComprobanteTransferencia(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none min-h-[48px] transition-all"
                  />
                </div>
              </div>

              {/* FILA 3: Detalle / Motivo de la Transferencia */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5 block flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Motivo / Glosa de la Transferencia
                </label>
                <input
                  type="text"
                  placeholder="Ej. Envío de viáticos a Chofer para inicio de viaje, devolución sobrante de ruta..."
                  value={detalleTransferencia}
                  onChange={(e) => setDetalleTransferencia(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none min-h-[48px] transition-all"
                />
              </div>

              {/* Digitalización de Comprobante / Foto (Opcional) */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#f8fafc] rounded-2xl border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-slate-700">Comprobante de Transferencia / Foto (Opcional):</span>
                  <span className="text-slate-500 text-[11px]">
                    {comprobanteFoto ? '✅ Foto digitalizada lista para adjuntar' : 'Capturar con cámara o cargar archivo'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={subiendoFoto}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-600" />
                    <span>{subiendoFoto ? 'Procesando...' : comprobanteFoto ? 'Cambiar Foto' : 'Tomar Foto / Subir'}</span>
                  </button>

                  {comprobanteFoto && (
                    <button
                      type="button"
                      onClick={() => setComprobanteFoto(null)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
                      title="Quitar foto"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* HISTORIAL DE CAPTURA EN ESTA SESIÓN (TIEMPO REAL) */}
          {/* ======================================================== */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Historial de Captura en Esta Sesión ({sesionHistorial.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Se actualiza en tiempo real al hacer clic en "Guardar y Continuar"
              </span>
            </div>

            {sesionHistorial.length === 0 ? (
              <div className="p-5 text-center bg-[#f8fafc] rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                Aún no has ingresado transacciones en esta sesión. Completa el formulario y presiona <strong>"Guardar y Continuar"</strong> para registrar de forma masiva sin fricción.
              </div>
            ) : (
              <div className="bg-[#f8fafc] rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="max-h-44 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200 sticky top-0">
                        <th className="py-2.5 px-3">Hora</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Concepto</th>
                        <th className="py-2.5 px-3">Detalle</th>
                        <th className="py-2.5 px-3 text-right">Monto (Bs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 font-medium">
                      {sesionHistorial.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{item.hora}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.tipo === 'Ingreso' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : item.tipo === 'Traspaso'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {item.tipo}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800">{item.concepto}</td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-xs">{item.detalle}</td>
                          <td className={`py-2 px-3 text-right font-black tabular-nums ${
                            item.tipo === 'Ingreso' 
                              ? 'text-emerald-700' 
                              : item.tipo === 'Traspaso'
                              ? 'text-indigo-700'
                              : 'text-rose-700'
                          }`}>
                            {item.tipo === 'Ingreso' ? '+' : item.tipo === 'Gasto' ? '-' : '⇄'} Bs. {item.monto.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ======================================================== */}
        {/* COMPORTAMIENTO AVANZADO DE LOS BOTONES DE GUARDADO (FOOTER) */}
        {/* ======================================================== */}
        <div className="bg-slate-50/80 border-t border-slate-100 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          {/* Botón: [Cancelar / Cerrar] */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm shadow-2xs transition-all"
          >
            Cancelar / Cerrar
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5">
            {/* Botón 1: [💾 Guardar y Continuar] */}
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2"
              title="Guarda la transacción vinculada al viaje actual, limpia importe y detalle, y reenfoca para la siguiente captura"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Guardar y Continuar</span>
            </button>

            {/* Botón 2: [✅ Guardar y Salir] */}
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              title="Guarda la transacción actual, cierra la ventana emergente y actualiza las vistas principales"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Guardar y Salir</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
