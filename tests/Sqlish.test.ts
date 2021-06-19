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

let sqlishGrammar: string = `

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

const sqlishVisitor = () => {

    // Initial state
    let state: any = {};
    state.stack = new Stack<number>();
    state.filterFunctions = new Stack<(row: any) => boolean>();
    var visitor = new Visitor(state);

    visitor.addVisitor(
        "search_condition",
        (v, n) => {

            let funcs: ((row: any) => boolean)[] = [];

            for (let node of n.properties["OR"] as Node[]) {
                node.accept(v);
                funcs.push(v.state.filterFunctions.pop());
            }

            v.state.filterFunctions.push((row: any) => {
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

    visitor.addVisitor(
        "boolean_term",
        (v, n) => {

            let funcs: ((row: any) => boolean)[] = [];

            for (let node of n.properties["AND"] as Node[]) {
                node.accept(v);
                funcs.push(v.state.filterFunctions.pop());
            }

            v.state.filterFunctions.push((row: any) => {
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

    visitor.addVisitor(
        "boolean_primary",
        (v, n) => {
            // used for parsing nested subquery with parentheses.
            // CONDITION contains subquery
            if ("CONDITION" in n.properties) {
                let node: Node = n.properties["CONDITION"] as Node;
                if (node) {
                    node.accept(v);

                    let innerFilter = v.state.filterFunctions.pop();
                    v.state.filterFunctions.push(innerFilter);
                }
            }
        }
    );

    visitor.addVisitor(
        "comparison_predicate",
        (v, n) => {
            let not: boolean = "NOT" in n.properties;
            let column: string = (n.properties["LHV"] as Token).tokenValue;
            let values: string[] = (n.properties["LHV"] as string[]);

            let operatorTokenName: string = (n.properties["OPERATOR"] as Token).tokenName;
            let value: string = (n.properties["RHV"] as Token).tokenValue.replace(new RegExp("'", 'g'), "");

            v.state.filterFunctions.push((row: any) => {
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

    visitor.addVisitor(
        "in_predicate",
        (v, n) => {
            let not: boolean = "NOT" in n.properties;
            let column: string = (n.properties["LHV"] as Token).tokenValue;
            let values: string[] = (n.properties["LHV"] as string[]);
            values = values.map(v => v.replace(new RegExp("'", 'g'), ""));

            if (not)
                v.state.filterFunctions.push((row: any) => { return !values.includes(row[column]) });
            else
                v.state.filterFunctions.push((row: any) => { return values.includes(row[column]) });
        }
    );

    visitor.addVisitor(
        "between_predicate",
        (v, n) => {
            let not: boolean = "NOT" in n.properties;
            let column: string = (n.properties["LHV"] as Token).tokenValue;
            let value1: string = (n.properties["OP1"] as Token).tokenValue.replace(new RegExp("'", 'g'), "");
            let value2: string = (n.properties["OP2"] as Token).tokenValue.replace(new RegExp("'", 'g'), "");

            if (not)
                v.state.filterFunctions.push((row: any) => { return !(row[column] >= value1 && row[column] <= value2) });
            else
                v.state.filterFunctions.push((row: any) => { return row[column] >= value1 && row[column] <= value2 });
        }
    );

    visitor.addVisitor(
        "contains_predicate",
        (v, n) => {
            let not: boolean = "NOT" in n.properties;
            let column: string = (n.properties["LHV"] as Token).tokenValue;
            let value: string = (n.properties["RHV"] as Token).tokenValue.replace(new RegExp("'", 'g'), "");

            if (not)
                v.state.filterFunctions.push((row: any) => { return !row[column].toString().includes(value) });
            else
                v.state.filterFunctions.push((row: any) => { return row[column].toString().includes(value) });
        }
    );

    visitor.addVisitor(
        "blank_predicate",
        (v, n) => {
            let not: boolean = "NOT" in n.properties;
            let column: string = (n.properties["LHV"] as Token).tokenValue;

            if (not)
                v.state.filterFunctions.push((row: any) => { return row[column] == true });
            else
                v.state.filterFunctions.push((row: any) => { return row[column] == false });
        }
    );

    return visitor;
};

let resultMapper = (state: any) => {
    let func = state.filterFunctions.pop();
    let filtered = data.filter(func);
    return filtered.length;
}

let expectedProductionRules: number = 46;   // above grammar should produce 46 production rules
test("Check grammar built OK", () => {
    expect(TestHarness.buildGrammar("Test", sqlishGrammar)).toEqual(expectedProductionRules);
})

describe("Sqlish data tests", () => {

    test.each(
        [
            ["SQLISH_1", sqlishGrammar, "age BETWEEN 40 AND 60", "search_condition", sqlishVisitor(), resultMapper, 6],
            ["SQLISH_2", sqlishGrammar, "age EQ 26", "search_condition", sqlishVisitor(), resultMapper, 1],
            ["SQLISH_3", sqlishGrammar, "rating ISBLANK", "search_condition", sqlishVisitor(), resultMapper, 1],
            ["SQLISH_4", sqlishGrammar, "sex EQ 'F'", "search_condition", sqlishVisitor(), resultMapper, 7],
            ["SQLISH_5", sqlishGrammar, "name CONTAINS 's'", "search_condition", sqlishVisitor(), resultMapper, 2],
            ["SQLISH_6", sqlishGrammar, "name NOT CONTAINS 's'", "search_condition", sqlishVisitor(), resultMapper, 14],
            ["SQLISH_7", sqlishGrammar, "country EQ 'UK' OR name EQ 'david'", "search_condition", sqlishVisitor(), resultMapper, 4],
            ["SQLISH_8", sqlishGrammar, "(country EQ 'UK' AND sex EQ 'F') OR (country EQ 'Italy')", "search_condition", sqlishVisitor(), resultMapper, 3],
        ]
    )('%s', (name, grammar, input, rootProductionRule, visitor, resultMapping, expectedResult) => {
        var result = TestHarness.doTest(name, grammar, input, rootProductionRule, visitor, resultMapping);
        expect(result).toEqual(expectedResult);
    });

});
