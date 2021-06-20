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
        stateMapping: ((state: any) => any) = (r) => r
    ): object | null {
        let parser: Parser = new Parser(grammar, rootProductionRule, (sender: any, args: LogArgs): void => { });
        let rules: ProductionRule[] = parser.productionRules;

        if (input) {
            let ast: Node = parser.parse(input);
            if (visitor !== null) {
                ast.walk(visitor);
                let actual = stateMapping(visitor.state);
                return actual;
            }
        }
        return null;
    }
}