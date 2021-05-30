import { ProductionRule } from "./ProductionRule"
import { Visitor } from "./Visitor"
import { Node } from "./Node"
import { Token } from "./Token"
import { RuleType } from "./RuleType"
import { ParserContext } from "./ParserContext"
import { BoxedObject } from "./BoxedObject"

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

    public constructor(name: ProductionRule[], rootProductionRule: string, ...ignoreTokens: string[]);
    public constructor(grammar: string, rootProductionRule: string, ...ignoreTokens: string[]);
    public constructor(grammar: any, rootProductionRule: string, ...ignoreTokens: string[]) {

        this.IgnoreTokens = [...ignoreTokens];
        this.RootProductionRule = rootProductionRule;
        if (typeof (grammar) === "string") {
            let parser: Parser = new Parser(this.BNFGrammar, "grammar", "COMMENT", "NEWLINE");
            var tokens = parser.Tokenise(grammar);
            var ast = parser.Parse(grammar) as Node;
            this.ProductionRules = parser.Execute(ast, this.BNFVisitor, (d) => d.ProductionRules) as ProductionRule[];
        } else {
            this.ProductionRules = grammar;
            this.IgnoreTokens = [...ignoreTokens];
            this.RootProductionRule = rootProductionRule;
        }
    }

    Tokenise(input: string): Token[] {
        if (!input) {
            return [];
        }

        // Start at the beginning of the string and
        // recursively identify tokens. First token to match wins
        for (let rule of this.ProductionRules.filter(p => p.RuleType === RuleType.LexerRule)) {
            var symbols = rule.Symbols;
            if (symbols.length > 1)
                throw ("Lexer rule can only have 1 symbol");

            var symbol = symbols[0];

            if (symbol.IsMatch((input))) {
                var match = symbol.Match(input);
                var token: Token =
                {
                    TokenName: rule.Name,
                    TokenValue: match.Matched || ""
                };
                let list: Token[] = [];
                if (this.IgnoreTokens.indexOf(rule.Name) == -1) {
                    list.push(token);
                }
                list.push(...this.Tokenise(match.Remainder || ""));
                return list;
            }
        }
        throw (`Syntax error near ${input.substr(0, 20)}...`);
    }

    Parse(input: string, throwOnFailure: boolean = true): Node | null {
        if (!input)
            return null;

        var tokens = this.Tokenise(input);

        if (tokens == null || tokens.length == 0)
            throw ("input yields no tokens!");

        // find any matching production rules.
        var rules = this.ProductionRules.filter(p => this.RootProductionRule == null || p.Name.toLowerCase() === this.RootProductionRule.toLowerCase());
        if (rules.length == 0) {
            throw (`Production rule: ${this.RootProductionRule} not found.`);
        }

        // try each rule. Use the first rule which succeeds.
        for (let rule of rules) {
            let context: ParserContext = new ParserContext(this.ProductionRules, tokens);
            let obj: Object = {};
            let box: BoxedObject<Object> = new BoxedObject(obj);
            var ok = rule.Parse(context, box);
            if (ok && context.TokenEOF) {
                return box.Inner as Node;
            }
        }

        // should not get here...
        if (throwOnFailure)
            throw "Input cannot be parsed.";
        else
            return null;
    }

    Execute(node: Node, visitors: Visitor, resultMapping: (result: any) => object | null = (state) => state): Object | null {
        if (node == null)
            return null;

        node.Accept(visitors);
        var state = visitors.State;
        if (resultMapping == null)
            return state;
        else
            return resultMapping(state);
    }
}