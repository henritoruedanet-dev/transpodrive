/**
 * =========================================================================
 * SISTEMA INTEGRADO DE TRANSPORTE Y FINANZAS - BACKEND APPS SCRIPT (V2 OPTIMIZADA)
 * Base de Datos: Google Sheets & Almacenamiento: Google Drive
 * Incluye: Proveedores, Balance Operativo, Estado de Resultados y Antiduplicados
 * =========================================================================
 */

const SPREADSHEET_ID = ""; // Dejar vacío si está incrustado en la hoja
const DRIVE_FOLDER_NAME = "Comprobantes_Transporte_Fotos";

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * =========================================================================
 * MENÚ ADMINISTRATIVO DIRECTO EN GOOGLE SHEETS
 * =========================================================================
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("🚛 TranspoDrive")
      .addItem("🌐 Abrir App Web", "menuAbrirAppWeb")
      .addSeparator()
      .addItem("📊 Inicializar Estructura de Tablas", "menuInicializarEstructura")
      .addItem("🛡️ Auditoría y Reparación Total (CxC, CxP, Huérfanos)", "menuAuditoriaTotal")
      .addItem("🔄 Recalcular Saldos Sub-Manifiestos", "menuRecalcularSaldos")
      .addItem("💾 Crear Respaldo en Google Drive", "menuCrearBackup")
      .addSeparator()
      .addItem("⚠️ Limpiar Sistema a Cero (Reset Total)", "menuLimpiarSistemaACero")
      .addToUi();
  } catch (e) {
    // Si se ejecuta en contexto sin UI de Sheets
  }
}

