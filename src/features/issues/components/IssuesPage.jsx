import { useState } from 'react'
import { CircleDot, Search } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button, Input, Modal } from '@/components/ui'

export function IssuesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const openCreate = () => setIsCreateOpen(true)
  const closeCreate = () => setIsCreateOpen(false)

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
            <Button size="sm" onClick={openCreate}>
              New issue
            </Button>
          </>
        }
      />

      <EmptyState
        icon={CircleDot}
        title="No issues yet"
        description="Once the issues data layer is wired up, reported issues will appear here."
        action={
          <Button size="sm" onClick={openCreate}>
            Create the first issue
          </Button>
        }
      />

      <Modal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="New issue"
        description="Describe the problem so the team can triage it."
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={closeCreate}>
              Cancel
            </Button>
            <Button size="sm" onClick={closeCreate}>
              Create issue
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Input
            label="Title"
            placeholder="Summarise the problem"
            required
          />
          <Input
            label="Reporter email"
            type="email"
            placeholder="name@synnex.com"
            hint="We'll notify this address on status changes."
          />
          <Input label="Assignee" placeholder="Unassigned" />
        </div>
      </Modal>
    </>
  )
}
