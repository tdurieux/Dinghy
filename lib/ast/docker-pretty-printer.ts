import {
  BashCommandCommand,
  BashConditionBinary,
  BashScript,
  DockerFile,
  DockerOpsNodeType,
  MaybeSemanticCommand,
} from "./docker-type";

import { Printer, print as reprint } from "./docker-printer";
import File from "./file";

export class PrettyPrinter extends Printer {
  originalFile: File | undefined;

  constructor(root: DockerOpsNodeType) {
    super(root);
    if (root instanceof DockerFile) {
      this.originalFile = root.position.file;
    } else {
      this.originalFile = root.getParent(DockerFile)?.position.file;
    }
    // this._detectIndentation();
  }

  print(): string {
    if (!this.originalFile) {
      return reprint(this.root);
    }
    this._generate(this.root);
    return this.output;
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
    this.append(node.position.file.contentOfNode(node));
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
