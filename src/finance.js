/** Fixed nominal APR, compounded monthly; payments occur at month end. */
export function monthlyPayment(principal, annualRate, years) {
  if (![principal, annualRate, years].every(Number.isFinite) || principal <= 0 || annualRate < 0 || years <= 0) throw new RangeError('Invalid mortgage inputs.');
  const months = Math.round(years * 12);
  if (months < 1 || months > 600) throw new RangeError('Term must be between one month and 50 years.');
  const rate = annualRate / 1200;
  return rate === 0 ? principal / months : principal * rate / -Math.expm1(-months * Math.log1p(rate));
}

export function amortize({ principal, annualRate, years, extra = 0 }) {
  if (!Number.isFinite(extra) || extra < 0) throw new RangeError('Extra payment cannot be negative.');
  const payment = monthlyPayment(principal, annualRate, years);
  const rate = annualRate / 1200;
  const schedule = [];
  let balance = principal;
  let totalInterest = 0;
  for (let month = 1; month <= Math.round(years * 12) && balance > 0.000001; month++) {
    const interest = balance * rate;
    const paid = Math.min(payment + extra, balance + interest);
    const principalPaid = paid - interest;
    balance = Math.max(0, balance - principalPaid);
    if (balance < 0.000001) balance = 0;
    totalInterest += interest;
    schedule.push({ month, payment: paid, principal: principalPaid, interest, balance, totalInterest });
  }
  return { payment, months: schedule.length, totalInterest, totalPaid: principal + totalInterest, schedule };
}

export function compareMortgage(inputs) {
  const baseline = amortize({ ...inputs, extra: 0 });
  const accelerated = amortize(inputs);
  return { baseline, accelerated, savedInterest: Math.max(0, baseline.totalInterest - accelerated.totalInterest), savedMonths: baseline.months - accelerated.months };
}

export function scheduleCSV(result) {
  const header = 'Month,Payment,Principal,Interest,Remaining balance,Cumulative interest';
  return [header, ...result.schedule.map(row => [row.month, row.payment.toFixed(2), row.principal.toFixed(2), row.interest.toFixed(2), row.balance.toFixed(2), row.totalInterest.toFixed(2)].join(','))].join('\r\n');
}
