import {
  Viaje,
  ManifiestoOrigen,
  ManifiestoDestino,
  MovimientoManifDestino,
  GastoRutaCamion,
  CajaCuenta,
  Catalogos,
  Cliente,
  Proveedor,
  CuentaPorPagar,
  TransaccionDiaria,
  CategoriaFinanciera,
  PresupuestoMensual,
  RecordatorioRecurrente,
  ConfigSeguridad,
  DatosEmpresa,
  ReporteViajeChofer
} from '../types';

export const INITIAL_EMPRESA: DatosEmpresa = {
  nombre: 'TranspoDrive S.R.L.',
  nit: '1029384019',
  telefono: '72984512 - 4-6643210',
  direccion: 'Av. Circunvalación #1420 esq. Froilán Tejerina',
  ciudad: 'Tarija - Bolivia',
  slogan: 'Transporte Pesado Nacional & Logística de Encomiendas',
  logoUrl: ''
};

export const INITIAL_PROVEEDORES: Proveedor[] = [
  {
    idProveedor: 'PRV-01',
    nombre: 'YPFB Estación Central de Servicios Caracollo',
    telefono: '72981100',
    direccion: 'Carretera Panamericana Km 35, Oruro',
    ciudad: 'Oruro',
    nitCi: '1020304050',
    rubro: 'Combustible y Lubricantes',
    contacto: 'Ing. Grover Mendoza',
    activo: true,
    fechaRegistro: '2026-01-10'
  },
  {
    idProveedor: 'PRV-02',
    nombre: 'Vías Bolivia - Administradora de Peajes y Pesaje',
    telefono: '800102030',
    direccion: 'Av. 20 de Octubre #1120, La Paz',
    ciudad: 'La Paz',
    nitCi: '1008472910',
    rubro: 'Peajes, Balanzas y Retenes',
    contacto: 'Ventanilla Única Nacional',
    activo: true,
    fechaRegistro: '2026-01-12'
  },
  {
    idProveedor: 'PRV-03',
    nombre: 'Taller Mecánico Diésel & Llantas Guadalquivir',
    telefono: '71890044',
    direccion: 'Av. Circunvalación esq. Froilán Tejerina, Tarija',
    ciudad: 'Tarija',
    nitCi: '4928172016',
    rubro: 'Mantenimiento Mecánico y Vulcanizado',
    contacto: 'Don Teófilo Barrientos',
    activo: true,
    fechaRegistro: '2026-02-05'
  },
  {
    idProveedor: 'PRV-04',
    nombre: 'Fleteros Express & Reparto Urbano Tarija',
    telefono: '76112233',
    direccion: 'Mercado Campesino Calle Froilán #32, Tarija',
    ciudad: 'Tarija',
    nitCi: '6729104018',
    rubro: 'Comisiones de Reparto y Fleteros Locales',
    contacto: 'Ramiro Vilca (Asociación Fleteros)',
    activo: true,
    fechaRegistro: '2026-02-14'
  },
  {
    idProveedor: 'PRV-05',
    nombre: 'Surtidor El Puente - Tarija',
    telefono: '74889911',
    direccion: 'Carretera Potosí - Tarija Km 180, El Puente',
    ciudad: 'Tarija',
    nitCi: '2839102011',
    rubro: 'Combustible (Diésel)',
    contacto: 'Administración El Puente',
    activo: true,
    fechaRegistro: '2026-03-01'
  },
  {
    idProveedor: 'PRV-06',
    nombre: 'Inmobiliaria Altiplano & Galpones Oruro',
    telefono: '73998877',
    direccion: 'Calle Pagador esq. Bolívar #120, Oruro',
    ciudad: 'Oruro',
    nitCi: '8291048201',
    rubro: 'Alquiler de Oficinas y Almacenes',
    contacto: 'Lic. Fernando Quispe',
    activo: true,
    fechaRegistro: '2026-01-15'
  }
];

export const INITIAL_CUENTAS_POR_PAGAR: CuentaPorPagar[] = [
  {
    idCxP: 'CXP-2026-001',
    idProveedor: 'PRV-01',
    nombreProveedor: 'YPFB Estación Central de Servicios Caracollo',
    idViaje: 'VJ-2026-001',
    centroCostoPlaca: '2341-NXZ',
    concepto: 'Crédito institucional diésel ruta Oruro - Potosí',
    montoTotalBs: 2500,
    montoPagadoBs: 1500,
    saldoPendienteBs: 1000,
    fechaEmision: '2026-10-01',
    fechaVencimiento: '2026-10-15',
    estado: 'Parcial',
    nroFacturaBoleta: 'FAC-YPFB-88391',
    notas: 'Saldo pendiente contra presentación de planilla de viaje'
  },
  {
    idCxP: 'CXP-2026-002',
    idProveedor: 'PRV-03',
    nombreProveedor: 'Taller Mecánico Diésel & Llantas Guadalquivir',
    idViaje: 'VJ-2026-001',
    centroCostoPlaca: '2341-NXZ',
    concepto: 'Cambio de 2 llantas de tracción y engrase de ejes',
    montoTotalBs: 3200,
    montoPagadoBs: 2000,
    saldoPendienteBs: 1200,
    fechaEmision: '2026-10-03',
    fechaVencimiento: '2026-10-18',
    estado: 'Parcial',
    nroFacturaBoleta: 'BO-TLL-4412',
    notas: 'Crédito a 15 días acordado con don Teófilo'
  },
  {
    idCxP: 'CXP-2026-003',
    idProveedor: 'PRV-04',
    nombreProveedor: 'Fleteros Express & Reparto Urbano Tarija',
    idViaje: 'VJ-2026-001',
    centroCostoPlaca: '2341-NXZ',
    concepto: 'Comisiones de reparto de carga pesada a domicilio Tarija',
    montoTotalBs: 650,
    montoPagadoBs: 300,
    saldoPendienteBs: 350,
    fechaEmision: '2026-10-04',
    fechaVencimiento: '2026-10-10',
    estado: 'Parcial',
    nroFacturaBoleta: 'REC-FLT-109',
    notas: 'Repartos de mercadería ferretera'
  },
  {
    idCxP: 'CXP-2026-004',
    idProveedor: 'PRV-06',
    nombreProveedor: 'Inmobiliaria Altiplano & Galpones Oruro',
    idViaje: 'VJ-2026-002',
    centroCostoPlaca: '4012-LKP',
    concepto: 'Alquiler mensual galpón de consolidación de carga Oruro',
    montoTotalBs: 1800,
    montoPagadoBs: 0,
    saldoPendienteBs: 1800,
    fechaEmision: '2026-10-01',
    fechaVencimiento: '2026-10-12',
    estado: 'Pendiente',
    nroFacturaBoleta: 'FAC-INM-0921',
    notas: 'Corresponde al mes en curso'
  }
];

