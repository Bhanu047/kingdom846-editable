# Kingshot combat — research notes

Groundwork for rebuilding Battle Lab's combat models. Everything here is
labelled by how well it is established. Nothing goes into code as a bare
number without a line in this file.

Written after the previous model was found to be built on invented constants.
The failure mode to avoid: fitting our numbers to another calculator's output
and calling it validation.

## THE FIX: two rooms exposed what one could not  [OBS]

Two **Crystal Cave** battles arrived, and they broke the problem open.

| room | our error | why |
|---|---|---|
| Crystal Cave | **+1.9 pts** — near exact | both sides the **same** stat shape |
| Forest of Life | **−32.8 pts** — badly wrong | the two shapes are **mirrored** |

```
Crystal Cave     me   A/D  85   L/H 640      same shape both sides
                 them A/D  78   L/H 701

Forest of Life   me   A/D 577   L/H 388      MIRRORED
                 them A/D 391   L/H 553
```

When both sides share a stat shape, any error in how A, L, D and H combine
**cancels**. Mirror the shapes and it is exposed. Neither room could have shown
this alone — which is why eight Forest of Life battles produced four failed
hypotheses and two Crystal Cave battles produced the answer.

### `STAT_PAIR_WEIGHT = 1.09`

The engine multiplied the pairs equally: `offence = (1+A)(1+L)`. A guide says
exactly that — *"Attack and Lethality multiply together … they matter equally"* —
and ten real battles say otherwise. Split the exponents, holding the total at 2:

```
offence = (1+A)^a · (1+L)^(2-a)      defence = (1+D)^a · (1+H)^(2-a)
```

| a | Forest of Life | Crystal Cave | per-battle MAE |
|---|---|---|---|
| 1.00 (was) | −32.8 | +1.9 | 29.9 |
| **1.09** | **−0.4** | **+5.2** | **13.2** |
| 1.15 | +10.8 | +7.7 | 18.5 |

Validated on all ten battles plus Knowledge Nexus:

- Forest of Life MAE **34.7 → 13.9**
- Crystal Cave MAE 11.1 → 11.1 (unchanged, already good)
- Knowledge Nexus still resolves as the win it really was (+39.0%)

**One parameter, two independent room-level constraints, fitted to real
outcomes.** That is the distinction from the 2.7× counter: this contradicts a
guide's prose, and prose is not evidence — ten battles are.

### The independent check nobody planned

Calibrated purely on the player's own results, with Frakinator's output playing
no part, the Forest of Life recommendation moved:

```
before   51 / 20 / 29
after    46 / 22 / 32
```

The player fielded **46/21/33**. Frakinator recommends **46/21/33**. Our answer
is now **0.1 points** from both. Seven reports of trying to imitate that tool
failed; ten real battles reproduced it from first principles.

### Honest caveat on the fit

Per-battle MAE is 13.9, but the theoretical floor from the noise alone is ~17.2
(0.798 × σ 21.6). **We are below the floor, which means mild overfitting on
eight Forest of Life points.** The mechanism is real and the direction is
certain; the error figure is optimistic. Expect ~17 on new fights, and expect
`a` to move as more rooms arrive — Crystal Cave contributes only 2 of the 10.

---

## GROUND TRUTH — twelve real outcomes across two rooms  [OBS]

**The first calibration data that is not another calculator's opinion.** Three
battles, all fought with the same split (50/15/35), against near-identical
opponents. Transcribed from Battle Details.

| | beast | enemy atk | result | my survivors | their survivors | actual edge |
|---|---|---|---|---|---|---|
| A | Ferocious | 400.0 | **DEFEAT** | 0 | 5,381 (3.3%) | **−3.3%** |
| B | Starving | 398.0 | **VICTORY** | 57,707 (35.3%) | 0 | **+35.3%** |
| C | Frenzied | 395.0 | **VICTORY** | 20,674 (12.6%) | 0 | **+12.6%** |
| D | One-Eyed | 398.0 | **VICTORY** | 24,803 (15.2%) | 0 | **+15.2%** |
| E | One-Eyed | 398.0 | **DEFEAT** | 0 | 46,215 (28.5%) | **−28.5%** |

### 0. D and E are the SAME FIGHT with opposite outcomes

Same beast, same stats (398.0 / 564.8), same counts (64,800 / 48,600 / 48,600),
same split. **+15.2% victory and −28.5% defeat — 43.7 points apart.**

Nothing distinguishes them as inputs. **No deterministic model can predict a
single Mystic battle**, and that is not a limitation of this engine — it is a
property of the game. Any tool that returns a confident verdict for one fight is
wrong by construction, ours included, which is why the verdict is gone.

Across all five, same split: **3 wins, 2 losses — a 60% win rate.** The
established optimizer said ~50% on these fights. **It was right and we were not.**
Its scatter was never sloppiness; it was sampling a genuinely wild process.

### 1. The model is ~35 points too pessimistic

| | predicted | predicted outcome | actual | actual outcome | error |
|---|---|---|---|---|---|
| A | −23.3% | LOSS | −3.3% | DEFEAT | −20.0 |
| B | −20.7% | LOSS | +35.3% | **VICTORY** | −56.0 |
| C | −16.5% | LOSS | +12.6% | **VICTORY** | −29.1 |
| D | −20.9% | LOSS | +15.2% | **VICTORY** | −36.1 |
| E | −20.9% | LOSS | −28.5% | DEFEAT | +7.6 |

**It called all five losses. Three were wins.** Mean error **−26.7 points**. No
amount of agreement with another optimizer would ever have surfaced this — both
tools were being scored against each other, not against reality.

### 2. Real variance is ~100x what we simulate

Same split, five fights: **−28.5%, −3.3%, +12.6%, +15.2%, +35.3%**. A **63.8
point** range, standard deviation **21.3 points**, crossing zero three times.
Our Monte Carlo on the same fight returns **±0.2 points, 0% wins** — it
under-states real variance by roughly **100×**.

The `±1.0` the result panel used to print next to the score has been removed.
An error bar wrong by two orders of magnitude is worse than none.

