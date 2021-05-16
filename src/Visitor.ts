import { Node } from "./Node"
import { Dictionary } from "./Dictionary"

type VisitorActionType = (visitor: Visitor, node: Node) => void;

export class Visitor {
    Visitors: Dictionary<VisitorActionType>;
    State: any = null;
    
    constructor(initialState: any = null) {
        this.Visitors = {};
        if (initialState != null)
            this.State = initialState;
        else
            this.State = {};
    }

    DefaultVisitor(v: Visitor, n: Node): void {
        for (var key in n.Properties) {
            var item = n.Properties[key];
            if (item instanceof Node)
                item.Accept(v);
            else if (Array.isArray(item)) {
                item.forEach(a => {
                    if (a instanceof Node) {
                        a.Accept(v);
                    }
                });
            }
        }
    }

    AddVisitor(key: string, visitor: VisitorActionType): void {
        this.Visitors[key] = visitor;
    }

    Visit(node: Node): void {
        let name = node.Name;
        let matchedKeys = Object.keys(this.Visitors).filter(k => k.toLowerCase() === name.toLowerCase());
        if (matchedKeys.length == 0) {
            this.DefaultVisitor(this, node);
        }
        else {
            this.Visitors[matchedKeys[0]](this, node);
        }
    }
}