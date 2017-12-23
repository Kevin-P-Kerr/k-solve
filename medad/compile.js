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

//var z = compile2viz("a b c ( d e f (f g ))\na d\te f\tc e")
//var map = {a:'f',g:'f'};
//var z = compile2viz("(a) b c ( d e f (g h ))\na d\ta g\te f\tc e",map)
var map = {};
map.a = 'ALX';
map.b = 'KILLS';
map.c = 'VICE';
var z = compile2viz("(a) b (c) \na b\tb c",map)
console.log(z);

