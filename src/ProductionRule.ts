import { RuleType } from "./RuleType"
import { Symbol } from "./Symbol"
import { BoxedObject } from "./BoxedObject"
import { ParserContext } from "./ParserContext"
import { Node } from "./Node"
import { List } from "./List"
import { ILoggable } from "./ILoggable"
import { LogArgs } from "./LogArgs"
import { LogType } from "./LogType"

export class ProductionRule implements ILoggable {

    public constructor(name: string, ...symbols: string[]);
    public constructor(name: string, ...symbols: symbol[]);
    public constructor(name: string, ...symbols: Array<any>) {
        this.name = name;
        this.symbols = [];
        symbols.forEach(s => {
            if (typeof (s) === "string") {
                var symbol = new Symbol(s, this.ruleType);
                this.symbols.push(symbol);
            } else {
                this.symbols.push(s as Symbol);
            }
        });
    }

    name: string;

    get isGenerated(): boolean {
        return this.name.includes("'");
    }

    get originalProductionRule(): string {
        return this.name.replace("'", "");
    }

    get ruleType(): RuleType {
        if (this.name[0] === this.name[0].toUpperCase()) {
            return RuleType.LexerRule;
        } else {
            return RuleType.ParserRule
        }
    }

    symbols: Array<Symbol>;

    logHandler = (sender: any, args: LogArgs) => { };   // default handler - do nothing

    isEnumeratedSymbol(alias: string): boolean {
        let isList: boolean = false;
        let found: boolean = false;

        var symbols = this.symbols.filter(s => s.alias === alias);

        if (symbols.length >= 1) {
            found = true;
            if (symbols.length > 1)
                isList = true;
            else {
                var symbol = symbols[0];
                if (symbol.many)
                    isList = true;
            }
        }

        if (!found) {
            throw new Error(`Symbol ${alias} does not exist in production rule ${this.name}.`);
        }

        return isList;
    }

    parse(context: ParserContext, obj: BoxedObject<object>): boolean {

        this.logHandler(this,
            {
                logType: LogType.Begin,
                nestingLevel: context.currentProductionRule.size(),
                message: `${this.name} - Pushing new result to stack.`
            });

        context.currentProductionRule.push(this);
        context.pushResult(this.getResultObject());

        var temp = context.currentTokenIndex;
        let success: boolean = true;

        // Rule is non terminal
        for (let i = 0; i < this.symbols.length; i++) {
            let symbol = this.symbols[i];
            symbol.logHandler = this.logHandler;
            if (symbol.optional && context.tokenEOF)
                continue;

            var ok = symbol.parse(context);

            if (symbol.optional || ok) { }
            else {
                success = false;
                break;
            }
        }

        obj.inner = context.popResult() as Object;
        context.currentProductionRule.pop();

        if (success) {
            this.logHandler(this,
                {
                    logType: LogType.Success,
                    nestingLevel: context.currentProductionRule.size(),
                    message: ""
                });

            return true;
        }
        else {
            this.logHandler(this,
                {
                    logType: LogType.Failure,
                    nestingLevel: context.currentProductionRule.size(),
                    message: ""
                });

            context.currentTokenIndex = temp;
            obj = new BoxedObject({});
            return false;
        }
    }

    private onlyUnique(value: any, index: number, self: Array<any>) {
        return self.indexOf(value) === index;
    }

    getResultObject(): object {
        let hasBlankAlias: boolean = false;
        let hasNonBlankAlias: boolean = false;
        let ret: object | null = null;

        // Get all the aliases
        let aliases: string[] = this.symbols.map(s => s.alias);
        let uniqueAliases: string[] = aliases.filter(this.onlyUnique);
        uniqueAliases.forEach(alias => {
            if (alias) {
                hasNonBlankAlias = true;

                if (ret == null)
                    ret = new Node(this.name);
            }
            else {
                hasNonBlankAlias = false;
                if (this.isEnumeratedSymbol(alias)) {
                    ret = [];   //List.create<object>([]);
                }
            }
        });
        if (hasNonBlankAlias && hasBlankAlias)
            throw new Error("Cannot mix blank and non-blank aliases.");

        return ret || {};
    }

    public toString(): string {
        let symbols = this.symbols.join(", ");
        return `${this.name} = ${symbols};`;
    }
}