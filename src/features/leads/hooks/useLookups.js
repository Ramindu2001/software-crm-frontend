import { useEffect, useState } from 'react'
import { listCustomers, listOwners, listProducts } from '../api'

/**
 * Picker options for the lead forms.
 *
 * All three come from unpaginated master-data endpoints that exist to fill
 * dropdowns, so they are fetched once per mount of whichever form needs them
 * rather than paged.
 *
 * `which` selects the lists to load, because no single form needs all three:
 * capture needs owners, the edit panel needs owners and products, and the
 * convert dialog needs customers. Loading the unused ones would be two wasted
 * requests every time a dialog opens.
 *
 * Failures resolve to an empty list rather than rejecting. A picker with no
 * options is a degraded form; an unhandled rejection is a blank dialog.
 *
 * @param {{owners?: boolean, products?: boolean, customers?: boolean}} which
 */
export function useLookups(which = {}) {
  const { owners = false, products = false, customers = false } = which

  const [lists, setLists] = useState({ owners: [], products: [], customers: [] })
  const [isLoading, setIsLoading] = useState(owners || products || customers)

  useEffect(() => {
    let ignore = false

    const wanted = [
      owners ? listOwners() : Promise.resolve([]),
      products ? listProducts() : Promise.resolve([]),
      customers ? listCustomers() : Promise.resolve([]),
    ].map((promise) => promise.catch(() => []))

    Promise.all(wanted).then(([ownerList, productList, customerList]) => {
      if (ignore) return
      setLists({ owners: ownerList, products: productList, customers: customerList })
      setIsLoading(false)
    })

    return () => {
      ignore = true
    }
  }, [owners, products, customers])

  return { ...lists, isLoading }
}
