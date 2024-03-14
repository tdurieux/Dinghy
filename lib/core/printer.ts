import { AbstractNode, ParserError } from "./core-types";

export class Indenter {
  _indentLevel = 0;
  indentChar = "  ";

  indent() {
    this.indentLevel++;
    return this;
  }
  deindent() {
    this.indentLevel--;
    return this;
  }

  get indentLevel() {
    return this._indentLevel;
  }
  set indentLevel(value: number) {
    this._indentLevel = Math.max(value, 0);
  }

  public getIndent() {
    return this.indentChar.repeat(this.indentLevel);
  }
  reset() {
    this._indentLevel = 0;
  }
}

export class Writer {
  indenter = new Indenter();
  output: string = "";
  _inCommand: boolean = false;

  constructor() {}

  newLine() {
    const newLineAndIndent = "\n" + this.indenter.getIndent();

    if (
      this._inCommand &&
      // && !this.output.endsWith("\n")
      !this.output.trim().endsWith("\\")
    ) {
      this.space().append("\\");
    } else if (this.output.endsWith(newLineAndIndent)) {
      // remove indentation for empty lines
      this.output = this.output.substring(
        0,
        this.output.length -
          this.indenter.indentChar.length * this.indenter.indentLevel
      );
    }

    // remove unwanted space at the end of a line (can happen because of comments)
    if (this.output.endsWith(" ")) {
      this.output = this.output.substring(0, this.output.length - 1);
    }
    this.output += "\n";
    this.writeIndent();
    return this;
  }

  space() {
    if (
      this.output.length == 0 ||
      this.output.charAt(this.output.length - 1) == " " ||
      this.output.charAt(this.output.length - 1) == "\t"
    )
      return this;
    this.output += " ";
    return this;
  }

  append(str: string) {
    this.output += str;
    return this;
  }

  trim() {
    this.output = this.output.trimEnd();
    return this;
  }

  trimSpace() {
    this.output = this.output.replace(/ +$/, "");
    return this;
  }
  writeIndent() {
    return this.append(this.indenter.getIndent());
  }
}

export abstract class Printer<T extends AbstractNode<any>> {
  public writer = new Writer();

  _previousNode: Record<string, T> = {};
  readonly errors: ParserError<T>[] = [];

  constructor(readonly root: T) {}

  inCommand() {
    this.writer._inCommand = true;
    return this;
  }
  outCommand() {
    this.writer._inCommand = false;
    return this;
  }
  indent() {
    this.writer.indenter.indent();
    return this;
  }
  deindent() {
    this.writer.indenter.deindent();
    return this;
  }

  _getPreviousNodePosition(node: T | null) {
    return this._getPreviousNode(node)?.position;
  }
  _getPreviousNode(node: T | null) {
    return this._previousNode[node?.position?.file?.key || "new"];
  }
  set previousNode(node: T) {
    this._previousNode[node?.position?.file?.key || "new"] = node;
  }
  _printLineUntilPreviousNode(
    node: T,
    previousNode = this._getPreviousNode(node)
  ) {
    const previousNodePosition = previousNode?.position;
    if (
      previousNodePosition?.lineEnd !== undefined &&
      previousNodePosition?.lineEnd < node.position?.lineStart
    ) {
      let nbLines = Math.abs(
        Math.abs(node.position?.lineStart) - previousNodePosition?.lineEnd
      );
      if (!node.position?.file?.key) {
        nbLines = Math.min(nbLines, 1);
      }
      const inCommand = this.writer._inCommand;
      if (previousNode.type.includes("Comment") && !inCommand) {
        this.outCommand();
      }
      for (let i = 0; i < nbLines; i++) {
        this.writer.newLine();
      }
      this.writer._inCommand = inCommand;
    }
  }

  append(str: string) {
    this.writer.append(str);
    return this;
  }
  space() {
    this.writer.space();
    return this;
  }
  newLine() {
    this.writer.newLine();
    return this;
  }
  print(): string {
    this._generate(this.root, true);
    this.writer.trimSpace();
    return this.writer.output;
  }

  abstract _generate(node: T | null, printNewLine?: boolean): void;
}

export class NoPrinter extends Printer<any> {
  _generate(node: AbstractNode<any>, printNewLine?: boolean): void {
    throw new Error("Method not implemented.");
  }
}
