import { useEffect, useState } from 'react'
import { TYPES, addDays, dayText, inr, packetValue, prettyDate, todayStr } from './ledger'
import { Avatar, PhotoImg } from './ui'

const SEG = [
  ['sold', 'Sold', '#2563eb'],
  ['closing', 'Cold room', '#16a34a'],
  ['damage', 'Damage', '#dc2626'],
  ['sampling', 'Sampling', '#d97706'],
  ['mixing', 'Mixing', '#9333ea']
]

export default function Today({ app, date, setDate, row, openEntry, openPhoto, toast }) {
  const { state, actions } = app
  const { settings, users } = state
  const me = users.find((u) => u.id === state.currentUserId)
  const isAdmin = me?.role === 'admin'
  const pv = packetValue(settings)
  const kg = Number(settings.packKg) || 5
  const isToday = date === todayStr()
  const [count, setCount] = useState('')
  useEffect(() => { setCount(row.counted ? String(row.closing) : '') }, [date, row.counted, row.closing])

  const avail = row.opening + row.purchase
  const vals = { sold: Math.max(0, row.sold), closing: Math.max(0, row.closing), damage: row.damage, sampling: row.sampling, mixing: row.mixing }
  const total = Object.values(vals).reduce((a, b) => a + b, 0) || 1

  const vehNames = [...new Set([...settings.vehicles, ...Object.keys(row.vehicles)])]

  const share = () => {
    const text = dayText(row, settings)
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')
  }

  const journey = [
    { l: 'Opening stock (yesterday closing)', v: row.opening, s: '', c: '#64748b' },
    { l: 'Purchase', v: row.purchase, s: '+', c: TYPES.purchase.color, i: '🛒' },
    { l: 'Loaded in vehicle', v: row.load, s: '−', c: TYPES.load.color, i: '🚚' },
    { l: 'Extra loaded', v: row.extra, s: '−', c: TYPES.extra.color, i: '📦' },
    { l: 'Returned from vehicle', v: row.ret, s: '+', c: TYPES.ret.color, i: '↩️' },
    { l: 'Damage (cold room)', v: row.dmgCold, s: '−', c: TYPES.damage.color, i: '⚠️' },
    { l: 'Sampling', v: row.sampling, s: '−', c: TYPES.sampling.color, i: '🧪' },
    { l: 'Mixing', v: row.mixing, s: '−', c: TYPES.mixing.color, i: '🥄' }
  ]

  return (
    <div className="screen">
      <div className="datebar">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">‹</button>
        <label className="date-pick">
          <span className="date-main">{isToday ? 'Today' : prettyDate(date, { weekday: 'long' })}</span>
          <span className="date-sub">{prettyDate(date, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <input type="date" value={date} max={todayStr()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} disabled={isToday} aria-label="Next day">›</button>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-top">
          <span>❄️ Closing stock · cold room</span>
          <button className="hero-share" onClick={share}>Share 📤</button>
        </div>
        <div className="hero-num">{row.closing}<small> packets</small></div>
        <div className="hero-sub">{row.closing * kg} kg · worth {inr(row.closing * pv)} · becomes <b>{prettyDate(addDays(date, 1), { weekday: 'short', day: 'numeric', month: 'short' })}</b> opening</div>
        <div className="stackbar" role="img" aria-label="Where the stock went">
          {SEG.map(([k, , c]) => vals[k] > 0 && <div key={k} style={{ width: `${(vals[k] / total) * 100}%`, background: c }} />)}
        </div>
        <div className="legend">
          {SEG.map(([k, l, c]) => (
            <span key={k}><i style={{ background: c }} />{l} <b>{vals[k]}</b></span>
          ))}
        </div>
      </section>

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi"><span>Available</span><b>{avail}</b><em>opening + purchase</em></div>
        <div className="kpi"><span>Sold</span><b style={{ color: '#2563eb' }}>{row.sold}</b><em>{inr(row.sold * pv)}</em></div>
        <div className="kpi"><span>Damage</span><b style={{ color: '#dc2626' }}>{row.damage}</b><em>loss {inr(row.damage * pv)}</em></div>
      </div>

      {/* ACTIONS */}
      <h2 className="h2">Add entry</h2>
      <div className="actions">
        {Object.entries(TYPES).map(([k, t]) => (
          <button key={k} className="act" onClick={() => openEntry(k)} style={{ '--c': t.color }}>
            <span className="act-ic">{t.icon}</span>
            <span className="act-l">{t.label}</span>
            <span className="act-n">{k === 'damage' ? row.damage : k === 'load' ? row.load : k === 'extra' ? row.extra : k === 'ret' ? row.ret : k === 'purchase' ? row.purchase : k === 'sampling' ? row.sampling : row.mixing}</span>
          </button>
        ))}
      </div>

      {/* VEHICLES */}
      <h2 className="h2">Vehicles</h2>
      <div className="vehs">
        {vehNames.map((v) => {
          const x = row.vehicles[v] || { load: 0, extra: 0, ret: 0, dmg: 0 }
          const sold = x.load + x.extra - x.ret - x.dmg
          return (
            <div className="veh" key={v}>
              <div className="veh-h"><b>🚚 {v}</b><span className="pill">{inr(sold * pv)}</span></div>
              <div className="veh-grid">
                <div><em>Loaded</em><b>{x.load}</b></div>
                <div><em>Extra</em><b>{x.extra}</b></div>
                <div><em>Returned</em><b>{x.ret}</b></div>
                <div><em>Sold</em><b className="blue">{sold}</b></div>
              </div>
              <div className="veh-btns">
                <button onClick={() => openEntry('load', { vehicle: v })}>+ Load</button>
                <button onClick={() => openEntry('extra', { vehicle: v })}>+ Extra</button>
                <button onClick={() => openEntry('ret', { vehicle: v })}>↩ Return</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* JOURNEY */}
      <h2 className="h2">Stock journey</h2>
      <section className="card journey">
        {journey.map((j) => (
          <div className="jrow" key={j.l}>
            <span className="jl">{j.i && <i>{j.i}</i>}{j.l}</span>
            <b style={{ color: j.c }}>{j.s}{j.v}</b>
          </div>
        ))}
        <div className="jrow total"><span className="jl">= Closing (system)</span><b>{row.systemClosing}</b></div>
      </section>

      {/* COUNT */}
      <h2 className="h2">Close the day</h2>
      <section className="card">
        <p className="muted small" style={{ margin: '0 0 10px' }}>Count the packets physically in the cold room. This count becomes tomorrow’s opening stock and shows any shortage.</p>
        <div className="count-row">
          <input className="input" inputMode="numeric" placeholder={`System: ${row.systemClosing}`} value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ''))} />
          <button className="btn primary" onClick={() => { actions.setCount(date, count); toast(count === '' ? 'Count cleared' : '✅ Day closed with count ' + count) }}>
            {row.counted ? 'Update' : 'Close day'}
          </button>
        </div>
        {row.counted && (
          <div className={`variance ${row.variance === 0 ? 'ok' : row.variance < 0 ? 'bad' : 'extra'}`}>
            {row.variance === 0 ? '✅ Perfect match – cold room matches the book' : row.variance < 0 ? `⚠ Shortage of ${-row.variance} packets (${inr(-row.variance * pv)}) – not explained by entries` : `ℹ ${row.variance} extra packets found in cold room`}
          </div>
        )}
      </section>

      {/* LOG */}
      <h2 className="h2">Today’s entries <span className="muted">({row.entries.length})</span></h2>
      {row.entries.length === 0 && <div className="empty">No entries yet. Tap a button above to start. 👆</div>}
      <div className="log">
        {[...row.entries].sort((a, b) => b.ts - a.ts).map((e) => {
          const t = TYPES[e.type]
          const u = users.find((x) => x.id === e.userId)
          return (
            <div className="entry" key={e.id}>
              <span className="entry-ic" style={{ background: t.color + '1f', color: t.color }}>{t.icon}</span>
              <div className="entry-mid">
                <b>{t.label}{e.vehicle ? ` · ${e.vehicle}` : ''}</b>
                <span className="muted small">
                  {e.type === 'damage' && `${e.reason}${e.loc === 'vehicle' ? ' (vehicle)' : ' (cold room)'} · `}
                  {e.note && `${e.note} · `}
                  {new Date(e.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {e.photoIds?.length > 0 && (
                  <div className="mini-photos">
                    {e.photoIds.map((p) => <PhotoImg key={p} id={p} className="mini" onClick={() => openPhoto(p, `${t.label} · ${e.qty} pkt · ${e.reason || ''}`)} />)}
                  </div>
                )}
              </div>
              <div className="entry-r">
                <b style={{ color: t.color }}>{t.sign > 0 ? '+' : '−'}{e.qty}</b>
                <span className="by"><Avatar user={u} size={18} />{u?.name?.split(' ')[0] || '—'}</span>
                {(isAdmin || e.userId === me?.id) && (
                  <button className="del" onClick={() => { if (confirm('Delete this entry?')) { actions.deleteEntry(e.id); toast('Entry deleted') } }}>🗑</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
