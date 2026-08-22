# Kingshot combat — research notes

Groundwork for rebuilding Battle Lab's combat models. Everything here is
labelled by how well it is established. Nothing goes into code as a bare
number without a line in this file.

Written after the previous model was found to be built on invented constants.
The failure mode to avoid: fitting our numbers to another calculator's output
and calling it validation.

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

Per-zone stat sources (already encoded in `MYSTIC_TRIALS` in the engine):

| Zone | Stats that count | Played opener |
|---|---|---|
| Coliseum | heroes, hero gear, widgets | 50/10/40 |
| Forest of Life | pets, pet skills | 50/15/35 |
| Crystal Cave | governor charms | 60/20/20 |
| Knowledge Nexus | academy, war academy | 50/20/30 |
| Molten Fort | governor gear | 60/15/25 |
| Radiant Spire | everything | 50/15/35 |

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
8. **Why we stay heavier on Infantry than players field.** Now narrowed, not
   resolved. It is **not** the constants (§9 sweeps them all) and **not** the
   sqrt exponent or the ranking objective (both rejected below). It is the
   combination of front-row targeting with a damage term that ignores the
   defender's headcount, which makes a protected back row free. Settling it
   needs a real report with per-type losses; see §9. The Monte Carlo theory
   that established tools rank by win probability is a separate matter and
   would not by itself close a gap this size, since the two documented random
   elements (Ambush 20%, Volley 10%) are per-troop and average out almost
   exactly at army scale.