export const INITIAL_CATALOGOS: Catalogos = {
  sucursales: ['Oruro', 'Tarija', 'Bermejo', 'Potosí', 'La Paz', 'Santa Cruz'],
  camiones: [
    { placa: '2341-NXZ', modelo: 'Volvo FH 460 - 3 Ejes', choferHabitual: 'Juan Carlos Mamani', capacidadKg: 28000 },
    { placa: '4012-LKP', modelo: 'Scania R450 Streamline', choferHabitual: 'Mario Flores Condori', capacidadKg: 29000 },
    { placa: '1890-BBD', modelo: 'Mercedes-Benz Actros 3344', choferHabitual: 'René Gutierrez Soliz', capacidadKg: 26000 },
    { placa: '3155-YTR', modelo: 'Volvo FH16 Globetrotter', choferHabitual: 'Carlos Quispe Cruz', capacidadKg: 30000 },
  ],
  choferes: [
    { idChofer: 'CHF-01', nombre: 'Juan Carlos Mamani', telefono: '72984512', licencia: 'Cat. C - 4589123', placaAsignada: '2341-NXZ', estado: 'Activo' },
    { idChofer: 'CHF-02', nombre: 'Mario Flores Condori', telefono: '71829304', licencia: 'Cat. C - 3892014', placaAsignada: '4012-LKP', estado: 'Activo' },
    { idChofer: 'CHF-03', nombre: 'René Gutierrez Soliz', telefono: '76192837', licencia: 'Cat. C - 5192834', placaAsignada: '1890-BBD', estado: 'Activo' },
    { idChofer: 'CHF-04', nombre: 'Carlos Quispe Cruz', telefono: '73928174', licencia: 'Cat. C - 6182940', placaAsignada: '3155-YTR', estado: 'Activo' }
  ],
  clientes: [
    { idCliente: 'CLI-01', nombre: 'Comercializadora El Sur S.R.L.', telefono: '72984512', direccion: 'Calle Comercio #450, Zona Central', ciudad: 'Tarija', nitCi: '1029384019', activo: true },
    { idCliente: 'CLI-02', nombre: 'Ferretería Guadalquivir', telefono: '71829304', direccion: 'Av. Las Panosas #120, Mercado Campesino', ciudad: 'Tarija', nitCi: '4839201015', activo: true },
    { idCliente: 'CLI-03', nombre: 'Importadora Los Andes Bermejo', telefono: '76192837', direccion: 'Av. Bolivar esq. Potosí #89', ciudad: 'Bermejo', nitCi: '3920192014', activo: true },
    { idCliente: 'CLI-04', nombre: 'Distribuidora Central La Paz', telefono: '73928174', direccion: 'Av. Juan Pablo II #320', ciudad: 'La Paz', nitCi: '8291039012', activo: true },
    { idCliente: 'CLI-05', nombre: 'Tienda La Ganga Bermejo', telefono: '74839201', direccion: 'Calle Sucre #221', ciudad: 'Bermejo', nitCi: '5920194017', activo: true }
  ],
  proveedores: INITIAL_PROVEEDORES,
  cuentasPorPagar: [],
  categoriasGastoRuta: [
    'Combustible (Diésel)',
    'Peajes y Balanzas',
    'Viáticos Chofer',
    'Mecánica Menor / Llantas',
    'Policía / Tránsito',
    'Otros Ruta'
  ],
  categoriasIngresoDestino: [
    'Cobro Flete Saldo',
    'Servicio Delivery',
    'Almacenaje'
  ],
  categoriasGastoDestino: [
    'Comisión Cobrador',
    'Fletero Local / Moto',
    'Carga y Estiba Local'
  ],
  cajasCuentas: [
    'Caja Sucursal Oruro',
    'Caja Sucursal Tarija',
    'Caja Sucursal Bermejo',
    'Caja Sucursal Potosí',
    'Caja Sucursal La Paz',
    'Caja Sucursal Santa Cruz',
    'Efectivo Chofer Ruta',
    'Cuenta Bancaria Central',
    'Billetera Móvil QR / Tigo',
    'Tarjeta Débito Empresarial'
  ],
  empresa: INITIAL_EMPRESA
};

