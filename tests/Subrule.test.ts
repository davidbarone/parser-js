import { Stack } from "../src/Stack";
import { Visitor } from "../src/Visitor";
import { Node } from "../src/Node";
import { Token } from "../src/Token";
import { TestHarness } from "./TestHarness";

const subruleGrammar = () => `
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
 primary         = NUMBER_LITERAL | LPAREN!, expression, RPAREN!;`

const subruleVisitor = () => {

    // Initial state
    let state: any = {};
    state.stack = new Stack<number>();
    var visitor = new Visitor(state);

    visitor.addVisitor(
        "expression",
        (v, n) => {
            let sum: number = 0;
            let nodes: Node[] = n.properties["TERMS"] as Node[];
            for (let node of nodes) {
                node.accept(v);

                if (!("OP" in node.properties)) {
                    sum = v.state.stack.pop();
                } else {
                    let sign: string = (node.properties["OP"] as Token).tokenValue;
                    if (sign === "+") {
                        sum = sum + v.state.stack.pop();
                    }
                    else {
                        sum = sum - v.state.stack.pop();
                    }
                }
            }
            v.state.stack.push(sum);
        }
    );

    visitor.addVisitor(
        "term",
        (v, n) => {
            let sum: number = 0;
            var nodes: Node[] = n.properties["FACTORS"] as Node[];
            for (let node of nodes) {
                node.accept(v);

                if (!("OP" in node.properties)) {
                    sum = v.state.stack.pop();
                }
                else {
                    var sign = (node.properties["OP"] as Token).tokenValue;
                    if (sign == "*") {
                        sum = sum * v.state.stack.pop();
                    }
                    else {
                        sum = sum / v.state.stack.pop();
                    }
                }
            }
            v.state.stack.push(sum);
        }
    );

    visitor.addVisitor(
        "factor",
        (v, n) => {
            var node: Node = n.properties["primary"] as Node;
            node.accept(v);
            var hasMinus = "MINUS_OP" in n.properties;
            let number: number = v.state.stack.pop();
            if (hasMinus)
                number = number * -1;
            v.state.stack.push(number);
        }
    );

    visitor.addVisitor(
        "primary",
        (v, n) => {
            if ("NUMBER_LITERAL" in n.properties) {
                var number = parseInt((n.properties["NUMBER_LITERAL"] as Token).tokenValue);
                v.state.stack.push(number);
            } else {
                let expr: Node = n.properties["expression"] as Node;
                expr.accept(v);
                let result: number = v.state.stack.pop();
                v.state.stack.push(result);
            }
        }
    );

    return visitor;
}

let resultMapper = (d: any) => (d.stack as Stack<number>).pop();

describe("Expression tests", () => {
    test.each(
        [
            ["SUBRULE_1", subruleGrammar(), "4", "expression", subruleVisitor(), resultMapper, 4],
            ["SUBRULE_2", subruleGrammar(), "-4", "expression", subruleVisitor(), resultMapper, -4],
            ["SUBRULE_3", subruleGrammar(), "9+9", "expression", subruleVisitor(), resultMapper, 18],
            ["SUBRULE_4", subruleGrammar(), "1+2+3+4", "expression", subruleVisitor(), resultMapper, 10],
            ["SUBRULE_5", subruleGrammar(), "2*3", "expression", subruleVisitor(), resultMapper, 6],
            ["SUBRULE_6", subruleGrammar(), "1+2*3", "expression", subruleVisitor(), resultMapper, 7],
            ["SUBRULE_7", subruleGrammar(), "(1+2)*3", "expression", subruleVisitor(), resultMapper, 9],
            ["SUBRULE_8", subruleGrammar(), "2*-3", "expression", subruleVisitor(), resultMapper, -6],
            ["SUBRULE_9", subruleGrammar(), "-2*-3", "expression", subruleVisitor(), resultMapper, 6],
            ["SUBRULE_10", subruleGrammar(), "3*4+5*6", "expression", subruleVisitor(), resultMapper, 42],
            ["SUBRULE_11", subruleGrammar(), "7-4", "expression", subruleVisitor(), resultMapper, 3],
            ["SUBRULE_12", subruleGrammar(), "10-3+2", "expression", subruleVisitor(), resultMapper, 9],
            ["SUBRULE_13", subruleGrammar(), "10-2*3+4*5", "expression", subruleVisitor(), resultMapper, 24],
            ["SUBRULE_14", subruleGrammar(), "10--2*3+4*5", "expression", subruleVisitor(), resultMapper, 36],
            ["SUBRULE_15", subruleGrammar(), "10+8/2-2*5", "expression", subruleVisitor(), resultMapper, 4],
            ["SUBRULE_16", subruleGrammar(), "((((1+7)/(3-1))/2)*(5+2)+(-7+15)-(-2*-4))", "expression", subruleVisitor(), resultMapper, 14],
            ["SUBRULE_17", subruleGrammar(), "6*2/3", "expression", subruleVisitor(), resultMapper, 4]
        ]
    )('%s', (name, grammar, input, rootProductionRule, visitor, resultMapping, expectedResult) => {
        var result = TestHarness.doTest(name, grammar, input, rootProductionRule, visitor, resultMapping);
        expect(result).toEqual(expectedResult);
    });

});