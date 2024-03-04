import {
  AllDockerNodes,
  DockerKeyword,
  DockerLiteral,
  DockerName,
  DockerShellArg,
  DockerShellExecutable,
} from "./docker-types";

import { ParserError } from "../core/core-types";
import { Printer } from "../core/printer";
import {
  BashLiteral,
  ShellAbstractNode,
  ShellAbstractValueNode,
} from "../shell/shell-types";

export class DockerPrinter extends Printer<AllDockerNodes> {
  _generate(node: AllDockerNodes, printNewLine = true) {
    if (node == null) return this;

    if (printNewLine) {
      this._printLineUntilPreviousNode(node);
    }

    this.previousNode = node;
    if (node.position?.file?.key) {
      delete this._previousNode["new"];
    }
    if (
      node instanceof ShellAbstractNode ||
      node instanceof ShellAbstractValueNode
    ) {
      const shellPrinter = node.printer();
      shellPrinter.writer = this.writer;
      shellPrinter.print();
      return;
    }
    switch (node.type) {
      case "DOCKER-FILE":
        node.iterate((i) => this._generate(i));
        break;
      case "DOCKER-IMAGE-NAME":
      case "DOCKER-LITERAL":
      case "DOCKER-PATH":
      case "DOCKER-PORT":
      case "DOCKER-CMD-ARG":
      case "DOCKER-ENTRYPOINT-EXECUTABLE":
      case "DOCKER-SHELL-ARG":
      case "DOCKER-SHELL-EXECUTABLE":
      case "DOCKER-ENTRYPOINT-ARG":
        this.append(node.value.replace(/\n/g, "\\\n"));
        break;
      case "DOCKER-NAME":
      case "DOCKER-KEYWORD":
        this.append(node.value).space();
        break;
      case "DOCKER-FLAG":
        this.append("--" + node.getChild(DockerName).value)
          .append("=")
          .append(node.getChild(DockerLiteral).value);
        break;
      case "DOCKER-IMAGE-REPO":
        this.append(node.value + "/");
        break;
      case "DOCKER-IMAGE-DIGEST":
        this.append("@" + node.value);
        break;
      case "DOCKER-IMAGE-ALIAS":
        this.append(" as " + node.value);
        break;
      case "DOCKER-IMAGE-TAG":
        this.append(":" + node.value);
        break;
      case "DOCKER-JSON-INSTRUCTION":
        this.append("[");
        const args = node.getElements(BashLiteral);
        this.append(args.map((i) => `"${i.value}"`).join(", "));
        this.append("]");
        break;

      case "DOCKER-ADD-SOURCE":
      case "DOCKER-ADD-TARGET":
      case "DOCKER-COPY-SOURCE":
      case "DOCKER-COPY-TARGET":
        if (
          this.writer.output.length > 0 &&
          this.writer.output.at(-1).match(/[\w\/\*;]/)
        ) {
          this.space();
        }
        node.iterate((node) => this._generate(node));
        break;
      case "DOCKER-COMMENT":
        this.append("# " + node.value);
        break;
      case "DOCKER-RUN":
        this.writer.indenter.reset();
        this._generate(node.keyword).space();
        this.indent().inCommand();
        node.iterate(
          (node) => this._generate(node),
          (node) => !(node instanceof DockerKeyword)
        );
        this.deindent().outCommand();
        this.previousNode = node;
        if (node.position?.file?.key) {
          delete this._previousNode["new"];
        }
        break;
      case "DOCKER-SHELL":
        this.writer.indenter.reset();
        this.inCommand()._generate(node.keyword).space();
        this.append("[").indent();
        this._generate(node.getElement(DockerShellExecutable));
        for (const i of node.getElements(DockerShellArg)) {
          this.append(", ")._generate(i);
        }
        this.deindent().append("]").outCommand();
        break;
      case "DOCKER-FROM":
      case "DOCKER-ADD":
      case "DOCKER-COPY":
      case "DOCKER-WORKDIR":
      case "DOCKER-ENV":
      case "DOCKER-EXPOSE":
      case "DOCKER-STOPSIGNAL":
      case "DOCKER-LABEL":
      case "DOCKER-MAINTAINER":
      case "DOCKER-ONBUILD":
      case "DOCKER-CMD":
        this.writer.indenter.reset();
        this.indent().inCommand();
        node.iterate((i) => this._generate(i));
        this.deindent().outCommand();
        break;
      case "DOCKER-ENTRYPOINT":
        this.writer.indenter.reset();
        this.inCommand()._generate(node.keyword).space().append("[");
        node.iterate(
          (i, index) => {
            if (index > 0) this.append(", ");
            this._generate(i);
          },
          (node) => !(node instanceof DockerKeyword)
        );
        this.append("]").outCommand();
        break;
      case "DOCKER-VOLUME":
      case "DOCKER-HEALTHCHECK":
        this.writer.indenter.reset();
        this._generate(node.keyword).space();
        node.iterate(
          (i, index) => {
            if (index > 0) this.append(" ");
            this._generate(i);
          },
          (node) => !(node instanceof DockerKeyword)
        );
        break;
      case "DOCKER-ARG":
        this.writer.indenter.reset();
        this.append("ARG ").inCommand();
        node.iterate(
          (i, index) => {
            if (index > 0) this.append("=");
            this._generate(i);
          },
          (node) => !(node instanceof DockerKeyword)
        );
        this.outCommand();
        break;
      case "DOCKER-USER":
        this.writer.indenter.reset();
        this.append("USER ");
        node.iterate(
          (i, index) => {
            if (index > 0) this.append(", ");
            this._generate(i);
          },
          (node) => !(node instanceof DockerKeyword)
        );
        break;
      default:
        this.errors.push(new ParserError("Type not supported", node));
    }
    return this;
  }

  print(): string {
    this._generate(this.root);
    this.writer.trimSpace();
    return this.writer.output;
  }
}

export function dockerPrint(node: AllDockerNodes) {
  return new DockerPrinter(node).print();
}
