import { parseShell } from "../ast/docker-bash-parser";
import { parseDocker } from "../ast/docker-parser";
import {
  BashCommandArgs,
  BashConditionBinary,
  BashConditionBinaryLhs,
  BashConditionBinaryOp,
  BashConditionBinaryRhs,
  BashIfThen,
  BashLiteral,
  BashOp,
  BashScript,
  BashStatement,
  BashWord,
  DockerFile,
  DockerOpsNodeType,
  DockerOpsValueNode,
  DockerRun,
  Q,
  TreeSignature,
} from "../ast/docker-type";
import { Matcher } from "./rule-matcher";

export interface Rule {
  scope: "INTRA-DIRECTIVE" | "INTER-DIRECTIVE";
  name: string;
  description: string;
  notes?: string;
  source: string;
  query: TreeSignature;
  consequent: {
    inNode?: TreeSignature;
    beforeNode?: TreeSignature;
    afterNode?: TreeSignature;
  };
  repair: (node: DockerOpsNodeType) => Promise<void>;
}

async function postFixWith(
  node: DockerOpsNodeType,
  toInsert: DockerOpsNodeType
) {
  if (!toInsert) {
    console.error("[REPAIR] toInsert is null");
    return;
  }
  if (toInsert instanceof BashScript) {
    toInsert = toInsert.children[0];
  }
  new Matcher(toInsert);
  let script: DockerOpsNodeType = node.getParent(BashScript);
  if (node.getParent(BashIfThen)) {
    script = node.getParent(BashIfThen);
  }
  let child = script.children[0];
  for (const c of script.children) {
    if (c === node || c.hasChild(node)) {
      child = c;
      break;
    }
  }
  const position = child.position.clone();
  // position.lineStart = (child.position.lineEnd || 0) + 1;
  toInsert.traverse(
    (n) => {
      n.setPosition(position);
    },
    { includeSelf: true }
  );

  if (child instanceof BashStatement && child.semicolon) {
    script.addChild(toInsert);
  } else {
    // add at the end of the command
    const binary = new BashConditionBinary();
    binary.parent = child.parent;
    child.replace(binary);

    binary
      .addChild(
        new BashConditionBinaryLhs().setPosition(child.position).addChild(child)
      )
      .addChild(
        new BashConditionBinaryOp()
          .setPosition(position)
          .addChild(new BashOp("10").setPosition(position))
      )
      .addChild(
        new BashConditionBinaryRhs()
          .setPosition(position)
          .addChild(toInsert.setPosition(position))
      );
  }
}

export const curlUseFlagF: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "curlUseFlagF",
  description: "Use the -f flag when using curl.",
  query: Q("SC-CURL"),
  consequent: {
    inNode: Q("SC-CURL-F-FAIL"),
  },
  source:
    "https://github.com/docker-library/python/pull/73/commits/033320b278e78732e5739f19bca5f8f29573b553",
  repair: async (violation) => {
    const node = violation;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[0].position)
        .addChild(new BashWord().addChild(new BashLiteral("-f")))
    );
  },
};

export const npmCacheCleanAfterInstall: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "npmCacheCleanAfterInstall",
  description: "Run npm cache clean after npm install",
  query: Q("SC-NPM-INSTALL"),
  consequent: {
    afterNode: Q("SC-NPM-CACHE-CLEAN"),
  },
  source:
    "https://github.com/docker-library/ghost/pull/186/commits/c3bac502046ed5bea16fee67cc48ba993baeaea8",
  repair: async (violation) => {
    postFixWith(violation, await parseShell("npm cache clean --force;"));
  },
};

export const npmCacheCleanUseForce: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "npmCacheCleanUseForce",
  description: "Use the --force flag when using npm cache clean.",
  query: Q("SC-NPM-CACHE-CLEAN"),
  consequent: {
    inNode: Q("SC-NPM-F-FORCE"),
  },
  source:
    "https://github.com/docker-library/ghost/pull/186/commits/c3bac502046ed5bea16fee67cc48ba993baeaea8",
  notes:
    "Had to split into two rules to describe both adding npm cache clean and using the --force flag",
  repair: async (violation) => {
    const node = violation;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[2].position)
        .addChild(new BashWord().addChild(new BashLiteral("--force")))
    );
  },
};