export const INITIAL_VIAJES: Viaje[] = [
  {
    idViaje: 'VJ-2026-001',
    placaCamion: '2341-NXZ',
    choferAsignado: 'Juan Carlos Mamani',
    fechaSalida: '2026-10-01',
    fechaLlegada: '2026-10-04',
    estadoViaje: 'En Reparto',
    observacionesRuta: 'Ruta Oruro - Potosí - Tarija - Bermejo. Despacho consolidado de mercadería y repuestos pesados.',
    origen: 'Oruro',
    destino: 'Tarija / Bermejo',
    fletesManifiestosBs: 18700,
    gastosRutaBs: 2450,
    utilidadViajeBs: 16250,
    margenPct: 86.9,
    cobradoDestinoBs: 3500
  },
  {
    idViaje: 'VJ-2026-002',
    placaCamion: '4012-LKP',
    choferAsignado: 'Mario Flores Condori',
    fechaSalida: '2026-10-03',
    fechaLlegada: '2026-10-06',
    estadoViaje: 'En Tránsito',
    observacionesRuta: 'Ruta La Paz - Cochabamba - Santa Cruz. Insumos farmacéuticos y paquetería.',
    origen: 'La Paz',
    destino: 'Santa Cruz',
    fletesManifiestosBs: 12500,
    gastosRutaBs: 1800,
    utilidadViajeBs: 10700,
    margenPct: 85.6,
    cobradoDestinoBs: 0
  },
  {
    idViaje: 'VJ-2026-003',
    placaCamion: '1890-BBD',
    choferAsignado: 'René Gutierrez Soliz',
    fechaSalida: '2026-09-27',
    fechaLlegada: '2026-09-30',
    estadoViaje: 'Liquidado / Cerrado',
    observacionesRuta: 'Ruta Santa Cruz - Yacuiba - Tarija. Viaje completado sin novedades.',
    origen: 'Santa Cruz',
    destino: 'Tarija',
    fletesManifiestosBs: 15400,
    gastosRutaBs: 3100,
    utilidadViajeBs: 12300,
    margenPct: 79.8,
    cobradoDestinoBs: 4200
  }
];

export const INITIAL_MANIFIESTOS_ORIGEN: ManifiestoOrigen[] = [
  {
    idManifiesto: 'MAN-OR-089',
    nroManifiestoMIC: 'MIC-DTA-5542',
    idViajeAsignado: 'VJ-2026-001',
    sucursalOrigen: 'Oruro',
    fechaEmision: '2026-10-01',
    estadoManifiesto: 'En Destino',
    fleteTotalBs: 18700,
    cobradoOrigenBs: 13000,
    saldoCobrarDestinosBs: 2200,
    porcCobranza: 88.2
  },
  {
    idManifiesto: 'MAN-LP-045',
    nroManifiestoMIC: 'MIC-DTA-5548',
    idViajeAsignado: 'VJ-2026-002',
    sucursalOrigen: 'La Paz',
    fechaEmision: '2026-10-03',
    estadoManifiesto: 'Despachado',
    fleteTotalBs: 12500,
    cobradoOrigenBs: 8000,
    saldoCobrarDestinosBs: 4500,
    porcCobranza: 64.0
  }
];

