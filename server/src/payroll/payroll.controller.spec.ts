import { PayrollController } from './payroll.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('PayrollController security', () => {
  it('is protected by JwtAuthGuard (salary data must require authentication)', () => {
    const guards: any[] = Reflect.getMetadata('__guards__', PayrollController) || [];
    expect(guards).toContain(JwtAuthGuard);
  });
});
