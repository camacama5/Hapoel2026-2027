/**
 * לוגיקת עמוד התוצאות (results.html).
 *
 * מודל הנתונים מפוצל בכוונה לשני collections נפרדים ב-Firestore:
 *  - guesses      : שם המשתתף + תאריך שליחה בלבד. גלוי לכולם תמיד (מציג "מי כבר ניחש").
 *  - guessTeams   : 15 הקבוצות שנוחשו, לפי אותו מזהה מסמך. חסום לקריאה עד מועד
 *                   החשיפה (revealDate), נאכף ב-Firestore Security Rules.
 * הפיצול נחוץ כי Firestore לא תומך בהרשאות ברמת שדה בודד בתוך מסמך - רק ברמת
 * מסמך שלם.
 */

/**
 * טוען את רשימת המשתתפים ששלחו ניחוש (שם + תאריך בלבד) מ-collection "guesses".
 * זהו מידע ציבורי תמיד - לא כולל את הקבוצות עצמן.
 */
async function loadGuesses() {
  const snapshot = await db.collection("guesses").orderBy("submittedAt", "asc").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      participantName: data.participantName,
      submittedAt: data.submittedAt ? data.submittedAt.toDate() : new Date(),
    };
  });
}

/**
 * טוען את מועד החשיפה (revealDate) ממסמך config/gameSettings.
 * אם השדה לא קיים - נשמר כ-null, והתצוגה תתייחס לכך כ"עדיין לא נחשף"
 * (ברירת מחדל בטוחה - לא לחשוף בטעות לפני שהוגדר מפורשות).
 */
async function loadRevealDate() {
  try {
    const snap = await db.collection("config").doc("gameSettings").get();
    if (snap.exists && snap.data().revealDate) {
      return snap.data().revealDate.toDate();
    }
  } catch (err) {
    console.error("שגיאה בטעינת מועד החשיפה:", err);
  }
  return null;
}

/**
 * טוען לפי דרישה (lazy) את 15 הקבוצות של ניחוש מסוים מ-collection "guessTeams".
 * זמין רק אחרי מועד החשיפה - לפני כן, Firestore Security Rules יחסמו את הקריאה.
 */
async function loadGuessTeams(guessId) {
  const snap = await db.collection("guessTeams").doc(guessId).get();
  return snap.exists ? snap.data().teams : [];
}

// ---------- State ----------

const state = {
  guesses: [],
  selectedId: null,
  revealDate: null,
  teamsCache: {}, // guessId -> teams array, נטען לפי דרישה אחרי מועד החשיפה
  loadingDetailId: null,
};

// ---------- Elements ----------

const el = {
  list: document.getElementById("participant-list"),
  emptyState: document.getElementById("empty-state"),
  detailPanel: document.getElementById("detail-panel"),
  detailPanelBody: document.getElementById("detail-panel-body"),
  headerSubtitle: document.getElementById("header-subtitle"),
};

// ---------- Helpers ----------

function teamById(id) {
  return TEAMS.find((t) => t.id === id);
}

