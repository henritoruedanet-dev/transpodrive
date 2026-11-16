export type EstadoViaje = 'En Tránsito' | 'En Reparto' | 'Liquidado / Cerrado';
export type EstadoManifiesto = 'En Preparación' | 'Despachado' | 'En Destino' | 'Liquidado';
export type EstadoLiquidacionSub = 'En Reparto' | 'Liquidado en Sucursal' | 'Liquidado' | 'Pendiente Parcial' | 'Por Cobrar';
export type MetodoCobroOrigen = 'Efectivo en Agencia' | 'Transferencia / QR Origen' | 'Por Liquidar / Crédito Agencia';
export type EstadoLiquidacionAgencia = 'Pendiente de Liquidación' | 'Liquidado a Central';
// Modalidades de Cobro en Destino y Tipo de Deudor Contable
export type ModalidadCobroDestino = 'Agencia Recauda en Destino y Rinde a Empresa' | 'Cobro Directo Empresa / Cliente' | 'Cobro por Agencia de Destino';
export type TipoDeudor = 'AGENCIA' | 'CLIENTE';
export type EstadoCobranzaDestino = 'Pendiente de Cobro y Liquidación por Agencia' | 'Pendiente de Pago Cliente' | 'Retenido en Agencia (CxC Agencia)' | 'Cobrado / Liquidado a Empresa';
export type TipoRecaudadorDestino = 'Agencia de Destino Cobró' | 'Cobro Directo (Cliente canceló a Empresa/Chofer)';
export type EstadoRendicionDestino = 'Retenido en Agencia (CxC Agencia)' | 'Depositado a Cuenta de Empresa';
export type TipoMovimiento = 'Ingreso' | 'Gasto';
export type TipoTransaccion = 'Ingreso' | 'Gasto' | 'Traspaso';
export type UserRole = 'admin' | 'sucursal' | 'chofer';

export interface DatosEmpresa {
  nombre: string;
  nit: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  slogan: string;
  logoUrl?: string;
}

export interface Viaje {
  idViaje: string; // PK e.g. VJ-2026-001
  placaCamion: string; // FK e.g. 2341-NXZ (Volvo FH16)
  choferAsignado: string;
  fechaSalida: string;
  fechaLlegada: string;
  estadoViaje: EstadoViaje;
  observacionesRuta: string;
  origen?: string;
  destino?: string;
  // Campos calculados
  fletesManifiestosBs: number;
  gastosRutaBs: number;
  utilidadViajeBs: number;
  margenPct: number;
  cobradoDestinoBs?: number;
}

export interface ManifiestoOrigen {
  idManifiesto: string; // PK e.g. MAN-OR-089
  nroManifiestoMIC: string; // e.g. MIC-DTA-5542
  idViajeAsignado: string; // FK to Viaje
  sucursalOrigen: string; // e.g. Oruro
  fechaEmision: string;
  estadoManifiesto: EstadoManifiesto;
  estado?: string;
  // Campos calculados
  fleteTotalBs: number;
  cobradoOrigenBs: number;
  saldoCobrarDestinosBs: number;
  porcCobranza: number;
}

