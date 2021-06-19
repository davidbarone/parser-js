import { Visitor } from "../src/Visitor"
import { Parser } from "../src/Parser"
import { ProductionRule } from "../src/ProductionRule";
import { Node } from "../src/Node";
import { LogArgs } from "../src/LogArgs";

export class TestHarness {

    static buildGrammar(
        name: string,
        grammar: string,
        rootProductionRule: string = ""
    ): number {
        let parser: Parser = new Parser(grammar, rootProductionRule, (sender: any, args: LogArgs): void => { });
        let rules: ProductionRule[] = parser.productionRules;
        return rules.length;
    }

    static doTest(
        name: string,
        grammar: string,
        input: string = "",
        rootProductionRule: string = "",
        visitor: Visitor = new Visitor(null),
        resultMapping: ((result: any) => any) = (r) => r
    ): object | null {
        let parser: Parser = new Parser(grammar, rootProductionRule, (sender: any, args: LogArgs): void => { });
        let rules: ProductionRule[] = parser.productionRules;

        if (input) {
            let ast: Node | null = parser.parse(input, true);
            if (visitor !== null) {
                let actual = parser.execute(ast, visitor, resultMapping);
                return actual;
            }
        }
        return null;
    }
}