function formatDateOnly(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

const HEBREW_MONTHS = [
  "בינואר", "בפברואר", "במרץ", "באפריל", "במאי", "ביוני",
  "ביולי", "באוגוסט", "בספטמבר", "באוקטובר", "בנובמבר", "בדצמבר",
];

function formatDateHebrew(date) {
  return `${date.getDate()} ${HEBREW_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function isRevealed() {
  return !!(state.revealDate && new Date() > state.revealDate);
}

function buildLogoImg(team, className) {
  const img = document.createElement("img");
  img.className = className;
  img.src = `logos/${team.logo}`;
  img.alt = "";
  img.onerror = () => { img.style.visibility = "hidden"; };
  return img;
}

function buildGuessDetailList(teams) {
  const wrap = document.createElement("div");
  wrap.className = "guess-detail";

  teams.forEach((teamId, index) => {
    const team = teamById(teamId);
    const row = document.createElement("div");
    row.className = "guess-detail__row";

    const rank = document.createElement("span");
    rank.className = "guess-detail__rank";
    rank.textContent = index + 1;
    row.appendChild(rank);

    if (team) {
      row.appendChild(buildLogoImg(team, "guess-detail__logo"));
      const name = document.createElement("span");
      name.className = "guess-detail__name";
      name.textContent = team.name;
      row.appendChild(name);
    } else {
      const name = document.createElement("span");
      name.className = "guess-detail__name";
      name.textContent = "—";
      row.appendChild(name);
    }

    wrap.appendChild(row);
  });

  return wrap;
}

// ---------- Rendering ----------

function renderAll() {
  renderHeaderSubtitle();
  renderList();
  renderDetailPanel();
}

function renderHeaderSubtitle() {
  if (!el.headerSubtitle) return;
  if (state.revealDate) {
    el.headerSubtitle.textContent =
      `רשימת המשתתפים ששלחו ניחוש. לחצו על שם כדי לצפות בטבלה שלו - ` +
      `ניתן יהיה לצפות בניחושים החל מ-${formatDateHebrew(state.revealDate)}.`;
  }
}

function renderList() {
  el.list.innerHTML = "";

  if (state.guesses.length === 0) {
    el.emptyState.hidden = false;
    return;
  }
  el.emptyState.hidden = true;

  const revealed = isRevealed();

  state.guesses.forEach((guess) => {
    const isSelected = state.selectedId === guess.id;

    const item = document.createElement("div");
    item.className = "participant-item" + (isSelected ? " participant-item--open" : "");

    const row = document.createElement("button");
    row.type = "button";
    row.className = "participant-row";
    row.setAttribute("aria-expanded", String(isSelected));

    const nameSpan = document.createElement("span");
    nameSpan.className = "participant-row__name";
    nameSpan.textContent = guess.participantName;
    row.appendChild(nameSpan);

    const dateSpan = document.createElement("span");
    dateSpan.className = "participant-row__date";
    dateSpan.textContent = revealed
      ? formatDateOnly(guess.submittedAt)
      : `${formatDateOnly(guess.submittedAt)} 🔒`;
    row.appendChild(dateSpan);

    row.addEventListener("click", () => {
      if (!revealed) return; // לפני מועד החשיפה - אין מה לפתוח
      state.selectedId = isSelected ? null : guess.id;
      renderAll();
      if (state.selectedId) loadDetailIfNeeded(state.selectedId);
    });

    if (!revealed) {
      row.classList.add("participant-row--locked");
    }

    item.appendChild(row);

    if (revealed && isSelected) {
      const inline = document.createElement("div");
      inline.className = "inline-detail";
      inline.appendChild(buildDetailContent(guess.id));
      item.appendChild(inline);
    }

    el.list.appendChild(item);
  });
}

function buildDetailContent(guessId) {
  const teams = state.teamsCache[guessId];
  if (state.loadingDetailId === guessId) {
    const p = document.createElement("p");
    p.className = "detail-panel__hint";
    p.textContent = "טוען...";
    return p;
  }
  if (!teams) {
    const p = document.createElement("p");
    p.className = "detail-panel__hint";
    p.textContent = "אירעה שגיאה בטעינת הניחוש.";
    return p;
  }
  return buildGuessDetailList(teams);
}

async function loadDetailIfNeeded(guessId) {
  if (state.teamsCache[guessId]) return; // כבר בזיכרון, לא טוענים שוב
  state.loadingDetailId = guessId;
  renderAll();
  try {
    const teams = await loadGuessTeams(guessId);
    state.teamsCache[guessId] = teams;
  } catch (err) {
    console.error("שגיאה בטעינת פרטי הניחוש:", err);
  } finally {
    state.loadingDetailId = null;
    renderAll();
  }
}

function renderDetailPanel() {
  if (!el.detailPanel) return;

  const guess = state.guesses.find((g) => g.id === state.selectedId);
  const revealed = isRevealed();

  if (!guess || !revealed) {
    el.detailPanel.classList.add("detail-panel--empty");
    el.detailPanelBody.innerHTML = revealed
      ? `<p class="detail-panel__hint">בחר/י משתתף מהרשימה כדי לצפות בניחוש שלו.</p>`
      : `<p class="detail-panel__hint">🔒 ניתן יהיה לצפות בניחושים החל מ-${state.revealDate ? formatDateHebrew(state.revealDate) : "מועד שיפורסם"}.</p>`;
    return;
  }

  el.detailPanel.classList.remove("detail-panel--empty");
  el.detailPanelBody.innerHTML = "";

  const title = document.createElement("p");
  title.className = "detail-panel__title";
  title.textContent = `הניחוש של ${guess.participantName}`;
  el.detailPanelBody.appendChild(title);

  const subtitle = document.createElement("p");
  subtitle.className = "detail-panel__subtitle";
  subtitle.textContent = `נשלח ב-${formatDateOnly(guess.submittedAt)}`;
  el.detailPanelBody.appendChild(subtitle);

  el.detailPanelBody.appendChild(buildDetailContent(guess.id));
}

// ---------- Init ----------

Promise.all([loadGuesses(), loadRevealDate()])
  .then(([guesses, revealDate]) => {
    state.guesses = guesses;
    state.revealDate = revealDate;
    renderAll();
  })
  .catch((err) => {
    console.error("שגיאה בטעינת הניחושים:", err);
    el.list.innerHTML = "";
    el.emptyState.hidden = false;
    el.emptyState.textContent = "אירעה שגיאה בטעינת הרשימה. נסה/י לרענן את העמוד.";
  });
