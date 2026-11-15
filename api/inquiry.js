// Inquiries from the showroom, delivered to the company by email.
//
// The same shape as the wholesale site's /api/quote: clean the fields, turn
// away the obvious abuse, send one email to the team through Resend, and tell
// the page plainly whether a person will see it. Nothing is stored here, and the
// only address this ever writes to is the company's own. An inquiry that could
// not be emailed is reported as such, so that the page can hand the visitor
// another way to reach us.
//
// Environment (Vercel project settings):
//   RESEND_API_KEY        required to send.
//   INQUIRY_NOTIFY_EMAIL  required: the address inquiries are delivered to. It has
//                         no default on purpose. The mail service accepts a message
//                         for an address that does not exist and it bounces later,
//                         unseen, so the destination must be one somebody chose.
//   INQUIRY_FROM_EMAIL    sender, on a domain verified in Resend.
//                         Default: BeyondBrain Showroom <inquiry@beyondxbrain.com>
// Without the two required settings every inquiry is refused with 503 and the page
// falls back to an email draft.

import { randomInt } from 'node:crypto'

const LIMITS = { name: 120, company: 200, email: 200, message: 4000 }
const MAX_ITEMS = 40
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FROM_DEFAULT = 'BeyondBrain Showroom <inquiry@beyondxbrain.com>'

// A speed bump, not a guarantee: one warm instance remembers who called it
// lately. The form emails the team, so unthrottled it would be a spam pipe.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 6
const MAX_CALLERS = 5000
const recent = new Map()

function callerOf(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return forwarded || req.headers['x-real-ip'] || 'unknown'
}

function overLimit(req, now = Date.now()) {
  const caller = callerOf(req)
  if (recent.size > MAX_CALLERS) recent.clear()
  const hits = (recent.get(caller) || []).filter((time) => now - time < WINDOW_MS)
  hits.push(now)
  recent.set(caller, hits)
  return hits.length > MAX_PER_WINDOW
}

// Browsers always send Origin on a POST, so a form on another site cannot reach
// this without one. No Origin at all means a script or curl, which is allowed.
function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === (req.headers['x-forwarded-host'] || req.headers.host)
  } catch {
    return false
  }
}

function block(value, cap) {
  if (typeof value !== 'string') return ''
  return value.replace(/\r\n?/g, '\n').trim().slice(0, cap)
}

function line(value, cap) {
  return block(value, cap).replace(/\s+/g, ' ')
}

/** The inquiry as it will be used: known fields only, trimmed and capped. */
export function clean(body) {
  const source = body && typeof body === 'object' ? body : {}
  const items = Array.isArray(source.items) ? source.items.slice(0, MAX_ITEMS) : []
  return {
    name: line(source.name, LIMITS.name),
    company: line(source.company, LIMITS.company),
    email: line(source.email, LIMITS.email),
    message: block(source.message, LIMITS.message),
    lang: source.lang === 'en' ? 'en' : 'ja',
    items: items
      .map((item) => ({
        key: line(item && item.key, 64),
        line: line(item && item.line, 200),
        name: line(item && item.name, 200),
      }))
      .filter((item) => item.key && item.name),
  }
}

/** Names of the fields that stop this inquiry from being sent. */
export function problems(inquiry) {
  const fields = []
  if (!inquiry.name) fields.push('name')
  if (!EMAIL.test(inquiry.email)) fields.push('email')
  if (inquiry.items.length === 0 && !inquiry.message) fields.push('message')
  return fields
}

const two = (value) => String(value).padStart(2, '0')

/** The moment in Japan, as [year, month, day, hour, minute]. */
function inJapan(now) {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return [
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    shifted.getUTCHours(),
    shifted.getUTCMinutes(),
  ]
}

/** Short and safe to read down a phone line: BB-YYMMDD-XXXX, dated in Japan. */
export function reference(now = new Date()) {
  const [year, month, day] = inJapan(now)
  /* No I, O, 0 or 1: nothing that reads two ways when said aloud or copied by hand. */
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const tail = Array.from({ length: 4 }, () => letters[randomInt(letters.length)]).join('')
  return `BB-${String(year).slice(2)}${two(month)}${two(day)}-${tail}`
}

