import { print } from "./ASTPrinter";
import { createEnrichers } from "./commands";
import { abstract } from "./abstraction";
import { Rule, matchRule } from "./rule";

export type DockerOpsNodeType =
  | AsString
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
  | BashDollarArithmetic
  | BashDollarParens
  | BashDollarSingleQuoted
  | BashDoubleQuoted
  | BashExtGlob
  | BashForIn
  | BashForInBody
  | BashForInItems
  | BashForInVariable
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
  | BashOp
  | BashOrIf
  | BashOrMem
  | BashPath
  | BashPipeline
  | BashProcSub
  | BashProcSubBody
  | BashProcSubOp
  | BashRedirect
  | BashRedirectAppend
  | BashRedirectCommand
  | BashRedirectOverwrite
  | BashRedirectRedirects
  | BashRedirectStdin
  | BashScript
  | BashSingleQuoted
  | BashSubshell
  | BashUntilBody
  | BashUntilCondition
  | BashUntilExpression
  | BashVariable
  | BashWhileExpression
  | DockerAdd
  | DockerAddSource
  | DockerAddTarget
  | DockerArg
  | DockerCmd
  | DockerCmdArg
  | DockerCopy
  | DockerCopySource
  | DockerCopyTarget
  | DockerEntrypoint
  | DockerEntrypointArg
  | DockerEntrypointExecutable
  | DockerEnv
  | DockerExpose
  | DockerFile
  | DockerFrom
  | DockerImageDigest
  | DockerImageAlias
  | DockerImageName
  | DockerImageRepo
  | DockerImageTag
  | DockerLiteral
  | DockerName
  | DockerPath
  | DockerPort
  | DockerRun
  | DockerShell
  | DockerShellArg
  | DockerShellExecutable
  | DockerUser
  | DockerVolume
  | DockerWorkdir
  | MaybeSemanticCommand
  | SemanticCommand
  | Unknown
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
  | BashRedirectStderr
  | BashComment
  | DockerComment;

export class Position {
  constructor(
    readonly lineStart: number,
    readonly columnStart: number,
    readonly lineEnd?: number,
    readonly columnEnd?: number
  ) {}

  toString() {
    return (
      `${this.lineStart}:${this.columnStart}` +
      (this.lineEnd ? `to ${this.lineEnd}:${this.columnEnd}` : "")
    );
  }
}

export abstract class DockerOpsNode {
  type: Extract<DockerOpsNodeType["type"], {}>;
  /**
   * The children nodes
   */
  children: DockerOpsNodeType[] = [];
  /**
   * The parent node
   */
  parent: DockerOpsNodeType | null = null;
  /**
   * The original node. it is used after enrich and abstract
   */
  original: DockerOpsNodeType | null = null;
  _position: Position;
  isAbstracted: boolean;
  isEnriched: boolean;

  get position(): Position {
    return this._position;
  }

  setPosition(position: Position) {
    this._position = position;
    return this;
  }

  addChild(child: DockerOpsNodeType | DockerOpsNodeType[]) {
    if (child == null) return;
    if (Array.isArray(child)) {
      for (const c of child) {
        this.addChild(c);
      }
      return this;
    }
    this.children.push(child);
    child.parent = this as any;
    return this;
  }

  getElement<T extends DockerOpsNode>(
    element: new (t: string | void) => T
  ): T | null {
    const type = new element().type;
    let out: T;
    this.traverse((node) => {
      if (node.type == type) {
        out = node as T;
        // stop to traverse
        return false;
      }
    });
    return out;
  }

  getElements<T extends DockerOpsNode>(
    element: new (t: string | void) => T
  ): T[] | null {
    const type = new element().type;
    const out: T[] = [];
    this.traverse((node) => {
      if (node.type == type) out.push(node as T);
    });
    return out;
  }

  getParent<T extends DockerOpsNode>(element: new () => T): T | null {
    const type = new element().type;
    let currentParent: T = this.parent as T;
    while (currentParent != null) {
      if (currentParent.type == type) {
        return currentParent;
      }
      currentParent = currentParent.parent as T;
    }
    return null;
  }

