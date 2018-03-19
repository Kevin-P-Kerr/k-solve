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
*/