export interface ManifiestoDestino {
  idSubManifiesto: string; // PK e.g. SUB-089-TJA
  idManifiestoPadre: string; // FK to ManifiestoOrigen
  idViaje?: string; // FK to Viaje e.g. VJ-2026-001
  nroManifiesto: string;
  sucursalDestino: string; // e.g. Tarija, Bermejo
  fleteAsignadoBs: number; // = pagadoOrigenBs + porPagarDestinoBs
  pagadoOrigenBs: number;
  porPagarDestinoBs?: number; // nuevo campo: Por pagar Destino
  // Cálculos en vivo
  saldoInicialCobrarBs: number; // fleteAsignadoBs - pagadoOrigenBs (o porPagarDestinoBs)
  cobrosRealizadosBs: number;
  ingresosDeliveryOtrosBs: number;
  gastosComisionesBs: number;
  recaudacionNetaCajaBs: number; // cobrosRealizados + ingresosDelivery - gastosComisiones
  saldoPendienteClienteBs: number; // Saldo exclusivo que debe el cliente final
  saldoPendienteAgenciaBs?: number; // Saldo exclusivo que debe rendir la agencia / sucursal
  tipoResponsableDestino?: 'CLIENTE' | 'AGENCIA' | 'Cliente' | 'Agencia';
  tipoResponsableOrigen?: 'CLIENTE' | 'AGENCIA' | 'Cliente' | 'Agencia';
  responsableDestinoTipo?: 'cliente' | 'agencia';
  responsableOrigenTipo?: 'cliente' | 'agencia';
  creditoOrigenBs?: number;
  estadoLiquidacion: EstadoLiquidacionSub;
  destinatario?: string;
  remitente?: string;
  descripcionCarga?: string;
  telefonoContacto?: string;
  telefonoDestinatario?: string;
  direccionDestinatario?: string;
  idCliente?: string;
  origenViaje?: string;
  // Flujo Contable de Pagado en Origen
  metodoCobroOrigen?: MetodoCobroOrigen;
  cuentaAfectadaOrigen?: string;
  estadoLiquidacionAgencia?: EstadoLiquidacionAgencia;
  fechaLiquidacionAgencia?: string;
  cuentaLiquidacionCentral?: string;
  // Flujo Contable de Saldo Por Pagar en Destino
  modalidadCobroDestino?: ModalidadCobroDestino;
  tipoDeudor?: TipoDeudor; // 'AGENCIA' | 'CLIENTE'
  idDeudor?: string; // ID o Identificador del Deudor Responsable
  nombreDeudor?: string; // Nombre del Deudor (Agencia o Cliente)
  agenciaDestinoResponsable?: string; // Si tipoDeudor === 'AGENCIA', nombre de la agencia
  estadoCobranzaDestino?: EstadoCobranzaDestino;
  tipoRecaudadorDestino?: TipoRecaudadorDestino;
  estadoRendicionDestino?: EstadoRendicionDestino;
  montoRetenidoAgenciaBs?: number; // Saldo que retiene la agencia de destino (CxC Agencia Destino)
  fechaCobroDestino?: string;
  comprobanteDepositoUrl?: string;
  nitCiDestinatario?: string;
  nitCiRemitente?: string;
  fechaDespacho?: string;
  fechaRegistro?: string;
  fechaIngreso?: string;
  telefonoRemitente?: string;
}

export interface Cliente {
  idCliente: string;
  nombre: string;
  telefono: string;
  direccion: string;
  nitCi?: string;
  ciudad?: string;
  fechaRegistro?: string;
  activo?: boolean;
}

export interface Proveedor {
  idProveedor: string; // Key e.g. PRV-001
  nombre: string; // Nombre o Razón Social (Text)
  telefono: string; // Teléfono (Phone)
  direccion: string; // Dirección (Text)
  nitCi?: string;
  ciudad?: string;
  rubro?: string;
  contacto?: string;
  estado?: 'Activo' | 'Inactivo';
  activo?: boolean;
  fechaRegistro?: string;
}

export interface CuentaPorPagar {
  idCxP: string;
  idProveedor: string; // Ref a Proveedor
  nombreProveedor: string;
  proveedorNombre?: string;
  idViaje?: string;
  centroCostoPlaca?: string;
  placaCamion?: string;
  concepto: string;
  montoTotalBs: number;
  montoPagadoBs: number;
  saldoPendienteBs: number;
  fechaEmision: string;
  fechaVencimiento?: string;
  estado: 'Pendiente' | 'Parcial' | 'Pagado';
  nroFacturaBoleta?: string;
  notas?: string;
  rubro?: string;
  categoria?: string;
}

export interface MovimientoManifDestino {
  idMovimiento: string;
  idSubManifiesto: string;
  sucursal: string;
  tipoMovimiento: TipoMovimiento;
  categoriaConcepto: string; // Flexible para asociar categorías financieras o directas
  importeBs: number;
  cajaCuentaAfectada: string; // e.g. Caja Sucursal Tarija
  fechaHora: string;
  nroComprobante: string;
  detalleOperacion: string;
  idProveedor?: string; // Ref Proveedores
  tipoRecaudador?: TipoRecaudadorDestino;
  estadoRendicion?: EstadoRendicionDestino;
  comprobanteDepositoUrl?: string;
  fecha?: string;
  montoCobrado?: number;
  cajaAfectada?: string;
  observaciones?: string;
}

export interface GastoRutaCamion {
  idGastoRuta: string;
  idViajeAsignado: string;
  placaCamion: string;
  fechaHora: string;
  categoriaGasto: string;
  tipoOperacion?: 'Gasto' | 'Ingreso';
  importeBs: number;
  litrosDiesel?: number;
  cajaCuentaUtilizada: string; // e.g. 'Efectivo Chofer Ruta'
  nroFacturaBoleta: string;
  detalleGasto: string;
  comprobanteFotoUrl?: string; // Data URL or Drive Link
  sincronizado?: boolean;
  idProveedor?: string; // Ref Proveedores (Gastos)
  nombreProveedor?: string;
  idCliente?: string; // Ref Clientes (Ingresos)
  nombreCliente?: string;
}

