import { readFileSync } from "fs";
import { parseShell } from "../lib/ast/docker-bash-parser";
import { parseDocker } from "../lib/ast/docker-parser";
import { print } from "../lib/ast/docker-pretty-printer";
import { DockerRun, Q } from "../lib/ast/docker-type";
import { Matcher } from "../lib/debloat/rule-matcher";
import {
  apkAddUseNoCache,
  configureShouldUseBuildFlag,
  curlUseFlagF,
  curlUseHttpsUrl,
  gemUpdateNoDocument,
  gemUpdateSystemRmRootGem,
  gpgUseBatchFlag,
  gpgUseHaPools,
  gpgVerifyAscRmAsc,
  mkdirUsrSrcThenRemove,
  npmCacheCleanAfterInstall,
  npmCacheCleanUseForce,
  pipUseNoCacheDir,
  rmRecursiveAfterMktempD,
  ruleAptGetInstallThenRemoveAptLists,
  ruleAptGetInstallUseNoRec,
  ruleAptGetInstallUseY,
  ruleAptGetUpdatePrecedesInstall,
  sha256sumEchoOneSpaces,
  tarSomethingRmTheSomething,
  wgetUseHttpsUrl,
  yumInstallForceYes,
  yumInstallRmVarCacheYum,
} from "../lib/debloat/rules";
import { praseFile } from "./test-utils";