Rolling Ambusher and Volley per round captures essentially none of the real
randomness. This is why an established tool reports probabilities and we report
a number, and the probabilities were the honest format all along.

### 3. Where the bias comes from: composition is worth far more than +10%

Kill ratios straight from the reports:

| | I killed | they killed | my kill ratio |
|---|---|---|---|
| A | 156,919 | 163,500 | 0.960 |
| B | 162,200 | 105,793 | 1.533 |
| C | 162,100 | 142,826 | 1.135 |
| | | **mean** | **1.209** |

The stat maths says the enemy is **~10% stronger per troop** with equal numbers.
Reality says **I kill 21% more than they do**. Roughly **33%** is unaccounted
for, and both sides are T10 — the only structural difference in the fight is
**composition: mine 50/15/35 against theirs 40/30/30**.

That points at the counter triangle being worth much more than the documented
+10% per matchup, or at composition entering somewhere the current formula does
not have it at all.

### Four fixes tested against the seven outcomes — all rejected

| hypothesis | result |
|---|---|
| **count exponent** `count^E`, swept 0.5–1.0 | slope stays 0.26× reality at every value. No effect. |
| **counter triangle** 1.10 → 2.00 | makes it *worse*: the counter is symmetric, both sides get it. |
| **formula shape** — drop L, drop H, sqrt, additive | `A·L/D` and `A/(D·H)` flip to **7/7 wins** (reality 5/7). Overshoots as badly as the current shape undershoots. |
| **diminishing returns on defence** `(D·H)^k`, k 1.00→0.88 | moves the mean by 1.9 points. Nowhere near 33. |

Kill ratios say why nothing small works: in battle G the player lost 98,126 to
kill 161,800 — a ratio of **1.65**. Our stat maths makes the beast ~10% stronger
per troop. Closing that needs a **1.8× swing**, not a coefficient nudge.

**And no deterministic model can match anyway.** Reality returns 5 wins and 2
losses across inputs that differ by under 2%; D and E are byte-identical and
split. A deterministic engine returns 0/7 or 7/7 and nothing between. Matching
the observed mix requires a probabilistic model, which is what the established
tool has been doing all along.

### What DID change, and why that is the honest fix

The raw signed score no longer leads the result. Across seven real battles the
model returned a **negative score every time and the player won five**. A minus
sign reads as "you lose"; it was wrong 5 times in 7. Only the **comparative**
figure is shown now — the gap to the played opener — because a shared bias
cancels in a difference, and the ranking is the part that has survived checking.

### FIRST RANKING EVIDENCE — and it points against us  [OBS]

Battle **I** is the first fight at a different composition: **46/21/33** instead
of 50/15/35 — and against the *same beast* as battle H (Starving, 391.0/553.3,
161,700). Its troop row was shown in percentage mode; the enemy's 40/30/30
matches its own counts exactly, confirming that view is count share.

| split | our score | REAL result |
|---|---|---|
| 50/15/35 | −8.4% | **VICTORY +24.0%** |
| 46/21/33 | −2.9% | **DEFEAT −20.8%** |

**Our model rates 46/21/33 as +5.5 points BETTER. Reality had it lose while the
opener won** — 44.8 points apart on the same opponent.

Pooling everything:

| split | n | mean | sd | wins |
|---|---|---|---|---|
| 50/15/35 | 8 | **+15.1%** | 22.2 | 6/8 |
| 46/21/33 | 1 | −20.8% | — | 0/1 |

Difference **35.9 points**, standard error 23.6 → **1.5σ**. **Suggestive, not
conclusive.** One sample on the 46/21/33 side, against a per-battle σ of 22, is
entirely consistent with the two splits being equal.

This matters because it cuts against `FRONT_ROW_SPILL = 0.35`, which moved our
recommendation *toward* more Cavalry and fewer Infantry — exactly the direction
46/21/33 sits in. **Not reverting on n=1.** Flipping the model on a single
sample is the same error this file exists to record.

**UPDATE — battle J, a second fight at 46/21/33: WON.** The split is now 1–1
and the 1.5σ hint has evaporated. It was one sample against a per-battle σ of
22, which is exactly why it was not acted on. Holding the model unchanged was
the right call, and would still have been right had it gone the other way.

| split | n | wins |
|---|---|---|
| 50/15/35 | 8 | 6 (75%) |
| 46/21/33 | 2 | 1 (50%) |

Still nowhere near separable — 2 samples against σ=22. But the direction of
concern is gone, and `FRONT_ROW_SPILL = 0.35` is no longer contradicted.

**Also on record: the reference tool called battle J at 100% and was right**,
while this file's author hedged. One win does not validate a 100% claim — D and
E were identical fights that split — but the confident call was the useful one
that day and the hedge was not.

### What is NOT being changed yet, and why

Three points, **all at the same split**. A single composition cannot separate
"the counter is stronger" from "the stat combination is wrong" from "army size
matters more than stats" — every candidate fits three samples at one point.
Recalibrating here would repeat the exact error this whole file documents.

**Needed: battles at DIFFERENT splits.** Vary the composition and the candidate
explanations separate immediately, because they predict different things about
how the kill ratio moves as the mix changes.

---

## Evidence grades

- **[DOC]** — stated in published Kingshot mechanics guides, corroborated by
  at least two independent sources.
- **[IMPL]** — taken from a community implementation
  (`github.com/KnyCat/kingshot-combat-bot`). Someone else's reading of the
  game, not the game. Better than a guess, weaker than [DOC].
- **[OBS]** — measured from the player's own battle reports.
- **[OPEN]** — unresolved. Must not be silently guessed.

---

## 1. The damage formula  [IMPL]

```
kills = √(attackerCount)
      × (100 + Attack%) × (100 + Lethality%)          ← attacker's
      ÷ ((100 + Defense%) × (100 + Health%))          ← DEFENDER's
      × SkillMod
      × CounterBonus
      × SpecialMultiplier
      ÷ DefenseBonus
```

Points that matter:

