export class List<T> {
    private values: T[] = [];

    private constructor(values: T[]) {
        this.values = values;
    }

    public get count(): number {
        return this.values.length;
    }

    public add(value: T): void {
        this.values.push(value);
    }

    public where(predicate: (value: T) => boolean): List<T> {
        return List.from<T>(this.values.filter(predicate));
    }

    public select<U>(selector: (value: T) => U): List<U> {
        return List.from<U>(this.values.map(selector));
    }

    public toArray(): T[] {
        return this.values;
    }

    public static from<U>(values: U[]): List<U> {
        // Perhaps we perform some logic here.
        // ...

        return new List<U>(values);
    }

    public static create<U>(values?: U[]): List<U> {
        return new List<U>(values ?? []);
    }

    // Other collection functions.
    // ..
}