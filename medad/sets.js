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
map.G = 'EITHER';
axioms.push('(A) C (B)\nA C\tC B\tA B');
axioms.push('(D) C (E) \nD E\tC E\tD C');
axioms.push('(F) D (E (G))\nD E\tE G\tF D\tF G\tF G');
var pack = logicUtils.compileAxioms(axioms,map);
var lns = pack[1];
var graph = pack[0];
console.log(graph[0]);
lns.forEach(function (ln) { var nm = []; ln.matrix.forEach(function (p) { var x = logicUtils.simplifyProp(p); nm.push(x); }); ln.matrix = nm; console.log(println(ln)); });

console.log('***');
var ln = logicUtils.product(lns);
logicUtils.replaceVar(ln,'j','a');
logicUtils.replaceVar(ln,'k','b');
logicUtils.replaceVar(ln,'k','f');
logicUtils.replaceVar(ln,'j','e');
console.log(println(ln));
a();
var satP = logicUtils.compile2sat(ln,0);
console.log(satP.problem);
console.log(JSON.stringify(satP));
var a = sat.solve(satP.problem);
console.log(a);
