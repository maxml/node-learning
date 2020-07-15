interface Subject {
  request(): void;
}

class RealSubject implements Subject {
  public request(): void {
    console.log("RealSubject: Handling request.");
  }
}

class ExProxy {
  private subject: Subject;

  constructor(subject: Subject) {
    this.subject = subject;
  }

  public request(): void {
    if (this.checkAccess()) {
      this.subject.request();
      this.logAccess();
    }
  }

  private checkAccess(): boolean {
    console.log("Proxy: Checking access prior to firing a real request.");

    return true;
  }

  private logAccess(): void {
    console.log("Proxy: Logging the time of request.");
  }
}

console.log("Client: Executing the client code with a real subject:");
const realSubject: Subject = new RealSubject();
realSubject.request();

console.log("");

console.log("Client: Executing the same client code with a proxy:");
const proxy = new ExProxy(realSubject);
proxy.request();
