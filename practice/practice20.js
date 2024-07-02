function naming() {
  const yyyymmdstr = moment().format("YYYY/MM/DD");

  const Car = {
    carMake: "Honda",
    carModel: "Accord",
    carColor: "Blue",
  };

  function paintCar(car) {
    car.carColor = "Red";
  }

  const DAYS_IN_WEEK = 7;
  const daysInMonth = 30;

  const songs = ["Back In Black", "Stairway to Heaven", "Hey Jude"];
  const Artists = ["ACDC", "Led Zeppelin", "The Beatles"];

  function eraseDatabase() {}
  function restore_database() {}

  class animal {}
  class Alpaca {}
}

// getUserInfo();
// getClientData();
// getCustomerRecord();

function constants() {
  setTimeout(blastOff, 86400000);

  const address = "One Infinite Loop, Cupertino 95014";
  const cityZipCodeRegex = /^[^,\\]+[,\\\s]+(.+?)\s*(\d{5})?$/;
  const [, city, zipCode] = address.match(cityZipCodeRegex) || [];
  saveCityZipCode(city, zipCode);
}

function params() {
  // objects, array
  function createMenu(title, body, buttonText, cancellable) {
    // ...
  }
}

function emailClients(clients) {
  clients.forEach((client) => {
    const clientRecord = database.lookup(client);
    if (clientRecord.isActive()) {
      email(client);
    }
  });
}

function commonFunctionality() {
  function showDeveloperList(developers) {
    developers.forEach((developer) => {
      const expectedSalary = developer.calculateExpectedSalary();
      const experience = developer.getExperience();
      const githubLink = developer.getGithubLink();
      const data = {
        expectedSalary,
        experience,
        githubLink,
      };

      render(data);
    });
  }

  function showManagerList(managers) {
    managers.forEach((manager) => {
      const expectedSalary = manager.calculateExpectedSalary();
      const experience = manager.getExperience();
      const portfolio = manager.getMBAProjects();
      const data = {
        expectedSalary,
        experience,
        portfolio,
      };

      render(data);
    });
  }
}

function defaultObject() {
  const menuConfig = {
    title: "Order",
    // Пользователь не добавил поле 'body'
    buttonText: "Send",
    cancellable: true,
  };

  function createMenu(config) {
    config = Object.assign(
      {
        title: "Foo",
        body: "Bar",
        buttonText: "Baz",
        cancellable: true,
      },
      config
    );

    // config теперь равен: {title: "Order", body: "Bar", buttonText: "Send", cancellable: true}
    // ...
  }

  createMenu(menuConfig);
}

function noFlags() {
  function createFile(name, temp) {
    if (temp) {
      fs.create(`./temp/${name}`);
    } else {
      fs.create(name);
    }
  }
}

function global() {
  class SuperArray extends Array {
    diff(comparisonArray) {
      const hash = new Set(comparisonArray);
      return this.filter((elem) => !hash.has(elem));
    }
  }
}

function extractConditions() {
  function shouldShowSpinner(fsm, listNode) {
    return fsm.state === "fetching" && isEmpty(listNode);
  }

  if (shouldShowSpinner(fsmInstance, listNodeInstance)) {
    // ...
  }
}

function noConditions() {
  class Airplane {
    // ...
    getCruisingAltitude() {
      switch (this.type) {
        case "777":
          return this.getMaxAltitude() - this.getPassengerCount();
        case "Air Force One":
          return this.getMaxAltitude();
        case "Cessna":
          return this.getMaxAltitude() - this.getFuelExpenditure();
      }
    }
  }

  // class Airplane {
  //     // ...
  // }

  class Boeing777 extends Airplane {
    // ...
    getCruisingAltitude() {
      return this.getMaxAltitude() - this.getPassengerCount();
    }
  }

  class AirForceOne extends Airplane {
    // ...
    getCruisingAltitude() {
      return this.getMaxAltitude();
    }
  }

  class Cessna extends Airplane {
    // ...
    getCruisingAltitude() {
      return this.getMaxAltitude() - this.getFuelExpenditure();
    }
  }
}

function move() {
  function travelToTexas(vehicle) {
    if (vehicle instanceof Bicycle) {
      vehicle.pedal(this.currentLocation, new Location("texas"));
    } else if (vehicle instanceof Car) {
      vehicle.drive(this.currentLocation, new Location("texas"));
    }
  }
}

function gettersSetters() {
  function makeBankAccount() {
    // приватная переменная
    let balance = 0;

    // геттер является публичным, так как возвращается в объекте ниже
    function getBalance() {
      return balance;
    }

    // сеттер является публичным, так как возвращается в объекте ниже
    function setBalance(amount) {
      // ... валидация перед обновлением баланса
      balance = amount;
    }

    return {
      // ...
      getBalance,
      setBalance,
    };
  }

  const account = makeBankAccount();
  account.setBalance(100);
}

function privateFields() {
  function makeEmployee(name) {
    return {
      getName() {
        return name;
      },
    };
  }

  const employee = makeEmployee("John Doe");
  console.log(`Employee name: ${employee.getName()}`); // Employee name: John Doe
  delete employee.name;
  console.log(`Employee name: ${employee.getName()}`); // Employee name: John Doe
}

function builder() {
  class Car {
    constructor() {
      this.make = "Honda";
      this.model = "Accord";
      this.color = "white";
    }

    setMake(make) {
      this.make = make;
      return this;
    }

    setModel(model) {
      this.model = model;
      return this;
    }

    setColor(color) {
      this.color = color;
      return this;
    }

    save() {
      console.log(this.make, this.model, this.color);
      return this;
    }
  }

  const car = new Car()
    .setColor("pink")
    .setMake("Ford")
    .setModel("F-150")
    .save();
}

function error() {
  try {
    functionThatMightThrow();
  } catch (error) {
    console.error(error);
    notifyUserOfError(error);
    reportErrorToService(error);
  }

  getdata()
    .then((data) => {
      functionThatMightThrow(data);
    })
    .catch((error) => {
      console.error(error);
      notifyUserOfError(error);
      reportErrorToService(error);
    });
}

function comments() {
  /**
   * 2016-12-20: Удалены монады, не понимал их (RM)
   * 2016-10-01: Улучшено использование специальных монады (JP)
   * 2016-02-03: Исключена проверка типов (LI)
   * 2015-03-14: Добавлен combine с проверкой типов (JR)
   */
  function combine(a, b) {
    return a + b;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Создание объекта
  ////////////////////////////////////////////////////////////////////////////////
  $scope.model = {
    menu: "foo",
    nav: "bar",
  };
}

function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
// console.log(new Date(2022, 3, 17));
// console.log(firstDayOfMonth(new Date(2022, 3, 17)));

function lastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
// console.log(lastDayOfMonth(new Date(2022, 3, 17)));

function nextDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}
// console.log(nextDay(new Date(2022, 3, 17)));
