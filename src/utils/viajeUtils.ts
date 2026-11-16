import { Viaje } from '../types';

/**
 * Genera automáticamente el próximo código de identificación de viaje único y secuencial.
 * Formato: VJ-YYYY-NNN (e.g. VJ-2026-001, VJ-2026-002, VJ-2026-004...)
 */
export function generarProximoIdViaje(viajes: Viaje[] = []): string {
  const anioActual = new Date().getFullYear();
  const prefijoAnio = `VJ-${anioActual}-`;
  
  let maxSecuencia = 0;

  viajes.forEach(v => {
    if (!v || !v.idViaje) return;
    
    // Formato estándar: VJ-YYYY-NNN
    const matchEstandar = v.idViaje.match(/^VJ-(\d{4})-(\d+)$/i);
    if (matchEstandar) {
      const anio = parseInt(matchEstandar[1], 10);
      const sec = parseInt(matchEstandar[2], 10);
      if (anio === anioActual && sec > maxSecuencia) {
        maxSecuencia = sec;
      }
    } else {
      // Otros formatos: VJ-NNN
      const matchSimple = v.idViaje.match(/^VJ-(\d+)$/i);
      if (matchSimple) {
        const sec = parseInt(matchSimple[1], 10);
        if (sec > maxSecuencia) {
          maxSecuencia = sec;
        }
      }
    }
  });

  const siguienteSecuencia = maxSecuencia + 1;
  return `${prefijoAnio}${String(siguienteSecuencia).padStart(3, '0')}`;
}
