# N-back interface contract — 2026-09-11

Reference: Brain Workshop 5.0, git `3476f724eb623b6e39605bd7a7e3df245787e73a`. Independent browser implementation. Game id/module `nback`, category `N-back`. Existing AMAkids games retain their own settings, scoring and lifecycle.

## Settings (flat JSON, URL-serializable)

`{nbackVersion:1, mode:2, n:1, trialCount:20, intervalMs:3000, selfPaced:false, adaptive:false, variable:false, crab:false, multiStim:1, identity:'color', interference:0.125, scoreProfile:'workshop', operations:['+','-','*','/'], numberMax:9, allowNegative:false, allowFractions:false, lowScoreCount:0}`

- `mode` uses the 28 base numeric codes in the pinned source. `n` 1–20; `trialCount` 4–200 is the number of SCORED trials, plus `n` unscored initial trials. A reference preset selects `20+n*n-n` scored trials (if over 200, reject with a clear limit). Easy preset N=1 / 20 scored / 3000ms / manual. Interval 400–10000ms; fixed audible/audio2/arithmetic modes require at least 1200ms to preserve full speech. Operations nonempty subset of `+ - * /`; numberMax 1–100. The engine may tighten unsafe valid ranges with documented errors.
- `multiStim` 1–4; identity `color` or `image`. Multi is permitted only for position modes without arithmetic, combination, or both color and image. UI disables invalid switches rather than silently changing a selected task.
- Variable+Crab is rejected because the pinned source marks the joint index calculation FIXME. Jaeggi is restricted to its source-supported fixed Dual mode and fixed reference trial generation; engine documents further bounds.
- `lowScoreCount` 0–2 is server-resolved for account play, never trusted from incoming requests. For manual settings it is zero. Adaptive state persists by normalized challenge identity, excluding N/trialCount/pace, with assignment-step isolation. A changed initial N/settings for a new assignment starts that assignment's progression.
- Browser length/preset and fixed arithmetic bugs are explicit reference deviations, not parity claims. No N-back stars: `stars:null`, `starBasis:'brainworkshop-no-stars'`.

## Engine exports (dist/nback/engine.js)

- `MODE_DEFINITIONS`: array `{id:number,title:string,channels:string[],family:string,description:string}`; source ids retained.
- `normalizeConfig(raw={})`: canonical settings, converts query strings, validates combinations, throws an Error with useful Hungarian message for unsupported selections. `validateConfig(raw)` may be an alias.
- `channelsForConfig(config)`: array `{id:string,label:string,key:string}` including expanded multi channels. Stable ids: position1..4, color, image, audio, audio2, visvis, visaudio, audiovis, arithmetic, vis1..4.
- `generateSession({seed,config})`: `{version:1,seed,config,channels,trials}`. Seed unsigned 32 bit; exact reproducibility in Node and browser.
- Each trial: `{index,shownBack,targetIndex,warmup,stimuli:{positions:number[],objects:Array<{id:number,position:number,color:number,image:number}>,color:number,image:number,visual:number,audio:number,audio2:number,number:number},operation:string|null}`. Stimulus ids 1–8, position ids 1–8 are perimeter locations in a 3×3 grid; 0 means center/unused. `visual` is the letter/sign id used by Combination. Position multi objects have persistent id 1..multiStim. Warmup `targetIndex:null`; `shownBack` is the CURRENT actual comparison lag. Targets can be derived via exported helper but no target truth is displayed in scored UI.
- `scoreSession(session, answer, options={})`: existing game result shape `{correct,total,percent,summary,details:[],stars:null,starBasis:'brainworkshop-no-stars',metrics:{version:1,mode,n,scoreProfile,trialCount,channels:Array<{id,label,hits,falseAlarms,misses,correctRejections,percent}>,totals:{hits,falseAlarms,misses,correctRejections},adaptation:{fromN,nextN,lowScoreCount,action}}}`. `correct/total` are aggregate score components for old storage; percent is authoritative source formula (floor pooled Workshop; minimum-channel Jaeggi), never recomputed by generic result normalization. Handle zero denominator as percent=0 and storage total>=1. `options.lowScoreCount` uses trusted prior state, otherwise canonical config count. Adaptation action `up|down|stay|manual`.
- Export `resolveTargetIndex`, `evaluateArithmetic`, `adaptLevel` and any independently useful helpers for known fixtures; engine report documents exact helper signatures.

