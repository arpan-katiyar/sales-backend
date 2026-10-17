const HUNDRED = 100n;

export function toPaisa(amount: string | number | null | undefined): bigint {
  if (amount === null || amount === undefined || amount === '') {
    return 0n;
  }
  const [whole = '0', fraction = ''] = String(amount).trim().split('.');
  const sign = whole.startsWith('-') ? -1n : 1n;
  const rupees = BigInt(whole.replace('-', '') || '0');
  const padded = `${fraction}00`.slice(0, 3);
  const digits = BigInt(padded.slice(0, 2));
  const roundUp = Number(padded[2] ?? '0') >= 5 ? 1n : 0n;
  return sign * (rupees * HUNDRED + digits + roundUp);
}

export function toRupee(paisa: bigint | number | string | null | undefined): string | null {
  if (paisa === null || paisa === undefined || paisa === '') {
    return null;
  }
  const value = typeof paisa === 'bigint' ? paisa : BigInt(paisa);
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const rupees = absolute / HUNDRED;
  const fraction = (absolute % HUNDRED).toString().padStart(2, '0');
  return `${sign}${rupees.toString()}.${fraction}`;
}

export function rupeeNumber(paisa: bigint | number | string | null | undefined): number | null {
  const rupee = toRupee(paisa);
  return rupee === null ? null : Number(rupee);
}

export function percentToBasisPoint(percent: string | number | null | undefined): number {
  return Number(toPaisa(percent));
}

export function basisPointToPercent(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Number(toRupee(value));
}

export function roundPaisaToRupee(paisa: bigint | number | string | null | undefined): number {
  if (paisa === null || paisa === undefined || paisa === '') {
    return 0;
  }
  const value = typeof paisa === 'bigint' ? paisa : BigInt(paisa);
  const sign = value < 0n ? -1n : 1n;
  const absolute = value < 0n ? -value : value;
  const whole = absolute / HUNDRED;
  const fraction = absolute % HUNDRED;
  const rounded = fraction >= 50n ? whole + 1n : whole;
  return Number(sign * rounded);
}
