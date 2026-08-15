import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listCustomerOptions } from '@/features/customers/api'
import { listProducts, getProduct } from '@/features/products/api'

/**
 * Owns the state of the quotation builder form.
 *
 * The hard part of this screen is not the fields — it is that choosing a
 * product has to pull its packages, and choosing a package has to pull its
 * fees and features, all without blocking the rest of the form or refetching
 * the same product once per line.
 *
 * Three things it takes care of:
 *
 *   1. **A product cache.** Full product detail (packages, features,
 *      requirements) comes from GET /api/products/:id. Two lines quoting the
 *      same product share one fetch, and switching a line back to a product
 *      already seen is instant.
 *
 *   2. **Derived pricing.** unitPrice is left blank until the user overrides
 *      it, and the effective price falls back to the package fee for the
 *      chosen plan. That keeps "I didn't touch it" distinguishable from "I set
 *      it to exactly the list price" — only the latter is sent to the server.
 *
 *   3. **Preview totals.** Computed here purely so the user sees a running
 *      total. The server recomputes everything and its numbers win; a client
 *      that could set its own total could quote any price.
 */

const emptyLine = (key) => ({
  key,
  productId: '',
  packageId: '',
  plan: 'Annual',
  quantity: 1,
  /** '' means "use the package price"; a number is a deliberate override. */
  unitPrice: '',
})

