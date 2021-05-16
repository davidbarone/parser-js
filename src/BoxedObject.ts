export class BoxedObject<type> {
    private inner: type = null;

    constructor(value: type = null) {
        this.inner = value;
    }
    
    set Inner(value: type) {
        this.inner = value;
    }
    
    get Inner(): type {
        return this.inner;
    }
}