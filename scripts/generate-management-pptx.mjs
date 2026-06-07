import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const buildRoot = path.join(root, "outputs", "pptx-build");
const pptRoot = path.join(buildRoot, "ppt");

const COLORS = {
  navy: "162A63",
  blue: "2557E5",
  light: "EEF4FF",
  text: "182033",
  muted: "5E6B85",
  white: "FFFFFF",
  green: "1FA971",
  orange: "F59E0B",
  red: "DC2626"
};

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

function emu(n) {
  return Math.round(n);
}

let shapeId = 10;
function nextId() {
  shapeId += 1;
  return shapeId;
}

function textShape({
  x,
  y,
  cx,
  cy,
  text,
  fontSize = 20,
  color = COLORS.text,
  bold = false,
  align = "l",
  fill = null
}) {
  const id = nextId();
  const fillXml = fill
    ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>`
    : "<a:noFill/>";
  const bodyParas = Array.isArray(text) ? text : [text];
  const paragraphs = bodyParas
    .map((line, index) => {
      const content = typeof line === "string" ? { text: line } : line;
      const bullet = content.bullet ? '<a:buChar char="•"/>' : '<a:buNone/>';
      return `
        <a:p>
          <a:pPr algn="${content.align ?? align}" marL="${content.bullet ? 228600 : 0}" indent="${content.bullet ? -228600 : 0}">${bullet}</a:pPr>
          <a:r>
            <a:rPr lang="en-US" sz="${(content.fontSize ?? fontSize) * 100}" b="${content.bold ?? bold ? 1 : 0}">
              <a:solidFill><a:srgbClr val="${content.color ?? color}"/></a:solidFill>
              <a:latin typeface="Aptos"/>
            </a:rPr>
            <a:t>${xmlEscape(content.text)}</a:t>
          </a:r>
          ${index === bodyParas.length - 1 ? '<a:endParaRPr lang="en-US" sz="1800"/>' : ""}
        </a:p>
      `;
    })
    .join("");
  return `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${id}" name="TextBox ${id}"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        ${fillXml}
        <a:ln><a:noFill/></a:ln>
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square" rtlCol="0" anchor="t"/>
        <a:lstStyle/>
        ${paragraphs}
      </p:txBody>
    </p:sp>
  `;
}

function rectShape({ x, y, cx, cy, fill, line = null, radius = false }) {
  const id = nextId();
  const lineXml = line
    ? `<a:ln w="9525"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln>`
    : "<a:ln><a:noFill/></a:ln>";
  return `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${id}" name="Rectangle ${id}"/>
        <p:cNvSpPr/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
        <a:prstGeom prst="${radius ? "roundRect" : "rect"}"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>
        ${lineXml}
      </p:spPr>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
    </p:sp>
  `;
}

function slideXml(shapes) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      ${shapes.join("")}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function buildSlides() {
  const slides = [];

  slides.push(
    slideXml([
      rectShape({ x: emu(0), y: emu(0), cx: emu(12192000), cy: emu(6858000), fill: COLORS.white }),
      rectShape({ x: emu(0), y: emu(0), cx: emu(12192000), cy: emu(1200000), fill: COLORS.navy }),
      rectShape({ x: emu(0), y: emu(5900000), cx: emu(12192000), cy: emu(958000), fill: COLORS.light }),
      textShape({ x: emu(700000), y: emu(320000), cx: emu(10800000), cy: emu(400000), text: "OBEIKAN KNOWLEDGE ACADEMY", color: "BFD4FF", fontSize: 16, bold: true }),
      textShape({ x: emu(700000), y: emu(1450000), cx: emu(9800000), cy: emu(1000000), text: "Reservation Platform", color: COLORS.navy, fontSize: 28, bold: true }),
      textShape({ x: emu(700000), y: emu(2500000), cx: emu(9400000), cy: emu(900000), text: "Executive overview for room operations, approvals, hospitality, and reporting", color: COLORS.muted, fontSize: 18 }),
      rectShape({ x: emu(700000), y: emu(3450000), cx: emu(4300000), cy: emu(850000), fill: COLORS.blue, radius: true }),
      textShape({ x: emu(980000), y: emu(3650000), cx: emu(3700000), cy: emu(400000), text: "Live internal platform", color: COLORS.white, fontSize: 20, bold: true }),
      textShape({ x: emu(700000), y: emu(6120000), cx: emu(10400000), cy: emu(240000), text: "Prepared for management review | 29 April 2026", color: COLORS.muted, fontSize: 14 })
    ])
  );

  slides.push(
    slideXml([
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 6858000, fill: COLORS.white }),
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 700000, fill: COLORS.navy }),
      textShape({ x: 600000, y: 900000, cx: 5000000, cy: 500000, text: "Business challenge", color: COLORS.navy, fontSize: 24, bold: true }),
      textShape({
        x: 700000, y: 1600000, cx: 5000000, cy: 3600000, fontSize: 18, color: COLORS.text,
        text: [
          { text: "Email-based requests create delays and fragmented tracking", bullet: true },
          { text: "Excel planner requires manual maintenance and duplicate updates", bullet: true },
          { text: "No controlled approval trail for staff requests", bullet: true },
          { text: "Room conflicts, food service needs, and attachments are hard to monitor centrally", bullet: true },
          { text: "Leadership visibility into demand, utilization, and occupied hours is limited", bullet: true }
        ]
      }),
      rectShape({ x: 7000000, y: 1400000, cx: 4200000, cy: 3600000, fill: COLORS.light, radius: true, line: "D8E4FF" }),
      textShape({ x: 7350000, y: 1750000, cx: 3400000, cy: 400000, text: "Target outcome", color: COLORS.blue, fontSize: 18, bold: true }),
      textShape({
        x: 7350000, y: 2250000, cx: 3200000, cy: 2600000, fontSize: 18, color: COLORS.text,
        text: [
          { text: "One live source of truth for all room operations", bullet: true },
          { text: "Faster approvals and clearer accountability", bullet: true },
          { text: "Better visitor and hospitality experience", bullet: true },
          { text: "Decision-ready reporting for management", bullet: true }
        ]
      })
    ])
  );

  slides.push(
    slideXml([
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 6858000, fill: COLORS.white }),
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 700000, fill: COLORS.navy }),
      textShape({ x: 600000, y: 900000, cx: 6000000, cy: 500000, text: "Platform scope", color: COLORS.navy, fontSize: 24, bold: true }),
      ...[
        ["Planner and booking control", "Monthly, weekly, daily, and list schedule views with conflict-safe booking management"],
        ["Approvals and governance", "Manager and admin approval routing with audit trail and restricted access"],
        ["Rooms and users", "Admin-side room master data, inactive room handling, and user administration"],
        ["Hospitality and agenda", "Reception agenda display, guest QR ordering, and tea boy service dashboard"],
        ["Analytics and reporting", "Utilization, occupied hours, room demand, booking patterns, and hospitality insights"],
        ["Notifications", "SMTP-based requester and admin reminder notifications"]
      ].map((item, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = 700000 + col * 5350000;
        const y = 1500000 + row * 1450000;
        return [
          rectShape({ x, y, cx: 4700000, cy: 1120000, fill: COLORS.light, radius: true, line: "D7E3FF" }),
          textShape({ x: x + 220000, y: y + 180000, cx: 4100000, cy: 260000, text: item[0], color: COLORS.blue, fontSize: 18, bold: true }),
          textShape({ x: x + 220000, y: y + 480000, cx: 4050000, cy: 420000, text: item[1], color: COLORS.text, fontSize: 14 })
        ].join("");
      })
    ])
  );

  slides.push(
    slideXml([
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 6858000, fill: COLORS.white }),
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 700000, fill: COLORS.navy }),
      textShape({ x: 600000, y: 900000, cx: 5200000, cy: 500000, text: "Approval and booking workflow", color: COLORS.navy, fontSize: 24, bold: true }),
      ...[
        ["1", "Staff / manager submits request", COLORS.blue, COLORS.white],
        ["2", "Manager reviews when assigned", COLORS.orange, COLORS.white],
        ["3", "Admin confirms and books room", COLORS.green, COLORS.white],
        ["4", "Planner, dashboard, and reports update live", COLORS.red, COLORS.white]
      ].map((step, index) => {
        const x = 900000 + index * 2700000;
        return [
          rectShape({ x, y: 2200000, cx: 2300000, cy: 2100000, fill: COLORS.light, radius: true, line: "D8E4FF" }),
          rectShape({ x: x + 180000, y: 2400000, cx: 420000, cy: 420000, fill: step[2], radius: true }),
          textShape({ x: x + 290000, y: 2480000, cx: 180000, cy: 140000, text: step[0], color: step[3], fontSize: 16, bold: true, align: "ctr" }),
          textShape({ x: x + 180000, y: 3000000, cx: 1800000, cy: 700000, text: step[1], color: COLORS.text, fontSize: 16, bold: true })
        ].join("");
      }),
      textShape({ x: 900000, y: 5000000, cx: 10300000, cy: 600000, text: "Admin-created bookings can bypass approval delay and be confirmed directly for operational speed.", color: COLORS.muted, fontSize: 16 })
    ])
  );

  slides.push(
    slideXml([
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 6858000, fill: COLORS.white }),
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 700000, fill: COLORS.navy }),
      textShape({ x: 600000, y: 900000, cx: 5600000, cy: 500000, text: "Visitor and hospitality experience", color: COLORS.navy, fontSize: 24, bold: true }),
      rectShape({ x: 750000, y: 1500000, cx: 4700000, cy: 4200000, fill: COLORS.light, radius: true, line: "D8E4FF" }),
      textShape({
        x: 980000, y: 1800000, cx: 3900000, cy: 3000000, fontSize: 17, color: COLORS.text,
        text: [
          { text: "Reception screen can show today's agenda for visitors", bullet: true },
          { text: "Fixed QR per room allows guests to order drinks from mobile", bullet: true },
          { text: "Guests can track drink status and send reminder after waiting threshold", bullet: true },
          { text: "Tea boy sees active meetings, live request timers, and reminder flags", bullet: true },
          { text: "Admin can monitor hospitality demand centrally", bullet: true }
        ]
      }),
      rectShape({ x: 6450000, y: 1500000, cx: 4700000, cy: 4200000, fill: "FFF8E8", radius: true, line: "F3D48C" }),
      textShape({ x: 6760000, y: 1800000, cx: 3500000, cy: 260000, text: "Business value", color: COLORS.orange, fontSize: 18, bold: true }),
      textShape({
        x: 6760000, y: 2250000, cx: 3600000, cy: 2500000, fontSize: 17, color: COLORS.text,
        text: [
          { text: "Improves visitor experience and professionalism", bullet: true },
          { text: "Reduces reliance on memory for service follow-up", bullet: true },
          { text: "Creates measurable service timing data", bullet: true },
          { text: "Links room readiness with hospitality preparation", bullet: true }
        ]
      })
    ])
  );

  slides.push(
    slideXml([
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 6858000, fill: COLORS.white }),
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 700000, fill: COLORS.navy }),
      textShape({ x: 600000, y: 900000, cx: 5200000, cy: 500000, text: "Management visibility", color: COLORS.navy, fontSize: 24, bold: true }),
      ...[
        ["Current and upcoming meetings", "Supports daily follow-up and operational readiness"],
        ["Occupied hours and utilization", "Shows which rooms carry the highest real usage load"],
        ["Booking patterns and demand", "Highlights busiest rooms, weekdays, and reservation types"],
        ["Hospitality indicators", "Surfaces food service demand and beverage order patterns"]
      ].map((card, index) => {
        const x = index < 2 ? 800000 : 6350000;
        const y = 1700000 + (index % 2) * 1700000;
        return [
          rectShape({ x, y, cx: 4700000, cy: 1300000, fill: COLORS.light, radius: true, line: "D8E4FF" }),
          textShape({ x: x + 220000, y: y + 180000, cx: 3600000, cy: 250000, text: card[0], color: COLORS.blue, fontSize: 18, bold: true }),
          textShape({ x: x + 220000, y: y + 520000, cx: 3900000, cy: 340000, text: card[1], color: COLORS.text, fontSize: 15 })
        ].join("");
      })
    ])
  );

  slides.push(
    slideXml([
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 6858000, fill: COLORS.white }),
      rectShape({ x: 0, y: 0, cx: 12192000, cy: 700000, fill: COLORS.navy }),
      textShape({ x: 600000, y: 900000, cx: 6000000, cy: 500000, text: "Rollout and control points", color: COLORS.navy, fontSize: 24, bold: true }),
      textShape({
        x: 800000, y: 1650000, cx: 10800000, cy: 2500000, fontSize: 18, color: COLORS.text,
        text: [
          { text: "Keep PostgreSQL and SMTP configured for live use", bullet: true },
          { text: "Retain admin-side control for rooms, users, settings, and final booking authority", bullet: true },
          { text: "Use manager approval only for staff requests where governance is needed", bullet: true },
          { text: "Continue importing historical reservations for reporting continuity", bullet: true },
          { text: "Use dashboard and agenda as daily operational screens", bullet: true }
        ]
      }),
      rectShape({ x: 800000, y: 4700000, cx: 10800000, cy: 1200000, fill: COLORS.navy, radius: true }),
      textShape({ x: 1100000, y: 4950000, cx: 9600000, cy: 500000, text: "Outcome: a controlled, scalable internal platform that improves scheduling, approvals, visibility, and visitor experience.", color: COLORS.white, fontSize: 20, bold: true })
    ])
  );

  return slides;
}

function writeFile(target, content) {
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, content, "utf8");
}

const slides = buildSlides();

fs.rmSync(buildRoot, { recursive: true, force: true });
ensureDir(path.join(buildRoot, "_rels"));
ensureDir(path.join(buildRoot, "docProps"));
ensureDir(path.join(pptRoot, "_rels"));
ensureDir(path.join(pptRoot, "slides"));
ensureDir(path.join(pptRoot, "slides", "_rels"));
ensureDir(path.join(pptRoot, "slideMasters", "_rels"));
ensureDir(path.join(pptRoot, "slideLayouts", "_rels"));
ensureDir(path.join(pptRoot, "theme"));

const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1" autoCompressPictures="0">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${slides.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("")}
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

const presentationRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slides.map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("\n  ")}
</Relationships>`;

const slideMasterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="Master">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles/>
</p:sldMaster>`;

const slideMasterRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const slideLayoutXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

const slideLayoutRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const themeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="OKA Theme">
  <a:themeElements>
    <a:clrScheme name="OKA Colors">
      <a:dk1><a:srgbClr val="000000"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="${COLORS.navy}"/></a:dk2>
      <a:lt2><a:srgbClr val="${COLORS.light}"/></a:lt2>
      <a:accent1><a:srgbClr val="${COLORS.blue}"/></a:accent1>
      <a:accent2><a:srgbClr val="${COLORS.green}"/></a:accent2>
      <a:accent3><a:srgbClr val="${COLORS.orange}"/></a:accent3>
      <a:accent4><a:srgbClr val="${COLORS.red}"/></a:accent4>
      <a:accent5><a:srgbClr val="8A63D2"/></a:accent5>
      <a:accent6><a:srgbClr val="5E6B85"/></a:accent6>
      <a:hlink><a:srgbClr val="${COLORS.blue}"/></a:hlink>
      <a:folHlink><a:srgbClr val="7A3CE7"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont>
      <a:minorFont><a:latin typeface="Aptos"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>`;

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${slides.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("\n  ")}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>OKA Reservation Platform Executive Overview</dc:title>
  <dc:subject>Management Presentation</dc:subject>
  <dc:creator>OpenAI Codex</dc:creator>
  <cp:lastModifiedBy>OpenAI Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`;

const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office PowerPoint</Application>
  <PresentationFormat>Widescreen</PresentationFormat>
  <Slides>${slides.length}</Slides>
  <Notes>0</Notes>
  <HiddenSlides>0</HiddenSlides>
  <MMClips>0</MMClips>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Theme</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>1</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="1" baseType="lpstr">
      <vt:lpstr>Office Theme</vt:lpstr>
    </vt:vector>
  </TitlesOfParts>
</Properties>`;

writeFile(path.join(buildRoot, "[Content_Types].xml"), contentTypesXml);
writeFile(path.join(buildRoot, "_rels", ".rels"), rootRelsXml);
writeFile(path.join(buildRoot, "docProps", "core.xml"), coreXml);
writeFile(path.join(buildRoot, "docProps", "app.xml"), appXml);
writeFile(path.join(pptRoot, "presentation.xml"), presentationXml);
writeFile(path.join(pptRoot, "_rels", "presentation.xml.rels"), presentationRelsXml);
writeFile(path.join(pptRoot, "slideMasters", "slideMaster1.xml"), slideMasterXml);
writeFile(path.join(pptRoot, "slideMasters", "_rels", "slideMaster1.xml.rels"), slideMasterRelsXml);
writeFile(path.join(pptRoot, "slideLayouts", "slideLayout1.xml"), slideLayoutXml);
writeFile(path.join(pptRoot, "slideLayouts", "_rels", "slideLayout1.xml.rels"), slideLayoutRelsXml);
writeFile(path.join(pptRoot, "theme", "theme1.xml"), themeXml);
slides.forEach((slide, index) => {
  writeFile(path.join(pptRoot, "slides", `slide${index + 1}.xml`), slide);
  writeFile(
    path.join(pptRoot, "slides", "_rels", `slide${index + 1}.xml.rels`),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`
  );
});

console.log("PPTX build files created at:", buildRoot);
