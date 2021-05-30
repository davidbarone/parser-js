import { TestHarness } from "./TestHarness"

describe("Production rule tests", () => {

    test("x", () => {
        debugger;
        console.log('sdffdssdsfdsfsafssafsfdsfsafd');
        let z = "test";
        let re: RegExp = new RegExp(`[\s]*(?<match>(${z}))(?<remainder>([\s\S]*))[\s]*`);
        let a = re.test("THE CAT SAT ON THE HAT.");
        expect(1).toBe(1);
    });

    test.each([
        ["empty string", ""],
        ["space", " "],
        ["comment only", "/* This is a comment */"]
    ])('%i', (a, b) => {
        TestHarness.doTest(a, b);
    });

});