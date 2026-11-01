// Всё хранится только в этом браузере (localStorage), никуда не отправляется.
//
// tasks  — разовые дела: { id, text, important, date: 'ГГГГ-ММ-ДД', done, created }
// series — повторяющиеся: { id, text, important, weekdays: [0..6] (пн = 0), start, end?,
//                           skips: [даты, где удалено], done: [даты, где сделано], created }
const STORE_KEY = 'planner:v2';

// ---------- языки ----------
// Все надписи интерфейса. Язык выбирается в настройках, по умолчанию английский.
const STR = {
  en: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    daysIn: ['on Monday', 'on Tuesday', 'on Wednesday', 'on Thursday', 'on Friday', 'on Saturday', 'on Sunday'],
    daysEvery: ['every Monday', 'every Tuesday', 'every Wednesday', 'every Thursday', 'every Friday', 'every Saturday', 'every Sunday'],
    daysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    longDate: (d, m) => `${m} ${d}`,
    shortDate: (d, m) => `${m} ${d}`,
    weekRange: (d1, m1, d2, m2) => (m1 === m2 ? `${m1} ${d1} — ${d2}` : `${m1} ${d1} — ${m2} ${d2}`),
    everyDay: 'every day', weekdays: 'on weekdays', weekends: 'on weekends', everyList: (l) => 'every ' + l,
    appName: 'Planner',
    toThisWeek: 'Go to this week', prevWeek: 'Previous week', nextWeek: 'Next week', settings: 'Settings',
    language: 'Language', move: 'Move', week: 'Week', newTask: 'New task',
    appearance: 'Appearance', theme: 'Theme', themeSystem: 'Like iPhone', themeLight: 'Light', themeDark: 'Dark',
    tasks: 'Tasks', doneDown: 'Done to the bottom', doneDownHint: 'A checked task moves to the end of the day, into “Done”',
    backup: 'Backup', saveBackup: 'Save backup', restore: 'Restore from backup', restoreHint: 'Pick a file you saved earlier',
    backupNote: 'Your tasks are stored only on this phone. If you delete the app or clear Safari, they will be lost. Save a backup once a week to Files or iCloud Drive.',
    undo: 'Undo', delete: 'Delete',
    doneAria: (t) => `Done: ${t}`, editAria: (t) => `Edit: ${t}`,
    weekCount: (done, total) => `done this week, ${done} of ${total}`, weekEmpty: 'no tasks this week yet',
    carryText: (n, yesterday) => `${n} ${n === 1 ? 'task' : 'tasks'} from ${yesterday ? 'yesterday' : 'previous days'} not done`,
    openDay: (day, date) => `Open ${day}, ${date}`, today: 'today', addLink: '+ task',
    dayCount: (done, total) => `${done} of ${total} done`, dayEmpty: 'No tasks yet',
    important: 'Important', other: 'Other', done: 'Done', emptyHint: 'Add your first task with the button below.',
    prevDay: (day, date) => `Previous day, ${day} ${date}`, nextDay: (day, date) => `Next day, ${day} ${date}`,
    lastBackup: (date) => `Last backup: ${date}`, noBackup: 'No backup yet',
    editTask: 'Edit task', placeholder: 'What needs to be done?', repeatWeekly: 'Repeat every week',
    importantHint: 'Shown in bold and first in the day', save: 'Save', add: 'Add', deleteTask: 'Delete task',
    noDays: 'No days selected', whichDays: 'Which days', day: 'Day', willRepeat: (l) => `Repeats ${l}`, pickDays: 'Pick days', onlyThisDay: 'Only on this day',
    editTitle: (t) => `Edit “${t}”`, deleteTitle: (t) => `Delete “${t}”`, repeats: (l) => `This task repeats ${l}`,
    onlyOn: (dayIn, date) => `Only ${dayIn}, ${date}`, otherDaysSame: 'Other days stay as they are', allDays: 'On all days', allDaysHint: 'Changes everywhere it repeats',
    otherDaysStay: 'Stays on other days', forever: 'Completely', foreverHint: 'Will no longer repeat',
    deleted: (t) => `“${t}” deleted`, cancel: 'Cancel',
    carryTitleYesterday: 'Not done yesterday', carryTitle: 'Not done in previous days', carrySub: 'Choose what to move to today. The rest stays on its days.',
    carryGo: (n) => `Move to today (${n})`, carryKeep: 'Leave as is',
    backupError: 'Couldn’t save the backup. Please try again.', notBackup: 'This is not a planner backup. Pick a planer-….json file',
    restoreTitle: 'Restore from backup?', backupFrom: (date) => `Backup from ${date}`, backupPlain: 'Backup',
    restoreBody: (when, n) => `${when}, ${n} ${n === 1 ? 'task' : 'tasks'}. Everything in the planner now will be replaced with the backup.`, restoreGo: 'Restore',
  },
  ru: {
    days: ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'],
    daysIn: ['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'],
    daysEvery: ['каждый понедельник', 'каждый вторник', 'каждую среду', 'каждый четверг', 'каждую пятницу', 'каждую субботу', 'каждое воскресенье'],
    daysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    monthsShort: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'нояб', 'дек'],
    longDate: (d, m) => `${d} ${m}`,
    shortDate: (d, m) => `${d} ${m}`,
    weekRange: (d1, m1, d2, m2) => (m1 === m2 ? `${d1} — ${d2} ${m2}` : `${d1} ${m1} — ${d2} ${m2}`),
    everyDay: 'каждый день', weekdays: 'по будням', weekends: 'по выходным', everyList: (l) => 'каждые ' + l.toLowerCase(),
    appName: 'Планер',
    toThisWeek: 'К текущей неделе', prevWeek: 'Прошлая неделя', nextWeek: 'Следующая неделя', settings: 'Настройки',
    language: 'Язык', move: 'Перенести', week: 'Неделя', newTask: 'Новое дело',
    appearance: 'Оформление', theme: 'Тема', themeSystem: 'Как на iPhone', themeLight: 'Светлая', themeDark: 'Тёмная',
    tasks: 'Дела', doneDown: 'Сделанные — вниз', doneDownHint: 'Отмеченное дело уходит в конец дня, в раздел «Сделано»',
    backup: 'Резервная копия', saveBackup: 'Сохранить копию', restore: 'Восстановить из копии', restoreHint: 'Выбери файл, сохранённый раньше',
    backupNote: 'Записи хранятся только на этом телефоне. Если удалить приложение или очистить Safari, они пропадут. Сохраняй копию раз в неделю в «Файлы» или iCloud Drive.',
    undo: 'Вернуть', delete: 'Удалить',
    doneAria: (t) => `Сделано: ${t}`, editAria: (t) => `Изменить: ${t}`,
    weekCount: (done, total) => `сделано за неделю, ${done} из ${total}`, weekEmpty: 'на этой неделе пока нет дел',
    carryText: (n, yesterday) => `${n} ${pluralRu(n, 'дело', 'дела', 'дел')} ${yesterday ? 'со вчера' : 'с прошлых дней'} не ${n === 1 ? 'сделано' : 'сделаны'}`,
    openDay: (day, date) => `Открыть ${day}, ${date}`, today: 'сегодня', addLink: '+ дело',
    dayCount: (done, total) => `Сделано ${done} из ${total}`, dayEmpty: 'Дел пока нет',
    important: 'Важное', other: 'Остальное', done: 'Сделано', emptyHint: 'Добавь первое дело кнопкой внизу.',
    prevDay: (day, date) => `Предыдущий день, ${day} ${date}`, nextDay: (day, date) => `Следующий день, ${day} ${date}`,
    lastBackup: (date) => `Последняя копия: ${date}`, noBackup: 'Копию ещё не сохраняли',
    editTask: 'Изменить дело', placeholder: 'Что нужно сделать?', repeatWeekly: 'Повторять каждую неделю',
    importantHint: 'Выделяется жирным и стоит первым в дне', save: 'Сохранить', add: 'Добавить', deleteTask: 'Удалить дело',
    noDays: 'Дни не выбраны', whichDays: 'По каким дням', day: 'День', willRepeat: (l) => `Будет ${l}`, pickDays: 'Выбери дни', onlyThisDay: 'Только в этот день',
    editTitle: (t) => `Изменить «${t}»`, deleteTitle: (t) => `Удалить «${t}»`, repeats: (l) => `Это дело повторяется: ${l}`,
    onlyOn: (dayIn, date) => `Только ${dayIn}, ${date}`, otherDaysSame: 'В остальные дни останется как было', allDays: 'Во всех днях', allDaysHint: 'Изменится везде, где повторяется',
    otherDaysStay: 'В остальные дни останется', forever: 'Совсем', foreverHint: 'Больше не будет повторяться',
    deleted: (t) => `«${t}» удалено`, cancel: 'Отмена',
    carryTitleYesterday: 'Не сделано со вчера', carryTitle: 'Не сделано за прошлые дни', carrySub: 'Выбери, что перенести на сегодня. Остальное останется на своих днях.',
    carryGo: (n) => `Перенести на сегодня (${n})`, carryKeep: 'Оставить как есть',
    backupError: 'Не получилось сохранить копию. Попробуй ещё раз.', notBackup: 'Это не копия планера. Выбери файл planer-….json',
    restoreTitle: 'Восстановить из копии?', backupFrom: (date) => `Копия от ${date}`, backupPlain: 'Копия',
    restoreBody: (when, n) => `${when}, в ней ${n} ${pluralRu(n, 'дело', 'дела', 'дел')}. Всё, что сейчас в планере, заменится на записи из копии.`, restoreGo: 'Восстановить',
  },
};
const L = () => STR[state.settings.lang] ?? STR.en;

