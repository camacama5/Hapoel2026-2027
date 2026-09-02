/**
 * רשימת 15 הקבוצות הרשמית של המשחק.
 * זהו מקור האמת היחיד לרשימת הקבוצות בצד הלקוח.
 * id  - מזהה קבוע (משמש בשמירה ל-Firestore ובשם קובץ הלוגו)
 * name - שם התצוגה בעברית
 * logo - שם קובץ הלוגו בתיקיית logos/
 *
 * חשוב: כשתשנה את שמות קבצי הלוגו, וודא שהם תואמים בדיוק לשדה logo כאן.
 */
const TEAMS = [
  { id: "ironi_ashkelon",        name: "א.ס עירוני אשקלון",           logo: "ironi_ashkelon.png" },
  { id: "ramat_hasharon",        name: "א.ס רמת השרון",               logo: "ramat_hasharon.png" },
  { id: "maccabi_kiryat_gat",    name: "מכבי קריית גת",               logo: "maccabi_kiryat_gat.png" },
  { id: "maccabi_rehovot",       name: "מכבי רחובות",                 logo: "maccabi_rehovot.png" },
  { id: "hapoel_haifa",          name: "הפועל חיפה",                  logo: "hapoel_haifa.png" },
  { id: "hapoel_migdal_haemek",  name: "הפועל מגדל העמק-יזרעאל",      logo: "hapoel_migdal_haemek.png" },
  { id: "maccabi_petah_tikva",   name: "מכבי פתח תקווה",              logo: "maccabi_petah_tikva.png" },
  { id: "elitzur_shomron",       name: "אליצור שומרון",               logo: "elitzur_shomron.png" },
  { id: "elitzur_yavne",         name: "אליצור יבנה",                 logo: "elitzur_yavne.png" },
  { id: "otef_darom",            name: "מ.כ עוטף דרום",               logo: "otef_darom.png" },
  { id: "ironi_nahariya",        name: "עירוני נהריה",                logo: "ironi_nahariya.png" },
  { id: "elitzur_netanya",       name: "אליצור נתניה",                logo: "elitzur_netanya.png" },
  { id: "maccabi_raanana",       name: "מכבי רעננה",                  logo: "maccabi_raanana.png" },
  { id: "maccabi_kiryat_motzkin",name: "מכבי קריית מוצקין",           logo: "maccabi_kiryat_motzkin.png" },
  { id: "hapoel_hevel_modiin",   name: "הפועל חבל מודיעין",           logo: "hapoel_hevel_modiin.png" },
];

const TOTAL_TEAMS = TEAMS.length; // 15
