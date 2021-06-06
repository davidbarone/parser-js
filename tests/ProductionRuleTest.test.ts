import { TestHarness } from "./TestHarness"
import { Parser } from "../src/Parser"
import { ProductionRule } from "../src/ProductionRule"

function escapeSlash(input: string): string {
    return input.replace('\\', '\\\\');
}
describe("Production rule tests", () => {

    test("x", () => {

        let p: Parser = new Parser("myrule: TEST;", "myrule", (sender, args) => { });
        let rules: ProductionRule[] = p.ProductionRules;


    });

    test.each([
        ["empty string", ""],
        ["space", " "],
        ["comment only", "/* This is a comment */"]
    ])('%i', (a, b) => {
        TestHarness.doTest(a, b);
    });
});

describe("Valid production rule tests", () => {

    test.each([
        ["Single rule", "SIMPLE=\"X\";"],
        ["Two rules", "SIMPLE=\"X\";ANOTHER=\"Y\";"],
        ["Multiline", `

        /* This is a test */

        SIMPLE  =   ""X"";
        ANOTHER=""Y"";`],
        ["Single rule with comment", "SIMPLE=\"X\"; /* This is a comment */"],
        ["Lexer and parser rule #1", `
        SIMPLE=\"X\";
        ANOTHER=\"Y\";
        rule=SIMPLE;`],
        ["Lexer and parser rule #2", `
        SIMPLE=\"X\";
        ANOTHER=\"Y\";
        rule=SIMPLE,ANOTHER;`],
        ["Lexer and parser with alias and modifier", `
        SIMPLE=\"X\";
        ANOTHER=\"Y\";
        rule=TEST:SIMPLE*;`],
        ["Lexer and parser with alternates", `
        SIMPLE=\"X\";
        ANOTHER=\"Y\";
        rule=ANOTHER | SIMPLE;`]
    ])('%i', (a, b) => {
        TestHarness.doTest(a, b);
    });
});