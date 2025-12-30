(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const KEY = "sdbiosensor_personal_attendance_v1";

  // -----------------------------
  // ✅ 50개 랜덤 메시지 (출근/퇴근)
  // -----------------------------
  const CHECKIN_MSGS = [
    "출근 체크 완료! 오늘도 안전이 1번입니다 🦺",
    "좋아요. 천천히 정확하게 시작해봅시다 🧠",
    "물 한 잔 먼저! 컨디션이 생산성입니다 💧",
    "손 끼임 조심! 안전하게 가요 ✋",
    "오늘은 실수 0개 데이로 가봅시다 ✅",
    "출근 기록 저장 완료! 오늘도 깔끔하게 👌",
    "무리 금지! 페이스 조절하면서 갑시다 🐢",
    "엘리베이터/동선 먼저 체크하고 시작! 🚧",
    "허리 조심! 자세 한 번 잡고 시작해요 🧍",
    "작은 체크가 큰 사고를 막아요 👀",
    "출근 완료! 오늘도 ‘안전 + 집중’ 모드 🔥",
    "좋습니다. 오늘도 천천히, 정확히 🧩",
    "장갑/안전화 확인! 준비 완료 🥾",
    "출근 체크 성공! 오늘도 무사히 🙏",
    "시작 좋네요. 오늘도 깔끔하게 처리 🧼",
    "출근 완료! 손/발 조심하고 갑시다 🦶",
    "오늘은 ‘정리정돈’부터 가죠 📦",
    "출근 기록 OK! 안전구호: 서두르지 말기 🚫",
    "현우님 모드 ON. 집중해서 쭉 갑시다 ⚡",
    "출근 완료. 호흡 한 번, 긴장 풀고 시작 😮‍💨",
    "출근 체크! 라벨/수량 확인은 두 번 👁️👁️",
    "OK! 오늘도 ‘정확’이 ‘빠름’을 이깁니다 🏁",
    "출근 완료! 미끄럼 주의! 바닥 체크 👟",
    "좋아요. 실수 줄이는 날로 만들어봅시다 📉",
    "출근 저장! 작은 휴식이 큰 효율 💡",
    "출근 완료! 손목/어깨 무리하지 말기 🧤",
    "출근 체크! 피로하면 더 천천히 가요 🧘",
    "좋습니다. 오늘도 ‘안전’부터 시작 🔒",
    "출근 완료! 오늘은 스텝 바이 스텝 🪜",
    "출근 체크! 장비 사용 전 점검은 필수 🧰",
    "출근 완료. 오늘도 사고 없이 클리어 🎯",
    "출근 기록 OK! 커피보다 물이 먼저 💧",
    "출근 완료! 바쁠수록 체크리스트 ✅",
    "출근 체크! 급할수록 둘러보기 👀",
    "좋아요. 오늘도 안정적으로 가요 🧱",
    "출근 완료! 핸드폰보다 손이 먼저 조심 📵",
    "출근 체크! ‘한 번 더 확인’이 정답 🔍",
    "오케이! 오늘도 무사히 시작합니다 🦾",
    "출근 완료. 몸 풀고 시작! 스트레칭 10초 🧘‍♂️",
    "출근 체크! 오늘도 나 자신 칭찬 1개 😄",
    "좋습니다. 오늘은 ‘정확’이 목표 🎯",
    "출근 완료! 작업 전 주변 위험요소 체크 🚧",
    "출근 체크! 안전은 습관입니다 🧠",
    "OK! 오늘도 실수 없이 매끈하게 🧼",
    "출근 완료! 손가락/발가락 조심 🙌",
    "출근 체크! 화이팅은 조용히, 안전은 크게 💥",
    "좋아요. 오늘도 차분히 처리 🧊",
    "출근 완료! 정리정돈으로 시간을 벌자 ⏱️",
    "출근 체크 완료! 오늘도 무사귀가 목표 🏠"
  ];

  const CHECKOUT_MSGS = [
    "퇴근 체크 완료! 오늘도 수고하셨습니다 🙇",
    "무사히 끝! 이게 진짜 승리입니다 👑",
    "오늘도 고생 많으셨어요. 집 가는 길 조심 🏠",
    "퇴근 저장 완료! 내일의 나를 위해 푹 쉬기 😴",
    "수고하셨습니다. 물 한 잔 + 스트레칭 30초 🧘",
    "퇴근 체크! 횡단보도/차 조심하세요 🚦",
    "오늘도 해냈다… 진짜로 👏",
    "퇴근 완료! 오늘의 미션 클리어 ✅",
    "수고하셨습니다. 손/허리/무릎 회복 타임 🧠🛌",
    "퇴근 체크! 내일도 안전부터 시작합시다 🦺",
    "퇴근 완료! 맛있는 거 먹고 회복합시다 🍲",
    "오늘도 사고 없이 끝! 최고입니다 ⭐",
    "퇴근 저장! 샤워하고 바로 눕기 권장 🧼",
    "수고하셨습니다. 내일 컨디션이 돈입니다 💰",
    "퇴근 체크! 오늘 기록 저장 완료 🔒",
    "오늘도 잘 버텼습니다. 진짜 고생했어요 🤝",
    "퇴근 완료! 집 가서 발/종아리 풀어주기 🦵",
    "수고하셨습니다. 오늘의 피로는 오늘 털기 🌙",
    "퇴근 체크! 내일의 실수는 오늘의 휴식이 막습니다 😌",
    "퇴근 완료. 안전하게 귀가하세요 🙏",
    "수고하셨습니다! 눈 감기 전에 물 한 잔 💧",
    "퇴근 체크! 오늘은 여기까지, 잘했습니다 ✅",
    "퇴근 완료! 몸이 먼저, 할 일은 내일 🧸",
    "수고하셨습니다. 내일도 차분히 갑시다 🐢",
    "퇴근 체크! 손목/어깨 마사지 10초 🫳",
    "퇴근 완료! 내일을 위해 전자기기 잠깐 끄기 📵",
    "수고하셨습니다. 집 가는 길 음악 한 곡 🎧",
    "퇴근 체크! 오늘도 꾸준함 승리 👊",
    "퇴근 완료! 오늘의 나에게 칭찬 1개 🎉",
    "수고하셨습니다. 잠은 최고의 회복제 😴",
    "퇴근 체크! 내일은 더 가볍게 시작할 수 있어요 ☁️",
    "퇴근 완료! 오늘도 안전하게 마무리 🦺",
    "수고하셨습니다. 따뜻한 물로 긴장 풀기 ♨️",
    "퇴근 체크! 내일도 실수 없는 루틴으로 ✅",
    "퇴근 완료! 어깨 내리고 한숨 크게 😮‍💨",
    "수고하셨습니다. 지금부터는 내 시간입니다 ⏳",
    "퇴근 체크! 오늘의 피드백: ‘잘했다’ 😄",
    "퇴근 완료! 집에 가면 바로 쉬기 🛌",
    "수고하셨습니다. 내일도 무사히 🙏",
    "퇴근 체크! 오늘도 기록이 쌓였습니다 📈",
    "퇴근 완료! 바쁘게 산 하루, 충분합니다 💯",
    "수고하셨습니다. 오늘도 큰일 했어요 🧱",
    "퇴근 체크! 안전한 귀가가 마지막 업무입니다 🚗",
    "퇴근 완료! 물/식사/수면 챙기기 🍚💧😴",
    "수고하셨습니다. 내일도 천천히 정확히 🧩",
    "퇴근 체크! 오늘도 잘 끝냈습니다 ✅",
    "퇴근 완료! 내일을 위해 휴식 모드 ON 💤",
    "수고하셨습니다. 오늘의 노력 저장 완료 💾",
    "퇴근 체크 완료! 오늘도 정말 고생하셨어요 🙌"
  ];

  // ---------------- state
  const DEFAULT = {
    profile: {
      name: "",
      wage: 10320,
      theme: "light",
    },
    // records: { "YYYY-MM-DD": { status, inTime, outTime, note, lastMsgIn, lastMsgOut } }
    records: {},
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth() + 1,
    selectedDateKey: keyOf(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
    reportYear: new Date().getFullYear(),
    reportMonth: new Date().getMonth() + 1,
  };

  const state = load() || structuredClone(DEFAULT);

  // ---------------- util
  const pad2 = (n) => String(n).padStart(2, "0");
  function keyOf(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }

  function nowHHMMSS() {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }

  function parseKey(k) {
    const [y, m, d] = (k || "").split("-").map(Number);
    return { y, m, d };
  }

  function monthLabel(y, m) {
    return `${y}년 ${m}월`;
  }

  function ensureDay(k) {
    if (!state.records[k]) state.records[k] = { status: "work", inTime: "", outTime: "", note: "", lastMsgIn: -1, lastMsgOut: -1 };
  }

  function minutesBetween(inHHMM, outHHMM) {
    if (!inHHMM || !outHHMM) return 0;
    const [ih, im] = inHHMM.split(":").map(Number);
    const [oh, om] = outHHMM.split(":").map(Number);
    if ([ih, im, oh, om].some(Number.isNaN)) return 0;
    let a = ih * 60 + im;
    let b = oh * 60 + om;
    if (b < a) b += 24 * 60; // next day
    return Math.max(0, b - a);
  }

  function hhmmFromMin(min) {
    const m = Math.max(0, min | 0);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${pad2(mm)}m`;
  }

  // ---------------- storage
  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // ---------------- toast
  let toastTimer = null;
  function showToast(text) {
    const el = $("#toast");
    el.textContent = text;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.add("hidden");
    }, 1900);
  }

  // 랜덤 메시지 선택 (연속 중복 방지)
  function pickRandomIndex(max, lastIdx) {
    if (max <= 1) return 0;
    let idx = Math.floor(Math.random() * max);
    if (idx === lastIdx) {
      idx = (idx + 1 + Math.floor(Math.random() * (max - 1))) % max;
    }
    return idx;
  }

  function ensureProfileReady() {
    const name = String(state.profile?.name || "").trim();
    if (!name) {
      showToast("설정에서 내 이름을 먼저 저장해주세요 🙂");
      setTab("tab-settings");
      $("#profileName").focus();
      return false;
    }
    return true;
  }

  // ---------------- calendar
  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
  function firstDow(y, m) { return new Date(y, m - 1, 1).getDay(); }

  function buildDayMark(k) {
    const rec = state.records[k];
    if (!rec) return "";
    if (rec.status === "leave") return "연차";
    if (rec.status === "half") return "반차";
    if (rec.status === "absent") return "결근";
    if (rec.inTime && rec.outTime) return "완료";
    if (rec.inTime) return "출근";
    return "";
  }

  function renderCalendar() {
    $("#monthLabel").textContent = monthLabel(state.calYear, state.calMonth);

    const cal = $("#calendar");
    cal.innerHTML = "";

    const offset = firstDow(state.calYear, state.calMonth);
    const total = daysInMonth(state.calYear, state.calMonth);

    for (let i = 0; i < offset; i++) {
      const blank = document.createElement("div");
      blank.className = "day disabled";
      blank.style.visibility = "hidden";
      cal.appendChild(blank);
    }

    for (let d = 1; d <= total; d++) {
      const k = keyOf(state.calYear, state.calMonth, d);
      const cell = document.createElement("div");
      cell.className = "day";
      if (k === state.selectedDateKey) cell.classList.add("selected");
      const mark = buildDayMark(k);
      cell.innerHTML = `<div class="dayNum">${d}</div><div class="dayMark">${mark}</div>`;
      cell.addEventListener("click", () => {
        state.selectedDateKey = k;
        save();
        render();
      });
      cal.appendChild(cell);
    }
  }

  function shiftMonth(delta) {
    let y = state.calYear;
    let m = state.calMonth + delta;
    if (m === 0) { m = 12; y -= 1; }
    if (m === 13) { m = 1; y += 1; }
    state.calYear = y;
    state.calMonth = m;

    // 선택 날짜를 해당 월 1일로 이동 (UI 안정)
    state.selectedDateKey = keyOf(y, m, 1);
    save(); render();
  }

  // ---------------- report
  function shiftReportMonth(delta) {
    let y = state.reportYear;
    let m = state.reportMonth + delta;
    if (m === 0) { m = 12; y -= 1; }
    if (m === 13) { m = 1; y += 1; }
    state.reportYear = y;
    state.reportMonth = m;
    save(); render();
  }

  function getMonthKeys(y, m) {
    const total = daysInMonth(y, m);
    const keys = [];
    for (let d = 1; d <= total; d++) keys.push(keyOf(y, m, d));
    return keys;
  }

  function computeMonthly(y, m) {
    const keys = getMonthKeys(y, m);
    const stat = { work:0, late:0, leave:0, half:0, absent:0, minutes:0 };

    for (const k of keys) {
      const r = state.records[k];
      if (!r) continue;

      if (r.status === "work") stat.work += 1;
      if (r.status === "late") stat.late += 1;
      if (r.status === "leave") stat.leave += 1;
      if (r.status === "half") stat.half += 1;
      if (r.status === "absent") stat.absent += 1;

      const inT = (r.inTime || "").slice(0,5);
      const outT = (r.outTime || "").slice(0,5);
      stat.minutes += minutesBetween(inT, outT);
    }
    return stat;
  }

  function exportMonthlyCsv() {
    const y = state.reportYear;
    const m = state.reportMonth;
    const keys = getMonthKeys(y, m);

    const header = ["date","name","status","inTime","outTime","workMinutes","workTime","note"];
    const rows = [header.join(",")];

    for (const k of keys) {
      const r = state.records[k] || {};
      const inT = (r.inTime || "").slice(0,5);
      const outT = (r.outTime || "").slice(0,5);
      const mins = minutesBetween(inT, outT);
      rows.push([
        k,
        csvEscape(state.profile.name || ""),
        csvEscape(r.status || ""),
        inT,
        outT,
        mins,
        csvEscape(hhmmFromMin(mins)),
        csvEscape(r.note || "")
      ].join(","));
    }

    const blob = new Blob([rows.join("\n")], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SD바이오센서_개인출근부_${y}-${pad2(m)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvEscape(v) {
    const s = String(v ?? "");
    if (/[,"\n]/.test(s)) return `"${s.replaceAll('"','""')}"`;
    return s;
  }

  // ---------------- actions
  function setCheckIn() {
    if (!ensureProfileReady()) return;

    const k = state.selectedDateKey;
    ensureDay(k);
    const r = state.records[k];

    // time: input이 비어있으면 현재시간 자동
    const inVal = $("#inTime").value;
    r.inTime = inVal ? `${inVal}:00` : nowHHMMSS();

    // 메시지 랜덤 (연속 중복 방지)
    const idx = pickRandomIndex(CHECKIN_MSGS.length, r.lastMsgIn);
    r.lastMsgIn = idx;
    showToast(`${state.profile.name}님, ${CHECKIN_MSGS[idx]}`);

    save(); render();
  }

  function setCheckOut() {
    if (!ensureProfileReady()) return;

    const k = state.selectedDateKey;
    ensureDay(k);
    const r = state.records[k];

    const outVal = $("#outTime").value;
    r.outTime = outVal ? `${outVal}:00` : nowHHMMSS();

    const idx = pickRandomIndex(CHECKOUT_MSGS.length, r.lastMsgOut);
    r.lastMsgOut = idx;
    showToast(`${state.profile.name}님, ${CHECKOUT_MSGS[idx]}`);

    save(); render();
  }

  function setStatus(v) {
    const k = state.selectedDateKey;
    ensureDay(k);
    state.records[k].status = v;
    save(); render();
  }

  function setNote(v) {
    const k = state.selectedDateKey;
    ensureDay(k);
    state.records[k].note = String(v || "");
    save(); render();
  }

  function setTimesFromInputs() {
    const k = state.selectedDateKey;
    ensureDay(k);
    const r = state.records[k];
    const inVal = $("#inTime").value;
    const outVal = $("#outTime").value;
    r.inTime = inVal ? `${inVal}:00` : "";
    r.outTime = outVal ? `${outVal}:00` : "";
    save(); render();
  }

  function clearSelectedDay() {
    const k = state.selectedDateKey;
    if (!confirm(`${k} 기록을 초기화할까요?`)) return;
    delete state.records[k];
    save(); render();
    showToast("선택 날짜 기록을 초기화했습니다 🧹");
  }

  // ---------------- backup/restore
  function backupJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SD바이오센서_개인출근부_백업-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function restoreJson(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(String(r.result || "{}"));
        // 최소 안전 병합
        state.profile = { ...DEFAULT.profile, ...(obj.profile || {}) };
        state.records = obj.records || {};
        state.calYear = obj.calYear || DEFAULT.calYear;
        state.calMonth = obj.calMonth || DEFAULT.calMonth;
        state.selectedDateKey = obj.selectedDateKey || DEFAULT.selectedDateKey;
        state.reportYear = obj.reportYear || DEFAULT.reportYear;
        state.reportMonth = obj.reportMonth || DEFAULT.reportMonth;

        save();
        applyTheme();
        render();
        showToast("복원 완료! ✅");
      } catch {
        alert("복원 실패: 파일 형식이 올바르지 않습니다.");
      }
    };
    r.readAsText(file, "utf-8");
  }

  // ---------------- tabs + settings
  function setTab(id) {
    document.querySelectorAll(".tab").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === id);
    });
    document.querySelectorAll(".tabPane").forEach(p => {
      p.classList.toggle("hidden", p.id !== id);
    });
  }

  function applyTheme() {
    const theme = state.profile?.theme || "light";
    document.documentElement.setAttribute("data-theme", theme);
  }

  function saveSettings() {
    const name = String($("#profileName").value || "").trim();
    const wage = Number($("#profileWage").value || 0);
    const theme = $("#themeSelect").value;

    state.profile.name = name;
    state.profile.wage = Number.isFinite(wage) ? wage : 10320;
    state.profile.theme = theme;

    applyTheme();
    save();
    render();
    showToast("설정 저장 완료! 👍");
  }

  // ---------------- render
  function renderDay() {
    const k = state.selectedDateKey;
    ensureDay(k);
    const r = state.records[k];

    // inputs sync
    $("#inTime").value = r.inTime ? r.inTime.slice(0,5) : "";
    $("#outTime").value = r.outTime ? r.outTime.slice(0,5) : "";
    $("#statusSelect").value = r.status || "work";
    $("#noteInput").value = r.note || "";

    const name = state.profile?.name ? `${state.profile.name}님` : "내";
    $("#attTitle").textContent = `${name} 출근부`;
    $("#todayLabel").textContent = `선택 날짜: ${k}`;

    const mins = minutesBetween((r.inTime||"").slice(0,5), (r.outTime||"").slice(0,5));
    const statusMap = { work:"근무", late:"지각", absent:"결근", leave:"연차", half:"반차" };
    const statusText = statusMap[r.status] || "근무";

    let sum = `상태: <b>${statusText}</b> · `;
    sum += `출근: <b>${r.inTime ? r.inTime.slice(0,5) : "-"}</b> · `;
    sum += `퇴근: <b>${r.outTime ? r.outTime.slice(0,5) : "-"}</b> · `;
    sum += `근무시간: <b>${mins ? hhmmFromMin(mins) : "-"}</b>`;

    $("#daySummary").innerHTML = sum;
  }

  function renderReport() {
    $("#repMonthLabel").textContent = monthLabel(state.reportYear, state.reportMonth);

    const stat = computeMonthly(state.reportYear, state.reportMonth);
    $("#repWork").textContent = stat.work;
    $("#repLate").textContent = stat.late;
    $("#repLeave").textContent = stat.leave;
    $("#repHalf").textContent = stat.half;
    $("#repAbsent").textContent = stat.absent;
    $("#repHours").textContent = hhmmFromMin(stat.minutes);

    const name = state.profile?.name || "내";
    $("#repHint").textContent = `${name} 기준 월간 통계입니다. 상단 ‘CSV(월) 내보내기’는 이 월(${state.reportYear}-${pad2(state.reportMonth)})로 저장됩니다.`;
  }

  function renderSettings() {
    $("#profileName").value = state.profile?.name || "";
    $("#profileWage").value = String(state.profile?.wage ?? 10320);
    $("#themeSelect").value = state.profile?.theme || "light";
  }

  function render() {
    renderCalendar();
    renderDay();
    renderReport();
    renderSettings();
  }

  // ---------------- bind
  function bind() {
    // tabs
    document.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => setTab(btn.dataset.tab));
    });

    $("#btnPrevMonth").addEventListener("click", () => shiftMonth(-1));
    $("#btnNextMonth").addEventListener("click", () => shiftMonth(1));

    $("#btnRepPrev").addEventListener("click", () => shiftReportMonth(-1));
    $("#btnRepNext").addEventListener("click", () => shiftReportMonth(1));

    $("#btnCheckIn").addEventListener("click", () => {
      setTimesFromInputs();
      setCheckIn();
    });
    $("#btnCheckOut").addEventListener("click", () => {
      setTimesFromInputs();
      setCheckOut();
    });

    $("#inTime").addEventListener("change", setTimesFromInputs);
    $("#outTime").addEventListener("change", setTimesFromInputs);

    $("#statusSelect").addEventListener("change", (e) => setStatus(e.target.value));
    $("#noteInput").addEventListener("input", (e) => setNote(e.target.value));

    $("#btnClearDay").addEventListener("click", clearSelectedDay);

    $("#btnExportCsv").addEventListener("click", exportMonthlyCsv);
    $("#btnBackup").addEventListener("click", backupJson);
    $("#btnRestore").addEventListener("click", () => $("#fileRestore").click());
    $("#fileRestore").addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) restoreJson(f);
      e.target.value = "";
    });

    $("#btnSaveSettings").addEventListener("click", saveSettings);
  }

  // ---------------- PWA register
  async function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (e) {
      // 조용히 무시 (PWA 실패가 앱 기능을 막으면 안 됨)
    }
  }

  // ---------------- boot
  function boot() {
    applyTheme();
    bind();
    render();
    save();
    registerSW();
  }

  boot();
})();
