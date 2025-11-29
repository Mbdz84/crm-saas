export function calcPaymentTotals(payments: any[]) {
  let cashTotal = 0;
  let creditTotal = 0;
  let checkTotal = 0;
  let zelleTotal = 0;

  if (Array.isArray(payments)) {
    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      switch (p.payment) {
        case "cash": cashTotal += amt; break;
        case "credit": creditTotal += amt; break;
        case "check": checkTotal += amt; break;
        case "zelle": zelleTotal += amt; break;
      }
    }
  }

  return { cashTotal, creditTotal, checkTotal, zelleTotal };
}