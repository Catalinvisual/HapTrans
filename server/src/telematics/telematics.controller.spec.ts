import { TelematicsController } from './telematics.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { UserRole } from '../users/user.entity';

const handlerGuards = (handler: string): any[] =>
  Reflect.getMetadata('__guards__', (TelematicsController.prototype as any)[handler]) || [];

const handlerRoles = (handler: string): UserRole[] =>
  Reflect.getMetadata('required_roles', (TelematicsController.prototype as any)[handler]) || [];

describe('TelematicsController simulator gating', () => {
  const simulatorHandlers = [
    'getSimulatedTrucks',
    'setSimActivity',
    'triggerScenario',
    'setSimSpeed',
    'setTimeScale',
    'setDriver',
    'simulateDisconnect',
    'simulateReconnect',
  ];

  it.each(simulatorHandlers)('%s requires authentication (JwtAuthGuard)', (handler) => {
    expect(handlerGuards(handler)).toContain(JwtAuthGuard);
  });

  it.each(simulatorHandlers)('%s enforces the admin role via RolesGuard', (handler) => {
    expect(handlerGuards(handler)).toContain(RolesGuard);
    expect(handlerRoles(handler)).toEqual([UserRole.ADMIN]);
  });

  it('operator endpoints do not require admin (fleet view stays usable)', () => {
    expect(handlerRoles('getAllConnections')).toEqual([]);
  });

  const connectionMutationHandlers = ['saveConnection', 'testConnection'];

  it.each(connectionMutationHandlers)('%s requires authentication (JwtAuthGuard)', (handler) => {
    expect(handlerGuards(handler)).toContain(JwtAuthGuard);
  });

  it.each(connectionMutationHandlers)('%s is restricted to admins', (handler) => {
    expect(handlerGuards(handler)).toContain(RolesGuard);
    expect(handlerRoles(handler)).toEqual([UserRole.ADMIN]);
  });
});
