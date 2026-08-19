# Battle Lab — Model & Provenance

Battle Lab is an original Kingdom 846 feature implemented independently in React/JavaScript.

## Clean-room approach

The implementation in this repository does **not** use or reproduce Frakinator source code, Streamlit code, assets, CSS, wording, screenshots, branding, or page layout. Frakinator was treated only as evidence that Kingshot players find formation optimization useful.

Battle Lab's code, component structure, labels, interaction design, result presentation, and optimization implementation were written specifically for Kingdom 846.

## Phase 1: Bear Optimizer model

The first Battle Lab module uses publicly described Kingshot community mechanics:

- Offensive stat factor: `(1 + Attack / 100) × (1 + Lethality / 100)`
- Bear is modeled as an Infantry-type target.
- Bear troop offensive weights used by the community model:
  - Infantry: `1 / 3`
  - Cavalry: `1`
  - Archers: `4 / 3`
- Damage contribution is modeled with diminishing returns proportional to the square root of troop count.

Public references used to verify these mechanics:

- Kingshot Brasil Bear Hunt Optimizer: https://kingshot.com.br/en/bear-hunt-optimizer
- Kingshot Simulator damage formula: https://kingshotsim.com/damage-formula
- Kingshot Simulator rally/troop mechanics: https://kingshotsim.com/rally-and-troops

## Independent optimization derivation

For each troop type `i`, Battle Lab creates an offensive coefficient:

`c_i = troop_weight_i × (1 + attack_i / 100) × (1 + lethality_i / 100)`

The modeled score is:

`score = Σ c_i × sqrt(n_i)`

subject to:

`Σ n_i = march_capacity`

and optional minimum troop constraints.

Without binding minimum constraints, maximizing that concave objective gives an allocation proportional to the square of each coefficient:

`n_i ∝ c_i²`

Battle Lab implements this result with an active-set calculation so user-specified minimum troop floors are respected, followed by deterministic integer rounding that preserves exact march capacity.

This derivation and implementation are original to Battle Lab and do not depend on another calculator's source code.

## Accuracy policy

Battle Lab presents the Bear result as a community mathematical estimate, not an official Kingshot formula. Hidden mechanics, hero effects, buffs, troop generation changes, or future game updates can move the real in-game optimum.

Future Battle Lab modules should keep mechanics separated by evidence level (verified, community-tested, experimental) and should be checked against real battle reports before being labeled highly reliable.
