// user_styles.js - пользовательские стили (сохранённые через редактор).

const UserStyles = (() => {
  const KEY = "hexxagon_user_styles_v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; }
    catch (e) { return false; }
  }

  function addStyle(name, data) {
    const d = load();
    d[name] = {
      name: name,
      bpm: data.bpm || 100,
      bars: 8,
      stepsPerBar: 16,
      pattern: data.pattern,
      savedAt: new Date().toISOString(),
    };
    save(d);
    // Регистрируем в Styles.ALL.
    if (typeof Styles !== "undefined") {
      Styles.ALL[name] = d[name];
      if (!Styles.NAMES.includes(name)) Styles.NAMES.push(name);
    }
    return d[name];
  }

  function removeStyle(name) {
    const d = load();
    delete d[name];
    save(d);
    if (typeof Styles !== "undefined") {
      delete Styles.ALL[name];
      const i = Styles.NAMES.indexOf(name);
      if (i >= 0) Styles.NAMES.splice(i, 1);
    }
  }

  function list() { return Object.keys(load()); }

  // Восстановить пользовательские стили в Styles.
  function restore() {
    const d = load();
    for (const name of Object.keys(d)) {
      if (typeof Styles !== "undefined") {
        Styles.ALL[name] = d[name];
        if (!Styles.NAMES.includes(name)) Styles.NAMES.push(name);
      }
    }
    return Object.keys(d).length;
  }

  return { addStyle, removeStyle, list, load, save, restore };
})();