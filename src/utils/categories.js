import {
  Bus,
  Clapperboard,
  Factory,
  Gift,
  Megaphone,
  Package,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  Users,
  Wallet,
} from 'lucide-react'

// Pastel pairings from the design system, cycled across categories.
export const PALETTES = [
  { disc: 'bg-secondary-fixed/60 text-secondary', pill: 'bg-secondary-fixed/70 text-on-secondary-container', text: 'text-secondary', bar: 'bg-secondary-container', border: 'border-secondary-fixed' },
  { disc: 'bg-primary-fixed/50 text-primary', pill: 'bg-primary-fixed text-on-primary-container', text: 'text-primary', bar: 'bg-primary-container', border: 'border-primary-fixed' },
  { disc: 'bg-surface-container-high text-on-surface', pill: 'bg-surface-container text-on-surface', text: 'text-on-surface', bar: 'bg-outline', border: 'border-outline-variant/40' },
  { disc: 'bg-tertiary-fixed/60 text-tertiary', pill: 'bg-tertiary-fixed text-on-tertiary-container', text: 'text-tertiary', bar: 'bg-tertiary-container', border: 'border-tertiary-fixed' },
]

const META = {
  // income
  Penjualan: { icon: ShoppingBag, palette: 1 },
  Gaji: { icon: Wallet, palette: 0 },
  Investasi: { icon: TrendingUp, palette: 3 },
  Bonus: { icon: Gift, palette: 0 },
  // expense
  'Bahan Baku': { icon: Package, palette: 0 },
  'Gaji Karyawan': { icon: Users, palette: 3 },
  Marketing: { icon: Megaphone, palette: 1 },
  Operasional: { icon: Factory, palette: 2 },
  Makanan: { icon: UtensilsCrossed, palette: 0 },
  Transportasi: { icon: Bus, palette: 2 },
  Tagihan: { icon: ReceiptText, palette: 3 },
  Hiburan: { icon: Clapperboard, palette: 1 },
  Lainnya: { icon: Sparkles, palette: 2 },
}

export const categoryMeta = (name = 'Lainnya') => {
  const meta = META[name] || META.Lainnya
  return { ...PALETTES[meta.palette], Icon: meta.icon }
}
