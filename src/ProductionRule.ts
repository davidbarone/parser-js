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
        this.Name = name;
        this.Symbols = [];
        symbols.forEach(s => {
            if (typeof (s) === "string") {
                var symbol = new Symbol(s, this.RuleType);
                this.Symbols.push(symbol);
            } else {
                this.Symbols.push(s as Symbol);
            }
        });
    }

    Name: string;

    get IsGenerated(): boolean {
        return this.Name.includes("'");
    }

    get OriginalProductionRule(): string {
        return this.Name.replace("'", "");
    }

    get RuleType(): RuleType {
        if (this.Name[0] === this.Name[0].toUpperCase()) {
            return RuleType.LexerRule;
        } else {
            return RuleType.ParserRule
        }
    }

    Symbols: Array<Symbol>;

    LogHandler = (sender: any, args: LogArgs) => { };   // default handler - do nothing

    IsEnumeratedSymbol(alias: string): boolean {
        let isList: boolean = false;
        let found: boolean = false;

        var symbols = this.Symbols.filter(s => s.Alias === alias);

        if (symbols.length >= 1) {
            found = true;
            if (symbols.length > 1)
                isList = true;
            else {
                var symbol = symbols[0];
                if (symbol.Many)
                    isList = true;
            }
        }

        if (!found) {
            throw new Error(`Symbol ${alias} does not exist in production rule ${this.Name}.`);
        }

        return isList;
    }

    Parse(context: ParserContext, obj: BoxedObject<object>): boolean {

        this.LogHandler(this,
            {
                LogType: LogType.BEGIN,
                NestingLevel: context.CurrentProductionRule.size(),
                Message: `${this.Name} - Pushing new result to stack.`
            });

        context.CurrentProductionRule.push(this);
        context.PushResult(this.GetResultObject());

        var temp = context.CurrentTokenIndex;
        let success: boolean = true;

        // Rule is non terminal
        for (let i = 0; i < this.Symbols.length; i++) {
            let symbol = this.Symbols[i];
            symbol.LogHandler = this.LogHandler;
            if (symbol.Optional && context.TokenEOF)
                continue;

            var ok = symbol.Parse(context);

            if (symbol.Optional || ok) { }
            else {
                success = false;
                break;
            }
        }

        obj.Inner = context.PopResult() as Object;
        context.CurrentProductionRule.pop();

        if (success) {
            this.LogHandler(this,
                {
                    LogType: LogType.SUCCESS,
                    NestingLevel: context.CurrentProductionRule.size(),
                    Message: ""
                });

            return true;
        }
        else {
            this.LogHandler(this,
                {
                    LogType: LogType.FAILURE,
                    NestingLevel: context.CurrentProductionRule.size(),
                    Message: ""
                });

            context.CurrentTokenIndex = temp;
            obj = new BoxedObject({});
            return false;
        }
    }

    private onlyUnique(value: any, index: number, self: Array<any>) {
        return self.indexOf(value) === index;
    }

    GetResultObject(): object {
        let hasBlankAlias: boolean = false;
        let hasNonBlankAlias: boolean = false;
        let ret: object | null = null;

        // Get all the aliases
        let aliases: string[] = this.Symbols.map(s => s.Alias);
        let uniqueAliases: string[] = aliases.filter(this.onlyUnique);
        uniqueAliases.forEach(alias => {
            if (alias) {
                hasNonBlankAlias = true;

                if (ret == null)
                    ret = new Node(this.Name);
            }
            else {
                hasNonBlankAlias = false;
                if (this.IsEnumeratedSymbol(alias)) {
                    ret = [];   //List.create<object>([]);
                }
            }
        });
        if (hasNonBlankAlias && hasBlankAlias)
            throw new Error("Cannot mix blank and non-blank aliases.");

        return ret || {};
    }

    public toString(): string {
        let symbols = this.Symbols.join(", ");
        return `${this.Name} = ${symbols};`;
    }
}