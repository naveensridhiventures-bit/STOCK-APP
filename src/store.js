import { useCallback, useEffect, useState } from 'react'
import { todayStr } from './ledger'
import { allPhotos, clearPhotos, delPhoto, restorePhotos } from './db'

const KEY = 'batterstock.v1'
export const COLORS = ['#0b6b4f', '#2563eb', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#be185d', '#65a30d']
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

const blank = () => ({
  ready: false,
  settings: { business: 'Idli Dosa Batter', packKg: 5, ratePerKg: 40, openingStock: 0, startDate: todayStr(), vehicles: ['Vehicle 1', 'Vehicle 2'] },
  users: [],
  currentUserId: null,
  entries: [],
  counts: {}
})

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...blank(), ...JSON.parse(raw) }
  } catch (e) { /* ignore */ }
  return blank()
}

export function useStore() {
  const [state, setState] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch (e) { console.warn('save failed', e) }
  }, [state])

  const up = useCallback((fn) => setState((s) => fn(s)), [])

  const actions = {
    setup({ business, name, ratePerKg, packKg, openingStock, vehicles, pin }) {
      const id = uid()
      up((s) => ({
        ...s,
        ready: true,
        settings: { ...s.settings, business, ratePerKg, packKg, openingStock, vehicles, startDate: todayStr() },
        users: [{ id, name, color: COLORS[0], role: 'admin', pin: pin || '' }],
        currentUserId: id
      }))
    },
    addEntry(e) { up((s) => ({ ...s, entries: [...s.entries, { id: uid(), ts: Date.now(), userId: s.currentUserId, ...e }] })) },
    deleteEntry(id) {
      up((s) => {
        const e = s.entries.find((x) => x.id === id)
        ;(e?.photoIds || []).forEach((p) => delPhoto(p))
        return { ...s, entries: s.entries.filter((x) => x.id !== id) }
      })
    },
    setCount(date, qty) {
      up((s) => {
        const counts = { ...s.counts }
        if (qty === '' || qty == null) delete counts[date]
        else counts[date] = { qty: Number(qty), userId: s.currentUserId, ts: Date.now() }
        return { ...s, counts }
      })
    },
    updateSettings(patch) { up((s) => ({ ...s, settings: { ...s.settings, ...patch } })) },
    addUser(u) { up((s) => ({ ...s, users: [...s.users, { id: uid(), color: COLORS[s.users.length % COLORS.length], role: 'staff', pin: '', ...u }] })) },
    removeUser(id) { up((s) => ({ ...s, users: s.users.filter((u) => u.id !== id) })) },
    updateUser(id, patch) { up((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })) },
    switchUser(id) { up((s) => ({ ...s, currentUserId: id })) },
    async exportAll() {
      const photos = await allPhotos()
      return JSON.stringify({ app: 'batterstock', version: 1, exportedAt: new Date().toISOString(), state, photos })
    },
    async importAll(text) {
      const d = JSON.parse(text)
      if (d.app !== 'batterstock') throw new Error('This is not a Batter Stock backup file')
      await clearPhotos()
      await restorePhotos(d.photos)
      setState({ ...blank(), ...d.state })
    },
    async reset() {
      await clearPhotos()
      localStorage.removeItem(KEY)
      setState(blank())
    }
  }
  return [state, actions]
}
