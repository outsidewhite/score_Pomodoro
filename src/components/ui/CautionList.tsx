import './CautionList.css'

export type CautionItem = {
  id: string
  text: string
}

type CautionListProps = {
  title?: string
  items: CautionItem[]
}

export function CautionList({ title = '計測前にご確認ください', items }: CautionListProps) {
  return (
    <section className="ui-caution-list" aria-labelledby="caution-list-title">
      <div className="ui-caution-list__heading">
        <span className="ui-caution-list__icon" aria-hidden="true">
          !
        </span>
        <h2 id="caution-list-title">{title}</h2>
      </div>
      <ul className="ui-caution-list__items">
        {items.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
    </section>
  )
}
