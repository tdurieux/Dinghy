import { AnyRecord } from "dns";
import { print } from "./printer/docker-printer";
import { print as prettyPrint } from "./printer/docker-pretty-printer";
import File from "./file";
import { Node } from "./parser/mvdan-sh-types";
import { Instruction } from "@tdurieux/dockerfile-ast";

export type DockerOpsNodeType =
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
  | DockerAdd
  | DockerAddSource
  | DockerAddTarget
  | DockerArg
  | DockerCmd
  | DockerKeyword
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
  | DockerLabel
  | DockerMaintainer
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
  | BashCommand
  | Unknown
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
  | DockerComment
  | DockerOnBuild
  | DockerStopSignal
  | DockerHealthCheck
  | BashReplace
  | DockerFlag;

export interface QueryI {
  /**
   * The type of the node
   */
  type: (new (t: void | string) => DockerOpsNode) | string;
  /**
   * The value of the node
   * @default undefined
   * @example
   * // Match a node with the value "foo"
   * { type: DockerKeyword, value: "foo" }
   */
  value?: string;
  /**
   * The children of the node
   * @default undefined
   * @example
   * // Match a node with the value "foo" and a child with the value "bar"
   * { type: DockerKeyword, value: "foo", children: [{ type: DockerKeyword, value: "bar" }] }
   */
  children?: QueryI[];
}

export class ParserError extends Error {
  constructor(
    message: string,
    public node?: Node | Instruction | DockerOpsNodeType,
    public originalError?: Error
  ) {
    super(message);
  }
}
export class ParserErrors extends Error {
  constructor(
    message: string,
    public ast?: DockerOpsNodeType,
    public errors: ParserError[] = []
  ) {
    super(message);
  }
}
export class Position {
  public file: File = null;
  constructor(
    public lineStart: number,
    public columnStart: number,
    public lineEnd?: number,
    public columnEnd?: number
  ) {}

  clone() {
    const c = new Position(
      this.lineStart,
      this.columnStart,
      this.lineEnd,
      this.columnEnd
    );
    c.file = this.file;
    return c;
  }

  equals(other: Position) {
    return (
      other !== undefined &&
      this.lineStart === other.lineStart &&
      this.columnStart === other.columnStart &&
      this.lineEnd === other.lineEnd &&
      this.columnEnd === other.columnEnd
    );
  }

