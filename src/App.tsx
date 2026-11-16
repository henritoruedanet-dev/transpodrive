import React, { useState, useEffect } from 'react';
import { 
  Viaje, 
  ManifiestoOrigen, 
  ManifiestoDestino, 
  MovimientoManifDestino, 
  GastoRutaCamion, 
  CajaCuenta, 
  Catalogos, 
  UserRole,
  EstadoViaje,
  TransaccionDiaria,
  CategoriaFinanciera,
  PresupuestoMensual,
  RecordatorioRecurrente,
  ConfigSeguridad,
  CamionCentroCosto,
  Chofer,
  Cliente,
  Proveedor,
  DatosEmpresa,
  TipoRecaudadorDestino,
  EstadoRendicionDestino
} from './types';
import { StorageService } from './services/storageService';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ViajesView } from './components/ViajesView';
import { DespachosOrigenView } from './components/DespachosOrigenView';
import { CobranzasDestinoView } from './components/CobranzasDestinoView';
import { FinanzasDiariasView } from './components/FinanzasDiariasView';
import { ReportesAvanzadosView } from './components/ReportesAvanzadosView';
import { AjustesView } from './components/AjustesView';
import { GoogleDriveConnectorView } from './components/GoogleDriveConnectorView';
import { GastoRutaModal } from './components/GastoRutaModal';
import { TransaccionModal } from './components/TransaccionModal';
import { TraspasoModal } from './components/TraspasoModal';
import { SeguridadModal } from './components/SeguridadModal';
import { PantallaBloqueo } from './components/PantallaBloqueo';
import { ReceiptTicketModal } from './components/ReceiptTicketModal';
import { ReceiptPhotoModal } from './components/ReceiptPhotoModal';
import { EditViajeModal } from './components/EditViajeModal';
import { EditManifiestoModal } from './components/EditManifiestoModal';
import { EditTransaccionModal } from './components/EditTransaccionModal';
import { PropietariosChoferesView } from './components/PropietariosChoferesView';
import { PanelAuditoriaContable } from './components/PanelAuditoriaContable';
import { CheckCircle2, AlertTriangle, CloudOff, Plus, Fuel, DollarSign, Receipt, Wallet } from 'lucide-react';