export const rmRecursiveAfterMktempD: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "rmRecursiveAfterMktempD",
  description: "A rm -r should occur after a mktemp -d",
  query: Q("SC-MKTEMP", Q("SC-MKTEMP-F-DIRECTORY")),
  consequent: {
    afterNode: Q("SC-RM", Q("SC-RM-F-FORCE")),
  },
  source: "IMPLICIT --- you should remove temporary dirs in docker images",
  repair: async (violation) => {
    const node = violation;

    postFixWith(
      node,
      await parseShell("rm -rf " + node.children.at(-1)?.toString(true))
    );
  },
};

export const curlUseHttpsUrl: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "curlUseHttpsUrl",
  description: "Use https:// urls with curl",
  query: Q("SC-CURL", Q("SC-CURL-URL", Q("ALL", Q("ABS-URL-PROTOCOL-HTTP")))),
  consequent: {
    inNode: Q("ABS-URL-PROTOCOL-HTTPS"),
  },
  source:
    "https://github.com/docker-library/php/pull/293/commits/2f96a00aaa90ee1c503140724936ca7005273df5",
  repair: async (violation) => {
    const node = violation;
    node.traverse((x) => {
      if (
        x instanceof DockerOpsValueNode &&
        x.value &&
        x.value.includes("http:")
      ) {
        x.value = x.value.replace("http", "https");
      }
    });
  },
};

export const wgetUseHttpsUrl: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "wgetUseHttpsUrl",
  description: "Use https:// urls with wget",
  query: Q(
    "SC-WGET",
    Q("ALL", Q("SC-WGET-URL", Q("ALL", Q("ABS-URL-PROTOCOL-HTTP"))))
  ),
  consequent: {
    inNode: Q("ABS-URL-PROTOCOL-HTTPS"),
  },
  source:
    "https://github.com/docker-library/php/pull/293/commits/2f96a00aaa90ee1c503140724936ca7005273df5",
  repair: async (violation) => {
    const node = violation;
    node.traverse((x) => {
      if (
        x instanceof DockerOpsValueNode &&
        x.value &&
        x.value.includes("http:")
      ) {
        x.value = x.value.replace("http", "https");
      }
    });
  },
};

export const pipUseNoCacheDir: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "pipUseNoCacheDir",
  description: "Use --no-cache-dir flag with pip",
  query: Q("SC-PIP-INSTALL"),
  consequent: {
    inNode: Q("SC-PIP-F-NO-CACHE-DIR"),
  },
  source:
    "https://github.com/docker-library/python/pull/50/commits/7663560df7547e69d13b1b548675502f4e0917d1",
  repair: async (violation) => {
    const node = violation;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[1].position)
        .addChild(new BashWord().addChild(new BashLiteral("--no-cache-dir")))
    );
  },
};

export const mkdirUsrSrcThenRemove: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "mkdirUsrSrcThenRemove",
  description:
    "After running mkdir /usr/src* use rm -rf /usr/src* to clean up.",
  query: Q("SC-MKDIR", Q("SC-MKDIR-PATH", Q("ALL", Q("ABS-USR-SRC-DIR")))),
  consequent: {
    afterNode: Q("SC-RM", Q("SC-RM-PATH", Q("ALL", Q("ABS-USR-SRC-DIR")))),
  },
  source:
    "https://github.com/docker-library/python/pull/20/commits/ce7da0b874784e6b69e3966b5d7ba995e873163e",
  repair: async (violation) => {
    postFixWith(
      violation,
      await parseShell(
        "rm -rf " +
          violation
            .find(Q("SC-MKDIR-PATH"))[0]
            .getElement(BashLiteral)
            ?.toString(true)
      )
    );
  },
};

export const configureShouldUseBuildFlag: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "configureShouldUseBuildFlag",
  description: "When using ./configure in a Dockerfile pass the --build flag.",
  query: Q("SC-CONFIGURE"),
  consequent: {
    inNode: Q("SC-CONFIGURE-BUILD"),
  },
  source:
    "https://github.com/docker-library/ruby/pull/127/commits/be55938d970a392e7d41f17131a091b0a9f4bebc",
  repair: async (violation) => {
    const node = violation;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[0].position.clone())
        .addChild(
          new BashWord().addChild(
            new BashLiteral(
              '--build="$(dpkg-architecture --query DEB_BUILD_GNU_TYPE)"'
            )
          )
        )
    );
  },
};

