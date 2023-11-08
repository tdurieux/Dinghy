import { parseDocker } from "../lib/parser/docker-parser";

function testPrint(original: string) {
  const root = parseDocker(original);
  expect(root.toString().trimEnd()).toBe(original);
}

describe("Testing docker-printer", () => {
  test("print RUN", () => {
    testPrint("RUN wget localhost");
    testPrint("RUN wget localhost;");
    testPrint("RUN echo 'toto';");

    testPrint(`RUN set -eux; \\

  savedAptMark = "\${apt-mark showmanual}"; \\
  apt-get update;`);
    testPrint(`RUN case "\${dpkgArch}" in \\
  armel) \\
    extraConfigureArgs = "\${extraConfigureArgs} --with-arch=armv4t --with-float=soft" \\
    ;; \\
  armhf) \\
    extraConfigureArgs = "\${extraConfigureArgs} --with-arch=armv7-a --with-float=hard --with-fpu=vfpv3-d16 --with-mode=thumb" \\
    ;; \\
esac;`);
  });

  test("print FROM", () => {
    testPrint("FROM adoptopenjdk:8-jdk-openj9");
    testPrint("FROM ubuntu:10");
    testPrint("FROM microsoft/windowsservercore:ltsc2016");
    testPrint("FROM ubuntu@10");
    testPrint("FROM ubuntu@10 as stage");
  });

  test("print USER", () => {
    testPrint("USER root");
  });
  test("print ENV", () => {
    testPrint("ENV GPG_KEYS 05AB33110949707C93A279E3D3EFE6B686867BA6");
  });
  test("print EXPOSE", () => {
    testPrint("EXPOSE 8080");
  });
  test("print SHELL", () => {
    testPrint("SHELL ['ls', '-l']");
  });
  test("print CMD", () => {
    testPrint('CMD ["catalina.sh", "run"]');
  });
  test("print VOLUME", () => {
    testPrint("VOLUME C:\\data\\db C:\\data\\configdb");
  });
  test("print WORKDIR", () => {
    testPrint("WORKDIR $GOPATH");
  });
  test("print COPY", () => {
    testPrint("COPY docker-entrypoint.sh /usr/local/bin/");
    testPrint("COPY source destination");
    testPrint("COPY source/* destination");
  });
  test("print ENTRYPOINT", () => {
    testPrint(`ENTRYPOINT ["docker-entrypoint.sh"]`);
  });
  test("print LABEL", () => {
    testPrint(`LABEL com.circleci.preserve-entrypoint=true`);
  });
  test("print MAINTAINER", () => {
    testPrint(`MAINTAINER tdurieux`);
  });
  test("print comment", () => {
    testPrint(`# comment`);
  });
});

describe("Testing docker-printer of shell", () => {
  test("Bash-OP", () => {
    testPrint(`RUN make -j $(( nproc > 2 ? nproc - 2 : 1 ))`);
    testPrint(`RUN $(( nproc - 2 ))`);
    testPrint(`RUN $(( nproc + 2 ))`);
    testPrint(`RUN $(( nproc & 2 ))`);
    testPrint(`RUN $(( nproc * 2 ))`);
    testPrint(`RUN $(( nproc / 2 ))`);
    testPrint(`RUN $(( nproc | 2 ))`);
  });
});
