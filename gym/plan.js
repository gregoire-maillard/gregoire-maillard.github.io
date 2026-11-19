/* ==========================================================================
   /gym — program data. Edit this file to change the plan.
   Plain JavaScript object (comments allowed). Reload the page after editing;
   if you added the page to your home screen, bump CACHE in sw.js too.

   Quick map
   - settings  : defaults (training days, equipment, increments)
   - weeks     : the 4-week block (effort target per week, deload rules)
   - timing    : numbers used for the time estimate per exercise
   - sessions  : Upper / Lower / Full body → blocks → slots
                 A slot's `rotation` lists one exercise per training block
                 (block 1 = weeks 1–4, block 2 = weeks 5–8, block 3 = 9–12,
                 then it loops).
   - exercises : library — name, load type, start guess, cues, alternatives,
                 animation (see moves.js)
   ========================================================================== */
window.GYM_PLAN = {
  version: 1,

  settings: {
    // 0 = Sun, 1 = Mon … 6 = Sat. Can also be changed in the app (Settings).
    days: { 1: 'upper', 3: 'lower', 5: 'full' },
    // Equipment available (kg). Weights are rounded to what you can load.
    dumbbells: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40],
    plates: [25, 20, 15, 10, 5, 2.5, 1.25],   // per side
    barbell: 20, ezbar: 10, trapbar: 25, smithBar: 0,  // Smith: enter what the machine says (bar usually counterweighted)
    stackStep: 5,                             // cable / machine pin steps
    // Double progression: hit the TOP of the rep range on every set → add this next time
    incUpper: 2.5,
    incLower: 5,
    // "Missed badly" = average reps below the bottom of the range → reduce by this fraction
    reduceBy: 0.05
  },

  // 4-week block. RPE = how hard the last rep feels (10 = failure). RIR = reps in reserve.
  weeks: [
    { name: 'Base',   rpe: 7, rir: 3, cue: 'RPE 7 — leave ~3 reps in the tank' },
    { name: 'Build',  rpe: 8, rir: 2, cue: 'RPE 8 — ~2 reps in the tank' },
    { name: 'Push',   rpe: 9, rir: 1, cue: 'RPE 9 — ~1 rep in the tank; last set of each exercise can go to RPE 10 on isolation moves' },
    { name: 'Deload', rpe: 6, rir: 4, deload: true, sets: 2, load: 0.9, cue: 'Deload — 2 sets, −10% weight, RPE 6. Recover, don\'t chase reps' }
  ],

  timing: {
    budget: 2400,      // 40 min total
    warmup: 300,       // 5 min
    cooldown: 300,     // 5 min
    rampUp: 120,       // ramp-up sets before the first (main) lift
    blockSetup: 60,    // walking to / setting up the next station
    setSetup: { barbell: 15, trapbar: 15, smith: 12, other: 8 },
    perSideSwitch: 5   // extra seconds per set for single-side moves
  },

  sessions: {
    upper: {
      name: 'Upper',
      warmup: [
        { name: 'Rower or bike, easy', sec: 120 },
        { name: 'Arm circles + band pull-aparts', sec: 60 },
        { name: 'Scap push-ups ×10 + cat-cow ×5', sec: 60 },
        { name: 'Push-ups ×8, slow', sec: 60 }
      ],
      cooldown: [
        { name: 'Doorway chest stretch', sec: 60, note: '30 s per side' },
        { name: 'Lat stretch on a rack', sec: 60, note: '30 s per side' },
        { name: 'Cross-body shoulder stretch', sec: 60, note: '30 s per side' },
        { name: 'Child\'s pose', sec: 60 },
        { name: 'Slow breathing, 4 s in / 6 s out', sec: 60 }
      ],
      blocks: [
        { id: 'U1', main: true, items: [
          { slot: 'u_press', rotation: ['bb_bench', 'incline_bb', 'db_bench'], sets: 3, reps: [6, 8], rest: 120, tempo: '2-0-1' }
        ]},
        { id: 'U2', items: [
          { slot: 'u_row', rotation: ['cable_row', 'cs_db_row', 'machine_row'], sets: 3, reps: [8, 12], rest: 45, tempo: '2-0-1' },
          { slot: 'u_ohp', rotation: ['db_ohp', 'machine_ohp', 'arnold'], sets: 3, reps: [8, 12], rest: 45, tempo: '2-0-1' }
        ]},
        { id: 'U3', items: [
          { slot: 'u_vpull', rotation: ['pulldown', 'pullup', 'ng_pulldown'], sets: 3, reps: [8, 12], rest: 30, tempo: '2-0-1' },
          { slot: 'u_lat', rotation: ['db_lat', 'cable_lat', 'seated_lat'], sets: 3, reps: [12, 15], rest: 30, tempo: '2-0-1' }
        ]},
        { id: 'U4', setup: 45, items: [
          { slot: 'u_bi', rotation: ['cable_curl', 'hammer', 'ez_curl'], sets: 2, reps: [10, 12], rest: 15, tempo: '2-0-1' },
          { slot: 'u_tri', rotation: ['rope_pushdown', 'oh_cable_ext', 'ez_skull'], sets: 2, reps: [10, 12], rest: 20, tempo: '2-0-1' }
        ]}
      ]
    },

    lower: {
      name: 'Lower',
      warmup: [
        { name: 'Bike, easy', sec: 120 },
        { name: 'Leg swings, front + side', sec: 60, note: '10 each way per leg' },
        { name: 'Bodyweight squats ×10 + glute bridges ×10', sec: 60 },
        { name: 'World\'s greatest stretch', sec: 60, note: '3 per side' }
      ],
      cooldown: [
        { name: 'Hip flexor (couch) stretch', sec: 90, note: '45 s per side' },
        { name: 'Hamstring stretch', sec: 60, note: '30 s per side' },
        { name: 'Figure-4 glute stretch', sec: 60, note: '30 s per side' },
        { name: 'Calf stretch on a step', sec: 60, note: '30 s per side' },
        { name: 'Slow breathing', sec: 30 }
      ],
      blocks: [
        { id: 'L1', main: true, items: [
          { slot: 'l_squat', rotation: ['back_squat', 'front_squat', 'smith_squat'], sets: 3, reps: [6, 8], rest: 150, tempo: '2-0-1' }
        ]},
        { id: 'L2', items: [
          { slot: 'l_hinge', rotation: ['bb_rdl', 'db_rdl', 'back_ext'], sets: 3, reps: [8, 10], rest: 45, tempo: '2-0-1' },
          { slot: 'l_core', rotation: ['cable_crunch', 'knee_raise'], sets: 3, reps: [10, 15], rest: 45, tempo: '2-0-1' }
        ]},
        { id: 'L3', items: [
          { slot: 'l_knee', rotation: ['leg_press', 'reverse_lunge', 'leg_press_narrow'], sets: 3, reps: [10, 12], rest: 45, tempo: '2-0-1' },
          { slot: 'l_curl', rotation: ['leg_curl_seated', 'lying_leg_curl'], sets: 3, reps: [10, 12], rest: 60, tempo: '2-0-1' }
        ]}
      ]
    },

    full: {
      name: 'Full body',
      warmup: [
        { name: 'Rower, easy', sec: 120 },
        { name: 'World\'s greatest stretch', sec: 60, note: '3 per side' },
        { name: 'Inchworms ×5', sec: 60 },
        { name: 'Bodyweight squat to overhead reach ×10', sec: 60 }
      ],
      cooldown: [
        { name: 'Figure-4 glute stretch', sec: 60, note: '30 s per side' },
        { name: 'Hip flexor stretch', sec: 60, note: '30 s per side' },
        { name: 'Doorway chest stretch', sec: 60, note: '30 s per side' },
        { name: 'Child\'s pose', sec: 60 },
        { name: 'Slow breathing', sec: 60 }
      ],
      blocks: [
        { id: 'F1', main: true, items: [
          { slot: 'f_hinge', rotation: ['trap_dl', 'conv_dl', 'hip_thrust'], sets: 3, reps: [6, 8], rest: 150, tempo: '1-0-1' }
        ]},
        { id: 'F2', items: [
          { slot: 'f_press', rotation: ['incline_db', 'dips', 'incline_smith'], sets: 3, reps: [8, 12], rest: 45, tempo: '2-0-1' },
          { slot: 'f_row', rotation: ['cs_db_row', 'wide_row', 'inv_row'], sets: 3, reps: [8, 12], rest: 60, tempo: '2-0-1' }
        ]},
        { id: 'F3', items: [
          { slot: 'f_single', rotation: ['bss', 'step_up', 'reverse_lunge'], sets: 3, reps: [8, 10], rest: 30, tempo: '2-0-1' },
          { slot: 'f_rear', rotation: ['face_pull', 'rev_pec_deck', 'rear_delt_db'], sets: 3, reps: [12, 15], rest: 60, tempo: '2-0-1' }
        ]}
      ]
    }
  },

  /* Exercise library
     load:  barbell | ezbar | trapbar | smith | dumbbell (per hand) | db1 (one dumbbell)
            | stack (cable/machine) | sled (leg press: plates only) | bw (bodyweight + added kg; negative = assisted)
     region: upper | lower (which increment to use)
     start: conservative first guess (kg) when you have no history — the app recalibrates after your first logged set
     fam/k: strength family + ratio, used to estimate a new variation from one you have already logged
     anim:  movement pattern in moves.js; prop overrides the default prop
     side:  true = reps are per side (time doubles) */
  exercises: {
    // ---- horizontal press
    bb_bench:      { name: 'Barbell bench press', load: 'barbell', region: 'upper', start: 50, fam: 'hpress', k: 1, anim: 'bench', prop: 'barbell',
                     cues: ['Shoulder blades pinched, feet planted', 'Bar to lower chest, elbows ~45°', 'Press up and slightly back over the shoulders'],
                     alts: ['db_bench', 'smith_bench', 'machine_chest'] },
    incline_bb:    { name: 'Incline barbell bench press', load: 'barbell', region: 'upper', start: 40, fam: 'hpress', k: 0.82, anim: 'incline', prop: 'barbell',
                     cues: ['Bench at ~30°', 'Bar to upper chest', 'Wrists stacked over elbows'],
                     alts: ['incline_db', 'incline_smith', 'machine_chest'] },
    db_bench:      { name: 'Dumbbell bench press', load: 'dumbbell', region: 'upper', start: 18, fam: 'hpress', k: 0.38, anim: 'bench', prop: 'dumbbell',
                     cues: ['Kick the dumbbells up off your knees', 'Lower to chest level, elbows ~45°', 'Press up without clanking at the top'],
                     alts: ['bb_bench', 'machine_chest', 'pushup'] },
    smith_bench:   { name: 'Smith machine bench press', load: 'smith', region: 'upper', start: 40, fam: 'hpress', k: 0.95, anim: 'bench', prop: 'barbell',
                     cues: ['Bench placed so the bar meets lower chest', 'Shoulder blades pinched', 'Control down, press up'],
                     alts: ['bb_bench', 'db_bench', 'machine_chest'] },
    machine_chest: { name: 'Machine chest press', load: 'stack', region: 'upper', start: 40, fam: 'hpress', k: 0.9, anim: 'chestpress', prop: 'machine',
                     cues: ['Handles at mid-chest height', 'Shoulder blades back against the pad', 'Press out, don\'t lock elbows hard'],
                     alts: ['db_bench', 'smith_bench', 'pushup'] },
    pushup:        { name: 'Push-up (add a plate when easy)', load: 'bw', region: 'upper', start: 0, anim: 'pushup',
                     cues: ['Body in one straight line', 'Chest to a fist above the floor', 'Elbows ~45°, not flared'],
                     alts: ['db_bench', 'machine_chest', 'dips'] },
    incline_db:    { name: 'Incline dumbbell press', load: 'dumbbell', region: 'upper', start: 16, fam: 'hpress', k: 0.33, anim: 'incline', prop: 'dumbbell',
                     cues: ['Bench at ~30°', 'Dumbbells to upper-chest level', 'Press up and slightly in'],
                     alts: ['incline_bb', 'incline_smith', 'machine_chest'] },
    incline_smith: { name: 'Incline Smith press', load: 'smith', region: 'upper', start: 35, fam: 'hpress', k: 0.78, anim: 'incline', prop: 'barbell',
                     cues: ['Bench at ~30°, bar meets upper chest', 'Shoulder blades pinched', 'Control down, press up'],
                     alts: ['incline_db', 'incline_bb', 'machine_chest'] },
    dips:          { name: 'Dips (assisted if needed)', load: 'bw', region: 'upper', start: 0, anim: 'dip',
                     cues: ['Slight forward lean', 'Down until upper arms are parallel to the floor', 'Assisted machine: enter assistance as negative kg'],
                     alts: ['incline_db', 'pushup', 'machine_chest'] },

    // ---- horizontal pull
    cable_row:     { name: 'Seated cable row', load: 'stack', region: 'upper', start: 45, fam: 'hpull', k: 1, anim: 'row_cable', prop: 'handle',
                     cues: ['Sit tall, chest up', 'Pull the handle to your belly button', 'Squeeze shoulder blades, 2 s return'],
                     alts: ['machine_row', 'cs_db_row', 'bb_row'] },
    bb_row:        { name: 'Barbell bent-over row', load: 'barbell', region: 'upper', start: 45, fam: 'hpull', k: 0.95, anim: 'row_bent', prop: 'barbell',
                     cues: ['Hinge to ~45°, flat back', 'Pull the bar to your lower ribs', 'No torso swing'],
                     alts: ['cs_db_row', 'cable_row', 'machine_row'] },
    machine_row:   { name: 'Machine row', load: 'stack', region: 'upper', start: 45, fam: 'hpull', k: 1, anim: 'row_cable', prop: 'machine',
                     cues: ['Chest on the pad', 'Drive elbows back', 'Pause 1 s, slow return'],
                     alts: ['cable_row', 'cs_db_row', 'bb_row'] },
    cs_db_row:     { name: 'Chest-supported dumbbell row', load: 'dumbbell', region: 'upper', start: 16, fam: 'hpull', k: 0.4, anim: 'row_cs', prop: 'dumbbell',
                     cues: ['Chest on a 30–45° bench', 'Drive elbows back toward your hips', 'Pause 1 s at the top'],
                     alts: ['cable_row', 'machine_row', 'wide_row'] },
    wide_row:      { name: 'Wide-grip cable row', load: 'stack', region: 'upper', start: 40, fam: 'hpull', k: 0.9, anim: 'row_cable', prop: 'handle',
                     cues: ['Elbows out ~60°', 'Pull to lower chest', 'Squeeze the upper back'],
                     alts: ['cable_row', 'cs_db_row', 'machine_row'] },
    inv_row:       { name: 'Inverted row (Smith bar)', load: 'bw', region: 'upper', start: 0, anim: 'invrow',
                     cues: ['Body straight, heels down', 'Pull chest to the bar', 'Lower the bar notch to make it harder'],
                     alts: ['cs_db_row', 'cable_row', 'wide_row'] },

    // ---- vertical press
    db_ohp:        { name: 'Seated dumbbell shoulder press', load: 'dumbbell', region: 'upper', start: 14, fam: 'vpress', k: 0.4, anim: 'ohp_seated', prop: 'dumbbell',
                     cues: ['Bench upright, back on the pad', 'Lower to ear level', 'Press up and slightly in'],
                     alts: ['machine_ohp', 'bb_ohp', 'arnold'] },
    bb_ohp:        { name: 'Standing barbell overhead press', load: 'barbell', region: 'upper', start: 30, fam: 'vpress', k: 1, anim: 'ohp_standing', prop: 'barbell',
                     cues: ['Squeeze glutes, ribs down', 'Move your head back, then through', 'Finish with the bar over mid-foot'],
                     alts: ['db_ohp', 'machine_ohp', 'arnold'] },
    machine_ohp:   { name: 'Machine shoulder press', load: 'stack', region: 'upper', start: 30, fam: 'vpress', k: 1, anim: 'ohp_seated', prop: 'machine',
                     cues: ['Handles at shoulder height', 'Back flat on the pad', 'Press up, no hard lockout'],
                     alts: ['db_ohp', 'bb_ohp', 'arnold'] },
    arnold:        { name: 'Arnold press', load: 'dumbbell', region: 'upper', start: 12, fam: 'vpress', k: 0.35, anim: 'ohp_seated', prop: 'dumbbell',
                     cues: ['Start palms facing you at chin height', 'Rotate palms forward as you press', 'Reverse the rotation on the way down'],
                     alts: ['db_ohp', 'machine_ohp', 'bb_ohp'] },

    // ---- vertical pull
    pulldown:      { name: 'Lat pulldown (wide grip)', load: 'stack', region: 'upper', start: 45, fam: 'vpull', k: 1, anim: 'pulldown', prop: 'bar',
                     cues: ['Thighs locked under the pad', 'Pull the bar to your upper chest', 'Lean back slightly, elbows down to your ribs'],
                     alts: ['ng_pulldown', 'pullup', 'straight_pd'] },
    ng_pulldown:   { name: 'Close neutral-grip pulldown', load: 'stack', region: 'upper', start: 45, fam: 'vpull', k: 1.05, anim: 'pulldown', prop: 'handle',
                     cues: ['Palms facing each other', 'Pull to the top of your chest', 'Full stretch at the top'],
                     alts: ['pulldown', 'pullup', 'straight_pd'] },
    pullup:        { name: 'Pull-up (assisted if needed)', load: 'bw', region: 'upper', start: 0, anim: 'pullup',
                     cues: ['Start from a dead hang', 'Chest toward the bar, elbows to your ribs', 'Assisted machine: enter assistance as negative kg'],
                     alts: ['pulldown', 'ng_pulldown', 'inv_row'] },
    straight_pd:   { name: 'Straight-arm cable pulldown', load: 'stack', region: 'upper', start: 20, fam: 'lats', k: 1, anim: 'straight_pd', prop: 'bar',
                     cues: ['Hinge slightly, arms almost straight', 'Sweep the bar down to your thighs', 'Feel it in the lats, not the triceps'],
                     alts: ['pulldown', 'ng_pulldown'] },

    // ---- lateral delts
    db_lat:        { name: 'Dumbbell lateral raise', load: 'dumbbell', region: 'upper', start: 6, fam: 'lat', k: 1, anim: 'latraise', prop: 'dumbbell',
                     cues: ['Slight bend in the elbows', 'Lead with the elbows to shoulder height', '2 s down, no swinging'],
                     alts: ['cable_lat', 'seated_lat'] },
    cable_lat:     { name: 'Cable lateral raise (dual pulleys)', load: 'stack', step: 2.5, region: 'upper', start: 5, fam: 'lat', k: 0.8, anim: 'latraise', prop: 'cable_low',
                     cues: ['Low pulleys, cables crossed in front', 'Raise to shoulder height', 'Slow and controlled'],
                     alts: ['db_lat', 'seated_lat'] },
    seated_lat:    { name: 'Seated dumbbell lateral raise', load: 'dumbbell', region: 'upper', start: 6, fam: 'lat', k: 0.9, anim: 'latraise', prop: 'dumbbell',
                     cues: ['Sit on the end of a bench, tall', 'Raise to shoulder height', 'No momentum'],
                     alts: ['db_lat', 'cable_lat'] },

    // ---- arms
    cable_curl:    { name: 'Cable curl (straight bar)', load: 'stack', step: 2.5, region: 'upper', start: 20, fam: 'curl', k: 1, anim: 'curl', prop: 'cable_low',
                     cues: ['Elbows pinned to your sides', 'Curl up, squeeze 1 s', 'Lower in 2 s'],
                     alts: ['ez_curl', 'hammer'] },
    hammer:        { name: 'Dumbbell hammer curl', load: 'dumbbell', region: 'upper', start: 10, fam: 'curl', k: 0.45, anim: 'curl', prop: 'dumbbell',
                     cues: ['Palms face each other', 'Elbows stay still', 'Lower all the way'],
                     alts: ['cable_curl', 'ez_curl'] },
    ez_curl:       { name: 'EZ-bar curl', load: 'ezbar', region: 'upper', start: 20, fam: 'curl', k: 0.9, anim: 'curl', prop: 'barbell',
                     cues: ['Grip the angled part of the bar', 'Elbows pinned, no hip swing', 'Lower in 2 s'],
                     alts: ['cable_curl', 'hammer'] },
    rope_pushdown: { name: 'Cable rope pushdown', load: 'stack', step: 2.5, region: 'upper', start: 20, fam: 'tri', k: 1, anim: 'pushdown', prop: 'cable_high',
                     cues: ['Elbows tucked, shoulders down', 'Spread the rope at the bottom', 'Control back up to 90°'],
                     alts: ['oh_cable_ext', 'ez_skull', 'dips'] },
    oh_cable_ext:  { name: 'Overhead cable triceps extension', load: 'stack', step: 2.5, region: 'upper', start: 15, fam: 'tri', k: 0.8, anim: 'ohext', prop: 'cable_low',
                     cues: ['Face away from the cable, staggered stance', 'Elbows point forward, stay still', 'Full stretch behind the head'],
                     alts: ['rope_pushdown', 'ez_skull', 'db_oh_ext'] },
    ez_skull:      { name: 'EZ-bar skull crusher', load: 'ezbar', region: 'upper', start: 20, fam: 'tri', k: 0.9, anim: 'skull', prop: 'barbell',
                     cues: ['Upper arms angled slightly back', 'Lower the bar behind your forehead', 'Only the elbows move'],
                     alts: ['rope_pushdown', 'oh_cable_ext', 'db_oh_ext'] },
    db_oh_ext:     { name: 'Dumbbell overhead extension (one DB)', load: 'db1', region: 'upper', start: 16, fam: 'tri', k: 0.8, anim: 'ohext', prop: 'dumbbell',
                     cues: ['Both hands under the top plate', 'Elbows point up and stay narrow', 'Full stretch behind the head'],
                     alts: ['rope_pushdown', 'oh_cable_ext', 'ez_skull'] },

    // ---- squat
    back_squat:    { name: 'Barbell back squat', load: 'barbell', region: 'lower', start: 60, fam: 'squat', k: 1, anim: 'squat', prop: 'barbell_back',
                     cues: ['Brace, bar on the upper back', 'Sit between your heels, knees track over toes', 'Hips and chest rise together'],
                     alts: ['smith_squat', 'goblet_squat', 'leg_press'] },
    front_squat:   { name: 'Barbell front squat', load: 'barbell', region: 'lower', start: 45, fam: 'squat', k: 0.8, anim: 'squat', prop: 'barbell_front',
                     cues: ['Elbows high, bar on the front delts', 'Stay tall, sit straight down', 'Drive up through mid-foot'],
                     alts: ['back_squat', 'goblet_squat', 'smith_squat'] },
    smith_squat:   { name: 'Smith machine squat', load: 'smith', region: 'lower', start: 50, fam: 'squat', k: 0.9, anim: 'squat', prop: 'barbell_back',
                     cues: ['Feet slightly in front of the bar', 'Sit down and back', 'Brace and drive up'],
                     alts: ['back_squat', 'leg_press', 'goblet_squat'] },
    goblet_squat:  { name: 'Goblet squat', load: 'db1', region: 'lower', start: 20, fam: 'squat', k: 0.35, anim: 'squat', prop: 'goblet',
                     cues: ['Hold the dumbbell at your chest', 'Elbows inside the knees at the bottom', 'Stay tall'],
                     alts: ['back_squat', 'leg_press', 'smith_squat'] },
    leg_press:     { name: 'Leg press', load: 'sled', region: 'lower', start: 100, fam: 'legpress', k: 1, anim: 'legpress',
                     cues: ['Feet mid-platform, shoulder width', 'Lower until hips start to curl off the pad', 'Don\'t lock the knees'],
                     alts: ['leg_press_narrow', 'goblet_squat', 'smith_squat'] },
    leg_press_narrow: { name: 'Leg press (feet low & narrow)', load: 'sled', region: 'lower', start: 80, fam: 'legpress', k: 0.85, anim: 'legpress',
                     cues: ['Feet low and hip-width — more quads', 'Heels stay down', 'Control the bottom'],
                     alts: ['leg_press', 'goblet_squat', 'leg_ext'] },
    leg_ext:       { name: 'Leg extension', load: 'stack', region: 'lower', start: 35, fam: 'legext', k: 1, anim: 'legext',
                     cues: ['Knee lined up with the machine pivot', 'Squeeze 1 s at the top', 'Lower in 2 s'],
                     alts: ['leg_press', 'goblet_squat'] },

    // ---- single leg
    reverse_lunge: { name: 'Dumbbell reverse lunge', load: 'dumbbell', region: 'lower', side: true, start: 12, fam: 'lunge', k: 1, anim: 'lunge', prop: 'dumbbell',
                     cues: ['Step back, drop the back knee toward the floor', 'Front shin stays fairly vertical', 'Drive through the front heel'],
                     alts: ['bss', 'step_up', 'goblet_squat'] },
    bss:           { name: 'Bulgarian split squat', load: 'dumbbell', region: 'lower', side: true, start: 10, fam: 'lunge', k: 0.85, anim: 'splitsquat', prop: 'dumbbell',
                     cues: ['Rear foot laces-down on a bench', 'Sink straight down, slight forward lean', 'Front heel stays planted'],
                     alts: ['reverse_lunge', 'step_up', 'leg_press'] },
    step_up:       { name: 'Dumbbell step-up', load: 'dumbbell', region: 'lower', side: true, start: 10, fam: 'lunge', k: 0.8, anim: 'stepup', prop: 'dumbbell',
                     cues: ['Box at about knee height', 'Push through the top foot only', 'Lower slowly'],
                     alts: ['bss', 'reverse_lunge', 'leg_press'] },

    // ---- hinge
    trap_dl:       { name: 'Trap-bar deadlift', load: 'trapbar', region: 'lower', start: 80, fam: 'hinge', k: 1, anim: 'deadlift', prop: 'trapbar',
                     cues: ['Stand centred, hips between knees and shoulders', 'Push the floor away, chest up', 'Finish by squeezing glutes'],
                     alts: ['conv_dl', 'bb_rdl', 'hip_thrust'] },
    conv_dl:       { name: 'Conventional deadlift', load: 'barbell', region: 'lower', start: 80, fam: 'hinge', k: 0.95, anim: 'deadlift', prop: 'barbell',
                     cues: ['Bar over mid-foot, shins touch the bar', 'Pull the slack out, flat back', 'Bar stays close all the way up'],
                     alts: ['trap_dl', 'bb_rdl', 'hip_thrust'] },
    bb_rdl:        { name: 'Barbell Romanian deadlift', load: 'barbell', region: 'lower', start: 60, fam: 'hinge', k: 0.75, anim: 'rdl', prop: 'barbell',
                     cues: ['Soft knees, push hips back', 'Bar slides down the thighs, flat back', 'Stop at mid-shin; stand by squeezing glutes'],
                     alts: ['db_rdl', 'back_ext', 'hip_thrust'] },
    db_rdl:        { name: 'Dumbbell Romanian deadlift', load: 'dumbbell', region: 'lower', start: 20, fam: 'hinge', k: 0.3, anim: 'rdl', prop: 'dumbbell',
                     cues: ['Dumbbells close to the legs', 'Hips back until you feel the hamstrings', 'Flat back the whole time'],
                     alts: ['bb_rdl', 'back_ext', 'hip_thrust'] },
    back_ext:      { name: '45° back extension (hold a plate)', load: 'bw', region: 'lower', start: 0, anim: 'backext', prop: 'plate_small',
                     cues: ['Pad just below the hips', 'Round down slowly, rise to a straight line', 'Squeeze glutes at the top; hold a plate to add load'],
                     alts: ['bb_rdl', 'db_rdl', 'hip_thrust'] },
    hip_thrust:    { name: 'Barbell hip thrust', load: 'barbell', region: 'lower', start: 60, fam: 'glute', k: 1, anim: 'hipthrust', prop: 'barbell',
                     cues: ['Upper back on the bench edge, bar padded on the hips', 'Chin tucked, drive hips up', 'Pause 1 s with glutes squeezed'],
                     alts: ['trap_dl', 'back_ext', 'db_rdl'] },

    // ---- hamstrings
    leg_curl_seated: { name: 'Seated leg curl', load: 'stack', region: 'lower', start: 35, fam: 'legcurl', k: 1, anim: 'legcurl_seated',
                     cues: ['Knee lined up with the pivot, thigh pad tight', 'Curl all the way under', 'Lower in 2 s'],
                     alts: ['lying_leg_curl', 'db_rdl'] },
    lying_leg_curl: { name: 'Lying leg curl', load: 'stack', region: 'lower', start: 30, fam: 'legcurl', k: 0.85, anim: 'legcurl_lying',
                     cues: ['Hips pressed into the pad', 'Curl heels toward glutes', 'Lower in 2 s'],
                     alts: ['leg_curl_seated', 'db_rdl'] },

    // ---- core
    cable_crunch:  { name: 'Kneeling cable crunch', load: 'stack', region: 'upper', start: 30, fam: 'core', k: 1, anim: 'crunch', prop: 'cable_high',
                     cues: ['Rope beside your head, hips stay still', 'Curl ribs toward hips', 'Exhale hard at the bottom'],
                     alts: ['knee_raise', 'pallof'] },
    knee_raise:    { name: 'Hanging knee raise', load: 'bw', region: 'upper', start: 0, anim: 'kneeraise',
                     cues: ['Dead hang, shoulders active', 'Curl knees up and tilt the pelvis', 'No swinging'],
                     alts: ['cable_crunch', 'pallof'] },
    pallof:        { name: 'Pallof press', load: 'stack', step: 2.5, region: 'upper', side: true, start: 10, fam: 'pallof', k: 1, anim: 'pallof', prop: 'handle',
                     cues: ['Stand side-on to the cable', 'Press the handle straight out, resist the twist', 'Hold 2 s, return to chest'],
                     alts: ['cable_crunch', 'knee_raise'] },

    // ---- rear delts / upper back
    face_pull:     { name: 'Cable face pull', load: 'stack', step: 2.5, region: 'upper', start: 15, fam: 'rear', k: 1, anim: 'facepull', prop: 'cable_high',
                     cues: ['Rope at forehead height', 'Pull to your eyes, elbows high', 'Rotate hands back at the end'],
                     alts: ['rev_pec_deck', 'rear_delt_db'] },
    rev_pec_deck:  { name: 'Reverse pec deck', load: 'stack', region: 'upper', start: 25, fam: 'rear', k: 1.4, anim: 'revfly', prop: 'machine',
                     cues: ['Chest on the pad, handles at shoulder height', 'Sweep arms back in an arc', 'Pause, then 2 s return'],
                     alts: ['face_pull', 'rear_delt_db'] },
    rear_delt_db:  { name: 'Bent-over rear-delt raise', load: 'dumbbell', region: 'upper', start: 6, fam: 'rear', k: 0.4, anim: 'revfly', prop: 'dumbbell',
                     cues: ['Hinge until your chest is near parallel', 'Raise arms out to the sides', 'Light weight, strict form'],
                     alts: ['face_pull', 'rev_pec_deck'] }
  }
};
