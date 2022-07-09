import {
  DockerOpsNodeType,
  DockerShellArg,
  DockerShellExecutable,
  GenericNode,
} from "./type";

class Printer {
  indentLevel = 0;
  indentChar = "    ";
  output: string = "";
  _previousNode: DockerOpsNodeType | null = null;
  constructor(readonly root: DockerOpsNodeType, public original = false) {}

  newLine() {
    this.output += "\n" + this.indentChar.repeat(this.indentLevel);
    return this;
  }
  space() {
    if (this.output.charAt(this.output.length - 1) == " ") return this;
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

  _generate(node: DockerOpsNodeType) {
    if (node == null) return this;
    if (this.original && node.original) {
      node = node.original;
    }

    if (this._previousNode?.position?.lineEnd < node.position?.lineStart) {
      const nbLines =
        node.position?.lineStart - this._previousNode?.position?.lineEnd;
      this.newLine();
    }
    this._previousNode = node;
    switch (node.type) {
      case "BASH-SCRIPT":
        this._previousNode = null;
      case "DOCKER-FILE":
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
        node.iterate((i) => this._generate(i));
        break;
      case "DOCKER-IMAGE-NAME":
      case "DOCKER-NAME":
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
        this.append(node.value);
        break;
      case "DOCKER-IMAGE-REPO":
        this.append(node.value + "/");
        break;
      case "DOCKER-IMAGE-TAG":
        this.append(":" + node.value);
        break;
      case "BASH-COMMENT":
        this.append(
          "#" +
            node.value
              .trimEnd()
              // remove the \ that has been added at the end of the line
              .replace(/(.*)\\$/g, "$1")
        );
        break;
      case "BASH-CONDITION-UNARY":
        this._generate(node.op).space()._generate(node.exp);
        break;
      case "BASH-CONDITION-BINARY":
        this._generate(node.left)
          .space()
          ._generate(node.op)
          .space()
          ._generate(node.right);
        break;
      case "BASH-DOLLAR-PARENS":
        this.append("${");
        node.iterate((node) => this._generate(node));
        this.append("}");
        break;
      case "BASH-DOUBLE-QUOTED":
        this.append('"');
        node.iterate((node) => this._generate(node));
        this.append('"');
        break;
      case "BASH-SINGLE-QUOTED":
        this.append("'").append(node.value).append("'");
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
      case "BASH-CASE-EXPRESSIONS":
        node.iterate((node) => this._generate(node));
        this.trim().newLine().append(";;");
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
        this._generate(node.left).append(" = ")._generate(node.right);
        break;
      case "BASH-ASSIGN-LHS":
        this._generate(node.exp);
        break;
      case "BASH-CASE-EXPRESSION":
        this.append("case ")
          ._generate(node.target)
          .indent()
          .newLine()
          ._generate(node.cases)
          .deindent()
          .trim()
          .newLine()
          .append("esac");
        if (node.semicolon === true) this.append(";");
        break;
      case "BASH-CASE-EXP-CASE":
        this._generate(node.kind())
          .append(" ")
          ._generate(node.labels())
          .indent()
          .newLine()
          ._generate(node.stmls())
          .deindent();
        break;
      case "BASH-CASE-EXP-CASES":
        node.iterate((i) => {
          this._generate(i).newLine();
        });
        break;
      case "BASH-CASE-KIND":
        switch (node.value) {
          case "30":
            this.append("in");
            break;

          default:
            console.error("Unknow CASE-KIND", node.value);
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
        this.append("> ");
        node.iterate((node) => this._generate(node));
        break;
      case "BASH-REDIRECT-STDERR":
        this.append("2> ");
        node.iterate((node) => this._generate(node));
        break;
      case "BASH-REDIRECT-APPEND":
        this.append(">> ");
        node.iterate((node) => this._generate(node));
        break;
      case "BASH-REDIRECT-STDIN":
        this.append("< ");
        node.iterate((node) => this._generate(node));
        break;
      case "BASH-BRACE-EXPANSION":
        switch (node.value) {
          case "76":
            this.append("%");
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

          default:
            console.error("Unknow BASH-OP:", node.value);
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
        node.iterate((i) => this._generate(i).space());
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
        break;
      case "MAYBE-SEMANTIC-COMMAND":
        this.indent();
        node.iterate((i) => {
          this._generate(i);
        });
        this.deindent();
        this.trim();
        if (node.semicolon === true) this.append(";");
        break;
      case "DOCKER-COMMENT":
        this.append("# " + node.value);
        break;
      case "DOCKER-FROM":
        this.indentLevel = 0;
        this.append("FROM ");
        node.iterate((i) => this._generate(i));
        this.newLine().newLine();
        break;
      case "DOCKER-RUN":
        this.indentLevel = 0;
        this.append("RUN ").indent();
        node.iterate((i) => this._generate(i));
        this.deindent().newLine();
        break;
      case "DOCKER-SHELL":
        this.indentLevel = 0;
        this.append("SHELL [").indent();
        this._generate(node.getElement(DockerShellExecutable));
        for (const i of node.getElements(DockerShellArg)) {
          this.append(", ")._generate(i);
        }
        this.deindent().append("]").newLine();
        break;
      case "DOCKER-ADD":
        this.indentLevel = 0;
        this.append("ADD ").indent();
        node.iterate((i) => this._generate(i));
        this.deindent().newLine();
        break;
      case "DOCKER-COPY":
        this.indentLevel = 0;
        this.append("COPY ").indent();
        node.iterate((i) => this._generate(i).space());
        this.deindent().newLine();
        break;
      case "DOCKER-WORKDIR":
        this.indentLevel = 0;
        this.append("WORKDIR ").indent();
        node.iterate((i) => this._generate(i));
        this.deindent().newLine();
        break;
      case "DOCKER-ENV":
        this.indentLevel = 0;
        this.append("ENV ").indent();
        node.iterate((i) => this._generate(i).space());
        this.deindent().newLine();
        break;
      case "DOCKER-EXPOSE":
        this.indentLevel = 0;
        this.append("EXPOSE ").indent();
        node.iterate((i) => this._generate(i).space());
        this.deindent().newLine();
        break;
      case "DOCKER-ENTRYPOINT":
        this.indentLevel = 0;
        this.append("ENTRYPOINT [").indent();
        node.iterate((i, index) => {
          if (index > 0) this.append(", ");
          this._generate(i);
        });
        this.append("]").deindent().newLine();
        break;
      case "DOCKER-CMD":
        this.indentLevel = 0;
        this.append("CMD ");
        this.append("[");
        node.iterate((i, index) => {
          if (index > 0) this.append(", ");
          this._generate(i);
        });
        this.append("]");
        this.newLine();
        break;
      case "DOCKER-VOLUME":
        this.indentLevel = 0;
        this.append("VOLUME ");
        node.iterate((i, index) => {
          if (index > 0) this.append(", ");
          this._generate(i);
        });
        this.newLine();
        break;
      case "DOCKER-USER":
        this.indentLevel = 0;
        this.append("USER ");
        node.iterate((i, index) => {
          if (index > 0) this.append(", ");
          this._generate(i);
        });
        this.newLine();
        break;
      default:
        console.error("Type not supported: ", node.type);
        if (node instanceof GenericNode && node.original) {
          this.append(`[ENRICHED: ${node.original.children[0].toString()}] `);
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
