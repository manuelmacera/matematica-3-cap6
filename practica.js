// Shared practice engine for the mission pages: levels, one question at a time, checking, hints, stars,
// tabla pitagórica and the video panel. A page defines its question makers and calls startPractice().

// ---------- helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const repSum = (n, times) => Array(times).fill(n).join(' + ');
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');   // 3000 -> 3.000
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

function groupsPic(g, e, th) {
  const wrap = h('div', 'pic');
  for (let i = 0; i < g; i++) wrap.appendChild(h('div', 'bag ' + th.kind, th.em.repeat(e)));
  return wrap;
}
function moneyPic(groups) {   // groups: [[value, count], ...]
  const w = h('div', 'pic money');
  groups.forEach(([v, n]) => {
    const row = h('div', 'money-row');
    for (let i = 0; i < n; i++) row.appendChild(h('span', v < 100 ? 'coin' : 'bill b' + v, '$' + fmt(v)));
    w.appendChild(row);
  });
  return w;
}
function trayPic(r, c, em, newRow = false, newCol = false) {
  const rows = r + (newRow ? 1 : 0), cols = c + (newCol ? 1 : 0);
  const t = h('div', 'tray');
  t.style.gridTemplateColumns = `repeat(${cols}, auto)`;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const isNew = (newRow && i === r) || (newCol && j === c);
    t.appendChild(h('span', isNew ? 'new' : '', em));
  }
  const w = h('div', 'pic'); w.appendChild(t); return w;
}
function treePic(left, right) {
  const t = h('div', 'tree');
  left.forEach(a => {
    const row = h('div');
    row.appendChild(h('span', 'r', a));
    right.forEach(b => row.appendChild(h('span', 'l', b)));
    t.appendChild(row);
  });
  return t;
}

// ---------- state ----------
const PER_LEVEL = 5;
let LEVELS = [], KEY = '', best = {};
const saveBest = () => { try { localStorage.setItem(KEY, JSON.stringify(best)); } catch (e) {} };

let level = 0, idx = 0, results = [], q = null, tries = 0, finished = false;

function starsFor(res) {
  const ok = res.filter(r => r === 'ok').length;
  return ok === PER_LEVEL ? 3 : ok >= 3 ? 2 : 1;
}

function drawLevels() {
  const nav = $('#levels'); nav.innerHTML = '';
  LEVELS.forEach((L, k) => {
    const b = h('button', 'lvl' + (k === level ? ' on' : ''));
    const s = best[k] || 0;
    b.innerHTML = `<small>Nivel ${k + 1}</small>${L.name}<span class="stars">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span>`;
    b.onclick = () => startLevel(k);
    nav.appendChild(b);
  });
  const on = $('.lvl.on', nav);
  if (on) nav.scrollTo({ left: on.offsetLeft - 16, behavior: 'smooth' });
}

function startLevel(k) {
  level = k; idx = 0; results = []; seen = new Set();
  drawLevels();
  nextQuestion();
}

let seen = new Set();
function nextQuestion() {
  for (let k = 0; k < 20; k++) {   // avoid repeating a question inside one level
    q = LEVELS[level].make(idx);
    if (!seen.has(q.prompt)) break;
  }
  seen.add(q.prompt); tries = 0; finished = false;
  render();
}

// ---------- render one question ----------
function render() {
  const card = $('#card'); card.innerHTML = '';
  const top = h('div', 'card-top');
  top.appendChild(h('h2', '', `Nivel ${level + 1}: ${LEVELS[level].name}`));
  const dots = h('div', 'dots');
  for (let k = 0; k < PER_LEVEL; k++) {
    const r = results[k];
    dots.appendChild(h('span', r === 'ok' ? 'ok' : r ? 'meh' : (k === idx ? 'now' : '')));
  }
  top.appendChild(dots);
  card.appendChild(top);

  card.appendChild(h('div', 'prompt', q.prompt));
  if (q.pic) card.appendChild(q.pic());

  const area = h('div'); area.id = 'area';
  card.appendChild(area);
  buildAnswer(area);

  const hint = h('div', 'hint'); hint.id = 'hint';
  hint.appendChild(h('p', '', '💡 ' + q.hint));
  if (q.hintPic) hint.appendChild(q.hintPic());
  card.appendChild(hint);

  const fb = h('div', 'feedback'); fb.id = 'fb'; card.appendChild(fb);

  const act = h('div', 'actions');
  const hb = h('button', 'alt', '💡 Pista'); hb.id = 'hintBtn';
  hb.onclick = () => { hint.classList.add('show'); hb.disabled = true; };
  act.appendChild(hb);
  const rs = h('div', 'right-side');
  const cb = h('button', 'go', 'Comprobar'); cb.id = 'checkBtn'; cb.onclick = check;
  const nb = h('button', '', 'Siguiente →'); nb.id = 'nextBtn'; nb.style.display = 'none';
  nb.onclick = () => { idx++; idx < PER_LEVEL ? nextQuestion() : levelDone(); };
  rs.appendChild(cb); rs.appendChild(nb);
  act.appendChild(rs);
  card.appendChild(act);

  const first = card.querySelector('input');
  if (first && matchMedia('(pointer: fine)').matches) first.focus();
}

