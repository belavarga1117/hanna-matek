function loadCssOnce() {
  if (typeof document === 'undefined' || document.querySelector?.('link[data-nback-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./nback.css', import.meta.url).href;
  link.dataset.nbackCss = 'true';
  document.head?.append(link);
}

function number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function metric(h, label, value) {
  return h('div', { className: 'nback-result-metric' }, h('span', {}, label), h('strong', {}, String(number(value))));
}

export function renderNbackResult(h, result = {}) {
  loadCssOnce();
  const metrics = result?.metrics;
  const percent = Number.isFinite(Number(result?.percent)) ? Math.max(0, Math.min(100, Number(result.percent))) : null;
  if (!metrics || !Array.isArray(metrics.channels)) {
    return h('section', { className: 'nback-result', 'aria-label': 'N-back eredmény' },
      h('h2', {}, 'N-back eredmény'),
      percent == null ? h('p', { className: 'nback-result-missing' }, 'Ehhez a korábbi eredményhez nem érhetők el a részletes csatornaadatok.')
        : h('p', { className: 'nback-result-percent' }, h('strong', {}, `${Math.floor(percent)}%`)),
      result?.summary ? h('p', { className: 'nback-result-summary' }, String(result.summary)) : null,
      h('p', { className: 'nback-result-missing' }, 'A találatok, hibás jelölések és kihagyások bontása nem áll rendelkezésre.'));
  }

  const totals = metrics.totals || {};
  const jaeggi = metrics.scoreProfile === 'jaeggi';
  const adaptation = metrics.adaptation || {};
  const actionLabels = { up: 'szintlépés', down: 'szintcsökkentés', stay: 'változatlan szint', manual: 'kézi szint' };
  const nextN = Number.isFinite(Number(adaptation.nextN)) ? Number(adaptation.nextN) : null;
  const fromN = Number.isFinite(Number(adaptation.fromN)) ? Number(adaptation.fromN) : number(metrics.n);
  const channelRows = metrics.channels.map((channel) => h('tr', {},
    h('th', { scope: 'row' }, String(({audio:'Kimondott betű',audio2:'Zongorahang'})[channel.id] || channel.label || channel.id || 'Csatorna')),
    h('td', {}, String(number(channel.hits))),
    h('td', {}, String(number(channel.falseAlarms))),
    h('td', {}, String(number(channel.misses))),
    h('td', {}, String(number(channel.correctRejections))),
    h('td', {}, `${Math.floor(number(channel.percent))}%`)));

  return h('section', { className: 'nback-result', 'aria-label': 'N-back eredmény' },
    h('div', { className: 'nback-result-heading' },
      h('div', {}, h('span', { className: 'eyebrow' }, `${fromN}-BACK`), h('h2', {}, 'Részletes eredmény')),
      percent == null ? null : h('p', { className: 'nback-result-percent' }, h('strong', {}, `${Math.floor(percent)}%`))),
    result?.summary ? h('p', { className: 'nback-result-summary' }, String(result.summary)) : null,
    h('div', { className: 'nback-result-totals' },
      metric(h, 'Találat', totals.hits), metric(h, 'Hibás jelölés', totals.falseAlarms),
      metric(h, 'Kihagyás', totals.misses), metric(h, 'Helyes elutasítás (TN)', totals.correctRejections)),
    h('div', { className: 'nback-result-table-wrap' },
      h('table', { className: 'nback-result-table' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Csatorna'), h('th', { scope: 'col' }, 'Találat (TP)'), h('th', { scope: 'col' }, 'Hibás (FP)'), h('th', { scope: 'col' }, 'Kihagyás (FN)'), h('th', { scope: 'col' }, 'Helyes nem (TN)'), h('th', { scope: 'col' }, 'Eredmény'))),
        h('tbody', {}, ...channelRows))),
    h('p', { className: 'nback-result-formula' }, jaeggi
      ? 'Jaeggi-képlet: (TP + TN) / (TP + TN + FP + FN) csatornánként; az összeredmény a leggyengébb csatorna.'
      : 'Workshop-képlet: TP / (TP + FP + FN), az összes csatornát együtt számolva.'),
    nextN == null ? null : h('p', { className: 'nback-result-next' },
      h('strong', {}, `Következő szint: ${nextN}-back`),
      adaptation.action ? ` · ${actionLabels[adaptation.action] || adaptation.action}` : ''));
}
