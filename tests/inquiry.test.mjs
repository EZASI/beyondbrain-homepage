// Checks for /api/inquiry, run with `npm test`. The mail service is replaced by
// a stand-in, so nothing here sends an email.
import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import handler, { clean, compose, problems, reference } from '../api/inquiry.js'

const SITE = 'www.beyondxbrain.com'
const realFetch = globalThis.fetch
const realLog = console.log
let mail = []
let answer = () => new Response(JSON.stringify({ id: 'stand-in' }), { status: 200 })
let caller = 0

beforeEach(() => {
  mail = []
  answer = () => new Response(JSON.stringify({ id: 'stand-in' }), { status: 200 })
  process.env.RESEND_API_KEY = 're_test_key'
  delete process.env.INQUIRY_NOTIFY_EMAIL
  delete process.env.INQUIRY_FROM_EMAIL
  console.log = () => {}
  globalThis.fetch = async (url, options) => {
    mail.push({ url: String(url), options, body: JSON.parse(options.body) })
    return answer()
  }
})

afterEach(() => {
  globalThis.fetch = realFetch
  console.log = realLog
})

/** Calls the endpoint the way Vercel does, each time as a different visitor unless told otherwise. */
async function call({ method = 'POST', headers = {}, body, ip } = {}) {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(value) {
      this.body = value
      return this
    },
  }
  const req = {
    method,
    headers: {
      host: SITE,
      origin: `https://${SITE}`,
      'x-forwarded-for': ip ?? `198.51.100.${(caller += 1)}`,
      ...headers,
    },
  }
  if (typeof body === 'function') Object.defineProperty(req, 'body', { get: body })
  else req.body = body
  await handler(req, res)
  return res
}

const inquiry = (changes = {}) => ({
  name: '山田 太郎',
  company: '山田製作所',
  email: 'taro@example.co.jp',
  message: '数量は10台、年内の納期を希望します。',
  lang: 'ja',
  items: [{ key: 'automation:servo', line: 'FA・産業用ロボット', name: 'サーボモーター' }],
  ...changes,
})

test('a complete inquiry is emailed to the company and answered with a reference', async () => {
  const res = await call({ body: inquiry() })
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.ok, true)
  assert.match(res.body.ref, /^BB-\d{6}-[A-HJ-NP-Z2-9]{4}$/)
  assert.equal(res.headers['cache-control'], 'no-store')

  assert.equal(mail.length, 1)
  const [sent] = mail
  assert.equal(sent.url, 'https://api.resend.com/emails')
  assert.equal(sent.options.method, 'POST')
  assert.equal(sent.options.headers.authorization, 'Bearer re_test_key')
  assert.deepEqual(sent.body.to, ['contact@beyondxbrain.com'])
  assert.equal(sent.body.from, 'BeyondBrain Showroom <inquiry@beyondxbrain.com>')
  assert.equal(sent.body.reply_to, 'taro@example.co.jp')
  assert.ok(sent.body.subject.includes(res.body.ref))
  assert.ok(sent.body.subject.includes('山田製作所'))
  for (const part of [
    res.body.ref,
    '山田 太郎',
    '山田製作所',
    'taro@example.co.jp',
    'FA・産業用ロボット／サーボモーター',
    '数量は10台、年内の納期を希望します。',
    '日本語',
  ]) {
    assert.ok(sent.body.text.includes(part), `the email should mention ${part}`)
  }
})

test('the destination and sender can be set in the project settings', async () => {
  process.env.INQUIRY_NOTIFY_EMAIL = 'desk@example.com'
  process.env.INQUIRY_FROM_EMAIL = 'Desk <desk@example.com>'
  await call({ body: inquiry() })
  assert.deepEqual(mail[0].body.to, ['desk@example.com'])
  assert.equal(mail[0].body.from, 'Desk <desk@example.com>')
})

test('a question with no items is accepted, and says so in the email', async () => {
  const res = await call({ body: inquiry({ items: [], lang: 'en' }) })
  assert.equal(res.statusCode, 200)
  assert.ok(mail[0].body.text.includes('（展示の指定なし）'))
  assert.ok(mail[0].body.text.includes('English'))
})

test('items alone are enough: the message is optional when something is listed', async () => {
  const res = await call({ body: inquiry({ message: '', company: '' }) })
  assert.equal(res.statusCode, 200)
  assert.ok(mail[0].body.subject.includes('山田 太郎'), 'without a company the name leads the subject')
})

