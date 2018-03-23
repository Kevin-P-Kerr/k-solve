#! /usr/local/bin/node

var logicUtils = require("./compile.js");
var utils = require("./utils.js");
var sat = require("../js/sat.js");
/*
    plan =: {Expr | Stmt}
    Expr =: AssignExpr | MultExpr | SimplifyExpr | ReplaceExpr
    Stmt =: PrintStmt
    PrintStmt =: Print(LogicExpr)
    AssignExpr =: Var = Expr
    MultExpr = LogicExpr * LogicExpr
    SimplifyExpr = Simplify(LogicExpr)
    ReplaceExpr = Replace(VarLit,LogicExpr)
    LogicExpr = LogicLit | VarExpr
*/

var interp = function (str) {
    var variables = {};
    var lines = str.split('\n');
    lines.forEach(function (ln) {
        interpLn(variables,ln);
    });
};

var interpLn = function (vars,ln) {
    if (ln.match("//")) {
        return;
    }
    if (ln.match("print")) {
        interpPrint(vars,ln);
        return;
    }
    if (ln.match('=')) {
        interpAssign(vars,ln);
        return;
    }
    return interpLogicExpr(vars,ln);
};

var interpPrint = function (vars,ln) {
    ln = ln.split("print")[1];
    ln = ln.split("(")[1];
    ln = ln.split(")")[0];
    ln = ln.trim();
    ln = interpLogicExpr(vars,ln);
    var s = logicUtils.println(ln);
    console.log(s);
};

var interpAssign = function (vars,ln) {
    ln = ln.split("=");
    var lh = ln[0].trim();
    var rh = interpLogicExpr(vars,ln[1]);
    vars[lh] = rh;
};

var interpLogicExpr = function (vars,ln) {
    if (ln.match("simplify")) {
        return simplify(vars,ln);
    }
    if (ln.match("replace")) {
        return replace(vars,ln);
    }
    if (ln.indexOf("*")>0) {
        return mult(vars,ln);
    }
    if (ln.match("forall") || ln.match("thereis")) {
        return logicUtils.compileLine(ln);
    }
    return vars[ln.trim()];
};

var simplify = function (vars,ln) {
    ln = ln.split("simplify")[1];
    ln = ln.split("(")[1];
    ln = ln.split(")")[0];
    ln = ln.trim();
    var v = interpLogicExpr(vars,ln);
    var m = logicUtils.removeContradictions(v.matrix);
    v.matrix = m;
    return v;
};

var replace = function (vars, ln) {
    ln = ln.split("replace")[1];
    ln = ln.split("(")[1];
    ln = ln.split(")")[0];
    ln = ln.split(",");
    var prop = interpLogicExpr(vars,ln[0].trim());
    var to = ln[1].trim();
    var from = ln[2].trim();
    return logicUtils.replaceVar(prop,to,from);
};

var mult = function (vars,ln) {
    ln = ln.split("*");
    var op1 = ln[0].trim();
    var op2 = ln[1].trim();
    op1= interpLogicExpr(vars,op1);
    op2 = interpLogicExpr(vars,op2);
    return logicUtils.multiply(op1,op2);
};

var file = process.argv[2];
var fs = require('fs');
var s = fs.readFileSync(file);
interp(s.toString());