function numInput(id, label) {
  const lab = h('label');
  const inp = h('input'); inp.id = id; inp.type = 'text'; inp.inputMode = 'numeric'; inp.autocomplete = 'off';
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (!finished) check(); else $('#nextBtn').click(); } });
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/g, '').slice(0, 6);
    inp.style.width = Math.max(3.2, inp.value.length + 1.4) + 'ch';
    inp.classList.remove('wrong', 'right');
  });
  lab.appendChild(inp);
  if (label) lab.appendChild(h('span', 'lbl', label));
  return lab;
}

function buildAnswer(area) {
  area.className = '';
  if (q.kind === 'mult') {
    const a = h('div', 'answer');
    a.appendChild(numInput('f1', q.labels && q.labels[0]));
    a.appendChild(h('span', '', '×'));
    a.appendChild(numInput('f2', q.labels && q.labels[1]));
    a.appendChild(h('span', '', '='));
    a.appendChild(numInput('res', 'total'));
    area.appendChild(a);
  } else if (q.kind === 'fill') {
    const a = h('div', 'answer');
    let k = 0;
    q.parts.forEach(p => {
      if (p === null) a.appendChild(numInput('x' + k++, q.labels && q.labels[k - 1]));
      else a.appendChild(h('span', '', p));
    });
    area.appendChild(a);
  } else if (q.kind === 'num') {
    const a = h('div', 'answer');
    a.appendChild(numInput('res', 'total'));
    area.appendChild(a);
  } else if (q.kind === 'choice' || q.kind === 'multi') {
    const c = h('div', 'choices');
    q.options.forEach((o, k) => {
      const b = h('button', 'choice', o.t); b.dataset.k = k;
      b.onclick = () => {
        if (finished) return;
        if (q.kind === 'choice') { c.querySelectorAll('.choice').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); check(); }
        else b.classList.toggle('sel');
      };
      c.appendChild(b);
    });
    area.appendChild(c);
    if (q.kind === 'multi') area.appendChild(h('p', 'note', 'Tocá todos los que sirven y después “Comprobar”.'));
  } else if (q.kind === 'opnum') {
    area.appendChild(h('p', 'note', 'Primero: ¿qué cálculo resuelve el problema?'));
    const c = h('div', 'choices');
    const ops = shuffle([{ t: `${q.a} × ${q.b}`, op: '×' }, { t: `${q.a} + ${q.b}`, op: '+' }]);
    ops.forEach(o => {
      const b = h('button', 'choice', o.t);
      b.onclick = () => {
        if (q.opDone || finished) return;
        if (o.op === q.op) {
          b.classList.add('right'); q.opDone = true;
          c.querySelectorAll('.choice').forEach(x => x.disabled = true);
          const a = h('div', 'answer');
          a.appendChild(h('span', '', `${q.a} ${q.op} ${q.b} =`));
          a.appendChild(numInput('res', ''));
          area.appendChild(a);
          $('#res').focus();
          showFb('info', '¡Bien elegido! Ahora calculá el resultado.');
        } else {
          b.classList.add('wrong'); b.disabled = true; q.opMiss = true;
          showFb('no', 'Mmm, ese no. Leé otra vez: ¿hay grupos iguales?');
        }
      };
      c.appendChild(b);
    });
    area.appendChild(c);
  }
}

