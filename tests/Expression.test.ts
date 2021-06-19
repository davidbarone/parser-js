import { Stack } from "../src/Stack";
import { Visitor } from "../src/Visitor";
import { Node } from "../src/Node";
import { Token } from "../src/Token";
import { TestHarness } from "./TestHarness";

const expressionGrammar = () => `

NUMBER_LITERAL  = "\\d+";
PLUS_OP         = "\\+";
MINUS_OP        = "\\-";
MUL_OP          = "\\*";
DIV_OP          = "\\/";
LPAREN         = "\\(";
RPAREN         = "\\)";
expression      = minus_plus_expr | term;
minus_plus_expr = TERMS:term, TERMS:minus_plus_expr_*;
minus_plus_expr_
                = OP:MINUS_OP, term | OP:PLUS_OP, term;
term            = mul_div_term | factor;
mul_div_term    = FACTORS:factor, FACTORS:mul_div_term_*;
mul_div_term_   = OP:DIV_OP, factor | OP:MUL_OP, factor;
factor          = primary | PLUS_OP, primary | MINUS_OP, primary;
primary         = NUMBER_LITERAL | LPAREN!, expression, RPAREN!;`;

const expressionVisitor = () => {

    // Initial state
    let state: any = {};
    state.stack = new Stack<number>();
    var visitor = new Visitor(state);

    visitor.addVisitor(
        "minus_plus_expr",
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
        "mul_div_term",
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

    visitor.addVisitor(
        "mul_term",
        (v, n) => {
            let one: boolean = false;
            let sum: number = 0;
            let nodes: Node[] = n.properties["FACTORS"] as Node[];
            for (let node of nodes) {
                node.accept(v);
                if (!one) {
                    sum = v.state.stack.pop();
                    one = true;
                }
                else
                    sum = v.state.stack.pop() * sum;
            }
            v.state.stack.push(sum);
        }
    );

    visitor.addVisitor(
        "div_term",
        (v, n) => {
            let hasMinus: boolean = "MINUS_OP" in n.properties;
            let number: number = v.state.stack.pop();
            if (hasMinus)
                number = number * -1;
            v.state.stack.push(number);
        }
    );

    return visitor;
}

let resultMapper = (d: any) => (d.stack as Stack<number>).pop();

describe("Expression tests", () => {
    test.each(
        [
            ["EXPR_1", expressionGrammar(), "4", "expression", expressionVisitor(), resultMapper, 4],
            ["EXPR_2", expressionGrammar(), "-4", "expression", expressionVisitor(), resultMapper, -4],
            ["EXPR_3", expressionGrammar(), "9+9", "expression", expressionVisitor(), resultMapper, 18],
            ["EXPR_4", expressionGrammar(), "1+2+3+4", "expression", expressionVisitor(), resultMapper, 10],
            ["EXPR_5", expressionGrammar(), "2*3", "expression", expressionVisitor(), resultMapper, 6],
            ["EXPR_6", expressionGrammar(), "1+2*3", "expression", expressionVisitor(), resultMapper, 7],
            ["EXPR_7", expressionGrammar(), "(1+2)*3", "expression", expressionVisitor(), resultMapper, 9],
            ["EXPR_8", expressionGrammar(), "2*-3", "expression", expressionVisitor(), resultMapper, -6],
            ["EXPR_9", expressionGrammar(), "-2*-3", "expression", expressionVisitor(), resultMapper, 6],
            ["EXPR_10", expressionGrammar(), "3*4+5*6", "expression", expressionVisitor(), resultMapper, 42],
            ["EXPR_11", expressionGrammar(), "7-4", "expression", expressionVisitor(), resultMapper, 3],
            ["EXPR_12", expressionGrammar(), "10-3+2", "expression", expressionVisitor(), resultMapper, 9],
            ["EXPR_13", expressionGrammar(), "10-2*3+4*5", "expression", expressionVisitor(), resultMapper, 24],
            ["EXPR_14", expressionGrammar(), "10--2*3+4*5", "expression", expressionVisitor(), resultMapper, 36],
            ["EXPR_15", expressionGrammar(), "10+8/2-2*5", "expression", expressionVisitor(), resultMapper, 4],
            ["EXPR_16", expressionGrammar(), "((((1+7)/(3-1))/2)*(5+2)+(-7+15)-(-2*-4))", "expression", expressionVisitor(), resultMapper, 14],
            ["EXPR_17", expressionGrammar(), "6*2/3", "expression", expressionVisitor(), resultMapper, 4]
        ]
    )('%s', (name, grammar, input, rootProductionRule, visitor, resultMapping, expectedResult) => {
        var result = TestHarness.doTest(name, grammar, input, rootProductionRule, visitor, resultMapping);
        expect(result).toEqual(expectedResult);
    });
});