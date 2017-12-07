var fs = require('fs');

var str = fs.readFileSync("./hard.sat").toString();

var lines = str.split("\n");

var output = "";

lines.forEach(function (line) {
  output += "[";
  line = line.split(" ");
  line.forEach(function (el) {
    if (el == "0") {
      return;
    }
    if (el[0] == "-") {
      output += el.split("-")[1];
      output += " ";
    }
    else {
      output += ("("+el+") ");
    }
  });
  output += "]\n";
});

console.log(output);

