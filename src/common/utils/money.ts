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

export function toRupee(paisa: bigint | number | null | undefined): string | null {
  if (paisa === null || paisa === undefined) {
    return null;
  }
  const value = typeof paisa === 'bigint' ? paisa : BigInt(paisa);
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const rupees = absolute / HUNDRED;
  const fraction = (absolute % HUNDRED).toString().padStart(2, '0');
  return `${sign}${rupees.toString()}.${fraction}`;
}