export const gemUpdateSystemRmRootGem: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "gemUpdateSystemRmRootGem",
  description:
    "After running gem update --system remove the /root/.gem directory.",
  query: Q("SC-GEM-UPDATE"),
  consequent: {
    afterNode: Q(
      "SC-RM",
      Q(
        "SC-RM-PATH",
        Q("ABS-PATH-ABSOLUTE"),
        Q("ABS-PATH-DOT-GEM"),
        Q("ABS-PATH-ROOT-DIR")
      )
    ),
  },
  source:
    "https://github.com/docker-library/ruby/pull/185/commits/c9a4472a019d18aba1fdab6a63b96474b40ca191",
  repair: async (violation) => {
    postFixWith(violation, await parseShell("rm -rf /root/.gem;"));
  },
};

export const sha256sumEchoOneSpaces: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "sha256sumEchoOneSpaces",
  description: "sha256sum takes an input on stdin with one space.",
  // query: Q("SC-SHA-256-SUM", Q("SC-SHA-256-SUM-F-CHECK")),
  query: Q(
    BashConditionBinary,
    Q("ALL", Q("SC-ECHO", Q("ALL", Q("ABS-DOUBLE-SPACE")))),
    Q("ALL", Q("SC-SHA-256-SUM", Q("SC-SHA-256-SUM-F-CHECK")))
  ),
  consequent: {
    inNode: Q("SC-ECHO", Q("ALL", Q("ABS-SINGLE-SPACE"))),
  },
  source:
    "https://github.com/docker-library/memcached/pull/6/commits/a8c4206768821aa47579c6413be85be914875caa",
  notes:
    "sha1sum is old --- transliterated to use more modern sha256sum which most images are using",
  async repair(violation) {
    const node = violation;
    const echoWithDoubleSpace = node.find(
      Q("SC-ECHO", Q("ALL", Q("ABS-DOUBLE-SPACE")))
    );
    if (echoWithDoubleSpace) {
      echoWithDoubleSpace.forEach((n) =>
        n
          .find(Q("ABS-DOUBLE-SPACE"))
          .filter((n) => n instanceof DockerOpsValueNode)
          .forEach((doubleSpace) => {
            (doubleSpace as DockerOpsValueNode).value = (
              doubleSpace as DockerOpsValueNode
            ).value.replace(/  /g, " ");
          })
      );
    }
  },
};

export const gemUpdateNoDocument: Rule = {
  scope: "INTER-DIRECTIVE",
  name: "gemUpdateNoDocument",
  description:
    "If you run gem update you should have previously added the --no-document flag to the .gemrc config.",
  query: Q("SC-GEM-UPDATE"),
  consequent: {
    beforeNode: Q(
      "SC-ECHO",
      Q("SC-ECHO-ITEM", Q("ALL", Q("ABS-CONFIG-NO-DOCUMENT")))
    ),
  },
  source: "https://github.com/docker-library/ruby/pull/49/files",
  notes:
    "Either gem update or gem install leads us to wanting the --no-document/--no-rdoc flag to be set.",
  repair: async (violation) => {
    const node = violation;
    const dFile = node.getParent(DockerFile);
    const dRun = node.getParent(DockerRun);
    if (dFile == null || dRun == null) return;

    const setup = (
      await parseDocker(
        `RUN mkdir -p /usr/local/etc \\
  && { \\
    echo 'install: --no-document'; \\
    echo 'update: --no-document'; \\
  } >> /usr/local/etc/gemrc;\n`
      )
    ).getElement(DockerRun);
    // move the setup before the gem update
    setup.position.lineStart = dRun.position.lineStart - 1;
    dFile.addChild(setup);
  },
};

export const gpgVerifyAscRmAsc: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "gpgVerifyAscRmAsc",
  description:
    "If you run gpg --verify <X>.asc you should remove the <x>.asc file.",
  query: Q("SC-GPG", Q("SC-GPG-VERIFY", Q("ALL", Q("ABS-EXTENSION-ASC")))),
  consequent: {
    afterNode: Q("SC-RM", Q("SC-RM-PATH")),
  },
  source:
    "https://github.com/docker-library/php/pull/196/commits/8943e1e6a930768994fbc29f4df89d0a3fd65e12",
  repair: async (violation) => {
    postFixWith(
      violation,
      await parseShell(
        "rm " + violation.find(Q("ABS-EXTENSION-ASC"))[0].toString()
      )
    );
  },
};

