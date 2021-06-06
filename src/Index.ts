import { MatchResult } from "./MatchResult";
import { Parser } from "./Parser";
import { RuleType } from "./RuleType";
import { Symbol } from "./Symbol";
import { ProductionRule } from "./ProductionRule";

let p: Parser = new Parser("myrule: TEST;", "myrule");
let rules: ProductionRule[] = p.ProductionRules;

