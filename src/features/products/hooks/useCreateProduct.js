import { useState } from 'react'
import { createProduct } from '../api'

export function useCreateProduct() {
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState(null)

  const mutate = async (input) => {
    setIsMutating(true)
    setError(null)
    try {
      const result = await createProduct(input)
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setIsMutating(false)
    }
  }

  return {
    mutate,
    isMutating,
    error,
  }
}
