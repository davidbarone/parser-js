import { Parser } from "../src/Parser";
import { Node } from "../src/Node";

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

describe("Pretty Print test", () => {

    let expected: string = `+- expression
   +- term
   |  +- factor
   |     +- primary
   |        +- NUMBER_LITERAL [9]
   +- anonymous_1
      +- PLUS_OP [+]
      +- term
         +- factor
            +- primary
               +- NUMBER_LITERAL [5]
`;

    let input = "9+5";
    let parser: Parser = new Parser(SubruleGrammar(), "expression", () => { });
    let ast: Node | null = parser.Parse(input, true);
    let actual: string = "";
    if (ast !== null) {
        actual = ast.prettyPrint();
    }
    console.log(actual);
    console.log(expected);
    test("prettyprint test", () => {
        expect(actual).toEqual(expected);
    })
});
