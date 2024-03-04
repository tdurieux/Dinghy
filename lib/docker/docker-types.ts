import { AbstractNode, AbstractValueNode } from "../core/core-types";
import { ShellNodeTypes } from "../shell/shell-types";
import { DockerPrinter } from "./docker-printer";
import { Printer } from "../core/printer";

export type DockerNodeTypes =
  | DockerAdd
  | DockerAddSource
  | DockerAddTarget
  | DockerArg
  | DockerCmd
  | DockerKeyword
  | DockerCmdArg
  | DockerCopy
  | DockerCopySource
  | DockerCopyTarget
  | DockerEntrypoint
  | DockerEntrypointArg
  | DockerEntrypointExecutable
  | DockerEnv
  | DockerExpose
  | DockerFile
  | DockerLabel
  | DockerMaintainer
  | DockerFrom
  | DockerImageDigest
  | DockerImageAlias
  | DockerImageName
  | DockerImageRepo
  | DockerImageTag
  | DockerLiteral
  | DockerName
  | DockerPath
  | DockerPort
  | DockerJSONInstruction
  | DockerRun
  | DockerShell
  | DockerShellArg
  | DockerShellExecutable
  | DockerUser
  | DockerVolume
  | DockerWorkdir
  | DockerComment
  | DockerOnBuild
  | DockerStopSignal
  | DockerHealthCheck
  | DockerFlag;

export type AllDockerNodes = ShellNodeTypes | DockerNodeTypes;

export abstract class DockerAbstractNode extends AbstractNode<AllDockerNodes> {
  type: Extract<DockerNodeTypes["type"], {}>;

  printer(): Printer<AllDockerNodes> {
    return new DockerPrinter(this as DockerNodeTypes);
  }
}

export abstract class DockerAbstractValueNode extends AbstractValueNode<AllDockerNodes> {
  type: Extract<AllDockerNodes["type"], {}>;

  printer(): Printer<AllDockerNodes> {
    return new DockerPrinter(this as DockerNodeTypes);
  }
}

export abstract class DockerNode extends DockerAbstractNode {
  get keyword() {
    return this.getElement(DockerKeyword);
  }

