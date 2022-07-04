export interface Pos extends Node {
  After(p2: Pos);
  Col(): number;
  IsValid(): boolean;
  Line(): number;
  Offset(): number;
  String(): string;
}
export interface Node {
  $type: string;
  End(): Pos;
  Pos(): Pos;
}
export interface ArithmCmd extends Node {
  Left: Pos;
  Right: Pos;
  X: ArithmExpr;
}
export interface ArithmExp extends Node {
  Left: Pos;
  Right: Pos;
  Bracket: boolean; // deprecated $[expr] form
  Unsigned: boolean; // mksh's $((# expr))
  X: ArithmExpr;
}
export interface ArithmExpr extends Node {
  Node: Node;
}
export interface ArrayElem extends Node {
  Index: ArithmExpr;
  Value: Word;
  Comments: Comment[];
}
export interface ArrayExpr extends Node {
  Lparen: Pos;
  Rparen: Pos;
  Elems: ArrayElem[];
  Last: Comment[];
}
export interface Assign extends Node {
  Append: boolean; // +=
  Naked: boolean; // without '='
  Name: Lit;
  Index: ArithmExpr; // [i], ["k"]
  Value: Word; // =val
  Array: ArrayExpr; // =(arr)
}
export interface BinAritOperator extends Node {
  String(): string;
}
export interface BinCmdOperator extends Node {
  String(): string;
}
export interface BinTestOperator extends Node {
  String(): string;
}
export interface BinaryArithm extends Node {
  OpPos: Pos;
  Op: number;
  X: ArithmExpr;
  Y: ArithmExpr;
}
export interface BinaryCmd extends Node {
  OpPos: Pos;
  Op: number;
  X: Stmt;
  Y: Stmt;
}
export interface BinaryTest extends Node {
  OpPos: Pos;
  Op: BinTestOperator;
  X: TestExpr;
  Y: TestExpr;
}
export interface Block extends Node {
  Lbrace: Pos;
  Rbrace: Pos;
  Stmts: Stmt[];
}
export interface CStyleLoop extends Node {
  Lparen: Pos;
  Rparen: Pos;
  Init: ArithmExpr;
  Cond: ArithmExpr;
  Post: ArithmExpr;
}
export interface CallExpr extends Node {
  Assigns: Assign[]; // a=x b=y args
  Args: Word[];
}
export interface CaseClause extends Node {
  Case: Pos;
  Esac: Pos;
  Word: Word;
  Items: CaseItem[];
  Last: Comment[];
}
export interface CaseItem extends Node {
  Op: number;
  OpPos: Pos; // unset if it was finished by "esac"
  Comments: Comment[];
  Patterns: Word[];
  Stmts: Stmt[];
}
export interface CmdSubst extends Node {
  Left: Pos;
  Right: Pos;
  Stmts: Stmt[];

  TempFile: boolean; // mksh's ${ foo;}
  ReplyVar: boolean; // mksh's ${|foo;}
}
export interface Command extends Node {
  Node: Node;
}
export interface Comment extends Node {
  Hash: Pos;
  Text: string;
}
export interface CoprocClause extends Node {
  Coproc: Pos;
  Name: Lit;
  Stmt: Stmt;
}
export interface DblQuoted extends Node {
  Position: Pos;
  Dollar: boolean; // $""
  Parts: WordPart[];
}
export interface DeclClause extends Node {
  // Variant is one of "declare", "local", "export", "readonly",
  // "typeset", or "nameref".
  Variant: Lit;
  Opts: Word[];
  Assigns: Assign[];
}
export interface Expansion extends Node {
  Op: ParExpOperator;
  Word: Word;
}
export interface ExtGlob extends Node {
  OpPos: Pos;
  Op: GlobOperator;
  Pattern: Lit;
}
export interface File extends Node {
  Name: string;
  Stmts: Stmt[];
  Last: Comment[];
}
export interface ForClause extends Node {
  ForPos: Pos;
  DoPos: Pos;
  DonePos: Pos;
  Select: boolean;
  Loop: Loop;
  Do: Stmt[];
}
export interface FuncDecl extends Node {
  Position: Pos;
  RsrvWord: boolean; // non-posix "function f()" style
  Name: Lit;
  Body: Stmt;
}
export interface GlobOperator extends Node {
  String();
}
export interface IfClause extends Node {
  Position: Pos; // position of the starting "if" or "elif" token
  ThenPos: Pos;
  FiPos: Pos; // position of "fi", empty if Elif == true

  Cond: Stmt[];
  Then: Stmt[];
  Else: IfClause;

