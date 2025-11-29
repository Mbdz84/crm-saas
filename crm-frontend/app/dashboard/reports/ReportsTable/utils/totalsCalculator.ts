export function calculateTotals(rows: any[]) {
  const sum = {
    totalAmount: 0,

    // NEW PAYMENT TOTALS
    cashTotal: 0,
    creditTotal: 0,
    checkTotal: 0,
    zelleTotal: 0,

    techParts: 0,
    leadParts: 0,
    companyParts: 0,
    totalParts: 0,
    ccFee: 0,
    addFee: 0,
    adjustedTotal: 0,
    techProfit: 0,
    leadProfit: 0,
    companyProfit: 0,
    techBalance: 0,
    leadBalance: 0,
    companyBalance: 0,
    sumCheck: 0,
  };

  rows.forEach((job: any) => {
    const c = job.closing;
    if (!c) return;

    sum.totalAmount += Number(c.totalAmount || 0);

    // 🔥 FIX: Calculate from c.payments, NOT c.cashTotal (which doesn't exist)
    if (Array.isArray(c.payments)) {
      c.payments.forEach((p: any) => {
        const amt = Number(p.amount) || 0;
        if (p.payment === "cash") sum.cashTotal += amt;
        if (p.payment === "credit") sum.creditTotal += amt;
        if (p.payment === "check") sum.checkTotal += amt;
        if (p.payment === "zelle") sum.zelleTotal += amt;
      });
    }

    sum.techParts += Number(c.techParts || 0);
    sum.leadParts += Number(c.leadParts || 0);
    sum.companyParts += Number(c.companyParts || 0);
    sum.totalParts += Number(c.totalParts || 0);
    sum.ccFee += Number(c.totalCcFee || 0);
    sum.addFee += Number(c.leadAdditionalFee || 0);
    sum.adjustedTotal += Number(c.adjustedTotal || 0);
    sum.techProfit += Number(c.techProfit || 0);
    sum.leadProfit += Number(c.leadProfit || 0);
    sum.companyProfit += Number(c.companyProfitDisplay || 0);
    sum.techBalance += Number(c.techBalance || 0);
    sum.leadBalance += Number(c.leadBalance || 0);
    sum.companyBalance += Number(c.companyBalance || 0);
    sum.sumCheck += Number(c.sumCheck || 0);
  });

  return sum;
}
