import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import {
  basisPointToPercent,
  percentToBasisPoint,
  roundPaisaToRupee,
  rupeeNumber,
} from '../src/common/utils/money.js';
import {
  billImageShouldRemove,
  nextBillNumber,
  purchaseImageShouldRemove,
} from '../src/modules/entries/common.js';
import {
  buildPurchaseExcelFilename,
  generatePurchaseExcel,
  purchaseSheetTitle,
} from '../src/modules/purchases/purchase-excel.js';

describe('entry contracts', () => {
  it('numbers bills the same way as the Java sequence', () => {
    expect(nextBillNumber(null)).toBe('INV-00001');
    expect(nextBillNumber('INV-00007')).toBe('INV-00008');
    expect(nextBillNumber('BILL-9')).toBe('INV-00001');
    expect(nextBillNumber('INV-12abc')).toBe('INV-00001');
  });

  it('keeps bill and purchase image removal rules different', () => {
    expect(billImageShouldRemove(null, 'a')).toBe(false);
    expect(billImageShouldRemove([], 'a')).toBe(true);
    expect(billImageShouldRemove(['a'], 'a')).toBe(false);
    expect(purchaseImageShouldRemove(null, 'a')).toBe(true);
    expect(purchaseImageShouldRemove([], 'a')).toBe(true);
    expect(purchaseImageShouldRemove(['a'], 'a')).toBe(false);
  });

  it('converts percents and rounded report totals', () => {
    expect(percentToBasisPoint(2.5)).toBe(250);
    expect(percentToBasisPoint(null)).toBe(0);
    expect(basisPointToPercent(250)).toBe(2.5);
    expect(rupeeNumber(1050n)).toBe(10.5);
    expect(roundPaisaToRupee(1050n)).toBe(11);
    expect(roundPaisaToRupee(1049n)).toBe(10);
    expect(roundPaisaToRupee(null)).toBe(0);
  });

  it('names the purchase workbook from the requested period', async () => {
    const rows = [{ date: '2026-10-17', staffName: 'Asha', supplierName: 'Mill', customerName: 'Shop', remarks: 'ok' }];
    const generatedAt = new Date(2026, 9, 17, 23, 13);
    expect(buildPurchaseExcelFilename(rows, '2026-10-01', '2026-10-17', generatedAt)).toBe(
      'Purchases_1Oct26_17Oct26_11-13PM.xlsx',
    );
    expect(purchaseSheetTitle({ fromDate: '2026-10-01', toDate: '2026-10-17' })).toBe(
      'PURCHASE DATA (01-10-2026 to 17-10-2026)',
    );
    const file = await generatePurchaseExcel(rows, '2026-10-01', '2026-10-17');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file);
    const sheet = workbook.getWorksheet('Purchase Data');
    expect(sheet?.getCell('A1').value).toBe('PURCHASE DATA (01-10-2026 to 17-10-2026)');
    expect(sheet?.getRow(2).values).toEqual([undefined, 'Date', 'Staff', 'Supplier', 'Customer', 'Remarks']);
    expect(sheet?.getCell('B3').value).toBe('Asha');
  });
});
