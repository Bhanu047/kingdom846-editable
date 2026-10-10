// Which portrait stands for an account.
//
// This rule lived in three places -- the sidebar, Settings and the Master
// Console -- and the three had already drifted apart in what they fell back to.
// Adding the war room portraits to one of them would have meant Panini being a
// Shiba in the sidebar and an [RYO] lord everywhere else, so the rule is here
// once and all three read it.

const AVATARS = './assets/avatars'

// Portraits that belong to a person rather than to their alliance. Checked
// first: the war room crew sit under [RYO] but are not its lord.
const BY_USERNAME = {
  panini: `${AVATARS}/panini.webp`,
  anonymous: `${AVATARS}/anonymous.webp`,
  abstraction: `${AVATARS}/abstraction.webp`,
  shiba: `${AVATARS}/shiba.webp`,
}

const BY_ALLIANCE = {
  ryo: `${AVATARS}/ryo-lord.webp`,
  kzk: `${AVATARS}/kzk-lord.webp`,
  sas: `${AVATARS}/sas-lord.webp`,
  ice: `${AVATARS}/ice-lord.webp`,
}

export function avatarFor(user) {
  if (!user) return `${AVATARS}/king.webp`
  // Username first, then the display name: an account may rename itself from
  // Settings, and losing your own portrait is not what renaming is for.
  const own = BY_USERNAME[String(user.username || '').toLowerCase()]
    || BY_USERNAME[String(user.display_name || '').toLowerCase()]
  if (own) return own
  if (user.role === 'admin') return `${AVATARS}/spartan.webp`
  return BY_ALLIANCE[user.alliance_slug] || `${AVATARS}/queen.webp`
}
