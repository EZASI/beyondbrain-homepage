import { CONTACT_EMAIL, findItem, getCopy, type Copy } from './content'

/** What the visitor types. It lives in memory only, for this visit. */
export type Draft = { name: string; company: string; email: string; message: string }
export type Field = 'name' | 'email' | 'message'

export const EMPTY_DRAFT: Draft = { name: '', company: '', email: '', message: '' }

/** The same caps as the server applies, so nothing typed is cut off after sending. */
export const LIMITS = { name: 120, company: 200, email: 200, message: 4000 } as const

export type Outcome =
  | { kind: 'sent'; ref: string }
  | { kind: 'invalid'; fields: Field[] }
  /** failed: try again. unavailable: the form cannot send at all. limited: too many in a row. */
  | { kind: 'failed' | 'unavailable' | 'limited' }

const ENDPOINT = '/api/inquiry'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FIELDS: Field[] = ['name', 'email', 'message']
const PATIENCE_MS = 20000

/** Fields that stop the inquiry from being sent, in the order they appear. */
export function check(draft: Draft, itemCount: number): Field[] {
  const fields: Field[] = []
  if (!draft.name.trim()) fields.push('name')
  if (!EMAIL.test(draft.email.trim())) fields.push('email')
  if (itemCount === 0 && !draft.message.trim()) fields.push('message')
  return fields
}

/** The inquiry as plain text, for the visitor to send by email when the form cannot. */
export function inquiryText(copy: Copy, keys: string[], draft: Draft = EMPTY_DRAFT) {
  const { ui } = copy
  const rows = keys
    .map((key) => findItem(copy, key))
    .filter((found) => found !== undefined)
    .map(({ line, item }) => ui.mailRow(line.title, item.name))
  return [
    ...(rows.length ? [ui.mailIntro, '', ...rows, ''] : []),
    ui.mailLine(ui.form.company, draft.company.trim()),
    ui.mailLine(ui.form.name, draft.name.trim()),
    ui.mailLine(ui.form.email, draft.email.trim()),
    '',
    ui.mailLine(ui.form.message, ''),
    draft.message.trim(),
  ]
    .join('\n')
    .trimEnd()
}

/** A link that opens the visitor's own mail app with the inquiry written out. */
export function mailto(copy: Copy, keys: string[] = [], draft: Draft = EMPTY_DRAFT) {
  const subject = encodeURIComponent(copy.ui.mailSubject)
  const body = encodeURIComponent(inquiryText(copy, keys, draft))
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Sends the inquiry to the company through the site. Never throws: whatever goes
 * wrong comes back as an outcome the form can explain.
 */
export async function sendInquiry(
  copy: Copy,
  keys: string[],
  draft: Draft,
  /** A field people never see. Anything in it was put there by a program. */
  extra: string,
): Promise<Outcome> {
  /* The company reads these in Japanese, whatever language the visitor is using. */
  const japanese = getCopy('ja')
  const items = keys.flatMap((key) => {
    const found = findItem(japanese, key)
    return found ? [{ key, line: found.line.title, name: found.item.name }] : []
  })
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), PATIENCE_MS)
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: draft.name.trim(),
        company: draft.company.trim(),
        email: draft.email.trim(),
        message: draft.message.trim(),
        lang: copy.lang,
        items,
        extra,
      }),
      signal: controller.signal,
    })
    let data: unknown = null
    try {
      data = await response.json()
    } catch {
      /* Not our endpoint answering: a plain page, or nothing at all. */
    }
    if (response.ok) {
      return isRecord(data) && data.ok === true && typeof data.ref === 'string' && data.ref
        ? { kind: 'sent', ref: data.ref }
        : { kind: 'unavailable' }
    }
    if (response.status === 400 && isRecord(data) && Array.isArray(data.fields)) {
      const fields = FIELDS.filter((field) => (data.fields as unknown[]).includes(field))
      return fields.length ? { kind: 'invalid', fields } : { kind: 'failed' }
    }
    if (response.status === 429) return { kind: 'limited' }
    /* Our function saying it has no mail key, or a host with no function at all. */
    const unset = response.status === 503 && isRecord(data) && data.error === 'not_configured'
    if (unset || response.status === 404 || response.status === 405) return { kind: 'unavailable' }
    return { kind: 'failed' }
  } catch {
    return { kind: 'failed' }
  } finally {
    window.clearTimeout(timer)
  }
}