function pluralRu(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

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
const longDate = (d) => L().longDate(d.getDate(), L().months[d.getMonth()]);
const shortDate = (d) => L().shortDate(d.getDate(), L().monthsShort[d.getMonth()]);
const dayName = (d) => L().days[weekday(d)];

function weekRange(mon) {
  const sun = addDays(mon, 6), ms = L().monthsShort;
  return L().weekRange(mon.getDate(), ms[mon.getMonth()], sun.getDate(), ms[sun.getMonth()]);
}

function repeatLabel(weekdays) {
  const w = [...weekdays].sort();
  if (w.length === 7) return L().everyDay;
  if (w.join() === '0,1,2,3,4') return L().weekdays;
  if (w.join() === '5,6') return L().weekends;
  if (w.length === 1) return L().daysEvery[w[0]];
  return L().everyList(w.map((i) => L().daysShort[i]).join(', '));
}

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- состояние ----------

const emptyState = () => ({ tasks: [], series: [], carryDismissed: [], settings: { theme: 'system', lastBackup: null, doneDown: true, lang: 'en' } });

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
    <button class="swipe-delete" tabindex="-1">${L().delete}</button>
    <div class="task${item.done ? ' is-done' : ''}${item.important ? ' is-important' : ''}">
      <button class="check" role="checkbox" aria-checked="${item.done}" aria-label="${L().doneAria(esc(item.text))}">${CHECK_SVG}</button>
      <button class="task-body" aria-label="${L().editAria(esc(item.text))}">
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
  $('week-count').textContent = total ? L().weekCount(done, total) : L().weekEmpty;
  $('week-bar').style.width = `${pct}%`;

  // баннер переноса
  const carry = isCurrent ? carryCandidates() : [];
  $('carry-banner').hidden = !carry.length;
  if (carry.length) {
    const yesterday = keyOf(addDays(t, -1));
    $('carry-text').textContent = L().carryText(carry.length, carry.every((x) => x.date === yesterday));
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
      <button class="day-head" aria-label="${L().openDay(L().days[i], longDate(d))}">
        <span class="dname">${L().daysShort[i]}</span><span>${d.getDate()}</span>
        ${key === tKey ? `<span class="pill">${L().today}</span>` : ''}
      </button>
      <div class="task-list"></div>
      <button class="add-link">${L().addLink}</button>`;
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
  $('day-title').textContent = `${cap(dayName(d))}, ${longDate(d)}`;
  $('day-count').textContent = items.length ? L().dayCount(done, items.length) : L().dayEmpty;
  $('day-bar').style.width = items.length ? `${Math.round(done / items.length * 100)}%` : '0';

  const box = $('day-sections');
  box.replaceChildren();
  // при «Сделанные — вниз» сделанные уходят в отдельный раздел в конце
  const doneDown = state.settings.doneDown;
  const open = doneDown ? items.filter((x) => !x.done) : items;
  const groups = [
    ['important', open.filter((x) => x.important)],
    ['other', open.filter((x) => !x.important)],
    ['done', doneDown ? items.filter((x) => x.done) : []],
  ].filter(([, list]) => list.length);
  const section = (label, list) => {
    const s = document.createElement('section');
    s.className = 'day-section';
    s.innerHTML = label ? `<h2 class="section-label">${label}</h2><div class="task-list"></div>` : '<div class="task-list"></div>';
    s.querySelector('.task-list').append(...list.map((x) => taskRow(x)));
    box.append(s);
  };
  if (!items.length) box.innerHTML = `<p class="empty">${L().emptyHint}</p>`;
  // если раздел один и это обычные дела — без заголовка
  else if (groups.length === 1 && groups[0][0] === 'other') section('', items);
  else for (const [label, list] of groups) section(L()[label], list);

  const prev = addDays(d, -1), next = addDays(d, 1);
  $('prev-day').setAttribute('aria-label', L().prevDay(dayName(prev), longDate(prev)));
  $('next-day').setAttribute('aria-label', L().nextDay(dayName(next), longDate(next)));
}

function renderSettings() {
  for (const b of $('theme-switch').children) b.setAttribute('aria-pressed', b.dataset.themeValue === state.settings.theme);
  for (const b of $('lang-switch').children) b.setAttribute('aria-pressed', b.dataset.langValue === state.settings.lang);
  $('done-down').checked = state.settings.doneDown;
  const last = state.settings.lastBackup;
  $('backup-last').textContent = last ? L().lastBackup(longDate(fromKey(last))) : L().noBackup;
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
      <h2 class="sheet-title">${editing ? L().editTask : L().newTask}</h2>
      <p class="sheet-date" id="f-subtitle"></p>
    </div>
    <input class="field" id="f-text" placeholder="${L().placeholder}" maxlength="200" enterkeyhint="done" autocomplete="off">
    <div id="f-days-wrap">
      <div class="label" id="f-days-label"></div>
      <div class="chips" id="f-days">
        ${L().daysShort.map((n, i) => `<button class="chip" data-i="${i}" aria-pressed="${selected.has(i)}">${n}<small>${addDays(mon, i).getDate()}</small></button>`).join('')}
      </div>
    </div>
    <label class="switch-row">
      <span class="switch-text"><span class="switch-title">${L().repeatWeekly}</span><span class="switch-hint" id="f-repeat-hint"></span></span>
      <input type="checkbox" class="switch" id="f-repeat">
    </label>
    <label class="switch-row">
      <span class="switch-text"><span class="switch-title">${L().important}</span><span class="switch-hint">${L().importantHint}</span></span>
      <input type="checkbox" class="switch" id="f-important">
    </label>
    <button class="btn btn-primary" id="f-save">${editing ? L().save : L().add}</button>
    ${editing ? `<button class="btn btn-secondary" id="f-delete">${L().deleteTask}</button>` : ''}
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
        ? (selected.size ? cap(repeatLabel([...selected])) : L().noDays)
        : `${cap(dayName(first))}, ${longDate(first)}`;
      sheet.querySelector('#f-days-wrap').hidden = !rep.checked && !editing;
      sheet.querySelector('#f-days-label').textContent = rep.checked ? L().whichDays : L().day;
      for (const c of chips) c.setAttribute('aria-pressed', selected.has(Number(c.dataset.i)));
      sheet.querySelector('#f-repeat-hint').textContent = rep.checked
        ? (selected.size ? L().willRepeat(repeatLabel([...selected])) : L().pickDays)
        : L().onlyThisDay;
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
    title: L().editTitle(s.text),
    sub: L().repeats(repeatLabel(s.weekdays)),
    options: [
      { title: L().onlyOn(L().daysIn[weekday(d)], longDate(d)), hint: L().otherDaysSame, run: () => {
        s.skips.push(item.date);
        state.tasks.push({ id: uid(), text, important, date: item.date, done: item.done, created: s.created });
      } },
      { title: L().allDays, hint: L().allDaysHint, run: () => Object.assign(s, { text, important }) },
    ],
  });
}

function requestDelete(item) {
  const snapshot = JSON.stringify(state);
  const finish = () => { closeSheet(); commit(); showToast(L().deleted(item.text), snapshot); };
  if (item.kind === 'one') {
    state.tasks = state.tasks.filter((t) => t.id !== item.id);
    return finish();
  }
  const s = findSeries(item.id), d = fromKey(item.date);
  openChoice({
    title: L().deleteTitle(s.text),
    sub: L().repeats(repeatLabel(s.weekdays)),
    options: [
      { title: L().onlyOn(L().daysIn[weekday(d)], longDate(d)), hint: L().otherDaysStay, run: () => s.skips.push(item.date) },
      { title: L().forever, hint: L().foreverHint, run: () => { s.end = item.date; } },
    ],
    after: () => showToast(L().deleted(item.text), snapshot),
  });
}

function openChoice({ title, sub, options, after }) {
  openSheet(`
    <h2 class="sheet-title">${esc(title)}</h2>
    <p class="sheet-sub">${esc(sub)}</p>
    ${options.map((o, i) => `<button class="option" data-i="${i}"><span class="option-title">${esc(o.title)}</span><span class="option-hint">${esc(o.hint)}</span></button>`).join('')}
    <button class="btn btn-secondary" id="c-cancel">${L().cancel}</button>
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
    <h2 class="sheet-title">${fromYesterday ? L().carryTitleYesterday : L().carryTitle}</h2>
    <p class="sheet-sub">${L().carrySub}</p>
    <div class="pick-list">
      ${list.map((t) => {
        const d = fromKey(t.date);
        return `<label class="pick-row"><input type="checkbox" checked data-id="${t.id}"><span>${esc(t.text)}</span><small>${L().daysShort[weekday(d)]}, ${shortDate(d)}</small></label>`;
      }).join('')}
    </div>
    <button class="btn btn-primary" id="carry-go"></button>
    <button class="btn btn-secondary" id="carry-keep">${L().carryKeep}</button>
  `, (sheet) => {
    const boxes = [...sheet.querySelectorAll('input[type=checkbox]')];
    const btn = sheet.querySelector('#carry-go');
    const refresh = () => {
      const n = boxes.filter((b) => b.checked).length;
      btn.textContent = L().carryGo(n);
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

// ---------- язык ----------

// постоянные надписи в разметке помечены data-i18n (текст) и data-i18n-aria (aria-label)
function applyLang() {
  const s = L();
  document.documentElement.lang = state.settings.lang === 'ru' ? 'ru' : 'en';
  document.title = s.appName;
  document.querySelector('meta[name="apple-mobile-web-app-title"]').content = s.appName;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = s[el.dataset.i18n];
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', s[el.dataset.i18nAria]);
}
$('lang-switch').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.settings.lang = b.dataset.langValue;
  applyLang(); commit();
};

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
    if (err.name !== 'AbortError') alert(L().backupError);
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
    alert(L().notBackup);
    return;
  }
  const n = data.tasks.length + data.series.length;
  const when = data.savedAt ? L().backupFrom(longDate(fromKey(data.savedAt))) : L().backupPlain;
  openSheet(`
    <h2 class="sheet-title">${L().restoreTitle}</h2>
    <p class="sheet-sub">${L().restoreBody(when, n)}</p>
    <button class="btn btn-primary" id="r-go">${L().restoreGo}</button>
    <button class="btn btn-secondary" id="r-cancel">${L().cancel}</button>
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
applyLang();
render();

// офлайн-режим и установка на телефон (на file:// не работает — нужен сервер)
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js');
}