/** The email the team receives. */
export function compose(inquiry, ref, now = new Date()) {
  const [year, month, day, hour, minute] = inJapan(now)
  const who = (inquiry.company || inquiry.name).slice(0, 60)
  const count = inquiry.items.length
  const rows = [
    'ショールームからお問い合わせがありました。',
    '',
    `受付番号：${ref}`,
    `受付日時：${year}-${two(month)}-${two(day)} ${two(hour)}:${two(minute)}（日本時間）`,
    `表示言語：${inquiry.lang === 'en' ? 'English' : '日本語'}`,
    '',
    `お名前：${inquiry.name}`,
    `会社名：${inquiry.company || '（記入なし）'}`,
    `メール：${inquiry.email}`,
    '',
    'お問い合わせの対象：',
    ...(count
      ? inquiry.items.map((item) => `・${item.line ? `${item.line}／` : ''}${item.name}（${item.key}）`)
      : ['（展示の指定なし）']),
    '',
    'ご用件：',
    inquiry.message || '（記入なし）',
    '',
    'このメールに返信すると、お問い合わせの方に届きます。',
  ]
  return {
    subject: `【ショールーム】お問い合わせ ${ref} ${who}${count ? `（${count}件）` : ''}`,
    text: rows.join('\n'),
  }
}

export default async function handler(req, res) {
  const key = process.env.RESEND_API_KEY
  const to = process.env.INQUIRY_NOTIFY_EMAIL
  const configured = Boolean(key && to)

  // A plain GET says whether inquiries can be delivered, without sending one.
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ ok: true, delivery: configured ? 'email' : 'none' })
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }
  res.setHeader('Cache-Control', 'no-store')
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: 'forbidden' })
  if (overLimit(req)) {
    res.setHeader('Retry-After', '600')
    return res.status(429).json({ ok: false, error: 'rate_limited' })
  }

  // Vercel parses the body on first read and throws there if it is not valid JSON.
  let body
  try {
    body = req.body
    if (typeof body === 'string') body = JSON.parse(body)
  } catch {
    body = null
  }
  body = body && typeof body === 'object' ? body : {}

  // People do not see this field, so anything in it was typed by a program.
  // It is told that all went well and nothing is sent.
  if (typeof body.extra === 'string' && body.extra.trim()) {
    console.log('[inquiry:honeypot]')
    return res.status(200).json({ ok: true, ref: reference() })
  }

  const inquiry = clean(body)
  const fields = problems(inquiry)
  if (fields.length) return res.status(400).json({ ok: false, error: 'invalid', fields })

  const ref = reference()
  if (!configured) {
    console.log('[inquiry:not_configured]', ref)
    return res.status(503).json({ ok: false, error: 'not_configured' })
  }

  const { subject, text } = compose(inquiry, ref)
  let status = 'error'
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: process.env.INQUIRY_FROM_EMAIL || FROM_DEFAULT,
        to: [to],
        reply_to: inquiry.email,
        subject,
        text,
      }),
      // Short enough to answer the visitor before the platform gives up on the function.
      signal: AbortSignal.timeout(6000),
    })
    status = response.ok ? 'sent' : `refused_${response.status}`
    if (!response.ok) {
      // The mail service names the kind of refusal (an unverified sender, a bad key).
      // Only that name is kept: its longer message can repeat an address.
      const reason = await response.json().catch(() => null)
      if (reason && typeof reason.name === 'string') status += `_${reason.name.slice(0, 60)}`
    }
  } catch (error) {
    status = error && error.name === 'TimeoutError' ? 'timeout' : 'error'
  }

  if (status !== 'sent') {
    // The visitor is told, and the page hands them an email draft instead. Nothing
    // about them is written to the log.
    console.log('[inquiry:undelivered]', JSON.stringify({ ref, status }))
    return res.status(502).json({ ok: false, error: 'delivery_failed' })
  }
  return res.status(200).json({ ok: true, ref })
}
