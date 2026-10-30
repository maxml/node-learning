// `enum` is not erasable syntax: type stripping refuses it
// (needs --experimental-transform-types, tsx, or a build step).
import { test } from 'node:test';

enum Status { Draft, Active }

test('never reached under plain type stripping', () => {
  void Status.Active;
});
