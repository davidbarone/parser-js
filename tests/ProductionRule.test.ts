import { TestHarness } from "./TestHarness"
import { Parser } from "../src/Parser"
import { ProductionRule } from "../src/ProductionRule"

function escapeSlash(input: string): string {
    return input.replace('\\', '\\\\');
}

describe("Invalid production rule tests", () => {

    test.each([
        ["empty string", ""],
        ["space", " "],
        ["comment only", "/* This is a comment */"]
    ])('%s', (a, b) => {
        let fn = () => { TestHarness.doTest(a, b) };
        expect(fn).toThrow("Invalid grammar. No production rules found");
    });

});

describe("Valid production rule tests", () => {

    test.each([
        ["Single rule", "SIMPLE=\"X\";", 1],
        ["Two rules", "SIMPLE=\"X\";ANOTHER=\"Y\";", 2],
        ["Multiline", `

        /* This is a test */

        SIMPLE="X";
        ANOTHER="Y";`, 2],
        ["Single rule with comment", "SIMPLE=\"X\"; /* This is a comment */", 1],
        ["Lexer and parser rule #1", `
        SIMPLE=\"X\";
        ANOTHER=\"Y\";
        rule=SIMPLE;`, 3],
        ["Lexer and parser rule #2", `
        SIMPLE=\"X\";
        ANOTHER=\"Y\";
        rule=SIMPLE,ANOTHER;`, 3],
        ["Lexer and parser with alias and modifier", `
        SIMPLE=\"X\";
        ANOTHER=\"Y\";
        rule=TEST:SIMPLE*;`, 3],
        ["Lexer and parser with alternates. Note that alternates get compiled as separate production rules.", `
        SIMPLE=\"X\";
        ANOTHER=\"Y\";
        rule=ANOTHER | SIMPLE;`, 4]
    ])('%s', (description, grammar, expectedProductionRuleCount) => {
        let rules = TestHarness.buildGrammar(description, grammar);
        expect(rules).toBe(expectedProductionRuleCount);
    });

});