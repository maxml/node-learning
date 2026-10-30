import { fromA, hoistedA } from './cycle-a.mjs';
// b is evaluated first (depth-first post-order), while a has not run yet.
console.log('b evaluates; hoistedA() =', hoistedA());
try {
  console.log('fromA =', fromA);
} catch (e) {
  console.log('fromA ->', e.constructor.name + ':', e.message);
}
export const fromB = 'B-const';
export const readALater = () => fromA; // live binding: fine once a has finished
