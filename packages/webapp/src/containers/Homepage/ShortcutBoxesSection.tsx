import * as React from 'react';
import { Link } from 'react-router-dom';

import { useFilterShortcutBoxesSection } from './components';

interface Shortcut {
  title: React.ReactNode;
  description: React.ReactNode;
  link: string;
}

interface ShortcutSection {
  sectionTitle: React.ReactNode;
  shortcuts: Shortcut[];
}

/**
 * Колонка быстрых переходов.
 *
 * БЫЛО: сетка карточек — у каждой ссылки своя рамка, заголовок и строка
 * описания. Пять таких сеток подряд занимали на главной больше места, чем
 * все настоящие цифры, и дублировали боковое меню: человек пришёл посмотреть
 * деньги, а получил оглавление в двух экземплярах.
 *
 * СТАЛО: простой список ссылок в колонке. Все ссылки целы до единой — они
 * просто перестали спорить с деньгами за внимание.
 *
 * Описания убраны намеренно: «Счета покупателям» не нуждается в пояснении
 * «ведите счета покупателям». Там, где название и правда непонятно, лечить
 * надо название, а не приписку под ним.
 */
function ShortcutColumn({ sectionTitle, shortcuts }: ShortcutSection) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[0.8125rem] font-semibold text-text-primary">
        {sectionTitle}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {shortcuts.map((shortcut, i) => (
          <li key={i}>
            <Link
              to={shortcut.link}
              className="text-sm text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline"
            >
              {shortcut.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ShortcutBoxesSection({
  section,
}: {
  section: ShortcutSection[];
}) {
  const sections = useFilterShortcutBoxesSection(
    section,
  ) as ShortcutSection[];

  return (
    <>
      {sections.map((s, i) => (
        <ShortcutColumn key={i} {...s} />
      ))}
    </>
  );
}
