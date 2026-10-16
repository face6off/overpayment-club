import { compareMortgage, scheduleCSV } from './finance.js';

const $ = selector => document.querySelector(selector);
const currency = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const preciseCurrency = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const duration = months => {
  const years = Math.floor(months / 12), rest = months % 12;
  return [years ? `${years} yr` : '', rest ? `${rest} mo` : ''].filter(Boolean).join(' ') || '0 mo';
};
const defaultInputs = { principal: 320000, annualRate: 5.25, years: 25, extra: 250 };
const keys = { inputs: 'oc-inputs-v1', scenarios: 'oc-scenarios-v1' };
let result, inputs, scenarios = [], toastTimer;
let storageAvailable = true;

function validInputs(value) {
  return value && Number.isFinite(value.principal) && value.principal >= 1000 && value.principal <= 10000000 && Number.isFinite(value.annualRate) && value.annualRate >= 0 && value.annualRate <= 25 && Number.isInteger(value.years) && value.years >= 1 && value.years <= 40 && Number.isFinite(value.extra) && value.extra >= 0 && value.extra <= 10000;
}
function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function persist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { storageAvailable = false; return false; }
}
function notify(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3400);
}
function loadInputs(values) {
  $('#principal').value = values.principal;
  $('#rate').value = values.annualRate;
  $('#years').value = values.years;
  $('#extra').value = values.extra;
  document.querySelectorAll('.cut').forEach(button => button.setAttribute('aria-pressed', 'false'));
  update();
}
function setEnabled(enabled) {
  $('#save-scenario').disabled = !enabled;
  $('#export-csv').disabled = !enabled;
}
function update() {
  if (!$('#mortgage-form').checkValidity()) {
    $('#input-error').textContent = 'Check your numbers: balance $1,000 to $10M, rate 0 to 25%, term 1 to 40 whole years, extra $0 to $10,000. Dollar amounts allow two decimal places.';
    setEnabled(false); return false;
  }
  const baseExtra = Number($('#extra').value);
  const addOns = [...document.querySelectorAll('.cut[aria-pressed=true]')].reduce((sum, button) => sum + Number(button.dataset.amount), 0);
  const next = { principal: Number($('#principal').value), annualRate: Number($('#rate').value), years: Number($('#years').value), extra: baseExtra + addOns };
  if (!validInputs(next)) {
    $('#input-error').textContent = 'Keep the combined extra payment at $10,000 or less.';
    setEnabled(false); return false;
  }
  $('#input-error').textContent = '';
  inputs = next;
  result = compareMortgage(inputs);
  $('#extra-slider').max = Math.max(2000, baseExtra);
  $('#extra-slider').value = baseExtra;
  $('#slider-max').textContent = currency(Number($('#extra-slider').max));
  const { baseline, accelerated, savedInterest, savedMonths } = result;
  $('#headline').textContent = savedMonths > 0 ? `Pay off ${duration(savedMonths)} sooner` : 'Original payment schedule';
  $('#interest-saved').textContent = currency(savedInterest);
  $('#time-saved').textContent = duration(savedMonths);
  $('#outcome-note').textContent = `Payoff time: ${duration(accelerated.months)}. Original term: ${duration(baseline.months)}.`;
  $('#base-payment').textContent = preciseCurrency(baseline.payment);
  $('#extra-payment').textContent = preciseCurrency(inputs.extra);
  $('#total-payment').textContent = preciseCurrency(baseline.payment + inputs.extra);
  renderChart();
  persist(keys.inputs, inputs);
  setEnabled(true);
  return true;
}

