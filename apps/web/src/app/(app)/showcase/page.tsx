'use client';

import * as React from 'react';
import {
  PageHeader,
  Button,
  Badge,
  StatusBadge,
  KpiCard,
  EmptyState,
  ErrorState,
  LoadingState,
  Card,
  CardContent,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Switch,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
  Toaster,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  PageToolbar,
  CommandPalette,
  GlobalSearch,
  NotificationCenter,
  NotificationBell,
  DataTable,
  Alert,
  AlertTitle,
  AlertDescription,
  Label,
} from '@hapcargo/ui';
import type { DataTableColumn } from '@hapcargo/ui';

interface SampleRow {
  id: string;
  name: string;
  status: string;
  customer: string;
  vehicle: string;
  driver: string;
  created: string;
  amount: number;
}

const sampleData: SampleRow[] = [
  { id: '1', name: 'Transport Order #1001', status: 'active', customer: 'SC TransLogistics SRL', vehicle: 'MB Actros 2023', driver: 'Ion Popescu', created: '2024-01-15', amount: 2500 },
  { id: '2', name: 'Transport Order #1002', status: 'planned', customer: 'EuroCargo GmbH', vehicle: 'Volvo FH 2022', driver: 'Maria Schmidt', created: '2024-01-14', amount: 3200 },
  { id: '3', name: 'Transport Order #1003', status: 'completed', customer: 'Polski Przewoznik', vehicle: 'Scania R450', driver: 'Jan Kowalski', created: '2024-01-13', amount: 1800 },
  { id: '4', name: 'Transport Order #1004', status: 'delayed', customer: 'France Transport SA', vehicle: 'Renault T High', driver: 'Pierre Dubois', created: '2024-01-12', amount: 4100 },
  { id: '5', name: 'Transport Order #1005', status: 'at-risk', customer: 'TransEspana SL', vehicle: 'Iveco S-Way', driver: 'Carlos Garcia', created: '2024-01-11', amount: 2900 },
];

const columns: DataTableColumn<SampleRow>[] = [
  { id: 'name', accessorKey: 'name', header: 'Order', cell: (row: SampleRow) => <span className="font-medium">{row.name}</span> },
  { id: 'status', accessorKey: 'status', header: 'Status', cell: (row: SampleRow) => <StatusBadge status={row.status} /> },
  { id: 'customer', accessorKey: 'customer', header: 'Customer' },
  { id: 'vehicle', accessorKey: 'vehicle', header: 'Vehicle' },
  { id: 'driver', accessorKey: 'driver', header: 'Driver' },
  { id: 'created', accessorKey: 'created', header: 'Created' },
  { id: 'amount', accessorKey: 'amount', header: 'Amount (EUR)', cell: (row: SampleRow) => `€${row.amount.toLocaleString()}` },
];

