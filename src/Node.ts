import { Visitor } from "./Visitor"
import { Dictionary } from "./Dictionary"
import { Token } from "./Token";

export class Node {
    name: string;
    properties: Dictionary<object>;

    constructor(name: string) {
        this.name = name;
        this.properties = {};
    }

    accept(v: Visitor) {
        v.visit(this);
    }

    walk(visitors: Visitor): void {
        this.accept(visitors);
        var state = visitors.state;
    }

    prettyPrint(indent: string = "", isLastChild: boolean = true): string {
        let output: string = indent + `+- ${this.name}\n`;
        indent += isLastChild ? "   " : "|  ";

        // print children too
        let keys: string[] = Object.getOwnPropertyNames(this.properties);
        let lastKey: string = keys[keys.length - 1];
        for (let key of Object.getOwnPropertyNames(this.properties)) {
            let child: any = this.properties[key];
            if (Array.isArray(child)) {
                let size: number = (child as Array<any>).length;
                for (let i = 0; i < size; i++) {
                    let childItem: any = child[i];
                    if (childItem instanceof Token) {
                        output += `${indent}+- \"${key}\" ${(childItem as Token).tokenName} [${(childItem as Token).tokenValue}]\n`;
                    } else {
                        output += (childItem as Node).prettyPrint(indent, i === size - 1);
                    }
                }
            } else {
                if (child instanceof Token) {
                    output += `${indent}+- \"${key}\" ${(child as Token).tokenName} [${(child as Token).tokenValue}]\n`;
                } else {
                    output += (child as Node).prettyPrint(indent, key === lastKey);
                }
            }
        }
        return output;
    }
}