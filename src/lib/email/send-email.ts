import nodemailer from "nodemailer";

interface EmailPayload {
    to: string;
    subject: string;
    html: string;
}

const smtpOptions = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS?.replace(/\s+/g, ""), // Remove spaces if present
    },
};

export const sendEmail = async (data: EmailPayload) => {
    const transporter = nodemailer.createTransport({
        ...smtpOptions,
    });

    return await transporter.sendMail({
        from: process.env.SMTP_USER,
        ...data,
    });
};
