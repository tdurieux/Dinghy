import {
  BashCommandCommand,
  BashConditionBinary,
  BashScript,
  DockerFile,
  DockerOpsNodeType,
  MaybeSemanticCommand,
} from "./docker-type";

import { Printer, print as reprint } from "./docker-printer";

export class PrettyPrinter extends Printer {
  originalFileContent: string | undefined;

  constructor(root: DockerOpsNodeType) {
    super(root);
    if (root instanceof DockerFile) {
      this.originalFileContent = root.fileContent;
    } else {
      this.originalFileContent = root.getParent(DockerFile)?.fileContent;
    }
    // this._detectIndentation();
  }

  print(): string {
    if (!this.originalFileContent) {
      return reprint(this.root);
    }
    this._generate(this.root);
    return this.output;
  }

  // detect the indentation used in the original file
  private _detectIndentation(node: DockerOpsNodeType) {
    if (!this.originalFileContent) return;
    const lines = this.originalFileContent.split("\n");
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
    if (!this.originalFileContent) return;
    if (!node.position || node.position.lineStart == -1) {
      super._generate(node);
      return;
    }
    const lineStart = node.position.lineStart;
    const lineEnd = node.position.lineEnd || lineStart;
    const columnStart = node.position.columnStart;
    const columnEnd =
      node.position.columnEnd || columnStart + node.toString().length;

    const lines = this.originalFileContent.split("\n");

    for (let i = lineStart; i <= Math.min(lineEnd, lines.length - 1); i++) {
      const line = lines[i];

      if (i == lineStart) {
        if (i == lineEnd) {
          this.append(line.substring(columnStart, columnEnd));
        } else {
          this.append(line.substring(columnStart) + "\n");
        }
      } else if (i == lineEnd) {
        this.append(line.substring(0, columnEnd));
      } else {
        this.append(line + "\n");
      }
    }
  }

  _generate(node: DockerOpsNodeType) {
    if (node == null) return this;

    if (node instanceof BashScript) {
      this._detectIndentation(node);
    }

    if (
      node instanceof MaybeSemanticCommand ||
      node instanceof BashConditionBinary
    )
      this.space();
    if (node.hasChanges() || node.isChanged || node.position?.file == null) {
      super._generate(node);
    } else {
      this._printLineUntilPreviousNode(node);

      if (node.position?.file) {
        // generated elements don't have a file
        this._previousNode = node;
      } else {
        this._previousNode = null;
      }
      this._getOriginalLine(node);
      if ((node as any).semicolon === true) this.append(";");
    }
    return this;
  }
}

export function print(node: DockerOpsNodeType) {
  return new PrettyPrinter(node).print();
}