export const yumInstallForceYes: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "yumInstallForceYes",
  description: "Use the -y flag with yum install.",
  query: Q("SC-YUM-INSTALL"),
  consequent: {
    inNode: Q("SC-YUM-F-ASSUMEYES"),
  },
  source: "IMPLICIT -- based on apt-get install -y rule",
  repair: async (violation) => {
    const node = violation;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[1].position)
        .addChild(new BashWord().addChild(new BashLiteral("-y")))
    );
  },
};

export const yumInstallRmVarCacheYum: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "yumInstallRmVarCacheYum",
  description:
    "If you run yum install <...> you should remove the /var/cache/yum directory.",
  query: Q("SC-YUM-INSTALL"),
  consequent: {
    afterNode: Q(
      "SC-RM",
      Q("SC-RM-F-RECURSIVE"),
      Q("SC-RM-PATH", Q("ALL", Q("ABS-VAR-CACHE-YUM")))
    ),
  },
  source:
    "https://github.com/docker-library/ruby/pull/7/commits/950a673e59df846608f624ee55321d36ba1f89ba",
  notes:
    "The source here is for apt-get. This rule is the natural translation to yum.",
  repair: async (violation) => {
    postFixWith(violation, await parseShell("rm -rf /var/cache/yum"));
  },
};

export const tarSomethingRmTheSomething: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "tarSomethingRmTheSomething",
  description: "If you run tar <X>.tar you should remove the <x>.tar file.",
  query: Q("SC-TAR", Q("SC-TAR-FILE", Q("ALL", Q("ABS-EXTENSION-TAR")))),
  consequent: {
    afterNode: Q("SC-RM", Q("SC-RM-PATH", Q("ALL", Q("ABS-EXTENSION-TAR")))),
  },
  source:
    "IMPLICIT --- no reason to keep around duplicates (the compressed version and the uncompressed version)",
  repair: async (violation) => {
    let file = violation.find(Q("ABS-EXTENSION-TAR"))[0]?.toString();
    if (file.startsWith("-") && file.includes("=")) {
      file = file.split("=")[1];
    } else if (file.startsWith("-f")) {
      file = file.substring(2);
    }

    postFixWith(violation, await parseShell("rm " + file));
  },
};

export const gpgUseBatchFlag: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "gpgUseBatchFlag",
  description: "Use the --batch flag when using gpg in a docker image.",
  query: Q("SC-GPG"),
  consequent: {
    inNode: Q("SC-GPG-F-BATCH"),
  },
  source:
    "https://github.com/docker-library/php/pull/747/commits/b99209cc078ebb7bf4614e870c2d69e0b3bed399",
  repair: async (violation) => {
    const node = violation;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[0].position)
        .addChild(new BashWord().addChild(new BashLiteral("--batch")))
    );
  },
};

export const gpgUseHaPools: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "gpgUseHaPools",
  description: "Use ha.pool.* instead of pool.* with gpg.",
  query: Q("SC-GPG", Q("SC-GPG-KEYSERVER", Q("ALL", Q("ABS-URL-POOL")))),
  consequent: {
    inNode: Q("ABS-URL-HA-POOL"),
  },
  source:
    "https://github.com/docker-library/httpd/pull/5/commits/63cd0ad57a12c76ff70d0f501f6c2f1580fa40f5",
  repair: async (violation) => {
    const node = violation;
    node
      .getElements(BashLiteral)
      .filter((e) => e.value.includes("pool."))
      .forEach((e) => (e.value = e.value.replace("pool.", "ha.pool.")));
  },
};

export const ruleAptGetInstallUseY: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "ruleAptGetInstallUseY",
  description:
    "Must use the -y flag to avoid apt-get install requesting user interaction.",
  query: Q("SC-APT-INSTALL"),
  consequent: {
    inNode: Q("SC-APT-F-YES"),
  },
  source:
    "IMPLICIT --- need to use non-interactive mode during image build except for very rare exceptions.",
  repair: async (violation) => {
    const node = violation;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[1].position)
        .addChild(new BashWord().addChild(new BashLiteral("-y")))
    );
  },
};

export const ruleMoreThanOneInstall: Rule = {
  scope: "INTER-DIRECTIVE",
  name: "ruleMoreThanOneInstall",
  description: "all apt-get install should group into one.",
  source: "IMPLICIT --- slow down the build",
  query: Q("ANY", Q("SC-APT-INSTALL"), Q("SC-APT-INSTALL")),
  consequent: {},
  repair: async (violation) => {
    throw new Error("Not implemented");
  },
};

