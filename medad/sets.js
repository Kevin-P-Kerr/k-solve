var logicUtils = require("./compile.js");
var utils = require("./utils.js");
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
lns.forEach(function (ln) { console.log(println(ln)); });
console.log('**');
lns.forEach(function (ln) { var nm = []; ln.matrix.forEach(function (p) { var x = logicUtils.simplifyProp(p); nm.push(x); }); ln.matrix = nm; });
lns.forEach(function (ln) { console.log(println(ln)); });
var graph = pack[0];
var conv = logicUtils.convolute(lns,2);
conv.forEach(function (ln) {
  console.log('******');
  console.log(println(ln));
});
var m = {};
m['.b'] = '.j'
m['.c'] = '.k'
m['.f'] = '.j';
m['.e'] = '.k';
m['.m'] = '.j';
m['.n'] = '.k';
m['.q'] = '.j';
m['.r'] = '.k';
m['.t'] = '.i';
m['.u'] = '.j';
m['.v'] = '.k';
var i =0;
var ii = 1000;
for (;i<ii;i++) {
  var satP = logicUtils.compile2sat(conv,m,i);
  var a = sat.solve(satP.problem);
  console.log(utils.printSolution(a,satP.varTable,satP.trueProp));
}