  iterate(callback: (node: DockerOpsNodeType, index: number) => void) {
    this.children.sort((a, b) => {
      if (a.position === undefined) return 0;
      if (b.position === undefined) return 0;
      if (a.position.lineStart > b.position.lineStart) return 1;
      if (a.position.lineStart < b.position.lineStart) return -1;
      if (a.position.columnStart > b.position.columnStart) return 1;
      if (a.position.columnStart < b.position.columnStart) return -1;
      return 0;
    });
    for (let index = 0; index < this.children.length; index++) {
      const child = this.children[index];
      if (child == null) continue;
      callback(child, index);
    }
  }

  /**
   * traverse all children recursively
   *
   * @param callback returns false to stop the traverse
   * @returns false if not everything has been traversed
   */
  traverse(callback: (node: DockerOpsNodeType) => boolean | void): boolean {
    this.children.sort((a, b) => {
      if (a.position === undefined) return 0;
      if (b.position === undefined) return 0;
      if (a.position.lineStart > b.position.lineStart) return 1;
      if (a.position.lineStart < b.position.lineStart) return -1;
      if (a.position.columnStart > b.position.columnStart) return 1;
      if (a.position.columnStart < b.position.columnStart) return -1;
      return 0;
    });
    for (let index = 0; index < this.children.length; index++) {
      const child = this.children[index];
      if (child == null) continue;
      if (callback(child) === false) return false;
    }
    for (let index = 0; index < this.children.length; index++) {
      const child = this.children[index];
      if (child == null) continue;
      if (child.traverse(callback) === false) return false;
    }
    // continue
    return true;
  }

  replace(element: DockerOpsNodeType) {
    const indexInParent = this.parent.children.indexOf(
      this as DockerOpsNodeType
    );
    element.parent = this.parent;
    if (element.position == null) element.setPosition(this._position);
    this.parent.children[indexInParent] = element;
    return this;
  }

  remove() {
    const indexInParent = this.parent.children.indexOf(
      this as DockerOpsNodeType
    );
    delete this.parent.children[indexInParent];
    return this;
  }

  toString() {
    return print(this as any);
  }

  enrich() {
    if (this.isEnriched) return this;
    this.isEnriched = true;
    const COMMAND_MAP = createEnrichers();

    this.traverse((node) => {
      if (node instanceof MaybeSemanticCommand) {
        const commandAST = node.getElement(BashCommandCommand);
        const command = commandAST?.getElement(BashLiteral).value;
        if (COMMAND_MAP[command]) {
          const commandArgs = node
            .getElements(BashCommandArgs)
            .map((e) => e.children)
            .flat();
          const payload = COMMAND_MAP[command](
            commandArgs.map(print),
            commandArgs
          );
          payload.original = node;
          node.replace(payload);
        }
      }
    });
    return this;
  }

  abstract() {
    if (!this.isEnriched) this.enrich();
    if (this.isAbstracted) return this;
    this.isAbstracted = true;
    return abstract(this as DockerOpsNodeType);
  }

  match(rule: Rule) {
    if (!this.isAbstracted) this.abstract();
    console.time(`Match rule: ${rule.name}`);
    const o = matchRule(this as DockerOpsNodeType, rule);
    console.timeEnd(`Match rule: ${rule.name}`);
    return o;
  }
}

export class GenericNode extends DockerOpsNode {
  constructor(public type: any) {
    super();
  }
}

export class DockerOpsValueNode extends DockerOpsNode {
  constructor(public value: string) {
    super();
  }
}

export class MaybeBash extends DockerOpsValueNode {
  type: "MAYBE-BASH" = "MAYBE-BASH";
}

export class AsString extends DockerOpsValueNode {
  type: "AS-STRING" = "AS-STRING";
}
export class BashAndIf extends DockerOpsNode {
  type: "BASH-AND-IF" = "BASH-AND-IF";
}
export class BashAndMem extends DockerOpsNode {
  type: "BASH-AND-MEM" = "BASH-AND-MEM";
}
export class BashArray extends DockerOpsNode {
  type: "BASH-ARRAY" = "BASH-ARRAY";
}
export class BashAssign extends DockerOpsNode {
  type: "BASH-ASSIGN" = "BASH-ASSIGN";

