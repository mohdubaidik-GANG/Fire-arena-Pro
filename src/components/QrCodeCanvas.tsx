import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeCanvasProps {
  value: string;
  size?: number;
  className?: string;
  canvasId?: string;
}

export const QrCodeCanvas: React.FC<QrCodeCanvasProps> = ({ value, size = 220, className = '', canvasId = 'upi-payment-qr-canvas' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (error) {
          console.error('Error generating QR code on canvas:', error);
        }
      }
    );
  }, [value, size]);

  return (
    <div className={`p-3 bg-white rounded-xl shadow-lg border-2 border-amber-500/40 inline-flex items-center justify-center ${className}`}>
      <canvas ref={canvasRef} id={canvasId} width={size} height={size} className="block rounded-lg" />
    </div>
  );
};
