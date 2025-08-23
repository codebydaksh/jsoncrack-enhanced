import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  ColorPicker,
  TextInput,
  SegmentedControl,
  Group,
  Modal,
  Button,
  Divider,
  ColorInput,
} from "@mantine/core";
import { toBlob, toJpeg, toPng, toSvg } from "html-to-image";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { FiCopy, FiDownload, FiFileText, FiFile } from "react-icons/fi";
import useJson from "../../../store/useJson";

enum Extensions {
  SVG = "svg",
  PNG = "png",
  JPEG = "jpeg",
  PDF = "pdf",
  HTML = "html",
}

const getDownloadFormat = (format: Extensions) => {
  switch (format) {
    case Extensions.SVG:
      return toSvg;
    case Extensions.PNG:
      return toPng;
    case Extensions.JPEG:
      return toJpeg;
    default:
      return toPng;
  }
};

const swatches = [
  "#B80000",
  "#DB3E00",
  "#FCCB00",
  "#008B02",
  "#006B76",
  "#1273DE",
  "#004DCF",
  "#5300EB",
  "#EB9694",
  "#FAD0C3",
  "#FEF3BD",
  "#C1E1C5",
  "#BEDADC",
  "#C4DEF6",
  "#BED3F3",
  "#D4C4FB",
  "transparent",
];

function downloadURI(uri: string, name: string) {
  const link = document.createElement("a");

  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadContent(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  downloadURI(url, filename);
  URL.revokeObjectURL(url);
}

const generatePDF = async (imageElement: HTMLElement, options: any): Promise<string> => {
  try {
    // Convert SVG to canvas first
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Get the SVG dimensions
    const rect = imageElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Convert SVG to canvas
    const svgData = new XMLSerializer().serializeToString(imageElement);
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.fillStyle = options.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Convert canvas to data URL (this will be used to trigger download)
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create a simple PDF-like HTML page and trigger print
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${options.filename}</title>
              <style>
                body { margin: 0; padding: 20px; }
                img { max-width: 100%; height: auto; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" alt="JSON Visualization" />
            </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
          printWindow.close();
        }
        
        resolve(dataUrl);
      };
      
      img.onerror = reject;
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    });
  } catch (error) {
    throw new Error('PDF generation failed');
  }
};

const generateHTML = (jsonData: string, options: any) => {
  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JSON Visualization - ${options.filename}</title>
    <style>
        body {
            font-family: 'Monaco', 'Menlo', monospace;
            background-color: ${options.backgroundColor || '#ffffff'};
            margin: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 20px;
        }
        .json-container {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            overflow-x: auto;
        }
        pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>JSON Visualization</h1>
            <p>Generated from JSON Crack - ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="json-container">
            <pre>${jsonData}</pre>
        </div>
        <div class="footer">
            <p>Created with ❤️ using <a href="https://jsoncrack.com" target="_blank">JSON Crack</a></p>
        </div>
    </div>
</body>
</html>`;
  
  return htmlTemplate;
};

export const DownloadModal = ({ opened, onClose }: ModalProps) => {
  const getJson = useJson(state => state.getJson);
  const [extension, setExtension] = React.useState(Extensions.PNG);
  const [fileDetails, setFileDetails] = React.useState({
    filename: "jsoncrack.com",
    backgroundColor: "#FFFFFF",
    quality: 1,
  });

  const clipboardImage = async () => {
    try {
      toast.loading("Copying to clipboard...", { id: "toastClipboard" });

      const imageElement = document.querySelector("svg[id*='ref']") as HTMLElement;

      const blob = await toBlob(imageElement, {
        quality: fileDetails.quality,
        backgroundColor: fileDetails.backgroundColor,
      });

      if (!blob) return;

      await navigator.clipboard?.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      toast.success("Copied to clipboard");
      gaEvent("clipboard_img");
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError") {
        toast.error(
          "Clipboard write permission denied. Please allow clipboard access in your browser settings."
        );
      } else {
        toast.error("Failed to copy to clipboard");
      }
    } finally {
      toast.dismiss("toastClipboard");
      onClose();
    }
  };

  const exportAsImage = async () => {
    try {
      toast.loading("Downloading...", { id: "toastDownload" });

      const imageElement = document.querySelector("svg[id*='ref']") as HTMLElement;
      
      if (extension === Extensions.PDF) {
        await generatePDF(imageElement, {
          backgroundColor: fileDetails.backgroundColor,
          filename: fileDetails.filename
        });
        toast.success('PDF print dialog opened!');
      } else if (extension === Extensions.HTML) {
        const jsonData = getJson();
        const htmlContent = generateHTML(jsonData, {
          backgroundColor: fileDetails.backgroundColor,
          filename: fileDetails.filename
        });
        downloadContent(htmlContent, `${fileDetails.filename}.${extension}`, 'text/html');
      } else {
        // Original image export logic
        const downloadFn = getDownloadFormat(extension);
        const dataURI = await downloadFn(imageElement, {
          quality: fileDetails.quality,
          backgroundColor: fileDetails.backgroundColor,
        });
        downloadURI(dataURI, `${fileDetails.filename}.${extension}`);
      }
      
      gaEvent("download_file", { label: extension });
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export as ${extension.toUpperCase()}!`);
    } finally {
      toast.dismiss("toastDownload");
      onClose();
    }
  };

  const updateDetails = (key: keyof typeof fileDetails, value: string | number) =>
    setFileDetails({ ...fileDetails, [key]: value });

  return (
    <Modal opened={opened} onClose={onClose} title="Export" centered>
      <TextInput
        label="File Name"
        value={fileDetails.filename}
        onChange={e => updateDetails("filename", e.target.value)}
        mb="lg"
      />
      <SegmentedControl
        value={extension}
        onChange={e => setExtension(e as Extensions)}
        fullWidth
        data={[
          { label: "PNG", value: Extensions.PNG },
          { label: "JPEG", value: Extensions.JPEG },
          { label: "SVG", value: Extensions.SVG },
          { label: "PDF", value: Extensions.PDF },
          { label: "HTML", value: Extensions.HTML },
        ]}
        mb="lg"
      />
      {/* Only show color options for image formats */}
      {[Extensions.PNG, Extensions.JPEG, Extensions.SVG, Extensions.PDF].includes(extension) && (
        <>
          <ColorInput
            label="Background Color"
            value={fileDetails.backgroundColor}
            onChange={color => updateDetails("backgroundColor", color)}
            withEyeDropper={false}
            mb="lg"
          />
          <ColorPicker
            format="rgba"
            value={fileDetails.backgroundColor}
            onChange={color => updateDetails("backgroundColor", color)}
            swatches={swatches}
            withPicker={false}
            fullWidth
          />
        </>
      )}
      <Divider my="xs" />
      <Group justify="right">
        {/* Only show clipboard for image formats */}
        {[Extensions.PNG, Extensions.JPEG, Extensions.SVG].includes(extension) && (
          <Button leftSection={<FiCopy />} onClick={clipboardImage}>
            Clipboard
          </Button>
        )}
        <Button 
          color="green" 
          leftSection={
            extension === Extensions.HTML ? <FiFileText /> : 
            extension === Extensions.PDF ? <FiFile /> : <FiDownload />
          } 
          onClick={exportAsImage}
        >
          {extension === Extensions.HTML ? 'Export HTML' : 
           extension === Extensions.PDF ? 'Export PDF' : 'Download'}
        </Button>
      </Group>
    </Modal>
  );
};
