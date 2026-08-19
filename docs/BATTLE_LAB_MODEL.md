# Battle Lab — Model & Provenance

Battle Lab is an original Kingdom 846 feature implemented independently in React/JavaScript.

## Clean-room approach

The implementation in this repository does **not** use or reproduce Frakinator source code, Streamlit code, assets, CSS, wording, screenshots, branding, or page layout. Frakinator was treated only as evidence that Kingshot players find formation optimization useful.

Battle Lab's code, component structure, labels, interaction design, result presentation, profile system, and calculation implementations were written specifically for Kingdom 846.

## Player Profiles

Battle Lab does not require a player username/password. Users can use the tools as guests or save multiple Player Profiles in browser `localStorage`.

A profile stores player name, kingdom, march capacity, Infantry/Cavalry/Archer Attack/Lethality/Defense/Health, and user-entered progression-source values used by Mystic Trials.

Profiles can be exported/imported as JSON for manual cross-device transfer. No Battle Lab password or cloud credential is collected; saved profiles remain in the user's browser unless the user explicitly exports a backup.

## Bear Optimizer

The Bear module uses publicly described Kingshot community mechanics:

- Offensive factor: `(1 + Attack / 100) × (1 + Lethality / 100)`
- Bear modeled as an Infantry-type target
- Community Bear offensive weights: Infantry `1/3`, Cavalry `1`, Archers `4/3`
- Contribution proportional to `sqrt(troop_count)`

For troop type `i`:

`c_i = troop_weight_i × (1 + attack_i / 100) × (1 + lethality_i / 100)`

Battle Lab optimizes `score = Σ c_i × sqrt(n_i)` subject to march capacity and optional minimum troop constraints. Without binding minimums, `n_i ∝ c_i²`. The active-set allocation and exact-capacity integer rounding are Battle Lab's own implementation.

## Mystic Trials

Mystic Trials is deliberately a **stat-source filter**, not a fabricated damage simulator. It records user-entered progression values and shows which sources are included for the selected trial.

Current source groups: Heroes, Hero Gear, Widgets, Pets, Pet Skills, Governor Charms, Academy, War Academy, and Governor Gear. Trial rules live in `src/lib/combat/battleLabEngine.js` so they can be updated independently when the game changes.

## Hero Synergy

Hero Synergy models the community-observed stacking pattern where effects in the same internal family add first and different families multiply.

For each family `g`: `family_multiplier_g = 1 + Σ bonuses_in_g / 100`.

Total grouped multiplier: `multiplier = Π family_multiplier_g`.

The UI uses user-defined A/B/C family labels instead of claiming a complete hidden Kingshot opcode database.

## Formation Optimizer

The general Formation Optimizer extends the square-root allocation method using the user's Attack/Lethality profile and a selected primary enemy troop type. It applies the community counter relationship Infantry > Cavalry > Archers > Infantry with a `1.1` counter coefficient.

This module is labeled **Experimental** because real PvP includes targeting, Defense/Health, hero effects, special skills, and other mechanics not represented by a one-step offensive score.

## Battle Simulator

The first simulator is explicitly labeled **Experimental T10 Expedition**. It models Infantry/Cavalry/Archer lines, isolated T10 base Attack/HP data, base Lethality/Defense used by the public Expedition-style model, user combat percentages, square-root army factor, 10% counters, front-line targeting, simultaneous casualty application, and a small round-fatigue term.

It intentionally excludes Cavalry bypass, Archer volley, complete hero proc timing, widgets, special hero edge cases, and other hidden/uncertain mechanics until validated.

## Public references

Public mechanics references used during model research include:

- Kingshot Brasil Bear Hunt Optimizer: https://kingshot.com.br/en/bear-hunt-optimizer
- Kingshot Simulator damage formula: https://kingshotsim.com/damage-formula
- Kingshot Simulator rally/troop mechanics: https://kingshotsim.com/rally-and-troops
- Kingshot Simulator methodology / skill-mechanics pages

These references are used for game-mechanics research. Their source code, creative UI, wording, and assets are not copied into Battle Lab.

## Accuracy policy

Battle Lab separates **Verified/source rules**, **Community model**, and **Experimental** mechanics in the interface. Experimental outputs should be compared against actual Kingshot battle reports before being presented as predictive, and the model should be updated when game patches or stronger evidence change a mechanic.

## Validation status

The branch is isolated to Battle Lab/navigation files, but a full `npm run build` has not been executed in this connector-only environment. Draft PR #17 should stay unmerged until a normal build or deployment preview confirms the branch.