  get left() {
    return this.children[0];
  }

  get right() {
    return this.children[1];
  }
}
export class BashAssignLhs extends DockerOpsNode {
  type: "BASH-ASSIGN-LHS" = "BASH-ASSIGN-LHS";

  get exp() {
    return this.children[0];
  }
}
export class BashAssignRhs extends DockerOpsNode {
  type: "BASH-ASSIGN-RHS" = "BASH-ASSIGN-RHS";
}
export class BashBackgrounded extends DockerOpsNode {
  type: "BASH-BACKGROUNDED" = "BASH-BACKGROUNDED";
}
export class BashBackticked extends DockerOpsNode {
  type: "BASH-BACKTICKED" = "BASH-BACKTICKED";
}
export class BashBanged extends DockerOpsNode {
  type: "BASH-BANGED" = "BASH-BANGED";
}
export class BashBraceExpansion extends DockerOpsValueNode {
  type: "BASH-BRACE-EXPANSION" = "BASH-BRACE-EXPANSION";
}
export class BashBraceGroup extends DockerOpsNode {
  type: "BASH-BRACE-GROUP" = "BASH-BRACE-GROUP";
}
export class BashCaseExpCase extends DockerOpsNode {
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
export class BashCaseExpCases extends DockerOpsNode {
  type: "BASH-CASE-EXP-CASES" = "BASH-CASE-EXP-CASES";
}
export class BashCaseExpression extends DockerOpsNode {
  type: "BASH-CASE-EXPRESSION" = "BASH-CASE-EXPRESSION";
  semicolon = false;

  get target() {
    return this.getElement(BashCaseExpTarget);
  }

  get cases() {
    return this.getElement(BashCaseExpCases);
  }
}
export class BashCaseExpressions extends DockerOpsNode {
  type: "BASH-CASE-EXPRESSIONS" = "BASH-CASE-EXPRESSIONS";
}
export class BashCaseExpTarget extends DockerOpsNode {
  type: "BASH-CASE-EXP-TARGET" = "BASH-CASE-EXP-TARGET";
}
export class BashCaseKind extends DockerOpsValueNode {
  type: "BASH-CASE-KIND" = "BASH-CASE-KIND";
}
export class BashCaseLabels extends DockerOpsNode {
  type: "BASH-CASE-LABELS" = "BASH-CASE-LABELS";
}
export class BashCommandArgs extends DockerOpsNode {
  type: "BASH-COMMAND-ARGS" = "BASH-COMMAND-ARGS";
}
export class BashCommandCommand extends DockerOpsNode {
  type: "BASH-COMMAND-COMMAND" = "BASH-COMMAND-COMMAND";
}
export class BashCommandPrefix extends DockerOpsNode {
  type: "BASH-COMMAND-PREFIX" = "BASH-COMMAND-PREFIX";
}
export class BashConcat extends DockerOpsNode {
  type: "BASH-CONCAT" = "BASH-CONCAT";
}
export class BashCondition extends DockerOpsNode {
  type: "BASH-CONDITION" = "BASH-CONDITION";
}
export class BashConditionAnd extends DockerOpsNode {
  type: "BASH-CONDITION-AND" = "BASH-CONDITION-AND";
}
export class BashConditionAndLhs extends DockerOpsNode {
  type: "BASH-CONDITION-AND-LHS" = "BASH-CONDITION-AND-LHS";
}
export class BashConditionAndRhs extends DockerOpsNode {
  type: "BASH-CONDITION-AND-RHS" = "BASH-CONDITION-AND-RHS";
}
export class BashConditionBinary extends DockerOpsNode {
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
export class BashConditionBinaryLhs extends DockerOpsNode {
  type: "BASH-CONDITION-BINARY-LHS" = "BASH-CONDITION-BINARY-LHS";
}
export class BashConditionBinaryOp extends DockerOpsNode {
  type: "BASH-CONDITION-BINARY-OP" = "BASH-CONDITION-BINARY-OP";
}
export class BashConditionBinaryRhs extends DockerOpsNode {
  type: "BASH-CONDITION-BINARY-RHS" = "BASH-CONDITION-BINARY-RHS";
}
export class BashConditionEmpty extends DockerOpsNode {
  type: "BASH-CONDITION-EMPTY" = "BASH-CONDITION-EMPTY";
}
export class BashConditionExp extends DockerOpsNode {
  type: "BASH-CONDITION-EXP" = "BASH-CONDITION-EXP";
}
export class BashConditionNullary extends DockerOpsNode {
  type: "BASH-CONDITION-NULLARY" = "BASH-CONDITION-NULLARY";
}
export class BashConditionOp extends DockerOpsValueNode {
  type: "BASH-CONDITION-OP" = "BASH-CONDITION-OP";
}
export class BashConditionOr extends DockerOpsNode {
  type: "BASH-CONDITION-OR" = "BASH-CONDITION-OR";
}
export class BashConditionOrLhs extends DockerOpsNode {
  type: "BASH-CONDITION-OR-LHS" = "BASH-CONDITION-OR-LHS";
}
export class BashConditionOrRhs extends DockerOpsNode {
  type: "BASH-CONDITION-OR-RHS" = "BASH-CONDITION-OR-RHS";
}
export class BashConditionUnary extends DockerOpsNode {
  type: "BASH-CONDITION-UNARY" = "BASH-CONDITION-UNARY";

