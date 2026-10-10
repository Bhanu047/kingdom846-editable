// Kingdom 791 identity pieces: crest, member portraits, alliance badges.
// Every decorative mark here is raster artwork; alliance names are always
// rendered as live text so the spelling is authoritative.

export const ALLIANCES = [
  { tag: 'NwO', name: 'NewWorldOrder', label: '[NwO] NewWorldOrder', tone: 'nwo' },
  { tag: 'DXP', name: 'TheBadBatch', label: '[DXP] TheBadBatch', tone: 'dxp' },
  { tag: 'FME', name: 'IXXI', label: '[FME] IXXI', tone: 'fme' },
].map((a) => ({ ...a, emblem: `/art/emblem-${a.tone}.webp`, banner: `/art/banner-${a.tone}.webp` }))

const MEMBERS = ['spartan', 'poofy', 'charles', 'jakey', 'polar', 'erika']

export function allianceFor(text) {
  const t = String(text || '').trim()
  if (!t) return null
  return ALLIANCES.find((a) => a.label === t || t.toUpperCase().includes(`[${a.tag.toUpperCase()}]`)) || null
}

export function Crest({ size = 'sm', className = '', ...rest }) {
  return <img className={'crest ' + className} src={size === 'sm' ? '/art/lion-crest-sm.webp' : '/art/lion-crest.webp'} alt="Kingdom 791 lion crest" {...rest} />
}

export function Portrait({ username, size = 36, square = false, className = '' }) {
  const key = String(username || '').toLowerCase()
  const src = MEMBERS.includes(key) ? `/art/portrait-${key}.webp` : '/art/lion-crest-sm.webp'
  return <img className={(square ? 'portrait portrait-sq ' : 'portrait ') + className} style={{ width: size, height: size }} src={src} alt="" decoding="async" />
}

export function AllianceBadge({ value }) {
  const a = allianceFor(value)
  if (!value) return <span className="abadge none">No alliance set</span>
  if (!a) return <span className="abadge custom" title={value}><span>{value}</span></span>
  return (
    <span className={'abadge tone-' + a.tone} title={a.label}>
      <img src={a.emblem} alt="" />
      <b>[{a.tag}]</b><span>{a.name}</span>
    </span>
  )
}