  toString() {
    return (
      `${this.lineStart + 1}:${this.columnStart}` +
      (this.lineEnd !== undefined
        ? ` to ${this.lineEnd + 1}:${this.columnEnd}`
        : "")
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

  public isChanged = false;

  private _position: Position;

  readonly annotations: string[] = [];

  get position(): Position {
    return this._position;
  }

  setPosition(position: Position) {
    this._position = position;
    return this;
  }

  /**
   * Add a child to this node
   * @param child the child to add
   * @returns this
   */
  addChild(child: DockerOpsNodeType | DockerOpsNodeType[]) {
    if (child == null) return;
    if (Array.isArray(child)) {
      for (const c of child) {
        if (c == null) continue;
        c.isChanged = true;
        this.addChild(c);
      }
      return this;
    }
    child.isChanged = true;
    this.children.push(child);
    child.parent = this as any;
    return this;
  }

  /**
   * Check if this node has the given child
   * @param child the child to check
   * @returns true if this node has the given child
   */
  hasChild(child: DockerOpsNodeType): boolean {
    let out = false;
    this.traverse((node) => {
      if (node === child) {
        out = true;
        // stop to traverse
        return false;
      }
    });
    return out;
  }
  /**
   * Get the first child of the given type
   * @param nodeType the type of the node to find
   * @returns the first child of the given type
   */
  getChild<T extends DockerOpsNode>(nodeType: new (t: any) => T): T | null {
    const type = new nodeType(undefined).type;
    let out: T = null;
    this.iterate((node) => {
      if (node.type == type) {
        out = node as T;
        // stop to traverse
        return false;
      }
    });
    return out;
  }

  /**
   * Get all the children of the given type
   * @param nodeType the type of the node to find
   * @returns the children of the given type
   */
  getChildren<T extends DockerOpsNode>(nodeType: new (t: any) => T): T[] {
    const type = new nodeType(undefined).type;
    const out: T[] = [];
    this.iterate((node) => {
      if (node.type == type) {
        out.push(node as T);
      }
    });
    return out;
  }

  /**
   * Get the first node of the given type
   * @param nodeType the type of the node to find
   * @returns the node of the given type or null if not found
   */
  getElement<T extends DockerOpsNode>(nodeType: new (t: any) => T): T | null {
    const type = new nodeType(undefined).type;
    let out: T = null;
    this.traverse((node) => {
      if (node.type == type) {
        out = node as T;
        // stop to traverse
        return false;
      }
    });
    return out;
  }

  /**
   * Get all nodes of the given type
   * @param nodeType the type of the node to find
   * @returns the list of nodes
   */
  getElements<T extends DockerOpsNode>(nodeType: new (t: any) => T): T[] {
    const type = new nodeType(undefined).type;
    const out: T[] = [];
    this.traverse((node) => {
      if (node.type == type) out.push(node as T);
    });
    return out;
  }

  /**
   * Find the parent node of the given type
   * @param element the type of the parent to find
   * @returns the parent node or null if not found
   */
  getParent<T extends DockerOpsNode>(
    element?: new (t: AnyRecord) => T
  ): T | null {
    if (!element) return this.parent as T;
    const type = new element(undefined).type;
    let currentParent: T = this.parent as T;
    while (currentParent != null) {
      if (currentParent.type == type) {
        return currentParent;
      }
      currentParent = currentParent.parent as T;
    }
    return null;
  }

  /**
   * Iterate over the children nodes (non recursive)
   * @param callback callback function to call for each node
   * @param filter
   */
  iterate(
    callback: (node: DockerOpsNodeType, index: number) => void,
    filter?: (node: DockerOpsNodeType) => boolean
  ) {
    this.children.sort((a, b) => {
      if (a.position === undefined) return 0;
      if (b.position === undefined) return 0;
      if (a.position.lineStart > b.position.lineStart) return 1;
      if (a.position.lineStart < b.position.lineStart) return -1;
      if (a.position.columnStart > b.position.columnStart) return 1;
      if (a.position.columnStart < b.position.columnStart) return -1;
      return 0;
    });
    let index = 0;
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (child == null) continue;
      if (filter && !filter(child)) continue;
      callback(child, index++);
    }
  }

  /**
   * traverse all children recursively
   *
   * @param callback returns false to stop the traverse
   * @returns false if not everything has been traversed
   */
  traverse(
    callback: (node: DockerOpsNodeType) => boolean | void,
    { includeSelf } = { includeSelf: false }
  ): boolean {
    if (includeSelf) {
      if (callback(this as DockerOpsNodeType) === false) return false;
    }
    this.children.sort((a, b) => {
      if (a.position == undefined) return 0;
      if (b.position == undefined) return 0;
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

  /**
   * Replace this by the given node
   * @param node the replacement node
   * @returns this
   */
  replace(node: DockerOpsNodeType) {
    const indexInParent = this.parent.children.indexOf(
      this as DockerOpsNodeType
    );
    node.isChanged = true;
    node.parent = this.parent;
    if (indexInParent === -1) {
      // const e = this.parent.children.filter((e) => e.original == this)[0];
      // if (e) e.original = element;
      return this;
    }
    if (node.position == null) node.setPosition(this._position);
    this.parent.children[indexInParent] = node;
    return this;
  }

  /**
   * Remove this node from the tree
   * @returns this
   */
  remove() {
    const indexInParent = this.parent.children.indexOf(
      this as DockerOpsNodeType
    );
    delete this.parent.children[indexInParent];
    this.isChanged = true;
    return this;
  }

  /**
   * Check if this node is before the other node
   * @param query check if this node match the query
   * @returns true if this node matches the query
   */
  public match(query: QueryI) {
    const type =
      typeof query.type === "string" ? query.type : new query.type().type;

    if (type === "ONE" || type === "_") {
      return query.children.every((sub) =>
        this.children.some((child) => child.match(sub))
      );
    } else if (type === "ALL" || type === "ANY" || type === "*") {
      let previousMatch: DockerOpsNode = undefined;
      for (const subQuery of query.children) {
        let foundedNode = undefined;
        this.traverse(
          (node) => {
            if (
              node.match(subQuery) &&
              (previousMatch === undefined || previousMatch.isBefore(node))
            ) {
              foundedNode = node;
              return false;
            }
          },
          { includeSelf: true }
        );
        previousMatch = foundedNode;
        if (!previousMatch) {
          return false;
        }
      }
      return previousMatch != undefined;
    }
    // if (type == "ALL") {
    //   if (this.match(query.children[0])) return true;
    //   return !this.traverse((node) => {
    //     if (node.match(query.children[0])) return false;
    //   });
    // }
    if (
      this.type !== type &&
      !this.annotations.includes(type) &&
      query.value == undefined
    )
      return false;
    if (query.value !== undefined && (this as any).value !== query.value)
      return false;

    // if the type and value match, check that all the sub-queries match the children
    if (query.children) {
      return query.children.every((toMatchChild) =>
        this.children.some((currentChild) => currentChild.match(toMatchChild))
      );
    }
    return true;
  }
  /**
   * Check if arg is inside this node
   * @param arg the node to check
   * @returns true if arg is inside this node
   */
  isInside(arg: DockerOpsNodeType): boolean {
    if (arg.position == null || this.position == null)
      return this.hasChild(arg);
    if (arg.position.lineStart > this.position.lineEnd) {
      return false;
    }
    if (arg.position.lineStart < this.position.lineStart) {
      return false;
    }
    if (
      arg.position.lineStart === this.position.lineStart &&
      arg.position.columnStart < this.position.columnStart
    ) {
      return false;
    }
    if (
      arg.position.lineEnd === this.position.lineEnd &&
      arg.position.columnEnd > this.position.columnEnd
    ) {
      return false;
    }
    if (arg.position.lineEnd > this.position.lineEnd) {
      return false;
    }
    return true;
  }
  /**
   * Check if this is before arg
   * @param arg
   * @returns true if this is before arg
   */
  isBefore(arg: DockerOpsNodeType): boolean {
    if (this.isInside(arg)) return false;
    if (this.position.lineStart < arg.position.lineStart) {
      return true;
    }
    if (this.position.lineStart == arg.position.lineStart) {
      if (this.position.columnStart < arg.position.columnStart) {
        return true;
      }
      if (this.position.columnStart == arg.position.columnStart) {
        if (this.position.lineEnd < arg.position.lineEnd) {
          return true;
        }
        if (this.position.lineEnd == arg.position.lineEnd) {
          if (this.position.columnEnd < arg.position.columnEnd) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Find all the nodes that match the query
   * @param query
   * @returns the list of nodes that match query
   */
  public find(input: QueryI | string) {
    let query: QueryI = undefined;
    if (typeof input === "string") {
      query = { type: input };
    } else {
      query = input;
    }
    const out: DockerOpsNodeType[] = [];
    this.traverse(
      (child) => {
        if (child.match(query)) out.push(child);
      },
      { includeSelf: true }
    );
    return out;
  }

  /**
   * check if this node or one of its children has been changed
   * @returns true if this node or one of its children has been changed
   */
  public hasChanges() {
    if (this.isChanged) return true;
    let hasChanges = false;
    this.traverse((child) => {
      if (child.isChanged) {
        hasChanges = true;
        return false;
      }
    });
    return hasChanges;
  }

  /**
   * Clone this node
   * @returns a clone of this node
   */
  public clone(): this {
    var cloneObj = new (this.constructor as any)();
    cloneObj.isChanged = true;
    for (const attribut in this) {
      if (
        attribut == "parent" ||
        attribut == "original" ||
        typeof this[attribut] === "function" ||
        this[attribut] == null
      )
        continue;
      if (Array.isArray(this[attribut])) {
        cloneObj[attribut] = [];
        for (const e of this[attribut] as any) {
          if (e != undefined && (e as any).clone) {
            const c = (e as any).clone();
            if (attribut == "children") {
              c.parent = cloneObj;
            }
            cloneObj[attribut].push(c);
          } else {
            cloneObj[attribut].push(e);
          }
        }
      } else if ((this[attribut] as any).clone) {
        cloneObj[attribut] = (this[attribut] as any).clone();
      } else {
        cloneObj[attribut] = this[attribut];
      }
    }
    return cloneObj;
  }

  /**
   * Return a string representation of this node
   * @param asPrettyPrint true if the output should be pretty printed
   * @returns a string representation of this node
   */
  toString(asPrettyPrint = false) {
    if (asPrettyPrint) {
      return prettyPrint(this as DockerOpsNodeType);
    }
    return print(this as DockerOpsNodeType);
  }
}

export class GenericNode extends DockerOpsNode {
  constructor(public type: any) {
    super();
  }
}

export class DockerOpsValueNode extends DockerOpsNode {
  constructor(private _value: string) {
    super();
  }
  get value() {
    return this._value;
  }
  set value(value: string) {
    this._value = value;
    this.isChanged = true;
  }
}

export class BashStatement extends DockerOpsNode {
  semicolonPosition: Position;
  semicolon: boolean;
  isBackground: boolean;
  isCoprocess: boolean;
  isNegated: boolean;
}

export class MaybeBash extends DockerOpsValueNode {
  type: "MAYBE-BASH" = "MAYBE-BASH";
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
export class BashDeclClause extends DockerOpsValueNode {
  type: "BASH-DECL-CLAUSE" = "BASH-DECL-CLAUSE";
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
export class BashBraceExpansion extends DockerOpsNode {
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
export class BashDollarBrace extends DockerOpsNode {
  type: "BASH-DOLLAR-BRACE" = "BASH-DOLLAR-BRACE";
  /**
   * Has braces around the expression
   */
  short: boolean;
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
export class BashForIn extends BashStatement {
  type: "BASH-FOR-IN" = "BASH-FOR-IN";
  doPosition: Position | null;
  donePosition: Position | null;
  forPosition: Position | null;

  get body(): BashForInBody {
    return this.getElement(BashForInBody);
  }

  get items(): BashWord[] {
    return this.getElement(BashWordIteration).items;
  }

  get variable(): BashVariable {
    return this.getElement(BashWordIteration).variable;
  }
}
export class BashForInBody extends DockerOpsNode {
  type: "BASH-FOR-IN-BODY" = "BASH-FOR-IN-BODY";
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
export class BashIfExpression extends BashStatement {
  type: "BASH-IF-EXPRESSION" = "BASH-IF-EXPRESSION";

  ifPosition: Position;
  fiPosition: Position;

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

  thenPosition: Position;
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
}

/**
 * @example
 * file in files
 */
export class BashWordIteration extends DockerOpsNode {
  type: "BASH-WORD-ITERATION" = "BASH-WORD-ITERATION";

  inPosition: Position | null;

  get items() {
    return this.getChildren(BashWord);
  }

  get variable() {
    return this.getChild(BashVariable);
  }
}
export class BashOp extends DockerOpsValueNode {
  type: "BASH-OP" = "BASH-OP";

  toString(asPrettyPrint = false) {
    if (asPrettyPrint) {
      return prettyPrint(this as DockerOpsNodeType);
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
      case "64":
        return "&>";
      case "66":
        return "<";
      case "67":
      case "54":
        return ">";
      case "55":
        return ">>";
      case "56":
        return "<";
      case "59":
        return "2>";
      case "65":
      default:
        if (this.position?.file) {
          console.log(
            "Unknown BASH-OP:" + this.value,
            this.position.file.contentAtPosition(this.position, 2),
            this.position.file.path,
            this.position.toString()
          );
        }
        throw new Error("Unknown BASH-OP:" + this.value + " " + this.position);
    }
  }
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

  get op() {
    return this.getElement(BashOp);
  }

  get body() {
    return this.getElement(BashProcSubBody);
  }
}
export class BashProcSubBody extends DockerOpsNode {
  type: "BASH-PROC-SUB-BODY" = "BASH-PROC-SUB-BODY";
}
export class BashRedirect extends DockerOpsNode {
  type: "BASH-REDIRECT" = "BASH-REDIRECT";

  get op() {
    return this.getElement(BashOp);
  }
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
export class BashReplace extends DockerOpsNode {
  type: "BASH-REPLACE" = "BASH-REPLACE";
  replaceAll: boolean;
}
export class BashWhileExpression extends BashStatement {
  type: "BASH-WHILE-EXPRESSION" = "BASH-WHILE-EXPRESSION";
  doPosition: Position | undefined;
  donePosition: Position | undefined;

  get body(): BashUntilBody {
    return this.getElement(BashUntilBody);
  }
  get condition(): BashUntilCondition {
    return this.getElement(BashUntilCondition);
  }
}
export abstract class DockerNode extends DockerOpsNode {
  get keyword() {
    return this.getElement(DockerKeyword);
  }

  get arguments() {
    return this.children.filter((e) => !(e instanceof DockerKeyword));
  }
}
export class DockerKeyword extends DockerOpsValueNode {
  type: "DOCKER-KEYWORD" = "DOCKER-KEYWORD";
}
export class DockerAdd extends DockerNode {
  type: "DOCKER-ADD" = "DOCKER-ADD";
}
export class DockerAddSource extends DockerOpsNode {
  type: "DOCKER-ADD-SOURCE" = "DOCKER-ADD-SOURCE";
}
export class DockerAddTarget extends DockerOpsNode {
  type: "DOCKER-ADD-TARGET" = "DOCKER-ADD-TARGET";
}
export class DockerArg extends DockerNode {
  type: "DOCKER-ARG" = "DOCKER-ARG";
}
export class DockerCmd extends DockerNode {
  type: "DOCKER-CMD" = "DOCKER-CMD";
}
export class DockerCmdArg extends DockerOpsValueNode {
  type: "DOCKER-CMD-ARG" = "DOCKER-CMD-ARG";
}
export class DockerCopy extends DockerNode {
  type: "DOCKER-COPY" = "DOCKER-COPY";
}
export class DockerCopySource extends DockerOpsNode {
  type: "DOCKER-COPY-SOURCE" = "DOCKER-COPY-SOURCE";
}
export class DockerCopyTarget extends DockerOpsNode {
  type: "DOCKER-COPY-TARGET" = "DOCKER-COPY-TARGET";
}
export class DockerLabel extends DockerNode {
  type: "DOCKER-LABEL" = "DOCKER-LABEL";
}
export class DockerMaintainer extends DockerNode {
  type: "DOCKER-MAINTAINER" = "DOCKER-MAINTAINER";
}
export class DockerEntrypoint extends DockerNode {
  type: "DOCKER-ENTRYPOINT" = "DOCKER-ENTRYPOINT";
}
export class DockerEntrypointArg extends DockerOpsValueNode {
  type: "DOCKER-ENTRYPOINT-ARG" = "DOCKER-ENTRYPOINT-ARG";
}
export class DockerEntrypointExecutable extends DockerOpsValueNode {
  type: "DOCKER-ENTRYPOINT-EXECUTABLE" = "DOCKER-ENTRYPOINT-EXECUTABLE";
}
export class DockerEnv extends DockerNode {
  type: "DOCKER-ENV" = "DOCKER-ENV";
}
export class DockerExpose extends DockerNode {
  type: "DOCKER-EXPOSE" = "DOCKER-EXPOSE";
}
export class DockerFile extends DockerOpsNode {
  type: "DOCKER-FILE" = "DOCKER-FILE";
}
export class DockerFrom extends DockerNode {
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
export class DockerFlag extends DockerOpsNode {
  type: "DOCKER-FLAG" = "DOCKER-FLAG";
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
export class DockerRun extends DockerNode {
  type: "DOCKER-RUN" = "DOCKER-RUN";
}
export class DockerShell extends DockerNode {
  type: "DOCKER-SHELL" = "DOCKER-SHELL";
}
export class DockerShellArg extends DockerOpsValueNode {
  type: "DOCKER-SHELL-ARG" = "DOCKER-SHELL-ARG";
}
export class DockerShellExecutable extends DockerOpsValueNode {
  type: "DOCKER-SHELL-EXECUTABLE" = "DOCKER-SHELL-EXECUTABLE";
}
export class DockerUser extends DockerNode {
  type: "DOCKER-USER" = "DOCKER-USER";
}
export class DockerVolume extends DockerNode {
  type: "DOCKER-VOLUME" = "DOCKER-VOLUME";
}
export class DockerWorkdir extends DockerNode {
  type: "DOCKER-WORKDIR" = "DOCKER-WORKDIR";
}
export class DockerOnBuild extends DockerOpsNode {
  type: "DOCKER-ONBUILD" = "DOCKER-ONBUILD";
}
export class DockerStopSignal extends DockerOpsNode {
  type: "DOCKER-STOPSIGNAL" = "DOCKER-STOPSIGNAL";
}
export class DockerHealthCheck extends DockerNode {
  type: "DOCKER-HEALTHCHECK" = "DOCKER-HEALTHCHECK";
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
export class BashArithmeticExpression extends DockerOpsNode {
  type: "BASH-ARITHMETIC-EXPRESSION" = "BASH-ARITHMETIC-EXPRESSION";
  bracket: boolean = false;
}
export class BashArithmeticVariable extends DockerOpsNode {
  type: "BASH-ARITHMETIC-VARIABLE" = "BASH-ARITHMETIC-VARIABLE";
}
export class BashArithmeticBinary extends DockerOpsNode {
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
export class BashArithmeticBinaryOp extends DockerOpsNode {
  type: "BASH-ARITHMETIC-BINARY-OP" = "BASH-ARITHMETIC-BINARY-OP";
}
export class BashArithmeticBinaryLhs extends DockerOpsNode {
  type: "BASH-ARITHMETIC-BINARY-LHS" = "BASH-ARITHMETIC-BINARY-LHS";
}
export class BashArithmeticBinaryRhs extends DockerOpsNode {
  type: "BASH-ARITHMETIC-BINARY-RHS" = "BASH-ARITHMETIC-BINARY-RHS";
}

type TypeOfDockerOpsNode = new (t: any) => DockerOpsNode;

/** Factory for queries */
export const Q = (
  type: TypeOfDockerOpsNode | string,
  child?: string | Query | TypeOfDockerOpsNode,
  ...children: Query[] | TypeOfDockerOpsNode[]
) => {
  let parent: QueryI | null = null;
  const oC: QueryI[] = [];
  let value: string = undefined;
  if (typeof child === "string") value = child;
  else if (child instanceof Query) oC.push(child);
  else if (child !== undefined) {
    parent = Q(child);
    oC.push(parent);
  }
  for (const child of children) {
    if (child instanceof Query) oC.push(child);
    else if (child !== undefined) {
      if (parent == null) {
        parent = Q(child);
        oC.push(parent);
      } else {
        const n = Q(child);
        parent.children.push(n);
        parent = n;
      }
    }
  }
  return new Query(type, value, ...oC);
};

/**
 * Implementation of Query that simplify queries
 */
export class Query implements QueryI {
  children: QueryI[] = [];
  constructor(
    readonly type: TypeOfDockerOpsNode | string,
    readonly value: string,
    ...children: QueryI[]
  ) {
    children.forEach((c) => this.children.push(c));
  }
}
