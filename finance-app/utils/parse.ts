import { deterministicUuid } from './uuid';

export type InputRecord = { [key: string]: string };

export type ParsedItem = {
  Id: string;
  Group: string;
  GroupId: number;
  TransactionDate: string; // YYYY-MM-DD
  Description: string;
  Amount: number;
}

export function parseFinanceData(records: InputRecord[], filename: string): ParsedItem[] {

  // Process the uploaded file
  const filename_clean = (filename || '').replace(/\.csv$/, ""); // get the filename of the current statement

  // Determine what kind of dataset is under consideration
  const isBmoChequing = filename_clean.includes("BMO_CHEQUING");
  const isBmoCredit = filename_clean.includes("BMO_CREDIT");
  const isScotiaChequing = filename_clean.includes("SCOTIA_CHEQUING");

  // Use values appropriate for the kind of dataset
  const descriptionLabel = "Description";
  const dateLabel = (isBmoChequing) ? "Date Posted" : (isBmoCredit) ? "Transaction Date" : (isScotiaChequing) ? "Date" : "Date";
  const amountLabel = (isBmoChequing) ? "Transaction Amount" : (isBmoCredit) ? "Transaction Amount" : (isScotiaChequing) ? "Amount" : "Amount";

  // Determine the targeted month of the current dataset
  const monthMap: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEPT: 9, OCT: 10, NOV: 11, DEC: 12 }
  const currentMonth = Object.keys(monthMap).find(month => filename_clean.includes(month)) || '';

  function formatDate(value: InputRecord, dateLabel: string): string {
    const v = value[dateLabel] || '';
    if (isScotiaChequing) return v; 
    else return v.slice(0, 4) + "-" + v.slice(4, 6) + "-" + v.slice(6, 8);
  }

  function formatDescription(value: InputRecord, descriptionLabel: string): string {
    const v = value[descriptionLabel] || '';
    return v.trimEnd().slice(0, 80);
  }

  function formatAmount(value: InputRecord, amountLabel: string): number {
    const amt = Number(value[amountLabel] || '0');
    if (isBmoChequing) return amt;
    if (isBmoCredit) return -1 * amt;
    if (isScotiaChequing) return amt;
    return 0;
  }

  // Create a new, formatted object
  const mappedItems: ParsedItem[] =
    records.map((item: InputRecord) => {
      const parsed: ParsedItem = {
        Id: '',
        Group: filename_clean,
        GroupId: NaN,
        TransactionDate: formatDate(item, dateLabel),
        Description: formatDescription(item, descriptionLabel),
        Amount: formatAmount(item, amountLabel),
      }
      return parsed
    })
    .sort((a, b) => new Date(a.TransactionDate).getTime() - new Date(b.TransactionDate).getTime())
    .filter(item => {
      let date = new Date(item.TransactionDate + "T00:00:00");
      let month = date.getMonth() + 1;
      return month === monthMap[currentMonth];
    });

    // Add a deterministic UUID to each item
    let index = 0;
    mappedItems.forEach((item: ParsedItem) => {
      index++;
      item.Id = deterministicUuid(filename_clean + `_${index}`);
      item.GroupId = index;
    });

  return mappedItems;
}
