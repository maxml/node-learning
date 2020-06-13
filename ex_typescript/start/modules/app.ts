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

import { Car } from "./entity";

const car: Car = new Car();
car.colour = "sdf";
car.diesel = false;
car.model = "adasdsa";

console.log("Hello new car: " + JSON.stringify(car));

export * from "./entity";
export * from "./index";

export class Dog {}
export class Cat {}
export class Tree {}
export class Flower {}
