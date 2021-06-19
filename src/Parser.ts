import { ProductionRule } from "./ProductionRule"
import { Visitor } from "./Visitor"
import { Node } from "./Node"
import { Token } from "./Token"
import { RuleType } from "./RuleType"
import { ParserContext } from "./ParserContext"
import { BoxedObject } from "./BoxedObject"
import { ILoggable } from "./ILoggable"
import { LogArgs } from "./LogArgs"
import { LogType } from "./LogType"

export class Parser implements ILoggable {
    grammar: string = "";
    rootProductionRule: string = "";
    productionRules: ProductionRule[] = [];
    ignoreTokens: string[] = [];
    logHandler = (sender: any, args: LogArgs) => { };   // default handler - do nothing

    private get bnfGrammar(): ProductionRule[] {
        return [
            // Lexer Rules
            new ProductionRule("COMMENT", "([/][*]).*([*][/])"),    // comments 
            new ProductionRule("EQ", "="),                          // definition
            new ProductionRule("COMMA", "[,]"),                     // concatenation
            new ProductionRule("COLON", "[:]"),                     // rewrite / aliasing
            new ProductionRule("SEMICOLON", ";"),                   // termination
            new ProductionRule("MODIFIER", "[?!+*]"),               // modifies the symbol
            new ProductionRule("OR", "[|]"),                       // alternation
            new ProductionRule("QUOTEDLITERAL", '"(?:[^"]|\\.)*"'),
            new ProductionRule("IDENTIFIER", "[a-zA-Z][a-zA-Z0-9_']+"),
            new ProductionRule("NEWLINE", "\n"),
            new ProductionRule("LPAREN", "[(]"),
            new ProductionRule("RPAREN", "[)]"),

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

    private get bnfVisitor(): Visitor {

        // Initial state
        let state: any = {};
        state.productionRules = [] as ProductionRule[];
        state.currentRule = "";
        state.subRules = 0;
        var visitor = new Visitor(state);

        visitor.addVisitor(
            "grammar",
            (v, n) => {
                let rulesObject: Node[] = n.properties["RULES"] as Node[];
                for (let node of rulesObject) {
                    node.accept(v);
                }
            });

        visitor.addVisitor(
            "rule",
            (v, n) => {
                let token: Token = n.properties["RULE"] as Token;
                let rule: string = token.tokenValue;
                let expansion: any = n.properties["EXPANSION"];
                var expansionAsToken = expansion as Token;

                // for lexer rules (terminal nodes), the expansion is a single token
                // for lexer rules (non terminal nodes), the expansion is a set of identifiers
                if (expansion instanceof Token) {
                    // Lexer Rule
                    var expansionValue = expansionAsToken.tokenValue;
                    if (expansionValue[0] === '"' && expansionValue[expansionValue.length - 1] === '"') {
                        // remove start / ending "
                        expansionValue = expansionValue.substr(1, expansionValue.length - 2);
                    }

                    let pr: ProductionRule = new ProductionRule(
                        rule,
                        expansionValue
                    );
                    v.state.productionRules.push(pr);
                }
                else {
                    v.state.currentRule = rule;
                    var expansionNode = expansion as Node;
                    expansionNode.accept(v);
                }
            });

        visitor.addVisitor(
            "parserSymbolsExpr",
            (v, n) => {
                // each alternate contains a separate list of tokens.
                if (Array.isArray(n.properties["ALTERNATE"])) {
                    for (let node of n.properties["ALTERNATE"]) {
                        (node as Node).accept(v);
                    }
                }
            });

        visitor.addVisitor(
            "parserSymbolExpr",
            (v, n) => {
                let tokens: string[] = [];
                if (Array.isArray(n.properties["SYMBOL"])) {
                    for (let symbol of n.properties["SYMBOL"]) {
                        var node = symbol as Node;
                        // Unpack components
                        var aliasList = ("ALIAS" in node.properties) ? node.properties["ALIAS"] as Array<object> : null;

                        // A symbol can be either an identifier or a subrule
                        let identifier: string = "";
                        if ("IDENTIFIER" in node.properties) {
                            // Identifier
                            identifier = (node.properties["IDENTIFIER"] as Token).tokenValue;
                        } else if ("SUBRULE" in node.properties) {
                            // for subrules, the subrule is parsed and added as a
                            // new production, and the subrule is replaced with the
                            // autogenerated name of the subrule.
                            identifier = `anonymous_${v.state.subRules++}`;
                            var temp = v.state.currentRule;
                            v.state.currentRule = identifier;
                            var subrule = node.properties["SUBRULE"] as Node;
                            subrule.accept(v);
                            v.state.currentRule = temp;
                        }
                        var modifierToken = ("MODIFIER" in node.properties) ? node.properties["MODIFIER"] as Token : null;
                        var alias = "";
                        if (aliasList != null) {
                            var elements = aliasList.map(a => (a as Token).tokenValue);
                            alias = elements.join("");
                        }
                        var modifier = (modifierToken != null) ? modifierToken.tokenValue : "";
                        tokens.push(`${alias}${identifier}${modifier}`);
                    }

                    let pr: ProductionRule = new ProductionRule(
                        v.state.currentRule,
                        ...tokens
                    );
                    v.state.productionRules.push(pr);
                }
            }
        );

        return visitor;
    }

    public constructor(name: ProductionRule[], rootProductionRule: string, logHandler: (sender: any, args: LogArgs) => void, ...ignoreTokens: string[]);
    public constructor(grammar: string, rootProductionRule: string, logHandler: (sender: any, args: LogArgs) => void, ...ignoreTokens: string[]);
    public constructor(grammar: any, rootProductionRule: string, logHandler: (sender: any, args: LogArgs) => void, ...ignoreTokens: string[]) {

        this.logHandler = logHandler;
        this.ignoreTokens = [...ignoreTokens];
        this.rootProductionRule = rootProductionRule;
        if (typeof (grammar) === "string") {
            let parser: Parser = new Parser(this.bnfGrammar, "grammar", this.logHandler, "COMMENT", "NEWLINE");
            var tokens = parser.tokenise(grammar);
            if (tokens.length == 0) {
                throw "Invalid grammar. No production rules found";
            }
            var ast = parser.parse(grammar) as Node;
            this.productionRules = parser.execute(ast, this.bnfVisitor, (d) => d.productionRules) as ProductionRule[];
        } else {
            this.productionRules = grammar;
            this.ignoreTokens = [...ignoreTokens];
            this.rootProductionRule = rootProductionRule;
        }
    }

    tokenise(input: string): Token[] {
        // If input only whitespace, return with no tokens
        if (!/\S/.test(input)) {
            return [];
        }

        // Start at the beginning of the string and
        // recursively identify tokens. First token to match wins
        for (let rule of this.productionRules.filter(p => p.ruleType === RuleType.LexerRule)) {
            var symbols = rule.symbols;
            if (symbols.length > 1)
                throw ("Lexer rule can only have 1 symbol");

            var symbol = symbols[0];

            if (symbol.isMatch((input))) {
                var match = symbol.match(input);
                var token: Token = new Token(rule.name, match.matched || "");
                let list: Token[] = [];
                if (this.ignoreTokens.indexOf(rule.name) == -1) {
                    list.push(token);
                }
                list.push(...this.tokenise(match.remainder || ""));
                return list;
            }
        }
        throw (`Syntax error near ${input.substr(0, 20)}...`);
    }

    parse(input: string): Node {
        if (!input)
            throw ("No input to parse.");

        var tokens = this.tokenise(input);

        if (tokens == null || tokens.length == 0)
            throw ("input yields no tokens.");

        // find any matching production rules.
        var rules = this.productionRules.filter(p => this.rootProductionRule == null || p.name.toLowerCase() === this.rootProductionRule.toLowerCase());
        if (rules.length == 0) {
            throw (`Production rule: ${this.rootProductionRule} not found.`);
        }

        // try each rule. Use the first rule which succeeds.
        for (let rule of rules) {
            rule.logHandler = this.logHandler;
            let context: ParserContext = new ParserContext(this.productionRules, tokens);
            let obj: Object = {};
            let box: BoxedObject<Object> = new BoxedObject(obj);
            var ok = rule.parse(context, box);
            if (ok && context.tokenEOF) {
                return box.inner as Node;
            }
        }

        // should not get here...
        throw "Input cannot be parsed.";
    }

    execute(node: Node, visitors: Visitor, resultMapping: (result: any) => any = (state) => state): any {

        node.accept(visitors);
        var state = visitors.state;
        if (resultMapping == null)
            return state;
        else
            return resultMapping(state);

    }
}