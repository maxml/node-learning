// Legacy TypeScript decorator (experimentalDecorators, what NestJS/TypeORM use):
// (target, propertyKey, descriptor) => descriptor. Compiled WITH experimentalDecorators.
function logged(_target: object, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value as (...args: unknown[]) => unknown;
  descriptor.value = function (this: unknown, ...args: unknown[]) {
    console.log(`  [legacy] call ${key}(${args.join(", ")})`);
    return original.apply(this, args);
  };
  return descriptor;
}

export class Greeter {
  @logged
  greet(name: string) { return `hi ${name}`; }
}

console.log("legacy:", new Greeter().greet("Bob"));
