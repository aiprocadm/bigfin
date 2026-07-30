import { useMemo } from 'react';
import { qrcodegen } from '@/lib/qrcodegen';

interface QrCodeProps {
  /** Строка для кодирования (например, otpauth://-URI). */
  value: string;
  /** Сторона картинки в пикселях. */
  size?: number;
  className?: string;
}

/**
 * QR-код как SVG — на вендоренном генераторе, без внешних зависимостей
 * и сетевых запросов (секрет 2FA не должен покидать страницу).
 */
export const QrCode = ({ value, size = 192, className }: QrCodeProps) => {
  const { path, moduleCount } = useMemo(() => {
    const qr = qrcodegen.QrCode.encodeText(
      value,
      qrcodegen.QrCode.Ecc.MEDIUM,
    );
    const parts: string[] = [];

    for (let y = 0; y < qr.size; y += 1) {
      for (let x = 0; x < qr.size; x += 1) {
        if (qr.getModule(x, y)) parts.push(`M${x},${y}h1v1h-1z`);
      }
    }
    return { path: parts.join(''), moduleCount: qr.size };
  }, [value]);

  // Тихая зона в 2 модуля по краям.
  const viewBox = `-2 -2 ${moduleCount + 4} ${moduleCount + 4}`;

  return (
    <svg
      role="img"
      viewBox={viewBox}
      width={size}
      height={size}
      className={className}
      shapeRendering="crispEdges"
    >
      <rect x="-2" y="-2" width={moduleCount + 4} height={moduleCount + 4} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
};
