

'use strict';

import '../core/main.js';

const VAR_DATA = {
  pob_total:    { label: 'Población total',           val: 2402598 },
  pob_pea:      { label: 'PEA',                       val: 1205432 },
  pob_ocupada:  { label: 'Población ocupada',         val: 1085234 },
  num_hogares:  { label: 'Nº de hogares',             val: 710245  },
  pib_mmp:      { label: 'PIBE (millones de pesos)',  val: 249700  },
  pib_pc:       { label: 'PIB per cápita (pesos)',    val: 103957  },
  tasa_informal:{ label: 'Tasa de informalidad (%)',  val: 56.4    },
  mortalidad:   { label: 'Tasa mortalidad general',   val: 5.2     },
  fecundidad:   { label: 'Tasa global fecundidad',    val: 2.1     },
  densidad:     { label: 'Densidad hab/km²',          val: 38.7    },
  edad_mediana: { label: 'Edad mediana',              val: 28.3    },
};

function calcular() {
  const areaEl = document.getElementById('calc-area');
  const v1El   = document.getElementById('calc-var1');
  const opEl   = document.getElementById('calc-op');
  const v2El   = document.getElementById('calc-var2');
  if (!areaEl || !v1El || !opEl || !v2El) return;

  const area = areaEl.options[areaEl.selectedIndex]?.text ?? areaEl.value;
  const v1k  = v1El.value;
  const op   = opEl.value;
  const v2k  = v2El.value;

  const v1   = VAR_DATA[v1k]?.val ?? 0;
  const v2   = VAR_DATA[v2k]?.val ?? 1;
  const lbl1 = VAR_DATA[v1k]?.label ?? v1k;
  const lbl2 = VAR_DATA[v2k]?.label ?? v2k;

  let result;
  switch (op) {
    case '+': result = v1 + v2; break;
    case '-': result = v1 - v2; break;
    case '×': result = v1 * v2; break;
    case '÷': result = v2 !== 0 ? v1 / v2 : null; break;
    default:  result = null;
  }

  const el = document.getElementById('calc-result');
  if (!el) return;
  if (result == null) { el.style.display = 'none'; return; }

  el.style.display = 'block';
  const valEl    = document.getElementById('calc-result-value');
  const formulaEl= document.getElementById('calc-result-formula');
  const areaEl2  = document.getElementById('calc-result-area');
  if (valEl)    valEl.textContent     = fmtNum(result);
  if (formulaEl) formulaEl.textContent = `${lbl1}  ${op}  ${lbl2}`;
  if (areaEl2)  areaEl2.textContent   = area;
}

function fmtNum(n) {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(3) + ' B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + ' M';
  if (abs >= 1e4) return Math.round(n).toLocaleString('es-MX');
  return n.toLocaleString('es-MX', { maximumFractionDigits: 2 });
}

document.querySelector('[data-accion="calcular"]')?.addEventListener('click', calcular);
document.querySelector('[data-accion="limpiar"]')?.addEventListener('click', () => {
  document.getElementById('calc-result').style.display = 'none';
});
