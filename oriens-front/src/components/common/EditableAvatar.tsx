import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, selecione um arquivo de imagem válido.",
        });
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB
        toast({
          variant: "destructive",
          title: "Erro",
          description: "A imagem deve ter no máximo 2MB.",
        });
        return;
      }

      // Cria um URL de pré-visualização para a imagem selecionada
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewSrc(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Chama a função de callback se fornecida
      if (onImageChange) {
        onImageChange(file);
        toast({
          title: "Imagem selecionada!",
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

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isLoading}
      />

      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "absolute inset-0 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
          isLoading && "opacity-100 cursor-not-allowed bg-black/70"
        )}
      >
        <Camera className="h-6 w-6" />
      </button>
    </div>
  );
}