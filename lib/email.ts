import nodemailer from "nodemailer";

function readSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secureSetting = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureSetting === "true"
      ? true
      : secureSetting === "false"
        ? false
        : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from || Number.isNaN(port)) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    from
  };
}

export function isEmailConfigured() {
  return Boolean(readSmtpConfig());
}

export async function sendEmail(params: {
  to: string[];
  subject: string;
  text: string;
  html: string;
}) {
  const config = readSmtpConfig();

  if (!config) {
    throw new Error("SMTP is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth
  });

  return transporter.sendMail({
    from: config.from,
    to: params.to.join(", "),
    subject: params.subject,
    text: params.text,
    html: params.html
  });
}
