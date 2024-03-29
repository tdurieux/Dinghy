import { BashCommand } from "../lib/shell/shell-types";
import { parseDocker } from "../lib/docker/docker-parser";
import { Q } from "../lib/core/core-types";

describe("Testing Docker parser", () => {
  test("parse Dockerfile with empty line", () => {
    const root = parseDocker(`RUN echo "" \\

  # navigate to another folder outside shopware to avoid this error: npm ERR! Tracker "idealTree" already exists
  && cd /var/www && npm install -g grunt-cli \\
  && cd /var/www && npm install grunt --save-dev \\

  && npm install -g yarn \\
  && chown -R www-data:www-data /var/www/.composer \\
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/*`);
    expect(root.toString()).toBe(root.position.file?.content);
  });
  test("parse Dockerfile with multiple empty lines", () => {
    const root =
      parseDocker(`RUN echo "deb-src http://nginx.org/packages/mainline/ubuntu/ xenial nginx" | tee -a /etc/apt/sources.list \\


  && wget http://repo.ajenti.org/debian/key -O- | apt-key add -`);
    expect(root.toString()).toBe(root.position.file?.content);
  });
  test("parse gemrc configuration", () => {
    const root = parseDocker(
      `RUN mkdir -p /usr/local/etc \\
  && { \\
    echo 'install: --no-document'; \\
    echo 'update: --no-document'; \\
  } >> /usr/local/etc/gemrc`
    );
    expect(root.toString()).toBe(root.position.file?.content);
  });

  test("parse instruction tag", () => {
    const root = parseDocker(`COPY --from=test source destination`);
    expect(root.toString(false)).toBe(root.position.file?.content);
  });
  test("parse run json format", () => {
    const root = parseDocker(`RUN ["apt", "install", "wget"]`);
    expect(root.toString(false)).toBe(root.position.file?.content);
  });

  test("parse dockerfile with space after backslash", () => {
    const root = parseDocker(`RUN apt-get install -y apt-transport-https \\	
  && apt-get update`);
    expect(root.toString(false)).toBe(`RUN apt-get install -y apt-transport-https \\
  && apt-get update`);
  });
});

describe("Testing for loop", () => {
  test("for loop single element", () => {
    const root = parseDocker(`RUN for key in \\
  6A010C5166006599AA17F08146C2130DFD2497F5; \\
  do \\
    gpg --keyserver pgp.mit.edu --recv-keys "$key"; \\
  done`);
    expect(root.toString(false)).toBe(root.position.file?.content);
  });
  test("for loop two elements", () => {
    const root = parseDocker(`RUN for file in \\
  file1 file2; \\
  do \\
    gpg --keyserver pgp.mit.edu --recv-keys "$key"; \\
  done`);
    expect(root.toString(false)).toBe(root.position.file?.content);
  });
  test("for loop range", () => {
    const root = parseDocker(`RUN for i in \\
  {1..5}; \\
  do \\
    gpg --keyserver pgp.mit.edu --recv-keys "$key"; \\
  done`);
    expect(root.toString(false)).toBe(root.position.file?.content);
  });
  test("RUN [...]", () => {
    const root = parseDocker(`FROM python:2.7.13
ADD snippet.py snippet.py
RUN ["pip", "install", "sqlalchemy"]
CMD ["python", "snippet.py"]`);
    expect(root.toString(false)).toBe(root.position.file?.content);
    expect(root.find(Q(BashCommand))).toHaveLength(2);
  });
});
