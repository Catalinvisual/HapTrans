import { generateInvoiceHtml } from './pdf-template';

const invoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-2026-00001',
  status: 'draft',
  issueDate: '2026-11-10',
  dueDate: '2026-12-10',
  amount: 1200,
  subtotal: 1200,
  vatPercent: 0,
  vatType: 'EXEMPT',
  client: { name: 'Client SRL', address: 'Client Street 1', country: 'Romania' },
  items: [{ description: 'Transport', quantity: 1, unitPrice: 1200, total: 1200 }],
  transportDetails: {
    loadingAddress: 'Warehouse A, Bucharest',
    unloadingAddress: 'Warehouse B, Rotterdam',
    loadingDate: '2026-11-01',
    loadingTime: '08:00',
    unloadingDate: '2026-11-03',
    unloadingTime: '10:30',
    loadingReference: 'LOAD-1',
    unloadingReference: 'UNLOAD-1',
    pallets: 33,
    weightKg: 24000,
    volumeCbm: 40,
    cargoDescription: 'General cargo',
    vehicle: 'B-123-XY / TR-456',
    driver: 'Ion Popescu',
  },
};

describe('generateInvoiceHtml transport details', () => {
  it('prints every transport snapshot field', () => {
    const html = generateInvoiceHtml(invoice, { name: 'HapCargo' }, 'en');

    expect(html).toContain('Loading address:');
    expect(html).toContain('Warehouse A, Bucharest');
    expect(html).toContain('Unloading address:');
    expect(html).toContain('Warehouse B, Rotterdam');
    expect(html).toContain('01/11/2026 · 08:00');
    expect(html).toContain('03/11/2026 · 10:30');
    expect(html).toContain('LOAD-1');
    expect(html).toContain('UNLOAD-1');
    expect(html).toContain('33 pallets, 24000 kg, 40 m3');
    expect(html).toContain('General cargo');
    expect(html).toContain('B-123-XY / TR-456');
    expect(html).toContain('Ion Popescu');
  });

  it('removes the draft badge once the invoice is approved', () => {
    const draftHtml = generateInvoiceHtml(invoice, { name: 'HapCargo' }, 'en');
    const approvedHtml = generateInvoiceHtml({ ...invoice, status: 'approved' }, { name: 'HapCargo' }, 'en');

    expect(draftHtml).toContain('DRAFT');
    expect(draftHtml).toContain('This is not a final invoice.');
    expect(approvedHtml).not.toContain('DRAFT');
    expect(approvedHtml).not.toContain('This is not a final invoice.');
  });
});
