import File from "./file";
import { NoPrinter, Printer } from "./printer";
import { print as prettyPrint } from "./pretty-printer";
import {
  ASTData,
  ASTDataSerDes,
  SemanticDiff,
  defaultDiffOptions,
} from "@tdurieux/dinghy-diff/dist";

export interface QueryI {
  /**
   * The type of the node
   */
  type: (new (t: void | string) => AbstractNode<any>) | string | QueryOperator;
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

type TypeOfDockerOpsNode = new (t: any) => AbstractNode<any>;

type QueryType = TypeOfDockerOpsNode | string | QueryOperator;

export class QueryOperator {
  subQueries: QueryType[];
  constructor(...types: QueryType[]) {
    this.subQueries = types;
  }
}
export class QueryOperatorOR extends QueryOperator {
  constructor(...types: QueryType[]) {
    super(...types);
  }
}

export class QueryOperatorAND extends QueryOperator {
  constructor(...types: QueryType[]) {
    super(...types);
  }
}
export class QueryOperatorValue extends QueryOperator {
  constructor(value: string) {
    super(value);
  }
}

export const QOR = (...types: QueryType[]) => new QueryOperatorOR(...types);
export const QAND = (...types: QueryType[]) => new QueryOperatorAND(...types);
export const QValue = (value: string) => new QueryOperatorValue(value);

/** Factory for queries */
export const Q = (
  type: QueryType,
  child?: QueryType | Query,
  ...children: QueryType[] | Query[]
) => {
  let parent: Query | null = null;
  const oC: Query[] = [];
  let value: string | undefined = undefined;
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
    readonly type: QueryType,
    readonly value: string | undefined,
    ...children: QueryI[]
  ) {
    children.forEach((c) => this.children.push(c));
  }
}

export class ParserError<T extends AbstractNode<T>> extends Error {
  constructor(
    public message: string,
    public node?: T | any,
    public originalError?: Error
  ) {
    super(message);
  }
}
export class ParserErrors<T extends AbstractNode<T>> extends Error {
  constructor(
    public message: string,
    public ast?: T,
    public errors: ParserError<T>[] = []
  ) {
    super(message);
  }
}
export class Position {
  public file: File | null = null;

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

  toJSON() {
    return {
      lineStart: this.lineStart,
      columnStart: this.columnStart,
      lineEnd: this.lineEnd,
      columnEnd: this.columnEnd,
    };
  }
}

