import { isEmpty } from 'lodash';
import { useAbilityContext } from '@/hooks';

export const useFilterShortcutBoxesSection = (section: any) => {
  const ability = useAbilityContext();

  return section
    .map(({ sectionTitle, shortcuts }: any) => {
      const shortcut = shortcuts.filter((shortcuts: any) => {
        return ability.can(shortcuts.ability, shortcuts.subject);
      });
      return {
        sectionTitle: sectionTitle,
        shortcuts: shortcut,
      };
    })
    .filter(({ shortcuts }: any) => !isEmpty(shortcuts));
};
