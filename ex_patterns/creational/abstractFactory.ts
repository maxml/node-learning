interface Button {
  paint(): void;
}

class WinButton implements Button {
  paint() {
    console.log("Win");
  }
}

class MacButton implements Button {
  paint() {
    console.log("Mac");
  }
}

interface Checkbox {
  paint(): void;
}

class WinCheckbox implements Checkbox {
  paint() {}
}

class MacCheckbox implements Checkbox {
  paint() {}
}

interface GUIFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
}

class WinFactory implements GUIFactory {
  createButton(): Button {
    return new WinButton();
  }
  createCheckbox(): Checkbox {
    return new WinCheckbox();
  }
}

class MacFactory implements GUIFactory {
  createButton(): Button {
    return new MacButton();
  }
  createCheckbox(): Checkbox {
    return new MacCheckbox();
  }
}

class Application {
  private factory: GUIFactory;
  private button!: Button;

  constructor(factory: GUIFactory) {
    this.factory = factory;
  }

  createUI() {
    this.button = this.factory.createButton();
  }

  paint() {
    this.button!.paint();
  }
}

class ApplicationConfigurator {
  main() {
    const config = {
      OS: "",
    };
    config.OS = "Windows";

    let factory: GUIFactory;
    if (config.OS == "Windows") {
      factory = new WinFactory();
    } else if (config.OS == "Mac") {
      factory = new MacFactory();
    } else throw new Error("Error! Unknown operating system.");

    const app = new Application(factory);
    app.createUI();
    app.paint();
  }
}

new ApplicationConfigurator().main();
