import { ProductionRule } from "./ProductionRule"
import { Token } from "./Token"
import { Stack } from "./Stack"
import { Node } from "./Node"
import "./Extensions"

export class ParserContext {
    productionRules: ProductionRule[];
    currentProductionRule: Stack<ProductionRule>;
    tokens: Token[];
    results: Stack<object>;
    currentTokenIndex: number;

    constructor(productionRules: ProductionRule[], tokens: Token[]) {
        this.productionRules = productionRules;
        this.tokens = [...tokens];
        this.currentTokenIndex = 0;
        this.results = new Stack<object>();
        this.currentProductionRule = new Stack<ProductionRule>();
    }

    peekToken(): Token {
        if (this.currentTokenIndex >= this.tokens.length)
            return new Token("<EOF>", "<EOF>")
        else
            return this.tokens[this.currentTokenIndex];
    }

    pushResult(value: object): void {
        this.results.push(value);
    }

    popResult(): object | undefined {
        return this.results.pop();
    }

    peekResult(): object | undefined {
        return this.results.peek();
    }

    get tokenEOF(): boolean {
        return this.currentTokenIndex >= this.tokens.length;
    }

    tryToken(tokenName: string): Token | null {
        if (this.currentTokenIndex >= this.tokens.length) {
            throw new Error("Unexpected EOF");
        }

        if (tokenName.toLowerCase() === this.tokens[this.currentTokenIndex].tokenName.toLowerCase()) {
            let token = this.tokens[this.currentTokenIndex];
            this.currentTokenIndex++;
            return token;
        }
        else {
            return null;
        }
    }

    updateResult(name: string, value: object): void {
        if (value !== null) {
            var result = this.results.peek();
            var resultAsNode = result as Node;

            var productionRule = this.currentProductionRule.peek() as ProductionRule;
            var isEnumerated = productionRule.isEnumeratedSymbol(name);

            if (name) {
                if (isEnumerated) {
                    if (!(name in resultAsNode.properties))
                        resultAsNode.properties[name] = new Array<object>();

                    resultAsNode.properties[name] = resultAsNode.properties[name].union(value);
                }
                else
                    resultAsNode.properties[name] = value;
            }
            else {
                if (isEnumerated) {
                    var obj = this.results.pop() as Object;
                    this.results.push(obj.union(value));
                }
                else {
                    this.results.pop();
                    this.results.push(value);
                }
            }
        }
    }
}