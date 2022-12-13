import {
  Argument,
  DockerfileParser,
  From,
  JSONInstruction,
  Label,
  Line,
  Shell,
} from "@tdurieux/dockerfile-ast";
import { existsSync } from "fs";
import File from "./file";
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

export class DockerParser {
  public readonly errors: Error[] = [];

  constructor(public readonly file: File) {}

  private rangeToPos(range: ReturnType<Line["getRange"]>) {
    if (!range) return undefined;
    const p = new Position(
      range.start.line,
      range.start.character,
      range.end.line,
      range.end.character
    );
    p.file = this.file;
    return p;
  }

  async parse(): Promise<DockerFile> {
    const dockerfileAST: DockerFile = new DockerFile();
    if (!this.file || this.file.content?.trim().length == 0)
      return dockerfileAST;

    const lines = DockerfileParser.parse(this.file.content);
    if (!lines.getRange()) return dockerfileAST;
    const document = (lines as any).document;
    const p = new Position(
      0,
      0,
      document.lineCount - 1,
      this.file.content.split("\n").pop().length
    );
    p.file = this.file;
    dockerfileAST.setPosition(p);

    const instructionLines = new Set<number>();
    for (const line of lines.getInstructions()) {
      const position = this.rangeToPos(line.getRange());
      for (let line = position.lineStart; line <= position.lineEnd; line++) {
        instructionLines.add(line);
      }
      position.file = this.file;

      const command = line.getKeyword().toLowerCase();
      switch (command) {
        case "from":
          const from = line as From;
          const fromNode = new DockerFrom().setPosition(position);
          fromNode.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              this.rangeToPos(line.getInstructionRange())
            )
          );
          if (from.getRegistry()) {
            fromNode.addChild(
              new DockerImageRepo(from.getRegistry()).setPosition(
                this.rangeToPos(from.getRegistryRange())
              )
            );
          }
          if (from.getImageName()) {
            fromNode.addChild(
              new DockerImageName(from.getImageName()).setPosition(
                this.rangeToPos(from.getImageNameRange())
              )
            );
          }

          if (from.getImageTag()) {
            fromNode.addChild(
              new DockerImageTag(from.getImageTag()).setPosition(
                this.rangeToPos(from.getImageTagRange())
              )
            );
          }
          if (from.getImageDigest()) {
            fromNode.addChild(
              new DockerImageDigest(from.getImageDigest()).setPosition(
                this.rangeToPos(from.getImageDigestRange())
              )
            );
          }

          if (from.getBuildStage()) {
            fromNode.addChild(
              new DockerImageAlias(from.getBuildStage()).setPosition(
                this.rangeToPos(from.getBuildStageRange())
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
              this.rangeToPos(line.getInstructionRange())
            )
          );
          dockerfileAST.addChild(dockerRun);
          if (line.getRawArgumentsContent() == null) {
            break;
          }

          const shellString = line
            .getRawArgumentsContent()
            // required to consider that the comments are in the bash AST otherwise they will break lines and make the AST invalid
            .replace(/\r\n/gm, "\n")
            .replace(/#([^\\\n]*)$/gm, "#$1\\")
            .replace(/\\ +\n/gm, "\\\n")
            .replace(/^( *)\n/gm, "$1\\\n");
          const shellParser = new ShellParser(
            shellString,
            this.rangeToPos(line.getArgumentsRange())
          );
          const shellNode = await shellParser.parse();
          dockerRun.addChild(shellNode);
          // happen all errors
          shellParser.errors.forEach((v) => this.errors.push(v));

          break;
        case "copy":
          const copy = new DockerCopy();
          copy.setPosition(position);

          (line as JSONInstruction).getFlags().forEach((flag) => {
            // copy.addChild(
            //   new DockerKeyword(flag.getName()).setPosition(
            //     this.rangeToPos(flag.getRange())
            //   )
            // );
          });

          copy.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              this.rangeToPos(line.getInstructionRange())
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
            type.addChild(
              new DockerPath(arg.getValue()).setPosition(
                this.rangeToPos(arg.getRange())
              )
            );
            copy.addChild(type);
          }
          dockerfileAST.addChild(copy);
          break;
        case "add":
          const add = new DockerAdd();
          add.setPosition(position);

          add.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              this.rangeToPos(line.getInstructionRange())
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
                this.rangeToPos(line.getArgumentsRange())
              )
            );

          expose.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              this.rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(expose);
          break;
        case "workdir":
          const wkd = new DockerWorkdir().addChild(
            new DockerPath(line.getArgumentsContent()).setPosition(
              this.rangeToPos(line.getArgumentsRange())
            )
          );
          wkd.setPosition(position);

