import { print as prettyPrint } from "../core/docker-pretty-printer";
import { ShellPrinter } from "./shell-printer";
import {
  Position,
  AbstractNode,
  AbstractValueNode,
  Unknown,
} from "../core/core-types";

export type ShellNodeTypes =
  | BashAndIf
  | BashAndMem
  | BashArray
  | BashAssign
  | BashAssignLhs
  | BashAssignRhs
  | BashBackgrounded
  | BashBackticked
  | BashBanged
  | BashBraceExpansion
  | BashBraceGroup
  | BashCaseExpCase
  | BashCaseExpCases
  | BashCaseExpression
  | BashCaseExpressions
  | BashCaseExpTarget
  | BashCaseKind
  | BashCaseLabels
  | BashCommandArgs
  | BashCommandCommand
  | BashCommandPrefix
  | BashConcat
  | BashCondition
  | BashConditionAnd
  | BashConditionAndLhs
  | BashConditionAndRhs
  | BashConditionBinary
  | BashConditionBinaryLhs
  | BashConditionBinaryOp
  | BashConditionBinaryRhs
  | BashConditionEmpty
  | BashConditionExp
  | BashConditionNullary
  | BashConditionOp
  | BashConditionOr
  | BashConditionOrLhs
  | BashConditionOrRhs
  | BashConditionUnary
  | BashConditionUnaryExp
  | BashConditionUnaryOp
  | BashDeclClause
  | BashDollarBrace
  | BashDollarArithmetic
  | BashDollarParens
  | BashDollarSingleQuoted
  | BashDoubleQuoted
  | BashExtGlob
  | BashForIn
  | BashForInBody
  | BashFunction
  | BashGlob
  | BashIfCondition
  | BashIfElse
  | BashIfElseIfExpCheck
  | BashIfElseIfExpression
  | BashIfExpression
  | BashIfThen
  | BashIoDupeStderr
  | BashIoDupeStdout
  | BashLiteral
  | BashWord
  | BashWordIteration
  | BashOp
  | BashOrIf
  | BashOrMem
  | BashPath
  | BashPipeline
  | BashProcSub
  | BashProcSubBody
  | BashRedirect
  | BashScript
  | BashSingleQuoted
  | BashSubshell
  | BashUntilBody
  | BashUntilCondition
  | BashUntilExpression
  | BashVariable
  | BashWhileExpression
  | BashCommand
  | BashArithmeticExpression
  | BashArithmeticSequence
  | BashArithmeticExpansion
  | BashArithmeticVariable
  | BashArithmeticBinary
  | BashArithmeticBinaryOp
  | BashArithmeticBinaryLhs
  | BashArithmeticBinaryRhs
  | MaybeBash
  | BashFunctionBody
  | BashFunctionName
  | BashComment
  | BashReplace;

export abstract class ShellAbstractNode extends AbstractNode<ShellNodeTypes> {
  type: Extract<ShellNodeTypes["type"], {}>;

  printer() {
    return new ShellPrinter(this as ShellNodeTypes);
  }
}
export abstract class ShellAbstractValueNode extends AbstractValueNode<ShellNodeTypes> {
  type: Extract<ShellNodeTypes["type"], {}>;

  printer() {
    return new ShellPrinter(this as ShellNodeTypes);
  }
}

export class BashStatement extends ShellAbstractNode {
  semicolonPosition: Position;
  semicolon: boolean;
  isBackground: boolean;
  isCoprocess: boolean;
  isNegated: boolean;
}

export class MaybeBash extends ShellAbstractValueNode {
  type: "MAYBE-BASH" = "MAYBE-BASH";
}

export class BashAndIf extends ShellAbstractNode {
  type: "BASH-AND-IF" = "BASH-AND-IF";
}
export class BashAndMem extends ShellAbstractNode {
  type: "BASH-AND-MEM" = "BASH-AND-MEM";
}
export class BashArray extends ShellAbstractNode {
  type: "BASH-ARRAY" = "BASH-ARRAY";
}
export class BashDeclClause extends ShellAbstractValueNode {
  type: "BASH-DECL-CLAUSE" = "BASH-DECL-CLAUSE";
}
export class BashAssign extends ShellAbstractNode {
  type: "BASH-ASSIGN" = "BASH-ASSIGN";

  get left() {
    return this.children[0];
  }

  get right() {
    return this.children[1];
  }
}
export class BashAssignLhs extends ShellAbstractNode {
  type: "BASH-ASSIGN-LHS" = "BASH-ASSIGN-LHS";

