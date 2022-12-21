import { parseDocker } from "../lib/parser/docker-parser";

async function testPrint(original: string) {
  const root = await parseDocker(original);
  expect(root.toString(true)).toBe(original);
}

describe("Testing docker-printer", () => {
  test("print RUN", async () => {
    await testPrint("RUN wget localhost");
    await testPrint("RUN wget localhost;");
    await testPrint("RUN echo 'toto';");

    await testPrint(`RUN set -eux; \\

  savedAptMark = "\${apt-mark showmanual}"; \\
  apt-get update;`);
    await testPrint(`RUN case "\${dpkgArch}" in \\
  armel) \\
    extraConfigureArgs = "\${extraConfigureArgs} --with-arch=armv4t --with-float=soft" \\
    ;; \\
  armhf) \\
    extraConfigureArgs = "\${extraConfigureArgs} --with-arch=armv7-a --with-float=hard --with-fpu=vfpv3-d16 --with-mode=thumb" \\
    ;; \\
esac;`);
  });

  test("print FROM", async () => {
    await testPrint("FROM adoptopenjdk:8-jdk-openj9");
    await testPrint("FROM ubuntu:10");
    await testPrint("FROM microsoft/windowsservercore:ltsc2016");
    await testPrint("FROM ubuntu@10");
    await testPrint("FROM ubuntu@10 as stage");
  });

  test("print USER", async () => {
    await testPrint("USER root");
  });
  test("print ENV", async () => {
    await testPrint("ENV GPG_KEYS 05AB33110949707C93A279E3D3EFE6B686867BA6");
  });
  test("print EXPOSE", async () => {
    await testPrint("EXPOSE 8080");
  });
  test("print SHELL", async () => {
    await testPrint("SHELL ['ls', '-l']");
  });
  test("print CMD", async () => {
    await testPrint('CMD ["catalina.sh", "run"]');
  });
  test("print VOLUME", async () => {
    await testPrint("VOLUME C:\\data\\db C:\\data\\configdb");
  });
  test("print WORKDIR", async () => {
    await testPrint("WORKDIR $GOPATH");
  });
  test("print COPY", async () => {
    await testPrint("COPY docker-entrypoint.sh /usr/local/bin/");
  });
  test("print ENTRYPOINT", async () => {
    await testPrint(`ENTRYPOINT ["docker-entrypoint.sh"]`);
  });
  test("print LABEL", async () => {
    await testPrint(`LABEL com.circleci.preserve-entrypoint=true`);
  });
  test("print MAINTAINER", async () => {
    await testPrint(`MAINTAINER tdurieux`);
  });
  test("print comment", async () => {
    await testPrint(`# comment`);
  });
});

describe("Testing docker-printer of shell", () => {
  test("Bash-OP", async () => {
    await testPrint(`RUN make -j $(( nproc > 2 ? nproc - 2 : 1 ))`);
    await testPrint(`RUN $(( nproc - 2 ))`);
    await testPrint(`RUN $(( nproc + 2 ))`);
    await testPrint(`RUN $(( nproc & 2 ))`);
    await testPrint(`RUN $(( nproc * 2 ))`);
    await testPrint(`RUN $(( nproc / 2 ))`);
    await testPrint(`RUN $(( nproc | 2 ))`);
  });
});