  get op() {
    return this.getElement(BashConditionUnaryOp);
  }

  get exp() {
    return this.getElement(BashConditionUnaryExp);
  }
}
export class BashConditionUnaryExp extends DockerOpsNode {
  type: "BASH-CONDITION-UNARY-EXP" = "BASH-CONDITION-UNARY-EXP";
}
export class BashConditionUnaryOp extends DockerOpsValueNode {
  type: "BASH-CONDITION-UNARY-OP" = "BASH-CONDITION-UNARY-OP";
}
export class BashDollarArithmetic extends DockerOpsNode {
  type: "BASH-DOLLAR-ARITHMETIC" = "BASH-DOLLAR-ARITHMETIC";
}
export class BashDollarParens extends DockerOpsNode {
  type: "BASH-DOLLAR-PARENS" = "BASH-DOLLAR-PARENS";
}
export class BashDollarSingleQuoted extends DockerOpsValueNode {
  type: "BASH-DOLLAR-SINGLE-QUOTED" = "BASH-DOLLAR-SINGLE-QUOTED";
}
export class BashDoubleQuoted extends DockerOpsNode {
  type: "BASH-DOUBLE-QUOTED" = "BASH-DOUBLE-QUOTED";
}
export class BashExtGlob extends DockerOpsValueNode {
  type: "BASH-EXT-GLOB" = "BASH-EXT-GLOB";
}
export class BashForIn extends DockerOpsNode {
  type: "BASH-FOR-IN" = "BASH-FOR-IN";
  semicolon: boolean = false;

  get body(): BashForInBody {
    return this.getElement(BashForInBody);
  }

  get items(): BashForInItems {
    return this.getElement(BashForInItems);
  }

  get variable(): BashForInVariable {
    return this.getElement(BashForInVariable);
  }
}
export class BashForInBody extends DockerOpsNode {
  type: "BASH-FOR-IN-BODY" = "BASH-FOR-IN-BODY";
}
export class BashForInItems extends DockerOpsNode {
  type: "BASH-FOR-IN-ITEMS" = "BASH-FOR-IN-ITEMS";
}
export class BashForInVariable extends DockerOpsNode {
  type: "BASH-FOR-IN-VARIABLE" = "BASH-FOR-IN-VARIABLE";
}
export class BashFunction extends DockerOpsNode {
  type: "BASH-FUNCTION" = "BASH-FUNCTION";

  get name() {
    return this.getElement(BashFunctionName);
  }