  get exp() {
    return this.children[0];
  }
}
export class BashAssignRhs extends ShellAbstractNode {
  type: "BASH-ASSIGN-RHS" = "BASH-ASSIGN-RHS";
}
export class BashBackgrounded extends ShellAbstractNode {
  type: "BASH-BACKGROUNDED" = "BASH-BACKGROUNDED";
}
export class BashBackticked extends ShellAbstractNode {
  type: "BASH-BACKTICKED" = "BASH-BACKTICKED";
}
export class BashBanged extends ShellAbstractNode {
  type: "BASH-BANGED" = "BASH-BANGED";
}
export class BashBraceExpansion extends ShellAbstractNode {
  type: "BASH-BRACE-EXPANSION" = "BASH-BRACE-EXPANSION";
}
export class BashBraceGroup extends ShellAbstractNode {
  type: "BASH-BRACE-GROUP" = "BASH-BRACE-GROUP";
}
export class BashCaseExpCase extends ShellAbstractNode {
  type: "BASH-CASE-EXP-CASE" = "BASH-CASE-EXP-CASE";

  kind(): BashCaseKind {
    return this.getElement(BashCaseKind);
  }

  labels(): BashCaseLabels {
    return this.getElement(BashCaseLabels);
  }

  stmls(): BashCaseExpressions {
    return this.getElement(BashCaseExpressions);
  }
}
export class BashCaseExpCases extends ShellAbstractNode {
  type: "BASH-CASE-EXP-CASES" = "BASH-CASE-EXP-CASES";
}
export class BashCaseExpression extends BashStatement {
  type: "BASH-CASE-EXPRESSION" = "BASH-CASE-EXPRESSION";
  hasBraces: boolean = false;

  get target() {
    return this.getElement(BashCaseExpTarget);
  }

  get cases() {
    return this.getElement(BashCaseExpCases);
  }
}
export class BashCaseExpressions extends ShellAbstractNode {
  type: "BASH-CASE-EXPRESSIONS" = "BASH-CASE-EXPRESSIONS";
}
export class BashCaseExpTarget extends ShellAbstractNode {
  type: "BASH-CASE-EXP-TARGET" = "BASH-CASE-EXP-TARGET";
}
export class BashCaseKind extends ShellAbstractValueNode {
  type: "BASH-CASE-KIND" = "BASH-CASE-KIND";
}
export class BashCaseLabels extends ShellAbstractNode {
  type: "BASH-CASE-LABELS" = "BASH-CASE-LABELS";
}
export class BashCommandArgs extends ShellAbstractNode {
  type: "BASH-COMMAND-ARGS" = "BASH-COMMAND-ARGS";
}
export class BashCommandCommand extends ShellAbstractNode {
  type: "BASH-COMMAND-COMMAND" = "BASH-COMMAND-COMMAND";
}
export class BashCommandPrefix extends ShellAbstractNode {
  type: "BASH-COMMAND-PREFIX" = "BASH-COMMAND-PREFIX";
}
export class BashConcat extends ShellAbstractNode {
  type: "BASH-CONCAT" = "BASH-CONCAT";
}
export class BashCondition extends BashStatement {
  type: "BASH-CONDITION" = "BASH-CONDITION";
}
export class BashConditionAnd extends ShellAbstractNode {
  type: "BASH-CONDITION-AND" = "BASH-CONDITION-AND";
}
export class BashConditionAndLhs extends ShellAbstractNode {
  type: "BASH-CONDITION-AND-LHS" = "BASH-CONDITION-AND-LHS";
}
export class BashConditionAndRhs extends ShellAbstractNode {
  type: "BASH-CONDITION-AND-RHS" = "BASH-CONDITION-AND-RHS";
}
export class BashConditionBinary extends BashStatement {
  type: "BASH-CONDITION-BINARY" = "BASH-CONDITION-BINARY";

  get op() {
    return this.getElement(BashConditionBinaryOp);
  }

  get left() {
    return this.getElement(BashConditionBinaryLhs);
  }

