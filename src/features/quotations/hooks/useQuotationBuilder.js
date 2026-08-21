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

/**
 * A line quoting something from the catalogue.
 *
 * `kind` drives the form only; it is never sent. On the wire the presence of a
 * product id is what tells the two apart, so there is one source of truth
 * rather than a flag that could contradict the ids beside it.
 */
const emptyCatalogueLine = (key) => ({
  key,
  kind: 'catalogue',
  productId: '',
  packageId: '',
  plan: 'Annual',
  quantity: 1,
  /** '' means "use the package price"; a number is a deliberate override. */
  unitPrice: '',
})

/**
 * A line describing work the catalogue has no entry for.
 *
 * Everything it needs is on the line itself, because there is nothing to
 * resolve it against — including the price, which for a catalogue line would be
 * looked up and here has to be stated.
 */
const emptyCustomLine = (key) => ({
  key,
  kind: 'custom',
  productName: '',
  description: '',
  /** A free-text label like "Phase 1" — not a package id. */
  packageName: '',
  plan: 'Annual',
  quantity: 1,
  unitPrice: '',
  installationFee: '',
  /** Bullets for the document; the catalogue equivalent is package features. */
  features: [],
})

const emptyLine = (key, kind = 'catalogue') =>
  kind === 'custom' ? emptyCustomLine(key) : emptyCatalogueLine(key)

const isCustom = (line) => line.kind === 'custom'

/**
 * @param {object} [options]
 * @param {object} [options.companySettings]
 * @param {object} [options.initialQuotation] Seeds an edit.
 * @param {string} [options.initialCustomerId] Preselects the customer on a new
 *   quotation. Used by the "Raise a quotation" handoff from a won lead, which
 *   knows exactly who the quotation is for — asking the user to pick them again
 *   from a list of every customer is a step with no purpose.
 */
