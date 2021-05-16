import { ProductionRule } from "./ProductionRule"
import { Visitor } from "./Visitor"
import { Node } from "./Node"
import { Token } from "./Token"

export class Parser {
    Grammar: string;
    RootProductionRule: string;
    ProductionRules: ProductionRule[];
    IgnoreTokens: string[];

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
                    (v, n) =>
                    {
                        for (let key in n.Properties["RULES"]) {
                            let node: Node = (n.Properties["RULES"][key] as Node);
                            node.Accept(v);
                        }
                    });

                visitor.AddVisitor(
                    "rule",
                    (v, n) =>
                    {
                        let token: Token = n.Properties["RULE"] as Token;
                        let rule: string = token.TokenValue;
                        let expansion: any = n.Properties["EXPANSION"];
                        var expansionAsToken = expansion as Token;

                        // for lexer rules (terminal nodes), the expansion is a single token
                        // for lexer rules (non terminal nodes), the expansion is a set of identifiers
                        if (expansion instanceof Token)
                        {
                            // Lexer Rule
                            var expansionValue = expansionAsToken.TokenValue;
                            if (expansionValue[0] === '"' && expansionValue[expansionValue.length - 1] === '"')
                            {
                                // remove start / ending "
                                expansionValue = expansionValue.substr(1, expansionValue.length - 2);
                            }

                            let pr: ProductionRule = new ProductionRule(
                                rule,
                                expansionValue
                            );
                            v.State.ProductionRules.Add(pr);
                        }
                        else
                        {
                            v.State.CurrentRule = rule;
                            var expansionNode = expansion as Node;
                            expansionNode.Accept(v);
                        }
                    });

                visitor.AddVisitor(
                    "parserSymbolsExpr",
                    (v, n) =>
                    {
                        // each alternate contains a separate list of tokens.
                        foreach (var node in ((IEnumerable<Object>)n.Properties["ALTERNATE"]))
                        {
                            ((Node)node).Accept(v);
                        }
                    });

                visitor.AddVisitor(
                    "parserSymbolExpr",
                    (v, n) =>
                    {
                        List<string> tokens = new List<string>();
                        foreach (var symbol in ((IEnumerable<object>)n.Properties["SYMBOL"]))
                        {
                            var node = symbol as Node;
                            // Unpack components
                            var aliasList = node.Properties.ContainsKey("ALIAS") ? node.Properties["ALIAS"] as IEnumerable<object> : null;

                            // A symbol can be either an identifier or a subrule
                            string identifier = "";
                            if (node.Properties.ContainsKey("IDENTIFIER"))
                            {
                                // Identifier
                                identifier = ((Token)node.Properties["IDENTIFIER"]).TokenValue;
                            } else if (node.Properties.ContainsKey("SUBRULE"))
                            {
                                // for subrules, the subrule is parsed and added as a
                                // new production, and the subrule is replaced with the
                                // autogenerated name of the subrule.
                                identifier = $"anonymous_{v.State.SubRules++}";
                                var temp = v.State.CurrentRule;
                                v.State.CurrentRule = identifier;
                                var subrule = (Node)node.Properties["SUBRULE"];
                                subrule.Accept(v);
                                v.State.CurrentRule = temp;
                            }
                            var modifierToken = node.Properties.ContainsKey("MODIFIER") ? node.Properties["MODIFIER"] as Token : null;
                            var alias = "";
                            if (aliasList != null)
                            {
                                alias = string.Join("", aliasList.Select(a => ((Token)a).TokenValue));
                            }
                            var modifier = (modifierToken != null) ? modifierToken.TokenValue : "";
                            tokens.Add($"{alias}{identifier}{modifier}");
                        }

                        ProductionRule pr = new ProductionRule(
                            v.State.CurrentRule,
                            tokens.ToArray()
                        );
                        v.State.ProductionRules.Add(pr);
                    });

                return visitor;




    }

    
}