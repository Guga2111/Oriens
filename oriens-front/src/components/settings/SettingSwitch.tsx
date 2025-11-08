import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ReactNode } from "react";

interface SettingSwitchProps {
  icon: ReactNode;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SettingSwitch({
  icon,
  label,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: SettingSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {icon}
        <div>
          <Label>{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        disabled={disabled}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
