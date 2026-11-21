import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from './store'
import { buildLedger, emptyRow, todayStr } from './ledger'
import { Avatar, Lightbox, Toast } from './ui'
import Setup from './Setup'
import Today from './Today'
import Damage from './Damage'
import Reports from './Reports'
import Settings from './Settings'
import EntrySheet from './EntrySheet'
import './styles.css'

const TABS = [
  ['today', '🏠', 'Today'],
  ['damage', '⚠️', 'Damage'],
  ['reports', '📊', 'Reports'],
  ['settings', '⚙️', 'Settings']
]

export default function App() {
  const [state, actions] = useStore()
  const app = { state, actions }
  const [tab, setTab] = useState('today')
  const [date, setDate] = useState(todayStr())
  const [sheet, setSheet] = useState({ open: false, type: 'purchase', preset: null })
  const [photo, setPhoto] = useState(null)
  const [msg, setMsg] = useState('')
  const [installEvt, setInstallEvt] = useState(null)

  const toast = useCallback((m) => { setMsg(m); clearTimeout(window.__t); window.__t = setTimeout(() => setMsg(''), 2200) }, [])

  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallEvt(e) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  const install = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null) }

  const ledger = useMemo(() => buildLedger(state, date), [state, date])
  const row = ledger.map[date] || emptyRow(date)
  const me = state.users.find((u) => u.id === state.currentUserId)

  const openEntry = (type, preset = null) => setSheet({ open: true, type, preset })
  const goDay = (d) => { setDate(d); setTab('today'); window.scrollTo({ top: 0 }) }

  if (!state.ready) return <Setup app={app} />

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="brand-ic">🥣</span><div><b>{state.settings.business}</b><small>{state.settings.packKg} kg packets · ₹{state.settings.ratePerKg}/kg</small></div></div>
        <button className="who" onClick={() => setTab('settings')} aria-label="Switch user"><Avatar user={me} size={30} /><span>{me?.name?.split(' ')[0]}</span></button>
      </header>

      <main>
        {tab === 'today' && <Today app={app} date={date} setDate={setDate} row={row} openEntry={openEntry} openPhoto={(id, cap) => setPhoto({ id, cap })} toast={toast} />}
        {tab === 'damage' && <Damage app={app} ledger={ledger} openPhoto={(id, cap) => setPhoto({ id, cap })} openEntry={openEntry} />}
        {tab === 'reports' && <Reports app={app} ledger={ledger} goDay={goDay} />}
        {tab === 'settings' && <Settings app={app} toast={toast} installEvt={installEvt} onInstall={install} />}
      </main>

      {tab === 'today' && (
        <button className="fab" onClick={() => openEntry('load')} aria-label="Quick add vehicle load">🚚<span>Load</span></button>
      )}

      <nav className="tabbar">
        {TABS.map(([k, i, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); window.scrollTo({ top: 0 }) }}>
            <span>{i}</span>{l}
          </button>
        ))}
      </nav>

      <EntrySheet open={sheet.open} type={sheet.type} preset={sheet.preset} date={date} row={row} app={app} toast={toast} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
      <Lightbox photoId={photo?.id} caption={photo?.cap} onClose={() => setPhoto(null)} />
      <Toast msg={msg} />
    </div>
  )
}