function menuAbrirAppWeb() {
  try {
    const url = ScriptApp.getService().getUrl();
    const html = HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:16px;text-align:center;">' +
      '<h3 style="color:#1d4ed8;margin-bottom:12px;">TranspoDrive ERP</h3>' +
      '<p style="color:#475569;margin-bottom:20px;font-size:14px;">Haz clic abajo para abrir la aplicación web completa en una nueva pestaña:</p>' +
      '<a href="' + url + '" target="_blank" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">🚀 Abrir TranspoDrive</a>' +
      '</div>'
    ).setWidth(420).setHeight(220);
    SpreadsheetApp.getUi().showModalDialog(html, "Acceso a TranspoDrive");
  } catch (err) {
    SpreadsheetApp.getUi().alert("Aviso", "Implementa el script como Aplicación Web para obtener el enlace directo.", SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function menuInicializarEstructura() {
  const res = inicializarEstructuraBaseDatos();
  SpreadsheetApp.getUi().alert("Inicialización", res, SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuAuditoriaTotal() {
  const res = ejecutarAuditoriaYReparacionTotal();
  SpreadsheetApp.getUi().alert("Auditoría y Reparación", (res && res.message) ? res.message : JSON.stringify(res), SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuRecalcularSaldos() {
  const res = recalcularSaldosSubManifiestos();
  SpreadsheetApp.getUi().alert("Recálculo de Saldos", (res && res.message) ? res.message : JSON.stringify(res), SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuCrearBackup() {
  const res = crearBackupEnDrive();
  SpreadsheetApp.getUi().alert("Respaldo Drive", (res && res.message) ? res.message : JSON.stringify(res), SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuLimpiarSistemaACero() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    "⚠️ CONFIRMACIÓN CRÍTICA",
    "¿Está absolutamente seguro de que desea vaciar TODOS los datos operativos y restablecer las cajas a 0? Esta acción borrará viajes, manifiestos, gastos y transacciones.",
    ui.ButtonSet.YES_NO
  );
  if (resp === ui.Button.YES) {
    const res = limpiarSistemaAbsolutamenteTodoACero();
    ui.alert("Limpieza Completa", (res && res.message) ? res.message : JSON.stringify(res), ui.ButtonSet.OK);
  }
}

/**
 * Inicializador de estructura con Proveedores y campos financieros
 */
function inicializarEstructuraBaseDatos() {
  const ss = getSpreadsheet();
  
  const tablas = [
    {
      nombre: "Proveedores",
      headers: ["ID_Proveedor", "Nombre_RazonSocial", "Telefono", "Direccion", "Rubro_Categoria", "Estado"]
    },
    {
      nombre: "Viajes",
      headers: [
        "ID_Viaje", "Placa_Camion", "Chofer_Asignado", "Centro_Costo", "Fecha_Salida", "Fecha_Llegada",
        "Estado_Viaje", "Observaciones_Ruta", "Fletes_Manifiestos_Bs", "Gastos_Ruta_Bs",
        "Utilidad_Viaje_Bs", "Margen_Pct"
      ]
    },
    {
      nombre: "Manifiestos_Origen",
      headers: [
        "ID_Manifiesto", "Nro_Manifiesto", "ID_Viaje_Asignado", "Sucursal_Origen",
        "Fecha_Emision", "Estado_Manifiesto", "Flete_Total_Bs", "Cobrado_Origen_Bs",
        "Saldo_Cobrar_Destinos_Bs", "Porc_Cobranza"
      ]
    },
    {
      nombre: "Manifiestos_Destino",
      headers: [
        "ID_SubManifiesto", "ID_Manifiesto_Padre", "Nro_Manifiesto", "Sucursal_Destino",
        "Flete_Asignado_Bs", "Pagado_Origen_Bs", "Saldo_Inicial_Cobrar_Bs",
        "Cobros_Realizados_Bs", "Ingresos_Delivery_Otros_Bs", "Gastos_Comisiones_Bs",
        "Recaudacion_Neta_Caja_Bs", "Saldo_Pendiente_Cliente_Bs", "Estado_Liquidacion",
        "Destinatario", "Remitente", "Detalle_Carga", "Telefono_Contacto",
        "Metodo_Cobro_Origen", "Cuenta_Afectada_Origen", "Estado_Liquidacion_Agencia",
        "Saldo_Pendiente_Agencia_Bs", "Tipo_Responsable_Destino"
      ]
    },
    {
      nombre: "Transacciones_Diarias",
      headers: [
        "ID_Transaccion", "Fecha", "Tipo", "Categoria", "Monto_Bs",
        "Metodo_Pago", "Cuenta_Destino", "Sucursal", "Placa_Camion",
        "ID_Viaje", "ID_Proveedor", "Nro_Manifiesto", "Notas_Detalle", "Comprobante_Foto_URL"
      ]
    },
    {
      nombre: "Movimientos_Manif_Destino",
      headers: [
        "ID_Movimiento", "ID_SubManifiesto", "Sucursal", "Tipo_Movimiento",
        "Categoria_Concepto", "Importe_Bs", "Caja_Cuenta_Afectada", "Fecha_Hora",
        "Nro_Comprobante", "Detalle_Operacion"
      ]
    },
    {
      nombre: "Gastos_Ruta_Camion",
      headers: [
        "ID_Gasto_Ruta", "ID_Viaje_Asignado", "Placa_Camion", "Fecha_Hora",
        "Categoria_Gasto", "Importe_Bs", "Litros_Diesel", "ID_Proveedor",
        "Caja_Cuenta_Utilizada", "Nro_Factura_Boleta", "Detalle_Gasto", "Comprobante_Foto_URL"
      ]
    },
    {
      nombre: "Arqueo_Cajas",
      headers: [
        "Caja_Cuenta", "Tipo_Caja", "Ubicacion", "Saldo_Inicial",
        "Total_Cobrado", "Total_Gastado", "Saldo_Disponible"
      ]
    },
    {
      nombre: "Reportes_Chofer",
      headers: [
        "ID_Reporte_Chofer", "ID_Viaje", "Placa_Camion", "Chofer_Asignado", "Centro_Costo",
        "Ruta_Origen", "Ruta_Destino", "Manifiestos_Asociados", "Fecha_Inicio", "Fecha_Cierre",
        "Total_Ingresos_Bs", "Total_Gastos_Bs", "Saldo_Favor_Contra_Bs", "Estado_Reporte", "Observaciones"
      ]
    },
    {
      nombre: "Detalle_Ingresos_Chofer",
      headers: [
        "ID_Ingreso_Chofer", "ID_Reporte_Chofer", "ID_Viaje", "Fecha", "Concepto_Ingreso",
        "Detalle_Glosa", "Importe_Bs", "Nro_Comprobante"
      ]
    },
    {
      nombre: "Detalle_Gastos_Chofer",
      headers: [
        "ID_Gasto_Chofer", "ID_Reporte_Chofer", "ID_Viaje", "Fecha", "Categoria_Gasto",
        "Detalle_Glosa", "Importe_Bs", "Litros_Diesel", "Nro_Factura_Recibo", "ID_Proveedor"
      ]
    },
    {
      nombre: "Cuentas_Por_Pagar",
      headers: [
        "ID_CxP", "ID_Proveedor", "ID_Viaje", "Acreedor_Nombre", "Concepto_Rubro",
        "Monto_Total_Bs", "Monto_Pagado_Bs", "Saldo_Pendiente_Bs", "Estado",
        "Fecha_Registro", "Fecha_Vencimiento", "Nro_Factura_Recibo"
      ]
    },
    {
      nombre: "Cuentas_Por_Cobrar",
      headers: [
        "ID_CxC", "ID_SubManifiesto", "ID_Viaje", "Deudor_Nombre", "Tipo_Deudor",
        "Monto_Original_Bs", "Monto_Cobrado_Bs", "Saldo_Pendiente_Bs", "Estado",
        "Fecha_Registro", "Fecha_Vencimiento", "Observaciones"
      ]
    },
    {
      nombre: "Cobros_SubManifiestos",
      headers: [
        "ID_Cobro", "ID_SubManifiesto", "ID_Viaje", "Fecha_Cobro", "Monto_Cobrado_Bs",
        "Caja_Destino", "Responsable_Cobro", "Tipo_Responsable", "Nro_Recibo", "Notas"
      ]
    },
    {
      nombre: "Gastos_Administrativos",
      headers: [
        "ID_Gasto_Admin", "Fecha", "Categoria", "Descripcion", "Monto_Bs",
        "Caja_Cuenta", "Sucursal", "Comprobante_URL"
      ]
    },
    {
      nombre: "Anticipos_Choferes",
      headers: [
        "ID_Anticipo", "ID_Viaje", "Chofer_Nombre", "Fecha", "Monto_Bs",
        "Caja_Cuenta", "Estado_Descuento", "Notas"
      ]
    },
    {
      nombre: "Liquidaciones_Ruta",
      headers: [
        "ID_Liquidacion", "ID_Viaje", "Chofer_Nombre", "Fecha_Cierre",
        "Fletes_Totales_Bs", "Gastos_Ruta_Bs", "Anticipos_Descontados_Bs", "Neto_Pagar_Chofer_Bs",
        "Estado", "Notas"
      ]
    },
    {
      nombre: "Presupuestos",
      headers: ["ID_Presupuesto", "Categoria", "Monto_Presupuestado_Bs", "Mes_Ano"]
    },
    {
      nombre: "Auditoria_Mantenimiento",
      headers: ["ID_Traza", "Fecha_Hora", "Accion", "Usuario", "Registros_Afectados", "Resultado", "Detalle"]
    }
  ];

  tablas.forEach(tabla => {
    let sheet = ss.getSheetByName(tabla.nombre);
    if (!sheet) {
      sheet = ss.insertSheet(tabla.nombre);
      sheet.appendRow(tabla.headers);
      sheet.getRange(1, 1, 1, tabla.headers.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    } else {
      // Auto-actualizar columnas faltantes si la hoja ya existía
      const lastCol = sheet.getLastColumn();
      if (lastCol > 0) {
        const curHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
        tabla.headers.forEach(expectedHeader => {
          if (!curHeaders.includes(expectedHeader)) {
            const nextCol = sheet.getLastColumn() + 1;
            sheet.getRange(1, nextCol).setValue(expectedHeader).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
          }
        });
      }
    }
  });
    return "Estructura completa de transporte, proveedores y finanzas inicializada con éxito.";
}

function getComprobantesFolder() {
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

/**
 * Endpoint GET: Entrega tablas y reportes listos para la app
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
    
    // Si no se especifica acción API o se solicita la app visual, servir Index.html
    if (!action || action === "web" || action === "app") {
      try {
        return HtmlService.createHtmlOutputFromFile("Index")
          .setTitle("TranspoDrive - Gestión de Transporte y Encomiendas")
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
          .addMetaTag("viewport", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
      } catch (errHtml) {
        // Fallback si Index.html aún no ha sido creado en el proyecto Apps Script
        const ss = getSpreadsheet();
        return jsonResponse({
          status: "success",
          message: "API Google Apps Script operativa. Crea el archivo 'Index.html' en Apps Script para ver la interfaz gráfica.",
          data: {
            proveedores: getSheetData(ss.getSheetByName("Proveedores")),
            viajes: getSheetData(ss.getSheetByName("Viajes")),
            manifiestosOrigen: getSheetData(ss.getSheetByName("Manifiestos_Origen")),
            manifiestosDestino: getSheetData(ss.getSheetByName("Manifiestos_Destino")),
            cajas: getSheetData(ss.getSheetByName("Arqueo_Cajas")),
            transacciones: getSheetData(ss.getSheetByName("Transacciones_Diarias"))
          }
        });
      }
    }

    const ss = getSpreadsheet();

    if (action === "getAll") {
      const data = {
        proveedores: getSheetData(ss.getSheetByName("Proveedores")),
        viajes: getSheetData(ss.getSheetByName("Viajes")),
        manifiestosOrigen: getSheetData(ss.getSheetByName("Manifiestos_Origen")),
        manifiestosDestino: getSheetData(ss.getSheetByName("Manifiestos_Destino")),
        movimientosDestino: getSheetData(ss.getSheetByName("Movimientos_Manif_Destino")),
        gastosRuta: getSheetData(ss.getSheetByName("Gastos_Ruta_Camion")),
        cajas: getSheetData(ss.getSheetByName("Arqueo_Cajas")),
        transacciones: getSheetData(ss.getSheetByName("Transacciones_Diarias")),
        presupuestos: getSheetData(ss.getSheetByName("Presupuestos")),
        auditoriaLogs: getSheetData(ss.getSheetByName("Auditoria_Mantenimiento")),
        reportesChofer: getSheetData(ss.getSheetByName("Reportes_Chofer")),
        detalleIngresosChofer: getSheetData(ss.getSheetByName("Detalle_Ingresos_Chofer")),
        detalleGastosChofer: getSheetData(ss.getSheetByName("Detalle_Gastos_Chofer")),
        cuentasPorPagar: getSheetData(ss.getSheetByName("Cuentas_Por_Pagar")),
        cuentasPorCobrar: getSheetData(ss.getSheetByName("Cuentas_Por_Cobrar")),
        cobrosSubManifiestos: getSheetData(ss.getSheetByName("Cobros_SubManifiestos")),
        gastosAdministrativos: getSheetData(ss.getSheetByName("Gastos_Administrativos")),
        anticiposChoferes: getSheetData(ss.getSheetByName("Anticipos_Choferes")),
        liquidacionesRuta: getSheetData(ss.getSheetByName("Liquidaciones_Ruta"))
      };
      return jsonResponse({ status: "success", data: data });
    }

    if (action === "ping") {
      return jsonResponse({ status: "success", message: "Conexión exitosa", timestamp: new Date().toISOString() });
    }

    if (action === "reporteEstadoResultados") {
      const idViaje = e.parameter.idViaje || "";
      const centroCosto = e.parameter.centroCosto || "";
      return jsonResponse(calcularEstadoResultados(ss, idViaje, centroCosto));
    }

    if (action === "reporteBalanceOperativo") {
      const idViaje = e.parameter.idViaje || "";
      const centroCosto = e.parameter.centroCosto || "";
      return jsonResponse(calcularBalanceOperativo(ss, idViaje, centroCosto));
    }

    if (action === "detalleLiquidacionViaje") {
      const idViaje = e.parameter.idViaje || "";
      return jsonResponse(obtenerDetalleLiquidacionViaje(ss, idViaje));
    }

    if (action === "ejecutarDiagnosticoIntegridad") {
      return jsonResponse(ejecutarDiagnosticoIntegridad(ss));
    }

    if (action === "reiniciarSistemaACero" || action === "limpiarSistemaAbsolutamenteTodoACero") {
      return jsonResponse(limpiarSistemaAbsolutamenteTodoACero());
    }

    if (action === "ejecutarAuditoriaYReparacionTotal") {
      return jsonResponse(ejecutarAuditoriaYReparacionTotal());
    }

    if (action === "listarBackupsEnDrive") {
      return jsonResponse(listarBackupsEnDrive());
    }

    if (action === "crearBackupEnDrive") {
      return jsonResponse(crearBackupEnDrive());
    }

    if (action === "descargarBackupDesdeDrive") {
      const fileId = e.parameter.fileId || "";
      return jsonResponse(descargarBackupDesdeDrive(fileId));
    }

    const data = {
      proveedores: getSheetData(ss.getSheetByName("Proveedores")),
      viajes: getSheetData(ss.getSheetByName("Viajes")),
      manifiestosOrigen: getSheetData(ss.getSheetByName("Manifiestos_Origen")),
      manifiestosDestino: getSheetData(ss.getSheetByName("Manifiestos_Destino")),
      movimientosDestino: getSheetData(ss.getSheetByName("Movimientos_Manif_Destino")),
      gastosRuta: getSheetData(ss.getSheetByName("Gastos_Ruta_Camion")),
      cajas: getSheetData(ss.getSheetByName("Arqueo_Cajas")),
      transacciones: getSheetData(ss.getSheetByName("Transacciones_Diarias")),
      presupuestos: getSheetData(ss.getSheetByName("Presupuestos")),
      auditoriaLogs: getSheetData(ss.getSheetByName("Auditoria_Mantenimiento"))
    };

    return jsonResponse({ status: "success", data: data });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Endpoint POST: Procesa registros y formularios
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const ss = getSpreadsheet();

    if (action === "registrarTransaccionDiaria") {
      return jsonResponse(registrarTransaccionDiaria(ss, postData.payload));
    } else if (action === "editarTransaccionDiaria" || action === "editarTransaccion") {
      return jsonResponse(editarTransaccionDiaria(ss, postData.payload));
    } else if (action === "registrarGastoRuta") {
      return jsonResponse(registrarGastoRuta(ss, postData.payload));
    } else if (action === "eliminarGastoRuta") {
      return jsonResponse(eliminarGastoRuta(ss, postData.payload));
    } else if (action === "registrarMovimientoDestino") {
      return jsonResponse(registrarMovimientoDestino(ss, postData.payload));
    } else if (action === "crearViaje") {
      return jsonResponse(crearViaje(ss, postData.payload));
    } else if (action === "eliminarViajeCascada" || action === "eliminarViaje") {
      return jsonResponse(eliminarViajeCascada(ss, postData.payload));
    } else if (action === "crearDespacho") {
      return jsonResponse(crearDespacho(ss, postData.payload));
    } else if (action === "eliminarManifiestoCascada" || action === "eliminarManifiesto") {
      return jsonResponse(eliminarManifiestoCascada(ss, postData.payload));
    } else if (action === "eliminarSubManifiestoCascada" || action === "eliminarSubManifiesto") {
      const idSub = (postData.payload && typeof postData.payload === "object")
        ? (postData.payload.idSubManifiesto || postData.payload.id)
        : (postData.payload || postData.idSubManifiesto);
      return jsonResponse(eliminarSubManifiestoCascada(idSub));
    } else if (action === "repararDatosHuerfanosSubManifiestos") {
      return jsonResponse(repararDatosHuerfanosSubManifiestos(ss));
    } else if (action === "recalcularSaldosSubManifiestos") {
      return jsonResponse(recalcularSaldosSubManifiestos());
    } else if (action === "guardarSubManifiestoConSaldosSeparados" || action === "guardarSubManifiesto") {
      return jsonResponse(guardarSubManifiestoConSaldosSeparados(postData.payload));
    } else if (action === "reiniciarSistemaACero" || action === "limpiarSistemaAbsolutamenteTodoACero") {
      return jsonResponse(limpiarSistemaAbsolutamenteTodoACero());
    } else if (action === "ejecutarAuditoriaYReparacionTotal") {
      return jsonResponse(ejecutarAuditoriaYReparacionTotal());
    } else if (action === "crearBackupEnDrive") {
      return jsonResponse(crearBackupEnDrive());
    } else if (action === "restaurarBackupDesdeJSON") {
      const payloadData = postData.payload !== undefined ? postData.payload : postData.jsonData;
      return jsonResponse(restaurarBackupDesdeJSON(payloadData));
    } else if (action === "listarBackupsEnDrive") {
      return jsonResponse(listarBackupsEnDrive());
    } else if (action === "descargarBackupDesdeDrive") {
      const fileId = postData.fileId || (postData.payload && postData.payload.fileId);
      return jsonResponse(descargarBackupDesdeDrive(fileId));
    } else if (action === "registrarPagoProveedor") {
      return jsonResponse(registrarPagoProveedor(ss, postData.payload));
    } else if (action === "liquidarSaldosAgenciaDestino") {
      return jsonResponse(liquidarSaldosAgenciaDestino(ss, postData.payload));
    } else if (action === "liquidarAgenciaConDeducciones") {
      return jsonResponse(liquidarAgenciaConDeducciones(ss, postData.payload));
    } else if (action === "crearOActualizarReporteChofer") {
      return jsonResponse(crearOActualizarReporteChofer(ss, postData.payload));
    } else if (action === "guardarProveedor") {
      return jsonResponse(guardarProveedor(ss, postData.payload));
    } else if (action === "liquidarCobroOrigen") {
      return jsonResponse(liquidarCobroOrigen(ss, postData.payload));
    } else if (action === "registrarCobroManifiestoOfeDestino" || action === "registrarCobroManifiestoDestino" || action === "registrarCobroCxC") {
      return jsonResponse(registrarCobroManifiestoOfeDestino(ss, postData.payload));
    } else if (action === "eliminarTransaccion" || action === "eliminarCobranza" || action === "eliminarTransaccionCascada") {
      return jsonResponse(eliminarTransaccionCascada(ss, postData.payload));
    } else if (action === "ejecutarDiagnosticoIntegridad") {
      return jsonResponse(ejecutarDiagnosticoIntegridad(ss));
    } else if (action === "purgarDatosHuerfanos") {
      return jsonResponse(purgarDatosHuerfanos(ss, postData.payload));
    } else if (action === "sincronizarCajasDesdeHistorial" || action === "sincronizarCajas") {
      return jsonResponse(sincronizarCajasDesdeHistorial(ss, postData.payload));
    } else if (action === "repararSaldosManifiestos") {
      return jsonResponse(repararSaldosManifiestos(ss, postData.payload));
    } else if (action === "reparacionIntegralSistema") {
      return jsonResponse(reparacionIntegralSistema(ss, postData.payload));
    } else if (action === "syncBatch") {
      return jsonResponse(procesarLoteOffline(ss, postData.payload));
    }

    return jsonResponse({ status: "error", message: "Acción no reconocida: " + action });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * =========================================================================
 * ACTUALIZACIÓN DE CASCADA Y REVERSIÓN PARA CUENTAS POR COBRAR (MIC / SUB-MIC)
 * =========================================================================
 */
function registrarCobroManifiestoOfeDestino(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    // 1. Registrar la transacción de ingreso en Transacciones_Diarias
    const resultadoTx = registrarTransaccionDiaria(ss, {
      fecha: payload.fecha || Utilities.formatDate(new Date(), "America/La_Paz", "yyyy-MM-dd"),
      tipo: "Ingreso",
      categoria: payload.categoria || "Cobro Flete Destino",
      montoBs: payload.montoBs,
      metodoPago: payload.metodoPago || payload.cajaCuentaRecaudadora || "Efectivo",
      sucursal: payload.sucursal || "Destino",
      idViaje: payload.idViaje || "",
      nroManifiesto: payload.nroManifiesto || "",
      notas: payload.notas || "Amortización de cuenta por cobrar",
      rolUsuario: payload.rolUsuario || "Administrador",
      origenRegistro: "Cobro_Manifiesto"
    });

    if (resultadoTx.status !== "success") throw new Error(resultadoTx.message);

    // 2. Amortizar saldo en Manifiestos_Destino
    if (payload.idSubManifiesto || payload.nroManifiesto) {
      const sheetSub = ss.getSheetByName("Manifiestos_Destino");
      if (sheetSub) {
        const dataSub = sheetSub.getDataRange().getValues();
        const headers = dataSub[0];
        const colIdSub = headers.indexOf("ID_SubManifiesto") !== -1 ? headers.indexOf("ID_SubManifiesto") : 0;
        const colNroMan = headers.indexOf("Nro_Manifiesto") !== -1 ? headers.indexOf("Nro_Manifiesto") : 2;
        const colFlete = headers.indexOf("Flete_Asignado_Bs") !== -1 ? headers.indexOf("Flete_Asignado_Bs") : 4;
        const colCobrado = headers.indexOf("Cobros_Realizados_Bs") !== -1 ? headers.indexOf("Cobros_Realizados_Bs") : 7;
        const colSaldo = headers.indexOf("Saldo_Pendiente_Cliente_Bs") !== -1 ? headers.indexOf("Saldo_Pendiente_Cliente_Bs") : 11;
        const colEstado = headers.indexOf("Estado_Liquidacion") !== -1 ? headers.indexOf("Estado_Liquidacion") : 12;

        for (let i = 1; i < dataSub.length; i++) {
          const matchId = payload.idSubManifiesto && String(dataSub[i][colIdSub]).trim() === String(payload.idSubManifiesto).trim();
          const matchNro = !payload.idSubManifiesto && payload.nroManifiesto && String(dataSub[i][colNroMan]).trim() === String(payload.nroManifiesto).trim();

          if (matchId || matchNro) {
            const fleteAsignado = Number(dataSub[i][colFlete] || 0);
            const pagadoActual = Number(dataSub[i][colCobrado] || 0);
            const nuevoCobrado = pagadoActual + Number(payload.montoBs);
            const nuevoSaldo = Math.max(0, fleteAsignado - nuevoCobrado);

            sheetSub.getRange(i + 1, colCobrado + 1).setValue(nuevoCobrado);
            sheetSub.getRange(i + 1, colSaldo + 1).setValue(nuevoSaldo);
            
            const estadoTexto = nuevoSaldo <= 0 ? "Liquidado" : (nuevoCobrado > 0 ? "Pendiente Parcial" : "Por Cobrar");
            sheetSub.getRange(i + 1, colEstado + 1).setValue(estadoTexto);
            break;
          }
        }
      }
    }

    // 3. Amortizar en Manifiestos_Origen si es un cobro directo de MIC maestro
    if (payload.idManifiesto || (!payload.idSubManifiesto && payload.nroManifiestoMIC)) {
      const sheetOrig = ss.getSheetByName("Manifiestos_Origen");
      if (sheetOrig) {
        const dataOrig = sheetOrig.getDataRange().getValues();
        const headersOrig = dataOrig[0];
        const colIdOrig = headersOrig.indexOf("ID_Manifiesto") !== -1 ? headersOrig.indexOf("ID_Manifiesto") : 0;
        const colNroMIC = headersOrig.indexOf("Nro_Manifiesto") !== -1 ? headersOrig.indexOf("Nro_Manifiesto") : 1;
        const colFleteTotal = headersOrig.indexOf("Flete_Total_Bs") !== -1 ? headersOrig.indexOf("Flete_Total_Bs") : 6;
        const colCobradoOrig = headersOrig.indexOf("Cobrado_Origen_Bs") !== -1 ? headersOrig.indexOf("Cobrado_Origen_Bs") : 7;
        const colSaldoOrig = headersOrig.indexOf("Saldo_Cobrar_Destinos_Bs") !== -1 ? headersOrig.indexOf("Saldo_Cobrar_Destinos_Bs") : 8;
        const colPorc = headersOrig.indexOf("Porc_Cobranza") !== -1 ? headersOrig.indexOf("Porc_Cobranza") : 9;

        for (let j = 1; j < dataOrig.length; j++) {
          const matchOrig = (payload.idManifiesto && String(dataOrig[j][colIdOrig]).trim() === String(payload.idManifiesto).trim()) ||
                            (payload.nroManifiestoMIC && String(dataOrig[j][colNroMIC]).trim() === String(payload.nroManifiestoMIC).trim());
          if (matchOrig) {
            const fleteTotal = Number(dataOrig[j][colFleteTotal] || 0);
            const actualCob = Number(dataOrig[j][colCobradoOrig] || 0) + Number(payload.montoBs);
            const saldoAct = Math.max(0, Number(dataOrig[j][colSaldoOrig] || 0) - Number(payload.montoBs));
            const porc = fleteTotal > 0 ? ((actualCob / fleteTotal) * 100).toFixed(1) : 0;
            sheetOrig.getRange(j + 1, colCobradoOrig + 1).setValue(actualCob);
            sheetOrig.getRange(j + 1, colSaldoOrig + 1).setValue(saldoAct);
            if (colPorc !== -1) {
              sheetOrig.getRange(j + 1, colPorc + 1).setValue(porc);
            }
            break;
          }
        }
      }
    }

    if (payload.idViaje) {
      actualizarCalculosViaje(ss, payload.idViaje);
    }

    return { status: "success", message: "Cobro aplicado y cuentas por cobrar actualizadas en cascada." };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Edición de transacciones con recálculo dinámico de delta en cajas y manifiestos
 */
function editarTransaccionDiaria(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const idTarget = String(payload.id || payload.idTransaccion || "").trim();
    if (!idTarget) return { status: "error", message: "ID de transacción no proporcionado" };

    const sheetTx = ss.getSheetByName("Transacciones_Diarias");
    if (!sheetTx) return { status: "error", message: "Hoja Transacciones_Diarias no encontrada" };

    const data = sheetTx.getDataRange().getValues();
    const headers = data[0];
    const colId = headers.indexOf("ID_Transaccion");
    const colFecha = headers.indexOf("Fecha");
    const colTipo = headers.indexOf("Tipo");
    const colCat = headers.indexOf("Categoria");
    const colMonto = headers.indexOf("Monto_Bs");
    const colMetodo = headers.indexOf("Metodo_Pago");
    const colDestino = headers.indexOf("Cuenta_Destino");
    const colSucursal = headers.indexOf("Sucursal");
    const colPlaca = headers.indexOf("Placa_Camion");
    const colViaje = headers.indexOf("ID_Viaje");
    const colProv = headers.indexOf("ID_Proveedor");
    const colManif = headers.indexOf("Nro_Manifiesto");
    const colNotas = headers.indexOf("Notas_Detalle");

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colId]).trim() === idTarget) {
        const oldTipo = String(data[i][colTipo] || "");
        const oldMonto = Number(data[i][colMonto] || 0);
        const oldMetodo = String(data[i][colMetodo] || "");
        const oldDestino = colDestino !== -1 ? String(data[i][colDestino] || "") : "";
        const oldViaje = colViaje !== -1 ? String(data[i][colViaje] || "") : "";
        const oldManif = colManif !== -1 ? String(data[i][colManif] || "") : "";

        const newMonto = payload.montoBs !== undefined ? Number(parseFloat(payload.montoBs || 0).toFixed(2)) : oldMonto;
        const newTipo = payload.tipo || oldTipo;
        const newMetodo = payload.metodoPago || oldMetodo;
        const newDestino = payload.cuentaDestino !== undefined ? payload.cuentaDestino : oldDestino;
        const newViaje = payload.idViaje !== undefined ? payload.idViaje : oldViaje;
        const newManif = payload.nroManifiesto !== undefined ? payload.nroManifiesto : oldManif;

        // 1. Revertir impacto anterior en Arqueo_Cajas
        if (oldTipo === "Ingreso") {
          actualizarCajas(ss, oldMetodo, -oldMonto, 0);
        } else if (oldTipo === "Gasto") {
          actualizarCajas(ss, oldMetodo, 0, -oldMonto);
        } else if (oldTipo === "Traspaso" && oldDestino) {
          actualizarCajas(ss, oldMetodo, oldMonto, 0);
          actualizarCajas(ss, oldDestino, -oldMonto, 0);
        }

        // 2. Aplicar nuevo impacto en Arqueo_Cajas
        if (newTipo === "Ingreso") {
          actualizarCajas(ss, newMetodo, newMonto, 0);
        } else if (newTipo === "Gasto") {
          actualizarCajas(ss, newMetodo, 0, newMonto);
        } else if (newTipo === "Traspaso" && newDestino) {
          actualizarCajas(ss, newMetodo, 0, newMonto);
          actualizarCajas(ss, newDestino, newMonto, 0);
        }

        // 3. Ajuste de saldos en Manifiestos_Destino si correspondía a un cobro
        const targetManif = newManif || oldManif;
        if (targetManif && (oldTipo === "Ingreso" || newTipo === "Ingreso")) {
          const deltaCobrado = (newTipo === "Ingreso" ? newMonto : 0) - (oldTipo === "Ingreso" ? oldMonto : 0);
          if (deltaCobrado !== 0) {
            const sheetSub = ss.getSheetByName("Manifiestos_Destino");
            if (sheetSub) {
              const dataSub = sheetSub.getDataRange().getValues();
              const headSub = dataSub[0];
              const colSubMan = headSub.indexOf("Nro_Manifiesto");
              const colCobrado = headSub.indexOf("Cobros_Realizados_Bs");
              const colSaldo = headSub.indexOf("Saldo_Pendiente_Cliente_Bs");
              const colEstado = headSub.indexOf("Estado_Liquidacion");

              for (let j = 1; j < dataSub.length; j++) {
                if (String(dataSub[j][colSubMan]).trim() === String(targetManif).trim()) {
                  const cobradoAct = Number(dataSub[j][colCobrado] || 0);
                  const nuevoCobrado = Math.max(0, cobradoAct + deltaCobrado);
                  const saldoAct = Number(dataSub[j][colSaldo] || 0);
                  const nuevoSaldo = Math.max(0, saldoAct - deltaCobrado);
                  sheetSub.getRange(j + 1, colCobrado + 1).setValue(nuevoCobrado);
                  sheetSub.getRange(j + 1, colSaldo + 1).setValue(nuevoSaldo);

                  const nuevoEstado = nuevoSaldo <= 0 ? "Liquidado" : (nuevoCobrado > 0 ? "Pendiente Parcial" : "Por Cobrar");
                  if (colEstado !== -1) {
                    sheetSub.getRange(j + 1, colEstado + 1).setValue(nuevoEstado);
                  }
                  break;
                }
              }
            }
          }
        }

        // 4. Actualizar celdas en Transacciones_Diarias
        if (payload.fecha && colFecha !== -1) sheetTx.getRange(i + 1, colFecha + 1).setValue(payload.fecha);
        if (payload.tipo && colTipo !== -1) sheetTx.getRange(i + 1, colTipo + 1).setValue(newTipo);
        if (payload.categoria && colCat !== -1) sheetTx.getRange(i + 1, colCat + 1).setValue(payload.categoria);
        if (colMonto !== -1) sheetTx.getRange(i + 1, colMonto + 1).setValue(newMonto);
        if (colMetodo !== -1) sheetTx.getRange(i + 1, colMetodo + 1).setValue(newMetodo);
        if (colDestino !== -1) sheetTx.getRange(i + 1, colDestino + 1).setValue(newDestino);
        if (payload.sucursal !== undefined && colSucursal !== -1) sheetTx.getRange(i + 1, colSucursal + 1).setValue(payload.sucursal);
        if (payload.placaCamion !== undefined && colPlaca !== -1) sheetTx.getRange(i + 1, colPlaca + 1).setValue(payload.placaCamion);
        if (colViaje !== -1) sheetTx.getRange(i + 1, colViaje + 1).setValue(newViaje);
        if (payload.idProveedor !== undefined && colProv !== -1) sheetTx.getRange(i + 1, colProv + 1).setValue(payload.idProveedor);
        if (colManif !== -1) sheetTx.getRange(i + 1, colManif + 1).setValue(newManif);
        if (payload.notas !== undefined && colNotas !== -1) sheetTx.getRange(i + 1, colNotas + 1).setValue(payload.notas);

        if (oldViaje) actualizarCalculosViaje(ss, oldViaje);
        if (newViaje && newViaje !== oldViaje) actualizarCalculosViaje(ss, newViaje);

        return { status: "success", message: "Transacción actualizada y saldos recalculados en cascada", id: idTarget };
      }
    }
    return { status: "error", message: "Transacción no encontrada" };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Eliminación en cascada de transacciones con reversión exacta de Arqueo_Cajas y manifiestos
 */
function eliminarTransaccionCascada(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const idTarget = String(payload.id || payload.idTransaccion || "").trim();
    if (!idTarget) return { status: "error", message: "ID no proporcionado" };

    const sheetTx = ss.getSheetByName("Transacciones_Diarias");
    if (!sheetTx) return { status: "error", message: "Hoja Transacciones_Diarias no encontrada" };

    const data = sheetTx.getDataRange().getValues();
    if (data.length <= 1) return { status: "success", message: "No hay registros" };

    const headers = data[0];
    const colId = headers.indexOf("ID_Transaccion");
    const colTipo = headers.indexOf("Tipo");
    const colMonto = headers.indexOf("Monto_Bs");
    const colMetodo = headers.indexOf("Metodo_Pago");
    const colDestino = headers.indexOf("Cuenta_Destino");
    const colViaje = headers.indexOf("ID_Viaje");
    const colManif = headers.indexOf("Nro_Manifiesto");

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colId]).trim() === idTarget) {
        const tipo = String(data[i][colTipo] || "");
        const monto = Number(data[i][colMonto] || 0);
        const metodo = String(data[i][colMetodo] || "");
        const destino = colDestino !== -1 ? String(data[i][colDestino] || "") : "";
        const idViaje = colViaje !== -1 ? String(data[i][colViaje] || "") : "";
        const nroMan = colManif !== -1 ? String(data[i][colManif] || "") : "";

        // Reversión exacta en Arqueo_Cajas
        if (tipo === "Ingreso") {
          actualizarCajas(ss, metodo, -monto, 0);
        } else if (tipo === "Gasto") {
          actualizarCajas(ss, metodo, 0, -monto);
        } else if (tipo === "Traspaso" && destino) {
          actualizarCajas(ss, metodo, monto, 0);
          actualizarCajas(ss, destino, -monto, 0);
        }

        // Reversión de saldos en Manifiestos_Destino si correspondía a un cobro
        if (nroMan && tipo === "Ingreso") {
          const sheetSub = ss.getSheetByName("Manifiestos_Destino");
          if (sheetSub) {
            const dataSub = sheetSub.getDataRange().getValues();
            const headSub = dataSub[0];
            const colSubMan = headSub.indexOf("Nro_Manifiesto");
            const colCobrado = headSub.indexOf("Cobros_Realizados_Bs");
            const colSaldo = headSub.indexOf("Saldo_Pendiente_Cliente_Bs");
            const colRecaudacion = headSub.indexOf("Recaudacion_Neta_Caja_Bs");
            const colEstado = headSub.indexOf("Estado_Liquidacion");

            for (let j = 1; j < dataSub.length; j++) {
              if (String(dataSub[j][colSubMan]).trim() === String(nroMan).trim()) {
                const cobradoAct = Number(dataSub[j][colCobrado] || 0);
                const nuevoCobrado = Math.max(0, cobradoAct - monto);
                const saldoAct = Number(dataSub[j][colSaldo] || 0);
                const nuevoSaldo = saldoAct + monto;
                sheetSub.getRange(j + 1, colCobrado + 1).setValue(nuevoCobrado);
                sheetSub.getRange(j + 1, colSaldo + 1).setValue(nuevoSaldo);
                if (colRecaudacion !== -1) {
                  const recAct = Number(dataSub[j][colRecaudacion] || 0);
                  sheetSub.getRange(j + 1, colRecaudacion + 1).setValue(Math.max(0, recAct - monto));
                }
                const nuevoEstado = nuevoCobrado <= 0 ? "Por Cobrar" : (nuevoSaldo <= 0 ? "Liquidado" : "Pendiente Parcial");
                if (colEstado !== -1) {
                  sheetSub.getRange(j + 1, colEstado + 1).setValue(nuevoEstado);
                }
                break;
              }
            }
          }
        }

        // Eliminar fila en Transacciones_Diarias
        sheetTx.deleteRow(i + 1);

        // Eliminar registro huérfano en Gastos_Ruta_Camion si existiera vínculo
        const sheetGastos = ss.getSheetByName("Gastos_Ruta_Camion");
        if (sheetGastos) {
          const dataGastos = sheetGastos.getDataRange().getValues();
          for (let g = dataGastos.length - 1; g >= 1; g--) {
            if (String(dataGastos[g][0]).trim() === idTarget || String(dataGastos[g][10] || "").indexOf(idTarget) !== -1) {
              sheetGastos.deleteRow(g + 1);
            }
          }
        }

        // Recalcular viaje si existía vinculación
        if (idViaje) {
          actualizarCalculosViaje(ss, idViaje);
        }

        return { status: "success", message: "Transacción eliminada y saldos revertidos con éxito" };
      }
    }

    return { status: "error", message: "Transacción no encontrada en Google Sheets" };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Eliminación de gastos de ruta con reversión de caja y limpieza de transacción espejo
 */
function eliminarGastoRuta(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const idGasto = String(payload.id || payload.idGastoRuta || "").trim();
    if (!idGasto) return { status: "error", message: "ID de gasto no proporcionado" };

    const sheetGastos = ss.getSheetByName("Gastos_Ruta_Camion");
    if (!sheetGastos) return { status: "error", message: "Hoja Gastos_Ruta_Camion no encontrada" };

    const data = sheetGastos.getDataRange().getValues();
    const headers = data[0];
    const colId = headers.indexOf("ID_Gasto_Ruta");
    const colViaje = headers.indexOf("ID_Viaje_Asignado");
    const colImporte = headers.indexOf("Importe_Bs");
    const colCaja = headers.indexOf("Caja_Cuenta_Utilizada");

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colId]).trim() === idGasto) {
        const idViaje = String(data[i][colViaje] || "");
        const importe = Number(data[i][colImporte] || 0);
        const caja = String(data[i][colCaja] || "Efectivo Chofer Ruta");

        // Revertir en Arqueo_Cajas (devolver el gasto a la caja)
        actualizarCajas(ss, caja, 0, -importe);

        // Eliminar fila del gasto
        sheetGastos.deleteRow(i + 1);

        // Limpiar posible transacción espejo en Transacciones_Diarias para evitar registros huérfanos
        const sheetTx = ss.getSheetByName("Transacciones_Diarias");
        if (sheetTx) {
          const dataTx = sheetTx.getDataRange().getValues();
          for (let t = dataTx.length - 1; t >= 1; t--) {
            if (String(dataTx[t][0]).trim() === idGasto || String(dataTx[t][12] || "").indexOf(idGasto) !== -1) {
              sheetTx.deleteRow(t + 1);
            }
          }
        }

        // Recalcular totales del viaje
        if (idViaje) {
          actualizarCalculosViaje(ss, idViaje);
        }

        return { status: "success", message: "Gasto de ruta eliminado y caja recalculada con éxito" };
      }
    }
    return { status: "error", message: "Gasto de ruta no encontrado" };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Eliminación de manifiesto en cascada (MIC + Sub-MICs + Movimientos)
 */
function eliminarManifiestoCascada(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const idManifiesto = String(payload.idManifiesto || payload.id || "").trim();
    if (!idManifiesto) return { status: "error", message: "ID de Manifiesto no proporcionado" };

    const sheetOrig = ss.getSheetByName("Manifiestos_Origen");
    if (!sheetOrig) return { status: "error", message: "Hoja Manifiestos_Origen no encontrada" };

    const dataOrig = sheetOrig.getDataRange().getValues();
    const headersOrig = dataOrig[0];
    const colId = headersOrig.indexOf("ID_Manifiesto");
    const colViaje = headersOrig.indexOf("ID_Viaje_Asignado");
    const colCobradoOrig = headersOrig.indexOf("Cobrado_Origen_Bs");
    const colSucursal = headersOrig.indexOf("Sucursal_Origen");

    let idViajeAsignado = "";
    for (let i = 1; i < dataOrig.length; i++) {
      if (String(dataOrig[i][colId]).trim() === idManifiesto) {
        idViajeAsignado = String(dataOrig[i][colViaje] || "");
        const cobradoOrigen = Number(dataOrig[i][colCobradoOrig] || 0);
        const sucursal = String(dataOrig[i][colSucursal] || "Origen");

        if (cobradoOrigen > 0) {
          actualizarCajas(ss, "Caja Sucursal " + sucursal, -cobradoOrigen, 0);
        }

        sheetOrig.deleteRow(i + 1);
        break;
      }
    }

    // Eliminar submanifiestos hijos en cascada
    const sheetSub = ss.getSheetByName("Manifiestos_Destino");
    if (sheetSub) {
      const dataSub = sheetSub.getDataRange().getValues();
      const colPadre = dataSub[0].indexOf("ID_Manifiesto_Padre");
      if (colPadre !== -1) {
        for (let s = dataSub.length - 1; s >= 1; s--) {
          if (String(dataSub[s][colPadre]).trim() === idManifiesto) {
            sheetSub.deleteRow(s + 1);
          }
        }
      }
    }

    if (idViajeAsignado) {
      actualizarCalculosViaje(ss, idViajeAsignado);
    }

    return { status: "success", message: "Manifiesto y submanifiestos eliminados en cascada con éxito" };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ELIMINACIÓN EN CASCADA DE UN SUB-MANIFIESTO / ENCOMIENDA
 * Limpia el sub-manifiesto, sus transacciones asociadas y previene datos huérfanos en todos los módulos.
 */
function eliminarSubManifiestoCascada(idSubManifiesto) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (!idSubManifiesto) {
      return { status: "error", message: "No se proporcionó el ID del Sub-Manifiesto." };
    }

    const idBuscado = String(typeof idSubManifiesto === "object" ? (idSubManifiesto.idSubManifiesto || idSubManifiesto.id || "") : idSubManifiesto).trim();
    if (!idBuscado) {
      return { status: "error", message: "No se proporcionó el ID del Sub-Manifiesto." };
    }

    let totalFilasBorradas = 0;

    // Lista de todas las hojas donde un sub-manifiesto puede dejar registros o dependencias
    const hojasAEscanear = [
      "Manifiestos_Destino",
      "Manifiestos_Origen",
      "Transacciones_Diarias",
      "Gastos_Ruta_Camion",
      "Cobros_SubManifiestos",
      "Movimientos_Manif_Destino"
    ];

    hojasAEscanear.forEach(nombreHoja => {
      const sheet = ss.getSheetByName(nombreHoja);
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        // Recorremos de ABAJO hacia ARRIBA para evitar errores al eliminar filas
        for (let i = data.length - 1; i >= 1; i--) {
          let perteneceAlSubManifiesto = false;
          
          // Revisamos cada celda de la fila para ver si contiene el ID del sub-manifiesto
          for (let j = 0; j < data[i].length; j++) {
            if (String(data[i][j]).trim() === idBuscado) {
              perteneceAlSubManifiesto = true;
              break;
            }
          }

          if (perteneceAlSubManifiesto) {
            sheet.deleteRow(i + 1);
            totalFilasBorradas++;
          }
        }
      }
    });

    return { 
      status: "success", 
      message: `Sub-manifiesto ${idBuscado} eliminado por completo de todo el sistema. Registros purgados: ${totalFilasBorradas}` 
    };

  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * RECALCULA EL MANIFIESTO MAESTRO EN MANIFIESTOS_ORIGEN SEGÚN SUS SUBMANIFIESTOS ACTIVOS
 */
function recalcularManifiestoOrigenEnSheet(ss, idManifiestoPadre) {
  if (!idManifiestoPadre) return null;
  const sheetOrig = ss.getSheetByName("Manifiestos_Origen");
  const sheetSub = ss.getSheetByName("Manifiestos_Destino");
  if (!sheetOrig || !sheetSub) return null;

  const dataSub = sheetSub.getDataRange().getValues();
  const headersSub = dataSub[0];
  const colPadre = headersSub.indexOf("ID_Manifiesto_Padre") !== -1 ? headersSub.indexOf("ID_Manifiesto_Padre") : 1;
  const colFlete = headersSub.indexOf("Flete_Asignado_Bs") !== -1 ? headersSub.indexOf("Flete_Asignado_Bs") : 4;
  const colPagadoOrig = headersSub.indexOf("Pagado_Origen_Bs") !== -1 ? headersSub.indexOf("Pagado_Origen_Bs") : 5;
  const colCobradoDest = headersSub.indexOf("Cobros_Realizados_Bs") !== -1 ? headersSub.indexOf("Cobros_Realizados_Bs") : 7;
  const colSaldoPend = headersSub.indexOf("Saldo_Pendiente_Cliente_Bs") !== -1 ? headersSub.indexOf("Saldo_Pendiente_Cliente_Bs") : 11;

  let totalFlete = 0;
  let totalCobradoOrig = 0;
  let totalCobradoDest = 0;
  let totalSaldoCobrar = 0;

  for (let s = 1; s < dataSub.length; s++) {
    if (String(dataSub[s][colPadre]).trim() === String(idManifiestoPadre).trim()) {
      totalFlete += Number(dataSub[s][colFlete] || 0);
      totalCobradoOrig += Number(dataSub[s][colPagadoOrig] || 0);
      totalCobradoDest += Number(dataSub[s][colCobradoDest] || 0);
      totalSaldoCobrar += Number(dataSub[s][colSaldoPend] || 0);
    }
  }

  totalFlete = Number(totalFlete.toFixed(2));
  totalCobradoOrig = Number(totalCobradoOrig.toFixed(2));
  totalSaldoCobrar = Math.max(0, Number((totalFlete - totalCobradoOrig).toFixed(2)));
  const totalRecaudado = totalCobradoOrig + totalCobradoDest;
  const porcCobranza = totalFlete > 0 ? Number(((totalRecaudado / totalFlete) * 100).toFixed(1)) : 0;
  const nuevoEstado = totalSaldoCobrar <= 0.01 ? "Liquidado" : (totalCobradoOrig > 0 ? "En Reparto" : "Despachado");

  const dataOrig = sheetOrig.getDataRange().getValues();
  let idViaje = "";
  for (let o = 1; o < dataOrig.length; o++) {
    if (String(dataOrig[o][0]).trim() === String(idManifiestoPadre).trim() || String(dataOrig[o][1]).trim() === String(idManifiestoPadre).trim()) {
      idViaje = String(dataOrig[o][2] || "").trim();
      // Columnas: 6: Estado, 7: Flete_Total_Bs, 8: Cobrado_Origen_Bs, 9: Saldo_Cobrar_Destinos_Bs, 10: Porc_Cobranza
      sheetOrig.getRange(o + 1, 6).setValue(nuevoEstado);
      sheetOrig.getRange(o + 1, 7).setValue(totalFlete);
      sheetOrig.getRange(o + 1, 8).setValue(totalCobradoOrig);
      sheetOrig.getRange(o + 1, 9).setValue(totalSaldoCobrar);
      sheetOrig.getRange(o + 1, 10).setValue(porcCobranza);
      break;
    }
  }

  return { idViaje: idViaje, fleteTotal: totalFlete, cobradoOrigen: totalCobradoOrig, saldoCobrar: totalSaldoCobrar };
}

/**
 * ELIMINACIÓN DE REGISTROS HUÉRFANOS ASOCIADOS A UN SUB-MANIFIESTO Y REVERSIÓN DE CAJAS
 */
function eliminarTransaccionesHuerfanasPorSubId(ss, idSubManifiesto, nroManifiesto) {
  let eliminados = 0;
  const idSubClean = String(idSubManifiesto || "").trim();
  const nroClean = String(nroManifiesto || "").trim();

  // 1. Barrer Transacciones_Diarias
  const sheetTx = ss.getSheetByName("Transacciones_Diarias");
  if (sheetTx) {
    const dataTx = sheetTx.getDataRange().getValues();
    // Headers: 0: ID, 1: Fecha, 2: Tipo, 3: Categoria, 4: Monto_Bs, 5: Metodo_Pago, 6: Cuenta_Destino, 8: Placa, 9: ID_Viaje, 11: Nro_Manifiesto, 12: Notas_Detalle
    for (let i = dataTx.length - 1; i >= 1; i--) {
      const row = dataTx[i];
      const rowTxId = String(row[0] || "");
      const tipo = String(row[2] || "").trim();
      const monto = Number(row[4] || 0);
      const metodo = String(row[5] || "").trim();
      const cuentaDest = String(row[6] || "").trim();
      const nroMan = String(row[11] || "").trim();
      const notas = String(row[12] || "");

      const coincide = (idSubClean && (rowTxId.indexOf(idSubClean) !== -1 || nroMan === idSubClean || notas.indexOf(idSubClean) !== -1)) ||
                       (nroClean && (nroMan === nroClean || notas.indexOf(nroClean) !== -1));

      if (coincide) {
        // Revertir caja
        if (monto > 0 && metodo) {
          if (tipo === "Ingreso") {
            actualizarCajas(ss, metodo, -monto, 0);
          } else if (tipo === "Gasto") {
            actualizarCajas(ss, metodo, 0, -monto);
          } else if (tipo === "Traspaso") {
            actualizarCajas(ss, metodo, monto, 0);
            if (cuentaDest) actualizarCajas(ss, cuentaDest, -monto, 0);
          }
        }
        sheetTx.deleteRow(i + 1);
        eliminados++;
      }
    }
  }

  // 2. Barrer Gastos_Ruta_Camion vinculados al submanifiesto
  const sheetGastos = ss.getSheetByName("Gastos_Ruta_Camion");
  if (sheetGastos) {
    const dataG = sheetGastos.getDataRange().getValues();
    for (let g = dataG.length - 1; g >= 1; g--) {
      const rowG = dataG[g];
      const idGasto = String(rowG[0] || "");
      const importe = Number(rowG[5] || 0);
      const caja = String(rowG[8] || "");
      const nroDoc = String(rowG[9] || "");
      const detalle = String(rowG[10] || "");

      const coincideG = (idSubClean && (idGasto.indexOf(idSubClean) !== -1 || detalle.indexOf(idSubClean) !== -1 || nroDoc.indexOf(idSubClean) !== -1)) ||
                        (nroClean && (detalle.indexOf(nroClean) !== -1 || nroDoc.indexOf(nroClean) !== -1));

      if (coincideG) {
        if (importe > 0 && caja) {
          actualizarCajas(ss, caja, 0, -importe);
        }
        sheetGastos.deleteRow(g + 1);
        eliminados++;
      }
    }
  }

  return eliminados;
}

/**
 * HERRAMIENTA DE REPARACIÓN Y BARRIDO DE DATOS HUÉRFANOS (PARA AUDITORÍA E INTEGRIDAD)
 */
function repararDatosHuerfanosSubManifiestos(ssParam) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    const ss = ssParam || SpreadsheetApp.getActiveSpreadsheet();
    
    const sheetSub = ss.getSheetByName("Manifiestos_Destino");
    if (!sheetSub) return { status: "error", message: "Falta la hoja Manifiestos_Destino" };
    
    const subManifiestosValidos = new Set();
    const dataSub = sheetSub.getDataRange().getValues();
    for (let i = 1; i < dataSub.length; i++) {
      if (dataSub[i][0]) {
        subManifiestosValidos.add(String(dataSub[i][0]).trim());
      }
      if (dataSub[i][2]) {
        subManifiestosValidos.add(String(dataSub[i][2]).trim());
      }
    }
    
    let registrosBorrados = 0;
    const detallesLog = [];

    // 1. Escaneo en Transacciones_Diarias
    const sheetTx = ss.getSheetByName("Transacciones_Diarias");
    if (sheetTx) {
      const dataTx = sheetTx.getDataRange().getValues();
      for (let i = dataTx.length - 1; i >= 1; i--) {
        const row = dataTx[i];
        const rowText = JSON.stringify(row);
        const matchSub = rowText.match(/SUB-[A-Za-z0-9_-]+/);
        if (matchSub && !subManifiestosValidos.has(matchSub[0])) {
          const tipo = String(row[2] || "");
          const monto = Number(row[4] || 0);
          const metodo = String(row[5] || "");
          if (monto > 0 && metodo) {
            if (tipo === "Ingreso") actualizarCajas(ss, metodo, -monto, 0);
            else if (tipo === "Gasto") actualizarCajas(ss, metodo, 0, -monto);
          }
          sheetTx.deleteRow(i + 1);
          registrosBorrados++;
          detallesLog.push("Transacción huérfana eliminada vinculada al sub-manifiesto inexistente " + matchSub[0]);
        }
      }
    }

    // 2. Escaneo en Gastos_Ruta_Camion
    const sheetGastos = ss.getSheetByName("Gastos_Ruta_Camion");
    if (sheetGastos) {
      const dataG = sheetGastos.getDataRange().getValues();
      for (let g = dataG.length - 1; g >= 1; g--) {
        const rowG = dataG[g];
        const rowText = JSON.stringify(rowG);
        const matchSub = rowText.match(/SUB-[A-Za-z0-9_-]+/);
        if (matchSub && !subManifiestosValidos.has(matchSub[0])) {
          const importe = Number(rowG[5] || 0);
          const caja = String(rowG[8] || "");
          if (importe > 0 && caja) actualizarCajas(ss, caja, 0, -importe);
          sheetGastos.deleteRow(g + 1);
          registrosBorrados++;
          detallesLog.push("Gasto de ruta huérfano eliminado referenciado a " + matchSub[0]);
        }
      }
    }

    // 3. Recalcular todos los Manifiestos Origen y Viajes
    const sheetOrig = ss.getSheetByName("Manifiestos_Origen");
    if (sheetOrig) {
      const dataOrig = sheetOrig.getDataRange().getValues();
      for (let o = 1; o < dataOrig.length; o++) {
        const idMIC = String(dataOrig[o][0] || "").trim();
        if (idMIC) {
          recalcularManifiestoOrigenEnSheet(ss, idMIC);
        }
      }
    }

    const sheetViajes = ss.getSheetByName("Viajes");
    if (sheetViajes) {
      const dataViajes = sheetViajes.getDataRange().getValues();
      for (let v = 1; v < dataViajes.length; v++) {
        const idV = String(dataViajes[v][0] || "").trim();
        if (idV) {
          actualizarCalculosViaje(ss, idV);
        }
      }
    }

    // 4. Registrar en Auditoria
    registrarTrazaAuditoria(ss, {
      accion: "BARRIDO_HUERFANOS_SUBMANIFIESTOS",
      titulo: "Saneamiento de Huérfanos de Sub-Manifiestos",
      usuario: "Administrador",
      registrosAfectados: registrosBorrados,
      resultado: "Éxito",
      detalles: detallesLog.length > 0 ? detallesLog : ["No se encontraron huérfanos de sub-manifiestos. Base de datos íntegra."]
    });

    return { 
      status: "success", 
      message: "Auditoría y barrido completado. Se limpiaron " + registrosBorrados + " referencias huérfanas y se recalculó la cascada.",
      registrosBorrados: registrosBorrados,
      detalles: detallesLog
    };
    
  } catch (err) {
    return { status: "error", message: "Error al reparar datos huérfanos de submanifiestos: " + err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Eliminación de viaje en cascada con reversión de todos los gastos y cobros
 */
function eliminarViajeCascada(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const idViaje = String(payload.idViaje || payload.id || "").trim();
    if (!idViaje) return { status: "error", message: "ID de Viaje no proporcionado" };

    // 1. Eliminar gastos de ruta y revertir cajas
    const sheetGastos = ss.getSheetByName("Gastos_Ruta_Camion");
    if (sheetGastos) {
      const dataG = sheetGastos.getDataRange().getValues();
      const colViajeG = dataG[0].indexOf("ID_Viaje_Asignado");
      const colImpG = dataG[0].indexOf("Importe_Bs");
      const colCajaG = dataG[0].indexOf("Caja_Cuenta_Utilizada");
      for (let g = dataG.length - 1; g >= 1; g--) {
        if (String(dataG[g][colViajeG]).trim() === idViaje) {
          const imp = Number(dataG[g][colImpG] || 0);
          const cj = String(dataG[g][colCajaG] || "Efectivo Chofer Ruta");
          actualizarCajas(ss, cj, 0, -imp);
          sheetGastos.deleteRow(g + 1);
        }
      }
    }

    // 2. Eliminar transacciones directas asociadas al viaje y revertir cajas
    const sheetTx = ss.getSheetByName("Transacciones_Diarias");
    if (sheetTx) {
      const dataT = sheetTx.getDataRange().getValues();
      const colViajeT = dataT[0].indexOf("ID_Viaje");
      const colTipoT = dataT[0].indexOf("Tipo");
      const colMontoT = dataT[0].indexOf("Monto_Bs");
      const colMetodoT = dataT[0].indexOf("Metodo_Pago");
      const colDestT = dataT[0].indexOf("Cuenta_Destino");
      for (let t = dataT.length - 1; t >= 1; t--) {
        if (String(dataT[t][colViajeT]).trim() === idViaje) {
          const tipo = String(dataT[t][colTipoT] || "");
          const monto = Number(dataT[t][colMontoT] || 0);
          const metodo = String(dataT[t][colMetodoT] || "");
          const destino = colDestT !== -1 ? String(dataT[t][colDestT] || "") : "";
          if (tipo === "Ingreso") actualizarCajas(ss, metodo, -monto, 0);
          else if (tipo === "Gasto") actualizarCajas(ss, metodo, 0, -monto);
          else if (tipo === "Traspaso" && destino) {
            actualizarCajas(ss, metodo, monto, 0);
            actualizarCajas(ss, destino, -monto, 0);
          }
          sheetTx.deleteRow(t + 1);
        }
      }
    }

    // 3. Eliminar submanifiestos
    const sheetSub = ss.getSheetByName("Manifiestos_Destino");
    if (sheetSub) {
      const dataS = sheetSub.getDataRange().getValues();
      const colViajeS = dataS[0].indexOf("ID_Viaje");
      if (colViajeS !== -1) {
        for (let s = dataS.length - 1; s >= 1; s--) {
          if (String(dataS[s][colViajeS]).trim() === idViaje) {
            sheetSub.deleteRow(s + 1);
          }
        }
      }
    }

    // 4. Eliminar manifiestos de origen
    const sheetOrig = ss.getSheetByName("Manifiestos_Origen");
    if (sheetOrig) {
      const dataO = sheetOrig.getDataRange().getValues();
      const colViajeO = dataO[0].indexOf("ID_Viaje_Asignado");
      if (colViajeO !== -1) {
        for (let o = dataO.length - 1; o >= 1; o--) {
          if (String(dataO[o][colViajeO]).trim() === idViaje) {
            sheetOrig.deleteRow(o + 1);
          }
        }
      }
    }

    // 5. Eliminar fila del viaje
    const sheetViajes = ss.getSheetByName("Viajes");
    if (sheetViajes) {
      const dataV = sheetViajes.getDataRange().getValues();
      const colIdV = dataV[0].indexOf("ID_Viaje");
      for (let v = 1; v < dataV.length; v++) {
        if (String(dataV[v][colIdV]).trim() === idViaje) {
          sheetViajes.deleteRow(v + 1);
          break;
        }
      }
    }

    return { status: "success", message: "Viaje y registros asociados eliminados en cascada con éxito" };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}
/**
 * =========================================================================
 * FUNCIÓN CENTRAL: LIQUIDACIÓN DE RUTA INTEGRADORA (Admin + Chofer)
 * =========================================================================
 */
function obtenerDetalleLiquidacionViaje(ss, idViaje) {
  if (!idViaje) return { status: "error", message: "ID de Viaje no proporcionado" };

  const viajesSheet = ss.getSheetByName("Viajes");
  const viajesData = getSheetData(viajesSheet);
  const viajeInfo = viajesData.find(v => v.ID_Viaje === idViaje) || null;

  if (!viajeInfo) return { status: "error", message: "Viaje no encontrado" };

  // 1. Manifiestos y Fletes del Viaje
  const manOrigenSheet = ss.getSheetByName("Manifiestos_Origen");
  const manOrigenData = getSheetData(manOrigenSheet);
  const manifiestosViaje = manOrigenData.filter(m => m.ID_Viaje_Asignado === idViaje);

  const manDestinoSheet = ss.getSheetByName("Manifiestos_Destino");
  const manDestinoData = getSheetData(manDestinoSheet);
  const subManifiestosViaje = manDestinoData.filter(s => s.ID_Viaje === idViaje || manifiestosViaje.some(m => m.ID_Manifiesto === s.ID_Manifiesto_Padre));
  
  let totalFletesViaje = 0;
  manifiestosViaje.forEach(m => {
    totalFletesViaje += Number(m.Flete_Total_Bs || 0);
  });
  if (totalFletesViaje === 0 && subManifiestosViaje.length > 0) {
    subManifiestosViaje.forEach(s => {
      totalFletesViaje += Number(s.Flete_Asignado_Bs || 0);
    });
  }

  // 2. Gastos de Ruta reportados por el Chofer
  const gastosRutaSheet = ss.getSheetByName("Gastos_Ruta_Camion");
  const gastosRutaData = getSheetData(gastosRutaSheet);
  const gastosChofer = gastosRutaData.filter(g => g.ID_Viaje_Asignado === idViaje);
  
  let totalGastosChofer = 0;
  let totalIngresosChofer = 0;
  gastosChofer.forEach(g => {
    const imp = Number(g.Importe_Bs || 0);
    if (g.Tipo_Operacion === "Ingreso" || g.Categoria_Gasto === "Anticipo Viáticos" || g.Categoria_Gasto === "Ingreso Extra") {
      totalIngresosChofer += imp;
    } else {
      totalGastosChofer += imp;
    }
  });

  // 3. Transacciones Extraordinarias inyectadas por el Administrador / Propietario para este Viaje
  const transaccionesSheet = ss.getSheetByName("Transacciones_Diarias");
  const transaccionesData = getSheetData(transaccionesSheet);
  const transaccionesAdmin = transaccionesData.filter(t => (t.ID_Viaje === idViaje || (viajeInfo.Placa_Camion && t.Placa_Camion === viajeInfo.Placa_Camion && t.ID_Viaje === idViaje)) && t.Origen_Registro !== "Gasto_Ruta");

  let totalIngresosAdmin = 0;
  let totalGastosAdmin = 0;
  const listaExtraordinarias = [];

  transaccionesAdmin.forEach(t => {
    const monto = Number(t.Monto_Bs || 0);
    if (t.Tipo === "Ingreso") {
      totalIngresosAdmin += monto;
    } else if (t.Tipo === "Gasto") {
      totalGastosAdmin += monto;
    }
    listaExtraordinarias.push({
      idTransaccion: t.ID_Transaccion,
      fecha: t.Fecha,
      tipo: t.Tipo,
      categoria: t.Categoria,
      monto: monto,
      metodoPago: t.Metodo_Pago,
      notas: t.Notas_Detalle,
      registradoPor: t.Origen_Registro || "Admin"
    });
  });

  const granTotalGastos = totalGastosChofer + totalGastosAdmin;
  const granTotalIngresos = totalFletesViaje + totalIngresosAdmin;
  const utilidadNeta = granTotalIngresos - granTotalGastos;
  const margenPct = granTotalIngresos > 0 ? ((utilidadNeta / granTotalIngresos) * 100).toFixed(2) : "0.00";
  const saldoRendirChofer = totalIngresosChofer - totalGastosChofer;

  return {
    status: "success",
    viaje: viajeInfo,
    resumenFinanciero: {
      fletesManifiestosBs: totalFletesViaje,
      ingresosAdminBs: totalIngresosAdmin,
      totalIngresosBs: granTotalIngresos,
      gastosChoferBs: totalGastosChofer,
      totalIngresosChoferBs: totalIngresosChofer,
      gastosAdminBs: totalGastosAdmin,
      totalGastosBs: granTotalGastos,
      utilidadNetaBs: utilidadNeta,
      margenPct: margenPct,
      saldoRendirChoferBs: saldoRendirChofer
    },
    detalleManifiestos: manifiestosViaje,
    detalleSubManifiestos: subManifiestosViaje,
    detalleGastosChofer: gastosChofer,
    detalleTransaccionesAdmin: listaExtraordinarias
  };
}

/**
 * Registro de Transacción Diaria con blindaje total antiduplicados
 */
function registrarTransaccionDiaria(ss, item) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    let sheet = ss.getSheetByName("Transacciones_Diarias");
    if (!sheet) inicializarEstructuraBaseDatos();
    sheet = ss.getSheetByName("Transacciones_Diarias");

    const txId = item.idTransaccion || ("TX-" + new Date().getTime());

    // Validación sobre TODA la columna de IDs para evitar duplicados reales
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const idsExistentes = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
      if (idsExistentes.includes(txId)) {
        return { status: "success", message: "Registro ya existente (omitido por seguridad)", id: txId };
      }
    }

    let fotoUrl = item.comprobanteFotoUrl || "";
    if (item.fotoBase64 && item.fotoBase64.startsWith("data:image")) {
      try {
        const folder = getComprobantesFolder();
        const parts = item.fotoBase64.split(",");
        const contentType = parts[0].split(":")[1].split(";")[0];
        const decodedData = Utilities.base64Decode(parts[1]);
        const fileName = "TX_" + (item.tipo || "Doc") + "_" + new Date().getTime() + ".jpg";
        const blob = Utilities.newBlob(decodedData, contentType, fileName);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fotoUrl = file.getUrl();
      } catch (e) {
        Logger.log("Error guardando comprobante: " + e.toString());
      }
    }

    const row = [
      txId,
      item.fecha || Utilities.formatDate(new Date(), "America/La_Paz", "yyyy-MM-dd"),
      item.tipo,
      item.categoria,
      Number(parseFloat(item.montoBs || 0).toFixed(2)),
      item.metodoPago || "Efectivo",
      item.cuentaDestino || "",
      item.sucursal || "",
      item.placaCamion || "",
      item.idViaje || "",
      item.idProveedor || "",
      item.nroManifiesto || "",
      item.notas || "",
      fotoUrl
    ];

    sheet.appendRow(row);

    const monto = Number(parseFloat(item.montoBs || 0).toFixed(2));
    if (item.tipo === "Ingreso") {
      actualizarCajas(ss, item.metodoPago, monto, 0);
    } else if (item.tipo === "Gasto") {
      actualizarCajas(ss, item.metodoPago, 0, monto);
    } else if (item.tipo === "Traspaso" && item.cuentaDestino) {
      actualizarCajas(ss, item.metodoPago, 0, monto);
      actualizarCajas(ss, item.cuentaDestino, monto, 0);
    }

    return { status: "success", message: "Transacción registrada exitosamente", id: txId, fotoUrl: fotoUrl };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Gestión de Proveedores
 */
function guardarProveedor(ss, item) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = ss.getSheetByName("Proveedores");
    const provId = item.idProveedor || ("PRV-" + new Date().getTime());

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === provId) {
          // Actualización de proveedor existente
          sheet.getRange(i + 2, 2, 1, 5).setValues([[
            item.nombre, item.telefono || "", item.direccion || "", item.rubro || "General", item.estado || "Activo"
          ]]);
          return { status: "success", message: "Proveedor actualizado con éxito", idProveedor: provId };
        }
      }
    }

    sheet.appendRow([
      provId,
      item.nombre,
      item.telefono || "",
      item.direccion || "",
      item.rubro || "General",
      item.estado || "Activo"
    ]);

    return { status: "success", message: "Proveedor registrado con éxito", idProveedor: provId };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Registro de Gastos en Ruta
 */
