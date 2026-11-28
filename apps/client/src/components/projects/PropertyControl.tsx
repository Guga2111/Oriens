import { forwardRef, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export const PropertyButton = forwardRef<HTMLButtonElement, ButtonProps>(function PropertyButton(props, ref) {
  return <Button {...props} ref={ref} type="button" variant="outline" size="sm" />;
});

interface PropertySelectProps<Value extends string> {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string; icon: ReactNode }[];
  disabled?: boolean;
  onChange: (value: Value) => void;
}

export function PropertySelect<Value extends string>({ label, value, options, disabled, onChange }: PropertySelectProps<Value>) {
  const selected = options.find(option => option.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PropertyButton disabled={disabled} aria-label={`${label}: ${selected?.label ?? value}`}>
          {selected?.icon}{selected?.label ?? value}
        </PropertyButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-sm:[&_[role=menuitemradio]]:min-h-11">
        <DropdownMenuRadioGroup value={value} onValueChange={next => {
          const option = options.find(item => item.value === next);
          if (option && option.value !== value) onChange(option.value);
        }}>
          {options.map(option => (
            <DropdownMenuRadioItem key={option.value} value={option.value} disabled={disabled}>
              {option.icon}{option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
