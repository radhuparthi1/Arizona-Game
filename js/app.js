(() => {
  if (window.__MYSTUDYLIFE__) return;
  window.__MYSTUDYLIFE__ = true;

  const STORAGE_KEY = "mystudylife-v1";
  const LEGACY_KEY = "daymark-v1";
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const MOODS = [
    { id: "low", label: "Heavy" },
    { id: "okay", label: "Okay" },
    { id: "steady", label: "Steady" },
    { id: "bright", label: "Bright" },
  ];
  const QUOTES = [
    { text: "Protect the first hour. The rest of the day will try to steal it.", by: "MyStudyLife" },
    { text: "You do not need a perfect routine. You need a repeatable one.", by: "MyStudyLife" },
    { text: "Study is a conversation with the idea, not a stare at the page.", by: "MyStudyLife" },
    { text: "Sleep is not a reward for finishing. It is how finishing becomes possible.", by: "MyStudyLife" },
    { text: "A short walk is often the missing paragraph.", by: "MyStudyLife" },
  ];
  const METHODS = [
    {
      id: "pomodoro",
      name: "Pomodoro",
      kind: "time",
      summary: "Work in a short, undistracted burst, then take a real break. The break is part of the method.",
      steps: [
        "Choose one task you can finish or clearly advance in 25 minutes.",
        "Set the timer. Phone in another room if you can.",
        "When it rings, stand up. Drink water. Look away from screens.",
        "After four rounds, take a longer 15–20 minute rest.",
      ],
    },
    {
      id: "recall",
      name: "Active recall",
      kind: "memory",
      summary: "Close the notes and pull the answer from memory. Struggle is the point — that is the learning.",
      steps: [
        "Read a section once, slowly.",
        "Hide it. Write or say everything you can remember.",
        "Check. Mark what you missed, then try those parts again later.",
        "Prefer questions over highlights. Quizzes beat rereading.",
      ],
    },
    {
      id: "spaced",
      name: "Spaced repetition",
      kind: "memory",
      summary: "Review right as you begin to forget. Cramming feels productive; spacing actually sticks.",
      steps: [
        "After first learning, review the same day.",
        "Review again tomorrow, then in 3 days, then in a week.",
        "Use flashcards or a simple calendar — whatever you will actually open.",
        "If it was easy, wait longer. If you failed, bring it closer.",
      ],
    },
    {
      id: "feynman",
      name: "Feynman technique",
      kind: "understanding",
      summary: "Explain the idea as if a first-year student asked. Jargon you cannot unpack is a hole in your understanding.",
      steps: [
        "Write the concept’s name at the top of a page.",
        "Teach it in plain language, with a tiny example.",
        "Circle every fuzzy sentence. That is your next study target.",
        "Simplify again until a classmate could follow it.",
      ],
    },
    {
      id: "interleave",
      name: "Interleaving",
      kind: "understanding",
      summary: "Mix related problem types instead of grinding one kind for an hour. Your brain learns to choose the method, not just repeat it.",
      steps: [
        "Pick 2–3 similar topics (e.g. related math problem types).",
        "Do a few of each, shuffled, not in blocks.",
        "After each, name why you chose that approach.",
        "Save blocked practice for the first time you meet a skill.",
      ],
    },
    {
      id: "cornell",
      name: "Cornell notes",
      kind: "notes",
      summary: "A page with cues, notes, and a summary. The summary is where the lecture becomes yours.",
      steps: [
        "During class: notes in the right column, facts and examples.",
        "After class: cues and questions in the left column.",
        "Cover the notes. Answer from the cues.",
        "Write a 4–6 sentence summary at the bottom the same day.",
      ],
    },
    {
      id: "blurting",
      name: "Blurting",
      kind: "memory",
      summary: "Dump everything you know onto a blank page, then fill the gaps. Fast, slightly messy, very honest.",
      steps: [
        "Set a 10-minute timer. Topic at the top.",
        "Write without stopping. No notes, no phone.",
        "Compare to the source. Highlight missing pieces in another color.",
        "Blurt those missing pieces again tomorrow.",
      ],
    },
    {
      id: "sq3r",
      name: "SQ3R",
      kind: "notes",
      summary: "Survey, Question, Read, Recite, Review — a textbook method that stops you from highlighting everything in a trance.",
      steps: [
        "Survey headings, figures, and the summary first.",
        "Turn each heading into a question.",
        "Read to answer those questions, not to finish the chapter.",
        "Recite answers aloud, then review the next day.",
      ],
    },
    {
      id: "dual",
      name: "Dual coding",
      kind: "understanding",
      summary: "Words plus a simple picture. A sketch of a process often beats another paragraph of notes.",
      steps: [
        "Write a short explanation.",
        "Draw the same idea: timeline, diagram, or labelled sketch.",
        "Cover one. Reconstruct it from the other.",
        "Keep drawings ugly and useful. Art is not the goal.",
      ],
    },
  ];
  const TIPS = [
    {
      title: "Sleep like it is a class you cannot skip",
      body: "Keep a consistent lights-out, even on weekends when you can. A drifting sleep schedule is jet lag you give yourself. Aim for 7–9 hours and a 30-minute wind-down without lectures on your pillow.",
    },
    {
      title: "Eat in a way that survives exam week",
      body: "Protein and fiber at breakfast, water beside the desk, and a real meal — not only caffeine — before a long study block. Hungry brains look like unmotivated brains.",
    },
    {
      title: "Move between ideas",
      body: "Ten minutes of walking after a focus session helps memory consolidate. Stairs, a stretch, a short sport practice: all count. Sitting for five hours is not discipline; it is a tax on tomorrow.",
    },
    {
      title: "Guard your attention like a deadline",
      body: "Full-screen one tab. Notifications off. If you must check messages, do it on the break, not in the middle of a proof. Focus is a student skill, not a personality trait.",
    },
    {
      title: "People are part of health",
      body: "One conversation that is not about grades, once a day if you can. Isolation makes everything heavier. Study groups work when they are short, timed, and honest about confusion.",
    },
    {
      title: "Stress has a body",
      body: "If your chest is tight and the page will not go in, name the mood in MyStudyLife, stand up, and breathe out longer than you breathe in for one minute. Then return to a smaller slice of the task.",
    },
  ];

  const TITLES = {
    today: "Today",
    routine: "Routine",
    schedule: "Schedule",
    study: "Study",
    lifestyle: "Lifestyle",
  };

  const PRESETS = {
    "25-5": { focus: 25 * 60, break: 5 * 60, label: "25 minutes of deep work" },
    "50-10": { focus: 50 * 60, break: 10 * 60, label: "50 minutes of deep work" },
    "15-3": { focus: 15 * 60, break: 3 * 60, label: "15-minute sprint" },
  };

  const defaultHabits = () => [
    { id: "h1", name: "Wake at a steady hour", period: "morning" },
    { id: "h2", name: "Drink a full glass of water", period: "morning" },
    { id: "h3", name: "Get 5 minutes of light or stretch", period: "morning" },
    { id: "h4", name: "Preview today’s classes", period: "morning" },
    { id: "h5", name: "One deep study block", period: "focus" },
    { id: "h6", name: "Active recall, not rereading", period: "focus" },
    { id: "h7", name: "Move for 10 minutes", period: "focus" },
    { id: "h8", name: "Pack bag and set clothes", period: "evening" },
    { id: "h9", name: "Screens down 30 min before bed", period: "evening" },
    { id: "h10", name: "Write tomorrow’s top three", period: "evening" },
  ];

  const defaultEvents = () => [
    { id: "e1", title: "Calculus lecture", day: 0, start: "09:00", end: "10:15", type: "class" },
    { id: "e2", title: "History seminar", day: 0, start: "11:00", end: "12:15", type: "class" },
    { id: "e3", title: "Deep study: problem set", day: 0, start: "14:00", end: "16:00", type: "study" },
    { id: "e4", title: "Lab", day: 1, start: "10:00", end: "12:00", type: "class" },
    { id: "e5", title: "Walk between buildings", day: 1, start: "12:15", end: "12:35", type: "wellness" },
    { id: "e6", title: "Library: active recall", day: 1, start: "15:00", end: "16:30", type: "study" },
    { id: "e7", title: "Writing workshop", day: 2, start: "09:30", end: "10:45", type: "class" },
    { id: "e8", title: "Office hours", day: 2, start: "13:00", end: "14:00", type: "class" },
    { id: "e9", title: "Club / friends dinner", day: 2, start: "18:30", end: "19:30", type: "life" },
    { id: "e10", title: "Language class", day: 3, start: "09:00", end: "10:15", type: "class" },
    { id: "e11", title: "Spaced review session", day: 3, start: "16:00", end: "17:00", type: "study" },
    { id: "e12", title: "Sport or long walk", day: 3, start: "17:30", end: "18:30", type: "wellness" },
    { id: "e13", title: "Studio / lab", day: 4, start: "11:00", end: "13:00", type: "class" },
    { id: "e14", title: "Weekly planning", day: 4, start: "15:30", end: "16:00", type: "study" },
    { id: "e15", title: "Wind-down, no homework in bed", day: 4, start: "21:30", end: "22:00", type: "wellness" },
    { id: "e16", title: "Catch-up study block", day: 5, start: "10:00", end: "12:00", type: "study" },
    { id: "e17", title: "Errands and groceries", day: 5, start: "13:00", end: "14:00", type: "life" },
    { id: "e18", title: "Free morning — protect sleep", day: 6, start: "09:00", end: "10:00", type: "wellness" },
    { id: "e19", title: "Light review, then rest", day: 6, start: "16:00", end: "17:00", type: "study" },
  ];

  const emptyDay = () => ({
    habits: {},
    water: 0,
    mood: "",
    sleep: 8,
    movement: 20,
    studyMinutes: 0,
    sessions: [],
  });

  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function mondayIndex(d = new Date()) {
    return (d.getDay() + 6) % 7;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.habits && parsed.events && parsed.days) return parsed;
      }
    } catch {
      /* start fresh */
    }
    return {
      habits: defaultHabits(),
      events: defaultEvents(),
      days: {},
    };
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function dayState(key = todayKey()) {
    if (!state.days[key]) state.days[key] = emptyDay();
    return state.days[key];
  }

  const state = load();
  let view = "today";
  let methodFilter = "all";
  let timer = {
    preset: "25-5",
    remaining: PRESETS["25-5"].focus,
    running: false,
    phase: "focus",
    handle: null,
    endsAt: 0,
  };

  const $ = (id) => document.getElementById(id);

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 2800);
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  function formatDate(d = new Date()) {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(t) {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function mmss(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  function scoreParts(day) {
    const totalHabits = state.habits.length || 1;
    const done = Object.values(day.habits).filter(Boolean).length;
    const habit = done / totalHabits;
    const water = Math.min(1, day.water / 8);
    const sleep = day.sleep >= 7 && day.sleep <= 9 ? 1 : day.sleep >= 6 && day.sleep <= 10 ? 0.6 : 0.3;
    const move = Math.min(1, (day.movement || 0) / 30);
    const study = Math.min(1, (day.studyMinutes || 0) / 50);
    const value = Math.round((habit * 0.3 + water * 0.2 + sleep * 0.25 + move * 0.15 + study * 0.1) * 100);
    return { value, habit, water, sleep, move, study, done, totalHabits };
  }

  function scoreLabel(v) {
    if (v >= 85) return "A well-marked day";
    if (v >= 65) return "Taking shape";
    if (v >= 40) return "A decent start";
    return "A quiet start";
  }

  function switchView(name) {
    view = name;
    document.querySelectorAll(".view").forEach((el) => {
      const on = el.dataset.view === name;
      el.hidden = !on;
      el.classList.toggle("is-active", on);
    });
    document.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.nav === name);
    });
    $("page-title").textContent = TITLES[name];
    render();
  }

  function renderHeader() {
    $("greeting").textContent = greeting();
    $("today-date").textContent = formatDate();
  }

  function renderGlance() {
    const parts = scoreParts(dayState());
    $("rail-glance").innerHTML = `<strong>${parts.value} / 100</strong>Today’s MyStudyLife score. Keep a few promises and the number follows.`;
  }

  function renderToday() {
    const day = dayState();
    const parts = scoreParts(day);
    $("score-value").textContent = String(parts.value);
    $("score-label").textContent = scoreLabel(parts.value);
    const arc = $("score-arc");
    const c = 2 * Math.PI * 50;
    arc.style.strokeDasharray = `${c}`;
    arc.style.strokeDashoffset = `${c * (1 - parts.value / 100)}`;
    $("score-copy").textContent =
      parts.value < 40
        ? "Check a habit, drink some water, or begin a focus block. Small marks add up."
        : parts.value < 85
          ? "You are building a day you can trust. Finish the next small mark."
          : "This is the kind of day that makes next week easier. Protect the evening.";
    $("score-breakdown").innerHTML = `
      <li>Routine ${parts.done}/${parts.totalHabits}</li>
      <li>Water ${day.water}/8</li>
      <li>Sleep ${day.sleep} h</li>
      <li>Movement ${day.movement} min</li>
    `;
    const q = QUOTES[new Date().getDate() % QUOTES.length];
    $("quote-card").innerHTML = `<p>“${q.text}”</p><span>${q.by}</span>`;
    $("stat-grid").innerHTML = [
      ["Habits kept", `${parts.done}/${parts.totalHabits}`],
      ["Study minutes", `${day.studyMinutes}`],
      ["Water", `${day.water} glasses`],
      ["Mood", day.mood ? MOODS.find((m) => m.id === day.mood)?.label || "—" : "Not yet"],
    ]
      .map(([k, v]) => `<article class="stat"><b>${v}</b><span>${k}</span></article>`)
      .join("");

    $("today-habits").innerHTML = state.habits
      .map((h) => habitItem(h, day.habits[h.id]))
      .join("");

    const idx = mondayIndex();
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const byDay = (day) =>
      state.events
        .filter((e) => e.day === day)
        .sort((a, b) => a.start.localeCompare(b.start));
    let upcoming = byDay(idx).filter((e) => toMinutes(e.end) >= mins).slice(0, 4);
    let when = "";
    if (!upcoming.length) {
      upcoming = byDay((idx + 1) % 7).slice(0, 4);
      when = "Tomorrow · ";
    }
    $("today-agenda").innerHTML = upcoming.length
      ? upcoming
          .map(
            (e) =>
              `<li><div><b>${e.title}</b><div class="hint" style="margin:0">${when}${formatTime(e.start)} – ${formatTime(e.end)} · ${e.type}</div></div></li>`
          )
          .join("")
      : `<li>Nothing left on the grid tonight. Rest counts.</li>`;
  }

  function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  function habitItem(h, done) {
    return `<li class="habit-item ${done ? "is-done" : ""}">
      <label>
        <input type="checkbox" data-habit="${h.id}" ${done ? "checked" : ""} />
        <span>${h.name}</span>
      </label>
      <button class="icon-btn" data-del-habit="${h.id}" type="button" aria-label="Remove habit">×</button>
    </li>`;
  }

  function renderRoutine() {
    const day = dayState();
    const periods = [
      ["morning", "Morning"],
      ["focus", "Focus hours"],
      ["evening", "Evening"],
    ];
    $("routine-board").innerHTML = periods
      .map(([id, label]) => {
        const items = state.habits.filter((h) => h.period === id);
        return `<article class="panel">
          <h2>${label}</h2>
          <ul class="habit-list">${items.map((h) => habitItem(h, day.habits[h.id])).join("") || "<li class='hint'>Nothing here yet.</li>"}</ul>
        </article>`;
      })
      .join("");

    const heat = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const key = todayKey(d);
      const snap = state.days[key] || emptyDay();
      const ratio = state.habits.length
        ? Object.values(snap.habits).filter(Boolean).length / state.habits.length
        : 0;
      const lvl = ratio >= 0.85 ? 4 : ratio >= 0.6 ? 3 : ratio >= 0.35 ? 2 : ratio > 0 ? 1 : 0;
      heat.push(
        `<span class="lvl-${lvl}" title="${formatDate(d)}">${d.getDate()}</span>`
      );
    }
    $("habit-heat").innerHTML = heat.join("");

    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = addDays(new Date(), -i);
      const snap = state.days[todayKey(d)];
      const ratio = snap && state.habits.length
        ? Object.values(snap.habits).filter(Boolean).length / state.habits.length
        : 0;
      if (ratio >= 0.5) streak += 1;
      else if (i > 0) break;
    }
    $("streak-hint").textContent = streak
      ? `${streak} day streak of keeping at least half your marks.`
      : "Start a streak by keeping half your marks today.";
  }

  function renderSchedule() {
    const idx = mondayIndex();
    const selected = $("event-day").value || String(idx);
    $("event-day").innerHTML = DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join("");
    $("event-day").value = selected;
    $("week-board").innerHTML = DAYS.map((name, i) => {
      const list = state.events
        .filter((e) => e.day === i)
        .sort((a, b) => a.start.localeCompare(b.start));
      return `<div class="day-col ${i === idx ? "is-today" : ""}">
        <h3>${name}<small>${i === idx ? "Today" : " "}</small></h3>
        ${list
          .map(
            (e) => `<button class="event ${e.type}" data-del-event="${e.id}" type="button" title="Click to remove">
              <b>${e.title}</b>
              <span>${formatTime(e.start)} – ${formatTime(e.end)}</span>
            </button>`
          )
          .join("")}
      </div>`;
    }).join("");
  }

  function renderStudy() {
    $("timer-display").textContent = mmss(timer.remaining);
    $("timer-mode-label").textContent =
      timer.phase === "break" ? "Break — stand up, look away" : PRESETS[timer.preset].label;
    $("timer-toggle").textContent = timer.running
      ? "Pause"
      : timer.phase === "break"
        ? "Start break"
        : "Start focus";
    document.querySelectorAll("[data-preset]").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.preset === timer.preset);
    });
    if (!$("session-method").dataset.filled) {
      $("session-method").innerHTML = METHODS.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");
      $("session-method").dataset.filled = "1";
    }
    const list = METHODS.filter((m) => methodFilter === "all" || m.kind === methodFilter);
    $("method-grid").innerHTML = list
      .map(
        (m) => `<article class="method-card">
          <span class="tag">${m.kind}</span>
          <h3>${m.name}</h3>
          <p>${m.summary}</p>
          <ol>${m.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
        </article>`
      )
      .join("");
    const sessions = (dayState().sessions || []).slice().reverse();
    $("session-log").innerHTML = sessions.length
      ? sessions
          .map((s) => {
            const method = METHODS.find((m) => m.id === s.method);
            return `<li><span>${s.minutes} min · ${method ? method.name : "Focus"}</span><span>${s.phase}</span></li>`;
          })
          .join("")
      : `<li>No sessions yet today. Start the timer when you sit down.</li>`;
  }

  function renderLifestyle() {
    const day = dayState();
    $("sleep-range").value = String(day.sleep);
    $("sleep-label").textContent = `${day.sleep} h`;
    $("move-range").value = String(day.movement);
    $("move-label").textContent = `${day.movement} min`;
    $("water-glasses").innerHTML = Array.from({ length: 8 }, (_, i) => {
      const n = i + 1;
      return `<button type="button" class="${day.water >= n ? "is-full" : ""}" data-water="${n}" aria-label="${n} glasses"></button>`;
    }).join("");
    $("mood-row").innerHTML = MOODS.map(
      (m) =>
        `<button type="button" class="${day.mood === m.id ? "is-active" : ""}" data-mood="${m.id}">${m.label}</button>`
    ).join("");

    const bars = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const snap = state.days[todayKey(d)] || emptyDay();
      const pct = Math.max(8, scoreParts(snap).value);
      bars.push(
        `<div class="bar"><i style="height:${pct}%"></i><small>${d.toLocaleDateString(undefined, { weekday: "short" })}</small></div>`
      );
    }
    $("week-bars").innerHTML = bars.join("");
    $("life-tips").innerHTML = TIPS.map((t) => `<article class="tip"><h3>${t.title}</h3><p>${t.body}</p></article>`).join("");
  }

  function render() {
    renderHeader();
    renderGlance();
    if (view === "today") renderToday();
    if (view === "routine") renderRoutine();
    if (view === "schedule") renderSchedule();
    if (view === "study") renderStudy();
    if (view === "lifestyle") renderLifestyle();
  }

  function toggleHabit(id) {
    const day = dayState();
    day.habits[id] = !day.habits[id];
    save();
    render();
  }

  function phaseSeconds() {
    return PRESETS[timer.preset][timer.phase === "break" ? "break" : "focus"];
  }

  function paintTimer() {
    const face = $("timer-display");
    if (!face) return;
    face.textContent = mmss(timer.remaining);
    $("timer-mode-label").textContent =
      timer.phase === "break" ? "Break — stand up, look away" : PRESETS[timer.preset].label;
    $("timer-toggle").textContent = timer.running
      ? "Pause"
      : timer.phase === "break"
        ? "Start break"
        : "Start focus";
  }

  function completePhase() {
    const minutes = Math.round(phaseSeconds() / 60);
    if (timer.phase === "focus") {
      const day = dayState();
      day.studyMinutes += minutes;
      day.sessions.push({
        minutes,
        method: $("session-method").value,
        phase: "focus",
        at: Date.now(),
      });
      save();
      toast(`Focus complete. ${minutes} minutes logged. Take the break.`);
      timer.phase = "break";
    } else {
      toast("Break over. When you are ready, start the next focus.");
      timer.phase = "focus";
    }
    timer.remaining = phaseSeconds();
    render();
  }

  function tick() {
    if (!timer.running) return;
    timer.remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
    if (timer.remaining <= 0) {
      timer.running = false;
      clearInterval(timer.handle);
      timer.handle = null;
      completePhase();
      return;
    }
    paintTimer();
  }

  function toggleTimer() {
    if (timer.running) {
      timer.remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
      timer.running = false;
      clearInterval(timer.handle);
      timer.handle = null;
    } else {
      timer.running = true;
      timer.endsAt = Date.now() + timer.remaining * 1000;
      clearInterval(timer.handle);
      timer.handle = setInterval(tick, 250);
    }
    paintTimer();
  }

  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      switchView(nav.dataset.nav);
      return;
    }
    const habit = e.target.closest("[data-habit]");
    if (habit && e.target.matches("input")) {
      toggleHabit(habit.dataset.habit);
      return;
    }
    const delH = e.target.closest("[data-del-habit]");
    if (delH) {
      state.habits = state.habits.filter((h) => h.id !== delH.dataset.delHabit);
      save();
      render();
      return;
    }
    const delE = e.target.closest("[data-del-event]");
    if (delE) {
      state.events = state.events.filter((ev) => ev.id !== delE.dataset.delEvent);
      save();
      render();
      toast("Removed from the week.");
      return;
    }
    const preset = e.target.closest("[data-preset]");
    if (preset) {
      timer.preset = preset.dataset.preset;
      timer.running = false;
      timer.phase = "focus";
      timer.remaining = PRESETS[timer.preset].focus;
      clearInterval(timer.handle);
      timer.handle = null;
      render();
      return;
    }
    const water = e.target.closest("[data-water]");
    if (water) {
      const n = Number(water.dataset.water);
      const day = dayState();
      day.water = day.water === n ? n - 1 : n;
      save();
      render();
      return;
    }
    const mood = e.target.closest("[data-mood]");
    if (mood) {
      dayState().mood = mood.dataset.mood;
      save();
      render();
      return;
    }
  });

  $("habit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("habit-name").value.trim();
    if (!name) return;
    state.habits.push({ id: uid("habit"), name, period: $("habit-period").value });
    $("habit-name").value = "";
    save();
    render();
  });

  $("event-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("event-title").value.trim();
    if (!title) return;
    if ($("event-end").value <= $("event-start").value) {
      toast("End time needs to be after the start.");
      return;
    }
    state.events.push({
      id: uid("event"),
      title,
      day: Number($("event-day").value),
      start: $("event-start").value,
      end: $("event-end").value,
      type: $("event-type").value,
    });
    $("event-title").value = "";
    save();
    render();
  });

  $("timer-toggle").addEventListener("click", () => {
    toggleTimer();
  });

  $("timer-reset").addEventListener("click", () => {
    timer.running = false;
    timer.phase = "focus";
    timer.remaining = PRESETS[timer.preset].focus;
    clearInterval(timer.handle);
    timer.handle = null;
    render();
  });

  $("method-filter").addEventListener("change", (e) => {
    methodFilter = e.target.value;
    render();
  });

  $("sleep-range").addEventListener("input", (e) => {
    dayState().sleep = Number(e.target.value);
    save();
    $("sleep-label").textContent = `${dayState().sleep} h`;
    renderGlance();
  });
  $("sleep-range").addEventListener("change", () => render());

  $("move-range").addEventListener("input", (e) => {
    dayState().movement = Number(e.target.value);
    save();
    $("move-label").textContent = `${dayState().movement} min`;
    renderGlance();
  });
  $("move-range").addEventListener("change", () => render());

  $("reset-demo").addEventListener("click", () => {
    if (!confirm("Replace your saved MyStudyLife data with a fresh starter week?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  switchView("today");
})();
