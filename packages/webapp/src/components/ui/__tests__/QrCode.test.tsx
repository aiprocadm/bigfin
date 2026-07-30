import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QrCode } from '../QrCode';

describe('QrCode', () => {
  it('рендерит SVG с модулями для otpauth-URI', () => {
    const html = renderToStaticMarkup(
      <QrCode value="otpauth://totp/Bigfin:a@b.ru?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Bigfin" />,
    );

    expect(html).toContain('<svg');
    expect(html).toContain('<path');
    // Путь не пустой — модули реально закодированы.
    expect(html.match(/d="M[^"]{100,}"/)).toBeTruthy();
  });

  it('одинаковый вход даёт одинаковый QR (детерминизм)', () => {
    const a = renderToStaticMarkup(<QrCode value="hello" />);
    const b = renderToStaticMarkup(<QrCode value="hello" />);
    expect(a).toBe(b);
  });
});
