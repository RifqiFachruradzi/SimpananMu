import { categoryMeta } from '../utils/categories.js'
import { formatAmount, formatRelativeDay } from '../utils/finance.js'
import { Pill } from './ui.jsx'

// Ledger row: pastel category disc, title, date + category pill, signed amount.
const TransactionItem = ({ t, onClick, trailing, showNote = false }) => {
  const meta = categoryMeta(t.category)
  const income = t.type === 'income'
  return (
    <li className="flex items-center gap-1">
      <button
        onClick={onClick}
        className="flex-1 min-w-0 flex items-center justify-between gap-3 py-3 text-left hover:bg-blush/60 -mx-2 px-2 rounded-tile transition-colors"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className={`icon-disc w-11 h-11 shadow-sm ${income ? 'bg-secondary-fixed/60 text-secondary' : meta.disc}`}>
            <meta.Icon size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-body-md font-bold text-on-surface truncate">{t.description}</span>
            <span className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span className="text-label-sm text-on-surface-variant whitespace-nowrap">{formatRelativeDay(t.date)}</span>
              <span className="w-1 h-1 shrink-0 rounded-full bg-outline-variant" />
              <Pill className={`truncate max-w-[9rem] ${income ? 'bg-secondary-fixed text-on-secondary-container' : meta.pill}`}>
                {income ? 'Income' : t.category || 'Lainnya'}
              </Pill>
            </span>
            {showNote && t.note && <span className="block text-body-sm text-on-surface-variant truncate mt-0.5">{t.note}</span>}
          </span>
        </span>
        <span className={`text-body-md font-bold tnum whitespace-nowrap ${income ? 'text-tertiary' : 'text-primary'}`}>
          {income ? '+' : '-'}Rp {formatAmount(t.amount)}
        </span>
      </button>
      {trailing}
    </li>
  )
}

export default TransactionItem
