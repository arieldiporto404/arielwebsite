import { useEffect } from 'react'

export function useKeyPress(callback, keyCodes) {
  useEffect(() => {
    const handler = (event) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return
      if (keyCodes.includes(event.code) && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        callback(event)
      }
    }

    window.addEventListener('keydown', handler, { passive: true })
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [callback, keyCodes])
}
