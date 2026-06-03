import { useEffect } from "react";

interface Props {
  url: string;
  title?: string;
  onClose: () => void;
}

export default function ImageModal({ url, title, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const isImage = url.startsWith("data:image") || /\.(png|jpg|jpeg|gif|webp)$/i.test(url);
  const isPdf = url.startsWith("data:application/pdf") || url.endsWith(".pdf");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title ?? "Certificate Preview"}</h2>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕ Close
          </button>
        </div>
        <div className="modal-body">
          {isImage ? (
            <img
              src={url}
              alt={title ?? "Certificate"}
              style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 4 }}
            />
          ) : isPdf ? (
            <iframe
              src={url}
              title={title ?? "Certificate"}
              style={{ width: "100%", height: "70vh", border: "none", borderRadius: 4 }}
            />
          ) : (
            <div className="card" style={{ textAlign: "center", padding: 40 }}>
              <p>Preview not available for this file type.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ marginTop: 12 }}
              >
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
