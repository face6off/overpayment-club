import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyPayment, amortize, compareMortgage, scheduleCSV } from '../src/finance.js';

const close = (actual, expected, epsilon = 0.01) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≈ ${expected}`);
test('matches the standard 30-year $100k mortgage at 6%', () => close(monthlyPayment(100000, 6, 30), 599.550525));
test('zero interest uses simple division and creates no interest', () => {
  const result = amortize({ principal: 120000, annualRate: 0, years: 10 });
  assert.equal(result.payment, 1000); assert.equal(result.months, 120); assert.equal(result.totalInterest, 0);
  assert.equal(result.schedule.at(-1).balance, 0);
});
test('zero extra produces the identical plan', () => {
  const result = compareMortgage({ principal: 320000, annualRate: 5.25, years: 25, extra: 0 });
  assert.equal(result.savedInterest, 0); assert.equal(result.savedMonths, 0);
});
test('extra principal saves interest and payment counts', () => {
  const result = compareMortgage({ principal: 320000, annualRate: 5.25, years: 25, extra: 250 });
  assert.equal(result.baseline.months, 300);
  assert.ok(result.savedMonths > 0); assert.ok(result.savedInterest > 0);
  assert.ok(result.accelerated.months < result.baseline.months);
});
test('ledger conserves principal and interest without negative balances', () => {
  for (const annualRate of [0, 0.01, 5.25, 25]) {
    const result = amortize({ principal: 321456.78, annualRate, years: 25, extra: 287.36 });
    close(result.schedule.reduce((sum, row) => sum + row.principal, 0), 321456.78);
    close(result.schedule.reduce((sum, row) => sum + row.payment, 0), result.totalPaid);
    assert.equal(result.schedule.at(-1).balance, 0);
    assert.ok(result.schedule.every(row => row.balance >= 0));
  }
});
test('the final payment is capped instead of overcharging', () => {
  const result = amortize({ principal: 1000, annualRate: 12, years: 1, extra: 10000 });
  assert.equal(result.months, 1); close(result.schedule[0].payment, 1010);
});
test('higher extras never increase interest or term', () => {
  let previous = amortize({ principal: 300000, annualRate: 6, years: 30 });
  for (const extra of [10, 100, 500, 2000, 10000]) {
    const current = amortize({ principal: 300000, annualRate: 6, years: 30, extra });
    assert.ok(current.totalInterest <= previous.totalInterest);
    assert.ok(current.months <= previous.months); previous = current;
  }
});
test('rejects invalid values and impossible terms', () => {
  for (const args of [[0, 5, 25], [1000, -1, 25], [1000, 5, 0], [1000, Infinity, 25], [1000, 5, 51]]) assert.throws(() => monthlyPayment(...args), RangeError);
  assert.throws(() => amortize({ principal: 1000, annualRate: 5, years: 1, extra: -1 }), RangeError);
});
test('CSV has a header, one row per payment and a zero final balance', () => {
  const result = amortize({ principal: 1200, annualRate: 0, years: 1 });
  const lines = scheduleCSV(result).split('\r\n');
  assert.equal(lines.length, 13); assert.equal(lines[0].split(',').length, 6);
  assert.equal(lines.at(-1), '12,100.00,100.00,0.00,0.00,0.00');
});