export function useQuotationBuilder({
  companySettings,
  initialQuotation,
  initialCustomerId,
} = {}) {
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)

  // productId -> full detail. A ref rather than state: it is a cache, and a
  // cache hit must not itself trigger a render.
  const productCache = useRef(new Map())
  const [loadedProducts, setLoadedProducts] = useState(() => new Map())

  const [values, setValues] = useState(() => ({
    /**
     * 'existing' picks somebody from the directory; 'new' quotes a prospect
     * whose details live on the document alone.
     *
     * Defaults to 'existing' because most quotations go to customers already on
     * file, and because it is the mode that cannot create anything by accident.
     */
    customerMode: 'existing',
    customerId: '',
    newCustomer: {
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
    },
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
      // A quotation raised for a prospect reopens in 'new' mode with its own
      // snapshot in the fields — editing it must not silently demand that the
      // user now pick somebody from the directory instead.
      const isProspect = initialQuotation.isProspect

      setValues({
        customerMode: isProspect ? 'new' : 'existing',
        customerId: String(initialQuotation.customerId ?? ''),
        newCustomer: {
          companyName: isProspect ? (initialQuotation.customer?.name ?? '') : '',
          contactPerson: isProspect ? (initialQuotation.customer?.contactPerson ?? '') : '',
          email: isProspect ? (initialQuotation.customer?.email ?? '') : '',
          phone: isProspect ? (initialQuotation.customer?.phone ?? '') : '',
          address: isProspect ? (initialQuotation.customer?.address ?? '') : '',
        },
        discountPercent: initialQuotation.discountPercent ?? 0,
        paymentTerms: initialQuotation.paymentTerms ?? '',
        termsConditions: initialQuotation.termsConditions ?? '',
        notes: initialQuotation.notes ?? '',
      })

      setLines(
        initialQuotation.items.map((item, index) =>
          item.isCustom
            ? {
                key: index + 1,
                kind: 'custom',
                productName: item.productName ?? '',
                description: item.description ?? '',
                packageName: item.packageName ?? '',
                plan: item.plan,
                quantity: item.quantity,
                // Always explicit on a custom line — there is no list price for
                // it to track, so it is never "left blank to follow the package".
                unitPrice: item.unitPrice,
                installationFee: item.installationFee || '',
                features: [...(item.features ?? [])],
              }
            : {
                key: index + 1,
                kind: 'catalogue',
                productId: String(item.productId ?? ''),
                packageId: String(item.packageId ?? ''),
                plan: item.plan,
                quantity: item.quantity,
                // An override is only an override if it differs from the
                // package price for that plan; otherwise leave it blank so it
                // keeps tracking.
                unitPrice:
                  item.unitPrice ===
                  (item.plan === 'Annual' ? item.firstYearFee : item.monthlyPrice)
                    ? ''
                    : item.unitPrice,
              },
        ),
      )
      setNextKey(initialQuotation.items.length + 1)
    } else {
      // New quotation: copy the company's default terms in, where the user is
      // free to edit them for this quotation only.
      setValues((current) => ({
        ...current,
        // Only ever seeds an empty field, so arriving from a lead preselects
        // the customer without overwriting one the user has already chosen.
        customerId: current.customerId || String(initialCustomerId ?? ''),
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
    // Custom lines have no productId, and `String(undefined)` is the truthy
    // string "undefined" — which sailed straight through the filter and sent
    // GET /api/products/undefined on every keystroke in a custom line.
    const wanted = [
      ...new Set(
        lines
          .filter((line) => !isCustom(line) && line.productId)
          .map((line) => String(line.productId)),
      ),
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

  /**
   * List price for the chosen plan, before any override.
   * Zero for a custom line — there is no catalogue price to look up.
   */
  const listPriceFor = useCallback(
    (line) => {
      if (isCustom(line)) return 0
      const pkg = getPackage(line)
      if (!pkg) return 0
      return line.plan === 'Annual' ? pkg.first_year_price : pkg.monthly_price
    },
    [getPackage],
  )

  /** What this line actually charges — the override if set, else list price. */
  const effectivePrice = useCallback(
    (line) => {
      // A custom line's price is not an override of anything; it is the price.
      if (isCustom(line)) return Number(line.unitPrice) || 0

      return line.unitPrice === '' || line.unitPrice === null
        ? listPriceFor(line)
        : Number(line.unitPrice) || 0
    },
    [listPriceFor],
  )

  /**
   * The one-off installation charge on a line.
   *
   * Charged once per line regardless of quantity — a site installation, not a
   * per-licence cost. A catalogue line inherits it from the package; a custom
   * line states its own.
   */
  const installationFeeFor = useCallback(
    (line) => {
      if (isCustom(line)) return Number(line.installationFee) || 0
      return Number(getPackage(line)?.installation_fee ?? 0)
    },
    [getPackage],
  )

  // ── Line editing ───────────────────────────────────────
  const setValue = useCallback((key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
  }, [])

  /** Set one field of the prospect block without flattening the rest. */
  const setNewCustomerValue = useCallback((key, value) => {
    setValues((current) => ({
      ...current,
      newCustomer: { ...current.newCustomer, [key]: value },
    }))
  }, [])

  const addLine = useCallback(
    (kind = 'catalogue') => {
      setLines((current) => [...current, emptyLine(nextKey, kind)])
      setNextKey((key) => key + 1)
    },
    [nextKey],
  )

  const removeLine = useCallback((key) => {
    // The API requires at least one line item.
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.key !== key)))
  }, [])

  const updateLine = useCallback((key, patch) => {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line

        const next = { ...line, ...patch }

        // A custom line has no catalogue references to invalidate, and its
        // price is not an override of anything — so none of the resets below
        // apply to it. Clearing unitPrice when its plan changed would silently
        // wipe the only price it has.
        if (isCustom(line)) return next

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
    const serviceTotal = lines.reduce(
      (sum, line) => sum + effectivePrice(line) * (Number(line.quantity) || 0),
      0,
    )
    /**
     * Installation was previously left out of this preview entirely, so the
     * running total the user saw was lower than the figure the server came back
     * with — on exactly the screen whose job is to show what is being charged.
     * Counted here so the preview and the document agree.
     */
    const installationTotal = lines.reduce((sum, line) => sum + installationFeeFor(line), 0)

    const totalAmount = serviceTotal + installationTotal
    const percent = Number(values.discountPercent) || 0
    const discount = (totalAmount * percent) / 100

    return {
      serviceTotal,
      installationTotal,
      totalAmount,
      discountPercent: percent,
      discount,
      finalAmount: Math.max(0, totalAmount - discount),
    }
  }, [lines, values.discountPercent, effectivePrice, installationFeeFor])

  /** Client-side mirror of the server's rules, to catch mistakes early. */
  const validate = useCallback(() => {
    const errors = {}

    if (values.customerMode === 'new') {
      // Only the company name is demanded, matching the server. A quotation is
      // often raised off a phone call where the company name is the one thing
      // you have — insisting on an email would either block the quote or teach
      // people to invent one.
      if (!values.newCustomer.companyName.trim()) {
        errors.newCustomerName = 'Enter the company or person this is quoted to.'
      }
      const email = values.newCustomer.email.trim()
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        errors.newCustomerEmail = 'Enter a valid email address, or leave it blank.'
      }
    } else if (!values.customerId) {
      errors.customerId = 'Select a customer.'
    }

    const percent = Number(values.discountPercent)
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      errors.discountPercent = 'Enter a discount between 0 and 100.'
    }

    const lineErrors = lines.map((line) => {
      const error = {}

      const quantity = Number(line.quantity)
      if (!Number.isInteger(quantity) || quantity < 1) error.quantity = 'Min 1'

      if (isCustom(line)) {
        if (line.productName.trim().length < 2) {
          error.productName = 'Describe what is being quoted'
        }
        // Required rather than optional: nothing else can price this line, and
        // a blank falling back to zero would quote bespoke work for free.
        if (line.unitPrice === '' || line.unitPrice === null) {
          error.unitPrice = 'Required'
        } else if (Number(line.unitPrice) < 0) {
          error.unitPrice = 'Cannot be negative'
        }
        if (line.installationFee !== '' && Number(line.installationFee) < 0) {
          error.installationFee = 'Cannot be negative'
        }
        return error
      }

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
      customerMode: values.customerMode,
      customerId: values.customerId,
      newCustomer: values.newCustomer,
      discountPercent: values.discountPercent,
      paymentTerms: values.paymentTerms,
      termsConditions: values.termsConditions,
      notes: values.notes,
      // `kind` travels as far as api/, which reads it to choose a shape and
      // then drops it — the server infers the same thing from the ids.
      items: lines.map((line) =>
        isCustom(line)
          ? {
              kind: 'custom',
              productName: line.productName,
              description: line.description,
              packageName: line.packageName,
              plan: line.plan,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              installationFee: line.installationFee,
              features: line.features,
            }
          : {
              kind: 'catalogue',
              productId: line.productId,
              packageId: line.packageId,
              plan: line.plan,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            },
      ),
    }),
    [values, lines],
  )

  return {
    customers,
    products,
    isLoadingOptions,
    values,
    setValue,
    setNewCustomerValue,
    lines,
    addLine,
    removeLine,
    updateLine,
    getProductDetail,
    getPackage,
    listPriceFor,
    effectivePrice,
    installationFeeFor,
    totals,
    validate,
    toPayload,
  }
}
