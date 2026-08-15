import * as mockImpl from './products.mock'
import * as httpImpl from './products.http'

const USE_HTTP = import.meta.env.VITE_PRODUCTS_API === 'http'

const impl = USE_HTTP ? httpImpl : mockImpl

export const listProducts = impl.listProducts
export const getProduct = impl.getProduct
export const createProduct = impl.createProduct
export const updateProduct = impl.updateProduct
export const updateProductStatus = impl.updateProductStatus
/** Live products as {value, label}, for the quotation line-item picker. */
export const listProductOptions = impl.listProductOptions
export const NotFoundError = impl.NotFoundError

/**
 * No deleteProduct: products are referenced by quotation_items, subscriptions
 * and tickets with ON DELETE RESTRICT, so the API offers no DELETE at all.
 * updateProductStatus(id, false) is the soft delete.
 */

export const IS_MOCK_PRODUCTS = !USE_HTTP
