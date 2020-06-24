export default {
  hi,
  hey,
};

function hi() {
  console.log("hi");
}
function hey() {
  console.log("hey");
}

// console.log("sdfds");

import { Car } from "./entity";

function exUsingCar() {
  const car: Car = new Car();
  car.color = "sdf";
  car.diesel = false;
  car.model = "adasdsa";

  console.log("Hello new car: " + JSON.stringify(car));
}
// exUsingCar();

// export * from "./entity";
// export * from "./index";

export class Dog {}
export class Cat {}
export class Tree {}
export class Flower {}
