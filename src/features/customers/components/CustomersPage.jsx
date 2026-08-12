import { Users } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button } from '@/components/ui'

export function CustomersPage() {
  return (
    <>
      <PageHeader
        description="Companies and contacts raising issues with your team."
        actions={<Button size="sm">Add customer</Button>}
      />

      <EmptyState
        icon={Users}
        title="No customers yet"
        description="Customer records will appear here once the feature is built."
      />
    </>
  )
}
