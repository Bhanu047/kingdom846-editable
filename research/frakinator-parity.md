# Parity with the reference simulator

The public Kingshot simulator at `https://frakinator.streamlit.app/` resolves
the same fights this app does. Its source is not public, so everything below
was **measured**, not read: the app is Streamlit, Streamlit speaks protobuf
over a websocket, and that websocket accepts scripted widget values. Each
measurement is one fight submitted with chosen inputs and the returned mean
survivor counts read back off the rendered page.

That matters because it changes what kind of evidence the engine rests on.
Before this, the two most sensitive constants in `kingshotCombat.js` were
**fitted** to sixteen real player battles whose own replication noise was large
enough (sd ~28 points, see `noise-floor.mjs`) that the fit could not be
distinguished from fitting noise — the file says so itself, in the block that
froze them. The reference resolves a fight thousands of times and reports a
mean, so it answers the same questions without that noise.

## What was measured

27 battles: single-type duels at equal and unequal counts, single-stat
isolations, mixed armies with a shielded back row, tier pairings, and six
held-out battles with per-type stat spreads. Inputs and results are in
`frakinator-parity.json`; `frakinator-parity.mjs` replays them through our
engine.

Eight of the 27 come back as coin flips (reference win rate 41–54%). Those are
fights the reference annihilates both sides in, and its survivor figures are
conditional on winning, so they carry no signal about survivors and are
reported but not scored. The remaining 19 are decisive.

## What changed in the engine

| Constant | Was | Now | Evidence |
|---|---|---|---|
| `FRONT_ROW_SPILL` | 0.20 (fitted) | **0** | Eleven battles where the winner held a back row returned it at full strength to the troop — 50,000 of 50,000. Nothing gets past the front row except Cavalry's Ambusher. |
| `STAT_PAIR_WEIGHT` | 1.09 (fitted) | **1.0** | +100% Attack leaves 62,859 survivors, +100% Lethality 62,830, +100% Defense on the defender 62,981. Three ways of spending the same percentage, one answer within 0.2%. |
| `COUNTER_BONUS` | 1.10 | **1.115** | Fitted jointly with the base powers; the three counter duels each carry it once. |
| `AMBUSH_SHARE` | 0.20 | **0.2115** | 100k Cavalry kill 17,373 Archers through a 50k Infantry wall. |
| `ARCHER_VOLLEY_MULTIPLIER` | 1.10 | **1.111** | Same fit; agrees with the documented 10% double-fire. |
| per-type base power | none | `TROOP_OFFENCE` / `TROOP_DEFENCE` | See below. |

### Per-type base power is the substantive change

The engine previously modelled troop types as differing *only* by the counter
triangle and their abilities. It said so deliberately: an earlier `T10_BASE`
table had been removed because its numbers looked constructed (attack exactly
1x/3x/4x against hp exactly 4x/1.33x/1x).

The removal was right about that table and wrong about the claim. Those ratios
make all three types exactly equally strong — every product `attack x hp` is
equal — which predicts that any duel between equal-sized single-type armies
ends in mutual annihilation. The reference says otherwise, decisively:

| Duel | Reference |
|---|---|
| 100k Infantry vs 100k Cavalry | Infantry wins ~99% of the time, 26,849 left |
| 100k Infantry vs 100k Archery | Archery wins 100% of the time, 32,443 left |
| 100k Cavalry vs 100k Archery | 53/47 — genuinely even |

So types are not interchangeable, and the difference is not the counter bonus
(Infantry beats Cavalry by far more than 11.5%). Cavalry and Archery hit
roughly 3.2x and 4.4x as hard as Infantry and die roughly 3.3x and 4.5x as
easily. `TROOP_OFFENCE` and `TROOP_DEFENCE` carry exactly that, fitted jointly
with the four constants above to the measured battles.

The intuition: glass cannons. Infantry beats Cavalry because Cavalry's extra
damage does not cover its fragility at equal counts; Archery beats Infantry
because the counter bonus plus Volley tips the same trade the other way.

## How close it now lands

`node research/frakinator-parity.mjs`

```
19 decisive battles: mean worst-row error 0.54%, max 2.80%
```

Errors are per surviving row, as a fraction of that side's army. The six
held-out battles — designed after the constants were fixed, with per-type stat
spreads the fit never saw — predicted blind within 2.8%, and four of the six
within 1%. That is the honest measure of the model, and it is the number to
watch if the constants are ever touched again.

## What is still open

- **Coin-flip battles.** When both sides annihilate, the reference's win rate
  (41–54%) reflects a stochastic ability roll we model in expectation. Our
  deterministic engine calls those draws. `simulateOutcomes` samples ability
  rolls and is the right place to reproduce the spread, but it has not been
  calibrated against these eight rows.
- **Tier.** The reference's PvP tab returns ~51% for T6 vs T10 at equal counts
  and ~54% for T6 vs T11p8 — i.e. its PvP tab appears not to apply troop tier
  at all, while its Mystic tab has an explicit T11 control. Our
  `TIER_STAT_MULTIPLIER` is kept as-is rather than flattened to match what
  looks like a gap in the reference's PvP tab; this is a deliberate divergence.
- **Bear.** Unchanged here. The Bear tier contradiction recorded in
  `bear-reference.md` and `tier-contradiction.mjs` remains open; a controlled
  re-probe reproduced tier-independence on the first case only.
