var fs = require('fs');
var solve = require('./sat.js');

var lits = {};
lits.numLit = /^[0-9]+/;
lits.varLit = /^[a-zA-Z]+/;
lits.plusLit = /^\+/;
lits.minusLit = /^-/;
lits.equalLit = /^=/;

var tokenize = function (str) {
  var tokens = [];
  var k,v,l;
  while (str.length) {
    for (k in lits) {
      v = lits[k];
      if (str.match(v)) {
        l = str.match(v)[0];
        tokens.push({val:l,type:k});
        str = str.split(v)[1];
      }
    }
  }
  return tokens;
};

var parseNum =  function (tokens) {
  var token = tokens.peek();
  if (token.type != "numLit" && token.type != "varLit") {
    throw new Error("parse error");
  }
  var next = tokens.peek();
  if (next && (next.type == "plusLit" || next.type == "minusLit")) {
    var right = parseNum(tokens);
    var op = {};
    op.type = "opExpr";
    op.val = next.val;
    op.left = token;
    op.right = right;
    return op;
  }
  else {
    tokens.push(next);
    return token;
  }
};

var makeTH = function (tokens) {
  var peek = function () { return tokens.shift(); };
  var push = function (t) { tokens.unshift(t); };
  return {peek:peek,push:push}; 
};

var parse = function (tokens) {
  var th = makeTH(tokens);
  var helper = function (th) {
    var ast = parseNum(th);
    var token = th.peek();
    if (token) {
      if (token.type == "equalLit") {
        var right = parseNum(th);
        var eq = {type:"equalExpr"};
        eq.left = ast;
        eq.right = right;
        return eq;
      }
      else {
        throw new Error("parse error");
      }
    }
    return ast;
  };
 return helper(th);
};

var x = parse(tokenize("2+2+2=6"));
console.log(x);


