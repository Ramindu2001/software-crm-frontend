import { useEffect, useState, useCallback } from 'react'
import { getProduct, NotFoundError } from '../api'

export function useProduct(id) {
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!id) {
      setProduct(null)
      setIsLoading(false)
      return
    }

    let ignore = false
    setIsLoading(true)
    setError(null)

    getProduct(id)
      .then((data) => {
        if (!ignore) {
          setProduct(data)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err)
          setIsLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [id, nonce])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  return {
    product,
    isLoading,
    error,
    refresh,
    isNotFound: error instanceof NotFoundError,
  }
}