function showFb(kind, msg, why) {
  const fb = $('#fb');
  fb.className = 'feedback show ' + kind;
  fb.innerHTML = msg + (why ? `<span class="why">${why}</span>` : '');
}

function val(id) { const e = $('#' + id); return e && e.value !== '' ? +e.value : null; }

function check() {
  if (finished) return;
  let ok = false, partial = '';
  if (q.kind === 'mult') {
    const a = val('f1'), b = val('f2'), r = val('res');
    if (a == null || b == null || r == null) { showFb('info', 'Completá los tres casilleros.'); return; }
    const factorsOk = (a === q.g && b === q.e) || (a === q.e && b === q.g);
    const resOk = r === q.g * q.e;
    $('#f1').classList.add(factorsOk ? 'right' : 'wrong');
    $('#f2').classList.add(factorsOk ? 'right' : 'wrong');
    $('#res').classList.add(resOk ? 'right' : 'wrong');
    ok = factorsOk && resOk;
    partial = !factorsOk ? 'Revisá los números de la multiplicación.' : 'La multiplicación está bien. Revisá el total.';
  } else if (q.kind === 'fill') {
    const ins = [...document.querySelectorAll('#area input')];
    const vals = ins.map(i => (i.value === '' ? null : +i.value));
    if (vals.some(v => v == null)) { showFb('info', ins.length > 1 ? 'Completá todos los casilleros.' : 'Escribí el número que falta.'); return; }
    ok = q.validate(vals);
    ins.forEach(i => i.classList.add(ok ? 'right' : 'wrong'));
    partial = 'Ese no es.';
  } else if (q.kind === 'num' || q.kind === 'opnum') {
    if (q.kind === 'opnum' && !q.opDone) { showFb('info', 'Primero elegí el cálculo.'); return; }
    const r = val('res');
    if (r == null) { showFb('info', 'Escribí el resultado.'); return; }
    ok = r === q.answer;
    $('#res').classList.add(ok ? 'right' : 'wrong');
    partial = 'Ese no es el resultado.';
  } else if (q.kind === 'choice') {
    const sel = $('#area .choice.sel');
    if (!sel) return;
    ok = q.options[+sel.dataset.k].ok;
    sel.classList.remove('sel'); sel.classList.add(ok ? 'right' : 'wrong');
    if (!ok) sel.disabled = true;
    partial = 'Ese no es.';
  } else if (q.kind === 'multi') {
    const btns = [...document.querySelectorAll('#area .choice')];
    const chosen = btns.filter(b => b.classList.contains('sel'));
    if (!chosen.length) { showFb('info', 'Tocá al menos uno.'); return; }
    ok = btns.every(b => b.classList.contains('sel') === q.options[+b.dataset.k].ok);
    const wrongPicked = chosen.some(b => !q.options[+b.dataset.k].ok);
    partial = wrongPicked ? 'Elegiste alguno que no sirve.' : 'Te falta alguno que también sirve.';
    if (ok || tries >= 1) {
      btns.forEach(b => {
        const good = q.options[+b.dataset.k].ok, sel = b.classList.contains('sel');
        b.classList.remove('sel');
        const cls = good ? (sel ? 'right' : 'missed') : (sel ? 'wrong' : '');
        if (cls) b.classList.add(cls);
      });
    }
  }
  tries++;
  if (ok) return finish(tries === 1 && !q.opMiss ? 'ok' : 'meh',
    tries === 1 && !q.opMiss ? pick(['¡Muy bien!', '¡Excelente!', '¡Genial!', '¡Perfecto!']) : '¡Ahora sí!');
  if (tries >= 2) return finish('miss', 'Esta vez no salió. Mirá cómo se resuelve:');
  showFb('no', partial + ' Probá otra vez.');
  if (!$('#hint').classList.contains('show')) { $('#hint').classList.add('show'); $('#hintBtn').disabled = true; }
}

