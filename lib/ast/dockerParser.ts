import { Argument, DockerfileParser, JSONInstruction } from "dockerfile-ast";
import { createEnrichers } from "./commands";
import { parseShell } from "./shellParser";
import {
  DockerAdd,
  DockerAddSource,
  DockerAddTarget,
  DockerArg,
  DockerCmd,
  DockerCmdArg,
  DockerComment,
  DockerCopy,
  DockerCopySource,
  DockerCopyTarget,
  DockerEntrypoint,
  DockerEntrypointArg,
  DockerEntrypointExecutable,
  DockerEnv,
  DockerExpose,
  DockerFile,
  DockerFrom,
  DockerImageName,
  DockerImageRepo,
  DockerImageTag,
  DockerLiteral,
  DockerName,
  DockerPath,
  DockerPort,
  DockerRun,
  DockerShell,
  DockerShellArg,
  DockerShellExecutable,
  DockerUser,
  DockerVolume,
  DockerWorkdir,
  Position,
} from "./type";

const COMMAND_MAP = createEnrichers();

export function parseDocker(filepath: string): DockerFile {
  const dockerfileAST: DockerFile = new DockerFile();

  const lines = DockerfileParser.parse(filepath);
  dockerfileAST.setPosition(
    new Position(lines.getRange().start.line, 0, lines.getRange().end.line, 0)
  );
  for (const comment of lines.getComments()) {
    const position = new Position(
      comment.getRange().start.line,
      0,
      comment.getRange().end.line,
      0
    );
    dockerfileAST.addChild(
      new DockerComment(comment.getContent()).setPosition(position)
    );
  }
  for (const line of lines.getInstructions()) {
    const position = new Position(
      line.getRange().start.line,
      0,
      line.getRange().end.line,
      0
    );
    const command = line.getKeyword().toLowerCase();
    switch (command) {
      case "from":
        const fromNode = new DockerFrom();
        fromNode.setPosition(position);
        const value: string = line.getArgumentsContent();
        let name = value;
        if (value.includes("/")) {
          name = value.split("/").at(-1).trim();
        }
        if (value.includes(":")) {
          name = name.split(":")[0].trim();
        }
        fromNode.addChild(new DockerImageName(name));

        if (value.includes("/")) {
          fromNode.addChild(new DockerImageRepo(value.split("/")[0].trim()));
        }
        if (value.includes(":")) {
          fromNode.addChild(new DockerImageTag(value.split(":").at(-1).trim()));
        }
        dockerfileAST.addChild(fromNode);
        break;
      case "run":
        const dockerRun = new DockerRun();
        dockerRun.setPosition(position);
        const argsRange = line.getArgumentsRange();
        const doc = (line as any).document;
        const shellString = doc
          .getText()
          .substring(doc.offsetAt(argsRange.start), doc.offsetAt(argsRange.end))
          // required to consider that the comments are in the bash AST otherwise they will break lines and make the AST invalid
          .replace(/#([^\\\n]*)$/gm, "#$1\\");
        dockerRun.addChild(parseShell(shellString));
        dockerfileAST.addChild(dockerRun);
        break;
      case "copy":
        const copy = new DockerCopy();
        copy.setPosition(position);
        for (let i = 0; i < line.getArguments().length; i++) {
          const arg = line.getArguments()[i];
          let type: DockerCopyTarget | DockerCopySource;
          if (i === line.getArguments().length - 1) {
            type = new DockerCopyTarget();
          } else {
            type = new DockerCopySource();
          }
          type.addChild(new DockerPath(arg.getValue()));
          copy.addChild(type);
        }
        dockerfileAST.addChild(copy);
        break;
      case "add":
        const add = new DockerAdd();
        add.setPosition(position);
        for (let i = 0; i < line.getArguments().length; i++) {
          const arg = line.getArguments()[i];
          let type: DockerAddTarget | DockerAddSource;
          if (i === line.getArguments().length - 1) {
            type = new DockerAddTarget();
          } else {
            type = new DockerAddSource();
          }
          type.addChild(new DockerPath(arg.getValue()));
          add.addChild(type);
        }
        dockerfileAST.addChild(add);
        break;
      case "expose":
        dockerfileAST.addChild(
          new DockerExpose()
            .setPosition(position)
            .addChild(new DockerPort(line.getArgumentsContent()))
        );
        break;
      case "workdir":
        const wkd = new DockerWorkdir().addChild(
          new DockerPath(line.getArgumentsContent())
        );
        wkd.setPosition(position);
        dockerfileAST.addChild(wkd);
        break;
      case "volume":
        for (const arg of line.getArguments()) {
          dockerfileAST.addChild(
            new DockerVolume().addChild(new DockerPath(arg.toString()))
          );
        }
        break;
      case "arg":
        const arg = new DockerArg().addChild(
          new DockerName(line.getArgumentsContent().split("=")[0])
        );
        arg.setPosition(position);
        if (line.getArgumentsContent().includes("=")) {
          arg.addChild(
            new DockerLiteral(line.getArgumentsContent().split("=")[1].trim())
          );
        }
        dockerfileAST.addChild(arg);
        break;
      case "env":
        const args = line.getArguments();

        const env = new DockerEnv().addChild(
          new DockerName(args[0].getValue())
        );
        env.setPosition(position);
        for (let i = 1; i < args.length; i++) {
          env.addChild(new DockerLiteral(args[i].getValue()));
        }
        dockerfileAST.addChild(env);
        break;
      case "entrypoint":
        let entrypointArgs: Argument[] = (
          line as JSONInstruction
        ).getJSONStrings();
        if (entrypointArgs.length == 0) entrypointArgs = line.getArguments();

        const entrypoint = new DockerEntrypoint().addChild(
          new DockerEntrypointExecutable(entrypointArgs[0].getValue())
        );
        entrypoint.setPosition(position);
        for (let i = 1; i < entrypointArgs.length; i++) {
          entrypoint.addChild(
            new DockerEntrypointArg(entrypointArgs[i].getValue())
          );
        }
        dockerfileAST.addChild(entrypoint);
        break;
      case "cmd":
        const cmd = new DockerCmd();
        cmd.setPosition(position);
        let argus: Argument[] = (line as JSONInstruction).getJSONStrings();
        if (argus.length == 0) argus = line.getArguments();
        for (const arg of argus) {
          cmd.addChild(new DockerCmdArg(arg.getValue()));
        }
        dockerfileAST.addChild(cmd);
        break;
      case "shell":
        const shell = new DockerShell().addChild(
          new DockerShellExecutable(line.getArguments()[0].getValue())
        );
        cmd.setPosition(position);
        for (let i = 1; i < line.getArguments().length; i++) {
          shell.addChild(new DockerShellArg(line.getArguments()[i].getValue()));
        }
        dockerfileAST.addChild(shell);
        break;
      case "user":
        const user = new DockerUser().addChild(
          new DockerLiteral(line.getArgumentsContent())
        );
        user.setPosition(position);
        dockerfileAST.addChild(user);
        break;
      default:
        console.error("COMMAND not found", command);
    }
  }
  return dockerfileAST;
}
