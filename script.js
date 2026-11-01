// Всё хранится только в этом браузере (localStorage), никуда не отправляется.
//
// tasks  — разовые дела: { id, text, important, date: 'ГГГГ-ММ-ДД', done, created }
// series — повторяющиеся: { id, text, important, weekdays: [0..6] (пн = 0), start, end?,
//                           skips: [даты, где удалено], done: [даты, где сделано], created }
const STORE_KEY = 'planner:v2';

const DAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const DAYS_IN = ['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'];
const DAYS_EVERY = ['каждый понедельник', 'каждый вторник', 'каждую среду', 'каждый четверг', 'каждую пятницу', 'каждую субботу', 'каждое воскресенье'];
const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'нояб', 'дек'];

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const $ = (id) => document.getElementById(id);

// ---------- даты ----------

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const weekday = (d) => (d.getDay() + 6) % 7;
const mondayOf = (d) => addDays(d, -weekday(d));
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const longDate = (d) => `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;

function weekRange(mon) {
  const sun = addDays(mon, 6);
  return mon.getMonth() === sun.getMonth()
    ? `${mon.getDate()} — ${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]}`
    : `${mon.getDate()} ${MONTHS_SHORT[mon.getMonth()]} — ${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]}`;
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function repeatLabel(weekdays) {
  const w = [...weekdays].sort();
  if (w.length === 7) return 'каждый день';
  if (w.join() === '0,1,2,3,4') return 'по будням';
  if (w.join() === '5,6') return 'по выходным';
  if (w.length === 1) return DAYS_EVERY[w[0]];
  return 'каждые ' + w.map((i) => DAYS_SHORT[i].toLowerCase()).join(', ');
}

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- состояние ----------

const emptyState = () => ({ tasks: [], series: [], carryDismissed: [], settings: { theme: 'system', lastBackup: null, doneDown: true } });

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.tasks) && Array.isArray(s.series)) return { ...emptyState(), ...s, settings: { ...emptyState().settings, ...s.settings } };
  } catch {}
  return emptyState();
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}

let state = load();
let view = 'week';
let weekStart = mondayOf(today());
let dayDate = today();

// все дела на дату: разовые + повторы; важные первыми, сделанные (если включено) — в конце
function itemsOn(key) {
  const w = weekday(fromKey(key));
  const list = [];
  for (const t of state.tasks) {
    if (t.date === key) list.push({ kind: 'one', id: t.id, text: t.text, important: t.important, done: t.done, date: key, created: t.created });
  }
  for (const s of state.series) {
    if (s.weekdays.includes(w) && s.start <= key && (!s.end || key < s.end) && !s.skips.includes(key)) {
      list.push({ kind: 'series', id: s.id, text: s.text, important: s.important, done: s.done.includes(key), date: key, created: s.created, weekdays: s.weekdays });
    }
  }
  const doneDown = state.settings.doneDown;
  return list.sort((a, b) => (doneDown && a.done - b.done) || (b.important - a.important) || (a.created - b.created));
}

const findTask = (id) => state.tasks.find((t) => t.id === id);
const findSeries = (id) => state.series.find((s) => s.id === id);

function toggleDone(item) {
  if (item.kind === 'one') {
    const t = findTask(item.id); t.done = !t.done;
  } else {
    const s = findSeries(item.id);
    s.done = s.done.includes(item.date) ? s.done.filter((d) => d !== item.date) : [...s.done, item.date];
  }
  // дело переезжает на новое место плавно, чтобы было видно, куда оно делось
  const before = rowPositions();
  commit();
  slideRows(before);
}

const rowKey = (item) => `${item.kind}:${item.id}:${item.date}`;
const rowPositions = () => new Map([...document.querySelectorAll('.view:not([hidden]) .task-swipe')].map((r) => [r.dataset.key, r.getBoundingClientRect().top]));

function slideRows(before) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const r of document.querySelectorAll('.view:not([hidden]) .task-swipe')) {
    const dy = before.get(r.dataset.key) - r.getBoundingClientRect().top;
    if (!dy) continue;
    r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 250, easing: 'ease-out' });
  }
}

// недоделанные разовые дела за последнюю неделю, которые можно перенести на сегодня
function carryCandidates() {
  const t = keyOf(today()), from = keyOf(addDays(today(), -7));
  return state.tasks
    .filter((x) => !x.done && x.date < t && x.date >= from && !state.carryDismissed.includes(x.id))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function commit() {
  save();
  render();
}

// ---------- отрисовка ----------

function render() {
  for (const v of ['week', 'day', 'settings']) $(`view-${v}`).hidden = view !== v;
  if (view === 'week') renderWeek();
  if (view === 'day') renderDay();
  if (view === 'settings') renderSettings();
}

function taskRow(item, { showRepeat = true } = {}) {
  const row = document.createElement('div');
  row.className = 'task-swipe';
  row.dataset.key = rowKey(item);
  row.innerHTML = `
    <button class="swipe-delete" tabindex="-1">Удалить</button>
    <div class="task${item.done ? ' is-done' : ''}${item.important ? ' is-important' : ''}">
      <button class="check" role="checkbox" aria-checked="${item.done}" aria-label="Сделано: ${esc(item.text)}">${CHECK_SVG}</button>
      <button class="task-body" aria-label="Изменить: ${esc(item.text)}">
        <span class="task-text">${esc(item.text)}</span>
        ${item.kind === 'series' && showRepeat ? `<span class="task-sub">${repeatLabel(item.weekdays)}</span>` : ''}
      </button>
    </div>`;
  const guard = (fn) => () => {
    if (row.dataset.swiped) return;
    if (row.classList.contains('is-open')) return closeSwipe(row);
    fn();
  };
  row.querySelector('.check').onclick = guard(() => toggleDone(item));
  row.querySelector('.task-body').onclick = guard(() => openTaskSheet({ item }));
  row.querySelector('.swipe-delete').onclick = () => { closeSwipe(row); requestDelete(item); };
  bindSwipe(row);
  return row;
}

function renderWeek() {
  const t = today(), tKey = keyOf(t);
  const isCurrent = keyOf(weekStart) === keyOf(mondayOf(t));
  $('week-title').textContent = weekRange(weekStart);

  // прогресс недели
  let total = 0, done = 0;
  const cells = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i), key = keyOf(d), items = itemsOn(key);
    total += items.length; done += items.filter((x) => x.done).length;
    cells.push({ i, d, key, items });
  }
  const pct = total ? Math.round(done / total * 100) : 0;
  $('week-pct').textContent = `${pct}%`;
  $('week-count').textContent = total ? `сделано за неделю, ${done} из ${total}` : 'на этой неделе пока нет дел';
  $('week-bar').style.width = `${pct}%`;

  // баннер переноса
  const carry = isCurrent ? carryCandidates() : [];
  $('carry-banner').hidden = !carry.length;
  if (carry.length) {
    const yesterday = keyOf(addDays(t, -1));
    const when = carry.every((x) => x.date === yesterday) ? 'со вчера' : 'с прошлых дней';
    $('carry-text').textContent = `${carry.length} ${plural(carry.length, 'дело', 'дела', 'дел')} ${when} не ${carry.length === 1 ? 'сделано' : 'сделаны'}`;
  }

  // сетка: пн-ср слева, чт-пт справа, выходные вместе
  const grid = $('week-grid');
  grid.replaceChildren();
  const weekend = document.createElement('div');
  weekend.className = 'weekend';
  for (const { i, d, key, items } of cells) {
    const cell = document.createElement('section');
    cell.className = 'day-cell' + (key === tKey ? ' is-today' : '');
    if (i < 5) cell.style.gridArea = `d${i}`;
    cell.innerHTML = `
      <button class="day-head" aria-label="Открыть ${DAYS[i]}, ${longDate(d)}">
        <span class="dname">${DAYS_SHORT[i]}</span><span>${d.getDate()}</span>
        ${key === tKey ? '<span class="pill">сегодня</span>' : ''}
      </button>
      <div class="task-list"></div>
      <button class="add-link">+ дело</button>`;
    cell.querySelector('.day-head').onclick = () => go('day', d);
    // тап по пустому месту ячейки — тоже открыть день
    cell.onclick = (e) => { if (!e.target.closest('button, .task-swipe')) go('day', d); };
    cell.querySelector('.add-link').onclick = () => openTaskSheet({ date: d });
    cell.querySelector('.task-list').append(...items.map((x) => taskRow(x)));
    (i < 5 ? grid : weekend).append(cell);
  }
  grid.append(weekend);
}

function renderDay() {
  const d = dayDate, key = keyOf(d), items = itemsOn(key);
  const done = items.filter((x) => x.done).length;
  $('day-title').textContent = `${cap(DAYS[weekday(d)])}, ${longDate(d)}`;
  $('day-count').textContent = items.length ? `Сделано ${done} из ${items.length}` : 'Дел пока нет';
  $('day-bar').style.width = items.length ? `${Math.round(done / items.length * 100)}%` : '0';

  const box = $('day-sections');
  box.replaceChildren();
  // при «Сделанные — вниз» сделанные уходят в отдельный раздел в конце
  const doneDown = state.settings.doneDown;
  const open = doneDown ? items.filter((x) => !x.done) : items;
  const groups = [
    ['Важное', open.filter((x) => x.important)],
    ['Остальное', open.filter((x) => !x.important)],
    ['Сделано', doneDown ? items.filter((x) => x.done) : []],
  ].filter(([, list]) => list.length);
  const section = (label, list) => {
    const s = document.createElement('section');
    s.className = 'day-section';
    s.innerHTML = label ? `<h2 class="section-label">${label}</h2><div class="task-list"></div>` : '<div class="task-list"></div>';
    s.querySelector('.task-list').append(...list.map((x) => taskRow(x)));
    box.append(s);
  };
  if (!items.length) box.innerHTML = '<p class="empty">Добавь первое дело кнопкой внизу.</p>';
  // если раздел один и это обычные дела — без заголовка
  else if (groups.length === 1 && groups[0][0] === 'Остальное') section('', items);
  else for (const [label, list] of groups) section(label, list);

  const prev = addDays(d, -1), next = addDays(d, 1);
  $('prev-day').setAttribute('aria-label', `Предыдущий день, ${DAYS[weekday(prev)]} ${longDate(prev)}`);
  $('next-day').setAttribute('aria-label', `Следующий день, ${DAYS[weekday(next)]} ${longDate(next)}`);
}

function renderSettings() {
  for (const b of $('theme-switch').children) b.setAttribute('aria-pressed', b.dataset.themeValue === state.settings.theme);
  $('done-down').checked = state.settings.doneDown;
  const last = state.settings.lastBackup;
  $('backup-last').textContent = last ? `Последняя копия: ${longDate(fromKey(last))}` : 'Копию ещё не сохраняли';
}

// ---------- навигация ----------

function go(to, date) {
  view = to;
  if (date) { dayDate = date; weekStart = mondayOf(date); }
  closeSheet();
  render();
  window.scrollTo(0, 0);
}

$('prev-week').onclick = () => { weekStart = addDays(weekStart, -7); render(); };
$('next-week').onclick = () => { weekStart = addDays(weekStart, 7); render(); };
$('week-title').onclick = () => { weekStart = mondayOf(today()); render(); };
$('open-settings').onclick = () => go('settings');
for (const b of document.querySelectorAll('[data-go]')) b.onclick = () => go(b.dataset.go);
$('prev-day').onclick = () => go('day', addDays(dayDate, -1));
$('next-day').onclick = () => go('day', addDays(dayDate, 1));
$('day-add').onclick = () => openTaskSheet({ date: dayDate });
$('carry-open').onclick = () => openCarrySheet();

// свайп по экрану дня — соседний день
let daySwipe = null;
$('view-day').addEventListener('touchstart', (e) => {
  if (e.target.closest('.task-swipe')) return;
  daySwipe = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
$('view-day').addEventListener('touchend', (e) => {
  if (!daySwipe) return;
  const dx = e.changedTouches[0].clientX - daySwipe.x, dy = e.changedTouches[0].clientY - daySwipe.y;
  daySwipe = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go('day', addDays(dayDate, dx < 0 ? 1 : -1));
});

// ---------- свайп влево по делу ----------

const SWIPE_W = 84;
let openRow = null;

function closeSwipe(row) {
  row.classList.remove('is-open');
  if (openRow === row) openRow = null;
}

function bindSwipe(row) {
  const task = row.querySelector('.task');
  let start = null, mode = null, dx = 0;
  task.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (openRow && openRow !== row) closeSwipe(openRow);
    start = { x: e.clientX, y: e.clientY, base: row.classList.contains('is-open') ? -SWIPE_W : 0 };
    mode = null; dx = start.base;
  });
  task.addEventListener('pointermove', (e) => {
    if (!start) return;
    const mx = e.clientX - start.x, my = e.clientY - start.y;
    if (!mode) {
      if (Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my)) {
        mode = 'swipe';
        task.setPointerCapture(e.pointerId);
        row.classList.add('is-dragging');
      } else if (Math.abs(my) > 8) {
        mode = 'scroll';
      }
    }
    if (mode === 'swipe') {
      dx = Math.min(0, Math.max(-SWIPE_W - 24, start.base + mx));
      task.style.transform = `translateX(${dx}px)`;
    }
  });
  const end = () => {
    if (mode === 'swipe') {
      row.classList.remove('is-dragging');
      task.style.transform = '';
      if (dx < -SWIPE_W / 2) { row.classList.add('is-open'); openRow = row; } else closeSwipe(row);
      // не считать конец свайпа тапом по делу
      row.dataset.swiped = '1';
      setTimeout(() => delete row.dataset.swiped, 50);
    }
    start = null; mode = null;
  };
  task.addEventListener('pointerup', end);
  task.addEventListener('pointercancel', end);
}

document.addEventListener('pointerdown', (e) => {
  if (openRow && !openRow.contains(e.target)) closeSwipe(openRow);
}, true);

// ---------- шторки ----------

function openSheet(html, setup) {
  const sheet = $('sheet');
  sheet.innerHTML = '<div class="sheet-grab"></div>' + html;
  $('sheet-layer').hidden = false;
  document.body.style.overflow = 'hidden';
  setup?.(sheet);
}

function closeSheet() {
  $('sheet-layer').hidden = true;
  $('sheet').innerHTML = '';
  document.body.style.overflow = '';
}

$('backdrop').onclick = closeSheet;
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sheet-layer').hidden) closeSheet(); });

// клавиатура iPhone не должна закрывать шторку
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fit = () => document.documentElement.style.setProperty('--kb', `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`);
  vv.addEventListener('resize', fit);
  vv.addEventListener('scroll', fit);
}

// шторка «Новое дело» / «Изменить дело»
function openTaskSheet({ date, item }) {
  const editing = Boolean(item);
  const base = editing ? fromKey(item.date) : date;
  const mon = mondayOf(base);
  const selected = new Set(item?.kind === 'series' ? item.weekdays : [weekday(base)]);
  let repeat = item?.kind === 'series';

  openSheet(`
    <div>
      <h2 class="sheet-title">${editing ? 'Изменить дело' : 'Новое дело'}</h2>
      <p class="sheet-date" id="f-subtitle"></p>
    </div>
    <input class="field" id="f-text" placeholder="Что нужно сделать?" maxlength="200" enterkeyhint="done" autocomplete="off">
    <div id="f-days-wrap">
      <div class="label" id="f-days-label"></div>
      <div class="chips" id="f-days">
        ${DAYS_SHORT.map((n, i) => `<button class="chip" data-i="${i}" aria-pressed="${selected.has(i)}">${n}<small>${addDays(mon, i).getDate()}</small></button>`).join('')}
      </div>
    </div>
    <label class="switch-row">
      <span class="switch-text"><span class="switch-title">Повторять каждую неделю</span><span class="switch-hint" id="f-repeat-hint"></span></span>
      <input type="checkbox" class="switch" id="f-repeat">
    </label>
    <label class="switch-row">
      <span class="switch-text"><span class="switch-title">Важное</span><span class="switch-hint">Выделяется жирным и стоит первым в дне</span></span>
      <input type="checkbox" class="switch" id="f-important">
    </label>
    <button class="btn btn-primary" id="f-save">${editing ? 'Сохранить' : 'Добавить'}</button>
    ${editing ? '<button class="btn btn-secondary" id="f-delete">Удалить дело</button>' : ''}
  `, (sheet) => {
    const text = sheet.querySelector('#f-text');
    const rep = sheet.querySelector('#f-repeat');
    const imp = sheet.querySelector('#f-important');
    const saveBtn = sheet.querySelector('#f-save');
    text.value = item?.text ?? '';
    rep.checked = repeat;
    imp.checked = item?.important ?? false;

    const chips = [...sheet.querySelectorAll('.chip')];
    // Дни показываем только когда это осмысленно: при повторе (несколько дней)
    // или при редактировании разового дела (один день — перенос).
    const refresh = () => {
      // подзаголовок следует за выбранными днями
      const first = addDays(mon, [...selected][0] ?? weekday(base));
      sheet.querySelector('#f-subtitle').textContent = rep.checked
        ? (selected.size ? cap(repeatLabel([...selected])) : 'Дни не выбраны')
        : `${cap(DAYS[weekday(first)])}, ${longDate(first)}`;
      sheet.querySelector('#f-days-wrap').hidden = !rep.checked && !editing;
      sheet.querySelector('#f-days-label').textContent = rep.checked ? 'По каким дням' : 'День';
      for (const c of chips) c.setAttribute('aria-pressed', selected.has(Number(c.dataset.i)));
      sheet.querySelector('#f-repeat-hint').textContent = rep.checked
        ? (selected.size ? `Будет ${repeatLabel([...selected])}` : 'Выбери дни')
        : 'Только в этот день';
      saveBtn.disabled = !text.value.trim() || !selected.size;
    };
    sheet.querySelector('#f-days').onclick = (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const i = Number(chip.dataset.i);
      if (rep.checked) selected.has(i) ? selected.delete(i) : selected.add(i);
      else { selected.clear(); selected.add(i); }
      refresh();
    };
    text.oninput = refresh;
    rep.onchange = () => {
      // без повтора день всегда один
      if (!rep.checked && selected.size !== 1) {
        const keep = selected.has(weekday(base)) ? weekday(base) : [...selected][0] ?? weekday(base);
        selected.clear(); selected.add(keep);
      }
      if (rep.checked && !selected.size) selected.add(weekday(base));
      refresh();
    };
    text.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing && !saveBtn.disabled) saveBtn.click(); };
    refresh();
    if (!editing) text.focus();

    saveBtn.onclick = () => {
      const data = { text: text.value.trim(), important: imp.checked, days: [...selected].sort(), repeat: rep.checked, mon };
      editing ? saveEdit(item, data) : addNew(data);
    };
    if (editing) sheet.querySelector('#f-delete').onclick = () => requestDelete(item);
  });
}

function addNew({ text, important, days, repeat, mon }) {
  const created = Date.now();
  if (repeat) {
    state.series.push({ id: uid(), text, important, weekdays: days, start: keyOf(mon), skips: [], done: [], created });
  } else {
    for (const i of days) state.tasks.push({ id: uid(), text, important, date: keyOf(addDays(mon, i)), done: false, created });
  }
  closeSheet();
  commit();
}

function saveEdit(item, data) {
  const { text, important, days, repeat, mon } = data;
  if (item.kind === 'one') {
    const t = findTask(item.id);
    if (repeat) {
      state.tasks = state.tasks.filter((x) => x !== t);
      state.series.push({ id: uid(), text, important, weekdays: days, start: keyOf(mon), skips: [], done: t.done ? [t.date] : [], created: t.created });
    } else {
      Object.assign(t, { text, important, date: keyOf(addDays(mon, days[0])) });
      for (const i of days.slice(1)) state.tasks.push({ id: uid(), text, important, date: keyOf(addDays(mon, i)), done: false, created: Date.now() });
    }
    closeSheet();
    return commit();
  }

  const s = findSeries(item.id);
  const scheduleChanged = !repeat || days.join() !== [...s.weekdays].sort().join();
  if (scheduleChanged) {
    if (repeat) {
      Object.assign(s, { text, important, weekdays: days });
    } else {
      // повтор выключили: серия заканчивается, на эту неделю остаются разовые дела
      s.end = item.date;
      for (const i of days) {
        const key = keyOf(addDays(mon, i));
        if (key >= item.date) state.tasks.push({ id: uid(), text, important, date: key, done: s.done.includes(key), created: s.created });
      }
    }
    closeSheet();
    return commit();
  }
  if (text === s.text && important === s.important) { closeSheet(); return; }

  const d = fromKey(item.date);
  openChoice({
    title: `Изменить «${s.text}»`,
    sub: `Это дело повторяется: ${repeatLabel(s.weekdays)}`,
    options: [
      { title: `Только ${DAYS_IN[weekday(d)]}, ${longDate(d)}`, hint: 'В остальные дни останется как было', run: () => {
        s.skips.push(item.date);
        state.tasks.push({ id: uid(), text, important, date: item.date, done: item.done, created: s.created });
      } },
      { title: 'Во всех днях', hint: 'Изменится везде, где повторяется', run: () => Object.assign(s, { text, important }) },
    ],
  });
}

function requestDelete(item) {
  const snapshot = JSON.stringify(state);
  const finish = () => { closeSheet(); commit(); showToast(`«${item.text}» удалено`, snapshot); };
  if (item.kind === 'one') {
    state.tasks = state.tasks.filter((t) => t.id !== item.id);
    return finish();
  }
  const s = findSeries(item.id), d = fromKey(item.date);
  openChoice({
    title: `Удалить «${s.text}»`,
    sub: `Это дело повторяется: ${repeatLabel(s.weekdays)}`,
    options: [
      { title: `Только ${DAYS_IN[weekday(d)]}, ${longDate(d)}`, hint: 'В остальные дни останется', run: () => s.skips.push(item.date) },
      { title: 'Совсем', hint: 'Больше не будет повторяться', run: () => { s.end = item.date; } },
    ],
    after: () => showToast(`«${item.text}» удалено`, snapshot),
  });
}

function openChoice({ title, sub, options, after }) {
  openSheet(`
    <h2 class="sheet-title">${esc(title)}</h2>
    <p class="sheet-sub">${esc(sub)}</p>
    ${options.map((o, i) => `<button class="option" data-i="${i}"><span class="option-title">${esc(o.title)}</span><span class="option-hint">${esc(o.hint)}</span></button>`).join('')}
    <button class="btn btn-secondary" id="c-cancel">Отмена</button>
  `, (sheet) => {
    sheet.querySelectorAll('.option').forEach((b) => {
      b.onclick = () => { options[b.dataset.i].run(); closeSheet(); commit(); after?.(); };
    });
    sheet.querySelector('#c-cancel').onclick = closeSheet;
  });
}

function openCarrySheet() {
  const list = carryCandidates();
  const yesterday = keyOf(addDays(today(), -1));
  const fromYesterday = list.every((x) => x.date === yesterday);
  openSheet(`
    <h2 class="sheet-title">${fromYesterday ? 'Не сделано со вчера' : 'Не сделано за прошлые дни'}</h2>
    <p class="sheet-sub">Выбери, что перенести на сегодня. Остальное останется на своих днях.</p>
    <div class="pick-list">
      ${list.map((t) => {
        const d = fromKey(t.date);
        return `<label class="pick-row"><input type="checkbox" checked data-id="${t.id}"><span>${esc(t.text)}</span><small>${DAYS_SHORT[weekday(d)].toLowerCase()}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}</small></label>`;
      }).join('')}
    </div>
    <button class="btn btn-primary" id="carry-go"></button>
    <button class="btn btn-secondary" id="carry-keep">Оставить как есть</button>
  `, (sheet) => {
    const boxes = [...sheet.querySelectorAll('input[type=checkbox]')];
    const btn = sheet.querySelector('#carry-go');
    const refresh = () => {
      const n = boxes.filter((b) => b.checked).length;
      btn.textContent = `Перенести на сегодня (${n})`;
      btn.disabled = !n;
    };
    boxes.forEach((b) => (b.onchange = refresh));
    refresh();
    btn.onclick = () => {
      const t = keyOf(today());
      for (const b of boxes) {
        const task = findTask(b.dataset.id);
        if (b.checked) task.date = t; else state.carryDismissed.push(task.id);
      }
      closeSheet(); commit();
    };
    sheet.querySelector('#carry-keep').onclick = () => {
      state.carryDismissed.push(...list.map((t) => t.id));
      closeSheet(); commit();
    };
  });
}

// ---------- плашка «Вернуть» ----------

let toastTimer = null, undoSnapshot = null;
function showToast(text, snapshot) {
  undoSnapshot = snapshot;
  $('toast-text').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; undoSnapshot = null; }, 4000);
}
$('toast-undo').onclick = () => {
  if (undoSnapshot) { state = JSON.parse(undoSnapshot); commit(); }
  $('toast').hidden = true;
  undoSnapshot = null;
};

// ---------- тема ----------

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('theme-color').content = dark ? '#0E0E10' : '#F4F4F5';
}
$('theme-switch').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.settings.theme = b.dataset.themeValue;
  applyTheme(); commit();
};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

$('done-down').onchange = (e) => { state.settings.doneDown = e.target.checked; commit(); };

// ---------- резервная копия ----------

$('backup-save').onclick = async () => {
  const t = today();
  const payload = JSON.stringify({ app: 'planer', version: 2, savedAt: keyOf(t), tasks: state.tasks, series: state.series }, null, 2);
  const name = `planer-${keyOf(t)}.json`;
  const file = new File([payload], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] }); // на iPhone откроется меню «Сохранить в Файлы»
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    state.settings.lastBackup = keyOf(t);
    commit();
  } catch (err) {
    if (err.name !== 'AbortError') alert('Не получилось сохранить копию. Попробуй ещё раз.');
  }
};

$('backup-restore').onclick = () => $('restore-input').click();
$('restore-input').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let data;
  try {
    data = JSON.parse(await file.text());
    if (data.app !== 'planer' || !Array.isArray(data.tasks) || !Array.isArray(data.series)) throw new Error('format');
  } catch {
    alert('Это не копия планера. Выбери файл planer-….json');
    return;
  }
  const n = data.tasks.length + data.series.length;
  const when = data.savedAt ? `Копия от ${longDate(fromKey(data.savedAt))}` : 'Копия';
  openSheet(`
    <h2 class="sheet-title">Восстановить из копии?</h2>
    <p class="sheet-sub">${when}, в ней ${n} ${plural(n, 'дело', 'дела', 'дел')}. Всё, что сейчас в планере, заменится на записи из копии.</p>
    <button class="btn btn-primary" id="r-go">Восстановить</button>
    <button class="btn btn-secondary" id="r-cancel">Отмена</button>
  `, (sheet) => {
    sheet.querySelector('#r-go').onclick = () => {
      state = { ...state, tasks: data.tasks, series: data.series, carryDismissed: [] };
      closeSheet(); go('week');
      save();
    };
    sheet.querySelector('#r-cancel').onclick = closeSheet;
  });
};

// ---------- старт ----------

// если приложение висело открытым со вчера — обновить «сегодня»
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

applyTheme();
render();

// офлайн-режим и установка на телефон (на file:// не работает — нужен сервер)
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js');
}