export interface CajaCuenta {
  nombre: string;
  tipo: 'Caja Sucursal' | 'Efectivo Chofer' | 'Banco' | 'Tarjeta' | 'Billetera';
  ubicacion: string;
  saldoInicial: number;
  totalCobrado: number;
  totalGastado: number;
  saldoDisponible: number;
}

export interface CamionCentroCosto {
  placa: string;
  modelo: string;
  choferHabitual: string;
  capacidadKg: number;
  anoFabricacion?: number;
  activo?: boolean;
}

export interface Chofer {
  idChofer: string;
  nombre: string;
  telefono?: string;
  licencia?: string;
  placaAsignada?: string;
  estado: 'Activo' | 'De Vacaciones' | 'Inactivo';
}

export interface Catalogos {
  sucursales: string[];
  camiones: CamionCentroCosto[];
  choferes: Chofer[];
  clientes: Cliente[];
  proveedores: Proveedor[];
  cuentasPorPagar?: CuentaPorPagar[];
  categoriasGastoRuta: string[];
  categoriasIngresoDestino: string[];
  categoriasGastoDestino: string[];
  cajasCuentas: string[];
  empresa?: DatosEmpresa;
}

export interface PendingSyncItem {
  id: string;
  tipo: 'gasto_ruta' | 'movimiento_destino' | 'nuevo_viaje' | 'nuevo_manifiesto' | 'transaccion_diaria' | 'traspaso';
  data: any;
  timestamp: string;
  reintentos: number;
}

// -------------------------------------------------------------
// FINANZAS Y GASTOS DIARIOS
// -------------------------------------------------------------

export interface TransaccionDiaria {
  idTransaccion: string;
  tipo: TipoTransaccion;
  fecha: string; // YYYY-MM-DD
  categoria: string;
  montoBs: number;
  metodoPago: string; // e.g. 'Efectivo Caja Tarija', 'Banco Unión Central', 'QR / Tarjeta'
  cuentaDestino?: string; // Solo en traspasos
  notas: string;
  comprobanteFotoUrl?: string;
  sucursal?: string;
  placaCamion?: string;
  idViaje?: string;
  nroManifiesto?: string;
  idProveedor?: string; // Ref Proveedores (Tabla Maestra - Para Gastos / CxP)
  nombreProveedor?: string;
  idCliente?: string; // Ref Clientes (Tabla Maestra - Para Ingresos / CxC)
  nombreCliente?: string;
  deudorNombre?: string;
  fechaVencimiento?: string;
  nroFacturaBoleta?: string;
  estadoCobroPago?: 'Pendiente' | 'Cobrado' | 'Pagado';
  modalidadPago?: 'Contado' | 'Credito' | 'Anticipo_Saldo';
  montoAnticipoBs?: number;
  saldoPendienteBs?: number;
  cuentaAnticipo?: string;
  esRecurrente?: boolean;
  sincronizado?: boolean;
  origenRegistro?: string;
  rolUsuario?: 'Propietario' | 'Chofer' | 'Administrador';
  idSubManifiesto?: string;
  condicionPago?: string;
  skipSubAmortization?: boolean;
}

export interface CategoriaFinanciera {
  id: string;
  nombre: string;
  tipo: 'Ingreso' | 'Gasto';
  icono?: string;
  color?: string;
  esPredefinida?: boolean;
}

export interface PresupuestoMensual {
  id: string;
  categoria: string;
  montoPresupuestadoBs: number;
  mesAno: string; // YYYY-MM
}

export interface RecordatorioRecurrente {
  id: string;
  titulo: string;
  montoBs: number;
  tipo: 'Ingreso' | 'Gasto';
  categoria: string;
  frecuencia: 'Diario' | 'Semanal' | 'Quincenal' | 'Mensual' | 'Anual';
  proximaFecha: string; // YYYY-MM-DD
  metodoPago: string;
  activo: boolean;
  notas?: string;
}

export interface TraspasoFondos {
  idTraspaso: string;
  fechaHora: string;
  cuentaOrigen: string;
  cuentaDestino: string;
  montoBs: number;
  motivo: string;
  nroComprobante?: string;
  sucursalOrigen?: string;
  sucursalDestino?: string;
  comprobanteFotoUrl?: string;
}

