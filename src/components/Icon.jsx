// Icons via lucide-react (matches the original Kingdom 846 project dependency)
import {
  Home, Castle, Shield, CalendarDays, Newspaper, BookOpen, Trophy, Users,
  Crown, Bell, Settings, Swords, Clock, Search, Flame, ArrowRight, ChevronRight,
  LogOut, Landmark, ShieldCheck, Sparkles, Star, ScrollText, RefreshCw, Download, Upload
} from 'lucide-react'

const map = {
  home: Home, castle: Castle, shield: Shield, calendar: CalendarDays,
  newspaper: Newspaper, book: BookOpen, trophy: Trophy, users: Users,
  crown: Crown, bell: Bell, settings: Settings, swords: Swords, clock: Clock,
  search: Search, fire: Flame, arrow: ArrowRight, chevron: ChevronRight,
  logout: LogOut, landmark: Landmark, shieldCheck: ShieldCheck,
  sparkles: Sparkles, star: Star, scroll: ScrollText, refresh: RefreshCw, download: Download, upload: Upload
}

export default function Icon({ name, size, className }) {
  const Cmp = map[name] || Home
  return <Cmp size={size || 18} className={className} aria-hidden="true" />
}
