import { describe, it, expect } from 'vitest';
import { NAV_GROUPS } from './sidebar';

describe('Sidebar navigation IA', () => {
  const groupKeys = NAV_GROUPS.map((g) => g.key);
  const allHrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));

  it('defines all 11 required groups in the exact required order', () => {
    expect(groupKeys).toEqual([
      'dashboard',
      'operations',
      'fleet',
      'commercial',
      'finance',
      'documents',
      'analytics',
      'communication',
      'portals',
      'ai',
      'administration',
    ]);
  });

  it('uses a unique key for every nav group', () => {
    expect(new Set(groupKeys).size).toBe(groupKeys.length);
  });

  it('uses a unique href across all nav items', () => {
    expect(new Set(allHrefs).size).toBe(allHrefs.length);
  });

  it('exposes localised labels for every item', () => {
    const labels = NAV_GROUPS.flatMap((g) => [
      g.label,
      ...g.items.map((i) => i.label),
    ]);
    for (const label of labels) {
      expect(label.startsWith('nav.')).toBe(true);
    }
  });

  it('includes the required dashboard route', () => {
    expect(allHrefs).toContain('/dashboard');
  });

  it('includes all exact operational routes', () => {
    expect(allHrefs).toContain('/operations/orders');
    expect(allHrefs).toContain('/operations/planning');
    expect(allHrefs).toContain('/operations/trips');
    expect(allHrefs).toContain('/operations/dispatch');
    expect(allHrefs).toContain('/operations/control-tower');
    expect(allHrefs).toContain('/operations/exceptions');
  });

  it('includes fleet, commercial, finance route groups', () => {
    expect(allHrefs).toContain('/fleet/vehicles');
    expect(allHrefs).toContain('/fleet/drivers');
    expect(allHrefs).toContain('/commercial/customers');
    expect(allHrefs).toContain('/commercial/contracts');
    expect(allHrefs).toContain('/finance/invoices');
    expect(allHrefs).toContain('/finance/payments');
  });

  it('includes documents, analytics, communication, portals, ai, administration anchors', () => {
    expect(allHrefs).toContain('/documents');
    expect(allHrefs).toContain('/analytics/executive');
    expect(allHrefs).toContain('/communication/messages');
    expect(allHrefs).toContain('/portals/customer');
    expect(allHrefs).toContain('/portals/carrier');
    expect(allHrefs).toContain('/ai/copilot');
    expect(allHrefs).toContain('/administration/users');
    expect(allHrefs).toContain('/administration/roles');
    expect(allHrefs).toContain('/administration/audit');
  });
});
