import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "DOCUMENTATION.md");
const buildRoot = path.join(root, "outputs", "docx-build");
const docRoot = path.join(buildRoot, "word");

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraph(text, options = {}) {
  const style = options.style ? `<w:pStyle w:val="${options.style}"/>` : "";
  const spacing = options.spacing
    ? `<w:spacing w:before="${options.spacing.before ?? 0}" w:after="${options.spacing.after ?? 0}" w:line="${options.spacing.line ?? 300}" w:lineRule="auto"/>`
    : "";
  const keepNext = options.keepNext ? "<w:keepNext/>" : "";
  const numbering = options.numbering
    ? `<w:numPr><w:ilvl w:val="${options.numbering.level}"/><w:numId w:val="${options.numbering.id}"/></w:numPr>`
    : "";
  const justification = options.center ? '<w:jc w:val="center"/>' : "";
  const pageBreak = options.pageBreakBefore ? "<w:pageBreakBefore/>" : "";
  const bold = options.bold ? "<w:b/>" : "";
  const italic = options.italic ? "<w:i/>" : "";
  const color = options.color ? `<w:color w:val="${options.color}"/>` : "";
  const size = options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : "";
  const caps = options.caps ? "<w:caps/>" : "";

  return `
    <w:p>
      <w:pPr>${style}${spacing}${keepNext}${numbering}${justification}${pageBreak}</w:pPr>
      <w:r>
        <w:rPr>${bold}${italic}${color}${size}${caps}</w:rPr>
        <w:t xml:space="preserve">${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>
  `;
}

function blankParagraph(height = 120) {
  return `<w:p><w:pPr><w:spacing w:after="${height}"/></w:pPr></w:p>`;
}

