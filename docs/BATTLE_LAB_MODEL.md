# Battle Lab — Model & Provenance

Battle Lab is an original Kingdom 846 feature implemented independently in React/JavaScript.

## Clean-room approach

The implementation in this repository does **not** use or reproduce Frakinator source code, Streamlit code, assets, CSS, wording, screenshots, branding, or page layout. Frakinator was treated only as evidence that Kingshot players find formation optimization useful.

Battle Lab's code, component structure, labels, interaction design, result presentation, profile system, and calculation implementations were written specifically for Kingdom 846.

## Player Profiles

Battle Lab does not require a player username/password. Users can use the tools as guests or save multiple Player Profiles in browser `localStorage`.

A profile stores:

- player name and kingdom
- march capacity
- Infantry / Cavalry / Archer Attack, Lethality, Defense, and Health
- user-entered progression-source values used by the Mystic Trials filter

Profiles can be exported/imported as JSON for manual cross-device transfer. No Battle Lab profile password or cloud credential is collected in this version. Saved profiles remain in the user's browser unless the user explicitly exports a backup file.

## Bear Optimizer

The Bear module uses publicly described Kingshot community mechanics:

- Offensive stat factor: `(1 + Attack / 100) × (1 + Lethality / 100)`
- Bear is modeled as an Infantry-type target.
- Community Bear offensive weights:
  - Infantry: `1 / 3`
  - Cavalry: `1`
  - Archers: `4 / 3`
- Contribution uses diminishing returns proportional to the square root of troop count.

For each troop type `i`, Battle Lab creates:

`c_i = troop_weight_i × (1 + attack_i / 100) × (1 + lethality_i / 100)`

and optimizes:

`score = Σ c_i × sqrt(n_i)`

subject to:

`Σ n_i = march_capacity`

and optional minimum troop constraints.

Without binding minimum constraints, the optimum is proportional to the square of each coefficient:

`n_i ∝ c_i²`

Battle Lab implements an independent active-set calculation plus deterministic integer rounding.

## Mystic Trials

The Mystic Trials module is deliberately a **stat-source filter**, not a fabricated damage simulator. It records user-entered progression values and shows which sources are included for the selected trial.

Current source groups represented in the UI:

- Heroes
- Hero Gear
- Widgets
- Pets
- Pet Skills
- Governor Charms
- Academy
- War Academy
- Governor Gear

Trial source rules are kept in `src/lib/combat/battleLabEngine.js` so they can be updated independently from the UI when the game changes.

## Hero Synergy

Hero Synergy models the community-observed stacking pattern where effects in the same internal family add first and different families multiply.

For each family `g`:

`family_multiplier_g = 1 + Σ bonuses_in_g / 100`

Total grouped multiplier:

`multiplier = Π family_multiplier_g`

The UI uses user-defined A/B/C group labels instead of claiming a complete hidden Kingshot opcode database. This makes the math useful without inventing hero mappings that have not been validated.

## Formation Optimizer

The general Formation Optimizer extends the square-root allocation method using the user's Attack/Lethality profile and a selected primary enemy troop type. It applies the standard counter relationship used by the community model:

- Infantry counters Cavalry
- Cavalry counters Archers
- Archers counters Infantry

A counter receives a `1.1` coefficient multiplier in this theorycrafting model.

This module is labeled **Experimental** because real PvP includes targeting, defense/health, hero effects, special skills, and other mechanics not represented by a one-step offensive formation score.

## Battle Simulator

The first simulator version is explicitly labeled **Experimental T10 Expedition**.

It currently models:

- Infantry / Cavalry / Archer troop lines
- T10 base Attack and HP values isolated in the engine data
- base Lethality and Defense values used by the public Expedition model
- user Attack, Lethality, Defense, and Health percentages
- square-root army factor
- 10% troop counter relationship
- front-line target order
- simultaneous casualty application per round
- a small round-fatigue term inherited from the documented Expedition-style formula

It intentionally does **not** claim to model every Kingshot mechanic. Cavalry bypass, Archer volley, complete hero proc timing, widgets, special hero edge cases, and other hidden/uncertain mechanics remain excluded until validated.

## Public references

Public references used while validating the independent model design include:

- Kingshot Brasil Bear Hunt Optimizer: https://kingshot.com.br/en/bear-hunt-optimizer
- Kingshot Simulator damage formula: https://kingshotsim.com/damage-formula
- Kingshot Simulator rally/troop mechanics: https://kingshotsim.com/rally-and-troops
- Kingshot Simulator methodology / skill-mechanics pages used during model research

These references are used for game-mechanics research. Their source code, creative UI, wording, and assets are not copied into Battle Lab.

## Accuracy policy

Battle Lab separates evidence levels in the interface:

- **Verified / source rules** — mechanics used as filters or rules with stronger public documentation
- **Community model** — mechanics supported by community testing but not official Kingshot documentation
- **Experimental** — useful theorycrafting/simulation that still needs comparison with real battle reports

Experimental outputs should be checked against actual Kingshot reports before being presented as predictive. The model should be updated when game patches or stronger evidence change a mechanic.

## Current validation status

The feature branch has been reviewed at the repository-diff level to ensure Battle Lab changes stay isolated from unrelated site functionality. A full `npm run build` has not yet been executed in this connector-only environment, and the repository does not currently provide an automatic PR build result. Draft PR #17 must remain unmerged until a build/preview check is available or the branch is tested in the normal deployment environment.
