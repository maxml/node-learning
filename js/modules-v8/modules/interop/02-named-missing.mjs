// Fails at LINK time (before any code in this file runs): the name was not detected statically.
import { epsilon } from './lib-dynamic.cjs';
console.log('never printed', epsilon);