test('what is missing is named, and nothing is sent', async () => {
  const cases = [
    [inquiry({ name: '   ' }), ['name']],
    [inquiry({ email: 'taro@example' }), ['email']],
    [inquiry({ email: 'taro @example.com' }), ['email']],
    [inquiry({ items: [], message: '' }), ['message']],
    [{}, ['name', 'email', 'message']],
  ]
  for (const [body, fields] of cases) {
    const res = await call({ body })
    assert.equal(res.statusCode, 400)
    assert.deepEqual(res.body, { ok: false, error: 'invalid', fields })
  }
  assert.equal(mail.length, 0)
})

test('a filled trap field is told all went well, and nothing is sent', async () => {
  const res = await call({ body: inquiry({ extra: 'https://spam.example' }) })
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.ok, true)
  assert.match(res.body.ref, /^BB-/)
  assert.equal(mail.length, 0)
})

test('without a mail key the inquiry is refused, so the page can offer email instead', async () => {
  delete process.env.RESEND_API_KEY
  const res = await call({ body: inquiry() })
  assert.equal(res.statusCode, 503)
  assert.deepEqual(res.body, { ok: false, error: 'not_configured' })
  assert.equal(mail.length, 0)
})

test('a refusal, an error or a timeout from the mail service is reported as not delivered', async () => {
  const failures = [
    () => new Response('{"message":"domain not verified"}', { status: 403 }),
    () => {
      throw new Error('network down')
    },
    () => {
      throw Object.assign(new Error('timed out'), { name: 'TimeoutError' })
    },
  ]
  for (const failure of failures) {
    answer = failure
    const res = await call({ body: inquiry() })
    assert.equal(res.statusCode, 502)
    assert.deepEqual(res.body, { ok: false, error: 'delivery_failed' })
  }
})

test('the log says why delivery failed, and nothing about the visitor', async () => {
  const lines = []
  console.log = (...parts) => lines.push(parts.join(' '))
  answer = () =>
    new Response(
      JSON.stringify({
        statusCode: 403,
        name: 'validation_error',
        message: 'The reply_to taro@example.co.jp is not allowed',
      }),
      { status: 403 },
    )
  await call({ body: inquiry() })
  assert.equal(lines.length, 1)
  assert.ok(lines[0].includes('refused_403_validation_error'), lines[0])
  for (const secret of ['taro@example.co.jp', '山田', '数量', 're_test_key']) {
    assert.ok(!lines[0].includes(secret), `the log should not contain ${secret}`)
  }

  lines.length = 0
  answer = () => new Response('<html>bad gateway</html>', { status: 502 })
  const res = await call({ body: inquiry() })
  assert.equal(res.statusCode, 502)
  assert.ok(lines[0].includes('refused_502'), 'a reply that is not JSON is still reported')
})

test('a form on another site cannot post here, but a request without an origin can', async () => {
  const foreign = await call({ body: inquiry(), headers: { origin: 'https://evil.example' } })
  assert.equal(foreign.statusCode, 403)
  const garbled = await call({ body: inquiry(), headers: { origin: 'not a url' } })
  assert.equal(garbled.statusCode, 403)
  assert.equal(mail.length, 0)

  const plain = await call({ body: inquiry(), headers: { origin: undefined } })
  assert.equal(plain.statusCode, 200)
  const preview = await call({
    body: inquiry(),
    headers: {
      origin: 'https://beyondxbrain-site-abc.vercel.app',
      host: 'internal',
      'x-forwarded-host': 'beyondxbrain-site-abc.vercel.app',
    },
  })
  assert.equal(preview.statusCode, 200)
})

test('one visitor is slowed down after six inquiries in ten minutes', async () => {
  const ip = '203.0.113.77'
  for (let turn = 0; turn < 6; turn += 1) {
    const res = await call({ body: inquiry(), ip })
    assert.equal(res.statusCode, 200, `inquiry ${turn + 1} should pass`)
  }
  const res = await call({ body: inquiry(), ip })
  assert.equal(res.statusCode, 429)
  assert.equal(res.headers['retry-after'], '600')
  assert.deepEqual(res.body, { ok: false, error: 'rate_limited' })
  assert.equal(mail.length, 6)

  const other = await call({ body: inquiry(), ip: '203.0.113.78' })
  assert.equal(other.statusCode, 200, 'another visitor is not affected')
})

