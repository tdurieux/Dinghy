import { parseShell } from "../lib/ast/docker-bash-parser";
import { parseDocker, parseDockerFile } from "../lib/ast/docker-parser";
import { print } from "../lib/ast/docker-printer";
import { DockerFile } from "../lib/ast/docker-type";
import { Matcher } from "../lib/debloat";
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
  wgetUseHttpsUrl,
  yumInstallForceYes,
  yumInstallRmVarCacheYum,
} from "../lib/debloat/rules";

describe("Testing rule matcher", () => {
  test("curlUseFlagF", () => {
    const root = parseShell("curl https://");
    const matcher = new Matcher(root);

    const rule = curlUseFlagF;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual("curl -f https://");
  });
  test("npmCacheCleanAfterInstall", () => {
    const root = parseDocker("RUN npm i");
    const matcher = new Matcher(root);

    const rule = npmCacheCleanAfterInstall;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "RUN npm i\n    npm cache clean --force;\n"
    );
  });
  test("npmCacheCleanUseForce", () => {
    const root = parseDocker("RUN npm cache clean");
    const matcher = new Matcher(root);

    const rule = npmCacheCleanUseForce;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual("RUN npm cache clean --force\n");
  });
  test("rmRecursiveAfterMktempD", () => {
    const root = parseDocker("RUN mktemp -d fold");
    const matcher = new Matcher(root);

    const rule = rmRecursiveAfterMktempD;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "RUN mktemp -d fold\n    rm -rf fold\n"
    );
  });
  test("curlUseHttpsUrl", () => {
    const root = parseShell("curl http://host.com/");
    const matcher = new Matcher(root);

    const rule = curlUseHttpsUrl;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual("curl https://host.com/");
  });
  test("wgetUseHttpsUrl", () => {
    const root = parseShell("wget http://host.com/");
    const matcher = new Matcher(root);

    const rule = wgetUseHttpsUrl;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual("wget https://host.com/");
  });
  test("pipUseNoCacheDir", () => {
    const root = parseShell("pip install --upgrade pip==$PYTHON_PIP_VERSION");
    const matcher = new Matcher(root);

    const rule = pipUseNoCacheDir;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "pip install --no-cache-dir --upgrade pip==${PYTHON_PIP_VERSION}"
    );
  });
  test("mkdirUsrSrcThenRemove", () => {
    const root = parseDocker("RUN mkdir -p /usr/src/python");
    const matcher = new Matcher(root);

    const rule = mkdirUsrSrcThenRemove;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "RUN mkdir -p /usr/src/python\n    rm -rf /usr/src/python\n"
    );
  });
  test("configureShouldUseBuildFlag", () => {
    const root = parseDocker(
      "RUN ./configure --disable-install-doc --enable-shared"
    );
    const matcher = new Matcher(root);

    const rule = configureShouldUseBuildFlag;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      'RUN ./configure --build="$(dpkg-architecture --query DEB_BUILD_GNU_TYPE)" --disable-install-doc --enable-shared\n'
    );
  });
  test("gemUpdateSystemRmRootGem", () => {
    const root = parseDocker("RUN gem update --system");
    const matcher = new Matcher(root);

    const rule = gemUpdateSystemRmRootGem;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "RUN gem update --system\n    rm -rf /root/.gem;\n"
    );
  });
  test("gemUpdateNoDocument", () => {
    const root = parseDocker("RUN gem update --system $RUBYGEMS_VERSION");
    const matcher = new Matcher(root);

    const rule = gemUpdateNoDocument;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "RUN echo 'install: --no-document\nupdate: --no-document' > \"${HOME}/.gemrc\"\nRUN gem update --system ${RUBYGEMS_VERSION}\n"
    );
  });
  test("yumInstallForceYes", () => {
    const root = parseDocker("RUN yum install test");
    const matcher = new Matcher(root);

    const rule = yumInstallForceYes;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual("RUN yum install -y test\n");
  });
  test("yumInstallRmVarCacheYum", () => {
    const root = parseDocker("RUN yum install test");
    const matcher = new Matcher(root);

    const rule = yumInstallRmVarCacheYum;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "RUN yum install test\n    rm -rf /var/cache/yum\n"
    );
  });
  test("gpgUseBatchFlag", () => {
    const root = parseDocker("RUN gpg --keyserver ha.pool.sks-keyservers.net");
    const matcher = new Matcher(root);

    const rule = gpgUseBatchFlag;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "RUN gpg --batch --keyserver ha.pool.sks-keyservers.net\n"
    );
  });
  test("gpgUseHaPools", () => {
    const root = parseDocker("RUN gpg --keyserver pool.sks-keyservers.net");
    const matcher = new Matcher(root);

    const rule = gpgUseHaPools;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "RUN gpg --keyserver ha.pool.sks-keyservers.net\n"
    );
  });
  test("ruleAptGetInstallUseY", () => {
    const root = parseDocker("RUN apt-get install test");
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallUseY;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual("RUN apt-get install -y test\n");
  });
  test("ruleAptGetInstallUseNoRec", () => {
    const root = parseDocker("RUN apt-get install test");
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallUseNoRec;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "RUN apt-get install --no-install-recommends test\n"
    );
  });
  test("ruleAptGetInstallThenRemoveAptLists", () => {
    const root = parseDocker("RUN apt-get install test");
    const matcher = new Matcher(root);

    const rule = ruleAptGetInstallThenRemoveAptLists;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "RUN apt-get install test\n    rm -rf /var/lib/apt/lists/*;\n"
    );
  });
  test("apkAddUseNoCache", () => {
    const root = parseDocker("RUN apk add --virtual .php-rundeps $runDeps");
    const matcher = new Matcher(root);

    const rule = apkAddUseNoCache;
    const violations = matcher.match(rule).violations;
    expect(violations).toHaveLength(1);

    rule.repair(violations[0]);
    expect(print(matcher.node, true)).toEqual(
      "RUN apk add --no-cache --virtual .php-rundeps ${runDeps}\n"
    );
  });
});
