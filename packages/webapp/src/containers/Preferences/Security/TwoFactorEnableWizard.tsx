import { useEffect, useState } from 'react';
import intl from 'react-intl-universal';
import { Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { QrCode } from '@/components/ui/QrCode';
import {
  useTwoFactorEnable,
  useTwoFactorSetup,
} from '@/hooks/query/twoFactor';
import { BackupCodesList } from './BackupCodesList';

interface TwoFactorEnableWizardProps {
  open: boolean;
  onClose: () => void;
}

type WizardStep = 'scan' | 'confirm' | 'backupCodes';

/**
 * Мастер включения 2FA: QR + секрет → подтверждение кодом → резервные коды.
 */
export const TwoFactorEnableWizard = ({
  open,
  onClose,
}: TwoFactorEnableWizardProps) => {
  const [step, setStep] = useState<WizardStep>('scan');
  const [secret, setSecret] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const { mutateAsync: setup } = useTwoFactorSetup();
  const { mutateAsync: enable, isLoading: isEnabling } = useTwoFactorEnable();

  // Каждое открытие мастера — новая настройка: свежий секрет с сервера.
  useEffect(() => {
    if (!open) return;
    setStep('scan');
    setCode('');
    setCodeError(null);
    setBackupCodes([]);
    setSecret('');
    setOtpauthUri('');

    setup(undefined).then((res: any) => {
      setSecret(res.data.secret);
      setOtpauthUri(res.data.otpauth_uri);
    });
    // setup — стабильная мутация react-query; открытие — единственный триггер.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = async () => {
    setCodeError(null);
    try {
      const res: any = await enable({ code: code.trim() });
      setBackupCodes(res.data.backup_codes ?? []);
      setStep('backupCodes');
    } catch (err) {
      setCodeError(intl.get('two_factor.error.invalid_code'));
    }
  };

  const handleClose = () => {
    // С шага резервных кодов выходим только кнопкой «Готово».
    if (step !== 'backupCodes') onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        {step === 'scan' && (
          <>
            <DialogHeader>
              <DialogTitle>{intl.get('two_factor.wizard.scan_title')}</DialogTitle>
              <DialogDescription>
                {intl.get('two_factor.wizard.scan_description')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              {otpauthUri ? (
                <QrCode value={otpauthUri} className="rounded-control border" />
              ) : (
                <div className="h-48 w-48 animate-pulse rounded-control bg-muted" />
              )}
              <div className="w-full">
                <p className="mb-1 text-sm text-text-secondary">
                  {intl.get('two_factor.wizard.manual_entry_hint')}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-control border px-2 py-1 font-mono text-xs">
                    {secret || '…'}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label={intl.get('two_factor.wizard.copy_secret')}
                    onClick={() => navigator.clipboard?.writeText(secret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                className="w-full"
                type="button"
                disabled={!secret}
                onClick={() => setStep('confirm')}
              >
                {intl.get('two_factor.wizard.next')}
              </Button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>
                {intl.get('two_factor.wizard.confirm_title')}
              </DialogTitle>
              <DialogDescription>
                {intl.get('two_factor.wizard.confirm_description')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {codeError ? (
                <p className="text-sm text-destructive">{codeError}</p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setStep('scan')}
                >
                  {intl.get('two_factor.wizard.back')}
                </Button>
                <Button
                  className="flex-1"
                  type="button"
                  disabled={code.trim().length !== 6 || isEnabling}
                  onClick={handleConfirm}
                >
                  {intl.get('two_factor.wizard.confirm')}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'backupCodes' && (
          <>
            <DialogHeader>
              <DialogTitle>
                {intl.get('two_factor.backup_codes.title')}
              </DialogTitle>
              <DialogDescription>
                {intl.get('two_factor.backup_codes.description')}
              </DialogDescription>
            </DialogHeader>
            <BackupCodesList codes={backupCodes} />
            <Button type="button" onClick={onClose}>
              {intl.get('two_factor.wizard.done')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
