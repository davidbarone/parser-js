import { Parser } from "./Parser";

// Regex tests
let pattern = '"(?:[^"]|\\.)*"';
let grammar = "myrule: TEST;";
//let re = new RegExp(pattern);
//console.log(re.test(' "This is a blah"'));
let p = new Parser(grammar, "myrule");
