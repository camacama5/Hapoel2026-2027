/**
 * לוגיקת עמוד התוצאות (results.html).
 *
 * הערה: MOCK_GUESSES הם נתוני דמה בלבד, כדי שנוכל לבדוק עיצוב וחוויית משתמש
 * לפני שמחברים ל-Firestore בפועל (שלב 6). כשנחבר את Firebase, נחליף את
 * loadGuesses() בקריאה אמיתית ל-collection guesses, ונשמור על אותה
 * צורת נתונים (participantName, submittedAt, teams[]) כדי שכל שאר
 * הקוד ימשיך לעבוד בלי שינוי.
 */

/**
 * טוען ניחושים אמיתיים מ-collection "guesses" ב-Firestore, ממוינים לפי
 * זמן שליחה. אם שדה submittedAt עדיין לא הגיע (למשל רגע אחרי כתיבה,
 * עקב serverTimestamp), נשתמש בזמן נוכחי כברירת מחדל זמנית.
 */
async function loadGuesses() {
  const snapshot = await db.collection("guesses").orderBy("submittedAt", "asc").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      participantName: data.participantName,
      submittedAt: data.submittedAt ? data.submittedAt.toDate() : new Date(),
      teams: data.teams || [],
    };
  });
}

// ---------- State ----------

const state = {
  guesses: [],
  selectedId: null,
};

// ---------- Elements ----------

const el = {
  list: document.getElementById("participant-list"),
  emptyState: document.getElementById("empty-state"),
  detailPanel: document.getElementById("detail-panel"),
  detailPanelBody: document.getElementById("detail-panel-body"),
};

// ---------- Helpers ----------

function teamById(id) {
  return TEAMS.find((t) => t.id === id);
}

function formatDateTime(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${d}/${m}/${y} ${h}:${min}`;
}

function buildLogoImg(team, className) {
  const img = document.createElement("img");
  img.className = className;
  img.src = `logos/${team.logo}`;
  img.alt = "";
  img.onerror = () => { img.style.visibility = "hidden"; };
  return img;
}

function buildGuessDetailList(guess) {
  const wrap = document.createElement("div");
  wrap.className = "guess-detail";

  guess.teams.forEach((teamId, index) => {
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
  renderList();
  renderDetailPanel();
}

function renderList() {
  el.list.innerHTML = "";

  if (state.guesses.length === 0) {
    el.emptyState.hidden = false;
    return;
  }
  el.emptyState.hidden = true;

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
    dateSpan.textContent = formatDateTime(guess.submittedAt);
    row.appendChild(dateSpan);

    row.addEventListener("click", () => {
      state.selectedId = isSelected ? null : guess.id;
      renderAll();
    });

    item.appendChild(row);

    if (isSelected) {
      const inline = document.createElement("div");
      inline.className = "inline-detail";
      inline.appendChild(buildGuessDetailList(guess));
      item.appendChild(inline);
    }

    el.list.appendChild(item);
  });
}

function renderDetailPanel() {
  if (!el.detailPanel) return;

  const guess = state.guesses.find((g) => g.id === state.selectedId);

  if (!guess) {
    el.detailPanel.classList.add("detail-panel--empty");
    el.detailPanelBody.innerHTML = `<p class="detail-panel__hint">בחר/י משתתף מהרשימה כדי לצפות בניחוש שלו.</p>`;
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
  subtitle.textContent = `נשלח ב-${formatDateTime(guess.submittedAt)}`;
  el.detailPanelBody.appendChild(subtitle);

  el.detailPanelBody.appendChild(buildGuessDetailList(guess));
}

// ---------- Init ----------

loadGuesses()
  .then((guesses) => {
    state.guesses = guesses;
    renderAll();
  })
  .catch((err) => {
    console.error("שגיאה בטעינת הניחושים:", err);
    el.list.innerHTML = "";
    el.emptyState.hidden = false;
    el.emptyState.textContent = "אירעה שגיאה בטעינת הניחושים. נסה/י לרענן את העמוד.";
  });
