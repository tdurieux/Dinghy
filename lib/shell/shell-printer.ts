import {
  BashCommandCommand,
  BashCommandPrefix,
  BashIfElse,
  BashIfExpression,
  BashLiteral,
  BashStatement,
  BashWord,
  BashWordIteration,
  ShellNodeTypes,
} from "./shell-types";

import { ParserError } from "../core/core-types";
import { Printer } from "../core/printer";

export class ShellPrinter extends Printer<ShellNodeTypes> {
  _generate(node: ShellNodeTypes | null, printNewLine = true) {
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
      case "BASH-CONDITION-EXP":
      case "BASH-CONDITION-BINARY-LHS":
      case "BASH-CONDITION-BINARY-RHS":
      case "BASH-CONDITION-BINARY-OP":
      case "BASH-CONDITION-UNARY-EXP":
      case "BASH-FUNCTION-NAME":
      case "BASH-WORD":
      case "BASH-PATH":
      case "BASH-CASE-EXP-TARGET":
      case "BASH-FUNCTION-BODY":
      case "BASH-FOR-IN-BODY":
      case "BASH-PROC-SUB-BODY":
      case "BASH-ARITHMETIC-BINARY-RHS":
      case "BASH-ARITHMETIC-BINARY-LHS":
      case "BASH-ARITHMETIC-BINARY-OP":
      case "BASH-BRACE-EXPANSION":
      case "BASH-UNTIL-CONDITION":
      case "BASH-UNTIL-BODY":
        node.iterate((i) => this._generate(i));
        break;
      case "BASH-LITERAL":
      case "BASH-VARIABLE":
      case "BASH-CONDITION-UNARY-OP":
      case "BASH-GLOB":
      case "BASH-EXT-GLOB":
      case "BASH-DOLLAR-SINGLE-QUOTED":
      case "BASH-CONDITION-OP":
        this.append(node.value.replace(/\n/g, "\\\n"));
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
      case "BASH-DECL-CLAUSE":
        this.append(node.value).space();
        node.iterate((i) => this._generate(i));
        break;
      case "BASH-PROC-SUB":
        this._generate(node.op).append("(")._generate(node.body).append(")");
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
        this.indent();
        this._generate(node.condition)
          ._generate(node.body)
          ._generate(node.else);
        this.deindent();
        // dont print fi if elif, fi will be handled by the parent if
        if (node.getChild(BashIfElse) === null) {
          const tmpNode = new BashLiteral("fi").setPosition(node.fiPosition);
          this._printLineUntilPreviousNode(tmpNode);
          this.append("fi");
          this.previousNode = tmpNode;
        }
        break;
      case "BASH-CONDITION":
        this.append("[").space();
        node.iterate((i) => this._generate(i).space());
        this.space().append("]");
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
            this.errors.push(
              new ParserError("Unknown CASE-KIND:" + node.value, node)
            );

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
      case "BASH-REDIRECT":
        const redirectOp = node.op;
        this.space().append(redirectOp.toString()).space();
        node.iterate((node) => {
          if (node != redirectOp) this._generate(node);
        });
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
        }
        break;
      case "BASH-COMMAND-COMMAND":
      case "BASH-COMMAND-ARGS":
      case "BASH-COMMAND-PREFIX":
        if (
          this.writer.output.length > 0 &&
          this.writer.output.at(-1).match(/[\w\/\*;]/)
        ) {
          this.space();
        }
        node.iterate((node) => this._generate(node));
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
      // case "UNKNOWN":
      //   this.errors.push(
      //     new ParserError(
      //       "Type not supported: " + node.children[0].toString(),
      //       node
      //     )
      //   );
      //   break;
      default:
        this.errors.push(
          new ParserError("Type not supported: " + node.type, node)
        );
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
    this.writer.trimSpace();
    return this.writer.output;
  }
}

export function shellPrint(node: ShellNodeTypes) {
  return new ShellPrinter(node).print();
}