export abstract class AbstractNode<T extends AbstractNode<T>> {
  type: string;
  /**
   * The children nodes
   */
  children: T[] = [];
  /**
   * The parent node
   */
  parent: T | null = null;

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
  addChild(child: null | undefined | T | T[]) {
    if (child === null || child === undefined) return this;
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
  hasChild(child: T): boolean {
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
  getChild<C extends AbstractNode<any>>(nodeType: new (t: any) => C): C | null {
    const type = new nodeType(undefined).type;
    let out: C | null = null;
    this.iterate((node) => {
      if (node.type == type) {
        out = node as unknown as C;
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
  getChildren<C extends AbstractNode<any>>(nodeType: new (t: any) => C): C[] {
    const type = new nodeType(undefined).type;
    const out: C[] = [];
    this.iterate((node) => {
      if (node.type == type) {
        out.push(node as unknown as C);
      }
    });
    return out;
  }

  /**
   * Get the first node of the given type
   * @param nodeType the type of the node to find
   * @returns the node of the given type or null if not found
   */
  getElement<C extends AbstractNode<any>>(
    nodeType: new (t: any) => C
  ): C | null {
    const type = new nodeType(undefined).type;
    let out: C | null = null;
    this.traverse((node) => {
      if (node.type == type) {
        out = node as unknown as C;
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
  getElements<C extends AbstractNode<any>>(nodeType: new (t: any) => C): C[] {
    const type = new nodeType(undefined).type;
    const out: C[] = [];
    this.traverse((node) => {
      if (node.type == type) out.push(node as unknown as C);
    });
    return out;
  }

  /**
   * Find the parent node of the given type
   * @param element the type of the parent to find
   * @returns the parent node or null if not found
   */
  getParent<C extends AbstractNode<any>>(element: new (t: any) => C): C | null {
    const type = new element(undefined).type;
    let currentParent = this.parent;
    while (currentParent != null) {
      if (currentParent.type == type) {
        return currentParent as unknown as C;
      }
      currentParent = currentParent.parent;
    }
    return null;
  }

  /**
   * Iterate over the children nodes (non recursive)
   * @param callback callback function to call for each node
   * @param filter
   */
  iterate(
    callback: (node: T, index: number) => void,
    filter?: (node: T) => boolean
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
      if (filter && !filter(child as T)) continue;
      callback(child as T, index++);
    }
  }

  /**
   * traverse all children recursively
   *
   * @param callback returns false to stop the traverse
   * @returns false if not everything has been traversed
   */
  traverse(
    callback: (node: T) => boolean | void,
    { includeSelf } = { includeSelf: false }
  ): boolean {
    if (includeSelf) {
      if (callback(this as unknown as T) === false) return false;
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
  replace(node: T) {
    const indexInParent = this.parent?.children.indexOf(this as unknown as T);
    node.isChanged = true;
    node.parent = this.parent;
    if (indexInParent === -1 || indexInParent === undefined) {
      // const e = this.parent.children.filter((e) => e.original == this)[0];
      // if (e) e.original = element;
      return this;
    }
    if (node.position == null) node.setPosition(this._position);
    if (this.parent) {
      this.parent.children[indexInParent] = node;
    }
    return this;
  }

  /**
   * Remove this node from the tree
   * @returns this
   */
  remove() {
    if (this.parent) {
      const indexInParent = this.parent.children.indexOf(this as unknown as T);
      delete this.parent.children[indexInParent];
    }
    this.isChanged = true;
    return this;
  }

  /**
   * Check if this node is before the other node
   * @param query check if this node match the query
   * @returns true if this node matches the query
   */
  public match(query: QueryI) {
    if (query.type instanceof QueryOperator) {
      if (query.type instanceof QueryOperatorValue) {
        return (
          this instanceof AbstractValueNode &&
          this.value === query.type.subQueries[0]
        );
      }
      let ink = (subQuery: QueryType) => {
        return this.match(Q(subQuery));
      };
      if (query.type instanceof QueryOperatorOR) {
        return query.type.subQueries.some(ink);
      }
      return query.type.subQueries.every(ink);
    }
    const type =
      typeof query.type === "string" ? query.type : new query.type().type;

    if (type === "ONE" || type === "_") {
      return (
        query.children ||
        [].every((sub) => this.children.some((child) => child.match(sub)))
      );
    } else if (type === "ALL" || type === "ANY" || type === "*") {
      let previousMatch: AbstractNode<T> | undefined = undefined;
      for (const subQuery of query.children || []) {
        let foundedNode: AbstractNode<T> | undefined = undefined;
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
  isInside(arg: T): boolean {
    if (arg.position == null || this.position == null)
      return this.hasChild(arg);
    if (
      this.position.lineEnd !== undefined &&
      arg.position.lineStart > this.position.lineEnd
    ) {
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
      arg.position.columnEnd !== undefined &&
      this.position.columnEnd !== undefined &&
      arg.position.lineEnd === this.position.lineEnd &&
      arg.position.columnEnd > this.position.columnEnd
    ) {
      return false;
    }
    if (
      arg.position.lineEnd !== undefined &&
      this.position.lineEnd !== undefined &&
      arg.position.lineEnd > this.position.lineEnd
    ) {
      return false;
    }
    return true;
  }
  /**
   * Check if this is before arg
   * @param arg
   * @returns true if this is before arg
   */
  isBefore(arg: T): boolean {
    if (this.isInside(arg)) return false;
    if (this.position.lineStart < arg.position.lineStart) {
      return true;
    }
    if (this.position.lineStart == arg.position.lineStart) {
      if (this.position.columnStart < arg.position.columnStart) {
        return true;
      }
      if (this.position.columnStart == arg.position.columnStart) {
        if (
          arg.position.lineEnd !== undefined &&
          this.position.lineEnd !== undefined &&
          this.position.lineEnd < arg.position.lineEnd
        ) {
          return true;
        }
        if (this.position.lineEnd == arg.position.lineEnd) {
          if (
            arg.position.columnEnd !== undefined &&
            this.position.columnEnd !== undefined &&
            this.position.columnEnd < arg.position.columnEnd
          ) {
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
    let query: QueryI | undefined = undefined;
    if (typeof input === "string") {
      query = { type: input };
    } else {
      query = input;
    }
    const out: AbstractNode<T>[] = [];
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
   * Diff this node with another node
   * @param other the other node to diff with
   * @returns the diff between this node and the other node
   */
  diff(other: T) {
    const tNodeSerDes = new ASTDataSerDes();
    const oldTree = tNodeSerDes.parseAST(this as any);
    const newTree = tNodeSerDes.parseAST(other as any);
    return new SemanticDiff<ASTData>(defaultDiffOptions).diff(oldTree, newTree);
  }

  toJSON() {
    const out: {
      type: string;
      position: ReturnType<Position["toJSON"]>;
      children?: ReturnType<AbstractNode<any>["toJSON"]>[];
      value?: string;
    } = {
      type: this.type,
      position: this.position?.toJSON(),
      children: undefined,
      value: undefined,
    };
    if (this instanceof AbstractValueNode) out.value = this.value;
    if (this.children.length > 0) {
      out.children = this.children.map((e) => e.toJSON());
    }
    return out;
  }

  /**
   * Return a string representation of this node
   * @param asPrettyPrint true if the output should be pretty printed
   * @returns a string representation of this node
   */
  toString(asPrettyPrint = true): string {
    if (asPrettyPrint) {
      return prettyPrint(this);
    }
    const printer = this.printer();
    printer.print();
    return printer.writer.output;
  }

  abstract printer(): Printer<T>;
}

export class Unknown extends AbstractNode<any> {
  type: "UNKNOWN" = "UNKNOWN";

  toString() {
    return "UNKNOWN";
  }
  printer() {
    return new NoPrinter(this);
  }
}

export abstract class AbstractValueNode<
  T extends AbstractNode<T>
> extends AbstractNode<T> {
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
