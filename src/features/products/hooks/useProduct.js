import { useEffect, useState } from 'react'
import { getProduct } from '../api'

export function useProduct(id) {
  const [product, setProduct] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    getProduct(id)
      .then((data) => {
        if (!ignore) {
          setProduct(data)
          setError(null)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setProduct(null)
          setError(err)
          setIsLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [id])

  return { product, error, isLoading }
}
