import * as React from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type AvatarCropDialogProps = {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onCropped: (file: File, previewUrl: string) => void;
  aspect?: number;
};

function createImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke starte canvas");

  // set canvas size to match the cropped area
  canvas.width = Math.max(1, Math.floor(crop.width));
  canvas.height = Math.max(1, Math.floor(crop.height));

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Kunne ikke beskære billedet"));
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

export function AvatarCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onCropped,
  aspect = 1,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setIsSaving(false);
    }
  }, [open]);

  const handleCropComplete = React.useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(blob);
      onCropped(file, previewUrl);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [croppedAreaPixels, imageSrc, onCropped, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Beskær profilbillede</DialogTitle>
          <DialogDescription>Zoom og flyt billedet, så dit ansigt er centreret.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/30" style={{ height: 360 }}>
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Zoom</p>
              <p className="text-sm tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</p>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={(v) => setZoom(v[0] ?? 1)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Annuller
            </Button>
            <Button type="button" onClick={handleSave} disabled={!imageSrc || !croppedAreaPixels || isSaving}>
              {isSaving ? "Gemmer..." : "Gem"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
