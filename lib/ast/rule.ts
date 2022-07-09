import { parseShell } from "./shellParser";
import {
  BashCommandArgs,
  BashLiteral,
  BashScript,
  BashWord,
  DockerFile,
  DockerOpsNodeType,
  DockerRun,
  MaybeSemanticCommand,
  Position,
} from "./type";

interface SubTree<T extends SubTree<T>> {
  type: string;
  children?: T[];
}

interface Antecedent extends SubTree<Antecedent> {
  bindHere?: boolean;
}

interface Match extends SubTree<Match> {}

export interface Rule {
  scope: "INTRA-DIRECTIVE" | "INTER-DIRECTIVE";
  kind:
    | "CONSEQUENT-FOLLOWS-ANTECEDENT"
    | "CONSEQUENT-FLAG-OF-ANTECEDENT"
    | "CONSEQUENT-PRECEDES-ANTECEDENT";
  name: string;
  description: string;
  notes?: string;
  source: string;
  antecedent: Antecedent;
  consequent: {
    matchAnyBound: Match;
  };
  repair?: (violation: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }) => void;
}

export const curlUseFlagF: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  name: "curlUseFlagF",
  description: "Use the -f flag when using curl.",
  antecedent: {
    type: "SC-CURL",
    bindHere: true,
  },
  consequent: {
    matchAnyBound: {
      type: "SC-CURL-F-FAIL",
    },
  },
  source:
    "https://github.com/docker-library/python/pull/73/commits/033320b278e78732e5739f19bca5f8f29573b553",
  repair: (violation) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[0].position)
        .addChild(new BashWord().addChild(new BashLiteral("-f")))
    );
  },
};

export const npmCacheCleanAfterInstall: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FOLLOWS-ANTECEDENT",
  name: "npmCacheCleanAfterInstall",
  description: "Run npm cache clean after npm install",
  antecedent: {
    type: "SC-NPM-INSTALL",
  },
  consequent: {
    matchAnyBound: {
      type: "SC-NPM-CACHE-CLEAN",
    },
  },
  source:
    "https://github.com/docker-library/ghost/pull/186/commits/c3bac502046ed5bea16fee67cc48ba993baeaea8",
  repair: (violation: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }) => {
    // add at the end of the command
    const run = violation.matched.node.getParent(DockerRun);
    run.addChild(
      parseShell("npm cache clean --force;").setPosition(
        new Position(run.position.lineEnd - 1, 0)
      )
    );
  },
};

export const npmCacheCleanUseForce: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  name: "npmCacheCleanUseForce",
  description: "Use the --force flag when using npm cache clean.",
  antecedent: {
    type: "SC-NPM-CACHE-CLEAN",
    bindHere: true,
  },
  consequent: {
    matchAnyBound: {
      type: "SC-NPM-F-FORCE",
    },
  },
  source:
    "https://github.com/docker-library/ghost/pull/186/commits/c3bac502046ed5bea16fee67cc48ba993baeaea8",
  notes:
    "Had to split into two rules to describe both adding npm cache clean and using the --force flag",
  repair: (violation: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
    node.replace(parseShell("npm cache clean --force;"));
  },
};

export const rmRecursiveAfterMktempD: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FOLLOWS-ANTECEDENT",
  name: "rmRecursiveAfterMktempD",
  description: "A rm -r should occur after a mktemp -d",
  antecedent: {
    type: "SC-MKTEMP",
    children: [
      {
        type: "SC-MKTEMP-F-DIRECTORY",
      },
    ],
  },
  consequent: {
    matchAnyBound: {
      type: "SC-RM",
      children: [
        {
          type: "SC-RM-F-FORCE",
        },
      ],
    },
  },
  source: "IMPLICIT --- you should remove temporary dirs in docker images",
  repair: (violation: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
    const run = violation.matched.node.getParent(DockerRun);
    run.addChild(
      parseShell(
        "rm -rf " + node.getElement(BashLiteral).toString()
      ).setPosition(new Position(run.position.lineEnd + 1, 0))
    );
  },
};

