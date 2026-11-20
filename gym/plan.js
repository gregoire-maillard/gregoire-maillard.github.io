/* ==========================================================================
   /gym — the program. Edit this file to change the plan.
   Plain JavaScript (comments allowed). Reload the page after editing.

   Quick map
   - levels    : what Heavy / Medium / Light / Bodyweight mean
   - schemes   : reps + level for each set, per week of the 4-week block
                 (compound lifts, isolation moves, bodyweight moves)
   - sessions  : Upper / Lower / Full body → warm-up, exercises, cool-down.
                 An exercise slot's `rotation` lists one exercise per training block
                 (block 1 = weeks 1–4, block 2 = weeks 5–8, block 3 = 9–12, then it loops).
   - exercises : name, type, animation (see moves.js), muscles to highlight, cues, alternatives
   Muscles you can highlight: chest, back, lowerBack, shoulders, biceps, triceps, abs,
   glutes, quads, hamstrings, calves, hipFlexors.
   ========================================================================== */
window.GYM_PLAN = {
  version: 2,

  // 0 = Sun, 1 = Mon … 6 = Sat. Can also be changed in the app (Settings).
  days: { 1: 'upper', 3: 'lower', 5: 'full' },

  levels: {
    L: { name: 'Light', hint: 'Easy weight — smooth reps, perfect form' },
    M: { name: 'Medium', hint: 'Challenging — you could do 3 more reps' },
    H: { name: 'Heavy', hint: 'Hard — the last reps are a real effort, form stays clean' },
    B: { name: 'Bodyweight', hint: 'No weight — use the assisted machine if needed' }
  },

  // 4-week block. Each week lists the sets as [reps, level].
  weeks: [
    { name: 'Base' },
    { name: 'Build' },
    { name: 'Push' },
    { name: 'Easy week', easy: true }
  ],
  schemes: {
    compound:   [ [[12, 'L'], [10, 'M'], [10, 'M']], [[12, 'L'], [10, 'M'], [8, 'H']], [[10, 'L'], [8, 'H'], [6, 'H']], [[12, 'L'], [10, 'L']] ],
    isolation:  [ [[15, 'L'], [12, 'M'], [12, 'M']], [[15, 'L'], [12, 'M'], [10, 'H']], [[12, 'L'], [10, 'H'], [10, 'H']], [[15, 'L'], [12, 'L']] ],
    bodyweight: [ [[8, 'B'], [8, 'B'], [8, 'B']], [[10, 'B'], [8, 'B'], [8, 'B']], [[10, 'B'], [10, 'B'], [8, 'B']], [[8, 'B'], [8, 'B']] ]
  },

  // Time estimate: reps × secPerRep + setSetup per set, rests between sets, exerciseSetup per exercise.
  timing: { budget: 1800, secPerRep: 3, setSetup: 10, perSideSwitch: 5, exerciseSetup: 40 },

  sessions: {
    upper: {
      name: 'Upper',
      warmup: [
        { name: 'Rower, easy', sec: 60, anim: 'rower', muscles: ['back', 'quads'] },
        { name: 'Arm circles + band pull-aparts', sec: 60, anim: ['armcircles', 'pullapart'], muscles: ['shoulders', 'back'] },
        { name: 'Push-ups ×8, slow', sec: 60, anim: 'pushup', muscles: ['chest', 'triceps'] }
      ],
      exercises: [
        { slot: 'u_press', rotation: ['bb_bench', 'incline_bb', 'db_bench'], rest: 90 },
        { slot: 'u_row', rotation: ['cable_row', 'cs_db_row', 'machine_row'], rest: 60 },
        { slot: 'u_ohp', rotation: ['db_ohp', 'machine_ohp', 'arnold'], rest: 60 },
        { slot: 'u_vpull', rotation: ['pulldown', 'pullup', 'ng_pulldown'], rest: 60 },
        { slot: 'u_lat', rotation: ['db_lat', 'cable_lat', 'seated_lat'], rest: 45 }
      ],
      cooldown: [
        { name: 'Doorway chest stretch', sec: 60, note: '30 s per side', anim: 'doorway', muscles: ['chest'] },
        { name: 'Child\'s pose', sec: 60, anim: 'childpose', muscles: ['back'] }
      ]
    },
    lower: {
      name: 'Lower',
      warmup: [
        { name: 'Bike, easy', sec: 60, anim: 'bike', muscles: ['quads'] },
        { name: 'Leg swings, front + side', sec: 60, note: '10 each way per leg', anim: ['legswing', 'legswing_side'], muscles: ['hamstrings', 'hipFlexors'] },
        { name: 'Bodyweight squats ×10', sec: 60, anim: 'bw_squat', muscles: ['quads', 'glutes'] }
      ],
      exercises: [
        { slot: 'l_squat', rotation: ['back_squat', 'front_squat', 'smith_squat'], rest: 90 },
        { slot: 'l_hinge', rotation: ['bb_rdl', 'db_rdl', 'back_ext'], rest: 60 },
        { slot: 'l_press', rotation: ['leg_press', 'leg_press_narrow'], rest: 60 },
        { slot: 'l_curl', rotation: ['leg_curl_seated', 'lying_leg_curl'], rest: 45 },
        { slot: 'l_core', rotation: ['cable_crunch', 'knee_raise'], rest: 45 }
      ],
      cooldown: [
        { name: 'Hip flexor (couch) stretch', sec: 60, note: '30 s per side', anim: 'couch', muscles: ['hipFlexors', 'quads'] },
        { name: 'Hamstring stretch', sec: 60, note: '30 s per side', anim: 'hamstring', muscles: ['hamstrings'] }
      ]
    },
    full: {
      name: 'Full body',
      warmup: [
        { name: 'Rower, easy', sec: 60, anim: 'rower', muscles: ['back', 'quads'] },
        { name: 'World\'s greatest stretch', sec: 60, note: '3 per side', anim: 'wgs', muscles: ['hipFlexors', 'hamstrings'] },
        { name: 'Squat to overhead reach ×10', sec: 60, anim: 'squat_reach', muscles: ['quads', 'shoulders'] }
      ],
      exercises: [
        { slot: 'f_hinge', rotation: ['trap_dl', 'conv_dl', 'hip_thrust'], rest: 90 },
        { slot: 'f_press', rotation: ['incline_db', 'dips', 'incline_smith'], rest: 60 },
        { slot: 'f_row', rotation: ['cs_db_row', 'wide_row', 'inv_row'], rest: 60 },
        { slot: 'f_legs', rotation: ['goblet_squat', 'leg_press', 'smith_squat'], rest: 60 },
        { slot: 'f_rear', rotation: ['face_pull', 'rev_pec_deck', 'rear_delt_db'], rest: 45 }
      ],
      cooldown: [
        { name: 'Figure-4 glute stretch', sec: 60, note: '30 s per side', anim: 'figure4', muscles: ['glutes'] },
        { name: 'Doorway chest stretch', sec: 60, note: '30 s per side', anim: 'doorway', muscles: ['chest'] }
      ]
    }
  },

  /* Exercise library
     type: compound | isolation | bodyweight (picks the scheme above)
     side: true = reps are per side
     anim / prop: movement pattern in moves.js and what the hands hold
     cable: draw the cable
     muscles: highlighted on the character (first ones = main) */
  exercises: {
    bb_bench: { name: 'Barbell bench press', type: 'compound', anim: 'bench', prop: 'barbell', muscles: ['chest', 'triceps', 'shoulders'],
      cues: ['Shoulder blades pinched, feet planted', 'Bar to lower chest, elbows ~45°', 'Press up and slightly back over the shoulders'],
      alts: ['db_bench', 'smith_bench', 'machine_chest'] },
    incline_bb: { name: 'Incline barbell bench press', type: 'compound', anim: 'incline', prop: 'barbell', muscles: ['chest', 'shoulders', 'triceps'],
      cues: ['Bench at ~30°', 'Bar to upper chest', 'Wrists stacked over elbows'],
      alts: ['incline_db', 'incline_smith', 'machine_chest'] },
    db_bench: { name: 'Dumbbell bench press', type: 'compound', anim: 'bench', prop: 'dumbbell', muscles: ['chest', 'triceps', 'shoulders'],
      cues: ['Kick the dumbbells up off your knees', 'Lower to chest level, elbows ~45°', 'Press up without clanking at the top'],
      alts: ['bb_bench', 'machine_chest', 'pushup'] },
    smith_bench: { name: 'Smith machine bench press', type: 'compound', anim: 'bench', prop: 'barbell', muscles: ['chest', 'triceps', 'shoulders'],
      cues: ['Bench placed so the bar meets lower chest', 'Shoulder blades pinched', 'Control down, press up'],
      alts: ['bb_bench', 'db_bench', 'machine_chest'] },
    machine_chest: { name: 'Machine chest press', type: 'compound', anim: 'chestpress', prop: 'machine', muscles: ['chest', 'triceps'],
      cues: ['Handles at mid-chest height', 'Shoulder blades back against the pad', 'Press out, don\'t lock elbows hard'],
      alts: ['db_bench', 'smith_bench', 'pushup'] },
    pushup: { name: 'Push-up', type: 'bodyweight', anim: 'pushup', muscles: ['chest', 'triceps', 'abs'],
      cues: ['Body in one straight line', 'Chest to a fist above the floor', 'Elbows ~45°, not flared'],
      alts: ['db_bench', 'machine_chest', 'dips'] },
    incline_db: { name: 'Incline dumbbell press', type: 'compound', anim: 'incline', prop: 'dumbbell', muscles: ['chest', 'shoulders', 'triceps'],
      cues: ['Bench at ~30°', 'Dumbbells to upper-chest level', 'Press up and slightly in'],
      alts: ['incline_bb', 'incline_smith', 'machine_chest'] },
    incline_smith: { name: 'Incline Smith press', type: 'compound', anim: 'incline', prop: 'barbell', muscles: ['chest', 'shoulders', 'triceps'],
      cues: ['Bench at ~30°, bar meets upper chest', 'Shoulder blades pinched', 'Control down, press up'],
      alts: ['incline_db', 'incline_bb', 'machine_chest'] },
    dips: { name: 'Dips (assisted if needed)', type: 'bodyweight', anim: 'dip', muscles: ['chest', 'triceps', 'shoulders'],
      cues: ['Slight forward lean', 'Down until upper arms are parallel to the floor', 'Assisted machine: enter assistance as negative kg'],
      alts: ['incline_db', 'pushup', 'machine_chest'] },
    cable_row: { name: 'Seated cable row', type: 'compound', anim: 'row_cable', prop: 'handle', cable: true, muscles: ['back', 'biceps'],
      cues: ['Sit tall, chest up', 'Pull the handle to your belly button', 'Squeeze shoulder blades, 2 s return'],
      alts: ['machine_row', 'cs_db_row', 'bb_row'] },
    bb_row: { name: 'Barbell bent-over row', type: 'compound', anim: 'row_bent', prop: 'barbell', muscles: ['back', 'biceps', 'lowerBack'],
      cues: ['Hinge to ~45°, flat back', 'Pull the bar to your lower ribs', 'No torso swing'],
      alts: ['cs_db_row', 'cable_row', 'machine_row'] },
    machine_row: { name: 'Machine row', type: 'compound', anim: 'row_cable', prop: 'machine', muscles: ['back', 'biceps'],
      cues: ['Chest on the pad', 'Drive elbows back', 'Pause 1 s, slow return'],
      alts: ['cable_row', 'cs_db_row', 'bb_row'] },
    cs_db_row: { name: 'Chest-supported dumbbell row', type: 'compound', anim: 'row_cs', prop: 'dumbbell', muscles: ['back', 'biceps'],
      cues: ['Chest on a 30–45° bench', 'Drive elbows back toward your hips', 'Pause 1 s at the top'],
      alts: ['cable_row', 'machine_row', 'wide_row'] },
    wide_row: { name: 'Wide-grip cable row', type: 'compound', anim: 'row_cable', prop: 'handle', cable: true, muscles: ['back', 'shoulders'],
      cues: ['Elbows out ~60°', 'Pull to lower chest', 'Squeeze the upper back'],
      alts: ['cable_row', 'cs_db_row', 'machine_row'] },
    inv_row: { name: 'Inverted row (Smith bar)', type: 'bodyweight', anim: 'invrow', muscles: ['back', 'biceps'],
      cues: ['Body straight, heels down', 'Pull chest to the bar', 'Lower the bar notch to make it harder'],
      alts: ['cs_db_row', 'cable_row', 'wide_row'] },
    db_ohp: { name: 'Seated dumbbell shoulder press', type: 'compound', anim: 'ohp_seated', prop: 'dumbbell', muscles: ['shoulders', 'triceps'],
      cues: ['Bench upright, back on the pad', 'Lower to ear level', 'Press up and slightly in'],
      alts: ['machine_ohp', 'bb_ohp', 'arnold'] },
    bb_ohp: { name: 'Standing barbell overhead press', type: 'compound', anim: 'ohp_standing', prop: 'barbell', muscles: ['shoulders', 'triceps', 'abs'],
      cues: ['Squeeze glutes, ribs down', 'Move your head back, then through', 'Finish with the bar over mid-foot'],
      alts: ['db_ohp', 'machine_ohp', 'arnold'] },
    machine_ohp: { name: 'Machine shoulder press', type: 'compound', anim: 'ohp_seated', prop: 'machine', muscles: ['shoulders', 'triceps'],
      cues: ['Handles at shoulder height', 'Back flat on the pad', 'Press up, no hard lockout'],
      alts: ['db_ohp', 'bb_ohp', 'arnold'] },
    arnold: { name: 'Arnold press', type: 'compound', anim: 'ohp_seated', prop: 'dumbbell', muscles: ['shoulders', 'triceps'],
      cues: ['Start palms facing you at chin height', 'Rotate palms forward as you press', 'Reverse the rotation on the way down'],
      alts: ['db_ohp', 'machine_ohp', 'bb_ohp'] },
    pulldown: { name: 'Lat pulldown (wide grip)', type: 'compound', anim: 'pulldown', prop: 'bar', cable: true, muscles: ['back', 'biceps'],
      cues: ['Thighs locked under the pad', 'Pull the bar to your upper chest', 'Lean back slightly, elbows down to your ribs'],
      alts: ['ng_pulldown', 'pullup', 'straight_pd'] },
    ng_pulldown: { name: 'Close neutral-grip pulldown', type: 'compound', anim: 'pulldown', prop: 'handle', cable: true, muscles: ['back', 'biceps'],
      cues: ['Palms facing each other', 'Pull to the top of your chest', 'Full stretch at the top'],
      alts: ['pulldown', 'pullup', 'straight_pd'] },
    pullup: { name: 'Pull-up (assisted if needed)', type: 'bodyweight', anim: 'pullup', muscles: ['back', 'biceps'],
      cues: ['Start from a dead hang', 'Chest toward the bar, elbows to your ribs', 'Assisted machine: enter assistance as negative kg'],
      alts: ['pulldown', 'ng_pulldown', 'inv_row'] },
    straight_pd: { name: 'Straight-arm cable pulldown', type: 'isolation', anim: 'straight_pd', prop: 'bar', cable: true, muscles: ['back'],
      cues: ['Hinge slightly, arms almost straight', 'Sweep the bar down to your thighs', 'Feel it in the lats, not the triceps'],
      alts: ['pulldown', 'ng_pulldown'] },
    db_lat: { name: 'Dumbbell lateral raise', type: 'isolation', anim: 'latraise', prop: 'dumbbell', muscles: ['shoulders'],
      cues: ['Slight bend in the elbows', 'Lead with the elbows to shoulder height', '2 s down, no swinging'],
      alts: ['cable_lat', 'seated_lat'] },
    cable_lat: { name: 'Cable lateral raise (dual pulleys)', type: 'isolation', anim: 'latraise', prop: 'cable_low', cable: true, muscles: ['shoulders'],
      cues: ['Low pulleys, cables crossed in front', 'Raise to shoulder height', 'Slow and controlled'],
      alts: ['db_lat', 'seated_lat'] },
    seated_lat: { name: 'Seated dumbbell lateral raise', type: 'isolation', anim: 'latraise', prop: 'dumbbell', muscles: ['shoulders'],
      cues: ['Sit on the end of a bench, tall', 'Raise to shoulder height', 'No momentum'],
      alts: ['db_lat', 'cable_lat'] },
    cable_curl: { name: 'Cable curl (straight bar)', type: 'isolation', anim: 'curl', prop: 'cable_low', cable: true, muscles: ['biceps'],
      cues: ['Elbows pinned to your sides', 'Curl up, squeeze 1 s', 'Lower in 2 s'],
      alts: ['ez_curl', 'hammer'] },
    hammer: { name: 'Dumbbell hammer curl', type: 'isolation', anim: 'curl', prop: 'dumbbell', muscles: ['biceps'],
      cues: ['Palms face each other', 'Elbows stay still', 'Lower all the way'],
      alts: ['cable_curl', 'ez_curl'] },
    ez_curl: { name: 'EZ-bar curl', type: 'isolation', anim: 'curl', prop: 'barbell', muscles: ['biceps'],
      cues: ['Grip the angled part of the bar', 'Elbows pinned, no hip swing', 'Lower in 2 s'],
      alts: ['cable_curl', 'hammer'] },
    rope_pushdown: { name: 'Cable rope pushdown', type: 'isolation', anim: 'pushdown', prop: 'cable_high', cable: true, muscles: ['triceps'],
      cues: ['Elbows tucked, shoulders down', 'Spread the rope at the bottom', 'Control back up to 90°'],
      alts: ['oh_cable_ext', 'ez_skull', 'dips'] },
    oh_cable_ext: { name: 'Overhead cable triceps extension', type: 'isolation', anim: 'ohext', prop: 'cable_low', cable: true, muscles: ['triceps'],
      cues: ['Face away from the cable, staggered stance', 'Elbows point forward, stay still', 'Full stretch behind the head'],
      alts: ['rope_pushdown', 'ez_skull', 'db_oh_ext'] },
    ez_skull: { name: 'EZ-bar skull crusher', type: 'isolation', anim: 'skull', prop: 'barbell', muscles: ['triceps'],
      cues: ['Upper arms angled slightly back', 'Lower the bar behind your forehead', 'Only the elbows move'],
      alts: ['rope_pushdown', 'oh_cable_ext', 'db_oh_ext'] },
    db_oh_ext: { name: 'Dumbbell overhead extension (one DB)', type: 'isolation', anim: 'ohext', prop: 'dumbbell', muscles: ['triceps'],
      cues: ['Both hands under the top plate', 'Elbows point up and stay narrow', 'Full stretch behind the head'],
      alts: ['rope_pushdown', 'oh_cable_ext', 'ez_skull'] },
    back_squat: { name: 'Barbell back squat', type: 'compound', anim: 'squat', prop: 'barbell_back', muscles: ['quads', 'glutes', 'lowerBack'],
      cues: ['Brace, bar on the upper back', 'Sit between your heels, knees track over toes', 'Hips and chest rise together'],
      alts: ['smith_squat', 'goblet_squat', 'leg_press'] },
    front_squat: { name: 'Barbell front squat', type: 'compound', anim: 'squat', prop: 'barbell_front', muscles: ['quads', 'glutes', 'abs'],
      cues: ['Elbows high, bar on the front delts', 'Stay tall, sit straight down', 'Drive up through mid-foot'],
      alts: ['back_squat', 'goblet_squat', 'smith_squat'] },
    smith_squat: { name: 'Smith machine squat', type: 'compound', anim: 'squat', prop: 'barbell_back', muscles: ['quads', 'glutes'],
      cues: ['Feet slightly in front of the bar', 'Sit down and back', 'Brace and drive up'],
      alts: ['back_squat', 'leg_press', 'goblet_squat'] },
    goblet_squat: { name: 'Goblet squat', type: 'compound', anim: 'squat', prop: 'goblet', muscles: ['quads', 'glutes'],
      cues: ['Hold the dumbbell at your chest', 'Elbows inside the knees at the bottom', 'Stay tall'],
      alts: ['back_squat', 'leg_press', 'smith_squat'] },
    leg_press: { name: 'Leg press', type: 'compound', anim: 'legpress', muscles: ['quads', 'glutes'],
      cues: ['Feet mid-platform, shoulder width', 'Lower until hips start to curl off the pad', 'Don\'t lock the knees'],
      alts: ['leg_press_narrow', 'goblet_squat', 'smith_squat'] },
    leg_press_narrow: { name: 'Leg press (feet low & narrow)', type: 'compound', anim: 'legpress', muscles: ['quads'],
      cues: ['Feet low and hip-width — more quads', 'Heels stay down', 'Control the bottom'],
      alts: ['leg_press', 'goblet_squat', 'leg_ext'] },
    leg_ext: { name: 'Leg extension', type: 'isolation', anim: 'legext', cable: true, muscles: ['quads'],
      cues: ['Knee lined up with the machine pivot', 'Squeeze 1 s at the top', 'Lower in 2 s'],
      alts: ['leg_press', 'goblet_squat'] },
    reverse_lunge: { name: 'Dumbbell reverse lunge', type: 'compound', side: true, anim: 'lunge', prop: 'dumbbell', muscles: ['quads', 'glutes'],
      cues: ['Step back, drop the back knee toward the floor', 'Front shin stays fairly vertical', 'Drive through the front heel'],
      alts: ['bss', 'step_up', 'goblet_squat'] },
    bss: { name: 'Bulgarian split squat', type: 'compound', side: true, anim: 'splitsquat', prop: 'dumbbell', muscles: ['quads', 'glutes'],
      cues: ['Rear foot laces-down on a bench', 'Sink straight down, slight forward lean', 'Front heel stays planted'],
      alts: ['reverse_lunge', 'step_up', 'leg_press'] },
    step_up: { name: 'Dumbbell step-up', type: 'compound', side: true, anim: 'stepup', prop: 'dumbbell', muscles: ['quads', 'glutes'],
      cues: ['Box at about knee height', 'Push through the top foot only', 'Lower slowly'],
      alts: ['bss', 'reverse_lunge', 'leg_press'] },
    trap_dl: { name: 'Trap-bar deadlift', type: 'compound', anim: 'deadlift', prop: 'trapbar', muscles: ['glutes', 'hamstrings', 'quads', 'lowerBack'],
      cues: ['Stand centred, hips between knees and shoulders', 'Push the floor away, chest up', 'Finish by squeezing glutes'],
      alts: ['conv_dl', 'bb_rdl', 'hip_thrust'] },
    conv_dl: { name: 'Conventional deadlift', type: 'compound', anim: 'deadlift', prop: 'barbell', muscles: ['glutes', 'hamstrings', 'lowerBack'],
      cues: ['Bar over mid-foot, shins touch the bar', 'Pull the slack out, flat back', 'Bar stays close all the way up'],
      alts: ['trap_dl', 'bb_rdl', 'hip_thrust'] },
    bb_rdl: { name: 'Barbell Romanian deadlift', type: 'compound', anim: 'rdl', prop: 'barbell', muscles: ['hamstrings', 'glutes', 'lowerBack'],
      cues: ['Soft knees, push hips back', 'Bar slides down the thighs, flat back', 'Stop at mid-shin; stand by squeezing glutes'],
      alts: ['db_rdl', 'back_ext', 'hip_thrust'] },
    db_rdl: { name: 'Dumbbell Romanian deadlift', type: 'compound', anim: 'rdl', prop: 'dumbbell', muscles: ['hamstrings', 'glutes', 'lowerBack'],
      cues: ['Dumbbells close to the legs', 'Hips back until you feel the hamstrings', 'Flat back the whole time'],
      alts: ['bb_rdl', 'back_ext', 'hip_thrust'] },
    back_ext: { name: '45° back extension', type: 'bodyweight', anim: 'backext', muscles: ['lowerBack', 'glutes', 'hamstrings'],
      cues: ['Pad just below the hips', 'Round down slowly, rise to a straight line', 'Squeeze glutes at the top; hold a plate to add load'],
      alts: ['bb_rdl', 'db_rdl', 'hip_thrust'] },
    hip_thrust: { name: 'Barbell hip thrust', type: 'compound', anim: 'hipthrust', prop: 'barbell', muscles: ['glutes', 'hamstrings'],
      cues: ['Upper back on the bench edge, bar padded on the hips', 'Chin tucked, drive hips up', 'Pause 1 s with glutes squeezed'],
      alts: ['trap_dl', 'back_ext', 'db_rdl'] },
    leg_curl_seated: { name: 'Seated leg curl', type: 'isolation', anim: 'legcurl_seated', cable: true, muscles: ['hamstrings'],
      cues: ['Knee lined up with the pivot, thigh pad tight', 'Curl all the way under', 'Lower in 2 s'],
      alts: ['lying_leg_curl', 'db_rdl'] },
    lying_leg_curl: { name: 'Lying leg curl', type: 'isolation', anim: 'legcurl_lying', cable: true, muscles: ['hamstrings'],
      cues: ['Hips pressed into the pad', 'Curl heels toward glutes', 'Lower in 2 s'],
      alts: ['leg_curl_seated', 'db_rdl'] },
    cable_crunch: { name: 'Kneeling cable crunch', type: 'isolation', anim: 'crunch', prop: 'cable_high', cable: true, muscles: ['abs'],
      cues: ['Rope beside your head, hips stay still', 'Curl ribs toward hips', 'Exhale hard at the bottom'],
      alts: ['knee_raise', 'pallof'] },
    knee_raise: { name: 'Hanging knee raise', type: 'bodyweight', anim: 'kneeraise', muscles: ['abs'],
      cues: ['Dead hang, shoulders active', 'Curl knees up and tilt the pelvis', 'No swinging'],
      alts: ['cable_crunch', 'pallof'] },
    pallof: { name: 'Pallof press', type: 'isolation', side: true, anim: 'pallof', prop: 'handle', cable: true, muscles: ['abs'],
      cues: ['Stand side-on to the cable', 'Press the handle straight out, resist the twist', 'Hold 2 s, return to chest'],
      alts: ['cable_crunch', 'knee_raise'] },
    face_pull: { name: 'Cable face pull', type: 'isolation', anim: 'facepull', prop: 'cable_high', cable: true, muscles: ['shoulders', 'back'],
      cues: ['Rope at forehead height', 'Pull to your eyes, elbows high', 'Rotate hands back at the end'],
      alts: ['rev_pec_deck', 'rear_delt_db'] },
    rev_pec_deck: { name: 'Reverse pec deck', type: 'isolation', anim: 'revfly', prop: 'machine', muscles: ['shoulders', 'back'],
      cues: ['Chest on the pad, handles at shoulder height', 'Sweep arms back in an arc', 'Pause, then 2 s return'],
      alts: ['face_pull', 'rear_delt_db'] },
    rear_delt_db: { name: 'Bent-over rear-delt raise', type: 'isolation', anim: 'revfly', prop: 'dumbbell', muscles: ['shoulders', 'back'],
      cues: ['Hinge until your chest is near parallel', 'Raise arms out to the sides', 'Light weight, strict form'],
      alts: ['face_pull', 'rev_pec_deck'] }
  }
};