export default function ShowcasePage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const [density, setDensity] = React.useState<'compact' | 'standard' | 'comfortable'>('standard');

  return (
    <div className="space-y-8">
      <PageHeader
        title="UI Component Showcase"
        description="Development and QA reference for all reusable UI components"
        primaryAction={
          <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
        }
      />

      <Toaster />

      {/* Typography */}
      <section aria-labelledby="typography-heading" className="space-y-4">
        <h2 id="typography-heading" className="text-2xl font-semibold">Typography</h2>
        <Card>
          <CardContent className="space-y-4 p-6">
            <h1 className="text-4xl font-bold">Heading 1 (text-4xl)</h1>
            <h2 className="text-3xl font-bold">Heading 2 (text-3xl)</h2>
            <h3 className="text-2xl font-semibold">Heading 3 (text-2xl)</h3>
            <h4 className="text-xl font-semibold">Heading 4 (text-xl)</h4>
            <p className="text-lg">Large body text (text-lg)</p>
            <p className="text-base">Base body text (text-base)</p>
            <p className="text-sm text-muted-foreground">Small text (text-sm)</p>
            <p className="text-xs text-muted-foreground">Extra small text (text-xs)</p>
          </CardContent>
        </Card>
      </section>

      {/* Buttons */}
      <section aria-labelledby="buttons-heading" className="space-y-4">
        <h2 id="buttons-heading" className="text-2xl font-semibold">Buttons</h2>
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon"><span className="text-lg">??</span></Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
              <Button asChild>
                <a href="#">As Child</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Badges & Status Badges */}
      <section aria-labelledby="badges-heading" className="space-y-4">
        <h2 id="badges-heading" className="text-2xl font-semibold">Badges & Status Badges</h2>
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="planned" />
              <StatusBadge status="assigned" />
              <StatusBadge status="confirmed" />
              <StatusBadge status="dispatched" />
              <StatusBadge status="active" />
              <StatusBadge status="on-time" />
              <StatusBadge status="at-risk" />
              <StatusBadge status="delayed" />
              <StatusBadge status="completed" />
              <StatusBadge status="cancelled" />
              <StatusBadge status="offline" />
              <StatusBadge status="available" />
              <StatusBadge status="exception" />
              <StatusBadge status="pending" />
              <StatusBadge status="approved" />
              <StatusBadge status="rejected" />
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="planned" variant="outline" />
              <StatusBadge status="active" variant="outline" />
              <StatusBadge status="completed" variant="outline" />
              <StatusBadge status="delayed" variant="outline" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* KPI Cards */}
      <section aria-labelledby="kpi-heading" className="space-y-4">
        <h2 id="kpi-heading" className="text-2xl font-semibold">KPI Cards</h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Active Orders" value="24" change={{ value: 12.5, trend: 'up', label: 'vs last week' }} icon={<span className="text-lg">??</span>} variant="primary" />
              <KpiCard title="Active Trips" value="18" change={{ value: -3.2, trend: 'down', label: 'vs last week' }} icon={<span className="text-lg">??</span>} variant="success" />
              <KpiCard title="Exceptions" value="3" change={{ value: 50, trend: 'up', label: 'vs yesterday' }} icon={<span className="text-lg">??</span>} variant="warning" />
              <KpiCard title="Revenue" value="€124,500" change={{ value: 8.7, trend: 'up', label: 'vs last month' }} icon={<span className="text-lg">??</span>} variant="destructive" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Inputs & Forms */}
      <section aria-labelledby="forms-heading" className="space-y-4">
        <h2 id="forms-heading" className="text-2xl font-semibold">Form Components</h2>
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="user@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Number Input</Label>
                <Input id="number" type="number" placeholder="100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text">Text Input</Label>
                <Input id="text" placeholder="Enter text..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="textarea">Textarea</Label>
              <Textarea id="textarea" placeholder="Enter description..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Select</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="check1" />
                <Label htmlFor="check1">Checkbox</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="switch1" />
                <Label htmlFor="switch1">Switch</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disabled">Disabled Input</Label>
              <Input id="disabled" disabled placeholder="Disabled" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Dialogs & Drawers */}
      <section aria-labelledby="dialogs-heading" className="space-y-4">
        <h2 id="dialogs-heading" className="text-2xl font-semibold">Dialogs & Drawers</h2>
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap gap-3">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Action</DialogTitle>
                    <DialogDescription>Are you sure you want to proceed? This action cannot be undone.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => setDialogOpen(false)}>Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Drawer Title</DrawerTitle>
                    <DrawerDescription>This is a side drawer panel.</DrawerDescription>
                  </DrawerHeader>
                  <div className="py-4">Drawer content goes here...</div>
                  <DrawerFooter>
                    <Button variant="outline" onClick={() => setDrawerOpen(false)}>Close</Button>
                    <Button onClick={() => setDrawerOpen(false)}>Save</Button>
                  </DrawerFooter>
                </DrawerContent>
                <DrawerTrigger asChild>
                  <Button onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
                </DrawerTrigger>
              </Drawer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tabs */}
      <section aria-labelledby="tabs-heading" className="space-y-4">
        <h2 id="tabs-heading" className="text-2xl font-semibold">Tabs</h2>
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="tab1">
              <TabsList>
                <TabsTrigger value="tab1">Tab One</TabsTrigger>
                <TabsTrigger value="tab2">Tab Two</TabsTrigger>
                <TabsTrigger value="tab3">Tab Three</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1" className="mt-4">Content for Tab One</TabsContent>
              <TabsContent value="tab2" className="mt-4">Content for Tab Two</TabsContent>
              <TabsContent value="tab3" className="mt-4">Content for Tab Three</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* Table / DataTable */}
      <section aria-labelledby="tables-heading" className="space-y-4">
        <h2 id="tables-heading" className="text-2xl font-semibold">Data Table</h2>
        <Card>
          <CardContent className="p-6">
            <DataTable
              columns={columns}
              data={sampleData}
              density={density}
              onDensityChange={setDensity}
              selectable
              enableExport
              onExport={() => console.log('Export clicked')}
            />
          </CardContent>
        </Card>
      </section>

      {/* Alerts */}
      <section aria-labelledby="alerts-heading" className="space-y-4">
        <h2 id="alerts-heading" className="text-2xl font-semibold">Alerts</h2>
        <Card>
          <CardContent className="space-y-3 p-6">
            <Alert>
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>Your changes have been saved successfully.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Something went wrong. Please try again.</AlertDescription>
            </Alert>
            <Alert variant="warning">
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>This action may have unintended consequences.</AlertDescription>
            </Alert>
            <Alert variant="info">
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>New features are available in the latest update.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      {/* Tooltips */}
      <section aria-labelledby="tooltips-heading" className="space-y-4">
        <h2 id="tooltips-heading" className="text-2xl font-semibold">Tooltips</h2>
        <Card>
          <CardContent className="p-6">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover me</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This is a tooltip with helpful information.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>
      </section>

      {/* Dropdown Menu */}
      <section aria-labelledby="dropdown-heading" className="space-y-4">
        <h2 id="dropdown-heading" className="text-2xl font-semibold">Dropdown Menu</h2>
        <Card>
          <CardContent className="p-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Open Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => {}}><span className="text-lg">??</span>View</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => {}}><span className="text-lg">??</span>Edit</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => {}}><span className="text-lg">??</span>Export</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onSelect={() => {}}><span className="text-lg">??</span>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      </section>

      {/* Loading / Empty / Error States */}
      <section aria-labelledby="states-heading" className="space-y-4">
        <h2 id="states-heading" className="text-2xl font-semibold">Global States</h2>
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-3 p-6">
            <LoadingState title="Loading data..." description="Please wait while we fetch the data." size="md" />
            <EmptyState title="No data" description="There are no items to display." action={<Button variant="outline" size="sm">Add Item</Button>} size="md" />
            <ErrorState title="Something went wrong" description="Failed to load data. Please try again." retry={() => {}} size="md" />
          </CardContent>
        </Card>
      </section>

      {/* Page Header & Toolbar */}
      <section aria-labelledby="page-header-heading" className="space-y-4">
        <h2 id="page-header-heading" className="text-2xl font-semibold">Page Header & Toolbar</h2>
        <Card>
          <CardContent className="space-y-4 p-6">
            <PageHeader
              title="Orders Management"
              description="View and manage all transport orders"
              breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Operations' },
                { label: 'Orders' },
              ]}
              primaryAction={<Button><span className="text-lg">??</span>New Order</Button>}
              secondaryActions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline"><span className="text-lg">??</span>More</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><span className="text-lg">??</span>Export</DropdownMenuItem>
                    <DropdownMenuItem><span className="text-lg">??</span>Settings</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
            <PageToolbar
              search={{ placeholder: 'Search orders...' }}
              savedViews={{
                currentView: 'Default',
                views: [
                  { id: 'default', label: 'Default View' },
                  { id: 'active', label: 'Active Orders' },
                  { id: 'completed', label: 'Completed' },
                ],
                onChange: () => {},
              }}
              columns={{
                columns: columns.map(c => ({ id: c.accessorKey as string, label: c.header as string, visible: true })),
                onToggle: () => {},
              }}
              density={{
                value: density,
                onChange: setDensity,
              }}
              exportAction={
                <DropdownMenuItem onSelect={() => {}}><span className="text-lg">??</span>Export CSV</DropdownMenuItem>
              }
            />
          </CardContent>
        </Card>
      </section>

      {/* Command Palette, Global Search, Notifications */}
      <section aria-labelledby="command-heading" className="space-y-4">
        <h2 id="command-heading" className="text-2xl font-semibold">Command Palette, Search & Notifications</h2>
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setCommandOpen(true)}>Open Command Palette (⌘K)</Button>
              <Button onClick={() => setSearchOpen(true)}>Open Global Search (⌘/)</Button>
              <NotificationBell
                notifications={[{ id: '1', title: 'System', timestamp: new Date(), category: 'system', priority: 'normal', read: false }]}
                onOpen={() => setNotificationOpen(true)}
              />
            </div>
            <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
            <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} results={[]} />
            <NotificationCenter
              isOpen={notificationOpen}
              onClose={() => setNotificationOpen(false)}
              notifications={[
                { id: '1', title: 'New order assigned', description: 'Order #1001 assigned to driver', timestamp: new Date(), category: 'operational', priority: 'normal', read: false },
                { id: '2', title: 'Trip delayed', description: 'Trip #2001 delayed by 2 hours', timestamp: new Date(Date.now() - 3600000), category: 'exception', priority: 'high', read: false },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      {/* Skeleton */}
      <section aria-labelledby="skeleton-heading" className="space-y-4">
        <h2 id="skeleton-heading" className="text-2xl font-semibold">Skeleton Loaders</h2>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}



































