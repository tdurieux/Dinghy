import {
  Argument,
  DockerfileParser,
  From,
  JSONInstruction,
  Line,
} from "dockerfile-ast";
import { readFileSync } from "fs";
import { ShellParser } from "./docker-bash-parser";
import {
  BashLiteral,
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
  DockerImageAlias,
  DockerImageDigest,
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
  Unknown,
} from "./docker-type";

function rangeToPos(range: ReturnType<Line["getRange"]>) {
  return new Position(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}

export class DockerParser {
  public readonly errors = [];
  public filename: string;
  constructor(public readonly fileContent: string) {}

  async parse(): Promise<DockerFile> {
    const dockerfileAST: DockerFile = new DockerFile();

    const lines = DockerfileParser.parse(this.fileContent);
    dockerfileAST.setPosition(rangeToPos(lines.getRange()));

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
      const position = rangeToPos(line.getRange());
      const command = line.getKeyword().toLowerCase();
      switch (command) {
        case "from":
          const from = line as From;
          const fromNode = new DockerFrom();
          fromNode.setPosition(position);
          if (from.getRegistry()) {
            fromNode.addChild(
              new DockerImageRepo(from.getRegistry()).setPosition(
                rangeToPos(from.getRegistryRange())
              )
            );
          }
          if (from.getImageName()) {
            fromNode.addChild(
              new DockerImageName(from.getImageName()).setPosition(
                rangeToPos(from.getImageNameRange())
              )
            );
          }

          if (from.getImageTag()) {
            fromNode.addChild(
              new DockerImageTag(from.getImageTag()).setPosition(
                rangeToPos(from.getImageTagRange())
              )
            );
          }
          if (from.getImageDigest()) {
            fromNode.addChild(
              new DockerImageDigest(from.getImageDigest()).setPosition(
                rangeToPos(from.getImageDigestRange())
              )
            );
          }

          if (from.getBuildStage()) {
            fromNode.addChild(
              new DockerImageAlias(from.getBuildStage()).setPosition(
                rangeToPos(from.getBuildStageRange())
              )
            );
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
            .substring(
              doc.offsetAt(argsRange.start),
              doc.offsetAt(line.getRange().end)
            )
            // required to consider that the comments are in the bash AST otherwise they will break lines and make the AST invalid
            .replace(/#([^\\\n]*)$/gm, "#$1\\");
          const shellParser = new ShellParser(shellString, position);
          dockerRun.addChild(await shellParser.parse());
          // happen all errors
          shellParser.errors.forEach((v) => this.errors.push(v));
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
          const shell = new DockerShell();
          shell.setPosition(position);
          argus = (line as JSONInstruction).getJSONStrings();
          if (argus.length == 0) argus = line.getArguments();
          shell.addChild(
            new DockerShellExecutable(argus[0].getValue()).setPosition(
              rangeToPos(argus[0].getRange())
            )
          );
          for (let index = 1; index < argus.length; index++) {
            const arg = argus[index];
            shell.addChild(
              new DockerShellArg(arg.getValue()).setPosition(
                rangeToPos(arg.getRange())
              )
            );
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
          const e = new Error(`Unhandled Docker command: ${command}`);
          (e as any).node = line;
          this.errors.push(e);
          console.error("COMMAND not found", command);
          dockerfileAST.addChild(
            new Unknown()
              .setPosition(position)
              .addChild(new BashLiteral(command))
          );
      }
    }
    return dockerfileAST;
  }
}

export async function parseDockerFile(filePath: string) {
  const parser = new DockerParser(readFileSync(filePath, "utf8"));
  parser.filename = filePath;
  return parser.parse();
}

export async function parseDocker(fileContent: string) {
  const parser = new DockerParser(fileContent);
  return parser.parse();
}
