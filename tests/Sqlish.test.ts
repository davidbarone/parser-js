import { TestHarness } from "./TestHarness";
import { Stack } from "../src/Stack";
import { Visitor } from "../src/Visitor";
import { Token } from "../src/Token";
import { Node } from "../src/Node";

let data = [
    { name: 'john', age: 40, country: 'Australia', sex: 'M', rating: "A" },
    { name: 'peter', age: 23, country: 'UK', sex: 'M', rating: "C" },
    { name: 'fred', age: 42, country: 'USA', sex: 'M', rating: "A" },
    { name: 'ian', age: 71, country: 'France', sex: 'M', rating: "B" },
    { name: 'tony', age: 18, country: 'Canada', sex: 'M', rating: "B" },
    { name: 'mark', age: 35, country: 'Germany', sex: 'M', rating: "C" },
    { name: 'david', age: 37, country: 'Italy', sex: 'M', rating: "C" },
    { name: 'jane', age: 52, country: 'USA', sex: 'F', rating: "" },
    { name: 'sarah', age: 55, country: 'UK', sex: 'F', rating: "A" },
    { name: 'sue', age: 61, country: 'Italy', sex: 'F', rating: "C" },
    { name: 'alice', age: 76, country: 'France', sex: 'F', rating: "B" },
    { name: 'karen', age: 39, country: 'Australia', sex: 'F', rating: "C" },
    { name: 'kate', age: 26, country: 'Germany', sex: 'F', rating: "A" },
    { name: 'lucy', age: 46, country: 'Australia', sex: 'F', rating: "A" },
    { name: 'brian', age: 30, country: 'UK', sex: 'M', rating: "C" },
    { name: 'paul', age: 49, country: 'USA', sex: 'M', rating: "C" },
];

let SqlishGrammar: string = `

/* Lexer Rules */

AND             = "\\bAND\\b";
OR              = "\\bOR\\b";
EQ_OP           = "\\bEQ\\b";
NE_OP           = "\\bNE\\b";
LT_OP           = "\\bLT\\b";
LE_OP           = "\\bLE\\b";
GT_OP           = "\\bGT\\b";
GE_OP           = "\\bGE\\b";
LEFT_PAREN      = "[(]";
RIGHT_PAREN     = "[)]";
COMMA           = ",";
IN              = "\\b(IN)\\b";
CONTAINS        = "\\bCONTAINS\\b";
BETWEEN         = "\\bBETWEEN\\b";
ISBLANK         = "\\bISBLANK\\b";
NOT             = "\\bNOT\\b";
LITERAL_STRING  = "['][^']*[']";
LITERAL_NUMBER  = "[+-]?((\\d+(\\.\\d*)?)|(\\.\\d+))";
IDENTIFIER      = "[a-zA-Z_][a-zA-Z_0-9]*";
WHITESPACE      = "\\s+";

/*Parser Rules */

comparison_operator =   :EQ_OP | :NE_OP | :LT_OP | :LE_OP | :GT_OP | :GE_OP;
comparison_operand  =   :LITERAL_STRING | :LITERAL_NUMBER | :IDENTIFIER;
comparison_predicate=   LHV:comparison_operand, OPERATOR:comparison_operator, RHV:comparison_operand;
in_factor           =   COMMA!, :comparison_operand;
in_predicate        =   LHV:comparison_operand, NOT:NOT?, IN!, LEFT_PAREN!, RHV:comparison_operand, RHV:in_factor*, RIGHT_PAREN!;
between_predicate   =   LHV:comparison_operand, NOT:NOT?, BETWEEN!, OP1:comparison_operand, AND!, OP2:comparison_operand;
contains_predicate  =   LHV:comparison_operand, NOT:NOT?, CONTAINS!, RHV:comparison_operand;
blank_predicate     =   LHV:comparison_operand, NOT:NOT?, ISBLANK;
predicate           =   :comparison_predicate | :in_predicate | :between_predicate | :contains_predicate | :blank_predicate;
boolean_primary     =   :predicate;
boolean_primary     =   LEFT_PAREN!, CONDITION:search_condition, RIGHT_PAREN!;
boolean_factor      =   AND!, :boolean_primary;
boolean_term        =   AND:boolean_primary, AND:boolean_factor*;
search_factor       =   OR!, :boolean_term;
search_condition    =   OR:boolean_term, OR:search_factor*;
`