  get right() {
    return this.getElement(BashConditionBinaryRhs);
  }
}
export class BashConditionBinaryLhs extends ShellAbstractNode {
  type: "BASH-CONDITION-BINARY-LHS" = "BASH-CONDITION-BINARY-LHS";
}
export class BashConditionBinaryOp extends ShellAbstractNode {
  type: "BASH-CONDITION-BINARY-OP" = "BASH-CONDITION-BINARY-OP";
}
export class BashConditionBinaryRhs extends ShellAbstractNode {
  type: "BASH-CONDITION-BINARY-RHS" = "BASH-CONDITION-BINARY-RHS";
}
export class BashConditionEmpty extends ShellAbstractNode {
  type: "BASH-CONDITION-EMPTY" = "BASH-CONDITION-EMPTY";
}
export class BashConditionExp extends ShellAbstractNode {
  type: "BASH-CONDITION-EXP" = "BASH-CONDITION-EXP";
}
export class BashConditionNullary extends ShellAbstractNode {
  type: "BASH-CONDITION-NULLARY" = "BASH-CONDITION-NULLARY";
}
export class BashConditionOp extends ShellAbstractValueNode {
  type: "BASH-CONDITION-OP" = "BASH-CONDITION-OP";
}
export class BashConditionOr extends ShellAbstractNode {
  type: "BASH-CONDITION-OR" = "BASH-CONDITION-OR";
}
export class BashConditionOrLhs extends ShellAbstractNode {
  type: "BASH-CONDITION-OR-LHS" = "BASH-CONDITION-OR-LHS";
}
export class BashConditionOrRhs extends ShellAbstractNode {
  type: "BASH-CONDITION-OR-RHS" = "BASH-CONDITION-OR-RHS";
}
export class BashConditionUnary extends ShellAbstractNode {
  type: "BASH-CONDITION-UNARY" = "BASH-CONDITION-UNARY";

  get op() {
    return this.getElement(BashConditionUnaryOp);
  }

  get exp() {
    return this.getElement(BashConditionUnaryExp);
  }
}
export class BashConditionUnaryExp extends ShellAbstractNode {
  type: "BASH-CONDITION-UNARY-EXP" = "BASH-CONDITION-UNARY-EXP";
}
export class BashConditionUnaryOp extends ShellAbstractValueNode {
  type: "BASH-CONDITION-UNARY-OP" = "BASH-CONDITION-UNARY-OP";
}
export class BashDollarBrace extends ShellAbstractNode {
  type: "BASH-DOLLAR-BRACE" = "BASH-DOLLAR-BRACE";
  /**
   * Has braces around the expression
   */
  short: boolean;
}
export class BashDollarArithmetic extends ShellAbstractNode {
  type: "BASH-DOLLAR-ARITHMETIC" = "BASH-DOLLAR-ARITHMETIC";
}
export class BashDollarParens extends ShellAbstractNode {
  type: "BASH-DOLLAR-PARENS" = "BASH-DOLLAR-PARENS";
}
export class BashDollarSingleQuoted extends ShellAbstractValueNode {
  type: "BASH-DOLLAR-SINGLE-QUOTED" = "BASH-DOLLAR-SINGLE-QUOTED";
}
export class BashDoubleQuoted extends ShellAbstractNode {
  type: "BASH-DOUBLE-QUOTED" = "BASH-DOUBLE-QUOTED";
}
export class BashExtGlob extends ShellAbstractValueNode {
  type: "BASH-EXT-GLOB" = "BASH-EXT-GLOB";
}
export class BashForIn extends BashStatement {
  type: "BASH-FOR-IN" = "BASH-FOR-IN";
  doPosition: Position | null;
  donePosition: Position | null;
  forPosition: Position | null;

  get body(): BashForInBody | null {
    return this.getElement(BashForInBody);
  }

  get items(): BashWord[] {
    return this.getElement(BashWordIteration)?.items;
  }

  get variable(): BashVariable {
    return this.getElement(BashWordIteration)?.variable;
  }
}
export class BashForInBody extends ShellAbstractNode {
  type: "BASH-FOR-IN-BODY" = "BASH-FOR-IN-BODY";
}

export class BashFunction extends ShellAbstractNode {
  type: "BASH-FUNCTION" = "BASH-FUNCTION";

  get name() {
    return this.getElement(BashFunctionName);
  }

  get body() {
    return this.getElement(BashFunctionBody);
  }
}