export function useQuotationBuilder({ companySettings, initialQuotation } = {}) {
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)

  // productId -> full detail. A ref rather than state: it is a cache, and a
  // cache hit must not itself trigger a render.
  const productCache = useRef(new Map())
  const [loadedProducts, setLoadedProducts] = useState(() => new Map())

  const [values, setValues] = useState(() => ({
    customerId: '',
    discountPercent: 0,
    paymentTerms: '',
    termsConditions: '',
    notes: '',
  }))
  const [lines, setLines] = useState(() => [emptyLine(1)])
  // State, not a ref: the seeding block below runs during render, and a ref
  // must not be written there.
  const [nextKey, setNextKey] = useState(2)

  // ── Pickers ────────────────────────────────────────────
  useEffect(() => {
    let ignore = false

    Promise.all([
      listCustomerOptions(),
      // Live products only: a retired product should not be quoted afresh.
      listProducts({ isActive: true, perPage: 1000 }),
    ])
      .then(([customerOptions, productPage]) => {
        if (ignore) return
        setCustomers(customerOptions)
        setProducts(
          productPage.data.map((product) => ({
            value: String(product.id),
            label: product.name,
          })),
        )
        setIsLoadingOptions(false)
      })
      .catch(() => {
        // A failed lookup leaves the selects empty rather than blocking the
        // form; submitting will surface the real problem.
        if (!ignore) setIsLoadingOptions(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  // ── Seed from company defaults, or from the quotation being edited ──
  //
  // Adjusted during render rather than in an effect. This is the pattern React
  // documents for "reset state when a prop changes": it renders once with the
  // seeded values instead of painting an empty form and then replacing it, and
  // it avoids the cascading render an effect would cause.
  //
  // `seededFrom` holds the object identity already applied, so the seed runs
  // once per source and never clobbers what the user has since typed.
  const [seededFrom, setSeededFrom] = useState(null)
  const seedSource = initialQuotation ?? companySettings ?? null

  if (seedSource && seededFrom !== seedSource) {
    setSeededFrom(seedSource)

    if (initialQuotation) {
      setValues({
        customerId: String(initialQuotation.customerId ?? ''),
        discountPercent: initialQuotation.discountPercent ?? 0,
        paymentTerms: initialQuotation.paymentTerms ?? '',
        termsConditions: initialQuotation.termsConditions ?? '',
        notes: initialQuotation.notes ?? '',
      })
      setLines(
        initialQuotation.items.map((item, index) => ({
          key: index + 1,
          productId: String(item.productId ?? ''),
          packageId: String(item.packageId ?? ''),
          plan: item.plan,
          quantity: item.quantity,
          // An override is only an override if it differs from the package
          // price for that plan; otherwise leave it blank so it keeps tracking.
          unitPrice:
            item.unitPrice ===
            (item.plan === 'Annual' ? item.firstYearFee : item.monthlyPrice)
              ? ''
              : item.unitPrice,
        })),
      )
      setNextKey(initialQuotation.items.length + 1)
    } else {
      // New quotation: copy the company's default terms in, where the user is
      // free to edit them for this quotation only.
      setValues((current) => ({
        ...current,
        paymentTerms: companySettings.paymentTerms ?? '',
        termsConditions: companySettings.termsConditions ?? '',
      }))
    }
  }

  // ── Product detail, fetched once per product ───────────
  //
  // Full detail (packages, fees, features, requirements) comes from
  // GET /api/products/:id. The ref is the cache and the state is the mirror
  // that triggers a re-render: two lines quoting the same product share one
  // fetch, and switching back to a product already seen is instant.
  //
  // Every setState here sits inside a `.then`, so nothing runs synchronously
  // in the effect body.
  useEffect(() => {
    const wanted = [
      ...new Set(lines.map((line) => String(line.productId)).filter(Boolean)),
    ].filter((id) => !productCache.current.has(id))

    if (wanted.length === 0) return undefined

    let ignore = false

    Promise.all(
      wanted.map((id) =>
        getProduct(id)
          .then((product) => [id, product])
          // A product that fails to load leaves its line's package picker
          // empty rather than failing the whole form.
          .catch(() => null),
      ),
    ).then((entries) => {
      if (ignore) return

      const loaded = entries.filter(Boolean)
      if (loaded.length === 0) return

      for (const [id, product] of loaded) productCache.current.set(id, product)

      setLoadedProducts((current) => {
        const next = new Map(current)
        for (const [id, product] of loaded) next.set(id, product)
        return next
      })
    })

    return () => {
      ignore = true
    }
  }, [lines])

  const getProductDetail = useCallback(
    (productId) => (productId ? (loadedProducts.get(String(productId)) ?? null) : null),
    [loadedProducts],
  )

  /** The package a line points at, or null while its product is still loading. */
  const getPackage = useCallback(
    (line) => {
      const product = getProductDetail(line.productId)
      if (!product || !line.packageId) return null
      return (
        product.packages.find((pkg) => String(pkg.id) === String(line.packageId)) ?? null
      )
    },
    [getProductDetail],
  )

  /** List price for the chosen plan, before any override. */
  const listPriceFor = useCallback(
    (line) => {
      const pkg = getPackage(line)
      if (!pkg) return 0
      return line.plan === 'Annual' ? pkg.first_year_price : pkg.monthly_price
    },
    [getPackage],
  )

  /** What this line actually charges — the override if set, else list price. */
  const effectivePrice = useCallback(
    (line) =>
      line.unitPrice === '' || line.unitPrice === null
        ? listPriceFor(line)
        : Number(line.unitPrice) || 0,
    [listPriceFor],
  )

  // ── Line editing ───────────────────────────────────────
  const setValue = useCallback((key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
  }, [])

  const addLine = useCallback(() => {
    setLines((current) => [...current, emptyLine(nextKey)])
    setNextKey((key) => key + 1)
  }, [nextKey])

  const removeLine = useCallback((key) => {
    // The API requires at least one line item.
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.key !== key)))
  }, [])

  const updateLine = useCallback((key, patch) => {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line

        const next = { ...line, ...patch }

        // Changing the product invalidates the package and any override priced
        // against it — silently keeping either would quote one product at
        // another's price.
        if (patch.productId !== undefined && patch.productId !== line.productId) {
          next.packageId = ''
          next.unitPrice = ''
        }
        // Changing the package or plan re-prices the line, so an override
        // taken against the old figures no longer means anything.
        if (
          (patch.packageId !== undefined && patch.packageId !== line.packageId) ||
          (patch.plan !== undefined && patch.plan !== line.plan)
        ) {
          next.unitPrice = ''
        }

        return next
      }),
    )
  }, [])

  // ── Preview totals ─────────────────────────────────────
  const totals = useMemo(() => {
    const totalAmount = lines.reduce(
      (sum, line) => sum + effectivePrice(line) * (Number(line.quantity) || 0),
      0,
    )
    const percent = Number(values.discountPercent) || 0
    const discount = (totalAmount * percent) / 100

    return {
      totalAmount,
      discountPercent: percent,
      discount,
      finalAmount: Math.max(0, totalAmount - discount),
    }
  }, [lines, values.discountPercent, effectivePrice])

  /** Client-side mirror of the server's rules, to catch mistakes early. */
  const validate = useCallback(() => {
    const errors = {}
    if (!values.customerId) errors.customerId = 'Select a customer.'

    const percent = Number(values.discountPercent)
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      errors.discountPercent = 'Enter a discount between 0 and 100.'
    }

    const lineErrors = lines.map((line) => {
      const error = {}
      if (!line.productId) error.productId = 'Required'

      if (!line.packageId) {
        error.packageId = 'Required'
      } else {
        // Editing a product deletes and reinserts its packages, so their ids
        // change. A quotation being edited can therefore hold a package id
        // that no longer resolves — caught here with an explanation rather
        // than sent on to become a bare "package_id 3 does not exist" 422.
        const product = getProductDetail(line.productId)
        if (product && !getPackage(line)) {
          error.packageId = 'This package no longer exists — choose another'
        }
      }

      const quantity = Number(line.quantity)
      if (!Number.isInteger(quantity) || quantity < 1) error.quantity = 'Min 1'

      if (line.unitPrice !== '' && Number(line.unitPrice) < 0) {
        error.unitPrice = 'Cannot be negative'
      }
      return error
    })

    return {
      errors,
      lineErrors,
      isValid:
        Object.keys(errors).length === 0 &&
        lineErrors.every((error) => Object.keys(error).length === 0),
    }
  }, [values, lines, getProductDetail, getPackage])

  /** The payload for POST/PUT — server field names are applied in api/. */
  const toPayload = useCallback(
    () => ({
      customerId: values.customerId,
      discountPercent: values.discountPercent,
      paymentTerms: values.paymentTerms,
      termsConditions: values.termsConditions,
      notes: values.notes,
      items: lines.map((line) => ({
        productId: line.productId,
        packageId: line.packageId,
        plan: line.plan,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    }),
    [values, lines],
  )

  return {
    customers,
    products,
    isLoadingOptions,
    values,
    setValue,
    lines,
    addLine,
    removeLine,
    updateLine,
    getProductDetail,
    getPackage,
    listPriceFor,
    effectivePrice,
    totals,
    validate,
    toPayload,
  }
}