test('the body may arrive as text, and nonsense is treated as an empty form', async () => {
  const text = await call({ body: JSON.stringify(inquiry()) })
  assert.equal(text.statusCode, 200)

  for (const body of ['{not json', 42, null, undefined, ['x']]) {
    const res = await call({ body })
    assert.equal(res.statusCode, 400)
  }
  const thrown = await call({
    body: () => {
      throw new Error('Invalid JSON')
    },
  })
  assert.equal(thrown.statusCode, 400)
})

test('GET says whether inquiries can be delivered, without sending one', async () => {
  const ready = await call({ method: 'GET' })
  assert.equal(ready.statusCode, 200)
  assert.deepEqual(ready.body, { ok: true, delivery: 'email' })
  assert.ok(!JSON.stringify(ready.body).includes('re_test_key'))

  delete process.env.RESEND_API_KEY
  const missing = await call({ method: 'GET' })
  assert.deepEqual(missing.body, { ok: true, delivery: 'none' })
  assert.equal(mail.length, 0)
})

test('other methods are turned away', async () => {
  for (const method of ['PUT', 'DELETE', 'PATCH']) {
    const res = await call({ method, body: inquiry() })
    assert.equal(res.statusCode, 405)
    assert.equal(res.headers.allow, 'GET, POST')
  }
  assert.equal(mail.length, 0)
})

test('fields are trimmed, capped and kept to one line where a line is expected', async () => {
  const tidy = clean({
    name: '  山田\r\n太郎  ',
    company: `A${'あ'.repeat(400)}`,
    email: ' taro@example.co.jp ',
    message: `  一行目\r\n二行目  ${'x'.repeat(5000)}`,
    lang: 'fr',
    items: [
      ...Array.from({ length: 60 }, (_, index) => ({ key: `k${index}`, line: 'L', name: 'N' })),
    ],
    surprise: 'ignored',
  })
  assert.equal(tidy.name, '山田 太郎')
  assert.equal(tidy.company.length, 200)
  assert.equal(tidy.email, 'taro@example.co.jp')
  assert.ok(tidy.message.startsWith('一行目\n二行目'))
  assert.equal(tidy.message.length, 4000)
  assert.equal(tidy.lang, 'ja')
  assert.equal(tidy.items.length, 40)
  assert.equal('surprise' in tidy, false)

  const odd = clean({ name: 7, company: null, email: ['a@b.co'], message: {}, items: 'x' })
  assert.deepEqual(odd, { name: '', company: '', email: '', message: '', lang: 'ja', items: [] })
  assert.deepEqual(problems(odd), ['name', 'email', 'message'])

  const sparse = clean({ items: [null, 5, { key: 'a' }, { name: 'b' }, { key: 'a', name: 'b' }] })
  assert.deepEqual(sparse.items, [{ key: 'a', line: '', name: 'b' }])
})

test('line breaks cannot reach the subject or the reply address', async () => {
  const res = await call({
    body: inquiry({
      name: '太郎\r\nBcc: victim@example.com',
      company: '製作所\nBcc: victim@example.com',
      email: 'taro@example.co.jp\r\nBcc: victim@example.com',
    }),
  })
  assert.equal(res.statusCode, 400, 'an address with a line break in it is not an address')

  const kept = await call({
    body: inquiry({ company: '製作所\nBcc: victim@example.com', name: '太郎\r\nX-Test: 1' }),
  })
  assert.equal(kept.statusCode, 200)
  assert.ok(!/[\r\n]/.test(mail[0].body.subject))
  assert.ok(!/[\r\n]/.test(mail[0].body.reply_to))
  assert.equal(Object.keys(mail[0].body).sort().join(), 'from,reply_to,subject,text,to')
})

test('a long company name does not make an unreadable subject', async () => {
  await call({ body: inquiry({ company: 'あ'.repeat(200) }) })
  assert.ok(mail[0].body.subject.length < 110)
})

test('the reference and the timestamp use the date in Japan', () => {
  const lateEvening = new Date('2026-11-15T15:30:00Z') // 00:30 on the 16th in Tokyo
  assert.match(reference(lateEvening), /^BB-261116-[A-HJ-NP-Z2-9]{4}$/)
  const { text } = compose(clean(inquiry()), 'BB-261116-TEST', lateEvening)
  assert.ok(text.includes('2026-11-16 00:30（日本時間）'))

  const newYear = new Date('2026-12-31T15:00:00Z') // midnight, 1 January 2027 in Tokyo
  assert.match(reference(newYear), /^BB-270101-/)

  const seen = new Set(Array.from({ length: 200 }, () => reference(lateEvening)))
  assert.ok(seen.size > 190, 'references should not repeat in practice')
})
