import { Q } from "../lib/core/core-types";
import { parseDocker } from "../lib/docker/docker-parser";
import { enrich } from "../lib/shell/enricher";
import { parseShell } from "../lib/shell/shell-parser";
import { BashCommand, BashCommandArgs } from "../lib/shell/shell-types";

describe("Testing enrich", () => {
  describe("mv", () => {
    test("mv source1 source2 dest", () => {
      const root = parseShell("mv source1 source2 dest");
      const r = enrich(root);
      expect(r.find(Q("SC-MV-PATH"))).toHaveLength(3);
      expect(r.find(Q("SC-MV-DESTINATION"))).toHaveLength(1);
    });

    test("mv source dest", () => {
      const root = parseShell("mv source dest");
      const r = enrich(root);
      expect(r.find(Q("SC-MV-PATH"))).toHaveLength(2);
      expect(r.find(Q("SC-MV-DESTINATION"))).toHaveLength(1);
    });
  });
  describe("multiple subcommands", () => {
    test("gradle clean build test", () => {
      const root = parseShell("gradle clean build test");
      const r = enrich(root);
      // expect(r.find(Q("SC-GRADLE"))).toHaveLength(1);
      expect(r.find(Q("SC-GRADLE-CLEAN"))).toHaveLength(1);
      expect(r.find(Q("SC-GRADLE-BUILD"))).toHaveLength(1);
      expect(r.find(Q("SC-GRADLE-TEST"))).toHaveLength(1);
    });
  });
  describe("python", () => {
    test("python -m pip install -r requirements", () => {
      const root = parseShell("python -m pip install -r requirements");
      const r = enrich(root);
      expect(r.find(Q("SC-PIP-INSTALL"))).toHaveLength(1);
    });
    test("python -m RUN python -m pip install --upgrade pip", () => {
      const root = parseShell("python -m pip install --upgrade pip");
      const r = enrich(root);
      expect(r.find(Q("SC-PIP-INSTALL"))).toHaveLength(1);
    });
  });
  describe("npm", () => {
    test("npm run build", () => {
      const root = parseShell("npm run build");
      const r = enrich(root);
      expect(r.find(Q("SC-NPM-RUN-BUILD"))).toHaveLength(1);
    });
  });
  describe("docker", () => {
    test("docker run <image>", () => {
      const root = parseShell(`docker run -v ".:/testing" --rm my-image`);
      const r = enrich(root);
      expect(r.find(Q("SC-DOCKER-RUN"))).toHaveLength(1);
    });
    test("docker run python -m pytest", () => {
      const root =
        parseShell(`docker run -v ".:/testing" -v "./user_data/data:/testing/user_data/data" --rm \
        -w /testing --entrypoint "" --env-file .github/workflows/scripts/ci-proxy.env \
        ci-strategy-backtesting \
        python -m pytest -ra -vv -s --log-cli-level=info --artifacts-path=artifacts/ \
        -p no:cacheprovider tests/backtests -k 'kucoin and spot and 20230801-20230901'`);
      const r = enrich(root);
      expect(r.find(Q("SC-DOCKER-RUN"))).toHaveLength(1);
      expect(r.find(Q("SC-PYTHON-MODULE"))).toHaveLength(1);
      expect(r.find(Q("SC-PYTEST"))).toHaveLength(1);
    });
  });

  describe("CHMOD", () => {
    test("chmod 777 file", () => {
      const root = parseShell("chmod 777 file");
      const r = enrich(root);
      expect(r.find(Q("SC-CHMOD-MODE"))).toHaveLength(1);
      expect(r.find(Q("SC-CHMOD-PATH"))).toHaveLength(1);
      expect(r.find(Q("SC-CHMOD"))).toHaveLength(1);
    });
  });
  describe("SC-DPHP-EXT-INSTALL", () => {
    test("docker-php-ext-install -j$(nproc) intl", () => {
      const root = parseShell("docker-php-ext-install -j$(nproc) intl");
      const r = enrich(root);
      expect(r.find(Q("SC-DPHP-EXT-INSTALL"))).toHaveLength(1);
      expect(r.find(Q("SC-DPHP-EXT-INSTALL-PACKAGE"))).toHaveLength(1);
      expect(r.find(Q("SC-DPHP-EXT-INSTALL-J"))).toHaveLength(1);
    });
  });

  test("grep --", () => {
    const root = parseShell(
      "grep -q -- '-Xss256k' \"$CASSANDRA_CONFIG/cassandra-env.sh\""
    );
    const r = enrich(root);
    expect(r.getElement(BashCommand)?.annotations.includes("SC-GREP")).toBe(
      true
    );
    expect(r.getElements(BashCommandArgs)[3]?.annotations).toEqual([
      "SC-GREP-PATH",
    ]);
  });

  describe("SC-APT-INSTALL", () => {
    test("apt-get ::", () => {
      const root = parseShell("apt-get -o AcQuire::GzipIndexes=false update;");
      const r = enrich(root);
      expect(r.getElement(BashCommand)?.annotations).toEqual(["SC-APT-UPDATE"]);
    });

    test("apt", () => {
      const root = parseShell("apt install wget");
      const r = enrich(root);
      expect(r.getElement(BashCommand)?.annotations).toEqual([
        "SC-APT-INSTALL",
      ]);

      expect(r.find(Q("SC-APT-PACKAGE"))).toHaveLength(1);
    });
    test("apt quiet", () => {
      const root = parseShell("apt install -qq wget");
      const r = enrich(root);
      expect(r.getElement(BashCommand)?.annotations).toEqual([
        "SC-APT-INSTALL",
      ]);

      expect(r.find(Q("SC-APT-PACKAGE"))).toHaveLength(1);
    });
  });

  describe("SC-CD", () => {
    test("cd ~", () => {
      const root = parseShell("cd ~;");
      const r = enrich(root);
      expect(r.getElement(BashCommand)?.annotations).toEqual(["SC-CD"]);
      expect(r.getElement(BashCommandArgs)?.annotations).toContain(
        "SC-CD-PATH"
      );
      expect(r.getElement(BashCommandArgs)?.annotations).toContain("BASH-PATH");
    });
    test("cd", () => {
      const root = parseShell("cd;");
      const r = enrich(root);
      expect(r.getElement(BashCommand)?.annotations).toEqual(["SC-CD"]);
    });
  });
  test("find", () => {
    const root = parseShell("find . -name 'FILE-TO-FIND' -exec rm {} ;");
    const r = enrich(root);
    expect(r.getElement(BashCommand)?.annotations).toEqual(["SC-FIND"]);
    expect(r.find(Q("SC-RM"))).toHaveLength(1);
    expect(r.getElements(BashCommand)).toHaveLength(2);
  });

  describe("shell", () => {
    test("bash", () => {
      const root = parseShell("bash ./my_script;");
      const r = enrich(root);
      expect(r.getElement(BashCommand)?.annotations).toEqual(["SC-BASH"]);
      expect(r.getElements(BashCommand)).toHaveLength(2);
    });

    test("sh", () => {
      const root = parseShell("sh ./my_script;");
      const r = enrich(root);
      expect(r.getElement(BashCommand)?.annotations).toEqual(["SC-SH"]);
      expect(r.getElements(BashCommand)).toHaveLength(2);
    });
    test("/bin/sh -c", () => {
      const root = parseShell(
        "/bin/sh -c apt install --no-install-recommends -y nodejs"
      );
      enrich(root);
      expect(root.find(Q("SC-APT-INSTALL"))).toHaveLength(1);
    });
  });

  describe("SD-useradd", () => {
    test("useradd", () => {
      const root = parseShell("useradd -G sudo -G test oddee;");
      const r = enrich(root);
      expect(r.getElement(BashCommand)?.annotations).toEqual(["SC-USER-ADD"]);
      expect(r.getElements(BashCommand)).toHaveLength(1);
      expect(r.find(Q("SC-USER-ADD-GROUPS"))).toHaveLength(4);
      expect(r.find(Q("SC-USER-ADD-LOGIN"))).toHaveLength(1);
    });
  });

  test("apk", () => {
    const root = parseShell("apk add libressl");
    const r = enrich(root);
    expect(r.getElement(BashCommand)?.annotations).toEqual(["SC-APK-ADD"]);
  });
  test("sudo", () => {
    const root = parseShell("sudo apt-get -f install;");
    const r = enrich(root);
    expect(r.toString()).toEqual("sudo apt-get -f install;");
  });
  test("yum", () => {
    let ast = enrich(parseShell("yum install -y wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yum remove -y wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yum erase -y wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yum clean all"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yum update wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yum localinstall -y wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yum groupinstall -y wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yum versionlock add wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yum makecache"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
  });
  test("yarn", () => {
    let ast = enrich(parseShell("yarn install"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn add wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn audit"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn autoclean"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn bin wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn lint"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn cache list"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn cache clean"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn cache dir"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn global add wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn remove wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn prune"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn publish"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn run build"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn test"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn unlink wget"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("yarn upgrade"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
  });
  test("useradd", () => {
    let ast = enrich(parseShell("useradd -G sudo -G test oddee;"));
    expect(ast.toString()).toEqual(ast.position.file?.content);

    ast = enrich(parseShell("useradd -D -G sudo oddee;"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("useradd --defaults -G sudo;"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("useradd oddee;"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("useradd -D oddee;"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("useradd --defaults oddee;"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
  });
  test("sed", () => {
    const root = parseShell("sed -i 's/old/new/g' file");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("rustup", () => {
    const root = parseShell("rustup show");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("rpm", () => {
    let ast = enrich(parseShell("rpm --erase express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("rpm --freshen express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("rpm --upgrade express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("rpm --install express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("rpm --verify"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("rpm --query express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
  });
  test("npm", () => {
    let ast = enrich(parseShell("npm install; npm test"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm upgrade"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm prune --production express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm link express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm config set express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm config get express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm config delete express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm cache clean --force"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm cache rm express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm cache clear --force"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm run-script build"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm run docs"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm test"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm publish"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm audit"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm remove express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm uninstall express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm ci"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm add express"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
    ast = enrich(parseShell("npm i"));
    expect(ast.toString()).toEqual(ast.position.file?.content);
  });
  test("mvn", () => {
    const root = parseShell("mvn clean install");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("ln", () => {
    const root = parseShell("ln -s source dest");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("go", () => {
    const root = parseShell("go build");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("git", () => {
    const root = parseShell("git checkout -b branch");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("gh", () => {
    const root = parseShell("gh pr checkout 123");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("gem", () => {
    const root = parseShell("gem install bundler");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("dotnet", () => {
    const root = parseShell("dotnet build");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("docker", () => {
    const root = parseShell("docker build -t myimage .");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("dockercompose", () => {
    const root = parseShell("docker-compose up");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("dnf", () => {
    const root = parseShell("dnf install -y wget");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("conda", () => {
    const root = parseShell("conda install -y numpy");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("cmake", () => {
    const root = parseShell("cmake .");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("cargo", () => {
    const root = parseShell("cargo build");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("bundle", () => {
    const root = parseShell("bundle install");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("apt", () => {
    const root = parseShell("apt install -y wget");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("apt-key", () => {
    const root = parseShell("apt-key add key");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("apt-get", () => {
    const root = parseShell("apt-get install -y wget");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });
  test("apk", () => {
    const root = parseShell("apk add wget");
    const r = enrich(root);
    expect(r.toString()).toEqual(root.position.file?.content);
  });

  describe("Real case", () => {
    test("enrich no changes", () => {
      const root =
        parseDocker(`RUN FIREFOX_URL="https://s3.amazonaws.com/circle-downloads/firefox-mozilla-build_47.0.1-0ubuntu1_amd64.deb" \\
    && curl --silent --show-error --location --fail --retry 3 --output /tmp/firefox.deb $FIREFOX_URL \\
    && echo 'ef016febe5ec4eaf7d455a34579834bcde7703cb0818c80044f4d148df8473bb  /tmp/firefox.deb' | sha256sum -c \\
    && sudo dpkg -i /tmp/firefox.deb || sudo apt-get -f install  \\
    && sudo apt-get install -y libgtk3.0-cil-dev libasound2 libasound2 libdbus-glib-1-2 libdbus-1-3 \\
    && rm -rf /tmp/firefox.deb \\
    && firefox --version`);
      enrich(root);
      root.traverse((n) => {
        expect(n.isChanged).toBe(false);
      });
    });
    test("adduser", () => {
      const root = parseDocker(`RUN if [ -d .git ]; then \
  mkdir /src/_build/prod/rel/bors/.git && \
  git rev-parse --short HEAD > /src/_build/prod/rel/bors/.git/HEAD; \
elif [ -n \${SOURCE_COMMIT} ]; then \
  mkdir /src/_build/prod/rel/bors/.git && \
  echo \${SOURCE_COMMIT} > /src/_build/prod/rel/bors/.git/HEAD; \
fi`);
      const r = enrich(root);
      expect(r.find(Q("SC-GIT-REV-PARSE-TARGET"))[0].isChanged).toBe(false);
    });

    test("make with invalid arguements", () => {
      const root = parseShell(
        "make -Wall -Wwrite-strings -Woverloaded-virtual -Wno-sign-compare"
      );
      const r = enrich(root);
      expect(r.find(Q("SC-MAKE"))).toHaveLength(1);
    });

    test("infinite loop", () => {
      const root = parseDocker(
        "tests/data/b4cbd8978fc2bd702f82e53c46e7c5e015bb418f.Dockerfile"
      );
      const r = enrich(root);
      expect(r.find(Q("SC-GIT-CLONE"))).toHaveLength(1);
    });
    test("command in bin", () => {
      const root =
        parseShell(`cd /home/runner/work/brian2/brian2/.. # move out of the workspace to avoid direct import
    /opt/hostedtoolcache/Python/3.12.0/×64/bin/python -Wd /home/runner/work/brian2/brian2/dev/continuous-integration/run_test_suite.py`);
      const r = enrich(root);
      expect(r.find(Q("SC-PYTHON"))).toHaveLength(1);
    });
    test("tar", () => {
      const root = parseShell(
        `tar -xzf /tmp/ghidra_9.2.2_PUBLIC_20201229.zip -C /opt`
      );
      const r = enrich(root);
      expect(r.find(Q("SC-TAR-EXTRACT"))).toHaveLength(1);
    });
  });
});
