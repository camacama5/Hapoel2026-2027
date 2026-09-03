/**
 * לוגיקת עמוד הניחוש (index.html).
 *
 * הערה: פונקציית saveGuess() כרגע היא Placeholder בלבד.
 * חיבור אמיתי ל-Firestore יתווסף בשלב 6 (לפי סדר העבודה שסוכם).
 * כרגע היא רק מדגימה את זרימת הנעילה/הצלחה בצד הלקוח.
 */

const state = {
  participantName: "",
  // מערך באורך 15, כל תא הוא team.id או null אם עדיין לא נבחר
  picks: Array(TOTAL_TEAMS).fill(null),
  activeSlot: null, // אינדקס המקום שהפאנל שלו פתוח כרגע, או null
  submitted: false,
  closingDate: null, // נטען מ-Firestore באתחול
  isClosed: false,
  loading: true,
};

// ---------- Elements ----------

const el = {
  nameInput: document.getElementById("participant-name"),
  slotsContainer: document.getElementById("slots"),
  sidePreview: document.getElementById("side-preview-list"),
  progressCount: document.getElementById("progress-count"),
  progressFill: document.getElementById("progress-fill"),
  submitBtn: document.getElementById("submit-btn"),
  footerHint: document.getElementById("footer-hint"),
  app: document.getElementById("app"),
};

// ---------- Helpers ----------

function teamById(id) {
  return TEAMS.find((t) => t.id === id);
}

function filledCount() {
  return state.picks.filter(Boolean).length;
}

function isTeamTaken(teamId, excludingSlotIndex) {
  return state.picks.some((id, idx) => id === teamId && idx !== excludingSlotIndex);
}

function firstEmptySlotAfter(index) {
  for (let i = index + 1; i < TOTAL_TEAMS; i++) {
    if (!state.picks[i]) return i;
  }
  for (let i = 0; i < TOTAL_TEAMS; i++) {
    if (!state.picks[i]) return i;
  }
  return null;
}

// ---------- Rendering ----------

function renderAll() {
  renderStatusBar();
  renderSlots();
  renderSidePreview();
  renderFooter();
}

function renderStatusBar() {
  const count = filledCount();
  el.progressCount.textContent = `${count} / ${TOTAL_TEAMS} מולאו`;
  el.progressFill.style.width = `${(count / TOTAL_TEAMS) * 100}%`;
}

function renderSlots() {
  el.slotsContainer.innerHTML = "";

  state.picks.forEach((pickId, index) => {
    const rank = index + 1;
    const team = pickId ? teamById(pickId) : null;
    const isActive = state.activeSlot === index;

    const slotEl = document.createElement("div");
    slotEl.className = "slot" + (team ? " slot--filled" : "") + (isActive ? " slot--active" : "");

    const row = document.createElement("button");
    row.type = "button";
    row.className = "slot__row";
    row.setAttribute("aria-expanded", String(isActive));

    const rankEl = document.createElement("span");
    rankEl.className = "slot__rank";
    rankEl.textContent = rank;
    row.appendChild(rankEl);

    const content = document.createElement("span");
    content.className = "slot__content";

    if (team) {
      const logo = document.createElement("img");
      logo.className = "slot__logo";
      logo.src = `logos/${team.logo}`;
      logo.alt = "";
      logo.onerror = () => { logo.style.visibility = "hidden"; };
      content.appendChild(logo);

      const nameSpan = document.createElement("span");
      nameSpan.className = "slot__team-name";
      nameSpan.textContent = team.name;
      content.appendChild(nameSpan);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "slot__placeholder";
      placeholder.textContent = `בחר קבוצה למקום ${rank}`;
      content.appendChild(placeholder);
    }

    row.appendChild(content);

    if (team) {
      const changeBtn = document.createElement("span");
      changeBtn.className = "slot__change";
      changeBtn.textContent = "שינוי";
      row.appendChild(changeBtn);
    }

    row.addEventListener("click", () => {
      if (state.submitted || state.loading || state.isClosed) return;
      state.activeSlot = isActive ? null : index;
      renderSlots();
      // הערה: בכוונה לא מפעילים focus() אוטומטי - המקלדת תיפתח רק
      // כשהמשתמש בעצמו יקיש על שדה החיפוש, לא אוטומטית בפתיחת השורה.
    });

    slotEl.appendChild(row);

    if (isActive) {
      slotEl.appendChild(buildSearchPanel(index));
    }

    el.slotsContainer.appendChild(slotEl);
  });
}

