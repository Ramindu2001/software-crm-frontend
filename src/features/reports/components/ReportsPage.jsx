import { BarChart3 } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'

export function ReportsPage() {
  return (
    <>
      <PageHeader description="Throughput, resolution times and team workload." />

      <EmptyState
        icon={BarChart3}
        title="No reports available"
        description="Reporting becomes available once there is issue history to analyse."
      />
    </>
  )
}
