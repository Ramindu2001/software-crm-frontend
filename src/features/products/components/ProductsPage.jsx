import { useState } from 'react'
import { Plus, Search, TriangleAlert } from 'lucide-react'
import { PageHeader, EmptyState, FullPageLoader } from '@/components/common'
import { Button, Input, Pagination } from '@/components/ui'
import { toast } from '@/lib/toastStore'
import { useProducts } from '../hooks/useProducts'
import { ProductsTable } from './ProductsTable'
import { CreateProductModal } from './CreateProductModal'

export function ProductsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const {
    products,
    isLoading,
    error,
    filters,
    setFilter,
    page,
    lastPage,
    setPage,
    refresh,
  } = useProducts()

  const handleCreated = () => {
    setIsCreateModalOpen(false)
    toast.success('Product created')
    refresh()
  }

  if (isLoading && products.length === 0) {
    return <FullPageLoader />
  }

  if (error && products.length === 0) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load products"
        description={error.message ?? 'Something went wrong fetching the product list.'}
        action={
          <Button size="sm" onClick={refresh}>
            Try again
          </Button>
        }
      />
    )
  }

  const hasNoData = products.length === 0 && filters.query === ''

  if (hasNoData) {
    return (
      <>
        <PageHeader description="Manage software and service offerings." />
        <EmptyState
          title="No products yet"
          description="Create your first product to start building the catalog."
          action={
            <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              New product
            </Button>
          }
        />
        {isCreateModalOpen && (
          <CreateProductModal
            onClose={() => setIsCreateModalOpen(false)}
            onCreated={handleCreated}
          />
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader
        description="Manage software and service offerings."
        actions={
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            New product
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="size-4 text-ink-subtle" aria-hidden="true" />
          </div>
          <Input
            aria-label="Search products"
            placeholder="Search by name…"
            value={filters.query}
            onChange={(e) => setFilter('query', e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <ProductsTable products={products} />
        {lastPage > 1 && (
          <div className="border-t border-line px-5 py-3">
            <Pagination
              currentPage={page}
              lastPage={lastPage}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateProductModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