export const curlUseHttpsUrl: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  name: "curlUseHttpsUrl",
  description: "Use https:// urls with curl",
  antecedent: {
    type: "SC-CURL",
    children: [
      {
        type: "SC-CURL-URL",
        children: [
          {
            type: "BASH-LITERAL",
            bindHere: true,
            children: [
              {
                type: "ABS-PROBABLY-URL",
              },
            ],
          },
        ],
      },
    ],
  },
  consequent: {
    matchAnyBound: {
      type: "ABS-URL-PROTOCOL-HTTPS",
    },
  },
  source:
    "https://github.com/docker-library/php/pull/293/commits/2f96a00aaa90ee1c503140724936ca7005273df5",
  repair: (violation: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
    node.getElement(BashLiteral).value.replace("http:", "https:");
  },
};

export const wgetUseHttpsUrl: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  name: "wgetUseHttpsUrl",
  description: "Use https:// urls with wget",
  antecedent: {
    type: "SC-WGET",
    children: [
      {
        type: "SC-WGET-URL",
        children: [
          {
            type: "BASH-LITERAL",
            bindHere: true,
            children: [
              {
                type: "ABS-PROBABLY-URL",
              },
            ],
          },
        ],
      },
    ],
  },
  consequent: {
    matchAnyBound: {
      type: "ABS-URL-PROTOCOL-HTTPS",
    },
  },
  source:
    "https://github.com/docker-library/php/pull/293/commits/2f96a00aaa90ee1c503140724936ca7005273df5",
  repair: (violation: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
    node.getElement(BashLiteral).value.replace("http:", "https:");
  },
};

export const pipUseNoCacheDir: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  name: "pipUseNoCacheDir",
  description: "Use --no-cache-dir flag with pip",
  antecedent: {
    type: "SC-PIP-INSTALL",
    bindHere: true,
  },
  consequent: {
    matchAnyBound: {
      type: "SC-PIP-F-NO-CACHE-DIR",
    },
  },
  source:
    "https://github.com/docker-library/python/pull/50/commits/7663560df7547e69d13b1b548675502f4e0917d1",
  repair: (violation: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[0].position)
        .addChild(new BashWord().addChild(new BashLiteral("--no-cache-dir")))
    );
  },
};

