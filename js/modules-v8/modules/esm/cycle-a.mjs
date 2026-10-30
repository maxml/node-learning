import { fromB } from './cycle-b.mjs';
console.log('a evaluates; fromB =', fromB);
export const fromA = 'A-const';            // TDZ until this line runs
export function hoistedA() { return 'A-fn'; } // function declarations are initialised at link time
