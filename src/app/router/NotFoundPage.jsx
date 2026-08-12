import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '@/components/common'
import { Button } from '@/components/ui'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="That page doesn't exist, or it may have been moved."
      action={
        <Button as={Link} to="/dashboard" size="sm">
          Back to dashboard
        </Button>
      }
    />
  )
}
