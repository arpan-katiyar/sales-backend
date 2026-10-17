import ExcelJS from 'exceljs';

import { AppError } from '../../common/errors/app-error.js';

export type PurchaseExcelRow = {
  date: string | null;
  staffName: string | null;
  supplierName: string | null;
  customerName: string | null;
  remarks: string | null;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatPeriod(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) {
    return iso;
  }
  return `${day}${MONTHS[month - 1]}${String(year).slice(2)}`;
}

export function formatTitleDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}-${month}-${year}`;
}

export function formatGeneratedAt(now: Date): string {
  const hours = now.getHours();
  const hour = hours % 12 || 12;
  const minute = String(now.getMinutes()).padStart(2, '0');
  const suffix = hours < 12 ? 'AM' : 'PM';
  return `${hour}-${minute}${suffix}`;
}

export function purchaseReportPeriod(
  rows: PurchaseExcelRow[],
  fromDate: string | null,
  toDate: string | null,
): { fromDate: string | null; toDate: string | null } {
  let minDate: string | null = null;
  let maxDate: string | null = null;
  for (const row of rows) {
    if (!row.date) {
      continue;
    }
    if (minDate == null || row.date < minDate) {
      minDate = row.date;
    }
    if (maxDate == null || row.date > maxDate) {
      maxDate = row.date;
    }
  }
  return {
    fromDate: fromDate ?? minDate,
    toDate: toDate ?? maxDate,
  };
}

export function purchaseSheetTitle(period: { fromDate: string | null; toDate: string | null }): string {
  if (period.fromDate && period.toDate) {
    return `PURCHASE DATA (${formatTitleDate(period.fromDate)} to ${formatTitleDate(period.toDate)})`;
  }
  if (period.fromDate) {
    return `PURCHASE DATA (${formatTitleDate(period.fromDate)})`;
  }
  if (period.toDate) {
    return `PURCHASE DATA (${formatTitleDate(period.toDate)})`;
  }
  return 'PURCHASE DATA';
}

export function buildPurchaseExcelFilename(
  rows: PurchaseExcelRow[],
  fromDate: string | null,
  toDate: string | null,
  now = new Date(),
): string {
  const period = purchaseReportPeriod(rows, fromDate, toDate);
  const generatedAt = formatGeneratedAt(now);
  if (period.fromDate && period.toDate) {
    return `Purchases_${formatPeriod(period.fromDate)}_${formatPeriod(period.toDate)}_${generatedAt}.xlsx`;
  }
  if (period.fromDate) {
    return `Purchases_${formatPeriod(period.fromDate)}_${generatedAt}.xlsx`;
  }
  if (period.toDate) {
    return `Purchases_${formatPeriod(period.toDate)}_${generatedAt}.xlsx`;
  }
  return `Purchases_${generatedAt}.xlsx`;
}

export async function generatePurchaseExcel(
  rows: PurchaseExcelRow[],
  fromDate: string | null,
  toDate: string | null,
): Promise<Buffer> {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Purchase Data');
    const period = purchaseReportPeriod(rows, fromDate, toDate);
    const title = purchaseSheetTitle(period);
    sheet.mergeCells(1, 1, 1, 5);
    const titleRow = sheet.getRow(1);
    titleRow.height = 28;
    for (let column = 1; column <= 5; column += 1) {
      const cell = titleRow.getCell(column);
      if (column === 1) {
        cell.value = title;
      }
      cell.font = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FF0000FF' } };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
    const headers = ['Date', 'Staff', 'Supplier', 'Customer', 'Remarks'];
    const headerRow = sheet.getRow(2);
    headerRow.height = 22;
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder();
    });
    rows.forEach((row, index) => {
      const excelRow = sheet.getRow(index + 3);
      const dateCell = excelRow.getCell(1);
      if (row.date) {
        const [year, month, day] = row.date.split('-').map(Number);
        dateCell.value = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
      }
      dateCell.numFmt = 'dd-mm-yyyy';
      dateCell.font = bodyFont();
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
      dateCell.border = thinBorder();
      setText(excelRow, 2, row.staffName);
      setText(excelRow, 3, row.supplierName);
      setText(excelRow, 4, row.customerName);
      const remarks = excelRow.getCell(5);
      remarks.value = row.remarks ?? '';
      remarks.font = bodyFont();
      remarks.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      remarks.border = thinBorder();
    });
    [14, 18, 24, 24, 32].forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });
    sheet.views = [{ state: 'frozen', ySplit: 2 }];
    sheet.pageSetup.fitToPage = true;
    sheet.pageSetup.fitToWidth = 1;
    sheet.pageSetup.fitToHeight = 0;
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(1037, 'Failed to generate Excel file');
  }
}

function bodyFont(): Partial<ExcelJS.Font> {
  return { name: 'Calibri', size: 11 };
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const thin: ExcelJS.Border = { style: 'thin', color: { argb: 'FF000000' } };
  return { top: thin, bottom: thin, left: thin, right: thin };
}

function setText(row: ExcelJS.Row, column: number, value: string | null): void {
  const cell = row.getCell(column);
  cell.value = value ?? '';
  cell.font = bodyFont();
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  cell.border = thinBorder();
}
