import { useEffect, useRef, useState } from 'react'

interface BakeryBubble {
  x: number
  y: number
  targetR: number
  r: number
  alpha: number
  vx: number
  vy: number
  color: string
}

export default function IntroSplashScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const [isFading, setIsFading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFading(true), 2000)
    const destroyTimer = setTimeout(() => setIsVisible(false), 2700)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(destroyTimer)
    }
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const bubbles: BakeryBubble[] = []
    const colors = [
      'rgba(251, 146, 60, ', // Warm Orange
      'rgba(253, 224, 71, ', // Golden Yellow
      'rgba(248, 113, 113, ', // Coral Red
    ]

    for (let i = 0; i < 40; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        targetR: Math.random() * 20 + 10,
        r: 0, // Starts from 0 for expansion effect
        alpha: Math.random() * 0.4 + 0.2,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0]!,
      })
    }

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    let frame = 0
    const render = () => {
      frame++
      ctx.fillStyle = '#1e110b' // Very warm deep dark chocolate-brown
      ctx.fillRect(0, 0, width, height)

      // Draw warm bubbles
      bubbles.forEach((b) => {
        if (!b) return
        b.x += b.vx
        b.y += b.vy

        // Grow to target size
        if (b.r < b.targetR) {
          b.r += 0.5
        }

        // Float wrap
        if (b.x < -b.r) b.x = width + b.r
        if (b.x > width + b.r) b.x = -b.r
        if (b.y < -b.r) b.y = height + b.r
        if (b.y > height + b.r) b.y = -b.r

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fillStyle = b.color + b.alpha + ')'
        ctx.fill()
      })

      // Main Text
      const text = 'ROTIFOLK'
      ctx.font = '900 25px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.letterSpacing = '6px'
      ctx.fillStyle = '#ffffff'

      ctx.shadowBlur = 10
      ctx.shadowColor = 'rgba(251, 146, 60, 0.5)'

      const progress = Math.min(frame / 40, 1)
      const currentText = text.substring(0, Math.floor(text.length * progress))
      ctx.fillText(currentText, width / 2, height / 2)
      ctx.shadowBlur = 0

      // Sub
      ctx.font = '500 10px monospace'
      ctx.letterSpacing = '2px'
      ctx.fillStyle = 'rgba(251, 146, 60, 0.8)'
      ctx.fillText('WARM SOCIAL GATHERING', width / 2, height / 2 + 32)

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e110b',
        opacity: isFading ? 0 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isFading ? 'none' : 'auto',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
