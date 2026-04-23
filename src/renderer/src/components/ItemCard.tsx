import type { ItemData } from '../../../shared/types'

interface Props {
  item: ItemData
}

export default function ItemCard({ item }: Props): React.JSX.Element {
  const iconUrl = `asset://${item.iconPath}`

  return (
    <div className="item-card" title={item.description || item.name}>
      <img
        src={iconUrl}
        alt={item.name}
        width={32}
        height={32}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      <span className="item-name">{item.name}</span>
      {item.description && <span className="item-desc">{item.description}</span>}
    </div>
  )
}
