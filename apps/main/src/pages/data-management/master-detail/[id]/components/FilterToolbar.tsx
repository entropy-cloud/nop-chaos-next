import { Button, Input } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';

interface FilterToolbarProps {
  itemKeyword: string;
  setItemKeyword: (value: string) => void;
  addressKeyword: string;
  setAddressKeyword: (value: string) => void;
  logisticsKeyword: string;
  setLogisticsKeyword: (value: string) => void;
}

export function FilterToolbar({
  itemKeyword,
  setItemKeyword,
  addressKeyword,
  setAddressKeyword,
  logisticsKeyword,
  setLogisticsKeyword,
}: FilterToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap">
      <Input
        className="min-w-[15rem] flex-1 bg-surface"
        placeholder={t('masterDetail.detail.itemFilter')}
        value={itemKeyword}
        onChange={(event) => setItemKeyword(event.target.value)}
      />
      <Input
        className="min-w-[15rem] flex-1 bg-surface"
        placeholder={t('masterDetail.detail.addressFilter')}
        value={addressKeyword}
        onChange={(event) => setAddressKeyword(event.target.value)}
      />
      <Input
        className="min-w-[15rem] flex-1 bg-surface"
        placeholder={t('masterDetail.detail.logisticsFilter')}
        value={logisticsKeyword}
        onChange={(event) => setLogisticsKeyword(event.target.value)}
      />
      <div className="ml-auto flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setItemKeyword('');
            setAddressKeyword('');
            setLogisticsKeyword('');
          }}
        >
          {t('masterDetail.detail.clearFilters')}
        </Button>
      </div>
    </div>
  );
}
