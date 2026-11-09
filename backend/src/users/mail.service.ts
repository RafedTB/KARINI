import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";

@Injectable()
export class MailService implements OnModuleInit {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter?: Transporter;

    constructor(private readonly config: ConfigService) {
        const host = this.config.get<string>("SMTP_HOST");
        const port = Number(this.config.get<string>("SMTP_PORT", "587"));
        const user = this.config.get<string>("SMTP_USER");
        const pass = this.config.get<string>("SMTP_PASS");

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
        }
    }

    async onModuleInit() {
        if (!this.transporter) {
            this.logger.warn("SMTP is not configured. Verification and password-reset emails are disabled.");
            return;
        }

        try {
            await this.transporter.verify();
            this.logger.log("SMTP connection verified.");
        } catch (error) {
            this.logger.error(
                "SMTP connection failed. Check SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.",
                error instanceof Error ? error.stack : String(error),
            );
        }
    }

    async sendVerificationEmail(to: string, verificationLink: string) {
        return this.send({
            to,
            subject: "Verify your Karini account",
            title: "Verify your email address",
            body: "Welcome to Karini. Confirm your email address to activate your account.",
            actionLabel: "Verify account",
            actionUrl: verificationLink,
        });
    }

    async sendPasswordResetEmail(to: string, resetLink: string) {
        return this.send({
            to,
            subject: "Reset your Karini password",
            title: "Reset your password",
            body: "We received a request to reset your Karini password. This link is valid for your account only.",
            actionLabel: "Reset password",
            actionUrl: resetLink,
        });
    }

    async sendParentAccountEmail(to: string, studentEmail: string, temporaryPassword: string, loginUrl: string) {
        return this.send({
            to,
            subject: "Your Karini parent account",
            title: "Your parent account is ready",
            body: `A Karini account was created for you to follow ${studentEmail}. Temporary password: ${temporaryPassword}`,
            actionLabel: "Open Karini",
            actionUrl: loginUrl,
        });
    }

    private async send(input: {
        to: string;
        subject: string;
        title: string;
        body: string;
        actionLabel: string;
        actionUrl: string;
    }) {
        const from = this.config.get<string>("SMTP_FROM") || this.config.get<string>("SMTP_USER");
        if (!this.transporter || !from) {
            throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM.");
        }

        try {
            return await this.transporter.sendMail({
                from,
                to: input.to,
                subject: input.subject,
                text: `${input.body}\n\n${input.actionLabel}: ${input.actionUrl}`,
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17233c">
                      <h1 style="color:#4f46e5">${input.title}</h1>
                      <p>${input.body}</p>
                      <p><a href="${input.actionUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">${input.actionLabel}</a></p>
                      <p style="font-size:12px;color:#64748b">${input.actionUrl}</p>
                    </div>
                `,
            });
        } catch (error) {
            if (error instanceof Error) {
                const mailError = error as Error & {
                    code?: string;
                    responseCode?: number;
                    response?: string;
                };
                this.logger.error(
                    `Unable to send email to ${input.to}: ${mailError.message}` +
                    `${mailError.code ? ` [${mailError.code}]` : ""}` +
                    `${mailError.responseCode ? ` (${mailError.responseCode})` : ""}` +
                    `${mailError.response ? ` - ${mailError.response}` : ""}`,
                    mailError.stack,
                );
            } else {
                this.logger.error(`Unable to send email to ${input.to}: ${String(error)}`);
            }
            throw new Error("Email delivery failed");
        }
    }
}