export const ruleAptGetUpdatePrecedesInstall: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "ruleAptGetUpdatePrecedesInstall",
  description:
    "apt-get update && apt-get install should happen in a single layer.",
  query: Q("SC-APT-INSTALL"),
  consequent: {
    beforeNode: Q("SC-APT-UPDATE"),
  },
  source:
    "IMPLICIT --- one of Hadolint's recommendations and a docker best practice.",
  repair: async (violation) => {
    const root = violation.getParent(DockerFile);
    const installs = root.find(Q("SC-APT-INSTALL"));
    if (installs.length !== 1) {
      // do not support more than one install
      return;
    }
    const updates = root.find(Q("SC-APT-UPDATE"));
    if (updates.length !== 1) {
      // do not support more than one update
      return;
    }
    const install = installs[0];
    const update = updates[0];
    if (update.parent instanceof BashScript) {
      update.getParent(DockerRun).remove();
      update.setPosition(null);

      const script = install.getParent(BashScript);
      const child = script.children[0];

      // add at the end of the command
      const binary = new BashConditionBinary()
        .addChild(new BashConditionBinaryOp().addChild(new BashOp("10")))
        .addChild(new BashConditionBinaryRhs().addChild(child.clone()))
        .addChild(new BashConditionBinaryLhs().addChild(update));
      child.replace(binary);
    }
  },
};

export const ruleAptGetInstallUseNoRec: Rule = {
  name: "ruleAptGetInstallUseNoRec",
  scope: "INTRA-DIRECTIVE",
  description:
    "Use the --no-install-recommends flag to save layer space and avoid hidden dependencies.",
  query: Q("SC-APT-INSTALL"),
  consequent: {
    inNode: Q("SC-APT-F-NO-INSTALL-RECOMMENDS"),
  },
  source:
    "https://github.com/docker-library/openjdk/pull/193/commits/1d6fa42735002d61625d18378f1ca2df39cb26a0",
  repair: async (violation) => {
    const node = violation;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[1].position)
        .addChild(
          new BashWord().addChild(new BashLiteral("--no-install-recommends"))
        )
    );
  },
};

export const ruleAptGetInstallThenRemoveAptLists: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "ruleAptGetInstallThenRemoveAptLists",
  description:
    "rm -rf /var/lib/apt/lists/* after apt-get install to save layer space.",
  query: Q("SC-APT-INSTALL"),
  consequent: {
    afterNode: Q(
      "SC-RM",
      Q("SC-RM-PATH", Q("ABS-GLOB-STAR"), Q("ABS-APT-LISTS"), Q("ABS-PATH-VAR"))
    ),
  },
  source:
    "https://github.com/docker-library/ruby/pull/7/commits/950a673e59df846608f624ee55321d36ba1f89ba",
  repair: async (violation) => {
    postFixWith(violation, await parseShell("rm -rf /var/lib/apt/lists/*;"));
  },
};

export const apkAddUseNoCache: Rule = {
  scope: "INTRA-DIRECTIVE",
  name: "apkAddUseNoCache",
  description: "Use the --no-cache flag when using apk add.",
  query: Q("SC-APK-ADD"),
  consequent: {
    inNode: Q("SC-APK-F-NO-CACHE"),
  },
  source:
    "https://github.com/docker-library/php/pull/228/commits/85d48c88b3e3dae303118275202327f14a8106f4",
  repair: async (violation) => {
    const node = violation;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[1].position)
        .addChild(new BashWord().addChild(new BashLiteral("--no-cache")))
    );
  },
};

export const RULES: Rule[] = [
  curlUseFlagF,
  npmCacheCleanAfterInstall,
  npmCacheCleanUseForce,
  rmRecursiveAfterMktempD,
  curlUseHttpsUrl,
  wgetUseHttpsUrl,
  pipUseNoCacheDir,
  mkdirUsrSrcThenRemove,
  configureShouldUseBuildFlag,
  gemUpdateSystemRmRootGem,
  sha256sumEchoOneSpaces,
  gemUpdateNoDocument,
  gpgVerifyAscRmAsc,
  yumInstallForceYes,
  yumInstallRmVarCacheYum,
  tarSomethingRmTheSomething,
  gpgUseBatchFlag,
  gpgUseHaPools,
  ruleAptGetInstallUseY,
  ruleAptGetInstallUseNoRec,
  ruleAptGetUpdatePrecedesInstall,
  ruleAptGetInstallThenRemoveAptLists,
  // ruleMoreThanOneInstall,
  apkAddUseNoCache,
];
