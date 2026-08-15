import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button, Input, Badge, Pagination, Card, Spinner } from '@/components/ui'
import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'
import { useProducts } from '../hooks'
import { PRODUCT_TYPE_TABS } from '../constants'

export function ProductsPage() {
  const {
    products,
    isLoading,
    filters,
    setFilter,
    page,
    lastPage,
    setPage,
    total,
    filteredTotal,
  } = useProducts()
  const navigate = useNavigate()

  // The catalogue defines what the company sells and what every quotation is
  // priced against, so the API treats it as configuration: writes are Admin
  // only. Support and Developers get a read-only view.
  const { can } = useAuth()
  const canWrite = can('products:write')

  // "All" sends no type param; the other two are the enum values verbatim.
  const tabs = PRODUCT_TYPE_TABS

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        description="Manage your product catalog, software requirements, and pricing packages."
        actions={
          canWrite && (
            <Button onClick={() => navigate('/products/new')}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              Add Product
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search products..."
            value={filters.query}
            onChange={(e) => setFilter('query', e.target.value)}
            className="pl-9"
            aria-label="Search products"
          />
        </div>

        <div className="flex bg-sunken rounded-lg p-1">
          {tabs.map((type) => (
            <button
              key={type}
              onClick={() => setFilter('type', type)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                filters.type === type
                  ? 'bg-surface shadow-sm text-ink'
                  : 'text-ink-muted hover:text-ink hover:bg-surface/50'
              )}
              aria-pressed={filters.type === type}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-sunken text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Packages</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <Spinner className="mx-auto size-6 text-brand-600" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-ink-muted">
                    No products found matching your filters.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => navigate(`/products/${product.id}`)}
                    className="hover:bg-sunken cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-ink-subtle">{product.type}</td>
                    <td className="px-4 py-3 text-ink-subtle">
                      {/* The list endpoint returns a count, not the packages —
                          those come only from GET /api/products/:id. */}
                      {product.packages_count}{' '}
                      {product.packages_count === 1 ? 'package' : 'packages'}
                    </td>
                    <td className="px-4 py-3">
                      {product.is_active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="neutral">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto border-t border-line px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-ink-muted">
            Showing {products.length} of {filteredTotal} products
            {filteredTotal !== total && ` (filtered from ${total})`}
          </div>
          <Pagination
            currentPage={page}
            lastPage={lastPage}
            onPageChange={setPage}
          />
        </div>
      </Card>
    </div>
  )
}
