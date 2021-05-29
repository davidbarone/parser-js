import { List } from "../src/List";

test("Test the List class", () => {
    let list: List<number> = List.create([1, 2, 3, 4, 5, 6, 7, 8]);

    // 5 rows (1 row for each column in the iris dataset)
    // 13 columns (name + 12 descriptive stats)
    expect(list.count).toBe(8);
});