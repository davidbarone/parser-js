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


const FooBarBazGrammar = () => {
    return `
    FOO     = "FOO";
    BAR     = "BAR";
    BAZ     = "BAZ";
    fb      = :FOO,:BAR*;
    fbb     = ITEMS:fb,ITEMS:BAZ*;`
}

const FooBarBazVisitor = () => {

    let state: any = {};
    let tokens: Token[] = [];
    state.items = tokens;

    let visitor: Visitor = new Visitor(state);

    visitor.AddVisitor(
        "fbb",
        (v, n) => {
            v.State.items = n.Properties["ITEMS"];
        }
    );

    return visitor;
}


var result = doTest("FOOBARBAZ1", FooBarBazGrammar(), "FOOBAR", "fbb", FooBarBazVisitor(), (d: any) => d.items.length);
console.log(result);