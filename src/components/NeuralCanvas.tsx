import { useEffect, useRef, useState, type RefObject } from 'react'
import { Orbit } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { NeuralScene } from '../three/NeuralScene'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

type NeuralCanvasProps = {
  experienceRef: RefObject<HTMLDivElement | null>
}

export default function NeuralCanvas({ experienceRef }: NeuralCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<NeuralScene | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [view, setView] = useState(0)

  useEffect(() => {
    const mount = mountRef.current
    const canvas = canvasRef.current
    const experience = experienceRef.current
    if (!mount || !canvas || !experience) return

    let scene: NeuralScene | null = null
    let scrollTrigger: ScrollTrigger | null = null
    let scrollTween: gsap.core.Tween | null = null
    let setupFrame = 0
    let cancelled = false

    const handleAnchorClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return
      }
      const anchor = event.target.closest<HTMLAnchorElement>('a[href^="#"]')
      if (!anchor || anchor.classList.contains('skip-link')) return
      const href = anchor.getAttribute('href')
      if (!href || href === '#') return
      const target = document.getElementById(href.slice(1))
      if (!target) return

      event.preventDefault()
      scrollTween?.kill()
      window.history.pushState(null, '', href)

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        scene?.setScrollSuspension(false)
        target.scrollIntoView()
        return
      }

      scene?.setScrollSuspension(true)
      const resumeScene = () => scene?.setScrollSuspension(false)
      scrollTween = gsap.to(window, {
        duration: 0.72,
        ease: 'power2.inOut',
        overwrite: 'auto',
        scrollTo: { y: target, offsetY: 88, autoKill: false },
        onComplete: resumeScene,
        onInterrupt: resumeScene,
      })
    }

    document.addEventListener('click', handleAnchorClick)

    const setup = () => {
      if (cancelled) return
      try {
        scene = new NeuralScene(mount, canvas, () => setReady(true))
        sceneRef.current = scene
        scrollTrigger = ScrollTrigger.create({
          trigger: experience,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => scene?.setProgress(self.progress),
        })
        document.fonts.ready.then(() => ScrollTrigger.refresh())
      } catch {
        if (!cancelled) {
          setFailed(true)
          setReady(false)
        }
      }
    }

    setupFrame = requestAnimationFrame(setup)

    return () => {
      cancelled = true
      cancelAnimationFrame(setupFrame)
      document.removeEventListener('click', handleAnchorClick)
      scrollTween?.kill()
      scrollTrigger?.kill()
      scene?.dispose()
      sceneRef.current = null
    }
  }, [experienceRef])

  const changeView = () => {
    const nextView = sceneRef.current?.cycleView()
    if (typeof nextView === 'number') setView(nextView)
  }

  return (
    <div
      ref={mountRef}
      className={`neural-mount${ready ? ' is-ready' : ''}${failed ? ' has-failed' : ''}`}
    >
      <div className="scene-poster" aria-hidden="true">
        <div className="poster-orbit poster-orbit-one" />
        <div className="poster-orbit poster-orbit-two" />
        <div className="poster-orbit poster-orbit-three" />
        <div className="poster-core">
          <span />
          <span />
        </div>
      </div>
      <canvas ref={canvasRef} className="neural-canvas" aria-hidden="true" />
      <div className="scene-controls">
        <span className="scene-status">
          <i aria-hidden="true" />
          {failed ? 'STATIC 3D MODE' : 'INTERACTIVE NEURAL CORE'}
        </span>
        <button
          className="view-button"
          type="button"
          onClick={changeView}
          disabled={!ready}
          aria-label="3Dオブジェクトの視点を変える"
        >
          <Orbit size={17} aria-hidden="true" />
          <span>視点を変える</span>
          <b>0{view + 1}</b>
        </button>
      </div>
    </div>
  )
}
