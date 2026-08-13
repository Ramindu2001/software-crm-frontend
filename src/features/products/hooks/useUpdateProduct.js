import { useState } from 'react'
import { updateProduct } from '../api'

export function useUpdateProduct() {
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState(null)

  const mutate = async (id, patch) => {
    setIsMutating(true)
    setError(null)
    try {
      const result = await updateProduct(id, patch)
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
