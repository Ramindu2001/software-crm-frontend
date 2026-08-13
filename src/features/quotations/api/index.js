import * as mockImpl from './quotations.mock'
import * as httpImpl from './quotations.http'

const USE_HTTP = import.meta.env.VITE_QUOTATIONS_API === 'http'

const impl = USE_HTTP ? httpImpl : mockImpl

export const listQuotations = impl.listQuotations
export const getQuotation = impl.getQuotation
export const createQuotation = impl.createQuotation
export const updateQuotation = impl.updateQuotation
export const NotFoundError = impl.NotFoundError

export const IS_MOCK_QUOTATIONS = !USE_HTTP
