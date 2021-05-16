import { Visitor } from "./Visitor"
import { Dictionary } from "./Dictionary"

export class Node {
    Name: string;

    constructor(name: string) {
        this.Name = name;
        this.Properties = {};
    }

    Accept(v: Visitor) {
        v.Visit(this);
    }

    Properties: Dictionary<object>;
}