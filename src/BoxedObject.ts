export class BoxedObject<Type> {
    private _inner: Type | null = null;

    constructor(value: Type | null = null) {
        this._inner = value;
    }

    set inner(value: Type | null) {
        this._inner = value;
    }

    get inner(): Type | null {
        return this._inner;
    }
}