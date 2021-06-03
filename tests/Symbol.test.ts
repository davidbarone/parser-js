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
        ['"(?:[^"]|\\.)*"', '"This is some quoted text"; Rest of file;', true, '"This is some quoted text"', '; Rest of file;']
    ])("Pattern: %s, input: %s, match: %s", (pattern: string, input: string, expectedMatch: boolean, expectedMatched: string, expectedRemainder: string) => {
        var result = symbolMatch(pattern, input);
        expect(result.Success).toBe(expectedMatch);
        expect(result.Matched).toBe(expectedMatched);
        expect(result.Remainder).toBe(expectedRemainder);
    });

});