export const INITIAL_MANIFIESTOS_DESTINO: ManifiestoDestino[] = [
  {
    idSubManifiesto: 'SUB-089-TJA-01',
    idManifiestoPadre: 'MAN-OR-089',
    idViaje: 'VJ-2026-001',
    nroManifiesto: 'MIC-DTA-5542-TJA1',
    sucursalDestino: 'Tarija',
    fleteAsignadoBs: 8500,
    pagadoOrigenBs: 6000,
    porPagarDestinoBs: 2500,
    saldoInicialCobrarBs: 2500,
    cobrosRealizadosBs: 2500,
    ingresosDeliveryOtrosBs: 120,
    gastosComisionesBs: 90,
    recaudacionNetaCajaBs: 2530,
    saldoPendienteClienteBs: 0,
    estadoLiquidacion: 'Liquidado en Sucursal',
    destinatario: 'Comercializadora El Sur S.R.L.',
    remitente: 'Importadora Andina Oruro',
    descripcionCarga: '6 Pallets Repuestos de Maquinaria Minera y Filtros',
    telefonoContacto: '72984512',
    direccionDestinatario: 'Calle Comercio #450, Zona Central',
    metodoCobroOrigen: 'Efectivo en Agencia',
    cuentaAfectadaOrigen: 'Caja Sucursal Oruro',
    estadoLiquidacionAgencia: 'Liquidado a Central',
    modalidadCobroDestino: 'Agencia Recauda en Destino y Rinde a Empresa',
    tipoDeudor: 'AGENCIA',
    idDeudor: 'Tarija',
    nombreDeudor: 'Agencia Tarija',
    agenciaDestinoResponsable: 'Tarija',
    estadoCobranzaDestino: 'Cobrado / Liquidado a Empresa'
  },
  {
    idSubManifiesto: 'SUB-089-TJA-02',
    idManifiestoPadre: 'MAN-OR-089',
    idViaje: 'VJ-2026-001',
    nroManifiesto: 'MIC-DTA-5542-TJA2',
    sucursalDestino: 'Tarija',
    fleteAsignadoBs: 6200,
    pagadoOrigenBs: 5000,
    porPagarDestinoBs: 1200,
    saldoInicialCobrarBs: 1200,
    cobrosRealizadosBs: 700,
    ingresosDeliveryOtrosBs: 50,
    gastosComisionesBs: 40,
    recaudacionNetaCajaBs: 710,
    saldoPendienteClienteBs: 500,
    estadoLiquidacion: 'En Reparto',
    destinatario: 'Ferretería Guadalquivir',
    remitente: 'Distribuidora Central Oruro',
    descripcionCarga: '45 Cajas Herramientas Industriales y Pernos',
    telefonoContacto: '71829304',
    direccionDestinatario: 'Av. Las Panosas #120, Mercado Campesino',
    metodoCobroOrigen: 'Por Liquidar / Crédito Agencia',
    cuentaAfectadaOrigen: 'CxC Agencia Oruro',
    estadoLiquidacionAgencia: 'Pendiente de Liquidación',
    modalidadCobroDestino: 'Agencia Recauda en Destino y Rinde a Empresa',
    tipoDeudor: 'AGENCIA',
    idDeudor: 'Tarija',
    nombreDeudor: 'Agencia Tarija',
    agenciaDestinoResponsable: 'Tarija',
    estadoCobranzaDestino: 'Pendiente de Cobro y Liquidación por Agencia'
  },
  {
    idSubManifiesto: 'SUB-089-BER-01',
    idManifiestoPadre: 'MAN-OR-089',
    idViaje: 'VJ-2026-001',
    nroManifiesto: 'MIC-DTA-5542-BER1',
    sucursalDestino: 'Bermejo',
    fleteAsignadoBs: 4000,
    pagadoOrigenBs: 2000,
    porPagarDestinoBs: 2000,
    saldoInicialCobrarBs: 2000,
    cobrosRealizadosBs: 300,
    ingresosDeliveryOtrosBs: 30,
    gastosComisionesBs: 20,
    recaudacionNetaCajaBs: 310,
    saldoPendienteClienteBs: 1700,
    estadoLiquidacion: 'En Reparto',
    destinatario: 'Agencia Frontera Bermejo',
    remitente: 'Textiles del Altiplano',
    descripcionCarga: '20 Fardos Confección y Ropa de Trabajo',
    telefonoContacto: '76192837',
    direccionDestinatario: 'Av. Bolivar esq. Potosí #89',
    metodoCobroOrigen: 'Efectivo en Agencia',
    cuentaAfectadaOrigen: 'Caja Agencia Oruro',
    estadoLiquidacionAgencia: 'Pendiente de Liquidación',
    modalidadCobroDestino: 'Cobro Directo Empresa / Cliente',
    tipoDeudor: 'CLIENTE',
    idDeudor: 'CLI-BER-01',
    nombreDeudor: 'Agencia Frontera Bermejo',
    estadoCobranzaDestino: 'Pendiente de Pago Cliente'
  }
];

export const INITIAL_MOVIMIENTOS: MovimientoManifDestino[] = [
  {
    idMovimiento: 'MOV-2026-101',
    idSubManifiesto: 'SUB-089-TJA-01',
    sucursal: 'Tarija',
    tipoMovimiento: 'Ingreso',
    categoriaConcepto: 'Cobro Flete Saldo',
    importeBs: 2500,
    cajaCuentaAfectada: 'Caja Sucursal Tarija',
    fechaHora: '2026-10-02 11:30',
    nroComprobante: 'REC-TJA-0412',
    detalleOperacion: 'Cancelación saldo total flete Comercializadora El Sur'
  },
  {
    idMovimiento: 'MOV-2026-102',
    idSubManifiesto: 'SUB-089-TJA-01',
    sucursal: 'Tarija',
    tipoMovimiento: 'Ingreso',
    categoriaConcepto: 'Servicio Delivery',
    importeBs: 120,
    cajaCuentaAfectada: 'Caja Sucursal Tarija',
    fechaHora: '2026-10-02 11:35',
    nroComprobante: 'DEL-TJA-0089',
    detalleOperacion: 'Entrega puerta a puerta con camión liviano zona Senac'
  },
  {
    idMovimiento: 'MOV-2026-103',
    idSubManifiesto: 'SUB-089-TJA-01',
    sucursal: 'Tarija',
    tipoMovimiento: 'Gasto',
    categoriaConcepto: 'Comisión Cobrador',
    importeBs: 90,
    cajaCuentaAfectada: 'Caja Sucursal Tarija',
    fechaHora: '2026-10-02 11:40',
    nroComprobante: 'EGR-TJA-0045',
    detalleOperacion: 'Pago comisión cobrador externo y fletero entrega Senac'
  },
  {
    idMovimiento: 'MOV-2026-104',
    idSubManifiesto: 'SUB-089-TJA-02',
    sucursal: 'Tarija',
    tipoMovimiento: 'Ingreso',
    categoriaConcepto: 'Cobro Flete Saldo',
    importeBs: 660,
    cajaCuentaAfectada: 'Caja Sucursal Tarija',
    fechaHora: '2026-10-03 16:15',
    nroComprobante: 'REC-TJA-0419',
    detalleOperacion: 'Abono parcial Ferretería Guadalquivir (quedan Bs 500)'
  },
  {
    idMovimiento: 'MOV-2026-105',
    idSubManifiesto: 'SUB-089-BER-01',
    sucursal: 'Bermejo',
    tipoMovimiento: 'Ingreso',
    categoriaConcepto: 'Cobro Flete Saldo',
    importeBs: 250,
    cajaCuentaAfectada: 'Caja Sucursal Bermejo',
    fechaHora: '2026-10-04 09:40',
    nroComprobante: 'REC-BER-0188',
    detalleOperacion: 'Primer retiro parcial fardos textiles'
  },
  {
    idMovimiento: 'MOV-2026-106',
    idSubManifiesto: 'SUB-089-BER-01',
    sucursal: 'Bermejo',
    tipoMovimiento: 'Gasto',
    categoriaConcepto: 'Fletero Local / Moto',
    importeBs: 20,
    cajaCuentaAfectada: 'Caja Sucursal Bermejo',
    fechaHora: '2026-10-04 09:50',
    nroComprobante: 'EGR-BER-0012',
    detalleOperacion: 'Pago estiba y traslado moto-flete'
  }
];

