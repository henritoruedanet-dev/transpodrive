import React, { useState } from 'react';
import { 
  Cloud, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  Database, 
  FileSpreadsheet, 
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../services/googleAppsScriptCode';

interface GoogleDriveConnectorViewProps {
  gasUrl: string;
  onSaveGasUrl: (url: string) => void;
  onPullData: () => Promise<{ success: boolean; message: string }>;
  onResetData: () => void;
  lastSyncTime: string;
  pendingCount: number;
}

export const GoogleDriveConnectorView: React.FC<GoogleDriveConnectorViewProps> = ({
  gasUrl,
  onSaveGasUrl,
  onPullData,
  onResetData,
  lastSyncTime,
  pendingCount
}) => {
  const [urlInput, setUrlInput] = useState<string>(gasUrl);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [testingPing, setTestingPing] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pulling, setPulling] = useState<boolean>(false);
  const [activeStepTab, setActiveStepTab] = useState<'pasos' | 'codigo' | 'estructura'>('pasos');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const handleSaveUrl = () => {
    onSaveGasUrl(urlInput);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([GOOGLE_APPS_SCRIPT_CODE], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestPing = async () => {
    if (!urlInput.trim()) {
      setPingResult({ success: false, message: 'Por favor ingrese la URL del Web App de Google Apps Script.' });
      return;
    }
    setTestingPing(true);
    setPingResult(null);
    try {
      const res = await fetch(`${urlInput.trim()}?action=ping`);
      const data = await res.json();
      if (data.status === 'success') {
        setPingResult({ success: true, message: `Conexión verificada exitosamente: ${data.message || 'OK'}` });
      } else {
        setPingResult({ success: false, message: data.message || 'Error en la respuesta del script.' });
      }
    } catch (e: any) {
      setPingResult({
        success: false,
        message: 'No se pudo conectar directamente vía fetch (habitual por redirecciones CORS de Google). Asegúrese de haber desplegado con acceso: "Cualquier usuario" (Anyone).'
      });
    } finally {
      setTestingPing(false);
    }
  };

  const handlePull = async () => {
    setPulling(true);
    const res = await onPullData();
    setPingResult(res);
    setPulling(false);
  };

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-10 h-10 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Conector Google Drive & Google Apps Script
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#64748b] mt-1 max-w-2xl">
              Configuración de la conexión bidireccional en tiempo real entre la aplicación y tu hoja de cálculo "Sistema_Transporte_Para_GoogleSheets".
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCode}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-[#e2e8f0] transition-all flex items-center space-x-1.5 min-h-[44px]"
            >
              {copiedCode ? <Check className="w-4 h-4 text-[#16a34a]" /> : <Copy className="w-4 h-4 text-[#1d4ed8]" />}
              <span>{copiedCode ? '¡Código Copiado!' : 'Copiar Code.gs'}</span>
            </button>
            <button
              onClick={handleDownloadCode}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all flex items-center space-x-1.5 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Code.gs</span>
            </button>
          </div>
        </div>
      </div>

      {/* URL Config Card */}
      <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-[#1d4ed8]" />
          Enlace Web App de Google Apps Script (URL de Producción)
        </h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
            className="flex-1 bg-[#f4f6fa] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none min-h-[44px]"
          />
          <button
            onClick={handleSaveUrl}
            className="bg-[#16a34a] hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shrink-0 min-h-[44px]"
          >
            Guardar URL
          </button>
          <button
            onClick={handleTestPing}
            disabled={testingPing}
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all border border-[#e2e8f0] shrink-0 min-h-[44px]"
          >
            {testingPing ? 'Probando...' : 'Probar Conexión'}
          </button>
          <button
            onClick={handlePull}
            disabled={pulling}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pulling ? 'animate-spin' : ''}`} />
            <span>{pulling ? 'Descargando...' : 'Recargar de Drive'}</span>
          </button>
        </div>

        {pingResult && (
          <div className={`p-3 rounded-xl text-xs border ${
            pingResult.success
              ? 'bg-emerald-50 border-emerald-200 text-[#16a34a]'
              : 'bg-amber-50 border-amber-200 text-[#d97706]'
          }`}>
            {pingResult.message}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between text-xs text-[#64748b] pt-3 border-t border-[#e2e8f0] gap-2">
          <span>Última sincronización: <strong className="text-slate-800">{lastSyncTime ? new Date(lastSyncTime).toLocaleString('es-BO') : 'Inicial'}</strong></span>
          <span>Elementos pendientes en cola: <strong className="text-[#d97706] font-bold">{pendingCount}</strong></span>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-slate-500 hover:text-[#dc2626] flex items-center gap-1 text-[11px] font-semibold transition-colors min-h-[36px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Datos de Demostración</span>
          </button>
        </div>
      </div>

      {/* Tabs: Guía de Despliegue vs Código Code.gs vs Estructura de Tablas */}
      <div className="flex items-center space-x-2 border-b border-[#e2e8f0] pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveStepTab('pasos')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all min-h-[44px] whitespace-nowrap ${
            activeStepTab === 'pasos'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white border border-[#e2e8f0] text-slate-600 hover:text-slate-900'
          }`}
        >
          1. Guía Paso a Paso (Google Drive & Móvil)
        </button>

        <button
          onClick={() => setActiveStepTab('codigo')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all min-h-[44px] whitespace-nowrap ${
            activeStepTab === 'codigo'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white border border-[#e2e8f0] text-slate-600 hover:text-slate-900'
          }`}
        >
          2. Ver Código Apps Script (Code.gs)
        </button>

        <button
          onClick={() => setActiveStepTab('estructura')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all min-h-[44px] whitespace-nowrap ${
            activeStepTab === 'estructura'
              ? 'bg-[#1d4ed8] text-white shadow-sm'
              : 'bg-white border border-[#e2e8f0] text-slate-600 hover:text-slate-900'
          }`}
        >
          3. Estructura de Tablas en Google Sheets
        </button>
      </div>

      {/* TAB 1: GUÍA PASO A PASO */}
      {activeStepTab === 'pasos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Paso 1 */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 space-y-3 shadow-sm">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-full bg-[#eff6ff] text-[#1d4ed8] font-black flex items-center justify-center text-sm">
                1
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Crear Hoja de Cálculo en Google Drive</h4>
            </div>
            <p className="text-slate-600">
              1. En tu Google Drive, crea una nueva <strong>Hoja de cálculo de Google</strong> llamada <code className="text-[#1d4ed8] bg-blue-50 px-1.5 py-0.5 rounded font-mono">Sistema_Transporte_Para_GoogleSheets</code>.
            </p>
            <p className="text-slate-600">
              2. No necesitas crear las pestañas a mano: el script tiene una función que las crea automáticamente con sus encabezados oficiales.
            </p>
          </div>

          {/* Paso 2 */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 space-y-3 shadow-sm">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-full bg-[#eff6ff] text-[#1d4ed8] font-black flex items-center justify-center text-sm">
                2
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Pegar el Código en Apps Script</h4>
            </div>
            <p className="text-slate-600">
              1. En la hoja de cálculo, ve al menú superior: <strong>Extensiones &gt; Apps Script</strong>.
            </p>
            <p className="text-slate-600">
              2. Borra el código existente en <code className="text-[#1d4ed8] bg-blue-50 px-1.5 py-0.5 rounded font-mono">Código.gs</code> y pega el código completo del archivo <strong>Code.gs</strong> (pestaña 2).
            </p>
            <p className="text-slate-600">
              3. En la barra de funciones de Apps Script, selecciona <code className="text-[#1d4ed8] font-bold">inicializarEstructuraBaseDatos</code> y haz clic en <strong>Ejecutar</strong>. Acepta los permisos de Google Drive.
            </p>
          </div>

          {/* Paso 3 */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 space-y-3 shadow-sm">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-full bg-emerald-50 text-[#16a34a] font-black flex items-center justify-center text-sm">
                3
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Desplegar como Aplicación Web (Web App)</h4>
            </div>
            <p className="text-slate-600">
              1. Haz clic en el botón azul <strong>Implementar &gt; Nueva implementación</strong> (Deploy &gt; New deployment).
            </p>
            <p className="text-slate-600">
              2. Tipo: Selecciona <strong>Aplicación web</strong> (Web app).
            </p>
            <p className="text-slate-600">
              3. <strong>Ejecutar como:</strong> <code className="text-slate-800 font-semibold">Yo (tu cuenta de Google)</code>.
            </p>
            <p className="text-slate-600">
              4. <strong>Quién tiene acceso:</strong> <strong className="text-[#16a34a]">Cualquier usuario (Anyone)</strong>. Esto permite que los choferes y encargados sincronicen sin iniciar sesión compleja.
            </p>
            <p className="text-slate-600">
              5. Copia la <strong>URL de la aplicación web</strong> (termina en <code className="text-[#1d4ed8] font-mono">/exec</code>) y pégala en la casilla superior de esta pantalla.
            </p>
          </div>

          {/* Paso 4 */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 space-y-3 shadow-sm">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-full bg-blue-50 text-[#1d4ed8] font-black flex items-center justify-center text-sm">
                4
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Instalar en Smartphone Android</h4>
            </div>
            <p className="text-slate-600">
              1. Abre esta aplicación desde Google Chrome en tu celular Android.
            </p>
            <p className="text-slate-600">
              2. Toca los tres puntos de Chrome (⋮) y selecciona <strong>"Agregar a la pantalla principal"</strong> o <strong>"Instalar aplicación"</strong>.
            </p>
            <p className="text-slate-600">
              3. La app quedará como un ícono nativo con pantalla completa. Funcionará con o sin señal de internet gracias al almacenamiento local y la cámara integrada.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: CÓDIGO CODE.GS */}
      {activeStepTab === 'codigo' && (
        <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-[#e2e8f0]">
            <span className="font-mono text-[#1d4ed8] font-bold">Code.gs • Apps Script Backend</span>
            <button
              onClick={handleCopyCode}
              className="text-xs text-slate-700 hover:text-slate-900 bg-[#f4f6fa] border border-[#e2e8f0] px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 min-h-[38px] font-bold"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-[#16a34a]" /> : <Copy className="w-3.5 h-3.5 text-[#1d4ed8]" />}
              <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-slate-800 overflow-x-auto max-h-[500px] p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl leading-relaxed select-all">
            {GOOGLE_APPS_SCRIPT_CODE}
          </pre>
        </div>
      )}

      {/* TAB 3: ESTRUCTURA DE TABLAS */}
      {activeStepTab === 'estructura' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 space-y-2 shadow-sm">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#1d4ed8]" />
              1. Pestaña [Viajes]
            </h4>
            <p className="text-slate-600">
              ID_Viaje, Placa_Camion, Chofer_Asignado, Fecha_Salida, Fecha_Llegada, Estado_Viaje, Observaciones_Ruta, Fletes_Manifiestos_Bs, Gastos_Ruta_Bs, Utilidad_Viaje_Bs, Margen_Pct.
            </p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 space-y-2 shadow-sm">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#1d4ed8]" />
              2. Pestaña [Manifiestos_Origen]
            </h4>
            <p className="text-slate-600">
              ID_Manifiesto, Nro_Manifiesto, ID_Viaje_Asignado, Sucursal_Origen, Fecha_Emision, Estado_Manifiesto, Flete_Total_Bs, Cobrado_Origen_Bs, Saldo_Cobrar_Destinos_Bs, Porc_Cobranza.
            </p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 space-y-2 shadow-sm">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#16a34a]" />
              3. Pestaña [Manifiestos_Destino]
            </h4>
            <p className="text-slate-600">
              ID_SubManifiesto, ID_Manifiesto_Padre, Nro_Manifiesto, Sucursal_Destino, Flete_Asignado_Bs, Pagado_Origen_Bs, Saldo_Inicial_Cobrar_Bs, Cobros_Realizados_Bs, Ingresos_Delivery_Otros_Bs, Gastos_Comisiones_Bs, Recaudacion_Neta_Caja_Bs, Saldo_Pendiente_Cliente_Bs, Estado_Liquidacion.
            </p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 space-y-2 shadow-sm">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#dc2626]" />
              4. Pestaña [Gastos_Ruta_Camion]
            </h4>
            <p className="text-slate-600">
              ID_Gasto_Ruta, ID_Viaje_Asignado, Placa_Camion, Fecha_Hora, Categoria_Gasto, Importe_Bs, Litros_Diesel, Caja_Cuenta_Utilizada, Nro_Factura_Boleta, Detalle_Gasto, Comprobante_Foto_URL.
            </p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 space-y-2 shadow-sm">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#d97706]" />
              5. Pestaña [Movimientos_Manif_Destino]
            </h4>
            <p className="text-slate-600">
              ID_Movimiento, ID_SubManifiesto, Sucursal, Tipo_Movimiento, Categoria_Concepto, Importe_Bs, Caja_Cuenta_Afectada, Fecha_Hora, Nro_Comprobante, Detalle_Operacion.
            </p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-4 space-y-2 shadow-sm">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#1d4ed8]" />
              6. Pestaña [Arqueo_Cajas]
            </h4>
            <p className="text-slate-600">
              Caja_Cuenta, Tipo_Caja, Ubicacion, Saldo_Inicial, Total_Cobrado, Total_Gastado, Saldo_Disponible.
            </p>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Reseteo sin window.confirm */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2e8f0] w-full sm:max-w-md rounded-t-[20px] sm:rounded-[18px] shadow-2xl p-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-[#dc2626] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">¿Restablecer Datos de Demostración?</h3>
                <p className="text-xs text-[#64748b]">
                  Se reemplazarán todos los viajes, manifiestos y transacciones locales por los valores iniciales del sistema.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-slate-700 hover:bg-slate-50 font-semibold min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setShowResetConfirm(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#dc2626] hover:bg-rose-700 text-white font-bold shadow-sm transition-all min-h-[44px] flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Sí, Restablecer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
