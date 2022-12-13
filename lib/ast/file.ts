import { readFileSync } from "fs";
import { DockerOpsNodeType, Position } from "./docker-type";

export default class File {
  public content: string;
  public key: string;

  constructor(readonly path?: string, content?: string) {
    this.content = content || (path && readFileSync(path, "utf8"));
    this.key = path || content;
  }

  contentOfNode(node: DockerOpsNodeType): string {
    if (!node.position) return "";
    return this.contentAtPosition(
      node.position,
      node.position.columnEnd === undefined ? node.toString().length : 0
    );
  }

  contentAtPosition(position: Position, length?: number): string {
    const lineStart = position.lineStart;
    const lineEnd =
      position.lineEnd !== undefined ? position.lineEnd : lineStart;
    const columnStart = position.columnStart;
    const columnEnd =
      position.columnEnd !== undefined
        ? position.columnEnd
        : columnStart + length;

    const lines = this.content.split("\n");

    let output = "";

    for (let i = lineStart; i <= Math.min(lineEnd, lines.length - 1); i++) {
      const line = lines[i];

      if (i == lineStart) {
        if (i == lineEnd) {
          output += line.substring(columnStart, columnEnd);
        } else {
          output += line.substring(columnStart) + "\n";
        }
      } else if (i == lineEnd) {
        output += line.substring(0, columnEnd);
      } else {
        output += line + "\n";
      }
    }
    return output;
  }
}
