import * as mockImpl from './products.mock'
import * as httpImpl from './products.http'

const USE_HTTP = import.meta.env.VITE_PRODUCTS_API === 'http'

const impl = USE_HTTP ? httpImpl : mockImpl

export const listProducts = impl.listProducts
export const getProduct = impl.getProduct
export const createProduct = impl.createProduct
export const updateProduct = impl.updateProduct
export const updateProductStatus = impl.updateProductStatus
export const NotFoundError = impl.NotFoundError

export const IS_MOCK_PRODUCTS = !USE_HTTP
