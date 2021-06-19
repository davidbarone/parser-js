import { Node } from "./Node"
import { Dictionary } from "./Dictionary"

type VisitorActionType = (visitor: Visitor, node: Node) => void;

export class Visitor {
    visitors: Dictionary<VisitorActionType>;
    state: any = null;

    constructor(initialState: any = null) {
        this.visitors = {};
        if (initialState != null)
            this.state = initialState;
        else
            this.state = {};
    }

    defaultVisitor(v: Visitor, n: Node): void {
        for (var key in n.properties) {
            var item = n.properties[key];
            if (item instanceof Node)
                item.accept(v);
            else if (Array.isArray(item)) {
                item.forEach(a => {
                    if (a instanceof Node) {
                        a.accept(v);
                    }
                });
            }
        }
    }

    addVisitor(key: string, visitor: VisitorActionType): void {
        this.visitors[key] = visitor;
    }

    visit(node: Node): void {
        let name = node.name;
        let matchedKeys = Object.keys(this.visitors).filter(k => k.toLowerCase() === name.toLowerCase());
        if (matchedKeys.length == 0) {
            this.defaultVisitor(this, node);
        }
        else {
            this.visitors[matchedKeys[0]](this, node);
        }
    }
}