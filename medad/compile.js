var getAlphaGen = function () {
    var c = 'a';
    return function () {
        var d = c;
        c = String.fromCharCode(c.charCodeAt(0) + 1);
        return d;
    };
};

var compile2viz = function (src,nodeMap) {
    var prelude = "digraph G { ";
    src = src.split('\n');
    var subGraphs = src[0];
    var connections = src[1];
    var subclusterEnum = getAlphaGen();
    subGraphs = makeTokens(tokenize(subGraphs));
    var compileSubGraph = function (stem,graphColor,nodeColor, tokens,connections) {
        stem += "style=filled; color="+graphColor+"; node [style=filled,color="+nodeColor+"];";
        var token = tokens();
        while (token && token.type != RPAREN) {
            if (token.type == LPAREN) {
                var newNodeColor = getNextColor(nodeColor);
                var newGraphColor = getNextColor(graphColor);
                stem += compileSubGraph("subgraph cluster_"+subclusterEnum()+ " {",newGraphColor,newNodeColor,tokens);
            }
            else if (token.type == VAR) {
                var nodeName = token.val;
                var nodeLabel = nodeMap[nodeName];
                if (!nodeLabel) { nodeLabel = nodeName; }
                stem += nodeName + "[label="+nodeLabel+";]" +";";
            }
            token = tokens();
        }
        if (connections) {
            connections = connections.split('\t');
            connections.forEach(function (con) {
                con = con.split(' ');
                var ant = con[0];
                var cons = con[1]
                stem += (ant+ " -> " + cons +"; ");
            });
        }
        stem += " }";
        return stem;
    }
    var digraph = "digraph G { ";
    var n = compileSubGraph(digraph,"white","white",subGraphs,connections);
    return n;
};

var getNextColor = function (color) {
    if (color == "white") {
        return "lightgrey";
    }
    if (color == "lightgrey") {
        return "white";
    }
    throw new Error();
};

var makeTokens = function (tokens) {
    return function () {
        return tokens.shift();
    }
};

// constants 
var LPAREN = 0;
var RPAREN = 1;
var VAR = 2;
var NEGATE = 3;
var PRED = 4;
var THEREIS = 5;
var FORALL = 6;
var MULT = 7;

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
            while (isValidVarChar(str[i]) && i<ii) {
                name += str[i];
                i++;
            }
            i--;
            tokens.push({type:VAR,val:name});
        }
    }
    return tokens;
};

var makeConnectionsMap = function (connections,varGen) {
    connections = connections.split('\t');
    varGen = varGen || getAlphaGen();
    var map = {};
    map.inverse = {};
    connections.forEach(function (con) {
        con = con.split(' ');
        var v = varGen();
        var ant = con[0];
        var l = con[1];
        if (!map[ant]) {
            map[ant] = [];
        }
        if (!map[l]) {
            map[l] = [];
        }
        map[ant].push(v);
        map[l].unshift(v);
        map.inverse[v] = [ant,l];
    });
    return map;
};

var addQuantifiers = function (src,connections) {
    var quants = [];
    var subGraphs = src[0];
    subGraphs = makeTokens(tokenize(subGraphs));
    var helper = function (tokens) {
        token = tokens();
        var inter = [];
        while (token && token.type != RPAREN) {
            if (token.type == LPAREN) {
                inter.push(helper(tokens));
            }
            else if (token.type == VAR) {
                inter.push(token.val);
            }
            token = tokens();
        }
        return inter;
    };
    var ordered = helper(subGraphs);
    var k,v;
    for (k in connections.inverse) {
        v = connections.inverse[k];
        var a = v[0];
        var b = v[1];
        var n = findHighest(a,b,ordered);
        var qf;
        if (n < 0) { qf = true;} 
        else { qf = n%2==0; }
        addQuant(quants,k,qf);
    }
    return quants;
};

var isArray = function (a) {
    return Object.prototype.toString.call(a).match('Array');
};

var findHighest = function (a,b,ordered) {
    var helper = function (x,o) {
        var i = 0;
        var ii = o.length;
        var s;
        for (;i<ii;i++) {
            s = o[i];
            if (s == x) { return i; }
            if (isArray(s)) {
                if (helper(x,s) >= 0) {
                    return i;
                }
            }
        }
        return -1;
    };
    var first = function (index,a,b,c) {
        var i =0;
        var ii = index.length;
        var ac,bc;
        for (;i<ii;i++) {
            if (index[i] == a || index[i] == b) {
                return c;
            }
            else if (isArray(index[i])) {
                if (helper(a,index[i])>=0) {
                    ac = first(index[i],a,b,c+1);
                }
                if (helper(b,index[i])>=0) {
                    bc = first(index[i],a,b,c+1);
                }
            }
        }
        if (ac && bc) {
            return Math.min(ac,bc);
        }
        return ac ? ac : bc;
    };
    var indexone = helper(a,ordered);
    var indextwo = helper(b,ordered);
    if (indexone != indextwo) { return -1; }
    else {
        var index = ordered[indexone];
        return first(index,a,b,1);
    }
};

