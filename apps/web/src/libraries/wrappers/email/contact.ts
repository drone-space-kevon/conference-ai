import appData from '@/data/app';
import resend from '@/libraries/resend';
import { EmailContactCreate, EmailInquiry } from '@/types/email';
import { segmentFullName } from '@repo/utils/formatters';
import { isProduction } from '@repo/utils/helpers';
import { render } from '@react-email/render';

import { Newsletter as EmailOnboardNewsletter } from '@repo/email';

export const contactsGet = async (audienceId: string) => {
  const { data, error } = await resend.general.contacts.list({ audienceId });

  if (!error) {
    return data;
  } else {
    console.error('---> wrapper error - (get email contacts):', error);
    throw error;
  }
};

export const contactCreate = async (contactOptions: EmailContactCreate) => {
  const contactList = await contactsGet(
    process.env.NEXT_RESEND_AUDIENCE_ID_GENERAL!
  );

  const contactExists = contactList?.data.find(
    (contact) => contact.email == contactOptions.params.email
  );

  if (!contactExists) {
    // switch to 'resend.general' when your domain is configured
    const { data: dataContact, error: errorContact } =
      await resend.general.contacts.create({
        email: contactOptions.params.email,
        firstName: contactOptions.params.name
          ? segmentFullName(contactOptions.params.name).first
          : undefined,
        lastName: contactOptions.params.name
          ? segmentFullName(contactOptions.params.name).last
          : undefined,
        unsubscribed: false,
        audienceId: process.env.NEXT_RESEND_AUDIENCE_ID_GENERAL!,
      });

    if (!errorContact) {
      return {
        data: dataContact,
        dataEmail:
          contactOptions.options?.notify == false
            ? null
            : await contactCreateWelcome({ to: contactOptions.params.email }),
      };
    } else {
      console.error(
        '---> wrapper error - (create email contact):',
        errorContact
      );
      throw errorContact;
    }
  }

  return { exists: true };
};

export const contactCreateWelcome = async (params: {
  to: Omit<EmailInquiry['from'], 'name'>['email'];
}) => {
  // switch to 'resend.general' when your domain is configured
  const { data, error } = await resend.general.emails.send({
    from: `${appData.name.app} <${
      isProduction()
        ? process.env.NEXT_EMAIL_NOREPLY!
        : process.env.NEXT_RESEND_EMAIL!
    }>`,
    to: [isProduction() ? params.to : process.env.NEXT_EMAIL_INFO!],
    subject: `Welcome To ${appData.name.company} Newsletter`,
    html: await render(EmailOnboardNewsletter()),
    replyTo: process.env.NEXT_EMAIL_NOREPLY!,
  });

  if (!error) {
    return data;
  } else {
    console.error(
      '---> wrapper error - (send email (onboard (newsletter))):',
      error
    );
    throw error;
  }
};