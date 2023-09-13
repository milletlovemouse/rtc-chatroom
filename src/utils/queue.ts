export default class Queue<T> {
  private queue: T[];

  constructor() {
    this.queue = [];
  }

  push(x: T): void {
    this.queue.push(x);
  }

  pop(): T {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    }
    return this.queue.shift()!;
  }

  peek(): T {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    }
    return this.queue[0];
  }

  empty(): boolean {
    return this.isEmpty();
  }

  private isEmpty(): boolean {
    return this.queue.length === 0;
  }
}