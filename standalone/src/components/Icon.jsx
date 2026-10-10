// Icons via lucide-react (matches the original Kingdom 846 project dependency)
import {
  Home, Castle, Shield, CalendarDays, Newspaper, BookOpen, Trophy, Users,
  Crown, Bell, Settings, Swords, Clock, Search, Flame, ArrowRight, ChevronRight,
  LogOut, Landmark, ShieldCheck, Sparkles, Star, ScrollText, RefreshCw, Download, Upload,
  Crosshair, Zap, Layers, Flag, Target, Axe, PawPrint, Snowflake, User, ArrowRightLeft
} from 'lucide-react'

const map = {
  home: Home, castle: Castle, shield: Shield, calendar: CalendarDays,
  newspaper: Newspaper, book: BookOpen, trophy: Trophy, users: Users,
  crown: Crown, bell: Bell, settings: Settings, swords: Swords, clock: Clock,
  search: Search, fire: Flame, arrow: ArrowRight, chevron: ChevronRight,
  logout: LogOut, landmark: Landmark, shieldCheck: ShieldCheck,
  sparkles: Sparkles, star: Star, scroll: ScrollText, refresh: RefreshCw, download: Download, upload: Upload,
  crosshair: Crosshair, zap: Zap, layers: Layers, flag: Flag, target: Target, axe: Axe, paw: PawPrint, snowflake: Snowflake,
  user: User, transfer: ArrowRightLeft
}

export default function Icon({ name, size, className }) {
  // An unmapped name used to fall through to Home, so a typo rendered a house
  // in the middle of the UI with nothing to show it was wrong. In development
  // it now says so; in production it still degrades quietly.
  if (import.meta.env?.DEV && name && !map[name]) console.warn(`Icon: no glyph mapped for "${name}"`)
  const Cmp = map[name] || Home
  return <Cmp size={size || 18} className={className} aria-hidden="true" />
}