export const mkdirUsrSrcThenRemove: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FOLLOWS-ANTECEDENT",
  name: "mkdirUsrSrcThenRemove",
  description:
    "After running mkdir /usr/src* use rm -rf /usr/src* to clean up.",
  antecedent: {
    type: "SC-MKDIR",
    children: [
      {
        type: "SC-MKDIR-PATHS",
        children: [
          {
            type: "SC-MKDIR-PATH",
            children: [
              {
                type: "BASH-WORD",
                children: [
                  {
                    type: "BASH-LITERAL",
                    children: [
                      {
                        type: "ABS-USR-SRC-DIR",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  consequent: {
    matchAnyBound: {
      type: "SC-RM",
      children: [
        {
          type: "SC-RM-PATHS",
          children: [
            {
              type: "SC-RM-PATH",
              children: [
                {
                  type: "BASH-LITERAL",
                  children: [
                    {
                      type: "ABS-USR-SRC-DIR",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  source:
    "https://github.com/docker-library/python/pull/20/commits/ce7da0b874784e6b69e3966b5d7ba995e873163e",
  repair: (violation: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }) => {
    // add at the end of the command
    const run = violation.matched.node.getParent(DockerRun);
    run.addChild(
      parseShell(
        "rm -rf " + violation.matched.node.getElement(BashLiteral).toString()
      ).setPosition(new Position(run.position.lineEnd, 0))
    );
  },
};

export const configureShouldUseBuildFlag: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  name: "configureShouldUseBuildFlag",
  description: "When using ./configure in a Dockerfile pass the --build flag.",
  antecedent: {
    type: "SC-CONFIGURE",
    bindHere: true,
  },
  consequent: {
    matchAnyBound: {
      type: "SC-CONFIGURE-BUILD",
    },
  },
  source:
    "https://github.com/docker-library/ruby/pull/127/commits/be55938d970a392e7d41f17131a091b0a9f4bebc",
  repair: (violation: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[1].position)
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
  kind: "CONSEQUENT-FOLLOWS-ANTECEDENT",
  name: "gemUpdateSystemRmRootGem",
  description:
    "After running gem update --system remove the /root/.gem directory.",
  antecedent: {
    type: "SC-GEM-UPDATE",
  },
  consequent: {
    matchAnyBound: {
      type: "SC-RM",
      children: [
        {
          type: "SC-RM-PATHS",
          children: [
            {
              type: "SC-RM-PATH",
              children: [
                {
                  type: "BASH-LITERAL",
                  children: [
                    {
                      type: "ABS-PATH-ABSOLUTE",
                    },
                    {
                      type: "ABS-PATH-DOT-GEM",
                    },
                    {
                      type: "ABS-PATH-ROOT-DIR",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  source:
    "https://github.com/docker-library/ruby/pull/185/commits/c9a4472a019d18aba1fdab6a63b96474b40ca191",
  repair: (violation: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }) => {
    // add at the end of the command
    const run = violation.matched.node.getParent(BashScript);
    run.addChild(
      parseShell("rm -rf /root/.gem;").setPosition(
        new Position(run.position.lineEnd, 0)
      )
    );
  },
};

export const sha256sumEchoOneSpaces: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-PRECEDES-ANTECEDENT",
  name: "sha256sumEchoOneSpaces",
  description: "sha256sum takes an input on stdin with one space.",
  antecedent: {
    type: "SC-SHA-256-SUM",
    children: [
      {
        type: "SC-SHA-256-SUM-F-CHECK",
      },
    ],
  },
  consequent: {
    matchAnyBound: {
      type: "SC-ECHO",
      children: [
        {
          type: "SC-ECHO-ITEMS",
          children: [
            {
              type: "SC-ECHO-ITEM",
              children: [
                {
                  type: "BASH-LITERAL",
                  children: [
                    {
                      type: "ABS-SINGLE-SPACE",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  source:
    "https://github.com/docker-library/memcached/pull/6/commits/a8c4206768821aa47579c6413be85be914875caa",
  notes:
    "sha1sum is old --- transliterated to use more modern sha256sum which most images are using",
};

export const gemUpdateNoDocument: Rule = {
  scope: "INTER-DIRECTIVE",
  kind: "CONSEQUENT-PRECEDES-ANTECEDENT",
  name: "gemUpdateNoDocument",
  description:
    "If you run gem update you should have previously added the --no-document flag to the .gemrc config.",
  antecedent: {
    type: "SC-GEM-UPDATE",
  },
  consequent: {
    matchAnyBound: {
      type: "SC-ECHO",
      children: [
        {
          type: "SC-ECHO-ITEMS",
          children: [
            {
              type: "SC-ECHO-ITEM",
              children: [
                {
                  type: "BASH-WORD",
                  children: [
                    {
                      type: "BASH-LITERAL",
                      children: [
                        {
                          type: "ABS-CONFIG-NO-DOCUMENT",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  source: "https://github.com/docker-library/ruby/pull/49/files",
  notes:
    "Either gem update or gem install leads us to wanting the --no-document/--no-rdoc flag to be set.",
  repair: (violation: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }) => {
    violation.matched.node.getElement(DockerRun).position;
    violation.matched.node
      .getElement(DockerFile)
      .addChild(
        new DockerRun()
          .setPosition(
            new Position(
              violation.matched.node.getElement(DockerRun).position.lineStart -
                1,
              99
            )
          )
          .addChild(
            parseShell(
              "echo 'install: --no-document\nupdate: --no-document' > \"$HOME/.gemrc\""
            )
          )
      );
  },
};

export const gpgVerifyAscRmAsc: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FOLLOWS-ANTECEDENT",
  name: "gpgVerifyAscRmAsc",
  description:
    "If you run gpg --verify <X>.asc you should remove the <x>.asc file.",
  antecedent: {
    type: "SC-GPG",
    children: [
      {
        type: "SC-GPG-VERIFYS",
        children: [
          {
            type: "SC-GPG-VERIFY",
            children: [
              {
                type: "BASH-LITERAL",
                children: [
                  {
                    type: "ABS-EXTENSION-ASC",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  consequent: {
    matchAnyBound: {
      type: "SC-RM",
      children: [
        {
          type: "SC-RM-PATHS",
          children: [
            {
              type: "SC-RM-PATH",
              // children: [{
              //   type: 'BASH-LITERAL',
              //   children: [{
              //     type: 'ABS-EXTENSION-ASC'
              //   }]
              // }]
            },
          ],
        },
      ],
    },
  },
  source:
    "https://github.com/docker-library/php/pull/196/commits/8943e1e6a930768994fbc29f4df89d0a3fd65e12",
};

export const yumInstallForceYes: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  name: "yumInstallForceYes",
  description: "Use the -y flag with yum install.",
  antecedent: {
    type: "SC-YUM-INSTALL",
    bindHere: true,
  },
  consequent: {
    matchAnyBound: {
      type: "SC-YUM-F-ASSUMEYES",
    },
  },
  source: "IMPLICIT -- based on apt-get install -y rule",
  repair: (violation) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[1].position)
        .addChild(new BashWord().addChild(new BashLiteral("-y")))
    );
  },
};

export const yumInstallRmVarCacheYum: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FOLLOWS-ANTECEDENT",
  name: "yumInstallRmVarCacheYum",
  description:
    "If you run yum install <...> you should remove the /var/cache/yum directory.",
  antecedent: {
    type: "SC-YUM-INSTALL",
  },
  consequent: {
    matchAnyBound: {
      type: "SC-RM",
      children: [
        {
          type: "SC-RM-PATHS",
          children: [
            {
              type: "SC-RM-PATH",
              children: [
                {
                  type: "BASH-LITERAL",
                  children: [
                    {
                      type: "ABS-VAR-CACHE-YUM",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "SC-RM-F-RECURSIVE",
        },
      ],
    },
  },
  source:
    "https://github.com/docker-library/ruby/pull/7/commits/950a673e59df846608f624ee55321d36ba1f89ba",
  notes:
    "The source here is for apt-get. This rule is the natural translation to yum.",
  repair: (violation) => {
    // add at the end of the command
    const run =
      violation.matched.node.original instanceof MaybeSemanticCommand
        ? violation.matched.node.original
        : violation.matched.node.getParent(MaybeSemanticCommand);
    run.addChild(
      parseShell("rm -rf /var/cache/yum").setPosition(
        new Position(run.position.lineEnd + 1, 0)
      )
    );
  },
};

export const tarSomethingRmTheSomething: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FOLLOWS-ANTECEDENT",
  name: "tarSomethingRmTheSomething",
  description: "If you run tar <X>.tar you should remove the <x>.tar file.",
  antecedent: {
    type: "SC-TAR",
    children: [
      {
        type: "SC-TAR-FILE",
        children: [
          {
            type: "BASH-PATH",
            children: [
              {
                type: "BASH-LITERAL",
                children: [
                  {
                    type: "ABS-EXTENSION-TAR",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  consequent: {
    matchAnyBound: {
      type: "SC-RM",
      children: [
        {
          type: "SC-RM-PATHS",
          children: [
            {
              type: "SC-RM-PATH",
              children: [
                {
                  type: "BASH-LITERAL",
                  children: [
                    {
                      type: "ABS-EXTENSION-TAR",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  source:
    "IMPLICIT --- no reason to keep around duplicates (the compressed version and the uncompressed version)",
};

export const gpgUseBatchFlag: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  name: "gpgUseBatchFlag",
  description: "Use the --batch flag when using gpg in a docker image.",
  antecedent: {
    type: "SC-GPG",
    bindHere: true,
  },
  consequent: {
    matchAnyBound: {
      type: "SC-GPG-F-BATCH",
    },
  },
  source:
    "https://github.com/docker-library/php/pull/747/commits/b99209cc078ebb7bf4614e870c2d69e0b3bed399",
  repair: (violation) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[0].position)
        .addChild(new BashWord().addChild(new BashLiteral("--batch")))
    );
  },
};

export const gpgUseHaPools: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  name: "gpgUseHaPools",
  description: "Use ha.pool.* instead of pool.* with gpg.",
  antecedent: {
    type: "SC-GPG",
    children: [
      {
        type: "SC-GPG-KEYSERVER",
        bindHere: true,
        children: [
          {
            type: "ABS-URL-POOL",
          },
        ],
      },
    ],
  },
  consequent: {
    matchAnyBound: {
      type: "ABS-URL-HA-POOL",
    },
  },
  source:
    "https://github.com/docker-library/httpd/pull/5/commits/63cd0ad57a12c76ff70d0f501f6c2f1580fa40f5",
  repair: (violation) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
    node
      .getElements(BashLiteral)
      .filter((e) => e.value.includes("pool."))
      .forEach((e) => e.value.replace("pool.", "ha.pool."));
  },
};

export const ruleAptGetInstallUseY: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  name: "ruleAptGetInstallUseY",
  description:
    "Must use the -y flag to avoid apt-get install requesting user interaction.",
  antecedent: {
    type: "SC-APT-GET-INSTALL",
    bindHere: true,
  },
  consequent: {
    matchAnyBound: {
      type: "SC-APT-GET-F-YES",
    },
  },
  source:
    "IMPLICIT --- need to use non-interactive mode during image build except for very rare exceptions.",
  repair: (violation) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
    node.addChild(
      new BashCommandArgs()
        .setPosition(node.children[1].position)
        .addChild(new BashWord().addChild(new BashLiteral("-y")))
    );
  },
};

export const ruleAptGetUpdatePrecedesInstall: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-PRECEDES-ANTECEDENT",
  name: "ruleAptGetUpdatePrecedesInstall",
  description:
    "apt-get update && apt-get install should happen in a single layer.",
  antecedent: {
    type: "SC-APT-GET-INSTALL",
  },
  consequent: {
    matchAnyBound: {
      type: "SC-APT-GET-UPDATE",
    },
  },
  source:
    "IMPLICIT --- one of Hadolint's recommendations and a docker best practice.",
};

export const ruleAptGetInstallUseNoRec: Rule = {
  name: "ruleAptGetInstallUseNoRec",
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  description:
    "Use the --no-install-recommends flag to save layer space and avoid hidden dependencies.",
  antecedent: {
    type: "SC-APT-GET-INSTALL",
    bindHere: true,
  },
  consequent: {
    matchAnyBound: {
      type: "SC-APT-GET-F-NO-INSTALL-RECOMMENDS",
    },
  },
  source:
    "https://github.com/docker-library/openjdk/pull/193/commits/1d6fa42735002d61625d18378f1ca2df39cb26a0",
  repair: (violation) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
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
  kind: "CONSEQUENT-FOLLOWS-ANTECEDENT",
  name: "ruleAptGetInstallThenRemoveAptLists",
  description:
    "rm -rf /var/lib/apt/lists/* after apt-get install to save layer space.",
  antecedent: {
    type: "SC-APT-GET-INSTALL",
  },
  consequent: {
    matchAnyBound: {
      type: "SC-RM",
      children: [
        {
          type: "SC-RM-PATHS",
          children: [
            {
              type: "SC-RM-PATH",
              children: [
                {
                  type: "BASH-WORD",
                  children: [
                    {
                      type: "BASH-LITERAL",
                      children: [
                        {
                          type: "ABS-GLOB-STAR",
                        },
                        {
                          type: "ABS-APT-LISTS",
                        },
                        {
                          type: "ABS-PATH-VAR",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  source:
    "https://github.com/docker-library/ruby/pull/7/commits/950a673e59df846608f624ee55321d36ba1f89ba",
  repair: (violation) => {
    // add at the end of the command
    const run =
      violation.matched.node.original instanceof MaybeSemanticCommand
        ? violation.matched.node.original
        : violation.matched.node.getParent(MaybeSemanticCommand);
    run.addChild(
      parseShell("rm -rf /var/lib/apt/lists/*").setPosition(
        new Position(run.position.lineEnd + 1, 0)
      )
    );
  },
};

export const apkAddUseNoCache: Rule = {
  scope: "INTRA-DIRECTIVE",
  kind: "CONSEQUENT-FLAG-OF-ANTECEDENT",
  name: "apkAddUseNoCache",
  description: "Use the --no-cache flag when using apk add.",
  antecedent: {
    type: "SC-APK-ADD",
    bindHere: true,
  },
  consequent: {
    matchAnyBound: {
      type: "SC-APK-F-NO-CACHE",
    },
  },
  source:
    "https://github.com/docker-library/php/pull/228/commits/85d48c88b3e3dae303118275202327f14a8106f4",
  repair: (violation) => {
    const node = violation.matched.node.original
      ? violation.matched.node.original
      : violation.matched.node;
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
  ruleAptGetUpdatePrecedesInstall,
  ruleAptGetInstallUseNoRec,
  ruleAptGetInstallThenRemoveAptLists,
  apkAddUseNoCache,
];

export function matchRule(node: DockerOpsNodeType, rule: Rule) {
  const violations: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }[] = [];
  const stats: {
    [key: string]: {
      matches: number;
      noConfirmations: number;
      violations: number;
    };
  } = {};

  stats[rule.name] = { matches: 0, noConfirmations: 0, violations: 0 };

  node.traverse((node) => {
    const env: { bound: DockerOpsNodeType[] } = { bound: [] };
    if (isRuleMatchNode(node, rule.antecedent, env)) {
      stats[rule.name].matches++;

      if (rule.kind !== "CONSEQUENT-FLAG-OF-ANTECEDENT") {
        env.bound = getAllParentBeforeOrAfterOfNode(
          node,
          rule.kind === "CONSEQUENT-PRECEDES-ANTECEDENT",
          rule.scope === "INTRA-DIRECTIVE"
        );
      }

      if (rule.consequent.matchAnyBound) {
        if (
          !env.bound.some((candidate) => {
            // check the top level and then check the children
            if (
              isRuleMatchNode(candidate, rule.consequent.matchAnyBound, env)
            ) {
              return true;
            }
            // if not everything has be traversed it means that a match has been found
            return !candidate.traverse((node) => {
              if (isRuleMatchNode(node, rule.consequent.matchAnyBound, env)) {
                return false;
              }
            });
          })
        ) {
          stats[rule.name].violations += 1;
          violations.push({
            description: rule.description,
            matched: {
              node,
              rule,
            },
          });
        } else {
          stats[rule.name].noConfirmations += 1;
        }
      } else {
        violations.push({
          description: rule.description,
          matched: {
            node,
            rule,
          },
        });
      }
    }
  });

  return { stats, violations };
}

function isRuleMatchNode(
  node: DockerOpsNodeType,
  rule: Antecedent | Match,
  env: { bound: DockerOpsNodeType[] }
) {
  if (node.type !== rule.type) {
    return false;
  }
  if ((rule as Antecedent).bindHere === true) {
    env.bound = node.children;
  }
  if (rule.children) {
    return rule.children.every((toMatchChild) =>
      node.children.some((currentChild) =>
        isRuleMatchNode(currentChild, toMatchChild, env)
      )
    );
  }
  return true;
}

function getAllParentBeforeOrAfterOfNode(
  node: DockerOpsNodeType,
  before: boolean,
  intra: boolean
): DockerOpsNodeType[] {
  const candidates: DockerOpsNodeType[] = [];
  const STOPPER = intra ? "BASH-SCRIPT" : "DOCKER-FILE";

  let current = node.parent;
  let previous = node;
  while (current != null) {
    if (current.children.length > 1) {
      const parentIndex = current.children.indexOf(previous);
      current.children
        .filter((_, i) => (before ? i < parentIndex : i > parentIndex))
        .forEach((node) => candidates.push(node));
    }
    if (current.type == STOPPER) break;
    previous = current;
    current = current.parent;
  }
  return candidates;
}
