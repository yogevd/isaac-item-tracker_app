import { useEffect, useState } from 'react'
import type { RunState } from '../../shared/types'

function App(): React.JSX.Element {
  const [state, setState] = useState<RunState | null>(null)
  const [log, setLog] = useState<string[]>([])

  const addLog = (msg: string): void =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50))

  useEffect(() => {
    window.api.getInitialState().then((s) => {
      setState(s)
      addLog(`Loaded initial state — ${s.items.length} items`)
    })

    const unsubs = [
      window.api.onItemPickup(({ itemId }) => {
        setState((prev) => prev ? { ...prev, items: [...prev.items, itemId] } : prev)
        addLog(`Item pickup: #${itemId}`)
      }),
      window.api.onItemRemoval(({ itemId }) => {
        setState((prev) => {
          if (!prev) return prev
          const idx = prev.items.indexOf(itemId)
          const items = idx >= 0 ? [...prev.items.slice(0, idx), ...prev.items.slice(idx + 1)] : prev.items
          return { ...prev, items }
        })
        addLog(`Item removed: #${itemId}`)
      }),
      window.api.onRunReset(({ seed }) => {
        setState((prev) => prev ? { ...prev, seed, items: [], floor: null } : prev)
        addLog(`New run — seed: ${seed ?? 'unknown'}`)
      }),
      window.api.onFloorChange(({ stage, stageType }) => {
        setState((prev) => prev ? { ...prev, floor: { stage, stageType } } : prev)
        addLog(`Floor: stage ${stage} type ${stageType}`)
      }),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [])

  return (
    <div style={{ fontFamily: 'monospace', padding: 16, color: '#eee', background: '#1a1a2e', minHeight: '100vh' }}>
      <h2 style={{ margin: '0 0 8px' }}>Isaac Item Tracker</h2>
      <div style={{ marginBottom: 8, color: '#aaa' }}>
        Seed: <b style={{ color: '#fff' }}>{state?.seed ?? '—'}</b>
        &nbsp;|&nbsp;
        Floor: <b style={{ color: '#fff' }}>{state?.floor ? `${state.floor.stage}-${state.floor.stageType}` : '—'}</b>
        &nbsp;|&nbsp;
        Items: <b style={{ color: '#4caf50' }}>{state?.items.length ?? 0}</b>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {state?.items.map((id, i) => (
          <span key={i} style={{ background: '#2a2a4a', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>
            #{id}
          </span>
        ))}
        {!state?.items.length && <span style={{ color: '#666' }}>No items yet</span>}
      </div>
      <div style={{ borderTop: '1px solid #333', paddingTop: 8, fontSize: 12, color: '#888', maxHeight: 200, overflowY: 'auto' }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  )
}

export default App
