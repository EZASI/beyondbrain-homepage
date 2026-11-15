import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Check, Copy as CopyIcon, Mail, X } from 'lucide-react'
import { CONTACT_EMAIL, findItem, type Copy } from '../showroom/content'
import {
  LIMITS,
  check,
  inquiryText,
  mailto,
  type Draft,
  type Field,
} from '../showroom/inquiry'
import type { Inquiry, Receipt } from '../showroom/useInquiry'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    /* Some in-app browsers refuse the clipboard; the older route still works there. */
    const holder = document.createElement('textarea')
    holder.value = text
    holder.setAttribute('readonly', '')
    holder.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.append(holder)
    holder.select()
    let done = false
    try {
      done = document.execCommand('copy')
    } catch {
      done = false
    }
    holder.remove()
    return done
  }
}

export function InquiryForm({
  copy,
  keys,
  inquiry,
  onRemove,
}: {
  copy: Copy
  /** Items on the inquiry list. */
  keys: string[]
  inquiry: Inquiry
  /** Given where the list can be edited; without it the form stands alone. */
  onRemove?: (key: string) => void
}) {
  const { ui } = copy
  const { form } = ui
  const { draft, setDraft, status, submit } = inquiry
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [invalid, setInvalid] = useState<Field[]>([])
  const [copied, setCopied] = useState(false)
  const [extra, setExtra] = useState('')

  const sending = status === 'sending'
  /** Why the last attempt did not go through, in the visitor's words. */
  const trouble = status === 'idle' || status === 'sending' ? null : form[status]
  const messageOptional = keys.length > 0

  const focusField = (field: Field) =>
    formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus()

  const change =
    (field: keyof Draft) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target
      setDraft((current) => ({ ...current, [field]: value }))
      setInvalid((fields) => fields.filter((entry) => entry !== field))
    }

  /* Return moves on to the next field. Sending is always a deliberate press of the button. */
  const onward = (event: KeyboardEvent<HTMLInputElement>) => {
    /* 229 is the input method at work: Safari reports the Return that confirms a conversion that way. */
    if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return
    event.preventDefault()
    const fields = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>('[data-step]') ?? [],
    )
    fields[fields.indexOf(event.currentTarget) + 1]?.focus()
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (sending) return
    const missing = check(draft, keys.length)
    setInvalid(missing)
    if (missing.length) {
      focusField(missing[0])
      return
    }
    const outcome = await submit(extra)
    if (outcome?.kind === 'invalid') {
      setInvalid(outcome.fields)
      focusField(outcome.fields[0])
    }
  }

  const copyInquiry = async () => {
    const done = await copyText(`${CONTACT_EMAIL}\n\n${inquiryText(copy, keys, draft)}`)
    setCopied(done)
    if (done) window.setTimeout(() => setCopied(false), 1800)
  }

  const error = (field: Field) =>
    invalid.includes(field) ? (
      <p className="sr-field-error" id={`${id}-${field}-error`}>
        {form.errors[field]}
      </p>
    ) : null

  const described = (field: Field, ...others: string[]) =>
    [...others, invalid.includes(field) ? `${id}-${field}-error` : ''].filter(Boolean).join(' ') ||
    undefined

  return (
    <form className="sr-form" ref={formRef} noValidate onSubmit={onSubmit}>
      {onRemove &&
        (keys.length === 0 ? (
          <p className="sr-prose">{form.emptyList}</p>
        ) : (
          <div className="sr-form-list">
            <h3 className="sr-form-label">{ui.listCount(keys.length)}</h3>
            <ul className="sr-inquiry">
              {keys.map((key) => {
                const found = findItem(copy, key)
                if (!found) return null
                return (
                  <li key={key}>
                    <span>
                      <small>{found.line.title}</small>
                      {found.item.name}
                    </span>
                    <button
                      className="sr-icon-button"
                      type="button"
                      aria-label={ui.remove(found.item.name)}
                      onClick={() => onRemove(key)}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

      <div className="sr-field" data-invalid={invalid.includes('name')}>
        <label htmlFor={`${id}-name`}>{form.name}</label>
        <input
          id={`${id}-name`}
          name="name"
          type="text"
          autoComplete="name"
          enterKeyHint="next"
          maxLength={LIMITS.name}
          required
          data-step
          value={draft.name}
          aria-invalid={invalid.includes('name')}
          aria-describedby={described('name')}
          onChange={change('name')}
          onKeyDown={onward}
        />
        {error('name')}
      </div>

      <div className="sr-field">
        <label htmlFor={`${id}-company`}>
          {form.company}
          <span className="sr-optional">{form.optional}</span>
        </label>
        <input
          id={`${id}-company`}
          name="company"
          type="text"
          autoComplete="organization"
          enterKeyHint="next"
          maxLength={LIMITS.company}
          data-step
          value={draft.company}
          onChange={change('company')}
          onKeyDown={onward}
        />
      </div>

      <div className="sr-field" data-invalid={invalid.includes('email')}>
        <label htmlFor={`${id}-email`}>{form.email}</label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          maxLength={LIMITS.email}
          required
          data-step
          value={draft.email}
          aria-invalid={invalid.includes('email')}
          aria-describedby={described('email')}
          onChange={change('email')}
          onKeyDown={onward}
        />
        {error('email')}
      </div>

      <div className="sr-field" data-invalid={invalid.includes('message')}>
        <label htmlFor={`${id}-message`}>
          {form.message}
          {messageOptional && <span className="sr-optional">{form.optional}</span>}
        </label>
        <p className="sr-field-hint" id={`${id}-message-hint`}>
          {form.messageHint}
        </p>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={5}
          maxLength={LIMITS.message}
          required={!messageOptional}
          data-step
          value={draft.message}
          aria-invalid={invalid.includes('message')}
          aria-describedby={described('message', `${id}-message-hint`)}
          onChange={change('message')}
        />
        {error('message')}
      </div>

      {/* Not for people: it is out of sight and out of reach, so only a program fills it in. */}
      <div className="sr-trap" aria-hidden="true">
        <label htmlFor={`${id}-extra`}>Leave this empty</label>
        <input
          id={`${id}-extra`}
          name="sr-extra"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={extra}
          onChange={(event) => setExtra(event.target.value)}
        />
      </div>

      {trouble && (
        <div className="sr-alert" role="alert">
          <p>{trouble}</p>
          <p className="sr-alert-to">{form.byEmail(CONTACT_EMAIL)}</p>
          <div className="sr-sheet-actions">
            <a
              className={status === 'unavailable' ? 'sr-button' : 'sr-button sr-button-quiet'}
              href={mailto(copy, keys, draft)}
            >
              <Mail size={17} aria-hidden="true" />
              {ui.compose}
            </a>
            <button className="sr-button sr-button-quiet" type="button" onClick={copyInquiry}>
              {copied ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <CopyIcon size={17} aria-hidden="true" />
              )}
              {copied ? ui.copied : ui.copy}
            </button>
          </div>
        </div>
      )}

      <div className="sr-form-foot">
        {/* Where the form cannot send, email is the way; sending stays within reach in case that passes. */}
        <button
          className={status === 'unavailable' ? 'sr-button sr-button-quiet' : 'sr-button'}
          type="submit"
          disabled={sending}
          aria-busy={sending}
        >
          {sending ? form.sending : form.send}
        </button>
        <p className="sr-form-note">
          {form.privacy[0]}
          <a href={form.privacyHref} target="_blank" rel="noreferrer">
            {form.privacy[1]}
          </a>
          {form.privacy[2]}
        </p>
      </div>
    </form>
  )
}

export function InquiryReceipt({
  copy,
  receipt,
  onBack,
}: {
  copy: Copy
  receipt: Receipt
  /** Where there is somewhere to go back to; the plain page has none. */
  onBack?: () => void
}) {
  const { form } = copy.ui
  const titleRef = useRef<HTMLHeadingElement>(null)

  /* The form the visitor was in has gone; put them, and screen readers, on the result. */
  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <div className="sr-receipt">
      <span className="sr-receipt-mark" aria-hidden="true">
        <Check size={22} />
      </span>
      <h3 className="sr-receipt-title" tabIndex={-1} ref={titleRef}>
        {form.sentTitle}
      </h3>
      <p className="sr-receipt-ref">{form.sentRef(receipt.ref)}</p>
      <p className="sr-prose">{form.sentText}</p>
      <p className="sr-receipt-email">{receipt.email}</p>
      {onBack && (
        <button className="sr-button" type="button" onClick={onBack}>
          {form.sentBack}
        </button>
      )}
    </div>
  )
}
