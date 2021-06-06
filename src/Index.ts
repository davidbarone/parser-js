import { MatchResult } from "./MatchResult";
import { Parser } from "./Parser";
import { RuleType } from "./RuleType";
import { Symbol } from "./Symbol";
import { ProductionRule } from "./ProductionRule";
import { LogArgs } from "./LogArgs";

let logHandler = (sender: any, args: LogArgs): void => {
    console.log(
        `${" ".repeat(args.NestingLevel)} ${args.LogType} ${args.Message}`
    );
}

let p: Parser = new Parser("myrule: TEST;", "myrule", logHandler);
let rules: ProductionRule[] = p.ProductionRules;