export interface ConfigSeguridad {
  pinHabilitado: boolean;
  pinCodigo: string; // 4 dígitos o contraseña
  bloqueoInactividad: boolean;
  tiempoMinutos: number;
  huellaHabilitada: boolean;
}

export interface DetalleIngresoChofer {
  idIngresoChofer: string;
  idReporteChofer: string;
  idViaje: string;
  fecha: string;
  conceptoIngreso: string;
  detalleGlosa: string;
  origenFondo: string; // Efectivo, Traspaso Central, QR, etc.
  montoBs: number;
  nroReciboComprobante?: string;
}

export interface DetalleGastoChofer {
  idGastoChofer: string;
  idReporteChofer: string;
  idViaje: string;
  placaCamion: string;
  fecha: string;
  conceptoGasto: string;
  detalleGasto: string;
  idProveedor?: string;
  nroFacturaRecibo?: string;
  montoBs: number;
  comprobanteFotoUrl?: string;
}

export interface ReporteViajeChofer {
  idReporteChofer: string;
  idViaje: string;
  placaCamion: string;
  choferAsignado: string;
  centroCosto: string;
  rutaOrigen: string;
  rutaDestino: string;
  manifiestosAsociados: string;
  fechaInicio: string;
  fechaCierre?: string;
  totalIngresosBs: number;
  totalGastosBs: number;
  saldoFavorContraBs: number;
  estadoReporte: 'Borrador' | 'Liquidado' | 'Cerrado';
  observaciones?: string;
  ingresos?: DetalleIngresoChofer[];
  gastos?: DetalleGastoChofer[];
}

export interface DetalleHuerfano {
  id: string;
  tabla: 'Transacciones_Diarias' | 'Gastos_Ruta_Camion';
  campo: string;
  valorInvalido: string;
  motivo: string;
  montoBs: number;
  fecha?: string;
  detalles?: string;
}

export interface DetalleDescuadreCaja {
  caja: string;
  saldoRegistrado: number;
  saldoHistoricoReal: number;
  diferencia: number;
  estado: 'Cuadrado' | 'Descuadre Detectado';
  totalIngresosReal: number;
  totalGastosReal: number;
  saldoInicial: number;
}

export interface DetalleInconsistenciaManifiesto {
  tipo: 'MIC' | 'Sub-MIC';
  idDoc: string;
  nroDocumento: string;
  clienteDestinatario: string;
  fleteTotalBs: number;
  cobrosRegistradosBs: number;
  cobrosRealesCalculadosBs: number;
  saldoRegistradoBs: number;
  saldoRealCalculadoBs: number;
  diferenciaSaldoBs: number;
  estadoActual: string;
  estadoRecomendado: string;
  tieneInconsistencia: boolean;
  motivo?: string;
}

export interface DiagnosticoIntegridadReport {
  resumen: {
    totalAnomalias: number;
    huerfanos: number;
    descuadresCajas: number;
    inconsistenciasManifiestos: number;
    saludGeneral: 'Óptima' | 'Atención Requerida' | 'Crítica';
    porcentajeIntegridad: number;
    fechaDiagnostico: string;
    origen: 'Backend Google Sheets' | 'Local / Cache Sincronizado';
  };
  detallesHuerfanos: DetalleHuerfano[];
  detallesCajas: DetalleDescuadreCaja[];
  detallesManifiestos: DetalleInconsistenciaManifiesto[];
}

export interface TrazaAuditoriaMantenimiento {
  idTraza: string;
  fechaHora: string;
  accion:
    | 'DIAGNOSTICO'
    | 'PURGA_HUERFANOS'
    | 'SINCRONIZAR_CAJAS'
    | 'REPARAR_MANIFIESTOS'
    | 'REPARACION_INTEGRAL'
    | 'BARRIDO_HUERFANOS_SUBMANIFIESTOS'
    | 'ELIMINAR_SUBMANIFIESTO_CASCADA'
    | 'RECALCULO_SALDOS_SUBMANIFIESTOS'
    | 'REINICIAR_SISTEMA_CERO'
    | 'LIMPIEZA_TOTAL_CERO'
    | 'AUDITORIA_Y_REPARACION_TOTAL'
    | 'CREAR_BACKUP'
    | 'RESTAURAR_BACKUP';
  titulo: string;
  registrosAfectados: number;
  resultado: 'Éxito' | 'Advertencia' | 'Error';
  usuario: string;
  detalles: string[];
}

export interface BackupDriveInfo {
  id: string;
  name: string;
  date: string;
  size?: number;
  url?: string;
}


