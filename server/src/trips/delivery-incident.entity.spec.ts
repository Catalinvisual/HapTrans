import { DataSource } from 'typeorm';
import { DeliveryIncident } from './delivery-incident.entity';

describe('DeliveryIncident entity', () => {
  it('builds PostgreSQL metadata without an inferred Object column', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      entities: [DeliveryIncident],
    });

    await (dataSource as any).buildMetadatas();

    const metadata = dataSource.getMetadata(DeliveryIncident);
    const column = (name: string) => metadata.columns.find((c) => c.propertyName === name);
    expect(column('customerName')?.type).toBe('varchar');
    expect(column('photoIds')?.type).toBe('simple-json');
    expect(column('resolvedAt')?.type).toBe('timestamp');
  });
});
