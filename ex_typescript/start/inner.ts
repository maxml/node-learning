class Foo {}

module Foo {
  export class InnerFoo {
    doIt() {
      console.log("Foo");
    }
  }
}

new Foo.InnerFoo();

class Foo2 {
  doSomethingWithInnerFoo() {
    new Foo.InnerFoo().doIt();
  }
}

module Foo2 {
  export class InnerFoo {
    doIt2() {
      console.log("doIt");
    }
  }
}

new Foo2().doSomethingWithInnerFoo();
new Foo2.InnerFoo().doIt2();
