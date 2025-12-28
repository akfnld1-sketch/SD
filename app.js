(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const KEY = "sdbiosensor_materials_attendance_v3_pay_timewindow";

  const MIN_DATE_KEY = "2026-01-01";

  const STATUS = [
    { id: "in", label: "✅ 출근" },
    { id: "out", label: "🏁 퇴근" },
    { id: "late", label: "🟨 지각" },     // 지각 버튼은 “상태표시”로만 쓰고, 지각분은 출근시간으로 자동 계산
    { id: "absent", label: "🟥 결근" },
    { id: "leave", label: "🟦 연차(전일)" },
    { id: "half", label: "🟪 반차(0.5)" },
  ];

  // ✅ 현우님 규칙 반영 설정
  const DEFAULT_SETTINGS = {
    annualLeaveStart: 15,

    // 급여 배수(원하는 대로 조정 가능)
    ot1Multiplier: 1.5,          // 18:00~20:30 연장
    ot2Multiplier: 1.5,          // 20:30 이후 추가 연장(예시값, 필요시 바꾸세요)
    nightExtraMultiplier: 0.5,   // 심야 가산(추가)

    // 30분 단위 끊기
    roundMode: "ceil",           // ceil|floor|nearest

    // 월급 → 시급 환산(월)
    monthlyStdHours: 209,

    // ✅ 시간대 기준
    scheduledStart: "09:00",     // 기준 출근(지각 기준)
    ot1Start: "18:00",           // 연장 시작
    ot1End: "20:30",             // 연장1 종료
    nightStart: "22:00",         // 심야 시작
    nightEnd: "06:00",           // 심야 종료
  };

  const state = {
    roster: [],   // [{id,name,payType,hourlyWage,monthlyBase}]
    byDate: {},   // {dateKey:{statusById:{pid:{status,inTime,outTime,note}}, logs:[]}}
    undoStack: [],
    settings: { ...DEFAULT_SETTINGS },

    calYear: 2025,
    calMonth: 12,
    selectedDateKey: MIN_DATE_KEY,
  };

  // ---------------- util
  const pad2 = (n) => String(n).padStart(2, "0");
  function keyOf(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }
  function todayKey() {
    const d = new Date();
    return keyOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  function nowTime() {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }
  function parseKey(k) {
    const [y, m, d] = (k || "").split("-").map(Number);
    return { y, m, d };
  }
  function isBeforeMinDate(k) { return (k || "") < MIN_DATE_KEY; }
  function ensureDate(k) { if (!state.byDate[k]) state.byDate[k] = { statusById: {}, logs: [] }; }
  function statusLabel(id) { return STATUS.find(s => s.id === id)?.label || id; }

  function toMin(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":").map(Number);
    if ([h, m].some(Number.isNaN)) return null;
    return h * 60 + m;
  }

  // 출퇴근 구간을 0..48h 범위로 확장(자정 넘어가면 out + 24h)
  function workInterval(inHHMMSS, outHHMMSS) {
    if (!inHHMMSS || !outHHMMSS) return null;
    const inHHMM = inHHMMSS.slice(0,5);
    const outHHMM = outHHMMSS.slice(0,5);
    const a0 = toMin(inHHMM);
    const b0 = toMin(outHHMM);
    if (a0 == null || b0 == null) return null;
    let a = a0;
    let b = b0;
    if (b < a) b += 24 * 60; // next day
    return { a, b }; // minutes
  }

  function overlap(a, b, s, e) {
    const x = Math.max(a, s);
    const y = Math.min(b, e);
    return Math.max(0, y - x);
  }

  // 30분 단위 끊기
  function round30(min, mode) {
    const unit = 30;
    const v = Math.max(0, Number(min) || 0);
    const q = v / unit;
    if (mode === "floor") return Math.floor(q) * unit;
    if (mode === "nearest") return Math.round(q) * unit;
    return Math.ceil(q) * unit;
  }

  function hhmm(min) {
    const m = Math.max(0, Number(min) || 0);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}:${pad2(mm)}`;
  }

  function money(n) {
    const x = Math.round(Number(n) || 0);
    return x.toLocaleString("ko-KR");
  }

  // 심야(22~06) 겹침 분 계산
  function nightMinutes(inHHMMSS, outHHMMSS) {
    const itv = workInterval(inHHMMSS, outHHMMSS);
    if (!itv) return 0;
    const { a, b } = itv;

    const ns = toMin(state.settings.nightStart) ?? (22*60);
    const ne = toMin(state.settings.nightEnd) ?? (6*60);

    // 22:00~24:00
    const seg1 = overlap(a, b, ns, 24*60);
    // 00:00~06:00 (당일)
    const seg2 = overlap(a, b, 0, ne);
    // 00:00~06:00 (다음날, b가 1440 넘어갈 때)
    const seg3 = overlap(a, b, 24*60, 24*60 + ne);

    return seg1 + seg2 + seg3;
  }

  // ---------------- storage
  function load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      Object.assign(state, obj);
      state.settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };

      if (!state.selectedDateKey || isBeforeMinDate(state.selectedDateKey)) state.selectedDateKey = MIN_DATE_KEY;
      const { y, m } = parseKey(state.selectedDateKey);
      state.calYear = y || 2026;
      state.calMonth = m || 1;

      for (const p of state.roster) {
        if (!p.payType) p.payType = "hourly";
        if (p.hourlyWage == null) p.hourlyWage = 0;
        if (p.monthlyBase == null) p.monthlyBase = 0;
      }
    } catch {}
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

  // ---------------- leave
  function calcLeaveUsageForYear(pid, year) {
    let usedFull = 0;
    let usedHalf = 0;
    for (const dateKey of Object.keys(state.byDate)) {
      if (!dateKey.startsWith(String(year) + "-")) continue;
      const rec = state.byDate[dateKey]?.statusById?.[pid];
      if (!rec?.status) continue;
      if (rec.status === "leave") usedFull += 1;
      if (rec.status === "half") usedHalf += 1;
    }
    return { usedFull, usedHalf, usedDays: usedFull + usedHalf * 0.5 };
  }
  function calcLeaveRemaining(pid, dateKey) {
    const { y } = parseKey(dateKey);
    const start = Number(state.settings.annualLeaveStart) || 0;
    const usage = calcLeaveUsageForYear(pid, y);
    const remaining = start - usage.usedDays;
    return { year: y, start, ...usage, remaining: Math.round(remaining * 10) / 10 };
  }

  // ---------------- pay
  function personHourlyWage(person) {
    const payType = person.payType || "hourly";
    if (payType === "monthly") {
      const base = Number(person.monthlyBase) || 0;
      const stdH = Number(state.settings.monthlyStdHours) || 209;
      return stdH > 0 ? (base / stdH) : 0;
    }
    return Number(person.hourlyWage) || 0;
  }

  /**
   * ✅ 핵심: 시간대 기반 계산
   * - 지각: scheduledStart 기준 늦은 분 -> 30분 단위 끊기
   * - OT1: 18:00~20:30 겹침 -> 30분 단위 끊기
   * - OT2: 20:30~퇴근 겹침 -> 30분 단위 끊기
   * - 심야: 22:00~06:00 겹침 -> (가산만)
   */
  function calcForPersonOnDate(person, rec) {
    const hourly = personHourlyWage(person);
    const roundMode = state.settings.roundMode || "ceil";

    // 유급/무급은 회사마다 달라서, 연차/반차/결근은 여기선 “근무/수당 계산 0” 처리
    if (["leave","half","absent"].includes(rec?.status)) {
      return {
        hourly,
        lateRaw: 0, late30: 0,
        ot1Raw: 0, ot1_30: 0,
        ot2Raw: 0, ot2_30: 0,
        nightMin: 0,
        payOT1: 0, payOT2: 0, payNightExtra: 0,
        payTotal: 0
      };
    }

    const itv = workInterval(rec?.inTime, rec?.outTime);
    if (!itv) {
      return {
        hourly,
        lateRaw: 0, late30: 0,
        ot1Raw: 0, ot1_30: 0,
        ot2Raw: 0, ot2_30: 0,
        nightMin: 0,
        payOT1: 0, payOT2: 0, payNightExtra: 0,
        payTotal: 0
      };
    }

    const { a, b } = itv;

    // 지각
    const sched = toMin(state.settings.scheduledStart) ?? (9*60);
    const lateRaw = Math.max(0, a - sched);
    const late30 = round30(lateRaw, roundMode);

    // OT1: 18:00~20:30
    const ot1S = toMin(state.settings.ot1Start) ?? (18*60);
    const ot1E = toMin(state.settings.ot1End) ?? (20*60+30);
    const ot1Raw = overlap(a, b, ot1S, ot1E);
    const ot1_30 = round30(ot1Raw, roundMode);

    // OT2: 20:30~(퇴근)
    const ot2Raw = overlap(a, b, ot1E, b); // 20:30 이후만
    const ot2_30 = round30(ot2Raw, roundMode);

    // 심야(가산만)
    const nightMin = nightMinutes(rec?.inTime, rec?.outTime);

    // 수당 계산
    const ot1Mul = Number(state.settings.ot1Multiplier) || 1.5;
    const ot2Mul = Number(state.settings.ot2Multiplier) || 2.0;
    const nightExtra = Number(state.settings.nightExtraMultiplier) || 0.5;

    const payOT1 = (ot1_30 / 60) * hourly * ot1Mul;
    const payOT2 = (ot2_30 / 60) * hourly * ot2Mul;
    const payNightExtra = (nightMin / 60) * hourly * nightExtra;

    const payTotal = payOT1 + payOT2 + payNightExtra;

    return {
      hourly,
      lateRaw, late30,
      ot1Raw, ot1_30,
      ot2Raw, ot2_30,
      nightMin,
      payOT1, payOT2, payNightExtra,
      payTotal
    };
  }

  // ---------------- actions
  function pushUndo(action) {
    state.undoStack.push(action);
    if (state.undoStack.length > 80) state.undoStack.shift();
  }

  function addPerson(name) {
    const n = String(name || "").trim();
    if (!n) return;
    state.roster.push({
      id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
      name: n,
      createdAt: Date.now(),
      payType: "hourly",
      hourlyWage: 0,
      monthlyBase: 0,
    });
    save(); render();
  }

  function setStatus(pid, statusId) {
    const k = state.selectedDateKey;
    if (isBeforeMinDate(k)) return alert("2026년 1월 1일 이후 날짜만 선택 가능합니다.");

    ensureDate(k);
    const day = state.byDate[k];

    const prev = day.statusById[pid] ? { ...day.statusById[pid] } : null;
    const cur = day.statusById[pid] || { status: null, inTime: null, outTime: null, note: "" };

    const t = nowTime();

    if (["in","late"].includes(statusId) && !cur.inTime) cur.inTime = t;
    if (statusId === "out") cur.outTime = t;

    if (["leave","half","absent"].includes(statusId)) {
      cur.inTime = null;
      cur.outTime = null;
    }

    cur.status = statusId;
    day.statusById[pid] = cur;

    const person = state.roster.find(p => p.id === pid);
    const logItem = {
      id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
      time: t,
      dateKey: k,
      pid,
      name: person?.name || "(알수없음)",
      type: "status",
      payload: { statusId }
    };
    day.logs.unshift(logItem);

    pushUndo({ dateKey: k, pid, prev, logId: logItem.id });
    save(); render();
  }

  function setTime(pid, field, hhmm) {
    const k = state.selectedDateKey;
    ensureDate(k);
    const day = state.byDate[k];

    const prev = day.statusById[pid] ? { ...day.statusById[pid] } : null;
    const cur = day.statusById[pid] || { status: null, inTime: null, outTime: null, note: "" };

    cur[field] = hhmm ? `${hhmm}:00` : null;
    day.statusById[pid] = cur;

    const person = state.roster.find(p => p.id === pid);
    const logItem = {
      id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
      time: nowTime(),
      dateKey: k,
      pid,
      name: person?.name || "(알수없음)",
      type: "edit",
      payload: { field, value: hhmm || "" }
    };
    day.logs.unshift(logItem);

    pushUndo({ dateKey: k, pid, prev, logId: logItem.id });
    save(); render();
  }

  function setNote(pid, note) {
    const k = state.selectedDateKey;
    ensureDate(k);
    const day = state.byDate[k];
    const prev = day.statusById[pid] ? { ...day.statusById[pid] } : null;
    const cur = day.statusById[pid] || { status: null, inTime: null, outTime: null, note: "" };
    cur.note = String(note || "");
    day.statusById[pid] = cur;
    pushUndo({ dateKey: k, pid, prev, logId: null });
    save(); render();
  }

  function setPayField(pid, field, value) {
    const person = state.roster.find(p => p.id === pid);
    if (!person) return;
    person[field] = value;
    save(); render();
  }

  function undo() {
    const act = state.undoStack.pop();
    if (!act) return;
    const day = state.byDate[act.dateKey];
    if (!day) return;
    if (act.prev) day.statusById[act.pid] = act.prev;
    else delete day.statusById[act.pid];
    if (act.logId) {
      const idx = day.logs.findIndex(x => x.id === act.logId);
      if (idx >= 0) day.logs.splice(idx, 1);
    }
    save(); render();
  }

  function resetSelectedDay() {
    const k = state.selectedDateKey;
    if (isBeforeMinDate(k)) return;
    if (!confirm(`선택한 날짜(${k}) 기록을 초기화할까요?`)) return;
    state.byDate[k] = { statusById: {}, logs: [] };
    state.undoStack = [];
    save(); render();
  }

  // ---------------- calendar
  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
  function firstDow(y, m) { return new Date(y, m - 1, 1).getDay(); }
  function monthLabel(y, m) { return `${y}년 ${m}월`; }
  function canGoPrev(y, m) {
    let py = y, pm = m - 1;
    if (pm === 0) { pm = 12; py -= 1; }
    const last = daysInMonth(py, pm);
    return !(keyOf(py, pm, last) < MIN_DATE_KEY);
  }
  function buildDayMark(k) {
    if (isBeforeMinDate(k)) return "—";
    const day = state.byDate[k];
    if (!day?.statusById) return "";
    let checked = 0;
    for (const pid of Object.keys(day.statusById)) {
      if (day.statusById[pid]?.status) checked++;
    }
    return checked ? `${checked}명` : "";
  }
  function renderCalendar() {
    const y = state.calYear;
    const m = state.calMonth;
    $("#monthLabel").textContent = monthLabel(y, m);

    const cal = $("#calendar");
    cal.innerHTML = "";

    const offset = firstDow(y, m);
    const total = daysInMonth(y, m);
    const tKey = todayKey();

    for (let i = 0; i < offset; i++) {
      const blank = document.createElement("div");
      blank.className = "day disabled";
      blank.style.visibility = "hidden";
      cal.appendChild(blank);
    }

    for (let d = 1; d <= total; d++) {
      const k = keyOf(y, m, d);
      const cell = document.createElement("div");
      cell.className = "day";
      if (k === tKey) cell.classList.add("today");
      if (k === state.selectedDateKey) cell.classList.add("selected");
      if (isBeforeMinDate(k)) cell.classList.add("disabled");

      const mark = buildDayMark(k);
      cell.innerHTML = `<div class="dayNum">${d}</div><div class="dayMark">${mark}</div>`;

      if (!isBeforeMinDate(k)) {
        cell.addEventListener("click", () => {
          state.selectedDateKey = k;
          save(); render();
        });
      }
      cal.appendChild(cell);
    }

    $("#btnPrevMonth").disabled = !canGoPrev(y, m);
    $("#btnNextMonth").disabled = false;
  }
  function shiftMonth(delta) {
    let y = state.calYear;
    let m = state.calMonth + delta;
    if (m === 0) { m = 12; y -= 1; }
    if (m === 13) { m = 1; y += 1; }
    if (delta < 0 && !canGoPrev(state.calYear, state.calMonth)) return;
    state.calYear = y;
    state.calMonth = m;

    const candidate = keyOf(y, m, 1);
    if (candidate < MIN_DATE_KEY) {
      state.calYear = 2026; state.calMonth = 1; state.selectedDateKey = MIN_DATE_KEY;
    } else {
      const sel = parseKey(state.selectedDateKey);
      if (sel.y !== y || sel.m !== m) state.selectedDateKey = candidate;
    }
    save(); render();
  }

  // ---------------- export
  function csvEscape(v) {
    const s = String(v ?? "");
    if (/[,"\n]/.test(s)) return `"${s.replaceAll('"','""')}"`;
    return s;
  }

  function exportCsv() {
    const k = state.selectedDateKey;
    if (isBeforeMinDate(k)) return alert("2026년 1월 1일 이후 날짜만 선택 가능합니다.");
    ensureDate(k);
    const day = state.byDate[k];

    const header = [
      "date","name","status","inTime","outTime",
      "lateRaw","late30",
      "ot1Raw","ot1_30",
      "ot2Raw","ot2_30",
      "nightMin",
      "hourly(calc)",
      "payOT1","payOT2","payNightExtra","payTotal",
      "note"
    ];
    const rows = [header.join(",")];

    for (const p of state.roster) {
      const rec = day.statusById[p.id] || {};
      const calc = calcForPersonOnDate(p, rec);

      rows.push([
        k,
        csvEscape(p.name),
        csvEscape(rec.status ? statusLabel(rec.status) : ""),
        rec.inTime ? rec.inTime.slice(0,5) : "",
        rec.outTime ? rec.outTime.slice(0,5) : "",
        calc.lateRaw,
        calc.late30,
        calc.ot1Raw,
        calc.ot1_30,
        calc.ot2Raw,
        calc.ot2_30,
        calc.nightMin,
        Math.round(calc.hourly),
        Math.round(calc.payOT1),
        Math.round(calc.payOT2),
        Math.round(calc.payNightExtra),
        Math.round(calc.payTotal),
        csvEscape(rec.note || "")
      ].join(","));
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SD바이오센서_자재팀_시간대기준_급여대조-${k}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function backupJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SD바이오센서_자재팀_출근부_V3_백업-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function restoreJson(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(String(r.result || "{}"));
        Object.assign(state, obj);
        state.settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };

        if (!state.selectedDateKey || isBeforeMinDate(state.selectedDateKey)) state.selectedDateKey = MIN_DATE_KEY;
        const { y, m } = parseKey(state.selectedDateKey);
        state.calYear = y || 2026;
        state.calMonth = m || 1;

        save(); render();
        alert("복원 완료!");
      } catch {
        alert("복원 실패: 파일 형식이 올바르지 않습니다.");
      }
    };
    r.readAsText(file, "utf-8");
  }

  // ---------------- render
  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function render() {
    $("#todayLabel").textContent =
      `날짜: ${state.selectedDateKey} · OT1(18:00~20:30) / OT2(20:30~) · 지각/연장 30분 단위`;

    renderCalendar();

    const k = state.selectedDateKey;
    ensureDate(k);
    const day = state.byDate[k];

    // stats
    const counts = {};
    for (const p of state.roster) {
      const s = day.statusById[p.id]?.status || "none";
      counts[s] = (counts[s] || 0) + 1;
    }
    const parts = [];
    ["in","out","late","absent","leave","half"].forEach(id => {
      if (counts[id]) parts.push(`${statusLabel(id)} ${counts[id]}`.replace("✅ ","").replace("🏁 ",""));
    });
    parts.push(`미체크 ${(counts.none || 0)}`);
    $("#statsLabel").textContent = parts.join(" / ");

    // list
    const list = $("#list");
    list.innerHTML = "";

    if (state.roster.length === 0) {
      list.innerHTML = `<div class="item"><div class="name">명단이 비어있습니다.</div><div class="meta">위에서 이름을 추가해 주세요.</div></div>`;
      return;
    }

    for (const p of state.roster) {
      const rec = day.statusById[p.id] || { status: null, inTime: null, outTime: null, note: "" };
      const badge = rec.status ? statusLabel(rec.status) : "미체크";
      const calc = calcForPersonOnDate(p, rec);

      const meta = [
        `출근: ${rec.inTime ? rec.inTime.slice(0,5) : "-"} / 퇴근: ${rec.outTime ? rec.outTime.slice(0,5) : "-"}`,
        `지각: ${calc.lateRaw}분 → 30분단위 ${calc.late30}분 (${hhmm(calc.late30)})`,
        `OT1(18:00~20:30): ${calc.ot1Raw}분 → ${calc.ot1_30}분 (${hhmm(calc.ot1_30)})`,
        `OT2(20:30~): ${calc.ot2Raw}분 → ${calc.ot2_30}분 (${hhmm(calc.ot2_30)})`,
        `심야(22~06): ${calc.nightMin}분 (${hhmm(calc.nightMin)})`,
        `시급(계산): ${money(calc.hourly)}원`,
        `예상수당(연장/심야): OT1 ${money(calc.payOT1)} + OT2 ${money(calc.payOT2)} + 심야가산 ${money(calc.payNightExtra)} = ${money(calc.payTotal)}원`,
      ].join("\n");

      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div class="itemTop">
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="badge">${escapeHtml(badge)}</div>
        </div>

        <div class="meta">${escapeHtml(meta)}</div>

        <div class="actions" id="act-${p.id}"></div>

        <div class="grid2">
          <div class="field">
            <label>출근시간(HH:MM)</label>
            <input class="input" type="time" step="60" id="in-${p.id}" value="${rec.inTime ? rec.inTime.slice(0,5) : ""}">
          </div>
          <div class="field">
            <label>퇴근시간(HH:MM)</label>
            <input class="input" type="time" step="60" id="out-${p.id}" value="${rec.outTime ? rec.outTime.slice(0,5) : ""}">
          </div>
        </div>

        <div class="grid2">
          <div class="field">
            <label>급여 타입</label>
            <select class="input" id="payType-${p.id}">
              <option value="hourly" ${p.payType==="hourly" ? "selected" : ""}>시급</option>
              <option value="monthly" ${p.payType==="monthly" ? "selected" : ""}>월급</option>
            </select>
          </div>
          <div class="field">
            <label>시급(원)</label>
            <input class="input" type="number" min="0" step="10" id="hourly-${p.id}" value="${Number(p.hourlyWage)||0}">
          </div>
          <div class="field">
            <label>월급(원)</label>
            <input class="input" type="number" min="0" step="10000" id="monthly-${p.id}" value="${Number(p.monthlyBase)||0}">
          </div>
        </div>

        <div class="grid2">
          <div class="field" style="grid-column: 1 / -1;">
            <label>비고</label>
            <input class="input" type="text" id="note-${p.id}" value="${escapeAttr(rec.note||"")}" placeholder="예: 특이사항">
          </div>
        </div>

        <div class="actions">
          <button class="small" id="save-${p.id}">💾 저장</button>
          <button class="small" id="del-${p.id}">🗑️ 명단 삭제</button>
        </div>
      `;
      list.appendChild(el);

      // 상태 버튼
      const act = el.querySelector(`#act-${CSS.escape(p.id)}`);
      for (const s of STATUS) {
        const b = document.createElement("button");
        b.className = "small";
        b.type = "button";
        b.textContent = s.label;
        b.addEventListener("click", () => setStatus(p.id, s.id));
        act.appendChild(b);
      }

      // 저장
      el.querySelector(`#save-${CSS.escape(p.id)}`).addEventListener("click", () => {
        const inVal = el.querySelector(`#in-${CSS.escape(p.id)}`).value;
        const outVal = el.querySelector(`#out-${CSS.escape(p.id)}`).value;
        const payType = el.querySelector(`#payType-${CSS.escape(p.id)}`).value;
        const hourly = el.querySelector(`#hourly-${CSS.escape(p.id)}`).value;
        const monthly = el.querySelector(`#monthly-${CSS.escape(p.id)}`).value;
        const noteVal = el.querySelector(`#note-${CSS.escape(p.id)}`).value;

        setTime(p.id, "inTime", inVal || "");
        setTime(p.id, "outTime", outVal || "");

        setPayField(p.id, "payType", payType);
        setPayField(p.id, "hourlyWage", Number(hourly) || 0);
        setPayField(p.id, "monthlyBase", Number(monthly) || 0);

        setNote(p.id, noteVal || "");
      });

      // 삭제
      el.querySelector(`#del-${CSS.escape(p.id)}`).addEventListener("click", () => {
        if (!confirm(`${p.name} 삭제할까요?`)) return;
        state.roster = state.roster.filter(x => x.id !== p.id);
        delete day.statusById[p.id];
        day.logs = day.logs.filter(l => l.pid !== p.id);
        save(); render();
      });
    }

    // logs
    const log = $("#log");
    log.innerHTML = "";
    const logs = day.logs || [];
    if (logs.length === 0) {
      log.innerHTML = `<div class="logItem">선택한 날짜 기록이 없습니다.</div>`;
    } else {
      for (const l of logs.slice(0, 80)) {
        let msg = `${l.time} · ${l.name} · `;
        if (l.type === "status") msg += `${statusLabel(l.payload.statusId)}`;
        else if (l.type === "edit") msg += `${l.payload.field} = ${l.payload.value}`;
        else msg += l.type;
        const div = document.createElement("div");
        div.className = "logItem";
        div.textContent = msg;
        log.appendChild(div);
      }
    }
  }

  // ---------------- bind
  function bind() {
    $("#btnAdd").addEventListener("click", () => {
      addPerson($("#nameInput").value);
      $("#nameInput").value = "";
      $("#nameInput").focus();
    });
    $("#nameInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        addPerson($("#nameInput").value);
        $("#nameInput").value = "";
      }
    });

    $("#btnUndo").addEventListener("click", undo);
    $("#btnResetDay").addEventListener("click", resetSelectedDay);

    $("#btnExportCsv").addEventListener("click", exportCsv);
    $("#btnBackup").addEventListener("click", backupJson);
    $("#btnRestore").addEventListener("click", () => $("#fileRestore").click());
    $("#fileRestore").addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) restoreJson(f);
      e.target.value = "";
    });

    $("#btnPrevMonth").addEventListener("click", () => shiftMonth(-1));
    $("#btnNextMonth").addEventListener("click", () => shiftMonth(1));
  }

  function boot() {
    load();
    ensureDate(state.selectedDateKey);
    bind();
    render();
    save();
  }

  boot();
})();
