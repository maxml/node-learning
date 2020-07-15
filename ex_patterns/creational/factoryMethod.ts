abstract class Creator {
  public abstract factoryMethod(): Product;

  public someOperation(): string {
    const product = this.factoryMethod();
    return `Creator: The same creator's code has just worked with ${product.execute()}`;
  }
}

class ConcreteCreator1 extends Creator {
  public factoryMethod(): Product {
    return new ConcreteProduct1();
  }
}

class ConcreteCreator2 extends Creator {
  public factoryMethod(): Product {
    return new ConcreteProduct2();
  }
}

interface Product {
  execute(): string;
}

class ConcreteProduct1 implements Product {
  public execute(): string {
    return "{Result of the ConcreteProduct1}";
  }
}

class ConcreteProduct2 implements Product {
  public execute(): string {
    return "{Result of the ConcreteProduct2}";
  }
}

function exFactoryMethod(creator: Creator) {
  console.log(
    "Client: I'm not aware of the creator's class, but it still works."
  );
  console.log(creator.someOperation());
}

console.log("App: Launched with the ConcreteCreator1.");
exFactoryMethod(new ConcreteCreator1());
console.log("");

console.log("App: Launched with the ConcreteCreator2.");
exFactoryMethod(new ConcreteCreator2());
