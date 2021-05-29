import { ProductionRule } from "./ProductionRule"
import { Token } from "./Token"
import { Stack } from "./Stack"
import { Node } from "./Node"
import "./Extensions"

export class ParserContext {
    ProductionRules: ProductionRule[];
    CurrentProductionRule: Stack<ProductionRule>;
    Tokens: Token[];
    Results: Stack<object>;
    CurrentTokenIndex: number;

    constructor(productionRules: ProductionRule[], tokens: Token[]) {
        this.ProductionRules = productionRules;
        this.Tokens = [...tokens];
        this.CurrentTokenIndex = 0;
        this.Results = new Stack<object>();
        this.CurrentProductionRule = new Stack<ProductionRule>();
    }

    PeekToken(): Token {
        if (this.CurrentTokenIndex >= this.Tokens.length)
            return {
                TokenName: "<EOF>",
                TokenValue: "<EOF>"
            };
        else
            return this.Tokens[this.CurrentTokenIndex];
    }

    PushResult(value: object): void {
        this.Results.push(value);
    }

    PopResult(): object | undefined {
        return this.Results.pop();
    }

    PeekResult(): object | undefined {
        return this.Results.peek();
    }

    get TokenEOF(): boolean {
        return this.CurrentTokenIndex >= this.Tokens.length;
    }

    TryToken(tokenName: string): Token | null {
        if (this.CurrentTokenIndex >= this.Tokens.length) {
            throw new Error("Unexpected EOF");
        }

        if (tokenName.toLowerCase() === this.Tokens[this.CurrentTokenIndex].TokenName.toLowerCase()) {
            let token = this.Tokens[this.CurrentTokenIndex];
            this.CurrentTokenIndex++;
            return token;
        }
        else {
            return null;
        }
    }

    UpdateResult(name: string, value: object): void {
        if (value !== null) {
            var result = this.Results.peek();
            var resultAsNode = result as Node;

            var productionRule = this.CurrentProductionRule.peek() as ProductionRule;
            var isEnumerated = productionRule.IsEnumeratedSymbol(name);

            if (name) {
                if (isEnumerated) {
                    if (!(name in resultAsNode.Properties))
                        resultAsNode.Properties[name] = new Array<object>();

                    resultAsNode.Properties[name] = resultAsNode.Properties[name].union(value);
                }
                else
                    resultAsNode.Properties[name] = value;
            }
            else {
                if (isEnumerated) {
                    var obj = this.Results.pop();
                    this.Results.push(obj.union(value));
                }
                else {
                    this.Results.pop();
                    this.Results.push(value);
                }
            }
        }
    }
}