export const INITIAL_GASTOS_RUTA: GastoRutaCamion[] = [
  {
    idGastoRuta: 'GST-2026-001',
    idViajeAsignado: 'VJ-2026-001',
    placaCamion: '2341-NXZ',
    fechaHora: '2026-10-01 08:30',
    categoriaGasto: 'Combustible (Diésel)',
    importeBs: 1650,
    litrosDiesel: 443.5,
    cajaCuentaUtilizada: 'Efectivo Chofer Ruta',
    nroFacturaBoleta: 'FAC-781902',
    detalleGasto: 'Carga completa 443.5 Litros Surtidor Las Palmeras (Caracollo)',
    comprobanteFotoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60',
    sincronizado: true
  },
  {
    idGastoRuta: 'GST-2026-002',
    idViajeAsignado: 'VJ-2026-001',
    placaCamion: '2341-NXZ',
    fechaHora: '2026-10-01 14:20',
    categoriaGasto: 'Peajes y Balanzas',
    importeBs: 280,
    cajaCuentaUtilizada: 'Efectivo Chofer Ruta',
    nroFacturaBoleta: 'BOLETAS-VNC-3',
    detalleGasto: 'Peajes Vías Bolivia tramo Oruro - Challapata - Potosí (3 retenes)',
    sincronizado: true
  },
  {
    idGastoRuta: 'GST-2026-003',
    idViajeAsignado: 'VJ-2026-001',
    placaCamion: '2341-NXZ',
    fechaHora: '2026-10-02 19:10',
    categoriaGasto: 'Peajes y Balanzas',
    importeBs: 220,
    cajaCuentaUtilizada: 'Efectivo Chofer Ruta',
    nroFacturaBoleta: 'BOLETAS-TJA-2',
    detalleGasto: 'Retenes Camargo y San Lorenzo llegada Tarija',
    sincronizado: true
  },
  {
    idGastoRuta: 'GST-2026-004',
    idViajeAsignado: 'VJ-2026-001',
    placaCamion: '2341-NXZ',
    fechaHora: '2026-10-03 12:00',
    categoriaGasto: 'Viáticos Chofer',
    importeBs: 300,
    cajaCuentaUtilizada: 'Efectivo Chofer Ruta',
    nroFacturaBoleta: 'REC-CHOFER-01',
    detalleGasto: 'Alimentación y pernocte Chofer y Ayudante',
    sincronizado: true
  }
];

export const INITIAL_CAJAS: CajaCuenta[] = [
  {
    nombre: 'Caja Sucursal Oruro',
    tipo: 'Caja Sucursal',
    ubicacion: 'Oruro',
    saldoInicial: 2500,
    totalCobrado: 0,
    totalGastado: 0,
    saldoDisponible: 2500
  },
  {
    nombre: 'Caja Sucursal Tarija',
    tipo: 'Caja Sucursal',
    ubicacion: 'Tarija',
    saldoInicial: 1800,
    totalCobrado: 3280,
    totalGastado: 190,
    saldoDisponible: 4890
  },
  {
    nombre: 'Caja Sucursal Bermejo',
    tipo: 'Caja Sucursal',
    ubicacion: 'Bermejo',
    saldoInicial: 1200,
    totalCobrado: 250,
    totalGastado: 20,
    saldoDisponible: 1430
  },
  {
    nombre: 'Caja Sucursal Potosí',
    tipo: 'Caja Sucursal',
    ubicacion: 'Potosí',
    saldoInicial: 1000,
    totalCobrado: 0,
    totalGastado: 0,
    saldoDisponible: 1000
  },
  {
    nombre: 'Efectivo Chofer Ruta',
    tipo: 'Efectivo Chofer',
    ubicacion: 'Ruta / Camiones',
    saldoInicial: 2000,
    totalCobrado: 0,
    totalGastado: 2450,
    saldoDisponible: -450
  },
  {
    nombre: 'Cuenta Bancaria Central',
    tipo: 'Banco',
    ubicacion: 'Central',
    saldoInicial: 35000,
    totalCobrado: 0,
    totalGastado: 0,
    saldoDisponible: 35000
  },
  {
    nombre: 'Billetera Móvil QR / Tigo',
    tipo: 'Billetera',
    ubicacion: 'Central / Digital',
    saldoInicial: 3500,
    totalCobrado: 450,
    totalGastado: 120,
    saldoDisponible: 3830
  }
];

