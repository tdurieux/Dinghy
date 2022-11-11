import { parseShell } from "../lib/ast/docker-bash-parser";
import { Matcher } from "../lib/debloat/rule-matcher";

describe("Testing shell parser", () => {
  test("dollar", async () => {
    const root = await parseShell("${apt-mark showmanual}");
    expect(root.toString()).toBe("${apt-mark showmanual} ");
  })
  test("test2", async () => {
    const root = await parseShell(`FROM alpine:latest  

MAINTAINER Alexander Olofsson <alexander.olofsson@liu.se>  
  
RUN apk update \  
&& apk add \  
ruby ruby-dev ruby-json \  
&& rm -f /var/cache/apk/* \  
&& gem install -N \  
puppet puppet-lint  
  
VOLUME /code  
  
ENTRYPOINT [ "puppet-lint" ]  
CMD [ "/code", "--no-autoloader_layout-check" ]`);
    expect(root.toString()).toBe("");
  });
});
