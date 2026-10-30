// Decorators (NestJS/TypeORM style) are not stripped by Node's type stripping:
// the file fails to parse. Such code still needs tsc/swc/esbuild/tsx.
function Injectable(): ClassDecorator {
  return () => {};
}
@Injectable()
export class Svc {}
console.log("loaded");
