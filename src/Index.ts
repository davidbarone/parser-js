import { MatchResult } from "./MatchResult";
import { Parser } from "./Parser";
import { RuleType } from "./RuleType";
import { Symbol } from "./Symbol";

function symbolMatchTest(pattern: string, input: string): MatchResult {
    let s: Symbol = new Symbol(pattern, RuleType.LexerRule);
    return s.Match(input);
}


// Regex tests
let pattern = '"(?:[^"]|\\.)*"';
let input = '"This is some quoted text"; Rest of file;'
console.log(symbolMatchTest(pattern, input));