  get body() {
    return this.getElement(BashFunctionBody);
  }
}

export class BashFunctionName extends DockerOpsNode {
  type: "BASH-FUNCTION-NAME" = "BASH-FUNCTION-NAME";
}
export class BashFunctionBody extends DockerOpsNode {
  type: "BASH-FUNCTION-BODY" = "BASH-FUNCTION-BODY";
}
export class BashGlob extends DockerOpsValueNode {
  type: "BASH-GLOB" = "BASH-GLOB";
}
export class BashIfCondition extends DockerOpsNode {
  type: "BASH-IF-CONDITION" = "BASH-IF-CONDITION";
}
export class BashIfElse extends DockerOpsNode {
  type: "BASH-IF-ELSE" = "BASH-IF-ELSE";
}
export class BashIfElseIfExpCheck extends DockerOpsNode {
  type: "BASH-IF-ELSE-IF-EXP-CHECK" = "BASH-IF-ELSE-IF-EXP-CHECK";
}
export class BashIfElseIfExpression extends DockerOpsNode {
  type: "BASH-IF-ELSE-IF-EXPRESSION" = "BASH-IF-ELSE-IF-EXPRESSION";
}
export class BashIfExpression extends DockerOpsNode {
  type: "BASH-IF-EXPRESSION" = "BASH-IF-EXPRESSION";

  semicolon = false;

  get condition(): BashIfCondition {
    return this.getElement(BashIfCondition);
  }

  get body(): BashIfThen {
    return this.getElement(BashIfThen);
  }

  get else(): BashIfElse {
    return this.getElement(BashIfElse);
  }
}
export class BashIfThen extends DockerOpsNode {
  type: "BASH-IF-THEN" = "BASH-IF-THEN";
}
export class BashIoDupeStderr extends DockerOpsNode {
  type: "BASH-IO-DUPE-STDERR" = "BASH-IO-DUPE-STDERR";
}
export class BashIoDupeStdout extends DockerOpsNode {
  type: "BASH-IO-DUPE-STDOUT" = "BASH-IO-DUPE-STDOUT";
}
export class BashLiteral extends DockerOpsValueNode {
  type: "BASH-LITERAL" = "BASH-LITERAL";
}
export class BashWord extends DockerOpsNode {
  type: "BASH-WORD" = "BASH-WORD";

  get items() {
    return this.children.filter((c) => c.type !== "BASH-VARIABLE");
  }

