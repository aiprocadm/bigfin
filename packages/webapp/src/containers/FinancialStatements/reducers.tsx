
export const purchasesByItemsReducer = (sheet: any) => {
  const results = [];

  if (sheet.items) {
    sheet.items.forEach((item: any) => {
      results.push(item);
    });
  }
  if (sheet.total) {
    results.push({
      row_types: 'total',
      ...sheet.total,
    });
  }
  return results;
};
