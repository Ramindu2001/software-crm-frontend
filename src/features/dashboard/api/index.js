import * as mockImpl from './dashboard.mock'
import * as httpImpl from './dashboard.http'

const USE_HTTP = import.meta.env.VITE_DASHBOARD_API === 'http'

const impl = USE_HTTP ? httpImpl : mockImpl

export const getDashboardStats = impl.getDashboardStats
export const IS_MOCK_DASHBOARD = !USE_HTTP
