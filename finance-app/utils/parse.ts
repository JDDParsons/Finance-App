import { deterministicUuid } from './uuid';

export function parseFinanceData(records: any[], filename: string) {
  // Process the uploaded file
  const data = records; // get all input items
  const filename_clean = (filename).replace(/\.csv$/, ""); // get the filename of the current statement
  const items = data.slice(1); // get the transaction data for the current item in the current statement;

  // Determine what kind of dataset is under consideration
  const isBmoChequing = filename_clean.includes("BMO_CHEQUING");
  const isBmoCredit = filename_clean.includes("BMO_CREDIT");

  // Use values appropriate for the kind of dataset
  const descriptionLabel = "Description";
  const dateLabel = (isBmoChequing) ? "Date Posted" : (isBmoCredit) ? "Transaction Date" : "";
  const amountLabel = (isBmoChequing) ? "Transaction Amount" : (isBmoCredit) ? "Transaction Amount" : "";
  const amountAdded = (value, label) => (isBmoCredit) ? keepAmountIfNegative(value, label) 
    : (isBmoChequing) ? keepAmountIfPositive(value, label) 
    : "";
  const amountDeducted = (value, label) => (isBmoCredit) ? keepAmountIfPositive(value, label) 
    : (isBmoChequing) ? keepAmountIfNegative(value, label) 
    : "";

  // Determine the targeted month of the current dataset
  /** @type {Record<string, number>} */
  const monthMap = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEPT: 9, OCT: 10, NOV: 11, DEC: 12 }
  const currentMonth = String(Object.keys(monthMap).filter(month => filename_clean.includes(month))[0]);

  function formatDate(value, dateLabel) {
    return (value[dateLabel]).slice(0, 4) + "-" + (value[dateLabel]).slice(4, 6) + "-" + (value[dateLabel]).slice(6, 8);
  } 

  function formatDescription(value, descriptionLabel) {
    return (value[descriptionLabel]).trimEnd().slice(0,80);
  }

  function keepAmountIfNegative(value, amountLabel) {
    return (Number(value[amountLabel]) < 0) ? Math.abs(Number(value[amountLabel])) : "";
  }

  function keepAmountIfPositive(value, amountLabel) {
    return (Number(value[amountLabel]) > 0) ? Math.abs(Number(value[amountLabel])) : "";
  }


  // Create a new, formatted object
  const mappedItems =
    items.map(item => {
      return {
        "Id": '',
        "TextId": '',
        "TransactionDate": formatDate(item, dateLabel),
        "Description": formatDescription(item, descriptionLabel),
        "AmountAdded": amountAdded(item, amountLabel),
        "AmountDeducted": amountDeducted(item, amountLabel),
        "Category": ""
      }
    })
    .sort((a, b) => new Date(a.TransactionDate).getTime() - new Date(b.TransactionDate).getTime())
    .filter(item => {
      let date = new Date(item.TransactionDate + "T00:00:00");
      let month = date.getMonth() + 1;
      return month === monthMap[currentMonth];
    });

    // Add a deterministic UUID to each item
    let index = 0;
    mappedItems.forEach(item => {
      index++;
      item.Id = deterministicUuid(filename_clean + `_${index}`);
      item.TextId = filename_clean + `_${index}`;
    });

  return mappedItems;
}