export default function App() {
  const [isFabOpen, setIsFabOpen] = useState(false);
  const storage = StorageService.getInstance();

  // App Navigation and Roles
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [role, setRole] = useState<UserRole>('admin');
  const [selectedSucursal, setSelectedSucursal] = useState<string>('Todas');
  const [selectedPlaca, setSelectedPlaca] = useState<string>('Todos');

  // Network and Sync status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [gasUrl, setGasUrl] = useState<string>(storage.getGasUrl());
  const [lastSyncTime, setLastSyncTime] = useState<string>(storage.getLastSyncTime());

  // Main Datasets
  const [viajes, setViajes] = useState<Viaje[]>(storage.getViajes());
  const [manifiestosOrigen, setManifiestosOrigen] = useState<ManifiestoOrigen[]>(storage.getManifiestosOrigen());
  const [manifiestosDestino, setManifiestosDestino] = useState<ManifiestoDestino[]>(storage.getManifiestosDestino());
  const [movimientos, setMovimientos] = useState<MovimientoManifDestino[]>(storage.getMovimientos());
  const [gastosRuta, setGastosRuta] = useState<GastoRutaCamion[]>(storage.getGastosRuta());
  const [cajas, setCajas] = useState<CajaCuenta[]>(storage.getCajas());
  const [catalogos, setCatalogos] = useState<Catalogos>(storage.getCatalogos());

  // Finanzas y Gastos Diarios Datasets
  const [transacciones, setTransacciones] = useState<TransaccionDiaria[]>(storage.getTransacciones());
  const [categorias, setCategorias] = useState<CategoriaFinanciera[]>(storage.getCategorias());
  const [presupuestos, setPresupuestos] = useState<PresupuestoMensual[]>(storage.getPresupuestos());
  const [recordatorios, setRecordatorios] = useState<RecordatorioRecurrente[]>(storage.getRecordatorios());
  const [seguridad, setSeguridad] = useState<ConfigSeguridad>(storage.getSeguridad());
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [empresa, setEmpresa] = useState<DatosEmpresa>(() => storage.getEmpresa());

  const handleUpdateEmpresa = (nuevaEmpresa: DatosEmpresa) => {
    storage.saveEmpresa(nuevaEmpresa);
    setEmpresa(nuevaEmpresa);
    showToast('Datos de la empresa y logo actualizados correctamente');
  };

  // Modal States
  const [isGastoModalOpen, setIsGastoModalOpen] = useState<boolean>(false);
  const [gastoModalPrefillTrip, setGastoModalPrefillTrip] = useState<string | undefined>();
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);

  // Modales de Finanzas Diarias
  const [isTransaccionModalOpen, setIsTransaccionModalOpen] = useState<boolean>(false);
  const [transaccionModalTipo, setTransaccionModalTipo] = useState<'Ingreso' | 'Gasto' | 'Transferencia'>('Gasto');
  const [isTraspasoModalOpen, setIsTraspasoModalOpen] = useState<boolean>(false);
  const [isSeguridadModalOpen, setIsSeguridadModalOpen] = useState<boolean>(false);

  // Ticket Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState<boolean>(false);
  const [receiptSub, setReceiptSub] = useState<ManifiestoDestino | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Modales de Edición de Información
  const [editingViaje, setEditingViaje] = useState<Viaje | null>(null);
  const [isEditViajeModalOpen, setIsEditViajeModalOpen] = useState<boolean>(false);
  const [editingManifiestoOrigen, setEditingManifiestoOrigen] = useState<ManifiestoOrigen | null>(null);
  const [editingSubManifiesto, setEditingSubManifiesto] = useState<ManifiestoDestino | null>(null);
  const [isEditManifiestoModalOpen, setIsEditManifiestoModalOpen] = useState<boolean>(false);
  const [editingTransaccion, setEditingTransaccion] = useState<TransaccionDiaria | null>(null);
  const [isEditTransaccionModalOpen, setIsEditTransaccionModalOpen] = useState<boolean>(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reload state from storage
  const reloadData = () => {
    setViajes(storage.getViajes());
    setManifiestosOrigen(storage.getManifiestosOrigen());
    setManifiestosDestino(storage.getManifiestosDestino());
    setMovimientos(storage.getMovimientos());
    setGastosRuta(storage.getGastosRuta());
    setCajas(storage.getCajas());
    setCatalogos(storage.getCatalogos());
    setTransacciones(storage.getTransacciones());
    setCategorias(storage.getCategorias());
    setPresupuestos(storage.getPresupuestos());
    setRecordatorios(storage.getRecordatorios());
    setSeguridad(storage.getSeguridad());
    setPendingCount(storage.getPendingSync().length);
    setLastSyncTime(storage.getLastSyncTime());
  };

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Conexión a internet restablecida. Listo para sincronizar con Google Drive.', 'info');
      if (storage.getPendingSync().length > 0) {
        handleSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Sin señal de internet. Operando en modo Offline local.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setPendingCount(storage.getPendingSync().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Adapt view if role changes
  useEffect(() => {
    if (role === 'chofer') {
      setCurrentTab('viajes');
      if (selectedPlaca === 'Todos') {
        setSelectedPlaca(catalogos.camiones[0]?.placa || '2341-NXZ');
      }
    } else if (role === 'sucursal') {
      if (currentTab === 'dashboard') {
        setCurrentTab('cobranzas');
      }
      if (selectedSucursal === 'Todas') {
        setSelectedSucursal('Tarija');
      }
    }
  }, [role]);

  // Sync Action
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await storage.syncPendingQueue();
      reloadData();
      if (res.processed > 0) {
        showToast(`¡Sincronizados ${res.processed} registro(s) con Google Sheets!`, 'success');
      } else {
        showToast('Todo está al día con la base de datos de Google Drive.', 'info');
      }
    } catch (e) {
      showToast('Error de conexión con Google Apps Script.', 'warning');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Gasto de Ruta
  const handleSaveGasto = async (gastoData: any, fotoBase64?: string) => {
    const res = await storage.addGastoRuta(gastoData, fotoBase64);
    reloadData();
    if (res.queued) {
      showToast('Gasto guardado en tu celular. Se sincronizará con Google Drive al conectar.', 'warning');
    } else {
      showToast('Gasto registrado y enviado a Google Sheets.', 'success');
    }
  };

  // Guardar Transacción Diaria (Ingreso / Gasto)
  const handleSaveTransaccion = async (txData: any, fotoBase64?: string) => {
    const res = await storage.addTransaccion(txData, fotoBase64);
    reloadData();
    if (res.queued) {
      showToast('Transacción guardada localmente. Se sincronizará al conectar.', 'warning');
    } else {
      showToast('Transacción registrada y sincronizada.', 'success');
    }
  };

  const handleDeleteTransaccion = (id: string) => {
    storage.deleteTransaccion(id);
    reloadData();
    showToast('Transacción eliminada y saldo de caja ajustado.', 'info');
  };

  // Guardar Traspaso de Fondos
  const handleSaveTraspaso = async (traspasoData: any) => {
    await storage.registrarTraspaso(traspasoData);
    reloadData();
    showToast(`Traspaso de Bs ${traspasoData.montoBs.toLocaleString('es-BO')} procesado con éxito.`, 'success');
  };

  // Categorías
  const handleAddCategoria = (cat: Omit<CategoriaFinanciera, 'id' | 'esPredefinida'>) => {
    storage.addCategoria(cat);
    reloadData();
    showToast(`Categoría "${cat.nombre}" creada.`, 'success');
  };

  const handleDeleteCategoria = (id: string) => {
    const ok = storage.deleteCategoria(id);
    if (ok) {
      reloadData();
      showToast('Categoría eliminada.', 'info');
    } else {
      showToast('No se puede eliminar una categoría predefinida del sistema.', 'warning');
    }
  };

  // Presupuesto
  const handleSetPresupuesto = (cat: string, monto: number, mesAno: string) => {
    storage.setPresupuesto(cat, monto, mesAno);
    reloadData();
    showToast(`Presupuesto para ${cat} actualizado a Bs ${monto.toLocaleString('es-BO')}.`, 'success');
  };

  // Recordatorios
  const handleAddRecordatorio = (rec: Omit<RecordatorioRecurrente, 'id'>) => {
    storage.addRecordatorio(rec);
    reloadData();
    showToast(`Recordatorio "${rec.titulo}" guardado.`, 'success');
  };

  const handleDeleteRecordatorio = (id: string) => {
    storage.deleteRecordatorio(id);
    reloadData();
    showToast('Recordatorio eliminado.', 'info');
  };

  // Seguridad
  const handleSaveSeguridad = (cfg: ConfigSeguridad) => {
    storage.setSeguridad(cfg);
    setSeguridad(cfg);
    showToast('Ajustes de seguridad actualizados.', 'success');
  };

  // Reception and destination collection
  const handleRegistrarCobranza = async (
    sub: ManifiestoDestino,
    cobroSaldo: number,
    delivery: number,
    comision: number,
    conceptoComision: string,
    cajaAfectada: string,
    nroComprobante: string,
    detalle: string,
    conceptoIngresoExtra?: string,
    idProveedorGasto?: string,
    tipoRecaudador?: TipoRecaudadorDestino,
    estadoRendicion?: EstadoRendicionDestino,
    comprobanteDepositoUrl?: string
  ) => {
    const provGasto = idProveedorGasto ? catalogos.proveedores?.find(p => p.idProveedor === idProveedorGasto) : undefined;

    // Si la agencia cobró pero lo retiene (CxC Agencia), la cuenta afectada para el saldo es CxC Agencia Destino
    const esRetenidoEnAgencia = tipoRecaudador === 'Agencia de Destino Cobró' && estadoRendicion === 'Retenido en Agencia (CxC Agencia)';
    const cajaParaSaldo = esRetenidoEnAgencia
      ? `CxC Agencia ${sub.sucursalDestino}`
      : cajaAfectada;

    if (cobroSaldo > 0) {
      await storage.addMovimientoDestino({
        idSubManifiesto: sub.idSubManifiesto,
        sucursal: sub.sucursalDestino,
        tipoMovimiento: 'Ingreso',
        categoriaConcepto: 'Cobro Flete Saldo',
        importeBs: cobroSaldo,
        cajaCuentaAfectada: cajaParaSaldo,
        fechaHora: new Date().toISOString().replace('T', ' ').substring(0, 16),
        nroComprobante: nroComprobante,
        detalleOperacion: detalle || `Cobro saldo encomienda ${sub.nroManifiesto}`,
        tipoRecaudador,
        estadoRendicion,
        comprobanteDepositoUrl
      });
    }

    if (delivery > 0) {
      const catIngreso = conceptoIngresoExtra || 'Servicio Delivery Puerta a Puerta';
      await storage.addMovimientoDestino({
        idSubManifiesto: sub.idSubManifiesto,
        sucursal: sub.sucursalDestino,
        tipoMovimiento: 'Ingreso',
        categoriaConcepto: catIngreso,
        importeBs: delivery,
        cajaCuentaAfectada: cajaAfectada,
        fechaHora: new Date().toISOString().replace('T', ' ').substring(0, 16),
        nroComprobante: `${nroComprobante}-DEL`,
        detalleOperacion: `Servicio entrega a domicilio cliente ${sub.destinatario} (${catIngreso})`
      });
    }

    if (comision > 0) {
      const catGasto = conceptoComision || 'Comisiones y Fleteros Locales';
      await storage.addMovimientoDestino({
        idSubManifiesto: sub.idSubManifiesto,
        sucursal: sub.sucursalDestino,
        tipoMovimiento: 'Gasto',
        categoriaConcepto: catGasto,
        importeBs: comision,
        cajaCuentaAfectada: cajaAfectada,
        fechaHora: new Date().toISOString().replace('T', ' ').substring(0, 16),
        nroComprobante: `${nroComprobante}-EGR`,
        detalleOperacion: `Pago a fletero / gasto directo ${sub.nroManifiesto} (${catGasto})${provGasto ? ` - Proveedor: ${provGasto.nombre}` : ''}`,
        idProveedor: idProveedorGasto
      });
    }

    reloadData();
    if (esRetenidoEnAgencia) {
      showToast(`Cobro registrado. Saldo cliente cancelado (0 Bs) y traspasado a CxC Agencia ${sub.sucursalDestino}.`, 'info');
    } else {
      showToast('Cobranza, movimientos y asientos contables registrados correctamente en caja de empresa.', 'success');
    }
  };

  const handleLiquidarSaldosAgenciaDestino = async (
    agenciaDestino: string,
    cuentaCentral: string,
    montoALiquidar: number,
    fecha?: string,
    notas?: string
  ) => {
    const ok = await storage.liquidarSaldosAgenciaDestino(agenciaDestino, cuentaCentral, montoALiquidar, fecha, notas);
    if (ok) {
      reloadData();
      showToast(`Liquidación de Agencia ${agenciaDestino} por Bs ${montoALiquidar.toLocaleString('es-BO')} abonada a ${cuentaCentral}.`, 'success');
    } else {
      showToast('Error al procesar la liquidación de la agencia.', 'error');
    }
  };

  const handleCrearViaje = async (viaje: Viaje) => {
    await storage.crearViaje(viaje);
    reloadData();
    showToast(`Viaje ${viaje.idViaje} creado exitosamente.`, 'success');
  };

  const handleCrearDespacho = async (origen: ManifiestoOrigen, destinos: ManifiestoDestino[]) => {
    await storage.crearDespacho(origen, destinos);
    reloadData();
    showToast(`Despacho MIC ${origen.nroManifiestoMIC} registrado con ${destinos.length} sub-entregas.`, 'success');
  };

  const handleLiquidarCobroOrigen = async (
    idSubManifiesto: string,
    cuentaCentral: string,
    fecha?: string,
    notas?: string
  ) => {
    const ok = await storage.liquidarCobroOrigen(idSubManifiesto, cuentaCentral, fecha, notas);
    if (ok) {
      reloadData();
      showToast(`Cobro en origen liquidado exitosamente a ${cuentaCentral}.`, 'success');
    } else {
      showToast('Error al liquidar cobro en origen.', 'error');
    }
  };

  const handleLiquidarAgenciaConDeducciones = async (payload: any) => {
    const ok = await storage.liquidarAgenciaConDeducciones(payload);
    if (ok) {
      reloadData();
      showToast(
        `Liquidación ${payload.tipo === 'ORIGEN' ? 'de origen' : 'de destino'} de Agencia ${payload.agencia} por neto Bs ${Number(payload.montoNeto).toLocaleString('es-BO', { minimumFractionDigits: 2 })} procesada exitosamente.`,
        'success'
      );
    } else {
      showToast('Error al procesar la liquidación de la agencia.', 'error');
    }
  };

  // Edición y Eliminación de Viajes
  const handleUpdateViaje = (viaje: Viaje) => {
    storage.updateViaje(viaje);
    reloadData();
    showToast(`Viaje ${viaje.idViaje} actualizado correctamente.`, 'success');
  };

  const handleDeleteViaje = (idViaje: string) => {
    storage.deleteViaje(idViaje);
    reloadData();
    showToast(`Viaje ${idViaje} eliminado.`, 'info');
  };

  // Edición y Eliminación de Manifiestos
  const handleUpdateManifiestoOrigen = (man: ManifiestoOrigen) => {
    storage.updateManifiestoOrigen(man);
    reloadData();
    showToast(`Manifiesto MIC ${man.nroManifiestoMIC} actualizado.`, 'success');
  };

  const handleDeleteManifiestoOrigen = (id: string) => {
    storage.deleteManifiestoOrigen(id);
    reloadData();
    showToast('Manifiesto de origen eliminado.', 'info');
  };

  const handleUpdateManifiestoDestino = (sub: ManifiestoDestino) => {
    storage.updateManifiestoDestino(sub);
    reloadData();
    showToast(`Sub-manifiesto ${sub.nroManifiesto} actualizado.`, 'success');
  };

  const handleDeleteManifiestoDestino = async (id: string) => {
    const res = await storage.eliminarSubManifiestoCascada(id);
    reloadData();
    showToast(res.message || `Sub-manifiesto ${id} eliminado por completo de todo el sistema.`, 'info');
  };

  // Cobranzas directas CxC y Pagos CxP desde Reportes
  const handleRegistrarCobroCxC = async (payload: any) => {
    await storage.registrarCobroCxCDirecto(payload);
    reloadData();
    showToast(`Cobro de Bs ${Number(payload.montoBs).toLocaleString('es-BO', { minimumFractionDigits: 2 })} registrado con éxito.`, 'success');
  };

  const handleRegistrarPagoProveedor = async (payload: any) => {
    await storage.registrarPagoProveedor(payload);
    reloadData();
    showToast(`Pago de Bs ${Number(payload.montoPagoBs).toLocaleString('es-BO', { minimumFractionDigits: 2 })} a ${payload.nombreProveedor} registrado exitosamente.`, 'success');
  };

  // Edición de Transacciones
  const handleUpdateTransaccion = (tx: TransaccionDiaria) => {
    storage.updateTransaccion(tx);
    reloadData();
    showToast('Transacción modificada y saldos recalculados.', 'success');
  };

  // Catálogos & Ajustes (Centros de Costos, Choferes, Cajas con Saldo Inicial, Sucursales)
  const handleAddCamion = (camion: CamionCentroCosto) => {
    storage.addCamion(camion);
    reloadData();
    showToast(`Centro de costo / Camión ${camion.placa} guardado.`, 'success');
  };

  const handleUpdateCamion = (placaOriginal: string, camion: CamionCentroCosto) => {
    storage.updateCamion(placaOriginal, camion);
    reloadData();
    showToast(`Camión ${camion.placa} actualizado.`, 'success');
  };

  const handleDeleteCamion = (placa: string) => {
    storage.deleteCamion(placa);
    reloadData();
    showToast(`Camión ${placa} eliminado.`, 'info');
  };

  const handleAddChofer = (chofer: Chofer) => {
    storage.addChofer(chofer);
    reloadData();
    showToast(`Chofer ${chofer.nombre} registrado.`, 'success');
  };

  const handleUpdateChofer = (chofer: Chofer) => {
    storage.updateChofer(chofer);
    reloadData();
    showToast(`Chofer ${chofer.nombre} actualizado.`, 'success');
  };

  const handleDeleteChofer = (idChofer: string) => {
    storage.deleteChofer(idChofer);
    reloadData();
    showToast('Chofer eliminado de la nómina.', 'info');
  };

  const handleAddCajaCuenta = (caja: CajaCuenta) => {
    storage.addCajaCuenta(caja);
    reloadData();
    showToast(`Cuenta / Caja "${caja.nombre}" registrada con saldo inicial de Bs ${(Number(caja.saldoInicial) || 0).toLocaleString('es-BO')}.`, 'success');
  };

  const handleUpdateCajaCuenta = (nombreOriginal: string, caja: CajaCuenta) => {
    storage.updateCajaCuenta(nombreOriginal, caja);
    reloadData();
    showToast(`Cuenta "${caja.nombre}" actualizada. Saldo inicial aplicado.`, 'success');
  };

  const handleDeleteCajaCuenta = (nombre: string) => {
    storage.deleteCajaCuenta(nombre);
    reloadData();
    showToast(`Cuenta "${nombre}" eliminada.`, 'info');
  };

  const handleAddSucursal = (nombre: string) => {
    storage.addSucursal(nombre);
    reloadData();
    showToast(`Agencia "${nombre}" agregada al catálogo.`, 'success');
  };

  const handleDeleteSucursal = (nombre: string) => {
    storage.deleteSucursal(nombre);
    reloadData();
    showToast(`Agencia "${nombre}" eliminada.`, 'info');
  };

  // Gestión de Clientes / Destinatarios (Cuentas por Cobrar)
  const handleAddCliente = (cliente: Cliente) => {
    storage.addCliente(cliente);
    reloadData();
    showToast(`Cliente "${cliente.nombre}" registrado en catálogo.`, 'success');
  };

  const handleUpdateCliente = (cliente: Cliente) => {
    storage.updateCliente(cliente);
    reloadData();
    showToast(`Cliente "${cliente.nombre}" actualizado.`, 'success');
  };

  const handleDeleteCliente = (idCliente: string) => {
    storage.deleteCliente(idCliente);
    reloadData();
    showToast('Cliente eliminado del catálogo.', 'info');
  };

  // Gestión de Proveedores (Tabla Maestra)
  const handleAddProveedor = (proveedor: Proveedor) => {
    storage.addProveedor(proveedor);
    reloadData();
    showToast(`Proveedor "${proveedor.nombre}" registrado en catálogo.`, 'success');
  };

  const handleUpdateProveedor = (proveedor: Proveedor) => {
    storage.updateProveedor(proveedor);
    reloadData();
    showToast(`Proveedor "${proveedor.nombre}" actualizado.`, 'success');
  };

  const handleDeleteProveedor = (idProveedor: string) => {
    storage.deleteProveedor(idProveedor);
    reloadData();
    showToast('Proveedor eliminado del catálogo.', 'info');
  };

  const handleActualizarEstadoViaje = (idViaje: string, nuevoEstado: EstadoViaje) => {
    const list = storage.getViajes();
    const idx = list.findIndex(v => v.idViaje === idViaje);
    if (idx !== -1) {
      list[idx].estadoViaje = nuevoEstado;
      localStorage.setItem('transpodrive_viajes', JSON.stringify(list));
      reloadData();
      showToast(`Viaje ${idViaje} actualizado a estado "${nuevoEstado}".`, 'info');
    }
  };

  const handleSaveGasUrl = (url: string) => {
    storage.setGasUrl(url);
    setGasUrl(url);
    showToast('URL de Google Apps Script guardada.', 'success');
  };

  const handlePullData = async () => {
    const res = await storage.pullFromGoogleSheets();
    if (res.success) {
      reloadData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'warning');
    }
    return res;
  };

  const handleResetData = () => {
    storage.resetToDefaults();
    reloadData();
    showToast('Datos de demostración restablecidos.', 'info');
  };

  return (
    <div className="w-full min-h-screen bg-[#f4f6fa] overflow-x-hidden text-slate-850 flex flex-col font-sans">
      {/* Pantalla de Bloqueo por PIN / Huella */}
      <PantallaBloqueo
        isLocked={isLocked}
        onUnlock={() => setIsLocked(false)}
        seguridad={seguridad}
      />

      {/* Toast floating notification (SaaS Style) */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            toastMessage.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : toastMessage.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
              : toastMessage.type === 'warning'
              ? 'bg-amber-900 text-white border-amber-800'
              : 'bg-slate-900 text-white border-slate-800'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : toastMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CloudOff className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Responsive Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        role={role}
        setRole={setRole}
        selectedSucursal={selectedSucursal}
        setSelectedSucursal={setSelectedSucursal}
        selectedPlaca={selectedPlaca}
        setSelectedPlaca={setSelectedPlaca}
        sucursales={catalogos.sucursales}
        placas={catalogos.camiones.map(c => c.placa)}
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onSync={handleSync}
        onOpenGastoModal={() => {
          setTransaccionModalTipo('Gasto');
          setIsTransaccionModalOpen(true);
        }}
        onOpenTransaccionModal={(tipo) => {
          setTransaccionModalTipo(tipo);
          setIsTransaccionModalOpen(true);
        }}
        onOpenTraspasoModal={() => {
          setTransaccionModalTipo('Transferencia');
          setIsTransaccionModalOpen(true);
        }}
        onOpenSeguridadModal={() => setIsSeguridadModalOpen(true)}
        isLocked={isLocked}
      />

      {/* Content Body (Ancho Estándar Unificado 1600px en Desktop con px-4 sm:px-6 lg:px-8 py-6) */}
      <main className="w-full min-h-screen bg-slate-50/50 px-4 sm:px-6 lg:px-8 py-6 flex-1 pb-28 lg:pb-10">
        <div className="w-full max-w-[1600px] mx-auto">
          {currentTab === 'dashboard' && (
          <DashboardView
            viajes={viajes}
            manifiestosOrigen={manifiestosOrigen}
            manifiestosDestino={manifiestosDestino}
            gastosRuta={gastosRuta}
            cajas={cajas}
            selectedSucursal={selectedSucursal}
            selectedPlaca={selectedPlaca}
            onOpenGastoModal={() => {
              setTransaccionModalTipo('Gasto');
              setIsTransaccionModalOpen(true);
            }}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'finanzas' && (
          <FinanzasDiariasView
            transacciones={transacciones}
            categorias={categorias}
            presupuestos={presupuestos}
            recordatorios={recordatorios}
            catalogos={catalogos}
            viajes={viajes}
            onOpenTransaccionModal={(tipo) => {
              setTransaccionModalTipo(tipo);
              setIsTransaccionModalOpen(true);
            }}
            onOpenTraspasoModal={() => {
              setTransaccionModalTipo('Transferencia');
              setIsTransaccionModalOpen(true);
            }}
            onDeleteTransaccion={handleDeleteTransaccion}
            onEditTransaccion={(tx) => {
              if (tx) {
                setEditingTransaccion(tx);
                setIsEditTransaccionModalOpen(true);
              }
            }}
            onAddCategoria={handleAddCategoria}
            onDeleteCategoria={handleDeleteCategoria}
            onSetPresupuesto={handleSetPresupuesto}
            onAddRecordatorio={handleAddRecordatorio}
            onDeleteRecordatorio={handleDeleteRecordatorio}
            onVerComprobante={(fotoUrl) => setPhotoViewerUrl(fotoUrl)}
          />
        )}

        {currentTab === 'propietarios-choferes' && (
          <PropietariosChoferesView
            transacciones={transacciones}
            gastosRuta={gastosRuta}
            viajes={viajes}
            manifiestosOrigen={manifiestosOrigen}
            manifiestosDestino={manifiestosDestino}
            catalogos={catalogos}
            empresa={empresa}
            onRefreshData={reloadData}
            onEditTransaccion={(tx) => {
              if (tx) {
                setEditingTransaccion(tx);
                setIsEditTransaccionModalOpen(true);
              }
            }}
            onDeleteTransaccion={handleDeleteTransaccion}
            onDeleteSubManifiesto={handleDeleteManifiestoDestino}
            showToast={showToast}
          />
        )}

        {currentTab === 'viajes' && (
          <ViajesView
            viajes={viajes}
            manifiestosOrigen={manifiestosOrigen}
            manifiestosDestino={manifiestosDestino}
            gastosRuta={gastosRuta}
            transacciones={transacciones}
            catalogos={catalogos}
            selectedPlaca={selectedPlaca}
            onOpenGastoModal={() => {
              setTransaccionModalTipo('Gasto');
              setIsTransaccionModalOpen(true);
            }}
            onOpenTransaccionModal={() => {
              setTransaccionModalTipo('Gasto');
              setIsTransaccionModalOpen(true);
            }}
            onCrearViaje={handleCrearViaje}
            onActualizarEstadoViaje={handleActualizarEstadoViaje}
            onVerComprobante={(fotoUrl) => setPhotoViewerUrl(fotoUrl)}
            onEditViaje={(v) => {
              setEditingViaje(v);
              setIsEditViajeModalOpen(true);
            }}
            onPrintViaje={(v) => {
              setEditingViaje(v);
              setIsEditViajeModalOpen(true);
            }}
            empresa={empresa}
            onReporteSaved={reloadData}
          />
        )}

        {currentTab === 'despachos' && (
          <DespachosOrigenView
            manifiestosOrigen={manifiestosOrigen}
            manifiestosDestino={manifiestosDestino}
            viajes={viajes}
            catalogos={catalogos}
            selectedSucursal={selectedSucursal}
            onCrearDespacho={handleCrearDespacho}
            onAddCliente={handleAddCliente}
            onLiquidarCobroOrigen={handleLiquidarCobroOrigen}
            onEditOrigen={(man) => {
              setEditingManifiestoOrigen(man);
              setEditingSubManifiesto(null);
              setIsEditManifiestoModalOpen(true);
            }}
            onEditSub={(sub) => {
              setEditingSubManifiesto(sub);
              setEditingManifiestoOrigen(null);
              setIsEditManifiestoModalOpen(true);
            }}
            showToast={showToast}
          />
        )}

        {currentTab === 'cobranzas' && (
          <CobranzasDestinoView
            manifiestosDestino={manifiestosDestino}
            movimientos={movimientos}
            catalogos={catalogos}
            viajes={viajes}
            manifiestosOrigen={manifiestosOrigen}
            categorias={categorias}
            cajas={cajas}
            transacciones={transacciones}
            selectedSucursal={selectedSucursal}
            onRegistrarCobranza={handleRegistrarCobranza}
            onLiquidarCobroOrigen={handleLiquidarCobroOrigen}
            onLiquidarSaldosAgenciaDestino={handleLiquidarSaldosAgenciaDestino}
            onLiquidarAgenciaConDeducciones={handleLiquidarAgenciaConDeducciones}
            onAddCategoria={handleAddCategoria}
            onRefreshData={reloadData}
            showToast={showToast}
            onOpenReceiptModal={(sub, data) => {
              setReceiptSub(sub);
              setReceiptData(data);
              setReceiptModalOpen(true);
            }}
            onEditSub={(sub) => {
              setEditingSubManifiesto(sub);
              setEditingManifiestoOrigen(null);
              setIsEditManifiestoModalOpen(true);
            }}
            onDeleteSub={(sub) => handleDeleteManifiestoDestino(sub.idSubManifiesto)}
          />
        )}

        {currentTab === 'reportes' && (
          <ReportesAvanzadosView
            transacciones={transacciones}
            categorias={categorias}
            viajes={viajes}
            manifiestos={manifiestosOrigen}
            manifiestosDestino={manifiestosDestino}
            catalogos={catalogos}
            onLiquidarCobroOrigen={handleLiquidarCobroOrigen}
            onLiquidarSaldosAgenciaDestino={handleLiquidarSaldosAgenciaDestino}
            onVerComprobante={(fotoUrl) => setPhotoViewerUrl(fotoUrl)}
            onRegistrarCobroCxC={handleRegistrarCobroCxC}
            onRegistrarPagoProveedor={handleRegistrarPagoProveedor}
            onEditTransaccion={(tx) => {
              if (tx) {
                setEditingTransaccion(tx);
                setIsEditTransaccionModalOpen(true);
              }
            }}
          />
        )}

        {currentTab === 'auditoria' && (
          <PanelAuditoriaContable
            onDataMutated={reloadData}
            showToast={showToast}
          />
        )}

        {currentTab === 'ajustes' && (
          <AjustesView
            catalogos={catalogos}
            cajas={cajas}
            manifiestosDestino={manifiestosDestino}
            manifiestosOrigen={manifiestosOrigen}
            viajes={viajes}
            categorias={categorias}
            onAddCategoria={handleAddCategoria}
            empresa={empresa}
            onUpdateEmpresa={handleUpdateEmpresa}
            onAddCamion={handleAddCamion}
            onUpdateCamion={handleUpdateCamion}
            onDeleteCamion={handleDeleteCamion}
            onAddChofer={handleAddChofer}
            onUpdateChofer={handleUpdateChofer}
            onDeleteChofer={handleDeleteChofer}
            onAddCajaCuenta={handleAddCajaCuenta}
            onUpdateCajaCuenta={handleUpdateCajaCuenta}
            onDeleteCajaCuenta={handleDeleteCajaCuenta}
            onAddSucursal={handleAddSucursal}
            onDeleteSucursal={handleDeleteSucursal}
            onAddCliente={handleAddCliente}
            onUpdateCliente={handleUpdateCliente}
            onDeleteCliente={handleDeleteCliente}
            onAddProveedor={handleAddProveedor}
            onUpdateProveedor={handleUpdateProveedor}
            onDeleteProveedor={handleDeleteProveedor}
            transacciones={transacciones}
            showToast={showToast}
            onDataMutated={reloadData}
          />
        )}

        {currentTab === 'conector' && (
          <GoogleDriveConnectorView
            gasUrl={gasUrl}
            onSaveGasUrl={handleSaveGasUrl}
            onPullData={handlePullData}
            onResetData={handleResetData}
            lastSyncTime={lastSyncTime}
            pendingCount={pendingCount}
          />
        )}
        </div>
      </main>

      {/* Botón Flotante (+) Rápido en la Esquina Inferior Derecha (Estilo Nativo) */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end no-print">
        {isFabOpen && (
          <div className="mb-3 bg-white border border-[#e2e8f0] rounded-[16px] shadow-2xl p-2 space-y-1 w-60 text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="px-3 py-1.5 border-b border-[#e2e8f0] font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              Operaciones Rápidas
            </div>
            <button
              onClick={() => {
                setIsFabOpen(false);
                setTransaccionModalTipo('Gasto');
                setIsTransaccionModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#eff6ff] text-slate-700 font-semibold text-left transition-colors min-h-[44px]"
            >
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold text-slate-800">+ Diésel / Gasto Ruta</span>
                <span className="text-[10px] text-slate-500">Cargar combustible o peaje</span>
              </div>
            </button>

            <button
              onClick={() => {
                setIsFabOpen(false);
                setTransaccionModalTipo('Ingreso');
                setIsTransaccionModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-700 font-semibold text-left transition-colors min-h-[44px]"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#16a34a] flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold text-slate-800">+ Registrar Ingreso</span>
                <span className="text-[10px] text-slate-500">Cobro de flete o anticipo</span>
              </div>
            </button>

            <button
              onClick={() => {
                setIsFabOpen(false);
                setTransaccionModalTipo('Gasto');
                setIsTransaccionModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-slate-700 font-semibold text-left transition-colors min-h-[44px]"
            >
              <div className="w-8 h-8 rounded-full bg-rose-100 text-[#dc2626] flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold text-slate-800">+ Registrar Gasto</span>
                <span className="text-[10px] text-slate-500">Egreso o pago operativo</span>
              </div>
            </button>

            <button
              onClick={() => {
                setIsFabOpen(false);
                setTransaccionModalTipo('Transferencia');
                setIsTransaccionModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-slate-700 font-semibold text-left transition-colors min-h-[44px]"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1d4ed8] flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold text-slate-800">+ Traspaso de Cajas</span>
                <span className="text-[10px] text-slate-500">Mover saldo entre cuentas</span>
              </div>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="bg-[#1A73E8] hover:bg-[#1557B0] text-white w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center focus:outline-none"
          title="Acción Rápida (+)"
        >
          <Plus className={`w-6 h-6 transition-transform duration-200 ${isFabOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* Quick Gasto Ruta Modal with Camera Capture */}
      <GastoRutaModal
        isOpen={isGastoModalOpen}
        onClose={() => setIsGastoModalOpen(false)}
        viajesActivos={viajes.filter(v => v.estadoViaje !== 'Liquidado / Cerrado')}
        catalogos={catalogos}
        selectedPlaca={selectedPlaca}
        gastosRuta={gastosRuta}
        categorias={categorias}
        onSaveGasto={handleSaveGasto}
        onAddCategoria={handleAddCategoria}
        isOnline={isOnline}
      />

      {/* Transacción Diaria Modal (Ingreso / Gasto) */}
      <TransaccionModal
        isOpen={isTransaccionModalOpen}
        onClose={() => setIsTransaccionModalOpen(false)}
        tipoInicial={transaccionModalTipo}
        categorias={categorias}
        catalogos={catalogos}
        viajes={viajes}
        transacciones={transacciones}
        onAddCategoria={handleAddCategoria}
        selectedSucursal={selectedSucursal}
        selectedPlaca={selectedPlaca}
        onSave={handleSaveTransaccion}
      />

      {/* Traspaso entre Cuentas Modal */}
      <TraspasoModal
        isOpen={isTraspasoModalOpen}
        onClose={() => setIsTraspasoModalOpen(false)}
        catalogos={catalogos}
        onSaveTraspaso={handleSaveTraspaso}
      />

      {/* Modal de Configuración de Seguridad & PIN */}
      <SeguridadModal
        isOpen={isSeguridadModalOpen}
        onClose={() => setIsSeguridadModalOpen(false)}
        seguridad={seguridad}
        onSaveSeguridad={handleSaveSeguridad}
        onLockNow={() => setIsLocked(true)}
      />

      {/* Ticket Comprobante Modal (WhatsApp & Print) */}
      <ReceiptTicketModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        subManifiesto={receiptSub}
        reciboData={receiptData}
        empresa={empresa}
      />

      {/* Photo Invoice Viewer Modal */}
      <ReceiptPhotoModal
        isOpen={!!photoViewerUrl}
        onClose={() => setPhotoViewerUrl(null)}
        fotoUrl={photoViewerUrl}
      />

      {/* Modal Edición de Viaje */}
      <EditViajeModal
        isOpen={isEditViajeModalOpen}
        onClose={() => {
          setIsEditViajeModalOpen(false);
          setEditingViaje(null);
        }}
        viaje={editingViaje}
        catalogos={catalogos}
        gastosRuta={gastosRuta}
        manifiestos={manifiestosOrigen}
        onUpdateViaje={handleUpdateViaje}
        onDeleteViaje={handleDeleteViaje}
      />

      {/* Modal Edición de Manifiestos Origen y Destino */}
      <EditManifiestoModal
        isOpen={isEditManifiestoModalOpen}
        onClose={() => {
          setIsEditManifiestoModalOpen(false);
          setEditingManifiestoOrigen(null);
          setEditingSubManifiesto(null);
        }}
        manifiestoOrigen={editingManifiestoOrigen}
        subManifiesto={editingSubManifiesto}
        catalogos={catalogos}
        onUpdateOrigen={handleUpdateManifiestoOrigen}
        onDeleteOrigen={handleDeleteManifiestoOrigen}
        onUpdateSub={handleUpdateManifiestoDestino}
        onDeleteSub={handleDeleteManifiestoDestino}
      />

      {/* Modal Edición de Transacción Diaria */}
      <EditTransaccionModal
        isOpen={isEditTransaccionModalOpen}
        onClose={() => {
          setIsEditTransaccionModalOpen(false);
          setEditingTransaccion(null);
        }}
        transaccion={editingTransaccion}
        categorias={categorias}
        catalogos={catalogos}
        viajes={viajes}
        transacciones={transacciones}
        onAddCategoria={handleAddCategoria}
        onUpdateTransaccion={handleUpdateTransaccion}
        onDeleteTransaccion={handleDeleteTransaccion}
      />
    </div>
  );
}
