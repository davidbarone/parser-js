import { BoxedObject } from "../src/BoxedObject";

test("Test BoxedObject", () => {
    let obj: BoxedObject<number> = new BoxedObject(123);

    /// value 123 is contained within object which can be passed around byref.
    expect(obj.Inner).toBe(123);
});

