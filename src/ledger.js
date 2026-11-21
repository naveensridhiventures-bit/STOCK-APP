// Pure stock logic – no React here so it is easy to test.

const z = (n) => String(n).padStart(2, '0')
export const fmtDate = (d) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
export const todayStr = () => fmtDate(new Date())
export const parseDate = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s, n) => {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return fmtDate(d)
}
export const prettyDate = (s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  parseDate(s).toLocaleDateString('en-IN', opts)

export const TYPES = {
  purchase: { label: 'Purchase', short: 'Bought', icon: '🛒', sign: 1, color: '#16a34a', hint: 'Fresh batter received today' },
  load: { label: 'Vehicle Load', short: 'Loaded', icon: '🚚', sign: -1, color: '#2563eb', hint: 'Regular load into vehicle', vehicle: true },
  extra: { label: 'Extra Load', short: 'Extra', icon: '📦', sign: -1, color: '#0891b2', hint: 'Extra packets given to vehicle', vehicle: true },
  ret: { label: 'Returned', short: 'Returned', icon: '↩️', sign: 1, color: '#7c3aed', hint: 'Unsold packets back from vehicle', vehicle: true },
  damage: { label: 'Damage', short: 'Damage', icon: '⚠️', sign: -1, color: '#dc2626', hint: 'Spoiled / leaked / torn packets', photo: true },
  sampling: { label: 'Sampling', short: 'Sampling', icon: '🧪', sign: -1, color: '#d97706', hint: 'Given for sample / tasting' },
  mixing: { label: 'Mixing', short: 'Mixing', icon: '🥄', sign: -1, color: '#9333ea', hint: 'Mixed / re-processed batter' }
}

export const DAMAGE_REASONS = ['Leaked', 'Sour / fermented', 'Torn packet', 'Expired', 'Vehicle accident', 'Other']

const emptyVeh = () => ({ load: 0, extra: 0, ret: 0, dmg: 0 })

/**
 * Build the day-by-day ledger.
 * closing(day) = opening + purchase − load − extra + returned − damage(cold room) − sampling − mixing
 * sold(day)    = load + extra − returned − damage(in vehicle)
 * If a physical count is entered for a day, that count becomes the closing stock and is
 * carried to the next day as opening stock.
 */
export function buildLedger(state, upTo) {
  const { entries, counts, settings } = state
  const today = todayStr()
  const dates = [settings.startDate || today, today, upTo || today]
  entries.forEach((e) => dates.push(e.date))
  Object.keys(counts).forEach((d) => dates.push(d))
  const start = dates.reduce((a, b) => (a < b ? a : b))
  const end = dates.reduce((a, b) => (a > b ? a : b))

  const byDate = {}
  entries.forEach((e) => (byDate[e.date] ||= []).push(e))

  const rows = []
  const map = {}
  let prev = Number(settings.openingStock) || 0
  let guard = 0
  for (let d = start; d <= end && guard < 4000; d = addDays(d, 1), guard++) {
    const t = { purchase: 0, load: 0, extra: 0, ret: 0, dmgCold: 0, dmgVeh: 0, sampling: 0, mixing: 0 }
    const veh = {}
    for (const e of byDate[d] || []) {
      const q = Number(e.qty) || 0
      const v = e.vehicle ? (veh[e.vehicle] ||= emptyVeh()) : null
      switch (e.type) {
        case 'purchase': t.purchase += q; break
        case 'load': t.load += q; if (v) v.load += q; break
        case 'extra': t.extra += q; if (v) v.extra += q; break
        case 'ret': t.ret += q; if (v) v.ret += q; break
        case 'damage':
          if (e.loc === 'vehicle') { t.dmgVeh += q; if (v) v.dmg += q } else t.dmgCold += q
          break
        case 'sampling': t.sampling += q; break
        case 'mixing': t.mixing += q; break
      }
    }
    const opening = prev
    const systemClosing = opening + t.purchase - t.load - t.extra + t.ret - t.dmgCold - t.sampling - t.mixing
    const c = counts[d]
    const hasCount = c && c.qty !== '' && c.qty != null
    const closing = hasCount ? Number(c.qty) : systemClosing
    const sold = t.load + t.extra - t.ret - t.dmgVeh
    const damage = t.dmgCold + t.dmgVeh
    const row = {
      date: d, opening, ...t, damage, sold, systemClosing, closing,
      counted: !!hasCount, variance: hasCount ? Number(c.qty) - systemClosing : 0,
      sentOut: t.load + t.extra, vehicles: veh, entries: byDate[d] || []
    }
    rows.push(row)
    map[d] = row
    prev = closing
  }
  return { rows, map }
}

export const emptyRow = (date) => ({
  date, opening: 0, purchase: 0, load: 0, extra: 0, ret: 0, dmgCold: 0, dmgVeh: 0, sampling: 0, mixing: 0,
  damage: 0, sold: 0, systemClosing: 0, closing: 0, counted: false, variance: 0, sentOut: 0, vehicles: {}, entries: []
})

export const packetValue = (settings) => (Number(settings.packKg) || 5) * (Number(settings.ratePerKg) || 40)
export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')

export function dayText(row, settings) {
  const pv = packetValue(settings)
  const kg = Number(settings.packKg) || 5
  const lines = [
    `🥣 *${settings.business || 'Batter Stock'}* – ${prettyDate(row.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`,
    '',
    `Opening stock: ${row.opening}`,
    `🛒 Purchase: ${row.purchase}`,
    `🚚 Loaded: ${row.load}   📦 Extra: ${row.extra}`,
    `↩️ Returned: ${row.ret}`,
    `⚠️ Damage: ${row.damage}   🧪 Sampling: ${row.sampling}   🥄 Mixing: ${row.mixing}`,
    '',
    `💰 Sold: ${row.sold} pkt = ${inr(row.sold * pv)}`,
    `✅ *Closing (cold room): ${row.closing} pkt = ${row.closing * kg} kg*`
  ]
  if (row.counted && row.variance) lines.push(`🔎 Count difference: ${row.variance > 0 ? '+' : ''}${row.variance}`)
  const vs = Object.entries(row.vehicles)
  if (vs.length) {
    lines.push('', '*Vehicles*')
    vs.forEach(([n, v]) => lines.push(`${n}: load ${v.load}+${v.extra} extra, back ${v.ret}, sold ${v.load + v.extra - v.ret - v.dmg}`))
  }
  return lines.join('\n')
}

export function toCSV(rows, settings) {
  const pv = packetValue(settings)
  const head = ['Date', 'Opening', 'Purchase', 'Loaded', 'Extra', 'Returned', 'Sold', 'Sales Rs', 'Damage', 'Sampling', 'Mixing', 'Closing', 'Count diff']
  const lines = [head.join(',')]
  rows.forEach((r) => lines.push([r.date, r.opening, r.purchase, r.load, r.extra, r.ret, r.sold, r.sold * pv, r.damage, r.sampling, r.mixing, r.closing, r.variance].join(',')))
  return lines.join('\n')
}
