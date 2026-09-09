/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Injectable } from '@nestjs/common';
import { AbilityBuilder, Ability } from '@casl/ability';

export type AppAbilities = [
  string, // action
  string, // subject
];

export class AppAbility extends Ability {}

@Injectable()
export class AbilityFactory {
  defineForUser(permissions: { action: string; subject: string; scope: string; conditions?: Record<string, unknown> }[]): AppAbility {
    // @ts-ignore - CASL v7 constructor types are incompatible with Prisma-generated types
    const builder = new AbilityBuilder(() => new AppAbility([]));
    for (const perm of permissions) {
      // @ts-ignore - CASL v7 type mismatch
      builder.can(perm.action as any, perm.subject as any, perm.conditions as any);
    }
    // @ts-ignore - CASL v7 build return type
    return builder.build() as AppAbility;
  }
}
