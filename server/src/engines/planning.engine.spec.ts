import { BadRequestException } from '@nestjs/common';
import { PlanningEngine } from './planning.engine';

describe('PlanningEngine allocation guard', () => {
  it('rejects an order that still has a live allocation on another trip', async () => {
    const tripRepo: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'trip-2', status: 'planning', company: { id: 'company-1' } }),
    };
    const orderRepo: any = {
      find: jest.fn().mockResolvedValue([{
        id: 'order-1',
        orderNumber: 'ORD-1',
        status: 'new',
        company: { id: 'company-1' },
        trip: null,
        stops: [],
        cargoItems: [],
      }]),
    };
    const taskRepo: any = {
      createQueryBuilder: jest.fn(() => {
        const qb: any = {};
        qb.innerJoin = jest.fn().mockReturnValue(qb);
        qb.where = jest.fn().mockReturnValue(qb);
        qb.andWhere = jest.fn().mockReturnValue(qb);
        qb.getMany = jest.fn().mockResolvedValue([{ id: 'existing-task' }]);
        return qb;
      }),
    };
    const engine = new PlanningEngine(
      tripRepo,
      orderRepo,
      {} as any,
      taskRepo,
      {} as any,
      {} as any,
    );

    await expect(engine.assignOrdersToTrip('trip-2', ['order-1']))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
