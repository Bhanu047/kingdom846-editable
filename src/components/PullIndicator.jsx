import Icon from './Icon'

/* The thing that appears when you drag the top of a screen down.
 *
 * It rides on the pull distance rather than animating on its own, so it tracks
 * the finger exactly — a spinner that starts its own timeline the moment the
 * gesture begins feels detached from the hand doing it. The crest rotates with
 * the pull and locks upright at the threshold, so the release point is visible
 * rather than guessed.
 */
export default function PullIndicator({ pull, refreshing, threshold }) {
  if (pull <= 0 && !refreshing) return null

  const progress = Math.min(1, pull / threshold)
  const armed = progress >= 1

  return (
    <div
      className="pull-indicator"
      style={{ transform: `translate(-50%, ${pull - 44}px)`, opacity: Math.min(1, progress * 1.4) }}
      aria-hidden="true"
    >
      <div className={`pull-dial ${armed ? 'is-armed' : ''} ${refreshing ? 'is-spinning' : ''}`}>
        <span
          className="pull-dial-mark"
          style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
        >
          <Icon name="crown" size={15} />
        </span>
      </div>
    </div>
  )
}