function buildSearchPanel(index) {
  const panel = document.createElement("div");
  panel.className = "search-panel";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "search-input";
  input.id = `search-input-${index}`;
  input.placeholder = "הקלד שם קבוצה...";
  input.autocomplete = "off";

  const resultsEl = document.createElement("div");
  resultsEl.className = "search-results";

  function renderResults(query) {
    const q = query.trim();
    const available = TEAMS.filter((t) => !isTeamTaken(t.id, index));
    const filtered = q
      ? available.filter((t) => t.name.includes(q))
      : available;

    resultsEl.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "search-empty";
      empty.textContent = "לא נמצאה קבוצה מתאימה.";
      resultsEl.appendChild(empty);
      return;
    }

    filtered.forEach((team) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-result";

      const logo = document.createElement("img");
      logo.className = "search-result__logo";
      logo.src = `logos/${team.logo}`;
      logo.alt = "";
      logo.onerror = () => { logo.style.visibility = "hidden"; };
      btn.appendChild(logo);

      const nameSpan = document.createElement("span");
      nameSpan.textContent = team.name;
      btn.appendChild(nameSpan);

      btn.addEventListener("click", () => selectTeam(index, team.id));
      resultsEl.appendChild(btn);
    });
  }

  input.addEventListener("input", () => renderResults(input.value));

  panel.appendChild(input);
  panel.appendChild(resultsEl);

  // רינדור ראשוני
  requestAnimationFrame(() => renderResults(""));

  return panel;
}

function selectTeam(index, teamId) {
  state.picks[index] = teamId;
  const next = firstEmptySlotAfter(index);
  state.activeSlot = next;
  renderAll();
  // הערה: בכוונה לא מפעילים focus() אוטומטי כאן - המקלדת תיפתח רק
  // כשהמשתמש עצמו יקיש על שדה החיפוש, לא בכל מעבר אוטומטי בין מקומות.
}

function renderSidePreview() {
  if (!el.sidePreview) return;
  el.sidePreview.innerHTML = "";

  state.picks.forEach((pickId, index) => {
    const rank = index + 1;
    const team = pickId ? teamById(pickId) : null;

    const row = document.createElement("div");
    row.className = "side-preview__row";

    const rankEl = document.createElement("span");
    rankEl.className = "side-preview__rank";
    rankEl.textContent = rank;
    row.appendChild(rankEl);

    if (team) {
      const logo = document.createElement("img");
      logo.className = "side-preview__logo";
      logo.src = `logos/${team.logo}`;
      logo.alt = "";
      logo.onerror = () => { logo.style.visibility = "hidden"; };
      row.appendChild(logo);

      const nameSpan = document.createElement("span");
      nameSpan.textContent = team.name;
      row.appendChild(nameSpan);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "side-preview__empty";
      placeholder.textContent = "—";
      row.appendChild(placeholder);
    }

    el.sidePreview.appendChild(row);
  });
}

