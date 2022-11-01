import { parseShell } from "../lib/ast/docker-bash-parser";
import { parseDocker } from "../lib/ast/docker-parser";
import { print } from "../lib/ast/docker-printer";
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
  mkdirUsrSrcThenRemove,
  npmCacheCleanAfterInstall,
  npmCacheCleanUseForce,
  pipUseNoCacheDir,
  rmRecursiveAfterMktempD,
  ruleAptGetInstallThenRemoveAptLists,
  ruleAptGetInstallUseNoRec,
  ruleAptGetInstallUseY,
  sha256sumEchoOneSpaces,
  tarSomethingRmTheSomething,
  wgetUseHttpsUrl,
  yumInstallForceYes,
  yumInstallRmVarCacheYum,
} from "../lib/debloat/rules";

describe("Testing rule matcher", () => {
  test("curlUseFlagF", async () => {
    const root = await parseShell("curl https://");
    const matcher = new Matcher(root);

    const rule = curlUseFlagF;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node, true)).toEqual("curl -f https://");
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
    expect(print(matcher.node, true)).toEqual(
      "RUN npm i \\\n  npm cache clean --force;\n"
    );
  });
  test("npmCacheCleanAfterInstall valid", async () => {
    const root = await parseShell("RUN npm i\\\n    npm cache clean --force;");
    expect(new Matcher(root).match(npmCacheCleanAfterInstall)).toHaveLength(0);
  });
  test("npmCacheCleanUseForce", async () => {
    const root = await parseDocker("RUN npm cache clean");
    const matcher = new Matcher(root);

    const rule = npmCacheCleanUseForce;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node, true)).toEqual("RUN npm cache clean --force\n");
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
    expect(print(matcher.node, true)).toEqual(
      "RUN mktemp -d fold \\\n  rm -rf fold\n"
    );
  });
  test("rmRecursiveAfterMktempD valid", async () => {
    const root = await parseShell("RUN mktemp -d fold \\\n  rm -rf fold\n");
    expect(new Matcher(root).match(rmRecursiveAfterMktempD)).toHaveLength(0);
  });
  test("curlUseHttpsUrl invalid", async () => {
    const root = await parseShell("curl http://host.com/");
    const matcher = new Matcher(root);

    const rule = curlUseHttpsUrl;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node, true)).toEqual("curl https://host.com/");
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
    expect(print(matcher.node, true)).toEqual(
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
    expect(print(matcher.node, true)).toEqual(
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
    expect(print(matcher.node, true)).toEqual("wget https://host.com/");
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
    expect(print(matcher.node, true)).toEqual(
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
    expect(print(matcher.node, true)).toEqual(
      "RUN mkdir -p /usr/src/python \\\n  rm -rf /usr/src/python\n"
    );
  });
  test("mkdirUsrSrcThenRemove valid", async () => {
    const root = await parseDocker(
      "RUN mkdir -p /usr/src/python \\\n    rm -rf /usr/src/python"
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
    expect(print(matcher.node, true)).toEqual(
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
    expect(print(matcher.node, true)).toEqual(
      "RUN gem update --system \\\n  rm -rf /root/.gem;\n"
    );
  });
  test("gemUpdateSystemRmRootGem valid", async () => {
    const root = await parseDocker(
      "RUN gem update --system;rm -rf /root/.gem;"
    );
    new Matcher(root).match(gemUpdateSystemRmRootGem)
    expect(new Matcher(root).match(gemUpdateSystemRmRootGem)).toHaveLength(0);
  });
  test("gemUpdateNoDocument", async () => {
    const root = await parseDocker("RUN gem update --system $RUBYGEMS_VERSION");
    const matcher = new Matcher(root);

    const rule = gemUpdateNoDocument;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node, true)).toEqual(
      `RUN mkdir -p /usr/local/etc \\
  && { \\
    echo 'install: --no-document'; \\
    echo 'update: --no-document'; \\
  } >> /usr/local/etc/gemrc\nRUN gem update --system \$RUBYGEMS_VERSION\n`
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
    expect(print(matcher.node, true)).toEqual("RUN yum install -y test\n");
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
    expect(print(matcher.node, true)).toEqual(
      "RUN yum install test \\\n  rm -rf /var/cache/yum\n"
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
    expect(print(matcher.node, true)).toEqual(
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
    expect(print(matcher.node, true)).toEqual(
      "RUN gpg --keyserver ha.pool.sks-keyservers.net\n"
    );
  });
  test("gpgUseHaPools valid", async () => {
    const root = await parseDocker(
      "RUN gpg --keyserver ha.pool.sks-keyservers.net"
    );
    expect(new Matcher(root).match(gpgUseHaPools)).toHaveLength(0);
  });
  test("ruleAptGetInstallUseY", async () => {
    const root = await parseDocker("RUN apt-get install test");
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallUseY;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node, true)).toEqual("RUN apt-get install -y test\n");
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
    expect(print(matcher.node, true)).toEqual(
      "RUN apt-get install --no-install-recommends test\n"
    );
  });
  test("ruleAptGetInstallThenRemoveAptLists", async () => {
    const root = await parseDocker("RUN apt-get install test");
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallThenRemoveAptLists;
    const violations = matcher.match(rule);
    expect(violations).toHaveLength(1);

    await violations[0].repair();
    expect(print(matcher.node, true)).toEqual(
      "RUN apt-get install test \\\n  rm -rf /var/lib/apt/lists/*;\n"
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
    expect(print(matcher.node, true)).toEqual(
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
  });
});
