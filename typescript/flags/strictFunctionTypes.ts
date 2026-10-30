// Bug class: a handler that needs a Dog is stored where any Animal may arrive.
// Without strictFunctionTypes, parameters are checked bivariantly and this compiles;
// calling it with a Cat throws "bark is not a function".
type Animal = { name: string };
type Dog = Animal & { bark(): string };
type Handler = (a: Animal) => void; // function-type syntax: checked contravariantly

export const onDog = (d: Dog) => console.log(d.bark());
export const handler: Handler = onDog;