const SqlishVisitor = () => {

    // Initial state
    let state: any = {};
    state.Stack = new Stack<number>();
    state.FilterFunctions = new Stack<(row: any) => boolean>();
    var visitor = new Visitor(state);

    visitor.AddVisitor(
        "search_condition",
        (v, n) => {

            let funcs: ((row: any) => boolean)[] = [];

            for (let node of n.Properties["OR"] as Node[]) {
                node.Accept(v);
                funcs.push(v.State.FilterFunctions.pop());
            }

            v.State.FilterFunctions.push((row: any) => {
                let match: boolean = false;
                for (let func of funcs) {
                    if (func(row)) {
                        match = true;
                        break;
                    }
                }
                return match;
            });
        }
    );

    visitor.AddVisitor(
        "boolean_term",
        (v, n) => {

            let funcs: ((row: any) => boolean)[] = [];

            for (let node of n.Properties["AND"] as Node[]) {
                node.Accept(v);
                funcs.push(v.State.FilterFunctions.pop());
            }

            v.State.FilterFunctions.push((row: any) => {
                let match: boolean = true;
                for (let func of funcs) {
                    if (!func(row)) {
                        match = false;
                        break;
                    }
                }
                return match;
            });
        }
    );

    visitor.AddVisitor(
        "boolean_primary",
        (v, n) => {
            // used for parsing nested subquery with parentheses.
            // CONDITION contains subquery
            if ("CONDITION" in n.Properties) {
                let node: Node = n.Properties["CONDITION"] as Node;
                if (node) {
                    node.Accept(v);

                    let innerFilter = v.State.FilterFunctions.pop();
                    v.State.FilterFunctions.push(innerFilter);
                }
            }
        }
    );

    visitor.AddVisitor(
        "comparison_predicate",
        (v, n) => {
            let not: boolean = "NOT" in n.Properties;
            let column: string = (n.Properties["LHV"] as Token).TokenValue;
            let values: string[] = (n.Properties["LHV"] as string[]);

            let operatorTokenName: string = (n.Properties["OPERATOR"] as Token).TokenName;
            let value: string = (n.Properties["RHV"] as Token).TokenValue.replace(new RegExp("'", 'g'), "");

            v.State.FilterFunctions.push((row: any) => {
                let match: boolean = false;
                switch (operatorTokenName) {
                    case "EQ_OP":
                        match = row[column] == value;
                        break;
                    case "NE_OP":
                        match = row[column] != value;
                        break;
                    case "LT_OP":
                        match = row[column] < value;
                        break;
                    case "LE_OP":
                        match = row[column] <= value;
                        break;
                    case "GT_OP":
                        match = row[column] > value;
                        break;
                    case "GE_OP":
                        match = row[column] >= value;
                        break;
                }
                return match;
            });
        }
    );

    visitor.AddVisitor(
        "in_predicate",
        (v, n) => {
            let not: boolean = "NOT" in n.Properties;
            let column: string = (n.Properties["LHV"] as Token).TokenValue;
            let values: string[] = (n.Properties["LHV"] as string[]);
            values = values.map(v => v.replace(new RegExp("'", 'g'), ""));

            if (not)
                v.State.FilterFunctions.push((row: any) => { return !values.includes(row[column]) });
            else
                v.State.FilterFunctions.push((row: any) => { return values.includes(row[column]) });
        }
    );

    visitor.AddVisitor(
        "between_predicate",
        (v, n) => {
            let not: boolean = "NOT" in n.Properties;
            let column: string = (n.Properties["LHV"] as Token).TokenValue;
            let value1: string = (n.Properties["OP1"] as Token).TokenValue.replace(new RegExp("'", 'g'), "");
            let value2: string = (n.Properties["OP2"] as Token).TokenValue.replace(new RegExp("'", 'g'), "");

            if (not)
                v.State.FilterFunctions.push((row: any) => { return !(row[column] >= value1 && row[column] <= value2) });
            else
                v.State.FilterFunctions.push((row: any) => { return row[column] >= value1 && row[column] <= value2 });
        }
    );

    visitor.AddVisitor(
        "contains_predicate",
        (v, n) => {
            let not: boolean = "NOT" in n.Properties;
            let column: string = (n.Properties["LHV"] as Token).TokenValue;
            let value: string = (n.Properties["RHV"] as Token).TokenValue.replace(new RegExp("'", 'g'), "");

            if (not)
                v.State.FilterFunctions.push((row: any) => { return !row[column].toString().includes(value) });
            else
                v.State.FilterFunctions.push((row: any) => { return row[column].toString().includes(value) });
        }
    );

    visitor.AddVisitor(
        "blank_predicate",
        (v, n) => {
            let not: boolean = "NOT" in n.Properties;
            let column: string = (n.Properties["LHV"] as Token).TokenValue;

            if (not)
                v.State.FilterFunctions.push((row: any) => { return row[column] == true });
            else
                v.State.FilterFunctions.push((row: any) => { return row[column] == false });
        }
    );

    return visitor;
};

let resultMapper = (state: any) => {
    let func = state.FilterFunctions.pop();
    let filtered = data.filter(func);
    return filtered.length;
}

let expectedProductionRules: number = 46;   // above grammar should produce 46 production rules
test("Check grammar built OK", () => {
    expect(TestHarness.buildGrammar("Test", SqlishGrammar)).toEqual(expectedProductionRules);
})

describe("Sqlish data tests", () => {

    test.each(
        [
            ["SQLISH_1", SqlishGrammar, "age BETWEEN 40 AND 60", "search_condition", SqlishVisitor(), resultMapper, 6],
            ["SQLISH_2", SqlishGrammar, "age EQ 26", "search_condition", SqlishVisitor(), resultMapper, 1],
            ["SQLISH_3", SqlishGrammar, "rating ISBLANK", "search_condition", SqlishVisitor(), resultMapper, 1],
            ["SQLISH_4", SqlishGrammar, "sex EQ 'F'", "search_condition", SqlishVisitor(), resultMapper, 7],
            ["SQLISH_5", SqlishGrammar, "name CONTAINS 's'", "search_condition", SqlishVisitor(), resultMapper, 2],
            ["SQLISH_6", SqlishGrammar, "name NOT CONTAINS 's'", "search_condition", SqlishVisitor(), resultMapper, 14],
            ["SQLISH_7", SqlishGrammar, "country EQ 'UK' OR name EQ 'david'", "search_condition", SqlishVisitor(), resultMapper, 4],
            ["SQLISH_8", SqlishGrammar, "(country EQ 'UK' AND sex EQ 'F') OR (country EQ 'Italy')", "search_condition", SqlishVisitor(), resultMapper, 3],
        ]
    )('%s', (name, grammar, input, rootProductionRule, visitor, resultMapping, expectedResult) => {
        var result = TestHarness.doTest(name, grammar, input, rootProductionRule, visitor, resultMapping);
        expect(result).toEqual(expectedResult);
    });
});
