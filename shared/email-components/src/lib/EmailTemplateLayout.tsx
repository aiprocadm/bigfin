import { Html, Head, Body, Preview, Tailwind } from '@react-email/components';
import { CSSProperties } from 'react';

interface EmailTemplateLayoutProps {
  children?: React.ReactNode;
  preview: string;
  /** Язык письма для почтовых клиентов и читалок; по языку организации. */
  lang?: string;
}
export const EmailTemplateLayout = ({
  children,
  preview,
  lang = 'en',
}: EmailTemplateLayoutProps) => {
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{preview}</Preview>

      <Tailwind>
        <Body style={bodyStyle}>{children}</Body>
      </Tailwind>
    </Html>
  );
};

const bodyStyle: CSSProperties = {
  backgroundColor: '#F5F5F5',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: '40px 0',
};
