import nodemailer from "nodemailer";

// Initialize transporter with Gmail or your email service
// Using environment variables for configuration
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to,
            subject,
            html,
        });
        console.log("Email sent:", info.response);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

export function createNotificationEmail(
    notificationType: string,
    message: string,
    articleTitle?: string,
    articleSlug?: string
): string {
    const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://pamflets.vercel.app";

    const headerColor = "#1f2937"; // Dark gray
    const primaryColor = "#3b82f6"; // Blue
    const accentColor = "#10b981"; // Green
    const backgroundColor = "#f9fafb"; // Light gray
    const cardBackground = "#ffffff"; // White

    switch (notificationType) {
        case "new_article":
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>New Article Published</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${backgroundColor};">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${backgroundColor};">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${cardBackground}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); padding: 40px 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">📝 New Article Published</h1>
                                            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Fresh content from the Pamphlets community</p>
                                        </td>
                                    </tr>

                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <div style="text-align: center; margin-bottom: 30px;">
                                                <h2 style="color: ${headerColor}; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">${articleTitle}</h2>
                                                <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.6;">${message}</p>
                                            </div>

                                            <div style="text-align: center; margin: 40px 0;">
                                                <a href="${baseUrl}/articles/${articleSlug}" style="background-color: ${primaryColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.3); border: 1px solid ${primaryColor}; text-align: center; line-height: 1.2; min-width: 120px;">
                                                   Read Article
                                                </a>
                                            </div>

                                            <div style="border-top: 1px solid #e5e7eb; padding-top: 30px; text-align: center;">
                                                <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                                                    You're receiving this because you subscribed to new articles.<br>
                                                    <a href="${baseUrl}/settings#notifications" style="color: ${primaryColor}; text-decoration: none;">Manage your preferences</a>
                                                </p>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: ${headerColor}; padding: 20px 30px; text-align: center;">
                                            <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                                                Sent with ❤️ from <strong style="color: white;">Pamphlets</strong>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        case "new_comment":
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>New Comment</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${backgroundColor};">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${backgroundColor};">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${cardBackground}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, ${accentColor} 0%, #f59e0b 100%); padding: 40px 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">💬 New Comment</h1>
                                            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Someone engaged with your content</p>
                                        </td>
                                    </tr>

                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <div style="text-align: center; margin-bottom: 30px;">
                                                <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.6;">${message}</p>
                                            </div>

                                            ${
                                                articleSlug
                                                    ? `<div style="text-align: center; margin: 40px 0;">
                                                        <a href="${baseUrl}/articles/${articleSlug}" style="background-color: ${accentColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.3); border: 1px solid ${accentColor}; text-align: center; line-height: 1.2; min-width: 120px;">
                                                            👀 View Comment
                                                        </a>
                                                    </div>`
                                                    : ""
                                            }

                                            <div style="border-top: 1px solid #e5e7eb; padding-top: 30px; text-align: center;">
                                                <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                                                    Stay engaged with the community!<br>
                                                    <a href="${baseUrl}/settings#notifications" style="color: ${accentColor}; text-decoration: none;">Manage notifications</a>
                                                </p>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: ${headerColor}; padding: 20px 30px; text-align: center;">
                                            <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                                                Sent with ❤️ from <strong style="color: white;">Pamphlets</strong>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        case "new_like":
        case "new_reply":
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>New Notification</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${backgroundColor};">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${backgroundColor};">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${cardBackground}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">${notificationType === 'new_like' ? '❤️' : '↩️'} New ${notificationType === 'new_like' ? 'Like' : 'Reply'}</h1>
                                            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Your content is getting attention!</p>
                                        </td>
                                    </tr>

                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <div style="text-align: center; margin-bottom: 30px;">
                                                <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.6;">${message}</p>
                                            </div>

                                            ${
                                                articleSlug
                                                    ? `<div style="text-align: center; margin: 40px 0;">
                                                        <a href="${baseUrl}/articles/${articleSlug}" style="background-color: #ec4899; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(236, 72, 153, 0.3); border: 1px solid #ec4899; text-align: center; line-height: 1.2; min-width: 120px;">
                                                            View Article
                                                        </a>
                                                    </div>`
                                                    : ""
                                            }

                                            <div style="border-top: 1px solid #e5e7eb; padding-top: 30px; text-align: center;">
                                                <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                                                    Keep creating amazing content!<br>
                                                    <a href="${baseUrl}/settings#notifications" style="color: #ec4899; text-decoration: none;">Adjust your settings</a>
                                                </p>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: ${headerColor}; padding: 20px 30px; text-align: center;">
                                            <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                                                Sent with ❤️ from <strong style="color: white;">Pamphlets</strong>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        default:
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Notification</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${backgroundColor};">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${backgroundColor};">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${cardBackground}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); padding: 40px 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🔔 Notification</h1>
                                            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">You have a new update</p>
                                        </td>
                                    </tr>

                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <div style="text-align: center; margin-bottom: 30px;">
                                                <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.6;">${message}</p>
                                            </div>

                                            <div style="border-top: 1px solid #e5e7eb; padding-top: 30px; text-align: center;">
                                                <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                                                    <a href="${baseUrl}" style="color: ${primaryColor}; text-decoration: none;">Visit Pamphlets</a> to see more updates
                                                </p>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: ${headerColor}; padding: 20px 30px; text-align: center;">
                                            <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                                                Sent with ❤️ from <strong style="color: white;">Pamphlets</strong>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
    }
}
