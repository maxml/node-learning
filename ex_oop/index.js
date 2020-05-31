function es5() {
  function Person(name) {
    this.name = name;
    this.greeting = function () {
      console.log("Hi! I'm " + this.name + ".");
    };
  }

  const person1 = new Object({
    name: "Chris",
    age: 38,
    greeting: function () {
      alert("Hi! I'm " + this.name + ".");
    },
  });

  function Teacher(first, last, age, gender, interests, subject) {
    Person.call(this, first, last, age, gender, interests);

    this.subject = subject;
  }

  Teacher.prototype = Object.create(Person.prototype);
}
// es5();

function exIncapsulation() {
  function User(theName, theEmail) {
    this.name = theName;
    this.email = theEmail;
    this.quizScores = [];
    this.currentScore = 0;
  }

  User.prototype = {
    constructor: User,
    saveScore: function (theScoreToAdd) {
      this.quizScores.push(theScoreToAdd);
    },

    showNameAndScores: function () {
      const scores =
        this.quizScores.length > 0
          ? this.quizScores.join(",")
          : "No Scores Yet";
      return this.name + " Scores: " + scores;
    },

    changeEmail: function (newEmail) {
      this.email = newEmail;
      return "New Email Saved: " + this.email;
    },
  };

  firstUser = new User("Richard", "Richard@examnple.com");
  firstUser.changeEmail("RichardB@examnple.com");
  firstUser.saveScore(15);
  firstUser.saveScore(10);
  console.log(firstUser.showNameAndScores());

  secondUser = new User("Peter", "Peter@examnple.com");
  secondUser.saveScore(18);
  console.log(secondUser.showNameAndScores());
}
// exIncapsulation();

// Constructor/Prototype Pattern
function exInheritance() {
  function Brick() {
    this.width = 10;
    this.height = 20;
  }

  function BlueGlassBrick() {
    Brick.call(this);

    this.opacity = 0.5;
    this.color = "blue";
  }
}

function es6() {
  class Person {
    constructor(first, last, age, gender, interests) {
      this.name = {
        first,
        last,
      };
      this.age = age;
      this.gender = gender;
      this.interests = interests;
    }

    greeting() {
      console.log(`Hi! I'm ${this.name.first}`);
    }

    farewell() {
      console.log(`${this.name.first} has left the building. Bye for now!`);
    }
  }

  class Teacher extends Person {
    constructor(first, last, age, gender, interests, subject, grade) {
      super(first, last, age, gender, interests);
      // subject and grade are specific to Teacher
      this._subject = subject;
      this.grade = grade;
    }

    get subject() {
      return this._subject;
    }

    set subject(newSubject) {
      this._subject = newSubject;
    }
  }
}
// es6();

function exPolymorphism() {
  function Animal(sound) {
    this.sound = sound;
    this.speak = function () {
      return this.sound;
    };
  }

  function showInfo(obj) {
    console.log(obj.speak());
  }

  const dog = new Animal("woof");
  const cat = new Animal("meow");
  const cow = new Animal("humbow");

  showInfo(dog);
  showInfo(cat);
  showInfo(cow);
}
// exPolymorphism();