          wkd.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              this.rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(wkd);
          break;
        case "volume":
          const volume = new DockerVolume();
          volume.setPosition(position);

          volume.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              this.rangeToPos(line.getInstructionRange())
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
              this.rangeToPos(line.getInstructionRange())
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
          const env = new DockerEnv().setPosition(position);

          if (args.length > 0) {
            env.addChild(
              new DockerName(args[0].getValue()).setPosition(
                this.rangeToPos(args[0].getRange())
              )
            );
          }

          for (let i = 1; i < args.length; i++) {
            env.addChild(
              new DockerLiteral(args[i].getValue()).setPosition(
                this.rangeToPos(args[i].getRange())
              )
            );
          }

          env.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              this.rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(env);
          break;
        case "entrypoint":
          let entrypointArgs: Argument[] = (
            line as JSONInstruction
          ).getJSONStrings();
          const entrypoint = new DockerEntrypoint().setPosition(position);
          entrypoint.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              this.rangeToPos(line.getInstructionRange())
            )
          );

          if (entrypointArgs.length == 0) entrypointArgs = line.getArguments();

          if (entrypointArgs.length > 0) {
            entrypoint.addChild(
              new DockerEntrypointExecutable(entrypointArgs[0].getValue())
            );

            for (let i = 1; i < entrypointArgs.length; i++) {
              entrypoint.addChild(
                new DockerEntrypointArg(entrypointArgs[i].getValue())
              );
            }
          }
          dockerfileAST.addChild(entrypoint);
          break;
        case "cmd":
          const cmd = new DockerCmd();
          cmd.setPosition(position);

          cmd.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              this.rangeToPos(line.getInstructionRange())
            )
          );

          // const cmdString = line
          //   .getRawArgumentsContent()
          //   // required to consider that the comments are in the bash AST otherwise they will break lines and make the AST invalid
          //   .replace(/\r\n/gm, "\n")
          //   .replace(/#([^\\\n]*)$/gm, "#$1\\")
          //   .replace(/\\ +\n/gm, "\\\n")
          //   .replace(/^( *)\n/gm, "$1\\\n");
          // const cmdParser = new ShellParser(
          //   cmdString,
          //   this.rangeToPos(line.getArgumentsRange())
          // );
          // const cmdNode = await cmdParser.parse();
          // cmd.addChild(cmdNode);

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
              this.rangeToPos(line.getInstructionRange())
            )
          );

          argus = (line as Shell).getJSONStrings();
          if (argus.length == 0) argus = line.getArguments();
          shell.addChild(
            new DockerShellExecutable(argus[0].getValue()).setPosition(
              this.rangeToPos(argus[0].getRange())
            )
          );
          for (let index = 1; index < argus.length; index++) {
            const arg = argus[index];
            shell.addChild(
              new DockerShellArg(arg.getValue()).setPosition(
                this.rangeToPos(arg.getRange())
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
              this.rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(user);
          break;
        case "healthcheck":
          const healthcheck = new DockerHealthCheck().setPosition(position);

          healthcheck.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              this.rangeToPos(line.getInstructionRange())
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
              this.rangeToPos(line.getInstructionRange())
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
              this.rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(onbuild);
          break;
        case "label":
          const labelArgs = (line as Label).getArguments();

          const dockerLabel = new DockerLabel().setPosition(position);

          if (labelArgs.length > 0) {
            dockerLabel.addChild(
              new DockerName(labelArgs[0].getValue()).setPosition(
                this.rangeToPos(labelArgs[0].getRange())
              )
            );
          }

          for (let i = 1; i < labelArgs.length; i++) {
            dockerLabel.addChild(
              new DockerLiteral(labelArgs[i].getValue()).setPosition(
                this.rangeToPos(labelArgs[i].getRange())
              )
            );
          }

          dockerLabel.addChild(
            new DockerKeyword(line.getInstruction()).setPosition(
              this.rangeToPos(line.getInstructionRange())
            )
          );

          dockerfileAST.addChild(dockerLabel);
          break;
        case "maintainer":
          const maintainer = new DockerMaintainer()
            .addChild(
              new DockerLiteral(line.getArgumentsContent()).setPosition(
                this.rangeToPos(line.getArgumentsRange())
              )
            )
            .setPosition(position)
            .addChild(
              new DockerKeyword(line.getInstruction()).setPosition(
                this.rangeToPos(line.getInstructionRange())
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
      position.file = this.file;
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

export async function parseDocker(file: string | File) {
  let parser: DockerParser = undefined;
  if (file instanceof File) {
    parser = new DockerParser(file);
  } else {
    if (existsSync(file)) {
      parser = new DockerParser(new File(file));
    } else {
      parser = new DockerParser(new File(undefined, file));
    }
  }
  return parser.parse();
}
