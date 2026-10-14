"use strict";
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageBreak, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, LevelFormat,
  TableOfContents
} = require('docx');
const fs   = require('fs');
const path = require('path');

// ── Palette ──────────────────────────────────────────────────────────
const NAVY    = "1F3864";
const BLUE    = "2E75B6";
const ALT_ROW = "EEF3F9";
const HDR_BG  = "1F3864";
const CW      = 9360; // US Letter content width (DXA)

// ── Borders ──────────────────────────────────────────────────────────
const thin = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
const allB = { top: thin, bottom: thin, left: thin, right: thin };

// ── Text helpers ──────────────────────────────────────────────────────
const r  = (t, o={}) => new TextRun({ text: t, font:"Arial", size:22, ...o });
const rb = (t)       => r(t, { bold: true });
const rm = (t)       => new TextRun({ text: t, font:"Courier New", size:18, color:"264A7B" });
const pg = ()        => new Paragraph({ children:[new PageBreak()] });
const sp = (a=120)   => new Paragraph({ children:[], spacing:{ after:a } });

function para(ch, opts={}) {
  const c = typeof ch==="string" ? [r(ch)] : ch;
  return new Paragraph({ children:c, spacing:{ after:140 }, ...opts });
}
const h1 = t => new Paragraph({ heading:HeadingLevel.HEADING_1, children:[r(t,{bold:true})], spacing:{ before:480, after:240 } });
const h2 = t => new Paragraph({ heading:HeadingLevel.HEADING_2, children:[r(t,{bold:true})], spacing:{ before:320, after:160 } });
const h3 = t => new Paragraph({ heading:HeadingLevel.HEADING_3, children:[r(t,{bold:true})], spacing:{ before:200, after:100 } });

const bul = (ch, lvl=0) => new Paragraph({
  numbering:{ reference:"bullets", level:lvl },
  children: typeof ch==="string" ? [r(ch)] : ch,
  spacing:{ after:80 }
});
const stp = (n, ch) => new Paragraph({
  children:[ r(`${n}.  `,{bold:true}), ...(typeof ch==="string" ? [r(ch)] : ch) ],
  indent:{ left:360 }, spacing:{ after:80 }
});

const code = t => new Paragraph({
  children:[rm(t)],
  shading:{ fill:"F0F4FA", type:ShadingType.CLEAR },
  border:{ left:{ style:BorderStyle.SINGLE, size:12, color:BLUE, space:6 } },
  indent:{ left:480 }, spacing:{ before:40, after:40 }
});
const note = (t, fill="FFF3CD", accent="FFC000") => new Paragraph({
  children:[r(t, {italics:true})],
  shading:{ fill, type:ShadingType.CLEAR },
  border:{ left:{ style:BorderStyle.SINGLE, size:12, color:accent, space:6 } },
  indent:{ left:240 }, spacing:{ before:120, after:120 }
});

// ── Table builder ─────────────────────────────────────────────────────
function tbl(headers, rows, widths) {
  const hRow = new TableRow({ tableHeader:true, children: headers.map((h,i) =>
    new TableCell({
      children:[new Paragraph({ children:[r(h,{bold:true,color:"FFFFFF"})] })],
      shading:{ fill:HDR_BG, type:ShadingType.CLEAR }, borders:allB,
      margins:{ top:80, bottom:80, left:120, right:120 },
      width:{ size:widths[i], type:WidthType.DXA }, verticalAlign:VerticalAlign.CENTER
    })
  )});
  const dRows = rows.map((row,ri) => new TableRow({ children: row.map((cell,ci) => {
    const isCode = typeof cell==="string" && cell.startsWith("`") && cell.endsWith("`");
    const txt = isCode ? cell.slice(1,-1) : (cell||" ");
    const cr  = isCode
      ? new TextRun({text:txt, font:"Courier New", size:18, color:"264A7B"})
      : new TextRun({text:txt, font:"Arial", size:20});
    return new TableCell({
      children:[new Paragraph({children:[cr]})],
      shading:{ fill: ri%2===0?"FFFFFF":ALT_ROW, type:ShadingType.CLEAR }, borders:allB,
      margins:{ top:80, bottom:80, left:120, right:120 },
      width:{ size:widths[ci], type:WidthType.DXA }, verticalAlign:VerticalAlign.TOP
    });
  })}));
  return new Table({ width:{ size:CW, type:WidthType.DXA }, columnWidths:widths, rows:[hRow,...dRows] });
}

// ── Styles & Numbering ────────────────────────────────────────────────
const styles = {
  default:{ document:{ run:{ font:"Arial", size:22 } } },
  paragraphStyles:[
    { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
      run:{ size:32, bold:true, font:"Arial", color:NAVY },
      paragraph:{ spacing:{ before:480, after:240 }, outlineLevel:0,
        border:{ bottom:{ style:BorderStyle.SINGLE, size:8, color:NAVY, space:4 } } } },
    { id:"Heading2", name:"Heading 2", basedOn:"Normal", next:"Normal", quickFormat:true,
      run:{ size:26, bold:true, font:"Arial", color:BLUE },
      paragraph:{ spacing:{ before:320, after:160 }, outlineLevel:1 } },
    { id:"Heading3", name:"Heading 3", basedOn:"Normal", next:"Normal", quickFormat:true,
      run:{ size:22, bold:true, font:"Arial", color:NAVY },
      paragraph:{ spacing:{ before:200, after:100 }, outlineLevel:2 } }
  ]
};
const numbering = { config:[{ reference:"bullets", levels:[
  { level:0, format:LevelFormat.BULLET, text:"•", alignment:AlignmentType.LEFT,
    style:{ paragraph:{ indent:{ left:720, hanging:360 } }, run:{ font:"Arial" } } },
  { level:1, format:LevelFormat.BULLET, text:"◦", alignment:AlignmentType.LEFT,
    style:{ paragraph:{ indent:{ left:1080, hanging:360 } }, run:{ font:"Arial" } } }
]}]};

