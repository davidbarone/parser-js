import { Visitor } from "../src/Visitor";
import { TestHarness } from "./TestHarness";
import { Token } from "../src/Token";

const FooBarBazGrammar = () => {
    return `
    FOO     = "FOO";
    BAR     = "BAR";
    BAZ     = "BAZ";
    fb      = :FOO,:BAR*;
    fbb     = ITEMS:fb,ITEMS:BAZ*;`
}

const FooBarBazVisitor = () => {

    let state: any = {};
    let tokens: Token[] = [];
    state["items"] = tokens;

    let visitor: Visitor = new Visitor(state);

    visitor.AddVisitor(
        "fbb",
        (v, n) => {
            v.State.items = n.Properties["ITEMS"];
        }
    );

    return visitor;
}

describe("Invalid production rule tests", () => {
    test.each([
        ["FOOBARBAZ1", FooBarBazGrammar(), "FOO", "fbb", FooBarBazVisitor(), (d: any) => d.items.length, 1],
        ["FOOBARBAZ2", FooBarBazGrammar(), "FOOBAR", "fbb", FooBarBazVisitor(), (d: any) => d.items.length, 2],
        ["FOOBARBAZ3", FooBarBazGrammar(), "FOOBARBAZ", "fbb", FooBarBazVisitor(), (d) => d.items.length, 3],
        ["FOOBARBAZ4", FooBarBazGrammar(), "FOOBARBAZBAZ", "fbb", FooBarBazVisitor(), (d) => d.items.length, 4],
        ["FOOBARBAZ5", FooBarBazGrammar(), "FOOBARBAZBAZBAZ", "fbb", FooBarBazVisitor(), (d) => d.items.length, 5],
        ["FOOBARBAZ6", FooBarBazGrammar(), "FOOBARBAR", "fbb", FooBarBazVisitor(), (d) => d.items.length, 3],
        ["FOOBARBAZ7", FooBarBazGrammar(), "FOOBARBARBAZ", "fbb", FooBarBazVisitor(), (d) => d.items.length, 4],
        ["FOOBARBAZ8", FooBarBazGrammar(), "FOOBARBARBARBAZ", "fbb", FooBarBazVisitor(), (d) => d.items.length, 5],
        ["FOOBARBAZ9", FooBarBazGrammar(), "FOOBARBAZ", "fbb", FooBarBazVisitor(), (d) => d.items.length, 3]
    ])('%s', (name, grammar, input, rootProductionRule, visitor, resultMapping, expectedResult) => {
        var result = TestHarness.doTest(name, grammar, input, rootProductionRule, visitor, resultMapping);
        expect(result).toEqual(expectedResult);
    });
});