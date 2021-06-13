import { Visitor } from "./Visitor";
import { Token } from "./Token";
import { Parser } from "./Parser";
import { ProductionRule } from "./ProductionRule";
import { LogArgs } from "./LogArgs";
import { Node } from "./Node";

function buildGrammar(
    name: string,
    grammar: string,
    rootProductionRule: string = ""
): number {
    let parser: Parser = new Parser(grammar, rootProductionRule, (sender: any, args: LogArgs): void => { });
    let rules: ProductionRule[] = parser.ProductionRules;
    return rules.length;
}

function doTest(
    name: string,
    grammar: string,
    input: string = "",
    rootProductionRule: string = "",
    visitor: Visitor = new Visitor(null),
    resultMapping: ((result: any) => any) = (r) => r
): object | null {
    let parser: Parser = new Parser(grammar, rootProductionRule, (sender: any, args: LogArgs): void => { });
    let rules: ProductionRule[] = parser.ProductionRules;

    if (input) {
        let ast: Node | null = parser.Parse(input, true);
        if (ast !== null) {
            console.log(ast.prettyPrint());
        }

        if (visitor !== null) {
            let actual = parser.Execute(ast, visitor, resultMapping);
            return actual;
        }
    }
    return null;
}

const grammar = () => `
 NUMBER_LITERAL  = "\\d+";
 PLUS_OP         = "\\+";
 MINUS_OP        = "\\-";
 MUL_OP          = "\\*";
 DIV_OP          = "\\/";
 LPAREN         = "\\(";
 RPAREN         = "\\)";
 
 expression      = TERMS:(:term, :(OP:MINUS_OP, term | OP:PLUS_OP, term)*);
 term            = FACTORS:(:factor, :(OP:DIV_OP, factor | OP:MUL_OP, factor)*);
 factor          = primary | PLUS_OP, primary | MINUS_OP, primary;
 primary         = NUMBER_LITERAL | LPAREN!, expression, RPAREN!;`;


let parser: Parser = new Parser(grammar(), "expression", () => { });
let rules: ProductionRule[] = parser.ProductionRules;
console.log(rules);
let ast: Node | null = parser.Parse("9+5", true);
if (ast !== null) {
    let str: string = ast.prettyPrint();
    console.log(str);
}

