import { Visitor } from "./Visitor"
import { Dictionary } from "./Dictionary"
import { Token } from "./Token";

export class Node {
    Name: string;
    Properties: Dictionary<object>;

    constructor(name: string) {
        this.Name = name;
        this.Properties = {};
    }

    Accept(v: Visitor) {
        v.Visit(this);
    }



    prettyPrint(indent: string = "", isLastChild: boolean = false): string {
        let output: string = indent + `+- ${this.Name}\n`;
        indent += isLastChild ? "   " : "|  ";

        // print children too
        let keys: string[] = Object.getOwnPropertyNames(this.Properties);
        let lastKey: string = keys[keys.length - 1];
        for (let key of Object.getOwnPropertyNames(this.Properties)) {
            let child: any = this.Properties[key];
            if (Array.isArray(child)) {
                let size: number = (child as Array<any>).length;
                for (let i = 0; i < size; i++) {
                    let childItem: any = child[i];
                    if (childItem instanceof Token) {
                        output += `${key === lastKey ? "   " : "|  "}+- ${(childItem as Token).TokenName} [${(childItem as Token).TokenValue}]\n`;
                    } else {
                        output += (childItem as Node).prettyPrint(indent, i === size - 1);
                    }
                }
            } else {
                if (child instanceof Token) {
                    output += `${key === lastKey ? "   " : "|  "}+- ${(child as Token).TokenName} [${(child as Token).TokenValue}]\n`;
                } else {
                    output += (child as Node).prettyPrint(indent, key === lastKey);
                }
            }
        }
        return output;
    }
}