(() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!isIOS) return

  let pendingWindow = null
  let pendingName = ''
  const nativeClick = HTMLAnchorElement.prototype.click

  function isReportDownloadButton(target) {
    const button = target?.closest?.('button,[data-k846-share="formation"]')
    if (!button) return false
    const text = String(button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    return text.includes('download formation') || text.includes('download dashboard')
  }

  document.addEventListener('click', (event) => {
    if (!isReportDownloadButton(event.target)) return
    try {
      pendingWindow?.close?.()
      pendingWindow = window.open('', '_blank')
      pendingName = String(event.target.closest('button,[data-k846-share="formation"]')?.textContent || '').toLowerCase().includes('formation')
        ? 'Kingdom846-Hunt-Formation-Official.png'
        : 'Kingdom846-Hunt-Impact-Dashboard.png'
      if (pendingWindow) {
        pendingWindow.document.title = 'Preparing Kingdom 846 Report'
        pendingWindow.document.body.style.cssText = 'margin:0;background:#040914;color:#f5d778;font-family:system-ui;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px'
        pendingWindow.document.body.innerHTML = '<div><div style="font-size:28px;font-weight:800">KINGDOM 846</div><div style="margin-top:10px;color:#ddd">Preparing your PNG report…</div></div>'
      }
    } catch (_) {
      pendingWindow = null
    }
  }, true)

  HTMLAnchorElement.prototype.click = function patchedClick() {
    const href = String(this.href || '')
    if (pendingWindow && !pendingWindow.closed && this.download && href.startsWith('blob:')) {
      try {
        const win = pendingWindow
        const filename = this.download || pendingName || 'Kingdom846-Report.png'
        pendingWindow = null
        pendingName = ''
        win.document.open()
        win.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kingdom 846 Report</title></head><body style="margin:0;background:#040914;color:#f5d778;font-family:system-ui;display:grid;place-items:center;min-height:100vh;text-align:center"><div><div style="font-size:26px;font-weight:800;margin-bottom:14px">KINGDOM 846 REPORT READY</div><a id="k846-download" href="${href}" download="${filename}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#d4af37;color:#071224;text-decoration:none;font-weight:900">DOWNLOAD PNG</a><div style="margin-top:12px;color:#aaa;font-size:13px">If Safari does not start automatically, tap Download PNG once.</div></div><script>setTimeout(function(){document.getElementById('k846-download').click()},50)<\/script></body></html>`)
        win.document.close()
        return
      } catch (_) {}
    }
    return nativeClick.call(this)
  }
})()