function renderChart() {
  const width = 740, height = 240, left = 49, right = 18, top = 15, bottom = 32;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const x = month => left + month / result.baseline.months * plotWidth;
  const y = balance => top + (1 - balance / inputs.principal) * plotHeight;
  function points(plan) { return [[left, top], ...plan.schedule.map(row => [x(row.month), y(row.balance)])]; }
  function path(points) { return points.map((point, i) => `${i ? 'L' : 'M'}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(' '); }
  const basePath = path(points(result.baseline)), extraPath = path(points(result.accelerated));
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const balance = inputs.principal * (1 - i / 4), rowY = y(balance);
    const label = balance >= 1000000 ? `$${+(balance / 1000000).toFixed(1)}m` : balance >= 1000 ? `$${+(balance / 1000).toFixed(1)}k` : currency(balance);
    grid += `<line x1="${left}" y1="${rowY}" x2="${width-right}" y2="${rowY}" stroke="#e2e4d9" stroke-dasharray="3 4"/><text x="${left-10}" y="${rowY+4}" text-anchor="end">${label}</text>`;
  }
  for (let i = 0; i <= 5; i++) {
    const month = result.baseline.months * i / 5;
    grid += `<text x="${x(month)}" y="${height-10}" text-anchor="middle">${+(month / 12).toFixed(1)} yr</text>`;
  }
  const payoffX = x(result.accelerated.months), zeroY = y(0);
  $('#chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">Remaining mortgage balance over time</title><desc id="chart-desc">Original plan: ${duration(result.baseline.months)}. Extra-payment plan: ${duration(result.accelerated.months)}. Interest saved: ${currency(result.savedInterest)}.</desc><defs><linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#cbd3b6" stop-opacity=".35"/><stop offset="100%" stop-color="#cbd3b6" stop-opacity=".03"/></linearGradient></defs>${grid}<path d="${basePath} L${x(result.baseline.months)},${zeroY} L${left},${zeroY} Z" fill="url(#balance-fill)"/><path d="${basePath}" fill="none" stroke="#a5ac99" stroke-width="2" stroke-dasharray="5 4"/><path d="${extraPath}" fill="none" stroke="#b9643d" stroke-width="2.7"/><circle cx="${payoffX}" cy="${zeroY}" r="5" fill="#b9643d" stroke="#faf9f4" stroke-width="2"/></svg>`;
}

function renderScenarios() {
  $('#scenario-count').textContent = scenarios.length;
  const shelf = $('#scenario-list');
  shelf.replaceChildren();
  if (!scenarios.length) {
    const empty = document.createElement('div'); empty.className = 'empty-shelf';
    empty.innerHTML = '<span aria-hidden="true">↗</span><div><p>No saved scenarios.</p><small>Use “Save this scenario” to add one.</small></div>';
    shelf.append(empty); return;
  }
  const wrap = document.createElement('div'); wrap.className = 'scenario-table-wrap';
  const table = document.createElement('table');
  table.innerHTML = '<caption class="sr-only">Saved mortgage scenarios</caption><thead><tr><th scope="col">Scenario</th><th scope="col">Monthly extra</th><th scope="col">Interest saved</th><th scope="col">Time saved</th><th scope="col">Actions</th></tr></thead>';
  const body = document.createElement('tbody');
  scenarios.forEach(scenario => {
    const comparison = compareMortgage(scenario.inputs);
    const row = document.createElement('tr');
    const name = document.createElement('td'); name.textContent = scenario.name;
    const details = document.createElement('small'); details.textContent = `${currency(scenario.inputs.principal)} · ${scenario.inputs.annualRate}% · ${scenario.inputs.years} yr`; name.append(details); row.append(name);
    [currency(scenario.inputs.extra), currency(comparison.savedInterest), duration(comparison.savedMonths)].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); });
    const actions = document.createElement('td'), inner = document.createElement('div'); inner.className = 'scenario-actions';
    const load = document.createElement('button'); load.className = 'text-button'; load.textContent = 'Load ↗'; load.setAttribute('aria-label', `Load ${scenario.name}`);
    load.onclick = () => { loadInputs(scenario.inputs); $('#lab').scrollIntoView({ behavior: 'smooth' }); notify(`Loaded “${scenario.name}”`); };
    const remove = document.createElement('button'); remove.className = 'delete-button'; remove.textContent = '×'; remove.setAttribute('aria-label', `Delete ${scenario.name}`);
    remove.onclick = () => { scenarios = scenarios.filter(item => item.id !== scenario.id); const saved = persist(keys.scenarios, scenarios); renderScenarios(); notify(saved ? 'Scenario removed.' : 'Removed for this session; browser storage is unavailable.'); };
    inner.append(load, remove); actions.append(inner); row.append(actions); body.append(row);
  });
  table.append(body); wrap.append(table); shelf.append(wrap);
}

$('#mortgage-form').addEventListener('input', event => {
  if (event.target.id === 'extra-slider') $('#extra').value = event.target.value;
  update();
});
$('#mortgage-form').addEventListener('submit', event => event.preventDefault());
document.querySelectorAll('.cut').forEach(button => button.addEventListener('click', () => { button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true')); update(); }));
$('#save-scenario').addEventListener('click', () => {
  if (!update()) return;
  if (scenarios.length >= 6) { notify('Six scenarios saved. Delete one to save another.'); return; }
  $('#scenario-name').value = '';
  $('#save-description').textContent = `${currency(inputs.extra)}/month extra · ${currency(result.savedInterest)} interest saved · ${duration(result.savedMonths)} sooner.`;
  $('#scenario-dialog').showModal();
  $('#scenario-name').focus();
});
$('#save-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('#scenario-name').value.trim();
  if (!name) { $('#scenario-name').setCustomValidity('Enter a scenario name.'); $('#scenario-name').reportValidity(); return; }
  if (scenarios.length >= 6 || !validInputs(inputs)) return;
  scenarios.push({ id: crypto.randomUUID(), name, inputs: { ...inputs } });
  const saved = persist(keys.scenarios, scenarios); renderScenarios(); $('#scenario-dialog').close();
  notify(saved ? 'Scenario saved.' : 'Saved for this session only; browser storage is unavailable.');
});
$('#scenario-name').addEventListener('input', () => $('#scenario-name').setCustomValidity(''));
document.querySelectorAll('.dialog-close').forEach(button => button.onclick = () => button.closest('dialog').close());
$('#show-method').onclick = () => $('#method-dialog').showModal();
$('#export-csv').onclick = () => {
  if (!update()) return;
  const url = URL.createObjectURL(new Blob([scheduleCSV(result.accelerated)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = `overpayment-club-${inputs.extra}-extra.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Schedule downloaded.');
};

const restored = read(keys.inputs);
const saved = read(keys.scenarios);
if (Array.isArray(saved)) scenarios = saved.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && item.name.trim() && item.name.length <= 50 && validInputs(item.inputs)).slice(0, 6);
loadInputs(validInputs(restored) ? restored : defaultInputs);
renderScenarios();
if (!storageAvailable) $('.local-note').textContent = 'Browser storage unavailable. Changes last for this session.';