describe("Testing rule matcher", () => {
  test("curlUseFlagF", async () => {
    const root = await parseShell("curl https://");
    const matcher = new Matcher(root);

    const rule = curlUseFlagF;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual("curl -f https://");
  });
  test("curlUseFlagF ftp valid", async () => {
    const root = await parseShell("curl -f ftp://");
    expect(new Matcher(root).match(curlUseFlagF)).toHaveLength(0);
  });
  test("curlUseFlagF valid", async () => {
    const root = await parseShell("curl -f https://");
    expect(new Matcher(root).match(curlUseFlagF)).toHaveLength(0);
  });
  test("npmCacheCleanAfterInstall", async () => {
    const root = await parseDocker("RUN npm i");
    const matcher = new Matcher(root);

    const rule = npmCacheCleanAfterInstall;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN npm i && npm cache clean --force;\n"
    );
  });
  test("npmCacheCleanAfterInstall inside binary", async () => {
    const root = await parseDocker("RUN npm update && npm i");
    const matcher = new Matcher(root);

    const rule = npmCacheCleanAfterInstall;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN npm update && npm i && npm cache clean --force;\n"
    );
  });
  test("npmCacheCleanAfterInstall valid", async () => {
    const root = await parseShell("RUN npm i\\\n    npm cache clean --force;");
    expect(new Matcher(root).match(npmCacheCleanAfterInstall)).toHaveLength(0);
  });
  test("npmCacheCleanUseForce2", async () => {
    const root = await parseDocker("RUN npm i && npm cache clean");
    const matcher = new Matcher(root);

    const rule = npmCacheCleanUseForce;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    new Matcher(root);
    expect(violations[0].isStillValid()).toBeFalsy();
    expect(print(matcher.node)).toEqual(
      "RUN npm i && npm cache clean --force\n"
    );
  });
  test("npmCacheCleanUseForce", async () => {
    const root = await parseDocker("RUN npm cache clean");
    const matcher = new Matcher(root);

    const rule = npmCacheCleanUseForce;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual("RUN npm cache clean --force\n");
  });
  test("npmCacheCleanUseForce valid", async () => {
    const root = await parseShell("RUN npm cache clean --force");
    expect(new Matcher(root).match(npmCacheCleanUseForce)).toHaveLength(0);
  });
  test("rmRecursiveAfterMktempD", async () => {
    const root = await parseDocker("RUN mktemp -d fold\n");
    const matcher = new Matcher(root);

    const rule = rmRecursiveAfterMktempD;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual("RUN mktemp -d fold && rm -rf fold\n");
  });
  test("rmRecursiveAfterMktempD valid", async () => {
    const root = await parseShell("RUN mktemp -d fold && rm -rf fold\n");
    expect(new Matcher(root).match(rmRecursiveAfterMktempD)).toHaveLength(0);
  });
  test("curlUseHttpsUrl invalid", async () => {
    const root = await parseShell("curl http://host.com/");
    const matcher = new Matcher(root);

    const rule = curlUseHttpsUrl;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual("curl https://host.com/");
  });
  test("curlUseHttpsUrl invalid2", async () => {
    const root = await parseShell(
      'curl -SL "http://php.net/get/php-$PHP_VERSION.tar.bz2.asc/from/this/mirror" -o "$PHP_FILENAME.asc"'
    );
    const matcher = new Matcher(root);

    const rule = curlUseHttpsUrl;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      'curl -SL "https://php.net/get/php-$PHP_VERSION.tar.bz2.asc/from/this/mirror" -o "$PHP_FILENAME.asc"'
    );
  });
  test("curlUseHttpsUrl invalid3", async () => {
    const root = await parseShell('curl -SL "http://$PHP_VERSION.tar.bz2.asc"');
    const matcher = new Matcher(root);

    const rule = curlUseHttpsUrl;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      'curl -SL "https://$PHP_VERSION.tar.bz2.asc"'
    );
  });
  test("curlUseHttpsUrl valid", async () => {
    const root = await parseShell("curl -f https://host.com/");
    const matcher = new Matcher(root);

    const rule = curlUseHttpsUrl;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(0);
  });
  test("wgetUseHttpsUrl", async () => {
    const root = await parseShell("wget http://host.com/");
    const matcher = new Matcher(root);

    const rule = wgetUseHttpsUrl;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual("wget https://host.com/");
  });
  test("wgetUseHttpsUrl ftp valid", async () => {
    const root = await parseShell("wget ftp://host.com/");
    expect(new Matcher(root).match(wgetUseHttpsUrl)).toHaveLength(0);
  });
  test("wgetUseHttpsUrl valid", async () => {
    const root = await parseShell("wget https://host.com/");
    expect(new Matcher(root).match(wgetUseHttpsUrl)).toHaveLength(0);
  });
  test("pipUseNoCacheDir", async () => {
    const root = await parseShell(
      "pip install --upgrade pip==$PYTHON_PIP_VERSION"
    );
    const matcher = new Matcher(root);

    const rule = pipUseNoCacheDir;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "pip install --no-cache-dir --upgrade pip==$PYTHON_PIP_VERSION"
    );
  });
  test("pipUseNoCacheDir valid", async () => {
    const root = await parseShell(
      "pip install --no-cache-dir --upgrade pip==${PYTHON_PIP_VERSION}"
    );
    expect(new Matcher(root).match(pipUseNoCacheDir)).toHaveLength(0);
  });
  test("mkdirUsrSrcThenRemove", async () => {
    const root = await parseDocker("RUN mkdir -p /usr/src/python");
    const matcher = new Matcher(root);

    const rule = mkdirUsrSrcThenRemove;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN mkdir -p /usr/src/python && rm -rf /usr/src/python\n"
    );
  });
  test("mkdirUsrSrcThenRemove valid", async () => {
    const root = await parseDocker(
      "RUN mkdir -p /usr/src/python && rm -rf /usr/src/python"
    );
    expect(new Matcher(root).match(mkdirUsrSrcThenRemove)).toHaveLength(0);
  });
  test("configureShouldUseBuildFlag", async () => {
    const root = await parseDocker(
      "RUN ./configure --disable-install-doc --enable-shared"
    );
    const matcher = new Matcher(root);

    const rule = configureShouldUseBuildFlag;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      'RUN ./configure --build="$(dpkg-architecture --query DEB_BUILD_GNU_TYPE)" --disable-install-doc --enable-shared\n'
    );
  });
  test("configureShouldUseBuildFlag valid", async () => {
    const root = await parseDocker(`RUN ./configure \
    --build="$gnuArch" \
    --libdir="$TOMCAT_NATIVE_LIBDIR" \
    --prefix="$CATALINA_HOME" \
    --with-apr="$aprConfig" \
    --with-java-home="$JAVA_HOME" \
    --with-ssl=yes;`);
    const matcher = new Matcher(root);

    const rule = configureShouldUseBuildFlag;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(0);
  });
  test("gemUpdateSystemRmRootGem", async () => {
    const root = await parseDocker("RUN gem update --system");
    const matcher = new Matcher(root);

    const rule = gemUpdateSystemRmRootGem;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN gem update --system && rm -rf /root/.gem;\n"
    );
  });
  test("gemUpdateSystemRmRootGem valid", async () => {
    const root = await parseDocker(
      "RUN gem update --system;rm -rf /root/.gem;"
    );
    new Matcher(root).match(gemUpdateSystemRmRootGem);
    expect(new Matcher(root).match(gemUpdateSystemRmRootGem)).toHaveLength(0);
  });
  test("gemUpdateNoDocument", async () => {
    const root = await parseDocker("RUN gem update --system $RUBYGEMS_VERSION");
    const matcher = new Matcher(root);

    const rule = gemUpdateNoDocument;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      `RUN mkdir -p /usr/local/etc \\
  && { \\
    echo 'install: --no-document'; \\
    echo 'update: --no-document'; \\
  } >> /usr/local/etc/gemrc;\nRUN gem update --system \$RUBYGEMS_VERSION\n`
    );
  });
  test("gemUpdateNoDocument valid", async () => {
    const root = await parseDocker(
      `RUN mkdir -p /usr/local/etc \\
    && { \\
        echo 'install: --no-document'; \\
        echo 'update: --no-document'; \\
    } >> /usr/local/etc/gemrc \\\nRUN gem update --system \${RUBYGEMS_VERSION}`
    );
    expect(new Matcher(root).match(gemUpdateNoDocument)).toHaveLength(0);
  });
  test("yumInstallForceYes", async () => {
    const root = await parseDocker("RUN yum install test");
    const matcher = new Matcher(root);

    const rule = yumInstallForceYes;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual("RUN yum install -y test\n");
  });
  test("yumInstallForceYes valid", async () => {
    const root = await parseDocker("RUN yum install -y test");
    expect(new Matcher(root).match(yumInstallForceYes)).toHaveLength(0);
  });
  test("yumInstallRmVarCacheYum", async () => {
    const root = await parseDocker("RUN yum install test");
    const matcher = new Matcher(root);

    const rule = yumInstallRmVarCacheYum;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN yum install test && rm -rf /var/cache/yum\n"
    );
  });
  test("yumInstallRmVarCacheYum valid", async () => {
    const root = await parseDocker(
      "RUN yum install test;rm -rf /var/cache/yum"
    );
    expect(new Matcher(root).match(yumInstallRmVarCacheYum)).toHaveLength(0);
  });
  test("gpgUseBatchFlag", async () => {
    const root = await parseDocker(
      "RUN gpg --keyserver ha.pool.sks-keyservers.net"
    );
    const matcher = new Matcher(root);

    const rule = gpgUseBatchFlag;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN gpg --batch --keyserver ha.pool.sks-keyservers.net\n"
    );
  });
  test("gpgUseBatchFlag valid", async () => {
    const root = await parseDocker(
      "RUN gpg --batch --keyserver ha.pool.sks-keyservers.net"
    );
    expect(new Matcher(root).match(gpgUseBatchFlag)).toHaveLength(0);
  });
  test("gpgUseHaPools", async () => {
    const root = await parseDocker(
      "RUN gpg --keyserver pool.sks-keyservers.net"
    );
    const matcher = new Matcher(root);

    const rule = gpgUseHaPools;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN gpg --keyserver ha.pool.sks-keyservers.net\n"
    );
  });
  test("gpgUseHaPools valid", async () => {
    const root = await parseDocker(
      "RUN gpg --keyserver ha.pool.sks-keyservers.net"
    );
    expect(new Matcher(root).match(gpgUseHaPools)).toHaveLength(0);
  });
  test("ruleAptGetUpdatePrecedesInstall", async () => {
    const root = await parseDocker(
      "RUN apt-get update\nRUN apt-get install test"
    );
    const matcher = new Matcher(root);

    const rule = ruleAptGetUpdatePrecedesInstall;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);
    expect(matcher.match(ruleAptGetInstallUseNoRec)).toHaveLength(1);

    await violations[0].repair();
    await matcher.match(ruleAptGetInstallUseNoRec)[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN apt-get update && \\\n  apt-get install --no-install-recommends test\n"
    );
  });
  test("ruleAptGetUpdatePrecedesInstall 2", async () => {
    const root = await praseFile("ruleAptGetUpdatePrecedesInstall_fail");
    const matcher = new Matcher(root);

    const rule = ruleAptGetUpdatePrecedesInstall;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);
    expect(matcher.match(ruleAptGetInstallUseNoRec)).toHaveLength(1);

    await matcher.match(ruleAptGetInstallUseNoRec)[0].repair();
    await violations[0].repair();
    expect(
      print(root.find(Q(DockerRun, Q("ALL", Q("SC-APT-GET-UPDATE"))))[0])
    ).toEqual(
      "RUN apt-get update -qq && \\\n  apt-get install --no-install-recommends -yq make gcc flex bison libcap-ng-dev"
    );
  });
  test("gpgVerifyAscRmAsc valid", async () => {
    const root = await parseDocker(
      "RUN gpg --verify /usr/local/bin/gosu.asc && rm /usr/local/bin/gosu.asc"
    );
    const matcher = new Matcher(root);

    const rule = gpgVerifyAscRmAsc;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(0);
  });

  test("gpgVerifyAscRmAsc", async () => {
    const root = await parseDocker("RUN gpg --verify /usr/local/bin/gosu.asc");
    const matcher = new Matcher(root);

    const rule = gpgVerifyAscRmAsc;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN gpg --verify /usr/local/bin/gosu.asc && rm /usr/local/bin/gosu.asc\n"
    );
  });

  test("ruleAptGetInstallUseY", async () => {
    const root = await parseDocker("RUN apt-get install test");
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallUseY;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual("RUN apt-get install -y test\n");
  });
  test("ruleAptGetInstallUseY valid", async () => {
    const root = await parseDocker("RUN apt-get install -y test");
    expect(new Matcher(root).match(ruleAptGetInstallUseY)).toHaveLength(0);
  });
  test("ruleAptGetInstallUseNoRec", async () => {
    const root = await parseDocker("RUN apt-get install test");
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallUseNoRec;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN apt-get install --no-install-recommends test\n"
    );
  });
  test("ruleAptGetInstallUseNoRec real case", async () => {
    const root = await parseDocker(
      "RUN DEBIAN_FRONTEND=noninteractive apt-get -y install z3"
    );
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallUseNoRec;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends -y install z3\n"
    );
  });
  test("ruleAptGetInstallThenRemoveAptLists", async () => {
    const root = await parseDocker("RUN apt-get install test");
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallThenRemoveAptLists;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN apt-get install test && rm -rf /var/lib/apt/lists/*;\n"
    );
  });
  test("2 ruleAptGetInstallThenRemoveAptLists", async () => {
    const root = await parseDocker(
      "RUN apt-get install test && apt-get install test2"
    );
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallThenRemoveAptLists;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(2);

    await violations[0].repair();
    expect(violations[1].isStillValid()).toBe(false);
    await violations[1].repair();
    expect(print(matcher.node)).toEqual(
      "RUN apt-get install test && apt-get install test2 && rm -rf /var/lib/apt/lists/*;\n"
    );
  });

  test("ruleAptGetInstallThenRemoveAptLists real scenario", async () => {
    const root = await praseFile("complex-reprint");
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallThenRemoveAptLists;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();

    expect(print(matcher.node)).toEqual(
      readFileSync("./tests/data/complex-reprint-repaired.Dockerfile", "utf8")
    );
  });

  test("ruleAptGetInstallThenRemoveAptLists valid", async () => {
    const root = await parseDocker(
      "RUN apt-get install test && rm -rf /var/lib/apt/lists/*;"
    );
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallThenRemoveAptLists;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(0);
  });
  test("apkAddUseNoCache", async () => {
    const root = await parseDocker(
      "RUN apk add --virtual .php-rundeps $runDeps"
    );
    const matcher = new Matcher(root);

    const rule = apkAddUseNoCache;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN apk add --no-cache --virtual .php-rundeps $runDeps\n"
    );
  });

  test("sha256sumEchoOneSpaces valid", async () => {
    const root = await parseDocker(
      'RUN echo "$PHP_SHA256 *$PHP_FILENAME" | sha256sum -c -'
    );
    const matcher = new Matcher(root);

    const rule = sha256sumEchoOneSpaces;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(0);
  });

  test("sha256sumEchoOneSpaces without echo valid", async () => {
    const root = await parseDocker(
      "RUN sha256sum --strict --ignore-missing --check CHECKSUMS"
    );
    const matcher = new Matcher(root);

    const rule = sha256sumEchoOneSpaces;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(0);
  });

  test("sha256sumEchoOneSpaces invalid", async () => {
    const root = await parseDocker(
      'RUN echo "$PHP_SHA256  *$PHP_FILENAME" | sha256sum -c -\n'
    );
    const matcher = new Matcher(root);

    const rule = sha256sumEchoOneSpaces;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);
  });
  test("tarSomethingRmTheSomething valid", async () => {
    const root = await parseDocker(
      "RUN tar -zxvf curl-7.45.0.tar.gz; rm curl-7.45.0.tar.gz\n"
    );
    const matcher = new Matcher(root);

    const rule = tarSomethingRmTheSomething;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(0);
  });
  test("tarSomethingRmTheSomething invalid", async () => {
    const root = await parseDocker("RUN tar -zxvf curl-7.45.0.tar.gz");
    const matcher = new Matcher(root);

    const rule = tarSomethingRmTheSomething;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);
    await violations[0].repair();
    expect(print(matcher.node)).toEqual(
      "RUN tar -zxvf curl-7.45.0.tar.gz && rm curl-7.45.0.tar.gz\n"
    );
  });
});