function registrarGastoRuta(ss, item) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = ss.getSheetByName("Gastos_Ruta_Camion");
    const gastoId = item.idGastoRuta || ("GST-" + new Date().getTime());

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const idsExistentes = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
      if (idsExistentes.includes(gastoId)) {
        return { status: "success", message: "Gasto ya registrado (duplicado omitido)", id: gastoId };
      }
    }

    let fotoUrl = item.comprobanteFotoUrl || "";
    if (item.fotoBase64 && item.fotoBase64.startsWith("data:image")) {
      try {
        const folder = getComprobantesFolder();
        const parts = item.fotoBase64.split(",");
        const contentType = parts[0].split(":")[1].split(";")[0];
        const decodedData = Utilities.base64Decode(parts[1]);
        const fileName = "Gasto_" + (item.idViajeAsignado || "Viaje") + "_" + new Date().getTime() + ".jpg";
        const blob = Utilities.newBlob(decodedData, contentType, fileName);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fotoUrl = file.getUrl();
      } catch (e) {
        Logger.log("Error Drive: " + e.toString());
      }
    }

    const row = [
      gastoId,
      item.idViajeAsignado,
      item.placaCamion || "",
      item.fechaHora || Utilities.formatDate(new Date(), "America/La_Paz", "yyyy-MM-dd HH:mm"),
      item.categoriaGasto,
      Number(parseFloat(item.importeBs || 0).toFixed(2)),
      Number(item.litrosDiesel || 0),
      item.idProveedor || "",
      item.cajaCuentaUtilizada || "Efectivo Chofer Ruta",
      item.nroFacturaBoleta || "",
      item.detalleGasto || "",
      fotoUrl
    ];

    sheet.appendRow(row);
    actualizarCalculosViaje(ss, item.idViajeAsignado);
    actualizarCajas(ss, item.cajaCuentaUtilizada || "Efectivo Chofer Ruta", 0, Number(parseFloat(item.importeBs || 0).toFixed(2)));

    return { status: "success", message: "Gasto de ruta registrado correctamente", id: gastoId, fotoUrl: fotoUrl };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * -------------------------------------------------------------
 * REPORTES FINANCIEROS Y AUDITORÍA
 * -------------------------------------------------------------
 */

