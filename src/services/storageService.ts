import {
  Viaje,
  ManifiestoOrigen,
  ManifiestoDestino,
  MovimientoManifDestino,
  GastoRutaCamion,
  CajaCuenta,
  Catalogos,
  PendingSyncItem,
  TransaccionDiaria,
  CategoriaFinanciera,
  PresupuestoMensual,
  RecordatorioRecurrente,
  TraspasoFondos,
  ConfigSeguridad,
  Cliente,
  Proveedor,
  CuentaPorPagar,
  DatosEmpresa,
  ReporteViajeChofer,
  DetalleIngresoChofer,
  DetalleGastoChofer,
  DiagnosticoIntegridadReport,
  DetalleHuerfano,
  DetalleDescuadreCaja,
  DetalleInconsistenciaManifiesto,
  TrazaAuditoriaMantenimiento,
  BackupDriveInfo
} from '../types';
import { calcularSaldosSubManifiesto } from '../utils/subManifiestoSaldos';
import {
  INITIAL_CATALOGOS,
  INITIAL_PROVEEDORES,
  INITIAL_CUENTAS_POR_PAGAR,
  INITIAL_VIAJES,
  INITIAL_MANIFIESTOS_ORIGEN,
  INITIAL_MANIFIESTOS_DESTINO,
  INITIAL_MOVIMIENTOS,
  INITIAL_GASTOS_RUTA,
  INITIAL_CAJAS,
  INITIAL_CATEGORIAS,
  INITIAL_TRANSACCIONES,
  INITIAL_PRESUPUESTOS,
  INITIAL_RECORDATORIOS,
  INITIAL_SEGURIDAD,
  INITIAL_EMPRESA,
  INITIAL_REPORTES_CHOFER
} from '../data/initialData';

const STORAGE_KEYS = {
  VIAJES: 'transpodrive_viajes',
  MANIFIESTOS_ORIGEN: 'transpodrive_manifiestos_origen',
  MANIFIESTOS_DESTINO: 'transpodrive_manifiestos_destino',
  MOVIMIENTOS: 'transpodrive_movimientos',
  GASTOS_RUTA: 'transpodrive_gastos_ruta',
  CAJAS: 'transpodrive_cajas',
  CATALOGOS: 'transpodrive_catalogos',
  PENDING_SYNC: 'transpodrive_pending_sync',
  GAS_URL: 'transpodrive_apps_script_url',
  LAST_SYNC: 'transpodrive_last_sync',
  TRANSACCIONES: 'transpodrive_transacciones_diarias',
  CATEGORIAS: 'transpodrive_categorias_financieras',
  PRESUPUESTOS: 'transpodrive_presupuestos_mensuales',
  RECORDATORIOS: 'transpodrive_recordatorios',
  TRASPASOS: 'transpodrive_traspasos',
  SEGURIDAD: 'transpodrive_seguridad',
  REPORTES_CHOFER: 'transpodrive_reportes_viaje_chofer',
  AUDIT_LOGS: 'transpodrive_audit_logs'
};

export class StorageService {
  private static instance: StorageService;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private ensureInitialized(): void {
    const gas = localStorage.getItem(STORAGE_KEYS.GAS_URL);
    if (!gas || gas.includes('AKfycbwIgZC')) {
      localStorage.setItem(STORAGE_KEYS.GAS_URL, 'https://script.google.com/macros/s/AKfycbxrs4jndFwD2dQgoixqYNunW5XieA9ZCubozN0O-EmVdxnEqGkAJ4ps7pUrEfJcnUqjAw/exec');
    }
    if (!localStorage.getItem(STORAGE_KEYS.VIAJES)) {
      this.resetToDefaults();
    } else {
      try {
        const rawCat = localStorage.getItem(STORAGE_KEYS.CATALOGOS);
        if (rawCat) {
          const cat = JSON.parse(rawCat);
          if (Array.isArray(cat.cuentasPorPagar) && cat.cuentasPorPagar.length > 0) {
            const rawTxs = localStorage.getItem(STORAGE_KEYS.TRANSACCIONES);
            const rawVjs = localStorage.getItem(STORAGE_KEYS.VIAJES);
            const txs = rawTxs ? JSON.parse(rawTxs) : [];
            const vjs = rawVjs ? JSON.parse(rawVjs) : [];
            const hasOnlyDemoCxP = cat.cuentasPorPagar.every((c: any) => 
              typeof c.idCxP === 'string' && (c.idCxP.startsWith('CXP-2026-') || c.idCxP.startsWith('CXP-DEMO-'))
            );
            if ((txs.length === 0 && vjs.length === 0) || (hasOnlyDemoCxP && txs.length === 0)) {
              cat.cuentasPorPagar = [];
              localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
            }
          }
        }
      } catch (err) {
        console.warn('Error en saneamiento de cuentasPorPagar:', err);
      }
    }

    this.repararSaldosSubManifiestosInterno();
  }