var compile2line = function (src,map,gen) {
    src = src.split('\n');
    var subGraphs = src[0];
    var connections = src[1];
    subGraphs = makeTokens(tokenize(subGraphs));
    var lineInternal = {};
    connections = makeConnectionsMap(connections,gen);
    lineInternal.prefix = addQuantifiers(src,connections);
    var compileProp = function (tokens) {
        var token = tokens();
        var props = [];
        while (token && token.type != RPAREN ) {
            var prop = {};
            if (token.type == LPAREN) {
                prop.type = NEGATE;
                prop.body = compileProp(tokens);
            }
            else if (token.type == VAR) {
                prop.type = PRED;
                prop.name = map[token.val];
                prop.body = connections[token.val];
            }
            props.push(prop);
            token = tokens();
        }
        return props;
    };
    lineInternal.matrix = compileProp(subGraphs,true);
    return lineInternal;
};

var printProp = function (prop) {
    var p = "";
    if (prop.type == MULT) {
        p = printProp(prop.body[0]) +"*"+printProp(prop.body[1]);
    }
    if (prop.type == NEGATE) {
        p = "~(";
        var first = true;
        prop.body.forEach(function (body) {
            if (first) {
                first = false;
                p += printProp(body);
            }
            else {
                p += " + " + printProp(body);
            }
        });
        p += ")";
    }
    else if (prop.type == PRED) {
        p += prop.name+"(";
        prop.body.forEach(function (v) {
            p+=v+" ";
        });
        p+=")";
    }
    return p;
};

var println = function (line) {
    var str = "";
    line.prefix.forEach(function (pref) {
        if (pref.type == FORALL) {
            str += "forall ";
        }
        else {
            str += "there is ";
        }
        str += pref.val+" ";
    });
    str += ":"
    var first = true;
    line.matrix.forEach(function (prop) {
        if (first) {
            first = false;
            str += printProp(prop);
        }
        else {
            str += " + " + printProp(prop);
        }
    });
    return str;
}; 

var quantContains = function(prefix,val) {
    var i = 0;
    var ii = prefix.length;
    for (;i<ii;i++) {
        if (prefix[i].val == val) { return true;}
    }
    return false;
}; 

var addQuant = function (prefix,val,quantFlag) {
    quant = quantFlag ? FORALL : THEREIS;
    if (quantContains(prefix,val)) {
        return;
    }
    prefix.push({type:quant,val:val});
};

var compileAxioms = function (srcs,map) {
    var lines = [];
    var canonicalGen = getAlphaGen();
    srcs.forEach(function (src) {  lines.push(compile2line(src,map,canonicalGen)); });
    return lines;
};

var multiply = function (a,b) {
    var c = {};
    c.prefix = [];
    a.prefix.forEach(function (p) { c.prefix.push(p); });
    b.prefix.forEach(function (p) { c.prefix.push(p); });
    c.matrix = [];
    a.matrix.forEach(function (aa) {
        b.matrix.forEach(function (bb) {
            var n = {};
            n.type = MULT;
            n.body = [aa,bb];
            c.matrix.push(n);
        });
    });
    return c;
};

var replace = function (p,t,f) {
    var i = 0;
    var ii = p.prefix.length;
    for (;i<ii;i++) {
        if (p.prefix[i].val == f) {
            break;
        }
    }
    p.prefix.splice(i,1);
    var helper = function (props) {
        props.forEach(function (subp) {
            if (subp.type == PRED && subp.body.indexOf(f) >= 0) {
                var dex = subp.body.indexOf(f);
                subp.body[dex] = t;
            }
            if (subp.type == MULT) {
                helper([subp.body[0]]);
                helper([subp.body[1]]);
            }
            if (subp.type == NEGATE) {
                helper(subp.body);
            }
        });
    };
    helper(p.matrix);
    // for chaining
    return p;
};

//var z = compile2viz("a b c ( d e f (f g ))\na d\te f\tc e")
//var map = {a:'f',g:'f'};
//var z = compile2viz("(a) b c ( d e f (g h ))\na d\ta g\te f\tc e",map)
var map = {};
map.A = "MOTHER";
map.B = "LOVES";
var z = compile2line("(A) B\nA B\tB A",map)
console.log(println(z));
//console.log(z);
var map = {};
map.A = 'MIKE';
map.B = 'LIVES';
map.C = '3rdFloor';
map.D = 'SARAH';
map.E = 'LIVES';
map.F = 'EITHER';
map.G = '2ndFloor';
map.H = '1stFloor';
map.I = 'MATT';
map.J = 'LIVES';
map.K = 'EITHER';
map.L = '2ndFloor';
map.M = '1stFloor';
map.N = 'SARAH';
map.O = 'CANNOT LIVE';
map.P = 'ADJACENT';
map.Q = 'MIKE';
map.R = '3rdFloor';
map.S = 'ADJACENT';
map.T = '2ndFloor';
var axioms = [];
axioms.push("(A) B (C)\nA B\tB C");
axioms.push("(D) E (F (G) (H))\nD E\tE F\tF G\tF H");
axioms.push("(I) J (K (L) (M))\nI J\tJ K\tK L\tK M");
axioms.push("(N) O (P (Q))\nN O\tO P\tP Q");
axioms.push("(R) S (R)\nR S\tS R");
var lns = compileAxioms(axioms,map);
lns.forEach(function (ln) {
    console.log(println(ln));
});