// -------------------------------------------------------------
// DATOS INICIALES PARA EL RASTREADOR DE INGRESOS Y GASTOS DIARIOS
// -------------------------------------------------------------

export const INITIAL_CATEGORIAS: CategoriaFinanciera[] = [
  // Gastos
  { id: 'cat-g-combustible', nombre: 'Combustible (Diésel)', tipo: 'Gasto', icono: 'Fuel', color: '#f59e0b', esPredefinida: true },
  { id: 'cat-g-peajes', nombre: 'Peajes y Balanzas', tipo: 'Gasto', icono: 'Receipt', color: '#ec4899', esPredefinida: true },
  { id: 'cat-g-viaticos', nombre: 'Viáticos y Alimentación', tipo: 'Gasto', icono: 'Utensils', color: '#8b5cf6', esPredefinida: true },
  { id: 'cat-g-mantenimiento', nombre: 'Mantenimiento y Repuestos', tipo: 'Gasto', icono: 'Wrench', color: '#ef4444', esPredefinida: true },
  { id: 'cat-g-alquiler', nombre: 'Alquiler de Oficinas / Agencias', tipo: 'Gasto', icono: 'Building2', color: '#6366f1', esPredefinida: true },
  { id: 'cat-g-servicios', nombre: 'Servicios Básicos e Internet', tipo: 'Gasto', icono: 'Zap', color: '#06b6d4', esPredefinida: true },
  { id: 'cat-g-comisiones', nombre: 'Comisiones y Fleteros Locales', tipo: 'Gasto', icono: 'Truck', color: '#f97316', esPredefinida: true },
  { id: 'cat-g-impuestos', nombre: 'Impuestos y Trámites', tipo: 'Gasto', icono: 'Landmark', color: '#64748b', esPredefinida: true },
  { id: 'cat-g-seguros', nombre: 'Seguros SOAT y Pólizas', tipo: 'Gasto', icono: 'Shield', color: '#3b82f6', esPredefinida: true },
  { id: 'cat-g-otros', nombre: 'Otros Gastos Operativos', tipo: 'Gasto', icono: 'Coins', color: '#a855f7', esPredefinida: true },

  // Ingresos
  { id: 'cat-i-fletes', nombre: 'Fletes Despachos MIC', tipo: 'Ingreso', icono: 'TrendingUp', color: '#10b981', esPredefinida: true },
  { id: 'cat-i-cobranzas', nombre: 'Cobranza Encomiendas Destino', tipo: 'Ingreso', icono: 'PackageCheck', color: '#14b8a6', esPredefinida: true },
  { id: 'cat-i-delivery', nombre: 'Servicio Delivery Puerta a Puerta', tipo: 'Ingreso', icono: 'Truck', color: '#84cc16', esPredefinida: true },
  { id: 'cat-i-almacenaje', nombre: 'Almacenaje y Custodia', tipo: 'Ingreso', icono: 'Archive', color: '#3b82f6', esPredefinida: true },
  { id: 'cat-i-otros', nombre: 'Otros Ingresos Varios', tipo: 'Ingreso', icono: 'Coins', color: '#22c55e', esPredefinida: true }
];

