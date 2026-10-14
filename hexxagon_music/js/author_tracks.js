// author_tracks.js (v6.9D) - каверы хитов (мелодия от Qwen/Alice).
// Ритм из базового стиля, мелодия (bass/lead/pad) - авторская от LLM.

const AuthorTracks = (() => {
  const RAW = {
    "amb_Airports": () => ({
      name:"amb_Airports", style:"ambient", bpm:55,
      about:"кавер: Brian Eno - Music for Airports",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "hat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bass": [36, null, 36, null, 38, null, 36, null, 36, null, 36, null, 40, null, 36, null], "pad": [48, 50, 52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 52, 50, 48, 46], "lead": [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60, 58], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("ambient").synth:null,
    }),
    "amb_Aquarium": () => ({
      name:"amb_Aquarium", style:"ambient", bpm:65,
      about:"кавер: Saint-Saens - Aquarium",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "hat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [50, 52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 52, 50, 48, 50, 52], "lead": [62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60, 62, 64], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("ambient").synth:null,
    }),
    "amb_Ascent": () => ({
      name:"amb_Ascent", style:"ambient", bpm:60,
      about:"кавер: Brian Eno - An Ending (Ascent)",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "hat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bass": [36, null, 36, null, 38, null, 36, null, 36, null, 36, null, 41, null, 36, null], "pad": [48, 50, 52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 52, 50, 48, 47], "lead": [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60, 59], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("ambient").synth:null,
    }),
    "amb_Blade": () => ({
      name:"amb_Blade", style:"ambient", bpm:58,
      about:"кавер: Vangelis - Blade Runner End",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "hat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bass": [36, null, 36, null, 38, null, 36, null, 36, null, 36, null, 41, null, 36, null], "pad": [48, 50, 52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 52, 50, 48, 45], "lead": [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60, 57], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("ambient").synth:null,
    }),
    "amb_Weightless": () => ({
      name:"amb_Weightless", style:"ambient", bpm:50,
      about:"кавер: Marconi Union - Weightless",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "hat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bass": [36, null, 36, null, 38, null, 36, null, 36, null, 36, null, 40, null, 36, null], "pad": [48, 50, 52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 52, 50, 48, 46], "lead": [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60, 58], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("ambient").synth:null,
    }),
    "blues_BadSign": () => ({
      name:"blues_BadSign", style:"blues", bpm:88,
      about:"кавер: Albert King - Born Under a Bad Sign",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0], "bass": [39, null, 39, null, 41, null, 39, null, 39, null, 39, null, 43, null, 39, null], "pad": [51, null, null, null, 53, null, null, null, 51, null, null, null, 56, null, null, null], "lead": [63, 65, 67, 65, 63, 60, 63, 65, 67, 69, 67, 65, 63, 60, 63, 65], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("blues").synth:null,
    }),
    "blues_Hoochie": () => ({
      name:"blues_Hoochie", style:"blues", bpm:90,
      about:"кавер: Muddy Waters - Hoochie Coochie Man",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0], "bass": [43, 43, null, 43, 43, 43, null, 43, 43, 43, null, 43, 43, 43, null, 43], "pad": [52, 52, null, 52, 54, 52, null, 52, 52, 52, null, 52, 56, 54, null, 52], "lead": [67, 67, null, 67, 69, 67, null, 67, 67, 67, null, 67, 71, 69, null, 67], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("blues").synth:null,
    }),
    "blues_Pride": () => ({
      name:"blues_Pride", style:"blues", bpm:120,
      about:"кавер: Stevie Ray Vaughan - Pride and Joy",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0], "bass": [43, null, 43, null, 45, null, 43, null, 47, null, 47, null, 43, null, 43, null], "pad": [52, null, null, null, 54, null, null, null, 56, null, null, null, 52, null, null, null], "lead": [67, 69, 71, 69, 67, 64, 67, 69, 71, 72, 71, 69, 67, 64, 67, 69], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("blues").synth:null,
    }),
    "blues_SweetHome": () => ({
      name:"blues_SweetHome", style:"blues", bpm:100,
      about:"кавер: Robert Johnson - Sweet Home Chicago",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0], "bass": [43, null, 43, null, 45, null, 43, null, 47, null, 47, null, 43, null, 43, null], "pad": [52, null, null, null, 54, null, null, null, 56, null, null, null, 52, null, null, null], "lead": [67, 69, 71, 69, 67, 64, 67, 69, 71, 72, 71, 69, 67, 64, 67, 69], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("blues").synth:null,
    }),
    "blues_Thrill": () => ({
      name:"blues_Thrill", style:"blues", bpm:76,
      about:"кавер: B.B. King - The Thrill Is Gone",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0], "bass": [39, null, 39, null, 41, null, 39, null, 39, null, 39, null, 43, null, 39, null], "pad": [51, null, null, null, 53, null, null, null, 51, null, null, null, 56, null, null, null], "lead": [63, 65, 67, 65, 63, 60, 63, 65, 67, 69, 67, 65, 63, 60, 63, 65], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("blues").synth:null,
    }),
    "chip_Mario": () => ({
      name:"chip_Mario", style:"chip", bpm:150,
      about:"кавер: Koji Kondo - Super Mario Bros",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], "lead": [67, 67, 71, 71, 69, 69, 67, 65, 67, 67, 71, 71, 69, 69, 67, 65], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("chip").synth:null,
    }),
    "chip_Mega": () => ({
      name:"chip_Mega", style:"chip", bpm:160,
      about:"кавер: Takashi Tateishi - Mega Man 2",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], "lead": [67, 67, 71, 71, 69, 69, 67, 65, 67, 67, 71, 71, 69, 69, 67, 62], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("chip").synth:null,
    }),
    "chip_Sonic": () => ({
      name:"chip_Sonic", style:"chip", bpm:145,
      about:"кавер: Masato Nakamura - Green Hill Zone",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], "lead": [67, 67, 71, 71, 69, 69, 67, 65, 67, 67, 71, 71, 69, 69, 67, 62], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("chip").synth:null,
    }),
    "chip_Tetris": () => ({
      name:"chip_Tetris", style:"chip", bpm:140,
      about:"кавер: Traditional - Tetris (Korobeiniki)",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], "lead": [67, 67, 71, 71, 69, 69, 67, 65, 67, 67, 71, 71, 69, 69, 67, 62], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("chip").synth:null,
    }),
    "chip_Zelda": () => ({
      name:"chip_Zelda", style:"chip", bpm:130,
      about:"кавер: Koji Kondo - Zelda Theme",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], "lead": [65, 67, 69, 67, 65, 62, 65, 67, 69, 71, 69, 67, 65, 62, 65, 67], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("chip").synth:null,
    }),
    "cl_Bumblebee": () => ({
      name:"cl_Bumblebee", style:"classical", bpm:180,
      about:"кавер: Rimsky-Korsakov - Flight of the Bumblebee",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "hat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], "lead": [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60, 58], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("classical").synth:null,
    }),
    "cl_Clair": () => ({
      name:"cl_Clair", style:"classical", bpm:70,
      about:"кавер: Debussy - Clair de Lune",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "hat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bass": [36, null, 36, null, 38, null, 36, null, 36, null, 36, null, 41, null, 36, null], "pad": [48, 50, 52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 52, 50, 48, 46], "lead": [60, 62, 64, 65, 67, 69, 67, 65, 64, 62, 60, 62, 64, 65, 67, 64], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("classical").synth:null,
    }),
    "cl_Elise": () => ({
      name:"cl_Elise", style:"classical", bpm:110,
      about:"кавер: Beethoven - Für Elise",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "hat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bass": [36, null, 36, null, 38, null, 36, null, 36, null, 36, null, 41, null, 36, null], "pad": [48, 50, 52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 52, 50, 48, 46], "lead": [67, 65, 64, 62, 60, 62, 64, 65, 67, 69, 71, 69, 67, 65, 64, 62], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("classical").synth:null,
    }),
    "cl_Moonlight": () => ({
      name:"cl_Moonlight", style:"classical", bpm:60,
      about:"кавер: Beethoven - Moonlight Sonata",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "hat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bass": [36, null, 36, null, 38, null, 36, null, 36, null, 36, null, 41, null, 36, null], "pad": [48, 46, 45, 43, 41, 43, 45, 46, 48, 50, 52, 50, 48, 46, 45, 43], "lead": [60, 58, 57, 55, 53, 55, 57, 58, 60, 62, 64, 62, 60, 58, 57, 55], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("classical").synth:null,
    }),
    "cl_Ode": () => ({
      name:"cl_Ode", style:"classical", bpm:120,
      about:"кавер: Beethoven - Ode to Joy",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "hat": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [48, 50, 52, 52, 50, 48, 46, 46, 48, 50, 48, 46, 48, 50, 52, 50], "lead": [60, 62, 64, 64, 62, 60, 58, 58, 60, 62, 60, 58, 60, 62, 64, 62], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("classical").synth:null,
    }),
    "dnb_Amen": () => ({
      name:"dnb_Amen", style:"dnb", bpm:174,
      about:"кавер: Winstons - Amen Brother",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], "hat": [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [48, 50, 48, 45, 48, 50, 48, 45, 48, 50, 48, 45, 52, 50, 52, 48], "lead": [62, 64, 62, 60, 62, 64, 62, 60, 62, 64, 62, 60, 67, 65, 67, 65], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("dnb").synth:null,
    }),
    "dnb_Brown": () => ({
      name:"dnb_Brown", style:"dnb", bpm:172,
      about:"кавер: Roni Size - Brown Paper Bag",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], "hat": [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1], "bass": [39, null, 39, null, 41, null, 39, null, 39, null, 39, null, 43, null, 39, null], "pad": [51, 53, 51, 48, 51, 53, 51, 48, 51, 53, 51, 48, 55, 53, 51, 48], "lead": [63, 65, 63, 62, 63, 65, 63, 62, 63, 67, 65, 63, 63, 65, 63, 62], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("dnb").synth:null,
    }),
    "dnb_Circles": () => ({
      name:"dnb_Circles", style:"dnb", bpm:168,
      about:"кавер: Adam F - Circles",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], "hat": [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1], "bass": [39, null, 39, null, 41, null, 39, null, 39, null, 39, null, 43, null, 39, null], "pad": [51, 53, 51, 48, 51, 53, 51, 48, 51, 53, 51, 48, 55, 53, 51, 48], "lead": [63, 65, 67, 65, 63, 62, 63, 65, 67, 69, 67, 65, 63, 62, 63, 65], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("dnb").synth:null,
    }),
    "dnb_Dead": () => ({
      name:"dnb_Dead", style:"dnb", bpm:180,
      about:"кавер: Noisia - Dead Limit",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], "hat": [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1], "bass": [36, 36, null, 36, 38, 38, null, 38, 36, 36, null, 36, 41, 41, null, 41], "pad": [48, 50, 48, 45, 48, 50, 48, 45, 48, 52, 50, 48, 48, 50, 48, 45], "lead": [60, 62, 60, 59, 60, 62, 60, 58, 60, 64, 62, 60, 60, 62, 60, 59], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("dnb").synth:null,
    }),
    "dnb_Inner": () => ({
      name:"dnb_Inner", style:"dnb", bpm:170,
      about:"кавер: Goldie - Inner City Life",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], "hat": [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1], "bass": [38, 38, null, 38, 40, 40, null, 40, 38, 38, null, 38, 43, 43, null, 43], "pad": [48, 50, 48, 45, 48, 50, 48, 45, 48, 50, 48, 45, 48, 50, 48, 45], "lead": [62, 64, 67, 64, 62, 60, 62, 64, 67, 71, 69, 67, 62, 60, 62, 64], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("dnb").synth:null,
    }),
    "jazz_Autumn": () => ({
      name:"jazz_Autumn", style:"jazz", bpm:110,
      about:"кавер: Jazz standard - Autumn Leaves",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], "bass": [43, null, 43, null, 45, null, 43, null, 47, null, 47, null, 43, null, 43, null], "pad": [52, null, null, null, 54, null, null, null, 56, null, null, null, 52, null, null, null], "lead": [67, 69, 71, 69, 67, 65, 67, 69, 71, 72, 71, 69, 67, 65, 67, 69], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("jazz").synth:null,
    }),
    "jazz_Fly": () => ({
      name:"jazz_Fly", style:"jazz", bpm:120,
      about:"кавер: Frank Sinatra - Fly Me to the Moon",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], "bass": [43, null, 43, null, 45, null, 43, null, 47, null, 47, null, 43, null, 43, null], "pad": [52, null, null, null, 54, null, null, null, 56, null, null, null, 52, null, null, null], "lead": [67, 69, 71, 69, 67, 64, 67, 69, 71, 72, 71, 69, 67, 64, 67, 69], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("jazz").synth:null,
    }),
    "jazz_SoWhat": () => ({
      name:"jazz_SoWhat", style:"jazz", bpm:120,
      about:"кавер: Miles Davis - So What",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], "bass": [38, 38, 38, 38, 40, 40, 40, 40, 38, 38, 38, 38, 43, 43, 43, 43], "pad": [52, 52, null, 52, 56, 56, null, 56, 52, 52, null, 52, 59, 59, null, 59], "lead": [67, 67, null, 67, 71, 71, null, 71, 67, 67, null, 67, 74, 74, null, 74], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("jazz").synth:null,
    }),
    "jazz_Summer": () => ({
      name:"jazz_Summer", style:"jazz", bpm:90,
      about:"кавер: Gershwin - Summertime",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], "bass": [39, null, 39, null, 41, null, 39, null, 39, null, 39, null, 43, null, 39, null], "pad": [51, null, null, null, 53, null, null, null, 51, null, null, null, 56, null, null, null], "lead": [63, 65, 67, 65, 63, 60, 63, 65, 67, 69, 67, 65, 63, 60, 63, 65], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("jazz").synth:null,
    }),
    "jazz_TakeFive": () => ({
      name:"jazz_TakeFive", style:"jazz", bpm:130,
      about:"кавер: Dave Brubeck - Take Five",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], "bass": [43, null, 43, null, 45, null, 43, null, 47, null, 47, null, 43, null, 43, null], "pad": [52, null, null, null, 54, null, null, null, 56, null, null, null, 52, null, null, null], "lead": [67, 69, 71, 69, 67, 64, 67, 69, 71, 72, 71, 69, 67, 64, 67, 69], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("jazz").synth:null,
    }),
    "lofi_Coffee": () => ({
      name:"lofi_Coffee", style:"lofi", bpm:82,
      about:"кавер: Beats - Coffee",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [50, 52, 50, 48, 50, 52, 50, 48, 50, 52, 50, 48, 53, 52, 50, 48], "lead": [62, 64, 65, 67, 69, 67, 65, 64, 62, 60, 62, 64, 65, 67, 69, 65], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("lofi").synth:null,
    }),
    "lofi_Feather": () => ({
      name:"lofi_Feather", style:"lofi", bpm:88,
      about:"кавер: Nujabes - Feather",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [50, 52, 50, 48, 50, 52, 50, 48, 50, 52, 50, 48, 53, 52, 50, 48], "lead": [60, 62, 64, 65, 67, 69, 67, 65, 64, 62, 60, 62, 64, 65, 67, 65], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("lofi").synth:null,
    }),
    "lofi_Luv": () => ({
      name:"lofi_Luv", style:"lofi", bpm:85,
      about:"кавер: Nujabes - Luv(sic)",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [38, null, 38, null, 40, null, 38, null, 38, null, 38, null, 43, null, 38, null], "pad": [50, 52, 50, 48, 50, 52, 50, 48, 50, 52, 50, 48, 53, 52, 50, 48], "lead": [62, 64, 65, 67, 69, 67, 65, 64, 62, 60, 62, 64, 65, 67, 69, 67], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("lofi").synth:null,
    }),
    "lofi_Rainy": () => ({
      name:"lofi_Rainy", style:"lofi", bpm:78,
      about:"кавер: Chillhop - Rainy Day",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [36, null, 36, null, 38, null, 36, null, 36, null, 36, null, 41, null, 36, null], "pad": [48, 50, 48, 45, 48, 50, 48, 45, 48, 50, 48, 45, 52, 50, 48, 45], "lead": [60, 62, 64, 65, 67, 69, 67, 65, 64, 62, 60, 62, 64, 65, 67, 64], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("lofi").synth:null,
    }),
    "lofi_Snowman": () => ({
      name:"lofi_Snowman", style:"lofi", bpm:80,
      about:"кавер: WYS - Snowman",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [36, null, 36, null, 38, null, 36, null, 36, null, 36, null, 41, null, 36, null], "pad": [48, 50, 48, 45, 48, 50, 48, 45, 48, 50, 48, 45, 52, 50, 48, 45], "lead": [60, 62, 64, 65, 67, 69, 67, 65, 64, 62, 60, 62, 64, 65, 67, 64], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("lofi").synth:null,
    }),
    "metal_IronMan": () => ({
      name:"metal_IronMan", style:"metal", bpm:80,
      about:"кавер: Black Sabbath - Iron Man",
      sections:[{name:"main", len:4, pat:{"kick": [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], "bass": [36, 36, null, 36, 38, 38, null, 38, 36, 36, null, 36, 41, 41, null, 41], "pad": [48, 48, null, 48, 50, 50, null, 50, 48, 48, null, 48, 53, 53, null, 53], "lead": [60, 60, null, 60, 62, 62, null, 62, 60, 60, null, 60, 65, 65, null, 65], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("metal").synth:null,
    }),
    "metal_Master": () => ({
      name:"metal_Master", style:"metal", bpm:180,
      about:"кавер: Metallica - Master of Puppets",
      sections:[{name:"main", len:4, pat:{"kick": [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], "bass": [38, 38, null, 38, 38, 38, null, 38, 40, 40, null, 40, 38, 38, null, 38], "pad": [48, 48, null, 48, 50, 50, null, 50, 48, 48, null, 48, 53, 53, null, 53], "lead": [62, 62, null, 62, 64, 64, null, 64, 62, 62, null, 62, 67, 67, null, 67], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("metal").synth:null,
    }),
    "metal_Paranoid": () => ({
      name:"metal_Paranoid", style:"metal", bpm:165,
      about:"кавер: Black Sabbath - Paranoid",
      sections:[{name:"main", len:4, pat:{"kick": [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], "bass": [38, 38, null, 38, 40, 40, null, 40, 38, 38, null, 38, 43, 43, null, 43], "pad": [48, 48, null, 48, 50, 50, null, 50, 48, 48, null, 48, 55, 55, null, 55], "lead": [62, 62, null, 62, 64, 64, null, 64, 62, 62, null, 62, 67, 67, null, 67], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("metal").synth:null,
    }),
    "metal_Sandman": () => ({
      name:"metal_Sandman", style:"metal", bpm:123,
      about:"кавер: Metallica - Enter Sandman",
      sections:[{name:"main", len:4, pat:{"kick": [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], "bass": [38, 38, null, 38, 40, 40, null, 40, 38, 38, null, 38, 43, 43, null, 43], "pad": [48, 48, null, 48, 50, 50, null, 50, 48, 48, null, 48, 53, 53, null, 53], "lead": [62, 61, 60, 62, 64, 62, 60, 59, 62, 61, 60, 62, 64, 67, 65, 62], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("metal").synth:null,
    }),
    "metal_Trooper": () => ({
      name:"metal_Trooper", style:"metal", bpm:160,
      about:"кавер: Iron Maiden - The Trooper",
      sections:[{name:"main", len:4, pat:{"kick": [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], "bass": [41, 41, null, 41, 43, 43, null, 43, 41, 41, null, 41, 46, 46, null, 46], "pad": [50, 50, null, 50, 52, 52, null, 52, 50, 50, null, 50, 57, 57, null, 57], "lead": [65, 65, null, 65, 67, 67, null, 67, 65, 65, null, 65, 70, 70, null, 70], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("metal").synth:null,
    }),
    "rock_Back": () => ({
      name:"rock_Back", style:"rock", bpm:94,
      about:"кавер: AC/DC - Back in Black",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [43, 43, null, null, 45, 45, null, null, 43, 43, null, null, 50, 50, null, null], "pad": [52, 52, null, null, 54, 54, null, null, 52, 52, null, null, 59, 59, null, null], "lead": [67, 67, null, null, 69, 69, null, null, 67, 67, null, null, 74, 74, null, null], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("rock").synth:null,
    }),
    "rock_Highway": () => ({
      name:"rock_Highway", style:"rock", bpm:116,
      about:"кавер: AC/DC - Highway to Hell",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [41, 41, null, null, 43, 43, null, null, 41, 41, null, null, 48, 48, null, null], "pad": [50, 50, null, null, 52, 52, null, null, 50, 50, null, null, 57, 57, null, null], "lead": [65, 65, null, null, 67, 67, null, null, 65, 65, null, null, 72, 72, null, null], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("rock").synth:null,
    }),
    "rock_Johnny": () => ({
      name:"rock_Johnny", style:"rock", bpm:168,
      about:"кавер: Chuck Berry - Johnny B. Goode",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [41, null, 41, null, 43, null, 45, null, 41, null, 41, null, 48, null, 50, null], "pad": [50, null, null, null, 52, null, null, null, 50, null, null, null, 57, null, null, null], "lead": [65, 67, 69, 67, 65, 62, 65, 67, 69, 71, 69, 67, 65, 62, 65, 67], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("rock").synth:null,
    }),
    "rock_Smoke": () => ({
      name:"rock_Smoke", style:"rock", bpm:112,
      about:"кавер: Deep Purple - Smoke on the Water",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [38, 38, null, null, 40, 40, null, null, 38, 38, null, null, 43, 43, null, null], "pad": [55, 55, null, null, 57, 57, null, null, 55, 55, null, null, 60, 60, null, null], "lead": [65, 65, null, null, 67, 67, null, null, 65, 65, null, null, 72, 72, null, null], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("rock").synth:null,
    }),
    "rock_Wild": () => ({
      name:"rock_Wild", style:"rock", bpm:140,
      about:"кавер: Steppenwolf - Born to Be Wild",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [43, null, 43, null, 45, null, 47, null, 43, null, 43, null, 50, null, 52, null], "pad": [52, null, null, null, 54, null, null, null, 52, null, null, null, 59, null, null, null], "lead": [67, null, 69, null, 71, null, 72, 71, 67, null, 69, null, 74, null, 76, 74], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("rock").synth:null,
    }),
    "rw_Blade": () => ({
      name:"rw_Blade", style:"retrowave", bpm:90,
      about:"кавер: Vangelis - Blade Runner Blues",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [39, null, 39, null, 41, null, 39, null, 39, null, 39, null, 43, null, 39, null], "pad": [51, 53, 51, 48, 51, 53, 51, 48, 51, 53, 51, 48, 51, 53, 51, 48], "lead": [63, 65, 67, 65, 63, 60, 63, 65, 67, 69, 67, 65, 63, 60, 63, 65], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("retrowave").synth:null,
    }),
    "rw_Nightcall": () => ({
      name:"rw_Nightcall", style:"retrowave", bpm:92,
      about:"кавер: Kavinsky - Nightcall",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [41, 41, null, 41, 43, 43, null, 43, 41, 41, null, 41, 46, 46, null, 46], "pad": [50, 52, 50, 48, 50, 52, 50, 48, 50, 52, 50, 48, 50, 52, 50, 48], "lead": [65, 67, 69, 67, 65, 62, 65, 67, 69, 71, 69, 67, 65, 62, 65, 67], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("retrowave").synth:null,
    }),
    "rw_Resonance": () => ({
      name:"rw_Resonance", style:"retrowave", bpm:100,
      about:"кавер: HOME - Resonance",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [39, null, 39, null, 41, null, 39, null, 39, null, 39, null, 43, null, 39, null], "pad": [51, 53, 51, 48, 51, 53, 51, 48, 51, 53, 51, 48, 51, 53, 51, 48], "lead": [63, 65, 67, 69, 67, 65, 63, 65, 67, 71, 69, 67, 63, 65, 67, 69], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("retrowave").synth:null,
    }),
    "rw_Sunset": () => ({
      name:"rw_Sunset", style:"retrowave", bpm:105,
      about:"кавер: The Midnight - Sunset",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [41, null, 41, null, 43, null, 41, null, 45, null, 45, null, 41, null, 41, null], "pad": [52, 54, 52, 50, 52, 54, 52, 50, 52, 54, 52, 50, 52, 54, 52, 50], "lead": [65, 67, 69, 67, 65, 62, 65, 67, 69, 71, 69, 67, 65, 62, 65, 67], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("retrowave").synth:null,
    }),
    "rw_Turbo": () => ({
      name:"rw_Turbo", style:"retrowave", bpm:140,
      about:"кавер: Carpenter Brut - Turbo Killer",
      sections:[{name:"main", len:4, pat:{"kick": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], "hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], "bass": [38, 38, null, 38, 40, 40, null, 40, 38, 38, null, 38, 43, 43, null, 43], "pad": [48, 50, 48, 45, 48, 50, 48, 45, 48, 50, 48, 45, 48, 50, 48, 45], "lead": [62, 64, 67, 64, 62, 60, 62, 64, 67, 71, 69, 67, 62, 60, 62, 64], "arp": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]}}],
      synth:(typeof Styles!=="undefined")?Styles.get("retrowave").synth:null,
    }),

    "theme_MusicStar": () => {
      const _ = null, SPB = 16;
      const rep = (bar,bars)=>{const o=new Array(bars*SPB).fill(_);for(let b=0;b<bars;b++)for(let s=0;s<SPB;s++)o[b*SPB+s]=bar[s]!=null?bar[s]:_;return o;};
      const repT = (bar,bars)=>{const o=new Array(bars*SPB).fill(0);for(let b=0;b<bars;b++)for(let s=0;s<SPB;s++)o[b*SPB+s]=bar[s]?1:0;return o;};
      const em = (b)=>new Array(b*SPB).fill(_);
      const et = (b)=>new Array(b*SPB).fill(0);
      const K4=[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0];
      const S24=[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
      const H16=[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0];
      const H8=[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0];
      const bass=[40,_,40,_,45,_,45,_,43,_,43,_,48,_,48,_];
      const lead=[76,_,79,_,83,_,79,_,76,_,72,_,74,_,76,_,81,_,79,_,76,_,74,_,72,_,74,_,76,_,76,_];
      const pad=[64,67,71,76,_,67,71,_,62,65,69,74,_,65,69,_,65,69,72,77,_,69,72,_,62,65,69,74,_,65,69,_];
      const arp=[76,79,83,88,79,83,88,91,83,88,91,95,88,91,95,100,77,81,84,89,81,84,89,93,84,89,93,96,89,93,96,101];
      const v={kick:repT(K4,4),snare:repT(S24,4),hat:repT(H16,4),bass:rep(bass,4),pad:rep(pad,4),lead:rep(lead,4),arp:rep(arp,4)};
      const chor={kick:repT(K4,8),snare:repT(S24,8),hat:repT(H16,8),bass:rep(bass,8),pad:rep(pad,8),lead:rep(lead,8),arp:rep(arp,8)};
      const intro={kick:repT(K4,2),snare:et(2),hat:repT(H8,2),bass:em(2),pad:rep(pad,2),lead:em(2),arp:rep(arp,2)};
      const o={name:"theme_MusicStar",style:"retrowave",bpm:100,title:true,about:"Тема Music Star - заглавный трек",
        sections:[{name:"intro",len:2,pat:intro},{name:"verseA",len:4,pat:v},{name:"chorus",len:8,pat:chor},{name:"verseA",len:4,pat:v},{name:"chorus",len:8,pat:chor},{name:"outro",len:2,pat:intro}],
        synth:(typeof Styles!=="undefined")?Styles.get("retrowave").synth:null};
      return o;
    },
    "theme_Menu": () => {
      const _ = null, SPB = 16;
      const rep = (bar,bars)=>{const o=new Array(bars*SPB).fill(_);for(let b=0;b<bars;b++)for(let s=0;s<SPB;s++)o[b*SPB+s]=bar[s]!=null?bar[s]:_;return o;};
      const repT = (bar,bars)=>{const o=new Array(bars*SPB).fill(0);for(let b=0;b<bars;b++)for(let s=0;s<SPB;s++)o[b*SPB+s]=bar[s]?1:0;return o;};
      const em = (b)=>new Array(b*SPB).fill(_);
      const K13=[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0];
      const S24=[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
      const H8=[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0];
      const bass=[41,_,_,_,48,_,_,_,45,_,_,_,43,_,_,_];
      const lead=[72,_,76,_,79,_,76,_,72,_,74,_,76,_,_,_];
      const pad=[65,69,72,77,_,_,_,_,_,_,_,_,_,_,_,_];
      const v={kick:repT(K13,4),snare:repT(S24,4),hat:repT(H8,4),bass:rep(bass,4),pad:rep(pad,4),lead:rep(lead,4),arp:em(4)};
      return {name:"theme_Menu",style:"lofi",bpm:90,menu:true,about:"Тема меню",
        sections:[{name:"main",len:4,pat:v}],
        synth:(typeof Styles!=="undefined")?Styles.get("lofi").synth:null};
    },
  };

  const CACHE = {};
  function get(id) {
    if (CACHE[id]) return CACHE[id];
    const b = RAW[id];
    if (!b) return null;
    CACHE[id] = b();
    return CACHE[id];
  }
  function list() {
    return Object.keys(RAW).filter(k => !k.startsWith("theme_"));
  }
  function listAll() { return Object.keys(RAW); }
  function forStyle(styleName) {
    return Object.keys(RAW).filter(k => {
      const t = get(k);
      return t && t.style === styleName;
    });
  }
  return { RAW, get, forStyle, list, listAll, CACHE };
})();
