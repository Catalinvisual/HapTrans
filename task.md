# Invoice Workflow Task List

## Backend
- [x] 1. Update `InvoicesService.create()` to generate `DRAFT-YYYY-XXXX` invoice numbers for new draft invoices.
- [x] 2. Update `InvoicesService.update()` to block editing if `status !== 'draft'` (unless the change is strictly status transitions like SENT -> PAID).
- [x] 3. Create `PATCH /invoices/:id/approve` endpoint in `InvoicesController` and `approve(id)` logic in `InvoicesService` (assigns `HC-YYYY-XXXX`).
- [x] 4. Create `ResendService.sendInvoiceEmail(invoice)` to send a beautiful English email with the invoice attached/linked.
- [x] 5. Update `/invoices/upload-pdf/:id` to accept `?sendEmail=true` flag. If true, send email to client.
- [x] 6. Create `InvoicesCronService` with a daily cron job at 10 AM:
      - 3+ days old drafts -> Add DB Notification
      - 7+ days old drafts -> Add DB Notification & Send Email to Admin

## Frontend
- [x] 7. Update `InvoicesPage.tsx` to conditionally disable the `Edit` button and inputs for non-draft invoices.
- [x] 8. Add `Approve` button (generates number, generates PDF, uploads, NO email).
- [x] 9. Add `Approve & Send` button (generates number, generates PDF, uploads, YES email).
- [x] 10. Test UI logic visually.
