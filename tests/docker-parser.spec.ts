import { parseDocker } from "../lib/parser/docker-parser";

describe("Testing Docker parser", () => {
  test("parse Dockerfile with empty line", async () => {
    const root = await parseDocker(`RUN echo "" \\

  # navigate to another folder outside shopware to avoid this error: npm ERR! Tracker "idealTree" already exists
  && cd /var/www && npm install -g grunt-cli \\
  && cd /var/www && npm install grunt --save-dev \\

  && npm install -g yarn \\
  && chown -R www-data:www-data /var/www/.composer \\
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/*`);
    expect(root.toString()).toBe(root.position.file.content);
  });
  test("parse Dockerfile with multiple empty lines", async () => {
    const root = await parseDocker(`RUN echo "deb-src http://nginx.org/packages/mainline/ubuntu/ xenial nginx" | tee -a /etc/apt/sources.list \\


  && wget http://repo.ajenti.org/debian/key -O- | apt-key add -`);
    expect(root.toString()).toBe(root.position.file.content);
  });
  test("parse gemrc configuration", async () => {
    const root = await parseDocker(
      `RUN mkdir -p /usr/local/etc \\
  && { \\
    echo 'install: --no-document'; \\
    echo 'update: --no-document'; \\
  } >> /usr/local/etc/gemrc`
    );
    expect(root.toString()).toBe(root.position.file.content);
  });

  test("parse instruction tag", async () => {
    const root = await parseDocker(`COPY --from=test source destination`);
    expect(root.toString()).toBe(root.position.file.content);
  });
  test("parse run json format", async () => {
    const root = await parseDocker(`RUN ["apt", "install", "wget"]`);
    console.log(root.toString());
    expect(root.toString()).toBe(root.position.file.content);
  });

  test("parse dockerfile with space after backslash", async () => {
    const root = await parseDocker(`RUN	apt-get install -y apt-transport-https \\	
&& apt-get update`);
    expect(root.toString()).toBe(`RUN apt-get install -y apt-transport-https \\
  && apt-get update`);
  });
});

describe("Testing for loop", () => {
  test("for loop single element", async () => {
    const root = await parseDocker(`RUN for key in \\
  6A010C5166006599AA17F08146C2130DFD2497F5; \\
  do \\
    gpg --keyserver pgp.mit.edu --recv-keys "$key"; \\
  done`);
    expect(root.toString(false)).toBe(root.position.file.content);
  });
  test("for loop two elements", async () => {
    const root = await parseDocker(`RUN for file in \\
  file1 file2; \\
  do \\
    gpg --keyserver pgp.mit.edu --recv-keys "$key"; \\
  done`);
    expect(root.toString(false)).toBe(root.position.file.content);
  });
  test("for loop range", async () => {
    const root = await parseDocker(`RUN for i in \\
  {1..5}; \\
  do \\
    gpg --keyserver pgp.mit.edu --recv-keys "$key"; \\
  done`);
    expect(root.toString(false)).toBe(root.position.file.content);
  });
});
