import { Visitor } from "../src/Visitor";
import { TestHarness } from "./TestHarness";
import { Token } from "../src/Token";

const fooBarBazGrammar = () => {
    return `
    FOO     = "FOO";
    BAR     = "BAR";
    BAZ     = "BAZ";
    fb      = :FOO,:BAR*;
    fbb     = ITEMS:fb,ITEMS:BAZ*;`
}

const fooBarBazVisitor = () => {

    let state: any = {};
    let tokens: Token[] = [];
    state["items"] = tokens;

    let visitor: Visitor = new Visitor(state);

    visitor.addVisitor(
        "fbb",
        (v, n) => {
            v.state.items = n.properties["ITEMS"];
        }
    );

    return visitor;
}

describe("Invalid production rule tests", () => {
    test.each([
        ["FOOBARBAZ1", fooBarBazGrammar(), "FOO", "fbb", fooBarBazVisitor(), (state: any) => state.items.length, 1],
        ["FOOBARBAZ2", fooBarBazGrammar(), "FOOBAR", "fbb", fooBarBazVisitor(), (state: any) => state.items.length, 2],
        ["FOOBARBAZ3", fooBarBazGrammar(), "FOOBARBAZ", "fbb", fooBarBazVisitor(), (state: any) => state.items.length, 3],
        ["FOOBARBAZ4", fooBarBazGrammar(), "FOOBARBAZBAZ", "fbb", fooBarBazVisitor(), (state: any) => state.items.length, 4],
        ["FOOBARBAZ5", fooBarBazGrammar(), "FOOBARBAZBAZBAZ", "fbb", fooBarBazVisitor(), (state: any) => state.items.length, 5],
        ["FOOBARBAZ6", fooBarBazGrammar(), "FOOBARBAR", "fbb", fooBarBazVisitor(), (state: any) => state.items.length, 3],
        ["FOOBARBAZ7", fooBarBazGrammar(), "FOOBARBARBAZ", "fbb", fooBarBazVisitor(), (state: any) => state.items.length, 4],
        ["FOOBARBAZ8", fooBarBazGrammar(), "FOOBARBARBARBAZ", "fbb", fooBarBazVisitor(), (state: any) => state.items.length, 5],
        ["FOOBARBAZ9", fooBarBazGrammar(), "FOOBARBAZ", "fbb", fooBarBazVisitor(), (state: any) => state.items.length, 3]
    ])('%s', (name, grammar, input, rootProductionRule, visitor, stateMapping, expectedResult) => {
        var result = TestHarness.doTest(name, grammar, input, rootProductionRule, visitor, stateMapping);
        expect(result).toEqual(expectedResult);
    });
});