// ── Header / Footer ───────────────────────────────────────────────────
const docHeader = new Header({ children:[new Paragraph({
  children:[ r("OKA Room Reservation Platform",{bold:true,color:NAVY}), r("  |  IT Technical Reference",{color:"666666"}) ],
  border:{ bottom:{ style:BorderStyle.SINGLE, size:4, color:BLUE, space:4 } }, spacing:{after:0}
})]});
const docFooter = new Footer({ children:[new Paragraph({
  children:[
    r("Confidential — Obeikan Knowledge Academy IT Department    ",{color:"888888",size:18}),
    new TextRun({children:[PageNumber.CURRENT], font:"Arial", size:18, color:"888888"}),
    r(" of ",{color:"888888",size:18}),
    new TextRun({children:[PageNumber.TOTAL_PAGES], font:"Arial", size:18, color:"888888"})
  ],
  border:{ top:{ style:BorderStyle.SINGLE, size:4, color:"BFBFBF", space:4 } }, spacing:{before:0}
})]});

const PAGE = { size:{ width:12240, height:15840 }, margin:{ top:1440, right:1440, bottom:1440, left:1440 } };

// ═════════════════════════════════════════════════════════════════════
// COVER
// ═════════════════════════════════════════════════════════════════════
const cover = [
  sp(1440),
  new Paragraph({ children:[r("OBEIKAN KNOWLEDGE ACADEMY",{size:24,bold:true,color:"888888",allCaps:true})], alignment:AlignmentType.CENTER, spacing:{after:200} }),
  new Paragraph({ children:[r("Room Reservation Platform",{size:56,bold:true,color:NAVY})], alignment:AlignmentType.CENTER, spacing:{after:160} }),
  new Paragraph({ children:[r("IT Technical Reference Guide",{size:28,bold:true,color:BLUE})], alignment:AlignmentType.CENTER, spacing:{after:480} }),
  new Paragraph({ children:[], border:{ top:{ style:BorderStyle.SINGLE, size:6, color:NAVY } }, spacing:{after:480} }),
  sp(200),
  ...["Document Type|Technical Reference — Code & Operations","Version|1.1","Date|June 2026","Classification|Internal — IT Use Only"].flatMap(pair => {
    const [label,value] = pair.split("|");
    return [
      new Paragraph({ children:[r(label,{size:22,bold:true,color:NAVY})], alignment:AlignmentType.CENTER, spacing:{after:60} }),
      new Paragraph({ children:[r(value,{size:22,color:"333333"})], alignment:AlignmentType.CENTER, spacing:{after:140} })
    ];
  }),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S1 — DOCUMENT SCOPE
// ═════════════════════════════════════════════════════════════════════
const s1 = [
  h1("1. Document Scope"),
  para("This document is the technical reference for IT staff responsible for running and maintaining the OKA Room Reservation Platform. It covers the codebase structure, environment setup, how to bring the system up using Docker, database migration management, external system integrations, and ongoing operations."),
  sp(60),
  para("The application is containerised and ready to run. IT staff do not need to manage the Node.js process, a web server, or a reverse proxy directly — Docker Compose brings up the application together with cloudflared, which connects outbound to Cloudflare and publishes the site over HTTPS without any inbound port being opened. PostgreSQL runs on a separate database server and is reached over the network; it is not part of the Compose stack."),
  sp(60),
  note("IMPORTANT: The .env file contains credentials and secrets. It must never be committed to version control, stored in shared drives without encryption, or transmitted over unsecured channels."),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S2 — SYSTEM OVERVIEW
// ═════════════════════════════════════════════════════════════════════
const s2 = [
  h1("2. System Overview"),
  para("The OKA Room Reservation Platform is an internal web application that manages meeting room bookings, approval workflows, hospitality service requests, and usage analytics for Obeikan Knowledge Academy. It replaces a manual Excel-based process with a live, browser-accessible system."),
  sp(60),
  h2("2.1 Key Capabilities"),
  bul("Room reservation with real-time conflict detection across all active rooms"),
  bul("Multi-stage approval routing: Staff request → Manager review → Admin confirmation"),
  bul("Admin direct booking without approval delay"),
  bul("QR-code hospitality ordering for guest drink requests per room"),
  bul("Role-based dashboards with drill-down analytics and usage reporting"),
  bul("Automated upcoming meeting email reminders via a scheduled cron endpoint"),
  bul("Arabic and English language support with full RTL layout"),
  bul("Reception agenda screen for visitor-facing display"),
  bul("REST API architecture — ready for integration with external systems including HCMS"),
  sp(80),
  h2("2.2 User Roles"),
  sp(60),
  tbl(
    ["Role","Who Uses It","Primary Access"],
    [
      ["Admin","IT staff / Operations Manager","Full access: rooms, users, settings, all bookings, approvals, reports, hospitality"],
      ["Manager","Department Managers","View planner, submit bookings, approve/reject team requests"],
      ["Staff","General Employees","View room planner, submit booking requests, own booking history"],
      ["Service","Hospitality / Tea Boy Staff","View service dashboard, update drink order statuses"]
    ],
    [1600,2400,5360]
  ),
  sp(80),
  h2("2.3 Primary Application Routes"),
  sp(60),
  tbl(
    ["Route","Purpose","Access Level"],
    [
      ["/login","User authentication page","Public"],
      ["/register","New user self-registration","Public"],
      ["/dashboard","Main dashboard with KPIs and analytics","Authenticated"],
      ["/planner","Visual room scheduling calendar","Authenticated"],
      ["/bookings/new","Create or request a room booking","Authenticated"],
      ["/approvals","Pending approval queue","Admin / Manager"],
      ["/rooms","Room setup and management","Admin only"],
      ["/users","User account management","Admin only"],
      ["/reports","Analytics and usage reports","Admin only"],
      ["/hospitality","Hospitality menu management","Admin only"],
      ["/service","Live drink order dashboard for tea boy","Service role"],
      ["/agenda","Today's room schedule for reception display","Authenticated"],
      ["/settings","Application-wide settings","Admin only"],
      ["/guest-order/[token]","Guest QR drink ordering — no login required","Public"]
    ],
    [2800,4000,2560]
  ),
  sp(80),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S3 — TECHNICAL ARCHITECTURE
// ═════════════════════════════════════════════════════════════════════
const s3 = [
  h1("3. Technical Architecture"),
  h2("3.1 Technology Stack"),
  sp(60),
  tbl(
    ["Component","Technology","Notes"],
    [
      ["Runtime","Node.js 20 LTS","Pinned to the node:20-alpine base image in the Dockerfile"],
      ["Frontend Framework","Next.js 14 (App Router)","React 18, TypeScript, server and client components"],
      ["Styling","Tailwind CSS","Utility-first CSS — no separate CSS build step required"],
      ["Backend API","Next.js Route Handlers","API runs within the same Node.js process; no separate API server needed"],
      ["Database ORM","Prisma","Type-safe PostgreSQL client with migration management"],
      ["Database","PostgreSQL 14+","External server reached over the network via DATABASE_URL. Not part of the Compose stack."],
      ["Authentication","Custom signed session cookies","Email/password only — no OAuth or external identity provider"],
      ["Email","Nodemailer via SMTP","Compatible with any standards-compliant SMTP relay"],
      ["Public access","Cloudflare Tunnel (cloudflared)","Outbound-only connection to Cloudflare. TLS terminates at the Cloudflare edge; no inbound port is opened."],
      ["Charts","Recharts","Client-side rendering; no server dependency"]
    ],
    [2200,2600,4560]
  ),
  sp(80),
  h2("3.2 Architecture Summary"),
  para("The platform is a single Next.js application. The React frontend and API route handlers run within the same Node.js process — there is no separate API server to manage. The Docker Compose stack brings up two services:"),
  sp(60),
  tbl(
    ["Service","Docker Image","Role"],
    [
      ["app","Pre-built application image","Runs the Next.js application on port 3000, bound to localhost only. Automatically applies database migrations and seeds the admin account on startup."],
      ["cloudflared","cloudflare/cloudflared","Maintains an outbound tunnel to Cloudflare and forwards incoming requests to the app service. Routing is configured remotely in the Cloudflare dashboard, which must point the public hostname at http://app:3000."]
    ],
    [1400,2400,5560]
  ),
  sp(80),
  note("No inbound ports are opened on this host. The application binds to 127.0.0.1:3000 for local health checks only, and all public traffic arrives through the Cloudflare tunnel. The host requires outbound access to Cloudflare and to the PostgreSQL server on port 5432."),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S4 — PREREQUISITES
// ═════════════════════════════════════════════════════════════════════
const s4 = [
  h1("4. Software Prerequisites"),
  para("The following software must be installed on the host machine before running the application. No other installation is required — all application dependencies are bundled inside the Docker image."),
  sp(60),
  tbl(
    ["Software","Version Required","Notes"],
    [
      ["Docker Engine","24.x or higher","https://docs.docker.com/engine/install/ — Install for your OS"],
      ["Docker Compose","v2 (compose v2 plugin)","Bundled with Docker Desktop. On Linux: sudo apt install docker-compose-plugin"],
      ["Git","Any recent version","Required only for cloning the repository on first setup"]
    ],
    [2000,2200,5160]
  ),
  sp(80),
  note("On Windows or macOS, install Docker Desktop which bundles both Docker Engine and Compose. On Linux servers, install Docker Engine and the Compose plugin separately following the official Docker documentation."),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S5 — ENVIRONMENT CONFIGURATION
// ═════════════════════════════════════════════════════════════════════
const s5 = [
  h1("5. Environment Configuration"),
  para("The application reads all configuration from a .env file in the project root. The Docker Compose setup loads this file automatically via the env_file directive in docker-compose.yaml — no additional configuration is needed in Docker itself."),
  sp(60),
  h2("5.1 Environment Variables Reference"),
  sp(60),
  tbl(
    ["Variable","Purpose","Example / Notes","Req."],
    [
      ["APP_DOMAIN","Public hostname of the service. Informational: the tunnel routes traffic, so this is used for reference and health output.","oka-room-reservation.com","Yes"],
      ["TUNNEL_TOKEN","Cloudflare Tunnel token, from Zero Trust > Networks > Tunnels > Install connector. Grants the connector access to the tunnel, so treat it as a secret.","eyJhIjoi...","Yes"],
      ["APP_IMAGE","Docker image name and tag for the application container.","oka-reservation:latest","Yes"],
      ["DATABASE_URL","Connection string for the external PostgreSQL server. Must be a host the app container can reach over the network — not localhost, which would resolve to the container itself.","postgresql://oka_user:password@db-host:5432/room_reservation","Yes"],
      ["SESSION_SECRET","Cryptographic secret for signing session cookies. Must be at least 32 random characters. Changing this logs out all active users.","Generate with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"","Yes"],
      ["SMTP_HOST","Outgoing SMTP mail server hostname","smtp.obeikan.com","Yes"],
      ["SMTP_PORT","SMTP port: 587 for STARTTLS, 465 for SSL","587","Yes"],
      ["SMTP_SECURE","'false' for port 587 (STARTTLS). 'true' for port 465 (SSL).","false","Yes"],
      ["SMTP_USER","SMTP authentication username","notifications@obeikan.com","Yes"],
      ["SMTP_PASS","SMTP authentication password","your-smtp-password","Yes"],
      ["SMTP_FROM","Sender display name and address shown to recipients","OKA Reservations <notifications@obeikan.com>","Yes"],
      ["ADMIN_EMAIL","Email for the default admin account. Used only during the initial database seed.","admin@obeikan.com","Seed"],
      ["ADMIN_PASSWORD","Password for the default admin account. Change after first login.","StrongPassword!2026","Seed"],
      ["CRON_SECRET","Shared secret to authenticate scheduled reminder requests. Must match the value configured in the cron job.","Generate separately from SESSION_SECRET","Yes"]
    ],
    [2200,3400,2760,1000]
  ),
  sp(80),
  h2("5.2 Sample .env File"),
  para("Create this file in the project root directory and fill in all values before starting the containers:"),
  code('APP_DOMAIN="rooms.obeikan.com"'),
  code('APP_IMAGE="oka-reservation:latest"'),
  code('DATABASE_URL="postgresql://oka_user:your_db_password@your-db-host:5432/room_reservation"'),
  code('SESSION_SECRET="replace-with-a-long-random-string-at-least-32-characters"'),
  code('SMTP_HOST="smtp.obeikan.com"'),
  code('SMTP_PORT="587"'),
  code('SMTP_SECURE="false"'),
  code('SMTP_USER="notifications@obeikan.com"'),
  code('SMTP_PASS="your-smtp-password"'),
  code('SMTP_FROM="OKA Reservations <notifications@obeikan.com>"'),
  code('ADMIN_EMAIL="admin@obeikan.com"'),
  code('ADMIN_PASSWORD="ChangeThisAfterFirstLogin!2026"'),
  code('CRON_SECRET="another-unique-random-string-for-cron-auth"'),
  sp(80),
  h2("5.3 Configuring docker-compose.yaml"),
  para("The docker-compose.yaml file defines the two services and reads every setting from .env, so it does not normally need editing. The values it consumes are:"),
  sp(60),
  tbl(
    ["Compose Reference","Source","Purpose"],
    [
      ["${APP_IMAGE}",".env","Application image to run. Defaults to oka-reservation:latest if unset."],
      ["${TUNNEL_TOKEN}",".env","Authenticates the cloudflared connector against the Cloudflare tunnel."],
      ["env_file: .env",".env","Passes every application variable (DATABASE_URL, SMTP, secrets) into the app container."]
    ],
    [2600,2400,4360]
  ),
  sp(80),
  h2("5.4 Generating Secure Secrets"),
  para("Run this command on any machine with Node.js to generate a cryptographically secure random string. Use a different value for SESSION_SECRET and CRON_SECRET:"),
  code("node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""),
  sp(60),
  note("The .env file must be in the same directory as docker-compose.yaml when running docker-compose up. Restrict file permissions on Linux: chmod 600 .env"),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S6 — RUNNING WITH DOCKER
// ═════════════════════════════════════════════════════════════════════
const s6 = [
  h1("6. Running the Application with Docker"),
  para("The application and the Cloudflare tunnel connector are managed through Docker Compose and start with a single command. PostgreSQL is hosted separately and is not started or managed by Compose."),
  sp(60),
  h2("6.1 First-Time Setup"),
  h3("Step 1 — Clone the Repository"),
  code("git clone https://github.com/E4GLz/Room-Reservation-for-OKA.git"),
  code("cd Room-Reservation-for-OKA"),
  sp(80),
  h3("Step 2 — Create and Populate the .env File"),
  para("Create the .env file in the project root and fill in all required values as described in Section 5. Two values must be correct before the container will start at all: DATABASE_URL must point at a PostgreSQL host the container can reach, and SESSION_SECRET must be set — the application refuses to start in production without it."),
  sp(60),
  note("Do not use 'localhost' in DATABASE_URL. Inside a container, localhost refers to the container itself, not the host machine or the database server."),
  sp(80),
  h3("Step 3 — Confirm Database Connectivity"),
  para("The PostgreSQL server is external to this stack, so verify the host is reachable and the credentials are valid before starting the containers:"),
  code("psql \"$DATABASE_URL\" -c \"SELECT 1;\""),
  para("If this fails, resolve it first — the application cannot start without a working database connection."),
  sp(80),
  h3("Step 4 — Pull the Application Image"),
  para("Ensure the application Docker image is available locally. Either pull it from your container registry:"),
  code("docker pull your-registry/image-name:backend-v1.5"),
  para("Or build it locally from the Dockerfile:"),
  code("docker build -t your-image-name:latest ."),
  para("Then update the image field in docker-compose.yaml to match the name you used."),
  sp(80),
  h3("Step 5 — Start All Services"),
  para("Start the full stack in detached mode:"),
  code("docker-compose up -d"),
  sp(60),
  para("On startup the app container automatically applies any pending database migrations and seeds the admin account before the web server begins accepting traffic. cloudflared starts alongside it and establishes the outbound tunnel to Cloudflare."),
  sp(80),
  h2("6.2 Verifying the Stack is Running"),
  code("docker-compose ps"),
  sp(60),
  para("Both services (app and cloudflared) should show status 'running'. To view the application startup logs:"),
  code("docker-compose logs app"),
  sp(60),
  para("A successful startup shows the Prisma migration output followed by a 'Ready' message from Next.js. The application is then accessible at the tunnel public hostname configured in the Cloudflare dashboard."),
  sp(80),
  h2("6.3 Common Docker Compose Commands"),
  sp(60),
  tbl(
    ["Command","Effect"],
    [
      ["`docker-compose up -d`","Start all services in the background"],
      ["`docker-compose down`","Stop and remove containers (data volumes are preserved)"],
      ["`docker-compose down`","Stop and remove the containers. Application data is unaffected: it lives on the external database server."],
      ["`docker-compose restart app`","Restart only the application container"],
      ["`docker-compose logs -f app`","Stream live logs from the application container"],
      ["`docker-compose logs -f`","Stream live logs from all services"],
      ["`docker-compose pull`","Pull the latest version of all images defined in docker-compose.yaml"],
      ["`docker-compose exec app sh`","Open a shell inside the running application container"]
    ],
    [3800,5560]
  ),
  sp(80),
  h2("6.4 Applying Updates"),
  para("To update the application to a new image version:"),
  stp(1,[r("Update the "), rm("image"), r(" tag in docker-compose.yaml to the new version.")]),
  stp(2,"Pull the new image:"),
  code("docker-compose pull app"),
  stp(3,"Restart the application container:"),
  code("docker-compose up -d --no-deps app"),
  sp(60),
  para("The application container will automatically run any new database migrations on startup before serving traffic."),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S7 — DATABASE MIGRATIONS
// ═════════════════════════════════════════════════════════════════════
const s7 = [
  h1("7. Database Migrations"),
  para("The application uses Prisma's migration system to manage the database schema. Migrations are versioned SQL files stored in the prisma/migrations/ directory of the repository. They define every structural change to the database (table creation, column additions, index changes) in a controlled, repeatable way."),
  sp(60),
  h2("7.1 How Migrations Work in Production"),
  para("Every time the application container starts, the container entrypoint automatically runs:"),
  code("npx prisma migrate deploy"),
  sp(60),
  para("This command checks which migration files in prisma/migrations/ have not yet been applied to the database and applies them in order. If the database is already up to date, the command completes immediately and the application starts normally. IT staff do not need to run migrations manually in normal operation."),
  sp(80),
  h2("7.2 Migration Commands Reference"),
  sp(60),
  tbl(
    ["Command","When to Use","Effect"],
    [
      ["`npx prisma migrate deploy`","Production / Docker startup (runs automatically)","Applies all pending migration files to the database. Never alters applied migrations. Safe for production."],
      ["`npx prisma migrate status`","When you need to inspect the migration state","Lists all migration files and whether each has been applied to the connected database."],
      ["`npx prisma migrate dev`","Development only — never in production","Creates a new migration file from schema changes, applies it, and regenerates the Prisma client. Requires a development database."],
      ["`npx prisma db push`","Development or initial setup without a migration history","Pushes the current schema directly to the database without creating migration files. Useful for quickly syncing a fresh database."],
      ["`npm run generate`","After any schema change or after pulling updated code","Regenerates the Prisma TypeScript client from the schema. Must be run before building the application after a schema change."]
    ],
    [3000,2400,3960]
  ),
  sp(80),
  h2("7.3 Checking Migration Status"),
  para("To see which migrations have been applied to the running database, open a shell in the app container and run:"),
  code("docker-compose exec app npx prisma migrate status"),
  sp(60),
  para("The output lists every migration file alongside its applied timestamp, or marks it as 'Not applied' if pending. All migrations should show as applied in a healthy running system."),
  sp(80),
  h2("7.4 Manually Running Migrations"),
  para("If migrations need to be run manually (e.g. after a failed startup or for troubleshooting), run the following from the app container:"),
  code("docker-compose exec app npx prisma migrate deploy"),
  sp(80),
  h2("7.5 Migration File Location"),
  para([r("Migration files are stored in the repository under "), rm("prisma/migrations/"), r(". Each migration is a timestamped folder containing a "), rm("migration.sql"), r(" file with the exact SQL that was or will be applied. These files are part of the codebase and must not be edited or deleted after they have been applied to any database.")]),
  sp(80),
  note("Never manually edit the database schema outside of the Prisma migration system. Direct schema changes (e.g. via psql) will cause a mismatch between the migration history and the actual database state."),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S8 — EXTERNAL INTEGRATIONS
// ═════════════════════════════════════════════════════════════════════
const s8 = [
  h1("8. External Integrations"),
  h2("8.1 Currently Active Integrations"),
  para("The platform currently integrates with two external systems:"),
  sp(60),
  tbl(
    ["System","Connection","Purpose"],
    [
      ["PostgreSQL 14+","External database server, reached over the network via DATABASE_URL","Stores all application data: reservations, users, rooms, settings, hospitality orders, audit logs"],
      ["SMTP Mail Server","Outbound TCP on port 587 or 465 per .env configuration","Sends reservation confirmations, approval/rejection notifications, room move alerts, and scheduled upcoming meeting reminders"]
    ],
    [2000,2400,4960]
  ),
  sp(80),
  h2("8.2 SMTP Email Configuration Notes"),
  bul([rb("Protocol: "), r("SMTP with STARTTLS (port 587, SMTP_SECURE=false) or SMTPS (port 465, SMTP_SECURE=true)")]),
  bul([rb("Failure behaviour: "), r("If email delivery fails, the triggering action (booking, approval) still completes. The error is logged but the operation is not rolled back.")]),
  bul([rb("Compatible servers: "), r("Corporate Exchange/Outlook, Office 365 SMTP relay, Gmail SMTP with App Password, Postfix, SendGrid, Amazon SES, or any SMTP relay")]),
  bul([rb("Gmail: "), r("Use an App Password (not the regular account password). 2-Step Verification must be enabled on the account.")]),
  sp(80),
  h2("8.3 HCMS Integration — Ready for Implementation"),
  para("The system is architecturally prepared for integration with a Human Capital Management System (HCMS). The application exposes a structured REST API that can serve as the integration surface. The following integration points are available without requiring structural code changes:"),
  sp(60),
  tbl(
    ["Integration Area","API Endpoint","How Integration Applies"],
    [
      ["User provisioning","POST /api/users  |  PUT /api/users/[id]","HCMS can create and update user accounts by calling the user management API with admin credentials. Role assignment and manager relationships can be set programmatically."],
      ["Booking data export","GET /api/reservations","HCMS or reporting tools can query reservation data filtered by date, room, or requester to reconcile meeting activity with attendance or cost centre records."],
      ["Room utilisation","GET /api/reports","Utilisation metrics, occupancy rates, and booking patterns are available via the reports endpoint for consumption by HCMS dashboards."],
      ["Approval workflow","GET /api/manager-approvals  |  POST /api/reservations/[id]/admin-approval","The approval chain maps directly to organisational hierarchy. If HCMS manages reporting lines, the manager assignment on each user can be synchronised."]
    ],
    [2000,2400,4960]
  ),
  sp(80),
  para("All API endpoints require authentication via a valid session cookie or can be extended to support API key authentication for system-to-system calls. The recommended approach for HCMS integration is to create a dedicated Admin-role service account whose credentials are used by the HCMS connector."),
  sp(60),
  note("HCMS integration is ready at the API level. Full implementation (automated user sync, SSO, or webhook-based events) would require a scoped development engagement once the HCMS vendor and integration pattern are confirmed.", "E8F5E9", "2E7D32"),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S9 — USER MANAGEMENT
// ═════════════════════════════════════════════════════════════════════
const s9 = [
  h1("9. User Management"),
  h2("9.1 Account Creation Methods"),
  bul([rb("Self-registration: "), r("Users navigate to /register. The account is created with Pending status and must be activated by an Admin from the Users management page.")]),
  bul([rb("Admin creation: "), r("An Admin creates the account directly from the Users page with role and status set immediately. No approval step is required.")]),
  sp(80),
  h2("9.2 Role Permissions Reference"),
  sp(60),
  tbl(
    ["Feature","Admin","Manager","Staff","Service"],
    [
      ["View room planner","Yes","Yes","Yes","No"],
      ["Submit booking requests","Yes","Yes","Yes","No"],
      ["Create confirmed bookings directly","Yes","No","No","No"],
      ["Approve / reject booking requests","Yes (all)","Yes (own team)","No","No"],
      ["Cancel or edit bookings","Yes (all)","Own only","Own only","No"],
      ["Move a booking between rooms","Yes","No","No","No"],
      ["Manage rooms","Yes","No","No","No"],
      ["Manage user accounts","Yes","No","No","No"],
      ["View reports and analytics","Yes","No","No","No"],
      ["Manage hospitality menu","Yes","No","No","No"],
      ["View hospitality service dashboard","Yes","No","No","Yes"],
      ["Update drink order statuses","Yes","No","No","Yes"],
      ["Access application settings","Yes","No","No","No"]
    ],
    [3600,1290,1290,1290,1890]
  ),
  sp(80),
  h2("9.3 Password Reset"),
  para("There is no automated password reset email flow. An Admin must set a temporary password from the Users management page and inform the user out of band."),
  sp(80),
  h2("9.4 Initial Admin Account"),
  para([r("The first admin account is created automatically when the app container starts for the first time, using the "), rm("ADMIN_EMAIL"), r(" and "), rm("ADMIN_PASSWORD"), r(" values from .env. The admin should change this password from Settings > Profile after first login.")]),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S10 — SCHEDULED TASKS
// ═════════════════════════════════════════════════════════════════════
const s10 = [
  h1("10. Scheduled Tasks & Automation"),
  h2("10.1 Upcoming Meeting Reminder Emails"),
  para("The application provides a protected endpoint that sends reminder emails to admin recipients for upcoming confirmed meetings within a configurable time window. The window is set in the application Settings page. This endpoint must be called from an external cron scheduler."),
  sp(60),
  tbl(
    ["Property","Details"],
    [
      ["Endpoint URL","POST /api/notifications/upcoming-reminders"],
      ["Authentication Header","Authorization: Bearer {CRON_SECRET}"],
      ["Effect","Sends reminder emails for confirmed bookings within the configured time window"],
      ["Recommended Frequency","Every 30–60 minutes"],
      ["Success Response","HTTP 200 with JSON summary of emails sent"],
      ["Failure Response","HTTP 401 for incorrect secret; HTTP 500 on server error"]
    ],
    [2800,6560]
  ),
  sp(80),
  h2("10.2 Cron Job Configuration"),
  h3("Linux — crontab"),
  para("Replace YOUR_CRON_SECRET with the value from .env and replace your-app-domain.com with the actual hostname:"),
  code("crontab -e"),
  code("*/30 * * * * curl -s -X POST https://your-app-domain.com/api/notifications/upcoming-reminders \\"),
  code('  -H "Authorization: Bearer YOUR_CRON_SECRET" > /dev/null 2>&1'),
  sp(80),
  h3("Windows — Scheduled Task"),
  code("Invoke-WebRequest -Uri https://your-app-domain.com/api/notifications/upcoming-reminders \\"),
  code('  -Method POST -Headers @{Authorization="Bearer YOUR_CRON_SECRET"} -UseBasicParsing'),
  sp(60),
  para("Register this as a Scheduled Task in Windows Task Scheduler to run every 30 minutes."),
  sp(80),
  note("Test the endpoint manually before setting up the cron job: a correct CRON_SECRET returns HTTP 200 with a JSON body. An incorrect secret returns HTTP 401."),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S11 — SECURITY
// ═════════════════════════════════════════════════════════════════════
const s11 = [
  h1("11. Security Notes"),
  h2("11.1 Secret Management"),
  bul([rb("SESSION_SECRET: "), r("Minimum 32 random characters. Never reuse between environments. Changing this in production logs out all users.")]),
  bul([rb("CRON_SECRET: "), r("Use a different value from SESSION_SECRET. Rotate periodically.")]),
  bul([rb("ADMIN_PASSWORD: "), r("Change the initial seed password immediately after first login.")]),
  bul([rb(".env file: "), r("Restrict read permissions on Linux: "), rm("chmod 600 .env"), r(". Never commit this file to version control.")]),
  sp(80),
  h2("11.2 Database Access"),
  bul("PostgreSQL runs on a separate server. Restrict inbound access on port 5432 to the application host's IP address only — it must never be reachable from the public internet."),
  bul([r("For direct administration, connect from a trusted host using the same connection string: "), rm('psql "$DATABASE_URL"')]),
  bul("The database user should have DML permissions only (SELECT, INSERT, UPDATE, DELETE) plus the schema privileges Prisma needs for migrations. Do not use a superuser account for the application."),
  bul("Prefer an encrypted connection to the database. Append ?sslmode=require to DATABASE_URL if the server supports TLS."),
  sp(80),
  h2("11.3 HTTPS"),
  para("HTTPS is provided by Cloudflare at its edge, and the tunnel connection from this host is outbound only. No inbound port needs to be opened and no certificate is managed on the server. Because the browser always reaches the site over HTTPS, the Secure session cookie is transmitted correctly."),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S12 — MONITORING
// ═════════════════════════════════════════════════════════════════════
const s12 = [
  h1("12. Monitoring & Logs"),
  h2("12.1 Viewing Logs"),
  para("All container output is accessible via Docker Compose:"),
  code("docker-compose logs app              # all app logs"),
  code("docker-compose logs -f app          # stream live app logs"),
  code("docker-compose logs -f              # stream all services"),
  code("docker-compose logs cloudflared     # tunnel connectivity logs"),
  sp(80),
  h2("12.2 What to Monitor"),
  sp(60),
  tbl(
    ["Indicator","What to Watch For","Action"],
    [
      ["App container status","Container exiting or restarting repeatedly","Run docker-compose logs app and review the error. Check .env values and database connectivity."],
      ["Migration errors on startup","'Migration failed' in app logs","Check database connectivity and that oka_user has sufficient privileges. Run npx prisma migrate status inside the container."],
      ["SMTP failures","Email-related errors in app logs","Verify SMTP_* variables in .env. Test credentials independently against the mail server."],
      ["Database reachability","Connection refused or timeout errors in app logs","Verify the database server is up and the app host is still permitted through its firewall. Test with: psql \"$DATABASE_URL\" -c \"SELECT 1;\""],
      ["Disk space","Docker volumes growing over time","Check volume usage: docker system df. Consider setting up periodic log rotation."]
    ],
    [2200,3400,3760]
  ),
  sp(80),
  h2("12.3 Health Check"),
  para("To verify the application is running and accepting requests:"),
  code("curl -s http://localhost:3000/api/auth/session"),
  sp(60),
  para("A healthy application returns a JSON response. A connection refused error indicates the app container is not running."),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S13 — TROUBLESHOOTING
// ═════════════════════════════════════════════════════════════════════
const s13 = [
  h1("13. Troubleshooting"),
  sp(60),
  tbl(
    ["Symptom","Likely Cause","Resolution"],
    [
      ["App container exits immediately after starting","SESSION_SECRET is not set, or DATABASE_URL is wrong or unreachable","Check docker-compose logs app. The application deliberately refuses to start in production without SESSION_SECRET. Verify the database host with: psql \"$DATABASE_URL\" -c \"SELECT 1;\""],
      ["'Can not connect to database' in app logs","Wrong host in DATABASE_URL, firewall blocking port 5432, or invalid credentials","Confirm DATABASE_URL does not use 'localhost' (inside a container that means the container itself). Ensure the database server allows connections from this host's IP."],
      ["'Migration failed' on startup","The database user lacks schema privileges","Grant schema privileges as a superuser on the database server: GRANT ALL ON SCHEMA public TO oka_user;"],
      ["Prisma migrate status shows 'database schema is not in sync'","Schema was modified directly in the database, bypassing migrations","Never alter the schema manually. Restore from a backup or recreate the database and re-run migrations."],
      ["Emails not being delivered","Incorrect SMTP credentials, SMTP port blocked, or server rejecting connections","Verify SMTP_* variables in .env. Test SMTP connectivity independently. Check if the sending IP is on a blocklist."],
      ["Reminder emails not being sent","Cron job misconfigured or CRON_SECRET does not match","Test manually: curl -X POST https://your-domain/api/notifications/upcoming-reminders -H 'Authorization: Bearer YOUR_SECRET'"],
      ["All users logged out after container restart","SESSION_SECRET was changed in .env","Expected behaviour. Users must log in again. Avoid changing SESSION_SECRET unless rotating for security reasons."],
      ["Cloudflare returns 502 or 1033","The tunnel is down, or its public hostname points somewhere wrong","Run docker-compose logs cloudflared. In the dashboard confirm the hostname routes to http://app:3000 — not localhost:3000, which inside the connector means the connector itself."],
      ["Admin account does not exist after first start","ADMIN_EMAIL or ADMIN_PASSWORD not set in .env when the container first started","Set the variables in .env and recreate the container: docker-compose up -d --force-recreate app"],
      ["docker-compose up fails with 'port already in use'","Another process is bound to 127.0.0.1:3000 on the host","Identify it with: ss -ltnp | grep 3000. Stop it, or change the host port mapping in docker-compose.yaml."]
    ],
    [2600,2800,3960]
  ),
  pg()
];

// ═════════════════════════════════════════════════════════════════════
// S14 — SETUP CHECKLIST
// ═════════════════════════════════════════════════════════════════════
const s14 = [
  h1("14. Setup Checklist & Handover"),
  h2("14.1 Setup Checklist"),
  para("Verify every item before handing operational access to the team:"),
  sp(60),
  bul([r("[ ]  "), rb(".env file created"), r(" with all required variables set and validated")]),
  bul([r("[ ]  "), rb("DATABASE_URL points at the external database host"), r(" (not localhost) and connectivity verified with psql")]),
  bul([r("[ ]  "), rb("SESSION_SECRET and CRON_SECRET set"), r(" to long random values — the app will not start in production without SESSION_SECRET")]),
  bul([r("[ ]  "), rb("APP_DOMAIN set"), r(" to the real hostname, with DNS already pointing at this host")]),
  bul([r("[ ]  "), rb("docker-compose.yaml PostgreSQL credentials"), r(" match the values in DATABASE_URL")]),
  bul([r("[ ]  "), rb("App image name"), r(" in docker-compose.yaml updated to the correct registry path and tag")]),
  bul([r("[ ]  "), rb("docker-compose up -d"), r(" completed successfully — both services show 'running' in docker-compose ps")]),
  bul([r("[ ]  "), rb("Migrations applied"), r(" — docker-compose logs app shows migration output with no errors")]),
  bul([r("[ ]  "), rb("Admin account verified"), r(" — logged in successfully at the application URL")]),
  bul([r("[ ]  "), rb("Admin password changed"), r(" from the initial seed value")]),
  bul([r("[ ]  "), rb("SMTP delivery tested"), r(" — at least one email confirmed received by a real recipient")]),
  bul([r("[ ]  "), rb("Cron job configured"), r(" and tested manually with the correct CRON_SECRET")]),
  bul([r("[ ]  "), rb("HTTPS verified"), r(" — application accessible via HTTPS with no browser certificate warnings")]),
  sp(80),
  h2("14.2 Deployment Record"),
  para("Complete this record and keep it with the handover documentation:"),
  sp(60),
  tbl(
    ["Item","Value"],
    [
      ["Host Machine / VM",""],
      ["Application URL (HTTPS)",""],
      ["Docker Compose File Location",""],
      ["Container Registry / Image Name",""],
      ["Database Server Host / Port",""],
      ["Database Name",""],
      ["Cron Job Location",""],
      ["Repository URL","https://github.com/E4GLz/Room-Reservation-for-OKA"],
      ["Docker Image Version in Use",""],
      ["Setup Date",""],
      ["Setup By",""],
      ["Handover Recipient",""]
    ],
    [3800,5560]
  ),
  sp(480)
];

// ═════════════════════════════════════════════════════════════════════
// ASSEMBLE & WRITE
// ═════════════════════════════════════════════════════════════════════
const doc = new Document({
  styles, numbering,
  sections:[
    { properties:{ page: PAGE }, children: cover },
    {
      properties:{ page: PAGE },
      headers:{ default: docHeader },
      footers:{ default: docFooter },
      children:[
        new TableOfContents("Table of Contents", { hyperlink:true, headingStyleRange:"1-2" }),
        pg(),
        ...s1, ...s2, ...s3, ...s4, ...s5,
        ...s6, ...s7, ...s8, ...s9, ...s10,
        ...s11, ...s12, ...s13, ...s14
      ]
    }
  ]
});

const OUT = path.join("C:\\Users\\x3amR\\OneDrive\\Desktop\\Codex","OKA_IT_Operations_Guide.docx");
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log("Written:", OUT, Math.round(buf.length/1024)+"KB");
}).catch(e => { console.error(e); process.exit(1); });
