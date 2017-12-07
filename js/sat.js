var fs = require('fs');
// constants 
var LPAREN = 0;
var RPAREN = 1;
var VAR = 2;
var LBRAK = 3;
var RBRAK = 4;

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

var simplify = function (v, clauses) {
    var newClauses = [];
    clauses.forEach(function (clause) {
        if (isAtomic(clause)) {
            if (clause.val == v) {
                return;
            }
        }
        else if (clausePositiveContains(v,clause)) {
            return;
        }
        else if (clauseConflicts(v,clause)) {
            newClauses.push(null);
            return;
        }
        newClauses.push(copy(v,clause));
    });
    var i =0;
    var ii = newClauses.length;
    for (;i<ii;i++) {
        if (newClauses[i] == null) {
            return null; // there was a conflict
        }
    }
    var simpleNewClauses = [];
    newClauses.forEach(function (c) {
        if (isAtomic(c)) {
            simpleNewClauses.push(c);
        }
        else {
            simpleNewClauses.push(reduce(c));
        }
    });
    return simpleNewClauses;
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

var clausePositiveContains = function (v,clause) {
    var parenFlag = clause.type == LPAREN;
    var flag = false;
    clause.subClauses.forEach(function (c) {
        if (flag) { return; }
        if (c.type == VAR)  {
            if (c.val == v) {
                flag = parenFlag;
            }
        }
        else {
            flag = clausePositiveContains(v,c);
        }
    });
    return flag;
};

var clauseConflicts = function (v,c) {
    return (!isAtomic(c) && isSingleton(c) && c.type == LBRAK && c.subClauses[0].val == v);
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

// we know if this method is called the clause does not simply contain the val
// we also know the clause does not conflict
var copy = function (v,clause) {
    var copyClause = {type:clause.type};
    if (clause.type == LPAREN || clause.type == LBRAK) {
        copyClause.subClauses= [];
        clause.subClauses.forEach(function (c) {
            var cpy = copy(v,c);
            if (cpy == null) {
                return;
            }
            copyClause.subClauses.push(cpy);
        });
    }
    else if (clause.type == VAR) {
        if (clause.val == v) {
            return null;
        }
        else {
            copyClause.val = clause.val;
        }
    }
    else {
        throw new Error("what");
    }
    return copyClause;
};

var main = function () {
    var t = parse(tokenize("a[b 2+2([bc (a)])]"));
    console.log(JSON.stringify(t,null,2));
    console.log('!!!');
    t = simplify('a',t);
    console.log(JSON.stringify(t,null,2));
}
main();
