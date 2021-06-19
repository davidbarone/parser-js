import { RuleType } from "./RuleType"
import { MatchResult } from "./MatchResult"
import { ParserContext } from "./ParserContext"
import { Token } from "./Token"
import { BoxedObject } from "./BoxedObject"
import { ILoggable } from "./ILoggable"
import { LogArgs } from "./LogArgs"
import { LogType } from "./LogType"

export class Symbol implements ILoggable {

    alias: string;
    name: string;
    optional: boolean;
    many: boolean;
    ignore: boolean;
    logHandler = (sender: any, args: LogArgs) => { };   // default handler - do nothing

    constructor(value: string, ruleType: RuleType) {
        let name: string = value;
        let modifier: string | null = null;
        let parts: Array<string> | null = null;

        this.alias = "";
        if (ruleType === RuleType.ParserRule) {
            parts = name.split(":");
            if (parts.length > 1) {
                this.alias = parts[0];
                name = parts[1];
            }

            // modifiers
            let modifiers: string[] = ['+', '*', '?', '!'];

            // Check if last character is a modifier
            if (modifiers.includes(name.slice(-1))) {
                modifier = name.substr(name.length - 1, 1)[0];
                name = name.substr(0, name.length - 1);
            }
        }

        this.name = name;
        if (parts == null || parts.length == 1)
            this.alias = this.name;

        this.optional = modifier == "?" || modifier == "*";
        this.many = modifier == "+" || modifier == "*";
        this.ignore = modifier == "!";
    }

    /**
     * The regexp pattern used by this class to test input.
     */
    get matchPattern(): string {
        let pattern = `^[\\s]*(?<match>(${this.name}))(?<remainder>([\\s\\S]*))[\\s]*$`;
        return pattern;
    }

    match(input: string): MatchResult {
        let re: RegExp = new RegExp(this.matchPattern);

        if (re.test(input)) {
            let match = re.exec(input) as RegExpExecArray;
            let groups = match.groups as { [key: string]: string };
            return {
                success: true,
                matched: groups["match"],
                remainder: groups["remainder"]
            }
        } else {
            return {
                success: false,
                matched: "",
                remainder: input
            }
        }
    }

    isMatch(input: string): boolean {
        let re: RegExp = new RegExp(this.matchPattern);
        return re.test(input);
    }

    parse(context: ParserContext) {

        this.logHandler(this,
            {
                logType: LogType.Begin,
                nestingLevel: context.currentProductionRule.size(),
                message: `Token Index: ${context.currentTokenIndex}, Results: ${context.results.size()}, Symbol=${this.name}, Next Token=[${context.peekToken().tokenName} - \"${context.peekToken().tokenValue}\"]`
            });

        let temp: number = context.currentTokenIndex;
        let ok: boolean = false;
        let once: boolean = false;

        if (this.optional && context.tokenEOF) {
            return true;
        }
        else {
            while (true) {
                let token: Token | null = null;
                if (!context.tokenEOF) {
                    token = context.tryToken(this.name);
                }

                if (token != null) {
                    // terminal
                    ok = true;
                    if (!this.ignore)
                        context.updateResult(this.alias, token);
                }
                // check to see if the symbol a pointer to another production rule?
                // if so, add new item onto stack.
                else {
                    // non terminal
                    var rules = context
                        .productionRules
                        .filter(r => r.ruleType == RuleType.ParserRule)
                        .filter(r => r.name.toLowerCase() === this.name.toLowerCase());

                    if (rules.length == 0) {
                        break;
                    }

                    for (let i = 0; i < rules.length; i++) {
                        let rule = rules[i];
                        rule.logHandler = this.logHandler;
                        let obj: BoxedObject<object> = new BoxedObject<object>();
                        ok = rule.parse(context, obj);
                        if (ok) {
                            if (!this.ignore)
                                context.updateResult(this.alias, obj.inner as Object);
                            break;
                        }
                    }
                }

                // wind back the token index if the symbol did not match tokens.
                if (ok) {
                    once = true;
                    if (!this.many)
                        break;
                }
                else {
                    if (!once)
                        context.currentTokenIndex = temp;
                    break;
                }
            }
        }

        // return true if match (at least once).
        var success = ok || once || this.optional;

        this.logHandler(this,
            {
                logType: success ? LogType.Success : LogType.Failure,
                nestingLevel: context.currentProductionRule.size(),
                message: `"Token Index: ${context.currentTokenIndex}, Results: ${context.results.size()}, Symbol=${this.name}, Next Token=[${context.peekToken().tokenName} - \"${context.peekToken().tokenValue}\"]`
            });

        return success;
    }
}