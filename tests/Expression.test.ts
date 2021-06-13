import { Stack } from "../src/Stack";
import { Visitor } from "../src/Visitor";
import { Node } from "../src/Node";
import { Token } from "../src/Token";
import { TestHarness } from "./TestHarness";

const ExpressionGrammar = () => `

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


const ExpressionVisitor = () => {

    // Initial state
    let state: any = {};
    state.Stack = new Stack<number>();

    var visitor = new Visitor(state);

    visitor.AddVisitor(
        "minus_plus_expr",
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
        "mul_div_term",
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

    visitor.AddVisitor(
        "mul_term",
        (v, n) => {
            let one: boolean = false;
            let sum: number = 0;
            let nodes: Node[] = n.Properties["FACTORS"] as Node[];
            for (let node of nodes) {
                node.Accept(v);
                if (!one) {
                    sum = v.State.Stack.pop();
                    one = true;
                }
                else
                    sum = v.State.Stack.pop() * sum;
            }
            v.State.Stack.push(sum);
        }
    );

    visitor.AddVisitor(
        "div_term",
        (v, n) => {
            let hasMinus: boolean = "MINUS_OP" in n.Properties;
            let number: number = v.State.Stack.pop();
            if (hasMinus)
                number = number * -1;
            v.State.Stack.push(number);
        }
    );

    return visitor;
}

let resultMapper = (d: any) => (d.Stack as Stack<number>).pop();

describe("Expression tests", () => {
    test.each(
        [
            ["EXPR_1", ExpressionGrammar(), "4", "expression", ExpressionVisitor(), resultMapper, 4],
            ["EXPR_2", ExpressionGrammar(), "-4", "expression", ExpressionVisitor(), resultMapper, -4],
            ["EXPR_3", ExpressionGrammar(), "9+9", "expression", ExpressionVisitor(), resultMapper, 18],
            ["EXPR_4", ExpressionGrammar(), "1+2+3+4", "expression", ExpressionVisitor(), resultMapper, 10],
            ["EXPR_5", ExpressionGrammar(), "2*3", "expression", ExpressionVisitor(), resultMapper, 6],
            ["EXPR_6", ExpressionGrammar(), "1+2*3", "expression", ExpressionVisitor(), resultMapper, 7],
            ["EXPR_7", ExpressionGrammar(), "(1+2)*3", "expression", ExpressionVisitor(), resultMapper, 9],
            ["EXPR_8", ExpressionGrammar(), "2*-3", "expression", ExpressionVisitor(), resultMapper, -6],
            ["EXPR_9", ExpressionGrammar(), "-2*-3", "expression", ExpressionVisitor(), resultMapper, 6],
            ["EXPR_10", ExpressionGrammar(), "3*4+5*6", "expression", ExpressionVisitor(), resultMapper, 42],
            ["EXPR_11", ExpressionGrammar(), "7-4", "expression", ExpressionVisitor(), resultMapper, 3],
            ["EXPR_12", ExpressionGrammar(), "10-3+2", "expression", ExpressionVisitor(), resultMapper, 9],
            ["EXPR_13", ExpressionGrammar(), "10-2*3+4*5", "expression", ExpressionVisitor(), resultMapper, 24],
            ["EXPR_14", ExpressionGrammar(), "10--2*3+4*5", "expression", ExpressionVisitor(), resultMapper, 36],
            ["EXPR_15", ExpressionGrammar(), "10+8/2-2*5", "expression", ExpressionVisitor(), resultMapper, 4],
            ["EXPR_16", ExpressionGrammar(), "((((1+7)/(3-1))/2)*(5+2)+(-7+15)-(-2*-4))", "expression", ExpressionVisitor(), resultMapper, 14],
            ["EXPR_17", ExpressionGrammar(), "6*2/3", "expression", ExpressionVisitor(), resultMapper, 4]
        ]
    )('%s', (name, grammar, input, rootProductionRule, visitor, resultMapping, expectedResult) => {
        var result = TestHarness.doTest(name, grammar, input, rootProductionRule, visitor, resultMapping);
        expect(result).toEqual(expectedResult);
    });
});


