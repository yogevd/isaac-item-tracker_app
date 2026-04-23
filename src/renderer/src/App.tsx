import { useEffect } from 'react'
import { useTrackerStore } from './store'
import ItemCard from './components/ItemCard'

function floorName(stage: number, stageType: number): string {
  const altNames: Record<number, string> = { 1: 'Downpour', 2: 'Dross', 3: 'Mines', 4: 'Ashpit', 5: 'Mausoleum', 6: 'Gehenna' }
  const baseNames: Record<number, string> = {
    1: 'Basement I', 2: 'Basement II', 3: 'Caves I', 4: 'Caves II',
    5: 'Depths I', 6: 'Depths II', 7: 'Womb I', 8: 'Womb II',
    9: 'Blue Womb', 10: 'Sheol', 11: 'Cathedral', 12: 'Dark Room',
    13: 'The Chest', 14: 'Void', 15: 'Home',
  }
  if (stageType === 1 && altNames[stage]) return altNames[stage]
  return baseNames[stage] ?? `Stage ${stage}`
}

function App(): React.JSX.Element {
  const { items, seed, floor, setInitialState, addItem, removeItem, resetRun, setFloor } =
    useTrackerStore()

  useEffect(() => {
    window.api.getInitialState().then(setInitialState)

    const unsubs = [
      window.api.onItemPickup(({ item }) => { if (item) addItem(item) }),
      window.api.onItemRemoval(({ itemId }) => removeItem(itemId)),
      window.api.onRunReset(({ seed }) => resetRun(seed)),
      window.api.onFloorChange((f) => setFloor(f)),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [])

  return (
    <div className="tracker">
      <header className="tracker-header">
        <h1 className="tracker-title">Isaac Item Tracker</h1>
        <div className="tracker-meta">
          {floor && <span className="badge floor-badge">{floorName(floor.stage, floor.stageType)}</span>}
          {seed && <span className="badge seed-badge">Seed: {seed}</span>}
          <span className="badge count-badge">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>
      </header>

      <main className="item-grid">
        {items.length === 0 ? (
          <div className="empty-state">
            <p>No items yet</p>
            <p className="empty-hint">Start a run to begin tracking</p>
          </div>
        ) : (
          items.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </main>
    </div>
  )
}

export default App
