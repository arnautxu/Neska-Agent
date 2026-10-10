import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { validateGeneratedXlsxXml } from "./generated-xlsx-validation";
const template = { "xl/styles.xml": '<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" mc:Ignorable="x14ac"><fonts count="1"><font><sz val="11"/></font></fonts></styleSheet>' };
const archive = async (parts: Record<string, string>) => {
  const zip = new JSZip(); for (const [name, text] of Object.entries(parts)) zip.file(name, text);
  return zip.generateAsync({ type: "nodebuffer" });
};
describe("Office XML compatibility gate", () => {
  it("accepts declared compatibility namespaces and rejects undeclared ones", async () => {
    await expect(validateGeneratedXlsxXml(await archive(template))).resolves.toBeUndefined();
    const old = { ...template, "xl/styles.xml": template["xl/styles.xml"].replace(/ xmlns:x14ac="[^"]+"/u, "") };
    await expect(validateGeneratedXlsxXml(await archive(old))).rejects.toThrow("undeclared compatibility prefix");
    await expect(validateGeneratedXlsxXml(await archive({ "xl/styles.xml": "<styles>" }))).rejects.toThrow("invalid XML");
  });
});
