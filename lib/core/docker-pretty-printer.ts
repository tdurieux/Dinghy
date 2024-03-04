import File from "./file";
import { AbstractNode, Unknown } from "./core-types";
import { Printer } from "./printer";

export class PrettyPrinter extends Printer<AbstractNode<any>> {
  originalFile: File | undefined;

  constructor(root: AbstractNode<any>) {
    super(root);
    this.originalFile = root.position.file;
  }

  print(): string {
    if (!this.originalFile) {
      const printer = this.root.printer();
      printer.writer = this.writer;
      printer.print();
      return this.writer.output;
    }
    this._generate(this.root);
    this.writer.trimSpace();
    return this.writer.output;
  }

  _printLineUntilPreviousNode(node: AbstractNode<any>) {
    if (node.position?.lineStart !== undefined && node.position?.file) {
      const line =
        node.position.file.content.split("\n")[node.position.lineStart];
      for (let i = 0; line && i < line.length; i++) {
        const c = line[i];
        if (c != " " && c != "\t") {
          if (i > 0) {
            this.writer.indenter.indentChar = line[0];
          }
          this.writer.indenter._indentLevel = i;
          break;
        }
      }
    }
    return super._printLineUntilPreviousNode(node);
  }

  // detect the indentation used in the original file
  private _detectIndentation(node: AbstractNode<any>) {
    if (!this.originalFile) return;
    const lines = this.originalFile.content.split("\n");
    for (let i = node.position.lineStart; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith(" ")) {
        let indent = "";
        for (let i = 0; i < line.length; i++) {
          if (line[i] == " ") {
            indent += " ";
          } else {
            break;
          }
        }
        this.writer.indenter.indentChar = indent;
        return;
      }
      if (line.startsWith("\t")) {
        this.writer.indenter.indentChar = "\t";
        return;
      }
    }
  }

  private _getOriginalLine(node: AbstractNode<any>) {
    if (!this.originalFile) return;
    if (!node.position || node.position.lineStart == -1) {
      const printer = node.printer();
      printer.writer = this.writer;
      printer.print();
      return;
    }
    const content = node.position.file.contentOfNode(node);
    this.append(content);
    if (content.endsWith(";")) {
      this.writer.space();
    }
  }

  _generate(node: AbstractNode<any>) {
    if (node == null) return this;

    // the file did not changed, just reprint the original file
    if (node.parent === undefined && !node.hasChanges()) {
      this.append(node.position.file.content);
      return this;
    }

    if (node.parent === undefined && node.position?.file) {
      this._detectIndentation(node);
    }

    if (node.hasChanges() || node.isChanged || node.position?.file == null) {
      // super._generate(node);
      const printer = node.printer();
      printer.writer = this.writer;
      printer._previousNode = this._previousNode;
      const printer_generate = printer._generate;
      printer._printLineUntilPreviousNode = this._printLineUntilPreviousNode;
      const that = this;
      printer._generate = (node) => {
        return that._generate(node);
      };
      printer_generate.call(printer, node);
    } else {
      this._printLineUntilPreviousNode(node);

      this.previousNode = node;
      if (node.position?.file?.key) {
        delete this._previousNode["new"];
      }
      this._getOriginalLine(node);
    }
    // add the empty line after the last node
    if (node.parent === undefined && node.position.lineEnd) {
      const p = node.position.clone();
      p.lineStart = node.position.lineEnd;
      this.writer.indenter.reset();
      this._printLineUntilPreviousNode(new Unknown().setPosition(p));
    }
    return this;
  }
}

export function print(node: AbstractNode<any>) {
  return new PrettyPrinter(node).print();
}
