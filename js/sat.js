var fs = require('fs');
// constants 
var LPAREN = 0;
var RPAREN = 1;
var VAR = 2;
var LBRAK = 3;
var RBRAK = 4;

var DEBUG = true;
var setDebug = (function () {
    var c = console.log;
    return function () {
        if (DEBUG) {
            console.log = c;
        }
        else {
            console.log = function () {};
        }
    };
})();

setDebug();

var iswhite = function (c) {
    return c == ' ' || c == '\n' || c == '\t';
};

var isValidVarChar = function (c) {
    return !iswhite(c) && c != '(' && c != ')' && c != '[' && c != ']';
};

var tokenize = function (str) {
    var tokens = [];
    var i=0;
    var ii = str.length;
    for (;i<ii;i++) {
        var c = str[i];
        if (iswhite(c)) {
            continue;
        }
        if (c == '(') {
            tokens.push({type:LPAREN});
        }
        else if (c ==')') {
            tokens.push({type:RPAREN});
        }
        else if (c=='[') {
            tokens.push({type:LBRAK});
        }
        else if (c == ']') {
            tokens.push({type:RBRAK});
        }
        else {
            var name = '';
            while (isValidVarChar(str[i])) {
                name += str[i];
                i++;
            }
            i--;
            tokens.push({type:VAR,val:name});
        }
    }
    return tokens;
};

var parseL = function (token,th) {
    var clause = {};
    clause.subClauses = [];
    clause.type = token.type;
    var closingType;
    if (token.type == LPAREN)  {
        closingType = RPAREN;
    }
    else {
        closingType = RBRAK;
    }
    var currentToken;
    while ((currentToken = th()) && currentToken.type != closingType) {
        if (currentToken.type == VAR) {
            clause.subClauses.push(currentToken);
        }
        else if (currentToken.type == LPAREN) {
            clause.subClauses.push(parseL(currentToken,th));
        }
        else if (currentToken.type == LBRAK) {
            clause.subClauses.push(parseL(currentToken,th));
        }
        else {
            throw new Error("can't parse!");
        }
    }
    return clause;
};

var parse = function (tokens) {
    var th = function () { return tokens.shift(); };
    var clauses = [];
    var currentToken;
    while ((currentToken = th())) {
        if (currentToken.type == VAR) {
            clauses.push(currentToken);
        }
        else if (currentToken.type == LPAREN) {
            clauses.push(parseL(currentToken,th));
        }
        else if (currentToken.type == LBRAK) {
            clauses.push(parseL(currentToken,th));
        }
        else {
            console.log(clauses);
            console.log(currentToken);
            throw new Error("whoops");
        }
    }
    return clauses;
};

var isReducible = function (clause) {
    return isSingleton(clause) && clause.subClauses[0].type != VAR;
};

// we know this won't be called on atomic clauses
// [([([a])])] = [a] 
// 
var reduce = function (clause) {
    var reducedClause = {};
    if (!isReducible(clause)) {
        reducedClause.type = clause.type;
        reducedClause.subClauses = [];
        clause.subClauses.forEach(function (c) {
            if (isAtomic(c)) {
                reducedClause.subClauses.push(c);
            }
            else {
                var rdc = reduce(c);
                if (!isEmpty(rdc)) {
                    // double negative
                    if (rdc.type == clause.type) {
                        rdc.subClauses.forEach(function (rdcsc) {
                            reducedClause.subClauses.push(rdcsc);
                        });
                    }
                    else {
                        reducedClause.subClauses.push(rdc);
                    }
                }
            }
        });
        return reducedClause;
    }
    else {
        return reduce(clause.subClauses[0]);
    }
};

var isSingleton = function (c) {
    return c.subClauses.length == 1;
};

var isEmpty = function (c) {
    return !isAtomic(c) && (c.subClauses.length == 0 || 
        (isSingleton(c) && isEmpty(c.subClauses[0])));
};

var isAtomic = function (c) {
    return !c.subClauses || c.type == VAR;
}

// copy cannot take a clause of type VAR
// also, we know that this clause is not eligible for elimination relative to this variable
var copy = function (clause,v) {
  var newClause = {type:clause.type};
  newClause.subClauses = [];
  clause.subClauses.forEach(function (cl) {
    if (cl.type == VAR) {
      if (cl.val != v) {
        newClause.subClauses.push(cl);
      }
    }
    else {
      var sbcl = reduce(copy(cl,v));
      if (!isEmpty(sbcl)) {
        newClause.subClauses.push(sbcl);
      }
    }
  });
  return newClause;
};

