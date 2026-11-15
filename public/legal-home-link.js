/*
 * The legal pages still run the previous site's bundle, which answers a click
 * on a link to "/" by drawing the previous homepage in place. The homepage is
 * a separate app now, so leave the page with a full load instead.
 *
 * Kept in its own file because the site's Content-Security-Policy does not
 * allow inline scripts.
 */
document.addEventListener(
  'click',
  function (event) {
    var link = event.target instanceof Element ? event.target.closest('a[href="/"]') : null
    if (!link || event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    event.stopImmediatePropagation()
    window.location.assign('/')
  },
  true
)
