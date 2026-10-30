import { hour } from './clock.mjs'; // live binding to clock.mjs, resolved when this module is linked

export function greet(name) {
  return `${hour() < 12 ? 'Good morning' : 'Good afternoon'}, ${name}`;
}