function renderFooter() {
  const complete = filledCount() === TOTAL_TEAMS;
  const hasName = state.participantName.trim().length > 0;

  el.submitBtn.disabled = state.loading || state.isClosed || !(complete && hasName) || state.submitted;

  if (state.loading) {
    el.footerHint.textContent = "טוען...";
  } else if (state.isClosed) {
    el.footerHint.textContent = `המשחק נסגר להגשות בתאריך ${formatDate(state.closingDate)}.`;
  } else if (state.submitted) {
    el.footerHint.textContent = "הניחוש נשלח ונעול.";
  } else if (!hasName) {
    el.footerHint.textContent = "הזן/י שם כדי להמשיך.";
  } else if (!complete) {
    el.footerHint.textContent = `נותרו ${TOTAL_TEAMS - filledCount()} מקומות למילוי.`;
  } else {
    el.footerHint.textContent = "כל המקומות מולאו — אפשר לשלוח את הניחוש.";
  }
}

function formatDate(date) {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// ---------- Name input ----------

el.nameInput.addEventListener("input", () => {
  state.participantName = el.nameInput.value;
  renderFooter();
});

// ---------- Submit flow ----------

el.submitBtn.addEventListener("click", () => {
  if (el.submitBtn.disabled) return;
  if (document.activeElement) document.activeElement.blur();
  openConfirmModal();
});

function openConfirmModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <p class="modal__title">לשלוח את הניחוש?</p>
    <p class="modal__body">לאחר השליחה לא ניתן יהיה לשנות את הניחוש. ודא/י שהטבלה נכונה.</p>
    <div class="modal__actions">
      <button type="button" class="modal__btn" id="modal-cancel">ביטול</button>
      <button type="button" class="modal__btn modal__btn--primary" id="modal-confirm">כן, שלח/י</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });

  modal.querySelector("#modal-cancel").addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  modal.querySelector("#modal-confirm").addEventListener("click", () => {
    document.body.removeChild(overlay);
    submitGuess();
  });
}

async function submitGuess() {
  // בדיקת הגנה נוספת לפני שליחה בפועל (ההגנה האמיתית היא ב-Security Rules, שלב 7)
  if (state.isClosed) {
    alert("המשחק נסגר להגשות ולא ניתן יותר לשלוח ניחוש.");
    renderFooter();
    return;
  }

  state.submitted = true;
  el.submitBtn.disabled = true;
  el.submitBtn.textContent = "שולח...";

  try {
    await saveGuess({
      participantName: state.participantName.trim(),
      teams: [...state.picks],
    });
    showSuccessScreen();
  } catch (err) {
    state.submitted = false;
    el.submitBtn.disabled = false;
    el.submitBtn.textContent = "שליחת הניחוש";
    alert("קרתה שגיאה בשליחת הניחוש. נסה/י שוב.");
    console.error(err);
  }
}

/**
 * שמירה אמיתית ל-Firestore, לתוך collection בשם "guesses".
 */
function saveGuess(guessData) {
  return db.collection("guesses").add({
    participantName: guessData.participantName,
    teams: guessData.teams,
    submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * טוען את מועד הסגירה ממסמך config/gameSettings.
 * אם המסמך או השדה לא קיימים (למשל לפני שהוגדר ידנית בקונסולה),
 * המשחק נשאר פתוח כברירת מחדל.
 */
async function loadGameSettings() {
  try {
    const snap = await db.collection("config").doc("gameSettings").get();
    if (snap.exists && snap.data().closingDate) {
      state.closingDate = snap.data().closingDate.toDate();
      state.isClosed = new Date() > state.closingDate;
    }
  } catch (err) {
    console.error("שגיאה בטעינת הגדרות המשחק:", err);
  } finally {
    state.loading = false;
    renderAll();
  }
}

function showSuccessScreen() {
  el.app.innerHTML = `
    <div class="success-screen">
      <div class="success-screen__icon">✓</div>
      <p class="success-screen__title">הניחוש נשלח בהצלחה!</p>
      <p class="success-screen__body">הניחוש שלך נשמר ונעול לעריכה. מעביר אותך לעמוד התוצאות...</p>
    </div>
  `;
  setTimeout(() => {
    window.location.href = "results.html";
  }, 1800);
}

// ---------- Init ----------

renderAll();
loadGameSettings();
