// Native decorator syntax in plain JS: does this Node/V8 parse it?
function logged(value) { return value; }
class Greeter {
  @logged
  greet() { return "hi"; }
}
console.log(new Greeter().greet());
