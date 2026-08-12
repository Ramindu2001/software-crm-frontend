import { APP_NAME } from '@/config/constants'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/ui'

const SearchIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="11" cy="11" r="7" strokeWidth="2" />
    <path d="m20 20-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        {title}
      </h2>
      {children}
    </section>
  )
}

function App() {
  return (
    <main className="mx-auto max-w-3xl space-y-10 p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          {APP_NAME}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">UI Primitives</h1>
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Create issue</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="ghost">Filter</Button>
          <Button variant="danger">Delete</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button isLoading>Saving</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="danger" dot>
            Critical
          </Badge>
          <Badge tone="warning" dot>
            High
          </Badge>
          <Badge tone="info" dot>
            In Progress
          </Badge>
          <Badge tone="success" dot>
            Resolved
          </Badge>
          <Badge tone="neutral" dot>
            Closed
          </Badge>
          <Badge tone="brand">Feature</Badge>
          <Badge size="sm">SYN-1042</Badge>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Issue title"
            placeholder="Summarise the problem"
            required
          />
          <Input
            label="Search"
            placeholder="Find an issue"
            leadingIcon={<SearchIcon />}
          />
          <Input
            label="Reporter email"
            hint="We'll notify this address on status changes."
            placeholder="name@synnex.com"
          />
          <Input
            label="Due date"
            error="Due date cannot be in the past."
            defaultValue="2024-01-01"
          />
          <Input label="Assignee" placeholder="Unassigned" disabled />
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle>Login fails on Safari</CardTitle>
              <Badge tone="danger" size="sm" dot>
                Critical
              </Badge>
            </div>
            <CardDescription>
              Reported by Nadia Perera · 2 hours ago
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-muted">
              Users on Safari 17 are redirected to the login page after a
              successful authentication request.
            </p>
          </CardContent>
          <CardFooter>
            <Button size="sm">Assign to me</Button>
            <Button size="sm" variant="ghost">
              Dismiss
            </Button>
          </CardFooter>
        </Card>
      </Section>
    </main>
  )
}

export default App
