/** The number of widgets present */
declare var foo: number;

declare function greet(greeting: string): void;

declare namespace myLib {
  function makeGreeting(s: string): string;
  let numberOfGreetings: number;
}

declare function getWidget(n: number): Event;
declare function getWidget(s: string): Event[];

interface GreetingSettings {
  greeting: string;
  duration?: number;
  color?: string;
}

declare function greet(setting: GreetingSettings): void;

type GreetingLike = string | (() => string) | Event;

declare function greet(g: GreetingLike): void;

declare namespace GreetingLib {
  interface LogOptions {
    verbose?: boolean;
  }
  interface AlertOptions {
    modal: boolean;
    title?: string;
    color?: string;
  }
}

declare namespace GreetingLib.Options {
  // Refer to via GreetingLib.Options.Log
  interface Log {
    verbose?: boolean;
  }
  interface Alert {
    modal: boolean;
    title?: string;
    color?: string;
  }
}

declare class Greeter {
  constructor(greeting: string);

  greeting: string;
  showGreeting(): void;
}
