import { useEffect } from 'react'

export const PageHeader = ({ icon, title, subtitle, actions }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
        {icon} {title}
      </h1>
      {subtitle && <p className="mt-2 text-gray-600 max-w-2xl">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
  </div>
)

export const Card = ({ className = '', children }) => (
  <div className={`bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/60 ${className}`}>{children}</div>
)

const TONES = {
  emerald: { text: 'text-emerald-600', icon: 'from-emerald-400 to-emerald-600' },
  rose: { text: 'text-rose-600', icon: 'from-rose-400 to-rose-600' },
  indigo: { text: 'text-indigo-600', icon: 'from-indigo-400 to-indigo-600' },
  amber: { text: 'text-amber-600', icon: 'from-amber-400 to-amber-600' },
}

export const StatCard = ({ title, value, icon, tone = 'indigo', hint }) => {
  const t = TONES[tone]
  return (
    <Card className="p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className={`p-3 bg-gradient-to-br ${t.icon} rounded-2xl shadow-lg text-2xl`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className={`mt-1 text-2xl xl:text-xl 2xl:text-2xl font-black break-words ${t.text}`}>{value}</p>
          {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
        </div>
      </div>
    </Card>
  )
}

export const TypeBadge = ({ type }) => (
  <span
    className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap ${
      type === 'income' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-rose-500 to-rose-600'
    }`}
  >
    {type === 'income' ? 'PENDAPATAN' : 'PENGELUARAN'}
  </span>
)

export const ProgressBar = ({ value, max, danger = false }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = danger
    ? 'from-rose-400 to-rose-600'
    : pct >= 80
      ? 'from-amber-400 to-amber-500'
      : 'from-emerald-400 to-emerald-600'
  return (
    <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export const Button = ({ variant = 'primary', className = '', ...props }) => {
  const styles = {
    primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg',
    success: 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg',
    secondary: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm',
    danger: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

const inputClass =
  'w-full px-4 py-2.5 border-2 border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all'

export const Input = ({ className = '', ...props }) => <input className={`${inputClass} ${className}`} {...props} />

export const Select = ({ className = '', ...props }) => <select className={`${inputClass} ${className}`} {...props} />

export const Textarea = ({ className = '', ...props }) => <textarea className={`${inputClass} ${className}`} {...props} />

export const Field = ({ label, children, error }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</span>
    {children}
    {error && <span className="block mt-1 text-sm text-rose-600">{error}</span>}
  </label>
)

export const Modal = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label="Tutup">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const EmptyState = ({ icon = '🗂️', message, children }) => (
  <div className="text-center py-12 text-gray-500">
    <div className="text-4xl mb-3">{icon}</div>
    <p>{message}</p>
    {children && <div className="mt-4">{children}</div>}
  </div>
)
