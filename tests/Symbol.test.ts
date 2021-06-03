import { TestHarness } from "./TestHarness"
import { Parser } from "../src/Parser"
import { ProductionRule } from "../src/ProductionRule"
import { Symbol } from "../src/Symbol"
import { RuleType } from "../src/RuleType"
import { MatchResult } from "../src/MatchResult"

function symbolMatch(pattern: string, input: string): MatchResult {
    let s: Symbol = new Symbol(pattern, RuleType.LexerRule);
    return s.Match(input);
}

describe("Symbol match", () => {

    test.each([
        ['"(?:[^"]|\\.)*"', '"This is some quoted text"; Rest of file;', true, '"This is some quoted text"', '; Rest of file;'],
        ["[(]", "This input has no left bracket", false, null, null],
        ["[(]", "This input has a left ( bracket but not at start", false, null, null],
        ["[(]", " ( This input has a left bracket not quite at the start", false, null, null],
        ["[(]", "( This input has a left bracket at the start", true, "(", " This input has a left bracket at the start"]
    ])("Pattern: %s, input: %s, match: %s", (pattern: string, input: string, expectedSuccess: boolean, expectedMatched: string | null, expectedRemainder: string | null) => {
        var result = symbolMatch(pattern, input);
        expect(result.Success).toBe(expectedSuccess);
        if (expectedSuccess) {
            expect(result.Matched).toBe(expectedMatched);
            expect(result.Remainder).toBe(expectedRemainder);
        }
    });

});