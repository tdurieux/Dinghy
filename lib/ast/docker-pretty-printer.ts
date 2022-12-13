import {
  BashConditionBinary,
  BashRedirect,
  BashScript,
  BashStatement,
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
  // writeIndent() {
  //   if (this.currentNode?.position?.lineStart) {
  //     const line =
  //       this.currentNode.position.file.content.split("\n")[
  //         this.currentNode.position.lineStart
  //       ];
  //     for (let i = 0; i < line.length; i++) {
  //       const c = line[i];
  //       if (c != " " && c != "\t") {
  //         if (i > 0) {
  //           this.append(line.slice(0, i - 1));
  //         }
  //         break;
  //       }
  //     }
  //   } else {
  //     super.writeIndent();
  //   }
  //   return this;
  // }

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

    if (
      node instanceof MaybeSemanticCommand ||
      node instanceof BashConditionBinary
    )
      this.space();
    if (node.hasChanges() || node.isChanged || node.position?.file == null) {
      super._generate(node);
    } else {     
      this._printLineUntilPreviousNode(node);

      this.previousNode = node;
      if (node.position?.file?.key) {
        delete this._previousNode["new"];
      }
      this._getOriginalLine(node);

      // if (node instanceof BashStatement) {
      //   const redirect = node.getChildren(BashRedirect);
      //   redirect.forEach((node) => this.space()._generate(node));
      //   if (node.semicolon === true) {
      //     if (node.isBackground) {
      //       this.space().append("&");
      //     } else if (node.isCoprocess) {
      //       this.space().append("|&");
      //     } else {
      //       this.trim().append(";");
      //     }
      //   }
      // }
    }
    // add the empty line after the last node
    if (node instanceof DockerFile && node.position.lineEnd) {
      const p = node.position.clone();
      p.lineStart = node.position.lineEnd;
      this.indentLevel = 0
      this._printLineUntilPreviousNode(new DockerFile().setPosition(p));
    }
    return this;
  }
}

export function print(node: DockerOpsNodeType) {
  return new PrettyPrinter(node).print();
}
