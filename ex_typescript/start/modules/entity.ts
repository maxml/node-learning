export class Car {
  public colour: string = "";
  public model: string = "";
  public diesel?: boolean = false;
  private _keys: Array<string>;

  constructor() {
    this._keys = Object.keys(this);
  }

  toJSON() {
    // return this.setAttribute()
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
