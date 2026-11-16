import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { toPng } from 'html-to-image';

/**
 * Formatea fechas homogéneamente en formato AAAA-MM-DD
 */
export function formatFechaHomogenea(fechaRaw?: string | null): string {
  if (!fechaRaw) return '-';
  const clean = String(fechaRaw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.substring(0, 10);
  }
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return clean || '-';
}

/**
 * Exporta Planilla de Cuentas por Cobrar (CxC) con encabezados limpios en MAYÚSCULAS,
 * campos numéricos puros (Float 2 decimales para autosumas nativas) y fila final de Totales.
 */
export function exportCxCToExcel(items: any[], fileName?: string): void {
  const today = new Date().toISOString().split('T')[0];
  const finalFileName = fileName || `Cuentas_Por_Cobrar_${today}.xlsx`;

  const headers = [
    'TIPO DEUDOR',
    'DEUDOR / SUCURSAL',
    'REF. VIAJE / MIC',
    'FECHA EMISIÓN',
    'FLETE TOTAL (BS)',
    'PAGADO (BS)',
    'SALDO PENDIENTE (BS)'
  ];

  let totalFlete = 0;
  let totalPagado = 0;
  let totalSaldo = 0;

  const dataRows = (items || []).map((item) => {
    let tipoStr = 'CLIENTE DIRECTO';
    if (item.tipoDeudor === 'AGENCIA_ORIGEN') tipoStr = 'AGENCIA ORIGEN';
    else if (item.tipoDeudor === 'AGENCIA_DESTINO') tipoStr = 'AGENCIA DESTINO';
    else if (typeof item.tipoDeudor === 'string') tipoStr = item.tipoDeudor.toUpperCase();

    const flete = Number(Number(item.fleteTotalBs || 0).toFixed(2));
    const pagado = Number(Number(item.pagadoBs || 0).toFixed(2));
    const saldo = Number(Number(item.saldoPendienteBs || 0).toFixed(2));

    totalFlete += flete;
    totalPagado += pagado;
    totalSaldo += saldo;

    return [
      tipoStr,
      String(item.nombreDeudor || ''),
      String(item.refViaje || item.nroManifiesto || '-'),
      formatFechaHomogenea(item.fechaEmision),
      flete,
      pagado,
      saldo
    ];
  });

  const totalsRow = [
    'TOTALES CONSOLIDADOS',
    '',
    '',
    '',
    Number(totalFlete.toFixed(2)),
    Number(totalPagado.toFixed(2)),
    Number(totalSaldo.toFixed(2))
  ];

  try {
    const aoa = [headers, ...dataRows, totalsRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Asignar anchos de columnas óptimos
    ws['!cols'] = [
      { wch: 20 },
      { wch: 34 },
      { wch: 22 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cuentas_Por_Cobrar');
    XLSX.writeFile(wb, finalFileName.endsWith('.xlsx') ? finalFileName : `${finalFileName}.xlsx`);
  } catch (error) {
    console.error('Error al exportar CxC a Excel (.xlsx), recurriendo a CSV:', error);
    // Fallback CSV estructurado con BOM
    const csvRows = [
      headers.join(';'),
      ...dataRows.map((r) =>
        r
          .map((v, i) => (i >= 4 ? String(v) : `"${String(v).replace(/"/g, '""')}"`))
          .join(';')
      ),
      totalsRow
        .map((v, i) => (i >= 4 ? String(v) : `"${String(v).replace(/"/g, '""')}"`))
        .join(';')
    ];
    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFileName.replace(/\.xlsx$/, '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Exporta Planilla de Cuentas por Pagar (CxP) con encabezados limpios en MAYÚSCULAS,
 * campos numéricos puros (Float 2 decimales para autosumas nativas) y fila final de Totales.
 */
export function exportCxPToExcel(items: any[], fileName?: string): void {
  const today = new Date().toISOString().split('T')[0];
  const finalFileName = fileName || `Cuentas_Por_Pagar_${today}.xlsx`;

  const headers = [
    'PROVEEDOR / RAZÓN SOCIAL',
    'RUBRO / CATEGORÍA',
    'REF. FACTURA / RECIBO',
    'PLACA CAMIÓN / VIAJE',
    'FECHA EMISIÓN',
    'MONTO COMPRA (BS)',
    'PAGADO (BS)',
    'SALDO PENDIENTE (BS)'
  ];

  let totalMonto = 0;
  let totalPagado = 0;
  let totalSaldo = 0;

  const dataRows = (items || []).map((item) => {
    const monto = Number(Number(item.montoTotalBs || 0).toFixed(2));
    const pagado = Number(Number(item.montoAbonadoBs || 0).toFixed(2));
    const saldo = Number(Number(item.saldoPendienteBs || 0).toFixed(2));

    totalMonto += monto;
    totalPagado += pagado;
    totalSaldo += saldo;

    return [
      String(item.nombreProveedor || ''),
      String(item.rubro || 'General'),
      String(item.nroFacturaBoleta || '-'),
      String(item.placaCamion || item.idViaje || '-'),
      formatFechaHomogenea(item.fechaEmision),
      monto,
      pagado,
      saldo
    ];
  });

  const totalsRow = [
    'TOTALES CONSOLIDADOS',
    '',
    '',
    '',
    '',
    Number(totalMonto.toFixed(2)),
    Number(totalPagado.toFixed(2)),
    Number(totalSaldo.toFixed(2))
  ];

  try {
    const aoa = [headers, ...dataRows, totalsRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 34 },
      { wch: 25 },
      { wch: 22 },
      { wch: 22 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 22 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cuentas_Por_Pagar');
    XLSX.writeFile(wb, finalFileName.endsWith('.xlsx') ? finalFileName : `${finalFileName}.xlsx`);
  } catch (error) {
    console.error('Error al exportar CxP a Excel (.xlsx), recurriendo a CSV:', error);
    const csvRows = [
      headers.join(';'),
      ...dataRows.map((r) =>
        r
          .map((v, i) => (i >= 5 ? String(v) : `"${String(v).replace(/"/g, '""')}"`))
          .join(';')
      ),
      totalsRow
        .map((v, i) => (i >= 5 ? String(v) : `"${String(v).replace(/"/g, '""')}"`))
        .join(';')
    ];
    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFileName.replace(/\.xlsx$/, '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Exporta un conjunto de datos estructurados a un archivo Excel (.xlsx)
 * con encabezados en mayúsculas y números con formato tabular.
 */
export function exportToExcel(
  data: Record<string, any>[],
  fileName: string = 'Reporte_TranspoDrive',
  sheetName: string = 'Datos'
): void {
  try {
    if (!data || data.length === 0) {
      console.warn('No hay datos disponibles para exportar a Excel.');
      return;
    }

    // Normalizar datos con encabezados en MAYÚSCULAS
    const formattedData = data.map((item) => {
      const row: Record<string, any> = {};
      Object.keys(item).forEach((key) => {
        const cleanKey = key.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
        const val = item[key];
        if (typeof val === 'number') {
          row[cleanKey] = Number(val.toFixed(2));
        } else {
          row[cleanKey] = val !== undefined && val !== null ? String(val) : '';
        }
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Ajustar ancho de columnas automáticamente
    const colWidths = Object.keys(formattedData[0] || {}).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...formattedData.map((r) => String(r[key] || '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

    const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(workbook, finalFileName);
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    // Fallback a CSV
    exportToCSV(data, fileName);
  }
}

/**
 * Fallback CSV export con BOM UTF-8 para apertura directa en Excel
 */
export function exportToCSV(
  data: Record<string, any>[],
  fileName: string = 'Reporte_TranspoDrive'
): void {
  try {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const upperHeaders = headers.map((h) => h.replace(/([A-Z])/g, ' $1').trim().toUpperCase());

    const rows = data.map((item) =>
      headers
        .map((h) => {
          const val = item[h];
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(';')
    );

    const csvContent = '\uFEFF' + [upperHeaders.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al exportar a CSV:', err);
  }
}

/**
 * Convierte un elemento o imagen en PDF utilizando jsPDF
 */
function buildPdfFromDataUrl(imgData: string, width: number, height: number, fileName: string): void {
  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (height * imgWidth) / width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  pdf.save(finalFileName);
}

/**
 * Captura un elemento del DOM y genera un PDF descargable.
 * Soporta colores oklch de Tailwind v4 mediante html2canvas-pro y html-to-image.
 */
export async function exportElementToPDF(
  elementOrId: HTMLElement | string,
  fileName: string = 'Documento_TranspoDrive.pdf'
): Promise<void> {
  const element = typeof elementOrId === 'string'
    ? document.getElementById(elementOrId)
    : elementOrId;

  if (!element) {
    console.warn('Elemento no encontrado para generar PDF, recurriendo a impresión de ventana.');
    window.print();
    return;
  }

  // Intento 1: html2canvas-pro (con soporte nativo para oklch, oklab, lab)
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    buildPdfFromDataUrl(imgData, canvas.width, canvas.height, fileName);
    return;
  } catch (canvasErr) {
    console.warn('html2canvas-pro encontró una excepción, probando fallback con html-to-image:', canvasErr);
  }

  // Intento 2: html-to-image (renderizado nativo SVG foreignObject que soporta todas las funciones de color modernas)
  try {
    const imgData = await toPng(element, {
      quality: 0.98,
      backgroundColor: '#ffffff',
      pixelRatio: 2
    });
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imgData;
    });
    buildPdfFromDataUrl(imgData, img.width || 800, img.height || 1000, fileName);
    return;
  } catch (fallbackErr) {
    console.error('Fallo también fallback html-to-image, recurriendo a window.print():', fallbackErr);
    window.print();
  }
}

/**
 * Manejador estándar de impresión
 */
export function handlePrintDocument(): void {
  window.print();
}
