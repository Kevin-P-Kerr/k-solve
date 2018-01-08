var logicUtils = require("./compile.js");
var utils = require("./utils.js");
var sat = require("../js/sat.js");

var println = logicUtils.println;
var axioms = [];
axioms.push('forall a forall b thereis c: ~CONTAINS(a b) + IN(c b)*~IN(a c)');
var s = logicUtils.compileLine(axioms[0]);
console.log(println(s));
a();
axioms.push('forall a forall b forall c thereis d: ~INTERSECTS(a b) + IN(d c)*IN(d b)*~IN(d a)');
var pack = logicUtils.compileAxioms(axioms,map);
var lns = pack[1];
lns.forEach(function (ln) { console.log(println(ln)); });
console.log('**');
lns.forEach(function (ln) { var nm = []; ln.matrix.forEach(function (p) { var x = logicUtils.simplifyProp(p); nm.push(x); }); ln.matrix = nm; });
lns.forEach(function (ln) { console.log(println(ln)); });
var graph = pack[0];
var conv = logicUtils.convolute(lns,2);
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