  public repararSaldosSubManifiestosInterno(): void {
    try {
      const rawSubs = localStorage.getItem(STORAGE_KEYS.MANIFIESTOS_DESTINO);
      if (!rawSubs) return;
      const subs: ManifiestoDestino[] = JSON.parse(rawSubs);
      if (!Array.isArray(subs) || subs.length === 0) return;

      const rawTxs = localStorage.getItem(STORAGE_KEYS.TRANSACCIONES);
      const txs: TransaccionDiaria[] = rawTxs ? JSON.parse(rawTxs) : [];
      const rawMovs = localStorage.getItem(STORAGE_KEYS.MOVIMIENTOS);
      const movs: MovimientoManifDestino[] = rawMovs ? JSON.parse(rawMovs) : [];

      // Mapear cobros legítimos de DESTINO (excluyendo cualquier pago efectuado en origen)
      const cobrosDestinoRealBySub: Record<string, number> = {};

      movs.forEach(m => {
        if (m.tipoMovimiento === 'Ingreso' && (m.categoriaConcepto.includes('Flete') || m.categoriaConcepto.includes('Cobro'))) {
          const id = m.idSubManifiesto;
          if (id) {
            cobrosDestinoRealBySub[id] = (cobrosDestinoRealBySub[id] || 0) + Number(m.importeBs || 0);
          }
        }
      });

      txs.forEach(t => {
        if (t.tipo === 'Ingreso' && Number(t.montoBs || 0) > 0 && t.nroManifiesto) {
          const esPagoOrigen = t.categoria === 'Fletes Despachos MIC' || 
                               (t.notas && t.notas.toLowerCase().includes('pago en origen')) ||
                               (t.notas && t.notas.toLowerCase().includes('cobranza en origen'));
          if (!esPagoOrigen) {
            const id = t.nroManifiesto;
            if (!cobrosDestinoRealBySub[id]) {
              cobrosDestinoRealBySub[id] = (cobrosDestinoRealBySub[id] || 0) + Number(t.montoBs);
            }
          }
        }
      });

      let changed = false;
      const subsCorregidos = subs.map(sub => {
        const pagadoOrigen = Number(sub.pagadoOrigenBs || 0);
        let fleteTotal = Number(sub.fleteAsignadoBs || 0);
        let porPagarDestino = Number(sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : (sub.saldoInicialCobrarBs || 0));

        // Consistencia matemática: Flete Total = Pagado Origen + Saldo Cobrar Destino
        if (fleteTotal > 0 && pagadoOrigen > 0 && Math.abs(fleteTotal - (pagadoOrigen + porPagarDestino)) > 0.01) {
          porPagarDestino = Math.max(0, fleteTotal - pagadoOrigen);
          changed = true;
        } else if (fleteTotal === 0 && (pagadoOrigen > 0 || porPagarDestino > 0)) {
          fleteTotal = pagadoOrigen + porPagarDestino;
          changed = true;
        }

        const cobrosDestino = cobrosDestinoRealBySub[sub.idSubManifiesto] || 
                              (sub.nroManifiesto ? cobrosDestinoRealBySub[sub.nroManifiesto] : undefined) || 
                              0;

        const saldoNetoDestino = Math.max(0, parseFloat((porPagarDestino - cobrosDestino).toFixed(2)));

        const esAgencia = sub.tipoResponsableDestino === 'AGENCIA' || 
                          (typeof sub.destinatario === 'string' && sub.destinatario.toLowerCase().startsWith('agencia '));

        const saldoClienteCorrecto = esAgencia ? 0 : saldoNetoDestino;
        const saldoAgenciaCorrecto = esAgencia ? saldoNetoDestino : (sub.saldoPendienteAgenciaBs || 0);

        if (
          Math.abs((sub.saldoInicialCobrarBs || 0) - porPagarDestino) > 0.01 ||
          Math.abs((sub.porPagarDestinoBs || 0) - porPagarDestino) > 0.01 ||
          Math.abs((sub.fleteAsignadoBs || 0) - fleteTotal) > 0.01 ||
          Math.abs((sub.cobrosRealizadosBs || 0) - cobrosDestino) > 0.01 ||
          Math.abs((sub.saldoPendienteClienteBs || 0) - saldoClienteCorrecto) > 0.01 ||
          Math.abs((sub.saldoPendienteAgenciaBs || 0) - saldoAgenciaCorrecto) > 0.01
        ) {
          changed = true;
          return {
            ...sub,
            fleteAsignadoBs: fleteTotal,
            pagadoOrigenBs: pagadoOrigen,
            porPagarDestinoBs: porPagarDestino,
            saldoInicialCobrarBs: porPagarDestino,
            cobrosRealizadosBs: cobrosDestino,
            saldoPendienteClienteBs: saldoClienteCorrecto,
            saldoPendienteAgenciaBs: saldoAgenciaCorrecto,
            estadoLiquidacion: (saldoNetoDestino <= 0.01 ? 'Liquidado en Sucursal' : (cobrosDestino > 0 ? 'Pendiente Parcial' : 'En Reparto')) as any
          };
        }
        return sub;
      });

      if (changed) {
        localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subsCorregidos));
      }
    } catch (err) {
      console.warn('Error reparando saldos de sub-manifiestos:', err);
    }
  }

  public resetToDefaults(): void {
    localStorage.setItem(STORAGE_KEYS.VIAJES, JSON.stringify(INITIAL_VIAJES));
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify(INITIAL_MANIFIESTOS_ORIGEN));
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(INITIAL_MANIFIESTOS_DESTINO));
    localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(INITIAL_MOVIMIENTOS));
    localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(INITIAL_GASTOS_RUTA));
    localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(INITIAL_CAJAS));
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(INITIAL_CATALOGOS));
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(INITIAL_TRANSACCIONES));
    localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(INITIAL_CATEGORIAS));
    localStorage.setItem(STORAGE_KEYS.PRESUPUESTOS, JSON.stringify(INITIAL_PRESUPUESTOS));
    localStorage.setItem(STORAGE_KEYS.RECORDATORIOS, JSON.stringify(INITIAL_RECORDATORIOS));
    localStorage.setItem(STORAGE_KEYS.TRASPASOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SEGURIDAD, JSON.stringify(INITIAL_SEGURIDAD));
    localStorage.setItem(STORAGE_KEYS.REPORTES_CHOFER, JSON.stringify(INITIAL_REPORTES_CHOFER));
  }

  // Getters
  public getViajes(): Viaje[] {
    const raw = localStorage.getItem(STORAGE_KEYS.VIAJES);
    const list: Viaje[] = raw ? JSON.parse(raw) : INITIAL_VIAJES;
    const subs = this.getManifiestosDestino();
    const origenes = this.getManifiestosOrigen();

    return list.map(v => {
      const subsDelViaje = subs.filter(s => s.idViaje === v.idViaje);
      const cobradoDestino = subsDelViaje.reduce((sum, s) => sum + (s.cobrosRealizadosBs || 0), 0);
      const origenesDelViaje = origenes.filter(m => m.idViajeAsignado === v.idViaje);
      const primerOrigen = origenesDelViaje[0]?.sucursalOrigen || v.origen || 'Oruro';
      const destinosDelViaje = Array.from(new Set(subsDelViaje.map(s => s.sucursalDestino).filter(Boolean)));
      const destinoStr = destinosDelViaje.length > 0 ? destinosDelViaje.join(' / ') : (v.destino || 'Tarija');

      return {
        ...v,
        origen: v.origen || primerOrigen,
        destino: v.destino || destinoStr,
        cobradoDestinoBs: cobradoDestino > 0 ? cobradoDestino : (v.cobradoDestinoBs || 0)
      };
    });
  }

  public getManifiestosOrigen(): ManifiestoOrigen[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN);
    return raw ? JSON.parse(raw) : INITIAL_MANIFIESTOS_ORIGEN;
  }

  public getManifiestosDestino(): ManifiestoDestino[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MANIFIESTOS_DESTINO);
    const list: ManifiestoDestino[] = raw ? JSON.parse(raw) : INITIAL_MANIFIESTOS_DESTINO;

    // Garantizar que cada submanifiesto tenga su idViaje y origenViaje asociado mediante el manifiesto padre
    const origenes = this.getManifiestosOrigen();
    const origenesMap = new Map<string, string>();
    const origenesSucursalMap = new Map<string, string>();
    origenes.forEach(m => {
      if (m.idManifiesto) {
        if (m.idViajeAsignado) origenesMap.set(m.idManifiesto, m.idViajeAsignado);
        if (m.sucursalOrigen) origenesSucursalMap.set(m.idManifiesto, m.sucursalOrigen);
      }
    });

    let updated = false;
    const conViajes = list.map(sub => {
      const vId = sub.idViaje || (sub.idManifiestoPadre ? origenesMap.get(sub.idManifiestoPadre) : undefined);
      const orig = sub.origenViaje || (sub.idManifiestoPadre ? origenesSucursalMap.get(sub.idManifiestoPadre) : undefined) || 'Oruro';
      if ((!sub.idViaje && vId) || (!sub.origenViaje && orig)) {
        updated = true;
      }
      return {
        ...sub,
        idViaje: vId,
        origenViaje: orig
      };
    });

    if (updated && raw) {
      localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(conViajes));
    }

    return conViajes;
  }

  public getMovimientos(): MovimientoManifDestino[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MOVIMIENTOS);
    return raw ? JSON.parse(raw) : INITIAL_MOVIMIENTOS;
  }

  public getGastosRuta(): GastoRutaCamion[] {
    const raw = localStorage.getItem(STORAGE_KEYS.GASTOS_RUTA);
    return raw ? JSON.parse(raw) : INITIAL_GASTOS_RUTA;
  }

  public getCajas(): CajaCuenta[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CAJAS);
    return raw ? JSON.parse(raw) : INITIAL_CAJAS;
  }

  public getCatalogos(): Catalogos {
    const raw = localStorage.getItem(STORAGE_KEYS.CATALOGOS);
    const cat: Catalogos = raw ? JSON.parse(raw) : INITIAL_CATALOGOS;
    let needsSave = false;

    if (!cat.clientes || !Array.isArray(cat.clientes) || cat.clientes.length === 0) {
      cat.clientes = INITIAL_CATALOGOS.clientes || [];
      needsSave = true;
    } else {
      // Garantizar que los clientes base existan en la tabla si no están
      const base = INITIAL_CATALOGOS.clientes || [];
      base.forEach((b: Cliente) => {
        if (!cat.clientes.some((c: Cliente) => c.nombre.trim().toLowerCase() === b.nombre.trim().toLowerCase())) {
          cat.clientes.push(b);
          needsSave = true;
        }
      });
    }

    if (!cat.proveedores || !Array.isArray(cat.proveedores) || cat.proveedores.length === 0) {
      cat.proveedores = INITIAL_PROVEEDORES;
      needsSave = true;
    } else {
      // Garantizar proveedores base
      INITIAL_PROVEEDORES.forEach((p: Proveedor) => {
        if (!cat.proveedores.some((pr: Proveedor) => pr.nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase())) {
          cat.proveedores.push(p);
          needsSave = true;
        }
      });
    }

    if (!cat.cuentasPorPagar || !Array.isArray(cat.cuentasPorPagar)) {
      cat.cuentasPorPagar = [];
      needsSave = true;
    }

    if (needsSave) {
      localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
    }

    return cat;
  }

  public getClientes(): Cliente[] {
    return this.getCatalogos().clientes || [];
  }

  public addCliente(cliente: Cliente): void {
    const cat = this.getCatalogos();
    cat.clientes = cat.clientes || [];
    const existsIndex = cat.clientes.findIndex(
      c => c.idCliente === cliente.idCliente || 
      (c.nombre.toLowerCase().trim() === cliente.nombre.toLowerCase().trim())
    );

    if (existsIndex === -1) {
      cat.clientes.unshift(cliente);
    } else {
      cat.clientes[existsIndex] = { ...cat.clientes[existsIndex], ...cliente };
    }
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  public updateCliente(cliente: Cliente): void {
    const cat = this.getCatalogos();
    cat.clientes = cat.clientes || [];
    const idx = cat.clientes.findIndex(c => c.idCliente === cliente.idCliente);
    if (idx !== -1) {
      cat.clientes[idx] = { ...cat.clientes[idx], ...cliente };
      localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
    }
  }

  public deleteCliente(idCliente: string): void {
    const cat = this.getCatalogos();
    cat.clientes = (cat.clientes || []).filter(c => c.idCliente !== idCliente);
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  // -----------------------------------------------------------------
  // PROVEEDORES (TABLA MAESTRA) & CUENTAS POR PAGAR (CxP)
  // -----------------------------------------------------------------

  public getProveedores(): Proveedor[] {
    return this.getCatalogos().proveedores || [];
  }

  public addProveedor(proveedor: Proveedor): void {
    const cat = this.getCatalogos();
    cat.proveedores = cat.proveedores || [];
    const existsIndex = cat.proveedores.findIndex(
      p => p.idProveedor === proveedor.idProveedor || 
      (p.nombre.toLowerCase().trim() === proveedor.nombre.toLowerCase().trim())
    );

    if (existsIndex === -1) {
      cat.proveedores.unshift(proveedor);
    } else {
      cat.proveedores[existsIndex] = { ...cat.proveedores[existsIndex], ...proveedor };
    }
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  public updateProveedor(proveedor: Proveedor): void {
    const cat = this.getCatalogos();
    cat.proveedores = cat.proveedores || [];
    const idx = cat.proveedores.findIndex(p => p.idProveedor === proveedor.idProveedor);
    if (idx !== -1) {
      cat.proveedores[idx] = { ...cat.proveedores[idx], ...proveedor };
      localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
    }
  }

  public deleteProveedor(idProveedor: string): void {
    const cat = this.getCatalogos();
    cat.proveedores = (cat.proveedores || []).filter(p => p.idProveedor !== idProveedor);
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  public getCuentasPorPagar(): CuentaPorPagar[] {
    return this.getCatalogos().cuentasPorPagar || [];
  }

  public addCuentaPorPagar(cxp: CuentaPorPagar): void {
    const cat = this.getCatalogos();
    cat.cuentasPorPagar = cat.cuentasPorPagar || [];
    cat.cuentasPorPagar.unshift(cxp);
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  public updateCuentaPorPagar(cxp: CuentaPorPagar): void {
    const cat = this.getCatalogos();
    cat.cuentasPorPagar = cat.cuentasPorPagar || [];
    const idx = cat.cuentasPorPagar.findIndex(c => c.idCxP === cxp.idCxP);
    if (idx !== -1) {
      cat.cuentasPorPagar[idx] = { ...cat.cuentasPorPagar[idx], ...cxp };
      localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
    }
  }

  public deleteCuentaPorPagar(idCxP: string): void {
    const cat = this.getCatalogos();
    cat.cuentasPorPagar = (cat.cuentasPorPagar || []).filter(c => c.idCxP !== idCxP);
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  public async registrarPagoProveedor(payload: {
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
  }): Promise<boolean> {
    const cat = this.getCatalogos();
    cat.cuentasPorPagar = cat.cuentasPorPagar || [];
    
    // Si viene idCxP, actualizar el registro de CxP
    if (payload.idCxP) {
      const idx = cat.cuentasPorPagar.findIndex(c => c.idCxP === payload.idCxP);
      if (idx !== -1) {
        const cxp = cat.cuentasPorPagar[idx];
        cxp.montoPagadoBs = (cxp.montoPagadoBs || 0) + payload.montoPagoBs;
        cxp.saldoPendienteBs = Math.max(0, cxp.montoTotalBs - cxp.montoPagadoBs);
        cxp.estado = cxp.saldoPendienteBs <= 0 ? 'Pagado' : 'Parcial';
        cat.cuentasPorPagar[idx] = cxp;
        localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
      }
    }

    if (payload.idCxP && payload.idCxP.startsWith('TX-')) {
      const txs = this.getTransacciones();
      const txIdx = txs.findIndex(t => t.idTransaccion === payload.idCxP);
      if (txIdx !== -1) {
        txs[txIdx].estadoCobroPago = 'Pagado';
        txs[txIdx].notas = `${txs[txIdx].notas} [Pagado ${payload.fecha || ''} desde ${payload.cajaCuentaEgreso}]`;
        localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(txs));
      }
    }

    // Registrar en Transacciones Diarias (addTransaccion ya descuenta de la caja cuenta de egreso)
    await this.addTransaccion({
      tipo: 'Gasto',
      fecha: payload.fecha || new Date().toISOString().split('T')[0],
      categoria: payload.categoriaGasto || 'Mantenimiento y Repuestos',
      montoBs: payload.montoPagoBs,
      metodoPago: payload.cajaCuentaEgreso,
      notas: `Abono/Pago a proveedor ${payload.nombreProveedor} ${payload.nroComprobante ? `(Factura/Comp: ${payload.nroComprobante})` : ''}. ${payload.notas || ''}`.trim(),
      idProveedor: payload.idProveedor,
      nombreProveedor: payload.nombreProveedor,
      placaCamion: payload.placaCamion,
      idViaje: payload.idViaje
    });

    // Enviar a GAS
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'registrarPagoProveedor',
            payload
          })
        });
      } catch (err) {
        console.warn('Error syncing registrarPagoProveedor:', err);
      }
    }

    return true;
  }

  public async registrarCobroCxCDirecto(payload: {
    idSubManifiesto?: string;
    nroManifiesto?: string;
    deudor: string;
    tipoDeudor: string;
    montoBs: number;
    cajaCuentaRecaudadora: string;
    fecha?: string;
    nroComprobante?: string;
    notas?: string;
  }): Promise<boolean> {
    const fechaEfectiva = payload.fecha || new Date().toISOString().split('T')[0];

    // Buscar en Manifiestos_Destino
    if (payload.idSubManifiesto || payload.nroManifiesto) {
      const subs = this.getManifiestosDestino();
      const idx = subs.findIndex(s => 
        (payload.idSubManifiesto && s.idSubManifiesto === payload.idSubManifiesto) ||
        (payload.nroManifiesto && s.nroManifiesto === payload.nroManifiesto)
      );

      if (idx !== -1) {
        const sub = subs[idx];
        const monto = Number(payload.montoBs) || 0;
        sub.cobrosRealizadosBs = (sub.cobrosRealizadosBs || 0) + monto;
        sub.recaudacionNetaCajaBs = sub.cobrosRealizadosBs + (sub.ingresosDeliveryOtrosBs || 0) - (sub.gastosComisionesBs || 0);
        sub.saldoPendienteClienteBs = Math.max(0, (sub.saldoInicialCobrarBs || 0) - sub.cobrosRealizadosBs);
        sub.estadoLiquidacion = sub.saldoPendienteClienteBs <= 0 ? 'Liquidado en Sucursal' : 'En Reparto';
        if (sub.saldoPendienteClienteBs <= 0) {
          sub.estadoCobranzaDestino = 'Cobrado / Liquidado a Empresa';
        }
        if (payload.tipoDeudor === 'AGENCIA' && (sub.montoRetenidoAgenciaBs || 0) > 0) {
          sub.montoRetenidoAgenciaBs = Math.max(0, (sub.montoRetenidoAgenciaBs || 0) - monto);
        }
        subs[idx] = sub;
        localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subs));

        if (sub.idManifiestoPadre) {
          this.recalcularManifiestoOrigen(sub.idManifiestoPadre);
        }
      }
    }

    // Si la CxC provino directamente de una transacción registrada "Por Cobrar":
    if (payload.idSubManifiesto && payload.idSubManifiesto.startsWith('TX-')) {
      const txs = this.getTransacciones();
      const txIdx = txs.findIndex(t => t.idTransaccion === payload.idSubManifiesto);
      if (txIdx !== -1) {
        txs[txIdx].estadoCobroPago = 'Cobrado';
        txs[txIdx].notas = `${txs[txIdx].notas} [Cobrado ${fechaEfectiva} en ${payload.cajaCuentaRecaudadora}]`;
        localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(txs));
      }
    }

    // Registrar en Transacciones Diarias (addTransaccion suma el monto a la caja seleccionada)
    await this.addTransaccion({
      tipo: 'Ingreso',
      fecha: fechaEfectiva,
      categoria: 'Cobro Flete Saldo',
      montoBs: payload.montoBs,
      metodoPago: payload.cajaCuentaRecaudadora,
      notas: `Cobro de flete/saldo deudor ${payload.deudor} (${payload.tipoDeudor}) ${payload.nroManifiesto ? `MIC: ${payload.nroManifiesto}` : ''} ${payload.nroComprobante ? `Comp: ${payload.nroComprobante}` : ''}. ${payload.notas || ''}`.trim(),
      nroManifiesto: payload.nroManifiesto,
      skipSubAmortization: true
    });

    // Enviar a GAS
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'registrarCobroManifiestoOfeDestino',
            payload: {
              ...payload,
              metodoPago: payload.cajaCuentaRecaudadora,
              fecha: fechaEfectiva
            }
          })
        });
      } catch (err) {
        console.warn('Error syncing registrarCobroManifiestoOfeDestino:', err);
      }
    }

    return true;
  }

  /**
   * Actualización en cascada de cobros para Cuentas por Cobrar (MIC / Sub-MIC)
   */
  public async registrarCobroManifiestoOfeDestino(payload: {
    idSubManifiesto?: string;
    idManifiesto?: string;
    nroManifiesto?: string;
    nroManifiestoMIC?: string;
    deudor?: string;
    tipoDeudor?: string;
    montoBs: number;
    metodoPago?: string;
    cajaCuentaRecaudadora?: string;
    sucursal?: string;
    idViaje?: string;
    categoria?: string;
    fecha?: string;
    notas?: string;
    rolUsuario?: string;
  }): Promise<{ status: 'success' | 'error'; message: string }> {
    const fechaEfectiva = payload.fecha || new Date().toISOString().split('T')[0];
    const metodo = payload.metodoPago || payload.cajaCuentaRecaudadora || 'Efectivo';
    const monto = Number(payload.montoBs) || 0;

    // 1. Amortizar saldo en Manifiestos_Destino
    if (payload.idSubManifiesto || payload.nroManifiesto) {
      const subs = this.getManifiestosDestino();
      const idx = subs.findIndex(s =>
        (payload.idSubManifiesto && s.idSubManifiesto === payload.idSubManifiesto) ||
        (payload.nroManifiesto && s.nroManifiesto === payload.nroManifiesto)
      );

      if (idx !== -1) {
        const sub = subs[idx];
        sub.cobrosRealizadosBs = (sub.cobrosRealizadosBs || 0) + monto;
        sub.recaudacionNetaCajaBs = sub.cobrosRealizadosBs + (sub.ingresosDeliveryOtrosBs || 0) - (sub.gastosComisionesBs || 0);
        sub.saldoPendienteClienteBs = Math.max(0, (sub.saldoInicialCobrarBs || 0) - sub.cobrosRealizadosBs);
        sub.estadoLiquidacion = sub.saldoPendienteClienteBs <= 0 ? 'Liquidado' : 'Pendiente Parcial';
        if (sub.saldoPendienteClienteBs <= 0) {
          sub.estadoCobranzaDestino = 'Cobrado / Liquidado a Empresa';
        }
        subs[idx] = sub;
        localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subs));

        if (sub.idManifiestoPadre) {
          this.recalcularManifiestoOrigen(sub.idManifiestoPadre);
        }
      }
    }

    // 2. Amortizar en Manifiestos_Origen si corresponde
    if (payload.idManifiesto || (!payload.idSubManifiesto && payload.nroManifiestoMIC)) {
      const origenes = this.getManifiestosOrigen();
      const oIdx = origenes.findIndex(m =>
        (payload.idManifiesto && m.idManifiesto === payload.idManifiesto) ||
        (payload.nroManifiestoMIC && m.nroManifiestoMIC === payload.nroManifiestoMIC)
      );
      if (oIdx !== -1) {
        origenes[oIdx].cobradoOrigenBs = (origenes[oIdx].cobradoOrigenBs || 0) + monto;
        origenes[oIdx].saldoCobrarDestinosBs = Math.max(0, (origenes[oIdx].saldoCobrarDestinosBs || 0) - monto);
        localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify(origenes));
      }
    }

    // 3. Registrar Transacción Diaria de Ingreso
    await this.addTransaccion({
      tipo: 'Ingreso',
      fecha: fechaEfectiva,
      categoria: payload.categoria || 'Cobro Flete Destino',
      montoBs: monto,
      metodoPago: metodo,
      sucursal: payload.sucursal || 'Destino',
      idViaje: payload.idViaje || '',
      nroManifiesto: payload.nroManifiesto || '',
      notas: payload.notas || 'Amortización de cuenta por cobrar',
      rolUsuario: (payload.rolUsuario as any) || 'Administrador',
      origenRegistro: 'Cobro_Manifiesto'
    });

    if (payload.idViaje) {
      this.recalcularViaje(payload.idViaje);
    }

    // 4. Sincronizar con Google Apps Script backend
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'registrarCobroManifiestoOfeDestino',
            payload: {
              ...payload,
              metodoPago: metodo,
              fecha: fechaEfectiva
            }
          })
        });
      } catch (err) {
        console.warn('Error syncing registrarCobroManifiestoOfeDestino:', err);
      }
    }

    return { status: 'success', message: 'Cobro aplicado y cuentas por cobrar actualizadas en cascada.' };
  }

  /**
   * Registro rápido de cobranza / anticipo de flete en Origen
   * Actualiza Manifiestos_Destino (pagadoOrigenBs, saldos), Manifiestos_Origen (cobradoOrigenBs),
   * crea la Transacción Diaria de Ingreso, actualiza la caja correspondiente y recalcula el viaje.
   */
  public async registrarCobranzaOrigen(payload: {
    idSubManifiesto: string;
    nroManifiesto?: string;
    montoBs: number;
    sucursalOrigen: string;
    cajaCuentaOrigen: string;
    clienteNombre?: string;
    fecha?: string;
    notas?: string;
    esLiquidadoACentral?: boolean;
    tipoCobro?: 'Total' | 'Parcial' | 'Anticipo';
  }): Promise<{ status: 'success' | 'error'; message: string }> {
    const fechaEfectiva = payload.fecha || new Date().toISOString().split('T')[0];
    const monto = Number(payload.montoBs) || 0;
    const metodo = payload.cajaCuentaOrigen || 'Efectivo en Agencia';

    if (monto <= 0) {
      return { status: 'error', message: 'El monto a cobrar debe ser mayor a 0 Bs.' };
    }

    let subEncontrado: ManifiestoDestino | null = null;

    // 1. Amortizar y actualizar Manifiestos_Destino
    const subs = this.getManifiestosDestino();
    const sIdx = subs.findIndex(s => s.idSubManifiesto === payload.idSubManifiesto || (payload.nroManifiesto && s.nroManifiesto === payload.nroManifiesto));

    if (sIdx !== -1) {
      const sub = subs[sIdx];
      sub.pagadoOrigenBs = (Number(sub.pagadoOrigenBs) || 0) + monto;
      sub.metodoCobroOrigen = 'Efectivo en Agencia';
      sub.cuentaAfectadaOrigen = metodo;
      sub.estadoLiquidacionAgencia = payload.esLiquidadoACentral ? 'Liquidado a Central' : 'Pendiente de Liquidación';
      
      const fleteTotal = Number(sub.fleteAsignadoBs || 0);
      const porPagarDestino = Math.max(0, fleteTotal - sub.pagadoOrigenBs);
      sub.porPagarDestinoBs = porPagarDestino;
      sub.saldoInicialCobrarBs = porPagarDestino;
      const nuevoSaldo = Math.max(0, parseFloat((porPagarDestino - (Number(sub.cobrosRealizadosBs) || 0)).toFixed(2)));
      if (sub.tipoResponsableDestino === 'AGENCIA') {
        sub.saldoPendienteAgenciaBs = nuevoSaldo;
        sub.saldoPendienteClienteBs = 0;
      } else {
        sub.saldoPendienteClienteBs = nuevoSaldo;
      }
      sub.estadoLiquidacion = nuevoSaldo <= 0 ? 'Liquidado en Sucursal' : ((sub.cobrosRealizadosBs || 0) > 0 ? 'Pendiente Parcial' : 'Por Cobrar');
      if (nuevoSaldo <= 0) {
        sub.estadoCobranzaDestino = 'Cobrado / Liquidado a Empresa';
      }
      subs[sIdx] = sub;
      subEncontrado = sub;
      localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subs));

      if (sub.idManifiestoPadre) {
        this.recalcularManifiestoOrigen(sub.idManifiestoPadre);
      }
    }

    // 2. Amortizar en Manifiestos_Origen si corresponde
    if (subEncontrado?.idManifiestoPadre) {
      const origenes = this.getManifiestosOrigen();
      const oIdx = origenes.findIndex(m => m.idManifiesto === subEncontrado!.idManifiestoPadre);
      if (oIdx !== -1) {
        origenes[oIdx].cobradoOrigenBs = (Number(origenes[oIdx].cobradoOrigenBs) || 0) + monto;
        origenes[oIdx].saldoCobrarDestinosBs = Math.max(0, (Number(origenes[oIdx].saldoCobrarDestinosBs) || 0) - monto);
        localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify(origenes));
      }
    }

    // 3. Registrar MovimientoManifDestino para trazabilidad exacta en destino
    if (subEncontrado) {
      try {
        const movimientos = this.getMovimientos();
        movimientos.unshift({
          idMovimiento: `MOV-ORIG-${Date.now()}`,
          idSubManifiesto: subEncontrado.idSubManifiesto,
          sucursal: payload.sucursalOrigen,
          tipoMovimiento: 'Ingreso',
          categoriaConcepto: payload.tipoCobro === 'Anticipo' ? 'Anticipo Flete Origen' : 'Cobro Flete Origen',
          importeBs: monto,
          cajaCuentaAfectada: metodo,
          fechaHora: `${fechaEfectiva} ${new Date().toLocaleTimeString('es-BO', { hour12: false })}`,
          nroComprobante: `COB-ORIG-${Date.now().toString().slice(-4)}`,
          detalleOperacion: payload.notas || `Cobranza en origen (${payload.sucursalOrigen}) para ${subEncontrado.destinatario || 'cliente'}`,
          tipoRecaudador: 'Cobro Directo (Cliente canceló a Empresa/Chofer)',
          estadoRendicion: payload.esLiquidadoACentral ? 'Depositado a Cuenta de Empresa' : 'Retenido en Agencia (CxC Agencia)'
        });
        localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(movimientos));
      } catch (err) {
        console.warn('Error al guardar movimiento de cobranza en origen:', err);
      }
    }

    // 4. Registrar Transacción Diaria de Ingreso
    await this.addTransaccion({
      tipo: 'Ingreso',
      fecha: fechaEfectiva,
      categoria: payload.tipoCobro === 'Anticipo' ? 'Anticipo Flete Origen' : 'Cobro Flete Origen',
      montoBs: monto,
      metodoPago: metodo,
      sucursal: payload.sucursalOrigen,
      idViaje: subEncontrado?.idViaje || '',
      nroManifiesto: subEncontrado?.nroManifiesto || subEncontrado?.idSubManifiesto || '',
      notas: payload.notas || `Cobranza en origen (${payload.sucursalOrigen}) - Sub-MIC: ${subEncontrado?.nroManifiesto || ''}`,
      nombreCliente: payload.clienteNombre || subEncontrado?.destinatario || '',
      rolUsuario: 'Administrador',
      origenRegistro: 'Cobro_Origen',
      skipSubAmortization: true
    });

    if (subEncontrado?.idViaje) {
      this.recalcularViaje(subEncontrado.idViaje);
    }

    // 5. Notificar a Google Apps Script si está conectado
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'registrarCobroManifiestoOfeDestino',
            payload: {
              idSubManifiesto: payload.idSubManifiesto,
              nroManifiesto: payload.nroManifiesto || subEncontrado?.nroManifiesto,
              montoBs: monto,
              metodoPago: metodo,
              sucursal: payload.sucursalOrigen,
              categoria: 'Cobro Flete Origen',
              fecha: fechaEfectiva,
              notas: payload.notas || 'Cobranza gestionada en origen',
              rolUsuario: 'Administrador'
            }
          })
        });
      } catch (err) {
        console.warn('Error syncing registrarCobranzaOrigen:', err);
      }
    }

    return { status: 'success', message: 'Cobranza en origen registrada y saldos actualizados en cascada.' };
  }

  // -----------------------------------------------------------------
  // DATOS DE LA EMPRESA (PARA FACTURACIÓN, REPORTES Y RECIBOS)
  // -----------------------------------------------------------------

  public getEmpresa(): DatosEmpresa {
    const cat = this.getCatalogos();
    if (!cat.empresa) {
      cat.empresa = INITIAL_EMPRESA;
      localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
    }
    return cat.empresa;
  }

  public updateEmpresa(empresa: DatosEmpresa): void {
    const cat = this.getCatalogos();
    cat.empresa = empresa;
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  public saveEmpresa(empresa: DatosEmpresa): void {
    this.updateEmpresa(empresa);
  }

  public getPendingSync(): PendingSyncItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
    return raw ? JSON.parse(raw) : [];
  }

  public getGasUrl(): string {
    const current = localStorage.getItem(STORAGE_KEYS.GAS_URL);
    if (!current || current.includes('AKfycbwIgZC_tM0apd5cL0EtvoRXZ5PxqvSuEIWnEKAkWOSmi2yfM19HxdK09IygGH2oyYGOPQ')) {
      const newUrl = 'https://script.google.com/macros/s/AKfycbxrs4jndFwD2dQgoixqYNunW5XieA9ZCubozN0O-EmVdxnEqGkAJ4ps7pUrEfJcnUqjAw/exec';
      localStorage.setItem(STORAGE_KEYS.GAS_URL, newUrl);
      return newUrl;
    }
    return current;
  }

  public setGasUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.GAS_URL, url.trim());
  }

  public getLastSyncTime(): string {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || '';
  }

  // -----------------------------------------------------------------
  // FINANZAS Y GASTOS DIARIOS
  // -----------------------------------------------------------------

  public getTransacciones(): TransaccionDiaria[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACCIONES);
    const txs: TransaccionDiaria[] = raw ? JSON.parse(raw) : INITIAL_TRANSACCIONES;
    let needsSave = false;

    // Sanear transacciones de Fletes Despachos MIC de origen que aún no han sido liquidadas a Central:
    // Para el PROPIETARIO, representan una Cuenta por Cobrar a la Agencia de Origen (Pendiente de Liquidación),
    // NO dinero efectivo en caja hasta que la agencia efectúe la liquidación.
    const subs = this.getManifiestosDestino();
    txs.forEach(t => {
      if (
        (t.categoria === 'Fletes Despachos MIC' || (t.notas && t.notas.toLowerCase().includes('pago en origen'))) &&
        !t.notas?.includes('[Liquidado a')
      ) {
        const sub = subs.find(s => (t.nroManifiesto && s.nroManifiesto === t.nroManifiesto) || (t.idSubManifiesto && s.idSubManifiesto === t.idSubManifiesto));
        if (!sub || sub.estadoLiquidacionAgencia !== 'Liquidado a Central') {
          if (t.modalidadPago !== 'Credito' || t.metodoPago !== 'Por Cobrar' || t.estadoCobroPago !== 'Pendiente') {
            t.modalidadPago = 'Credito';
            t.metodoPago = 'Por Cobrar';
            t.estadoCobroPago = 'Pendiente';
            needsSave = true;
          }
        }
      }
    });

    if (needsSave && raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(txs));
    }

    return txs;
  }

  public async addTransaccion(tx: Omit<TransaccionDiaria, 'idTransaccion' | 'sincronizado'>, fotoBase64?: string): Promise<{ success: boolean; id: string; queued: boolean }> {
    const transacciones = this.getTransacciones();
    
    // Prevenir doble inserción idéntica inmediata (ráfaga de clicks < 3 segundos)
    const duplicate = transacciones.find(t => 
      t.tipo === tx.tipo &&
      t.montoBs === tx.montoBs &&
      t.categoria === tx.categoria &&
      t.fecha === tx.fecha &&
      t.metodoPago === tx.metodoPago &&
      t.notas === tx.notas &&
      (Date.now() - parseInt(t.idTransaccion.replace('TX-', '') || '0', 10)) < 3000
    );
    if (duplicate) {
      console.warn('Transacción duplicada bloqueada en almacenamiento:', duplicate.idTransaccion);
      return { success: true, id: duplicate.idTransaccion, queued: false };
    }

    const id = `TX-${Date.now()}`;
    const nuevaTx: TransaccionDiaria = {
      ...tx,
      idTransaccion: id,
      comprobanteFotoUrl: tx.comprobanteFotoUrl || fotoBase64,
      sincronizado: false
    };

    transacciones.unshift(nuevaTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(transacciones));

    // Afectar Caja/Cuenta según modalidad de pago (Contado, Crédito o Anticipo Mixto)
    const modalidad = nuevaTx.modalidadPago || (nuevaTx.metodoPago === 'Por Cobrar' || nuevaTx.metodoPago === 'Por Pagar' ? 'Credito' : 'Contado');
    const anticipo = Number(nuevaTx.montoAnticipoBs || 0);
    const saldo = Number(nuevaTx.saldoPendienteBs ?? Math.max(0, nuevaTx.montoBs - anticipo));
    const cuentaAnticipo = nuevaTx.cuentaAnticipo || nuevaTx.metodoPago;

    if (modalidad === 'Anticipo_Saldo') {
      // 1) Registra en Arqueo_Cajas el ingreso/egreso del dinero real efectivamente pagado (Anticipo)
      if (tx.tipo === 'Ingreso' && anticipo > 0) {
        this.actualizarCaja(cuentaAnticipo, anticipo, 0);
      } else if (tx.tipo === 'Gasto' && anticipo > 0) {
        this.actualizarCaja(cuentaAnticipo, 0, anticipo);
      }

      // 2) Registrar en Catálogo de Cuentas por Pagar (CxP Proveedores) el saldo pendiente restante
      if (tx.tipo === 'Gasto' && saldo > 0) {
        try {
          const cat = this.getCatalogos();
          cat.cuentasPorPagar = cat.cuentasPorPagar || [];
          const prov = (cat.proveedores || []).find(p => p.idProveedor === tx.idProveedor);
          const nomProv = tx.nombreProveedor || prov?.nombre || tx.idProveedor || 'Proveedor General';
          
          cat.cuentasPorPagar.unshift({
            idCxP: id,
            idProveedor: tx.idProveedor || 'PRV-GEN',
            nombreProveedor: nomProv,
            proveedorNombre: nomProv,
            rubro: prov?.rubro || tx.categoria || 'Gasto Operativo',
            categoria: tx.categoria,
            concepto: `${tx.categoria}${tx.notas ? ` - ${tx.notas}` : ''}`,
            montoTotalBs: tx.montoBs,
            montoPagadoBs: anticipo,
            saldoPendienteBs: saldo,
            fechaEmision: tx.fecha,
            fechaVencimiento: tx.fechaVencimiento || '',
            estado: saldo <= 0 ? 'Pagado' : 'Parcial',
            nroFacturaBoleta: tx.nroFacturaBoleta || tx.nroManifiesto || id,
            placaCamion: tx.placaCamion,
            idViaje: tx.idViaje,
            notas: tx.notas
          });
          localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
        } catch (e) {
          console.warn('Error linking CxP anticipo:', e);
        }
      }
    } else if (modalidad === 'Credito' || tx.metodoPago === 'Por Cobrar' || tx.metodoPago === 'Por Pagar') {
      // A crédito 100%: Saldo disponible en Arqueo_Cajas se mantiene intacto
      if (tx.tipo === 'Gasto') {
        try {
          const cat = this.getCatalogos();
          cat.cuentasPorPagar = cat.cuentasPorPagar || [];
          const prov = (cat.proveedores || []).find(p => p.idProveedor === tx.idProveedor);
          const nomProv = tx.nombreProveedor || prov?.nombre || tx.idProveedor || 'Proveedor General';
          
          cat.cuentasPorPagar.unshift({
            idCxP: id,
            idProveedor: tx.idProveedor || 'PRV-GEN',
            nombreProveedor: nomProv,
            proveedorNombre: nomProv,
            rubro: prov?.rubro || tx.categoria || 'Gasto Operativo',
            categoria: tx.categoria,
            concepto: `${tx.categoria}${tx.notas ? ` - ${tx.notas}` : ''}`,
            montoTotalBs: tx.montoBs,
            montoPagadoBs: 0,
            saldoPendienteBs: tx.montoBs,
            fechaEmision: tx.fecha,
            fechaVencimiento: tx.fechaVencimiento || '',
            estado: 'Pendiente',
            nroFacturaBoleta: tx.nroFacturaBoleta || tx.nroManifiesto || id,
            placaCamion: tx.placaCamion,
            idViaje: tx.idViaje,
            notas: tx.notas
          });
          localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
        } catch (e) {
          console.warn('Error linking CxP:', e);
        }
      }
    } else if (tx.tipo === 'Traspaso' && tx.cuentaDestino) {
      this.actualizarCaja(tx.metodoPago, 0, tx.montoBs);
      this.actualizarCaja(tx.cuentaDestino, tx.montoBs, 0);
    } else {
      // Contado 100%
      if (tx.tipo === 'Ingreso') {
        this.actualizarCaja(tx.metodoPago, tx.montoBs, 0);
      } else if (tx.tipo === 'Gasto') {
        this.actualizarCaja(tx.metodoPago, 0, tx.montoBs);
      }
    }

    // Si tiene viaje asignado y es gasto, actualizar cálculo de viaje
    if (tx.idViaje && tx.tipo === 'Gasto') {
      this.recalcularViaje(tx.idViaje);
    }

    // Si la transacción está vinculada a un Manifiesto / Sub-Manifiesto y es Ingreso, amortizar en cascada
    const esPagoOrigen = tx.categoria === 'Fletes Despachos MIC' || 
                         (tx.notas && tx.notas.toLowerCase().includes('pago en origen')) ||
                         (tx.notas && tx.notas.toLowerCase().includes('cobranza en origen')) ||
                         Boolean(tx.skipSubAmortization);

    if (tx.tipo === 'Ingreso' && tx.nroManifiesto && !esPagoOrigen) {
      try {
        const subs = this.getManifiestosDestino();
        const sIdx = subs.findIndex(s => s.nroManifiesto === tx.nroManifiesto || s.idSubManifiesto === tx.nroManifiesto);
        if (sIdx !== -1) {
          const sub = subs[sIdx];
          const montoEfectivo = modalidad === 'Credito' ? 0 : (modalidad === 'Anticipo_Saldo' ? anticipo : tx.montoBs);
          sub.cobrosRealizadosBs = (Number(sub.cobrosRealizadosBs) || 0) + montoEfectivo;
          sub.recaudacionNetaCajaBs = sub.cobrosRealizadosBs + (Number(sub.ingresosDeliveryOtrosBs) || 0) - (Number(sub.gastosComisionesBs) || 0);
          
          const porPagarDestino = Number(sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : (sub.saldoInicialCobrarBs || 0));
          const nuevoSaldoPendiente = Math.max(0, parseFloat((porPagarDestino - sub.cobrosRealizadosBs).toFixed(2)));

          if (sub.tipoResponsableDestino === 'AGENCIA') {
            sub.saldoPendienteAgenciaBs = nuevoSaldoPendiente;
            sub.saldoPendienteClienteBs = 0;
          } else {
            sub.saldoPendienteClienteBs = nuevoSaldoPendiente;
          }

          sub.estadoLiquidacion = nuevoSaldoPendiente <= 0 ? 'Liquidado en Sucursal' : (sub.cobrosRealizadosBs > 0 ? 'Pendiente Parcial' : 'Por Cobrar');
          if (nuevoSaldoPendiente <= 0) {
            sub.estadoCobranzaDestino = 'Cobrado / Liquidado a Empresa';
          }
          subs[sIdx] = sub;
          localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subs));
          if (sub.idManifiestoPadre) {
            this.recalcularManifiestoOrigen(sub.idManifiestoPadre);
          }
        }
      } catch (err) {
        console.warn('Error en amortización automática de sub-manifiesto:', err);
      }
    }

    // Sincronizar o encolar
    const gasUrl = this.getGasUrl();
    let queued = true;

    if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'registrarTransaccionDiaria',
            payload: { ...nuevaTx, fotoBase64 }
          })
        });
        nuevaTx.sincronizado = true;
        queued = false;
        localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(transacciones));
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      } catch (e) {
        console.warn('Network issue queueing tx:', e);
      }
    }

    if (queued) {
      this.addToSyncQueue({
        id: `sync-tx-${id}`,
        tipo: 'transaccion_diaria',
        data: { ...nuevaTx, fotoBase64 },
        timestamp: new Date().toISOString(),
        reintentos: 0
      });
    }

    return { success: true, id, queued };
  }

  public deleteTransaccion(id: string): void {
    const list = this.getTransacciones();
    const cleanId = String(id || '').trim();
    if (!cleanId) return;

    const target = list.find(t => String(t.idTransaccion || '').trim() === cleanId);
    if (target) {
      const monto = Number(target.montoBs) || 0;
      const modalidad = target.modalidadPago || (target.metodoPago === 'Por Cobrar' || target.metodoPago === 'Por Pagar' ? 'Credito' : 'Contado');
      const anticipo = Number(target.montoAnticipoBs || 0);
      const cuentaAnticipo = target.cuentaAnticipo || target.metodoPago;

      // Revert balance in caja según lo que realmente ingresó o salió
      if (modalidad === 'Anticipo_Saldo') {
        if (target.tipo === 'Ingreso' && anticipo > 0) {
          this.actualizarCaja(cuentaAnticipo, -anticipo, 0);
        } else if (target.tipo === 'Gasto' && anticipo > 0) {
          this.actualizarCaja(cuentaAnticipo, 0, -anticipo);
        }

        if (target.tipo === 'Gasto') {
          try {
            const cat = this.getCatalogos();
            if (cat.cuentasPorPagar) {
              cat.cuentasPorPagar = cat.cuentasPorPagar.filter(c => c.idCxP !== cleanId);
              localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
            }
          } catch (e) {
            console.warn('Error removing CxP on delete:', e);
          }
        }
      } else if (modalidad !== 'Credito' && target.metodoPago !== 'Por Cobrar' && target.metodoPago !== 'Por Pagar') {
        if (target.tipo === 'Ingreso') {
          this.actualizarCaja(target.metodoPago, -monto, 0);
        } else if (target.tipo === 'Gasto') {
          this.actualizarCaja(target.metodoPago, 0, -monto);
        }
      } else if (target.tipo === 'Gasto') {
        // Remover de Cuentas por Pagar si existía
        try {
          const cat = this.getCatalogos();
          if (cat.cuentasPorPagar) {
            cat.cuentasPorPagar = cat.cuentasPorPagar.filter(c => c.idCxP !== cleanId);
            localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
          }
        } catch (e) {
          console.warn('Error removing CxP on delete:', e);
        }
      } else if (target.tipo === 'Traspaso' && target.cuentaDestino) {
        this.actualizarCaja(target.metodoPago, monto, 0);
        this.actualizarCaja(target.cuentaDestino, -monto, 0);
      }

      // REVERSIÓN EN "Manifiestos_Destino" si la transacción fue un cobro de flete/saldo
      const esPagoOrigen = target.categoria === 'Fletes Despachos MIC' || 
                           (target.notas && target.notas.toLowerCase().includes('pago en origen')) ||
                           (target.notas && target.notas.toLowerCase().includes('cobranza en origen'));

      const esCobroDestino = target.tipo === 'Ingreso' && !esPagoOrigen && (
        target.categoria === 'Cobro Flete Saldo' ||
        target.categoria === 'Cobro en Destino' ||
        target.categoria.toLowerCase().includes('cobro') ||
        Boolean(target.nroManifiesto) ||
        Boolean((target as any).idSubManifiesto)
      );

      if (esCobroDestino) {
        const submanifiestos = this.getManifiestosDestino();
        const targetIdSub = (target as any).idSubManifiesto;
        const targetNroMan = target.nroManifiesto;

        const subIdx = submanifiestos.findIndex(s => 
          (targetIdSub && s.idSubManifiesto === targetIdSub) ||
          (targetNroMan && s.nroManifiesto === targetNroMan)
        );

        if (subIdx !== -1) {
          const sub = submanifiestos[subIdx];
          // Restar monto de cobros realizados
          sub.cobrosRealizadosBs = Math.max(0, (sub.cobrosRealizadosBs || 0) - monto);
          sub.recaudacionNetaCajaBs = sub.cobrosRealizadosBs + (sub.ingresosDeliveryOtrosBs || 0) - (sub.gastosComisionesBs || 0);
          
          const porPagarDestino = Number(sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : (sub.saldoInicialCobrarBs || 0));
          const nuevoSaldoPendiente = Math.max(0, parseFloat((porPagarDestino - sub.cobrosRealizadosBs).toFixed(2)));

          if (sub.tipoResponsableDestino === 'AGENCIA') {
            sub.saldoPendienteAgenciaBs = nuevoSaldoPendiente;
            sub.saldoPendienteClienteBs = 0;
          } else {
            sub.saldoPendienteClienteBs = nuevoSaldoPendiente;
          }

          sub.estadoLiquidacion = nuevoSaldoPendiente <= 0 ? 'Liquidado en Sucursal' : (sub.cobrosRealizadosBs > 0 ? 'Pendiente Parcial' : 'En Reparto');
          if (nuevoSaldoPendiente > 0) {
            sub.estadoCobranzaDestino = (sub.tipoDeudor === 'CLIENTE' || sub.modalidadCobroDestino === 'Cobro Directo Empresa / Cliente')
              ? 'Pendiente de Pago Cliente'
              : 'Pendiente de Cobro y Liquidación por Agencia';
          }
          if ((sub.montoRetenidoAgenciaBs || 0) > 0) {
            sub.montoRetenidoAgenciaBs = Math.max(0, (sub.montoRetenidoAgenciaBs || 0) - monto);
            if (sub.montoRetenidoAgenciaBs <= 0) {
              sub.estadoRendicionDestino = undefined;
            }
          }

          submanifiestos[subIdx] = sub;
          localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(submanifiestos));

          // Recalcular Manifiesto Padre si existe
          if (sub.idManifiestoPadre) {
            this.recalcularManifiestoOrigen(sub.idManifiestoPadre);
          }
        }

        // Eliminar también de Movimientos
        const movs = this.getMovimientos();
        const movsFiltrados = movs.filter((m: MovimientoManifDestino) => 
          m.idMovimiento !== cleanId && 
          (!targetNroMan || !m.nroComprobante?.includes(targetNroMan))
        );
        if (movs.length !== movsFiltrados.length) {
          localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(movsFiltrados));
        }
      }

      // Notificar al backend de Google Sheets con la acción "eliminarCobranza"
      const gasUrl = this.getGasUrl();
      if (navigator.onLine && gasUrl) {
        try {
          fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'eliminarCobranza',
              payload: {
                id: cleanId,
                idTransaccion: cleanId,
                nroManifiesto: target.nroManifiesto,
                montoBs: target.montoBs,
                caja: target.metodoPago
              }
            })
          });
        } catch (err) {
          console.warn('Error sincronizando eliminarCobranza:', err);
        }
      }
    }

    const filtered = list.filter(t => String(t.idTransaccion || '').trim() !== cleanId);
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(filtered));

    if (target?.idViaje && target.tipo === 'Gasto') {
      this.recalcularViaje(target.idViaje);
    }

    // Limpiar también de la cola de sincronización si estaba pendiente
    try {
      const queue = this.getPendingSync();
      const updatedQueue = queue.filter((q: any) => q.id !== `sync-tx-${cleanId}` && q.data?.idTransaccion !== cleanId);
      if (queue.length !== updatedQueue.length) {
        localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(updatedQueue));
      }
    } catch {
      // Ignore queue error
    }
  }

  public updateTransaccion(tx: TransaccionDiaria): void {
    const list = this.getTransacciones();
    const idx = list.findIndex(t => t.idTransaccion === tx.idTransaccion);
    if (idx === -1) return;
    const old = list[idx];

    // 1. Revertir impacto previo en Arqueo_Cajas según la modalidad original
    const oldModalidad = old.modalidadPago || (old.metodoPago === 'Por Cobrar' || old.metodoPago === 'Por Pagar' ? 'Credito' : (old.montoAnticipoBs ? 'Anticipo_Saldo' : 'Contado'));
    const oldAnticipo = Number(old.montoAnticipoBs || 0);
    const oldCuentaAnticipo = old.cuentaAnticipo || old.metodoPago;

    if (oldModalidad === 'Anticipo_Saldo') {
      if (old.tipo === 'Ingreso' && oldAnticipo > 0) {
        this.actualizarCaja(oldCuentaAnticipo, -oldAnticipo, 0);
      } else if (old.tipo === 'Gasto' && oldAnticipo > 0) {
        this.actualizarCaja(oldCuentaAnticipo, 0, -oldAnticipo);
      }
    } else if (oldModalidad !== 'Credito' && old.metodoPago !== 'Por Cobrar' && old.metodoPago !== 'Por Pagar') {
      if (old.tipo === 'Ingreso') {
        this.actualizarCaja(old.metodoPago, -old.montoBs, 0);
      } else if (old.tipo === 'Gasto') {
        this.actualizarCaja(old.metodoPago, 0, -old.montoBs);
      } else if (old.tipo === 'Traspaso' && old.cuentaDestino) {
        this.actualizarCaja(old.metodoPago, old.montoBs, 0);
        this.actualizarCaja(old.cuentaDestino, -old.montoBs, 0);
      }
    }

    // 2. Aplicar nuevo impacto en Arqueo_Cajas según la nueva modalidad
    const newModalidad = tx.modalidadPago || (tx.metodoPago === 'Por Cobrar' || tx.metodoPago === 'Por Pagar' ? 'Credito' : (tx.montoAnticipoBs ? 'Anticipo_Saldo' : 'Contado'));
    const newAnticipo = Number(tx.montoAnticipoBs || 0);
    const newCuentaAnticipo = tx.cuentaAnticipo || tx.metodoPago;

    if (newModalidad === 'Anticipo_Saldo') {
      if (tx.tipo === 'Ingreso' && newAnticipo > 0) {
        this.actualizarCaja(newCuentaAnticipo, newAnticipo, 0);
      } else if (tx.tipo === 'Gasto' && newAnticipo > 0) {
        this.actualizarCaja(newCuentaAnticipo, 0, newAnticipo);
      }
    } else if (newModalidad !== 'Credito' && tx.metodoPago !== 'Por Cobrar' && tx.metodoPago !== 'Por Pagar') {
      if (tx.tipo === 'Ingreso') {
        this.actualizarCaja(tx.metodoPago, tx.montoBs, 0);
      } else if (tx.tipo === 'Gasto') {
        this.actualizarCaja(tx.metodoPago, 0, tx.montoBs);
      } else if (tx.tipo === 'Traspaso' && tx.cuentaDestino) {
        this.actualizarCaja(tx.metodoPago, 0, tx.montoBs);
        this.actualizarCaja(tx.cuentaDestino, tx.montoBs, 0);
      }
    }

    // 3. Actualizar registro en lista de transacciones
    list[idx] = tx;
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(list));

    // 4. Sincronizar o ajustar Cuentas por Pagar (CxP Proveedores)
    if (old.tipo === 'Gasto' || tx.tipo === 'Gasto') {
      try {
        const cat = this.getCatalogos();
        cat.cuentasPorPagar = cat.cuentasPorPagar || [];
        const cxpIdx = cat.cuentasPorPagar.findIndex(c => c.idCxP === tx.idTransaccion);
        const esCreditoOAnticipo = tx.tipo === 'Gasto' && (newModalidad === 'Credito' || newModalidad === 'Anticipo_Saldo' || tx.metodoPago === 'Por Pagar');

        if (esCreditoOAnticipo) {
          const prov = (cat.proveedores || []).find(p => p.idProveedor === tx.idProveedor);
          const nomProv = tx.nombreProveedor || prov?.nombre || tx.idProveedor || 'Proveedor General';
          const saldo = Number(tx.saldoPendienteBs ?? Math.max(0, tx.montoBs - newAnticipo));

          const cxpItem = {
            idCxP: tx.idTransaccion,
            idProveedor: tx.idProveedor || 'PRV-GEN',
            nombreProveedor: nomProv,
            proveedorNombre: nomProv,
            rubro: prov?.rubro || tx.categoria || 'Gasto Operativo',
            categoria: tx.categoria,
            concepto: `${tx.categoria}${tx.notas ? ` - ${tx.notas}` : ''}`,
            montoTotalBs: tx.montoBs,
            montoPagadoBs: newAnticipo,
            saldoPendienteBs: saldo,
            fechaEmision: tx.fecha,
            fechaVencimiento: tx.fechaVencimiento || '',
            estado: saldo <= 0 ? 'Pagado' : (newAnticipo > 0 ? 'Parcial' : 'Pendiente'),
            nroFacturaBoleta: tx.nroFacturaBoleta || tx.nroManifiesto || tx.idTransaccion,
            placaCamion: tx.placaCamion,
            idViaje: tx.idViaje,
            notas: tx.notas
          };

          if (cxpIdx !== -1) {
            cat.cuentasPorPagar[cxpIdx] = cxpItem as any;
          } else {
            cat.cuentasPorPagar.unshift(cxpItem as any);
          }
          localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
        } else if (cxpIdx !== -1) {
          cat.cuentasPorPagar.splice(cxpIdx, 1);
          localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
        }
      } catch (e) {
        console.warn('Error updating CxP record:', e);
      }
    }

    // 5. Recalcular viajes si correspondía a un gasto de viaje
    if ((old.idViaje && old.tipo === 'Gasto') || (tx.idViaje && tx.tipo === 'Gasto')) {
      if (old.idViaje) this.recalcularViaje(old.idViaje);
      if (tx.idViaje && tx.idViaje !== old.idViaje) this.recalcularViaje(tx.idViaje);
    }

    // 6. Notificar a Google Apps Script con acción editarTransaccionDiaria
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'editarTransaccionDiaria',
            payload: tx
          })
        });
      } catch (err) {
        console.warn('Error syncing editarTransaccionDiaria with GAS:', err);
      }
    }
  }

  // Actualización y Edición de Viajes
  public updateViaje(viaje: Viaje): void {
    const viajes = this.getViajes();
    const idx = viajes.findIndex(v => v.idViaje === viaje.idViaje);
    if (idx !== -1) {
      viajes[idx] = { ...viajes[idx], ...viaje };
      localStorage.setItem(STORAGE_KEYS.VIAJES, JSON.stringify(viajes));
      this.recalcularViaje(viaje.idViaje);
    }
  }

  public deleteViaje(idViaje: string): void {
    const viajes = this.getViajes();
    const cleanIdViaje = String(idViaje || '').trim();
    const targetViaje = viajes.find(v => v.idViaje === cleanIdViaje);
    if (!targetViaje) return;

    // 1. Cascada de Manifiestos Maestros asignados a este viaje (detona cascada de submanifiestos, movimientos y transacciones)
    const allManifs = this.getManifiestosOrigen();
    const manifsDelViaje = allManifs.filter(m => m.idViajeAsignado === cleanIdViaje);
    manifsDelViaje.forEach(m => {
      this.deleteManifiestoOrigen(m.idManifiesto);
    });

    // Verificar si quedan submanifiestos directos vinculados a este viaje
    const remainingSubs = this.getManifiestosDestino();
    const directSubs = remainingSubs.filter(s => s.idViaje === cleanIdViaje);
    directSubs.forEach(s => {
      this.deleteManifiestoDestino(s.idSubManifiesto);
    });

    // 2. Eliminar Gastos_Ruta_Camion vinculados a este viaje y revertir en Arqueo_Cajas
    const allGastos = this.getGastosRuta();
    const gastosDelViaje = allGastos.filter(g => g.idViajeAsignado === cleanIdViaje);
    gastosDelViaje.forEach(g => {
      const monto = Number(g.importeBs || 0);
      const caja = g.cajaCuentaUtilizada || 'Efectivo Chofer Ruta';
      if (monto > 0) {
        if (g.tipoOperacion === 'Ingreso') {
          // Revertir anticipo/recarga: restar de totalCobrado y disponible
          this.actualizarCaja(caja, -monto, 0);
        } else {
          // Revertir gasto de ruta: devolver el saldo gastado a la caja correspondiente
          this.actualizarCaja(caja, 0, -monto);
        }
      }
    });
    const remainingGastos = allGastos.filter(g => g.idViajeAsignado !== cleanIdViaje);
    localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(remainingGastos));

    // 3. Eliminar Transacciones_Diarias vinculadas a este viaje y revertir en Arqueo_Cajas
    const allTxs = this.getTransacciones();
    const txsDelViaje = allTxs.filter(t => t.idViaje === cleanIdViaje);
    txsDelViaje.forEach(tx => {
      const monto = Number(tx.montoBs || 0);
      if (monto > 0) {
        if (tx.tipo === 'Gasto') {
          this.actualizarCaja(tx.metodoPago, 0, -monto);
        } else if (tx.tipo === 'Ingreso') {
          this.actualizarCaja(tx.metodoPago, -monto, 0);
        } else if (tx.tipo === 'Traspaso') {
          this.actualizarCaja(tx.metodoPago, monto, 0);
          if (tx.cuentaDestino) {
            this.actualizarCaja(tx.cuentaDestino, -monto, 0);
          }
        }
      }
    });
    const remainingTxs = allTxs.filter(t => t.idViaje !== cleanIdViaje);
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(remainingTxs));

    // 4. Eliminar el registro en la tabla Viajes
    const remainingViajes = viajes.filter(v => v.idViaje !== cleanIdViaje);
    localStorage.setItem(STORAGE_KEYS.VIAJES, JSON.stringify(remainingViajes));

    // Sincronizar eliminación en Google Apps Script si está disponible
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'eliminarViajeCascada',
          payload: { idViaje: cleanIdViaje }
        })
      }).catch(err => console.warn('Error sincronizando eliminación cascada viaje:', err));
    }
  }

  // Actualización de Manifiestos
  public updateManifiestoOrigen(manifiesto: ManifiestoOrigen): void {
    const origenes = this.getManifiestosOrigen();
    const idx = origenes.findIndex(m => m.idManifiesto === manifiesto.idManifiesto);
    if (idx !== -1) {
      origenes[idx] = { ...origenes[idx], ...manifiesto };
      localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify(origenes));
      this.recalcularManifiestoOrigen(manifiesto.idManifiesto);
      this.recalcularViaje(manifiesto.idViajeAsignado);
    }
  }

  public updateManifiestoDestino(sub: ManifiestoDestino): void {
    const subs = this.getManifiestosDestino();
    const idx = subs.findIndex(s => s.idSubManifiesto === sub.idSubManifiesto);
    if (idx !== -1) {
      const saldos = calcularSaldosSubManifiesto(sub);
      subs[idx] = {
        ...subs[idx],
        ...sub,
        saldoPendienteClienteBs: saldos.saldoPendienteCliente,
        saldoPendienteAgenciaBs: saldos.saldoPendienteAgencia
      };
      localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subs));
      if (sub.idManifiestoPadre) {
        this.recalcularManifiestoOrigen(sub.idManifiestoPadre);
      }
      if (sub.idViaje) {
        this.recalcularViaje(sub.idViaje);
      }
    }
  }

  public async guardarSubManifiestoConSaldosSeparados(payload: any): Promise<{
    status: string;
    message: string;
    saldosCalculados: { fleteTotal: number; saldoPendienteCliente: number; saldoPendienteAgencia: number };
  }> {
    const pagadoOrigen = Number(payload.pagadoOrigen || payload.pagadoOrigenBs || 0);
    const porPagarDestino = Number(payload.porPagarDestino || payload.porPagarDestinoBs || payload.saldoInicialCobrarBs || 0);
    const fleteTotal = pagadoOrigen + porPagarDestino;

    let saldoPendienteCliente = 0;
    let saldoPendienteAgencia = 0;

    const tipoRespDestino = String(payload.tipoResponsableDestino || payload.responsableDestinoTipo || payload.tipoDeudor || '').toLowerCase().trim();
    if (tipoRespDestino === 'cliente' || tipoRespDestino === 'directo') {
      saldoPendienteCliente = porPagarDestino;
    } else if (tipoRespDestino === 'agencia' || tipoRespDestino === 'sucursal') {
      saldoPendienteAgencia = porPagarDestino;
    } else {
      saldoPendienteCliente = porPagarDestino;
    }

    const tipoRespOrigen = String(payload.tipoResponsableOrigen || payload.responsableOrigenTipo || '').toLowerCase().trim();
    if (tipoRespOrigen === 'cliente') {
      saldoPendienteCliente += Number(payload.creditoOrigen || payload.creditoOrigenBs || 0);
    } else if (tipoRespOrigen === 'agencia' || tipoRespOrigen === 'sucursal') {
      saldoPendienteAgencia += Number(payload.creditoOrigen || payload.creditoOrigenBs || 0);
    }

    const subs = this.getManifiestosDestino();
    const idBuscado = String(payload.idSubManifiesto || payload.nroManifiesto || '').trim();
    const idx = subs.findIndex(s => s.idSubManifiesto === idBuscado || s.nroManifiesto === idBuscado);

    if (idx !== -1) {
      subs[idx] = {
        ...subs[idx],
        ...payload,
        fleteAsignadoBs: fleteTotal,
        pagadoOrigenBs: pagadoOrigen,
        porPagarDestinoBs: porPagarDestino,
        saldoPendienteClienteBs: saldoPendienteCliente,
        saldoPendienteAgenciaBs: saldoPendienteAgencia
      };
      localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subs));
      if (subs[idx].idManifiestoPadre) {
        this.recalcularManifiestoOrigen(subs[idx].idManifiestoPadre);
      }
      if (subs[idx].idViaje) {
        this.recalcularViaje(subs[idx].idViaje);
      }
    }

    // Enviar a Google Apps Script
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'guardarSubManifiestoConSaldosSeparados',
            payload
          })
        });
      } catch (err) {
        console.warn('Error syncing guardarSubManifiestoConSaldosSeparados:', err);
      }
    }

    return {
      status: 'success',
      message: 'Sub-manifiesto registrado con saldos independientes para cliente y agencia correctamente.',
      saldosCalculados: { fleteTotal, saldoPendienteCliente, saldoPendienteAgencia }
    };
  }

  public deleteManifiestoOrigen(idManifiesto: string): void {
    const origenes = this.getManifiestosOrigen();
    const cleanId = String(idManifiesto || '').trim();
    const target = origenes.find(m => m.idManifiesto === cleanId || m.nroManifiestoMIC === cleanId);
    if (!target) return;

    // Paso A: Buscar y marcar submanifiestos hijos
    const allSubs = this.getManifiestosDestino();
    const childSubs = allSubs.filter(
      s => s.idManifiestoPadre === target.idManifiesto || s.nroManifiesto === target.nroManifiestoMIC
    );
    const subIds = new Set(childSubs.map(s => s.idSubManifiesto));
    const subNros = new Set(childSubs.map(s => s.nroManifiesto).filter(Boolean));
    const allManifRefs = new Set([target.nroManifiestoMIC, target.idManifiesto, ...subNros, ...subIds]);

    // Paso B: Movimientos de destino vinculados - Eliminar y revertir en Arqueo_Cajas
    const allMovs = this.getMovimientos();
    const childMovs = allMovs.filter((m: MovimientoManifDestino) => subIds.has(m.idSubManifiesto));
    childMovs.forEach((mov: MovimientoManifDestino) => {
      const monto = Number(mov.importeBs || 0);
      if (monto > 0 && mov.cajaCuentaAfectada) {
        if (mov.tipoMovimiento === 'Ingreso') {
          this.actualizarCaja(mov.cajaCuentaAfectada, -monto, 0);
        } else if (mov.tipoMovimiento === 'Gasto') {
          this.actualizarCaja(mov.cajaCuentaAfectada, 0, -monto);
        }
      }
    });
    const remainingMovs = allMovs.filter((m: MovimientoManifDestino) => !subIds.has(m.idSubManifiesto));
    localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(remainingMovs));

    // Paso C: Transacciones Diarias vinculadas - Eliminar y revertir en Arqueo_Cajas
    const allTxs = this.getTransacciones();
    const childTxs = allTxs.filter(t => {
      const matchManif = t.nroManifiesto && allManifRefs.has(t.nroManifiesto);
      const matchNotas = t.notas && Array.from(allManifRefs).some(ref => ref && t.notas?.includes(ref));
      return matchManif || matchNotas;
    });
    childTxs.forEach(tx => {
      const monto = Number(tx.montoBs || 0);
      if (monto > 0) {
        if (tx.tipo === 'Ingreso') {
          this.actualizarCaja(tx.metodoPago, -monto, 0);
        } else if (tx.tipo === 'Gasto') {
          this.actualizarCaja(tx.metodoPago, 0, -monto);
        } else if (tx.tipo === 'Traspaso') {
          this.actualizarCaja(tx.metodoPago, monto, 0);
          if (tx.cuentaDestino) {
            this.actualizarCaja(tx.cuentaDestino, -monto, 0);
          }
        }
      }
    });
    const remainingTxs = allTxs.filter(t => !childTxs.some(ct => ct.idTransaccion === t.idTransaccion));
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(remainingTxs));

    // Paso D: Reversión en Arqueo_Cajas de montos cobrados en origen directos
    childSubs.forEach(sub => {
      const pagadoOrig = Number(sub.pagadoOrigenBs || 0);
      if (pagadoOrig > 0) {
        const yaRevertidoPorTx = childTxs.some(t => t.nroManifiesto === sub.nroManifiesto && t.tipo === 'Ingreso');
        if (!yaRevertidoPorTx) {
          const cta = sub.cuentaAfectadaOrigen || `Caja Sucursal ${target.sucursalOrigen}`;
          this.actualizarCaja(cta, -pagadoOrig, 0);
        }
      }
      const cobradoDest = Number(sub.cobrosRealizadosBs || 0);
      if (cobradoDest > 0) {
        const yaRevertidoPorMov = childMovs.some((m: MovimientoManifDestino) => m.idSubManifiesto === sub.idSubManifiesto && m.tipoMovimiento === 'Ingreso');
        if (!yaRevertidoPorMov) {
          const ctaDest = (sub as any).cajaAfectada || `Caja Sucursal ${sub.sucursalDestino}`;
          this.actualizarCaja(ctaDest, -cobradoDest, 0);
        }
      }
    });

    // Eliminar Sub-manifiestos
    const remainingSubs = allSubs.filter(
      s => s.idManifiestoPadre !== target.idManifiesto && s.nroManifiesto !== target.nroManifiestoMIC
    );
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(remainingSubs));

    // Eliminar el Manifiesto Maestro de origen
    const remainingOrigenes = origenes.filter(
      m => m.idManifiesto !== target.idManifiesto && m.nroManifiestoMIC !== target.nroManifiestoMIC
    );
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify(remainingOrigenes));

    // Paso E: Recálculo automático del viaje
    if (target.idViajeAsignado) {
      this.recalcularViaje(target.idViajeAsignado);
    }

    // Sincronizar eliminación en Google Apps Script si está disponible
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'eliminarManifiestoCascada',
          payload: { idManifiesto: target.idManifiesto, nroManifiestoMIC: target.nroManifiestoMIC }
        })
      }).catch(err => console.warn('Error sincronizando eliminación cascada manifiesto:', err));
    }
  }

  public deleteManifiestoDestino(idSub: string): void {
    const subs = this.getManifiestosDestino();
    const cleanId = String(idSub || '').trim();
    const target = subs.find(s => s.idSubManifiesto === cleanId || s.nroManifiesto === cleanId);
    if (!target) return;

    const subRefs = new Set([target.idSubManifiesto, target.nroManifiesto].filter(Boolean));

    // 1. Movimientos del submanifiesto - Reversión de caja y eliminación
    const allMovs = this.getMovimientos();
    const targetMovs = allMovs.filter((m: MovimientoManifDestino) => subRefs.has(m.idSubManifiesto));
    targetMovs.forEach((mov: MovimientoManifDestino) => {
      const monto = Number(mov.importeBs || 0);
      if (monto > 0 && mov.cajaCuentaAfectada) {
        if (mov.tipoMovimiento === 'Ingreso') {
          this.actualizarCaja(mov.cajaCuentaAfectada, -monto, 0);
        } else if (mov.tipoMovimiento === 'Gasto') {
          this.actualizarCaja(mov.cajaCuentaAfectada, 0, -monto);
        }
      }
    });
    const remainingMovs = allMovs.filter((m: MovimientoManifDestino) => !subRefs.has(m.idSubManifiesto));
    localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(remainingMovs));

    // 2. Transacciones vinculadas a este submanifiesto - Reversión de caja y eliminación
    const allTxs = this.getTransacciones();
    const targetTxs = allTxs.filter(t => {
      const matchManif = t.nroManifiesto && subRefs.has(t.nroManifiesto);
      const matchNotas = t.notas && Array.from(subRefs).some(ref => ref && t.notas?.includes(ref));
      return matchManif || matchNotas;
    });

    targetTxs.forEach(tx => {
      const monto = Number(tx.montoBs || 0);
      if (monto > 0) {
        if (tx.tipo === 'Ingreso') {
          this.actualizarCaja(tx.metodoPago, -monto, 0);
        } else if (tx.tipo === 'Gasto') {
          this.actualizarCaja(tx.metodoPago, 0, -monto);
        } else if (tx.tipo === 'Traspaso') {
          this.actualizarCaja(tx.metodoPago, monto, 0);
          if (tx.cuentaDestino) this.actualizarCaja(tx.cuentaDestino, -monto, 0);
        }
      }
    });
    const remainingTxs = allTxs.filter(t => !targetTxs.some(tt => tt.idTransaccion === t.idTransaccion));
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(remainingTxs));

    // 3. Gastos de ruta vinculados al submanifiesto
    const allGastos = this.getGastosRuta();
    const targetGastos = allGastos.filter(g => {
      const matchDoc = g.nroFacturaBoleta && subRefs.has(g.nroFacturaBoleta);
      const matchDet = g.detalleGasto && Array.from(subRefs).some(ref => ref && g.detalleGasto?.includes(ref));
      return matchDoc || matchDet;
    });

    targetGastos.forEach(g => {
      const monto = Number(g.importeBs || 0);
      if (monto > 0 && g.cajaCuentaUtilizada) {
        this.actualizarCaja(g.cajaCuentaUtilizada, 0, -monto);
      }
    });
    const remainingGastos = allGastos.filter(g => !targetGastos.some(tg => tg.idGastoRuta === g.idGastoRuta));
    localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(remainingGastos));

    // 4. Reversión de cobros en origen si no se cubrieron por transacciones
    if (target.pagadoOrigenBs > 0 && !targetTxs.some(t => t.tipo === 'Ingreso')) {
      const cta = target.cuentaAfectadaOrigen || 'Caja Agencia Origen';
      this.actualizarCaja(cta, -target.pagadoOrigenBs, 0);
    }

    // 5. Eliminar el sub-manifiesto
    const filtered = subs.filter(s => s.idSubManifiesto !== cleanId && s.nroManifiesto !== cleanId);
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(filtered));

    // 6. Recalcular Manifiesto Maestro Padre y Viaje
    let idViajeAsociado = target.idViaje;
    if (target.idManifiestoPadre) {
      this.recalcularManifiestoOrigen(target.idManifiestoPadre);
      const origenes = this.getManifiestosOrigen();
      const parent = origenes.find(m => m.idManifiesto === target.idManifiestoPadre);
      if (parent?.idViajeAsignado) {
        idViajeAsociado = parent.idViajeAsignado;
      }
    }

    if (idViajeAsociado) {
      this.recalcularViaje(idViajeAsociado);
    }

    // 7. Sincronizar eliminación en cascada en Google Apps Script
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'eliminarSubManifiestoCascada',
          idSubManifiesto: target.idSubManifiesto,
          payload: { idSubManifiesto: target.idSubManifiesto, nroManifiesto: target.nroManifiesto }
        })
      }).catch(err => console.warn('Error sincronizando eliminación cascada sub-manifiesto:', err));
    }
  }

  /**
   * Elimina un sub-manifiesto por completo en cascada en toda la base de datos y Google Sheets
   */
  public async eliminarSubManifiestoCascada(idSubManifiesto: string): Promise<{ status: 'success' | 'error'; message: string }> {
    const cleanId = String(idSubManifiesto || '').trim();
    if (!cleanId) return { status: 'error', message: 'No se proporcionó el ID del Sub-Manifiesto.' };

    this.deleteManifiestoDestino(cleanId);
    return {
      status: 'success',
      message: `Sub-manifiesto ${cleanId} eliminado por completo de todo el sistema.`
    };
  }

  // Actualización de Gastos de Ruta
  public updateGastoRuta(gasto: GastoRutaCamion): void {
    const gastos = this.getGastosRuta();
    const idx = gastos.findIndex(g => g.idGastoRuta === gasto.idGastoRuta);
    if (idx !== -1) {
      const old = gastos[idx];
      this.actualizarCaja(old.cajaCuentaUtilizada, 0, -old.importeBs);
      this.actualizarCaja(gasto.cajaCuentaUtilizada, 0, gasto.importeBs);
      gastos[idx] = gasto;
      localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(gastos));
      this.recalcularViaje(gasto.idViajeAsignado);
    }
  }

  public deleteGastoRuta(idGasto: string): void {
    const gastos = this.getGastosRuta();
    const target = gastos.find(g => g.idGastoRuta === idGasto);
    if (!target) return;
    this.actualizarCaja(target.cajaCuentaUtilizada, 0, -target.importeBs);
    const filtered = gastos.filter(g => g.idGastoRuta !== idGasto);
    localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(filtered));
    this.recalcularViaje(target.idViajeAsignado);
  }

  // Actualización y Edición de Traspasos
  public updateTraspaso(traspaso: TraspasoFondos): void {
    const traspasos = this.getTraspasos();
    const idx = traspasos.findIndex(t => t.idTraspaso === traspaso.idTraspaso);
    if (idx !== -1) {
      const old = traspasos[idx];
      this.actualizarCaja(old.cuentaOrigen, 0, -old.montoBs);
      this.actualizarCaja(old.cuentaDestino, -old.montoBs, 0);
      this.actualizarCaja(traspaso.cuentaOrigen, 0, traspaso.montoBs);
      this.actualizarCaja(traspaso.cuentaDestino, traspaso.montoBs, 0);
      traspasos[idx] = traspaso;
      localStorage.setItem(STORAGE_KEYS.TRASPASOS, JSON.stringify(traspasos));
    }
  }

  public deleteTraspaso(idTraspaso: string): void {
    const traspasos = this.getTraspasos();
    const target = traspasos.find(t => t.idTraspaso === idTraspaso);
    if (!target) return;
    this.actualizarCaja(target.cuentaOrigen, 0, -target.montoBs);
    this.actualizarCaja(target.cuentaDestino, -target.montoBs, 0);
    const filtered = traspasos.filter(t => t.idTraspaso !== idTraspaso);
    localStorage.setItem(STORAGE_KEYS.TRASPASOS, JSON.stringify(filtered));
  }

  // Catálogos & Ajustes (Centros de Costo / Camiones, Choferes, Cajas con Saldo Inicial)
  public addCamion(camion: any): void {
    const cat = this.getCatalogos();
    cat.camiones.push(camion);
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  public updateCamion(placaOriginal: string, camion: any): void {
    const cat = this.getCatalogos();
    const idx = cat.camiones.findIndex(c => c.placa === placaOriginal);
    if (idx !== -1) {
      cat.camiones[idx] = camion;
      localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
    }
  }

  public deleteCamion(placa: string): void {
    const cat = this.getCatalogos();
    cat.camiones = cat.camiones.filter(c => c.placa !== placa);
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  public addChofer(chofer: any): void {
    const cat = this.getCatalogos();
    if (!cat.choferes) cat.choferes = [];
    cat.choferes.push(chofer);
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  public updateChofer(chofer: any): void {
    const cat = this.getCatalogos();
    if (!cat.choferes) cat.choferes = [];
    const idx = cat.choferes.findIndex(c => c.idChofer === chofer.idChofer);
    if (idx !== -1) {
      cat.choferes[idx] = chofer;
      localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
    }
  }

  public deleteChofer(idChofer: string): void {
    const cat = this.getCatalogos();
    if (!cat.choferes) return;
    cat.choferes = cat.choferes.filter(c => c.idChofer !== idChofer);
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  public addCajaCuenta(caja: CajaCuenta): void {
    const cajas = this.getCajas();
    caja.saldoDisponible = (Number(caja.saldoInicial) || 0) + (caja.totalCobrado || 0) - (caja.totalGastado || 0);
    cajas.push(caja);
    localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(cajas));

    const cat = this.getCatalogos();
    if (!cat.cajasCuentas.includes(caja.nombre)) {
      cat.cajasCuentas.push(caja.nombre);
      localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
    }
  }

  public updateCajaCuenta(nombreOriginal: string, caja: CajaCuenta): void {
    const cajas = this.getCajas();
    const idx = cajas.findIndex(c => c.nombre === nombreOriginal);
    if (idx !== -1) {
      const nuevoInicial = Number(caja.saldoInicial) || 0;
      const disponible = nuevoInicial + (cajas[idx].totalCobrado || 0) - (cajas[idx].totalGastado || 0);
      cajas[idx] = {
        ...cajas[idx],
        ...caja,
        saldoInicial: nuevoInicial,
        totalCobrado: cajas[idx].totalCobrado,
        totalGastado: cajas[idx].totalGastado,
        saldoDisponible: disponible
      };
      localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(cajas));

      const cat = this.getCatalogos();
      const catIdx = cat.cajasCuentas.indexOf(nombreOriginal);
      if (catIdx !== -1) {
        cat.cajasCuentas[catIdx] = caja.nombre;
        localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
      }
    }
  }

  public deleteCajaCuenta(nombre: string): void {
    const cajas = this.getCajas().filter(c => c.nombre !== nombre);
    localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(cajas));

    const cat = this.getCatalogos();
    cat.cajasCuentas = cat.cajasCuentas.filter(c => c !== nombre);
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  public addSucursal(nombre: string): void {
    const cat = this.getCatalogos();
    if (!cat.sucursales.includes(nombre)) {
      cat.sucursales.push(nombre);
      localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
    }
  }

  public deleteSucursal(nombre: string): void {
    const cat = this.getCatalogos();
    cat.sucursales = cat.sucursales.filter(s => s !== nombre);
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));
  }

  // Categorías
  public getCategorias(): CategoriaFinanciera[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIAS);
    return raw ? JSON.parse(raw) : INITIAL_CATEGORIAS;
  }

  public addCategoria(cat: Omit<CategoriaFinanciera, 'id' | 'esPredefinida'>): CategoriaFinanciera {
    const nueva: CategoriaFinanciera = {
      ...cat,
      id: `cat-${Date.now()}`,
      esPredefinida: false
    };
    const list = this.getCategorias();
    list.push(nueva);
    localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(list));
    return nueva;
  }

  public updateCategoria(cat: CategoriaFinanciera): void {
    const list = this.getCategorias();
    const idx = list.findIndex(c => c.id === cat.id);
    if (idx !== -1) {
      list[idx] = cat;
      localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(list));
    }
  }

  public deleteCategoria(id: string): boolean {
    const list = this.getCategorias();
    const cat = list.find(c => c.id === id);
    if (cat?.esPredefinida) return false; // Proteger esenciales
    const filtered = list.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(filtered));
    return true;
  }

  // Presupuestos Mensuales
  public getPresupuestos(mesAno?: string): PresupuestoMensual[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRESUPUESTOS);
    const list: PresupuestoMensual[] = raw ? JSON.parse(raw) : INITIAL_PRESUPUESTOS;
    if (mesAno) {
      return list.filter(p => p.mesAno === mesAno);
    }
    return list;
  }

  public setPresupuesto(categoria: string, montoPresupuestadoBs: number, mesAno: string): void {
    const list = this.getPresupuestos();
    const idx = list.findIndex(p => p.categoria === categoria && p.mesAno === mesAno);
    if (idx !== -1) {
      list[idx].montoPresupuestadoBs = montoPresupuestadoBs;
    } else {
      list.push({
        id: `pre-${Date.now()}`,
        categoria,
        montoPresupuestadoBs,
        mesAno
      });
    }
    localStorage.setItem(STORAGE_KEYS.PRESUPUESTOS, JSON.stringify(list));
  }

  // Recordatorios Recurrentes
  public getRecordatorios(): RecordatorioRecurrente[] {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDATORIOS);
    return raw ? JSON.parse(raw) : INITIAL_RECORDATORIOS;
  }

  public addRecordatorio(rec: Omit<RecordatorioRecurrente, 'id'>): RecordatorioRecurrente {
    const nuevo: RecordatorioRecurrente = {
      ...rec,
      id: `rec-${Date.now()}`
    };
    const list = this.getRecordatorios();
    list.push(nuevo);
    localStorage.setItem(STORAGE_KEYS.RECORDATORIOS, JSON.stringify(list));
    return nuevo;
  }

  public updateRecordatorio(rec: RecordatorioRecurrente): void {
    const list = this.getRecordatorios();
    const idx = list.findIndex(r => r.id === rec.id);
    if (idx !== -1) {
      list[idx] = rec;
      localStorage.setItem(STORAGE_KEYS.RECORDATORIOS, JSON.stringify(list));
    }
  }

  public deleteRecordatorio(id: string): void {
    const list = this.getRecordatorios();
    const filtered = list.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.RECORDATORIOS, JSON.stringify(filtered));
  }

  // Traspasos entre Métodos de Pago y Sucursales
  public async registrarTraspaso(traspaso: Omit<TraspasoFondos, 'idTraspaso'>): Promise<TraspasoFondos> {
    const nuevo: TraspasoFondos = {
      ...traspaso,
      idTraspaso: `TRS-${Date.now()}`
    };

    // Agregar a lista de traspasos
    const raw = localStorage.getItem(STORAGE_KEYS.TRASPASOS);
    const list: TraspasoFondos[] = raw ? JSON.parse(raw) : [];
    list.unshift(nuevo);
    localStorage.setItem(STORAGE_KEYS.TRASPASOS, JSON.stringify(list));

    // Descontar origen y sumar destino en arqueo de cajas
    this.actualizarCaja(traspaso.cuentaOrigen, 0, traspaso.montoBs);
    this.actualizarCaja(traspaso.cuentaDestino, traspaso.montoBs, 0);

    // Registrar como Transacción de Traspaso para reportes
    await this.addTransaccion({
      tipo: 'Traspaso',
      fecha: traspaso.fechaHora.split(' ')[0],
      categoria: 'Traspaso de Fondos',
      montoBs: traspaso.montoBs,
      metodoPago: traspaso.cuentaOrigen,
      cuentaDestino: traspaso.cuentaDestino,
      notas: `${traspaso.motivo} (Comp: ${traspaso.nroComprobante || 'S/N'})`,
      comprobanteFotoUrl: traspaso.comprobanteFotoUrl,
      sucursal: traspaso.sucursalOrigen
    });

    return nuevo;
  }

  public getTraspasos(): TraspasoFondos[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TRASPASOS);
    return raw ? JSON.parse(raw) : [];
  }

  // Seguridad
  public getSeguridad(): ConfigSeguridad {
    const raw = localStorage.getItem(STORAGE_KEYS.SEGURIDAD);
    return raw ? JSON.parse(raw) : INITIAL_SEGURIDAD;
  }

  public setSeguridad(cfg: ConfigSeguridad): void {
    localStorage.setItem(STORAGE_KEYS.SEGURIDAD, JSON.stringify(cfg));
  }

  // -----------------------------------------------------------------
  // MÉTODOS ORIGINALES DE TRANSPORTE
  // -----------------------------------------------------------------

  public async addGastoRuta(gasto: Omit<GastoRutaCamion, 'idGastoRuta' | 'sincronizado'>, fotoBase64?: string): Promise<{ success: boolean; id: string; queued: boolean }> {
    const gastos = this.getGastosRuta();

    // Prevenir doble registro de gasto en ruta
    const duplicate = gastos.find(g => 
      g.idViajeAsignado === gasto.idViajeAsignado &&
      g.importeBs === gasto.importeBs &&
      g.categoriaGasto === gasto.categoriaGasto &&
      g.nroFacturaBoleta === gasto.nroFacturaBoleta &&
      (Date.now() - parseInt(g.idGastoRuta.replace('GST-', '') || '0', 10)) < 3000
    );
    if (duplicate) {
      console.warn('Gasto de ruta duplicado bloqueado:', duplicate.idGastoRuta);
      return { success: true, id: duplicate.idGastoRuta, queued: false };
    }

    const id = `GST-${Date.now()}`;
    const nuevoGasto: GastoRutaCamion = {
      ...gasto,
      idGastoRuta: id,
      comprobanteFotoUrl: gasto.comprobanteFotoUrl || (fotoBase64 ? fotoBase64 : undefined),
      sincronizado: false
    };

    gastos.unshift(nuevoGasto);
    localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(gastos));

    // Afectar caja o método de pago
    const esIngreso = gasto.tipoOperacion === 'Ingreso';
    this.actualizarCaja(
      gasto.cajaCuentaUtilizada || 'Efectivo Chofer Ruta', 
      esIngreso ? gasto.importeBs : 0, 
      !esIngreso ? gasto.importeBs : 0
    );

    // Si es un cobro de flete en ruta, amortizar saldo en Manifiestos_Destino
    if (esIngreso && (gasto.categoriaGasto.includes('Flete') || gasto.categoriaGasto.includes('Cobro'))) {
      const subs = this.getManifiestosDestino();
      const subIdx = subs.findIndex(s => s.idViaje === gasto.idViajeAsignado && (s.saldoPendienteClienteBs || 0) > 0);
      if (subIdx !== -1) {
        const actualCobrado = (subs[subIdx].cobrosRealizadosBs || 0) + gasto.importeBs;
        const nuevoSaldo = Math.max(0, (subs[subIdx].saldoInicialCobrarBs || 0) - actualCobrado);
        subs[subIdx].cobrosRealizadosBs = actualCobrado;
        subs[subIdx].saldoPendienteClienteBs = nuevoSaldo;
        if (nuevoSaldo <= 0) {
          subs[subIdx].estadoLiquidacion = 'Liquidado en Sucursal';
        }
        localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subs));
      }
    }

    // También reflejar en transacciones diarias para reportes unificados
    await this.addTransaccion({
      tipo: esIngreso ? 'Ingreso' : 'Gasto',
      fecha: gasto.fechaHora.split(' ')[0],
      categoria: gasto.categoriaGasto,
      montoBs: gasto.importeBs,
      metodoPago: gasto.cajaCuentaUtilizada || 'Efectivo Chofer Ruta',
      notas: gasto.detalleGasto,
      comprobanteFotoUrl: nuevoGasto.comprobanteFotoUrl,
      placaCamion: gasto.placaCamion,
      idViaje: gasto.idViajeAsignado
    }, fotoBase64);

    // Recalcular viaje asociado
    this.recalcularViaje(gasto.idViajeAsignado);

    // Intentar sincronizar con Google Sheets
    const gasUrl = this.getGasUrl();
    let queued = true;

    if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'registrarGastoRuta',
            payload: {
              ...nuevoGasto,
              fotoBase64: fotoBase64
            }
          })
        });
        nuevoGasto.sincronizado = true;
        queued = false;
        localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(gastos));
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      } catch (err) {
        console.warn('Network issue, queueing gasto offline:', err);
      }
    }

    if (queued) {
      this.addToSyncQueue({
        id: `sync-${id}`,
        tipo: 'gasto_ruta',
        data: { ...nuevoGasto, fotoBase64 },
        timestamp: new Date().toISOString(),
        reintentos: 0
      });
    }

    return { success: true, id, queued };
  }

  public async addMovimientoDestino(mov: Omit<MovimientoManifDestino, 'idMovimiento'>): Promise<{ success: boolean; id: string; queued: boolean }> {
    const id = `MOV-${Date.now()}`;
    const nuevoMov: MovimientoManifDestino = {
      ...mov,
      idMovimiento: id
    };

    const movimientos = this.getMovimientos();
    movimientos.unshift(nuevoMov);
    localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(movimientos));

    // Actualizar submanifiesto
    const submanifiestos = this.getManifiestosDestino();
    const idx = submanifiestos.findIndex(s => s.idSubManifiesto === mov.idSubManifiesto);
    if (idx !== -1) {
      const sub = { ...submanifiestos[idx] };
      if (mov.categoriaConcepto === 'Cobro Flete Saldo') {
        sub.cobrosRealizadosBs += mov.importeBs;
        if (mov.tipoRecaudador) {
          sub.tipoRecaudadorDestino = mov.tipoRecaudador;
        }
        if (mov.estadoRendicion) {
          sub.estadoRendicionDestino = mov.estadoRendicion;
        }
        if (mov.tipoRecaudador === 'Agencia de Destino Cobró') {
          if (mov.estadoRendicion === 'Retenido en Agencia (CxC Agencia)') {
            sub.montoRetenidoAgenciaBs = (sub.montoRetenidoAgenciaBs || 0) + mov.importeBs;
            sub.estadoCobranzaDestino = 'Retenido en Agencia (CxC Agencia)';
          } else {
            sub.estadoCobranzaDestino = 'Cobrado / Liquidado a Empresa';
            if (mov.comprobanteDepositoUrl) {
              sub.comprobanteDepositoUrl = mov.comprobanteDepositoUrl;
            }
          }
        } else if (mov.tipoRecaudador === 'Cobro Directo (Cliente canceló a Empresa/Chofer)') {
          sub.estadoCobranzaDestino = 'Cobrado / Liquidado a Empresa';
        }
        if (mov.comprobanteDepositoUrl) {
          sub.comprobanteDepositoUrl = mov.comprobanteDepositoUrl;
        }
        sub.fechaCobroDestino = mov.fechaHora.split(' ')[0];
      } else if (mov.categoriaConcepto.toLowerCase().includes('delivery') || (mov.tipoMovimiento === 'Ingreso' && mov.categoriaConcepto !== 'Cobro Flete Saldo')) {
        sub.ingresosDeliveryOtrosBs += mov.importeBs;
      } else if (mov.tipoMovimiento === 'Gasto') {
        sub.gastosComisionesBs += mov.importeBs;
      }

      sub.recaudacionNetaCajaBs = sub.cobrosRealizadosBs + sub.ingresosDeliveryOtrosBs - sub.gastosComisionesBs;
      sub.saldoPendienteClienteBs = Math.max(0, sub.saldoInicialCobrarBs - sub.cobrosRealizadosBs);
      sub.estadoLiquidacion = sub.saldoPendienteClienteBs <= 0 ? 'Liquidado en Sucursal' : 'En Reparto';
      submanifiestos[idx] = sub;
      localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(submanifiestos));

      // Recalcular Manifiesto Padre
      this.recalcularManifiestoOrigen(sub.idManifiestoPadre);
    }

    const esIngreso = mov.tipoMovimiento === 'Ingreso';

    // Reflejar en transacciones diarias para reportes (addTransaccion ya actualiza la caja exactamente una vez)
    await this.addTransaccion({
      tipo: esIngreso ? 'Ingreso' : 'Gasto',
      fecha: mov.fechaHora.split(' ')[0],
      categoria: mov.categoriaConcepto,
      montoBs: mov.importeBs,
      metodoPago: mov.cajaCuentaAfectada,
      notas: `${mov.detalleOperacion} (${mov.nroComprobante})`,
      sucursal: mov.sucursal,
      nroManifiesto: submanifiestos[idx]?.nroManifiesto,
      skipSubAmortization: true
    });

    // Intentar sincronizar
    const gasUrl = this.getGasUrl();
    let queued = true;
    if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'registrarMovimientoDestino',
            payload: nuevoMov
          })
        });
        queued = false;
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      } catch (err) {
        console.warn('Network issue, queueing movimiento offline:', err);
      }
    }

    if (queued) {
      this.addToSyncQueue({
        id: `sync-${id}`,
        tipo: 'movimiento_destino',
        data: nuevoMov,
        timestamp: new Date().toISOString(),
        reintentos: 0
      });
    }

    return { success: true, id, queued };
  }

  public async crearViaje(viaje: Viaje): Promise<boolean> {
    const viajes = this.getViajes();
    viajes.unshift(viaje);
    localStorage.setItem(STORAGE_KEYS.VIAJES, JSON.stringify(viajes));

    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({ action: 'crearViaje', payload: viaje })
        });
      } catch (e) {
        this.addToSyncQueue({
          id: `sync-viaje-${viaje.idViaje}`,
          tipo: 'nuevo_viaje',
          data: viaje,
          timestamp: new Date().toISOString(),
          reintentos: 0
        });
      }
    }
    return true;
  }

  public async crearDespacho(origen: ManifiestoOrigen, submanifiestos: ManifiestoDestino[]): Promise<boolean> {
    const origenes = this.getManifiestosOrigen();
    origenes.unshift(origen);
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify(origenes));

    const submanifiestosConViaje = submanifiestos.map(sub => {
      const saldos = calcularSaldosSubManifiesto(sub);
      return {
        ...sub,
        idViaje: sub.idViaje || origen.idViajeAsignado,
        saldoPendienteClienteBs: saldos.saldoPendienteCliente,
        saldoPendienteAgenciaBs: saldos.saldoPendienteAgencia
      };
    });

    const destinos = this.getManifiestosDestino();
    destinos.unshift(...submanifiestosConViaje);
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(destinos));

    // Auto-registrar y enriquecer tabla de clientes
    submanifiestos.forEach(sub => {
      const dest = sub.destinatario;
      if (dest && dest.trim()) {
        const clientes = this.getClientes();
        const existing = clientes.find(c => c.nombre.toLowerCase().trim() === dest.trim().toLowerCase());
        if (!existing) {
          this.addCliente({
            idCliente: `CLI-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 100)}`,
            nombre: dest.trim(),
            telefono: sub.telefonoContacto || '',
            direccion: sub.direccionDestinatario || '',
            ciudad: sub.sucursalDestino || '',
            activo: true,
            fechaRegistro: new Date().toISOString().split('T')[0]
          });
        } else if ((!existing.telefono && sub.telefonoContacto) || (!existing.direccion && sub.direccionDestinatario)) {
          this.updateCliente({
            ...existing,
            telefono: existing.telefono || sub.telefonoContacto || '',
            direccion: existing.direccion || sub.direccionDestinatario || ''
          });
        }
      }
    });

    // Registrar el cobro en origen como Cuenta por Cobrar a la Agencia (Pendiente de Liquidación)
    // Para el PROPIETARIO, este cobro en sucursal NO entra como efectivo disponible en su caja central;
    // representa una Cuenta por Cobrar a la Agencia de Origen. El efectivo real a caja ingresa
    // únicamente cuando la agencia liquide / remita a Central.
    if (origen.cobradoOrigenBs > 0) {
      for (const sub of submanifiestos) {
        const montoSub = Number(sub.pagadoOrigenBs) || 0;
        if (montoSub > 0) {
          const ctaAfectada = sub.cuentaAfectadaOrigen || `Caja Agencia ${origen.sucursalOrigen}`;

          await this.addTransaccion({
            tipo: 'Ingreso',
            fecha: origen.fechaEmision,
            categoria: 'Fletes Despachos MIC',
            montoBs: montoSub,
            metodoPago: 'Por Cobrar',
            modalidadPago: 'Credito',
            estadoCobroPago: 'Pendiente',
            cuentaAnticipo: ctaAfectada,
            deudorNombre: `Agencia ${origen.sucursalOrigen}`,
            notas: `Pago en origen (${sub.metodoCobroOrigen || 'Efectivo'}) encomienda ${sub.nroManifiesto} - ${sub.destinatario || ''} (Pendiente de Liquidación a Propietario / CxC Agencia)`,
            sucursal: origen.sucursalOrigen,
            idViaje: origen.idViajeAsignado,
            nroManifiesto: sub.nroManifiesto,
            skipSubAmortization: true
          });
        }
      }
    }

    // Recalcular viaje asociado
    this.recalcularViaje(origen.idViajeAsignado);

    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({
            action: 'crearDespacho',
            payload: { manifiestoOrigen: origen, subManifiestos: submanifiestos }
          })
        });
      } catch (e) {
        this.addToSyncQueue({
          id: `sync-despacho-${origen.idManifiesto}`,
          tipo: 'nuevo_manifiesto',
          data: { manifiestoOrigen: origen, subManifiestos: submanifiestos },
          timestamp: new Date().toISOString(),
          reintentos: 0
        });
      }
    }
    return true;
  }

  public async liquidarCobroOrigen(
    idSubManifiesto: string,
    cuentaCentral: string,
    fecha?: string,
    notas?: string
  ): Promise<boolean> {
    const subs = this.getManifiestosDestino();
    const idx = subs.findIndex(s => s.idSubManifiesto === idSubManifiesto);
    if (idx === -1) return false;

    const sub = subs[idx];
    const monto = Number(sub.pagadoOrigenBs || 0);
    if (monto <= 0) return false;

    const fechaHoy = fecha || new Date().toISOString().split('T')[0];

    sub.estadoLiquidacionAgencia = 'Liquidado a Central';
    sub.fechaLiquidacionAgencia = fechaHoy;
    sub.cuentaLiquidacionCentral = cuentaCentral;
    subs[idx] = sub;
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subs));

    // Registrar ingreso efectivo en Caja Central (ahora sí ingresa al saldo de caja del propietario)
    // Al usar tipo: 'Ingreso' y modalidadPago: 'Contado', addTransaccion acredita automáticamente la cuentaCentral
    await this.addTransaccion({
      tipo: 'Ingreso',
      fecha: fechaHoy,
      categoria: 'Liquidación Agencia a Central',
      montoBs: monto,
      metodoPago: cuentaCentral,
      modalidadPago: 'Contado',
      estadoCobroPago: 'Cobrado',
      sucursal: 'Central',
      idViaje: sub.idViaje,
      notas: `Liquidación cobro en origen encomienda ${sub.nroManifiesto} (${idSubManifiesto}) ingresado a ${cuentaCentral}. ${notas || ''}`.trim(),
      nroManifiesto: sub.nroManifiesto,
      skipSubAmortization: true
    });

    // Actualizar estado de la transacción previa de despacho a 'Cobrado'
    const transacciones = this.getTransacciones();
    transacciones.forEach(t => {
      if (
        (t.nroManifiesto && t.nroManifiesto === sub.nroManifiesto) ||
        (t.idSubManifiesto && t.idSubManifiesto === sub.idSubManifiesto)
      ) {
        if (t.categoria === 'Fletes Despachos MIC' || (t.notas && t.notas.toLowerCase().includes('pago en origen'))) {
          t.estadoCobroPago = 'Cobrado';
          t.notas = `${t.notas} [Liquidado a Central: ${cuentaCentral} - ${fechaHoy}]`;
        }
      }
    });
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(transacciones));

    // Sincronizar con backend si está en línea
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({
            action: 'liquidarCobroOrigen',
            payload: {
              idSubManifiesto,
              cuentaCentral,
              fecha: fechaHoy,
              notas
            }
          })
        });
      } catch (e) {
        this.addToSyncQueue({
          id: `sync-liq-ag-${idSubManifiesto}-${Date.now()}`,
          tipo: 'traspaso',
          data: { idSubManifiesto, cuentaCentral, fecha: fechaHoy, notas },
          timestamp: new Date().toISOString(),
          reintentos: 0
        });
      }
    }

    return true;
  }

  public async liquidarSaldosAgenciaDestino(
    agenciaDestino: string,
    cuentaCentral: string,
    montoALiquidar: number,
    fecha?: string,
    notas?: string
  ): Promise<boolean> {
    const subs = this.getManifiestosDestino();
    const fechaHoy = fecha || new Date().toISOString().split('T')[0];
    let restante = montoALiquidar;

    // Buscar sub-manifiestos de esa agencia que tengan monto retenido (CxC Agencia Destino)
    subs.forEach(s => {
      if (
        s.sucursalDestino.toLowerCase().trim() === agenciaDestino.toLowerCase().trim() &&
        (s.montoRetenidoAgenciaBs || 0) > 0 &&
        s.estadoRendicionDestino === 'Retenido en Agencia (CxC Agencia)' &&
        restante > 0
      ) {
        const montoRet = s.montoRetenidoAgenciaBs || 0;
        if (restante >= montoRet) {
          restante -= montoRet;
          s.montoRetenidoAgenciaBs = 0;
          s.estadoRendicionDestino = 'Depositado a Cuenta de Empresa';
          s.estadoCobranzaDestino = 'Cobrado / Liquidado a Empresa';
        } else {
          s.montoRetenidoAgenciaBs = montoRet - restante;
          restante = 0;
        }
      }
    });

    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subs));

    const cuentaAgencia = `CxC Agencia ${agenciaDestino}`;
    // Aumentar en caja central y descontar de cuenta agencia si existe
    this.actualizarCaja(cuentaCentral, montoALiquidar, 0);
    this.actualizarCaja(cuentaAgencia, 0, montoALiquidar);

    await this.addTransaccion({
      tipo: 'Traspaso',
      fecha: fechaHoy,
      categoria: 'Liquidación / Rendición de Agencia Destino',
      montoBs: montoALiquidar,
      metodoPago: cuentaAgencia,
      cuentaDestino: cuentaCentral,
      sucursal: agenciaDestino,
      notas: `Liquidación de cobranzas retenidas por Agencia ${agenciaDestino} transferidas a ${cuentaCentral}. ${notas || ''}`.trim()
    });

    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({
            action: 'liquidarSaldosAgenciaDestino',
            payload: {
              agenciaDestino,
              cuentaCentral,
              montoALiquidar,
              fecha: fechaHoy,
              notas
            }
          })
        });
      } catch (e) {
        this.addToSyncQueue({
          id: `sync-liq-ag-dest-${agenciaDestino}-${Date.now()}`,
          tipo: 'traspaso',
          data: { agenciaDestino, cuentaCentral, montoALiquidar, fecha: fechaHoy, notas },
          timestamp: new Date().toISOString(),
          reintentos: 0
        });
      }
    }

    return true;
  }

  public async liquidarAgenciaConDeducciones(payload: {
    tipo: 'ORIGEN' | 'DESTINO';
    agencia: string;
    subManifiestosIds: string[];
    montoBruto: number;
    deducciones: Array<{ categoria: string; montoBs: number; detalle?: string; porcentaje?: number }>;
    totalDeducciones: number;
    montoNeto: number;
    cuentaDestino: string;
    fecha?: string;
    nroComprobante?: string;
    comprobanteFotoUrl?: string;
    notas?: string;
    idViaje?: string;
  }): Promise<boolean> {
    const fechaHoy = payload.fecha || new Date().toISOString().split('T')[0];
    const subs = this.getManifiestosDestino();
    const targetSet = new Set(payload.subManifiestosIds.map(s => String(s).trim()));

    // 1. Actualizar estado de los sub-manifiestos afectados
    subs.forEach(s => {
      if (targetSet.has(s.idSubManifiesto) || (s.nroManifiesto && targetSet.has(s.nroManifiesto))) {
        if (payload.tipo === 'ORIGEN') {
          s.estadoLiquidacionAgencia = 'Liquidado a Central';
          s.fechaLiquidacionAgencia = fechaHoy;
          s.cuentaLiquidacionCentral = payload.cuentaDestino;
        } else {
          s.montoRetenidoAgenciaBs = 0;
          s.estadoRendicionDestino = 'Depositado a Cuenta de Empresa';
          s.estadoCobranzaDestino = 'Cobrado / Liquidado a Empresa';
          if ((s.saldoPendienteClienteBs || 0) <= 0) {
            s.estadoLiquidacion = 'Liquidado en Sucursal';
          }
        }
      }
    });
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subs));

    // 2. Incrementar Saldo Disponible de la caja central/destino por el monto NETO
    if (payload.montoNeto > 0) {
      this.actualizarCaja(payload.cuentaDestino, payload.montoNeto, 0);

      // Registrar asiento del depósito neto en Transacciones Diarias
      await this.addTransaccion({
        tipo: 'Ingreso',
        fecha: fechaHoy,
        categoria: payload.tipo === 'ORIGEN' ? 'Liquidación Fletes Origen' : 'Liquidación Agencia Destino',
        montoBs: payload.montoNeto,
        metodoPago: payload.cuentaDestino,
        sucursal: payload.agencia,
        idViaje: payload.idViaje,
        notas: `Depósito neto liquidación ${payload.tipo === 'ORIGEN' ? 'origen' : 'destino'} Agencia ${payload.agencia}. Bruto: Bs ${payload.montoBruto.toFixed(2)}, Deducciones: Bs ${payload.totalDeducciones.toFixed(2)}. ${payload.notas || ''} ${payload.nroComprobante ? `(Comp: ${payload.nroComprobante})` : ''}`.trim(),
        comprobanteFotoUrl: payload.comprobanteFotoUrl
      });
      // Como addTransaccion ya actualizó la caja una vez, revertimos el incremento previo para evitar duplicidad:
      this.actualizarCaja(payload.cuentaDestino, -payload.montoNeto, 0);
    }

    // 3. Registrar individualmente cada deducción retenida como Gasto en Transacciones Diarias
    const cuentaAgencia = payload.tipo === 'ORIGEN' ? `Caja Agencia ${payload.agencia}` : `CxC Agencia ${payload.agencia}`;
    for (const ded of payload.deducciones) {
      if (ded.montoBs > 0) {
        await this.addTransaccion({
          tipo: 'Gasto',
          fecha: fechaHoy,
          categoria: ded.categoria || 'Comisiones y Fleteros Locales',
          montoBs: ded.montoBs,
          metodoPago: cuentaAgencia,
          sucursal: payload.agencia,
          idViaje: payload.idViaje,
          notas: `Retención por liquidación de agencia ${payload.agencia}: ${ded.detalle || ded.categoria} ${ded.porcentaje ? `(${ded.porcentaje}%)` : ''}`.trim(),
          comprobanteFotoUrl: payload.comprobanteFotoUrl
        });
      }
    }

    // 4. Sincronizar con backend si está en línea
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'liquidarAgenciaConDeducciones',
            payload
          })
        });
      } catch (e) {
        this.addToSyncQueue({
          id: `sync-liq-ded-${payload.agencia}-${Date.now()}`,
          tipo: 'traspaso',
          data: payload,
          timestamp: new Date().toISOString(),
          reintentos: 0
        });
      }
    }

    return true;
  }

  public actualizarCaja(nombreCaja: string, cobrado: number, gastado: number): void {
    const cajas = this.getCajas();
    const idx = cajas.findIndex(c => c.nombre.toLowerCase().trim() === nombreCaja.toLowerCase().trim());
    if (idx !== -1) {
      cajas[idx].totalCobrado += cobrado;
      cajas[idx].totalGastado += gastado;
      cajas[idx].saldoDisponible = cajas[idx].saldoInicial + cajas[idx].totalCobrado - cajas[idx].totalGastado;
    } else {
      // Si no existe, crearla
      cajas.push({
        nombre: nombreCaja,
        tipo: nombreCaja.includes('Chofer') ? 'Efectivo Chofer' : nombreCaja.includes('Banco') ? 'Banco' : 'Caja Sucursal',
        ubicacion: nombreCaja.replace('Caja Sucursal', '').trim() || 'General',
        saldoInicial: 0,
        totalCobrado: cobrado,
        totalGastado: gastado,
        saldoDisponible: cobrado - gastado
      });
    }
    localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(cajas));
  }

  public recalcularViaje(idViaje: string): void {
    const viajes = this.getViajes();
    const idx = viajes.findIndex(v => v.idViaje === idViaje);
    if (idx === -1) return;

    const origenes = this.getManifiestosOrigen().filter(m => m.idViajeAsignado === idViaje);
    const fletes = origenes.reduce((acc, curr) => acc + (curr.fleteTotalBs || 0), 0);

    const subs = this.getManifiestosDestino().filter(
      s => s.idViaje === idViaje || origenes.some(o => o.idManifiesto === s.idManifiestoPadre)
    );
    const cobradoDestino = subs.reduce((acc, curr) => acc + (curr.cobrosRealizadosBs || 0), 0);

    const gastos = this.getGastosRuta().filter(g => g.idViajeAsignado === idViaje);
    const totalGastos = gastos.filter(g => g.tipoOperacion !== 'Ingreso').reduce((acc, curr) => acc + (curr.importeBs || 0), 0);
    const totalIngresosRuta = gastos.filter(g => g.tipoOperacion === 'Ingreso').reduce((acc, curr) => acc + (curr.importeBs || 0), 0);

    // Ingreso Bruto por Fletes del viaje (MIC + encomiendas + ingresos de ruta)
    const fletesTotal = fletes + totalIngresosRuta;
    const utilidad = fletesTotal - totalGastos;
    const margen = fletesTotal > 0 ? Number(((utilidad / fletesTotal) * 100).toFixed(1)) : 0;

    viajes[idx].fletesManifiestosBs = fletes;
    viajes[idx].gastosRutaBs = totalGastos;
    viajes[idx].utilidadViajeBs = utilidad;
    viajes[idx].margenPct = margen;
    viajes[idx].cobradoDestinoBs = cobradoDestino;

    localStorage.setItem(STORAGE_KEYS.VIAJES, JSON.stringify(viajes));
  }

  private recalcularManifiestoOrigen(idManifiesto: string): void {
    const origenes = this.getManifiestosOrigen();
    const idx = origenes.findIndex(m => m.idManifiesto === idManifiesto);
    if (idx === -1) return;

    const subs = this.getManifiestosDestino().filter(s => s.idManifiestoPadre === idManifiesto);
    const saldoPendienteTotal = subs.reduce((acc, curr) => acc + (curr.saldoPendienteClienteBs || 0), 0);
    const totalFlete = subs.reduce((acc, curr) => acc + (curr.fleteAsignadoBs || 0), 0);
    const cobradoOrigen = subs.reduce((acc, curr) => acc + (curr.pagadoOrigenBs || 0), 0);

    origenes[idx].fleteTotalBs = totalFlete;
    origenes[idx].cobradoOrigenBs = cobradoOrigen;
    origenes[idx].saldoCobrarDestinosBs = saldoPendienteTotal;
    const cobradoTotal = (totalFlete - saldoPendienteTotal);
    origenes[idx].porcCobranza = totalFlete > 0 ? Number(((cobradoTotal / totalFlete) * 100).toFixed(1)) : 100;

    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify(origenes));

    if (origenes[idx].idViajeAsignado) {
      this.recalcularViaje(origenes[idx].idViajeAsignado);
    }
  }

  public recalcularTodosLosViajes(): void {
    const viajes = this.getViajes();
    for (const v of viajes) {
      this.recalcularViaje(v.idViaje);
    }
  }

  private addToSyncQueue(item: PendingSyncItem): void {
    const queue = this.getPendingSync();
    queue.push(item);
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(queue));
  }

  public clearSyncQueue(): void {
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify([]));
  }

  // Sincronizar cola pendiente
  public async syncPendingQueue(): Promise<{ processed: number; errors: number }> {
    const queue = this.getPendingSync();
    const gasUrl = this.getGasUrl();

    if (queue.length === 0) return { processed: 0, errors: 0 };
    if (!navigator.onLine || !gasUrl) return { processed: 0, errors: queue.length };

    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'syncBatch',
          payload: queue
        })
      });

      // Mark gastos and tx as sincronizado
      const gastos = this.getGastosRuta().map(g => ({ ...g, sincronizado: true }));
      localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(gastos));

      const txs = this.getTransacciones().map(t => ({ ...t, sincronizado: true }));
      localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(txs));

      this.clearSyncQueue();
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

      return { processed: queue.length, errors: 0 };
    } catch (e) {
      console.error('Error sincronizando lote:', e);
      return { processed: 0, errors: queue.length };
    }
  }

  // Reportes de Viaje Chofer (Control y Liquidación)
  public getReportesChofer(): ReporteViajeChofer[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTES_CHOFER);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.REPORTES_CHOFER, JSON.stringify(INITIAL_REPORTES_CHOFER));
      return INITIAL_REPORTES_CHOFER;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_REPORTES_CHOFER;
    }
  }

  public getReporteChoferById(idReporteChofer: string): ReporteViajeChofer | undefined {
    return this.getReportesChofer().find(r => r.idReporteChofer === idReporteChofer);
  }

  public getReporteChoferByViaje(idViaje: string): ReporteViajeChofer | undefined {
    return this.getReportesChofer().find(r => r.idViaje === idViaje);
  }

  public async saveReporteChofer(
    reporte: ReporteViajeChofer,
    isLiquidar = false
  ): Promise<{ success: boolean; message: string; idReporteChofer: string }> {
    const reportes = this.getReportesChofer();

    // Auto cálculos
    const totalIng = (reporte.ingresos || []).reduce((sum, i) => sum + (Number(i.montoBs) || 0), 0);
    const totalGas = (reporte.gastos || []).reduce((sum, g) => sum + (Number(g.montoBs) || 0), 0);
    const saldo = Number((totalIng - totalGas).toFixed(2));

    const idRep = reporte.idReporteChofer || (`REP-CHOF-${(reporte.idViaje || 'VJ').replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`);
    const estado = isLiquidar ? 'Liquidado' : (reporte.estadoReporte || 'Borrador');
    const fechaCierre = isLiquidar ? (reporte.fechaCierre || new Date().toISOString().split('T')[0]) : (reporte.fechaCierre || '');

    const reporteActualizado: ReporteViajeChofer = {
      ...reporte,
      idReporteChofer: idRep,
      totalIngresosBs: Number(totalIng.toFixed(2)),
      totalGastosBs: Number(totalGas.toFixed(2)),
      saldoFavorContraBs: saldo,
      estadoReporte: estado,
      fechaCierre: fechaCierre
    };

    const idx = reportes.findIndex(r => r.idReporteChofer === idRep || r.idViaje === reporte.idViaje);
    if (idx !== -1) {
      reportes[idx] = reporteActualizado;
    } else {
      reportes.push(reporteActualizado);
    }

    localStorage.setItem(STORAGE_KEYS.REPORTES_CHOFER, JSON.stringify(reportes));

    // Si se liquida o cierra: Integración contable
    if (isLiquidar || estado === 'Liquidado' || estado === 'Cerrado') {
      const nombreCajaChofer = `Efectivo Chofer Ruta [${reporte.placaCamion || 'General'}]`;

      // 1. Sincronizar gastos con Gastos_Ruta_Camion y Transacciones_Diarias
      (reporte.gastos || []).forEach((gas, i) => {
        const monto = Number(gas.montoBs) || 0;
        if (monto > 0) {
          this.addGastoRuta({
            idViajeAsignado: reporte.idViaje,
            placaCamion: reporte.placaCamion,
            fechaHora: gas.fecha || reporte.fechaInicio,
            categoriaGasto: gas.conceptoGasto || 'Gasto Ruta Chofer',
            importeBs: monto,
            litrosDiesel: 0,
            idProveedor: gas.idProveedor,
            cajaCuentaUtilizada: nombreCajaChofer,
            nroFacturaBoleta: gas.nroFacturaRecibo || '',
            detalleGasto: `Liquidación Chofer: ${gas.detalleGasto || ''} (Rep: ${idRep})`,
            comprobanteFotoUrl: gas.comprobanteFotoUrl
          });

          this.addTransaccion({
            fecha: gas.fecha || reporte.fechaInicio,
            tipo: 'Gasto',
            categoria: gas.conceptoGasto || 'Gasto en Ruta',
            montoBs: monto,
            metodoPago: nombreCajaChofer,
            sucursal: reporte.rutaDestino || 'Ruta',
            placaCamion: reporte.placaCamion,
            idViaje: reporte.idViaje,
            notas: `Liquidación Chofer: ${gas.detalleGasto || gas.conceptoGasto || ''} (Rep: ${idRep})`,
            nroFacturaBoleta: gas.nroFacturaRecibo
          });
        }
      });

      // 2. Cobros de fletes realizados por el chofer amortizan saldos pendientes en Manifiestos_Destino
      const subs = this.getManifiestosDestino();
      (reporte.ingresos || []).forEach((ing) => {
        const monto = Number(ing.montoBs) || 0;
        if (monto > 0 && (ing.conceptoIngreso.includes('Flete') || ing.conceptoIngreso.includes('Cobro'))) {
          const subIdx = subs.findIndex(s => s.idViaje === reporte.idViaje && (s.saldoPendienteClienteBs || 0) > 0);
          if (subIdx !== -1) {
            const actualCobrado = (subs[subIdx].cobrosRealizadosBs || 0) + monto;
            const nuevoSaldo = Math.max(0, (subs[subIdx].saldoInicialCobrarBs || 0) - actualCobrado);
            subs[subIdx].cobrosRealizadosBs = actualCobrado;
            subs[subIdx].saldoPendienteClienteBs = nuevoSaldo;
            if (nuevoSaldo <= 0) {
              subs[subIdx].estadoLiquidacion = 'Liquidado en Sucursal';
            }
          }

          // Registrar en Transacciones_Diarias
          this.addTransaccion({
            fecha: ing.fecha || reporte.fechaInicio,
            tipo: 'Ingreso',
            categoria: 'Cobranza Fletes CxC',
            montoBs: monto,
            metodoPago: nombreCajaChofer,
            sucursal: reporte.rutaDestino || 'Destino',
            placaCamion: reporte.placaCamion,
            idViaje: reporte.idViaje,
            notas: `Cobro Chofer en Ruta: ${ing.detalleGlosa || ing.conceptoIngreso} (Rep: ${idRep})`,
            nroManifiesto: ing.nroReciboComprobante || ''
          });
        }
      });
      localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subs));

      // 3. Actualizar caja del chofer en Arqueo_Cajas
      this.actualizarCaja(nombreCajaChofer, totalIng, totalGas);

      // 4. Actualizar estado del viaje si corresponde
      const viajes = this.getViajes();
      const vIdx = viajes.findIndex(v => v.idViaje === reporte.idViaje);
      if (vIdx !== -1) {
        viajes[vIdx].estadoViaje = 'Liquidado / Cerrado';
        localStorage.setItem(STORAGE_KEYS.VIAJES, JSON.stringify(viajes));
      }
    }

    // Sincronizar en línea con Google Apps Script si está disponible
    const gasUrl = this.getGasUrl();
    if (gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'crearOActualizarReporteChofer',
            payload: {
              ...reporteActualizado,
              liquidar: isLiquidar
            }
          })
        }).catch(e => console.warn('Sync background ReporteChofer:', e));
      } catch (e) {
        console.warn('Sync background err:', e);
      }
    }

    return {
      success: true,
      message: isLiquidar ? 'Reporte de viaje liquidado y contabilizado exitosamente.' : 'Borrador de reporte guardado correctamente.',
      idReporteChofer: idRep
    };
  }

  public deleteReporteChofer(idReporteChofer: string): void {
    const list = this.getReportesChofer().filter(r => r.idReporteChofer !== idReporteChofer);
    localStorage.setItem(STORAGE_KEYS.REPORTES_CHOFER, JSON.stringify(list));
  }

  // Descargar toda la base de datos desde Google Apps Script
  public async pullFromGoogleSheets(): Promise<{ success: boolean; message: string }> {
    const gasUrl = this.getGasUrl();
    if (!gasUrl) {
      return { success: false, message: 'No hay URL de Google Apps Script configurada.' };
    }
    try {
      const response = await fetch(`${gasUrl}?action=getAll`);
      const result = await response.json();
      if (result.status === 'success' && result.data) {
        if (result.data.viajes?.length) localStorage.setItem(STORAGE_KEYS.VIAJES, JSON.stringify(result.data.viajes));
        if (result.data.manifiestosOrigen?.length) localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify(result.data.manifiestosOrigen));
        if (result.data.manifiestosDestino?.length) localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(result.data.manifiestosDestino));
        if (result.data.gastosRuta?.length) localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(result.data.gastosRuta));
        if (result.data.cajas?.length) localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(result.data.cajas));
        if (result.data.transacciones?.length) localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(result.data.transacciones));
        if (result.data.reportesChofer?.length) {
          // Si vienen con detalles anidados
          const reportesParseados: ReporteViajeChofer[] = result.data.reportesChofer.map((r: any) => ({
            idReporteChofer: r.ID_Reporte_Chofer || r.idReporteChofer,
            idViaje: r.ID_Viaje || r.idViaje,
            placaCamion: r.Placa_Camion || r.placaCamion,
            choferAsignado: r.Chofer_Asignado || r.choferAsignado,
            centroCosto: r.Centro_Costo || r.centroCosto,
            rutaOrigen: r.Ruta_Origen || r.rutaOrigen,
            rutaDestino: r.Ruta_Destino || r.rutaDestino,
            manifiestosAsociados: r.Manifiestos_Asociados || r.manifiestosAsociados,
            fechaInicio: r.Fecha_Inicio || r.fechaInicio,
            fechaCierre: r.Fecha_Cierre || r.fechaCierre,
            totalIngresosBs: Number(r.Total_Ingresos_Bs || r.totalIngresosBs || 0),
            totalGastosBs: Number(r.Total_Gastos_Bs || r.totalGastosBs || 0),
            saldoFavorContraBs: Number(r.Saldo_Favor_Contra_Bs || r.saldoFavorContraBs || 0),
            estadoReporte: r.Estado_Reporte || r.estadoReporte || 'Borrador',
            observaciones: r.Observaciones || r.observaciones || '',
            ingresos: (result.data.detalleIngresosChofer || [])
              .filter((i: any) => (i.ID_Reporte_Chofer || i.idReporteChofer) === (r.ID_Reporte_Chofer || r.idReporteChofer))
              .map((i: any) => ({
                idIngresoChofer: i.ID_Ingreso_Chofer || i.idIngresoChofer,
                idReporteChofer: i.ID_Reporte_Chofer || i.idReporteChofer,
                idViaje: i.ID_Viaje || i.idViaje,
                fecha: i.Fecha || i.fecha,
                conceptoIngreso: i.Concepto_Ingreso || i.conceptoIngreso,
                detalleGlosa: i.Detalle_Glosa || i.detalleGlosa,
                origenFondo: i.Origen_Fondo || i.origenFondo,
                montoBs: Number(i.Monto_Bs || i.montoBs || 0),
                nroReciboComprobante: i.Nro_Recibo_Comprobante || i.nroReciboComprobante
              })),
            gastos: (result.data.detalleGastosChofer || [])
              .filter((g: any) => (g.ID_Reporte_Chofer || g.idReporteChofer) === (r.ID_Reporte_Chofer || r.idReporteChofer))
              .map((g: any) => ({
                idGastoChofer: g.ID_Gasto_Chofer || g.idGastoChofer,
                idReporteChofer: g.ID_Reporte_Chofer || g.idReporteChofer,
                idViaje: g.ID_Viaje || g.idViaje,
                placaCamion: g.Placa_Camion || g.placaCamion,
                fecha: g.Fecha || g.fecha,
                conceptoGasto: g.Concepto_Gasto || g.conceptoGasto,
                detalleGasto: g.Detalle_Gasto || g.detalleGasto,
                idProveedor: g.ID_Proveedor || g.idProveedor,
                nroFacturaRecibo: g.Nro_Factura_Recibo || g.nroFacturaRecibo,
                montoBs: Number(g.Monto_Bs || g.montoBs || 0),
                comprobanteFotoUrl: g.Comprobante_Foto_URL || g.comprobanteFotoUrl
              }))
          }));
          localStorage.setItem(STORAGE_KEYS.REPORTES_CHOFER, JSON.stringify(reportesParseados));
        }
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        return { success: true, message: 'Datos sincronizados exitosamente con Google Sheets.' };
      }
      return { success: false, message: 'Respuesta inválida del script.' };
    } catch (err: any) {
      return { success: false, message: `Error al conectar: ${err.message || 'Error de CORS o URL inaccesible'}` };
    }
  }

  // Obtener Liquidación Integral de Viaje (Fusión Backend / Local: Fletes + Gastos Chofer + Transacciones Admin)
  public async getDetalleLiquidacionViaje(idViaje: string): Promise<DetalleLiquidacionViajeData> {
    const gasUrl = this.getGasUrl();
    if (gasUrl) {
      try {
        const response = await fetch(`${gasUrl}?action=detalleLiquidacionViaje&idViaje=${encodeURIComponent(idViaje)}`);
        const result = await response.json();
        if (result && result.status === 'success' && result.viaje) {
          return result as DetalleLiquidacionViajeData;
        }
      } catch (err) {
        console.warn('Fallo al obtener detalleLiquidacionViaje desde Google Apps Script, resolviendo local:', err);
      }
    }

    // Cálculo local consolidado
    const viajes = this.getViajes();
    const viaje = viajes.find(v => v.idViaje === idViaje) || {
      idViaje,
      placaCamion: '',
      choferAsignado: '',
      fechaSalida: '',
      fechaLlegada: '',
      estadoViaje: 'En Tránsito',
      fletesManifiestosBs: 0,
      gastosRutaBs: 0,
      utilidadViajeBs: 0,
      margenPct: 0,
      observacionesRuta: ''
    };

    const manifiestosOrigen = this.getManifiestosOrigen().filter(m => m.idViajeAsignado === idViaje);
    const manIds = new Set(manifiestosOrigen.map(m => m.idManifiesto));
    const manifiestosDestino = this.getManifiestosDestino().filter(
      s => s.idViaje === idViaje || (s.idManifiestoPadre && manIds.has(s.idManifiestoPadre))
    );

    let totalFletes = manifiestosOrigen.reduce((acc, m) => acc + (Number(m.fleteTotalBs) || 0), 0);
    if (totalFletes === 0 && manifiestosDestino.length > 0) {
      totalFletes = manifiestosDestino.reduce((acc, s) => acc + (Number(s.fleteAsignadoBs) || 0), 0);
    }
    if (totalFletes === 0 && viaje.fletesManifiestosBs > 0) {
      totalFletes = viaje.fletesManifiestosBs;
    }

    const gastosRuta = this.getGastosRuta().filter(g => g.idViajeAsignado === idViaje);
    let totalGastosChofer = 0;
    let totalIngresosChofer = 0;
    gastosRuta.forEach(g => {
      const imp = Number(g.importeBs || 0);
      if (g.tipoOperacion === 'Ingreso' || g.categoriaGasto === 'Anticipo Viáticos' || g.categoriaGasto === 'Ingreso Extra') {
        totalIngresosChofer += imp;
      } else {
        totalGastosChofer += imp;
      }
    });

    const transacciones = this.getTransacciones();
    const transaccionesAdmin = transacciones.filter(t => {
      if (t.origenRegistro === 'Gasto_Ruta') return false;
      if (t.idViaje === idViaje) return true;
      if (viaje.placaCamion && t.placaCamion === viaje.placaCamion && t.idViaje === idViaje) return true;
      return false;
    });

    let totalIngresosAdmin = 0;
    let totalGastosAdmin = 0;
    const listaExtraordinarias: DetalleLiquidacionViajeData['detalleTransaccionesAdmin'] = [];

    transaccionesAdmin.forEach(t => {
      const monto = Number(t.montoBs || 0);
      if (t.tipo === 'Ingreso') {
        totalIngresosAdmin += monto;
      } else {
        totalGastosAdmin += monto;
      }
      listaExtraordinarias.push({
        idTransaccion: t.idTransaccion,
        fecha: t.fecha,
        tipo: t.tipo as 'Gasto' | 'Ingreso',
        categoria: t.categoria || 'Gasto Operativo',
        monto: monto,
        metodoPago: t.metodoPago || 'Efectivo',
        notas: t.notas || '',
        registradoPor: t.origenRegistro || 'Admin',
        cuentaDestino: t.cuentaDestino,
        proveedor: t.nombreProveedor || t.idProveedor
      });
    });

    const granTotalGastos = totalGastosChofer + totalGastosAdmin;
    const granTotalIngresos = totalFletes + totalIngresosAdmin;
    const utilidadNeta = granTotalIngresos - granTotalGastos;
    const margenPct = granTotalIngresos > 0 ? Number(((utilidadNeta / granTotalIngresos) * 100).toFixed(2)) : 0;
    const saldoRendirChofer = totalIngresosChofer - totalGastosChofer;

    return {
      status: 'success',
      viaje,
      resumenFinanciero: {
        fletesManifiestosBs: totalFletes,
        ingresosAdminBs: totalIngresosAdmin,
        totalIngresosBs: granTotalIngresos,
        gastosChoferBs: totalGastosChofer,
        totalIngresosChoferBs: totalIngresosChofer,
        gastosAdminBs: totalGastosAdmin,
        totalGastosBs: granTotalGastos,
        utilidadNetaBs: utilidadNeta,
        margenPct,
        saldoRendirChoferBs: saldoRendirChofer
      },
      detalleManifiestos: manifiestosOrigen,
      detalleSubManifiestos: manifiestosDestino,
      detalleGastosChofer: gastosRuta,
      detalleTransaccionesAdmin: listaExtraordinarias
    };
  }

  // =========================================================================
  // MÓDULO DE AUDITORÍA Y CONSISTENCIA CONTABLE
  // =========================================================================

  public getAuditLogs(): TrazaAuditoriaMantenimiento[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public addAuditLog(traza: Partial<TrazaAuditoriaMantenimiento>): TrazaAuditoriaMantenimiento {
    const logs = this.getAuditLogs();
    const idTraza = traza.idTraza || `AUD-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${Math.floor(Math.random() * 1000)}`;
    const fechaHora = traza.fechaHora || new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' });
    const fullTraza: TrazaAuditoriaMantenimiento = {
      idTraza,
      fechaHora,
      accion: traza.accion || 'DIAGNOSTICO',
      titulo: traza.titulo || 'Acción de Auditoría',
      registrosAfectados: traza.registrosAfectados || 0,
      resultado: traza.resultado || 'Éxito',
      usuario: traza.usuario || 'Administrador',
      detalles: traza.detalles || []
    };
    logs.unshift(fullTraza);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 50)));
    return fullTraza;
  }

  public async ejecutarDiagnosticoIntegridad(): Promise<{ success: boolean; data: DiagnosticoIntegridadReport; message?: string }> {
    const gasUrl = this.getGasUrl();

    // 1. Intentar escaneo remoto en tiempo real si hay conexión
    if (navigator.onLine && gasUrl) {
      try {
        const response = await fetch(`${gasUrl}?action=ejecutarDiagnosticoIntegridad`);
        const result = await response.json();
        if (result && result.status === 'success' && result.data) {
          this.addAuditLog({
            accion: 'DIAGNOSTICO',
            titulo: 'Diagnóstico de Integridad del Sistema (Google Sheets)',
            registrosAfectados: result.data.resumen.totalAnomalias,
            resultado: result.data.resumen.totalAnomalias === 0 ? 'Éxito' : 'Advertencia',
            detalles: [
              `Salud: ${result.data.resumen.saludGeneral}`,
              `Huérfanos: ${result.data.resumen.huerfanos}`,
              `Descuadres Cajas: ${result.data.resumen.descuadresCajas}`,
              `Inconsistencias CxC: ${result.data.resumen.inconsistenciasManifiestos}`
            ]
          });
          return { success: true, data: result.data };
        }
      } catch (err) {
        console.warn('Fallo diagnóstico remoto en Apps Script, ejecutando motor local sincronizado:', err);
      }
    }

    // 2. Motor de Diagnóstico Local Analítico (Sincronizado)
    const viajes = this.getViajes();
    const manifiestosOrigen = this.getManifiestosOrigen();
    const manifiestosDestino = this.getManifiestosDestino();
    const transacciones = this.getTransacciones();
    const gastosRuta = this.getGastosRuta();
    const cajas = this.getCajas();

    const validViajes = new Set(viajes.map(v => v.idViaje));
    const validSubs = new Set(manifiestosDestino.map(s => s.idSubManifiesto));
    const validManifs = new Set(manifiestosOrigen.map(m => m.idManifiesto));

    // A. Detección de Huérfanos
    const detallesHuerfanos: DetalleHuerfano[] = [];
    transacciones.forEach(tx => {
      const idV = (tx.idViaje || '').trim();
      if (idV && idV !== '-' && idV !== 'S/V' && !validViajes.has(idV)) {
        detallesHuerfanos.push({
          id: tx.idTransaccion,
          tabla: 'Transacciones_Diarias',
          campo: 'ID_Viaje',
          valorInvalido: idV,
          motivo: 'El ID de Viaje asociado no existe en la nómina de Viajes',
          montoBs: Number(tx.montoBs || 0),
          fecha: tx.fecha,
          detalles: `${tx.tipo} - ${tx.categoria}: ${tx.notas || ''}`
        });
      }
    });

    gastosRuta.forEach(g => {
      const idV = (g.idViajeAsignado || '').trim();
      if (idV && idV !== '-' && idV !== 'S/V' && !validViajes.has(idV)) {
        detallesHuerfanos.push({
          id: g.idGastoRuta,
          tabla: 'Gastos_Ruta_Camion',
          campo: 'ID_Viaje_Asignado',
          valorInvalido: idV,
          motivo: 'El gasto de ruta apunta a un viaje inexistente',
          montoBs: Number(g.importeBs || 0),
          fecha: g.fechaHora,
          detalles: `${g.categoriaGasto}: ${g.detalleGasto || ''}`
        });
      }
    });

    // B. Descuadres en Cajas
    const txByCaja: Record<string, { ingresos: number; gastos: number }> = {};
    transacciones.forEach(tx => {
      const c = (tx.metodoPago || '').trim();
      if (!c) return;
      if (!txByCaja[c]) txByCaja[c] = { ingresos: 0, gastos: 0 };
      const m = Number(tx.montoBs || 0);
      if (tx.tipo === 'Ingreso') txByCaja[c].ingresos += m;
      if (tx.tipo === 'Gasto') txByCaja[c].gastos += m;
    });

    const detallesCajas: DetalleDescuadreCaja[] = cajas.map(caja => {
      const mov = txByCaja[caja.nombre] || { ingresos: 0, gastos: 0 };
      const saldoIni = Number(caja.saldoInicial || 0);
      const saldoHistReal = Number((saldoIni + mov.ingresos - mov.gastos).toFixed(2));
      const saldoReg = Number((caja.saldoDisponible ?? (saldoIni + (caja.totalCobrado || 0) - (caja.totalGastado || 0))).toFixed(2));
      const dif = Number((saldoReg - saldoHistReal).toFixed(2));
      const tieneDescuadre = Math.abs(dif) > 0.05;

      return {
        caja: caja.nombre,
        saldoRegistrado: saldoReg,
        saldoHistoricoReal: saldoHistReal,
        diferencia: dif,
        estado: tieneDescuadre ? 'Descuadre Detectado' : 'Cuadrado',
        totalIngresosReal: Number(mov.ingresos.toFixed(2)),
        totalGastosReal: Number(mov.gastos.toFixed(2)),
        saldoInicial: saldoIni
      };
    });

    // C. Inconsistencias en Cuentas por Cobrar (Manifiestos y Sub-Manifiestos)
    const cobrosBySub: Record<string, number> = {};
    transacciones.forEach(tx => {
      if (tx.tipo === 'Ingreso' && Number(tx.montoBs || 0) > 0) {
        const esPagoOrigen = tx.categoria === 'Fletes Despachos MIC' || 
                             (tx.notas && tx.notas.toLowerCase().includes('pago en origen')) ||
                             (tx.notas && tx.notas.toLowerCase().includes('cobranza en origen'));
        if (tx.nroManifiesto && !esPagoOrigen) {
          cobrosBySub[tx.nroManifiesto] = (cobrosBySub[tx.nroManifiesto] || 0) + Number(tx.montoBs);
        }
      }
    });

    const detallesManifiestos: DetalleInconsistenciaManifiesto[] = [];
    manifiestosDestino.forEach(sub => {
      const flete = Number(sub.fleteAsignadoBs || 0);
      const porPagarDestino = Number(sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : (sub.saldoInicialCobrarBs || 0));
      const cobradoActual = Number(sub.cobrosRealizadosBs || 0);
      const saldoActual = Number(sub.saldoPendienteClienteBs || 0);
      const cobradoTx = cobrosBySub[sub.idSubManifiesto] || cobrosBySub[sub.nroManifiesto] || cobradoActual;
      const saldoRealEsperado = Math.max(0, Number((porPagarDestino - cobradoTx).toFixed(2)));
      const dif = Number((saldoActual - saldoRealEsperado).toFixed(2));
      const estadoRec = saldoRealEsperado <= 0.01 ? 'Liquidado' : (cobradoTx > 0 ? 'Pendiente Parcial' : 'Por Cobrar');
      const desfasado = Math.abs(dif) > 0.05 || (saldoRealEsperado <= 0.01 && (sub.estadoLiquidacion || '').indexOf('Liquidado') === -1);

      detallesManifiestos.push({
        tipo: 'Sub-MIC',
        idDoc: sub.idSubManifiesto,
        nroDocumento: sub.nroManifiesto || sub.idSubManifiesto,
        clienteDestinatario: sub.destinatario || 'General',
        fleteTotalBs: flete,
        cobrosRegistradosBs: cobradoActual,
        cobrosRealesCalculadosBs: Number(cobradoTx.toFixed(2)),
        saldoRegistradoBs: saldoActual,
        saldoRealCalculadoBs: saldoRealEsperado,
        diferenciaSaldoBs: dif,
        estadoActual: sub.estadoLiquidacion || 'Por Cobrar',
        estadoRecomendado: estadoRec,
        tieneInconsistencia: desfasado,
        motivo: desfasado ? (Math.abs(dif) > 0.05 ? `Desfase de Bs. ${dif}` : 'Estado documental no actualizado') : 'Sincronizado'
      });
    });

    manifiestosOrigen.forEach(orig => {
      const flete = Number(orig.fleteTotalBs || 0);
      const cobrado = Number(orig.cobradoOrigenBs || 0);
      const saldo = Number(orig.saldoCobrarDestinosBs || 0);
      const suma = Number((cobrado + saldo).toFixed(2));
      const dif = Number((flete - suma).toFixed(2));
      const tieneInc = flete > 0 && Math.abs(dif) > 0.1;

      detallesManifiestos.push({
        tipo: 'MIC',
        idDoc: orig.idManifiesto,
        nroDocumento: orig.nroManifiestoMIC,
        clienteDestinatario: `Agencia ${orig.sucursalOrigen || 'Origen'}`,
        fleteTotalBs: flete,
        cobrosRegistradosBs: cobrado,
        cobrosRealesCalculadosBs: cobrado,
        saldoRegistradoBs: saldo,
        saldoRealCalculadoBs: Math.max(0, flete - cobrado),
        diferenciaSaldoBs: dif,
        estadoActual: orig.estadoManifiesto || orig.estado || 'En Tránsito',
        estadoRecomendado: saldo <= 0.01 ? 'Liquidado' : 'Por Cobrar',
        tieneInconsistencia: tieneInc,
        motivo: tieneInc ? `Diferencia de Bs. ${dif} entre flete total y sumatoria origen+destinos` : 'Sincronizado'
      });
    });

    const huerfanosCount = detallesHuerfanos.length;
    const descuadresCount = detallesCajas.filter(c => c.estado !== 'Cuadrado').length;
    const inconsistenciasCount = detallesManifiestos.filter(m => m.tieneInconsistencia).length;
    const totalAnomalias = huerfanosCount + descuadresCount + inconsistenciasCount;

    let saludGeneral: 'Óptima' | 'Atención Requerida' | 'Crítica' = 'Óptima';
    if (totalAnomalias > 5 || descuadresCount > 1) {
      saludGeneral = 'Crítica';
    } else if (totalAnomalias > 0) {
      saludGeneral = 'Atención Requerida';
    }

    const totalEvaluados = Math.max(1, transacciones.length + cajas.length + manifiestosDestino.length);
    const porcentajeIntegridad = Math.max(0, Math.min(100, Number(((1 - (totalAnomalias / totalEvaluados)) * 100).toFixed(1))));

    const report: DiagnosticoIntegridadReport = {
      resumen: {
        totalAnomalias,
        huerfanos: huerfanosCount,
        descuadresCajas: descuadresCount,
        inconsistenciasManifiestos: inconsistenciasCount,
        saludGeneral,
        porcentajeIntegridad,
        fechaDiagnostico: new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' }),
        origen: 'Local / Cache Sincronizado'
      },
      detallesHuerfanos,
      detallesCajas,
      detallesManifiestos
    };

    this.addAuditLog({
      accion: 'DIAGNOSTICO',
      titulo: 'Diagnóstico de Integridad del Sistema',
      registrosAfectados: totalAnomalias,
      resultado: totalAnomalias === 0 ? 'Éxito' : 'Advertencia',
      detalles: [
        `Salud: ${saludGeneral}`,
        `Huérfanos: ${huerfanosCount}`,
        `Descuadres Cajas: ${descuadresCount}`,
        `Inconsistencias CxC: ${inconsistenciasCount}`
      ]
    });

    return { success: true, data: report };
  }

  public async purgarDatosHuerfanos(usuario = 'Administrador'): Promise<{ success: boolean; eliminados: number; message: string }> {
    const viajes = this.getViajes();
    const validViajes = new Set(viajes.map(v => v.idViaje));

    let eliminadosTx = 0;
    let eliminadosGastos = 0;
    const detalles: string[] = [];

    // Purgar Transacciones
    const txs = this.getTransacciones();
    const txsFiltradas = txs.filter(tx => {
      const idV = (tx.idViaje || '').trim();
      const esHuerfano = idV && idV !== '-' && idV !== 'S/V' && !validViajes.has(idV);
      if (esHuerfano) {
        eliminadosTx++;
        detalles.push(`Eliminada Transacción ${tx.idTransaccion} (Viaje inexistente: ${idV})`);
        return false;
      }
      return true;
    });

    if (eliminadosTx > 0) {
      localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(txsFiltradas));
    }

    // Purgar Gastos Ruta
    const gastos = this.getGastosRuta();
    const gastosFiltrados = gastos.filter(g => {
      const idV = (g.idViajeAsignado || '').trim();
      const esHuerfano = idV && idV !== '-' && idV !== 'S/V' && !validViajes.has(idV);
      if (esHuerfano) {
        eliminadosGastos++;
        detalles.push(`Eliminado Gasto de Ruta ${g.idGastoRuta} (Viaje inexistente: ${idV})`);
        return false;
      }
      return true;
    });

    if (eliminadosGastos > 0) {
      localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(gastosFiltrados));
    }

    const total = eliminadosTx + eliminadosGastos;

    // Enviar a GAS si está conectado
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'purgarDatosHuerfanos',
            payload: { usuario }
          })
        });
      } catch (err) {
        console.warn('Error syncing purga con Google Apps Script:', err);
      }
    }

    this.addAuditLog({
      accion: 'PURGA_HUERFANOS',
      titulo: 'Purga de Registros Huérfanos',
      usuario,
      registrosAfectados: total,
      resultado: 'Éxito',
      detalles: detalles.length > 0 ? detalles : ['No se detectaron registros huérfanos. Base de datos limpia.']
    });

    return {
      success: true,
      eliminados: total,
      message: `Se purgaron ${total} registros huérfanos (${eliminadosTx} transacciones y ${eliminadosGastos} gastos de ruta).`
    };
  }

  public async sincronizarCajasDesdeHistorial(usuario = 'Administrador'): Promise<{ success: boolean; cajasActualizadas: number; message: string }> {
    const transacciones = this.getTransacciones();
    const cajas = this.getCajas();

    const acumulado: Record<string, { ingresos: number; gastos: number }> = {};
    transacciones.forEach(tx => {
      // Ignorar transacciones a crédito pendientes, Por Cobrar / Por Pagar, o fletes de despacho aún no liquidados a Central
      if (
        tx.modalidadPago === 'Credito' || 
        tx.metodoPago === 'Por Cobrar' || 
        tx.metodoPago === 'Por Pagar' ||
        tx.estadoCobroPago === 'Pendiente'
      ) {
        return;
      }

      const m = Number(tx.montoBs || 0);

      // Si es un Traspaso
      if (tx.tipo === 'Traspaso') {
        const cOrigen = (tx.metodoPago || '').trim();
        const cDestino = (tx.cuentaDestino || '').trim();
        if (cOrigen) {
          if (!acumulado[cOrigen]) acumulado[cOrigen] = { ingresos: 0, gastos: 0 };
          acumulado[cOrigen].gastos += m;
        }
        if (cDestino) {
          if (!acumulado[cDestino]) acumulado[cDestino] = { ingresos: 0, gastos: 0 };
          acumulado[cDestino].ingresos += m;
        }
        return;
      }

      const c = (tx.metodoPago || '').trim();
      if (!c) return;
      if (!acumulado[c]) acumulado[c] = { ingresos: 0, gastos: 0 };
      
      const efectivo = tx.modalidadPago === 'Anticipo_Saldo' ? Number(tx.montoAnticipoBs || 0) : m;
      if (tx.tipo === 'Ingreso') acumulado[c].ingresos += efectivo;
      if (tx.tipo === 'Gasto') acumulado[c].gastos += efectivo;
    });

    const detalles: string[] = [];
    let modificadas = 0;

    const nuevasCajas = cajas.map(caja => {
      const mov = acumulado[caja.nombre] || { ingresos: 0, gastos: 0 };
      const saldoIni = Number(caja.saldoInicial || 0);
      const nuevoCobrado = Number(mov.ingresos.toFixed(2));
      const nuevoGastado = Number(mov.gastos.toFixed(2));
      const nuevoSaldo = Number((saldoIni + nuevoCobrado - nuevoGastado).toFixed(2));

      if (Math.abs((caja.saldoDisponible || 0) - nuevoSaldo) > 0.01) {
        modificadas++;
        detalles.push(`Caja [${caja.nombre}]: Saldo corregido de Bs. ${caja.saldoDisponible ?? 0} a Bs. ${nuevoSaldo} (Ingresos: ${nuevoCobrado}, Gastos: ${nuevoGastado})`);
      }

      return {
        ...caja,
        totalCobrado: nuevoCobrado,
        totalGastado: nuevoGastado,
        saldoDisponible: nuevoSaldo
      };
    });

    localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(nuevasCajas));

    // Notificar a Google Apps Script
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sincronizarCajasDesdeHistorial',
            payload: { usuario }
          })
        });
      } catch (err) {
        console.warn('Error sincronizando cajas con Google Apps Script:', err);
      }
    }

    this.addAuditLog({
      accion: 'SINCRONIZAR_CAJAS',
      titulo: 'Sincronización Total de Cajas y Arqueo',
      usuario,
      registrosAfectados: modificadas,
      resultado: 'Éxito',
      detalles: detalles.length > 0 ? detalles : ['Todas las cuentas y cajas recalculadas contra historial contable.']
    });

    return {
      success: true,
      cajasActualizadas: modificadas,
      message: `Se recalcularon y sincronizaron ${nuevasCajas.length} cuentas de arqueo (${modificadas} cajas corregidas).`
    };
  }

  public async repararSaldosManifiestos(usuario = 'Administrador'): Promise<{ success: boolean; manifiestosReparados: number; message: string }> {
    const transacciones = this.getTransacciones();
    const subs = this.getManifiestosDestino();
    const origenes = this.getManifiestosOrigen();

    const cobrosBySub: Record<string, number> = {};
    transacciones.forEach(tx => {
      if (tx.tipo === 'Ingreso' && Number(tx.montoBs || 0) > 0) {
        const esPagoOrigen = tx.categoria === 'Fletes Despachos MIC' || 
                             (tx.notas && tx.notas.toLowerCase().includes('pago en origen')) ||
                             (tx.notas && tx.notas.toLowerCase().includes('cobranza en origen'));
        if (tx.nroManifiesto && !esPagoOrigen) {
          cobrosBySub[tx.nroManifiesto] = (cobrosBySub[tx.nroManifiesto] || 0) + Number(tx.montoBs);
        }
      }
    });

    let reparados = 0;
    const detalles: string[] = [];

    // Recalcular Sub-Manifiestos
    const subsActualizados = subs.map(sub => {
      const pagadoOrigen = Number(sub.pagadoOrigenBs || 0);
      const porPagarDestino = Number(sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : (sub.saldoInicialCobrarBs || 0));
      const fleteCorrecto = pagadoOrigen + porPagarDestino;
      const cobradoActual = Number(sub.cobrosRealizadosBs || 0);
      const saldoActual = Number(sub.saldoPendienteClienteBs || 0);
      const cobradoReal = cobrosBySub[sub.idSubManifiesto] || cobrosBySub[sub.nroManifiesto] || cobradoActual;
      const nuevoSaldo = Math.max(0, Number((porPagarDestino - cobradoReal).toFixed(2)));
      const nuevoEstado = nuevoSaldo <= 0.01 ? 'Liquidado en Sucursal' : (cobradoReal > 0 ? 'Pendiente Parcial' : 'Por Cobrar');

      if (Math.abs(saldoActual - nuevoSaldo) > 0.01 || Math.abs(cobradoActual - cobradoReal) > 0.01 || Math.abs(Number(sub.fleteAsignadoBs || 0) - fleteCorrecto) > 0.01) {
        reparados++;
        detalles.push(`Sub-MIC [${sub.idSubManifiesto}]: Flete Bs. ${fleteCorrecto} (Origen: ${pagadoOrigen} + Destino: ${porPagarDestino}) | Cobrado corregido a Bs. ${cobradoReal} | Nuevo Saldo Bs. ${nuevoSaldo} (${nuevoEstado})`);
      }

      return {
        ...sub,
        fleteAsignadoBs: fleteCorrecto,
        pagadoOrigenBs: pagadoOrigen,
        porPagarDestinoBs: porPagarDestino,
        saldoInicialCobrarBs: porPagarDestino,
        cobrosRealizadosBs: cobradoReal,
        saldoPendienteClienteBs: nuevoSaldo,
        estadoLiquidacion: nuevoEstado,
        estadoCobranzaDestino: nuevoSaldo <= 0.01 ? 'Cobrado / Liquidado a Empresa' : sub.estadoCobranzaDestino
      };
    });

    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subsActualizados));

    // Recalcular MICs Origen
    const origenesActualizados = origenes.map(orig => {
      const flete = Number(orig.fleteTotalBs || 0);
      const cobrado = Number(orig.cobradoOrigenBs || 0);
      const nuevoSaldoCobrar = Math.max(0, Number((flete - cobrado).toFixed(2)));
      const dif = Math.abs((orig.saldoCobrarDestinosBs || 0) - nuevoSaldoCobrar);

      if (dif > 0.05) {
        reparados++;
        detalles.push(`MIC [${orig.nroManifiestoMIC}]: Saldo Destinos ajustado a Bs. ${nuevoSaldoCobrar}`);
      }

      return {
        ...orig,
        saldoCobrarDestinosBs: nuevoSaldoCobrar,
        estadoManifiesto: (nuevoSaldoCobrar <= 0.01 ? 'Liquidado' : orig.estadoManifiesto) as any,
        estado: nuevoSaldoCobrar <= 0.01 ? 'Liquidado' : (orig.estado || orig.estadoManifiesto)
      };
    });

    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify(origenesActualizados));

    // Enviar a GAS
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'repararSaldosManifiestos',
            payload: { usuario }
          })
        });
      } catch (err) {
        console.warn('Error sincronizando reparación de manifiestos con GAS:', err);
      }
    }

    this.addAuditLog({
      accion: 'REPARAR_MANIFIESTOS',
      titulo: 'Reparación de Cascada y Saldos de Manifiestos',
      usuario,
      registrosAfectados: reparados,
      resultado: 'Éxito',
      detalles: detalles.length > 0 ? detalles : ['Todos los documentos MIC y Sub-MIC se encuentran sincronizados.']
    });

    return {
      success: true,
      manifiestosReparados: reparados,
      message: `Se recalcularon los saldos de fletes y liquidaciones (${reparados} documentos ajustados).`
    };
  }

  public async reparacionIntegralSistema(usuario = 'Administrador'): Promise<{ success: boolean; totalAfectados: number; message: string }> {
    const resPurga = await this.purgarDatosHuerfanos(usuario);
    const resManif = await this.repararSaldosManifiestos(usuario);
    const resCajas = await this.sincronizarCajasDesdeHistorial(usuario);

    const total = resPurga.eliminados + resManif.manifiestosReparados + resCajas.cajasActualizadas;

    this.addAuditLog({
      accion: 'REPARACION_INTEGRAL',
      titulo: 'Mantenimiento Integral del Sistema Contable',
      usuario,
      registrosAfectados: total,
      resultado: 'Éxito',
      detalles: [
        `Huérfanos eliminados: ${resPurga.eliminados}`,
        `Manifiestos reparados: ${resManif.manifiestosReparados}`,
        `Cajas recalculadas: ${resCajas.cajasActualizadas}`
      ]
    });

    return {
      success: true,
      totalAfectados: total,
      message: `Mantenimiento Integral completado con éxito: ${total} registros saneados y sincronizados.`
    };
  }

  public async repararDatosHuerfanosSubManifiestos(usuario = 'Administrador'): Promise<{ success: boolean; eliminados: number; message: string; detalles?: string[] }> {
    const subs = this.getManifiestosDestino();
    const validSubs = new Set<string>();
    subs.forEach(s => {
      if (s.idSubManifiesto) validSubs.add(s.idSubManifiesto.trim());
      if (s.nroManifiesto) validSubs.add(s.nroManifiesto.trim());
    });

    let eliminados = 0;
    const detalles: string[] = [];

    // 1. Limpiar Transacciones huérfanas
    const txs = this.getTransacciones();
    const txsFiltradas = txs.filter(t => {
      const rowText = `${t.idTransaccion} ${t.nroManifiesto || ''} ${t.notas || ''}`;
      const match = rowText.match(/SUB-[A-Za-z0-9_-]+/);
      if (match && !validSubs.has(match[0])) {
        // Revertir caja
        const monto = Number(t.montoBs || 0);
        if (monto > 0 && t.metodoPago) {
          if (t.tipo === 'Ingreso') this.actualizarCaja(t.metodoPago, -monto, 0);
          else if (t.tipo === 'Gasto') this.actualizarCaja(t.metodoPago, 0, -monto);
          else if (t.tipo === 'Traspaso') {
            this.actualizarCaja(t.metodoPago, monto, 0);
            if (t.cuentaDestino) this.actualizarCaja(t.cuentaDestino, -monto, 0);
          }
        }
        eliminados++;
        detalles.push(`Transacción ${t.idTransaccion} vinculada al sub-manifiesto inexistente ${match[0]} eliminada.`);
        return false;
      }
      return true;
    });

    if (txs.length !== txsFiltradas.length) {
      localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(txsFiltradas));
    }

    // 2. Limpiar Gastos de Ruta huérfanos
    const gastos = this.getGastosRuta();
    const gastosFiltrados = gastos.filter(g => {
      const rowText = `${g.idGastoRuta} ${g.nroFacturaBoleta || ''} ${g.detalleGasto || ''}`;
      const match = rowText.match(/SUB-[A-Za-z0-9_-]+/);
      if (match && !validSubs.has(match[0])) {
        const importe = Number(g.importeBs || 0);
        if (importe > 0 && g.cajaCuentaUtilizada) {
          this.actualizarCaja(g.cajaCuentaUtilizada, 0, -importe);
        }
        eliminados++;
        detalles.push(`Gasto de ruta ${g.idGastoRuta} referenciado a ${match[0]} purgado.`);
        return false;
      }
      return true;
    });

    if (gastos.length !== gastosFiltrados.length) {
      localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(gastosFiltrados));
    }

    // 3. Limpiar Movimientos huérfanos
    const movs = this.getMovimientos();
    const movsFiltrados = movs.filter(m => {
      if (m.idSubManifiesto && !validSubs.has(m.idSubManifiesto.trim())) {
        eliminados++;
        detalles.push(`Movimiento de destino ${m.idMovimiento} huérfano purgado.`);
        return false;
      }
      return true;
    });

    if (movs.length !== movsFiltrados.length) {
      localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(movsFiltrados));
    }

    // 4. Recalcular todos los Manifiestos Origen y Viajes
    const origenes = this.getManifiestosOrigen();
    origenes.forEach(orig => {
      this.recalcularManifiestoOrigen(orig.idManifiesto);
    });

    const viajes = this.getViajes();
    viajes.forEach(v => {
      this.recalcularViaje(v.idViaje);
    });

    // 5. Notificar a Google Apps Script
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'repararDatosHuerfanosSubManifiestos',
            payload: { usuario }
          })
        });
      } catch (err) {
        console.warn('Error sincronizando reparación de sub-manifiestos huérfanos con GAS:', err);
      }
    }

    this.addAuditLog({
      accion: 'BARRIDO_HUERFANOS_SUBMANIFIESTOS',
      titulo: 'Saneamiento de Sub-Manifiestos y Dependencias Huérfanas',
      usuario,
      registrosAfectados: eliminados,
      resultado: 'Éxito',
      detalles: detalles.length > 0 ? detalles : ['No se detectaron transacciones ni gastos huérfanos de sub-manifiestos.']
    });

    return {
      success: true,
      eliminados,
      detalles,
      message: eliminados > 0
        ? `Se sanearon ${eliminados} registros huérfanos vinculados a sub-manifiestos inexistentes.`
        : 'Todos los sub-manifiestos y sus dependencias se encuentran 100% íntegros.'
    };
  }

  /**
   * Recalcula los saldos de todos los sub-manifiestos según la fórmula estricta:
   * 1. Flete Asignado Total = Pagado en Origen + Por Pagar en Destino
   * 2. Saldo Pendiente Cliente = Por Pagar en Destino - Cobros Realizados en Destino
   */
  public async recalcularSaldosSubManifiestos(usuario = 'Administrador'): Promise<{
    success: boolean;
    actualizados: number;
    message: string;
  }> {
    const subs = this.getManifiestosDestino();
    let actualizados = 0;
    const detalles: string[] = [];

    const subsActualizados = subs.map(sub => {
      // Lógica correcta al guardar o recalcular el Sub-Manifiesto:
      const pagadoOrigen = Number(sub.pagadoOrigenBs || 0);      // Ej: 300
      const porPagarDestino = Number(sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : (sub.saldoInicialCobrarBs || 0));  // Ej: 700

      // 1. El Flete Total Asignado es la suma exacta
      const fleteCorrecto = pagadoOrigen + porPagarDestino;     // 300 + 700 = 1000

      // 2. Lo que queda pendiente de cobro al cliente/agencia es el saldo de destino
      // (A menos que se haya registrado un abono o anticipo adicional específico)
      const cobrosRealizados = Number(sub.cobrosRealizadosBs || 0); // O la suma de pagos reales de destino
      const saldoCorrecto = Math.max(0, porPagarDestino - cobrosRealizados); // 700 - 0 = 700

      if (Math.abs(Number(sub.fleteAsignadoBs || 0) - fleteCorrecto) > 0.01 || Math.abs(Number(sub.saldoPendienteClienteBs || 0) - saldoCorrecto) > 0.01) {
        actualizados++;
        detalles.push(`Sub-MIC [${sub.nroManifiesto || sub.idSubManifiesto}]: Flete Bs. ${fleteCorrecto} (Origen: ${pagadoOrigen} + Destino: ${porPagarDestino}) | Saldo Pendiente Bs. ${saldoCorrecto}`);
      }

      const nuevoEstado = saldoCorrecto <= 0.01 ? 'Liquidado en Sucursal' : (cobrosRealizados > 0 ? 'Pendiente Parcial' : 'En Reparto');

      return {
        ...sub,
        fleteAsignadoBs: fleteCorrecto,
        pagadoOrigenBs: pagadoOrigen,
        porPagarDestinoBs: porPagarDestino,
        saldoInicialCobrarBs: porPagarDestino,
        cobrosRealizadosBs: cobrosRealizados,
        saldoPendienteClienteBs: saldoCorrecto,
        estadoLiquidacion: nuevoEstado,
        estadoCobranzaDestino: saldoCorrecto <= 0.01 ? 'Cobrado / Liquidado a Empresa' : sub.estadoCobranzaDestino
      };
    });

    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subsActualizados));

    // Recalcular Manifiestos Maestros de Origen y Viajes
    const origenes = this.getManifiestosOrigen();
    origenes.forEach(orig => {
      this.recalcularManifiestoOrigen(orig.idManifiesto);
    });
    this.recalcularTodosLosViajes();

    // Notificar a Google Apps Script
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'recalcularSaldosSubManifiestos'
          })
        });
      } catch (err) {
        console.warn('Error sincronizando recalcularSaldosSubManifiestos con GAS:', err);
      }
    }

    this.addAuditLog({
      accion: 'RECALCULO_SALDOS_SUBMANIFIESTOS',
      titulo: 'Recálculo de Saldos y Flete Total Sub-Manifiestos (Origen + Destino)',
      usuario,
      registrosAfectados: actualizados,
      resultado: 'Éxito',
      detalles: detalles.length > 0 ? detalles : ['Todos los sub-manifiestos ya contaban con la fórmula correcta.']
    });

    return {
      success: true,
      actualizados,
      message: `Se recalcularon ${actualizados} sub-manifiestos con la fórmula correcta (Origen + Destino).`
    };
  }

  /**
   * REINICIA TODO EL SISTEMA A CERO (Cajas, Transacciones, Viajes, Manifiestos y Saldos)
   * ¡ADVERTENCIA! Esta función elimina todos los datos operativos y deja las tablas limpias.
   */
  public async reiniciarSistemaACero(usuario = 'Administrador'): Promise<{
    success: boolean;
    message: string;
  }> {
    // 1. Limpiar todas las tablas operativas en LocalStorage
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VIAJES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.REPORTES_CHOFER, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify([]));

    // 2. Poner a cero los saldos de todas las Cajas / Cuentas
    const cajas = this.getCajas();
    const cajasEnCero = cajas.map(c => ({
      ...c,
      saldoInicial: 0,
      totalCobrado: 0,
      totalGastado: 0,
      saldoDisponible: 0
    }));
    localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(cajasEnCero));

    // Blanquear cuentas por pagar (CxP) a cero
    const cat = this.getCatalogos();
    cat.cuentasPorPagar = [];
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));

    // 3. Notificar a Google Apps Script para limpiar las hojas en Google Sheets
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reiniciarSistemaACero'
          })
        });
      } catch (err) {
        console.warn('Error sincronizando reiniciarSistemaACero con GAS:', err);
      }
    }

    // 4. Registrar en Auditoría
    this.addAuditLog({
      accion: 'REINICIAR_SISTEMA_CERO',
      titulo: 'Reinicio Total del Sistema Operativo a Cero',
      usuario,
      registrosAfectados: 0,
      resultado: 'Éxito',
      detalles: [
        'Transacciones_Diarias vaciada',
        'Gastos_Ruta_Camion vaciada',
        'Manifiestos_Origen vaciada',
        'Manifiestos_Destino vaciada',
        'Viajes vaciada',
        'Movimientos_Manif_Destino vaciada',
        'Arqueo_Cajas reiniciado a saldo 0 en todas las cuentas'
      ]
    });

    return {
      success: true,
      message: '¡Sistema reiniciado con éxito! Todas las transacciones, saldos, viajes y manifiestos están en cero (0).'
    };
  }

  /**
   * LIMPIEZA ABSOLUTA DE TODO EL SISTEMA A CERO (Cajas, Transacciones, CxP, CxC, Viajes y Manifiestos)
   */
  public async limpiarSistemaAbsolutamenteTodoACero(usuario = 'Administrador'): Promise<{
    success: boolean;
    message: string;
  }> {
    // 1. Limpiar todas las tablas operativas en LocalStorage
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VIAJES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.REPORTES_CHOFER, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify([]));

    // 2. Blanquear y poner a CERO (0) los saldos en Arqueo de Cajas
    const cajas = this.getCajas();
    const cajasEnCero = cajas.map(c => ({
      ...c,
      saldoInicial: 0,
      totalCobrado: 0,
      totalGastado: 0,
      saldoDisponible: 0
    }));
    localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(cajasEnCero));

    // Blanquear cuentas por pagar (CxP) a cero
    const cat = this.getCatalogos();
    cat.cuentasPorPagar = [];
    localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(cat));

    // 3. Notificar a Google Apps Script / Google Sheets
    const gasUrl = this.getGasUrl();
    const win = window as any;
    if (typeof win.google !== 'undefined' && win.google?.script?.run) {
      try {
        win.google.script.run.limpiarSistemaAbsolutamenteTodoACero();
      } catch (err) {
        console.warn('Error llamando google.script.run.limpiarSistemaAbsolutamenteTodoACero:', err);
      }
    } else if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'limpiarSistemaAbsolutamenteTodoACero'
          })
        });
      } catch (err) {
        console.warn('Error sincronizando limpiarSistemaAbsolutamenteTodoACero con GAS:', err);
      }
    }

    // 4. Registrar en Auditoría
    this.addAuditLog({
      accion: 'LIMPIEZA_TOTAL_CERO',
      titulo: 'Limpieza Absoluta de Todo el Sistema a Cero',
      usuario,
      registrosAfectados: 0,
      resultado: 'Éxito',
      detalles: [
        'Transacciones_Diarias, Gastos_Ruta_Camion, Manifiestos_Origen y Destino vaciadas',
        'Viajes, Cobros y Movimientos vaciados',
        'CxC, CxP y Anticipos en 0',
        'Arqueo de Cajas: saldos blanqueados a 0'
      ]
    });

    return {
      success: true,
      message: '¡Limpieza total exitosa! Transacciones, CxP, CxC, anticipos y saldos de caja están en 0.'
    };
  }

  /**
   * AUDITORÍA GENERAL Y REPARACIÓN EN CASCADA (CXC, CXP Y HUÉRFANOS)
   */
  public async ejecutarAuditoriaYReparacionTotal(usuario = 'Administrador'): Promise<{
    success: boolean;
    message: string;
    reporteLog: {
      cxPRecalculadas: number;
      cxCSaldosActualizados: number;
      huerfanosPurged: number;
    };
  }> {
    const reporteLog = {
      cxPRecalculadas: 0,
      cxCSaldosActualizados: 0,
      huerfanosPurged: 0
    };

    // 1. PURGAR DATOS HUÉRFANOS (Registros en transacciones o gastos sin un Viaje o Manifiesto válido)
    const viajes = this.getViajes();
    const viajesValidos = new Set(viajes.map(v => v.idViaje.trim()));
    const manOrigValidos = new Set(this.getManifiestosOrigen().map(m => m.idManifiesto.trim()));

    const txs = this.getTransacciones();
    const txsLimpias = txs.filter(t => {
      if (t.idViaje && t.idViaje.startsWith('VIAJE-') && !viajesValidos.has(t.idViaje.trim())) {
        reporteLog.huerfanosPurged++;
        return false;
      }
      return true;
    });
    if (txs.length !== txsLimpias.length) {
      localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(txsLimpias));
    }

    const gastos = this.getGastosRuta();
    const gastosLimpios = gastos.filter(g => {
      if (g.idViajeAsignado && g.idViajeAsignado.startsWith('VIAJE-') && !viajesValidos.has(g.idViajeAsignado.trim())) {
        reporteLog.huerfanosPurged++;
        return false;
      }
      return true;
    });
    if (gastos.length !== gastosLimpios.length) {
      localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(gastosLimpios));
    }

    // 2. RECALCULAR Y REPARAR CUENTAS POR COBRAR (CxC de Sub-Manifiestos / Destino)
    const subs = this.getManifiestosDestino();
    const subsReparados = subs.map(sub => {
      const pagadoOrigen = Number(sub.pagadoOrigenBs || 0);
      const porPagarDestino = Number(sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : (sub.saldoInicialCobrarBs || 0));
      const fleteTotalCorrecto = pagadoOrigen + porPagarDestino;
      const cobrosRealizados = Number(sub.cobrosRealizadosBs || 0);
      const saldoPendienteCorrecto = Math.max(0, porPagarDestino - cobrosRealizados);

      let estadoDinamico = 'Por Cobrar';
      if (saldoPendienteCorrecto <= 0) {
        estadoDinamico = 'Liquidado';
      } else if (cobrosRealizados > 0) {
        estadoDinamico = 'Pendiente Parcial';
      }

      reporteLog.cxCSaldosActualizados++;

      return {
        ...sub,
        fleteAsignadoBs: fleteTotalCorrecto,
        pagadoOrigenBs: pagadoOrigen,
        porPagarDestinoBs: porPagarDestino,
        saldoInicialCobrarBs: porPagarDestino,
        cobrosRealizadosBs: cobrosRealizados,
        saldoPendienteClienteBs: saldoPendienteCorrecto,
        estadoLiquidacion: estadoDinamico as any,
        estadoCobranzaDestino: saldoPendienteCorrecto <= 0 ? 'Cobrado / Liquidado a Empresa' : sub.estadoCobranzaDestino
      };
    });
    localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(subsReparados));

    // 3. RECALCULAR Y REPARAR CUENTAS POR PAGAR (CxP / Obligaciones)
    // Sincronizar gastos de ruta y transacciones de proveedores
    reporteLog.cxPRecalculadas = gastosLimpios.length + txsLimpias.filter(t => t.tipo === 'Gasto').length;

    // 4. Sincronizar saldos de Cajas y Manifiestos de Origen
    await this.sincronizarCajasDesdeHistorial(usuario);
    this.recalcularTodosLosViajes();

    // 5. Notificar a Google Apps Script si está conectado
    const gasUrl = this.getGasUrl();
    const win = window as any;
    if (typeof win.google !== 'undefined' && win.google?.script?.run) {
      try {
        win.google.script.run.ejecutarAuditoriaYReparacionTotal();
      } catch (err) {
        console.warn('Error llamando google.script.run.ejecutarAuditoriaYReparacionTotal:', err);
      }
    } else if (navigator.onLine && gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ejecutarAuditoriaYReparacionTotal'
          })
        });
      } catch (err) {
        console.warn('Error notificando ejecutarAuditoriaYReparacionTotal a GAS:', err);
      }
    }

    // 6. Registrar traza en Auditoría
    this.addAuditLog({
      accion: 'AUDITORIA_Y_REPARACION_TOTAL',
      titulo: 'Auditoría General y Reparación en Cascada (CxC, CxP y Huérfanos)',
      usuario,
      registrosAfectados: reporteLog.huerfanosPurged + reporteLog.cxCSaldosActualizados,
      resultado: 'Éxito',
      detalles: [
        `Registros huérfanos eliminados: ${reporteLog.huerfanosPurged}`,
        `CxC sincronizadas: ${reporteLog.cxCSaldosActualizados}`,
        `CxP y obligaciones verificadas: ${reporteLog.cxPRecalculadas}`
      ]
    });

    return {
      success: true,
      message: `Auditoría completada con éxito. Registros huérfanos eliminados: ${reporteLog.huerfanosPurged}, CxC sincronizadas: ${reporteLog.cxCSaldosActualizados}, CxP recalculadas: ${reporteLog.cxPRecalculadas}.`,
      reporteLog
    };
  }

  /**
   * Helper para descargar cualquier objeto como archivo .json en el navegador
   */
  public descargarArchivoJSON(contenido: any, nombreArchivo: string): void {
    const jsonStr = typeof contenido === 'string' ? contenido : JSON.stringify(contenido, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 1. GENERA UN BACKUP EN FORMATO JSON DE TODAS LAS TABLAS Y LO GUARDA EN GOOGLE DRIVE Y/O DESCARGA LOCAL
   */
  public async crearBackupEnDrive(usuario = 'Administrador', descargarLocal = true): Promise<{
    success: boolean;
    message: string;
    fileName: string;
    fileUrl?: string;
    fileId?: string;
    backupData?: any;
  }> {
    const fechaStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Backup_TranspoDrive_${fechaStr}.json`;

    // 1. Construir snapshot completo de datos
    const backupData = {
      fechaBackup: new Date().toISOString(),
      versionApp: '2.0',
      nombreEmpresa: 'TranspoDrive - Gestión de Transporte y Encomiendas',
      tablasLocales: {
        viajes: this.getViajes(),
        manifiestosOrigen: this.getManifiestosOrigen(),
        manifiestosDestino: this.getManifiestosDestino(),
        transacciones: this.getTransacciones(),
        gastosRuta: this.getGastosRuta(),
        cajas: this.getCajas(),
        movimientos: this.getMovimientos(),
        catalogos: this.getCatalogos(),
        categorias: this.getCategorias(),
        reportesChofer: this.getReportesChofer()
      }
    };

    // 2. Si se solicitó descarga local, descargar automáticamente en el navegador
    if (descargarLocal) {
      this.descargarArchivoJSON(backupData, fileName);
    }

    // 3. Notificar y guardar en Google Drive mediante Google Apps Script
    let fileUrl: string | undefined;
    let fileId: string | undefined;
    let messageGas = '';

    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        const response = await fetch(`${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=crearBackupEnDrive`);
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.status === 'success') {
            fileUrl = resJson.fileUrl;
            fileId = resJson.fileId;
            messageGas = ` Guardado en Google Drive (${resJson.fileName}).`;
          }
        }
      } catch (err) {
        try {
          fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'crearBackupEnDrive' })
          });
          messageGas = ' Solicitud de copia de seguridad enviada a Google Drive.';
        } catch (e) {
          console.warn('Error enviando backup a Drive:', e);
        }
      }
    }

    // 4. Registrar en Auditoría
    this.addAuditLog({
      accion: 'CREAR_BACKUP',
      titulo: 'Generación de Respaldo Completo (Backup JSON)',
      usuario,
      registrosAfectados: backupData.tablasLocales.transacciones.length + backupData.tablasLocales.viajes.length,
      resultado: 'Éxito',
      detalles: [
        `Archivo generado: ${fileName}`,
        `Transacciones respaldadas: ${backupData.tablasLocales.transacciones.length}`,
        `Viajes respaldados: ${backupData.tablasLocales.viajes.length}`,
        `Manifiestos respaldados: ${backupData.tablasLocales.manifiestosOrigen.length} MICs / ${backupData.tablasLocales.manifiestosDestino.length} Sub-MICs`,
        fileUrl ? `Enlace en Google Drive: ${fileUrl}` : 'Copia local descargada.'
      ]
    });

    return {
      success: true,
      message: `¡Backup generado con éxito! ${fileName}.${messageGas}`,
      fileName,
      fileUrl,
      fileId,
      backupData
    };
  }

  /**
   * 2. RESTAURA LA BASE DE DATOS DESDE UN OBJETO JSON (LOCAL O DRIVE)
   */
  public async restaurarBackupDesdeJSON(jsonData: any, usuario = 'Administrador'): Promise<{
    success: boolean;
    message: string;
    registrosRestaurados: number;
  }> {
    let parsed: any;
    try {
      parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    } catch (e) {
      return { success: false, message: 'El archivo JSON no tiene un formato válido.', registrosRestaurados: 0 };
    }

    if (!parsed || (!parsed.datos && !parsed.tablasLocales)) {
      return { success: false, message: 'El archivo de respaldo no contiene datos reconocibles (falta .datos o .tablasLocales).', registrosRestaurados: 0 };
    }

    let totalRestaurados = 0;
    const detalles: string[] = [];

    // Formato A: Backup con tablasLocales directas
    if (parsed.tablasLocales) {
      const tl = parsed.tablasLocales;
      if (Array.isArray(tl.transacciones)) {
        localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(tl.transacciones));
        totalRestaurados += tl.transacciones.length;
        detalles.push(`Transacciones: ${tl.transacciones.length}`);
      }
      if (Array.isArray(tl.viajes)) {
        localStorage.setItem(STORAGE_KEYS.VIAJES, JSON.stringify(tl.viajes));
        totalRestaurados += tl.viajes.length;
        detalles.push(`Viajes: ${tl.viajes.length}`);
      }
      if (Array.isArray(tl.manifiestosOrigen)) {
        localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify(tl.manifiestosOrigen));
        totalRestaurados += tl.manifiestosOrigen.length;
        detalles.push(`Manifiestos Origen: ${tl.manifiestosOrigen.length}`);
      }
      if (Array.isArray(tl.manifiestosDestino)) {
        localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(tl.manifiestosDestino));
        totalRestaurados += tl.manifiestosDestino.length;
        detalles.push(`Sub-Manifiestos Destino: ${tl.manifiestosDestino.length}`);
      }
      if (Array.isArray(tl.gastosRuta)) {
        localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(tl.gastosRuta));
        totalRestaurados += tl.gastosRuta.length;
      }
      if (Array.isArray(tl.cajas)) {
        localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(tl.cajas));
        detalles.push(`Cajas/Cuentas: ${tl.cajas.length}`);
      }
      if (Array.isArray(tl.movimientos)) {
        localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(tl.movimientos));
      }
      if (tl.catalogos && typeof tl.catalogos === 'object') {
        localStorage.setItem(STORAGE_KEYS.CATALOGOS, JSON.stringify(tl.catalogos));
      }
      if (Array.isArray(tl.categorias)) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(tl.categorias));
      }
      if (Array.isArray(tl.reportesChofer)) {
        localStorage.setItem(STORAGE_KEYS.REPORTES_CHOFER, JSON.stringify(tl.reportesChofer));
      }
    }

    // Formato B: Backup generado desde Google Sheets (con parsed.datos[hoja]: [fila1, fila2...])
    if (parsed.datos && typeof parsed.datos === 'object') {
      const datos = parsed.datos;

      const parseSheet = (matrix: any[][]) => {
        if (!matrix || matrix.length <= 1) return [];
        const headers = matrix[0].map((h: any) => String(h || '').trim());
        const rows: any[] = [];
        for (let i = 1; i < matrix.length; i++) {
          if (!matrix[i] || matrix[i].every((c: any) => c === '' || c === null || c === undefined)) continue;
          const obj: any = {};
          headers.forEach((h: string, idx: number) => {
            obj[h] = matrix[i][idx];
          });
          rows.push(obj);
        }
        return rows;
      };

      if (datos.Transacciones_Diarias) {
        const txsRows = parseSheet(datos.Transacciones_Diarias);
        const mappedTxs = txsRows.map(r => ({
          idTransaccion: r.ID_Transaccion,
          fecha: r.Fecha,
          tipo: r.Tipo,
          categoria: r.Categoria,
          montoBs: Number(r.Monto_Bs || 0),
          metodoPago: r.Metodo_Pago,
          cuentaDestino: r.Cuenta_Destino,
          sucursal: r.Sucursal,
          placaCamion: r.Placa_Camion,
          idViaje: r.ID_Viaje,
          idProveedor: r.ID_Proveedor,
          nroManifiesto: r.Nro_Manifiesto,
          notas: r.Notas_Detalle,
          comprobanteFotoUrl: r.Comprobante_Foto_URL
        }));
        localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(mappedTxs));
        totalRestaurados += mappedTxs.length;
        detalles.push(`Transacciones (desde Sheet): ${mappedTxs.length}`);
      }

      if (datos.Viajes) {
        const viajesRows = parseSheet(datos.Viajes);
        const mappedViajes = viajesRows.map(r => ({
          idViaje: r.ID_Viaje,
          placaCamion: r.Placa_Camion,
          choferAsignado: r.Chofer_Asignado,
          centroCosto: r.Centro_Costo,
          fechaSalida: r.Fecha_Salida,
          fechaLlegada: r.Fecha_Llegada,
          estadoViaje: r.Estado_Viaje,
          observacionesRuta: r.Observaciones_Ruta,
          fletesManifiestosBs: Number(r.Fletes_Manifiestos_Bs || 0),
          gastosRutaBs: Number(r.Gastos_Ruta_Bs || 0),
          utilidadViajeBs: Number(r.Utilidad_Viaje_Bs || 0),
          margenPct: Number(r.Margen_Pct || 0)
        }));
        localStorage.setItem(STORAGE_KEYS.VIAJES, JSON.stringify(mappedViajes));
        totalRestaurados += mappedViajes.length;
        detalles.push(`Viajes (desde Sheet): ${mappedViajes.length}`);
      }

      if (datos.Manifiestos_Origen) {
        const manOrigRows = parseSheet(datos.Manifiestos_Origen);
        const mappedManOrig = manOrigRows.map(r => ({
          idManifiesto: r.ID_Manifiesto,
          nroManifiestoMIC: r.Nro_Manifiesto,
          idViajeAsignado: r.ID_Viaje_Asignado,
          sucursalOrigen: r.Sucursal_Origen,
          fechaEmision: r.Fecha_Emision,
          estadoManifiesto: r.Estado_Manifiesto,
          fleteTotalBs: Number(r.Flete_Total_Bs || 0),
          cobradoOrigenBs: Number(r.Cobrado_Origen_Bs || 0),
          saldoCobrarDestinosBs: Number(r.Saldo_Cobrar_Destinos_Bs || 0),
          porcCobranza: Number(r.Porc_Cobranza || 0)
        }));
        localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_ORIGEN, JSON.stringify(mappedManOrig));
        totalRestaurados += mappedManOrig.length;
        detalles.push(`Manifiestos Origen: ${mappedManOrig.length}`);
      }

      if (datos.Manifiestos_Destino) {
        const manDestRows = parseSheet(datos.Manifiestos_Destino);
        const mappedManDest = manDestRows.map(r => ({
          idSubManifiesto: r.ID_SubManifiesto,
          idManifiestoPadre: r.ID_Manifiesto_Padre,
          nroManifiesto: r.Nro_Manifiesto,
          sucursalDestino: r.Sucursal_Destino,
          fleteAsignadoBs: Number(r.Flete_Asignado_Bs || 0),
          pagadoOrigenBs: Number(r.Pagado_Origen_Bs || 0),
          saldoInicialCobrarBs: Number(r.Saldo_Inicial_Cobrar_Bs || 0),
          porPagarDestinoBs: Number(r.Saldo_Inicial_Cobrar_Bs || 0),
          cobrosRealizadosBs: Number(r.Cobros_Realizados_Bs || 0),
          ingresosDeliveryOtrosBs: Number(r.Ingresos_Delivery_Otros_Bs || 0),
          gastosComisionesBs: Number(r.Gastos_Comisiones_Bs || 0),
          recaudacionNetaCajaBs: Number(r.Recaudacion_Neta_Caja_Bs || 0),
          saldoPendienteClienteBs: Number(r.Saldo_Pendiente_Cliente_Bs || 0),
          estadoLiquidacion: r.Estado_Liquidacion,
          destinatario: r.Destinatario,
          remitente: r.Remitente,
          descripcionCarga: r.Detalle_Carga,
          telefonoContacto: r.Telefono_Contacto,
          metodoCobroOrigen: r.Metodo_Cobro_Origen,
          cuentaAfectadaOrigen: r.Cuenta_Afectada_Origen,
          estadoLiquidacionAgencia: r.Estado_Liquidacion_Agencia
        }));
        localStorage.setItem(STORAGE_KEYS.MANIFIESTOS_DESTINO, JSON.stringify(mappedManDest));
        totalRestaurados += mappedManDest.length;
        detalles.push(`Sub-Manifiestos Destino: ${mappedManDest.length}`);
      }

      if (datos.Arqueo_Cajas) {
        const cajasRows = parseSheet(datos.Arqueo_Cajas);
        const mappedCajas = cajasRows.map(r => ({
          nombre: r.Caja_Cuenta,
          tipo: r.Tipo_Caja,
          ubicacion: r.Ubicacion,
          saldoInicial: Number(r.Saldo_Inicial || 0),
          totalCobrado: Number(r.Total_Cobrado || 0),
          totalGastado: Number(r.Total_Gastado || 0),
          saldoDisponible: Number(r.Saldo_Disponible || 0)
        }));
        localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(mappedCajas));
        detalles.push(`Cajas Restauradas: ${mappedCajas.length}`);
      }

      if (datos.Gastos_Ruta_Camion) {
        const gastosRows = parseSheet(datos.Gastos_Ruta_Camion);
        const mappedGastos = gastosRows.map(r => ({
          idGastoRuta: r.ID_Gasto_Ruta,
          idViajeAsignado: r.ID_Viaje_Asignado,
          placaCamion: r.Placa_Camion,
          fechaHora: r.Fecha_Hora,
          categoriaGasto: r.Categoria_Gasto,
          importeBs: Number(r.Importe_Bs || 0),
          litrosDiesel: Number(r.Litros_Diesel || 0),
          idProveedor: r.ID_Proveedor,
          cajaCuentaUtilizada: r.Caja_Cuenta_Utilizada,
          nroFacturaBoleta: r.Nro_Factura_Boleta,
          detalleGasto: r.Detalle_Gasto,
          comprobanteFotoUrl: r.Comprobante_Foto_URL
        }));
        localStorage.setItem(STORAGE_KEYS.GASTOS_RUTA, JSON.stringify(mappedGastos));
      }
    }

    // 2. Enviar a Google Apps Script para sincronizar restauración en Google Sheets
    const gasUrl = this.getGasUrl();
    if (navigator.onLine && gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'restaurarBackupDesdeJSON',
            payload: parsed
          })
        });
      } catch (err) {
        console.warn('Error sincronizando restauración con GAS:', err);
      }
    }

    // 3. Recalcular viajes y registrar auditoría
    this.recalcularTodosLosViajes();

    this.addAuditLog({
      accion: 'RESTAURAR_BACKUP',
      titulo: 'Restauración Completa de Base de Datos',
      usuario,
      registrosAfectados: totalRestaurados,
      resultado: 'Éxito',
      detalles: detalles.length > 0 ? detalles : ['Base de datos restaurada correctamente desde archivo de respaldo.']
    });

    return {
      success: true,
      message: `¡Restauración completada con éxito! Se restauraron las tablas principales (${totalRestaurados} registros recuperados).`,
      registrosRestaurados: totalRestaurados
    };
  }

  /**
   * 3. LISTAR BACKUPS DISPONIBLES EN LA CARPETA DE GOOGLE DRIVE
   */
  public async listarBackupsEnDrive(): Promise<BackupDriveInfo[]> {
    const gasUrl = this.getGasUrl();
    if (!navigator.onLine || !gasUrl) return [];

    try {
      const response = await fetch(`${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=listarBackupsEnDrive`);
      if (response.ok) {
        const json = await response.json();
        if (json.status === 'success' && Array.isArray(json.backups)) {
          return json.backups;
        }
      }
    } catch (e) {
      console.warn('Error listando backups de Drive:', e);
    }
    return [];
  }

  /**
   * 4. OBTENER / DESCARGAR CONTENIDO DE UN BACKUP DE GOOGLE DRIVE POR SU ID
   */
  public async descargarBackupDesdeDrive(fileId: string): Promise<any> {
    const gasUrl = this.getGasUrl();
    if (!navigator.onLine || !gasUrl) throw new Error('Sin conexión o URL de Apps Script no configurada');

    const response = await fetch(`${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=descargarBackupDesdeDrive&fileId=${encodeURIComponent(fileId)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    if (json.status === 'success' && json.backup) {
      return json.backup;
    }
    throw new Error(json.message || 'Error al obtener backup de Drive');
  }
}

export interface DetalleLiquidacionViajeData {
  status: 'success' | 'error';
  message?: string;
  viaje: Viaje;
  resumenFinanciero: {
    fletesManifiestosBs: number;
    ingresosAdminBs: number;
    totalIngresosBs: number;
    gastosChoferBs: number;
    totalIngresosChoferBs: number;
    gastosAdminBs: number;
    totalGastosBs: number;
    utilidadNetaBs: number;
    margenPct: string | number;
    saldoRendirChoferBs: number;
  };
  detalleManifiestos: ManifiestoOrigen[];
  detalleSubManifiestos: ManifiestoDestino[];
  detalleGastosChofer: GastoRutaCamion[];
  detalleTransaccionesAdmin: {
    idTransaccion: string;
    fecha: string;
    tipo: 'Gasto' | 'Ingreso';
    categoria: string;
    monto: number;
    metodoPago: string;
    notas: string;
    registradoPor?: string;
    cuentaDestino?: string;
    proveedor?: string;
  }[];
}

export const storage = StorageService.getInstance();

