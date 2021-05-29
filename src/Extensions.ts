declare global {
    interface Object {
        union(obj: any): Array<any>;
    }
}

/**
 * Unions 2 objects together to return an Array. Individual
 * objects can be enumerables or plain objects.
 */
Object.prototype.union = function (obj: any): Array<any> {
    let a: object = this;
    let results: any[] = [];

    if (Array.isArray(a)) {
        results.push(...a);
    }
    else if (a)
        results.push(a);
    else
        throw ("Error performing union on undefined object!");

    if (Array.isArray(obj)) {
        results.push(...obj);
    }
    else if (obj)
        results.push(obj);
    else
        throw ("Error performing union on undefined object!");

    return results;
}

export { };