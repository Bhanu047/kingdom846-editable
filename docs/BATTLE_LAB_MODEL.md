# Battle Lab — Model & Provenance

Battle Lab is an original Kingdom 846 feature implemented independently in React/JavaScript.

## Clean-room approach

The implementation does **not** use or reproduce Frakinator source code, Streamlit code, assets, CSS, wording, screenshots, branding, or page layout. Battle Lab's code, component structure, labels, interaction design, result presentation, profile system, and calculation implementations were written specifically for Kingdom 846.

## Player Profiles

Battle Lab requires no player username/password. Users can work as guests or save multiple Player Profiles in browser `localStorage`. Profiles store player name, kingdom, march capacity, INF/CAV/ARC Attack/Lethality/Defense/Health, and user-entered Mystic progression-source values. Profiles can be exported/imported as JSON for manual cross-device transfer. No Battle Lab cloud credential is collected.

## Bear Optimizer

The Bear module uses the public community model:

- `(1 + Attack / 100) × (1 + Lethality / 100)` offensive factor
- Bear treated as an Infantry-type target
- weights: Infantry `1/3`, Cavalry `1`, Archers `4/3`
- contribution proportional to `sqrt(troop_count)`

For troop type `i`, `c_i = troop_weight_i × (1 + attack_i/100) × (1 + lethality_i/100)` and Battle Lab maximizes `Σ c_i × sqrt(n_i)` subject to march capacity and optional minimums. Without binding minimums, `n_i ∝ c_i²`. The active-set allocation and exact-capacity rounding are Battle Lab's own implementation.

## Mystic Trials

Mystic Trials is a stat-source filter, not a fabricated damage simulator. It shows which user-entered progression sources are eligible for the selected trial. Rules are isolated in `src/lib/combat/battleLabEngine.js` for easy updates.

## Hero Synergy

Same-family effects add first; different user-defined families multiply. For family `g`, `family_multiplier_g = 1 + Σ bonuses_in_g/100`, and the total is the product of family multipliers. The UI uses A/B/C family labels instead of claiming a complete hidden opcode database.

## Formation Optimizer

This experimental theorycrafting tool applies the user's Attack/Lethality profile, square-root allocation, and the community counter relationship Infantry > Cavalry > Archers > Infantry with a `1.1` counter coefficient.

## Battle Simulator

The experimental T10 Expedition simulator models troop lines, isolated T10 base Attack/HP data, public Expedition-style base Lethality/Defense, user combat percentages, square-root army factor, 10% counters, front-line targeting, simultaneous casualties, and a small round-fatigue term. It intentionally excludes Cavalry bypass, Archer volley, full hero proc timing, widgets, and unvalidated special cases.

## Public mechanics references

- https://kingshot.com.br/en/bear-hunt-optimizer
- https://kingshotsim.com/damage-formula
- https://kingshotsim.com/rally-and-troops
- Kingshot Simulator methodology / skill-mechanics pages

References are used for mechanics research only; their source code, UI, wording, and assets are not copied.

## Accuracy policy

The UI separates **Verified/source rules**, **Community model**, and **Experimental** mechanics. Experimental outputs should be checked against real Kingshot battle reports before being presented as predictive.

## Validation status

The branch is isolated to Battle Lab/navigation files, but a full `npm run build` has not been executed in this connector-only environment. Draft PR #17 should remain unmerged until a normal build or deployment preview confirms the branch.
