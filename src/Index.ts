import { MatchResult } from "./MatchResult";
import { Parser } from "./Parser";
import { RuleType } from "./RuleType";
import { Symbol } from "./Symbol";
import { ProductionRule } from "./ProductionRule";
import { LogArgs } from "./LogArgs";
import { LogType } from "./LogType";

// Production Rule test
let grammar = " ";
let rootProductionRule = "";
let parser: Parser = new Parser(grammar, rootProductionRule, (sender: any, args: LogArgs): void => { });

// Enter any development-only code to test here.