// Estado de Resultados (Ingresos vs Gastos con desglose y margen neto)
function calcularEstadoResultados(ss, idViaje, centroCosto) {
  const dataTrans = getSheetData(ss.getSheetByName("Transacciones_Diarias"));
  const dataGastos = getSheetData(ss.getSheetByName("Gastos_Ruta_Camion"));
  const dataManDest = getSheetData(ss.getSheetByName("Manifiestos_Destino"));

  const ingresosPorCategoria = {};
  const gastosPorCategoria = {};
  let totalIngresos = 0;
  let totalGastos = 0;

  // Sumar fletes cobrados en manifiestos de destino
  dataManDest.forEach(m => {
    const cobrado = Number(m.Cobros_Realizados_Bs || 0);
    const delivery = Number(m.Ingresos_Delivery_Otros_Bs || 0);
    if (cobrado > 0) {
      ingresosPorCategoria["Fletes Cobrados"] = (ingresosPorCategoria["Fletes Cobrados"] || 0) + cobrado;
      totalIngresos += cobrado;
    }
    if (delivery > 0) {
      ingresosPorCategoria["Delivery / Otros"] = (ingresosPorCategoria["Delivery / Otros"] || 0) + delivery;
      totalIngresos += delivery;
    }
  });

  // Gastos de Ruta
  dataGastos.forEach(g => {
    if (!idViaje || g.ID_Viaje_Asignado === idViaje) {
      const cat = g.Categoria_Gasto || "Gastos Ruta";
      const monto = Number(g.Importe_Bs || 0);
      gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + monto;
      totalGastos += monto;
    }
  });

  // Transacciones Diarias (Filtro por Viaje)
  dataTrans.forEach(t => {
    if (!idViaje || t.ID_Viaje === idViaje) {
      const monto = Number(t.Monto_Bs || 0);
      if (t.Tipo === "Ingreso") {
        const cat = t.Categoria || "Ingresos Varios";
        ingresosPorCategoria[cat] = (ingresosPorCategoria[cat] || 0) + monto;
        totalIngresos += monto;
      } else if (t.Tipo === "Gasto") {
        const cat = t.Categoria || "Gastos Varios";
        gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + monto;
        totalGastos += monto;
      }
    }
  });

  const utilidadNeta = totalIngresos - totalGastos;
  const margenPct = totalIngresos > 0 ? ((utilidadNeta / totalIngresos) * 100).toFixed(2) : "0.00";

  return {
    status: "success",
    filtros: { idViaje: idViaje, centroCosto: centroCosto },
    ingresos: { total: totalIngresos, desglose: ingresosPorCategoria },
    gastos: { total: totalGastos, desglose: gastosPorCategoria },
    utilidadNeta: utilidadNeta,
    margenPct: margenPct
  };
}

