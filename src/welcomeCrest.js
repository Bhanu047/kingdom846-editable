function applyWelcomeCrest() {
  const crest = document.querySelector('img[alt="Kingdom 846 Royal Crest"]')
  if (crest && !crest.src.includes('welcome-crest.webp')) {
    crest.src = '/assets/welcome-crest.webp'
  }
}

applyWelcomeCrest()
const observer = new MutationObserver(applyWelcomeCrest)
observer.observe(document.documentElement, { childList: true, subtree: true })
