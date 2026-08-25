# Bear model: what was measured

The Bear code in `src/lib/combat/bearOptimizer.js` used to be derived from the
Bear theory post that circulates in-game. This is what it looks like when the
same inputs are put through the reference Bear calculator (Frakinator) instead,
one widget at a time, reading its answer back over its own websocket. Its source
is private, so nothing here is copied from it — every number below is an
observation of its output, and `research/bear-reference-check.mjs` replays all of
them against our engine.

## Composition

The reference returns a whole-percent INF/CAV/ARC split.

| Attack / Lethality per type | Reference | Ours |
| --- | --- | --- |
| INF 250/140 · CAV 310/190 · ARC 180/260 | 2/38/60 | 2/38/60 |
| INF 500/500 · CAV 100/100 · ARC 300/50 | 60/7/33 | 60/7/33 |
| all zero | 3/31/66 | 3/31/66 |

Two things fall out of this that the old model had wrong.

**Tier does not enter the split.** All four of the reference's tier settings
(T1-T6, T7-TG2, TG3-TG4, TG5-TG7) return the same answer for the same stats. We
were multiplying the Archer coefficient by an extra 1.1 above T6, which turned
3/31/66 into 3/27/70 — a wrong recommendation for every account past T6, which
is most of them.

**Lead heroes do not enter the split either.** Same three stat sets, every hero
option in each of the three dropdowns: the split never moves. Alcar was carrying
a x2.80 Infantry coefficient in our model, enough on its own to swing a
recommendation by fifty points.

What remains is the published closed form with an Archer weight of 4.4/3:

```
D ∝ (A_inf/3)·√f_inf + A_cav·√f_cav + (4.4/3)·A_arc·√f_arc
A = (1 + attack/100)(1 + lethality/100)
```

maximised by `f_i = A_i² / ΣA²`, then rounded to whole percent.

## Damage

The reference plots a distribution rather than a single number, so each
measurement is the observed range over repeats. All at 400% attack and 400%
lethality on every type.

| Rally | Reference | Ours |
| --- | --- | --- |
| 200k infantry | 1.71M – 1.79M | 1.75M |
| 800k infantry | 3.45M – 3.60M | 3.50M |
| 200k cavalry | 5.11M – 5.33M | 5.25M |
| 200k archers | 8.18M – 8.58M | 8.47M |
| 100k of each | 11.99M – 12.42M | 12.25M |
| 100k cavalry + 100k archers | 10.05M – 10.43M | 10.28M |
| 100k infantry + 100k archers | 7.27M – 7.55M | 7.66M |

Four things had to be measured to land inside those ranges:

- **Scale.** 565 damage points per √troop per unit of stat factor. Doubling
  troops multiplies damage by √2, confirmed at 100k / 200k / 800k.
- **Attack is diluted, lethality is not.** Doubling `(1 + lethality)` doubles
  damage exactly. Attack moves damage by 0.789 per 100% instead of 1.0 —
  measured across 100/200/400/800/1600% — so roughly a fifth of Bear damage
  isn't attack-scaled. This applies to damage only; the composition tool weights
  the two stats equally, and using the diluted factor there moves the split off
  the reference.
- **Archers gain another 1.1 in damage** that the composition tool doesn't
  apply: at equal stats the damage figures put Archers 1.60x above Cavalry where
  the composition weights alone predict 1.47x. Hence separate `RATIO_WEIGHTS`
  and `DAMAGE_WEIGHTS`.
- **Fielding a second type is worth ~6%**, and a third ~12%, over the same
  troops sent as single-type rallies. It is a property of the reference's
  round-by-round simulation that the closed form doesn't carry, so it is applied
  as the measured factor.

Single-type rallies land within 2%, mixed splits within about 5% of the
midpoint of the reference's range.

## Not yet measured

- Joiner and widget semantics. Both change the reference's output, but not yet
  isolated cleanly enough to fit; our joiner model is unchanged.
- The width of the damage distribution. We report a mean that matches; the
  spread around it in the dashboard is still a modeled projection.
- Mystic Trials and PvP.
