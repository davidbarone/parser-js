import { Visitor } from "../src/Visitor"
import { Parser } from "../src/Parser"

export abstract class BaseEmployee {
    abstract doWork(): void;

    doTest(
        name: string,
        grammar: string,
        input: string,
        productionRule: string,
        visitor: Visitor,
        resultMapping: (result: any) => object,
        expected: Object,
        shouldThrowException: boolean
    ): void {
        let parser: Parser = new Parser()

    }
}