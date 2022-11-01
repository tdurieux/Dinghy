import {
  Argument,
  DockerfileParser,
  From,
  JSONInstruction,
  Label,
  Line,
  Shell,
} from "@tdurieux/dockerfile-ast";
import { readFileSync } from "fs";
import { ShellParser } from "./docker-bash-parser";
import {
  AsString,
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
  DockerHealthCheck,
  DockerImageAlias,
  DockerImageDigest,
  DockerImageName,
  DockerImageRepo,
  DockerImageTag,
  DockerLiteral,
  DockerName,
  DockerKeyword,
  DockerOnBuild,
  DockerPath,
  DockerPort,
  DockerRun,
  DockerShell,
  DockerShellArg,
  DockerShellExecutable,
  DockerStopSignal,
  DockerUser,
  DockerVolume,
  DockerWorkdir,
  Position,
  Unknown,
  DockerLabel,
  DockerMaintainer,
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
  public readonly errors: Error[] = [];
  public filename: string;
  constructor(public readonly fileContent: string, filename?: string) {
    if (filename) this.filename = filename;
  }

  async parse(): Promise<DockerFile> {
    const dockerfileAST: DockerFile = new DockerFile();
    if (!this.fileContent || this.fileContent.trim().length == 0)
      return dockerfileAST;
    dockerfileAST.fileContent = this.fileContent;

    const lines = DockerfileParser.parse(this.fileContent);
    if (!lines.getRange()) return dockerfileAST;
    dockerfileAST.setPosition(rangeToPos(lines.getRange()));

    const instructionLines = new Set<number>();
    for (const line of lines.getInstructions()) {
      const position = rangeToPos(line.getRange());
      for (let line = position.lineStart; line <= position.lineEnd; line++) {
        instructionLines.add(line);
      }
      position.file = this.filename;
      position.fileContent = this.fileContent;
      const command = line.getKeyword().toLowerCase();
      switch (command) {
        case "from":
          const from = line as From;
          const fromNode = new DockerFrom();
          fromNode.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );
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

          dockerRun.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

          const shellString = line
            .getRawArgumentsContent()
            // required to consider that the comments are in the bash AST otherwise they will break lines and make the AST invalid
            .replace(/\r\n/gm, "\n")
            .replace(/#([^\\\n]*)$/gm, "#$1\\")
            .replace(/\\ +\n/gm, "\\\n")
            .replace(/^( *)\n/gm, "$1\\\n");
          const shellParser = new ShellParser(
            shellString,
            rangeToPos(line.getArgumentsRange())
          );
          const shellNode = await shellParser.parse();
          dockerRun.addChild(shellNode);
          // happen all errors
          shellParser.errors.forEach((v) => this.errors.push(v));
          dockerfileAST.addChild(dockerRun);
          break;
        case "copy":
          const copy = new DockerCopy();
          copy.setPosition(position);

          copy.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

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

          add.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

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
          const expose = new DockerExpose()
            .setPosition(position)
            .addChild(
              new DockerPort(line.getArgumentsContent()).setPosition(
                rangeToPos(line.getArgumentsRange())
              )
            );

          expose.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(expose);
          break;
        case "workdir":
          const wkd = new DockerWorkdir().addChild(
            new DockerPath(line.getArgumentsContent()).setPosition(
              rangeToPos(line.getArgumentsRange())
            )
          );
          wkd.setPosition(position);

          wkd.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(wkd);
          break;
        case "volume":
          const volume = new DockerVolume();
          volume.setPosition(position);

          volume.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

          for (const arg of line.getArguments()) {
            volume.addChild(new DockerPath(arg.toString()));
          }
          dockerfileAST.addChild(volume);
          break;
        case "arg":
          const arg = new DockerArg().addChild(
            new DockerName(line.getArgumentsContent().split("=")[0])
          );
          arg.setPosition(position);

          arg.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

          if (line.getArgumentsContent().includes("=")) {
            arg.addChild(
              new DockerLiteral(line.getArgumentsContent().split("=")[1].trim())
            );
          }
          dockerfileAST.addChild(arg);
          break;
        case "env":
          const args = line.getArguments();
          const env = new DockerEnv().setPosition(position)

          if (args.length > 0) {
            env.addChild(
              new DockerName(args[0].getValue()).setPosition(
                rangeToPos(args[0].getRange())
              )
            );
          }

          for (let i = 1; i < args.length; i++) {
            env.addChild(
              new DockerLiteral(args[i].getValue()).setPosition(
                rangeToPos(args[i].getRange())
              )
            );
          }

          env.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );
          
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

          entrypoint.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

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

          cmd.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

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

          shell.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

          argus = (line as Shell).getJSONStrings();
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

          user.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(user);
          break;
        case "healthcheck":
          const healthcheck = new DockerHealthCheck().setPosition(position);

          healthcheck.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

          healthcheck.addChild(
            (await parseDocker(line.getRawArgumentsContent())).children[0]
          );
          dockerfileAST.addChild(healthcheck);
          break;
        case "stopsignal":
          const stopsignal = new DockerStopSignal()
            .setPosition(position)
            .addChild(new AsString(line.getArgumentsContent()));

          stopsignal.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(stopsignal);
          break;
        case "onbuild":
          const onbuild = new DockerOnBuild().setPosition(position);
          onbuild.addChild(
            (await parseDocker(line.getRawArgumentsContent())).children[0]
          );

          onbuild.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(onbuild);
          break;
        case "label":
          const labelArgs = (line as Label).getArguments();

          const dockerLabel = new DockerLabel().setPosition(position);

          dockerLabel.addChild(
            new DockerName(labelArgs[0].getValue()).setPosition(
              rangeToPos(labelArgs[0].getRange())
            )
          );

          for (let i = 1; i < labelArgs.length; i++) {
            dockerLabel.addChild(
              new DockerLiteral(labelArgs[i].getValue()).setPosition(
                rangeToPos(labelArgs[i].getRange())
              )
            );
          }

          dockerLabel.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(dockerLabel);
          break;
        case "maintainer":
          const maintainer = new DockerMaintainer()
            .addChild(
              new DockerLiteral(line.getArgumentsContent()).setPosition(
                rangeToPos(line.getArgumentsRange())
              )
            )
            .setPosition(position)
            .addChild(
              new DockerKeyword(line.getInstruction()).setPosition(
                rangeToPos(line.getInstructionRange())
              )
            );

          dockerfileAST.addChild(maintainer);
          break;
        default:
          const e = new Error(`Unhandled Docker command: ${command}`);
          (e as any).node = line;
          this.errors.push(e);
          dockerfileAST.addChild(
            new Unknown()
              .setPosition(position)
              .addChild(new BashLiteral(command))
          );
      }
    }

    // add comments if they are not inside an instruction
    for (const comment of lines.getComments()) {
      const position = new Position(
        comment.getRange().start.line,
        comment.getRange().start.character,
        comment.getRange().end.line,
        comment.getRange().end.character
      );
      // if not inside an instruction add to the root
      if (!instructionLines.has(comment.getRange().start.line)) {
        dockerfileAST.addChild(
          new DockerComment(comment.getContent()).setPosition(position)
        );
      }
    }

    // reset is changed when the model is built
    dockerfileAST.traverse((child) => {
      child.isChanged = false;
      return true;
    });
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