- **Attack and Lethality multiply.** [DOC] confirms: "Attack and Lethality
  multiply together to set your kill output — they matter equally."
- **Defense and Health multiply, and they are the DEFENDER's.** Our old engine
  used the attacker's own values in places and mixed in invented per-type
  constants.
- **√ is per troop type, not per army.** √ is concave, so
  √a + √b > √(a+b): splitting across types yields more total damage than
  concentrating. This is the force that produces balanced compositions, and
  it is why the previous "make it linear" change pushed every answer to a
  corner.
- **There are no per-troop-type base stats.** Nothing corresponds to the old
  `T10_BASE` (attack 472/1416/1888, hp 1416/472/354, defense and lethality a
  flat 10). Troop types are differentiated **only** by counters and
  abilities. Those constants were fabricated — attack ran exactly 1×/3×/4×
  and hp exactly 4×/(4/3)×/1× — and they were the load-bearing input to
  every number the tool produced.

## 2. Counter triangle  [DOC]

Infantry → Cavalry → Archers → Infantry, **+10% damage** when countering.
Corroborated independently: Archers' *Ranged Strike* is +10% into Infantry,
Cavalry's *Charge* +10% into Archers.

The engine briefly ran this at 2.7×, fitted so the optimizer would stop
returning 0% Cavalry. That was wrong twice over: it contradicted the
documented figure, and it made the one checkable real outcome far worse.

**The triangle IS the troops' named abilities.** [DOC] Each type's "ability"
turns out to be its counter bonus under a different name:

| Type | Ability | Documented effect |
|---|---|---|
| Infantry | Master Brawler | +10% damage **against Cavalry** |
| Cavalry | Charge | +10% damage **against Archers** |
| Archers | Ranged Strike | +10% damage **against Infantry** |

All three are attack-side, and all three are the same +10% already applied as
`COUNTER_BONUS`.

**There is no defensive term, and we had one.** The engine also divided
incoming Cavalry damage by 1.10 and credited it to Master Brawler
(`INFANTRY_VS_CAVALRY_MITIGATION`) — so Infantry collected its counter
advantage **twice**, once going out and once coming in, while Cavalry and
Archers collected theirs once. Nothing documents a mitigation term. Removed.

One prose guide does say countering means you "deal increased damage and take
reduced damage from that type", which would make the counter reciprocal
(×1.10 out, ÷1.10 in). That reading was tested and rejected: three specific
ability descriptions outrank one line of prose, and the prose most likely
describes the same +10% from the defender's point of view.

## 3. Troop abilities  [DOC for existence, IMPL for exact numbers]

| Type | Ability | Effect |
|---|---|---|
| Cavalry | Ambusher | ~20% chance to **bypass the Infantry front line and strike Archers directly** |
| Archers | Volley / double shot | ~10% chance to fire twice → average multiplier 1.10 |
| Infantry | Master Brawler | bonus damage and mitigation vs Cavalry |

**Cavalry's Ambush is the whole reason Cavalry is worth taking.** Without it,
Cavalry never reaches what it counters and any optimizer correctly concludes
it is worthless — which is exactly what ours kept concluding. Modelling
Ambush makes Cavalry appear at a sane share with no coefficient fitting at
all (measured: 12–14%).

## 4. Battle structure  [DOC] — upgraded from [IMPL]

Row-based, and now corroborated by published mechanics rather than inferred
from one implementation:

- "Infantry stands in front and absorbs most incoming damage."
- "Archers occupy the Backline, ideally never touched."
- "Cavalry occupy the Middle line by default; become the new frontline as soon
  as infantry collapse."
- "Attacks normally target the frontline first; Cavalry can sometimes strike
  enemy Archers directly."

So the row order Infantry → Cavalry → Archers is right, and Cavalry's Ambush is
the only thing that reaches past the front row. **Ambusher is 20% of Cavalry
per round** — "one roll per round per cavalry-attacking fighter" — so the
`AMBUSH_SHARE = 0.20` split is the correct expected value, not a guess.

This was worth checking, because a second independent optimizer
(`github.com/Mridanc2/mystic-trial`) models targeting completely differently:
each line hits a *preferred* type (Infantry→Infantry, Cavalry→Archers,
Archers→Infantry) with no front row at all, plus a 1.20/0.85 two-sided
triangle. Swapping our targeting for theirs moved our answers materially
closer to a third tool's — and would have been wrong. The sources above
settle it in favour of what we already had. **The agreement metric was
pointing the wrong way; the sources were not.**

## 5. Hero / joiner skills  [IMPL]

```
SkillMod = (1 + DamageUp)(1 + OppDefenseDown)
         ÷ ((1 + OppDamageDown)(1 + DefenseUp))
```

Applies to PvP. **Mystic Trials has no heroes** except Coliseum and Radiant
Spire, so SkillMod is 1 elsewhere.

---

## 6. Mystic Trials is NOT PvP  [DOC]

These are different systems and must not share a model.

| | Mystic Trials | PvP field battle |
|---|---|---|
| Troops | **Game provides T10 troops** (except Radiant Spire, which uses your own — tier and army size both matter there) | Your own army |
| Stats used | **Only that zone's stat sources** | All of your combat stats |
| Heroes | None, except Coliseum and Radiant Spire | Heroes + up to 4 joiners |
| Casualties | **None — no hospital bill** | Real losses |
| Opponent | Fixed NPC per stage | Another player |
| You control | Only the split of a fixed total | Composition, heroes, joiners, march size |

### Per-room stat pools  [DOC] — verified, one error corrected

Each room tests **one account system in isolation**. This is the defining rule
of the event, not a footnote.

| Room | Opens | Stats that count | Heroes? | Opener |
|---|---|---|---|---|
| Coliseum | — | Heroes, Hero Gear, **Hero Exclusive Gear** | **yes** | 50/10/40 |
| Forest of Life | Wed & Thu | Pets, Pet Skills | **no** | 50/15/35 |
| Crystal Cave | Wed & Thu | Governor Charms | **no** | 60/20/20 |
| Knowledge Nexus | Fri & Sat | Academy Tech, War Academy Tech | **no** | 50/20/30 |
| Molten Fort | Fri & Sat | Governor Gear | **no** | 60/15/25 |
| Radiant Spire | — | Everything: heroes, hero gear and exclusive gear, pets, pet skills, charms, governor gear, both academies, Skins, Oasis Island, VIP — and **your own soldiers** | **yes** | 50/15/35 |

