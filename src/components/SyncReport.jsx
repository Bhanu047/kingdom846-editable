// Where the last Kingshot sync's items actually came from.
//
// The item count on its own is unfalsifiable. Most of what a sync writes is
// the seed list hardcoded in server/index.cjs, and the live scrape only ever
// ADDS on top -- so "Synced 66 items" reads exactly the same whether both
// sources returned fresh announcements or nothing at all. For days it said 66
// every four hours while nothing new ever appeared, and there was no way to
// tell from the panel.
//
// This states the split, and goes amber the moment the live half is zero.
export default function SyncReport({ report }) {
  if (!report) return null
  const dead = report.live === 0
  return (
    <div
      className={`mb-3 rounded-lg border p-2 text-[10px] leading-relaxed ${
        dead
          ? 'border-amber-500/40 bg-amber-500/5 text-amber-200/80'
          : 'border-gold/10 bg-ink-2/50 text-parchment/50'
      }`}
    >
      {dead ? (
        <>
          <span className="font-semibold">Nothing new is arriving.</span>{' '}
          All {report.total} items are built into the server; the live sources returned
          none. Fresh content needs the scrapers fixed or the built-in list updated.
        </>
      ) : (
        <>
          Last sync: <span className="text-gold/70">{report.live} live</span>
          {' · '}{report.seed} built-in{' · '}{report.total} total
        </>
      )}
      {report.errors?.length > 0 && (
        <div className="mt-1 text-rose-300/70">{report.errors.join(' · ')}</div>
      )}
    </div>
  )
}
