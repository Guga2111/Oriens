// src/components/dashboard/UserProfileNav.tsx

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { User, Settings, LogOut } from "lucide-react";
import { useState } from "react";
import { EditableAvatar } from "../common/EditableAvatar";
import apiClient from "@/services/api";
import { toast } from "@/hooks/use-toast";

export function UserProfileNav() {
  const { userEmail, username, logout, userId, profileImageUrl, updateProfileImage } = useAuth();
  
  const userFallback = username.split(' ').map(n => n[0]).join('');

  const handleImageUpload = async (file: File) => {
    console.log("Arquivo de imagem selecionado:", file.name);
    
    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      const response = await apiClient.put(`/user/${userId}/avatar`, formData, {
        headers: {
          'Content-Type' : 'multipart/form-data',
        },
      });

      const newImageUrl = response.data.profileImageUrl;
      updateProfileImage(newImageUrl);

      toast({ title:"Sucesso!", description:"Sua imagem de perfil foi atualizada."});

    } catch (error) {
      console.error("Erro ao fazer upload da imagem: ", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possivel atualizar sua imagem."})
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profileImageUrl} alt="User Avatar" />
            <AvatarFallback>{userFallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <EditableAvatar
              src={profileImageUrl || username} 
              fallback={userFallback}
              alt="User Avatar"
              onImageChange={handleImageUpload}
            />
            <p className="text-sm font-medium leading-none">{username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Meu Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}