// settings.js - глобальные настройки игры в localStorage.

const Settings = (() => {
  const KEY = "hexxagon_settings_v1";
  const DEFAULTS = {
    theme: "neon",
    lang: "ru",
    aiLevel: "medium",
    preset: "cross-4",
    playerStyles: ["retrowave", "rock", "metal", "blues"],
    masterGain: 0.7,
    showTutorial: true,
    soundOn: false,
  };

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return { ...DEFAULTS, ...s };
    } catch (e) { return { ...DEFAULTS }; }
  }
  function save(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      return true;
    } catch (e) { return false; }
  }
  function set(key, value) {
    const s = load();
    s[key] = value;
    save(s);
  }
  function get(key) { return load()[key]; }
  function reset() { localStorage.removeItem(KEY); }

  return { DEFAULTS, load, save, set, get, reset };
})();