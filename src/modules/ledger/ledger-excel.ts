import ExcelJS from 'exceljs';

import { AppError } from '../../common/errors/app-error.js';
import { roundPaisaToRupee } from '../../common/utils/money.js';
import type { LedgerResult } from './ledger.service.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function generateLedgerExcel(ledger: LedgerResult): Promise<Buffer> {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ledger');
    writeMerged(sheet, 1, 'LEDGER REPORT', { name: 'Calibri', bold: true, size: 16, color: { argb: 'FF0000FF' } }, 32);
    writeMerged(
      sheet,
      2,
      `Generated On: ${formatGenerated(new Date())}`,
      { name: 'Calibri', size: 11 },
      18,
    );
    writeSection(sheet, 4, 'Party Information', 2);
    const partyRows: Array<[string, string]> = [
      ['Party Name', ledger.party.name ?? ''],
      ['Phone', ledger.party.phone ?? '-'],
      ['Email', ledger.party.email ?? '-'],
      ['Gst No', ledger.party.gstNo ?? '-'],
      ['Address', ledger.party.address ?? '-'],
      ['Ledger Type', ledger.ledgerType],
    ];
    partyRows.forEach((field, index) => {
      const row = sheet.getRow(5 + index);
      row.getCell(2).value = field[0];
      row.getCell(2).font = { bold: true, size: 11 };
      row.getCell(3).value = field[1];
      sheet.mergeCells(5 + index, 3, 5 + index, 6);
    });
    const headerRowNumber = 12;
    writeSection(sheet, headerRowNumber, 'Transaction Details', 1);
    const headers = ['Date', 'Invoice No', 'Particular', 'Debit', 'Credit', 'Running Balance'];
    const header = sheet.getRow(headerRowNumber + 1);
    header.height = 24;
    headers.forEach((title, index) => {
      const cell = header.getCell(index + 1);
      cell.value = title;
      cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    const visible = ledger.entries.filter((entry) => entry.particular.trim() !== '');
    visible.forEach((entry, index) => {
      const row = sheet.getRow(headerRowNumber + 2 + index);
      const dateCell = row.getCell(1);
      if (entry.date) {
        const [year, month, day] = entry.date.split('-').map(Number);
        dateCell.value = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
      }
      dateCell.numFmt = 'dd-mmm-yyyy';
      row.getCell(2).value = entry.invoiceNo ?? '';
      row.getCell(3).value = entry.particular;
      row.getCell(4).value = rounded(entry.debit);
      row.getCell(5).value = rounded(entry.credit);
      row.getCell(6).value = rounded(entry.runningBalance ?? 0);
      for (let column = 4; column <= 6; column += 1) {
        row.getCell(column).numFmt = '#,##0';
        row.getCell(column).alignment = { horizontal: 'right' };
      }
    });
    const total = sheet.getRow(headerRowNumber + 2 + visible.length);
    total.height = 20;
    total.getCell(3).value = 'Total';
    total.getCell(3).font = { bold: true, size: 10 };
    total.getCell(4).value = rounded(ledger.totalDebit);
    total.getCell(5).value = rounded(ledger.totalCredit);
    total.getCell(6).value = rounded(ledger.balance);
    for (let column = 3; column <= 6; column += 1) {
      total.getCell(column).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      if (column > 3) {
        total.getCell(column).numFmt = '#,##0';
      }
    }
    [13, 18, 24, 15, 15, 18].forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });
    sheet.pageSetup.fitToPage = true;
    sheet.pageSetup.fitToWidth = 1;
    sheet.pageSetup.fitToHeight = 0;
    return Buffer.from(await workbook.xlsx.writeBuffer());
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(1037, 'Failed to generate Excel file');
  }
}

function rounded(value: number): number {
  return roundPaisaToRupee(BigInt(Math.round(value * 100)));
}

function formatGenerated(now: Date): string {
  return `${String(now.getDate()).padStart(2, '0')}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
}

function writeMerged(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  value: string,
  font: Partial<ExcelJS.Font>,
  height: number,
): void {
  sheet.mergeCells(rowNumber, 1, rowNumber, 6);
  const row = sheet.getRow(rowNumber);
  row.height = height;
  row.getCell(1).value = value;
  row.getCell(1).font = font;
}

function writeSection(sheet: ExcelJS.Worksheet, rowNumber: number, value: string, startColumn: number): void {
  sheet.mergeCells(rowNumber, startColumn, rowNumber, 6);
  const row = sheet.getRow(rowNumber);
  row.height = 20;
  row.getCell(startColumn).value = value;
  row.getCell(startColumn).font = { bold: true, size: 12 };
}
