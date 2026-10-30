// Bug class: `this` inside a plain function is `any` (or undefined at runtime
// in strict-mode code), so a detached callback reads a property of undefined.
export const counter = {
  count: 0,
  start() {
    setTimeout(function () {
      this.count++;
    }, 0);
  },
};
