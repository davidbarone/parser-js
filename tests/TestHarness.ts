import { Visitor } from "../src/Visitor"
import { Parser } from "../src/Parser"
import { ProductionRule } from "../src/ProductionRule";
import { Node } from "../src/Node";
import { LogArgs } from "../src/LogArgs";

export class TestHarness {

    static doTest(
        name: string,
        grammar: string,
        input: string = "",
        rootProductionRule: string = "",
        visitor: Visitor = new Visitor(null),
        resultMapping: ((result: any) => any) = (r) => r
    ): object | null {
        debugger;
        let parser: Parser = new Parser(grammar, rootProductionRule, (sender: any, args: LogArgs): void => { });
        let rules: ProductionRule[] = parser.ProductionRules;

        if (rules) {
            console.log(`Production rules: ${rules.length}, input: ${input}.`);
        } else {
            console.log('whoops');
        }

        if (input) {
            let ast: Node | null = parser.Parse(input, true);
            if (visitor !== null) {
                let actual = parser.Execute(ast, visitor, resultMapping);
                return actual;
            }
        }
        return null;
    }
}