export const INITIAL_TRANSACCIONES: TransaccionDiaria[] = [
  {
    idTransaccion: 'TX-2026-001',
    tipo: 'Gasto',
    fecha: '2026-10-01',
    categoria: 'Combustible (Diésel)',
    montoBs: 1650,
    metodoPago: 'Efectivo Chofer Ruta',
    notas: 'Carga de diésel 443.5L para viaje VJ-2026-001 surtidor Caracollo',
    sucursal: 'Oruro',
    placaCamion: '2341-NXZ',
    idViaje: 'VJ-2026-001',
    nroManifiesto: 'MIC-DTA-5542',
    idProveedor: 'PRV-01',
    nombreProveedor: 'YPFB Estación Central de Servicios Caracollo',
    sincronizado: true
  },
  {
    idTransaccion: 'TX-2026-002',
    tipo: 'Gasto',
    fecha: '2026-10-01',
    categoria: 'Peajes y Balanzas',
    montoBs: 280,
    metodoPago: 'Efectivo Chofer Ruta',
    notas: 'Peajes Vías Bolivia tramo Oruro - Challapata - Potosí',
    sucursal: 'Oruro',
    placaCamion: '2341-NXZ',
    idViaje: 'VJ-2026-001',
    idProveedor: 'PRV-02',
    nombreProveedor: 'Vías Bolivia - Administradora de Peajes y Pesaje',
    sincronizado: true
  },
  {
    idTransaccion: 'TX-2026-003',
    tipo: 'Ingreso',
    fecha: '2026-10-01',
    categoria: 'Fletes Despachos MIC',
    montoBs: 13000,
    metodoPago: 'Cuenta Bancaria Central',
    notas: 'Anticipo cobrado en origen por fletes manifiesto MIC-DTA-5542',
    sucursal: 'Oruro',
    placaCamion: '2341-NXZ',
    idViaje: 'VJ-2026-001',
    nroManifiesto: 'MIC-DTA-5542',
    sincronizado: true
  },
  {
    idTransaccion: 'TX-2026-004',
    tipo: 'Gasto',
    fecha: '2026-10-02',
    categoria: 'Peajes y Balanzas',
    montoBs: 220,
    metodoPago: 'Efectivo Chofer Ruta',
    notas: 'Retenes Camargo y San Lorenzo llegada Tarija',
    sucursal: 'Tarija',
    placaCamion: '2341-NXZ',
    idViaje: 'VJ-2026-001',
    sincronizado: true
  },
  {
    idTransaccion: 'TX-2026-005',
    tipo: 'Ingreso',
    fecha: '2026-10-02',
    categoria: 'Cobranza Encomiendas Destino',
    montoBs: 2500,
    metodoPago: 'Caja Sucursal Tarija',
    notas: 'Cobro saldo entrega repuestos minería Comercializadora El Sur',
    sucursal: 'Tarija',
    nroManifiesto: 'MIC-DTA-5542-TJA1',
    sincronizado: true
  },
  {
    idTransaccion: 'TX-2026-006',
    tipo: 'Ingreso',
    fecha: '2026-10-02',
    categoria: 'Servicio Delivery Puerta a Puerta',
    montoBs: 120,
    metodoPago: 'Caja Sucursal Tarija',
    notas: 'Flete urbano entrega a domicilio zona Senac',
    sucursal: 'Tarija',
    sincronizado: true
  },
  {
    idTransaccion: 'TX-2026-007',
    tipo: 'Gasto',
    fecha: '2026-10-02',
    categoria: 'Comisiones y Fleteros Locales',
    montoBs: 90,
    metodoPago: 'Caja Sucursal Tarija',
    notas: 'Pago chofer de reparto local camioneta Senac',
    sucursal: 'Tarija',
    sincronizado: true
  },
  {
    idTransaccion: 'TX-2026-008',
    tipo: 'Gasto',
    fecha: '2026-10-03',
    categoria: 'Viáticos y Alimentación',
    montoBs: 300,
    metodoPago: 'Efectivo Chofer Ruta',
    notas: 'Alimentación y pernocte chofer y estibador ruta Tarija',
    sucursal: 'Tarija',
    placaCamion: '2341-NXZ',
    idViaje: 'VJ-2026-001',
    sincronizado: true
  },
  {
    idTransaccion: 'TX-2026-009',
    tipo: 'Ingreso',
    fecha: '2026-10-03',
    categoria: 'Cobranza Encomiendas Destino',
    montoBs: 660,
    metodoPago: 'Caja Sucursal Tarija',
    notas: 'Cobro parcial Ferretería Guadalquivir pernos y herramientas',
    sucursal: 'Tarija',
    nroManifiesto: 'MIC-DTA-5542-TJA2',
    sincronizado: true
  },
  {
    idTransaccion: 'TX-2026-010',
    tipo: 'Gasto',
    fecha: '2026-10-03',
    categoria: 'Alquiler de Oficinas / Agencias',
    montoBs: 1200,
    metodoPago: 'Cuenta Bancaria Central',
    notas: 'Pago mensual alquiler galpón y oficina sucursal Tarija',
    sucursal: 'Tarija',
    sincronizado: true
  },
  {
    idTransaccion: 'TX-2026-011',
    tipo: 'Traspaso',
    fecha: '2026-10-03',
    categoria: 'Traspaso de Fondos',
    montoBs: 1500,
    metodoPago: 'Caja Sucursal Tarija',
    cuentaDestino: 'Cuenta Bancaria Central',
    notas: 'Remesa de recaudación semanal de encomiendas enviada a cuenta central',
    sucursal: 'Tarija',
    sincronizado: true
  }
];

export const INITIAL_PRESUPUESTOS: PresupuestoMensual[] = [
  { id: 'pre-1', categoria: 'Combustible (Diésel)', montoPresupuestadoBs: 12000, mesAno: '2026-10' },
  { id: 'pre-2', categoria: 'Peajes y Balanzas', montoPresupuestadoBs: 2500, mesAno: '2026-10' },
  { id: 'pre-3', categoria: 'Viáticos y Alimentación', montoPresupuestadoBs: 2000, mesAno: '2026-10' },
  { id: 'pre-4', categoria: 'Mantenimiento y Repuestos', montoPresupuestadoBs: 4500, mesAno: '2026-10' },
  { id: 'pre-5', categoria: 'Alquiler de Oficinas / Agencias', montoPresupuestadoBs: 3500, mesAno: '2026-10' },
  { id: 'pre-6', categoria: 'Comisiones y Fleteros Locales', montoPresupuestadoBs: 1500, mesAno: '2026-10' },
  { id: 'pre-7', categoria: 'Servicios Básicos e Internet', montoPresupuestadoBs: 800, mesAno: '2026-10' }
];

