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

**Defensive side** [IMPL]: Infantry takes **10% less** damage from Cavalry
(divides damage). This is the "Master Brawler" effect.

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

## 4. Battle structure  [IMPL]

Row-based. Every line attacks the enemy's **front row**, in the order
Infantry → Cavalry → Archers. The battle ends when one side has no rows left.
Cavalry's Ambush is the only thing that reaches past the front row.

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

Grid-searched at 1% resolution (5,151 splits) against the player's two real
reports, with nothing fitted — every constant is sourced above.

| | our optimum | clears? | Frakinator | off by | played opener | Cavalry |
|---|---|---|---|---|---|---|
| Knowledge Nexus (T11 vs T10) | **54/19/27** | **yes** ✅ | 57/15/27 | **7** | 50/20/30 | 19% |
| Molten Fort (T10 vs T10) | 69/12/19 | no | 52/21/27 | 34 | 60/15/25 | 12% |

**Knowledge Nexus is a genuine three-way agreement** — our answer, Frakinator's,
and the community opener all cluster at roughly 50-57 / 15-20 / 27-30, and the
model correctly says the stage clears, which is what happened.

**Molten Fort still leans too heavily on Infantry** (69 vs a real-world 52-60)
and too light on Archers (19 vs 25-27). Note it sits *between* the opener (60)
and Frakinator (52) on Infantry, so it is not absurd — but the bias is real and
shows up in the even matchup where no tier edge masks it. Suspected cause
unchanged: damage scales as sqrt(count) while a troop's worth as a shield
scales linearly, so the front line always looks better than it is. Whether the
real game's damage is truly sqrt(count) is [IMPL], not [DOC] — it is the single
least-verified load-bearing choice remaining.

---

## 10. Open questions  [OPEN] — do not guess these

1. ~~Knowledge Nexus was a win no model reproduced~~ — **resolved**: troop tier
   (§8).
2. ~~What is the "Lv." under each portrait~~ — **resolved**: troop tier,
   confirmed by the player.
3. **Is damage really sqrt(count)?** [IMPL] only, and it drives the whole
   composition answer — it is why Archers come out low.
4. **Is a Mystic stage won by wiping the enemy, or by surviving / scoring?**
   Guides describe clearing stages but never state the victory test.
5. **Exact Ambush and Volley probabilities** — 20% and 10% are [IMPL].
6. **TrueGold (TG0-TG8)** boosts T10 troops and is a separate axis from tier;
   the UI collects it but no model uses it.
7. **Lower-tier multipliers** (T1-T6, T7-T9) are extrapolated, not sourced.