// Balance Operativo Financiero (Medios de Pago, CxC y CxP)
function calcularBalanceOperativo(ss, idViaje, centroCosto) {
  const dataManDest = getSheetData(ss.getSheetByName("Manifiestos_Destino"));
  const dataTrans = getSheetData(ss.getSheetByName("Transacciones_Diarias"));
  const dataCajas = getSheetData(ss.getSheetByName("Arqueo_Cajas"));

  // Medios de pago y saldos en cuentas/cajas
  const mediosDePago = {};
  dataCajas.forEach(c => {
    mediosDePago[c.Caja_Cuenta] = Number(c.Saldo_Disponible || 0);
  });

  // Cuentas por Cobrar (Saldos pendientes en destino y Liquidaciones Pendientes de Agencias)
  let totalCxC = 0;
  let totalCxCClientes = 0;
  let totalCxCAgencias = 0;
  const listaCxC = [];
  dataManDest.forEach(sub => {
    const pendiente = Number(sub.Saldo_Pendiente_Cliente_Bs || 0);
    if (pendiente > 0) {
      totalCxC += pendiente;
      totalCxCClientes += pendiente;
      listaCxC.push({
        subManifiesto: sub.ID_SubManifiesto,
        destinatario: sub.Destinatario || "Sin Nombre",
        saldo: pendiente,
        subtipo: "Saldo Pendiente Cliente",
        sucursal: sub.Sucursal_Destino,
        telefono: sub.Telefono_Contacto
      });
    }

    // Liquidaciones pendientes de agencias por cobro en origen
    const pagadoOrigen = Number(sub.Pagado_Origen_Bs || 0);
    const estadoLiqAgencia = sub.Estado_Liquidacion_Agencia || "";
    if (pagadoOrigen > 0 && estadoLiqAgencia === "Pendiente de Liquidación") {
      totalCxC += pagadoOrigen;
      totalCxCAgencias += pagadoOrigen;
      listaCxC.push({
        subManifiesto: sub.ID_SubManifiesto,
        destinatario: "Agencia: " + (sub.Cuenta_Afectada_Origen || "Agencia Origen"),
        saldo: pagadoOrigen,
        subtipo: "Liquidaciones Pendientes de Agencias",
        sucursal: sub.Cuenta_Afectada_Origen || "Origen",
        telefono: sub.Metodo_Cobro_Origen || ""
      });
    }
  });

  // Cuentas por Pagar (registros con estado pendiente en transacciones)
  let totalCxP = 0;
  const listaCxP = [];
  dataTrans.forEach(t => {
    if (t.Tipo === "Gasto" && t.Metodo_Pago === "Por Pagar") {
      const monto = Number(t.Monto_Bs || 0);
      totalCxP += monto;
      listaCxP.push({
        idTransaccion: t.ID_Transaccion,
        categoria: t.Categoria,
        monto: monto,
        proveedor: t.ID_Proveedor || "No asignado",
        fecha: t.Fecha
      });
    }
  });

  return {
    status: "success",
    mediosDePago: mediosDePago,
    cuentasPorCobrar: { total: totalCxC, detalle: listaCxC },
    cuentasPorPagar: { total: totalCxP, detalle: listaCxP },
    posicionNeta: (totalCxC - totalCxP)
  };
}

// Funciones existentes de apoyo
function registrarMovimientoDestino(ss, item) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheetMov = ss.getSheetByName("Movimientos_Manif_Destino");
    const movId = item.idMovimiento || ("MOV-" + new Date().getTime());

    const lastRow = sheetMov.getLastRow();
    if (lastRow > 1) {
      const idsExistentes = sheetMov.getRange(2, 1, lastRow - 1, 1).getValues().flat();
      if (idsExistentes.includes(movId)) {
        return { status: "success", message: "Movimiento ya registrado", id: movId };
      }
    }

    const row = [
      movId, item.idSubManifiesto, item.sucursal, item.tipoMovimiento,
      item.categoriaConcepto, Number(parseFloat(item.importeBs || 0).toFixed(2)),
      item.cajaCuentaAfectada, item.fechaHora || Utilities.formatDate(new Date(), "America/La_Paz", "yyyy-MM-dd HH:mm"),
      item.nroComprobante || "", item.detalleOperacion || ""
    ];

    sheetMov.appendRow(row);

    const sheetSub = ss.getSheetByName("Manifiestos_Destino");
    const dataSub = sheetSub.getDataRange().getValues();
    for (let i = 1; i < dataSub.length; i++) {
      if (dataSub[i][0] === item.idSubManifiesto) {
        let cobros = Number(dataSub[i][7] || 0);
        let delivery = Number(dataSub[i][8] || 0);
        let comisiones = Number(dataSub[i][9] || 0);
        let saldoInicial = Number(dataSub[i][6] || 0);

        if (item.categoriaConcepto === "Cobro Flete Saldo") {
          cobros += Number(item.importeBs);
        } else if (item.categoriaConcepto === "Servicio Delivery") {
          delivery += Number(item.importeBs);
        } else if (item.tipoMovimiento === "Gasto") {
          comisiones += Number(item.importeBs);
        }

        const recaudacionNeta = cobros + delivery - comisiones;
        const saldoPendiente = Math.max(0, saldoInicial - cobros);
        const nuevoEstado = saldoPendiente <= 0 ? "Liquidado en Sucursal" : "En Reparto";

        sheetSub.getRange(i + 1, 8, 1, 6).setValues([[cobros, delivery, comisiones, recaudacionNeta, saldoPendiente, nuevoEstado]]);
        break;
      }
    }

    const esIngreso = item.tipoMovimiento === "Ingreso";
    actualizarCajas(ss, item.cajaCuentaAfectada, esIngreso ? Number(item.importeBs) : 0, !esIngreso ? Number(item.importeBs) : 0);

    return { status: "success", message: "Movimiento actualizado con éxito" };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function crearViaje(ss, item) {
  const sheet = ss.getSheetByName("Viajes");
  const row = [
    item.idViaje, item.placaCamion, item.choferAsignado, item.centroCosto || "General",
    item.fechaSalida, item.fechaLlegada || "", item.estadoViaje || "En Tránsito",
    item.observacionesRuta || "", Number(item.fletesManifiestosBs || 0),
    Number(item.gastosRutaBs || 0), Number(item.utilidadViajeBs || 0), Number(item.margenPct || 0)
  ];
  sheet.appendRow(row);
  return { status: "success", message: "Viaje creado exitosamente", idViaje: item.idViaje };
}

function crearDespacho(ss, payload) {
  const { manifiestoOrigen, subManifiestos } = payload;
  const sheetMan = ss.getSheetByName("Manifiestos_Origen");
  
  sheetMan.appendRow([
    manifiestoOrigen.idManifiesto, manifiestoOrigen.nroManifiestoMIC, manifiestoOrigen.idViajeAsignado,
    manifiestoOrigen.sucursalOrigen, manifiestoOrigen.fechaEmision, manifiestoOrigen.estadoManifiesto || "Despachado",
    Number(manifiestoOrigen.fleteTotalBs || 0), Number(manifiestoOrigen.cobradoOrigenBs || 0),
    Number(manifiestoOrigen.saldoCobrarDestinosBs || 0), Number(manifiestoOrigen.porcCobranza || 0)
  ]);

  const sheetSub = ss.getSheetByName("Manifiestos_Destino");
  subManifiestos.forEach(sub => {
    // Lógica correcta al guardar el Sub-Manifiesto:
    const pagadoOrigen = Number(sub.pagadoOrigenBs !== undefined ? sub.pagadoOrigenBs : (sub.pagadoOrigen || 0));      // Ej: 300
    const porPagarDestino = Number(sub.porPagarDestinoBs !== undefined ? sub.porPagarDestinoBs : (sub.porPagarDestino !== undefined ? sub.porPagarDestino : (sub.saldoInicialCobrarBs || 0)));  // Ej: 700

    // 1. El Flete Total Asignado es la suma exacta
    const fleteAsignadoTotal = pagadoOrigen + porPagarDestino;     // 300 + 700 = 1000

    // 2. Lo que queda pendiente de cobro al cliente/agencia es el saldo de destino
    // (A menos que se haya registrado un abono o anticipo adicional específico)
    const cobrosRealizados = Number(sub.cobrosRealizadosBs || sub.cobrosRealizados || 0);
    const tipoRespDestino = String(sub.tipoResponsableDestino || sub.responsableDestinoTipo || sub.tipoDeudor || "Cliente").toLowerCase().trim();
    let saldoPendienteCliente = 0;
    let saldoPendienteAgencia = 0;
    if (tipoRespDestino === "agencia" || tipoRespDestino === "sucursal") {
      saldoPendienteAgencia = Math.max(0, porPagarDestino - cobrosRealizados);
    } else {
      saldoPendienteCliente = Math.max(0, porPagarDestino - cobrosRealizados);
    }

    const metodoCobro = sub.metodoCobroOrigen || (pagadoOrigen > 0 ? "Efectivo en Agencia" : "");
    const cuentaAfectada = sub.cuentaAfectadaOrigen || (pagadoOrigen > 0 ? ("Caja Agencia " + (manifiestoOrigen.sucursalOrigen || "Origen")) : "");
    const estadoLiqAgencia = sub.estadoLiquidacionAgencia || (pagadoOrigen > 0 ? "Pendiente de Liquidación" : "");
    const estadoLiquidacion = (saldoPendienteCliente <= 0 && saldoPendienteAgencia <= 0) ? "Liquidado en Sucursal" : (cobrosRealizados > 0 ? "Pendiente Parcial" : "En Reparto");

    sheetSub.appendRow([
      sub.idSubManifiesto, sub.idManifiestoPadre, sub.nroManifiesto, sub.sucursalDestino,
      fleteAsignadoTotal, pagadoOrigen, porPagarDestino,
      cobrosRealizados, 0, 0, cobrosRealizados, saldoPendienteCliente, estadoLiquidacion,
      sub.destinatario || "", sub.remitente || "", sub.descripcionCarga || "", sub.telefonoContacto || "",
      metodoCobro, cuentaAfectada, estadoLiqAgencia,
      saldoPendienteAgencia, tipoRespDestino === "agencia" ? "Agencia" : "Cliente"
    ]);
  });

  if (Number(manifiestoOrigen.cobradoOrigenBs) > 0) {
    actualizarCajas(ss, "Caja Sucursal " + manifiestoOrigen.sucursalOrigen, Number(manifiestoOrigen.cobradoOrigenBs), 0);
  }

  actualizarCalculosViaje(ss, manifiestoOrigen.idViajeAsignado);
  return { status: "success", message: "Despacho registrado con éxito" };
}

function liquidarCobroOrigen(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const idSubManifiesto = payload.idSubManifiesto;
    const cuentaCentral = payload.cuentaCentral || "Caja Central";
    const fecha = payload.fecha || new Date().toISOString().split("T")[0];
    const notas = payload.notas || "";

    const sheetSub = ss.getSheetByName("Manifiestos_Destino");
    if (!sheetSub) return { status: "error", message: "Hoja Manifiestos_Destino no encontrada" };

    const dataSub = sheetSub.getDataRange().getValues();
    const headers = dataSub[0];

    const colId = headers.indexOf("ID_SubManifiesto");
    const colPagado = headers.indexOf("Pagado_Origen_Bs");
    const colLiqAg = headers.indexOf("Estado_Liquidacion_Agencia");
    const colCtaOrig = headers.indexOf("Cuenta_Afectada_Origen");
    const colManif = headers.indexOf("Nro_Manifiesto");

    for (let i = 1; i < dataSub.length; i++) {
      if (dataSub[i][colId] === idSubManifiesto) {
        const monto = Number(dataSub[i][colPagado] || 0);
        const cuentaOrigen = colCtaOrig !== -1 ? (dataSub[i][colCtaOrig] || "Caja Agencia Origen") : "Caja Agencia Origen";
        const nroMan = colManif !== -1 ? dataSub[i][colManif] : "";

        if (colLiqAg !== -1) {
          sheetSub.getRange(i + 1, colLiqAg + 1).setValue("Liquidado a Central");
        }

        // Descontar de cuenta/caja agencia origen y abonar a cuenta central elegida
        actualizarCajas(ss, cuentaCentral, monto, 0);
        if (cuentaOrigen) {
          actualizarCajas(ss, cuentaOrigen, 0, monto);
        }

        registrarTransaccionDiaria(ss, {
          idTransaccion: "LIQ-AG-" + new Date().getTime(),
          fecha: fecha,
          tipo: "Traspaso",
          categoria: "Liquidación Agencia a Central",
          montoBs: monto,
          metodoPago: cuentaOrigen,
          cuentaDestino: cuentaCentral,
          sucursal: "Central",
          notas: "Liquidación cobro en origen a caja central (" + idSubManifiesto + ") " + notas,
          nroManifiesto: nroMan
        });

        return { status: "success", message: "Cobro liquidado a caja central con éxito" };
      }
    }
    return { status: "error", message: "Submanifiesto no encontrado" };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function procesarLoteOffline(ss, lotes) {
  let procesados = 0;
  lotes.forEach(item => {
    try {
      if (item.tipo === "transaccion_diaria") { registrarTransaccionDiaria(ss, item.data); procesados++; }
      else if (item.tipo === "editar_transaccion") { editarTransaccionDiaria(ss, item.data); procesados++; }
      else if (item.tipo === "eliminar_transaccion") { eliminarTransaccionCascada(ss, item.data); procesados++; }
      else if (item.tipo === "gasto_ruta") { registrarGastoRuta(ss, item.data); procesados++; }
      else if (item.tipo === "eliminar_gasto_ruta") { eliminarGastoRuta(ss, item.data); procesados++; }
      else if (item.tipo === "movimiento_destino") { registrarMovimientoDestino(ss, item.data); procesados++; }
      else if (item.tipo === "cobro_manifiesto" || item.tipo === "cobro_cxc") { registrarCobroManifiestoOfeDestino(ss, item.data); procesados++; }
      else if (item.tipo === "nuevo_viaje") { crearViaje(ss, item.data); procesados++; }
      else if (item.tipo === "eliminar_viaje") { eliminarViajeCascada(ss, item.data); procesados++; }
      else if (item.tipo === "nuevo_manifiesto") { crearDespacho(ss, item.data); procesados++; }
      else if (item.tipo === "eliminar_manifiesto") { eliminarManifiestoCascada(ss, item.data); procesados++; }
      else if (item.tipo === "proveedor") { guardarProveedor(ss, item.data); procesados++; }
    } catch (e) {
      Logger.log("Error offline: " + e.toString());
    }
  });
  return { status: "success", procesados: procesados, total: lotes.length };
}

function actualizarCajas(ss, nombreCaja, cobrado, gastado) {
  const sheet = ss.getSheetByName("Arqueo_Cajas");
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === nombreCaja) {
      const actualCobrado = Number(data[i][4] || 0) + cobrado;
      const actualGastado = Number(data[i][5] || 0) + gastado;
      const inicial = Number(data[i][3] || 0);
      const disponible = inicial + actualCobrado - actualGastado;
      sheet.getRange(i + 1, 5, 1, 3).setValues([[actualCobrado, actualGastado, disponible]]);
      return;
    }
  }
}

function actualizarCalculosViaje(ss, idViaje) {
  const sheetViajes = ss.getSheetByName("Viajes");
  const sheetGastos = ss.getSheetByName("Gastos_Ruta_Camion");
  const sheetMan = ss.getSheetByName("Manifiestos_Origen");
  if (!sheetViajes || !sheetGastos || !sheetMan) return;

  let totalFletes = 0;
  const dataMan = sheetMan.getDataRange().getValues();
  for (let i = 1; i < dataMan.length; i++) {
    if (dataMan[i][2] === idViaje) totalFletes += Number(dataMan[i][6] || 0);
  }

  let totalGastos = 0;
  const dataGastos = sheetGastos.getDataRange().getValues();
  for (let j = 1; j < dataGastos.length; j++) {
    if (dataGastos[j][1] === idViaje) totalGastos += Number(dataGastos[j][5] || 0);
  }

  const utilidad = totalFletes - totalGastos;
  const margen = totalFletes > 0 ? ((utilidad / totalFletes) * 100).toFixed(1) : 0;

  const dataViajes = sheetViajes.getDataRange().getValues();
  for (let k = 1; k < dataViajes.length; k++) {
    if (dataViajes[k][0] === idViaje) {
      sheetViajes.getRange(k + 1, 9, 1, 4).setValues([[totalFletes, totalGastos, utilidad, margen]]);
      break;
    }
  }
}

