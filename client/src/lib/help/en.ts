import type { HelpLocaleText } from './types';

export const en: HelpLocaleText = {
  ui: {
    guide_title: 'Help & guide',
    guide_subtitle: 'Everything you need to learn HapCargo, chapter by chapter',
    guide_search: 'Search the guide: page, feature, status…',
    guide_no_results: 'No chapter matches your search.',
    guide_clear: 'Clear search',
    guide_categories: 'Categories',
    guide_chapters: 'chapters',
    guide_quick_start: 'New here? Follow these three steps',
    guide_continue: 'Continue reading',
    guide_progress: 'Guide progress',
    guide_mark_read: 'Mark as read',
    guide_read: 'Read',
    guide_open_page: 'Open this page',
    guide_print: 'Print this chapter',
    guide_prev: 'Previous',
    guide_next: 'Next',
    guide_in_chapter: 'In this chapter',
    guide_tip: 'Good to know',
    guide_warning: 'Careful',
    guide_steps: 'Step by step',
    guide_fields: 'Key options',
    guide_results: 'results',
    guide_all: 'All chapters',
    guide_back: 'Back to overview',
    guide_chapter: 'Chapter',
    guide_minutes: 'min read',
    guide_shortcut_hint: 'Tip: press ? anywhere to see the keyboard shortcuts.',
    guide_read_chapters: 'chapters read',
    guide_reset: 'Reset progress',
    guide_start_here: 'Start here',
    guide_open_menu: 'Open the chapter menu',
    guide_close_menu: 'Close the chapter menu',
    guide_language_note: 'This guide is written in all seven languages of the app and follows the language you selected in the top bar.',
    guide_updated: 'Last reviewed against the current version of the TMS.',
    guide_search_results: 'Search results',
  },
  categories: {
    start: {
      title: 'Getting started',
      summary: 'The interface, the daily flow and the few habits that make everything else faster.',
    },
    operations: {
      title: 'Daily operations',
      summary: 'Orders, trips, planning, live tracking, chat and documents — the heart of the TMS.',
    },
    fleet: {
      title: 'Fleet & drivers',
      summary: 'Trucks, trailers, drivers, maintenance, telematics and tachograph.',
    },
    finance: {
      title: 'Finance',
      summary: 'Invoices, payments, expenses, payroll, settlements, analytics and reports.',
    },
    commercial: {
      title: 'Commercial & compliance',
      summary: 'Clients, the website, quote requests, EU transit and the client portal.',
    },
    admin: {
      title: 'Administration',
      summary: 'Users, roles, permissions, company data, tariffs and connections.',
    },
    assist: {
      title: 'Help & troubleshooting',
      summary: 'What to do when something blocks you, plus a glossary of every term.',
    },
  },
  chapters: {
    welcome: {
      title: 'The screen at a glance',
      summary: 'What lives where in HapCargo, and the controls you will use every day.',
      blocks: [
        {
          kind: 'diagram',
          variant: 'layout',
          title: 'Anatomy of every screen',
          callouts: [
            'Sidebar — the modules your role is allowed to open.',
            'Page title and module tabs (Orders / Quotes, Trucks / Trailers, Payroll / Settlements).',
            'Global search — find any page, order, trip, client or invoice with Ctrl+K.',
            'Help & guide — this page, with every function explained.',
            'Keyboard shortcuts — press ? to open the same panel.',
            'Light / dark theme for the workspace.',
            'Notifications — status changes, expiring documents, chats and delay risks.',
            'Language selector and your profile menu (install, logout, logout everywhere).',
          ],
        },
        {
          kind: 'p',
          text: 'HapCargo is the transport management system of the company: commercial orders, planning, trips, fleet, drivers, documents, invoicing and reporting in one place. The sidebar is built from your role, so two colleagues may see different modules.',
        },
        { kind: 'h', text: 'What you can do here' },
        {
          kind: 'list',
          items: [
            'Move between modules from the sidebar; collapse it with the arrow on its edge.',
            'Switch the interface language at any time — the choice is saved in your browser.',
            'Search globally with Ctrl+K, or press / to jump into the search of the current page.',
            'Press N on a list page to create a new record, and ? to see all shortcuts.',
            'Install the TMS as a desktop app (PWA) from the download icon or the profile menu.',
            'Read this guide in all seven languages; every chapter links to the page it explains.',
          ],
        },
        { kind: 'h', text: 'Your first ten minutes' },
        {
          kind: 'steps',
          items: [
            'Check your name and role in the top-right corner — they decide what you can open.',
            'Pick your language in the top bar.',
            'Open Dashboard and set the date range you care about (today, week, month).',
            'Use Ctrl+K to find one real order or client and open it; this is the fastest way to learn the layout.',
            'Come back to this guide from the book icon whenever a screen is unclear.',
          ],
        },
        {
          kind: 'tip',
          text: 'The TMS remembers filters, page size and your last view while you move between pages. It also works offline as an installed PWA for reading pages you already visited.',
        },
        {
          kind: 'warn',
          text: 'A module missing from the sidebar is a permission, not a bug. An administrator has to add that page to your account in Users & roles.',
        },
      ],
    },
    'first-day': {
      title: 'One transport job, end to end',
      summary: 'The normal life of a job: from the customer request to the money in the bank.',
      blocks: [
        {
          kind: 'p',
          text: 'Almost every task in the TMS belongs to one chain. Learn the chain once and you will always know where you are and what comes next.',
        },
        {
          kind: 'diagram',
          variant: 'flow',
          title: 'The operational chain',
          callouts: [
            'Order — what the customer asks for: route, dates, cargo, price.',
            'Planning — the cheapest feasible position for that order on a truck.',
            'Trip — the executable tour with stops, ETAs, driver and documents.',
            'Documents — CMR, POD, photos and anything the customer or the office needs.',
            'Invoice — issued from the delivered order or trip, with automatic numbering.',
            'Payment — recorded against the invoice; reports and aging follow automatically.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'An administrator completes company data, bank details and tariffs in Settings.',
            'Add the client, then the truck, trailer and driver in Fleet and Drivers.',
            'Create the order in Orders with the three-step wizard.',
            'Open Planning, assign the order to the cheapest feasible truck and confirm.',
            'The driver executes the trip from the mobile app; the office follows it on the Live Map and in Chat.',
            'Upload the CMR/POD in Documents and attach it to the trip.',
            'Raise the invoice, record the payment, and close the month in Payroll and Reports.',
          ],
        },
        {
          kind: 'tip',
          text: 'Setup is done once and used everywhere: company data appears on PDFs, fleet dimensions decide what Planning can load, and tariffs feed the price calculator.',
        },
        {
          kind: 'warn',
          text: 'Planning never invents data. If a truck has no internal dimensions, the route is missing or the driver has no tachograph records, the system reports UNVERIFIED instead of guessing.',
        },
      ],
    },
    orders: {
      title: 'Orders — from request to delivery',
      summary: 'Create, edit, filter and invoice transport orders with the three-step wizard.',
      blocks: [
        {
          kind: 'p',
          text: 'Orders is the commercial entry point. Every order holds the client, price, pickup and delivery windows, cargo and later the link to its trip and invoice. Quote Requests live in the tab next to Orders when your role allows it.',
        },
        {
          kind: 'diagram',
          variant: 'wizard',
          title: 'The order wizard',
          callouts: [
            'Three steps: General info, Pickup & Delivery, Cargo items.',
            'General — client, agreed price, currency, transport type, equipment and priority.',
            'Route — addresses with autocomplete, dates, time windows, contacts and references.',
            'Cargo — description, pallets/quantity, weight in kg, loading metres and volume.',
            'Save — the system validates the order and makes it available to Planning.',
          ],
        },
        { kind: 'h', text: 'What you can do here' },
        {
          kind: 'list',
          items: [
            'Search and filter by status, client, country, transport type, priority and date.',
            'Open a row to see the order drawer, or edit it directly from the row actions.',
            'Duplicate an order to repeat a regular lane, and delete or archive what you no longer need.',
            'Export the filtered list to Excel, CSV or PDF, or import orders from Excel / an AI-read document.',
            'Generate the invoice from the order once it is delivered; the link is kept for audit.',
            'Select several rows to export or delete them in one action.',
          ],
        },
        { kind: 'h', text: 'The three wizard steps' },
        {
          kind: 'table',
          head: ['Step', 'What you fill in'],
          rows: [
            ['General info', 'Client, price and currency, transport type, equipment, priority, notes.'],
            ['Pickup & delivery', 'Address, date, time window, contact person, phone, loading/unloading references.'],
            ['Cargo items', 'Description, quantity/pallets, weight (kg), LDM, volume (m³), ADR details when needed.'],
          ],
        },
        { kind: 'h', text: 'Fields that decide everything later' },
        {
          kind: 'list',
          items: [
            'Price and currency — profit, margin and reports are calculated from them.',
            'Weight and pallets — Planning checks them against the truck and trailer capacity.',
            'LDM and m³ — used when the truck is limited by loading metres or volume, not only by weight.',
            'ADR — marks dangerous goods and shows the ADR badge everywhere the order appears.',
            'Time windows — Planning and ETAs respect them; a missed window is a hard conflict.',
          ],
        },
        {
          kind: 'tip',
          text: 'Type a city and pick the suggestion: the address is geocoded, which makes routing, ETAs and the live map work. A free-text address without coordinates cannot be routed.',
        },
        {
          kind: 'warn',
          text: 'Pickup and delivery cannot be the same address in one order. Cargo above the assigned truck capacity is not blocked at creation, but Planning will refuse to confirm it.',
        },
      ],
    },
    trips: {
      title: 'Trips — execution and monitoring',
      summary: 'Follow what is on the road, who drives it, what it costs and what has been delivered.',
      blocks: [
        {
          kind: 'p',
          text: 'A trip is the executable side of one or more orders: a truck, a trailer, a driver, an ordered list of stops and a schedule. Trips are created in Planning and then updated by the driver app and the office.',
        },
        { kind: 'h', text: 'The list' },
        {
          kind: 'list',
          items: [
            'KPI strip with active, planned, delayed and completed trips plus revenue and profit.',
            'Filters by status, truck, driver and date, with search on trip number, plate, driver and city.',
            'Sortable columns for departure, distance, weight, revenue, cost and profit.',
            'Bulk selection for export or deletion, and a PDF profile per trip.',
            'Live refresh when a driver changes a status or reports an incident.',
          ],
        },
        { kind: 'h', text: 'Inside the trip sheet' },
        {
          kind: 'list',
          items: [
            'Summary: status, truck, trailer, driver, revenue, estimated cost and profit.',
            'Route and stops in sequence, with arrival/departure, ETA and window status.',
            'Cargo on board: weight, pallets, LDM and volume against the recorded limits.',
            'Documents and activity history — every status change is kept with time and author.',
            'Links to the orders, the planning board and the live map.',
          ],
        },
        { kind: 'h', text: 'Main statuses' },
        {
          kind: 'list',
          items: [
            'PLANNING / ACCEPTED — created, waiting for the driver to start.',
            'EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → LOADING — the pickup sequence.',
            'EN_ROUTE_TO_DELIVERY → ARRIVED_AT_DELIVERY → UNLOADING — the delivery sequence.',
            'COMPLETED — delivered and closed; DELAYED / EXCEPTION — needs attention.',
            'DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — delivery outcomes that affect invoicing.',
            'CANCELLED — the trip was called off; the orders can be planned again.',
          ],
        },
        {
          kind: 'tip',
          text: 'Open the trip from the order, or the order from the trip: the two views always point at each other, so you never lose the commercial context.',
        },
        {
          kind: 'warn',
          text: 'Do not delete a trip that still carries documents or an invoice. Close it as CANCELLED or COMPLETED so the audit trail and the customer portal stay correct.',
        },
      ],
    },
    planning: {
      title: 'Planning — the board and its tools',
      summary: 'Assign orders to the cheapest feasible truck, resolve conflicts and confirm a real schedule.',
      blocks: [
        {
          kind: 'p',
          text: 'Planning is the dispatch cockpit: unassigned orders on one side, the fleet board on the other. The board shows trucks and days, the timeline shows hours, and every assignment is validated by the backend before anything is written.',
        },
        { kind: 'h', text: 'Ways to plan' },
        {
          kind: 'list',
          items: [
            'Drag an unassigned order onto a truck/day cell, or open it and pick a truck.',
            'Use the timeline to see hours, breaks, daily rest and overlapping trips.',
            'Use Smart Consolidation to find the cheapest feasible insertion position in an existing trip.',
            'Save a view (filters, zoom, layout) and return to it later.',
            'Compare scenarios before committing, and undo the last confirmed change if needed.',
            'Print or export the board for the morning meeting.',
          ],
        },
        { kind: 'h', text: 'Tools in the toolbar' },
        {
          kind: 'table',
          head: ['Tool', 'When to use it'],
          rows: [
            ['Smart Consolidation', 'Add an order to an existing trip; shows the recommended and alternative stop orders with real added km.'],
            ['Split / Combine trips', 'A trip is too long, or two trips can travel together.'],
            ['Cross-dock / Drop & hook', 'Swap trailers or cargo at a hub without a full delivery.'],
            ['Subcontractor', 'Give a leg to a partner while keeping the customer order in the TMS.'],
            ['Fleet optimization', 'Let the system propose the best truck for a set of orders.'],
            ['Route comparison', 'Compare providers, distance, tolls and time before choosing.'],
            ['Traffic incidents', 'See live disruptions that affect today’s plan.'],
            ['Command palette', 'Run a planning action from the keyboard without hunting for the button.'],
          ],
        },
        { kind: 'h', text: 'Confirming a consolidation' },
        {
          kind: 'steps',
          items: [
            'Select the orders to add and open the wizard.',
            'Read the verdict: feasible, warning or blocked; blocked cannot be overridden.',
            'Choose the recommended stop order or an alternative; each shows its own added distance and ETA.',
            'Check cargo against capacity, equipment compatibility, stop windows and driver hours.',
            'If a warning remains, type the override reason — it is stored with your name in the audit.',
            'Confirm once. The write is transactional and idempotent: a retry cannot create a second trip.',
          ],
        },
        {
          kind: 'tip',
          text: 'The verdict is the single source of truth. The screen renders exactly what the backend decided — never a friendlier version of it.',
        },
        {
          kind: 'warn',
          text: 'Hard conflicts stop the confirmation: missed stop window, weight/pallet overload, truck/trailer/driver overlap, missing required equipment. Fix the data or the plan; never work around a genuine blocker.',
        },
      ],
    },
    'map-chat': {
      title: 'Live map, tracking links and chat',
      summary: 'See where every truck is, share a tracking link with the customer and talk to drivers in real time.',
      blocks: [
        {
          kind: 'p',
          text: 'The Live Map combines GPS positions from telematics with the planned route, next stop and live ETA. Chat is the direct line to the driver, and public tracking lets a customer follow one trip without a TMS account.',
        },
        { kind: 'h', text: 'Live map' },
        {
          kind: 'list',
          items: [
            'Truck markers with plate, driver and current activity; click one to open its details.',
            'Next pickup/delivery, arrival estimate and the remaining route for the selected trip.',
            'Search by plate, driver or city; the map follows the selection.',
            'Live updates over WebSocket, plus a fallback refresh when the connection drops.',
            'Tachograph activity and connection status shown next to the truck when available.',
          ],
        },
        { kind: 'h', text: 'Sharing a tracking link' },
        {
          kind: 'steps',
          items: [
            'Open the trip or order and choose the share/tracking action.',
            'Send the generated link (/track/…) to the customer; it opens a read-only tracking page.',
            'The link shows the current position and ETA, not prices, costs or internal notes.',
          ],
        },
        { kind: 'h', text: 'Chat and notifications' },
        {
          kind: 'list',
          items: [
            'One room per trip plus a general dispatch room; messages arrive in real time.',
            'Attach photos and PDFs — useful for loading damage, CMR pages or delivery proof.',
            'Unread messages and status changes appear in the bell menu and as a popup.',
            'Desktop notifications can be enabled from the bell menu; the browser asks for permission once.',
          ],
        },
        {
          kind: 'tip',
          text: 'A customer calling about an ETA is the most common support call. The tracking link answers it without anyone opening the TMS.',
        },
        {
          kind: 'warn',
          text: 'A truck without a telematics connection shows its last known position, not a live one. Treat a stale timestamp as “position unverified”, never as the current location.',
        },
      ],
    },
    documents: {
      title: 'Documents — CMR, POD and everything else',
      summary: 'Upload, classify, share and find the paperwork behind every trip.',
      blocks: [
        {
          kind: 'p',
          text: 'Documents keeps the paper trail in one place and links it to a trip, so the office, the customer portal and the invoice all refer to the same file.',
        },
        {
          kind: 'steps',
          items: [
            'Open Documents and choose Upload (or press N).',
            'Pick the file from your computer or drag it into the dialog.',
            'Choose the document type and, whenever possible, the trip it belongs to.',
            'Add notes for your colleagues — what the file proves or what is missing.',
            'Save, then use download, preview or share from the list.',
          ],
        },
        {
          kind: 'table',
          head: ['Type', 'Used for'],
          rows: [
            ['CMR', 'International consignment note, the legal transport document.'],
            ['POD', 'Proof of delivery, signed by the receiver.'],
            ['Delivery note / packing list', 'What was handed over and in which quantity.'],
            ['Invoice', 'A copy of the commercial invoice attached to the file.'],
            ['Photo', 'Loading condition, damage, seal or pallet count.'],
            ['Weight ticket / other', 'Weighbridge slip or any document without its own category.'],
          ],
        },
        { kind: 'h', text: 'Working with the list' },
        {
          kind: 'list',
          items: [
            'Search by file name, type, reference or trip; filter by type and reference.',
            'Preview images and PDFs without downloading them.',
            'Share a document through a public link with an expiry token, then revoke it when needed.',
            'Delete a wrong upload — the action is confirmed first.',
          ],
        },
        {
          kind: 'tip',
          text: 'Upload the CMR and POD before closing the trip: the customer portal and the invoice then show a complete file, and month-end reconciliation stops chasing paper.',
        },
        {
          kind: 'warn',
          text: 'A shared link is public for anyone who has it until it expires or is revoked. Never share a document that contains internal costs or notes.',
        },
      ],
    },
    fleet: {
      title: 'Fleet, trailers and maintenance',
      summary: 'Keep vehicle data complete — Planning depends on it — and stay ahead of services and expiries.',
      blocks: [
        {
          kind: 'p',
          text: 'Fleet & Equipment has two tabs, Trucks and Trailers. The data you enter here is not decoration: dimensions, capacities and equipment decide what Planning may load and what invoices and reports show.',
        },
        { kind: 'h', text: 'Trucks' },
        {
          kind: 'list',
          items: [
            'Identity: plate, brand, model, year, VIN and registration country.',
            'Assignment: status, current driver and attached trailer.',
            'Capacity: max gross weight, payload, pallets, LDM, volume and internal dimensions.',
            'Equipment: body type, euro norm and features used for compatibility checks.',
            'Costs: fuel/energy type and price, average consumption and cost per km.',
            'Documents: ITP, insurance, tachograph and other papers with expiry dates and alerts.',
          ],
        },
        { kind: 'h', text: 'Trailers' },
        {
          kind: 'list',
          items: [
            'Plate, type (mega, frigo, standard, walking floor, container, flatbed), status and dimensions.',
            'Capacity in pallets, LDM, m³ and weight, plus its own document set with expiries.',
            'The trailer must be compatible with the order equipment requirement; missing data becomes UNVERIFIED.',
          ],
        },
        {
          kind: 'table',
          head: ['Field', 'Why it matters'],
          rows: [
            ['Internal length / width / height', 'The compatibility check for mega, frigo and volume-limited cargo.'],
            ['Payload and max weight', 'Weight overload blocks a planning confirmation.'],
            ['Pallets and LDM', 'Pallet overload and loading-metre limits block as well.'],
            ['Fuel type and consumption', 'Cost per km, route cost and CO₂ estimates.'],
          ],
        },
        { kind: 'h', text: 'Maintenance' },
        {
          kind: 'list',
          items: [
            'Record preventive and corrective services, ITP, tyres and repairs.',
            'Enter date, odometer, parts and labour cost, provider and notes; attach the invoice or report.',
            'Statuses: scheduled, in progress, done; overdue and upcoming services are highlighted.',
            'Use odometer and next-maintenance km to plan the service before it becomes a breakdown.',
          ],
        },
        {
          kind: 'tip',
          text: 'Open a truck or trailer to see its drawer: overview, documents, activity history, assigned driver and a printable PDF profile.',
        },
        {
          kind: 'warn',
          text: 'A truck used by an active trip cannot simply be deleted. Finish, cancel or reassign the trip first, and let the documents be archived with it.',
        },
      ],
    },
    drivers: {
      title: 'Drivers, documents and driving hours',
      summary: 'The driver file, its expiries, availability and the hours that Planning must respect.',
      blocks: [
        {
          kind: 'p',
          text: 'Drivers combines the person, the account used by the mobile app, the licence and medical data, the assigned truck and the recorded driving hours.',
        },
        { kind: 'h', text: 'The driver file' },
        {
          kind: 'list',
          items: [
            'Name, email, phone and the password used to sign in to the mobile app.',
            'Licence number, daily allowance and gross salary for payroll.',
            'Assigned truck and availability status.',
            'Licence, medical certificate and tachograph card with their expiry dates.',
            'Documents tab for scans, plus the activity timeline for every change.',
          ],
        },
        {
          kind: 'table',
          head: ['Document', 'What happens when it expires'],
          rows: [
            ['Driving licence', 'Alert in notifications; the driver file is flagged and compliance reports show it.'],
            ['Medical certificate', 'Same alert flow; keep the scan in the driver’s documents.'],
            ['Tachograph card', 'Expiry alert; without a valid card the driver cannot record activity legally.'],
            ['Availability status', 'Available, in trip, off, sick or vacation — Planning and dispatch see it immediately.'],
          ],
        },
        { kind: 'h', text: 'Driving hours (HOS)' },
        {
          kind: 'list',
          items: [
            'Record driving, work, break and rest per day in the driver drawer when tachograph data is not connected.',
            'Limits used by the planning model: 9 h driving per day, 56 h per week, 45 min break after 4.5 h, 11 h daily rest.',
            'Missing records are shown as unverified — never as unlimited availability.',
            'The Tachograph page shows live activity for the whole fleet, refreshed every few seconds.',
          ],
        },
        {
          kind: 'tip',
          text: 'A driver with no truck and no recorded hours can still exist in the system, but Planning will treat his availability as unverified rather than assume he is free.',
        },
        {
          kind: 'warn',
          text: 'Deactivating a driver immediately blocks the mobile login. Make sure no open trip depends on that account, and hand the trip over first.',
        },
      ],
    },
    telematics: {
      title: 'Telematics and tachograph',
      summary: 'Connect a truck’s device, validate the stream and use live positions and activities.',
      blocks: [
        {
          kind: 'p',
          text: 'The Telematics Hub manages the connection between a truck and its telematics or tachograph provider. Once a connection is active, positions, driving activity and ETA reach the Live Map and Tachograph pages.',
        },
        {
          kind: 'steps',
          items: [
            'Open Telematics and choose Add connection.',
            'Select the truck and the provider (a test simulator is available for training).',
            'Enter the provider device / vehicle id and the device type (OBD, FMS, tachograph).',
            'For tachographs, add brand, model, serial and generation.',
            'Enter the provider credentials exactly as supplied; they are stored server-side.',
            'Run the connection test, then activate and verify the first position on the map.',
          ],
        },
        {
          kind: 'table',
          head: ['Status', 'Meaning'],
          rows: [
            ['Online / connected', 'The provider is sending data for this truck.'],
            ['Offline', 'No recent data; the map shows the last known position with its timestamp.'],
            ['Error / credentials', 'The provider rejected the credentials or the device id — fix and retest.'],
            ['Simulator', 'Synthetic data for training; never use it for a real customer promise.'],
          ],
        },
        { kind: 'h', text: 'What the data feeds' },
        {
          kind: 'list',
          items: [
            'Live Map: position, heading, current activity and connection status.',
            'Tachograph: driving, work, availability and rest, with daily and weekly counters.',
            'Planning: real driving/rest records where available; otherwise unverified availability.',
            'Dashboard and reports: telemetry and reliability indicators.',
          ],
        },
        {
          kind: 'tip',
          text: 'Use the Telematics Simulator to train new colleagues: it produces positions and activities without touching a real truck or a customer promise.',
        },
        {
          kind: 'warn',
          text: 'Provider API keys and client secrets are company credentials. Enter them only in the connection wizard, never in chat, email or a shared document.',
        },
      ],
    },
    invoices: {
      title: 'Invoices, payments and reminders',
      summary: 'Issue, send, collect and reconcile the money side of every trip.',
      blocks: [
        {
          kind: 'p',
          text: 'Invoices can be created from an order/trip or manually. Numbering is automatic and the PDF uses the company and bank data from Settings, so complete that page before the first invoice.',
        },
        {
          kind: 'diagram',
          variant: 'finance',
          title: 'From delivery to cash',
          callouts: [
            'Delivered order or trip — the source document and audit link.',
            'Invoice — draft, checked, then issued with an automatic number.',
            'PDF / email / share link — the customer receives the same document.',
            'Payment — full or partial, with date, method and reference.',
            'Aging and reports — outstanding balance per client, per bucket.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Open Invoices and create a new invoice, or use the invoice action on a delivered order.',
            'Select the client, issue date, due date and currency.',
            'Add lines with description, quantity, unit price and VAT; check the totals.',
            'Save as draft, review, then issue the final number.',
            'Download the PDF, send it by email or share it with the customer.',
            'Record the payment when it arrives and check the remaining balance.',
          ],
        },
        {
          kind: 'table',
          head: ['Status', 'Meaning'],
          rows: [
            ['Draft', 'Editable, not yet issued; no final number or PDF sent.'],
            ['Issued / sent', 'Final document delivered to the customer.'],
            ['Partially paid', 'Some payments recorded; the balance stays visible.'],
            ['Paid', 'Fully settled.'],
            ['Overdue', 'Due date passed without full payment; highlighted and included in reminders.'],
            ['Cancelled', 'Voided; keep it for the audit trail instead of deleting it.'],
          ],
        },
        { kind: 'h', text: 'Collections' },
        {
          kind: 'list',
          items: [
            'Record full or partial payments against an invoice; the balance updates automatically.',
            'Open the aging report to see current, 1–30, 31–60, 61–90 and 90+ days.',
            'Send payment reminders to clients with overdue invoices from the reminder action.',
            'Export the filtered register to Excel, CSV or PDF for the accountant.',
          ],
        },
        {
          kind: 'tip',
          text: 'Invoice from the order whenever possible: the order number, client, trip and documents stay linked, and the customer portal shows the same invoice.',
        },
        {
          kind: 'warn',
          text: 'A draft has no final number. Do not send a draft PDF to a customer; issue it first. If the company data or IBAN changes, old PDFs are not rewritten.',
        },
      ],
    },
    'expenses-payroll': {
      title: 'Expenses, payroll and settlements',
      summary: 'Record company costs and close the month for drivers and subcontractors.',
      blocks: [
        { kind: 'p', text: 'Expenses captures costs that are not tied to a single trip, while Payroll and Settlements calculate what drivers earn for the month.' },
        { kind: 'h', text: 'Expenses' },
        {
          kind: 'list',
          items: [
            'Amount and currency, category, date and description.',
            'Categories: fuel, maintenance, accounting, salary, toll and other.',
            'Attach the receipt photo or PDF; the AI reader can prefill the fields from a receipt.',
            'Filter and search the list, edit or delete with confirmation.',
            'Expenses feed the financial cockpit and the cost breakdown in reports.',
          ],
        },
        { kind: 'h', text: 'Payroll' },
        {
          kind: 'steps',
          items: [
            'Choose the month and year.',
            'Run Generate — the system calculates the payroll from the month’s trips and the driver’s pay data.',
            'Review the list, open a driver’s PDF and correct the source data if something is wrong.',
          ],
        },
        { kind: 'h', text: 'Settlements' },
        {
          kind: 'list',
          items: [
            'Generate a settlement per driver and month, choosing the pay mode (per km, percentage, fixed).',
            'Enter the rate; the settlement shows kilometres, revenue and the resulting amount.',
            'Use settlements for owner-drivers and subcontractors where payroll is not the right instrument.',
            'Keep the PDF with the month’s paperwork for the accountant.',
          ],
        },
        {
          kind: 'tip',
          text: 'Close the month in order: expenses → payroll/settlements → invoices → reports. Each step reads data produced by the previous one.',
        },
        {
          kind: 'warn',
          text: 'Generating payroll twice for the same month can duplicate amounts. Check the existing list first; correct the source trips rather than editing numbers by hand.',
        },
      ],
    },
    analytics: {
      title: 'Financial cockpit and reports',
      summary: 'Read revenue, cost, margin and receivables, then turn them into a printable report.',
      blocks: [
        { kind: 'p', text: 'Financial is the analysis cockpit; Reports produces reusable, exportable documents from the same operational data. Both respect the date range and filters you choose.' },
        { kind: 'h', text: 'Financial cockpit' },
        {
          kind: 'list',
          items: [
            'Range presets (this month, last month, 30/90 days, 12 months, this year) or a custom interval.',
            'Granularity day, week or month for the trend charts.',
            'KPIs: invoiced, collected, outstanding, revenue, cost, profit and margin.',
            'Cost breakdown by category and receivables/payables aging.',
            'Excel export of the full cockpit for the management meeting.',
          ],
        },
        { kind: 'h', text: 'Reports' },
        {
          kind: 'list',
          items: [
            'Browse the catalog by section: operations, service, financial and methodology.',
            'Filter by client, truck, driver, range and granularity, then preview before exporting.',
            'Export to Excel, CSV or PDF; charts are embedded in the PDF.',
            'Save a configured report for reuse, schedule a recurring one, and review the run history.',
          ],
        },
        {
          kind: 'table',
          head: ['Section', 'Typical reports'],
          rows: [
            ['Operations', 'Trips, utilisation, loaded/empty km, delays, fleet activity.'],
            ['Service', 'On-time pickup/delivery, window misses, incidents and reliability.'],
            ['Financial', 'Revenue, cost, profit, margin, invoicing and receivables.'],
            ['Methodology', 'Definitions, assumptions and data-quality notes used by the numbers.'],
          ],
        },
        {
          kind: 'tip',
          text: 'Read the methodology section before presenting a number: it states which data was available and which was unverified, so nobody promises a figure the TMS could not prove.',
        },
        {
          kind: 'warn',
          text: 'An empty chart usually means no data in the selected range, not a broken report. Widen the dates, clear the client/truck filter and check that invoices and trips are closed.',
        },
      ],
    },
    clients: {
      title: 'Clients and tariffs',
      summary: 'Keep the commercial file, contact details and portal access in one place.',
      blocks: [
        {
          kind: 'p',
          text: 'The client file is reused by orders, invoices, quotes and the customer portal. A complete file means one entry, not five spellings of the same company.',
        },
        {
          kind: 'list',
          items: [
            'Company name, VAT/CUI, trade register number, address and country.',
            'Contact person, email and phone used for quotes and invoices.',
            'Open the client drawer to see its details, orders, trips and invoices.',
            'Grant portal access so the customer can follow orders, trips, invoices and documents.',
            'Search, filter and export the client list; delete only after checking for open documents.',
            'Tariffs and the price calculator live in Settings → Tariff Engine.',
          ],
        },
        { kind: 'h', text: 'Adding a client and portal access' },
        {
          kind: 'steps',
          items: [
            'Create the client with the legal name and VAT number exactly as on the invoice.',
            'Add the contact person and the email that will receive quotes and invoices.',
            'Open the client details and enable portal access.',
            'Send the invitation/set-password link; the customer chooses a password and signs in at /portal/login.',
          ],
        },
        {
          kind: 'table',
          head: ['Field', 'Where it appears'],
          rows: [
            ['Legal name and address', 'Invoice PDF, CMR, customer portal.'],
            ['VAT / CUI', 'Invoice and financial reports.'],
            ['Contact email', 'Quote replies, invoices and portal invitation.'],
            ['Country', 'Filters, EU transit analysis and reporting.'],
          ],
        },
        {
          kind: 'tip',
          text: 'Duplicate client records are the usual cause of “missing” invoices. Search by VAT number before creating a new client.',
        },
        {
          kind: 'warn',
          text: 'Deleting a client with invoices or portal access breaks the history. Archive or deactivate the portal instead; keep the financial link intact.',
        },
      ],
    },
    website: {
      title: 'Website content, quote requests and inbox',
      summary: 'Publish the public site, answer the people who write to it and turn quotes into orders.',
      blocks: [
        { kind: 'p', text: 'The Website module edits the public company site and collects its messages. Quote Requests sit in the Orders module as a tab, and arrive from the website’s transport request form.' },
        {
          kind: 'table',
          head: ['Tab', 'What you edit'],
          rows: [
            ['Inbox', 'Contact messages from the website; read, reply and track their status.'],
            ['Map & countries', 'The countries and lanes shown on the public map.'],
            ['About us', 'Company story, figures and trust content.'],
            ['Services', 'The service cards and their descriptions.'],
            ['Fleet', 'The vehicles presented on the public site.'],
            ['Jobs', 'Open positions and job applications.'],
          ],
        },
        { kind: 'h', text: 'Quote requests' },
        {
          kind: 'list',
          items: [
            'Statuses: new, reviewing, contacted, quoted, accepted, rejected.',
            'Open a request to read the lane, cargo and contact details.',
            'Reply with a price offer; the reply history is stored with the request.',
            'When the customer accepts, use Create Order to turn the quote into a real order without retyping it.',
          ],
        },
        { kind: 'h', text: 'Publishing' },
        {
          kind: 'steps',
          items: [
            'Choose the edit language (RO, EN and the other site languages).',
            'Edit the block you need and save; the TMS confirms the change.',
            'Open the public page and check the text before announcing it to customers.',
          ],
        },
        {
          kind: 'tip',
          text: 'Quote requests already contain the lane and cargo. Convert them to orders instead of copying the text into the wizard — the source request stays linked for the sales history.',
        },
        {
          kind: 'warn',
          text: 'Saving a block changes the live public site. Read the text twice and check the language tab before saving.',
        },
      ],
    },
    compliance: {
      title: 'EU transit, cabotage and ADR',
      summary: 'Prove where the fleet drove, keep dangerous goods visible and respect driving rules.',
      blocks: [
        {
          kind: 'p',
          text: 'The EU Transit & Cabotage report (formerly IFTA) builds a per-country and per-truck picture from the trips’ routes. ADR is a property of the cargo, and tachograph limits are the legal frame Planning uses.',
        },
        {
          kind: 'table',
          head: ['Concept', 'Meaning in the TMS'],
          rows: [
            ['EU transit', 'Movement through a country without loading or unloading there.'],
            ['Cabotage', 'Loading and unloading inside a country you are not established in; limited by EU rules.'],
            ['ADR', 'Dangerous goods: the order carries the ADR flag and the badge appears on every screen.'],
            ['Tachograph / HOS', 'Driving, work, availability and rest recorded per driver and vehicle.'],
          ],
        },
        { kind: 'h', text: 'The country report' },
        {
          kind: 'list',
          items: [
            'Choose a date range; totals are built from routed trips.',
            'Read kilometres, trips and share per country, and the same split per truck.',
            'Export the report for the declaration or the compliance file.',
            'Missing route geometry or a country code shows up as incomplete data, never as a guessed distance.',
          ],
        },
        { kind: 'h', text: 'ADR and driving rules' },
        {
          kind: 'list',
          items: [
            'Mark ADR on the cargo item (class, UN number and details) so the badge follows the order and trip.',
            'Planning shows ADR trucks and equipment requirements; a mismatch is a conflict.',
            'Keep licence, medical, tachograph card and driving hours current — expired or missing data is flagged.',
          ],
        },
        {
          kind: 'tip',
          text: 'Record the real route countries through geocoded stops. Compliance reports are only as good as the addresses and routes behind them.',
        },
        {
          kind: 'warn',
          text: 'This module reports what the TMS knows. It does not replace the legal tachograph analysis or the transport manager’s responsibility for compliance.',
        },
      ],
    },
    portal: {
      title: 'The client portal',
      summary: 'What your customers see when they sign in, and how to give them access safely.',
      blocks: [
        {
          kind: 'p',
          text: 'The client portal is a separate, read-mostly area for customers: they follow their orders and trips, download invoices and documents and contact the office. They never see costs, margins or other clients.',
        },
        {
          kind: 'diagram',
          variant: 'portal',
          title: 'The customer’s view',
          callouts: [
            'Dashboard — active orders, invoices due, outstanding balance and recent activity.',
            'Orders — their orders, statuses and a form to request a new transport.',
            'Trips — active trips with stops and tracking.',
            'Invoices — PDF, payment details and bank information.',
            'Support — phone, email and message form.',
          ],
        },
        { kind: 'h', text: 'What the customer can do' },
        {
          kind: 'list',
          items: [
            'Sign in at /portal/login with the email invited by the office.',
            'Request a new transport; the request becomes an order/quote for the team.',
            'Follow active trips and open the tracking page.',
            'Download invoices, see the outstanding balance and the bank details for payment.',
            'Contact the dispatcher from the support page.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Open the client file and enable portal access.',
            'Send the invitation to the contact email.',
            'The customer sets a password from the link and signs in.',
            'Verify that the client sees only its own orders, trips and invoices.',
          ],
        },
        {
          kind: 'tip',
          text: 'Use the portal instead of emailing PDFs: the customer always sees the current status and the same documents as the office.',
        },
        {
          kind: 'warn',
          text: 'Portal accounts are per client and must never be shared between companies. If a contact leaves, revoke access and invite the replacement.',
        },
      ],
    },
    'admin-users': {
      title: 'Users, roles and permissions',
      summary: 'Create accounts, choose a role template and decide exactly which pages each person can open.',
      blocks: [
        {
          kind: 'p',
          text: 'Users is the access-control module. A role is only a starting template; the page checkboxes are the real permission, and the sidebar plus the URL guard both honour them.',
        },
        {
          kind: 'table',
          head: ['Role', 'Usually needs'],
          rows: [
            ['Administrator', 'Everything, including Users and Settings.'],
            ['Manager', 'Operations, planning, fleet, drivers, reports and clients.'],
            ['Dispatcher', 'Dashboard, orders, planning, trips, map, chat and documents.'],
            ['Fleet manager', 'Fleet, maintenance, drivers, tachograph, transit and reports.'],
            ['Accountant', 'Invoices, financial, expenses, reports and clients.'],
            ['Payroll officer', 'Payroll, settlements, drivers, expenses and reports.'],
            ['Compliance / customer service / sales', 'The pages their job touches, without finance or administration.'],
            ['Driver', 'Mobile app only; no web modules.'],
          ],
        },
        {
          kind: 'steps',
          items: [
            'Choose New user and complete the account step: name, email, password and language.',
            'Pick the role template that is closest to the job.',
            'Adjust the page checkboxes; sections inside a module can be granted separately.',
            'Set the account active or inactive.',
            'Save and ask the person to sign in; verify the menu matches what you granted.',
          ],
        },
        { kind: 'h', text: 'Security actions' },
        {
          kind: 'list',
          items: [
            'Reset a password without knowing the old one; the user can change it later in Settings → My profile.',
            'Deactivate an account immediately when someone leaves; access stops at the next request.',
            'Log a user out from every device when a laptop or phone is lost.',
            'Delete an account only when no audit trail needs it; deactivation is usually the right choice.',
          ],
        },
        {
          kind: 'tip',
          text: 'Give the smallest set of pages that lets the person do the job. A dispatcher does not need Users, Settings or the company bank details.',
        },
        {
          kind: 'warn',
          text: 'Administrator accounts can change everything, including other administrators. Keep at least two active administrators so the company is never locked out.',
        },
      ],
    },
    settings: {
      title: 'Company settings, tariffs and connections',
      summary: 'The data every PDF, plan and invoice depends on — set it once, carefully.',
      blocks: [
        {
          kind: 'p',
          text: 'Settings is the company configuration. Most tabs are for administrators; the profile tab is for every user. Changes affect documents immediately, including PDFs generated later.',
        },
        {
          kind: 'table',
          head: ['Tab', 'What it controls'],
          rows: [
            ['Company data & invoicing', 'Legal name, VAT, trade register, contact, address, bank, IBAN and logo.'],
            ['Tariff engine & calculator', 'Rates used by the price calculator and quotes.'],
            ['My profile & security', 'Your name, email and password.'],
            ['Connections & server', 'API and WebSocket URLs used by the client.'],
            ['Telematics & integrations', 'The same connections managed by the Telematics Hub.'],
          ],
        },
        { kind: 'h', text: 'Company data' },
        {
          kind: 'list',
          items: [
            'Use the legal name, VAT and trade register exactly as they must appear on invoices.',
            'Upload a clear logo; it appears on PDFs and in the sidebar.',
            'Complete bank and IBAN details — the client portal shows them for payment.',
            'Working hours and contact details also reach the public site and the portal support page.',
            'Saving requires the administrator role.',
          ],
        },
        { kind: 'h', text: 'Tariffs and connections' },
        {
          kind: 'list',
          items: [
            'The tariff engine stores the rates the calculator and quote replies use; keep currency and units consistent.',
            'API and WebSocket URLs are environment settings; change them only with the IT responsible.',
            'Telematics credentials belong in the connection wizard, not in a shared settings note.',
          ],
        },
        {
          kind: 'tip',
          text: 'Before the first invoice, fill company data, bank details and logo. Fixing them later does not regenerate PDFs that were already issued.',
        },
        {
          kind: 'warn',
          text: 'Changing the API URL disconnects the current environment from its backend. Do it only during a planned migration, never as a troubleshooting guess.',
        },
      ],
    },
    troubleshooting: {
      title: 'When something blocks you',
      summary: 'The most common problems, what they actually mean and the fastest safe fix.',
      blocks: [
        {
          kind: 'table',
          head: ['Symptom', 'What to check'],
          rows: [
            ['“Account inactive” at login', 'An administrator must reactivate the account or reset the password in Users.'],
            ['A module is missing from the menu', 'Your role/page set does not include it; ask an administrator, do not re-create the user.'],
            ['Network error / empty page', 'Connection, API URL in Settings → Server, and whether the backend is running.'],
            ['Address not found', 'Type the city and pick the suggestion; a typed address without coordinates cannot be routed.'],
            ['Planning refuses to confirm', 'Read the conflict code: missed window, weight/pallet overload, truck/trailer/driver overlap, missing equipment.'],
            ['Equipment UNVERIFIED', 'Fill the truck and trailer internal dimensions and body type in Fleet.'],
            ['Driver hours UNVERIFIED', 'There are no tachograph records for the window; record HOS or connect telematics. Do not read it as free time.'],
            ['No live position for a truck', 'The telematics connection is offline; the last timestamp is not the current position.'],
            ['Invoice PDF shows wrong data', 'Correct Settings → Company data; old PDFs are not rewritten.'],
            ['Desktop notifications do not appear', 'Enable them from the bell menu and allow the browser permission.'],
          ],
        },
        { kind: 'h', text: 'Planning conflict codes' },
        {
          kind: 'list',
          items: [
            'STOP_WINDOW_MISSED — the arrival is after the window; change the date, split the trip or renegotiate the window.',
            'WEIGHT_OVERLOAD / PALLET_OVERLOAD — the cargo exceeds the recorded truck+trailer capacity.',
            'TRUCK_OVERLAP / TRAILER_OVERLAP / DRIVER_OVERLAP — the resource is already committed in that interval.',
            'EQUIPMENT_MISSING / EQUIPMENT_UNVERIFIED — the order needs equipment the vehicle does not prove it has.',
            'ROUTE_UNVERIFIED / CARGO_DIMENSIONS_UNVERIFIED — the route or the cargo data is incomplete; the system does not guess.',
            'PROPOSAL_CHANGED — the reviewed proposal no longer matches; reopen the wizard and review again.',
            'ASSIGNMENT_BLOCKED — a hard blocker is present and cannot be overridden.',
          ],
        },
        {
          kind: 'tip',
          text: 'If the message mentions UNVERIFIED, the right fix is almost always data: complete the vehicle, the route or the driver records. Never fake a dimension or a GPS position to make a plan pass.',
        },
        {
          kind: 'warn',
          text: 'Do not work around a genuine blocker with an override or a manual edit. A missed legal window or an overloaded truck is a real-world risk, not a software inconvenience.',
        },
      ],
    },
    glossary: {
      title: 'Glossary and statuses',
      summary: 'The vocabulary of the TMS, so every colleague means the same thing.',
      blocks: [
        {
          kind: 'table',
          head: ['Term', 'Meaning'],
          rows: [
            ['TMS', 'Transport Management System — the software you are using.'],
            ['Order', 'The commercial request: client, route, cargo, price.'],
            ['Trip', 'The executable tour: truck, trailer, driver, ordered stops.'],
            ['Stop', 'A pickup or delivery point inside a trip, with its window and ETA.'],
            ['Planning board', 'The trucks × days grid where orders are assigned.'],
            ['Insertion', 'The cheapest feasible position of a new pickup/delivery pair in an existing trip.'],
            ['Consolidation', 'Adding an order to a trip that already exists instead of creating a new one.'],
            ['ETA', 'Estimated time of arrival, recalculated from the route and the schedule.'],
            ['LDM', 'Loading metres — the floor length the cargo occupies.'],
            ['CMR / POD', 'International consignment note / proof of delivery.'],
            ['ADR', 'European agreement on the transport of dangerous goods.'],
            ['Cabotage', 'Loading and unloading inside a country where the carrier is not established.'],
            ['Tachograph', 'The device recording driving, work, availability and rest.'],
            ['Settlement', 'A driver’s or subcontractor’s monthly calculation, separate from payroll.'],
            ['Aging', 'Outstanding invoices grouped by how many days they are overdue.'],
            ['Override', 'A documented decision to accept a soft warning; a reason and the user are stored.'],
            ['Verdict', 'The backend’s feasibility decision: feasible, warning or blocked.'],
            ['UNVERIFIED', 'Data is missing, so the system refuses to guess — complete the source data.'],
          ],
        },
        { kind: 'h', text: 'Order statuses' },
        {
          kind: 'list',
          items: [
            'draft — being prepared, not yet visible to planning.',
            'new — complete and waiting to be planned.',
            'planned / assigned — attached to a trip and a truck.',
            'loading / in_transit — execution in progress.',
            'delivered — the receiver accepted the goods.',
            'pod_received — the signed proof is uploaded.',
            'ready_for_invoice / invoiced / paid — the financial tail of the order.',
            'cancelled — the order will not be executed.',
          ],
        },
        { kind: 'h', text: 'Trip statuses' },
        {
          kind: 'list',
          items: [
            'PLANNING, ACCEPTED — created and confirmed, not started.',
            'EN_ROUTE_TO_PICKUP, ARRIVED_AT_PICKUP, LOADING — pickup sequence.',
            'EN_ROUTE_TO_DELIVERY, ARRIVED_AT_DELIVERY, UNLOADING — delivery sequence.',
            'COMPLETED — closed successfully; DELAYED, EXCEPTION — needs attention.',
            'DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — delivery outcomes.',
            'CANCELLED — called off; its orders can be replanned.',
          ],
        },
        {
          kind: 'tip',
          text: 'When two colleagues describe a job differently, check this glossary first. One word, one meaning, fewer mistakes.',
        },
        {
          kind: 'warn',
          text: 'Statuses are not cosmetic. Reports, the portal and invoicing read them; moving a trip forward without the real event makes every downstream number wrong.',
        },
      ],
    },
  },
};
