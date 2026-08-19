import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Trash2, Plus, ArrowLeft, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { FullPageLoader } from '@/components/common/FullPageLoader'
import { RouteFallback } from '@/components/common/RouteFallback'
import { ApiErrorAlert, EmptyState } from '@/components/common'
import { Button, Input, MoneyInput, Select, Textarea, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { useAuth } from '@/features/auth'
import { useProduct, useCreateProduct, useUpdateProduct } from '../hooks'
import { PRODUCT_TYPE_OPTIONS } from '../constants'
import { toast } from '@/lib/toastStore'

// Helper to wrap strings in stable objects for form arrays to prevent focus loss
const wrapStringArray = (arr) => arr.map(val => ({ id: crypto.randomUUID(), value: val }))
const unwrapStringArray = (arr) => arr.map(item => item.value).filter(val => val.trim() !== '')

export function ProductFormPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const isEditMode = Boolean(productId)

  const { product, isLoading: isFetching, error: fetchError } = useProduct(isEditMode ? productId : null)
  const { mutate: createProduct, isMutating: isCreating } = useCreateProduct()
  const { mutate: updateProduct, isMutating: isUpdating } = useUpdateProduct()

  // POST and PUT are Admin-only. The page is reachable by URL, so the check
  // lives here as well as on the buttons that link to it.
  const { can } = useAuth()
  const canWrite = can('products:write')

  const isMutating = isCreating || isUpdating
  const [submitError, setSubmitError] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'Software',
    description: '',
    basic_requirements: [],
    software_requirements: [],
    packages: []
  })

  useEffect(() => {
    if (isEditMode && product) {
      setFormData({
        name: product.name || '',
        type: product.type || 'Software',
        description: product.description || '',
        basic_requirements: wrapStringArray(product.basic_requirements || []),
        software_requirements: wrapStringArray(product.software_requirements || []),
        packages: (product.packages || []).map(pkg => ({
          ...pkg,
          uiId: pkg.id || crypto.randomUUID(), // Stable ID for UI
          features: wrapStringArray(pkg.features || [])
        }))
      })
    }
  }, [isEditMode, product])

  if (!canWrite) {
    // EmptyState, not RouteFallback: RouteFallback is the Suspense spinner and
    // ignores props, so it would render "Loading…" forever here.
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Not permitted"
        description="You need the manage product catalogue permission to add or edit products."
        action={
          <Button as={Link} to="/products" size="sm">
            Back to products
          </Button>
        }
      />
    )
  }

  if (isEditMode && isFetching) return <FullPageLoader />
  if (isEditMode && fetchError) {
    return (
      <RouteFallback
        title="Error loading product"
        description="We couldn't load the product to edit."
        onRetry={() => window.location.reload()}
      />
    )
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // --- Array Builders (Strings) ---
  const handleStringArrayAdd = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], { id: crypto.randomUUID(), value: '' }]
    }))
  }

  const handleStringArrayRemove = (field, idToRemove) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(item => item.id !== idToRemove)
    }))
  }

  const handleStringArrayChange = (field, id, newValue) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map(item => item.id === id ? { ...item, value: newValue } : item)
    }))
  }

  // --- Packages Sub-Builder ---
  const handleAddPackage = () => {
    setFormData(prev => ({
      ...prev,
      packages: [
        ...prev.packages,
        {
          uiId: crypto.randomUUID(),
          name: '',
          first_year_price: 0,
          second_year_price: 0,
          monthly_price: 0,
          features: []
        }
      ]
    }))
  }

  const handleRemovePackage = (uiId) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.filter(pkg => pkg.uiId !== uiId)
    }))
  }

  const handlePackageChange = (uiId, field, value) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map(pkg => pkg.uiId === uiId ? { ...pkg, [field]: value } : pkg)
    }))
  }

  // Features within packages
  const handlePackageFeatureAdd = (pkgUiId) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map(pkg => 
        pkg.uiId === pkgUiId 
          ? { ...pkg, features: [...pkg.features, { id: crypto.randomUUID(), value: '' }] } 
          : pkg
      )
    }))
  }

  const handlePackageFeatureRemove = (pkgUiId, featureId) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map(pkg => 
        pkg.uiId === pkgUiId 
          ? { ...pkg, features: pkg.features.filter(f => f.id !== featureId) } 
          : pkg
      )
    }))
  }

  const handlePackageFeatureChange = (pkgUiId, featureId, newValue) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map(pkg => 
        pkg.uiId === pkgUiId 
          ? { 
              ...pkg, 
              features: pkg.features.map(f => f.id === featureId ? { ...f, value: newValue } : f) 
            } 
          : pkg
      )
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name.trim()) {
      return toast.warning('Name is required', { description: 'Please enter a product name.' })
    }

    // Package ids are deliberately not sent. PUT replaces the child rows
    // wholesale — deleting them and reinserting — so an id from the previous
    // read would be meaningless to the server.
    const payload = {
      name: formData.name,
      type: formData.type,
      description: formData.description,
      basic_requirements: unwrapStringArray(formData.basic_requirements),
      software_requirements: unwrapStringArray(formData.software_requirements),
      packages: formData.packages.map(pkg => ({
        name: pkg.name,
        first_year_price: pkg.first_year_price,
        second_year_price: pkg.second_year_price,
        monthly_price: pkg.monthly_price,
        features: unwrapStringArray(pkg.features)
      }))
    }

    setSubmitError(null)

    try {
      if (isEditMode) {
        await updateProduct(productId, payload)
        toast.success('Product updated', { description: 'The changes have been saved.' })
        navigate(`/products/${productId}`)
      } else {
        const newProd = await createProduct(payload)
        toast.success('Product created', { description: 'The new product has been successfully added.' })
        navigate(`/products/${newProd.id}`)
      }
    } catch (err) {
      // Rendered inline rather than as a toast: a 422 here lists every problem
      // it found, indexed by package and feature
      // ("packages[1]: annual_fee_1st_year must be at least 0"), and that is
      // too much detail to fit in a toast the user cannot scroll back to.
      setSubmitError(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 h-full pb-8">
      <PageHeader
        description={isEditMode ? `Edit Product: ${product?.name}` : 'Create a new product or service'}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={isMutating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Product'}
            </Button>
          </>
        }
      />
      <div className="flex items-center mb-[-1rem]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center"
        >
          <ArrowLeft className="size-4 mr-1" />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto w-full">
        <ApiErrorAlert error={submitError} fallback="Could not save the product." />

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Product Name <span className="text-danger-solid">*</span></label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Synnex ERP"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Type</label>
              {/* Select renders its `options` prop, not children — passing
                  <option> elements here produced an empty dropdown, which made
                  Service products unreachable even though the API accepts them. */}
              <Select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                options={PRODUCT_TYPE_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description of the product..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-ink">Basic Requirements</label>
                <Button type="button" variant="secondary" onClick={() => handleStringArrayAdd('basic_requirements')}>
                  <Plus className="size-4 mr-1" /> Add Requirement
                </Button>
              </div>
              <div className="space-y-2">
                {formData.basic_requirements.length === 0 && (
                  <p className="text-sm text-ink-muted italic">No basic requirements added.</p>
                )}
                {formData.basic_requirements.map((req) => (
                  <div key={req.id} className="flex items-center gap-2">
                    <Input
                      value={req.value}
                      onChange={(e) => handleStringArrayChange('basic_requirements', req.id, e.target.value)}
                      placeholder="e.g. 8GB RAM minimum"
                      className="flex-1"
                    />
                    <Button type="button" variant="danger" onClick={() => handleStringArrayRemove('basic_requirements', req.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-ink">Software Requirements</label>
                <Button type="button" variant="secondary" onClick={() => handleStringArrayAdd('software_requirements')}>
                  <Plus className="size-4 mr-1" /> Add Requirement
                </Button>
              </div>
              <div className="space-y-2">
                {formData.software_requirements.length === 0 && (
                  <p className="text-sm text-ink-muted italic">No software requirements added.</p>
                )}
                {formData.software_requirements.map((req) => (
                  <div key={req.id} className="flex items-center gap-2">
                    <Input
                      value={req.value}
                      onChange={(e) => handleStringArrayChange('software_requirements', req.id, e.target.value)}
                      placeholder="e.g. Windows Server 2019 or later"
                      className="flex-1"
                    />
                    <Button type="button" variant="danger" onClick={() => handleStringArrayRemove('software_requirements', req.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">Pricing Packages</h2>
            <Button type="button" onClick={handleAddPackage}>
              <Plus className="size-4 mr-1" /> Add Package
            </Button>
          </div>
          
          {formData.packages.length === 0 && (
            <div className="rounded-lg border border-line border-dashed p-8 text-center text-ink-muted mb-6">
              No packages defined. Click 'Add Package' to create one.
            </div>
          )}

          <div className="space-y-6">
            {formData.packages.map((pkg, index) => (
              <Card key={pkg.uiId} className="border-brand-200">
                <CardHeader className="bg-sunken flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-base">Package #{index + 1}</CardTitle>
                  <Button type="button" variant="danger" onClick={() => handleRemovePackage(pkg.uiId)}>
                    <Trash2 className="size-4 mr-1" /> Remove
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Package Name <span className="text-danger-solid">*</span></label>
                    <Input
                      value={pkg.name}
                      onChange={(e) => handlePackageChange(pkg.uiId, 'name', e.target.value)}
                      placeholder="e.g. Basic Edition"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">1st Year Price</label>
                      <MoneyInput
                        value={pkg.first_year_price}
                        onChange={(e) => handlePackageChange(pkg.uiId, 'first_year_price', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">2nd Year Price</label>
                      <MoneyInput
                        value={pkg.second_year_price}
                        onChange={(e) => handlePackageChange(pkg.uiId, 'second_year_price', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">Monthly Price</label>
                      <MoneyInput
                        value={pkg.monthly_price}
                        onChange={(e) => handlePackageChange(pkg.uiId, 'monthly_price', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-line">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-ink">Features</label>
                      <Button type="button" variant="secondary" onClick={() => handlePackageFeatureAdd(pkg.uiId)} className="text-xs h-8">
                        <Plus className="size-3 mr-1" /> Add Feature
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {pkg.features.length === 0 && (
                        <p className="text-sm text-ink-muted italic">No features added to this package.</p>
                      )}
                      {pkg.features.map((feature) => (
                        <div key={feature.id} className="flex items-center gap-2">
                          <Input
                            value={feature.value}
                            onChange={(e) => handlePackageFeatureChange(pkg.uiId, feature.id, e.target.value)}
                            placeholder="e.g. Core ERP Modules"
                            className="flex-1"
                          />
                          <Button type="button" variant="danger" onClick={() => handlePackageFeatureRemove(pkg.uiId, feature.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </form>
  )
}