export class BashFunctionName extends ShellAbstractNode {
  type: "BASH-FUNCTION-NAME" = "BASH-FUNCTION-NAME";
}
export class BashFunctionBody extends ShellAbstractNode {
  type: "BASH-FUNCTION-BODY" = "BASH-FUNCTION-BODY";
}
export class BashGlob extends ShellAbstractValueNode {
  type: "BASH-GLOB" = "BASH-GLOB";
}
export class BashIfCondition extends ShellAbstractNode {
  type: "BASH-IF-CONDITION" = "BASH-IF-CONDITION";
}
export class BashIfElse extends ShellAbstractNode {
  type: "BASH-IF-ELSE" = "BASH-IF-ELSE";
}
export class BashIfElseIfExpCheck extends ShellAbstractNode {
  type: "BASH-IF-ELSE-IF-EXP-CHECK" = "BASH-IF-ELSE-IF-EXP-CHECK";
}
export class BashIfElseIfExpression extends ShellAbstractNode {
  type: "BASH-IF-ELSE-IF-EXPRESSION" = "BASH-IF-ELSE-IF-EXPRESSION";
}
export class BashIfExpression extends BashStatement {
  type: "BASH-IF-EXPRESSION" = "BASH-IF-EXPRESSION";

  ifPosition: Position;
  fiPosition: Position;

  get condition(): BashIfCondition | null {
    return this.getElement(BashIfCondition);
  }

  get body(): BashIfThen | null {
    return this.getElement(BashIfThen);
  }

  get else(): BashIfElse | null {
    return this.getElement(BashIfElse);
  }
}
export class BashIfThen extends ShellAbstractNode {
  type: "BASH-IF-THEN" = "BASH-IF-THEN";

  thenPosition: Position;
}
export class BashIoDupeStderr extends ShellAbstractNode {
  type: "BASH-IO-DUPE-STDERR" = "BASH-IO-DUPE-STDERR";
}
export class BashIoDupeStdout extends ShellAbstractNode {
  type: "BASH-IO-DUPE-STDOUT" = "BASH-IO-DUPE-STDOUT";
}
export class BashLiteral extends ShellAbstractValueNode {
  type: "BASH-LITERAL" = "BASH-LITERAL";
}
export class BashWord extends ShellAbstractNode {
  type: "BASH-WORD" = "BASH-WORD";
}

/**
 * @example
 * file in files
 */
export class BashWordIteration extends ShellAbstractNode {
  type: "BASH-WORD-ITERATION" = "BASH-WORD-ITERATION";

  inPosition: Position | null;

  get items() {
    return this.getChildren(BashWord);
  }

  get variable() {
    return this.getChild(BashVariable);
  }
}
export class BashOp extends ShellAbstractValueNode {
  type: "BASH-OP" = "BASH-OP";

  toString(asPrettyPrint = false) {
    if (asPrettyPrint) {
      return prettyPrint(this);
    }

    switch (this.value) {
      case "9":
        return "&";
      case "10":
        return "&&";
      case "11":
        return "||";
      case "12":
        return "|";
      case "38":
        return "*";
      case "68":
        return "+";
      case "69":
        return "+==";
      case "70":
        return "-";
      case "71":
        return ":-";
      case "73":
        return ":?";
      case "83":
        return ",";
      case "85":
        return "/";
      case "72":
        return "?";
      case "74":
        return "=";
      case "75":
        return ":=";
      case "76":
        return "%";
      case "77":
        return "%%";
      case "78":
        return "#";
      case "79":
        return "##";
      case "87":
        return ":";
      case "60":
        return ">|";
      case "61":
        return "<<";
      case "63":
        return "<<<";
      case "64":
        return "&>";
      case "65":
        return "&>>";
      case "66":
        return "<";
      case "67":
      case "54":
        return ">";
      case "43":
        return ">=";
      case "55":
        return ">>";
      case "56":
        return "<";
      case "59":
        return "2>";
      case "81":
        return "^^";
      case "65":
      default:
        if (this.position?.file) {
          console.log(
            "Unknown BASH-OP:" + this.value,
            this.position?.file?.contentAtPosition(this.position, 2),
            this.position?.file?.path,
            this.position.toString()
          );
        }
        throw new Error("Unknown BASH-OP:" + this.value + " " + this.position);
    }
  }
}
export class BashOrIf extends ShellAbstractNode {
  type: "BASH-OR-IF" = "BASH-OR-IF";
}
export class BashOrMem extends ShellAbstractNode {
  type: "BASH-OR-MEM" = "BASH-OR-MEM";
}
export class BashPath extends ShellAbstractNode {
  type: "BASH-PATH" = "BASH-PATH";
}
export class BashPipeline extends ShellAbstractNode {
  type: "BASH-PIPELINE" = "BASH-PIPELINE";
}
export class BashProcSub extends ShellAbstractNode {
  type: "BASH-PROC-SUB" = "BASH-PROC-SUB";

