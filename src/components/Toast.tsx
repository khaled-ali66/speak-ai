import { CheckCircle2 } from 'lucide-react'

interface ToastProps { msg: string; visible: boolean }

export function Toast({ msg, visible }: ToastProps) {
  return (
    <div className={`fixed bottom-20 md:bottom-7 right-4 md:right-7 bg-brand-card2 border border-brand-border rounded-xl px-4 py-3 md:px-5 md:py-3.5 text-xs md:text-sm flex items-center gap-2 md:gap-3 shadow-lg z-[9998] transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <CheckCircle2 className="text-brand-green w-4 h-4 md:w-5 md:h-5" />
      <span className="font-medium">{msg}</span>
    </div>
  )
}
