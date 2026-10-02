import { useEffect } from 'react'
import { X } from 'lucide-react'

export const PageHeader = ({ icon, title, subtitle, actions }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 className="text-headline-lg md:text-display-lg text-on-surface">
        {icon && <span className="mr-2">{icon}</span>}
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-body-md text-on-surface-variant max-w-2xl">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
)

export const Card = ({ className = '', children, ...props }) => (
  <div className={`glass rounded-card md:rounded-card-lg ${className}`} {...props}>
    {children}
  </div>
)

export const SectionTitle = ({ title, subtitle, action }) => (
  <div className="flex items-end justify-between gap-3 mb-3 px-1">
    <div>
      <h2 className="text-label-lg text-on-surface tracking-tight">{title}</h2>
      {subtitle && <p className="text-label-sm text-on-surface-variant font-medium">{subtitle}</p>}
    </div>
    {action}
  </div>
)

const TONES = {
  mint: { text: 'text-mint-ink', disc: 'bg-mint-soft text-mint-ink' },
  raspberry: { text: 'text-raspberry-ink', disc: 'bg-raspberry-soft text-raspberry-ink' },
  primary: { text: 'text-primary', disc: 'bg-primary-fixed/60 text-primary' },
  tertiary: { text: 'text-tertiary', disc: 'bg-tertiary-fixed/70 text-tertiary' },
  secondary: { text: 'text-secondary', disc: 'bg-secondary-fixed/70 text-secondary' },
}

export const StatCard = ({ title, value, icon: Icon, tone = 'primary', hint }) => {
  const t = TONES[tone]
  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center gap-3">
        <div className={`icon-disc w-11 h-11 ${t.disc}`}>{Icon && <Icon size={22} />}</div>
        <div className="min-w-0">
          <p className="text-label-sm uppercase text-on-surface-variant">{title}</p>
          <p className={`text-headline-sm font-extrabold tnum break-words ${t.text}`}>{value}</p>
          {hint && <p className="text-body-sm text-on-surface-variant">{hint}</p>}
        </div>
      </div>
    </Card>
  )
}

// Pastel micro-pill used for categories and statuses.
export const Pill = ({ className = '', children }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-label-sm whitespace-nowrap ${className}`}>{children}</span>
)

export const TypeBadge = ({ type }) =>
  type === 'income' ? (
    <Pill className="bg-mint-soft text-mint-ink">Pemasukan</Pill>
  ) : (
    <Pill className="bg-raspberry-soft text-raspberry-ink">Pengeluaran</Pill>
  )

export const ProgressBar = ({ value, max, danger = false, color, thick = false }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const fill = danger ? 'bg-raspberry' : color || 'bg-gradient-to-r from-primary-container via-tertiary-container to-secondary-container'
  return (
    <div className={`w-full rounded-full bg-surface-container-high overflow-hidden ${thick ? 'h-3.5 p-[2px]' : 'h-1.5'}`}>
      <div className={`h-full rounded-full ${fill} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export const Button = ({ variant = 'primary', size = 'md', className = '', ...props }) => {
  const styles = {
    primary: 'glossy-btn hover:brightness-105',
    success: 'glossy-btn hover:brightness-105',
    dark: 'bg-on-primary-container text-white shadow-md hover:bg-on-primary-container/90',
    secondary: 'bg-white/80 text-on-surface border border-tertiary-container/30 shadow-level-1 backdrop-blur hover:bg-white',
    soft: 'bg-primary-fixed/40 text-primary hover:bg-primary-fixed/70',
    danger: 'bg-raspberry-soft text-raspberry-ink hover:bg-raspberry-soft/70',
  }
  const sizes = { sm: 'px-3 py-1.5 text-label-md', md: 'px-5 py-2.5 text-label-lg' }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${sizes[size]} ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

export const IconButton = ({ label, className = '', children, ...props }) => (
  <button
    aria-label={label}
    title={label}
    className={`icon-disc w-10 h-10 bg-white/80 text-primary border border-outline-variant/30 shadow-sm hover:bg-primary-fixed/30 transition-all active:scale-95 ${className}`}
    {...props}
  >
    {children}
  </button>
)

const inputClass =
  'w-full px-4 py-2.5 rounded-tile border border-outline-variant/60 bg-white/80 text-body-lg text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/20 transition-all'

export const Input = ({ className = '', ...props }) => <input className={`${inputClass} ${className}`} {...props} />

export const Select = ({ className = '', ...props }) => <select className={`${inputClass} ${className}`} {...props} />

export const Textarea = ({ className = '', ...props }) => <textarea className={`${inputClass} ${className}`} {...props} />

export const Field = ({ label, children, error }) => (
  <label className="block">
    <span className="block text-label-md text-on-surface-variant mb-1.5 px-1">{label}</span>
    {children}
    {error && <span className="block mt-1 px-1 text-body-sm text-raspberry-ink">{error}</span>}
  </label>
)

// Segmented pill switcher (e.g. income/expense).
export const Segmented = ({ options, value, onChange }) => (
  <div className="grid gap-1 p-1 rounded-full bg-surface-container" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={`py-2 rounded-full text-label-lg transition-all ${
          value === o.value ? 'bg-white text-on-surface shadow-level-1' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-on-surface/25 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-canvas/95 backdrop-blur-2xl rounded-t-sheet sm:rounded-card-lg shadow-level-3 p-6 pt-3 sm:pt-6"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-outline-variant sm:hidden" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-headline-md text-on-surface">{title}</h2>
          <IconButton label="Tutup" onClick={onClose} className="!w-9 !h-9 text-on-surface-variant">
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}

export const EmptyState = ({ icon = '🌸', message, children }) => (
  <div className="text-center py-10 text-on-surface-variant">
    <div className="text-4xl mb-2">{icon}</div>
    <p className="text-body-md">{message}</p>
    {children && <div className="mt-4">{children}</div>}
  </div>
)