function bannerTable(lines, options = {}) {
  const bg = options.bg ?? "1F3C88";
  const accent = options.accent ?? "9FC3FF";
  const textColor = options.textColor ?? "FFFFFF";
  const width = options.width ?? 9000;
  const inner = lines
    .map((line, index) =>
      paragraph(line.text, {
        center: options.center ?? false,
        bold: line.bold ?? false,
        italic: line.italic ?? false,
        color: line.color ?? textColor,
        size: line.size,
        caps: line.caps ?? false,
        spacing: {
          before: index === 0 ? 0 : 20,
          after: line.after ?? 20,
          line: line.line ?? 280
        }
      })
    )
    .join("");

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="${width}" w:type="dxa"/>
        <w:jc w:val="${options.center ? "center" : "left"}"/>
        <w:tblBorders>
          <w:top w:val="nil"/>
          <w:left w:val="nil"/>
          <w:bottom w:val="nil"/>
          <w:right w:val="nil"/>
          <w:insideH w:val="nil"/>
          <w:insideV w:val="nil"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${width}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>
            <w:tcMar>
              <w:top w:w="220" w:type="dxa"/>
              <w:left w:w="260" w:type="dxa"/>
              <w:bottom w:w="180" w:type="dxa"/>
              <w:right w:w="260" w:type="dxa"/>
            </w:tcMar>
            <w:tcBorders>
              <w:top w:val="single" w:sz="8" w:color="${accent}"/>
              <w:left w:val="single" w:sz="8" w:color="${accent}"/>
              <w:bottom w:val="single" w:sz="8" w:color="${accent}"/>
              <w:right w:val="single" w:sz="8" w:color="${accent}"/>
            </w:tcBorders>
          </w:tcPr>
          ${inner}
        </w:tc>
      </w:tr>
    </w:tbl>
  `;
}

function sectionHeading(title) {
  return `
    ${blankParagraph(60)}
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9500" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="nil"/>
          <w:left w:val="nil"/>
          <w:bottom w:val="nil"/>
          <w:right w:val="nil"/>
          <w:insideH w:val="nil"/>
          <w:insideV w:val="nil"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="9500" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="EEF4FF"/>
            <w:tcMar>
              <w:top w:w="100" w:type="dxa"/>
              <w:left w:w="180" w:type="dxa"/>
              <w:bottom w:w="100" w:type="dxa"/>
              <w:right w:w="180" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          ${paragraph(title, {
            style: "HeadingBand",
            bold: true,
            color: "1F3C88",
            size: "28",
            spacing: { before: 0, after: 0, line: 280 }
          })}
        </w:tc>
      </w:tr>
    </w:tbl>
    ${blankParagraph(40)}
  `;
}

function parseMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const content = [];
  let titleSkipped = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      content.push(blankParagraph(70));
      continue;
    }

    if (trimmed.startsWith("# ")) {
      if (!titleSkipped) {
        titleSkipped = true;
      } else {
        content.push(sectionHeading(trimmed.slice(2)));
      }
      continue;
    }

    if (trimmed.startsWith("## ")) {
      content.push(sectionHeading(trimmed.slice(3)));
      continue;
    }

    if (trimmed.startsWith("### ")) {
      content.push(
        paragraph(trimmed.slice(4), {
          style: "Heading2",
          keepNext: true,
          spacing: { before: 110, after: 30, line: 280 }
        })
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      content.push(
        paragraph(trimmed.replace(/^\d+\.\s+/, ""), {
          style: "BodyText",
          numbering: { id: 2, level: 0 }
        })
      );
      continue;
    }

    if (trimmed.startsWith("- ")) {
      content.push(
        paragraph(trimmed.slice(2), {
          style: "BodyText",
          numbering: { id: 1, level: 0 }
        })
      );
      continue;
    }

    content.push(paragraph(trimmed, { style: "BodyText" }));
  }

  return content.join("");
}

const markdown = fs.readFileSync(sourcePath, "utf8");
const today = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Riyadh"
}).format(new Date());

fs.rmSync(buildRoot, { recursive: true, force: true });
ensureDir(path.join(buildRoot, "_rels"));
ensureDir(path.join(buildRoot, "docProps"));
ensureDir(docRoot);
ensureDir(path.join(docRoot, "_rels"));

const documentBody = `
  ${bannerTable(
    [
      { text: "OBEIKAN KNOWLEDGE ACADEMY", color: "CFE0FF", size: "18", caps: true, bold: true, after: 50 },
      { text: "Reservation Platform Documentation", size: "36", bold: true, after: 40 },
      { text: "Operations guide for reservations, approvals, hospitality, reporting, and rollout", size: "22", color: "E3ECFF", after: 20 }
    ],
    { bg: "162A63", accent: "6B92F7" }
  )}
  ${blankParagraph(160)}
  ${bannerTable(
    [
      { text: "Document overview", color: "1F3C88", size: "18", caps: true, bold: true, after: 30 },
      { text: `Prepared from the current live project state | ${today}`, color: "1A1F36", size: "22", bold: true, after: 20 },
      { text: "Audience: Operations, administration, management, and internal rollout stakeholders", color: "5B6B88", size: "20", after: 0 }
    ],
    { bg: "F7FAFF", accent: "D4E2FF" }
  )}
  ${blankParagraph(180)}
  ${paragraph("This document summarizes the current production-oriented application and its operating model.", {
    style: "Intro",
    center: true,
    color: "5B6B88",
    italic: true,
    size: "20"
  })}
  <w:p><w:r><w:br w:type="page"/></w:r></w:p>
  ${parseMarkdown(markdown)}
  <w:sectPr>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="708" w:footer="708" w:gutter="0"/>
  </w:sectPr>
`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
 xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
 xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
 xmlns:w10="urn:schemas-microsoft-com:office:word"
 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
 xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
 xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
 xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
 xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
 mc:Ignorable="w14 wp14">
  <w:body>
    ${documentBody}
  </w:body>
</w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Aptos" w:cs="Aptos"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="1A1F36"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="100" w:line="300" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="BodyText">
    <w:name w:val="Body Text"/>
    <w:basedOn w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="HeadingBand">
    <w:name w:val="Heading Band"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="100" w:after="20"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="2D4A7C"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Intro">
    <w:name w:val="Intro"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:i/><w:color w:val="5B6B88"/></w:rPr>
  </w:style>
</w:styles>`;

const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:multiLevelType w:val="singleLevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="&#8226;"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="340"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="singleLevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="340"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>OpenAI Codex</Application>
</Properties>`;

const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Obeikan Knowledge Academy Reservation Platform Documentation</dc:title>
  <dc:subject>Operations Documentation</dc:subject>
  <dc:creator>OpenAI Codex</dc:creator>
  <cp:lastModifiedBy>OpenAI Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`;

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

fs.writeFileSync(path.join(buildRoot, "[Content_Types].xml"), contentTypesXml, "utf8");
fs.writeFileSync(path.join(buildRoot, "_rels", ".rels"), rootRelsXml, "utf8");
fs.writeFileSync(path.join(buildRoot, "docProps", "app.xml"), appXml, "utf8");
fs.writeFileSync(path.join(buildRoot, "docProps", "core.xml"), coreXml, "utf8");
fs.writeFileSync(path.join(docRoot, "document.xml"), documentXml, "utf8");
fs.writeFileSync(path.join(docRoot, "styles.xml"), stylesXml, "utf8");
fs.writeFileSync(path.join(docRoot, "numbering.xml"), numberingXml, "utf8");
fs.writeFileSync(path.join(docRoot, "_rels", "document.xml.rels"), documentRelsXml, "utf8");

console.log("DOCX build files created at:", buildRoot);
