import { useState } from 'react';
import { formatOrganizationDate } from '@/utils/organizationDate';
import intl from 'react-intl-universal';
import { ShieldCheck, ShieldOff } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  useTwoFactorDisable,
  useTwoFactorRegenerateBackupCodes,
  useTwoFactorState,
} from '@/hooks/query/twoFactor';
import { BackupCodesList } from './BackupCodesList';
import { TwoFactorEnableWizard } from './TwoFactorEnableWizard';

/** Карточка «Двухфакторная аутентификация» на странице «Безопасность». */
export const TwoFactorCard = () => {
  const { data: state, isLoading } = useTwoFactorState() as {
    data?: { enabled: boolean; enabledAt: string | null; backupCodesRemaining: number };
    isLoading: boolean;
  };

  const [wizardOpen, setWizardOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  const [password, setPassword] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);
  const { mutateAsync: disable, isLoading: isDisabling } =
    useTwoFactorDisable();

  const [regenCode, setRegenCode] = useState('');
  const [regenError, setRegenError] = useState<string | null>(null);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const { mutateAsync: regenerate, isLoading: isRegenerating } =
    useTwoFactorRegenerateBackupCodes();

  const handleDisable = async () => {
    setDisableError(null);
    try {
      await disable({ password });
      setDisableOpen(false);
      setPassword('');
    } catch {
      setDisableError(intl.get('two_factor.error.invalid_password'));
    }
  };

  const handleRegenerate = async () => {
    setRegenError(null);
    try {
      const res: any = await regenerate({ code: regenCode.trim() });
      setNewCodes(res.data.backup_codes ?? []);
      setRegenCode('');
    } catch {
      setRegenError(intl.get('two_factor.error.invalid_code'));
    }
  };

  const closeRegenerate = () => {
    setRegenerateOpen(false);
    setRegenCode('');
    setRegenError(null);
    setNewCodes([]);
  };

  if (isLoading || !state) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {state.enabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldOff className="h-5 w-5 text-text-muted" />
              )}
              {intl.get('two_factor.card.title')}
            </CardTitle>
            <CardDescription className="mt-1">
              {intl.get('two_factor.card.description')}
            </CardDescription>
          </div>
          <Badge variant={state.enabled ? 'default' : 'secondary'}>
            {state.enabled
              ? intl.get('two_factor.status.enabled')
              : intl.get('two_factor.status.disabled')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.enabled ? (
          <>
            <div className="text-sm text-text-secondary">
              {state.enabledAt ? (
                <p>
                  {intl.get('two_factor.enabled_at')}{' '}
                  {formatOrganizationDate(new Date(state.enabledAt))}
                </p>
              ) : null}
              <p>
                {intl.get('two_factor.backup_codes.remaining')}{' '}
                {state.backupCodesRemaining}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setRegenerateOpen(true)}
              >
                {intl.get('two_factor.backup_codes.regenerate')}
              </Button>
              <Button
                variant="destructive"
                type="button"
                onClick={() => setDisableOpen(true)}
              >
                {intl.get('two_factor.disable')}
              </Button>
            </div>
          </>
        ) : (
          <div>
            <Button type="button" onClick={() => setWizardOpen(true)}>
              {intl.get('two_factor.enable')}
            </Button>
          </div>
        )}
      </CardContent>

      <TwoFactorEnableWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />

      {/* Отключение — подтверждение паролем. */}
      <Dialog
        open={disableOpen}
        onOpenChange={(v) => {
          if (!v) {
            setDisableOpen(false);
            setPassword('');
            setDisableError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{intl.get('two_factor.disable_dialog.title')}</DialogTitle>
            <DialogDescription>
              {intl.get('two_factor.disable_dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              autoFocus
              type="password"
              autoComplete="current-password"
              placeholder={intl.get('two_factor.disable_dialog.password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {disableError ? (
              <p className="text-sm text-destructive">{disableError}</p>
            ) : null}
            <Button
              variant="destructive"
              type="button"
              disabled={!password || isDisabling}
              onClick={handleDisable}
            >
              {intl.get('two_factor.disable')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Перегенерация резервных кодов — подтверждение кодом. */}
      <Dialog open={regenerateOpen} onOpenChange={(v) => !v && closeRegenerate()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {intl.get('two_factor.regenerate_dialog.title')}
            </DialogTitle>
            <DialogDescription>
              {intl.get('two_factor.regenerate_dialog.description')}
            </DialogDescription>
          </DialogHeader>
          {newCodes.length > 0 ? (
            <>
              <BackupCodesList codes={newCodes} />
              <Button type="button" onClick={closeRegenerate}>
                {intl.get('two_factor.wizard.done')}
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={regenCode}
                onChange={(e) => setRegenCode(e.target.value)}
              />
              {regenError ? (
                <p className="text-sm text-destructive">{regenError}</p>
              ) : null}
              <Button
                type="button"
                disabled={regenCode.trim().length !== 6 || isRegenerating}
                onClick={handleRegenerate}
              >
                {intl.get('two_factor.backup_codes.regenerate')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
