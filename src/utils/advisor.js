import { formatRupiah, groupByCategory, monthKey, monthlySeries, summarize, todayISO } from './finance.js'

const monthsUntil = (deadline, today) => {
  const [y1, m1] = today.split('-').map(Number)
  const [y2, m2] = deadline.split('-').map(Number)
  return (y2 - y1) * 12 + (m2 - m1)
}

// A compact snapshot of the user's finances, sent to the AI as context and
// used by the offline advisor.
export const buildFinanceContext = (transactions, { budgets, goals }) => {
  const today = todayISO()
  const current = monthKey(today)
  const thisMonth = transactions.filter((t) => monthKey(t.date) === current)
  const series = monthlySeries(transactions, 3)
  const spentByCategory = Object.fromEntries(groupByCategory(thisMonth, 'expense').map((c) => [c.name, c.value]))
  const lastThree = transactions.filter((t) => monthKey(t.date) >= series[0].month)

  return {
    hariIni: today,
    bulanIni: { ...summarize(thisMonth), pengeluaranPerKategori: spentByCategory },
    saldoKeseluruhan: summarize(transactions).netProfit,
    arusKas3Bulan: series.map(({ month, income, expense, net }) => ({ bulan: month, pendapatan: income, pengeluaran: expense, selisih: net })),
    rataRataPengeluaranPerKategori3Bulan: Object.fromEntries(
      groupByCategory(lastThree, 'expense').map((c) => [c.name, Math.round(c.value / series.length)]),
    ),
    anggaranBulanan: Object.entries(budgets).map(([kategori, batas]) => ({
      kategori,
      batas,
      terpakai: spentByCategory[kategori] || 0,
    })),
    targetTabungan: goals.map((g) => ({
      nama: g.name,
      target: g.target,
      terkumpul: g.saved,
      tenggat: g.deadline || null,
      sisaBulan: g.deadline ? monthsUntil(g.deadline, today) : null,
    })),
    transaksiTerakhir: [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 15)
      .map((t) => ({ tanggal: t.date, deskripsi: t.description, kategori: t.category || 'Lainnya', jenis: t.type, nominal: t.amount })),
  }
}

const FIXED_CATEGORIES = ['Gaji Karyawan']

const has = (text, ...words) => words.some((w) => text.includes(w))

