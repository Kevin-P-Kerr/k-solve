#include <stdio.h>
#include <stdlib.h>
#define MAXTOKEN 2000
#define LPAREN 0
#define RPAREN 1
#define VAR 2
#define LBRAK 3
#define RBRAK 4

int ARRSIZE =0;
struct Token {
  int deleted;
  int type;
  char value;
};

char killWhite(char c) {
  while (c == '\n' || c == ' ' || c == '\t') {
    c = getchar();
  }
  return c;
}

struct Token* tokenize() {
  char c;
  int i =0;
  struct Token* tokens = malloc(sizeof(struct Token)*MAXTOKEN);
  while ((c=getchar())!=EOF) {
    c = killWhite(c);
    struct Token* t = &tokens[i];
    t->deleted = 0;
    if (c == '(') {
      t->type = LPAREN;
    }
    else if (c == ')') {
      t->type = RPAREN;
    }
    else if (c == '[') {
      t->type = LBRAK;
    }
    else if (c == ']') {
      t->type = RBRAK;
    }
    else {
      t->type = VAR;
      // for now, vars are 1 char
      t->value = c;
    }
    i++;
  }
  ARRSIZE = i;
  return tokens;
}

void fp (char c) {
  fprintf(stderr,"%c",c);
}

void p (struct Token* t) {
  int i,ii;
  for (i=0,ii=ARRSIZE;i<ii;i++) {
    struct Token* tok = &t[i];
    if (tok->type == LPAREN) {
      fp('(');
    }
    else if (tok->type == RPAREN) {
      fp(')');
    }
    else if (tok->type == RBRAK) {
      fp(']');
    }
    else if (tok->type == LBRAK) {
      fp('[');
    }
    else if (tok->type == VAR) {
      fp(tok->value);
    }
  }
}


int main() {
  p(tokenize());
}
