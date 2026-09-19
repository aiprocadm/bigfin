import intl from 'react-intl-universal';
import { Copy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface BackupCodesListProps {
  codes: string[];
}

/** Показ резервных кодов (единственный раз) + копирование всех разом. */
export const BackupCodesList = ({ codes }: BackupCodesListProps) => {
  const handleCopyAll = () => {
    navigator.clipboard?.writeText(codes.join('\n'));
  };

  return (
    <div className="flex flex-col gap-3">
      <Alert variant="destructive">
        <AlertDescription>
          {intl.get('two_factor.backup_codes.shown_once_warning')}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-2 rounded-control border p-4 font-mono text-sm">
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>

      <Button variant="secondary" type="button" onClick={handleCopyAll}>
        <Copy className="h-4 w-4" />
        {intl.get('two_factor.backup_codes.copy_all')}
      </Button>
    </div>
  );
};
