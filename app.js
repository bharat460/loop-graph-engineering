(() => {
  const reduceMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const decisionsEl = document.getElementById("decisions");
  const statusEl = document.getElementById("loop-status");
  const toggle = document.getElementById("loop-toggle");
  const whileEl = document.getElementById("loop-while");
  const retryEl = document.getElementById("loop-retry");
  const gateEl = document.querySelector(".machine__gate");
  const phases = [...document.querySelectorAll(".machine__cycle li")];
  const yoloItems = [...document.querySelectorAll(".yolo__list li")];
  const progressBar = document.getElementById("progress-bar");

  const loopScript = [
    {
      phase: "work",
      turn: 1,
      status: "Turn 1 · agent works. Reads the spec, patches layout. YOLO runs file reads.",
      note: "- [turn 1 · work] patched login layout · did not touch the API",
      yolo: ["read"],
      retry: false,
      ask: false,
    },
    {
      phase: "check",
      turn: 1,
      status: "Turn 1 · check acceptance. test/auth still fails at 390px. Stop condition is false.",
      note: "- [turn 1 · check] FAIL · form still drops the session cookie",
      yolo: ["test"],
      retry: false,
      ask: false,
    },
    {
      phase: "log",
      turn: 1,
      status: "Turn 1 · write decisions.md. Cause noted. Loop again — the agent does not wait for a new prompt.",
      note: "- [turn 1 · log] cookie SameSite under 400px · acceptance not met → loop",
      yolo: [],
      retry: true,
      ask: false,
    },
    {
      phase: "work",
      turn: 2,
      status: "Turn 2 · agent works from the log, not from a new prompt. Fixes SameSite. YOLO still on.",
      note: "- [turn 2 · work] set SameSite on the session cookie",
      yolo: ["read"],
      retry: false,
      ask: false,
    },
    {
      phase: "check",
      turn: 2,
      status: "Turn 2 · check acceptance. test/auth pass, lint clean, form submits at 390px. Stop condition is true.",
      note: "- [turn 2 · check] PASS · tests green · lint clean · 390px submit",
      yolo: ["test", "lint"],
      retry: false,
      ask: false,
    },
    {
      phase: "log",
      turn: 2,
      status: "Turn 2 · write decisions.md. Acceptance met. Next command is git push --force — YOLO asks.",
      note: "- [turn 2 · log] acceptance met · asked before git push --force",
      yolo: ["push"],
      retry: false,
      ask: true,
    },
  ];

  const waitingFile = `# decisions.md
# appended every turn until acceptance is true

_waiting for the first run…_`;

  let timer = 0;
  let index = -1;
  let lines = [];
  let playing = false;

  function paintYolo(active) {
    yoloItems.forEach((item) => {
      const cmd = item.dataset.cmd;
      item.classList.toggle("is-run", Boolean(active.includes(cmd) && item.dataset.risk === "safe"));
      item.classList.toggle("is-ask", Boolean(active.includes(cmd) && item.dataset.risk === "risky"));
    });
  }

  function paintMachine(beat) {
    phases.forEach((el) => {
      el.classList.toggle("is-on", Boolean(beat && el.dataset.phase === beat.phase));
    });
    if (whileEl) {
      whileEl.textContent = beat
        ? `while acceptance is false · turn ${beat.turn}`
        : "while acceptance is false";
    }
    if (retryEl) retryEl.hidden = !beat?.retry;
    if (gateEl) {
      gateEl.hidden = !beat?.ask;
      gateEl.classList.toggle("is-on", Boolean(beat?.ask));
    }
  }

  function showStep(step) {
    const beat = loopScript[step];
    index = step;
    lines = ["# decisions.md", "# login loop", ""];
    for (let i = 0; i <= step; i += 1) lines.push(loopScript[i].note);
    decisionsEl.textContent = lines.join("\n");
    statusEl.textContent = beat.status;
    paintMachine(beat);
    paintYolo(beat.yolo);
  }

  function stopLoop() {
    playing = false;
    window.clearInterval(timer);
    timer = 0;
    toggle.textContent = "Play the Loop";
    toggle.setAttribute("aria-pressed", "false");
  }

  function resetLoop() {
    stopLoop();
    index = -1;
    lines = [];
    decisionsEl.textContent = waitingFile;
    statusEl.textContent = "Waiting. Nothing has been decided yet.";
    paintMachine(null);
    paintYolo([]);
  }

  function tick() {
    const next = index + 1;
    if (next >= loopScript.length) {
      stopLoop();
      statusEl.textContent = "Loop paused for the human in the loop. Safe work is done. Force-push still needs you.";
      toggle.textContent = "Play the Loop Again";
      return;
    }
    showStep(next);
  }

  function startLoop() {
    if (playing) {
      stopLoop();
      return;
    }
    if (index >= loopScript.length - 1 || index === -1) {
      resetLoop();
    }
    playing = true;
    toggle.textContent = "Pause the Loop";
    toggle.setAttribute("aria-pressed", "true");
    tick();
    if (reduceMotion()) {
      showStep(loopScript.length - 1);
      stopLoop();
      statusEl.textContent = "Loop paused for the human in the loop. Safe work is done. Force-push still needs you.";
      toggle.textContent = "Play the Loop Again";
      return;
    }
    timer = window.setInterval(tick, 2000);
  }

  toggle.addEventListener("click", startLoop);

  const live = document.getElementById("live");
  let liveInView = false;
  if (live) {
    const watch = new IntersectionObserver((entries) => {
      const on = Boolean(entries[0]?.isIntersecting);
      if (on && !liveInView) {
        liveInView = true;
        if (!reduceMotion() && !playing) {
          resetLoop();
          startLoop();
        }
      }
      if (!on) liveInView = false;
    }, { threshold: 0.4 });
    watch.observe(live);
  }

  const tabs = [...document.querySelectorAll('[role="tab"]')];

  function selectTab(tab, syncUrl) {
    tabs.forEach((other) => {
      const selected = other === tab;
      other.setAttribute("aria-selected", String(selected));
      other.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(other.getAttribute("aria-controls"));
      if (panel) panel.hidden = !selected;
    });
    if (syncUrl) {
      const url = new URL(location.href);
      url.searchParams.set("prompt", tab.id === "tab-loop" ? "loop" : "normal");
      history.replaceState(null, "", url);
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => selectTab(tab, true));
    tab.addEventListener("keydown", (event) => {
      const i = tabs.indexOf(tab);
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const next = event.key === "ArrowRight"
          ? tabs[(i + 1) % tabs.length]
          : tabs[(i - 1 + tabs.length) % tabs.length];
        selectTab(next, true);
        next.focus();
      }
    });
  });

  const prompt = new URLSearchParams(location.search).get("prompt");
  if (prompt === "loop") selectTab(document.getElementById("tab-loop"), false);
  else tabs[0].tabIndex = 0;

  const seats = [...document.querySelectorAll(".seat")];
  const board = document.getElementById("office-board");
  const lineGroup = document.getElementById("office-lines");
  const briefKicker = document.getElementById("brief-kicker");
  const briefTitle = document.getElementById("brief-title");
  const briefBody = document.getElementById("brief-body");
  const sendBtn = document.getElementById("ticket-send");
  const dot = document.getElementById("office-dot");
  const svg = board?.querySelector(".office__edges");

  const roster = {
    lead: {
      kicker: "Lead · main agent",
      title: "Assigns. Does not write the patch.",
      body: "The lead holds the goal and the reporting lines. It sends research out, hands a brief to senior, and only merges if QA signs off.",
    },
    research: {
      kicker: "Researcher",
      title: "Finds out why. Does not guess a fix.",
      body: "Reads CI, the last commits, the auth skill. Comes back with a cause: the session cookie drops under 400px. Hands that to the lead.",
    },
    senior: {
      kicker: "Senior engineer",
      title: "Writes at a separate desk.",
      body: "Gets a brief, not a vibe. Works in a worktree so nobody else is overwritten. Follows the rules: don’t touch the API.",
    },
    qa: {
      kicker: "QA engineer",
      title: "Tries to break it. Builder does not grade themselves.",
      body: "Runs the done-when: tests, lint, 390px submit. Pass or fail goes back to the lead. That line is why you can walk away.",
    },
  };

  const ticketPath = [
    { role: "lead", kicker: "Ticket in", title: "Login is broken.", body: "Lead to researcher: go find out why. Don’t patch yet." },
    { role: "research", kicker: "Researcher", title: "Here’s the cause.", body: "Cookie SameSite drops below 400px. That’s the bug. Back to the lead." },
    { role: "lead", kicker: "Lead", title: "Senior, build this.", body: "Own desk. Don’t touch the API. Follow the auth skill. Write decisions.md." },
    { role: "senior", kicker: "Senior engineer", title: "Patch is in the worktree.", body: "Layout fix only. Ready for QA to try to break it." },
    { role: "qa", kicker: "QA engineer", title: "Couldn’t break it.", body: "test/auth pass, lint clean, form submits at 390px. Back to the lead." },
    { role: "lead", kicker: "Lead", title: "PR is ready. Force-push still asks.", body: "The office did the work. You still confirm what ships. That’s keeping the engineer alive." },
  ];

  function boxOf(seat) {
    const b = board.getBoundingClientRect();
    const r = seat.getBoundingClientRect();
    return {
      cx: r.left - b.left + r.width / 2,
      cy: r.top - b.top + r.height / 2,
      hw: r.width / 2,
      hh: r.height / 2,
    };
  }

  function rim(from, to) {
    const dx = to.cx - from.cx;
    const dy = to.cy - from.cy;
    const t = Math.min(
      Math.abs(dx) < 0.5 ? Infinity : from.hw / Math.abs(dx),
      Math.abs(dy) < 0.5 ? Infinity : from.hh / Math.abs(dy)
    );
    const len = Math.hypot(dx, dy) || 1;
    return {
      x: from.cx + dx * t - (dx / len) * 4,
      y: from.cy + dy * t - (dy / len) * 4,
    };
  }

  function seatAt(role) {
    return seats.find((seat) => seat.dataset.role === role);
  }

  function layoutOffice() {
    if (!board || !svg || !lineGroup) return;
    if (window.matchMedia("(max-width: 719px)").matches) {
      lineGroup.replaceChildren();
      return;
    }
    const w = board.clientWidth;
    const h = board.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const pairs = [
      ["lead", "research"],
      ["lead", "senior"],
      ["senior", "qa"],
      ["qa", "lead"],
    ];
    lineGroup.replaceChildren();
    pairs.forEach(([a, b]) => {
      const from = boxOf(seatAt(a));
      const to = boxOf(seatAt(b));
      const p1 = rim(from, to);
      const p2 = rim(to, from);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
      lineGroup.appendChild(path);
    });
  }

  function placeDotOn(role, on) {
    const seat = seatAt(role);
    if (!seat || !dot) return;
    const box = boxOf(seat);
    dot.setAttribute("cx", String(box.cx));
    dot.setAttribute("cy", String(box.cy));
    dot.classList.toggle("is-on", on);
  }

  function setBrief(entry) {
    briefKicker.textContent = entry.kicker;
    briefTitle.textContent = entry.title;
    briefBody.textContent = entry.body;
  }

  function lightSeat(role) {
    seats.forEach((seat) => {
      const on = seat.dataset.role === role;
      seat.classList.toggle("is-on", on);
      seat.setAttribute("aria-pressed", String(on));
    });
  }

  seats.forEach((seat) => {
    seat.addEventListener("click", () => {
      const entry = roster[seat.dataset.role];
      if (!entry) return;
      lightSeat(seat.dataset.role);
      setBrief(entry);
    });
  });

  let ticketTimer = 0;
  let ticketStep = 0;
  let ticketPlaying = false;

  function stopTicket() {
    ticketPlaying = false;
    window.clearTimeout(ticketTimer);
    sendBtn.textContent = "Send a Ticket Through the Office";
  }

  function runTicketBeat() {
    const beat = ticketPath[ticketStep];
    lightSeat(beat.role);
    setBrief(beat);
    placeDotOn(beat.role, true);
    ticketStep += 1;
    if (ticketStep >= ticketPath.length) {
      stopTicket();
      return;
    }
    const wait = reduceMotion() ? 0 : 1600;
    ticketTimer = window.setTimeout(runTicketBeat, wait);
  }

  sendBtn.addEventListener("click", () => {
    window.clearTimeout(ticketTimer);
    ticketStep = 0;
    ticketPlaying = true;
    sendBtn.textContent = "Ticket walking the floor…";
    if (reduceMotion()) {
      ticketPath.forEach((_, i) => {
        ticketStep = i;
        const beat = ticketPath[i];
        lightSeat(beat.role);
        setBrief(beat);
        placeDotOn(beat.role, true);
      });
      stopTicket();
      return;
    }
    runTicketBeat();
  });

  layoutOffice();
  window.addEventListener("resize", layoutOffice);

  const sections = [...document.querySelectorAll("section[id]")];
  const navLinks = [...document.querySelectorAll(".top__nav a")];

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;

    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 120) current = section;
    }
    const navFor = {
      shift: "#shift",
      recipe: "#recipe",
      live: "#recipe",
      pieces: "#recipe",
      examples: "#examples",
      office: "#office",
      stay: "#office",
    };
    const hash = navFor[current.id] || "";
    navLinks.forEach((link) => {
      if (hash && link.hash === hash) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
