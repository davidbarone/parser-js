import { Stack } from "../src/Stack";
import { Visitor } from "../src/Visitor";
import { Node } from "../src/Node";
import { Token } from "../src/Token";
import { TestHarness } from "./TestHarness";

const SubruleGrammar = () => `
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

const SubruleVisitor = () => {

    // Initial state
    let state: any = {};
    state.Stack = new Stack<number>();
    var visitor = new Visitor(state);

    visitor.AddVisitor(
        "expression",
        (v, n) => {
            let sum: number = 0;
            let nodes: Node[] = n.Properties["TERMS"] as Node[];
            for (let node of nodes) {
                node.Accept(v);

                if (!("OP" in node.Properties)) {
                    sum = v.State.Stack.pop();
                } else {
                    let sign: string = (node.Properties["OP"] as Token).TokenValue;
                    if (sign === "+") {
                        sum = sum + v.State.Stack.pop();
                    }
                    else {
                        sum = sum - v.State.Stack.pop();
                    }
                }
            }
            v.State.Stack.push(sum);
        }
    );

    visitor.AddVisitor(
        "term",
        (v, n) => {
            let sum: number = 0;
            var nodes: Node[] = n.Properties["FACTORS"] as Node[];
            for (let node of nodes) {
                node.Accept(v);

                if (!("OP" in node.Properties)) {
                    sum = v.State.Stack.pop();
                }
                else {
                    var sign = (node.Properties["OP"] as Token).TokenValue;
                    if (sign == "*") {
                        sum = sum * v.State.Stack.pop();
                    }
                    else {
                        sum = sum / v.State.Stack.pop();
                    }
                }
            }
            v.State.Stack.push(sum);
        }
    );

    visitor.AddVisitor(
        "factor",
        (v, n) => {
            var node: Node = n.Properties["primary"] as Node;
            node.Accept(v);
            var hasMinus = "MINUS_OP" in n.Properties;
            let number: number = v.State.Stack.pop();
            if (hasMinus)
                number = number * -1;
            v.State.Stack.push(number);
        }
    );

    visitor.AddVisitor(
        "primary",
        (v, n) => {
            if ("NUMBER_LITERAL" in n.Properties) {
                var number = parseInt((n.Properties["NUMBER_LITERAL"] as Token).TokenValue);
                v.State.Stack.push(number);
            } else {
                let expr: Node = n.Properties["expression"] as Node;
                expr.Accept(v);
                let result: number = v.State.Stack.pop();
                v.State.Stack.push(result);
            }
        }
    );

    return visitor;
}

let resultMapper = (d: any) => (d.Stack as Stack<number>).pop();

describe("Expression tests", () => {
    test.each(
        [
            ["SUBRULE_1", SubruleGrammar(), "4", "expression", SubruleVisitor(), resultMapper, 4],
            ["SUBRULE_2", SubruleGrammar(), "-4", "expression", SubruleVisitor(), resultMapper, -4],
            ["SUBRULE_3", SubruleGrammar(), "9+9", "expression", SubruleVisitor(), resultMapper, 18],
            ["SUBRULE_4", SubruleGrammar(), "1+2+3+4", "expression", SubruleVisitor(), resultMapper, 10],
            ["SUBRULE_5", SubruleGrammar(), "2*3", "expression", SubruleVisitor(), resultMapper, 6],
            ["SUBRULE_6", SubruleGrammar(), "1+2*3", "expression", SubruleVisitor(), resultMapper, 7],
            ["SUBRULE_7", SubruleGrammar(), "(1+2)*3", "expression", SubruleVisitor(), resultMapper, 9],
            ["SUBRULE_8", SubruleGrammar(), "2*-3", "expression", SubruleVisitor(), resultMapper, -6],
            ["SUBRULE_9", SubruleGrammar(), "-2*-3", "expression", SubruleVisitor(), resultMapper, 6],
            ["SUBRULE_10", SubruleGrammar(), "3*4+5*6", "expression", SubruleVisitor(), resultMapper, 42],
            ["SUBRULE_11", SubruleGrammar(), "7-4", "expression", SubruleVisitor(), resultMapper, 3],
            ["SUBRULE_12", SubruleGrammar(), "10-3+2", "expression", SubruleVisitor(), resultMapper, 9],
            ["SUBRULE_13", SubruleGrammar(), "10-2*3+4*5", "expression", SubruleVisitor(), resultMapper, 24],
            ["SUBRULE_14", SubruleGrammar(), "10--2*3+4*5", "expression", SubruleVisitor(), resultMapper, 36],
            ["SUBRULE_15", SubruleGrammar(), "10+8/2-2*5", "expression", SubruleVisitor(), resultMapper, 4],
            ["SUBRULE_16", SubruleGrammar(), "((((1+7)/(3-1))/2)*(5+2)+(-7+15)-(-2*-4))", "expression", SubruleVisitor(), resultMapper, 14],
            ["SUBRULE_17", SubruleGrammar(), "6*2/3", "expression", SubruleVisitor(), resultMapper, 4]
        ]
    )('%s', (name, grammar, input, rootProductionRule, visitor, resultMapping, expectedResult) => {
        var result = TestHarness.doTest(name, grammar, input, rootProductionRule, visitor, resultMapping);
        expect(result).toEqual(expectedResult);
    });
});