- **Correction:** Coliseum was recorded as "heroes, hero gear, **widgets**".
  The third source is **Hero Exclusive Gear**. Fixed.
- **[DOC]** "Forest of Life, Crystal Cave, Knowledge Nexus, and Molten Fort do
  not let you select heroes." Four of the six rooms have **no heroes on either
  side** — so there is no hero skill modifier to apply, and no enemy hero to
  compensate for. `heroesApply` is that game rule, not a modelling shortcut.
- Radiant Spire is the only room fought with your own soldiers, so troop tier
  and army size matter there and nowhere else.

**This was known in the engine and invisible in the product.** `MYSTIC_ZONES`
carried `sources` and `heroesApply` correctly, but the page never showed either:
`hasHeroes` was computed and never rendered, the instructions told every player
to compensate for enemy heroes in all six rooms, and the only place the stat
pool was ever named was inside the "unwinnable" panel — so removing that panel
removed the last mention of it. The room rule is now shown on selection.

This is why the same player's two reports show ~180% bonuses in Knowledge
Nexus and ~897% in Molten Fort. Both are correct; they are different stat
pools. The report's Bonus Details already shows the **effective** figures for
that zone, so those numbers are the right input.

Baseline formation reported by players: **50/20/30**.

---

## 7. Reading a battle report  [OBS]

- **Left column = you, right column = opponent.**
- Red/green marks **which side is higher**, not which side is which. In the
  Molten Fort report the player's 205.0 Lethality is green while the
  opponent's 186.0 is red, and the same report has the player's 897.4 Attack
  red against the opponent's 1051.0 green. Colour is a comparison, not an
  owner.
- Troop counts sit in one row under the portraits: your three, then theirs.

---

## 8. Troop tier  [DOC]

A full T11 army carries **"roughly 15 to 20 percent more stats than T10
across the board"**. Midpoint 1.175, expressed relative to T10 (what Mystic
hands you, and where most PvP is fought).

This is far bigger than it looks. The multiplier lands on each of the four
stats, so it enters offence as Attack x Lethality and defence as
Defense x Health — t² each way — and the two compound. **T11 against T10 is a
~1.9x swing in the damage ratio, not 17.5%.**

This resolved open question 1. In Knowledge Nexus the opponent held a **2.02x**
per-troop stat edge, so every wipe-based model said the player should be
routed — and they won. They were **T11 against the stage's T10** (confirmed by
the player: the "Lv." under each portrait is troop tier).
2.02 / 1.91 = **1.06**, near parity. That matches the outcome and the ~40%
an established tool gave the same fight.

[OPEN] Only the T10/T11 gap is sourced. Lower tiers assume the same step
compounding downward and are approximations.

---

## 9. Validation status

Grid-searched at 1% resolution (5,151 splits) against the player's three real
reports, with nothing fitted — every constant is sourced above.

| | our optimum | clears? | Frakinator | off by | opener |
|---|---|---|---|---|---|
| Knowledge Nexus (T11 vs T10) | **58/18/24** | **yes** ✅ | 57/15/27 | **7** | 50/20/30 |
| Molten Fort (T10 vs T10) | 67/13/20 | no | 52/21/27 | 30 | 60/15/25 |
| Forest of Life (T10 vs T10) | 65/17/18 | no | 46/21/33 | 38 | 50/15/35 |

Removing the double-counted mitigation moved total disagreement with
Frakinator from 83 → 75 and left the Knowledge Nexus call intact (still a
clear, still 7 off). It is a correction on evidence, not a tuning win.

### What the disagreement is actually worth

The remaining gap looked much worse than it is. Scoring our split, Frakinator's
split and the community opener on the same scale:

| | ours | Frakinator | opener | spread |
|---|---|---|---|---|
| Knowledge Nexus | 39.6% | 37.7% | 38.8% | **1.9 pts** |
| Molten Fort | −25.2% | −27.8% | −26.1% | **2.5 pts** |
| Forest of Life | −18.6% | −23.0% | −22.6% | **4.4 pts** |

**The objective is flat.** On Knowledge Nexus 203 of 5,151 splits score within
one point of the winner, and the near-optimal band (46–64 / 10–26 / 18–35)
contains *both* Frakinator's answer and the played opener. Quoting one split to
the percent claims a precision the model does not have — which is why a small
change in assumptions swings the headline ten points on Infantry while barely
moving the player's actual outcome. Both optimizers now return the whole band,
and the UI shows a range.

### The bigger defect was not the number

