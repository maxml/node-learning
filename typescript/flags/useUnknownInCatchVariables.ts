// Bug class: anything can be thrown (a string, a number, an object without
// `message`); treating the catch variable as Error can itself throw or log `undefined`.
export function parse(s: string) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return { error: e.message.slice(0, 80) };
  }
}
