import { useCallback, useRef, useState } from 'react'
import type { Copy } from './content'
import { EMPTY_DRAFT, sendInquiry, type Draft, type Outcome } from './inquiry'

/** What the visitor is shown once an inquiry has gone through. */
export type Receipt = { ref: string; email: string }
export type SendStatus = 'idle' | 'sending' | 'failed' | 'unavailable' | 'limited'
export type Inquiry = ReturnType<typeof useInquiry>

/**
 * The inquiry being written and where it stands. It is kept by whoever stays on
 * screen, so that closing the form to look at another item loses nothing, and a
 * send that finishes while the form is closed is still reported.
 */
export function useInquiry(copy: Copy, keys: string[]) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [status, setStatus] = useState<SendStatus>('idle')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const busy = useRef(false)

  /** Sends what is written. Answers null if a send is already under way. */
  const submit = async (extra: string): Promise<Outcome | null> => {
    if (busy.current) return null
    busy.current = true
    setStatus('sending')
    const outcome = await sendInquiry(copy, keys, draft, extra)
    busy.current = false
    if (outcome.kind === 'sent') {
      setReceipt({ ref: outcome.ref, email: draft.email.trim() })
      setDraft((current) => ({ ...current, message: '' }))
      setStatus('idle')
    } else {
      setStatus(outcome.kind === 'invalid' ? 'idle' : outcome.kind)
    }
    return outcome
  }

  const clearReceipt = useCallback(() => setReceipt(null), [])

  return { draft, setDraft, status, receipt, clearReceipt, submit }
}
