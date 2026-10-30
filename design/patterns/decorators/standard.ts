// TC39 (TS 5.0+ "standard") method decorator: (value, context) => replacement.
// Compiled with tsc WITHOUT experimentalDecorators.
function logged<This, Args extends unknown[], R>(
  target: (this: This, ...args: Args) => R,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => R>,
) {
  return function (this: This, ...args: Args): R {
    console.log(`  [standard] call ${String(context.name)}(${args.join(", ")})`);
    return target.call(this, ...args);
  };
}

export class Greeter {
  @logged
  greet(name: string) { return `hi ${name}`; }
}

console.log("standard:", new Greeter().greet("Ann"));
