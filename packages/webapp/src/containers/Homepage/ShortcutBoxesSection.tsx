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

function ShortcutBox({ title, link, description }: Shortcut) {
  return (
    <Link
      to={link}
      className="group flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-elevated"
    >
      <span className="text-sm font-semibold text-text-primary">{title}</span>
      <span className="text-xs leading-relaxed text-text-secondary">
        {description}
      </span>
    </Link>
  );
}

function ShortcutBoxes({ sectionTitle, shortcuts }: ShortcutSection) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-text-primary">
        {sectionTitle}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((shortcut, i) => (
          <ShortcutBox key={i} {...shortcut} />
        ))}
      </div>
    </section>
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
        <ShortcutBoxes key={i} {...s} />
      ))}
    </>
  );
}
