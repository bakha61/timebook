(() => {
  "use strict";

  const translations = {
    ru: {
      headerNote: "Рабочее время без лишнего", pageTitle: "Учёт рабочего времени",
      intro: "Запускайте таймер для задачи и смотрите, на что ушло время.", localBadge: "Данные сохраняются в этом приложении",
      teamTitle: "Сотрудники", employeeCountLabel: "Количество сотрудников", employeeNameLabel: "Имя сотрудника",
      employeeNamePlaceholder: "Например, Анна Иванова", addEmployee: "Добавить", teamList: "КОМАНДА",
      selectEmployee: "Выберите сотрудника", noEmployees: "Добавьте первого сотрудника, чтобы начать.",
      timerTitle: "Текущая задача", timerIdle: "Не запущен",
      timerRunning: "Идёт запись", chooseEmployee: "Выберите сотрудника слева, чтобы начать работу.",
      trackingFor: "УЧЁТ ВРЕМЕНИ ДЛЯ", taskLabel: "Над чем работаете?", taskPlaceholder: "Кратко опишите задачу",
      startTimer: "Запустить таймер", stopTimer: "Остановить таймер", timerRuns: "Таймер продолжит работать после закрытия страницы.",
      reportTitle: "История времени", totalTime: "ИТОГО",
      fromDate: "С", toDate: "По", showReport: "Показать", reportChooseEmployee: "Выберите сотрудника, чтобы увидеть отчёт.",
      emptyReport: "За этот период записей нет.", tableTask: "ЗАДАЧА", tableStart: "НАЧАЛО", tableEnd: "КОНЕЦ",
      tableDuration: "ВРЕМЯ", footer: "Простой инструмент для команды · Без учётной записи",
      now: "Сейчас", running: "Работает", loading: "Загрузка…", saved: "Сотрудник добавлен.",
      started: "Таймер запущен.", stopped: "Таймер остановлен.",
      nameRequired: "Введите имя сотрудника.", taskRequired: "Опишите задачу перед запуском.",
      datesRequired: "Выберите обе даты.", invalidDates: "Начальная дата должна быть не позже конечной.",
      requestFailed: "Не удалось загрузить данные. Попробуйте ещё раз.", duplicateTimer: "У этого сотрудника уже работает таймер.",
      noActiveTimer: "Активный таймер не найден.", elapsedLabel: "Прошедшее время", selected: "Выбрано", activeLabel: "Таймер работает"
    },
    en: {
      headerNote: "Time tracking, made simple", pageTitle: "Time tracking",
      intro: "Start a timer for a task and see where your team's time goes.", localBadge: "Data is saved in this app",
      teamTitle: "Employees", employeeCountLabel: "Employee count", employeeNameLabel: "Employee name",
      employeeNamePlaceholder: "For example, Anna Ivanova", addEmployee: "Add", teamList: "TEAM",
      selectEmployee: "Select an employee", noEmployees: "Add your first employee to get started.",
      timerTitle: "Current task", timerIdle: "Not running",
      timerRunning: "Tracking time", chooseEmployee: "Select an employee on the left to get started.",
      trackingFor: "TRACKING TIME FOR", taskLabel: "What are you working on?", taskPlaceholder: "Briefly describe the task",
      startTimer: "Start timer", stopTimer: "Stop timer", timerRuns: "The timer keeps running when you close this page.",
      reportTitle: "Time history", totalTime: "TOTAL",
      fromDate: "From", toDate: "To", showReport: "Show report", reportChooseEmployee: "Select an employee to view a report.",
      emptyReport: "No entries for this period.", tableTask: "TASK", tableStart: "START", tableEnd: "END",
      tableDuration: "TIME", footer: "A simple team tool · No account required",
      now: "Now", running: "Running", loading: "Loading…", saved: "Employee added.",
      started: "Timer started.", stopped: "Timer stopped.",
      nameRequired: "Enter an employee name.", taskRequired: "Describe the task before starting.",
      datesRequired: "Choose both dates.", invalidDates: "The start date must be on or before the end date.",
      requestFailed: "Could not load data. Please try again.", duplicateTimer: "This employee already has a running timer.",
      noActiveTimer: "No active timer was found.", elapsedLabel: "Elapsed time", selected: "Selected", activeLabel: "Timer running"
    }
  };

  const els = Object.fromEntries([
    "globalNotice", "employeeForm", "employeeName", "employeeError", "addEmployeeButton", "employeeCount",
    "employeeList", "employeeEmpty", "noSelection", "timerControls", "selectedAvatar", "selectedName", "timerState",
    "timerForm", "taskDescription", "taskError", "startButton", "activeTimer", "activeDescription", "elapsedTime",
    "stopButton", "dateForm", "fromDate", "toDate", "dateError", "applyDates", "reportNoSelection",
    "reportEmpty", "reportContent", "entriesBody", "totalTime"
  ].map(id => [id, document.getElementById(id)]));

  const state = {
    language: readLanguage(), employees: [], selectedId: null, report: null,
    reportAt: 0, reportToMs: 0, pending: false, noticeTimeout: null
  };

  function readLanguage() {
    try { return localStorage.getItem("timebook-language") === "en" ? "en" : "ru"; }
    catch { return "ru"; }
  }

  function t(key) { return translations[state.language][key] || key; }

  function setLanguage(language) {
    state.language = language;
    document.documentElement.lang = language;
    document.title = language === "ru" ? "Timebook · Учёт рабочего времени" : "Timebook · Time tracking";
    try { localStorage.setItem("timebook-language", language); } catch { /* Private browsing can disable storage. */ }
    document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
    document.querySelectorAll("[data-language]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    });
    els.elapsedTime.setAttribute("aria-label", t("elapsedLabel"));
    renderEmployees();
    renderTimer();
    renderReport();
  }

  function notice(message, isError = false) {
    clearTimeout(state.noticeTimeout);
    els.globalNotice.textContent = message;
    els.globalNotice.classList.toggle("notice-error", isError);
    els.globalNotice.setAttribute("role", isError ? "alert" : "status");
    els.globalNotice.hidden = false;
    state.noticeTimeout = setTimeout(() => { els.globalNotice.hidden = true; }, 6000);
  }

  function fieldError(element, input, message) {
    element.textContent = message;
    element.hidden = !message;
    input.setAttribute("aria-invalid", String(Boolean(message)));
    if (message) input.focus();
  }

  function errorText(error) {
    const code = String(error?.code || "").toLowerCase();
    if (code === "invalid_name") return t("nameRequired");
    if (code === "invalid_description") return t("taskRequired");
    if (code === "invalid_period") return t("invalidDates");
    if (["active_timer_exists", "timer_already_running", "timer_running", "duplicate_timer"].includes(code)) return t("duplicateTimer");
    if (["no_active_timer", "timer_not_running"].includes(code)) return t("noActiveTimer");
    return error?.message || t("requestFailed");
  }

  async function api(path, options = {}) {
    let response;
    try {
      response = await fetch(path, {
        ...options,
        headers: { "Accept": "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
      });
    } catch {
      throw { code: "network_error", message: t("requestFailed") };
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw payload.error || { code: "request_error", message: t("requestFailed") };
    return payload;
  }

  function selectedEmployee() {
    return state.employees.find(employee => employee.id === state.selectedId) || null;
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toLocaleUpperCase(state.language) || "").join("");
  }

  function pad(number) { return String(number).padStart(2, "0"); }

  function formatDuration(seconds) {
    const rounded = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${pad(Math.floor(rounded / 3600))}:${pad(Math.floor((rounded % 3600) / 60))}:${pad(rounded % 60)}`;
  }

  function formatDateTime(value) {
    if (!value) return t("now");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(state.language === "ru" ? "ru-RU" : "en-US", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(date);
  }

  function dateInputValue(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function localDate(value, addDays = 0) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day + addDays);
  }

  function dateRange() {
    const from = els.fromDate.value;
    const to = els.toDate.value;
    if (!from || !to) throw { code: "date_error", message: t("datesRequired") };
    if (from > to) throw { code: "date_error", message: t("invalidDates") };
    return { from: localDate(from).toISOString(), to: localDate(to, 1).toISOString() };
  }

  function renderEmployees() {
    els.employeeCount.textContent = String(state.employees.length);
    els.employeeCount.setAttribute("aria-label", `${t("employeeCountLabel")}: ${state.employees.length}`);
    els.employeeEmpty.hidden = state.employees.length > 0;
    els.employeeList.replaceChildren();
    for (const employee of state.employees) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "employee-button" + (employee.id === state.selectedId ? " is-selected" : "");
      button.setAttribute("aria-pressed", String(employee.id === state.selectedId));
      const avatar = document.createElement("span");
      avatar.className = "avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = initials(employee.name);
      const details = document.createElement("span");
      details.className = "employee-details";
      const name = document.createElement("strong");
      name.textContent = employee.name;
      const status = document.createElement("small");
      status.textContent = employee.active_entry ? t("activeLabel") : t("timerIdle");
      details.append(name, status);
      button.append(avatar, details);
      if (employee.active_entry) {
        const dot = document.createElement("span");
        dot.className = "list-active-dot";
        dot.setAttribute("aria-hidden", "true");
        button.append(dot);
      }
      button.addEventListener("click", () => selectEmployee(employee.id));
      li.append(button);
      els.employeeList.append(li);
    }
  }

  function renderTimer() {
    const employee = selectedEmployee();
    els.noSelection.hidden = Boolean(employee);
    els.timerControls.hidden = !employee;
    const active = employee?.active_entry || null;
    els.timerState.textContent = active ? t("timerRunning") : t("timerIdle");
    els.timerState.className = "state-badge " + (active ? "state-running" : "state-idle");
    if (!employee) return;
    els.selectedName.textContent = employee.name;
    els.selectedAvatar.textContent = initials(employee.name);
    els.timerForm.hidden = Boolean(active);
    els.activeTimer.hidden = !active;
    if (active) {
      els.activeDescription.textContent = active.description;
      updateClock();
    }
  }

  function updateClock() {
    const active = selectedEmployee()?.active_entry;
    if (active) els.elapsedTime.textContent = formatDuration((Date.now() - new Date(active.started_at).getTime()) / 1000);
    if (!state.report) return;
    const secondsSinceReport = Math.max(0, Math.floor((performance.now() - state.reportAt) / 1000));
    const secondsUntilPeriodEnd = Math.max(0, Math.floor((state.reportToMs - Date.parse(state.report.as_of)) / 1000));
    const increment = Math.min(secondsSinceReport, secondsUntilPeriodEnd);
    const hasActiveRow = state.report.entries.some(entry => entry.active);
    els.totalTime.textContent = formatDuration(state.report.total_seconds + (hasActiveRow ? increment : 0));
    const activeDuration = document.querySelector("[data-active-duration]");
    if (activeDuration) {
      const base = Number(activeDuration.dataset.baseSeconds) || 0;
      activeDuration.textContent = formatDuration(base + increment);
    }
  }

  function renderReport() {
    const employee = selectedEmployee();
    els.reportNoSelection.hidden = Boolean(employee);
    els.reportContent.hidden = true;
    els.reportEmpty.hidden = true;
    if (!employee || !state.report) {
      els.totalTime.textContent = "00:00:00";
      return;
    }
    els.totalTime.textContent = formatDuration(state.report.total_seconds);
    const entries = state.report.entries || [];
    els.reportEmpty.hidden = entries.length > 0;
    els.reportContent.hidden = entries.length === 0;
    els.entriesBody.replaceChildren();
    for (const entry of entries) {
      const row = document.createElement("tr");
      const taskCell = document.createElement("td");
      const task = document.createElement("strong");
      task.textContent = entry.description;
      taskCell.append(task);
      if (entry.active) {
        const badge = document.createElement("span");
        badge.className = "inline-running";
        badge.textContent = t("running");
        taskCell.append(badge);
      }
      const started = document.createElement("td");
      started.textContent = formatDateTime(entry.started_at);
      const stopped = document.createElement("td");
      stopped.textContent = entry.active ? t("now") : formatDateTime(entry.stopped_at);
      const duration = document.createElement("td");
      duration.className = "duration-column duration-value";
      duration.textContent = formatDuration(entry.elapsed_seconds);
      if (entry.active) {
        duration.dataset.activeDuration = "";
        duration.dataset.baseSeconds = String(entry.elapsed_seconds);
      }
      row.append(taskCell, started, stopped, duration);
      els.entriesBody.append(row);
    }
    updateClock();
  }

  async function loadEmployees() {
    const result = await api("/api/employees");
    state.employees = result.employees || [];
    if (state.selectedId !== null && !selectedEmployee()) state.selectedId = null;
    if (state.selectedId === null && state.employees.length) state.selectedId = state.employees[0].id;
    renderEmployees();
    renderTimer();
  }

  async function loadReport() {
    if (state.selectedId === null) { state.report = null; renderReport(); return; }
    const range = dateRange();
    const params = new URLSearchParams(range);
    const employeeId = state.selectedId;
    const report = await api(`/api/employees/${employeeId}/entries?${params}`);
    if (state.selectedId !== employeeId) return;
    state.report = report;
    state.reportAt = performance.now();
    state.reportToMs = Date.parse(range.to);
    renderReport();
  }

  async function selectEmployee(id) {
    if (state.selectedId === id) return;
    state.selectedId = id;
    state.report = null;
    fieldError(els.taskError, els.taskDescription, "");
    renderEmployees();
    renderTimer();
    renderReport();
    try { await loadReport(); } catch (error) { notice(errorText(error), true); }
  }

  async function withPending(button, work) {
    if (state.pending) return;
    state.pending = true;
    button.disabled = true;
    try { await work(); }
    finally { state.pending = false; button.disabled = false; }
  }

  function attachEvents() {
    document.querySelectorAll("[data-language]").forEach(button => {
      button.addEventListener("click", () => setLanguage(button.dataset.language));
    });
    els.employeeForm.addEventListener("submit", async event => {
      event.preventDefault();
      const name = els.employeeName.value.trim();
      fieldError(els.employeeError, els.employeeName, name ? "" : t("nameRequired"));
      if (!name) return;
      try {
        await withPending(els.addEmployeeButton, async () => {
          const result = await api("/api/employees", { method: "POST", body: JSON.stringify({ name }) });
          els.employeeName.value = "";
          if (result.employee) state.selectedId = result.employee.id;
          state.report = null;
          await loadEmployees();
          await loadReport();
          notice(t("saved"));
        });
      } catch (error) { fieldError(els.employeeError, els.employeeName, errorText(error)); }
    });
    els.timerForm.addEventListener("submit", async event => {
      event.preventDefault();
      const description = els.taskDescription.value.trim();
      fieldError(els.taskError, els.taskDescription, description ? "" : t("taskRequired"));
      if (!description || state.selectedId === null) return;
      try {
        await withPending(els.startButton, async () => {
          await api(`/api/employees/${state.selectedId}/timer/start`, { method: "POST", body: JSON.stringify({ description }) });
          els.taskDescription.value = "";
          await loadEmployees();
          await loadReport();
          notice(t("started"));
        });
      } catch (error) { fieldError(els.taskError, els.taskDescription, errorText(error)); }
    });
    els.stopButton.addEventListener("click", async () => {
      if (state.selectedId === null) return;
      try {
        await withPending(els.stopButton, async () => {
          await api(`/api/employees/${state.selectedId}/timer/stop`, { method: "POST" });
          await loadEmployees();
          await loadReport();
          notice(t("stopped"));
        });
      } catch (error) { notice(errorText(error), true); }
    });
    els.dateForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        dateRange();
        fieldError(els.dateError, els.fromDate, "");
        await withPending(els.applyDates, loadReport);
      } catch (error) { fieldError(els.dateError, els.fromDate, errorText(error)); }
    });
    els.employeeName.addEventListener("input", () => fieldError(els.employeeError, els.employeeName, ""));
    els.taskDescription.addEventListener("input", () => fieldError(els.taskError, els.taskDescription, ""));
    setInterval(updateClock, 1000);
  }

  async function init() {
    const today = new Date();
    els.toDate.value = dateInputValue(today);
    els.fromDate.value = dateInputValue(new Date(today.getFullYear(), today.getMonth(), 1));
    setLanguage(state.language);
    attachEvents();
    try { await loadEmployees(); await loadReport(); }
    catch (error) { notice(errorText(error), true); }
  }

  init();
})();
