export class Car {
  // TODO: json-typescript-mapper
  public colour: string = "";
  public model: string = "";
  public diesel?: boolean = false;
  private _keys: Array<string>;
  // Note that this is not initialized

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