export const INITIAL_RECORDATORIOS: RecordatorioRecurrente[] = [
  {
    id: 'rec-1',
    titulo: 'Pago Seguro SOAT Camión 2341-NXZ',
    montoBs: 650,
    tipo: 'Gasto',
    categoria: 'Seguros SOAT y Pólizas',
    frecuencia: 'Anual',
    proximaFecha: '2026-10-15',
    metodoPago: 'Cuenta Bancaria Central',
    activo: true,
    notas: 'Renovación anual obligatoria con aseguradora Alianza'
  },
  {
    id: 'rec-2',
    titulo: 'Alquiler Galpón y Agencia Oruro',
    montoBs: 1800,
    tipo: 'Gasto',
    categoria: 'Alquiler de Oficinas / Agencias',
    frecuencia: 'Mensual',
    proximaFecha: '2026-10-10',
    metodoPago: 'Cuenta Bancaria Central',
    activo: true,
    notas: 'Depósito a propietario señor Quispe'
  },
  {
    id: 'rec-3',
    titulo: 'Mantenimiento Preventivo y Cambio de Aceite Scania 4012-LKP',
    montoBs: 2800,
    tipo: 'Gasto',
    categoria: 'Mantenimiento y Repuestos',
    frecuencia: 'Mensual',
    proximaFecha: '2026-10-20',
    metodoPago: 'Cuenta Bancaria Central',
    activo: true,
    notas: 'Revisión en taller autorizado a los 15.000 km'
  },
  {
    id: 'rec-4',
    titulo: 'Facturación Mensual Corporativa Minera San Cristóbal',
    montoBs: 24000,
    tipo: 'Ingreso',
    categoria: 'Fletes Despachos MIC',
    frecuencia: 'Mensual',
    proximaFecha: '2026-10-25',
    metodoPago: 'Cuenta Bancaria Central',
    activo: true,
    notas: 'Cobro de fletes por contrato mensual consolidado'
  }
];

export const INITIAL_SEGURIDAD: ConfigSeguridad = {
  pinHabilitado: false,
  pinCodigo: '1234',
  bloqueoInactividad: false,
  tiempoMinutos: 5,
  huellaHabilitada: true
};

export const INITIAL_REPORTES_CHOFER: ReporteViajeChofer[] = [
  {
    idReporteChofer: 'REP-CHOF-VJ-2026-001',
    idViaje: 'VJ-2026-001',
    placaCamion: '2341-NXZ',
    choferAsignado: 'Juan Carlos Mamani',
    centroCosto: 'Tarija / Bermejo',
    rutaOrigen: 'Oruro',
    rutaDestino: 'Tarija / Bermejo',
    manifiestosAsociados: 'MIC-2026-001, MIC-2026-002',
    fechaInicio: '2026-10-01',
    fechaCierre: '',
    totalIngresosBs: 4500,
    totalGastosBs: 2450,
    saldoFavorContraBs: 2050,
    estadoReporte: 'Borrador',
    observaciones: 'Viaje en ruta con entregas en Potosí y descarga final en almacenes Tarija.',
    ingresos: [
      {
        idIngresoChofer: 'ING-01',
        idReporteChofer: 'REP-CHOF-VJ-2026-001',
        idViaje: 'VJ-2026-001',
        fecha: '2026-10-01',
        conceptoIngreso: 'Traspaso Viáticos Central',
        detalleGlosa: 'Fondo de viáticos inicial transferido desde Caja Central',
        origenFondo: 'Traspaso Central',
        montoBs: 2500,
        nroReciboComprobante: 'TRF-0912'
      },
      {
        idIngresoChofer: 'ING-02',
        idReporteChofer: 'REP-CHOF-VJ-2026-001',
        idViaje: 'VJ-2026-001',
        fecha: '2026-10-03',
        conceptoIngreso: 'Cobro Flete Destino',
        detalleGlosa: 'Cobro en efectivo flete saldo Ferretería Guadalquivir',
        origenFondo: 'Efectivo',
        montoBs: 2000,
        nroReciboComprobante: 'REC-001'
      }
    ],
    gastos: [
      {
        idGastoChofer: 'GST-01',
        idReporteChofer: 'REP-CHOF-VJ-2026-001',
        idViaje: 'VJ-2026-001',
        placaCamion: '2341-NXZ',
        fecha: '2026-10-01',
        conceptoGasto: 'Combustible / Diésel',
        detalleGasto: 'Carga de diésel 300 Litros en Surtidor Caracollo',
        idProveedor: 'PRV-01',
        nroFacturaRecibo: 'FAC-88192',
        montoBs: 1116,
        comprobanteFotoUrl: ''
      },
      {
        idGastoChofer: 'GST-02',
        idReporteChofer: 'REP-CHOF-VJ-2026-001',
        idViaje: 'VJ-2026-001',
        placaCamion: '2341-NXZ',
        fecha: '2026-10-02',
        conceptoGasto: 'Peajes / Pesajes',
        detalleGasto: 'Peajes tramo Oruro - Potosí - Camargo',
        idProveedor: 'PRV-02',
        nroFacturaRecibo: 'BO-VB-99120',
        montoBs: 184,
        comprobanteFotoUrl: ''
      },
      {
        idGastoChofer: 'GST-03',
        idReporteChofer: 'REP-CHOF-VJ-2026-001',
        idViaje: 'VJ-2026-001',
        placaCamion: '2341-NXZ',
        fecha: '2026-10-03',
        conceptoGasto: 'Viáticos / Alimentación',
        detalleGasto: 'Alimentación y hospedaje chofer ruta Potosí',
        nroFacturaRecibo: 'TKT-041',
        montoBs: 350,
        comprobanteFotoUrl: ''
      },
      {
        idGastoChofer: 'GST-04',
        idReporteChofer: 'REP-CHOF-VJ-2026-001',
        idViaje: 'VJ-2026-001',
        placaCamion: '2341-NXZ',
        fecha: '2026-10-03',
        conceptoGasto: 'Estibadores / Cargadores',
        detalleGasto: 'Descarga de bultos ferretería en depósito Tarija',
        idProveedor: 'PRV-04',
        nroFacturaRecibo: 'REC-EST-12',
        montoBs: 800,
        comprobanteFotoUrl: ''
      }
    ]
  }
];
