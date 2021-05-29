import { ProductionRule } from "./ProductionRule"
import { Visitor } from "./Visitor"
import { Node } from "./Node"
import { Token } from "./Token"

export class Parser {
    Grammar: string = "";
    RootProductionRule: string = "";
    ProductionRules: ProductionRule[] = [];
    IgnoreTokens: string[] = [];

    private get BNFGrammar(): ProductionRule[] {
        return [
            // Lexer Rules
            new ProductionRule("COMMENT", "\/\*.*\*\/"),           // comments 
            new ProductionRule("EQ", "="),                          // definition
            new ProductionRule("COMMA", "[,]"),                     // concatenation
            new ProductionRule("COLON", "[:]"),                     // rewrite / aliasing
            new ProductionRule("SEMICOLON", ";"),                   // termination
            new ProductionRule("MODIFIER", "[?!+*]"),               // modifies the symbol
            new ProductionRule("OR", "[|]"),                       // alternation
            new ProductionRule("QUOTEDLITERAL", "\"(?:[^\"\\]|\\.)*\""),
            new ProductionRule("IDENTIFIER", "[a-zA-Z][a-zA-Z0-9_']+"),
            new ProductionRule("NEWLINE", "\n"),
            new ProductionRule("LPAREN", "\("),
            new ProductionRule("RPAREN", "\)"),

            // Parser Rules
            new ProductionRule("alias", ":IDENTIFIER?", ":COLON"),
            new ProductionRule("subrule", "LPAREN!", ":parserSymbolsExpr", "RPAREN!"),
            new ProductionRule("symbol", "ALIAS:alias?", "SUBRULE:subrule", "MODIFIER:MODIFIER?"),
            new ProductionRule("symbol", "ALIAS:alias?", "IDENTIFIER:IDENTIFIER", "MODIFIER:MODIFIER?"),
            new ProductionRule("parserSymbolTerm", ":symbol"),
            new ProductionRule("parserSymbolFactor", "COMMA!", ":symbol"),
            new ProductionRule("parserSymbolExpr", "SYMBOL:parserSymbolTerm", "SYMBOL:parserSymbolFactor*"),
            new ProductionRule("parserSymbolsFactor", "OR!", ":parserSymbolExpr"),
            new ProductionRule("parserSymbolsExpr", "ALTERNATE:parserSymbolExpr", "ALTERNATE:parserSymbolsFactor*"),
            new ProductionRule("rule", "RULE:IDENTIFIER", "EQ!", "EXPANSION:QUOTEDLITERAL", "SEMICOLON!"),      // Lexer rule
            new ProductionRule("rule", "RULE:IDENTIFIER", "EQ!", "EXPANSION:parserSymbolsExpr", "SEMICOLON!"),  // Parser rule
            new ProductionRule("grammar", "RULES:rule+")
        ];
    }

    private get BNFVisitor(): Visitor {

        // Initial state
        let state: any = {};
        state.ProductionRules = [] as ProductionRule[];
        state.CurrentRule = "";
        state.SubRules = 0;
        var visitor = new Visitor(state);

        visitor.AddVisitor(
            "grammar",
            (v, n) => {
                let rulesObject: { [key: string]: Node } = n.Properties["RULES"] as { [key: string]: Node };
                for (let key in rulesObject) {
                    let node: Node = rulesObject[key];
                    node.Accept(v);
                }
            });

        visitor.AddVisitor(
            "rule",
            (v, n) => {
                let token: Token = n.Properties["RULE"] as Token;
                let rule: string = token.TokenValue;
                let expansion: any = n.Properties["EXPANSION"];
                var expansionAsToken = expansion as Token;

                // for lexer rules (terminal nodes), the expansion is a single token
                // for lexer rules (non terminal nodes), the expansion is a set of identifiers
                if (expansion instanceof Token) {
                    // Lexer Rule
                    var expansionValue = expansionAsToken.TokenValue;
                    if (expansionValue[0] === '"' && expansionValue[expansionValue.length - 1] === '"') {
                        // remove start / ending "
                        expansionValue = expansionValue.substr(1, expansionValue.length - 2);
                    }

                    let pr: ProductionRule = new ProductionRule(
                        rule,
                        expansionValue
                    );
                    v.State.ProductionRules.Add(pr);
                }
                else {
                    v.State.CurrentRule = rule;
                    var expansionNode = expansion as Node;
                    expansionNode.Accept(v);
                }
            });

        visitor.AddVisitor(
            "parserSymbolsExpr",
            (v, n) => {
                // each alternate contains a separate list of tokens.
                if (Array.isArray(n.Properties["ALTERNATE"])) {
                    for (let node of n.Properties["ALTERNATE"]) {
                        (node as Node).Accept(v);
                    }
                }
            });

        visitor.AddVisitor(
            "parserSymbolExpr",
            (v, n) => {
                let tokens: string[] = [];
                if (Array.isArray(n.Properties["SYMBOL"])) {
                    for (let symbol of n.Properties["SYMBOL"]) {
                        var node = symbol as Node;
                        // Unpack components
                        var aliasList = ("ALIAS" in node.Properties) ? node.Properties["ALIAS"] as Array<object> : null;

                        // A symbol can be either an identifier or a subrule
                        let identifier: string = "";
                        if ("IDENTIFIER" in node.Properties) {
                            // Identifier
                            identifier = (node.Properties["IDENTIFIER"] as Token).TokenValue;
                        } else if ("SUBRULE" in node.Properties) {
                            // for subrules, the subrule is parsed and added as a
                            // new production, and the subrule is replaced with the
                            // autogenerated name of the subrule.
                            identifier = `anonymous_${v.State.SubRules++}`;
                            var temp = v.State.CurrentRule;
                            v.State.CurrentRule = identifier;
                            var subrule = node.Properties["SUBRULE"] as Node;
                            subrule.Accept(v);
                            v.State.CurrentRule = temp;
                        }
                        var modifierToken = ("MODIFIER" in node.Properties) ? node.Properties["MODIFIER"] as Token : null;
                        var alias = "";
                        if (aliasList != null) {
                            var elements = aliasList.map(a => (a as Token).TokenValue);
                            alias = elements.join("");
                        }
                        var modifier = (modifierToken != null) ? modifierToken.TokenValue : "";
                        tokens.push(`${alias}${identifier}${modifier}`);
                    }

                    let pr: ProductionRule = new ProductionRule(
                        v.State.CurrentRule,
                        ...tokens
                    );
                    v.State.ProductionRules.Add(pr);
                }
            }
        );

        return visitor;
    }


}