import { Q } from "../lib/core/core-types";
import { abstract } from "../lib/shell/enricher";
import { parseShell } from "../lib/shell/shell-parser";

describe("Testing enrich", () => {
  test("http", () => {
    const root = parseShell("wget http://example.com");
    const r = abstract(root);
    const o = r.find(Q("ABS-URL-PROTOCOL-HTTP"));
    expect(r.find(Q("ABS-URL-PROTOCOL-HTTP"))).toHaveLength(1);
  });

  test("https", () => {
    const root = parseShell("wget https://example.com");
    const r = abstract(root);
    expect(r.find(Q("ABS-URL-PROTOCOL-HTTPS"))).toHaveLength(1);
  });
  test("ftp", () => {
    const root = parseShell("wget ftp://example.com");
    const r = abstract(root);
    expect(r.find(Q("ABS-URL-PROTOCOL-FTP"))).toHaveLength(1);
  });
  test("git", () => {
    const root = parseShell("git clone git://example.com");
    const r = abstract(root);
    expect(r.find(Q("ABS-URL-PROTOCOL-GIT"))).toHaveLength(1);
  });
});
