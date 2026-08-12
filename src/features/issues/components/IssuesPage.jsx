import { CircleDot, Search } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button, Input } from '@/components/ui'

export function IssuesPage() {
  return (
    <>
      <PageHeader
        description="Track, triage and resolve reported issues."
        actions={
          <>
            <Input
              placeholder="Search issues"
              aria-label="Search issues"
              leadingIcon={<Search className="size-4" />}
              wrapperClassName="w-full sm:w-64"
            />
            <Button size="sm">New issue</Button>
          </>
        }
      />

      <EmptyState
        icon={CircleDot}
        title="No issues yet"
        description="Once the issues data layer is wired up, reported issues will appear here."
        action={<Button size="sm">Create the first issue</Button>}
      />
    </>
  )
}
