// Bug class: dot access makes a dynamic key look like a declared field.
// A typo (`DATABSE_URL`) on an index-signature type compiles as if it were checked.
type Env = { NODE_ENV: string; [key: string]: string | undefined };
export function dbUrl(env: Env) {
  return env.DATABSE_URL;
}
