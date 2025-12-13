import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("Missing SENDGRID_API_KEY. Emails will not be sent.");
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@horaprofe.com.br';

interface EmailData {
  to: string;
  templateId: string;
  dynamicTemplateData: Record<string, any>;
}

const sendEmail = async ({ to, templateId, dynamicTemplateData }: EmailData) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[Mock Email] To: ${to}, Template: ${templateId}, Data:`, dynamicTemplateData);
    return;
  }

  try {
    await sgMail.send({
      to,
      from: FROM_EMAIL,
      templateId,
      dynamicTemplateData,
    });
    console.log(`Email sent to ${to} (Template: ${templateId})`);
  } catch (error: any) {
    console.error(`Error sending email to ${to}:`, error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

// Template IDs (should be in .env, using fallbacks or placeholders here)
const TEMPLATES = {
  WELCOME: process.env.SENDGRID_TEMPLATE_WELCOME || 'd-placeholder_welcome_id',
  PAYMENT_CONFIRMED: process.env.SENDGRID_TEMPLATE_PAYMENT || 'd-placeholder_payment_id',
  PAYMENT_FAILED: process.env.SENDGRID_TEMPLATE_PAYMENT_FAILED || 'd-placeholder_payment_failed_id',
  SCHEDULE_READY: process.env.SENDGRID_TEMPLATE_SCHEDULE || 'd-placeholder_schedule_id',
  TRIAL_ENDING: process.env.SENDGRID_TEMPLATE_TRIAL || 'd-placeholder_trial_id',
};

export const emailService = {
  sendWelcomeEmail: async (user: { email: string; name: string }, organization: { name: string }) => {
    await sendEmail({
      to: user.email,
      templateId: TEMPLATES.WELCOME,
      dynamicTemplateData: {
        user_name: user.name,
        org_name: organization.name,
        login_url: `${process.env.FRONTEND_URL}/login`,
      },
    });
  },

  sendPaymentConfirmed: async (organization: { id: string }, invoice: { amount_cents: number; pdf_url?: string }, userEmail: string) => {
    await sendEmail({
      to: userEmail,
      templateId: TEMPLATES.PAYMENT_CONFIRMED,
      dynamicTemplateData: {
        amount: (invoice.amount_cents / 100).toFixed(2),
        invoice_url: invoice.pdf_url,
        org_id: organization.id,
      },
    });
  },

  sendPaymentFailed: async (
    organization: { id: string; name?: string }, 
    paymentInfo: { amount_cents: number; retry_date?: Date }, 
    userEmail: string
  ) => {
    await sendEmail({
      to: userEmail,
      templateId: TEMPLATES.PAYMENT_FAILED,
      dynamicTemplateData: {
        org_name: organization.name || 'Sua organização',
        amount: (paymentInfo.amount_cents / 100).toFixed(2),
        retry_date: paymentInfo.retry_date 
          ? paymentInfo.retry_date.toLocaleDateString('pt-BR') 
          : 'em breve',
        billing_url: `${process.env.FRONTEND_URL}/app/billing`,
      },
    });
  },

  sendTrialEndingReminder: async (
    organization: { id: string; name?: string }, 
    trialInfo: { trial_end: Date }, 
    userEmail: string
  ) => {
    await sendEmail({
      to: userEmail,
      templateId: TEMPLATES.TRIAL_ENDING,
      dynamicTemplateData: {
        org_name: organization.name || 'Sua organização',
        trial_end_date: trialInfo.trial_end.toLocaleDateString('pt-BR'),
        days_remaining: Math.ceil((trialInfo.trial_end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
      },
    });
  },

  sendScheduleReady: async (userEmail: string, scheduleName: string, downloadUrl: string) => {
    await sendEmail({
      to: userEmail,
      templateId: TEMPLATES.SCHEDULE_READY,
      dynamicTemplateData: {
        schedule_name: scheduleName,
        download_url: downloadUrl,
      },
    });
  },

  sendInvitationEmail: async (email: string, inviteLink: string) => {
    // Fallback template or HTML if no template ID
    await sendEmail({
      to: email,
      templateId: process.env.SENDGRID_TEMPLATE_INVITE || 'd-placeholder_invite_id',
      dynamicTemplateData: {
        invite_link: inviteLink,
      },
    });
  },
};
