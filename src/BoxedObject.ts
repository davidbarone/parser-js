export class BoxedObject<Type> {
    private inner: Type | null = null;

    constructor(value: Type | null = null) {
        this.inner = value;
    }

    set Inner(value: Type | null) {
        this.inner = value;
    }

    get Inner(): Type | null {
        return this.inner;
    }
}