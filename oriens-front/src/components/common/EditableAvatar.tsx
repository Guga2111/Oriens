import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Same allowlist as the API (ImageUploads): no SVG, which would be served as a scriptable document.
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

interface EditableAvatarProps {
  src?: string;
  fallback: string;
  alt: string;
  onImageChange?: (file: File) => void;
  isLoading?: boolean;
}

export function EditableAvatar({ src, fallback, alt, onImageChange, isLoading }: EditableAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewSrc, setPreviewSrc] = useState<string | undefined>(src);

  useEffect(() => {
    setPreviewSrc(src);
  }, [src]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!IMAGE_TYPES.includes(file.type)) {
        toast.error("Erro", {
          description: "Use uma imagem JPG, PNG, GIF ou WebP.",
        });
        return;
      }
      if (file.size > 2 * 1024 * 1024) { 
        toast.error("Erro", {
          description: "A imagem deve ter no máximo 2MB.",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewSrc(reader.result as string);
      };
      reader.readAsDataURL(file);

      if (onImageChange) {
        onImageChange(file);
        toast.success("Imagem selecionada!", {
          description: "A sua nova imagem de perfil foi selecionada. (Não salva)",
        });
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group w-20 h-20 mx-auto"> 
      <Avatar className="w-full h-full">
        <AvatarImage src={previewSrc} alt={alt} />
        <AvatarFallback className="bg-primary/10 text-primary">{fallback}</AvatarFallback>
      </Avatar>

      <Input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={IMAGE_TYPES.join(",")}
        onChange={handleFileChange}
        disabled={isLoading}
      />

      <Button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label="Alterar foto de perfil"
        className={cn(
          "absolute inset-0 h-full w-full rounded-full bg-primary/80 p-0 opacity-0 transition-opacity hover:bg-primary/80 focus-visible:opacity-100 group-hover:opacity-100 [&_svg]:size-6",
          isLoading && "bg-primary/90 opacity-100 disabled:opacity-100"
        )}
      >
        <Camera aria-hidden />
      </Button>
    </div>
  );
}