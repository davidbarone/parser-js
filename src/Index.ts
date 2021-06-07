import { MatchResult } from "./MatchResult";
import { Parser } from "./Parser";
import { RuleType } from "./RuleType";
import { Symbol } from "./Symbol";
import { ProductionRule } from "./ProductionRule";
import { LogArgs } from "./LogArgs";
import { LogType } from "./LogType";

class person {
    firstname: string = "";
    surname: string = "";
}

let p: person = {
    firstname: "sdfs",
    surname: "sfdssffsd"
} as person

let z: boolean = p instanceof person;

// Enter any development-only code to test here.
let grammar = 'SIMPLE="X";';
let rootProductionRule = "SIMPLE";
let parser: Parser = new Parser(grammar, rootProductionRule, (sender: any, args: LogArgs): void => { });
console.log(parser.ProductionRules);