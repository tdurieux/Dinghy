import {
  BashConditionBinary,
  BashScript,
  DockerFile,
  DockerOpsNodeType,
  BashCommand,
} from "../docker-type";

import { Printer, print as reprint } from "./docker-printer";
import File from "../file";

export class PrettyPrinter extends Printer {
  originalFile: File | undefined;

  constructor(root: DockerOpsNodeType) {
    super(root);
    if (root instanceof DockerFile) {
      this.originalFile = root.position.file;
    } else {
      this.originalFile = root.getParent(DockerFile)?.position.file;
    }
  }

  print(): string {
    if (!this.originalFile) {
      return reprint(this.root);
    }
    this._generate(this.root);
    this.trimSpace();
    return this.output;
  }

  _printLineUntilPreviousNode(node: DockerOpsNodeType) {
    if (node.position?.lineStart !== undefined && node.position?.file) {
      const line =
        node.position.file.content.split("\n")[node.position.lineStart];
      for (let i = 0; line && i < line.length; i++) {
        const c = line[i];
        if (c != " " && c != "\t") {
          if (i > 0) {
            this.indentChar = line[0];
          }
          this._indentLevel = i;
          break;
        }
      }
    }
    return super._printLineUntilPreviousNode(node);
  }

  // detect the indentation used in the original file
  private _detectIndentation(node: DockerOpsNodeType) {
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
        this.indentChar = indent;
        return;
      }
      if (line.startsWith("\t")) {
        this.indentChar = "\t";
        return;
      }
    }
  }

  private _getOriginalLine(node: DockerOpsNodeType) {
    if (!this.originalFile) return;
    if (!node.position || node.position.lineStart == -1) {
      super._generate(node);
      return;
    }
    const content = node.position.file.contentOfNode(node);
    this.append(content);
  }

  _generate(node: DockerOpsNodeType) {
    if (node == null) return this;

    // the file did not changed, just reprint the original file
    if (node instanceof DockerFile && !node.hasChanges()) {
      this.append(node.position.file.content);
      return this;
    }

    if (node instanceof BashScript) {
      this._detectIndentation(node);
    }

    if (node.hasChanges() || node.isChanged || node.position?.file == null) {
      super._generate(node);
    } else {
      this._printLineUntilPreviousNode(node);

      this.previousNode = node;
      if (node.position?.file?.key) {
        delete this._previousNode["new"];
      }
      this._getOriginalLine(node);
    }
    // add the empty line after the last node
    if (node instanceof DockerFile && node.position.lineEnd) {
      const p = node.position.clone();
      p.lineStart = node.position.lineEnd;
      this.indentLevel = 0;
      this._printLineUntilPreviousNode(new DockerFile().setPosition(p));
    }
    return this;
  }
}

export function print(node: DockerOpsNodeType) {
  return new PrettyPrinter(node).print();
}
