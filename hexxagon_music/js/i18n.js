// i18n.js - простой i18n. RU/EN.

const I18n = (() => {
  const T = {
    ru: {
      "btn.audio":    "▶ Включить звук",
      "btn.audio.on": "♪ звук идёт",
      "btn.undo":     "↶ Отмена",
      "btn.new":      "Новая партия",
      "hud.turn":     "ХОД",
      "hud.score":    "ФИШКИ",
      "hud.orchestra":"ОРКЕСТР",
      "hud.style":    "СТИЛЬ",
      "hud.move":     "ХОД",
      "hud.time":     "ВРЕМЯ",
      "turn.you":     "Ты",
      "turn.ai":      "ИИ",
      "win.win":      "ПОБЕДА",
      "win.lose":     "ПОРАЖЕНИЕ",
      "mode.vs-ai":   "против ИИ",
      "mode.hotseat": "hot seat",
      "ai.easy":      "ИИ: слабый",
      "ai.medium":    "ИИ: средний",
      "ai.hard":      "ИИ: сильный",
      "theme.neon":   "неон",
      "theme.phosphor":"фосфор",
      "theme.classic":"классика",
      "theme.mono":   "моно",
    },
    en: {
      "btn.audio":    "▶ Sound on",
      "btn.audio.on": "♪ sound on",
      "btn.undo":     "↶ Undo",
      "btn.new":      "New game",
      "hud.turn":     "TURN",
      "hud.score":    "PIECES",
      "hud.orchestra":"ORCHESTRA",
      "hud.style":    "STYLE",
      "hud.move":     "MOVES",
      "hud.time":     "TIME",
      "turn.you":     "You",
      "turn.ai":      "AI",
      "win.win":      "WIN",
      "win.lose":     "LOSS",
      "mode.vs-ai":   "vs AI",
      "mode.hotseat": "hot seat",
      "ai.easy":      "AI: weak",
      "ai.medium":    "AI: medium",
      "ai.hard":      "AI: strong",
      "theme.neon":   "neon",
      "theme.phosphor":"phosphor",
      "theme.classic":"classic",
      "theme.mono":   "mono",
    },
  };

  let lang = localStorage.getItem("hexxagon_lang") || "ru";
  function t(k) { return (T[lang] && T[lang][k]) || k; }
  function set(l) {
    if (T[l]) { lang = l; localStorage.setItem("hexxagon_lang", l); }
  }
  function get() { return lang; }

  return { t, set, get, langs: Object.keys(T) };
})();