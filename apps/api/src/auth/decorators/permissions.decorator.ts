import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: { action: string; subject: string }[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
