#include <stdio.h>
#include <stdlib.h>
#define MAXTOKEN 2000
#define LPAREN 0
#define RPAREN 1
#define VAR 2
#define LBRAK 3
#define RBRAK 4
#define DEBUG 2
#define WARN 1
#define LEVEL 2

int ARRSIZE =0;
struct Token {
  int deleted;
  int type;
  char value;
};

void warn (char* warning) {
  if (LEVEL >= WARN) {
   fprintf(stderr,"%s\n",warning);
  }
}
void fp (char c) {
  fprintf(stderr,"%c",c);
}

void p (struct Token* t) {
  int i,ii;
  for (i=0,ii=ARRSIZE;i<ii;i++) {
    struct Token* tok = &t[i];
    if (tok->deleted) {
      continue;
    }
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

char killWhite(char c) {
  while (c == '\n' || c == ' ' || c == '\t') {
    c = getchar();
  }
  return c;
}

int isAlpha (char c) {
  return c >= 'A' && c <= 'z';
}

struct Token* tokenize() {
  char c;
  int i =0;
  struct Token* tokens = malloc(sizeof(struct Token)*MAXTOKEN);
  while ((c=getchar())!=EOF) {
    c = killWhite(c);
    if (c == EOF) { break; } // why?
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
    else if (isAlpha(c)) {
      t->type = VAR;
      // for now, vars are 1 char
      t->value = c;
    }
    i++;
  }
  ARRSIZE = i;
  return tokens;
}

int solve(struct Token *tokens) {

}

int getClosingType (int type) {
  if (type == LPAREN) {
    return RPAREN;
  }
  if (type == LBRAK) {
    return RBRAK;
  }
  warn("bad closing type");
  return 0;
};

int simplifyClause(char var, struct Token *tokens, int i) {
  int beginning = i;
  struct Token* token = &tokens[i];
  struct Token* openToken = token;
  struct Token* closeToken;
  int closingType = getClosingType(token->type);
  int openingType = token->type;
  int empty = 0;
  i++;
  token = &tokens[i];
  while (token->type != closingType) {
    if (token->deleted) {
      i++;
      token = &tokens[i];
      continue;
    }
    if (token->type == LPAREN || token->type == LBRAK) {
      empty++;
      i = simplifyClause(var,tokens,i);
      if (token->deleted) {
        empty--;
      }
    }
    else if (token->type == VAR) {
      if (token->value == var) {
        token->deleted = 1;
      }
      else {
        empty+=2;
      }
    }
    i++;
    token = &tokens[i];
  }
  closeToken = token;
  if (empty < 2) {
    closeToken->deleted = 1;
    openToken->deleted = 1;
  }
  return i;
}

void simplify(char var, struct Token *tokens, int l) {
  int i =0;
  int simplified = 0;
  for (;i<l;i++) {
    struct Token token = tokens[i];
    if (token.deleted) {
      continue;
    }
    if (token.type == LPAREN || token.type == LBRAK) {
      simplifyClause(var,tokens,i);
    }
  }
}


int main() {
  struct Token* tokens = tokenize();
  p(tokens);
  warn("\n");
  simplify('a',tokens,ARRSIZE);
  p(tokens);
  // return solve(tokens);
 return 1;
}
