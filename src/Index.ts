import { MatchResult } from "./MatchResult";
import { Parser } from "./Parser";
import { RuleType } from "./RuleType";
import { Symbol } from "./Symbol";
import { ProductionRule } from "./ProductionRule";
import { LogArgs } from "./LogArgs";
import { LogType } from "./LogType";


// Symbol tests
function symbolMatch(pattern: string, input: string): MatchResult {
    let s: Symbol = new Symbol(pattern, RuleType.LexerRule);
    return s.Match(input);
}

var result = symbolMatch("[:]", ": There is a comma at the start");
console.log(result);



let logHandler = (sender: any, args: LogArgs): void => {
    console.log(
        `${" ".repeat(args.NestingLevel)} ${LogType[args.LogType]} ${args.Message}`
    );
}

let p: Parser = new Parser("myrule = TEST;", "myrule", logHandler);
let rules: ProductionRule[] = p.ProductionRules;
console.log(rules.length);

