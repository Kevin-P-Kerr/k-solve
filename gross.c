
  // final sweep through for stray parens and brackets
  /*
  beginning++;
  for (;beginning<i;beginning++) {
    token = &tokens[beginning];
    if (token->deleted) {
      continue;
    }
    if (token->type == openingType) {
      token->deleted = 1;
      int nesting = 0;
      while (token->type != closingType || nesting > 0) {
        if (!token->deleted) {
          if (token->type == LPAREN || token->type == LBRAK) {
            nesting++;
          }
          else if (token->type == RBRAK || token->type == RPAREN) {
            nesting--;
          }
        }
        beginning++;
        token = &tokens[beginning];
      }
      token->deleted = 1;
    }
  }
  */
