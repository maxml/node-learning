// Bug class: a subclass method silently shadows a base method; if the base
// method is renamed later, the subclass keeps a dead method and nobody notices.
class BaseRepo {
  save(): void {}
}
export class UserRepo extends BaseRepo {
  save(): void {
    console.log("audited save");
  }
}
