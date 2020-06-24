export class Car {
  public color: string = "";
  public model: string = "";
  public diesel?: boolean = false;
  private _keys: Array<string>;

  constructor() {
    this._keys = Object.keys(this);
  }

  toJSON() {
    return `Color1: ${this.color}\nModel2: ${this.model}\nDiesel3: ${this.diesel}`;
  }
}

export class StringValidator {
  constructor() {}
  isAcceptable(s: string): boolean {
    console.log("isAcceptable");
    return true;
  }
}

export { StringValidator as mainValidator };

export var Bar: { a: Bar } = { a: { count: 5 } };
export interface Bar {
  count: number;
}