## Raw response payload

`{version:1,events:[{trialIndex:0,channel:'position1',atMs:123,value:true}]}`

`atMs` is milliseconds from that trial onset, excluding pauses, nonnegative; fixed pace responses must be within intervalMs. Match channel value is true; do not send false events for nonresponse. At most one positive match per channel/trial counts; duplicates never add credit. Arithmetic value is an explicit signed decimal or rational string (e.g. `-2`, `0.5`, `1/2`), empty omitted; last valid value counts. The UI auto-commits a valid typed draft at trial close using its original input timestamp; empty/late-only input remains omitted. Unanswered zero is NOT correct zero. Engine strictly validates the bounded payload, channel ids, trial bounds, input formats, and only scores nonwarmup trials. Server regenerates all stimuli and targets from its stored seed/config; never accepts client correctness/totals.

## UI and host integration

- `dist/nback/ui.js` exports `nbackGames={nback:{mount(ctx)}}`. ctx reuses `{root,h,settings,phase,done}` and adds immutable `seed`. `mount` returns synchronous cleanup function (async loading stays inside the mount). It owns its continuous timer, pause/resume, visibility/blur handling, all keyboard/audio handlers, and a prestart user gesture for WebAudio. Generic memorize/countdown is not used.
- `ctx.done(null,rawAnswer)` is called once, after final trial, only for the real round. Intro is a separate unscored practice inside UI before the real start, never saves or alters adaptive state. All async paths guard cleanup. Host cleanup calls returned function on navigation/restart/logout.
- UI imports `createAudioBank` from `./audio.js` (ROOT OWNS THIS FILE). `await createAudioBank()` returns `{unlock():Promise<void>, play(stimuli,config,operation?,warmup?,offsetMs?):void, stop():void, dispose():void}`; play starts simultaneous bank1/2 as appropriate; warmup suppresses arithmetic operation; local predecoded clips only. Failed loading presents actionable retry before any trial. Pause preserves trial onset and remaining response time; flash stays hidden after its period, and only remaining audio resumes from offset. Self-paced advance waits actual decoded audio duration.
- `dist/nback/settings-ui.js` exports `createNbackSettings({h,value,onChange,compact=false})` -> `{element,getValue,setValue}` and `describeNbackSettings(settings)` -> concise Hungarian string. `getValue()` returns normalizeConfig result or throws. Teacher and practice use the same component. `setValue` updates visible controls. Include short rules and source-compatible disabled combinations.
- `dist/nback/result-view.js` exports `renderNbackResult(h,result)` -> DOM section for totals, per-channel results, formula and next N; both teacher and student reuse it. Gracefully handles missing metrics.
- UI owns `dist/nback/nback.css`, imported through its own `<link>` creation once or host index. Namespace `.nback-*`, responsive. Integration owns all existing files.

## File owners

Engine: `dist/nback/engine.js`, optional pure engine helpers, `tests/nback-engine.test.mjs`, `docs/NBACK-REFERENCE.md`.
UI: `dist/nback/ui.js`, `settings-ui.js`, `result-view.js`, `nback.css`, own UI test files.
Integration: existing app/core/catalog/game-engine/school, server/migration/check, integration test files. Does not edit engine/UI owned files.
Root: this contract, `dist/nback/audio.js`, owned audio assets, UAT/release reports, all final integration and independent fixes.

Adaptive challenge identity excludes only n, trialCount, intervalMs and lowScoreCount. selfPaced remains part of identity because it selects a distinct source mode.
