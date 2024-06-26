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
