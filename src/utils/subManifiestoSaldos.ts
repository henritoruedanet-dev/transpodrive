import { ManifiestoDestino } from '../types';

export interface SaldosSubManifiestoCalculados {
  fleteTotal: number;
  pagadoOrigen: number;
  porPagarDestino: number;
  cobrosRealizados: number;
  saldoPendienteCliente: number;
  saldoPendienteAgencia: number;
  saldoPendienteAgenciaDestino: number;
  saldoPendienteAgenciaOrigen: number;
  esResponsableAgencia: boolean;
  esResponsableCliente: boolean;
  responsableTexto: string;
  responsableTipo: 'CLIENTE' | 'AGENCIA';
  nombreResponsable: string;
  estaLiquidadoTotal: boolean;
  estadoBadgeTexto: string;
}

/**
 * Calcula y separa de forma totalmente independiente los saldos pendientes
 * para Cliente Directo vs. Agencia / Sucursal para cualquier Sub-Manifiesto.
 * 
 * Reglas de Negocio:
 * 1. El Flete Total = Pagado en Origen + Por Pagar en Destino
 * 2. Si el responsable en destino es "Cliente" (o tipoDeudor === 'CLIENTE'):
 *    - El saldo pendiente en destino recae exclusivamente sobre el Cliente.
 *    - La agencia intermediaria no asume esta cuenta por cobrar en destino (Saldo Agencia = 0 Bs).
 * 3. Si el responsable en destino es "Agencia" (o tipoDeudor === 'AGENCIA' o modalidad de cobro por agencia):
 *    - El saldo pendiente en destino recae exclusivamente sobre la Agencia / Sucursal de destino (debe rendirlo).
 *    - El cliente final no figura con deuda directa de rendición (Saldo Cliente = 0 Bs).
 * 4. Pagos y amortizaciones recibidas:
 *    - Se restan únicamente al saldo de la entidad responsable (cliente o agencia) que corresponda.
 * 5. Si en origen la agencia retiene o tiene crédito pendiente de rendir a central:
 *    - Corresponde a la AGENCIA DE ORIGEN (Desglose 1), sin inflar la cuenta de la agencia de destino (Desglose 2).
 */
export function calcularSaldosSubManifiesto(sub: ManifiestoDestino): SaldosSubManifiestoCalculados {
  const pagadoOrigen = Number(sub.pagadoOrigenBs || 0);
  const porPagarDestino = Number(
    sub.porPagarDestinoBs !== undefined 
      ? sub.porPagarDestinoBs 
      : (sub.saldoInicialCobrarBs || 0)
  );
  const fleteTotal = Number(sub.fleteAsignadoBs) || (pagadoOrigen + porPagarDestino);
  const cobrosRealizados = Number(sub.cobrosRealizadosBs || 0);

  // 1. Determinar si la responsabilidad de destino recae sobre Agencia o Cliente
  const tipoRespDestinoLower = String(
    sub.tipoResponsableDestino || 
    sub.responsableDestinoTipo || 
    sub.tipoDeudor || 
    ''
  ).toLowerCase().trim();

  const esAgencia = 
    tipoRespDestinoLower === 'agencia' ||
    tipoRespDestinoLower === 'sucursal' ||
    Boolean(sub.agenciaDestinoResponsable) ||
    Boolean(sub.modalidadCobroDestino && sub.modalidadCobroDestino.toLowerCase().includes('agencia')) ||
    (typeof sub.destinatario === 'string' && sub.destinatario.toLowerCase().includes('agencia')) ||
    (Boolean(sub.sucursalDestino) && sub.modalidadCobroDestino !== 'Cobro Directo Empresa / Cliente' && tipoRespDestinoLower !== 'cliente');

  // 2. Saldo neto por recaudar en destino (Flete por pagar destino - cobros realizados)
  const saldoDestinoNeto = Math.max(0, porPagarDestino - cobrosRealizados);

  let saldoPendienteCliente = 0;
  let saldoPendienteAgenciaDestino = 0;

  if (esAgencia) {
    saldoPendienteAgenciaDestino = saldoDestinoNeto;
  } else {
    saldoPendienteCliente = saldoDestinoNeto;
  }

  // 3. Evaluar crédito / retención en Origen si la agencia de origen debe rendir flete cobrado en salida
  const tipoRespOrigenLower = String(
    sub.tipoResponsableOrigen || 
    sub.responsableOrigenTipo || 
    ''
  ).toLowerCase().trim();

  const esCreditoAgenciaOrigen = 
    (tipoRespOrigenLower === 'agencia' || sub.metodoCobroOrigen === 'Por Liquidar / Crédito Agencia') &&
    sub.estadoLiquidacionAgencia !== 'Liquidado a Central';

  const saldoPendienteAgenciaOrigen = (esCreditoAgenciaOrigen && pagadoOrigen > 0) ? pagadoOrigen : 0;

  if (tipoRespOrigenLower === 'cliente' && sub.creditoOrigenBs) {
    saldoPendienteCliente += Number(sub.creditoOrigenBs);
  }

  // La agencia de destino únicamente asume el saldo por cobrar y rendir en destino
  const saldoPendienteAgencia = saldoPendienteAgenciaDestino;

  const estaLiquidadoTotal = (saldoPendienteCliente <= 0 && saldoPendienteAgencia <= 0) ||
    sub.estadoLiquidacion === 'Liquidado' ||
    sub.estadoLiquidacion === 'Liquidado en Sucursal' ||
    sub.estadoCobranzaDestino === 'Cobrado / Liquidado a Empresa';

  const esParcial = !estaLiquidadoTotal && (cobrosRealizados > 0 || pagadoOrigen > 0);
  const estadoBadgeTexto = estaLiquidadoTotal 
    ? 'Liquidado' 
    : esParcial 
    ? 'Pendiente Parcial' 
    : 'Por Cobrar';

  const responsableTexto = esAgencia
    ? (sub.agenciaDestinoResponsable || sub.sucursalDestino ? `Agencia ${sub.agenciaDestinoResponsable || sub.sucursalDestino}` : 'Agencia / Sucursal')
    : (sub.destinatario || 'Cliente Directo');

  return {
    fleteTotal,
    pagadoOrigen,
    porPagarDestino,
    cobrosRealizados,
    saldoPendienteCliente: parseFloat(saldoPendienteCliente.toFixed(2)),
    saldoPendienteAgencia: parseFloat(saldoPendienteAgencia.toFixed(2)),
    saldoPendienteAgenciaDestino: parseFloat(saldoPendienteAgenciaDestino.toFixed(2)),
    saldoPendienteAgenciaOrigen: parseFloat(saldoPendienteAgenciaOrigen.toFixed(2)),
    esResponsableAgencia: esAgencia,
    esResponsableCliente: !esAgencia,
    responsableTexto,
    responsableTipo: esAgencia ? 'AGENCIA' : 'CLIENTE',
    nombreResponsable: responsableTexto,
    estaLiquidadoTotal,
    estadoBadgeTexto
  };
}
