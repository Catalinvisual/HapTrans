declare module '@casl/ability' {
  export class Ability {
    constructor(builder: AbilityBuilder<this>, ...args: any[]);
    can(action: any, subject: any, conditions?: any): boolean;
    cannot(action: any, subject: any, conditions?: any): void;
    relevantActionFor(...args: any[]): string[];
  }
  export class AbilityBuilder<A extends Ability> {
    can(action: any, subject: any, conditions?: any): AbilityBuilder<A>;
    cannot(action: any, subject: any, conditions?: any): AbilityBuilder<A>;
    build(): A;
  }
  export type AbilityTuple = [string, string];
}
