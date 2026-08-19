import { Badge } from '@/components/ui'
import { formatRupees } from '@/lib/format'

export function ProductsTable({ products }) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-ink-muted">No products found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-ink-subtle">
          <tr>
            <th className="whitespace-nowrap px-4 py-3 font-medium">Name</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-right">1st Year Fee</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-right">Monthly Fee</th>
            <th className="px-4 py-3 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface">
          {products.map((product) => (
            <tr
              key={product.id}
              className="group transition-colors hover:bg-sunken"
            >
              <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">
                {product.name}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge tone={product.type === 'Software' ? 'info' : 'neutral'} size="sm">
                  {product.type}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink">
                {formatRupees(product.annual_fee_1st_year)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink">
                {formatRupees(product.monthly_price)}
              </td>
              <td className="px-4 py-3 text-ink-subtle">
                <span className="line-clamp-1">{product.description}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
