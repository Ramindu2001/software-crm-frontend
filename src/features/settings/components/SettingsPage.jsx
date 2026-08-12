import { PageHeader } from '@/components/common'
import { useAuth } from '@/features/auth'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/ui'

export function SettingsPage() {
  const { user } = useAuth()

  return (
    <>
      <PageHeader description="Manage your profile and workspace preferences." />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            This information appears alongside issues you report.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" defaultValue={user.name} />
          <Input label="Email" type="email" defaultValue={user.email} />
          <Input
            label="Job title"
            defaultValue={user.role}
            placeholder="Support Engineer"
            wrapperClassName="sm:col-span-2"
          />
        </CardContent>
        <CardFooter>
          <Button size="sm">Save changes</Button>
          <Button size="sm" variant="ghost">
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </>
  )
}
