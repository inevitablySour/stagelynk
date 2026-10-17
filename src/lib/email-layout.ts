import { APP_NAME } from "@/config";

const BRAND = "#556b2f";
const BRAND_SOFT = "#e4ead3";
const INK = "#2f3526";
const MUTED = "#756b5b";

export interface EmailButton {
  label: string;
  url: string;
}

/** Shared HTML wrapper so every transactional email looks consistent. Keep markup table-based and inline-styled for email client compatibility. */
export function renderEmailHtml(options: {
  heading: string;
  bodyHtml: string;
  button?: EmailButton;
  footerNote?: string;
}) {
  const { heading, bodyHtml, button, footerNote } = options;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f3e4cb;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3e4cb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background-color:#fffaf0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND};padding:24px 32px;">
                <span style="color:#fffaf0;font-size:18px;font-weight:bold;">${APP_NAME}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;color:${INK};font-size:20px;">${heading}</h1>
                <div style="color:${INK};font-size:14px;line-height:1.6;">${bodyHtml}</div>
                ${
                  button
                    ? `<table role="presentation" style="margin-top:24px;"><tr><td style="background-color:${BRAND};border-radius:8px;">
                        <a href="${button.url}" style="display:inline-block;padding:12px 24px;color:#fffaf0;font-size:14px;font-weight:bold;text-decoration:none;">${button.label}</a>
                      </td></tr></table>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:${BRAND_SOFT};">
                <p style="margin:0;color:${MUTED};font-size:12px;">
                  ${footerNote ?? `You're receiving this email because of activity on your ${APP_NAME} account.`}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
