import { useParams, useNavigate } from 'react-router-dom'
import { Pencil, Power, PowerOff, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { FullPageLoader } from '@/components/common/FullPageLoader'
import { RouteFallback } from '@/components/common/RouteFallback'
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { useProduct, useProductStatus } from '../hooks'
import { toast } from '@/lib/toastStore'

export function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { product, isLoading, error, refresh, isNotFound } = useProduct(productId)
  const { mutate: updateStatus, isMutating: isUpdatingStatus } = useProductStatus()

  if (isLoading) return <FullPageLoader />
  
  if (isNotFound) {
    return (
      <RouteFallback
        title="Product not found"
        description={`We couldn't find a product with the ID ${productId}.`}
      />
    )
  }

  if (error || !product) {
    return (
      <RouteFallback
        title="Something went wrong"
        description="We couldn't load the product details. Please try again."
        onRetry={refresh}
      />
    )
  }

  const handleToggleStatus = async () => {
    try {
      await updateStatus(product.id, !product.is_active)
      toast.success(
        product.is_active ? 'Product deactivated' : 'Product activated',
        { description: `${product.name} has been ${product.is_active ? 'deactivated' : 'activated'}.` }
      )
      refresh()
    } catch (err) {
      toast.error('Failed to update status', {
        description: err.message || 'An unexpected error occurred.',
      })
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      <PageHeader
        description={`ID: ${product.id} • ${product.type}`}
        actions={
          <>
            <Button
              variant={product.is_active ? 'danger' : 'secondary'}
              onClick={handleToggleStatus}
              disabled={isUpdatingStatus}
            >
              {product.is_active ? (
                <>
                  <PowerOff className="mr-2 size-4" aria-hidden="true" />
                  Deactivate
                </>
              ) : (
                <>
                  <Power className="mr-2 size-4 text-success-solid" aria-hidden="true" />
                  Activate
                </>
              )}
            </Button>
            <Button onClick={() => navigate(`/products/${product.id}/edit`)}>
              <Pencil className="mr-2 size-4" aria-hidden="true" />
              Edit Product
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink flex items-center gap-3">
            {product.name}
            {product.is_active ? (
              <Badge tone="success">Active</Badge>
            ) : (
              <Badge tone="neutral">Inactive</Badge>
            )}
          </h1>
          {product.description && (
            <p className="mt-2 text-ink-muted max-w-3xl">{product.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            {product.basic_requirements?.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-ink-subtle">
                {product.basic_requirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-muted text-sm">No basic requirements specified.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Software Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            {product.software_requirements?.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-ink-subtle">
                {product.software_requirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-muted text-sm">No software requirements specified.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink mb-4">Pricing Packages</h2>
        {product.packages?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {product.packages.map((pkg) => (
              <Card key={pkg.id} className="flex flex-col h-full">
                <CardHeader className="border-b border-line bg-sunken/50">
                  <CardTitle className="text-center">{pkg.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 flex-1 flex flex-col gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-ink-muted">1st Year</span>
                      <span className="font-semibold text-ink">{formatCurrency(pkg.first_year_price)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-ink-muted">2nd Year</span>
                      <span className="font-semibold text-ink">{formatCurrency(pkg.second_year_price)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-ink-muted">Monthly</span>
                      <span className="font-semibold text-ink">{formatCurrency(pkg.monthly_price)}</span>
                    </div>
                  </div>
                  
                  {pkg.features?.length > 0 && (
                    <div className="mt-auto pt-4 border-t border-line">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
                        Features included
                      </p>
                      <ul className="space-y-2">
                        {pkg.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-ink-subtle">
                            <CheckCircle2 className="size-4 text-brand-600 mt-0.5 shrink-0" aria-hidden="true" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-line border-dashed p-8 text-center text-ink-muted">
            No packages defined for this product.
          </div>
        )}
      </div>
    </div>
  )
}