On Molten Fort and Forest of Life **no split clears the stage** — all 5,151
lose. We were printing "Recommended Split" over them anyway, with no indication
the fight was lost under every composition. That is what made a losing report
come back looking like a plan. Both tools now state the verdict outright and
name what has to come up instead (the zone's stat sources), and that verdict
travels into the downloaded report.

The other optimizer independently reached the same conclusion about this class
of fight — its UI strings include *"All ratios statistically tied — battle is
unwinnable"* and *"The recommended ratio is just the least-bad option, not a
winning strategy."*

### The Infantry bias: found, and fixed  [OBS]

Four Forest of Life reports from the same player, plus Molten Fort and
Knowledge Nexus. Our Archer share against two independent references:

| | archers |
|---|---|
| community opener (Forest of Life) | 35% |
| Frakinator, four runs | 33, 21, 33, 33 |
| **ours** | **20%** |

We were the outlier against both. That is not one tool's noise.

**Cause.** The front row absorbed **100%** of every volley until it died, so a
troop behind the wall dealt full damage for free and the optimiser correctly
concluded the best use of any troop was to *be* the wall. But the sources say
Infantry "absorbs **most** incoming damage" and Archers are "**ideally** never
touched". Most is not all; ideally is not always. Modelling the remainder as
zero was our choice, not the game's.

**`FRONT_ROW_SPILL = 0.30`** — the share of a volley that reaches past the front
row. Swept 0–0.45 against five real reports across three zones, scored against
two independent targets simultaneously:

| spill | vs Frakinator | vs community openers | combined |
|---|---|---|---|
| 0.00 | 110 | 130 | 240 |
| 0.20 | 74 | 84 | 158 |
| **0.30** | **60** | **70** | **130** |
| 0.40 | 82 | 80 | 162 |

Halves the disagreement with both at once, sits inside what "absorbs most"
allows, and Knowledge Nexus — the one fight with a known real outcome — still
resolves as the win it actually was (+39%). Molten Fort went from 34 points off
Frakinator to 6.

**This is the only fitted number in the engine, and the distinction from the
2.7× counter matters:** that bent a *documented* constant to match one tool's
output. This is an *undocumented* structural quantity, bounded by its source,
calibrated against two independent references over five reports.

Before/after on the newest report (163,500 vs 161,500, they are 8% stronger per
troop): **65/15/20 → 54/19/27**, against Frakinator's 52/15/33 and the opener
50/15/35.

### Calibration data collection  [in progress]

`src/lib/combat/outcomeLog.js` + a control under the Mystic result.

The problem it exists to solve: every constant in the engine is either published
mechanics or — in the single case of `FRONT_ROW_SPILL` — fitted to two proxy
references. Neither is ground truth, and the reference optimizer's own answer
scatters up to 18 points on the same fight, so it cannot be matched more closely
in any meaningful sense. Against **one** known real outcome and **one** fitted
parameter, there is nothing here that deserves the word calibration.

Collection is nearly free: a Mystic battle report is **post-battle**, so the
counts and bonuses already entered *are* the composition that was fielded. The
only missing bit is whether it cleared. One tap.

Each entry stores:

| field | why |
|---|---|
| `played` | the split actually fielded, derived from the entered counts |
| `you` / `enemy` | full per-type counts and stats, both sides |
| `zone`, `at` | which room, when |
| `outcome` | cleared / lost — the label being fitted to |
| `predicted` | the model's split, its score, **and the `spill` in force** |

`predicted.spill` matters: it makes each row attributable to a model version, so
a later fit can score the prediction rather than only re-deriving from scratch.

localStorage only, exported on demand. Target: 10–15 battles with a mix of
outcomes, ideally some close ones, since the decision boundary is what a
pass/fail label locates.

### Seven reports: our mean is inside their scatter on every axis  [OBS]

| | infantry | cavalry | archers |
|---|---|---|---|
| ours | 51.3 **±0.5** | 21.0 **±0.0** | 27.7 **±0.5** |
| Frakinator | 50.9 **±4.6** | 19.3 **±4.2** | 29.6 **±6.3** |
| **gap in means** | **+0.4** | **+1.7** | **−1.9** |

Their run-to-run range over seven near-identical fights: infantry **46–57**,
cavalry **15–27**, archers **21–39**. Every axis swings 11–18 points on the same
fight. The ~3-point cavalry residual noted at six reports closed to 1.7 when
their cavalry answer jumped 15 → 27 on report #7 — it was their scatter, not our
bias.

**Our stability is correct, not stuck.** Cavalry comes out at exactly 21.0 in all
seven, which looks suspicious until you notice the enemy is **40/30/30 in every
one of them**. Varying the enemy mix, our answer does move:

| enemy mix | our answer |
|---|---|
| 40/30/30 | 52/21/27 |
| 60/20/20 | 48/25/27 |
| 20/60/20 | 43/25/32 |
| 20/20/60 | 50/23/27 |

The best counter-mix is set by the enemy's *mix*; the strength ratio decides
whether you win, not what to field. Against a fixed 40/30/30 the answer *should*
barely move — so the reference swinging 18 points on archers is noise, and this
is the ceiling of what calibrating against it can achieve.

### Six reports: our mean matches, their variance does not  [OBS]

Six Forest of Life reports, same player, same week, near-identical inputs.
Optimum on a full 5,151-split grid each time:

| | infantry | cavalry | archers |
|---|---|---|---|
| ours | 53.5 **±1.0** | 20.0 **±0.8** | 26.5 **±0.5** |
| Frakinator | 51.7 **±4.5** | 18.0 **±3.0** | 30.0 **±6.7** |

Their Archer share across those six near-identical fights: **21, 33, 33, 21, 39,
33**. Ours: 26, 26, 27, 27, 27, 26. Reports #4 and #6 have *identical* player
counts and enemy stats within 3 points, and they returned 52/15/33 and 46/15/39.
That is Monte Carlo scatter in the reference, and it means **per-report exact
agreement is not achievable** — there is no fixed number to hit.

So `FRONT_ROW_SPILL` was re-calibrated against the **mean** of the references
rather than individual samples, which is the correct target for a noisy signal:

| spill | our mean | vs Frakinator mean | vs opener | combined |
|---|---|---|---|---|
| 0.30 | 53.5 / 20.0 / 26.5 | 7.3 | 17.0 | 24.3 |
| **0.35** | **51.2 / 21.0 / 27.8** | **5.7** | **14.3** | **20.0** |
| 0.40 | 48.8 / 22.0 / 29.2 | 7.7 | 14.0 | 21.7 |

0.35 lands our mean within ~1 point of the reference on Infantry and ~2 on
Archers. Knowledge Nexus still resolves as the win it actually was (+38.4%), and
**Molten Fort now reproduces the reference answer 52/21/27 exactly**.

Residual on cavalry: we run ~3 points high and that has not moved with spill.
Left open rather than fitted away.

### Validation after the spill fix: the two models now track each other  [OBS]

Four Forest of Life reports from the same player, same week, near-identical
inputs. Recomputed on a full 5,151-split grid:

| report | ours | Frakinator | apart | our score | Frakinator |
|---|---|---|---|---|---|
| #2 | 54/20/26 | 57/21/21 | 9 | −18.8% | 50% win |
| #3 | 52/21/27 | 52/15/33 | 12 | −16.0% | 50% win |
| #4 | 54/19/27 | 52/15/33 | 12 | −11.8% | 70% win |
| #5 | 53/20/27 | 57/21/21 | 11 | **+7.4%** | **90% win** |

Two things fall out.

**1. The scores move together.** As Frakinator's win chance climbs 50 → 50 → 70
→ 90, our score climbs −18.8 → −16.0 → −11.8 → +7.4, monotonically, and our sign
flips positive exactly where they reach 90%. Two independently-built models
ordering four near-identical fights the same way is the strongest validation
available without ground truth. Total split disagreement is **44** across four
reports, down from 110+ before the spill fix.

**2. Our answers are the stable ones.** Across four nearly-identical inputs:

- ours: 54/20/26, 52/21/27, 54/19/27, 53/20/27 — a 2-point spread
- Frakinator: 57/21/21, 52/15/33, 52/15/33, 57/21/21 — a **12-point** swing on
  Archers between runs

That is Monte Carlo noise in their tool, and it is why the remaining ~11 points
of disagreement should not be chased further: half of it is not a fixed target.
Our deterministic read is the more repeatable of the two.

What still differs is the **zero point** — we score −16% where they say 50%.
Mapping our score onto a win probability would need calibration against far more
than four coarse (50/50/70/90) reference values from a single noisy tool, so no
probability is published. See §10 open question 8.

### A wrong input was invisible  [OBS]

A report was optimised as **203,775** troops when it was **163,500**:

    81,750 (your Infantry) + 57,225 (your Archers) + 64,800 (the ENEMY's Infantry)

The player's Cavalry, 24,525, was missing and the opponent's Infantry had taken
its place. That inflated total turned a −11% result into **+44.2%** and a
+90,036 troop margin — a losing fight reported as comfortably won. The result
showed the *recommended* per-type counts and a total but never the three numbers
entered, so there was nothing on screen to check against. It now echoes them.

### The verdict was the defect, not the split  [OBS]

A third Forest of Life report, transcribed exactly from the Battle Details
screen (earlier notes had 403.0/570.5 and counts 64,960/48,720 — both slightly
wrong; correct values are below):

| | mine | theirs |
|---|---|---|
| Attack / Defense | 577.3 / 543.1 | 400.0 / 400.0 |
| Lethality / Health | 388.1 / 368.6 | 566.7 / 566.7 |
| Troops | 163,500 (81,750 / 24,525 / 57,225) | 162,300 (64,920 / 48,690 / 48,690) |

They are **11.5% stronger per troop** with essentially equal numbers.

**On the split we and Frakinator agree almost exactly.** Scored on the same
full 5,151-split grid:

| split | score | rank |
|---|---|---|
| our 60/15/25 | −16.7% | 95 |
| Frakinator 57/21/21 | −16.7% | 96 |
| as played 50/15/35 | −23.2% | 677 |
| classic 50/25/25 | −19.5% | 340 |

Two picks, 0.1 points and one rank apart. **The composition question is settled;
it was never the problem.**

**The disagreement is entirely the verdict.** Frakinator: ~50% chance to win.
Ours: "NO SPLIT CLEARS THIS STAGE — the least-bad way to lose — come back when
your bonuses are higher."

### Randomness: measured, and it does not rescue the verdict

[DOC] The engine resolves "over several turns, each broken up into multiple
exchanges", where each round depends on "current stats, remaining troop count,
**which hero abilities trigger that round**". So ability triggers are per-round
and army-wide, not per-troop averages — and battle simulators offer "fast mode
for a stable read, or **Monte Carlo** when you want to see the effect of
skill-roll variance". The engine now supports both (`rng` on `runBattle`,
`simulateOutcomes`).

Rolling Ambusher (20%) and Volley (10%) per round, 300–600 runs:

| split | fast-mode | Monte Carlo mean ± sd | wins | σ from even |
|---|---|---|---|---|
| 60/15/25 | −17.0% | −15.7% ± 1.5 | **0 / 600** | 10.7 |
| 57/21/21 | −17.4% | −16.2% ± 2.1 | **0 / 600** | 7.6 |
| 50/15/35 | −23.2% | −23.5% ± 2.2 | **0 / 600** | 10.9 |

A ±2-point spread that never crosses zero. **The documented randomness cannot
turn this into a coin flip**, so no amount of it explains Frakinator's 50%. That
is a negative result and it is recorded as one — the temptation was to inflate
the variance until 50% appeared, which is the 2.7× counter mistake again.

### What was actually done about it

Our model is 7.6–10.9σ certain of a loss. An established tool says 50%. One of
them is badly wrong and nothing in the model can say which. But there is a prior:
**the only fight with a known real outcome — Knowledge Nexus — was a win that
this model scored as a heavy loss.** The absolute verdict has failed every time
it has been checkable, in the same direction.

So the win/lose call is gone from both tools. The result now returns a
comparative score (validated), the near-optimal band, and the Monte Carlo spread
as an error bar — and says in the UI that it ranks splits and does not predict
outcomes. A model that is confidently wrong about whether a stage is winnable is
worse than one that declines to say.

**This was a self-inflicted regression.** `MysticSuite.jsx` already carried a
comment saying the absolute verdict "has not survived that check ... so stating
one here would be asserting something we've measured to be wrong". A red
"unwinnable" panel was then added directly beneath it.

### A search that could not reach its own answer

Default bounds were opener ±15/10/10. On Forest of Life (opener 50/15/35) that
floors Archers at 25%, so Frakinator's 57/21/**21** and our own unbounded
optimum 64/16/**20** were both outside the search — only 23 splits were tested,
and neither answer was among them. Widened to ±20 (56 splits; the tool now
returns 65/15/20, next to the unbounded 64/16/20).

### The constants are not the problem — the structure is

Swept the three constants whose sources give a range or an approximation rather
than an exact figure (tier 1.15–1.20, Ambush 0.15–0.25, Volley 1.05–1.15), at
1% grid, over all three reports:

| setting | Knowledge Nexus | Molten Fort | Forest of Life |
|---|---|---|---|
| shipped (1.175 / 0.20 / 1.10) | 58/18/24 | 67/13/20 | 65/17/18 |
| all low | 61/18/21 | 69/13/18 | 68/16/16 |
| all high | 51/19/30 | 66/14/20 | 63/15/22 |
| **full spread** | **51–61 / 17–21 / 21–30** | **66–69 / 13–14 / 18–20** | **63–68 / 15–17 / 16–22** |

Knowledge Nexus clears under every combination. Two conclusions:

1. **The recommendation is stable.** The optimum moves at most ±5 points on
   Infantry across the entire sourced uncertainty, well inside the
   near-optimal band the UI already reports. The band is not overstating.
2. **The disagreement with other tools survives all of it.** Molten Fort stays
   at 66–69% Infantry against Frakinator's 52; Forest of Life at 63–68 against
   46. No combination of sourced constants comes close. **The residual gap is
   structural, not a matter of tuning.**

### What the structure actually is

Decomposing one Forest of Life fight names it:

| split | turns survived | total damage dealt | opening damage/turn | turns the front row holds |
|---|---|---|---|---|
| 33/33/34 | 302 | 111,764 | **746** (highest) | 77 |
| 46/21/33 | 319 | 118,036 | 736 | 114 |
| 65/17/18 | **347** | **129,353** | 694 (lowest) | **182** |

Spreading troops evenly gives the **highest** instantaneous output — that is
√-concavity working as expected. It still loses, because it deals the **least**
damage overall.

The reason is a property of the damage equation that is easy to miss:
**damage depends on the attacker's own count and nothing else.** The defender's
headcount never enters it. Combined with front-row targeting, that means a
troop parked behind the wall deals its *full* output every round until the wall
in front of it collapses — being protected costs nothing. So the optimizer
correctly concludes that the best use of a troop is to be the wall, and lands
at 63–68% Infantry.

The other implementation has no wall at all (§4) — every row is exposed to a
preferred attacker from round one, so nothing is ever protected, and it lands
much lower on Infantry. **Our answer and theirs differ almost entirely because
of this one structural choice**, and the published mechanics support ours:
Infantry front, Archers backline "ideally never touched", Cavalry's Ambusher as
the one documented way past.

The hedge in that phrasing — "absorbs *most* incoming damage", "*ideally* never
touched" — is the open edge. If the wall leaks, our Infantry share is too high
by roughly the amount it leaks.

**What would settle it:** one real battle report from a fight where neither
side was wiped, showing per-type losses. If Archers lost troops while Infantry
was still standing, the wall leaks and our model over-protects the back rows.
If Archer losses stay near zero until Infantry collapses, our model is right
and the tools that disagree with us are wrong. Mystic Trials cannot supply this
(no casualties) — it needs a PvP or rally report. Do not pick a leak rate
without it; that is the same mistake as the 2.7x counter.

### Hypotheses tested and rejected

Recorded so they are not re-tried:

1. **The √count exponent.** Swept E over 0.5–1.0 against all three reports.
   Best was E=0.6 (total error 75 vs 83 at E=0.5) — 8 points of 83 — and the
   model degenerates to corner solutions above E=0.7. Not the cause.
2. **The ranking objective.** Swapped survival edge for "destroy the enemy"
   and for lexicographic win-then-cheapest. Identical results on Molten Fort
   and Forest of Life, and much worse on Knowledge Nexus. The identical
   results turned out to be a degeneracy, not a clue: on those two stages every
   split loses the entire army, so survival edge *is* −(enemy remaining) and
   the two objectives are the same function.
3. **Preferred-target instead of front-row targeting** (§4). Improved
   agreement, contradicted by the sources. Rejected.
4. **Raising Cavalry's reach past the front line.** Sweeping it to ~0.6 cut
   total disagreement from 83 to 45 — the single largest improvement found
   anywhere. Rejected: Ambusher is documented at 20% per round (§4), and
   fitting an open parameter to three points of another tool's output is
   exactly the mistake that produced the 2.7× counter.

---

## 10. Open questions  [OPEN] — do not guess these

1. ~~Knowledge Nexus was a win no model reproduced~~ — **resolved**: troop tier
   (§8).
2. ~~What is the "Lv." under each portrait~~ — **resolved**: troop tier,
   confirmed by the player.
3. **Is damage really sqrt(count)?** Still [IMPL] — but now from **two**
   independent implementations that agree on the whole shape: √troops,
   Attack × Lethality on top, the **defender's** Defense × Health underneath.
   Swept in §9 and 0.5 is close to best. This is as settled as it gets without
   game data.
4. ~~Is a Mystic stage won by wiping the enemy, or by score?~~ — **partly
   resolved**: guides describe stage *progression* scoring ("get as far as you
   can"), and "an attempt is only spent when you lose", so an individual stage
   is pass/fail and the score is how deep you got. Wipe-based resolution per
   stage is the right model. What still isn't confirmed is whether a stage can
   end on a round limit rather than a wipe.
5. ~~Exact Ambush probability~~ — **resolved**: 20% of Cavalry per round, one
   roll per round (§4). Archers' Volley (10% chance to fire twice, so ×1.10
   expected) is corroborated but still [IMPL] on the exact figure.
6. **TrueGold (TG0–TG8)** boosts T10 troops and is a separate axis from tier;
   the UI collects it but no model uses it.
7. **Lower-tier multipliers** (T1–T6, T7–T9) are extrapolated, not sourced.
8. ~~Why we stay heavier on Infantry than players field.~~ — **inverted, and
   the premise was wrong.** Paired real outcomes (§11) say the player's own
   Infantry-heavy split wins more often than the Cavalry-heavier answer we had
   been chasing. The gap being closed was a gap against a proxy tool, not
   against the game. Retained below for the method:

   Now narrowed, not resolved. It is **not** the constants (§9 sweeps them all) and **not** the
   sqrt exponent or the ranking objective (both rejected below). It is the
   combination of front-row targeting with a damage term that ignores the
   defender's headcount, which makes a protected back row free. Settling it
   needs a real report with per-type losses; see §9. The Monte Carlo theory
   that established tools rank by win probability is a separate matter and
   would not by itself close a gap this size, since the two documented random
   elements (Ambush 20%, Volley 10%) are per-troop and average out almost
   exactly at army scale.

---

## 11. `FRONT_ROW_SPILL` re-fitted on real outcomes: 0.35 → 0.20  [OBS]

### The paired data that forced it

Four Crystal Cave battles arrived, and two of them form a **second paired
comparison** — the same beast fought at two different splits, which controls
the opponent and cancels most of the per-battle noise. There are now two such
pairs, in two different rooms:

| room | beast | 50/15/35 | 46/21/33 |
|---|---|---|---|
| Forest of Life | Starving 391/553.3 | **WON +24.0** | LOST −20.8 |
| Crystal Cave | Cesares Appraiser 77/690 | **WON +33.3** | LOST −38.4 |

Reality ranked 50/15/35 above 46/21/33 both times, by 44.8 and 71.7 points.
At `FRONT_ROW_SPILL = 0.35` our model ranked it the **other way** both times.

### The level fit cannot see this parameter at all

Before changing anything, the obvious check: does the size of the wins pin
spill down? Thirteen battles with recorded losses (nine Forest of Life, four
Crystal Cave), `research/spill-mae.mjs`:

| spill | MAE all | MAE FoL | MAE CC | bias | sign right |
|---|---|---|---|---|---|
| 0.00 | 19.3 | 17.6 | 23.1 | +3.9 | 9/13 |
| 0.10 | 19.4 | 17.8 | 23.0 | +3.7 | 9/13 |
| 0.20 | 19.3 | 17.5 | 23.2 | +3.4 | 9/13 |
| 0.30 | 19.2 | 17.3 | 23.5 | +2.6 | 9/13 |
| 0.35 | 19.3 | 17.4 | 23.8 | +1.5 | 9/13 |

**Flat.** Sweeping the parameter end to end moves MAE by 0.2 points and moves
sign accuracy not at all. So `FRONT_ROW_SPILL` is **not identifiable from the
level data**, and the original calibration table — which read a clean optimum
at 0.35 out of six proxy reports — was reading structure out of noise.

### What does discriminate it

Only the paired data. `research/fit-spill2.mjs`, scoring 50/15/35 minus
46/21/33 (positive = ranked the way reality ranked them):

| spill | FoL pair | CC pair | ranks correctly |
|---|---|---|---|
| 0.00 | +0.4 | +1.5 | 2/2 |
| 0.10 | +0.2 | +1.6 | 2/2 |
| 0.20 | +0.1 | +0.8 | **2/2** |
| 0.25 | −0.1 | +0.4 | 1/2 |
| 0.30 | −0.5 | −0.2 | 0/2 |
| 0.35 | −1.7 | −1.4 | 0/2 |

**0.20** is the top of the range that gets both right with clearance from the
sign flip. Changed.

### `STAT_PAIR_WEIGHT` re-checked jointly, and it holds

Spill and the stat-pair weight are coupled — both change which troop takes
damage — so W was re-fitted at the new spill rather than assumed to carry over
(`research/fit-weight2.mjs`):

| W | MAE all | MAE FoL | bias | pairs right |
|---|---|---|---|---|
| 1.06 | 20.1 | 18.7 | −4.1 | 1/2 |
| **1.09** | **19.3** | **17.5** | +3.4 | **2/2** |
| 1.12 | 20.7 | 19.6 | +8.3 | 1/2 |

1.09 is still both the MAE minimum and the only value that ranks both pairs
correctly. The two parameters are not fighting each other. `STAT_PAIR_WEIGHT`
stays at 1.09, unchanged.

### An out-of-sample check nobody arranged

The original spill fit used six reports across **three** zones: Knowledge
Nexus, Molten Fort, Forest of Life. Crystal Cave was not in it. Crystal Cave's
documented community opener is **60/20/20** — far more Infantry-heavy than
Forest of Life's 50/15/35.

At the new spill the optimizer returns **61/16/23** for Crystal Cave. At the
old 0.35 it returned ~55/19/26. The move is toward a documented opener that
played no part in the fit.

### Two caveats, stated because this constant is weakly identified

1. **n = 2 pairs.** A sign test on two agreements gives p = 0.25. This is not
   proof. It is the best evidence available, and it replaces a basis that was
   a third-party tool's average answer — a proxy, not ground truth.
2. **Our own separation on those pairs is 0.1–1.5 points**, against real gaps
   of 44.8 and 71.7 and a measured noise floor of ~17. The model does not
   genuinely *see* the difference between these two splits; it is picking a
   side of a coin. What changed is which side, and the side now agrees with
   the player's record: 50/15/35 is **7W–4L**, 46/21/33 is **1W–2L**.

### The flatness is now surfaced, not hidden

`research/spill-flat.mjs` measures how sharp the optimum is. At spill 0.20, on
Forest of Life, **28 of 1326 splits score within one point** of the winner,
spanning 48–58 / 14–24 / 22–34. Both candidate splits sit inside that band.

That band is what the UI reports. The engine's quote for the player's own
Forest of Life fight is now:

```
RECOMMENDED   53 / 19 / 28
also fine     47–59 / 13–25 / 22–34   (105 of 5151 within a point)
you fielded   50 / 15 / 35
vs your split      +1.2 pts
```

Which is the honest answer: *what you are already playing is fine, and this is
a marginal tweak inside the noise* — not the previous implication that a
different split was clearly better.

### What this supersedes

- §9's spill calibration table (fitted to reference-tool means) — **superseded**.
  It is retained above as a record of the method, not as live justification.
- The §"UPDATE — battle J" conclusion that "`FRONT_ROW_SPILL = 0.35` is no
  longer contradicted" — **superseded**. It is contradicted, by paired data
  that did not exist then. Holding at n=1 and n=2 unpaired was still correct;
  paired samples are worth far more than unpaired ones, which is the lesson.