  get arguments() {
    return this.children.filter((e) => !(e instanceof DockerKeyword));
  }
}
export class DockerKeyword extends DockerAbstractValueNode {
  type: "DOCKER-KEYWORD" = "DOCKER-KEYWORD";
}
export class DockerAdd extends DockerNode {
  type: "DOCKER-ADD" = "DOCKER-ADD";
}
export class DockerAddSource extends DockerAbstractNode {
  type: "DOCKER-ADD-SOURCE" = "DOCKER-ADD-SOURCE";
}
export class DockerAddTarget extends DockerAbstractNode {
  type: "DOCKER-ADD-TARGET" = "DOCKER-ADD-TARGET";
}
export class DockerArg extends DockerNode {
  type: "DOCKER-ARG" = "DOCKER-ARG";
}
export class DockerCmd extends DockerNode {
  type: "DOCKER-CMD" = "DOCKER-CMD";
}
export class DockerCmdArg extends DockerAbstractValueNode {
  type: "DOCKER-CMD-ARG" = "DOCKER-CMD-ARG";
}
export class DockerCopy extends DockerNode {
  type: "DOCKER-COPY" = "DOCKER-COPY";
}
export class DockerCopySource extends DockerAbstractNode {
  type: "DOCKER-COPY-SOURCE" = "DOCKER-COPY-SOURCE";
}
export class DockerCopyTarget extends DockerAbstractNode {
  type: "DOCKER-COPY-TARGET" = "DOCKER-COPY-TARGET";
}
export class DockerLabel extends DockerNode {
  type: "DOCKER-LABEL" = "DOCKER-LABEL";
}
export class DockerMaintainer extends DockerNode {
  type: "DOCKER-MAINTAINER" = "DOCKER-MAINTAINER";
}
export class DockerEntrypoint extends DockerNode {
  type: "DOCKER-ENTRYPOINT" = "DOCKER-ENTRYPOINT";
}
export class DockerEntrypointArg extends DockerAbstractValueNode {
  type: "DOCKER-ENTRYPOINT-ARG" = "DOCKER-ENTRYPOINT-ARG";
}
export class DockerEntrypointExecutable extends DockerAbstractValueNode {
  type: "DOCKER-ENTRYPOINT-EXECUTABLE" = "DOCKER-ENTRYPOINT-EXECUTABLE";
}
export class DockerEnv extends DockerNode {
  type: "DOCKER-ENV" = "DOCKER-ENV";
}
export class DockerExpose extends DockerNode {
  type: "DOCKER-EXPOSE" = "DOCKER-EXPOSE";
}
export class DockerFile extends DockerAbstractNode {
  type: "DOCKER-FILE" = "DOCKER-FILE";
}
export class DockerFrom extends DockerNode {
  type: "DOCKER-FROM" = "DOCKER-FROM";
}
export class DockerImageName extends DockerAbstractValueNode {
  type: "DOCKER-IMAGE-NAME" = "DOCKER-IMAGE-NAME";
}
export class DockerImageDigest extends DockerAbstractValueNode {
  type: "DOCKER-IMAGE-DIGEST" = "DOCKER-IMAGE-DIGEST";
}
export class DockerImageAlias extends DockerAbstractValueNode {
  type: "DOCKER-IMAGE-ALIAS" = "DOCKER-IMAGE-ALIAS";
}
export class DockerImageRepo extends DockerAbstractValueNode {
  type: "DOCKER-IMAGE-REPO" = "DOCKER-IMAGE-REPO";
}
export class DockerImageTag extends DockerAbstractValueNode {
  type: "DOCKER-IMAGE-TAG" = "DOCKER-IMAGE-TAG";
}
export class DockerLiteral extends DockerAbstractValueNode {
  type: "DOCKER-LITERAL" = "DOCKER-LITERAL";
}
export class DockerFlag extends DockerAbstractNode {
  type: "DOCKER-FLAG" = "DOCKER-FLAG";
}
export class DockerName extends DockerAbstractValueNode {
  type: "DOCKER-NAME" = "DOCKER-NAME";
}
export class DockerPath extends DockerAbstractValueNode {
  type: "DOCKER-PATH" = "DOCKER-PATH";
}
export class DockerPort extends DockerAbstractValueNode {
  type: "DOCKER-PORT" = "DOCKER-PORT";
}
export class DockerJSONInstruction extends DockerNode {
  type: "DOCKER-JSON-INSTRUCTION" = "DOCKER-JSON-INSTRUCTION";
}
export class DockerRun extends DockerNode {
  type: "DOCKER-RUN" = "DOCKER-RUN";
}
export class DockerShell extends DockerNode {
  type: "DOCKER-SHELL" = "DOCKER-SHELL";
}
export class DockerShellArg extends DockerAbstractValueNode {
  type: "DOCKER-SHELL-ARG" = "DOCKER-SHELL-ARG";
}
export class DockerShellExecutable extends DockerAbstractValueNode {
  type: "DOCKER-SHELL-EXECUTABLE" = "DOCKER-SHELL-EXECUTABLE";
}
export class DockerUser extends DockerNode {
  type: "DOCKER-USER" = "DOCKER-USER";
}
export class DockerVolume extends DockerNode {
  type: "DOCKER-VOLUME" = "DOCKER-VOLUME";
}
export class DockerWorkdir extends DockerNode {
  type: "DOCKER-WORKDIR" = "DOCKER-WORKDIR";
}
export class DockerOnBuild extends DockerAbstractNode {
  type: "DOCKER-ONBUILD" = "DOCKER-ONBUILD";
}
export class DockerStopSignal extends DockerAbstractNode {
  type: "DOCKER-STOPSIGNAL" = "DOCKER-STOPSIGNAL";
}
export class DockerHealthCheck extends DockerNode {
  type: "DOCKER-HEALTHCHECK" = "DOCKER-HEALTHCHECK";
}
export class DockerComment extends DockerAbstractValueNode {
  type: "DOCKER-COMMENT" = "DOCKER-COMMENT";
}
