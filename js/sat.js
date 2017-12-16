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

var copy = function (v,clause) {
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
    if (conflictTable[a.name] && Math.round(Math.random()*100) > conflictTable[a.name]) {
        return -1;
    }
    if (conflictTable[b] && Math.round(Math.random()*100) > conflictTable[b]) {
        return 1;
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

var solvePartial = function (variable, clauses,trueVars,falseVars,positive) {
  console.log('removing ' + variable+' '+positive);
  // at this point, we might be trying to assign an already discovered variable to its opposite value
  if (positive && falseVars.indexOf(variable) >= 0) {
    return false;
  }
  if (!positive && trueVars.indexOf(variable) >= 0) {
    return false;
  }
  var cpy = simplify(variable,clauses,!positive);
  if (cpy == null) {
    console.log("discovered conflict",variable,positive);
    print(clauses);
    return false;
  }
  if (fullyResolved(cpy,falseVars)) {
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

var eliminate = function (v,clauses,positive) {
  var newClauses = [];
  clauses.forEach(function (cl) {
    if (cl.type == VAR) { throw new Error(); }
    var clausePositive = cl.type == LPAREN;
    if (clausePositive) {
      if (isSingleton(clause) && (clause.subClauses[0].val == v)) { 
        return; 
      }
    }
    else {
      if (positive) {
        if (negativeClauseContains(clauses,v,positive)) {
          return;
        }
      }
      else {
        if (negativeClauseContains(clauses,v,false));
          return;
      }
    }
    newClauses.push(reduce(copy(cl,v,positive)));
  });
  return newClauses;
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
  singlePositives.forEach(function (v) {
    clauses = elminate(v,clauses,true);
    trueVars.push(v);
  });
  singleNegatives.forEach(function (v) {
    clauses = eliminate(v,clauses,false);
    falseVars.push(v);
  });
  singlePositives = getSinglePositives(clauses);
  singleNegatives = getSingleNegatives(clauses);
  if (singlePositives.length || singleNegatives.length) {
    return fullyReduceClauses(clauses,trueVars,falseVars);
  }
  return clauses;
};
  

var solve = function (clauses,trueVars,falseVars) {
  if (!consistent(clauses)) {
    return false;
  }
  var copyVariables = copyVariables(trueVars,falseVars);

  clauses = fullyReduceClauses(clauses,trueVars,falseVars);
  var retCond = checkReturnCondition(clauses,trueVars,falseVars);
  if (retCond == false) {
    unwind(copyVariables,trueVars,falseVars);
    return false;
  }
  if (retCond) { return retCond; }
  var variables = getVariableOrder(clauses);
  var  i =0;
  var ii = variables.length;
  for (;i<ii;i++) {
    if(solvePartial(clauses,variables[i],trueVars,falseVars,false)) {
      return [trueVars,falseVars];
    }
    if(solvePartial(clauses,variables[i],trueVars,falseVars,true)) {
      return [trueVars,falseVars];
    }
  }
  retCond = checkReturnCondition(clauses,trueVars,falseVars);
  if (retCond) { return retCond; }
  unwind(copyVariables,trueVars,falseVars);
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
  var t = parse(tokenize(fs.readFileSync("./question.test").toString()));
  var a = solve(t);
  printAnswer(a,t);
}

main();


