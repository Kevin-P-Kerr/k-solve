var logicUtils = require("./compile.js");
var utils = require("./utils.js");
var sat = require("../js/sat.js");

var println = logicUtils.println;
var axioms = [];
axioms.push("forall a forall b thereis c : CONTAINS(a b) + IN(c b)*~IN(c a)");
axioms.push("forall d thereis f: EMPTY(d) + IN(f d)");
axioms.push("forall g forall h forall i thereis j: INTERSECT(i g h) + IN(j i)*~IN(j h) + IN(j i)*~IN(j g) + ~IN(j i)*IN(j h)*IN(j g)");

axioms = [axioms[2]];
var compAx = [];
axioms.forEach(function (ax) {
    var ln = logicUtils.compileLine(ax);
    var nm = [];
    ln.matrix.forEach(function (p) { var x = logicUtils.simplifyProp(p); nm.push(x); });
    ln.matrix = nm;
    compAx.push(ln);
});
var map = {};
map['.g'] = '.b';
map['.j'] = '.b';
map['.k'] = '.c';
var i = 0;
var ii =4;
var conv = logicUtils.convolute(compAx,2);
console.log(println(logicUtils.product(conv)));
for (i=0,ii=64;i<ii;i++) {
    satP = logicUtils.compile2sat(conv,map,i);
    a = sat.solve(satP.problem);
    var s = utils.printSolution(a,satP.varTable,satP.trueProp);
    if (s.match("\n")) {
        console.log(s);
        console.log('***');
    }
}
