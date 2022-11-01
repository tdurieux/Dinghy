import {
  BashCaseKind,
  BashCommandArgs,
  BashCommandCommand,
  BashComment,
  DockerKeyword,
  DockerOpsNodeType,
  DockerRun,
  DockerShellArg,
  DockerShellExecutable,
  GenericNode,
} from "./docker-type";
import * as fs from "fs";

export class Printer {
  indentLevel = 0;
  indentChar = "  ";
  output: string = "";
  _inCommand: boolean = false;
  _previousNode: DockerOpsNodeType | null = null;
  readonly errors: Error[] = [];
  constructor(readonly root: DockerOpsNodeType, public original = false) {}

  inCommand() {
    this._inCommand = true;
    return this;
  }
  outCommand() {
    this._inCommand = false;
    return this;
  }
  newLine() {
    const newLineAndIndent = "\n" + this.indentChar.repeat(this.indentLevel);
    if (this.output.endsWith(newLineAndIndent)) {
      // remove indentation for empty lines
      this.output = this.output.substring(
        0,
        this.output.length - this.indentChar.length * this.indentLevel
      );
    }
    if (this._inCommand && !this.output.endsWith("\n")) {
      if (!this.output.endsWith(" ")) {
        this.output += " ";
      }
      this.output += "\\";
    }
    // remove unwanted space at the end of a line (can happen because of comments)
    if (this.output.endsWith(" ")) {
      this.output = this.output.substring(0, this.output.length - 1);
    }
    this.output += "\n";
    this.output += this.indentChar.repeat(this.indentLevel);
    return this;
  }
  space() {
    if (
      this.output.length == 0 ||
      this.output.charAt(this.output.length - 1) == " "
    )
      return this;
    this.output += " ";
    return this;
  }
  indent() {
    this.indentLevel++;
    return this;
  }
  deindent() {
    this.indentLevel--;
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

  _printLineUntilPreviousNode(node: DockerOpsNodeType) {
    if (this._previousNode?.position?.lineEnd < node.position?.lineStart) {
      const nbLines = Math.abs(
        Math.abs(node.position?.lineStart) -
          this._previousNode?.position?.lineEnd
      );
      const inCommand = this._inCommand;
      if (this._previousNode instanceof BashComment) {
        this.outCommand();
      }
      for (let i = 0; i < nbLines; i++) {
        this.newLine();
      }
      this._inCommand = inCommand;
    } else if (node instanceof DockerRun && this.output.length > 0) {
      this.newLine();
    }
  }

  _generate(node: DockerOpsNodeType, printNewLine = true) {
    if (node == null) return this;
    if (this.original && node.original) {
      node = node.original;
    }

    if (printNewLine) {
      this._printLineUntilPreviousNode(node);
    }

    this._previousNode = node;
    switch (node.type) {
      case "BASH-SCRIPT":
        this._previousNode = null;
      case "BASH-ASSIGN-RHS":
      case "BASH-CONDITION-BINARY-LHS":
      case "BASH-CONDITION-BINARY-RHS":
      case "BASH-CONDITION-BINARY-OP":
      case "BASH-CONDITION-UNARY-EXP":
      case "BASH-FOR-IN-ITEMS":
      case "BASH-FOR-IN-VARIABLE":
      case "BASH-FUNCTION-NAME":
      case "BASH-IF-CONDITION":
      case "BASH-WORD":
      case "BASH-PATH":
      case "BASH-REDIRECT-REDIRECTS":
      case "BASH-REDIRECT":
      case "BASH-CASE-EXP-TARGET":
      case "BASH-IF-THEN":
      case "BASH-FUNCTION-BODY":
      case "BASH-FOR-IN-BODY":
      case "BASH-ARITHMETIC-BINARY-RHS":
      case "BASH-ARITHMETIC-BINARY-LHS":
      case "BASH-ARITHMETIC-BINARY-OP":
      case "BASH-UNTIL-CONDITION":
      case "BASH-UNTIL-BODY":
        node.iterate((i) => this._generate(i));
        break;
      case "DOCKER-FILE":
        node.iterate((i) => this._generate(i));
        this.newLine();
        break;
      case "DOCKER-IMAGE-NAME":
      case "DOCKER-LITERAL":
      case "BASH-LITERAL":
      case "BASH-VARIABLE":
      case "BASH-CONDITION-UNARY-OP":
      case "DOCKER-PATH":
      case "DOCKER-PORT":
      case "DOCKER-CMD-ARG":
      case "BASH-PROC-SUB-OP":
      case "BASH-GLOB":
      case "BASH-EXT-GLOB":
      case "BASH-DOLLAR-SINGLE-QUOTED":
      case "BASH-CONDITION-OP":
      case "AS-STRING":
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
      case "BASH-COMMENT":
        this.append("#" + node.value);
        break;
      case "BASH-CONDITION-UNARY":
        this._generate(node.op).space()._generate(node.exp);
        break;
      case "BASH-CONDITION-BINARY":
      case "BASH-ARITHMETIC-BINARY":
        this._generate(node.left)
          .space()
          ._generate(node.op)
          .space()
          ._generate(node.right);
        break;

      case "BASH-DOLLAR-BRACE":
        this.append("$");
        if (!node.short) {
          this.append("{");
        }
        node.iterate((node) => this._generate(node));
        if (!node.short) {
          this.append("}");
        }
        break;
      case "BASH-DOLLAR-PARENS":
        this.append("$(");
        node.iterate((node) => this._generate(node));
        this.append(")");
        break;
      case "BASH-DOUBLE-QUOTED":
        this.append('"');
        node.iterate((node) => this._generate(node));
        this.append('"');
        break;
      case "BASH-SINGLE-QUOTED":
        this.append("'").append(node.value).append("'");
        break;
      case "BASH-WHILE-EXPRESSION":
        this.append("while ")
          ._generate(node.condition)
          .append("; do")
          .indent()
          .newLine()
          ._generate(node.body)
          .deindent()
          .newLine()
          .append("done");
        if (node.semicolon === true) this.append(";");
        break;
      case "BASH-FOR-IN":
        this.append("for ")
          ._generate(node.variable)
          .append(" in ")
          ._generate(node.items)
          .append("; do")
          .indent()
          .newLine()
          ._generate(node.body)
          .deindent()
          .newLine()
          .append("done");
        if (node.semicolon === true) this.append(";");
        break;
      case "BASH-FUNCTION":
        this._generate(node.name).append("() {").indent().newLine();
        this._generate(node.body).deindent().newLine().append("}");
        break;
      case "BASH-IF-EXPRESSION":
        this.append("if ")
          ._generate(node.condition)
          .append(" then")
          .indent()
          .newLine()
          ._generate(node.body)
          .deindent()
          ._generate(node.else)
          .newLine();
        // dont print fi if elif, fi will be handled by the parent if
        if (node.parent.type !== "BASH-IF-ELSE")
          this.trim().newLine().append("fi");
        if (node.semicolon === true) this.append(";");
        break;

      case "BASH-IF-ELSE":
        this.append("el");
        node.iterate((i) => this._generate(i));
        break;
      case "BASH-ASSIGN":
        this._generate(node.left).append("=")._generate(node.right);
        break;
      case "BASH-ASSIGN-LHS":
        this._generate(node.exp);
        break;
      case "BASH-CASE-EXPRESSION":
        this.append("case ")
          ._generate(node.target)
          ._generate(node.cases)
          .newLine()
          .append("esac");
        this._previousNode = node;
        if (node.semicolon === true) this.append(";");
        break;
      case "BASH-CASE-EXPRESSIONS":
        node.iterate((node) => this._generate(node));
        break;
      case "BASH-CASE-EXP-CASE":
        this._generate(node.labels())
          .indent()
          .newLine()
          ._generate(node.stmls())
          .newLine()
          .append(";;")
          .deindent();
        this._previousNode = node;
        break;
      case "BASH-CASE-EXP-CASES":
        this._generate(node.getElement(BashCaseKind)).indent().newLine();
        node.iterate((i) => this._generate(i));
        this.deindent();
        break;
      case "BASH-CASE-KIND":
        switch (node.value) {
          case "30":
            this.append(" in");
            break;

          default:
            if (node.position?.fileContent) {
              console.error(
                "Unknown CASE-KIND:",
                node.value,
                node.position?.fileContent.split("\n")[node.position.lineStart]
              );
            }
            const e = new Error("Unknown CASE-KIND:" + node.value);
            (e as any).node = node;
            this.errors.push(e);

            console.error("Unknown CASE-KIND", node.value);
            this.append(node.value);
            break;
        }
        break;
      case "BASH-CASE-LABELS":
        node.iterate((i, index) => {
          if (index > 0) this.append("|");
          this._generate(i);
        });
        this.append(")");
        break;
      case "BASH-REDIRECT-OVERWRITE":
        this.space().append(">").space();
        node.iterate((node) => this._generate(node));
        break;
      case "BASH-REDIRECT-STDERR":
        this.space().append("2>").space();
        node.iterate((node) => this._generate(node));
        break;
      case "BASH-REDIRECT-APPEND":
        this.space().append(">>").space();
        node.iterate((node) => this._generate(node));
        break;
      case "BASH-REDIRECT-STDIN":
        this.space().append("<").space();
        node.iterate((node) => this._generate(node));
        break;
      case "BASH-BRACE-EXPANSION":
        switch (node.value) {
          case "76":
            this.append("%");
            break;
          case "70":
            this.append("-");
            break;
        }
        node.iterate((node) => this._generate(node));
        break;
      case "BASH-OP":
        switch (node.value) {
          case "9":
            this.append("&");
            break;
          case "10":
            this.append("&&");
            break;
          case "11":
            this.append("||");
            break;
          case "12":
            this.append("|");
            break;
          case "38":
            this.append("=");
            break;
          case '68':
            this.append("==");
            break;
          case '85':
            this.append("!=");
            break;
          default:
            const e = new Error("Unknown BASH-OP:" + node.value);
            (e as any).node = node;
            this.errors.push(e);
            if (node.position?.fileContent) {
              console.error(
                "Unknown BASH-OP:",
                node.value,
                node.position?.fileContent.split("\n")[node.position.lineStart]
              );
            } else if (node.position?.file) {
              if (fs.existsSync(node.position.file)) {
                const filecontent = fs.readFileSync(
                  node.position.file,
                  "utf-8"
                );
                console.error(
                  "Unknown BASH-OP:",
                  node.value,
                  filecontent.split("\n")[node.position.lineStart]
                );
              }
            }
            console.error("Unknown BASH-OP:", node.value);
            this.append(node.value);
            break;
        }
        break;

      case "DOCKER-ADD-SOURCE":
      case "DOCKER-ADD-TARGET":
      case "DOCKER-COPY-SOURCE":
      case "DOCKER-COPY-TARGET":
      case "BASH-COMMAND-COMMAND":
      case "BASH-COMMAND-ARGS":
      case "BASH-COMMAND-PREFIX":
        node.iterate((node) => this.space()._generate(node));
        break;
      case "BASH-SUBSHELL":
        this.append("(");
        node.iterate((i) => this._generate(i));
        this.append(")");
        break;
      case "BASH-BRACE-GROUP":
        this.append("{").indent().newLine();
        node.iterate((i) => {
          this._generate(i);
        });
        this.deindent().newLine().append("}");
        this._previousNode = node;
        break;
      case "MAYBE-SEMANTIC-COMMAND":
        const command = node.getChild(BashCommandCommand);
        if (command) {
          this._generate(command).space();
        }
        node.iterate(
          (i, index) => {
            if (index > 0) this.space();
            this._generate(i);
          },
          (i) => !(i instanceof BashCommandCommand)
        );
        if (node.semicolon === true) this.append(";");
        break;
      case "DOCKER-COMMENT":
        this.append("# " + node.value);
        break;
      case "DOCKER-RUN":
        this.indentLevel = 0;
        this._generate(node.keyword).space();
        this.indent().inCommand();
        node.iterate(
          (node) => this._generate(node),
          (node) => !(node instanceof DockerKeyword)
        );
        this.deindent().outCommand();
        this._previousNode = node;
        break;
      case "DOCKER-SHELL":
        this.indentLevel = 0;
        this._generate(node.keyword).space();
        this.append("[").indent();
        this._generate(node.getElement(DockerShellExecutable));
        for (const i of node.getElements(DockerShellArg)) {
          this.append(", ")._generate(i);
        }
        this.deindent().append("]");
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
        this.indentLevel = 0;
        this.indent();
        node.iterate((i) => this._generate(i));
        this.deindent();
        break;
      case "DOCKER-ENTRYPOINT":
      case "DOCKER-CMD":
        this.indentLevel = 0;
        this._generate(node.keyword).space().append("[");
        node.iterate(
          (i, index) => {
            if (index > 0) this.append(", ");
            this._generate(i);
          },
          (node) => !(node instanceof DockerKeyword)
        );
        this.append("]");
        break;
      case "DOCKER-VOLUME":
      case "DOCKER-HEALTHCHECK":
        this.indentLevel = 0;
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
        this.indentLevel = 0;
        this.append("ARG ");
        node.iterate(
          (i, index) => {
            if (index > 0) this.append("=");
            this._generate(i);
          },
          (node) => !(node instanceof DockerKeyword)
        );
        break;
      case "DOCKER-USER":
        this.indentLevel = 0;
        this.append("USER ");
        node.iterate(
          (i, index) => {
            if (index > 0) this.append(", ");
            this._generate(i);
          },
          (node) => !(node instanceof DockerKeyword)
        );
        break;
      case "UNKNOWN":
        console.trace("Type not supported: ", node.children[0].toString());
        const er = new Error(
          "Type not supported: " + node.children[0].toString()
        );
        (er as any).node = node;
        this.errors.push(er);
        break;
      default:
        console.trace("Type not supported: ", node.type);
        const e = new Error("Type not supported: " + node.type);
        (e as any).node = node;
        this.errors.push(e);
        if (node instanceof GenericNode && node.original) {
          this.append(`[ENRICHED: ${node.toString(true)}] `);
        } else if (node.original !== null) {
          node.original.iterate((i) => this._generate(i));
        } else {
          node.iterate((i) => this._generate(i));
        }
    }
    return this;
  }

  print(): string {
    this._generate(this.root);
    return this.output;
  }
}

export function print(node: DockerOpsNodeType, original = false) {
  return new Printer(node, original).print();
}