var getVariableOrder = function (clauses) {
  var helper = function (variables, clauses) {
    clauses.forEach(function (c) {
      if (isAtomic(c)) {
        if (variables[c.val]) {
          variables[c.val] += 1;
        }
        else {
          variables[c.val] = 1;
        }
      }
      else {
        helper(variables,c.subClauses);
      }
    });
    return variables;
  };
  var variables =  helper({},clauses);
  var singlePositives = getSinglePositives(clauses);
  var singleNegatives = getSingleNegatives(clauses);
  singlePositives.forEach(function (p) {
      variables[p] = Infinity;
  });
  singleNegatives.forEach(function (p) {
      variables[p] = Infinity;
  });
  var arr = [];
  var k;
  for (k in variables) {
    var rec = {};
    rec.name = k;
    rec.count = variables[k];
    arr.push(rec);
  }
  arr.sort(function (a,b) {
    if (a.count == Infinity) {
        return -1;
    }
    if (b.count == Infinity) {
        return 1;
    }
    if (a.count == -Infinity) {
        return 1;
    }
    if (b.count == -Infinity) {
        return -1;
    }
    if (Math.round(Math.random() * 100) < 5) {
        return 1;
    }
    if (a.count < b.count) {
      return 1;
    }
    else {
      return -1;
    }
  });
  var ret  =[];
  arr.forEach(function (a) {
    ret.push(a.name);
  });
  return ret;
};

var fullyResolved = function (clauses,falseVariables) {
  return false;
  var  i =0;
  var ii = clauses.length;
  var c;
  var falses = [];
  for (;i<ii;i++) {
    c = clauses[i];
    if (!(isAtomic(c) || (isSingleton(c) && c.type != LPAREN))) {
      return false;
    }
    else if (isSingleton(c)) { falses.push(c.subClauses[0].val) }
  }
  falses.forEach(function (f) { falseVariables.push(f); });
  return true;
};

var printcl = function (clauses) {
  var lineLevel = -1;
  var helper = function (clauses) {
    var str = '';
    lineLevel++;
    clauses.forEach(function (c) {
      if (isAtomic(c)) {
        str += (c.val+" ");
      }
      else if (c.type == LPAREN) {
        str += '(';
        str += helper(c.subClauses);
        str += ')';
      if (lineLevel ==0) { str += "\n"; }
      }
      else if (c.type == LBRAK) {
        str += '[';
        str += helper(c.subClauses);
        str += ']';
      if (lineLevel ==0) { str += "\n"; }
      }
      else {
        throw new Error('yikes');
      }
    });
    lineLevel--;
    return str;
  };
  return helper(clauses);
};

var print = function (clauses) {
  console.log(printcl(clauses));
};

var solvePartial = function (clauses,variable,trueVars,falseVars,positive) {
  console.log('removing ' + variable+' '+positive);
  var cpy;
  try {
    cpy = eliminate(clauses,variable,positive);
  }
  catch (e) {
    console.log('conflict in solve partial',variable);
    return false;
  }
  if (cpy.length == 0) {
    return true;
  }
  return solve(cpy,trueVars,falseVars);
};

var getSinglePositives = function (clauses) {
    var pos = [];
    var helper = function (clauses) {
        clauses.forEach(function (c) {
            if (!isAtomic(c)) {
                if (isSingleton(c) && !isReducible(c)) {
                    if (c.type == LPAREN) {
                        pos.push(c.subClauses[0].val);
                    }
                }
            }
        });
    }
    helper(clauses);
    return pos;
};

var getSingleNegatives = function (clauses) {
    var pos = [];
    var helper = function (clauses) {
        clauses.forEach(function (c) {
            if (!isAtomic(c)) {
                if (isSingleton(c) && !isReducible(c)) {
                    if (c.type == LBRAK) {
                        pos.push(c.subClauses[0].val);
                    }
                }
            }
        });
    }
    helper(clauses);
    return pos;
};

var negativeClauseContains = function (clauses,v,positive) {
  var i = 0;
  var ii = clauses.length;
  var sc;
  for (;i<ii;i++) {
    sc = clauses[i];
    if (sc.type == VAR && sc.type == v && !positive) {
      return true;
    }
    if (sc.type == LPAREN && isSingleton(sc) && sc.subClauses[0].val == v && positive) {
      return true;
    }
    if (sc.type == LBRAK && negativeClauseContains(sc.subClauses,v,positive)) {
      return true;
    }
  }
  return false;
};

var eliminate = function (clauses,v,positive) {
  var newClauses = [];
  clauses.forEach(function (cl) {
    if (cl.type == VAR) { throw new Error(); }
    var clausePositive = cl.type == LPAREN;
    if (clausePositive) {
      if (isSingleton(cl) && (cl.subClauses[0].val == v)) { 
        if (!positive) {
          //conflict
          throw new Error();
        }
      }
    }
    else {
      if (isSingleton(cl) && cl.subClauses[0].val == v && positive) {
        throw new Error(); // conflict
      }
      if (positive) {
        if (negativeClauseContains(cl.subClauses,v,positive)) {
          return;
        }
      }
      else {
        if (negativeClauseContains(cl.subClauses,v,false));
          return;
      }
    }
    var nc = reduce(copy(cl,v,positive));
    if (!isEmpty(nc)) {
      newClauses.push(nc);
    }
  });
  return newClauses;
};