// Rule-based answers used when the AI endpoint is unavailable (no API key,
// offline, or running a static build). Returns markdown.
export const localAdvice = (question, ctx) => {
  const q = question.toLowerCase()
  const { bulanIni, anggaranBulanan, targetTabungan, arusKas3Bulan, rataRataPengeluaranPerKategori3Bulan } = ctx
  const lines = []
  // Salaries are a commitment, not a place to look for savings.
  const topExpenses = Object.entries(rataRataPengeluaranPerKategori3Bulan)
    .filter(([cat]) => !FIXED_CATEGORIES.includes(cat))
    .sort((a, b) => b[1] - a[1])
  const avgIncome = arusKas3Bulan.reduce((s, m) => s + m.pendapatan, 0) / (arusKas3Bulan.length || 1)
  const avgExpense = arusKas3Bulan.reduce((s, m) => s + m.pengeluaran, 0) / (arusKas3Bulan.length || 1)

  const wantsGoals = has(q, 'target', 'tabung', 'nabung', 'goal')
  const wantsBudget = has(q, 'anggaran', 'budget', '50/30/20', 'batas')
  const wantsCashflow = has(q, 'arus', 'cash', 'analisis', 'tren', 'bulan lalu')

  if (wantsGoals) {
    lines.push('### 🐷 Rencana target tabungan')
    if (!targetTabungan.length) lines.push('Kamu belum punya target tabungan. Buat dulu di halaman **Tabungan** ya.')
    targetTabungan.forEach((g) => {
      const sisa = Math.max(0, g.target - g.terkumpul)
      if (!sisa) return lines.push(`- **${g.nama}**: sudah tercapai 🎉`)
      const perBulan = g.sisaBulan > 0 ? `±${formatRupiah(Math.ceil(sisa / g.sisaBulan))}/bulan selama ${g.sisaBulan} bulan` : 'belum ada tenggat; coba tetapkan tenggat agar bisa dihitung per bulan'
      lines.push(`- **${g.nama}**: kurang ${formatRupiah(sisa)} → ${perBulan}`)
    })
    const surplus = avgIncome - avgExpense
    if (surplus > 0) lines.push(`\nRata-rata surplus 3 bulan terakhir ${formatRupiah(surplus)}/bulan. Sisihkan di awal bulan (pay yourself first) sebelum belanja.`)
  } else if (wantsBudget) {
    lines.push('### 🎯 Usulan anggaran (pola 50/30/20)')
    lines.push(`Berdasarkan rata-rata pendapatan ${formatRupiah(avgIncome)}/bulan:`)
    lines.push(`- **Kebutuhan (50%)**: ${formatRupiah(avgIncome * 0.5)}`)
    lines.push(`- **Keinginan (30%)**: ${formatRupiah(avgIncome * 0.3)}`)
    lines.push(`- **Tabungan (20%)**: ${formatRupiah(avgIncome * 0.2)}`)
    const over = anggaranBulanan.filter((b) => b.terpakai > b.batas)
    if (over.length) lines.push(`\n⚠️ Melebihi anggaran bulan ini: ${over.map((b) => `**${b.kategori}** (${formatRupiah(b.terpakai)} / ${formatRupiah(b.batas)})`).join(', ')}.`)
  } else if (wantsCashflow) {
    lines.push('### 📊 Arus kas 3 bulan terakhir')
    arusKas3Bulan.forEach((m) => lines.push(`- **${m.bulan}**: masuk ${formatRupiah(m.pendapatan)}, keluar ${formatRupiah(m.pengeluaran)}, selisih ${formatRupiah(m.selisih)}`))
    const [first, last] = [arusKas3Bulan[0], arusKas3Bulan[arusKas3Bulan.length - 1]]
    if (first && last && first.pengeluaran > 0) {
      const change = ((last.pengeluaran - first.pengeluaran) / first.pengeluaran) * 100
      lines.push(`\nPengeluaran ${change >= 0 ? 'naik' : 'turun'} ${Math.abs(change).toFixed(0)}% dibanding ${first.bulan}.`)
    }
  } else {
    lines.push('### 💡 Rencana hemat bulan ini')
    lines.push(`Bulan ini: pendapatan ${formatRupiah(bulanIni.totalIncome)}, pengeluaran ${formatRupiah(bulanIni.totalExpense)}, selisih ${formatRupiah(bulanIni.netProfit)}.`)
    if (topExpenses.length) {
      lines.push('\n**Kategori terbesar (rata-rata/bulan) dan target pengurangan 10–15%:**')
      topExpenses.slice(0, 3).forEach(([cat, avg]) => lines.push(`- **${cat}**: ${formatRupiah(avg)} → targetkan ${formatRupiah(Math.round(avg * 0.87))} (hemat ±${formatRupiah(Math.round(avg * 0.13))})`))
      const potential = topExpenses.slice(0, 3).reduce((s, [, avg]) => s + avg * 0.13, 0)
      lines.push(`\nPotensi hemat: **${formatRupiah(Math.round(potential))}/bulan**.`)
    } else {
      lines.push('Belum ada data pengeluaran. Catat transaksimu dulu supaya aku bisa memberi saran yang tepat.')
    }
    const unbudgeted = topExpenses.filter(([cat]) => !anggaranBulanan.some((b) => b.kategori === cat)).slice(0, 2)
    if (unbudgeted.length) lines.push(`\nTips: pasang anggaran untuk ${unbudgeted.map(([c]) => `**${c}**`).join(' dan ')} di halaman Anggaran.`)
  }

  lines.push('\n_Mode offline: jawaban dibuat otomatis dari datamu. Saat AI tersambung, Buddy bisa menjawab lebih lengkap._')
  return lines.join('\n')
}
