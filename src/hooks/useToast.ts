import { useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState({ msg: '', visible: false })

  function showToast(msg: string) {
    setToast({ msg, visible: true })
    setTimeout(() => setToast({ msg: '', visible: false }), 3000)
  }

  return { toast, showToast }
}