  CondLast: Comment[]; // comments on the "else"
  ThenLast: Comment[]; // comments on the "fi"
  Last: Comment[]; // comments on the "fi"
}
export interface LangError extends Node {
  Filename: string;
  Feature: string;
  Langs: LangVariant[];

  Error(): string;
}
export interface LangVariant extends Node {
  String();
}
export interface LetClause extends Node {
  Let: Pos;
  Exprs: ArithmExpr[];
}
export interface Lit extends Node {
  ValuePos: Pos;
  ValueEnd: Pos;
  Value: string;
}
export interface Loop extends Node {
  Node: Node;
}
// export interface Node extends Node {}
export interface ParExpOperator extends Node {
  String();
}
export interface ParNamesOperator extends Node {
  String();
}
export interface ParamExp extends Node {
  Dollar: Pos;
  Rbrace: Pos;
  Short: boolean; // $a instead of ${a}
  Excl: boolean; // ${!a}
  Length: boolean; // ${#a}
  Width: boolean; // ${%a}
  Param: Lit;
  Index: ArithmExpr; // ${a[i]}, ${a["k"]}
  Slice: Slice; // ${a:x:y}
  Repl: Replace; // ${a/x/y}
  Names: ParNamesOperator; // ${!prefix} or ${!prefix@}
  Exp: Expansion; // ${a:-b}, ${a#b}, etc
}
export interface ParenArithm extends Node {
  Lparen: Pos;
  Rparen: Pos;
  X: ArithmExpr;
}
export interface ParenTest extends Node {
  Lparen: Pos;
  Rparen: Pos;
  X: TestExpr;
}
export interface ParseError extends Node {
  Filename: string;
  Text: string;
  Error(): string;
  Incomplete: boolean;
}
export interface Parser extends Node {
  Incomplete(): boolean;
  Interactive(src: string, walker: (statement: Stmt[]) => boolean): void;
  Parse(src: string, filename: string): File;
}
export interface Printer extends Node {
  Print(): string;
}
export interface ProcOperator extends Node {
  String(): string;
}
export interface ProcSubst extends Node {
  OpPos: Pos;
  Rparen: Pos;
  Op: ProcOperator;
  Stmts: Stmt[];
}
export interface Redirect extends Node {
  OpPos: Pos;
  Op: number;
  N: Lit; // fd>, or {varname}> in Bash
  Word: Word; // >word
  Hdoc: Word; // here-document body
}
export interface Replace extends Node {
  All: boolean;
  Orig: Word;
  With: Word;
}
export interface SglQuoted extends Node {
  Left: Pos;
  Right: Pos;
  Dollar: boolean; // $”
  Value: string;
}
export interface Slice extends Node {
  Offset: ArithmExpr;
  Length: ArithmExpr;
}
export interface Stmt extends Node {
  Comments: Comment[];
  Cmd: Command;
  Position: Pos;
  Semicolon: Pos; // position of ';', '&', or '|&', if any
  Negated: boolean; // ! stmt
  Background: boolean; // stmt &
  Coprocess: boolean; // mksh's |&

  Redirs: Redirect[]; // stmt >a <b
}
export interface StmtList extends Node {
  Stmts: Stmt[];
  Last: Comment[];
}
export interface Subshell extends Node {
  Lparen: Pos;
  Rparen: Pos;
  Stmts: Stmt[];
}
export interface TestClause extends Node {
  Left: Pos;
  Right: Pos;
  X: TestExpr;
}
export interface TestExpr extends Node {
  Node: Node;
}
export interface TimeClause extends Node {
  Time: Pos;
  PosixFormat: boolean;
  Stmt: Stmt;
}
export interface UnAritOperator extends Node {
  String(): string;
}
export interface UnTestOperator extends Node {
  String(): string;
}
export interface UnaryArithm extends Node {
  OpPos: Pos;
  Op: UnAritOperator;
  Post: boolean;
  X: ArithmExpr;
}
export interface UnaryTest extends Node {
  OpPos: Pos;
  Op: UnTestOperator;
  X: TestExpr;
}
export interface WhileClause extends Node {
  WhilePos: Pos;
  DoPos: Pos;
  DonePos: Pos;
  Until: boolean;
  Cond: Stmt[];
  Do: Stmt[];
}
export interface Word extends Node {
  Parts: WordPart[];

  /**
   * @deprecated
   */
  ExpandBraces(): Word[];
  Lit(): string;
}
export interface WordIter extends Node {
  Name: Lit;
  InPos: Pos; // position of "in"
  Items: Word[];
}
export interface WordPart extends Node {
  Node: Node;
}
