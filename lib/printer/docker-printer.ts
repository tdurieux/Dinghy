import {
  BashCommandCommand,
  BashCommandPrefix,
  BashComment,
  BashIfElse,
  BashIfExpression,
  BashLiteral,
  BashStatement,
  BashWord,
  BashWordIteration,
  DockerFile,
  DockerKeyword,
  DockerLiteral,
  DockerName,
  DockerOpsNodeType,
  DockerRun,
  DockerShellArg,
  DockerShellExecutable,
} from "../docker-type";

export class Printer {
  _indentLevel = 0;
  indentChar = "  ";
  output: string = "";
  _inCommand: boolean = false;
  _previousNode: Record<string, DockerOpsNodeType> = {};
  readonly errors: Error[] = [];
  constructor(readonly root: DockerOpsNodeType) {}

  inCommand() {
    this._inCommand = true;
    return this;
  }
  outCommand() {
    this._inCommand = false;
    return this;
  }
  get indentLevel() {
    return this._indentLevel;
  }
  set indentLevel(value: number) {
    this._indentLevel = Math.max(value, 0);
  }

  protected getIndent() {
    return this.indentChar.repeat(this.indentLevel);
  }
  writeIndent() {
    return this.append(this.getIndent());
  }

  newLine() {
    const newLineAndIndent = "\n" + this.getIndent();

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
        this.output.length - this.indentChar.length * this.indentLevel
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

  trimSpace() {
    this.output = this.output.replace(/ +$/, "");
    return this;
  }
  _getPreviousNodePosition(node: DockerOpsNodeType) {
    return this._getPreviousNode(node)?.position;
  }
  _getPreviousNode(node: DockerOpsNodeType) {
    return this._previousNode[node?.position?.file?.key || "new"];
  }
  set previousNode(node: DockerOpsNodeType) {
    this._previousNode[node?.position?.file?.key || "new"] = node;
  }
  _printLineUntilPreviousNode(
    node: DockerOpsNodeType,
    previousNode = this._getPreviousNode(node)
  ) {
    const previousNodePosition = previousNode?.position;
    if (previousNodePosition?.lineEnd < node.position?.lineStart) {
      let nbLines = Math.abs(
        Math.abs(node.position?.lineStart) - previousNodePosition?.lineEnd
      );
      if (!node.position?.file?.key) {
        nbLines = Math.min(nbLines, 1);
      }
      const inCommand = this._inCommand;
      if (previousNode instanceof BashComment) {
        this.outCommand();
      }
      for (let i = 0; i < nbLines; i++) {
        this.newLine();
      }
      this._inCommand = inCommand;
    } else if (node instanceof DockerRun && this.output.length > 0) {
      this.newLine();
    } else if (
      this._getPreviousNode(node.getParent(DockerFile)) instanceof
        BashComment &&
      previousNode == undefined
    ) {
      // new element generated after a comment
      this.newLine();
    }
  }

  _generate(node: DockerOpsNodeType, printNewLine = true) {
    if (node == null) return this;

    if (printNewLine) {
      this._printLineUntilPreviousNode(node);
    }

    this.previousNode = node;
    if (node.position?.file?.key) {
      delete this._previousNode["new"];
    }

    if (node instanceof BashStatement && node.isNegated) {
      this.append("!");
    }
    switch (node.type) {
      case "BASH-SCRIPT":
      // this._previousNode[node.position?.file?.key || "new"] = null;
      case "BASH-ASSIGN-RHS":
      case "BASH-CONDITION-BINARY-LHS":
      case "BASH-CONDITION-BINARY-RHS":
      case "BASH-CONDITION-BINARY-OP":
      case "BASH-CONDITION-UNARY-EXP":
      case "BASH-FUNCTION-NAME":
      case "BASH-WORD":
      case "BASH-PATH":
      case "BASH-REDIRECT-REDIRECTS":
      case "BASH-REDIRECT":
      case "BASH-CASE-EXP-TARGET":
      case "BASH-FUNCTION-BODY":
      case "BASH-FOR-IN-BODY":
      case "BASH-ARITHMETIC-BINARY-RHS":
      case "BASH-ARITHMETIC-BINARY-LHS":
      case "BASH-ARITHMETIC-BINARY-OP":
      case "BASH-BRACE-EXPANSION":
      case "BASH-UNTIL-CONDITION":
      case "BASH-UNTIL-BODY":
      case "DOCKER-FILE":
        node.iterate((i) => this._generate(i));
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
      case "BASH-COMMENT":
        this.append("#" + node.value);
        break;
      case "BASH-CONDITION-UNARY":
        this._generate(node.op).space()._generate(node.exp);
        break;
      case "BASH-ARITHMETIC-EXPRESSION":
        this.append("$(( ");
        if (node.bracket) {
        }
        node.iterate((i) => this._generate(i));
        this.space().append("))");
        if (node.bracket) {
        }
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
        this.append("while").space()._generate(node.condition).append(";");
        const tmpDoNode = new BashLiteral("do").setPosition(node.doPosition);
        this._printLineUntilPreviousNode(tmpDoNode);
        this.previousNode = tmpDoNode;
        this.space().append("do").space();
        this.indent()._generate(node.body).deindent();
        const tmpDoneNode = new BashLiteral("done").setPosition(
          node.donePosition
        );
        this._printLineUntilPreviousNode(tmpDoneNode);
        this.previousNode = tmpDoneNode;
        this.append("done");
        break;
      case "BASH-WORD-ITERATION":
        this._generate(node.variable);

        if (node.items.length > 0) {
          const tmpForInNode = new BashLiteral("in").setPosition(
            node.inPosition
          );
          this._printLineUntilPreviousNode(tmpForInNode);
          this.previousNode = tmpForInNode;
          this.space().append("in");
          // print items
          node.iterate(
            (node) => this.space()._generate(node),
            (node) => node instanceof BashWord
          );
        }
        break;
      case "BASH-FOR-IN":
        const tmpForNode = new BashLiteral("for").setPosition(node.forPosition);
        this._printLineUntilPreviousNode(tmpForNode);
        this.previousNode = tmpForNode;
        this.append("for").space();
        this._generate(node.getChild(BashWordIteration));
        this.append(";").space();

        const tmpForDoNode = new BashLiteral("do").setPosition(node.doPosition);
        this._printLineUntilPreviousNode(tmpForDoNode);
        this.previousNode = tmpForDoNode;
        this.append("do").indent();

        this._generate(node.body).deindent();
        const tmpForDoneNode = new BashLiteral("done").setPosition(
          node.donePosition
        );
        this._printLineUntilPreviousNode(tmpForDoneNode);
        this.previousNode = tmpForDoneNode;
        this.append("done");
        break;
      case "BASH-FUNCTION":
        this._generate(node.name).append("() {").indent().newLine();
        this._generate(node.body).deindent().newLine().append("}");
        break;
      case "BASH-IF-EXPRESSION":
        let ifChar = "if";
        if (node.parent instanceof BashIfElse) {
          if (node.condition) {
            ifChar = "elif";
          } else {
            ifChar = "else";
          }
        }
        // print the if/elif/else before the condition
        const tmpNode = new BashLiteral(ifChar).setPosition(node.ifPosition);
        this._printLineUntilPreviousNode(tmpNode);
        this.append(ifChar).space();
        this.previousNode = tmpNode;

        this._generate(node.condition)
          ._generate(node.body)
          ._generate(node.else);

        // dont print fi if elif, fi will be handled by the parent if
        if (node.getChild(BashIfElse) === null) {
          const tmpNode = new BashLiteral("fi").setPosition(node.fiPosition);
          this._printLineUntilPreviousNode(tmpNode);
          this.append("fi");
          this.previousNode = tmpNode;
        }
        break;
      case "BASH-IF-CONDITION":
        node.iterate((i) => this._generate(i));
        const lastChild = node.children[node.children.length - 1];
        if (lastChild instanceof BashStatement && !lastChild.semicolon) {
          this.append(";");
        }
        break;
      case "BASH-IF-THEN":
        if (node.getParent(BashIfExpression).condition) {
          const tmpNode = new BashLiteral("then").setPosition(
            node.thenPosition
          );
          this._printLineUntilPreviousNode(tmpNode);
          this.space().append("then").space();
          this.previousNode = tmpNode;
          this.newLine();
        }
        this.indent();
        node.iterate((i) => this._generate(i));
        this.deindent();
        break;
      case "BASH-IF-ELSE":
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
          .space()
          .append("in")
          ._generate(node.cases)
          .newLine()
          .append("esac");
        this.previousNode = node;
        if (node.position?.file?.key) {
          delete this._previousNode["new"];
        }
        break;
      case "BASH-CASE-EXPRESSIONS":
        node.iterate((node) => this._generate(node));
        break;
      case "BASH-CASE-EXP-CASE":
        this._generate(node.labels())
          .indent()
          ._generate(node.stmls())
          ._generate(node.kind())
          .deindent();
        this.previousNode = node;
        if (node.position?.file?.key) {
          delete this._previousNode["new"];
        }
        break;
      case "BASH-CASE-EXP-CASES":
        node.iterate((i) => this._generate(i));
        this.deindent();
        break;
      case "BASH-CASE-KIND":
        switch (node.value) {
          case "30":
            this.space().append(";;");
            break;

          default:
            if (node.position?.file) {
              console.error(
                "Unknown CASE-KIND:",
                node.value,
                node.position?.file.contentOfNode(node)
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

      case "BASH-REPLACE":
        this.append("/");
        if (node.replaceAll) {
          this.append("/");
        }
        this._generate(node.children[0]);
        if (node.children.length > 1) {
          this.append("/");
          this._generate(node.children[1]);
        }
        break;
      case "BASH-OP":
        try {
          this.append(node.toString());
        } catch (error) {
          if (node.position?.file != null) {
            console.error(
              "Unknown BASH-OP:",
              node.position?.file,
              node.value,
              node.position?.file.contentOfNode(node)
            );
          } else {
            console.error("Unknown BASH-OP:", node.value, node.position);
          }
          this.append(node.value);
          this.append(node.value);
          this.append(node.value);
        }
        break;

      case "DOCKER-ADD-SOURCE":
      case "DOCKER-ADD-TARGET":
      case "DOCKER-COPY-SOURCE":
      case "DOCKER-COPY-TARGET":
      case "BASH-COMMAND-COMMAND":
      case "BASH-COMMAND-ARGS":
      case "BASH-COMMAND-PREFIX":
        node.iterate((node) => {
          if (this.output.length > 0 && this.output.at(-1).match(/[\w\/\*]/)) {
            this.space();
          }
          this._generate(node);
        });
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
        this.previousNode = node;
        if (node.position?.file?.key) {
          delete this._previousNode["new"];
        }
        break;
      case "BASH-COMMAND":
        const prefix = node.getChildren(BashCommandPrefix);
        if (prefix) {
          prefix.forEach((i) => this._generate(i).space());
        }
        const command = node.getChild(BashCommandCommand);
        if (command) {
          this._generate(command).space();
        }
        node.iterate(
          (i, index) => {
            if (index > 0) this.space();
            this._generate(i);
          },
          (i) =>
            !(i instanceof BashCommandCommand) &&
            !(i instanceof BashCommandPrefix)
        );
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
        this.previousNode = node;
        if (node.position?.file?.key) {
          delete this._previousNode["new"];
        }
        break;
      case "DOCKER-SHELL":
        this.indentLevel = 0;
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
        this.indentLevel = 0;
        this.indent().inCommand();
        node.iterate((i) => this._generate(i));
        this.deindent().outCommand();
        break;
      case "DOCKER-ENTRYPOINT":
      case "DOCKER-CMD":
        this.indentLevel = 0;
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
        console.trace(
          "Type not supported: ",
          node.children[0].toString(),
          node.position?.file?.path
        );
        const er = new Error(
          "Type not supported: " + node.children[0].toString()
        );
        (er as any).node = node;
        this.errors.push(er);
        break;
      default:
        console.trace(
          "Type not supported: " +
            node.type +
            node.position.file.contentOfNode(node)
        );
        const e = new Error("Type not supported: " + node.type);
        (e as any).node = node;
        this.errors.push(e);
        node.iterate((i) => this._generate(i));
    }
    if (node instanceof BashStatement) {
      if (node.semicolon === true) {
        // print new lines before semicolon
        const tmpNode = new BashLiteral(";").setPosition(
          node.semicolonPosition
        );
        this._printLineUntilPreviousNode(tmpNode, node);
        this.previousNode = tmpNode;
        if (node.isBackground) {
          this.space().append("&").space();
        } else if (node.isCoprocess) {
          this.space().append("|&").space();
        } else {
          this.append(";").space();
        }
      }
    }
    return this;
  }

  print(): string {
    this._generate(this.root);
    this.trimSpace();
    return this.output;
  }
}

export function print(node: DockerOpsNodeType) {
  return new Printer(node).print();
}
