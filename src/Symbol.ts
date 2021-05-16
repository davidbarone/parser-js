import { RuleType } from "./RuleType"
import { MatchResult } from "./MatchResult"
import { ParserContext } from "./ParserContext"
import { Token } from "./Token"
import { BoxedObject } from "./BoxedObject"

export class Symbol {

    Alias: string
    Name: string;
    Optional: boolean;
    Many: boolean;
    Ignore: boolean;

    constructor(value: string, ruleType: RuleType) {
        let name: string = value;
        let modifier: string  = null;
        let parts: Array<string> = null;

        if (ruleType === RuleType.ParserRule)
        {
            parts = name.split(":");
            if (parts.length > 1)
            {
                this.Alias = parts[0];
                name = parts[1];
            }

            // modifiers
            let modifiers: string[] = ['+', '*', '?', '!'];

            // Check if last character is a modifier
            if (modifiers.includes(name.slice(-1)))
            {
                modifier = name.substr(name.length - 1, 1)[0];
                name = name.substr(0, name.length - 1);
            }
        }

        this.Name = name;
        if (parts == null || parts.length == 1)
            this.Alias = this.Name;

        this.Optional = modifier == "?" || modifier == "*";
        this.Many = modifier == "+" || modifier == "*";
        this.Ignore = modifier == "!";
    }

    Match(input: string) : MatchResult
    {
        let re: RegExp = new RegExp(`\A[\s]*(?<match>(${this.Name}))(?<remainder>([\s\S]*))[\s]*\Z`);
        
        if (re.test(input)) {
            let match = re.exec(input);
            return {
                Success: true,
                Matched: match.groups["match"],
                Remainder: match.groups["remainder"]
            }
        } else {
            return {
                Success: false,
                Matched: "",
                Remainder: input
            } 
        }
   }

    IsMatch(input: string): boolean {
        let re: RegExp = new RegExp(`\A[\s]*(?<match>(${this.Name}))(?<remainder>([\s\S]*))[\s]*\Z`);
        return re.test(input);
    }

    Parse(context: ParserContext) {

        let temp: number = context.CurrentTokenIndex;
        let ok: boolean = false;
        let once: boolean = false;
        
        if (this.Optional && context.TokenEOF) {
            return true;
        }
        else {
            while (true) {
                let token: Token = null;
                if (!context.TokenEOF) {
                    token = context.TryToken(this.Name);
                }
                            
                if (token != null) {
                    // terminal
                    ok = true;
                    if (!this.Ignore)
                        context.UpdateResult(this.Alias, token);
                }
                // check to see if the symbol a pointer to another production rule?
                // if so, add new item onto stack.
                else {
                    // non terminal
                    var rules = context
                        .ProductionRules
                        .filter(r => r.RuleType == RuleType.ParserRule)
                        .filter(r => r.Name.toLowerCase() === this.Name.toLowerCase());
        
                    for (let i = 0; i < rules.length; i++) {
                        let rule = rules[i];
                        let obj: BoxedObject<object> = new BoxedObject<object>();
                        ok = rule.Parse(context, obj);
                        if (ok) {
                            if (!this.Ignore)
                                context.UpdateResult(this.Alias, obj.Inner);
                            break;
                        }
                    }
                }
        
                // wind back the token index if the symbol did not match tokens.
                if (ok) {
                    once = true;
                    if (!this.Many)
                        break;
                }
                else {
                    if (!once)
                        context.CurrentTokenIndex = temp;
                    break;
                }
            }
        }
        
        // return true if match (at least once).
        var success = ok || once || this.Optional;
        return success;
    }
}