  get variable() {
    return this.getElement(BashVariable);
  }
}
export class BashOp extends DockerOpsValueNode {
  type: "BASH-OP" = "BASH-OP";
}
export class BashOrIf extends DockerOpsNode {
  type: "BASH-OR-IF" = "BASH-OR-IF";
}
export class BashOrMem extends DockerOpsNode {
  type: "BASH-OR-MEM" = "BASH-OR-MEM";
}
export class BashPath extends DockerOpsNode {
  type: "BASH-PATH" = "BASH-PATH";
}
export class BashPipeline extends DockerOpsNode {
  type: "BASH-PIPELINE" = "BASH-PIPELINE";
}
export class BashProcSub extends DockerOpsNode {
  type: "BASH-PROC-SUB" = "BASH-PROC-SUB";
}
export class BashProcSubBody extends DockerOpsNode {
  type: "BASH-PROC-SUB-BODY" = "BASH-PROC-SUB-BODY";
}
export class BashProcSubOp extends DockerOpsValueNode {
  type: "BASH-PROC-SUB-OP" = "BASH-PROC-SUB-OP";
}
export class BashRedirect extends DockerOpsNode {
  type: "BASH-REDIRECT" = "BASH-REDIRECT";
}
export class BashRedirectAppend extends DockerOpsNode {
  type: "BASH-REDIRECT-APPEND" = "BASH-REDIRECT-APPEND";
}
export class BashRedirectCommand extends DockerOpsNode {
  type: "BASH-REDIRECT-COMMAND" = "BASH-REDIRECT-COMMAND";
}
export class BashRedirectOverwrite extends DockerOpsNode {
  type: "BASH-REDIRECT-OVERWRITE" = "BASH-REDIRECT-OVERWRITE";
}
export class BashRedirectRedirects extends DockerOpsNode {
  type: "BASH-REDIRECT-REDIRECTS" = "BASH-REDIRECT-REDIRECTS";
}
export class BashRedirectStdin extends DockerOpsNode {
  type: "BASH-REDIRECT-STDIN" = "BASH-REDIRECT-STDIN";
}
export class BashRedirectStderr extends DockerOpsNode {
  type: "BASH-REDIRECT-STDERR" = "BASH-REDIRECT-STDERR";
}
export class BashScript extends DockerOpsNode {
  type: "BASH-SCRIPT" = "BASH-SCRIPT";
}
export class BashSingleQuoted extends DockerOpsValueNode {
  type: "BASH-SINGLE-QUOTED" = "BASH-SINGLE-QUOTED";
}
export class BashSubshell extends DockerOpsNode {
  type: "BASH-SUBSHELL" = "BASH-SUBSHELL";
}
export class BashUntilBody extends DockerOpsNode {
  type: "BASH-UNTIL-BODY" = "BASH-UNTIL-BODY";
}
export class BashUntilCondition extends DockerOpsNode {
  type: "BASH-UNTIL-CONDITION" = "BASH-UNTIL-CONDITION";
}
export class BashUntilExpression extends DockerOpsNode {
  type: "BASH-UNTIL-EXPRESSION" = "BASH-UNTIL-EXPRESSION";
}
export class BashVariable extends DockerOpsValueNode {
  type: "BASH-VARIABLE" = "BASH-VARIABLE";
}
export class BashWhileExpression extends DockerOpsNode {
  type: "BASH-WHILE-EXPRESSION" = "BASH-WHILE-EXPRESSION";
}
export class DockerAdd extends DockerOpsNode {
  type: "DOCKER-ADD" = "DOCKER-ADD";
}
export class DockerAddSource extends DockerOpsNode {
  type: "DOCKER-ADD-SOURCE" = "DOCKER-ADD-SOURCE";
}
export class DockerAddTarget extends DockerOpsNode {
  type: "DOCKER-ADD-TARGET" = "DOCKER-ADD-TARGET";
}
export class DockerArg extends DockerOpsNode {
  type: "DOCKER-ARG" = "DOCKER-ARG";
}
export class DockerCmd extends DockerOpsNode {
  type: "DOCKER-CMD" = "DOCKER-CMD";
}
export class DockerCmdArg extends DockerOpsValueNode {
  type: "DOCKER-CMD-ARG" = "DOCKER-CMD-ARG";
}
export class DockerCopy extends DockerOpsNode {
  type: "DOCKER-COPY" = "DOCKER-COPY";
}
export class DockerCopySource extends DockerOpsNode {
  type: "DOCKER-COPY-SOURCE" = "DOCKER-COPY-SOURCE";
}
export class DockerCopyTarget extends DockerOpsNode {
  type: "DOCKER-COPY-TARGET" = "DOCKER-COPY-TARGET";
}
export class DockerEntrypoint extends DockerOpsNode {
  type: "DOCKER-ENTRYPOINT" = "DOCKER-ENTRYPOINT";
}
export class DockerEntrypointArg extends DockerOpsValueNode {
  type: "DOCKER-ENTRYPOINT-ARG" = "DOCKER-ENTRYPOINT-ARG";
}
export class DockerEntrypointExecutable extends DockerOpsValueNode {
  type: "DOCKER-ENTRYPOINT-EXECUTABLE" = "DOCKER-ENTRYPOINT-EXECUTABLE";
}
export class DockerEnv extends DockerOpsNode {
  type: "DOCKER-ENV" = "DOCKER-ENV";
}
export class DockerExpose extends DockerOpsNode {
  type: "DOCKER-EXPOSE" = "DOCKER-EXPOSE";
}
export class DockerFile extends DockerOpsNode {
  type: "DOCKER-FILE" = "DOCKER-FILE";
}
export class DockerFrom extends DockerOpsNode {
  type: "DOCKER-FROM" = "DOCKER-FROM";
}
export class DockerImageName extends DockerOpsValueNode {
  type: "DOCKER-IMAGE-NAME" = "DOCKER-IMAGE-NAME";
}
export class DockerImageDigest extends DockerOpsValueNode {
  type: "DOCKER-IMAGE-DIGEST" = "DOCKER-IMAGE-DIGEST";
}
export class DockerImageAlias extends DockerOpsValueNode {
  type: "DOCKER-IMAGE-ALIAS" = "DOCKER-IMAGE-ALIAS";
}
export class DockerImageRepo extends DockerOpsValueNode {
  type: "DOCKER-IMAGE-REPO" = "DOCKER-IMAGE-REPO";
}
export class DockerImageTag extends DockerOpsValueNode {
  type: "DOCKER-IMAGE-TAG" = "DOCKER-IMAGE-TAG";
}
export class DockerLiteral extends DockerOpsValueNode {
  type: "DOCKER-LITERAL" = "DOCKER-LITERAL";
}
export class DockerName extends DockerOpsValueNode {
  type: "DOCKER-NAME" = "DOCKER-NAME";
}
export class DockerPath extends DockerOpsValueNode {
  type: "DOCKER-PATH" = "DOCKER-PATH";
}
export class DockerPort extends DockerOpsValueNode {
  type: "DOCKER-PORT" = "DOCKER-PORT";
}
export class DockerRun extends DockerOpsNode {
  type: "DOCKER-RUN" = "DOCKER-RUN";
}
export class DockerShell extends DockerOpsNode {
  type: "DOCKER-SHELL" = "DOCKER-SHELL";
}
export class DockerShellArg extends DockerOpsValueNode {
  type: "DOCKER-SHELL-ARG" = "DOCKER-SHELL-ARG";
}
export class DockerShellExecutable extends DockerOpsValueNode {
  type: "DOCKER-SHELL-EXECUTABLE" = "DOCKER-SHELL-EXECUTABLE";
}
export class DockerUser extends DockerOpsNode {
  type: "DOCKER-USER" = "DOCKER-USER";
}
export class DockerVolume extends DockerOpsNode {
  type: "DOCKER-VOLUME" = "DOCKER-VOLUME";
}
export class DockerWorkdir extends DockerOpsNode {
  type: "DOCKER-WORKDIR" = "DOCKER-WORKDIR";
}
export class MaybeSemanticCommand extends DockerOpsNode {
  type: "MAYBE-SEMANTIC-COMMAND" = "MAYBE-SEMANTIC-COMMAND";
  semicolon: boolean;
}
export class SemanticCommand extends DockerOpsNode {
  type: "SEMANTIC-COMMAND" = "SEMANTIC-COMMAND";
}
export class Unknown extends DockerOpsNode {
  type: "UNKNOWN" = "UNKNOWN";
}
export class DockerComment extends DockerOpsValueNode {
  type: "DOCKER-COMMENT" = "DOCKER-COMMENT";
}
export class BashComment extends DockerOpsValueNode {
  type: "BASH-COMMENT" = "BASH-COMMENT";
}
export class BashArithmeticSequence extends DockerOpsNode {
  type: "BASH-ARITHMETIC-SEQUENCE" = "BASH-ARITHMETIC-SEQUENCE";
}
export class BashArithmeticExpansion extends DockerOpsNode {
  type: "BASH-ARITHMETIC-EXPANSION" = "BASH-ARITHMETIC-EXPANSION";
}
export class BashArithmeticVariable extends DockerOpsNode {
  type: "BASH-ARITHMETIC-VARIABLE" = "BASH-ARITHMETIC-VARIABLE";
}
export class BashArithmeticBinary extends DockerOpsNode {
  type: "BASH-ARITHMETIC-BINARY" = "BASH-ARITHMETIC-BINARY";
}
export class BashArithmeticBinaryOp extends DockerOpsNode {
  type: "BASH-ARITHMETIC-BINARY-OP" = "BASH-ARITHMETIC-BINARY-OP";
}
export class BashArithmeticBinaryLhs extends DockerOpsNode {
  type: "BASH-ARITHMETIC-BINARY-LHS" = "BASH-ARITHMETIC-BINARY-LHS";
}
export class BashArithmeticBinaryRhs extends DockerOpsNode {
  type: "BASH-ARITHMETIC-BINARY-RHS" = "BASH-ARITHMETIC-BINARY-RHS";
}
