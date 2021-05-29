import { List } from "../src/List";

test("list.count", () => {
    let list: List<number> = List.create([1, 2, 3, 4, 5, 6, 7, 8]);

    // 5 rows (1 row for each column in the iris dataset)
    // 13 columns (name + 12 descriptive stats)
    expect(list.count).toBe(8);
});

test("list.add", () => {
    let list: List<number> = List.create([1, 2, 3, 4, 5, 6, 7, 8]);

    // 5 rows (1 row for each column in the iris dataset)
    // 13 columns (name + 12 descriptive stats)
    list.add(9);
    expect(list.count).toBe(9);
});

test("list.where", () => {
    let list: List<number> = List.create([1, 2, 3, 4, 5, 6, 7, 8]);
    list = list.where(l => l <= 5);

    // 5 rows (1 row for each column in the iris dataset)
    // 13 columns (name + 12 descriptive stats)
    expect(list.count).toBe(5);
});