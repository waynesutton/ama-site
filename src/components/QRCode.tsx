import { useState } from "react";
import QRCodeLib from "qrcode";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";

interface QRCodeProps {
  url: string;
  title: string;
}

export default function QRCode({ url, title }: QRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const generateQRCode = async () => {
    if (qrCodeUrl) {
      setIsVisible(!isVisible);
      return;
    }

    setIsLoading(true);
    try {
      const qrUrl = await QRCodeLib.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: "#2A2825",
          light: "#FDFCFA",
        },
      });
      setQrCodeUrl(qrUrl);
      setIsVisible(true);
    } catch (error) {
      console.error("Error generating QR code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--cvx-bg-secondary)", border: "1px solid var(--cvx-border)" }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm" style={{ color: "var(--cvx-text)" }}>Share via QR Code</h3>
        <button
          onClick={generateQRCode}
          disabled={isLoading}
          className="flex items-center space-x-1 text-sm transition-colors hover:opacity-70"
          style={{ color: "var(--cvx-text-secondary)" }}
        >
          {isVisible ? <EyeClosedIcon /> : <EyeOpenIcon />}
          <span>{isVisible ? "Hide" : "Show"}</span>
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: "var(--cvx-red)" }}></div>
        </div>
      )}

      {isVisible && qrCodeUrl && (
        <div className="text-center">
          <img
            src={qrCodeUrl}
            alt={`QR Code for ${title}`}
            className="mx-auto mb-2 rounded-lg"
          />
          <p className="text-xs" style={{ color: "var(--cvx-text-secondary)" }}>
            Scan to open on mobile
          </p>
        </div>
      )}
    </div>
  );
}