var consistentVars = function (trueVars,falseVars) {
  var i,ii,p,n;
  for (i=0,ii=trueVars.length;i<ii;i++) {
    p = trueVars[i];
    if (falseVars.indexOf(p) >= 0) {
      return false;
    }
  }
  for (i=0,ii=falseVars.length;i<ii;i++) {
    n = falseVars[i];
    if (trueVars.indexOf(n) >= 0) {
      return false;
    }
  }
  return true;
};

var checkReturnCondition = function (clauses,trueVars,falseVars) {
  if (!consistentVars(trueVars, falseVars) || !consistent(clauses)) {
    return false;
  }
  if (clauses.length == 0) {
    return [trueVars,falseVars];
  }
};

var fullyReduceClauses = function (clauses,trueVars,falseVars) {
  var singlePositives = getSinglePositives(clauses);
  var singleNegatives = getSingleNegatives(clauses);
  try {
    singlePositives.forEach(function (v) {
      clauses = eliminate(clauses,v,true);
      trueVars.push(v);
    });
    singleNegatives.forEach(function (v) {
      clauses = eliminate(clauses,v,false);
      falseVars.push(v);
    });
  } catch (e) {
    return false;
  }
  singlePositives = getSinglePositives(clauses);
  singleNegatives = getSingleNegatives(clauses);
  if (singlePositives.length || singleNegatives.length) {
    return fullyReduceClauses(clauses,trueVars,falseVars);
  }
  return clauses;
};

var consistent = function (clauses) {
  var singlePositives = getSinglePositives(clauses);
  var singleNegatives = getSingleNegatives(clauses);
  var i,ii,p,n;
  for (i=0,ii=singlePositives.length;i<ii;i++) {
    p = singlePositives[i];
    if (singleNegatives.indexOf(p) >= 0) {
      return false;
    }
  }
  for (i=0,ii=singleNegatives.length;i<ii;i++) {
    n = singleNegatives[i];
    if (singlePositives.indexOf(n) >= 0) {
      return false;
    }
  }
  return true;
};
  
var copyVariables = function (trueVars,falseVars) {
  var t = [];
  var f = [];
  trueVars.forEach(function (tt) { t.push(tt); });
  falseVars.forEach(function (ff) { f.push(ff); });
  return [t,f];
};

var unwindVariables = function (copy,trueVars,falseVars) {
  while (trueVars.pop()) {} 
  while (falseVars.pop()) {}
  copy[0].forEach(function (tt) { trueVars.push(tt); });
  copy[1].forEach(function (ff) { falseVars.push(ff);});
};

var solve = function (clauses,trueVars,falseVars) {
  console.log("solving");
  print(clauses);
  trueVars = trueVars || [];
  falseVars = falseVars || [];
  if (!consistent(clauses)) {
    return false;
  }
  var copiedVars = copyVariables(trueVars,falseVars);

  clauses = fullyReduceClauses(clauses,trueVars,falseVars);
  if (!clauses) {
    return false;
  }
  console.log("after reduction");
  print(clauses);
  var retCond = checkReturnCondition(clauses,trueVars,falseVars);
  if (retCond == false) {
    unwindVariables(copiedVars,trueVars,falseVars);
    return false;
  }
  if (retCond) { return retCond; }
  var variables = getVariableOrder(clauses);
  var  i =0;
  var ii = variables.length;
  var currentVar;
  for (;i<ii;i++) {
    currentVar = variables[i];
    falseVars.push(currentVar);
    if(solvePartial(clauses,variables[i],trueVars,falseVars,false)) {
      return [trueVars,falseVars];
    }
    falseVars.pop();
    trueVars.push(currentVar);
    if(solvePartial(clauses,variables[i],trueVars,falseVars,true)) {
      return [trueVars,falseVars];
    }
    trueVars.pop();
  }
  retCond = checkReturnCondition(clauses,trueVars,falseVars);
  if (retCond) { return retCond; }
  unwindVariables(copiedVars,trueVars,falseVars);
  return false;
};

var printAnswer = function (answer,clauses) {
    var d = DEBUG;
    DEBUG = true;
    setDebug();
    if (!answer) { console.log("no solution"); }
    else {
        answer = getAnswer(answer,clauses);
        console.log("positive vars: ");
        console.log(answer[0][0]);
        console.log("negative vars:");
        console.log(answer[0][1]);
        console.log("undetermined vars:");
        console.log(answer[1]);
    }
    DEBUG = d;
    setDebug();
};

var getAnswer = function (answer,clauses) {
  if (!answer) { return null; }
  var variables = getVariableOrder(clauses);
  var undetermined = [];
  var trueVariables = answer[0];
  var falseVariables = answer[1];
  variables.forEach(function (v) {
      if (trueVariables.indexOf(v) < 0) {
          if (falseVariables.indexOf(v) <0) {
            undetermined.push(v);
          }
      }
  });
  return [answer,undetermined];
}

var main = function () {
  console.log("solving");
  var t = parse(tokenize(fs.readFileSync("./hard.test").toString()));
  //var t = parse(tokenize("(a)[a b (d)](b)"));
  var a = solve(t);
  printAnswer(a,t);
}

main();