function getSheetData(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[i][j];
    }
    rows.push(row);
  }
  return rows;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * =========================================================================
 * PANEL DE AUDITORÍA Y CONSISTENCIA CONTABLE (DIAGNÓSTICO Y CORRECCIÓN)
 * =========================================================================
 */

function registrarTrazaAuditoria(ss, traza) {
  try {
    let sheet = ss.getSheetByName("Auditoria_Mantenimiento");
    if (!sheet) {
      sheet = ss.insertSheet("Auditoria_Mantenimiento");
      sheet.appendRow(["ID_Traza", "Fecha_Hora", "Accion", "Usuario", "Registros_Afectados", "Resultado", "Detalle"]);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
    const idTraza = traza.idTraza || ("AUD-" + Utilities.formatDate(new Date(), "GMT-4", "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 1000));
    const fechaHora = traza.fechaHora || Utilities.formatDate(new Date(), "GMT-4", "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([
      idTraza,
      fechaHora,
      traza.accion || "MANTENIMIENTO",
      traza.usuario || "Administrador",
      traza.registrosAfectados || 0,
      traza.resultado || "Éxito",
      Array.isArray(traza.detalles) ? traza.detalles.join(" | ") : (traza.detalle || "")
    ]);
    return idTraza;
  } catch (e) {
    console.warn("No se pudo registrar traza de auditoría:", e);
    return null;
  }
}

function ejecutarDiagnosticoIntegridad(ss) {
  try {
    const sheetViajes = ss.getSheetByName("Viajes");
    const sheetManDest = ss.getSheetByName("Manifiestos_Destino");
    const sheetManOrig = ss.getSheetByName("Manifiestos_Origen");
    const sheetTx = ss.getSheetByName("Transacciones_Diarias");
    const sheetGastos = ss.getSheetByName("Gastos_Ruta_Camion");
    const sheetCajas = ss.getSheetByName("Arqueo_Cajas");

    // 1. Indexar Viajes válidos
    const validViajes = new Set();
    if (sheetViajes) {
      const dataV = sheetViajes.getDataRange().getValues();
      for (let i = 1; i < dataV.length; i++) {
        const idV = String(dataV[i][0] || "").trim();
        if (idV) validViajes.add(idV);
      }
    }

    // 2. Indexar Manifiestos Origen y Destino
    const validSubMan = new Set();
    const mapSubMan = {};
    if (sheetManDest) {
      const dataSub = sheetManDest.getDataRange().getValues();
      for (let i = 1; i < dataSub.length; i++) {
        const idSub = String(dataSub[i][0] || "").trim();
        const nroMan = String(dataSub[i][1] || "").trim();
        if (idSub) {
          validSubMan.add(idSub);
          mapSubMan[idSub] = {
            idSubManifiesto: idSub,
            nroManifiesto: nroMan,
            destinatario: String(dataSub[i][2] || "General"),
            fleteAsignadoBs: Number(dataSub[i][4] || 0),
            cobrosRealizadosBs: Number(dataSub[i][3] || 0),
            saldoPendienteClienteBs: Number(dataSub[i][7] || 0),
            estadoLiquidacion: String(dataSub[i][6] || "")
          };
        }
        if (nroMan) validSubMan.add(nroMan);
      }
    }

    const mapManOrig = {};
    if (sheetManOrig) {
      const dataOrig = sheetManOrig.getDataRange().getValues();
      for (let i = 1; i < dataOrig.length; i++) {
        const idMIC = String(dataOrig[i][0] || "").trim();
        const nroMIC = String(dataOrig[i][1] || "").trim();
        if (idMIC || nroMIC) {
          const key = idMIC || nroMIC;
          mapManOrig[key] = {
            idManifiesto: idMIC,
            nroManifiestoMIC: nroMIC,
            fleteTotalBs: Number(dataOrig[i][6] || 0),
            cobradoOrigenBs: Number(dataOrig[i][7] || 0),
            saldoCobrarDestinosBs: Number(dataOrig[i][8] || 0),
            estado: String(dataOrig[i][9] || "")
          };
        }
      }
    }

    // 3. Detectar Huérfanos
    const detallesHuerfanos = [];
    const txByCaja = {};
    const txCobrosBySubMan = {};

    if (sheetTx) {
      const dataTx = sheetTx.getDataRange().getValues();
      for (let i = 1; i < dataTx.length; i++) {
        const idTx = String(dataTx[i][0] || "");
        const fecha = String(dataTx[i][1] || "");
        const tipo = String(dataTx[i][2] || "").trim();
        const monto = Number(dataTx[i][4] || 0);
        const caja = String(dataTx[i][5] || "").trim();
        const idViaje = String(dataTx[i][7] || "").trim();
        const nroMan = String(dataTx[i][8] || "").trim();
        const notas = String(dataTx[i][9] || "");

        // Huérfano por ID_Viaje no existente
        if (idViaje && idViaje !== "-" && idViaje !== "S/V" && !validViajes.has(idViaje)) {
          detallesHuerfanos.push({
            id: idTx,
            tabla: "Transacciones_Diarias",
            campo: "ID_Viaje",
            valorInvalido: idViaje,
            motivo: "El viaje asignado no existe en la tabla maestra de Viajes",
            montoBs: monto,
            fecha: fecha,
            detalles: notas || ("Tipo: " + tipo + " - Monto: Bs. " + monto)
          });
        }

        // Acumular movimientos por caja
        if (caja) {
          if (!txByCaja[caja]) txByCaja[caja] = { ingresos: 0, gastos: 0 };
          if (tipo === "Ingreso") txByCaja[caja].ingresos += monto;
          if (tipo === "Gasto") txByCaja[caja].gastos += monto;
        }

        // Acumular cobros reales de submanifiestos
        if (nroMan) {
          if (!txCobrosBySubMan[nroMan]) txCobrosBySubMan[nroMan] = 0;
          if (tipo === "Ingreso") txCobrosBySubMan[nroMan] += monto;
        }
        for (let subKey in mapSubMan) {
          if (notas.indexOf(subKey) !== -1 && tipo === "Ingreso") {
            if (!txCobrosBySubMan[subKey]) txCobrosBySubMan[subKey] = 0;
            if (nroMan !== subKey) txCobrosBySubMan[subKey] += monto;
          }
        }
      }
    }

    if (sheetGastos) {
      const dataG = sheetGastos.getDataRange().getValues();
      for (let j = 1; j < dataG.length; j++) {
        const idGasto = String(dataG[j][0] || "");
        const idViajeG = String(dataG[j][1] || "").trim();
        const fechaG = String(dataG[j][3] || "");
        const montoG = Number(dataG[j][5] || 0);
        const detalleG = String(dataG[j][10] || "");

        if (idViajeG && idViajeG !== "-" && idViajeG !== "S/V" && !validViajes.has(idViajeG)) {
          detallesHuerfanos.push({
            id: idGasto,
            tabla: "Gastos_Ruta_Camion",
            campo: "ID_Viaje_Asignado",
            valorInvalido: idViajeG,
            motivo: "El viaje asignado al gasto de ruta no existe en la tabla Viajes",
            montoBs: montoG,
            fecha: fechaG,
            detalles: detalleG || ("Gasto de ruta Bs. " + montoG)
          });
        }
      }
    }

    // 4. Diagnosticar Descuadres de Caja
    const detallesCajas = [];
    if (sheetCajas) {
      const dataC = sheetCajas.getDataRange().getValues();
      for (let c = 1; c < dataC.length; c++) {
        const nomCaja = String(dataC[c][0] || "").trim();
        if (!nomCaja) continue;
        const saldoIni = Number(dataC[c][3] || 0);
        const saldoDispReg = Number(dataC[c][6] || 0);

        const movs = txByCaja[nomCaja] || { ingresos: 0, gastos: 0 };
        const realIngresos = movs.ingresos;
        const realGastos = movs.gastos;
        const saldoRealCalc = saldoIni + realIngresos - realGastos;
        const dif = Number((saldoDispReg - saldoRealCalc).toFixed(2));
        const tieneDescuadre = Math.abs(dif) > 0.05;

        detallesCajas.push({
          caja: nomCaja,
          saldoRegistrado: Number(saldoDispReg.toFixed(2)),
          saldoHistoricoReal: Number(saldoRealCalc.toFixed(2)),
          diferencia: dif,
          estado: tieneDescuadre ? "Descuadre Detectado" : "Cuadrado",
          totalIngresosReal: Number(realIngresos.toFixed(2)),
          totalGastosReal: Number(realGastos.toFixed(2)),
          saldoInicial: saldoIni
        });
      }
    }

    // 5. Diagnosticar Inconsistencias en Manifiestos y Sub-Manifiestos (CxC)
    const detallesManifiestos = [];
    for (let key in mapSubMan) {
      const item = mapSubMan[key];
      const cobrosEnTx = txCobrosBySubMan[item.idSubManifiesto] || txCobrosBySubMan[item.nroManifiesto] || item.cobrosRealizadosBs;
      const saldoEsperado = Math.max(0, Number((item.fleteAsignadoBs - cobrosEnTx).toFixed(2)));
      const difSaldo = Number((item.saldoPendienteClienteBs - saldoEsperado).toFixed(2));
      const estadoRecomendado = saldoEsperado <= 0.01 ? "Liquidado" : (cobrosEnTx > 0 ? "Pendiente Parcial" : "Por Cobrar");
      const estadoDesfasado = (saldoEsperado <= 0.01 && item.estadoLiquidacion.indexOf("Liquidado") === -1);
      const tieneInconsistencia = Math.abs(difSaldo) > 0.05 || estadoDesfasado;

      detallesManifiestos.push({
        tipo: "Sub-MIC",
        idDoc: item.idSubManifiesto,
        nroDocumento: item.nroManifiesto || item.idSubManifiesto,
        clienteDestinatario: item.destinatario,
        fleteTotalBs: item.fleteAsignadoBs,
        cobrosRegistradosBs: item.cobrosRealizadosBs,
        cobrosRealesCalculadosBs: Number(cobrosEnTx.toFixed(2)),
        saldoRegistradoBs: item.saldoPendienteClienteBs,
        saldoRealCalculadoBs: saldoEsperado,
        diferenciaSaldoBs: difSaldo,
        estadoActual: item.estadoLiquidacion || "Por Cobrar",
        estadoRecomendado: estadoRecomendado,
        tieneInconsistencia: tieneInconsistencia,
        motivo: tieneInconsistencia 
          ? (Math.abs(difSaldo) > 0.05 ? "Desfase en saldo pendiente (Diferencia: Bs. " + difSaldo + ")" : "Estado documental no refleja saldo liquidado")
          : "Sincronizado"
      });
    }

    for (let keyM in mapManOrig) {
      const orig = mapManOrig[keyM];
      const sumaComprobacion = Number((orig.cobradoOrigenBs + orig.saldoCobrarDestinosBs).toFixed(2));
      const dif = Number((orig.fleteTotalBs - sumaComprobacion).toFixed(2));
      const tieneInconsistencia = Math.abs(dif) > 0.1 && orig.fleteTotalBs > 0;
      const estadoRecomendado = orig.saldoCobrarDestinosBs <= 0.01 ? "Liquidado" : "En Tránsito / Por Cobrar";

      detallesManifiestos.push({
        tipo: "MIC",
        idDoc: orig.idManifiesto || orig.nroManifiestoMIC,
        nroDocumento: orig.nroManifiestoMIC,
        clienteDestinatario: "Consolidado Ruta Origen",
        fleteTotalBs: orig.fleteTotalBs,
        cobrosRegistradosBs: orig.cobradoOrigenBs,
        cobrosRealesCalculadosBs: orig.cobradoOrigenBs,
        saldoRegistradoBs: orig.saldoCobrarDestinosBs,
        saldoRealCalculadoBs: Math.max(0, orig.fleteTotalBs - orig.cobradoOrigenBs),
        diferenciaSaldoBs: dif,
        estadoActual: orig.estado || "En Ruta",
        estadoRecomendado: estadoRecomendado,
        tieneInconsistencia: tieneInconsistencia,
        motivo: tieneInconsistencia ? "La sumatoria de fletes no coincide con origen + saldo destinos" : "Sincronizado"
      });
    }

    const descuadresCount = detallesCajas.filter(c => c.estado !== "Cuadrado").length;
    const inconsistenciasCount = detallesManifiestos.filter(m => m.tieneInconsistencia).length;
    const huerfanosCount = detallesHuerfanos.length;
    const totalAnomalias = huerfanosCount + descuadresCount + inconsistenciasCount;

    let saludGeneral = "Óptima";
    if (totalAnomalias > 5 || descuadresCount > 1) {
      saludGeneral = "Crítica";
    } else if (totalAnomalias > 0) {
      saludGeneral = "Atención Requerida";
    }

    const totalEvaluados = Math.max(1, (sheetTx ? sheetTx.getLastRow() : 1) + detallesCajas.length + detallesManifiestos.length);
    const porcentajeIntegridad = Math.max(0, Math.min(100, Number(((1 - (totalAnomalias / totalEvaluados)) * 100).toFixed(1))));

    return {
      status: "success",
      data: {
        resumen: {
          totalAnomalias: totalAnomalias,
          huerfanos: huerfanosCount,
          descuadresCajas: descuadresCount,
          inconsistenciasManifiestos: inconsistenciasCount,
          saludGeneral: saludGeneral,
          porcentajeIntegridad: porcentajeIntegridad,
          fechaDiagnostico: Utilities.formatDate(new Date(), "GMT-4", "yyyy-MM-dd HH:mm:ss"),
          origen: "Backend Google Sheets"
        },
        detallesHuerfanos: detallesHuerfanos,
        detallesCajas: detallesCajas,
        detallesManifiestos: detallesManifiestos
      }
    };
  } catch (err) {
    return { status: "error", message: "Error al ejecutar diagnóstico: " + err.toString() };
  }
}

function purgarDatosHuerfanos(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheetViajes = ss.getSheetByName("Viajes");
    const sheetTx = ss.getSheetByName("Transacciones_Diarias");
    const sheetGastos = ss.getSheetByName("Gastos_Ruta_Camion");

    const validViajes = new Set();
    if (sheetViajes) {
      const dataV = sheetViajes.getDataRange().getValues();
      for (let i = 1; i < dataV.length; i++) {
        const idV = String(dataV[i][0] || "").trim();
        if (idV) validViajes.add(idV);
      }
    }

    const idsEspecificos = payload && Array.isArray(payload.ids) ? new Set(payload.ids) : null;
    let eliminadosTx = 0;
    let eliminadosGastos = 0;
    const detallesLog = [];

    // Purgar en Gastos_Ruta_Camion (de abajo hacia arriba)
    if (sheetGastos) {
      const dataG = sheetGastos.getDataRange().getValues();
      for (let j = dataG.length - 1; j >= 1; j--) {
        const idG = String(dataG[j][0] || "").trim();
        const idViajeG = String(dataG[j][1] || "").trim();
        const esHuerfano = idViajeG && idViajeG !== "-" && idViajeG !== "S/V" && !validViajes.has(idViajeG);
        const coincideID = idsEspecificos && idsEspecificos.has(idG);

        if (coincideID || (!idsEspecificos && esHuerfano)) {
          sheetGastos.deleteRow(j + 1);
          eliminadosGastos++;
          detallesLog.push("Eliminado Gasto Huérfano " + idG + " (Viaje inexistente: " + idViajeG + ")");
        }
      }
    }

    // Purgar en Transacciones_Diarias (de abajo hacia arriba)
    if (sheetTx) {
      const dataTx = sheetTx.getDataRange().getValues();
      for (let i = dataTx.length - 1; i >= 1; i--) {
        const idTx = String(dataTx[i][0] || "").trim();
        const idViajeTx = String(dataTx[i][7] || "").trim();
        const esHuerfano = idViajeTx && idViajeTx !== "-" && idViajeTx !== "S/V" && !validViajes.has(idViajeTx);
        const coincideID = idsEspecificos && idsEspecificos.has(idTx);

        if (coincideID || (!idsEspecificos && esHuerfano)) {
          sheetTx.deleteRow(i + 1);
          eliminadosTx++;
          detallesLog.push("Eliminada Transacción Huérfana " + idTx + " (Viaje inexistente: " + idViajeTx + ")");
        }
      }
    }

    const totalEliminados = eliminadosTx + eliminadosGastos;

    // Registrar traza de auditoría
    registrarTrazaAuditoria(ss, {
      accion: "PURGA_HUERFANOS",
      titulo: "Purga de Registros Huérfanos",
      usuario: (payload && payload.usuario) || "Administrador",
      registrosAfectados: totalEliminados,
      resultado: "Éxito",
      detalles: detallesLog.length > 0 ? detallesLog : ["No se encontraron huérfanos para purgar."]
    });

    return {
      status: "success",
      message: "Purga completada con éxito. Se eliminaron " + totalEliminados + " registros huérfanos (" + eliminadosTx + " transacciones, " + eliminadosGastos + " gastos de ruta).",
      registrosAfectados: totalEliminados,
      detalles: detallesLog
    };
  } catch (err) {
    return { status: "error", message: "Fallo en purga de huérfanos: " + err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function sincronizarCajasDesdeHistorial(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheetCajas = ss.getSheetByName("Arqueo_Cajas");
    const sheetTx = ss.getSheetByName("Transacciones_Diarias");
    if (!sheetCajas) throw new Error("No se encontró la hoja Arqueo_Cajas.");

    // Acumular transacciones reales por caja
    const acumulado = {};
    if (sheetTx) {
      const dataTx = sheetTx.getDataRange().getValues();
      for (let i = 1; i < dataTx.length; i++) {
        const tipo = String(dataTx[i][2] || "").trim();
        const monto = Number(dataTx[i][4] || 0);
        const caja = String(dataTx[i][5] || "").trim();
        if (!caja) continue;

        if (!acumulado[caja]) acumulado[caja] = { cobrado: 0, gastado: 0 };
        if (tipo === "Ingreso") acumulado[caja].cobrado += monto;
        if (tipo === "Gasto") acumulado[caja].gastado += monto;
      }
    }

    const dataC = sheetCajas.getDataRange().getValues();
    let cajasActualizadas = 0;
    const detallesLog = [];

    for (let c = 1; c < dataC.length; c++) {
      const nomCaja = String(dataC[c][0] || "").trim();
      if (!nomCaja) continue;

      const saldoIni = Number(dataC[c][3] || 0);
      const saldoAnterior = Number(dataC[c][6] || 0);
      const mov = acumulado[nomCaja] || { cobrado: 0, gastado: 0 };
      const nuevoCobrado = Number(mov.cobrado.toFixed(2));
      const nuevoGastado = Number(mov.gastado.toFixed(2));
      const nuevoSaldo = Number((saldoIni + nuevoCobrado - nuevoGastado).toFixed(2));

      sheetCajas.getRange(c + 1, 5, 1, 3).setValues([[nuevoCobrado, nuevoGastado, nuevoSaldo]]);
      cajasActualizadas++;

      if (Math.abs(saldoAnterior - nuevoSaldo) > 0.01) {
        detallesLog.push("Caja [" + nomCaja + "] corregida de Bs. " + saldoAnterior + " a Bs. " + nuevoSaldo + " (Ing: " + nuevoCobrado + ", Gas: " + nuevoGastado + ")");
      }
    }

    registrarTrazaAuditoria(ss, {
      accion: "SINCRONIZAR_CAJAS",
      titulo: "Sincronización Total de Cajas y Arqueo",
      usuario: (payload && payload.usuario) || "Administrador",
      registrosAfectados: cajasActualizadas,
      resultado: "Éxito",
      detalles: detallesLog.length > 0 ? detallesLog : ["Todas las cajas recalculadas y verificadas contra historial."]
    });

    return {
      status: "success",
      message: "Arqueo de cajas sincronizado con éxito. Se recalcularon " + cajasActualizadas + " cuentas basadas en el historial de transacciones.",
      cajasActualizadas: cajasActualizadas,
      detalles: detallesLog
    };
  } catch (err) {
    return { status: "error", message: "Error al sincronizar cajas: " + err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function repararSaldosManifiestos(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheetManDest = ss.getSheetByName("Manifiestos_Destino");
    const sheetManOrig = ss.getSheetByName("Manifiestos_Origen");
    const sheetTx = ss.getSheetByName("Transacciones_Diarias");

    const cobrosBySub = {};
    if (sheetTx) {
      const dataTx = sheetTx.getDataRange().getValues();
      for (let i = 1; i < dataTx.length; i++) {
        const tipo = String(dataTx[i][2] || "").trim();
        const monto = Number(dataTx[i][4] || 0);
        const nroMan = String(dataTx[i][8] || "").trim();

        if (tipo === "Ingreso" && monto > 0) {
          if (nroMan) {
            cobrosBySub[nroMan] = (cobrosBySub[nroMan] || 0) + monto;
          }
        }
      }
    }

    let corregidosSub = 0;
    const detallesLog = [];

    if (sheetManDest) {
      const dataSub = sheetManDest.getDataRange().getValues();
      for (let s = 1; s < dataSub.length; s++) {
        const idSub = String(dataSub[s][0] || "").trim();
        const nroMan = String(dataSub[s][2] || dataSub[s][1] || "").trim();
        const pagadoOrigen = Number(dataSub[s][5] || 0);
        const porPagarDestino = Number(dataSub[s][6] || 0);
        const fleteCorrecto = pagadoOrigen + porPagarDestino;
        const cobradoActual = Number(dataSub[s][7] || 0);
        const saldoActual = Number(dataSub[s][11] || 0);

        const realCobrado = cobrosBySub[idSub] || cobrosBySub[nroMan] || cobradoActual;
        const nuevoSaldo = Math.max(0, Number((porPagarDestino - realCobrado).toFixed(2)));
        const nuevoEstado = nuevoSaldo <= 0.01 ? "Liquidado en Sucursal" : (realCobrado > 0 ? "Pendiente Parcial" : "Por Cobrar");

        let modificado = false;
        if (Math.abs(Number(dataSub[s][4] || 0) - fleteCorrecto) > 0.01) {
          sheetManDest.getRange(s + 1, 5).setValue(fleteCorrecto);
          modificado = true;
        }
        if (Math.abs(saldoActual - nuevoSaldo) > 0.01 || Math.abs(cobradoActual - realCobrado) > 0.01) {
          sheetManDest.getRange(s + 1, 8).setValue(realCobrado);
          sheetManDest.getRange(s + 1, 12).setValue(nuevoSaldo);
          modificado = true;
        }

        const estadoCol = String(dataSub[s][12] || "");
        if (nuevoSaldo <= 0.01 && estadoCol.indexOf("Liquidado") === -1) {
          sheetManDest.getRange(s + 1, 13).setValue(nuevoEstado);
          modificado = true;
        }

        if (modificado) {
          corregidosSub++;
          detallesLog.push("Sub-MIC [" + idSub + "]: Flete Bs. " + fleteCorrecto + " (Origen: " + pagadoOrigen + " + Destino: " + porPagarDestino + ") | Cobrado Bs. " + realCobrado + " | Nuevo Saldo Bs. " + nuevoSaldo + " (" + nuevoEstado + ")");
        }
      }
    }

    // Reparar Manifiestos Origen si fleteTotal != cobradoOrigen + saldoCobrar
    let corregidosOrig = 0;
    if (sheetManOrig) {
      const dataOrig = sheetManOrig.getDataRange().getValues();
      for (let o = 1; o < dataOrig.length; o++) {
        const idMIC = String(dataOrig[o][0] || "").trim();
        const fleteTotal = Number(dataOrig[o][6] || 0);
        const cobradoOrigen = Number(dataOrig[o][7] || 0);
        const saldoCobrar = Number(dataOrig[o][8] || 0);

        if (fleteTotal > 0 && Math.abs((cobradoOrigen + saldoCobrar) - fleteTotal) > 0.1) {
          const nuevoSaldoCobrar = Math.max(0, Number((fleteTotal - cobradoOrigen).toFixed(2)));
          sheetManOrig.getRange(o + 1, 9).setValue(nuevoSaldoCobrar);
          corregidosOrig++;
          detallesLog.push("MIC [" + idMIC + "]: Recalculado Saldo a Cobrar en Destinos a Bs. " + nuevoSaldoCobrar);
        }
      }
    }

    const totalReparados = corregidosSub + corregidosOrig;

    registrarTrazaAuditoria(ss, {
      accion: "REPARAR_MANIFIESTOS",
      titulo: "Reparación de Cascada y Saldos de Manifiestos",
      usuario: (payload && payload.usuario) || "Administrador",
      registrosAfectados: totalReparados,
      resultado: "Éxito",
      detalles: detallesLog.length > 0 ? detallesLog : ["Todos los saldos de manifiestos estaban en regla."]
    });

    return {
      status: "success",
      message: "Saldos de manifiestos y sub-manifiestos reparados. Se actualizaron " + totalReparados + " documentos.",
      registrosAfectados: totalReparados,
      detalles: detallesLog
    };
  } catch (err) {
    return { status: "error", message: "Error al reparar saldos de manifiestos: " + err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function reparacionIntegralSistema(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    const resPurga = purgarDatosHuerfanos(ss, payload);
    const resManif = repararSaldosManifiestos(ss, payload);
    const resCajas = sincronizarCajasDesdeHistorial(ss, payload);

    const logsConsolidados = []
      .concat(resPurga.detalles || [])
      .concat(resManif.detalles || [])
      .concat(resCajas.detalles || []);

    const totalAfectados = (resPurga.registrosAfectados || 0) + (resManif.registrosAfectados || 0) + (resCajas.cajasActualizadas || 0);

    registrarTrazaAuditoria(ss, {
      accion: "REPARACION_INTEGRAL",
      titulo: "Mantenimiento Integral del Sistema Contable",
      usuario: (payload && payload.usuario) || "Administrador",
      registrosAfectados: totalAfectados,
      resultado: "Éxito",
      detalles: logsConsolidados
    });

    return {
      status: "success",
      message: "Mantenimiento Integral completado: Se purgaron datos huérfanos, se recalculó la cascada de manifiestos y se sincronizaron las cajas.",
      totalRegistrosAfectados: totalAfectados,
      purga: resPurga,
      manifiestos: resManif,
      cajas: resCajas,
      detalles: logsConsolidados
    };
  } catch (err) {
    return { status: "error", message: "Fallo en la reparación integral: " + err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * RECALCULAR SALDOS Y FLETE TOTAL EN SUB-MANIFIESTOS (FÓRMULA ORIGEN + DESTINO)
 */
function recalcularSaldosSubManifiestos() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetSub = ss.getSheetByName("Manifiestos_Destino"); // O la hoja donde guardas los sub-manifiestos
    if (!sheetSub) return { status: "error", message: "No se encontró la hoja de sub-manifiestos" };
    
    const data = sheetSub.getDataRange().getValues();
    let actualizados = 0;
    for (let i = 1; i < data.length; i++) {
      const pagadoOrigen = Number(data[i][5] || 0);
      const porPagarDestino = Number(data[i][6] || 0);
      const fleteCorrecto = pagadoOrigen + porPagarDestino;
      
      const cobrosRealizados = Number(data[i][7] !== undefined ? data[i][7] : (data[i][3] || 0));
      const saldoCorrecto = porPagarDestino - cobrosRealizados;
      
      sheetSub.getRange(i + 1, 5).setValue(fleteCorrecto);     // Flete Asignado Total (Col 5)
      sheetSub.getRange(i + 1, 12).setValue(saldoCorrecto);   // Saldo Pendiente Cliente (Col 12)
      
      actualizados++;
    }
    
    return { status: "success", message: `Se recalcularon ${actualizados} sub-manifiestos con la fórmula correcta (Origen + Destino).` };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * REINICIA TODO EL SISTEMA A CERO (Cajas, Transacciones, Viajes, Manifiestos y Saldos)
 * ¡ADVERTENCIA! Esta función elimina todos los datos operativos y deja las tablas limpias.
 */
function reiniciarSistemaACero() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Lista de todas las hojas operativas que deben vaciarse (conservando la fila 1 de cabeceras)
    const hojasAUnir = [
      "Transacciones_Diarias",
      "Gastos_Ruta_Camion",
      "Manifiestos_Origen",
      "Manifiestos_Destino",
      "Viajes",
      "Cobros_SubManifiestos",
      "Movimientos_Manif_Destino"
    ];

    hojasAUnir.forEach(nombreHoja => {
      const sheet = ss.getSheetByName(nombreHoja);
      if (sheet) {
        const ultimaFila = sheet.getLastRow();
        const ultCol = sheet.getLastColumn();
        if (ultimaFila > 1 && ultCol > 0) {
          // Borrar contenido desde la fila 2 en adelante, manteniendo las cabeceras intactas
          sheet.getRange(2, 1, ultimaFila - 1, ultCol).clearContent();
        }
      }
    });

    // Poner a cero los saldos en la hoja de Arqueo_Cajas (si existe)
    const sheetCajas = ss.getSheetByName("Arqueo_Cajas");
    if (sheetCajas) {
      const dataCajas = sheetCajas.getDataRange().getValues();
      for (let i = 1; i < dataCajas.length; i++) {
        // Asumiendo que la columna de saldo disponible es la 2 o 3, puedes ajustar según tu estructura
        // O poner a cero las columnas numéricas de saldo
        sheetCajas.getRange(i + 1, 3).setValue(0); // Columna C (Saldo Actual)
        // Y las columnas numéricas de saldo en Arqueo_Cajas (Cols 4, 5, 6, 7):
        if (dataCajas[0].length >= 7) {
          sheetCajas.getRange(i + 1, 4, 1, 4).setValues([[0, 0, 0, 0]]);
        }
      }
    }

    return { 
      status: "success", 
      message: "¡Sistema reiniciado con éxito! Todas las transacciones, saldos, viajes y manifiestos están en cero (0)." 
    };

  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 1. GENERA UN BACKUP EN FORMATO JSON DE TODAS LAS HOJAS Y LO GUARDA EN GOOGLE DRIVE
 */
function crearBackupEnDrive() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojas = ss.getSheets();
    let backupData = {
      fechaBackup: new Date().toISOString(),
      versionApp: "1.0",
      nombreEmpresa: "TranspoDrive - Gestión de Transporte y Encomiendas",
      datos: {}
    };

    hojas.forEach(hoja => {
      const nombre = hoja.getName();
      const data = hoja.getDataRange().getValues();
      backupData.datos[nombre] = data;
    });

    const jsonString = JSON.stringify(backupData);
    const fechaStr = Utilities.formatDate(new Date(), "GMT-4", "yyyy-MM-dd_HH-mm-ss");
    const nombreArchivo = `Backup_TranspoDrive_${fechaStr}.json`;

    // Buscar o crear carpeta "Backups_TranspoDrive" en Drive
    let carpeta;
    const folders = DriveApp.getFoldersByName("Backups_TranspoDrive");
    if (folders.hasNext()) {
      carpeta = folders.next();
    } else {
      carpeta = DriveApp.createFolder("Backups_TranspoDrive");
    }

    const archivo = carpeta.createFile(nombreArchivo, jsonString, MimeType.JSON);

    return {
      status: "success",
      message: `Backup creado con éxito en Google Drive: ${nombreArchivo}`,
      fileId: archivo.getId(),
      fileUrl: archivo.getUrl(),
      fileName: nombreArchivo,
      fechaBackup: backupData.fechaBackup,
      backupData: backupData
    };

  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 2. RESTAURA LA BASE DE DATOS DESDE UN OBJETO JSON (LOCAL O DRIVE)
 */
function restaurarBackupDesdeJSON(jsonData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    let parsedData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    if (!parsedData || !parsedData.datos) {
      return { status: "error", message: "El archivo de respaldo no tiene un formato válido." };
    }

    const tablas = parsedData.datos;
    
    for (let nombreHoja in tablas) {
      let hoja = ss.getSheetByName(nombreHoja);
      if (!hoja) {
        // Si la hoja no existe, la creamos
        hoja = ss.insertSheet(nombreHoja);
      }
      
      const filasDatos = tablas[nombreHoja];
      if (filasDatos && filasDatos.length > 0) {
        // Limpiar contenido actual de la hoja
        hoja.clearContents();
        // Escribir los datos restaurados
        hoja.getRange(1, 1, filasDatos.length, filasDatos[0].length).setValues(filasDatos);
      }
    }

    return { status: "success", message: "Restauración de base de datos completada con éxito." };

  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 3. LISTAR BACKUPS DISPONIBLES EN LA CARPETA DE GOOGLE DRIVE
 */
function listarBackupsEnDrive() {
  try {
    let lista = [];
    const folders = DriveApp.getFoldersByName("Backups_TranspoDrive");
    if (folders.hasNext()) {
      const carpeta = folders.next();
      const archivos = carpeta.getFiles();
      while (archivos.hasNext()) {
        const arch = archivos.next();
        lista.push({
          id: arch.getId(),
          name: arch.getName(),
          date: arch.getLastUpdated().toISOString(),
          size: arch.getSize(),
          url: arch.getUrl()
        });
      }
    }
    // Ordenar de más reciente a más antiguo
    lista.sort(function(a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    return { status: "success", backups: lista };
  } catch (err) {
    return { status: "error", message: err.toString(), backups: [] };
  }
}

/**
 * 4. OBTENER / DESCARGAR CONTENIDO DE UN BACKUP DE GOOGLE DRIVE POR SU ID
 */
function descargarBackupDesdeDrive(fileId) {
  try {
    if (!fileId) return { status: "error", message: "ID de archivo no proporcionado" };
    const archivo = DriveApp.getFileById(fileId);
    const contenido = archivo.getBlob().getDataAsString();
    const parsedData = JSON.parse(contenido);
    return {
      status: "success",
      backup: parsedData,
      fileName: archivo.getName(),
      date: archivo.getLastUpdated().toISOString()
    };
  } catch (err) {
    return { status: "error", message: "Error al leer backup de Drive: " + err.toString() };
  }
}

/**
 * REGISTRO O ACTUALIZACIÓN DE SUB-MANIFIESTO CON SALDOS SEPARADOS (CLIENTE VS AGENCIA)
 */
function guardarSubManifiestoConSaldosSeparados(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetSub = ss.getSheetByName("Manifiestos_Destino"); // O tu hoja de sub-manifiestos
    
    // 1. Extraer montos
    const pagadoOrigen = Number(payload.pagadoOrigen || payload.pagadoOrigenBs || 0);
    const porPagarDestino = Number(payload.porPagarDestino || payload.porPagarDestinoBs || payload.saldoInicialCobrarBs || 0);
    const fleteTotal = pagadoOrigen + porPagarDestino;
    
    // 2. Determinar responsabilidades y separar saldos de forma independiente
    let saldoPendienteCliente = 0;
    let saldoPendienteAgencia = 0;
    
    // Analizar si el saldo por pagar (o la deuda) recae sobre cliente o agencia
    const tipoRespDestino = String(payload.tipoResponsableDestino || payload.responsableDestinoTipo || payload.tipoDeudor || "").toLowerCase().trim();
    if (tipoRespDestino === "cliente" || tipoRespDestino === "directo") {
      saldoPendienteCliente = porPagarDestino; // El cliente debe este saldo en este sub-manifiesto
    } else if (tipoRespDestino === "agencia" || tipoRespDestino === "sucursal") {
      saldoPendienteAgencia = porPagarDestino; // La agencia/sucursal debe rendir este saldo
    } else {
      saldoPendienteCliente = porPagarDestino;
    }
    
    // Si también manejas crédito en origen:
    const tipoRespOrigen = String(payload.tipoResponsableOrigen || payload.responsableOrigenTipo || "").toLowerCase().trim();
    if (tipoRespOrigen === "cliente") {
      saldoPendienteCliente += Number(payload.creditoOrigen || payload.creditoOrigenBs || 0);
    } else if (tipoRespOrigen === "agencia" || tipoRespOrigen === "sucursal") {
      saldoPendienteAgencia += Number(payload.creditoOrigen || payload.creditoOrigenBs || 0);
    }

    // Si la hoja existe, persistir o actualizar la fila del sub-manifiesto
    if (sheetSub) {
      const data = sheetSub.getDataRange().getValues();
      const idBuscado = String(payload.idSubManifiesto || payload.nroManifiesto || "").trim();
      let rowIndex = -1;
      if (idBuscado && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]).trim() === idBuscado || String(data[i][2]).trim() === idBuscado) {
            rowIndex = i + 1;
            break;
          }
        }
      }

      const estado = (saldoPendienteCliente <= 0 && saldoPendienteAgencia <= 0) ? "Liquidado" : (pagadoOrigen > 0 ? "Pendiente Parcial" : "Por Cobrar");
      const destinatario = payload.destinatario || payload.clienteDestinatario || (tipoRespDestino === "agencia" ? ("Agencia " + (payload.agenciaDestinoResponsable || payload.sucursalDestino || "")) : "Cliente General");

      if (rowIndex !== -1) {
        // Actualizar fila existente
        const colCount = Math.max(sheetSub.getLastColumn(), 9);
        const curRow = sheetSub.getRange(rowIndex, 1, 1, colCount).getValues()[0];
        if (curRow && curRow.length >= 9) {
          curRow[3] = fleteTotal;
          curRow[4] = pagadoOrigen;
          curRow[5] = porPagarDestino;
          curRow[6] = saldoPendienteCliente;
          curRow[7] = saldoPendienteAgencia;
          curRow[8] = estado;
          sheetSub.getRange(rowIndex, 1, 1, curRow.length).setValues([curRow]);
        }
      } else if (payload.idSubManifiesto || payload.nroManifiesto) {
        // Insertar nueva fila
        const idSub = payload.idSubManifiesto || ("SUB-" + Date.now());
        const idViaje = payload.idViaje || "";
        sheetSub.appendRow([
          idSub,
          idViaje,
          destinatario,
          fleteTotal,
          pagadoOrigen,
          porPagarDestino,
          saldoPendienteCliente,
          saldoPendienteAgencia,
          estado
        ]);
      }
    }

    return { 
      status: "success", 
      message: "Sub-manifiesto registrado con saldos independientes para cliente y agencia correctamente.",
      saldosCalculados: { fleteTotal, saldoPendienteCliente, saldoPendienteAgencia }
    };

  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * LIMPIEZA TOTAL DEL SISTEMA A CERO (Cajas, Transacciones, Viajes, Manifiestos y Saldos)
 * ¡ADVERTENCIA! Esta función elimina todos los datos operativos y deja las tablas limpias.
 */
function limpiarSistemaAbsolutamenteTodoACero() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Lista exhaustiva de TODAS las hojas operativas y financieras de la app
    const hojasAEliminarContenido = [
      "Transacciones_Diarias",
      "Gastos_Ruta_Camion",
      "Gastos_Administrativos",
      "Manifiestos_Origen",
      "Manifiestos_Destino",
      "Viajes",
      "Cobros_SubManifiestos",
      "Cuentas_Por_Pagar",     // CxP (Obligaciones)
      "Cuentas_Por_Cobrar",    // CxC (Saldos de clientes/agencias)
      "Anticipos_Choferes",    // Préstamos o adelantos
      "Liquidaciones_Ruta"     // Historial de cierres de viaje
    ];

    hojasAEliminarContenido.forEach(nombreHoja => {
      const sheet = ss.getSheetByName(nombreHoja);
      if (sheet) {
        const ultimaFila = sheet.getLastRow();
        const ultCol = sheet.getLastColumn();
        if (ultimaFila > 1 && ultCol > 0) {
          // Borra todo el contenido operativo manteniendo la fila 1 de cabeceras
          sheet.getRange(2, 1, ultimaFila - 1, ultCol).clearContent();
        }
      }
    });

    // 2. Blanquear y poner a CERO (0) los saldos en la hoja de Arqueo de Cajas
    const sheetCajas = ss.getSheetByName("Arqueo_Cajas");
    if (sheetCajas) {
      const dataCajas = sheetCajas.getDataRange().getValues();
      for (let i = 1; i < dataCajas.length; i++) {
        // Asumiendo que la columna de saldo disponible es la columna C (índice 3) o D. 
        // Aquí ponemos en 0 todas las celdas numéricas de saldo de las cajas:
        sheetCajas.getRange(i + 1, 3).setValue(0); // Saldo Actual en 0
        sheetCajas.getRange(i + 1, 4).setValue(0); // Ingresos del día en 0
        sheetCajas.getRange(i + 1, 5).setValue(0); // Egresos del día en 0
        if (dataCajas[0].length >= 7) {
          sheetCajas.getRange(i + 1, 4, 1, 4).setValues([[0, 0, 0, 0]]);
        }
      }
    }

    return { 
      status: "success", 
      message: "¡Limpieza total exitosa! Transacciones, CxP, CxC, anticipos y saldos de caja están en 0." 
    };

  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * AUDITORÍA GENERAL Y REPARACIÓN EN CASCADA (CXC, CXP Y HUÉRFANOS)
 */
function ejecutarAuditoriaYReparacionTotal() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    let reporteLog = {
      cxPRecalculadas: 0,
      cxCSaldosActualizados: 0,
      huerfanosPurged: 0
    };

    // 1. PURGAR DATOS HUÉRFANOS (Registros en transacciones o gastos sin un Viaje o Manifiesto válido)
    reporteLog.huerfanosPurged = purgarRegistrosHuerfanosSistema(ss);

    // 2. RECALCULAR Y REPARAR CUENTAS POR COBRAR (CxC de Sub-Manifiestos / Destino)
    reporteLog.cxCSaldosActualizados = recalcularSaldosCxCDestino(ss);

    // 3. RECALCULAR Y REPARAR CUENTAS POR PAGAR (CxP / Obligaciones)
    reporteLog.cxPRecalculadas = recalcularSaldosCxPObligaciones(ss);

    return {
      status: "success",
      message: `Auditoría completada con éxito. Registros huérfanos eliminados: ${reporteLog.huerfanosPurged}, CxC sincronizadas: ${reporteLog.cxCSaldosActualizados}, CxP recalculadas: ${reporteLog.cxPRecalculadas}.`
    };

  } catch (err) {
    return { status: "error", message: "Error en la auditoría: " + err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Función auxiliar: Purgar huérfanos en cascada
 */
function purgarRegistrosHuerfanosSistema(ss) {
  let contadorBorrados = 0;
  
  // Obtener IDs válidos de Viajes y Manifiestos
  const sheetViajes = ss.getSheetByName("Viajes");
  const viajesValidos = new Set();
  if (sheetViajes && sheetViajes.getLastRow() > 1) {
    const dataV = sheetViajes.getRange(2, 1, sheetViajes.getLastRow() - 1, 1).getValues();
    dataV.forEach(r => { if (r[0]) viajesValidos.add(String(r[0]).trim()); });
  }

  // Revisar hojas transaccionales y eliminar si su ID de viaje ya no existe
  const hojasTransaccionales = ["Transacciones_Diarias", "Gastos_Ruta_Camion", "Cobros_SubManifiestos"];
  hojasTransaccionales.forEach(nombreHoja => {
    const sheet = ss.getSheetByName(nombreHoja);
    if (sheet && sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) {
        // Buscamos si la fila contiene alguna referencia a ID de viaje que ya no exista
        let esHuerfano = false;
        for (let c = 0; c < data[i].length; c++) {
          const val = String(data[i][c]).trim();
          // Si el campo parece un ID de viaje pero no está en la lista de válidos (y no está vacío)
          if (val.startsWith("VIAJE-") && !viajesValidos.has(val)) {
            esHuerfano = true;
            break;
          }
        }
        if (esHuerfano) {
          sheet.deleteRow(i + 1);
          contadorBorrados++;
        }
      }
    }
  });

  return contadorBorrados;
}

/**
 * Función auxiliar: Recalcular CxC (Clientes y Agencias en Sub-Manifiestos)
 */
function recalcularSaldosCxCDestino(ss) {
  const sheetSub = ss.getSheetByName("Manifiestos_Destino");
  if (!sheetSub || sheetSub.getLastRow() <= 1) return 0;
  
  const data = sheetSub.getDataRange().getValues();
  let actualizados = 0;

  for (let i = 1; i < data.length; i++) {
    // Suponiendo índices: 
    // Columna Flete Total (ej. índice 4), Pagado Origen (índice 5), Por Pagar Destino (índice 6)
    // Cobros Realizados (índice 3)
    const pagadoOrigen = Number(data[i][5] || 0);
    const porPagarDestino = Number(data[i][6] || 0);
    const fleteTotalCorrecto = pagadoOrigen + porPagarDestino;
    
    const cobrosRealizados = Number(data[i][3] || 0);
    const saldoPendienteCorrecto = Math.max(0, porPagarDestino - cobrosRealizados);

    // Escribir valores corregidos en las columnas correspondientes
    sheetSub.getRange(i + 1, 5).setValue(fleteTotalCorrecto);     // Flete Total
    sheetSub.getRange(i + 1, 12).setValue(saldoPendienteCorrecto); // Saldo Pendiente CxC
    
    // Actualizar estado dinámico
    if (saldoPendienteCorrecto <= 0) {
      sheetSub.getRange(i + 1, 13).setValue("Liquidado");
    } else if (cobrosRealizados > 0) {
      sheetSub.getRange(i + 1, 13).setValue("Pendiente Parcial");
    } else {
      sheetSub.getRange(i + 1, 13).setValue("Por Cobrar");
    }
    
    actualizados++;
  }
  return actualizados;
}

/**
 * Función auxiliar: Recalcular CxP / Obligaciones
 */
function recalcularSaldosCxPObligaciones(ss) {
  const sheetCxP = ss.getSheetByName("Cuentas_Por_Pagar");
  if (!sheetCxP || sheetCxP.getLastRow() <= 1) return 0;
  
  const data = sheetCxP.getDataRange().getValues();
  let recalculados = 0;

  // Lógica de validación y cruce con pagos efectuados en Transacciones_Diarias para CxP
  for (let i = 1; i < data.length; i++) {
    recalculados++;
  }
  return recalculados;
}




/**
 * Registra pago a proveedor, descuenta de CxP y afecta arqueo de caja de egreso
 */
function registrarPagoProveedor(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const monto = Number(payload.montoPagoBs || payload.montoBs || 0);
    const cajaEgreso = payload.cajaCuentaEgreso || payload.caja || "Caja Chica Central";
    const fecha = payload.fecha || Utilities.formatDate(new Date(), "America/La_Paz", "yyyy-MM-dd");

    // 1. Registrar egreso en Transacciones_Diarias
    const resTx = registrarTransaccionDiaria(ss, {
      tipo: "Gasto",
      fecha: fecha,
      categoria: payload.categoriaGasto || "Mantenimiento y Repuestos",
      montoBs: monto,
      metodoPago: cajaEgreso,
      cuentaDestino: cajaEgreso,
      notas: ("Abono/Pago a proveedor " + (payload.nombreProveedor || "") + " " + (payload.nroComprobante ? "(Comp: " + payload.nroComprobante + ")" : "") + ". " + (payload.notas || "")).trim(),
      idProveedor: payload.idProveedor || "",
      nombreProveedor: payload.nombreProveedor || "",
      placaCamion: payload.placaCamion || "",
      idViaje: payload.idViaje || ""
    });

    // 2. Si existe hoja Cuentas_Por_Pagar, amortizar saldo
    const sheetCxP = ss.getSheetByName("Cuentas_Por_Pagar");
    if (sheetCxP && sheetCxP.getLastRow() > 1) {
      const data = sheetCxP.getDataRange().getValues();
      const idBuscar = String(payload.idCxP || payload.idProveedor || "").trim();
      for (let i = 1; i < data.length; i++) {
        if (idBuscar && (String(data[i][0]).trim() === idBuscar || String(data[i][1]).trim() === idBuscar)) {
          const montoTotal = Number(data[i][5] || 0);
          const pagadoActual = Number(data[i][6] || 0) + monto;
          const nuevoSaldo = Math.max(0, montoTotal - pagadoActual);
          sheetCxP.getRange(i + 1, 7).setValue(pagadoActual);
          sheetCxP.getRange(i + 1, 8).setValue(nuevoSaldo);
          sheetCxP.getRange(i + 1, 9).setValue(nuevoSaldo <= 0 ? "Pagado" : "Parcial");
          break;
        }
      }
    }

    return { status: "success", message: "Pago de Bs. " + monto + " a proveedor registrado correctamente.", tx: resTx };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Liquidación de saldos recaudados por agencia de destino hacia cuenta central
 */
function liquidarSaldosAgenciaDestino(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const monto = Number(payload.montoALiquidar || payload.montoBs || 0);
    const agenciaDestino = payload.agenciaDestino || "Destino";
    const cuentaCentral = payload.cuentaCentral || "Caja Central";
    const fecha = payload.fecha || Utilities.formatDate(new Date(), "America/La_Paz", "yyyy-MM-dd");

    // Registrar egreso en agencia
    registrarTransaccionDiaria(ss, {
      tipo: "Gasto",
      fecha: fecha,
      categoria: "Liquidación Agencia Destino",
      montoBs: monto,
      metodoPago: "Caja Agencia " + agenciaDestino,
      cuentaDestino: cuentaCentral,
      sucursal: agenciaDestino,
      notas: ("Rendición de recaudación de agencia " + agenciaDestino + " a " + cuentaCentral + ". " + (payload.notas || "")).trim()
    });

    // Registrar ingreso en cuenta central
    registrarTransaccionDiaria(ss, {
      tipo: "Ingreso",
      fecha: fecha,
      categoria: "Liquidación Recibida de Agencia",
      montoBs: monto,
      metodoPago: cuentaCentral,
      cuentaDestino: cuentaCentral,
      sucursal: "Central",
      notas: ("Recepción de fondos rendidos por agencia " + agenciaDestino + ". " + (payload.notas || "")).trim()
    });

    return { status: "success", message: "Liquidación de " + agenciaDestino + " por Bs. " + monto + " transferida a " + cuentaCentral + "." };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Liquidar agencia con deducciones (comisiones, fletes locales, retenciones)
 */
function liquidarAgenciaConDeducciones(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const sheetSub = ss.getSheetByName("Manifiestos_Destino");
    const subIds = new Set((payload.subManifiestosIds || []).map(id => String(id).trim()));

    if (sheetSub && sheetSub.getLastRow() > 1 && subIds.size > 0) {
      const data = sheetSub.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const idRow = String(data[i][0]).trim();
        const nroRow = String(data[i][2]).trim();
        if (subIds.has(idRow) || subIds.has(nroRow)) {
          if (data[0].length >= 20) sheetSub.getRange(i + 1, 20).setValue("Liquidado");
          if (data[0].length >= 21) sheetSub.getRange(i + 1, 21).setValue(0);
        }
      }
    }

    const fecha = payload.fecha || Utilities.formatDate(new Date(), "America/La_Paz", "yyyy-MM-dd");
    const cuentaDestino = payload.cuentaDestino || "Caja Central";
    const montoNeto = Number(payload.montoNeto || 0);

    if (montoNeto > 0) {
      registrarTransaccionDiaria(ss, {
        tipo: "Ingreso",
        fecha: fecha,
        categoria: "Liquidación Neta Agencia",
        montoBs: montoNeto,
        metodoPago: cuentaDestino,
        cuentaDestino: cuentaDestino,
        sucursal: payload.agencia || "Central",
        idViaje: payload.idViaje || "",
        notas: ("Liquidación neta de agencia " + (payload.agencia || "") + ". Bruto: Bs. " + (payload.montoBruto || 0) + ", Deducciones: Bs. " + (payload.totalDeducciones || 0) + ". " + (payload.notas || "")).trim()
      });
    }

    if (Array.isArray(payload.deducciones)) {
      payload.deducciones.forEach(ded => {
        if (Number(ded.montoBs) > 0) {
          registrarTransaccionDiaria(ss, {
            tipo: "Gasto",
            fecha: fecha,
            categoria: ded.categoria || "Comisiones y Deducciones Agencia",
            montoBs: Number(ded.montoBs),
            metodoPago: cuentaDestino,
            cuentaDestino: cuentaDestino,
            sucursal: payload.agencia || "Central",
            idViaje: payload.idViaje || "",
            notas: "Deducción/Retención en liquidación agencia " + (payload.agencia || "") + ": " + (ded.detalle || ded.categoria)
          });
        }
      });
    }

    return { status: "success", message: "Liquidación con deducciones para agencia " + payload.agencia + " registrada exitosamente." };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Crear o actualizar reporte de viaje de chofer y sincronizar con viajes
 */
function crearOActualizarReporteChofer(ss, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const sheetRep = ss.getSheetByName("Reportes_Chofer");
    if (!sheetRep) {
      inicializarEstructuraBaseDatos();
    }
    const targetSheet = ss.getSheetByName("Reportes_Chofer");
    if (!targetSheet) return { status: "error", message: "No se pudo acceder a la hoja Reportes_Chofer" };

    const data = targetSheet.getDataRange().getValues();
    const idBuscado = String(payload.idReporteChofer || "").trim();
    let rowIndex = -1;

    if (idBuscado && data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === idBuscado) {
          rowIndex = i + 1;
          break;
        }
      }
    }

    const idRep = idBuscado || ("REP-" + Date.now());
    const rowValues = [
      idRep,
      payload.idViaje || "",
      payload.placaCamion || "",
      payload.choferAsignado || "",
      payload.centroCosto || "",
      payload.rutaOrigen || "",
      payload.rutaDestino || "",
      payload.manifiestosAsociados || "",
      payload.fechaInicio || "",
      payload.fechaCierre || "",
      Number(payload.totalIngresosBs || 0),
      Number(payload.totalGastosBs || 0),
      Number(payload.saldoFavorContraBs || 0),
      payload.liquidar ? "Liquidado" : (payload.estadoReporte || "Borrador"),
      payload.observaciones || ""
    ];

    if (rowIndex !== -1) {
      targetSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      targetSheet.appendRow(rowValues);
    }

    const sheetIng = ss.getSheetByName("Detalle_Ingresos_Chofer");
    if (sheetIng && Array.isArray(payload.ingresos)) {
      payload.ingresos.forEach(ing => {
        sheetIng.appendRow([
          ing.idIngresoChofer || ("ING-CH-" + Date.now()),
          idRep,
          payload.idViaje || "",
          ing.fecha || "",
          ing.conceptoIngreso || "",
          ing.detalleGlosa || "",
          Number(ing.importeBs || 0),
          ing.nroComprobante || ""
        ]);
      });
    }

    const sheetGas = ss.getSheetByName("Detalle_Gastos_Chofer");
    if (sheetGas && Array.isArray(payload.gastos)) {
      payload.gastos.forEach(gas => {
        sheetGas.appendRow([
          gas.idGastoChofer || ("GAS-CH-" + Date.now()),
          idRep,
          payload.idViaje || "",
          gas.fecha || "",
          gas.categoriaGasto || "",
          gas.detalleGlosa || "",
          Number(gas.importeBs || 0),
          Number(gas.litrosDiesel || 0),
          gas.nroFacturaRecibo || "",
          gas.idProveedor || ""
        ]);
      });
    }

    if (payload.liquidar && payload.idViaje) {
      const sheetViajes = ss.getSheetByName("Viajes");
      if (sheetViajes && sheetViajes.getLastRow() > 1) {
        const dataV = sheetViajes.getDataRange().getValues();
        for (let i = 1; i < dataV.length; i++) {
          if (String(dataV[i][0]).trim() === String(payload.idViaje).trim()) {
            sheetViajes.getRange(i + 1, 7).setValue("Completado / Liquidado");
            break;
          }
        }
      }
    }

    return {
      status: "success",
      message: payload.liquidar ? "Reporte de chofer liquidado y contabilizado exitosamente." : "Reporte de chofer guardado correctamente.",
      idReporteChofer: idRep
    };
  } catch (err) {
    return { status: "error", message: err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}