function finish(result, msg) {
  finished = true;
  results[idx] = result;
  showFb(result === 'miss' ? 'no' : 'ok', msg, q.why);
  if (result === 'miss' && q.kind === 'mult') {
    $('#f1').value = q.g; $('#f2').value = q.e; $('#res').value = q.g * q.e;
  }
  if ((result === 'miss') && (q.kind === 'num' || q.kind === 'opnum') && $('#res')) $('#res').value = q.answer;
  if (result === 'miss' && q.kind === 'fill') document.querySelectorAll('#area input').forEach((i, k) => { i.value = q.solution[k]; i.style.width = (String(q.solution[k]).length + 1.4) + 'ch'; });
  document.querySelectorAll('#area input').forEach(i => i.readOnly = true);
  if (result === 'miss' && q.kind === 'choice') document.querySelectorAll('#area .choice').forEach(b => { if (q.options[+b.dataset.k].ok) b.classList.add('missed'); });
  document.querySelectorAll('#area .choice').forEach(b => b.disabled = true);
  $('#checkBtn').style.display = 'none';
  const nb = $('#nextBtn'); nb.style.display = '';
  nb.textContent = idx < PER_LEVEL - 1 ? 'Siguiente →' : 'Ver resultado ★';
  nb.focus();
  if (result === 'ok') { const m = $('#mascot'); m.classList.remove('jump'); void m.offsetWidth; m.classList.add('jump'); }
  // refresh dots
  const dots = document.querySelectorAll('.dots span');
  dots[idx].className = result === 'ok' ? 'ok' : 'meh';
}

function levelDone() {
  const s = starsFor(results);
  best[level] = Math.max(best[level] || 0, s); saveBest();
  drawLevels();
  const ok = results.filter(r => r === 'ok').length;
  const card = $('#card'); card.innerHTML = '';
  const d = h('div', 'done');
  d.appendChild(h('div', 'big-stars', '★'.repeat(s) + '☆'.repeat(3 - s)));
  d.appendChild(h('h2', '', s === 3 ? '¡Nivel superado!' : s === 2 ? '¡Muy bien!' : '¡Buen intento!'));
  d.appendChild(h('p', '', `Acertaste ${ok} de ${PER_LEVEL} a la primera.`));
  const row = h('div', 'actions');
  const again = h('button', 'alt', '↻ Repetir nivel'); again.onclick = () => startLevel(level);
  row.appendChild(again);
  if (level < LEVELS.length - 1) {
    const nx = h('button', 'go', `Nivel ${level + 2} →`); nx.onclick = () => startLevel(level + 1);
    row.appendChild(nx);
  } else {
    d.appendChild(h('p', '', '¡Terminaste todos los niveles de la Misión 1! 🚀'));
  }
  d.appendChild(row);
  card.appendChild(d);
  const m = $('#mascot'); m.classList.remove('jump'); void m.offsetWidth; m.classList.add('jump');
}

// ---------- tabla pitagórica ----------
(function () {
  const tb = $('#ptable');
  for (let i = 0; i <= 10; i++) {
    const tr = h('tr');
    for (let j = 0; j <= 10; j++) {
      const td = h('td', '', i === 0 && j === 0 ? '×' : i === 0 ? j : j === 0 ? i : i * j);
      td.dataset.r = i; td.dataset.c = j;
      tr.appendChild(td);
    }
    tb.appendChild(tr);
  }
  tb.addEventListener('click', e => {
    const td = e.target.closest('td'); if (!td) return;
    const r = +td.dataset.r, c = +td.dataset.c;
    if (!r || !c) return;
    tb.querySelectorAll('td').forEach(x => {
      const i = +x.dataset.r, j = +x.dataset.c;
      x.className = i === r && j === c ? 'hit' : i === r && j === 0 ? 'rh' : j === c && i === 0 ? 'ch'
        : i === r && j > 0 ? 'row' : j === c && i > 0 ? 'col' : '';
    });
    $('#readout').innerHTML = `fila del <b>${r}</b>, columna del <i>${c}</i>: <b>${r}</b> × <i>${c}</i> = <em>${r * c}</em>`;
  });
  $('#tableBtn').onclick = () => {
    const open = $('#tableBox').classList.toggle('open');
    $('#tableBtn').textContent = open ? '✕ Tabla' : '🔢 Tabla';
  };
})();

// ---------- video ----------
$('#videoBtn').onclick = () => {
  const box = $('#videoBox'), open = box.classList.toggle('open');
  $('#videoBtn').textContent = open ? '✕ Cerrar video' : '▶ Video';
  if (!open) $('video', box).pause();
};

// Each mission page calls this with its own levels.
function startPractice(cfg) {
  LEVELS = cfg.levels; KEY = cfg.key;
  try { best = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { best = {}; }
  startLevel(0);
}
