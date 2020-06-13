function exFunctions() {
  let myAdd = (x: number, y: number): number => {
    return x + y;
  };

  let myAdd2: (baseValue: number, increment: number) => number = function (
    x,
    y
  ) {
    return x + y;
  };

  let myAdd3: (x: number, y: number) => number = function (
    x: number,
    y: number
  ): number {
    return x + y;
  };

  console.log(myAdd(1, 1));
  console.log(myAdd2(1, 2));
  console.log(myAdd3(1, 3));

  function doAction(action: any, title: string) {
    if (title) {
      console.log(`Doing action ${title}...`);
    }

    console.log("doAction:" + action);
  }

  doAction(() => {
    console.log("Files were removed!");
  }, "Delete");
  doAction(1, "");
  // doAction(() => { console.log('Project was created!') });
}
// exFunctions();

function exDefaultOptionaRest() {
  interface CommandOptions {
    path: string;
    params: string[];
    title?: string;
  }

  function executeCommand(command: string, options: CommandOptions) {
    console.log("executeCommand");
  }

  function buildName(
    firstName: string = "Will",
    lastName?: string,
    ...restOfName: string[]
  ) {
    return firstName + " " + lastName + " " + restOfName.join(",");
  }

  console.log(buildName("Bob"));
  console.log(buildName("Bob", "Adams"));
  console.log(buildName(undefined, "Adams"));
  console.log(buildName("", "Adams"));
  console.log(buildName("Joseph", "Samuel", "Lucas"));
  console.log(buildName("Joseph", "Samuel", "Lucas", "MacKinzie"));
}
// exDefaultOptionaRest();

function exThis() {
  let deck0 = {
    suits: ["hearts", "spades", "clubs", "diamonds"],
    cards: Array(52),
    createCardPicker: function () {
      return function () {
        let pickedCard = Math.floor(Math.random() * 52);
        let pickedSuit = Math.floor(pickedCard / 13);

        // return { suit: this.suits[pickedSuit], card: pickedCard % 13 };
      };
    },
  };

  let deck1 = {
    suits: ["hearts", "spades", "clubs", "diamonds"],
    cards: Array(52),
    createCardPicker: function () {
      return () => {
        let pickedCard = Math.floor(Math.random() * 52);
        let pickedSuit = Math.floor(pickedCard / 13);

        return { suit: this.suits[pickedSuit], card: (pickedCard % 13) + 1 };
      };
    },
  };

  let pickedCard = deck1.createCardPicker()();

  console.log("card: " + pickedCard.card + " of " + pickedCard.suit);

  let deck2 = {
    suits: ["hearts", "spades", "clubs", "diamonds"],
    cards: Array(52),
    createCardPicker: function () {
      function _privateFunction(this: { suits: string[] }) {
        let pickedCard = Math.floor(Math.random() * 52);
        let pickedSuit = Math.floor(pickedCard / 13);

        return { suit: this.suits[pickedSuit], card: (pickedCard % 13) + 1 };
      }
      return _privateFunction.bind(this);
    },
  };

  pickedCard = deck2.createCardPicker()();
  console.log("card: " + pickedCard.card + " of " + pickedCard.suit);
}
// exThis();

let deck3 = {
  suits: ["hearts", "spades", "clubs", "diamonds"],
  cards: Array(52),
  createCardPicker: function () {
    return function () {
      let pickedCard = Math.floor(Math.random() * 52);
      let pickedSuit = Math.floor(pickedCard / 13);

      return { suit: that.suits[pickedSuit], card: (pickedCard % 13) + 1 };
    };
  },
};
const that: any = deck3;
let pickedCard = deck3.createCardPicker()();
// console.log("card: " + pickedCard.card + " of " + pickedCard.suit);

class Deck4 {
  suits = ["hearts", "spades", "clubs", "diamonds"];
  cards = Array(52);

  createCardPicker() {
    const that2 = this;
    return function () {
      let pickedCard = Math.floor(Math.random() * 52);
      let pickedSuit = Math.floor(pickedCard / 13);

      return { suit: that2.suits[pickedSuit], card: (pickedCard % 13) + 1 };
    }.bind(that2);
  }
}
pickedCard = new Deck4().createCardPicker()();
// console.log("card: " + pickedCard.card + " of " + pickedCard.suit);

function exOverloading() {
  let suits = ["hearts", "spades", "clubs", "diamonds"];

  function pickCard(x: { suit: string; card: number }[]): number;
  function pickCard(x: number): { suit: string; card: number };
  function pickCard(x: any): any {
    // Check to see if we're working with an object/array
    // if so, they gave us the deck and we'll pick the card
    if (typeof x == "object") {
      let pickedCard = Math.floor(Math.random() * x.length);
      return pickedCard;
    }
    // Otherwise just let them pick the card
    else if (typeof x == "number") {
      console.log("number");

      let pickedSuit = Math.floor(x / 13);
      return { suit: suits[pickedSuit], card: x % 13 };
    }
  }

  let myDeck = [
    { suit: "diamonds", card: 2 },
    { suit: "spades", card: 10 },
    { suit: "hearts", card: 4 },
  ];
  let pickedCard1 = myDeck[pickCard(myDeck)];
  console.log("card: " + pickedCard1.card + " of " + pickedCard1.suit);

  let pickedCard2 = pickCard(15);
  console.log("card: " + pickedCard2.card + " of " + pickedCard2.suit);
}
// exOverloading();

function exLiteralOverloading() {
  function createElement(tagName: "img"): HTMLImageElement;
  function createElement(tagName: "input"): HTMLInputElement;
  function createElement(tagName: string): Element {
    return {} as Element;
  }
}
// exLiteralOverloading();

function exOverriding() {
  class Person {
    name: string = "";

    eat(): void {
      console.log(this.name + " eats when hungry.");
    }
  }

  class Student extends Person {
    rollnumber: number;

    constructor(rollnumber: number, name1: string) {
      super();
      this.rollnumber = rollnumber;
      this.name = name1;
    }

    displayInformation(): void {
      console.log("Name : " + this.name + ", Roll Number : " + this.rollnumber);
    }

    eat(): void {
      console.log(this.name + " eats during break.");
    }
  }

  const student1 = new Student(2, "Rohit");

  student1.displayInformation();
  student1.eat();
}
// exOverriding();
