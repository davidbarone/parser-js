import { TestHarness } from "./TestHarness"
import { Parser } from "../src/Parser"
import { ProductionRule } from "../src/ProductionRule"
import { Symbol } from "../src/Symbol"
import { RuleType } from "../src/RuleType"
import { MatchResult } from "../src/MatchResult"

function symbolMatch(pattern: string, input: string): MatchResult {
    let s: Symbol = new Symbol(pattern, RuleType.LexerRule);
    return s.match(input);
}

describe("Symbol match", () => {

    test.each([
        ["[:]", ": There is a colon at the start here.", true, ":", " There is a colon at the start here."],
        ['"(?:[^"]|\\.)*"', '"This is some quoted text"; Rest of file;', true, '"This is some quoted text"', '; Rest of file;'],
        ["[(]", "This input has no left bracket", false, null, null],
        ["[(]", "This input has a left ( bracket but not at start", false, null, null],
        ["[(]", " ( This input has a left bracket at the start, prepended by whitespace", true, "(", " This input has a left bracket at the start, prepended by whitespace"],
        ["[(]", "( This input has a left bracket at the start", true, "(", " This input has a left bracket at the start"],
        ["[(]", `
( This input has left bracket at the start, but is on second line.
The input is multiple lines.`, true, "(", ` This input has left bracket at the start, but is on second line.
The input is multiple lines.`],
        ["[(]", `
a( This input has left bracket NOT at the start, and is on second line.
The input is multiple lines.`, false, null, null]

    ])("Pattern: %s, input: %s, match: %s", (pattern: string, input: string, expectedSuccess: boolean, expectedMatched: string | null, expectedRemainder: string | null) => {
        var result = symbolMatch(pattern, input);
        expect(result.success).toBe(expectedSuccess);
        if (expectedSuccess) {
            expect(result.matched).toEqual(expectedMatched);
            expect(result.remainder).toEqual(expectedRemainder);
        }
    });

});