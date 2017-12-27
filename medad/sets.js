var logicUtils = require("./compile.js");
var sat = require("../js/sat.js");

var println = logicUtils.println;
var axioms = [];
var map = {};
map.A = 'CONTAINS';
map.B = 'CONTAINS';
map.C = 'CONTAINS';
map.D = 'IN';
map.E = 'IN';
map.F = 'INTERSECTS';
map.G = 'UNIONS';
axioms.push('(A) B (C)\nA B\tA C\tC B');
axioms.push('(D) E (C)\nD E\tE C\tD C');
axioms.push('(F) (D) E (G)\nD E\tE G\tF D\tF G\tF G');
var pack = logicUtils.compileAxioms(axioms,map);
var lns = pack[1];
var graph = pack[0];
console.log(graph[0]);
lns.forEach(function (ln) { var nm = []; ln.matrix.forEach(function (p) { var x = logicUtils.simplifyProp(p); nm.push(x); }); ln.matrix = nm; console.log(println(ln)); });
console.log('***');
var ln = logicUtils.product(lns);
logicUtils.replaceVar(ln,'g','a');
logicUtils.replaceVar(ln,'g','d');
logicUtils.replaceVar(ln,'h','b');
logicUtils.replaceVar(ln,'e','h');
logicUtils.replaceVar(ln,'i','c');
logicUtils.replaceVar(ln,'i','f');
console.log(println(ln));
var satP = logicUtils.compile2sat(ln,2);
console.log(satP.problem);
console.log(JSON.stringify(satP));
var a = sat.solve(satP.problem);
console.log(a);