  get op() {
    return this.getElement(BashOp);
  }

  get body() {
    return this.getElement(BashProcSubBody);
  }
}
export class BashProcSubBody extends ShellAbstractNode {
  type: "BASH-PROC-SUB-BODY" = "BASH-PROC-SUB-BODY";
}
export class BashRedirect extends ShellAbstractNode {
  type: "BASH-REDIRECT" = "BASH-REDIRECT";

  get op() {
    return this.getElement(BashOp);
  }
}
export class BashScript extends ShellAbstractNode {
  type: "BASH-SCRIPT" = "BASH-SCRIPT";
}
export class BashSingleQuoted extends ShellAbstractValueNode {
  type: "BASH-SINGLE-QUOTED" = "BASH-SINGLE-QUOTED";
}
export class BashSubshell extends ShellAbstractNode {
  type: "BASH-SUBSHELL" = "BASH-SUBSHELL";
}
export class BashUntilBody extends ShellAbstractNode {
  type: "BASH-UNTIL-BODY" = "BASH-UNTIL-BODY";
}
export class BashUntilCondition extends ShellAbstractNode {
  type: "BASH-UNTIL-CONDITION" = "BASH-UNTIL-CONDITION";
}
export class BashUntilExpression extends ShellAbstractNode {
  type: "BASH-UNTIL-EXPRESSION" = "BASH-UNTIL-EXPRESSION";
}
export class BashVariable extends ShellAbstractValueNode {
  type: "BASH-VARIABLE" = "BASH-VARIABLE";
}
export class BashReplace extends ShellAbstractNode {
  type: "BASH-REPLACE" = "BASH-REPLACE";
  replaceAll: boolean;
}
export class BashWhileExpression extends BashStatement {
  type: "BASH-WHILE-EXPRESSION" = "BASH-WHILE-EXPRESSION";
  doPosition: Position | undefined;
  donePosition: Position | undefined;

  get body(): BashUntilBody | null {
    return this.getElement(BashUntilBody);
  }
  get condition(): BashUntilCondition | null {
    return this.getElement(BashUntilCondition);
  }
}

export class BashCommand extends BashStatement {
  type: "BASH-COMMAND" = "BASH-COMMAND";

  get command(): BashCommandArgs {
    return this.children.filter(
      (e) => e instanceof BashCommandCommand
    )[0] as BashCommandArgs;
  }

  get args(): BashCommandArgs[] {
    return this.children.filter(
      (e) => e instanceof BashCommandArgs
    ) as BashCommandArgs[];
  }
}
export class BashComment extends ShellAbstractValueNode {
  type: "BASH-COMMENT" = "BASH-COMMENT";
}
export class BashArithmeticSequence extends ShellAbstractNode {
  type: "BASH-ARITHMETIC-SEQUENCE" = "BASH-ARITHMETIC-SEQUENCE";
}
export class BashArithmeticExpansion extends ShellAbstractNode {
  type: "BASH-ARITHMETIC-EXPANSION" = "BASH-ARITHMETIC-EXPANSION";
}
export class BashArithmeticExpression extends ShellAbstractNode {
  type: "BASH-ARITHMETIC-EXPRESSION" = "BASH-ARITHMETIC-EXPRESSION";
  bracket: boolean = false;
}
export class BashArithmeticVariable extends ShellAbstractNode {
  type: "BASH-ARITHMETIC-VARIABLE" = "BASH-ARITHMETIC-VARIABLE";
}
export class BashArithmeticBinary extends ShellAbstractNode {
  type: "BASH-ARITHMETIC-BINARY" = "BASH-ARITHMETIC-BINARY";

  get op() {
    return this.getElement(BashArithmeticBinaryOp);
  }
  get right() {
    return this.getElement(BashArithmeticBinaryRhs);
  }
  get left() {
    return this.getElement(BashArithmeticBinaryLhs);
  }
}
export class BashArithmeticBinaryOp extends ShellAbstractNode {
  type: "BASH-ARITHMETIC-BINARY-OP" = "BASH-ARITHMETIC-BINARY-OP";
}
export class BashArithmeticBinaryLhs extends ShellAbstractNode {
  type: "BASH-ARITHMETIC-BINARY-LHS" = "BASH-ARITHMETIC-BINARY-LHS";
}
export class BashArithmeticBinaryRhs extends ShellAbstractNode {
  type: "BASH-ARITHMETIC-BINARY-RHS" = "BASH-ARITHMETIC-BINARY-RHS";
}
